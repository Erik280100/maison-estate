import type { Beleg } from "../types";
import { sumL } from "./util";

const FIELDS_V1 = ["seq","nr","art","belegdatum","partner","rechnungsnr","uid","beschreibung","objekt","zeilen","dateiHash","gebuchtAm","gebuchtVon","stornoVon","bankRef","kreditId","ausgleich","prevHash"];
const FIELDS_V2 = [...FIELDS_V1, "projektId", "anlageId", "gs", "hv"];
export const GENESIS = "0".repeat(64);
export const HASH_VERSION = 2;

export function stable(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  if (v && typeof v === "object")
    return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stable((v as Record<string, unknown>)[k])).join(",") + "}";
  return JSON.stringify(v === undefined ? null : v);
}

export async function sha256Hex(data: string | ArrayBuffer): Promise<string> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Alte Buchungen (ohne hv) werden mit der ursprünglichen Feldliste geprüft. */
export function hashInput(b: Partial<Beleg>): string {
  const fields = b.hv === 2 ? FIELDS_V2 : FIELDS_V1;
  const rec = b as Record<string, unknown>;
  return stable(Object.fromEntries(fields.map((k) => [k, rec[k] ?? null])));
}

export type Integritaet = { ok: boolean; fehler: string[]; geprueft: number; zeit: string; ohneSiegel: number };

export async function integritaet(belege: Beleg[], kopfHash?: string): Promise<Integritaet> {
  const gebucht = belege.filter((b) => b.status === "Gebucht");
  const list = gebucht.filter((b) => b.seq).sort((a, b) => a.seq! - b.seq!);
  const fehler: string[] = [];
  let prev = GENESIS;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (b.seq !== i + 1) fehler.push(`Lücke oder Doppelung in der Buchungsfolge bei Nr. ${b.seq} (erwartet ${i + 1}).`);
    if (b.prevHash !== prev) fehler.push(`${b.nr}: Verkettung zum Vorgänger gebrochen.`);
    if ((await sha256Hex(hashInput(b))) !== b.hash) fehler.push(`${b.nr}: Inhalt wurde nach dem Buchen verändert (Siegel stimmt nicht).`);
    prev = b.hash!;
  }
  const kreise: Record<string, number[]> = {};
  gebucht.forEach((b) => {
    const m = (b.nr || "").match(/^(.+)-(\d{4})$/);
    if (m) (kreise[m[1]] ||= []).push(+m[2]);
  });
  Object.entries(kreise).forEach(([k, ns]) => {
    ns.sort((a, b) => a - b);
    ns.forEach((n, i) => {
      if (n !== i + 1) fehler.push(`Nummernkreis ${k}: Nummer ${String(i + 1).padStart(4, "0")} fehlt oder ist doppelt.`);
    });
  });
  if (list.length && kopfHash && kopfHash !== list[list.length - 1].hash)
    fehler.push("Der letzte Kettenwert stimmt nicht mit der letzten Buchung überein – eine Buchung fehlt oder wurde gelöscht.");
  const uniq = [...new Set(fehler)].slice(0, 40);
  return { ok: !uniq.length, fehler: uniq, geprueft: list.length, zeit: new Date().toISOString(), ohneSiegel: gebucht.filter((b) => !b.seq).length };
}

export const buchungsSumme = (b: Beleg) => sumL(b.zeilen || [], "soll");
