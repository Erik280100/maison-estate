import { describe, expect, it } from "vitest";
import { GEMEINDEN } from "../../src/features/rechner/bewertung/daten";
import {
  DEFAULTS, bauKat, bewerte, lagefaktor, orte, vervielfaeltiger, type S,
} from "../../src/features/rechner/bewertung/rechne";
import { REF0, bewert, ZUS0 } from "../../src/features/rechner/ankauf/zusatzRechne";

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);
const run = (o: Partial<S> = {}) => bewerte({ ...DEFAULTS, ...o });
const LEIBNITZ: Partial<S> = { region: "Leibnitz", ort: "Leibnitz", baujahr: 1995, flaeche: 60, aussen: true, mode: "neutral" };

describe("Bewertung: Gemeindefaktor", () => {
  it("Stadt Leibnitz liegt rund 8 % über dem Bezirk (kalibriert an Wohnungs-Median 2025)", () => {
    const f = lagefaktor("Leibnitz", "Leibnitz")!;
    expect(f.pct).toBeGreaterThan(7);
    expect(f.pct).toBeLessThan(9);
  });
  it("Faktor ist auf ±12 % begrenzt und alle Gemeinden liegen darin", () => {
    for (const r of ["Graz-Umgebung", "Leibnitz"] as const) {
      for (const [g] of GEMEINDEN[r]) {
        const f = lagefaktor(r, g)!;
        expect(f.pct).toBeGreaterThanOrEqual(-12);
        expect(f.pct).toBeLessThanOrEqual(12);
      }
    }
  });
  it("teure Gemeinden im Umland über, günstige unter dem Bezirksschnitt", () => {
    expect(lagefaktor("Graz-Umgebung", "Seiersberg-Pirka")!.pct).toBeGreaterThan(5);
    expect(lagefaktor("Graz-Umgebung", "Sankt Marein bei Graz")!.pct).toBeLessThan(-5);
  });
  it("Datensätze vollständig: 36 Gemeinden Graz-Umgebung, 29 Leibnitz, 17 Grazer Bezirke", () => {
    expect(orte("Graz-Umgebung")).toHaveLength(36);
    expect(orte("Leibnitz")).toHaveLength(29);
    expect(orte("Graz-Stadt")).toHaveLength(17);
  });
  it("Grazer Bezirk nutzt den bestehenden Faktor", () => {
    close(lagefaktor("Graz-Stadt", "VI. Jakomini")!.pct, -8, 1e-9);
  });
  it("unbekannter Ort ergibt keinen Faktor", () => {
    expect(lagefaktor("Leibnitz", "Nirgendwo")).toBeNull();
  });
});

