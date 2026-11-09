import { describe, expect, it } from "vitest";
import { D, GEWERKE, SAN_NK, cash, halten, limits, rechne, type V } from "../../src/features/rechner/ankauf/rechne";

const run = (over: Partial<V> = {}, o = {}) => rechne({ ...D, ...over }, GEWERKE, SAN_NK, o);
const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe("Ankauf: Standardwerte", () => {
  it("Sollzins 3,5 %, Notar 2 % + USt, Verkaufsprovision 3 % + USt", () => {
    expect(D.zins).toBe(3.5);
    expect(D.notar).toBe(2);
    expect(D.provision).toBe(3);
    expect(D.provisionUst).toBe(true);
  });
});

describe("Ankauf: Nebenkosten und Provision", () => {
  it("Vertragserrichtung enthält 20 % USt, mit USt-Option netto", () => {
    close(run({ kauf: 200000 }).notar, 200000 * 0.02 * 1.2);
    close(run({ kauf: 200000, ustOpt: true }).notar, 200000 * 0.02);
  });
  it("Verkaufsprovision 3 % + 20 % USt = 3,6 % vom Verkaufspreis", () => {
    const r = run({ verkM2: 4500, flaeche: 60 });
    close(r.vk, 270000);
    close(r.prov, 270000 * 0.036);
  });
  it("mit USt-Option: Provision netto, Gewährleistungsvorsorge auf den Nettoerlös", () => {
    const r = run({ ustOpt: true });
    close(r.prov, r.vk * 0.03);
    close(r.rl, (r.vk / 1.2) * 0.01);
    close(r.erloes, r.vk / 1.2);
  });
  it("Gewährleistungsvorsorge ohne Option 1 % vom Verkaufspreis, abschaltbar", () => {
    close(run().rl, run().vk * 0.01);
    expect(run({ rlOn: false }).rl).toBe(0);
  });
});

describe("Ankauf: Kreditrate und Haltedauer", () => {
  it("Rate wird über die Restlaufzeit nach den tilgungsfreien Monaten gerechnet", () => {
    // 10 Jahre Laufzeit, 6 Monate tilgungsfrei, Haltedauer = Laufzeit: Kredit muss exakt auf 0 laufen
    const r = run({ fremd: 100000, laufzeit: 10, tilgFrei: 6, monate: 120, zins: 3.5 });
    expect(r.rest).toBeLessThan(0.01);
    const i = 0.035 / 12;
    close(r.rate, (100000 * i) / (1 - Math.pow(1 + i, -114)), 1e-6);
  });
  it("ohne tilgungsfreie Zeit endet der Kredit nach der Laufzeit bei 0", () => {
    expect(run({ fremd: 100000, laufzeit: 10, tilgFrei: 0, monate: 120 }).rest).toBeLessThan(0.01);
  });
  it("Zinssatz 0 % rechnet linear", () => {
    close(run({ fremd: 120000, zins: 0, laufzeit: 10 }).rate, 1000);
  });
});

describe("Ankauf: Konsistenz Gewinn, Liquiditätsplan, Eigenkapital", () => {
  const cases: [string, Partial<V>][] = [
    ["Standard", {}],
    ["Versteigerung", { einkauf: "versteigerung", kauf: 120000 }],
    ["USt-Option", { ustOpt: true }],
    ["tilgungsfrei 6 Monate, 18 Monate Haltedauer", { tilgFrei: 6, monate: 18 }],
    ["Tilgung vor Verkauf", { tilgFrei: 0, monate: 18, laufzeit: 2 }],
    ["Makler, ohne Pfandrecht", { maklerOn: true, pfandOn: false }],
    ["Gewerke-Modus", { sanModus: "gewerke" }],
  ];
  for (const [name, over] of cases) {
    it(`Kontostand am Ende = Gewinn (${name})`, () => {
      const v = { ...D, ...over };
      const c = cash(v, GEWERKE, SAN_NK);
      close(c.R[c.R.length - 1].cum, c.r.gewinn, 1e-4);
    });
  }
  it("Eingesetztes EK enthält keine Verkaufskosten (Provision, Vorsorge)", () => {
    const r = run();
    close(r.ek, r.tot - r.prov - r.rl - r.kredit + r.tilg);
    expect(r.ek).toBeLessThan(r.tot - r.kredit + r.tilg);
  });
  it("Marge ist Gewinn auf Gesamtkosten", () => {
    const r = run();
    close(r.marge, (r.gewinn / r.tot) * 100);
  });
});

describe("Ankauf: Grenzwerte", () => {
  const varianten: Partial<V>[] = [{}, { ustOpt: true }, { rlOn: false }, { provisionUst: false }, { einkauf: "versteigerung" }];
  for (const over of varianten) {
    it(`Maximaler Kaufpreis, Mindest- und Break-even-Verkaufspreis sind selbstkonsistent ${JSON.stringify(over)}`, () => {
      const v = { ...D, ...over };
      const L = limits(v, GEWERKE, SAN_NK);
      close(rechne(v, GEWERKE, SAN_NK, { kp: L.kmax }).marge, v.ziel, 1e-6);
      close(rechne(v, GEWERKE, SAN_NK, { vkM2: L.vmin }).marge, v.ziel, 1e-6);
      close(rechne(v, GEWERKE, SAN_NK, { vkM2: L.vbe }).gewinn, 0, 1e-4);
    });
  }
});

describe("Ankauf: Plan B (Halten)", () => {
  it("Annuität = 12 × Monatsrate", () => {
    const v = { ...D, fremd: 100000, zins: 3.5, laufzeit: 25 };
    const i = 0.035 / 12, n = 300;
    close(halten(v, GEWERKE, SAN_NK).ann, 12 * ((100000 * i) / (1 - Math.pow(1 + i, -n))), 1e-6);
  });
  it("Nebenkosten der Anschaffung gehen netto in die Investition ein", () => {
    const h = halten({ ...D, maklerOn: true }, GEWERKE, SAN_NK);
    const r = run({ maklerOn: true });
    close(h.invest, r.kp + r.grest + r.eintr + (r.notar + r.makler) / 1.2 + r.kaufSonst + r.sonder + r.sanNet + r.finNk, 1e-6);
  });
  it("Räumung und Sonderumlage erhöhen die Investition", () => {
    const a = halten({ ...D, kaufSonst: 0, sonder: 0 }, GEWERKE, SAN_NK).invest;
    close(halten({ ...D, kaufSonst: 1500, sonder: 4000 }, GEWERKE, SAN_NK).invest - a, 5500, 1e-6);
  });
});

describe("Ankauf: Betriebskosten + Rücklage in €/m²·Monat", () => {
  it("Standard ist ein m²-Wert, kein Monatsbetrag", () => {
    expect(D.hBk).toBeLessThan(20);
  });
  it("Haltekosten skalieren mit der Fläche", () => {
    const a = run({ flaeche: 60, hBk: 3, hEn: 0, hVers: 0, hGst: 0, hSo: 0, monate: 10 });
    close(a.halteM, 180);
    close(a.halte, 1800);
    close(run({ flaeche: 100, hBk: 3, hEn: 0, hVers: 0, hGst: 0, hSo: 0, monate: 10 }).halte, 3000);
  });
  it("0 Monate Haltedauer: Liquiditätsplan stimmt mit dem Gewinn überein", () => {
    const c = cash({ ...D, monate: 0 }, GEWERKE, SAN_NK);
    close(c.R[c.R.length - 1].cum, c.r.gewinn, 1e-4);
  });
});
