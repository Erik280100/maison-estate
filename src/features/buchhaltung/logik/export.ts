import type { Beleg, Zeile } from "../types";
import { ARTEN } from "../konten";
import { salden } from "./auswertung";
import { gebucht } from "./buchung";
import { dAT } from "./util";

export type JRow = { b: Beleg; l: Zeile; i: number };

export function journalRows(belege: Beleg[]): JRow[] {
  const rows: JRow[] = [];
  gebucht(belege).forEach((b) => (b.zeilen || []).forEach((l, i) => rows.push({ b, l, i })));
  return rows.sort((x, y) => (x.b.belegdatum || "").localeCompare(y.b.belegdatum || "") || (x.b.seq || 0) - (y.b.seq || 0) || x.i - y.i);
}

export const csvN = (c?: number) => ((c || 0) / 100).toFixed(2).replace(".", ",");
export const csvS = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
export const toCsv = (L: string[]) => "﻿" + L.join("\r\n");

export function csvJournal(rows: JRow[], konten: Record<string, string> = {}): string[] {
  const L = ["Belegdatum;Belegnummer;Belegart;Konto;Kontobezeichnung;Soll;Haben;Buchungstext;Partner;Rechnungsnummer;UID;Objekt;Projekt-ID;Storniert;Siegel"];
  rows.forEach(({ b, l }) =>
    L.push([dAT(b.belegdatum), b.nr, ARTEN[b.art] || b.art, l.konto, csvS(konten[l.konto]), csvN(l.soll), csvN(l.haben), csvS(l.text || b.beschreibung),
      csvS(b.partner), csvS(b.rechnungsnr), b.uid || "", csvS(b.objekt), b.projektId || "", b.storniert ? "ja" : "", b.hash || ""].join(";")),
  );
  return L;
}

export function csvSalden(belege: Beleg[], f: ((b: Beleg) => boolean) | null, konten: Record<string, string>): string[] {
  const L = ["Konto;Bezeichnung;Soll;Haben;Saldo"];
  salden(belege, f).forEach(([k, v]) => L.push([k, csvS(konten[k]), csvN(v.s), csvN(v.h), csvN(v.s - v.h)].join(";")));
  return L;
}

export function speichern(name: string, data: string | Blob, type = "text/plain") {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
