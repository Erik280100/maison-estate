// Mietrechner: PDF- und Excel-Export. Die Pakete jspdf und xlsx werden erst beim Klick geladen.
import { MRG_TEXT, calc, kundeS, limits, stress, type S, type Row } from "./rechne";

const n = (v: unknown) => +(v as number) || 0;
const de = (v: number, d: number) => v.toLocaleString("de-AT", { minimumFractionDigits: d, maximumFractionDigits: d });
const PE = (v: number) => (isFinite(v) ? (v < 0 ? "-" : "") + Math.round(Math.abs(v)).toLocaleString("de-AT") + " EUR" : "-");
const PP = (v: number, d = 2) => (isFinite(v) ? de(v * 100, d) + " %" : "-");
const PN = (v: number) => (isFinite(v) ? de(v, 2) : "-");
const n0 = (v: number) => Math.round(v).toLocaleString("de-AT");
const clean = (s: string) => String(s).replace(/€/g, "EUR").replace(/−/g, "-").replace(/–/g, "-");
const rd = (v: number, d = 2) => (isFinite(v) ? Math.round(v * Math.pow(10, d)) / Math.pow(10, d) : null);

/** [Label, Schlüssel, Einheit, nur intern] */
const FIELDS: [string, keyof S, string, number?][] = [
  ["Nutzfläche", "A", "m²"], ["Einkaufspreis pro m²", "kaufM2", "€/m²", 1], ["Marktwert / Kaufpreis Käufer pro m²", "mw", "€/m²"],
  ["Kaufpreis brutto inkl. USt", "kpBrutto", "", 1], ["Netto-Anteil", "nettoAnt", "%", 1],
  ["Grunderwerbsteuer", "grest", "%"], ["Eintragung Eigentum", "eintr", "%"], ["Notar / Treuhand", "notar", "%"], ["Notar pauschal", "notarFix", "€"],
  ["Makler beim Kauf", "maklerOn", ""], ["Maklerprovision", "makler", "%"], ["Sonstige Kosten", "sonst", "€"],
  ["Sanierung", "sanM2", "€/m²", 1], ["Küche / Einrichtung", "einr", "€", 1],
  ["MRG-Bereich", "mrg", ""], ["Richtwert", "rw", "€/m²"], ["Zuschläge", "zu", "%"], ["Abschläge", "ab", "%"], ["Befristet (−25 %)", "befr", ""],
  ["Hauptmietzins frei", "miete", "€/m²"], ["Stellplatz, Keller", "extra", "€/M"], ["Betriebskosten", "bk", "€/m²"],
  ["Leerstand / Mietausfall", "leer", "%"], ["Mietverwaltung", "verw", "€/M"], ["Rücklage", "rl", "€/m²·M"], ["Instandhaltung", "inst", "€/m²·J"],
  ["Inflation p.a.", "infl", "%"], ["Mieterwechsel alle", "wJ", "J."], ["Makler Neuvermietung", "wMM", "BMM"], ["Kosten je Wechsel", "wRen", "€"],
  ["Verspätet bezahlte Miete", "rueck", "%"], ["Ø Verzugsdauer", "verzD", "Mon."], ["Verzugszinsen", "verzZ", "%"],
  ["Eigenmittel-Eingabe", "ekMode", ""], ["Fremdfinanzierung", "fk", "%"], ["Eigenmittel", "ekEur", "€"],
  ["Sollzins", "zins", "%"], ["Fixzinsphase", "zinsFix", "J."], ["Zins danach", "zins2", "%"], ["Laufzeit", "lz", "J."], ["Tilgungsfreie Zeit", "tf", "J."],
  ["Sondertilgung p.a.", "sond", "€"], ["Bearbeitungsgebühr", "bearb", "%"], ["Eintragung Pfandrecht", "pfand", "%"], ["Mindest-DSCR", "dscrZiel", "×"],
  ["Steuerart", "stMode", "", 1], ["Gebäudeanteil", "geb", "%", 1], ["AfA", "afa", "%", 1], ["Beschleunigte AfA", "beschl", "", 1],
  ["KöSt", "koest", "%", 1], ["Verluste verrechnen", "verlust", "", 1], ["Grenzsteuersatz", "grenz", "%", 1], ["Immobilienertragsteuer", "immoest", "%", 1],
  ["Betriebskostenaufstellung liegt vor", "docBk", "", 1], ["Nutzwertgutachten liegt vor", "docNwg", "", 1], ["Energieausweis liegt vor", "docEa", "", 1], ["Hausverwaltung liegt vor", "docHv", "", 1],
  ["Haltedauer", "H", "J."], ["Wertsteigerung p.a.", "wert", "%"], ["Verkaufskosten", "vkk", "%"], ["Ziel-Nettomietrendite", "ziel", "%", 1],
];

