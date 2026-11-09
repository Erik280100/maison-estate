import type { Beleg, Kredit } from "../types";
import { addMonths, cents } from "./util";
import { gebucht } from "./buchung";

export type PlanRow = { nr: number; datum: string; zins: number; tilgung: number; rate: number; rest: number };

export function tilgungsplan(k: Kredit): { rows: PlanRow[]; warn: string[] } {
  const K = cents(k.betrag);
  const n = Math.max(1, Number(k.laufzeitMonate) || 0);
  const step = k.intervall === "quartal" ? 3 : 1;
  const periods = Math.max(1, Math.round(n / step));
  const i = (((Number(k.zinssatz) || 0) / 100) * step) / 12;
  const start = k.ersteRate || (k.beginn ? addMonths(k.beginn, step) : null);
  if (!K || !start || !k.laufzeitMonate) return { rows: [], warn: [] };
  const warn: string[] = [];
  let rest = K;
  const rows: PlanRow[] = [];
  const annu = cents(k.rate) || (i ? Math.round((K * i) / (1 - Math.pow(1 + i, -periods))) : Math.round(K / periods));
  for (let p = 1; p <= periods && rest > 0; p++) {
    const z = Math.round(rest * i);
    let t: number;
    if (k.tilgungsart === "endfaellig") t = p === periods ? rest : 0;
    else if (k.tilgungsart === "raten") t = Math.min(rest, Math.round(K / periods));
    else t = Math.min(rest, annu - z);
    if (p === periods) t = rest;
    if (t < 0) {
      t = 0;
      if (!warn.length) warn.push("Die Rate deckt die Zinsen nicht – Angaben prüfen.");
    }
    rest -= t;
    rows.push({ nr: p, datum: addMonths(start, (p - 1) * step), zins: z, tilgung: t, rate: z + t, rest });
  }
  return { rows, warn };
}

export function kreditRestBuch(belege: Beleg[], kid: string): number {
  let s = 0;
  gebucht(belege)
    .filter((b) => b.kreditId === kid)
    .forEach((b) =>
      (b.zeilen || []).forEach((l) => {
        if (l.konto === "3150") s += (l.haben || 0) - (l.soll || 0);
      }),
    );
  return s;
}
export const planGebucht = (belege: Beleg[], kid: string, nr: number) =>
  gebucht(belege).find((b) => b.kreditId === kid && b.planNr === nr && !b.storniert);
