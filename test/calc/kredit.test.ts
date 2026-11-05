import { describe, expect, it } from "vitest";
import {
  KREDIT_DEFAULTS, berechneAfaBemessungsgrundlage, berechneAfaJahre, berechneKaufnebenkosten, berechneKreditbetrag,
  berechneTilgungsplan, effektivzinsPct,
} from "../../src/features/rechner/kredit/kredit";

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe("Finanzierungsrechner: Tilgungsplan", () => {
  it("Rate entspricht der Annuitätenformel, Restschuld endet bei 0", () => {
    const p = berechneTilgungsplan(200000, 3.5, 25);
    const i = 0.035 / 12;
    close(p.rate, (200000 * i) / (1 - Math.pow(1 + i, -300)), 1e-9);
    expect(p.monate).toHaveLength(300);
    expect(p.monate[299].restschuld).toBe(0);
    close(p.monate.reduce((s, m) => s + m.tilgung, 0), 200000, 1e-6);
    close(p.gesamtaufwand, 200000 + p.gesamtzinsen, 1e-6);
  });
  it("Zins 0 % rechnet linear, Randfälle liefern leeren Plan", () => {
    close(berechneTilgungsplan(120000, 0, 10).rate, 1000);
    expect(berechneTilgungsplan(0, 3.5, 25).monate).toHaveLength(0);
  });
});

describe("Finanzierungsrechner: Kreditbetrag", () => {
  it("mitfinanzierte Kreditnebenkosten sind exakt aufgelöst (Netto-Auszahlung deckt den Bedarf)", () => {
    const k = berechneKreditbetrag({ kaufpreis: 300000, eigenmittel: 60000, mitMakler: true, nkMitfinanziert: true });
    close(k.nettoAuszahlung, 300000 + k.kaufNK.summe - 60000, 1e-6);
    close(k.kreditNKSumme, k.kreditbetrag * (0.03 + 0.012 * 1.2), 1e-6);
  });
  it("ohne Mitfinanzierung: Kredit = Kaufpreis + Kaufnebenkosten - Eigenmittel", () => {
    const k = berechneKreditbetrag({ kaufpreis: 300000, eigenmittel: 90000, mitMakler: false, nkMitfinanziert: false });
    close(k.kreditbetrag, 300000 + k.kaufNK.summe - 90000, 1e-6);
  });
  it("Kaufnebenkosten: GrESt 3,5 %, Grundbuch 1,1 %, Vertrag 2 % + USt, Makler 3 % + USt", () => {
    const nk = berechneKaufnebenkosten(100000, true);
    close(nk.summe, 100000 * (0.035 + 0.011 + 0.02 * 1.2 + 0.03 * 1.2), 1e-6);
  });
});

describe("Finanzierungsrechner: Effektivzins und AfA", () => {
  it("Effektivzins ist bei Netto-Auszahlung = Kredit der annualisierte Nominalzins, mit Kosten höher", () => {
    const p = berechneTilgungsplan(100000, 3.5, 20);
    close(effektivzinsPct(100000, p.rate, 240), (Math.pow(1 + 0.035 / 12, 12) - 1) * 100, 1e-6);
    expect(effektivzinsPct(95000, p.rate, 240)).toBeGreaterThan(3.56);
  });
  it("Gebäudeanteil 70 %, AfA linear als Standard", () => {
    expect(KREDIT_DEFAULTS.gebaeudeanteilPct).toBe(70);
    const basis = berechneAfaBemessungsgrundlage(200000, 70, 20000);
    close(basis, 154000);
    const j = berechneAfaJahre(basis, 1.5, 5);
    expect(j.map((x) => x.faktor)).toEqual([1, 1, 1, 1, 1]);
    close(j[0].afa, 154000 * 0.015);
  });
  it("beschleunigte AfA nur auf ausdrücklichen Wunsch: 3× / 2× / 1×, nie über die Bemessungsgrundlage", () => {
    const j = berechneAfaJahre(100000, 1.5, 100, true);
    expect(j.slice(0, 3).map((x) => x.faktor)).toEqual([3, 2, 1]);
    close(j[0].afa, 4500);
    close(j[99].afaKumuliert, 100000, 1e-6);
  });
});
