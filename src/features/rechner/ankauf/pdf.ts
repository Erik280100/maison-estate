// PDF-Export des Ankauf-Rechners: Objektakte und Kreditanfrage (jspdf wird erst beim Klick geladen).
import { cash, halten, limits, num, rechne, type Gewerk, type NkPos, type V } from "./rechne";
import { freigabe, median, reserve, type Zus } from "./zusatzRechne";

const E = (v: number) => (isFinite(v) ? (v < 0 ? "-" : "") + Math.round(Math.abs(v)).toLocaleString("de-AT") + " EUR" : "-");
const P = (v: number) => (isFinite(v) ? v.toLocaleString("de-AT", { maximumFractionDigits: 1 }) + " %" : "-");
const clean = (s: string) => String(s).replace(/€/g, "EUR").replace(/−/g, "-").replace(/–/g, "-");
const safe = (s: string) => (s || "Objekt").replace(/[^\wäöüÄÖÜß-]+/g, "_");

async function base(title: string, name: string, sub: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 26;
  const line = (a: string, b?: string, bold?: boolean) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.text(clean(a), 18, y);
    if (b !== undefined) doc.text(clean(b), 192, y, { align: "right" });
    y += 6.2; if (y > 280) { doc.addPage(); y = 20; }
  };
  const head = (t: string) => { y += 3; doc.setFontSize(11); line(t, undefined, true); doc.setFontSize(10); };
  doc.setFillColor(19, 32, 63); doc.rect(0, 0, 210, 14, "F"); doc.setTextColor(196, 165, 106);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(clean("MAISON ESTATE GmbH  ·  " + title), 18, 9);
  doc.setTextColor(19, 32, 63); doc.setFontSize(16); line(name || "Objekt", undefined, true); doc.setFontSize(10); line(sub);
  const foot = (t: string) => { y += 4; doc.setFontSize(8); doc.setTextColor(92, 100, 120); doc.text(clean(t), 18, y); };
  return { doc, line, head, foot };
}

export async function pdfObjektakte(v: V, g: Gewerk[], nk: NkPos[], z: Zus) {
  const r = rechne(v, g, nk), L = limits(v, g, nk), H = halten(v, g, nk), C = cash(v, g, nk), F = freigabe(v, z, r);
  const { doc, line, head, foot } = await base("Ankauf, Sanierung & Verkauf", z.name,
    `${z.adresse || ""}   Status: ${z.status}   Einkauf: ${r.vers ? "Versteigerung" : "freier Kauf"}   Stand: ${new Date().toLocaleDateString("de-AT")}`);
  head("Ergebnis");
  ([
    ["Marge vor Steuer auf Gesamtkosten", P(r.marge)], ["Erlös", E(r.erloes)], ["Gesamtkosten", E(r.tot)], ["Gewinn vor Steuern", E(r.gewinn)],
    ["Gewinn nach KöSt", E(r.netto)], ["Eigenkapitalbedarf", E(r.ek)], ["Dauer", r.M + " Monate"],
    ["Tilgung vor Verkauf", r.tilg ? E(r.tilg) + " (Rate " + E(r.rate) + "/Mon.)" : "keine"],
    [r.vers ? "Maximalgebot für Zielmarge" : "Max. Kaufpreis für Zielmarge", r.vers ? E(L.kmax) : Math.floor(L.kmax / r.A).toLocaleString("de-AT") + " EUR/m²"],
  ] as [string, string][]).forEach(([a, b]) => line(a, b));
  head("Kostenaufstellung");
  ([
    ["Kaufpreis", r.kp], ["Ankaufsnebenkosten", r.kaufNk], ["Sonderumlage", r.sonder], ["Sanierung", r.san], ["Finanzierungsnebenkosten", r.finNk],
    ["Zinsen", r.zinsen], ["Haltekosten", r.halte], ["Verkaufsprovision", r.prov], ["Gewährleistungsvorsorge", r.rl],
  ] as [string, number][]).filter(([, x]) => x).forEach(([a, x]) => line(a, E(x)));
  line("Gesamtkosten", E(r.tot), true);
  if (v.sanModus !== "pausch") {
    head("Sanierung nach Gewerken (netto)");
    g.forEach((x) => line(x.n + (x.firma ? " - " + x.firma : "") + (num(x.ist) > 0 ? " (Ist)" : ""), E(num(x.ist) > 0 ? num(x.ist) : num(x.menge) * (num(x.mat) + num(x.lohn)))));
    nk.filter((x) => num(x.betrag)).forEach((x) => line(x.n, E(num(x.betrag))));
  }
  head("Liquidität und Freigaben");
  line("Spitzenbedarf Eigenkapital", E(C.peak) + " (Monat " + C.peakM + ")");
  F.L.forEach(([ok, t]) => line((ok ? "[x] " : "[ ] ") + t));
  (v.ges || []).forEach((x) => line(x.name || "Gesellschafter", `Gewinn ${x.gew} % · Haftung ${x.haft} % · EK ${x.ek} %` + (x.vote ? " · Stimme: " + x.vote : "")));
  head("Plan B: Halten (Jahr 1)");
  ([["Nettomietrendite", P(H.nettoR)], ["Abschreibung", E(H.afaJ)], ["Cashflow nach Kredit und Steuer", E(H.cf)]] as [string, string][]).forEach(([a, b]) => line(a, b));
  foot("Kalkulation mit Annahmen, keine Steuer- oder Rechtsberatung. USt-Option und AfA mit dem Steuerberater abstimmen.");
  return { blob: doc.output("blob"), name: "Maison_Ankauf_" + safe(z.name) + ".pdf" };
}

