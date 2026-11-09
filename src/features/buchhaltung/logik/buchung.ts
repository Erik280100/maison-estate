import type { Beleg, Perioden, Zeile } from "../types";
import { GRUND_KONTEN, VIER_AUGEN } from "../konten";
import { addMonths, cents, dAT, fmt, fmtE, mName, sumL, today, uidOk } from "./util";

export type Ctx = { belege: Beleg[]; perioden: Perioden; konten: Record<string, string> };

export const MERK: [string, string][] = [
  ["ausstellerName", "Name und Anschrift Aussteller"],
  ["empfaengerName", "Name und Anschrift Empfänger"],
  ["leistung", "Menge/Art der Leistung"],
  ["leistungsdatum", "Tag/Zeitraum der Leistung"],
  ["entgelt", "Entgelt und Steuersatz"],
  ["steuerbetrag", "Steuerbetrag"],
  ["ausstellungsdatum", "Ausstellungsdatum"],
  ["rechnungsnr", "Fortlaufende Nummer"],
  ["uidAussteller", "UID Aussteller"],
  ["uidEmpfaenger", "UID Empfänger"],
  ["rcHinweis", "Hinweis Übergang der Steuerschuld"],
];

export function buildLines(d: Beleg): Zeile[] {
  const L: Zeile[] = [];
  const pos = d.positionen || [];
  const vst = d.vorsteuer !== false;
  if (d.art === "AR") {
    let br = 0;
    pos.forEach((p) => {
      const n = cents(p.netto), u = cents(p.ust);
      br += n + u;
      L.push({ konto: p.konto, soll: 0, haben: n, text: p.text || d.beschreibung || "" });
      if (u) L.push({ konto: "3500", soll: 0, haben: u, text: `USt ${p.satz} %` });
    });
    L.unshift({ konto: d.gegenkonto || "2000", soll: br, haben: 0, text: d.partner || "" });
  } else {
    let hab = 0;
    pos.forEach((p) => {
      const n = cents(p.netto), u = cents(p.ust);
      if (d.reverseCharge) {
        const rc = Math.round((n * (Number(p.satz) || 20)) / 100);
        L.push({ konto: p.konto, soll: n, haben: 0, text: p.text || "" });
        if (vst) L.push({ konto: "2506", soll: rc, haben: 0, text: "Vorsteuer RC" });
        else L.push({ konto: p.konto, soll: rc, haben: 0, text: "USt RC nicht abziehbar" });
        L.push({ konto: "3506", soll: 0, haben: rc, text: "USt RC § 19 Abs 1a" });
        hab += n;
      } else {
        if (vst) {
          L.push({ konto: p.konto, soll: n, haben: 0, text: p.text || "" });
          if (u) L.push({ konto: "2500", soll: u, haben: 0, text: `Vorsteuer ${p.satz} %` });
        } else L.push({ konto: p.konto, soll: n + u, haben: 0, text: (p.text || "") + (u ? " (brutto, ohne VSt)" : "") });
        hab += n + u;
      }
    });
    L.push({ konto: d.gegenkonto || (d.art === "KA" ? "2700" : "3300"), soll: 0, haben: hab, text: d.partner || "" });
  }
  return L.filter((l) => l.soll || l.haben);
}
export const linesOf = (d: Beleg) => (d.manuell ? d.zeilen || [] : buildLines(d));
export const gebucht = (belege: Beleg[]) => belege.filter((b) => b.status === "Gebucht");

export function pflichtMerkmale(d: Beleg): string[] {
  const br = cents(d.brutto);
  if (d.reverseCharge)
    return ["ausstellerName","empfaengerName","leistung","leistungsdatum","entgelt","ausstellungsdatum","rechnungsnr","uidAussteller","uidEmpfaenger","rcHinweis"];
  if (br <= 40000) return ["ausstellerName", "leistung", "leistungsdatum", "entgelt", "ausstellungsdatum"];
  const r = ["ausstellerName","empfaengerName","leistung","leistungsdatum","entgelt","steuerbetrag","ausstellungsdatum","rechnungsnr"];
  if (d.vorsteuer !== false && (d.positionen || []).some((p) => Number(p.satz) > 0)) r.push("uidAussteller");
  if (br > 1000000) r.push("uidEmpfaenger");
  return r;
}

export function kassaSaldoBis(belege: Beleg[], datum: string, extra?: Zeile[], excludeId?: string): number {
  let s = 0;
  gebucht(belege).forEach((b) => {
    if (b.id === excludeId || (b.belegdatum || "") > datum) return;
    (b.zeilen || []).forEach((l) => {
      if (l.konto === "2700") s += (l.soll || 0) - (l.haben || 0);
    });
  });
  (extra || []).forEach((l) => {
    if (l.konto === "2700") s += (l.soll || 0) - (l.haben || 0);
  });
  return s;
}

export function aufbewahrungBis(d: Beleg) {
  const y = Number((d.belegdatum || today()).slice(0, 4));
  const grund = linesOf(d).some((l) => GRUND_KONTEN.includes(l.konto)) || !!d.objekt || !!d.projektId;
  return { bis: `31.12.${y + (grund ? 12 : 7)}`, grund };
}

