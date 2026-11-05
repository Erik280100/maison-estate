import { describe, expect, it } from "vitest";
import { DEFAULTS, ann, calc, irr, sched } from "../../src/features/rechner/umschuldung/rechne";

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe("Umschuldung: Tilgungsplan", () => {
  it("Annuität und Tilgungsplan laufen auf 0", () => {
    const i = 0.036 / 12;
    const s = sched({ P: 100000, i1: i, n: 120 });
    expect(s.n).toBe(120);
    expect(s.rows[119].B).toBeLessThan(0.01);
    close(s.R, ann(100000, i, 120), 1e-9);
  });
  it("Gebühren erhöhen die Zahlung, nicht den Zins", () => {
    const i = 0.036 / 12;
    const a = sched({ P: 100000, i1: i, n: 120 }), b = sched({ P: 100000, i1: i, n: 120, fee: 10 });
    close(b.paid - a.paid, 1200, 1e-6);
    close(b.zins, a.zins, 1e-9);
  });
  it("zu niedrige feste Rate tilgt nicht", () => {
    expect(sched({ P: 100000, i1: 0.05 / 12, R: 100 }).inf).toBe(true);
  });
});

describe("Umschuldung: Effektivzins", () => {
  it("ohne Kosten ist der Effektivzins der annualisierte Nominalzins", () => {
    const i = 0.036 / 12;
    const s = sched({ P: 100000, i1: i, n: 120 });
    close(irr(100000, s.rows.map((r) => r.pay)), Math.pow(1 + i, 12) - 1, 1e-6);
  });
});

describe("Umschuldung: Gesamtrechnung", () => {
  it("niedrigerer Zins bringt Ersparnis, höherer Zins nicht", () => {
    expect(calc({ ...DEFAULTS, zN: 3.0 }).sav).toBeGreaterThan(0);
    expect(calc({ ...DEFAULTS, zN: 6.5 }).sav).toBeLessThan(0);
  });
  it("mitfinanzierte Kosten erhöhen den neuen Kredit um genau die Kosten", () => {
    const r = calc({ ...DEFAULTS, mitfin: true });
    close(r.B1 - r.B0, r.kost, 1e-6);
    expect(r.cash).toBe(0);
  });
  it("Maximalzins für Ersparnis liegt über dem neuen Zins", () => {
    const r = calc(DEFAULTS);
    expect(r.zMax).toBeGreaterThan(DEFAULTS.zN / 100);
  });
});
