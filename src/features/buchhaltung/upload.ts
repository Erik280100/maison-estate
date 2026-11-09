import type { SupabaseClient } from "@supabase/supabase-js";
import type { Art, Beleg } from "./types";
import { hochladen, neu, protokollieren } from "./api";
import { sha256Hex } from "./logik/hash";
import { extractRechnung } from "./logik/extract";
import { today } from "./logik/util";
import { pdfText } from "./pdfText";

export const leerBeleg = (art: Art = "ER"): Omit<Beleg, "id"> => ({
  art,
  status: "Entwurf",
  belegdatum: today(),
  partner: "",
  beschreibung: "",
  vorsteuer: art !== "AR",
  gegenkonto: art === "AR" ? "2000" : art === "KA" ? "2700" : "3300",
  brutto: null,
  positionen: [{ text: "", konto: art === "AR" ? "4880" : "7890", netto: 0, satz: 20, ust: 0 }],
  manuell: false,
  zeilen: [],
  hinweise: [],
  merkmale: null,
});

const istPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const istBild = (f: File) => /^image\//.test(f.type);

export async function dateiAblegen(sb: SupabaseClient, file: File) {
  const buf = await file.arrayBuffer();
  const dateiHash = await sha256Hex(buf);
  const assetId = await hochladen(sb, file);
  return { buf, dateiHash, assetId };
}

/** Rechnung ablegen (Original + SHA-256) und aus dem PDF-Text einen Entwurf vorbefüllen. */
export async function rechnungAnlegen(sb: SupabaseClient, uid: string, file: File, art: Art = "ER"): Promise<{ id: string; beleg: Beleg }> {
  if (!istPdf(file) && !istBild(file)) throw new Error("Nur PDF, JPG oder PNG.");
  const { buf, dateiHash, assetId } = await dateiAblegen(sb, file);
  const hinweise: string[] = [];
  let text = "";
  if (istPdf(file)) {
    try {
      text = await pdfText(buf);
    } catch {
      hinweise.push("PDF-Text konnte nicht gelesen werden.");
    }
  }
  const e = text.trim() ? extractRechnung(text) : null;
  if (!e) hinweise.push(istPdf(file) ? "Kein Text im PDF (Scan) – bitte alle Felder manuell erfassen." : "Bild – bitte alle Felder manuell erfassen.");
  else hinweise.push(...e.hinweise);

  const b = leerBeleg(art);
  if (e) {
    if (e.belegdatum) b.belegdatum = e.belegdatum;
    b.faellig = e.faellig ?? "";
    b.partner = e.partner ?? "";
    b.uid = e.uid ?? "";
    b.rechnungsnr = e.rechnungsnr ?? "";
    if (e.brutto != null) {
      b.brutto = e.brutto;
      b.positionen = [{ text: "", konto: art === "AR" ? "4880" : "7890", netto: e.netto ?? e.brutto, satz: e.satz ?? 0, ust: e.ust ?? 0 }];
    }
    if (e.iban) b.hinweise = [`IBAN auf dem Beleg: ${e.iban}`];
  }
  b.hinweise = [...(b.hinweise ?? []), ...hinweise];
  Object.assign(b, { assetId, dateiHash, fileName: file.name, mime: file.type, erfasstVon: uid, erfasstAm: new Date().toISOString() });
  const id = await neu(sb, "belege", b);
  protokollieren(sb, uid, "Beleg erfasst", `${file.name} · SHA-256 ${dateiHash.slice(0, 12)}`);
  return { id, beleg: { id, ...b } };
}