export function validate(d: Beleg, ctx: Ctx) {
  const err: string[] = [], warn: string[] = [];
  const L = linesOf(d);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.belegdatum || "")) err.push("Belegdatum fehlt oder ist ungültig.");
  else {
    if (d.belegdatum > today()) warn.push("Das Belegdatum liegt in der Zukunft.");
    if (ctx.perioden.gesperrtBis && d.belegdatum.slice(0, 7) <= ctx.perioden.gesperrtBis && d.status !== "Gebucht")
      err.push(`Der Zeitraum bis ${mName(ctx.perioden.gesperrtBis)} ist festgeschrieben. Korrekturen nur mit Belegdatum danach.`);
    const frist = addMonths(d.belegdatum.slice(0, 7) + "-15", 2);
    if (d.status !== "Gebucht" && today() > frist) warn.push(`Buchungsfrist nach § 131 BAO war der ${dAT(frist)} – bitte umgehend buchen.`);
  }
  const so = sumL(L, "soll"), ha = sumL(L, "haben");
  if (!L.length || so === 0) err.push("Es gibt noch keine Buchungszeile mit Betrag.");
  if (so !== ha) err.push(`Soll (${fmt(so)}) und Haben (${fmt(ha)}) sind nicht ausgeglichen – Differenz ${fmt(Math.abs(so - ha))} €.`);
  L.forEach((l, i) => {
    if (!ctx.konten[l.konto]) err.push(`Zeile ${i + 1}: Konto ${l.konto} gibt es im Kontenplan nicht.`);
    if (l.soll && l.haben) err.push(`Zeile ${i + 1}: Bitte entweder Soll oder Haben, nicht beides.`);
    if ((l.soll || 0) < 0 || (l.haben || 0) < 0) err.push(`Zeile ${i + 1}: Negative Beträge sind nicht zulässig – Soll und Haben tauschen.`);
  });
  if (L.some((l) => l.konto === "2700") && d.belegdatum && d.status !== "Gebucht") {
    const ks = kassaSaldoBis(ctx.belege, d.belegdatum, L, d.id);
    if (ks < 0) err.push(`Die Kassa würde mit dieser Buchung negativ (${fmt(ks)} €). Ein negativer Kassastand ist ein formeller Mangel der Buchführung.`);
  }
  if (!d.manuell && ["ER", "AR", "KA"].includes(d.art)) {
    const pos = d.positionen || [];
    const exp = pos.reduce((a, p) => a + cents(p.netto) + (d.reverseCharge ? 0 : cents(p.ust)), 0);
    if (d.brutto != null && (d.brutto as unknown) !== "" && exp !== cents(d.brutto))
      err.push(`Positionen ergeben ${fmt(exp)} €, auf dem Beleg stehen ${fmtE(d.brutto)} €. Beträge prüfen.`);
    pos.forEach((p, i) => {
      const soll = Math.round((cents(p.netto) * Number(p.satz)) / 100);
      if (!d.reverseCharge && Math.abs(soll - cents(p.ust)) > 5)
        warn.push(`Position ${i + 1}: USt ${fmtE(p.ust)} € passt nicht zu ${p.satz} % von ${fmtE(p.netto)} € (erwartet ${fmt(soll)} €).`);
    });
    if (!d.partner) err.push(d.art === "AR" ? "Kunde fehlt." : "Lieferant fehlt.");
    if (d.uid && !uidOk(d.uid)) warn.push(`UID „${d.uid}“ hat kein gültiges Format (Österreich: ATU + 8 Ziffern).`);
    if (d.art === "ER" || d.art === "KA") {
      if (d.merkmale) {
        const fehlt = pflichtMerkmale(d).filter((k) => d.merkmale![k] === false);
        if (fehlt.length)
          warn.push(`Fehlende Rechnungsmerkmale nach § 11 UStG: ${fehlt.map((k) => MERK.find((m) => m[0] === k)![1]).join(", ")}. ${d.reverseCharge ? "" : "Ohne sie ist der Vorsteuerabzug gefährdet – korrigierte Rechnung anfordern."}`);
      }
      if (cents(d.brutto) > 1000000 && d.vorsteuer !== false) warn.push("Rechnung über 10.000 €: UID des Lieferanten in FinanzOnline (Stufe 2) prüfen und Ausdruck zum Beleg legen.");
      if (d.empfaenger && !/maison/i.test(d.empfaenger))
        warn.push(`Rechnung lautet auf „${d.empfaenger}“ statt auf die Maison Estate GmbH. Vor Eintragung: als Vorgründungskosten mit Mag. Hauser klären.`);
      if ((d.objekt || d.projektId) && d.vorsteuer !== false && pos.some((p) => ["5000","5100","5300","5800"].includes(p.konto)))
        warn.push("Objektkosten mit Vorsteuerabzug: Nur richtig, wenn beim Verkauf zur USt optiert wird. Bei steuerfreiem Verkauf Häkchen „Vorsteuerabzug“ entfernen (mit Mag. Hauser je Objekt entscheiden).");
      if (pos.some((p) => p.konto === "0630") && d.vorsteuer !== false)
        warn.push("PKW: Kein Vorsteuerabzug für PKW/Kombi (Luxustangente) – Häkchen „Vorsteuerabzug“ entfernen.");
    }
    const dup = ctx.belege.find((b) => b.id !== d.id && b.status === "Gebucht" && !b.storniert && b.rechnungsnr && b.rechnungsnr === d.rechnungsnr && (b.partner || "").toLowerCase() === (d.partner || "").toLowerCase());
    if (dup) warn.push(`Möglicher Doppelbeleg: ${dup.nr} hat dieselbe Rechnungsnummer vom selben Partner.`);
    if (d.dateiHash) {
      const same = ctx.belege.find((b) => b.id !== d.id && b.dateiHash === d.dateiHash && !b.storniert);
      if (same) warn.push(`Dieselbe Datei wurde schon erfasst (${same.nr || "Entwurf"}).`);
    }
  }
  (d.hinweise || []).forEach((h) => warn.push("Hinweis: " + h));
  return { err, warn, so, ha, L };
}

export const needsFreigabe = (d: Beleg) => d.art === "ER" && cents(d.brutto) >= VIER_AUGEN && !d.freigabeVon;
