import type { Freiflaeche, Objekt, Objekttyp, Parkplatz } from "./types";

export type SortKey = "neueste" | "preis-auf" | "preis-ab" | "flaeche-ab";

export type Filter = {
  ort: string;
  /** Eine oder mehrere PLZ bzw. PLZ-Anfänge, getrennt durch Komma/Leerzeichen, z. B. "1020, 11" */
  plz: string;
  preisVon: string;
  preisBis: string;
  flaecheVon: string;
  flaecheBis: string;
  /** "5" bedeutet 5 und mehr Zimmer */
  zimmer: string[];
  objekttypen: Objekttyp[];
  freiflaechen: Freiflaeche[];
  parken: Parkplatz[];
  sort: SortKey;
};

export const emptyFilter: Filter = {
  ort: "",
  plz: "",
  preisVon: "",
  preisBis: "",
  flaecheVon: "",
  flaecheBis: "",
  zimmer: [],
  objekttypen: [],
  freiflaechen: [],
  parken: [],
  sort: "neueste",
};

const num = (s: string): number | null => {
  const n = Number(s.trim().replace(",", "."));
  return s.trim() === "" || Number.isNaN(n) ? null : n;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss");

/**
 * Regeln: Innerhalb einer Gruppe (z. B. Terrasse/Garten/Balkon) genügt EIN Treffer (ODER),
 * zwischen den Gruppen müssen ALLE erfüllt sein (UND).
 */
export function applyFilter(list: Objekt[], f: Filter): Objekt[] {
  const preisVon = num(f.preisVon);
  const preisBis = num(f.preisBis);
  const flaecheVon = num(f.flaecheVon);
  const flaecheBis = num(f.flaecheBis);
  const ort = norm(f.ort.trim());
  const plzs = f.plz.split(/[\s,;]+/).filter(Boolean);

  const result = list.filter((o) => {
    if (ort && !norm(`${o.ort} ${o.bezirk ?? ""}`).includes(ort)) return false;
    if (plzs.length && !plzs.some((p) => o.plz.startsWith(p))) return false;
    if (preisVon !== null && o.preis < preisVon) return false;
    if (preisBis !== null && o.preis > preisBis) return false;
    if (flaecheVon !== null && o.wohnflaeche < flaecheVon) return false;
    if (flaecheBis !== null && o.wohnflaeche > flaecheBis) return false;
    if (f.zimmer.length) {
      const key = o.zimmer >= 5 ? "5" : String(Math.floor(o.zimmer));
      if (!f.zimmer.includes(key)) return false;
    }
    if (f.objekttypen.length && !f.objekttypen.includes(o.objekttyp)) return false;
    if (f.freiflaechen.length && !f.freiflaechen.some((x) => o.freiflaechen.includes(x)))
      return false;
    if (f.parken.length && !f.parken.some((x) => o.parken.includes(x))) return false;
    return true;
  });

  const sorters: Record<SortKey, (a: Objekt, b: Objekt) => number> = {
    neueste: (a, b) => b.createdAt.localeCompare(a.createdAt),
    "preis-auf": (a, b) => a.preis - b.preis,
    "preis-ab": (a, b) => b.preis - a.preis,
    "flaeche-ab": (a, b) => b.wohnflaeche - a.wohnflaeche,
  };
  return result.sort(sorters[f.sort]);
}

export function activeFilterCount(f: Filter): number {
  return (
    [f.ort, f.plz, f.preisVon, f.preisBis, f.flaecheVon, f.flaecheBis].filter(
      (s) => s.trim() !== "",
    ).length +
    f.zimmer.length +
    f.objekttypen.length +
    f.freiflaechen.length +
    f.parken.length
  );
}