function fv(s: S, k: keyof S): string | number {
  const v = s[k];
  if (typeof v === "boolean") return v ? "ja" : "nein";
  if (k === "mrg") return MRG_TEXT[s.mrg];
  if (k === "ekMode") return v === "eur" ? "Eigenmittel in €" : "Fremdfinanzierung in %";
  if (k === "stMode") return v === "privat" ? "Privat" : "GmbH";
  return v as string | number;
}

export const fileName = (s: S, suf: string, ext: string) =>
  "Maison_Miete_" + (s.name || "Objekt").replace(/[^\wäöüÄÖÜß-]+/g, "_") + (suf ? "_" + suf : "") + "." + ext;

export function download(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}

async function pdfBase(title: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFillColor(19, 32, 63); doc.rect(0, 0, 210, 16, "F"); doc.setTextColor(196, 165, 106);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("MAISON ESTATE", 18, 10.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(title, 192, 10.5, { align: "right" }); doc.setTextColor(19, 32, 63);
  const st = { y: 28 };
  const br = (m?: number) => { if (st.y > (m || 278)) { doc.addPage(); st.y = 20; } };
  const line = (a: string, b?: string, bold?: boolean) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.text(clean(a), 18, st.y);
    if (b !== undefined) doc.text(clean(b), 192, st.y, { align: "right" });
    st.y += 6; br();
  };
  const head = (t: string) => {
    st.y += 3; br(262); doc.setFontSize(11); doc.setTextColor(156, 127, 69); line(t, undefined, true);
    doc.setTextColor(19, 32, 63); doc.setFontSize(10);
  };
  const table = (hdr: string[], rows: string[][], cols: number[]) => {
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
    hdr.forEach((h, i) => doc.text(clean(h), cols[i], st.y, { align: i ? "right" : "left" })); st.y += 5;
    doc.setFont("helvetica", "normal");
    rows.forEach((r) => { r.forEach((c, i) => doc.text(clean(c), cols[i], st.y, { align: i ? "right" : "left" })); st.y += 4.6; br(282); });
    doc.setFontSize(10);
  };
  const foot = (t: string) => {
    st.y += 5; br(268); doc.setFontSize(7.5); doc.setTextColor(92, 100, 120);
    doc.text(doc.splitTextToSize(clean(t), 174), 18, st.y);
  };
  return { doc, st, line, head, table, foot };
}

