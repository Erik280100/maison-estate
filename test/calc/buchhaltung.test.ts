import { describe, expect, it } from "vitest";
import type { Beleg, Gesellschafter, Kredit } from "../../src/features/buchhaltung/types";
import { KONTEN_BASIS, kontenMit } from "../../src/features/buchhaltung/konten";
import { buildLines, validate, type Ctx } from "../../src/features/buchhaltung/logik/buchung";
import { tilgungsplan } from "../../src/features/buchhaltung/logik/kredit";
import { offenePosten } from "../../src/features/buchhaltung/logik/op";
import { autoMapping, csvZuPosten, parseCsv, vorschlag } from "../../src/features/buchhaltung/logik/bank";
import { afaPlan, gsSalden, projektAuswertung, uebersicht } from "../../src/features/buchhaltung/logik/auswertung";
import { GENESIS, hashInput, integritaet, sha256Hex } from "../../src/features/buchhaltung/logik/hash";
import { extractRechnung } from "../../src/features/buchhaltung/logik/extract";

const gs: Gesellschafter[] = [
  { id: "g1", name: "Erik Bindar", nr: 1, iban: "AT611904300234573201", stammeinlage: 17500 },
  { id: "g2", name: "Max Muster", nr: 2, stammeinlage: 17500 },
];
const konten = Object.fromEntries(kontenMit(gs));
const base = (o: Partial<Beleg> = {}): Beleg => ({
  id: "b", art: "ER", status: "Entwurf", belegdatum: "2026-01-10", partner: "Baumarkt", beschreibung: "Material",
  vorsteuer: true, gegenkonto: "3300", brutto: 120,
  positionen: [{ text: "Farbe", konto: "5300", netto: 100, satz: 20, ust: 20 }], ...o,
});
const ctx = (belege: Beleg[] = []): Ctx => ({ belege, perioden: {}, konten });

describe("Buchungssatz", () => {
  it("ER mit Vorsteuer: Aufwand + Vorsteuer an Verbindlichkeit", () => {
    expect(buildLines(base())).toEqual([
      { konto: "5300", soll: 10000, haben: 0, text: "Farbe" },
      { konto: "2500", soll: 2000, haben: 0, text: "Vorsteuer 20 %" },
      { konto: "3300", soll: 0, haben: 12000, text: "Baumarkt" },
    ]);
  });
  it("ohne Vorsteuerabzug wird brutto aufwandswirksam", () => {
    const L = buildLines(base({ vorsteuer: false }));
    expect(L[0].soll).toBe(12000);
    expect(L).toHaveLength(2);
  });
  it("Reverse Charge: Vorsteuer und USt gleichen sich aus", () => {
    const L = buildLines(base({ reverseCharge: true, brutto: 100, positionen: [{ text: "x", konto: "5800", netto: 100, satz: 20, ust: 0 }] }));
    expect(L.find((l) => l.konto === "2506")!.soll).toBe(2000);
    expect(L.find((l) => l.konto === "3506")!.haben).toBe(2000);
    expect(L.find((l) => l.konto === "3300")!.haben).toBe(10000);
  });
  it("AR: Forderung an Erlös und USt", () => {
    const L = buildLines(base({ art: "AR", gegenkonto: "2000", positionen: [{ text: "Prov.", konto: "4800", netto: 100, satz: 20, ust: 20 }] }));
    expect(L[0]).toMatchObject({ konto: "2000", soll: 12000 });
    expect(L.map((l) => l.konto)).toEqual(["2000", "4800", "3500"]);
  });
  it("privat bezahlt: Verrechnungskonto des Gesellschafters im Haben", () => {
    const L = buildLines(base({ gegenkonto: "3181", gs: "g1" }));
    expect(L[L.length - 1]).toMatchObject({ konto: "3181", haben: 12000 });
  });
});

describe("Validierung", () => {
  it("fehlerfreier Beleg", () => expect(validate(base(), ctx()).err).toEqual([]));
  it("Betrag weicht vom Beleg ab", () => expect(validate(base({ brutto: 130 }), ctx()).err.length).toBe(1));
  it("negative Kassa wird abgelehnt", () => {
    const v = validate(base({ art: "KA", gegenkonto: "2700" }), ctx());
    expect(v.err.some((e) => e.includes("Kassa"))).toBe(true);
  });
  it("unbekanntes Konto", () => {
    const v = validate(base({ positionen: [{ text: "", konto: "9999", netto: 100, satz: 20, ust: 20 }] }), ctx());
    expect(v.err.some((e) => e.includes("9999"))).toBe(true);
  });
  it("festgeschriebener Zeitraum", () => {
    const v = validate(base(), { ...ctx(), perioden: { gesperrtBis: "2026-01" } });
    expect(v.err.some((e) => e.includes("festgeschrieben"))).toBe(true);
  });
  it("Doppelbeleg wird gewarnt", () => {
    const alt = base({ id: "x", status: "Gebucht", rechnungsnr: "R1", nr: "ER-2026-0001" });
    const v = validate(base({ rechnungsnr: "R1" }), ctx([alt]));
    expect(v.warn.some((w) => w.includes("Doppelbeleg"))).toBe(true);
  });
  it("PKW ohne Vorsteuerabzug erinnert", () => {
    const v = validate(base({ positionen: [{ text: "", konto: "0630", netto: 100, satz: 20, ust: 20 }] }), ctx());
    expect(v.warn.some((w) => w.includes("PKW"))).toBe(true);
  });
});