describe("Bewertung: Marktwert", () => {
  it("Baujahr → Bauperiode", () => {
    expect(bauKat(1960)).toBe("bis 1960");
    expect(bauKat(1961)).toBe("1961–1990");
    expect(bauKat(1990)).toBe("1961–1990");
    expect(bauKat(1991)).toBe("ab 1991");
  });
  it("Referenzfall Leibnitz, ab 1991, 60 m², mit Außenfläche: Basis 2.966 € × Markt × Gemeindefaktor", () => {
    const x = run(LEIBNITZ);
    const f = lagefaktor("Leibnitz", "Leibnitz")!.pct;
    close(x.kern.base, 2966);
    close(x.qm, 2966 * (1 + REF0.markt / 100) * (1 + f / 100), 1e-6);
    close(x.vw, x.qm * 60, 1e-6);
  });
  it("ohne Außenfläche gilt die Tabelle ohne Außenfläche (2.760 €/m²)", () => {
    close(run({ ...LEIBNITZ, aussen: false }).kern.base, 2760);
  });
  it("Stellplatz und Keller erhöhen den Marktwert um den Betrag, nicht den €/m²-Wert", () => {
    const a = run(LEIBNITZ), b = run({ ...LEIBNITZ, stell: 15000, keller: 3000 });
    close(b.vw - a.vw, 18000, 1e-6);
    close(b.qm, a.qm, 1e-9);
  });
  it("Spanne ± entspricht der Bewertungsspanne", () => {
    const x = run(LEIBNITZ);
    close(x.lo, x.vw * (1 - REF0.spanne / 100), 1e-6);
    close(x.hi, x.vw * (1 + REF0.spanne / 100), 1e-6);
  });
  it("Vergleichsobjekte fließen erst ab 3 Stück ein, gewichtet mit dem Median", () => {
    const vg = (preis: number) => ({ lage: "", m2: 50, preis, quelle: "" });
    const base = run({ ...LEIBNITZ, bwGewicht: 50 });
    const zwei = run({ ...LEIBNITZ, bwGewicht: 50, vergleiche: [vg(100000), vg(110000)] });
    close(zwei.qm, base.qm);
    expect(zwei.mitVergleich).toBe(false);
    const drei = run({ ...LEIBNITZ, bwGewicht: 50, vergleiche: [vg(100000), vg(110000), vg(120000)] });
    expect(drei.mitVergleich).toBe(true);
    close(drei.medianQm, 2200);
    close(drei.qm, base.qm * 0.5 + 2200 * 0.5, 1e-6);
  });
  it("Kern ist identisch zur Ankauf-Bewertung (Refactor ohne Verhaltensänderung)", () => {
    const z = { ...ZUS0, bwMode: "neutral" as const, bwRegion: "Graz-Stadt", bwBezirk: "VI. Jakomini", bwBau: "1961–1990", bwAussen: true, bwStell: 0 };
    const alt = bewert(REF0, z, 60, "teilsaniert");
    const neu = run({ region: "Graz-Stadt", ort: "VI. Jakomini", baujahr: 1975, flaeche: 60, aussen: true, mode: "neutral", zustand: "teilsaniert", lage: z.bwLage, stock: z.bwStock, energie: z.bwEnergie, stoer: z.bwStoer });
    close(neu.kern.qm, alt.qm, 1e-9);
  });
});

describe("Bewertung: Kaufpreis-Check", () => {
  it("Ampel: unter Marktwert grün, bis +5 % gelb, darüber rot", () => {
    const vw = run(LEIBNITZ).vw;
    expect(run({ ...LEIBNITZ, preis: vw * 0.95 }).ampel).toBe("good");
    expect(run({ ...LEIBNITZ, preis: vw * 1.03 }).ampel).toBe("warn");
    expect(run({ ...LEIBNITZ, preis: vw * 1.1 }).ampel).toBe("bad");
    expect(run(LEIBNITZ).ampel).toBeNull();
  });
  it("Höchstgebot = Marktwert abzüglich gewünschtem Abschlag", () => {
    const x = run({ ...LEIBNITZ, zielAbschlag: 5 });
    close(x.hoechstgebot, x.vw * 0.95, 1e-6);
  });
});

describe("Bewertung: Bankensicht", () => {
  it("Belehnwert 85 %, Kredit 80 % davon, Eigenkapital deckt den Rest inkl. Nebenkosten", () => {
    const x = run({ ...LEIBNITZ, preis: 200000, kaufNk: 10, belAbschlag: 15, belGrenze: 80 });
    close(x.belehnwert, x.vw * 0.85, 1e-6);
    close(x.maxKredit, x.vw * 0.85 * 0.8, 1e-6);
    close(x.kaufGesamt, 220000, 1e-6);
    close(x.eigenkapital, Math.max(0, 220000 - x.maxKredit), 1e-6);
  });
  it("Eigenkapital wird nie negativ", () => {
    expect(run({ ...LEIBNITZ, preis: 1000, kaufNk: 0 }).eigenkapital).toBe(0);
  });
});

describe("Bewertung: Ertragswert", () => {
  it("Vervielfältiger: (1 − (1+i)^−n) / i", () => {
    close(vervielfaeltiger(3.5, 40), (1 - Math.pow(1.035, -40)) / 0.035, 1e-9);
    close(vervielfaeltiger(0, 30), 30);
  });
  it("nur berechnet, wenn aktiviert; Reinertrag nach Mietausfall", () => {
    expect(run(LEIBNITZ).ertragswert).toBeNull();
    const x = run({ ...LEIBNITZ, ertrag: true, mieteQm: 10, mietausfall: 20, liZins: 3.5, rnd: 50 });
    close(x.reinertrag, 10 * 60 * 12 * 0.8, 1e-9);
    close(x.ertragswert!, x.reinertrag * vervielfaeltiger(3.5, 50), 1e-6);
    expect(x.rndJ).toBe(50);
  });
});