export async function pdfAkte(s: S) {
  const r = calc(s), L = limits(s), { doc, st, line, head, table, foot } = await pdfBase("Mietrechner · Objektakte");
  doc.setFontSize(16); line(s.name || "Objekt", undefined, true); doc.setFontSize(10);
  line((s.adresse || "") + "   Status: " + s.status + "   " + MRG_TEXT[s.mrg] + "   Stand: " + new Date().toLocaleDateString("de-AT"));
  head("Ergebnis");
  ([
    ["Nettomietrendite", PP(r.net)], ["Bruttomietrendite auf Kaufpreis", PP(r.brutto)], ["Kaufpreisfaktor", PN(r.faktor) + "-fach"],
    ["DSCR", isFinite(r.dscr) ? PN(r.dscr) : "kein Kredit"], ["Jahresmiete ÷ Kredit", PP(r.mieteKredit)],
    ["Cashflow nach Steuer Jahr 1", PE(r.cf1) + "  (" + PE(r.cfM) + "/Monat)"], ["Eigenkapitalrendite Jahr 1", PP(r.coc, 1)],
    ["EK-IRR inkl. Verkauf nach " + r.H + " J.", PP(r.irr, 1)],
    ["Max. Kaufpreis für Zielrendite", isFinite(L.kmax) ? Math.floor(L.kmax).toLocaleString("de-AT") + " EUR/m²" : "-"],
    ["Mindestmiete: Rate gedeckt / DSCR " + PN(n(s.dscrZiel)), PN(L.hNull) + " / " + PN(L.hDscr) + " EUR/m²"],
  ] as [string, string][]).forEach(([a, b]) => line(a, b));
  head("Investition & Finanzierung");
  ([
    ["Kaufpreis (netto)", PE(r.kp)], ["Kaufnebenkosten", PE(r.nk)], ["Sonstige Kosten", PE(r.sonst)], ["Sanierung & Einrichtung", PE(r.san)],
    ["Pfandrecht & Bearbeitung", PE(r.finK)], ["Gesamtinvestition", PE(r.inv)], ["Eigenkapital", PE(r.ek)],
    ["Kredit (" + s.zins + " %, " + s.lz + " J." + (r.tf ? ", " + r.tf + " J. tilgungsfrei" : "") + ")", PE(r.kredit)], ["Rate", PE(r.annM) + "/Monat"],
  ] as [string, string][]).forEach(([a, b], i) => line(a, b, i === 5));
  head("Miete & Bewirtschaftung pro Jahr");
  ([
    ["Hauptmietzins", PN(r.hmz) + " EUR/m²"], ["Sollmiete inkl. Nebenflächen", PE(r.mieteJ)], ["Leerstand " + s.leer + " %", PE(-r.mieteJ * s.leer / 100)],
    ["Verzugszinsen netto", PE(r.verzJ)], ["Mieterwechsel (Makler, Ausmalen)", PE(-r.wechselJ)],
    ["Übrige nicht umlegbare Kosten", PE(-(r.kostenJ - r.wechselJ))], ["Mietertrag nach Kosten", PE(r.noi)],
  ] as [string, string][]).forEach(([a, b], i, arr) => line(a, b, i === arr.length - 1));
  head("Stresstest");
  table(["Szenario", "Nettorendite", "DSCR", "Cashflow/M", "EK-IRR"],
    stress(s).map(({ n: nm, r: x }) => [nm, PP(x.net), isFinite(x.dscr) ? PN(x.dscr) : "-", PE(x.cfM), PP(x.irr, 1)]), [18, 120, 142, 168, 192]);
  head("Hochrechnung");
  table(["Jahr", "Miete eff.", "Ertrag", "Zinsen", "Tilgung", "AfA", r.priv ? "ESt" : "KöSt", "Cashflow", "Restschuld"],
    r.rows.map((x: Row) => [x.t + " (" + (2026 + x.t) + ")", PE(x.eff), PE(x.ertrag), PE(x.zinsJ), PE(x.tilgJ), PE(x.afaJ), PE(x.st), PE(x.cf), PE(x.bal)]),
    [18, 52, 70, 88, 106, 124, 142, 165, 192]);
  st.y += 2;
  line("Summe laufender Cashflow ohne Verkauf", PE(r.sumCf));
  line("Verkauf nach " + r.H + " Jahren: " + PE(r.sale) + ", netto nach Kosten, Kredit und Steuer", PE(r.exNet), true);
  head("Unterlagen vom Makler");
  ([["Betriebskostenaufstellung", s.docBk], ["Nutzwertgutachten", s.docNwg], ["Energieausweis", s.docEa], ["Hausverwaltung", s.docHv]] as [string, boolean][])
    .forEach(([a, b]) => line(a, b ? "liegt vor" : "offen"));
  head("Eingaben"); doc.setFontSize(8.5);
  FIELDS.forEach(([l, kk, u]) => {
    doc.text(clean(l), 18, st.y); doc.text(clean(String(fv(s, kk)) + (u ? " " + u : "")), 110, st.y, { align: "right" });
    st.y += 4.4; if (st.y > 282) { doc.addPage(); st.y = 20; }
  });
  foot("Interne Kalkulation mit Annahmen, keine Steuer- oder Rechtsberatung. MRG-Bereich mit Mag. Ogris, AfA und Gebäudeanteil mit Mag. Hauser abstimmen.");
  return { blob: doc.output("blob"), name: fileName(s, "Objektakte", "pdf") };
}