describe("Kredit", () => {
  const k = { betrag: 100000, zinssatz: 3.6, laufzeitMonate: 120, beginn: "2026-01-15", ersteRate: "", rate: null, intervall: "monat", tilgungsart: "annuitaet" } as Kredit;
  it("Annuität tilgt vollständig", () => {
    const { rows } = tilgungsplan(k);
    expect(rows).toHaveLength(120);
    expect(rows[119].rest).toBe(0);
    expect(rows[0].zins).toBe(30000);
  });
  it("endfällig: nur Zinsen, am Ende die Tilgung", () => {
    const { rows } = tilgungsplan({ ...k, tilgungsart: "endfaellig" });
    expect(rows[0].tilgung).toBe(0);
    expect(rows[119].tilgung).toBe(10000000);
  });
});

const gebucht = (b: Partial<Beleg>): Beleg => ({ ...base(), status: "Gebucht", ...b }) as Beleg;

describe("Offene Posten", () => {
  it("Teilzahlung reduziert den offenen Betrag", () => {
    const er = gebucht({ id: "e1", nr: "ER-2026-0001", zeilen: buildLines(base()) });
    const zahl = gebucht({ id: "z1", art: "BA", ausgleich: "e1", zeilen: [{ konto: "3300", soll: 5000, haben: 0 }, { konto: "2800", soll: 0, haben: 5000 }] });
    const op = offenePosten([er, zahl]);
    expect(op[0].offen).toBe(7000);
  });
});

describe("Bank", () => {
  const er = gebucht({ id: "e1", nr: "ER-2026-0001", rechnungsnr: "R-77", partner: "Baumarkt", zeilen: buildLines(base()) });
  const c = (belege: Beleg[]) => ({ belege, kredite: [], gesellschafter: gs, konten });
  it("ordnet Zahlung der offenen Rechnung zu", () => {
    const v = vorschlag({ datum: "2026-02-01", betrag: -120, partner: "Baumarkt", verwendungszweck: "R-77" }, c([er]));
    expect(v.sicher).toBe(true);
    expect(v.ausgleich).toBe("e1");
  });
  it("Erstattung an Gesellschafter mit offenem Saldo", () => {
    const privat = gebucht({ id: "p1", gs: "g1", gegenkonto: "3181", zeilen: buildLines(base({ gegenkonto: "3181" })) });
    const v = vorschlag({ datum: "2026-02-01", betrag: -120, partner: "Erik Bindar", verwendungszweck: "Auslagen" }, c([privat]));
    expect(v.gs).toBe("g1");
    expect(v.sicher).toBe(true);
    expect(v.zeilen[0].konto).toBe("3181");
  });
  it("unbekannter Umsatz ist nie sicher", () => {
    expect(vorschlag({ datum: "2026-02-01", betrag: -9.9, partner: "?", verwendungszweck: "?" }, c([])).sicher).toBe(false);
  });
  it("CSV-Import erkennt Spalten und Beträge", () => {
    const csv = "Buchungsdatum;Valuta;Partnername;Verwendungszweck;Betrag\n05.02.2026;05.02.2026;Baumarkt;Rechnung R-77;-1.234,56\n06.02.2026;06.02.2026;Kunde;Miete;2.000,00\n";
    const rows = parseCsv(csv);
    const m = autoMapping(rows);
    const p = csvZuPosten(rows, m);
    expect(p).toHaveLength(2);
    expect(p[0]).toMatchObject({ datum: "2026-02-05", betrag: -1234.56, partner: "Baumarkt" });
  });
});