export async function pdfKreditanfrage(v: V, g: Gewerk[], nk: NkPos[], z: Zus) {
  const r = rechne(v, g, nk), L = limits(v, g, nk), H = halten(v, g, nk), C = cash(v, g, nk);
  const { doc, line, head, foot } = await base("Finanzierungsanfrage", z.name,
    `${z.adresse || ""}   ${r.A} m²   Einkauf: ${r.vers ? "Versteigerung" : "freier Kauf"}   Stand: ${new Date().toLocaleDateString("de-AT")}`);
  const invest = r.tot - r.prov - r.rl, bw = r.vk * (1 - num(v.bwAbschlag) / 100), res = reserve(v, r);
  head("Finanzierungsbedarf");
  ([
    ["Kaufpreis", E(r.kp)], ["Kaufnebenkosten", E(r.kaufNk)], ["Sanierung", E(r.san)], ["Finanzierung, Haltekosten", E(r.finNk + r.zinsen + r.halte)],
    ["Gesamtinvestition (ohne Vertrieb)", E(invest)], ["Beantragter Kredit", E(r.kredit)], ["Eigenkapital (Spitzenbedarf)", E(C.peak)],
    ["Eigenkapital inkl. Liquiditätsreserve", E(C.peak + res)],
    ["Gewünschte Struktur", (r.G > 0 ? r.G + " Mon. tilgungsfrei, " : "") + (v.pfandOn ? "Pfandrecht im Grundbuch" : "ohne Grundbucheintrag") + ", Ablöse aus Verkaufserlös"],
  ] as [string, string][]).forEach(([a, b]) => line(a, b));
  head("Kennzahlen");
  ([
    ["Kredit zu Kaufpreis", P(r.kp > 0 ? (r.kredit / r.kp) * 100 : NaN)], ["Kredit zu Gesamtkosten (LTC)", P(invest > 0 ? (r.kredit / invest) * 100 : NaN)],
    ["Marktwert nach Sanierung", E(r.vk)], ["Beleihungswert (-" + v.bwAbschlag + " %)", E(bw)], ["Beleihungsauslauf", P(bw > 0 ? (r.kredit / bw) * 100 : NaN)],
    ["EK-Quote", P(invest > 0 ? (C.peak / invest) * 100 : NaN)], ["Geplante Dauer", r.M + " Monate"],
  ] as [string, string][]).forEach(([a, b]) => line(a, b));
  const qms = z.vergleiche.filter((x) => num(x.m2) > 0 && num(x.preis) > 0);
  head("Verkaufspreis");
  line("Ansatz", Math.round(num(v.verkM2)).toLocaleString("de-AT") + " EUR/m²");
  if (qms.length) {
    line("Median Vergleichsobjekte (" + qms.length + ")", Math.round(median(qms.map((x) => x.preis / x.m2))).toLocaleString("de-AT") + " EUR/m²");
    qms.forEach((x) => line("  " + (x.lage || "Vergleich") + (x.quelle ? " (" + x.quelle + ")" : ""), Math.round(x.preis / x.m2).toLocaleString("de-AT") + " EUR/m²"));
  }
  head("Exit-Szenarien");
  line("1 Verkauf", `Erlös ${E(r.erloes)}, Gewinn ${E(r.gewinn)}, Marge ${P(r.marge)}`);
  line("2 Halten und vermieten", `Nettomietrendite ${P(H.nettoR)}, Cashflow ${E(H.cf)} p.a.`);
  head("Stresstest");
  const w = rechne(v, g, nk, { vkM2: num(v.verkM2) * (1 + num(v.stVk) / 100), sanF: 1 + num(v.stSan) / 100, extraM: num(v.stMon), zinsAdd: num(v.stZins) });
  const wc = cash(v, g, nk, { vkM2: num(v.verkM2) * (1 + num(v.stVk) / 100), sanF: 1 + num(v.stSan) / 100, extraM: num(v.stMon), zinsAdd: num(v.stZins) });
  line(`Verkauf ${v.stVk} %, Sanierung +${v.stSan} %, +${v.stMon} Mon., Zins +${v.stZins} %-P.`, `Marge ${P(w.marge)}, EK-Spitze ${E(wc.peak)}`);
  line("Verkaufspreis darf fallen bis Verlust", P(num(v.verkM2) > 0 ? (1 - L.vbe / num(v.verkM2)) * 100 : NaN));
  head("Sicherheiten und Gesellschafter");
  (v.ges || []).forEach((x) => line(x.name || "Gesellschafter", `Bürgschaft ${E((r.kredit * num(x.haft)) / 100)} (${x.haft} %), EK ${E((C.peak * num(x.ek)) / 100)}`));
  line(v.pfandOn ? "Pfandrecht ob der Liegenschaft" : "Ohne Pfandrecht: Treuhanderklärung / Rangordnung nach Absprache");
  foot("Kalkulation mit Annahmen, keine Steuer- oder Rechtsberatung. Erstellt mit dem Maison Rechner.");
  return { blob: doc.output("blob"), name: "Maison_Kreditanfrage_" + safe(z.name) + ".pdf" };
}

