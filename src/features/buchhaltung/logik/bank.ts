import type { Beleg, Gesellschafter, Kredit, Posten, Zeile } from "../types";
import { VIER_AUGEN, gsKonto } from "../konten";
import { cents, fmt, norm, parseNum } from "./util";
import { offenePosten } from "./op";
import { kreditRestBuch, planGebucht, tilgungsplan } from "./kredit";
import { gsSalden } from "./auswertung";

export type Vorschlag = {
  zeilen: Zeile[];
  info: string;
  sicher: boolean;
  warn: string[];
  ausgleich?: string;
  kreditId?: string;
  planNr?: number;
  gs?: string;
};
export type BankCtx = { belege: Beleg[]; kredite: Kredit[]; gesellschafter: Gesellschafter[]; konten: Record<string, string> };

export function vorschlag(tx: Pick<Posten, "datum" | "betrag" | "partner" | "verwendungszweck" | "kontoVorschlag" | "gk">, c: BankCtx): Vorschlag {
  const amt = cents(tx.betrag);
  const abs = Math.abs(amt);
  const zweck = norm(tx.verwendungszweck) + " " + norm(tx.partner);
  const lines = (a: string, b: string, txt: string): Zeile[] => [
    { konto: a, soll: abs, haben: 0, text: txt },
    { konto: b, soll: 0, haben: abs, text: txt },
  ];
  const ops = offenePosten(c.belege);
  // 1. Offener Posten
  const cand = ops.filter((o) => o.offen === abs && ((amt < 0 && o.konto === "3300") || (amt > 0 && o.konto === "2000")));
  const op =
    cand.find((o) => o.b.rechnungsnr && zweck.includes(norm(o.b.rechnungsnr))) ||
    cand.find((o) => norm(o.b.partner).length >= 3 && zweck.includes(norm(o.b.partner).slice(0, 6))) ||
    (cand.length === 1 ? cand[0] : null);
  if (op) {
    const z = amt < 0 ? lines("3300", "2800", "Zahlung " + op.b.nr) : lines("2800", "2000", "Eingang " + op.b.nr);
    const w: string[] = [];
    if (amt < 0 && op.offen >= VIER_AUGEN && !op.b.freigabeVon) w.push("Zahlung ab 5.000 € ohne Vier-Augen-Freigabe der Rechnung.");
    return { zeilen: z, ausgleich: op.b.id, info: `Ausgleich ${op.b.nr} · ${op.b.partner || ""}`, sicher: true, warn: w };
  }
  // 2. Erstattung an Gesellschafter (privat verauslagte Kosten)
  if (amt < 0) {
    const sal = gsSalden(c.belege, c.gesellschafter);
    for (const g of c.gesellschafter) {
      const hit = (g.iban && zweck.includes(norm(g.iban))) || (norm(g.name).length >= 4 && zweck.includes(norm(g.name)));
      const s = sal.find((x) => x.g.id === g.id);
      if (hit && s && s.saldo > 0) {
        const w = abs > s.saldo ? [`Erstattung (${fmt(abs)} €) ist höher als der offene Betrag (${fmt(s.saldo)} €).`] : [];
        return { zeilen: lines(gsKonto(g), "2800", `Erstattung ${g.name}`), gs: g.id, info: `Erstattung an ${g.name}`, sicher: !w.length, warn: w };
      }
    }
  }
  // 3. Kreditrate
  for (const k of c.kredite) {
    const bankHit = (k.kreditnr && zweck.includes(norm(k.kreditnr))) || (k.bank && norm(k.bank).length >= 3 && zweck.includes(norm(k.bank).slice(0, 5)));
    if (amt < 0) {
      const { rows } = tilgungsplan(k);
      const r = rows
        .filter((r) => !planGebucht(c.belege, k.id, r.nr))
        .map((r) => ({ r, dd: Math.abs(new Date(r.datum).getTime() - new Date(tx.datum).getTime()) / 864e5 }))
        .sort((a, b) => a.dd - b.dd)[0];
      if (r && r.dd <= 25 && (bankHit || Math.abs(r.r.rate - abs) <= Math.max(100, r.r.rate * 0.02))) {
        const zins = Math.min(abs, r.r.zins);
        const tilg = abs - zins;
        const z: Zeile[] = [{ konto: "8280", soll: zins, haben: 0, text: `Zinsen Rate ${r.r.nr} ${k.bezeichnung || k.bank}` }];
        if (tilg) z.push({ konto: "3150", soll: tilg, haben: 0, text: `Tilgung Rate ${r.r.nr}` });
        z.push({ konto: "2800", soll: 0, haben: abs, text: k.bank || "Kreditrate" });
        const w = abs !== r.r.rate ? [`Betrag weicht vom Tilgungsplan ab (${fmt(r.r.rate)} €). Zinsen laut Plan, Rest als Tilgung – bei variablem Zins mit Bankabrechnung abgleichen.`] : [];
        return { zeilen: z, kreditId: k.id, planNr: r.r.nr, info: `Kreditrate ${r.r.nr} · ${k.bezeichnung || k.bank}`, sicher: !w.length, warn: w };
      }
    }
    if (amt > 0 && bankHit && Math.abs(abs - cents(k.betrag)) <= cents(k.betrag) * 0.05 && !kreditRestBuch(c.belege, k.id))
      return {
        zeilen: lines("2800", "3150", "Auszahlung " + (k.bezeichnung || k.bank)),
        kreditId: k.id,
        info: `Kreditauszahlung ${k.bezeichnung || k.bank}`,
        sicher: true,
        warn: abs !== cents(k.betrag) ? ["Auszahlung weicht vom Kreditbetrag ab – einbehaltene Gebühren als Zeile 8280 ergänzen."] : [],
      };
  }
  // 4. Vorschlag nach Konto (Stichworte) – nie "sicher"
  const kk = tx.gk && c.konten[tx.gk] ? tx.gk : c.konten[tx.kontoVorschlag || ""] ? tx.kontoVorschlag! : stichwort(zweck, amt);
  const txt = tx.verwendungszweck || tx.partner || "";
  const z = amt < 0 ? lines(kk, "2800", txt) : lines("2800", kk, txt);
  return { zeilen: z, info: `Vorschlag: ${kk} ${c.konten[kk] ?? ""}`, sicher: false, warn: [] };
}