describe("Auswertung", () => {
  it("Gesellschafter-Saldo: Auslagen minus Erstattung", () => {
    const privat = gebucht({ id: "p1", gs: "g1", zeilen: buildLines(base({ gegenkonto: "3181" })) });
    const erst = gebucht({ id: "p2", art: "BA", zeilen: [{ konto: "3181", soll: 5000, haben: 0 }, { konto: "2800", soll: 0, haben: 5000 }] });
    const s = gsSalden([privat, erst], gs);
    expect(s[0].auslagen).toBe(12000);
    expect(s[0].saldo).toBe(7000);
    expect(s[1].saldo).toBe(0);
  });
  it("Übersicht trennt Einnahmen, Ausgaben, Objekt- und Anlageninvestition", () => {
    const b = [
      gebucht({ belegdatum: "2026-03-01", zeilen: [{ konto: "5000", soll: 100000, haben: 0 }, { konto: "3300", soll: 0, haben: 100000 }] }),
      gebucht({ belegdatum: "2026-03-02", zeilen: [{ konto: "7600", soll: 5000, haben: 0 }, { konto: "3300", soll: 0, haben: 5000 }] }),
      gebucht({ belegdatum: "2026-03-03", zeilen: [{ konto: "0620", soll: 80000, haben: 0 }, { konto: "3300", soll: 0, haben: 80000 }] }),
      gebucht({ belegdatum: "2026-03-04", zeilen: [{ konto: "2800", soll: 30000, haben: 0 }, { konto: "4880", soll: 0, haben: 30000 }] }),
    ];
    const u = uebersicht(b, "2026").summe;
    expect(u).toEqual({ einnahmen: 30000, ausgaben: 5000, invObjekte: 100000, invAnlagen: 80000 });
  });
  it("Projekt: investiert, Marge und ROI", () => {
    const b = [
      gebucht({ projektId: "p", zeilen: [{ konto: "5000", soll: 200000, haben: 0 }, { konto: "3300", soll: 0, haben: 200000 }] }),
      gebucht({ projektId: "p", zeilen: [{ konto: "5800", soll: 50000, haben: 0 }, { konto: "3300", soll: 0, haben: 50000 }] }),
      gebucht({ projektId: "p", zeilen: [{ konto: "2800", soll: 300000, haben: 0 }, { konto: "4000", soll: 0, haben: 300000 }] }),
    ];
    const r = projektAuswertung(b, { id: "p", name: "Test" });
    expect(r.investiert).toBe(250000);
    expect(r.marge).toBe(50000);
    expect(r.roi).toBeCloseTo(0.2);
  });
  it("AfA: Halbjahresregel, GWG sofort", () => {
    const h1 = afaPlan({ ak: 3000, anschaffung: "2026-03-01", nutzungsdauer: 3, konto: "0620" });
    expect(h1.map((r) => r.afa)).toEqual([100000, 100000, 100000]);
    const h2 = afaPlan({ ak: 3000, anschaffung: "2026-09-01", nutzungsdauer: 3, konto: "0620" });
    expect(h2[0].afa).toBe(50000);
    expect(h2.reduce((s, r) => s + r.afa, 0)).toBe(300000);
    expect(afaPlan({ ak: 900, anschaffung: "2026-09-01", nutzungsdauer: 3, konto: "0680" })).toEqual([{ jahr: 2026, afa: 90000, restbuchwert: 0 }]);
  });
});

describe("Hash-Kette", () => {
  it("alte Buchungen (ohne hv) bleiben mit der ursprünglichen Feldliste prüfbar", async () => {
    const b1: Beleg = { ...gebucht({}), seq: 1, nr: "ER-2026-0001", prevHash: GENESIS, zeilen: buildLines(base()), gebuchtAm: "2026-01-11", gebuchtVon: "u" };
    b1.hash = await sha256Hex(hashInput(b1));
    const b2: Beleg = { ...gebucht({}), seq: 2, nr: "ER-2026-0002", hv: 2, projektId: "p", prevHash: b1.hash, zeilen: buildLines(base()), gebuchtAm: "2026-01-12", gebuchtVon: "u" };
    b2.hash = await sha256Hex(hashInput(b2));
    expect((await integritaet([b1, b2], b2.hash)).ok).toBe(true);
    const manip = { ...b2, projektId: "anderes" };
    const r = await integritaet([b1, manip], b2.hash);
    expect(r.ok).toBe(false);
  });
});

describe("Rechnungserkennung (ohne KI)", () => {
  const text = `Muster Baustoffe GmbH\nMusterstraße 1, 8010 Graz\nUID: ATU12345678\nRechnung Nr. RE-2026-0042\nRechnungsdatum: 12.03.2026\nFällig am: 26.03.2026\nNetto 100,00\n20 % USt 20,00\nGesamtbetrag 120,00\nIBAN AT61 1904 3002 3457 3201`;
  it("liest Datum, Nummer, UID, Beträge und IBAN", () => {
    const e = extractRechnung(text);
    expect(e.partner).toBe("Muster Baustoffe GmbH");
    expect(e.belegdatum).toBe("2026-03-12");
    expect(e.faellig).toBe("2026-03-26");
    expect(e.rechnungsnr).toBe("RE-2026-0042");
    expect(e.uid).toBe("ATU12345678");
    expect(e.brutto).toBe(120);
    expect(e.ust).toBe(20);
    expect(e.satz).toBe(20);
    expect(e.iban).toBe("AT611904300234573201");
  });
});

describe("Kontenplan", () => {
  it("Gesellschafterkonten werden ergänzt", () => {
    expect(konten["3181"]).toContain("Erik Bindar");
    expect(konten["3182"]).toContain("Max Muster");
    expect(KONTEN_BASIS.find((k) => k[0] === "7010")).toBeTruthy();
  });
});
