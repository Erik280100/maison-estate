import { describe, expect, it } from "vitest";
import { DEFAULTS, calc, growth, irr, limits, stress, type S } from "../../src/features/rechner/miete/rechne";

const run = (o: Partial<S> = {}, x = {}) => calc({ ...DEFAULTS, ...o }, x);
const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe("Miete: Standardwerte", () => {
  it("Zins 3,5 %, Pfandrecht inkl. 20 % Nebengebühren, keine beschleunigte AfA, Richtwert 9,30", () => {
    expect(DEFAULTS.zins).toBe(3.5);
    expect(DEFAULTS.pfand).toBeCloseTo(1.2 * 1.2, 10);
    expect(DEFAULTS.beschl).toBe(false);
    expect(DEFAULTS.rw).toBe(9.3);
    expect(DEFAULTS.sanJ).toBe(15);
  });
});

describe("Miete: Mietanpassung (MieWeG)", () => {
  it("bis 3 % voller VPI, darüber nur die Hälfte", () => {
    close(growth({ ...DEFAULTS, infl: 2.5 }), 0.025);
    close(growth({ ...DEFAULTS, infl: 3 }), 0.03);
    close(growth({ ...DEFAULTS, infl: 5 }), 0.04);
  });
  it("Vollausnahme (ABGB): freie Wertsicherung, voller VPI", () => {
    close(growth({ ...DEFAULTS, mrg: "aus", infl: 5 }), 0.05);
  });
});

describe("Miete: Mietausfall und Verzug", () => {
  it("uneinbringliche Mieten senken den Ertrag um genau den Prozentsatz der Miete nach Leerstand", () => {
    const a = run({ ausfall: 0 }), b = run({ ausfall: 2 });
    close(a.noi - b.noi, a.mieteJ * (1 - 0.03) * 0.02, 1e-6);
  });
  it("Zinseffekt des Verzugs ist klein und kein Ausfallrisiko", () => {
    const r = run({ ausfall: 0 });
    expect(Math.abs(r.verzJ)).toBeLessThan(r.mieteJ * 0.001);
  });
});

describe("Miete: Abschreibung der Sanierung", () => {
  it("Sanierung wird gleichmäßig über sanJ Jahre abgeschrieben, nicht mit 1,5 %", () => {
    const base = run({ sanM2: 0, H: 20 }), mit = run({ sanM2: 300, A: 60, H: 20 });
    close(mit.rows[0].afaJ - base.rows[0].afaJ, (300 * 60) / 15, 1e-6);
    close(mit.rows[14].afaJ - base.rows[14].afaJ, (300 * 60) / 15, 1e-6);
    close(mit.rows[15].afaJ - base.rows[15].afaJ, 0, 1e-6); // nach 15 Jahren abgeschrieben
  });
  it("Abschreibungsdauer einstellbar", () => {
    const base = run({ sanM2: 0 }), mit = run({ sanM2: 300, A: 60, sanJ: 10 });
    close(mit.rows[0].afaJ - base.rows[0].afaJ, (300 * 60) / 10, 1e-6);
  });
  it("Einrichtung über 10 Jahre", () => {
    const base = run({ einr: 0 }), mit = run({ einr: 5000 });
    close(mit.rows[0].afaJ - base.rows[0].afaJ, 500, 1e-6);
  });
  it("beschleunigte AfA nur auf das Gebäude: 3× / 2× / 1×", () => {
    const n = run({ beschl: false, sanM2: 0 }), b = run({ beschl: true, sanM2: 0 });
    const lin = n.rows[0].afaJ;
    close(b.rows[0].afaJ, 3 * lin, 1e-6);
    close(b.rows[1].afaJ, 2 * lin, 1e-6);
    close(b.rows[2].afaJ, lin, 1e-6);
  });
  it("Buchwert beim Exit = Anschaffung + Sanierung - bisherige AfA (+ offene Finanzierungskosten)", () => {
    const r = run({ H: 10, sanM2: 300, einr: 3000, A: 60 });
    const afaSumme = r.rows.reduce((s, x) => s + x.afaJ, 0);
    const finOffen = Math.max(r.finK - (r.finK / DEFAULTS.lz) * Math.min(10, DEFAULTS.lz), 0);
    close(r.buch, r.kp + r.nk + 300 * 60 + 3000 - afaSumme + finOffen, 1e-4);
  });
});

describe("Miete: Grenzwerte und Finanzierung", () => {
  it("Mindestmiete für Ratendeckung 1,0 und für das Bankziel", () => {
    const L = limits(DEFAULTS);
    close(run({}, { hmz: L.hNull }).dscr, 1, 1e-6);
    close(run({}, { hmz: L.hDscr }).dscr, DEFAULTS.dscrZiel, 1e-6);
  });
  it("Mindestmiete für die Zielrendite und maximaler Kaufpreis", () => {
    const L = limits(DEFAULTS);
    close(run({}, { hmz: L.hZiel }).net, DEFAULTS.ziel / 100, 1e-6);
    close(run({}, { kpM2: L.kmax }).net, DEFAULTS.ziel / 100, 1e-6);
  });
  it("Kredit endet nach der Laufzeit bei 0, Rate stimmt mit Annuitätenformel", () => {
    const r = run({ lz: 10, H: 10, ekMode: "pct", fk: 60 });
    const i = DEFAULTS.zins / 100 / 12;
    close(r.annM, (r.kredit * i) / (1 - Math.pow(1 + i, -120)), 1e-6);
    expect(r.rows[9].bal).toBeLessThan(0.01);
  });
  it("Eigenmittel in Euro: eingesetztes Eigenkapital entspricht der Eingabe", () => {
    const r = run({ ekMode: "eur", ekEur: 40000 });
    close(r.ek, 40000, 1e-6);
  });
  it("Stresstest Basis entspricht der Grundrechnung", () => {
    const s = stress(DEFAULTS);
    close(s[0].r.net, run().net);
    expect(s.length).toBeGreaterThan(4);
    expect(s[1].r.cfM).toBeLessThan(s[0].r.cfM);
  });
});

describe("Miete: Hilfsfunktionen", () => {
  it("IRR einer einfachen Zahlungsreihe", () => {
    close(irr([-100, 110]), 0.1, 1e-9);
    close(irr([-100, 0, 121]), 0.1, 1e-9);
  });
});