function stichwort(zweck: string, amt: number): string {
  if (/kontof|spesen|entgelt|gebuehr|gebühr/.test(zweck)) return "7790";
  if (/finanzamt|umsatzsteuer|uva|koest|körperschaft/.test(zweck)) return "3540";
  if (/versicherung/.test(zweck)) return "7700";
  if (/stammkapital|stammeinlage/.test(zweck)) return "9000";
  if (/zuschuss|zuschuß/.test(zweck)) return "9100";
  if (/zinsen|haben/.test(zweck) && amt > 0) return "4890";
  return amt < 0 ? "7890" : "4880";
}

// ---------- CSV-Import ----------
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const first = t.split(/\r?\n/, 1)[0] || "";
  const delim = [";", "\t", ","].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') {
        if (t[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export type CsvMapping = { datum: number; betrag: number; partner: number; zweck: number; valuta: number; headerRows: number };

export function autoMapping(rows: string[][]): CsvMapping {
  const h = (rows[0] || []).map((x) => x.toLowerCase());
  const find = (re: RegExp) => h.findIndex((x) => re.test(x));
  const m: CsvMapping = {
    datum: find(/buchungsdatum|buchungstag|datum|booking/),
    betrag: find(/betrag|umsatz|amount/),
    partner: find(/partner|auftraggeber|empf|name|beguenstigter|begünstigter/),
    zweck: find(/verwendung|zahlungsreferenz|zweck|text|reference/),
    valuta: find(/valuta|wertstellung/),
    headerRows: 1,
  };
  return m;
}

export const parseDatum = (s: string): string => {
  const t = s.trim();
  let m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
};

export function csvZuPosten(rows: string[][], m: CsvMapping): Posten[] {
  const out: Posten[] = [];
  rows.slice(m.headerRows).forEach((r) => {
    const datum = parseDatum(r[m.datum] || "");
    if (!datum) return;
    const betrag = Math.round(parseNum(r[m.betrag]) * 100) / 100;
    if (!betrag) return;
    const verwendungszweck = (m.zweck >= 0 ? r[m.zweck] || "" : "").trim().slice(0, 300);
    const p: Posten = {
      i: out.length,
      datum,
      valuta: m.valuta >= 0 ? parseDatum(r[m.valuta] || "") : "",
      betrag,
      partner: (m.partner >= 0 ? r[m.partner] || "" : "").trim(),
      verwendungszweck,
      belegId: null,
      belegNr: null,
    };
    p.ref = `${p.datum}|${cents(p.betrag)}|${norm(p.verwendungszweck).slice(0, 40)}`;
    out.push(p);
  });
  return out;
}
