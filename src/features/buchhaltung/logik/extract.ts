import { parseNum } from "./util";

export type Erkannt = {
  belegdatum?: string;
  faellig?: string;
  partner?: string;
  uid?: string;
  rechnungsnr?: string;
  iban?: string;
  brutto?: number;
  ust?: number;
  satz?: number;
  netto?: number;
  hinweise: string[];
};

const dat = (s: string) => {
  const m = s.match(/(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : undefined;
};
const BETRAG = "(-?\\d{1,3}(?:[.\\s]\\d{3})*,\\d{2}|\\d+,\\d{2})";
const num = (s: string) => parseNum(s.replace(/\s/g, ""));

/** Einfache Regel-Erkennung aus dem Text einer Rechnung (keine KI): Vorschläge, die man im Editor prüft. */
export function extractRechnung(text: string): Erkannt {
  const out: Erkannt = { hinweise: [] };
  const t = text.replace(/\r/g, "");
  const lines = t.split("\n").map((l) => l.trim()).filter((l) => l && !/^--- Seite/.test(l));

  const d1 = t.match(/(?:Rechnungsdatum|Datum|Ausstellungsdatum|Rechnung vom)[^\d]{0,20}(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})/i);
  out.belegdatum = d1 ? dat(d1[1]) : dat(t);
  const f = t.match(/(?:f[aä]llig(?:keit)?|zahlbar bis|zahlungsziel)[^\d]{0,25}(\d{1,2}\.\s?\d{1,2}\.\s?\d{4})/i);
  if (f) out.faellig = dat(f[1]);

  const nr = t.match(/(?:Rechnungs?\s*-?\s*(?:nr|nummer)\.?|Beleg\s*-?\s*(?:nr|nummer)\.?|Invoice\s*(?:no|number)\.?)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,24})/i);
  if (nr) out.rechnungsnr = nr[1].replace(/[.]$/, "");

  const uid = t.match(/\bATU\s?\d{8}\b/i);
  if (uid) out.uid = uid[0].replace(/\s/g, "").toUpperCase();
  const iban = t.match(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/);
  if (iban) out.iban = iban[0].replace(/\s/g, "");

  const sum = [...t.matchAll(new RegExp(`(?:Gesamtbetrag|Rechnungsbetrag|Endbetrag|Gesamtsumme|Summe brutto|Brutto|Total|zu zahlen|Zahlbetrag)[^\\d\\n]{0,30}${BETRAG}`, "gi"))];
  if (sum.length) out.brutto = num(sum[sum.length - 1][1]);

  const ustM = [...t.matchAll(new RegExp(`(\\d{1,2})(?:,0+)?\\s?%\\s*(?:USt|MwSt|Umsatzsteuer|Mehrwertsteuer)[^\\d\\n]{0,20}${BETRAG}`, "gi"))];
  const ustM2 = [...t.matchAll(new RegExp(`(?:USt|MwSt|Umsatzsteuer|Mehrwertsteuer)\\.?\\s*(\\d{1,2})(?:,0+)?\\s?%[^\\d\\n]{0,20}${BETRAG}`, "gi"))];
  const u = ustM[ustM.length - 1] || ustM2[ustM2.length - 1];
  if (u) {
    out.satz = Number(u[1]);
    out.ust = num(u[2]);
  }
  const net = [...t.matchAll(new RegExp(`(?:Netto|Nettobetrag|Summe netto|Zwischensumme)[^\\d\\n]{0,30}${BETRAG}`, "gi"))];
  if (net.length) out.netto = num(net[net.length - 1][1]);

  // Fehlende Werte ableiten
  if (out.brutto != null && out.ust != null && out.netto == null) out.netto = Math.round((out.brutto - out.ust) * 100) / 100;
  if (out.brutto != null && out.netto != null && out.ust == null) out.ust = Math.round((out.brutto - out.netto) * 100) / 100;
  if (out.netto != null && out.ust != null && out.brutto == null) out.brutto = Math.round((out.netto + out.ust) * 100) / 100;
  if (out.satz == null && out.netto && out.ust != null) {
    const s = (out.ust / out.netto) * 100;
    out.satz = [0, 10, 13, 20].reduce((a, b) => (Math.abs(b - s) < Math.abs(a - s) ? b : a));
  }
  if (out.brutto != null && out.netto == null) {
    out.satz = out.satz ?? 20;
    out.netto = Math.round((out.brutto / (1 + out.satz / 100)) * 100) / 100;
    out.ust = Math.round((out.brutto - out.netto) * 100) / 100;
    out.hinweise.push(`Nur den Gesamtbetrag erkannt – Netto und USt mit ${out.satz} % zurückgerechnet. Bitte prüfen.`);
  }

  const partnerLine = lines.slice(0, 8).find((l) => /[A-Za-zÄÖÜäöü]{3}/.test(l) && !/^(rechnung|datum|seite|invoice|tel|www|e-?mail)/i.test(l) && l.length < 70);
  if (partnerLine) out.partner = partnerLine;

  if (!out.belegdatum) out.hinweise.push("Belegdatum nicht erkannt.");
  if (out.brutto == null) out.hinweise.push("Gesamtbetrag nicht erkannt.");
  return out;
}