export async function pdfExpose(s: S) {
  const x = calc(kundeS(s)), A = x.A, { doc, line, head, table, foot } = await pdfBase("Renditeberechnung");
  const lr = x.rows[x.rows.length - 1];
  doc.setFontSize(18); line(s.name || "Anlagewohnung", undefined, true); doc.setFontSize(10);
  if (s.adresse) line(s.adresse);
  head("Objekt & Kaufpreis");
  ([
    ["Nutzfläche", n0(A) + " m²"], ["Kaufpreis", PE(x.kp) + "  (" + n0(x.kp / A) + " EUR/m²)"],
    ["Kaufnebenkosten ca.", PE(x.nk) + "  (" + PP(x.nkR, 1) + ")"], ["Gesamtkosten inkl. Finanzierungsnebenkosten", PE(x.inv)],
  ] as [string, string][]).forEach(([a, b]) => line(a, b));
  head("Miete");
  ([
    ["Mietzins netto", PN(x.hmz) + " EUR/m²  ·  " + PE(x.hmz * A + n(s.extra)) + "/Monat"], ["Jahresnettomiete", PE(x.mieteJ)],
    ["Mietrechtlicher Rahmen", MRG_TEXT[s.mrg]], ["Wertsicherung", "jährlich 1. April, Mieten-Wertsicherungsgesetz"],
  ] as [string, string][]).forEach(([a, b]) => line(a, b));
  head("Rendite");
  ([
    ["Bruttomietrendite auf den Kaufpreis", PP(x.brutto)], ["Nettomietrendite nach Kosten und Leerstand", PP(x.net)], ["Kaufpreisfaktor", PN(x.faktor) + "-fach"],
  ] as [string, string][]).forEach(([a, b]) => line(a, b));
  head("Finanzierungsbeispiel");
  ([
    ["Eigenmittel", PE(x.ek) + "  (" + PP(x.inv > 0 ? x.ek / x.inv : 0, 0) + ")"], ["Kredit", PE(x.kredit)],
    ["Zinssatz / Laufzeit", s.zins + " % / " + s.lz + " Jahre" + (x.tf ? ", " + x.tf + " J. tilgungsfrei" : "")], ["Monatliche Rate", PE(x.annM)],
    ["Überschuss vor Steuern im 1. Jahr", PE(x.cfPre1 / 12) + "/Monat"], ["Eigenkapital im Objekt nach " + x.H + " Jahren", PE(lr.wertT - lr.bal)],
  ] as [string, string][]).forEach(([a, b]) => line(a, b));
  head("Entwicklung über " + x.H + " Jahre (vor Steuern)");
  table(["Jahr", "Miete eff.", "Kosten", "Ertrag", "Kreditrate", "Überschuss", "Restschuld"],
    x.rows.map((r) => [r.t + " (" + (2026 + r.t) + ")", PE(r.eff), PE(r.kost), PE(r.ertrag), PE(r.paid), PE(r.ertrag - r.paid), PE(r.bal)]),
    [18, 60, 82, 106, 132, 160, 192]);
  foot("Beispielrechnung der Maison Estate GmbH auf Basis von Annahmen zu Miete, Leerstand, Kosten, Zinsen und Inflation (Stand " + new Date().toLocaleDateString("de-AT") +
    "). Sie stellt keine Zusicherung von Ertrag, Mietentwicklung oder Wertsteigerung dar und ersetzt keine Steuer-, Rechts- oder Finanzierungsberatung. Steuerliche Auswirkungen sind nicht berücksichtigt. Finanzierung vorbehaltlich Bankzusage.");
  return { blob: doc.output("blob"), name: fileName(s, "Expose", "pdf") };
}

