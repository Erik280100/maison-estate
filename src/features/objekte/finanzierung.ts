import { berechneKreditbetrag, berechneTilgungsplan } from "@/features/rechner/kredit/kredit";
import type { Objekt } from "./types";

/** Referenz-Annahmen für die Kreditrate in der Objektsuche. */
export const REFERENZ = {
  zinsPct: 3.6,
  eigenmittelPct: 20,
  laufzeitJahre: 35,
  mitMakler: false,
  nkMitfinanziert: true,
} as const;

export const REFERENZ_HINWEIS =
  "Kreditrate − Miete · 3,6 % Zinsen, 20 % Eigenmittel, 35 Jahre, ohne Makler, Nebenkosten mitfinanziert";

export type ObjektFinanzierung = {
  kreditbetrag: number;
  rate: number;
  miete: number | null;
  /** Rate − Miete; negativ = Überschuss. null, wenn keine Miete bekannt ist. */
  zuzahlung: number | null;
};

const cache = new Map<string, ObjektFinanzierung>();

export function finanzierung(o: Objekt): ObjektFinanzierung {
  const key = `${o.preis}|${o.miete}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { kreditbetrag } = berechneKreditbetrag({
    kaufpreis: o.preis,
    eigenmittel: o.preis * (REFERENZ.eigenmittelPct / 100),
    mitMakler: REFERENZ.mitMakler,
    nkMitfinanziert: REFERENZ.nkMitfinanziert,
  });
  const { rate } = berechneTilgungsplan(kreditbetrag, REFERENZ.zinsPct, REFERENZ.laufzeitJahre);
  const res: ObjektFinanzierung = {
    kreditbetrag,
    rate,
    miete: o.miete,
    zuzahlung: o.miete == null ? null : rate - o.miete,
  };
  cache.set(key, res);
  return res;
}
