import { describe, expect, it } from "vitest";
import { DEFAULTS, calc, type S } from "../../src/features/rechner/anleger/rechne";

const run = (o: Partial<S> = {}) => calc({ ...DEFAULTS, ...o });
const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe("Anleger: Excel-Kennzahlen (DAS IMMO EXCEL, Blatt Berechnung)", () => {
  it("Nebenkosten auf Bruttopreis 210.000 €: 21.370 €", () => {
    close(run().nk, 21370, 1e-6);
  });
  it("Mietrendite 4,2859 % auf den Nettokaufpreis", () => {
    close(run().mietrendite, 0.04285851428571429, 1e-12);
  });
  it("Eigenkapitalrendite (Hebelformel) wie im Excel bei Kredit 148.800 €", () => {
    // Excel: Maxkredit = 175.000 · 85 % + 50 = 148.800 → kreditPct so wählen, dass 148.800 herauskommt
    const r = run({ kreditPct: (148800 / 175000) * 100 });
    close(r.ekRenditeHebel, 0.05805605319078654, 1e-9);
    close(r.kredit, 155406.72, 0.01);
    close(r.rateM, 679.0522577241767, 1e-6);
  });
  it("Eigenkapital = Kaufpreis + Nebenkosten − Kredit (ohne Kreditkosten)", () => {
    const r = run({ kreditPct: (148800 / 175000) * 100 });
    close(r.ek, 175000 + 21370 - 148800, 1e-6);
  });
  it("AfA: 3-fach, 2-fach, dann 1,5 % von (KP + NK) · 80 %", () => {
    const r = run();
    const b = (175000 + 21370) * 0.8 * 0.015;
    close(r.basis.rows[0].afa, b * 3, 1e-6);
    close(r.basis.rows[1].afa, b * 2, 1e-6);
    close(r.basis.rows[2].afa, b, 1e-6);
  });
  it("Kredit ist nach der Laufzeit auf null getilgt", () => {
    const r = run();
    close(r.basis.balEnde, 0, 0.01);
    close(r.basis.rows[r.lz - 1].bal, 0, 0.01);
  });
  it("Cashflow = Miete − Rate − Steuer (Verlust mindert die Steuer)", () => {
    const r = run(), x = r.basis.rows[0];
    close(x.cf, x.miete - x.rate - x.steuer, 1e-6);
    expect(x.steuer).toBeLessThan(0);
  });
});

describe("Anleger: Zuzahlung", () => {
  it("ohne Zuzahlung identisch mit dem Basisszenario", () => {
    const r = run({ zuz: 0 });
    expect(r.mit).toBe(r.basis);
    expect(r.jahreFrueher).toBe(0);
  });
  it("Direkt tilgen: Kredit endet früher, weniger Zinsen, Zuzahlung endet mit dem Kredit", () => {
    const r = run({ zuz: 300, modus: "tilgen" });
    expect(r.jahreFrueher).toBeGreaterThan(3);
    expect(r.zinsErsparnis).toBeGreaterThan(0);
    close(r.mit.balEnde, 0, 0.01);
    const lastZuz = r.mit.rows[r.lz - 1].zuz;
    expect(lastZuz).toBe(0);
    expect(r.mit.zuzGesamt).toBeLessThan(300 * 12 * r.lz);
  });
  it("Direkt tilgen bringt nach Steuer trotz weniger Steuerersparnis mehr Gewinn", () => {
    expect(run({ zuz: 300, modus: "tilgen" }).vorteil).toBeGreaterThan(0);
  });
  it("Depot: löst den Kredit ab, sobald das Netto-Depot (nach KESt) die Restschuld deckt", () => {
    const r = run({ zuz: 400, modus: "depot", depotRend: 6 });
    expect(r.mit.abloeseMonat).not.toBeNull();
    expect(r.mit.kestAbloese).toBeGreaterThan(0);
    expect(r.mit.abloeseUeberschuss).toBeGreaterThanOrEqual(0);
    close(r.mit.balEnde, 0, 0.01);
    expect(r.mit.rows[r.lz - 1].spar).toBe(0);
  });
  it("Depot ohne Rendite löst später ab als mit Rendite", () => {
    const a = run({ zuz: 400, modus: "depot", depotRend: 0 }), b = run({ zuz: 400, modus: "depot", depotRend: 6 });
    expect(b.mit.abloeseMonat!).toBeLessThan(a.mit.abloeseMonat ?? 1e9);
  });
  it("FLV: kein KESt-Abzug, Ablöse vor Jahr 15 ist markierbar", () => {
    const r = run({ zuz: 600, modus: "flv", flvPerf: 6 });
    if (r.mit.abloeseMonat !== null) expect(r.mit.kestAbloese).toBe(0);
    expect(r.mit.rows.length).toBe(r.lz);
  });
  it("Vermögen: Wert − Restschuld + Sparguthaben", () => {
    const r = run({ zuz: 200, modus: "depot", depotRend: 3 });
    const l = r.mit.rows[r.lz - 1];
    close(r.mit.vermoegen, l.wertT - l.bal + l.spar, 1e-6);
  });
});