export async function excel(s: S, kunde: boolean) {
  const XL = await import("xlsx");
  const SE = kunde ? kundeS(s) : s, r = calc(SE), L = limits(SE), k = kunde, wb = XL.utils.book_new();
  const sheet = (aoa: unknown[][], w: number[]) => {
    const ws = XL.utils.aoa_to_sheet(aoa);
    ws["!cols"] = w.map((c) => ({ wch: c }));
    return ws;
  };
  const res: unknown[][] = [
    ["Maison Estate GmbH – Mietrechner" + (k ? " (Käufersicht, vor Steuern)" : "")], [s.name || "Objekt", s.adresse || ""], ["Stand", new Date().toLocaleDateString("de-AT")], [],
    ["Kennzahl", "Wert", "Einheit"], ["Nettomietrendite", rd(r.net * 100), "%"], ["Bruttomietrendite auf Kaufpreis", rd(r.brutto * 100), "%"],
    ["Kaufpreisfaktor", rd(r.faktor), "×"], ["DSCR", isFinite(r.dscr) ? rd(r.dscr) : "kein Kredit", "×"], ["Jahresmiete ÷ Kredit", rd(r.mieteKredit * 100), "%"],
    [k ? "Überschuss vor Steuern Jahr 1" : "Cashflow nach Steuer Jahr 1", rd(k ? r.cfPre1 : r.cf1, 0), "€"],
    ["pro Monat", rd((k ? r.cfPre1 : r.cf1) / 12, 0), "€"], ["EK-Rendite Jahr 1", rd(r.coc * 100), "%"], ["EK-IRR inkl. Verkauf", rd(r.irr * 100), "%"], [],
    ["Kaufpreis (netto)", rd(r.kp, 0), "€"], ["Kaufnebenkosten", rd(r.nk, 0), "€"], ["Sonstige Kosten", rd(r.sonst, 0), "€"],
    ...(k ? [] : [["Sanierung & Einrichtung", rd(r.san, 0), "€"]]),
    ["Pfandrecht & Bearbeitung", rd(r.finK, 0), "€"], ["Gesamtinvestition", rd(r.inv, 0), "€"], ["Eigenkapital", rd(r.ek, 0), "€"],
    ["Kredit", rd(r.kredit, 0), "€"], ["Rate pro Monat", rd(r.annM, 0), "€"], [],
    ["Hauptmietzins", rd(r.hmz), "€/m²"], ["Sollmiete p.a.", rd(r.mieteJ, 0), "€"], ["Verzugszinsen netto p.a.", rd(r.verzJ, 0), "€"],
    ["Mieterwechsel p.a.", rd(r.wechselJ, 0), "€"], ["Nicht umlegbare Kosten gesamt p.a.", rd(r.kostenJ, 0), "€"], ["Mietertrag nach Kosten p.a.", rd(r.noi, 0), "€"], [],
    ...(k ? [] : [["Max. Kaufpreis für Zielrendite", isFinite(L.kmax) ? Math.floor(L.kmax) : null, "€/m²"]]),
    ["Mindestmiete: Rate gedeckt", rd(L.hNull), "€/m²"], ["Mindestmiete für DSCR", rd(L.hDscr), "€/m²"], [],
    ["Wert nach " + r.H + " J.", rd(r.sale, 0), "€"], ["Verkauf netto nach Kredit" + (k ? "" : " und Steuer"), rd(r.exNet, 0), "€"], [],
    ["Beispielrechnung auf Basis von Annahmen, keine Zusicherung von Ertrag oder Wertentwicklung."],
  ];
  XL.utils.book_append_sheet(wb, sheet(res, [38, 18, 10]), "Ergebnis");
  XL.utils.book_append_sheet(wb, sheet([["Eingabe", "Wert", "Einheit"], ...FIELDS.filter((f) => !(k && f[3])).map(([l, kk, u]) => [l, fv(s, kk), u])], [34, 30, 10]), "Eingaben");
  const hdr = k
    ? ["Jahr", "Kalenderjahr", "Miete/Monat", "Miete eff.", "Kosten", "Ertrag", "Zinsen", "Tilgung", "Kreditrate", "Überschuss", "Restschuld", "Objektwert"]
    : ["Jahr", "Kalenderjahr", "Miete/Monat", "Miete eff.", "Kosten", "Ertrag", "Zinsen", "Tilgung", "Kreditrate", "Überschuss vor AfA", "AfA", "Steuerpfl. Gewinn", "Steuer", "Nettogewinn", "Cashflow", "Restschuld", "Objektwert"];
  const body = r.rows.map((y) =>
    k
      ? [y.t, 2026 + y.t, rd(y.mieteM, 0), rd(y.eff, 0), rd(y.kost, 0), rd(y.ertrag, 0), rd(y.zinsJ, 0), rd(y.tilgJ, 0), rd(y.paid, 0), rd(y.cf, 0), rd(y.bal, 0), rd(y.wertT, 0)]
      : [y.t, 2026 + y.t, rd(y.mieteM, 0), rd(y.eff, 0), rd(y.kost, 0), rd(y.ertrag, 0), rd(y.zinsJ, 0), rd(y.tilgJ, 0), rd(y.paid, 0), rd(y.vorAfa, 0), rd(y.afaJ, 0), rd(y.evs, 0), rd(y.st, 0), rd(y.netto, 0), rd(y.cf, 0), rd(y.bal, 0), rd(y.wertT, 0)]);
  XL.utils.book_append_sheet(wb, sheet([hdr, ...body, [], ["Summe laufender Cashflow ohne Verkauf", null, rd(r.sumCf, 0)], ["Verkauf netto", null, rd(r.exNet, 0)]], hdr.map(() => 13)), "Hochrechnung");
  XL.utils.book_append_sheet(wb, sheet([
    ["Szenario", "Nettorendite %", "DSCR", k ? "Überschuss/M €" : "Cashflow/M €", "EK-IRR %"],
    ...stress(SE).map(({ n: nm, r: x }) => [nm, rd(x.net * 100), isFinite(x.dscr) ? rd(x.dscr) : null, rd(k ? x.cfPre1 / 12 : x.cfM, 0), rd(x.irr * 100)]),
  ], [44, 15, 10, 16, 12]), "Stresstest");
  const out = XL.write(wb, { bookType: "xlsx", type: "array" });
  return { blob: new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name: fileName(s, k ? "Kunde" : "", "xlsx") };
}
