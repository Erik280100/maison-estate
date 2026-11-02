import {
  LABELS,
  type Ausstattung,
  type Freiflaeche,
  type Objekt,
  type Objekttyp,
  type Parkplatz,
  type Zustand,
} from "./types";

import { finanzierung } from "./finanzierung";

export type SortKey = "neueste" | "preis-auf" | "preis-ab" | "flaeche-ab" | "zuzahlung-auf";

export type Filter = {
  /** Freitext: jedes Wort muss irgendwo im Objekt vorkommen (Titel, Ort, PLZ, Preis, Fläche, …) */
  suche: string;
  ort: string;
  /** Eine oder mehrere PLZ bzw. PLZ-Anfänge, getrennt durch Komma/Leerzeichen, z. B. "1020, 11" */
  plz: string;
  preisVon: string;
  preisBis: string;
  flaecheVon: string;
  flaecheBis: string;
  /** Monatliche Zuzahlung (Kreditrate − Miete) in €, negativ = Überschuss */
  zuzahlungVon: string;
  zuzahlungBis: string;
  /** Nur Objekte, bei denen die Miete die Kreditrate deckt (Zuzahlung ≤ 0) */
  cashflowPositiv: boolean;
  /** "5" bedeutet 5 und mehr Zimmer */
  zimmer: string[];
  objekttypen: Objekttyp[];
  freiflaechen: Freiflaeche[];
  parken: Parkplatz[];
  ausstattung: Ausstattung[];
  zustand: Zustand[];
  sort: SortKey;
};

export const emptyFilter: Filter = {
  suche: "",
  ort: "",
  plz: "",
  preisVon: "",
  preisBis: "",
  flaecheVon: "",
  flaecheBis: "",
  zuzahlungVon: "",
  zuzahlungBis: "",
  cashflowPositiv: false,
  zimmer: [],
  objekttypen: [],
  freiflaechen: [],
  parken: [],
  ausstattung: [],
  zustand: [],
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
 * Zerlegt die Eingabe in Suchwörter. Zahl + Einheit bleibt zusammen
 * ("3 zimmer", "74 m²"), "€"/"Euro" und "qm" werden vereinheitlicht.
 */
export function suchWoerter(eingabe: string): string[] {
  const s = norm(
    eingabe
      .replace(/m²/gi, "m2")
      .replace(/\bqm\b/gi, "m2")
      .replace(/€|\beuro\b/gi, " "),
  );
  const out: string[] = [];
  for (const m of s.matchAll(/(\d+(?:[.,]\d+)?)\s*(zimmer|zi|m2)(?![a-z])|\S+/g)) {
    out.push(m[1] ? `${m[1]} ${m[2] === "zi" ? "zimmer" : m[2]}` : m[0]);
  }
  return out;
}

const tausender =(n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Alle durchsuchbaren Angaben eines Objekts als ein normalisierter Text. */
function haystack(o: Objekt): string {
  const teile = [
    o.titel,
    o.ort,
    o.bezirk,
    o.strasse,
    o.plz,
    o.beschreibung,
    // Zahlen in den Schreibweisen, die man eintippen würde
    String(o.preis),
    tausender(o.preis),
    String(o.wohnflaeche),
    `${o.wohnflaeche} m2`,
    String(o.wohnflaeche).replace(".", ","),
    String(o.zimmer),
    `${o.zimmer} zimmer`,
    o.miete != null ? String(o.miete) : "",
    String(Math.round(o.preis / o.wohnflaeche)),
    // Bezeichnungen
    LABELS[o.objekttyp],
    LABELS[o.status],
    o.zustand ? LABELS[o.zustand] : "",
    ...o.freiflaechen.map((x) => LABELS[x]),
    ...o.parken.map((x) => LABELS[x]),
    ...o.ausstattung.map((x) => LABELS[x]),
  ];
  return norm(teile.filter(Boolean).join(" | "));
}

/**
 * Regeln: Innerhalb einer Gruppe (z. B. Terrasse/Garten/Balkon) genügt EIN Treffer (ODER),
 * zwischen den Gruppen müssen ALLE erfüllt sein (UND).
 * Ausnahme Ausstattung: Dort müssen alle angehakten Merkmale vorhanden sein.
 */
export function applyFilter(list: Objekt[], f: Filter): Objekt[] {
  const preisVon = num(f.preisVon);
  const preisBis = num(f.preisBis);
  const flaecheVon = num(f.flaecheVon);
  const flaecheBis = num(f.flaecheBis);
  const zuzVon = num(f.zuzahlungVon);
  const zuzBis = num(f.zuzahlungBis);
  const ort = norm(f.ort.trim());
  const plzs = f.plz.split(/[\s,;]+/).filter(Boolean);

  const woerter = suchWoerter(f.suche);

  const result = list.filter((o) => {
    if (woerter.length) {
      const text = haystack(o);
      if (!woerter.every((w) => text.includes(w))) return false;
    }
    if (ort &&!norm(`${o.ort} ${o.bezirk ?? ""}`).includes(ort)) return false;
    if (plzs.length && !plzs.some((p) => o.plz.startsWith(p))) return false;
    if (preisVon !== null && o.preis < preisVon) return false;
    if (preisBis !== null && o.preis > preisBis) return false;
    if (flaecheVon !== null && o.wohnflaeche < flaecheVon) return false;
    if (flaecheBis !== null && o.wohnflaeche > flaecheBis) return false;
    if (zuzVon !== null || zuzBis !== null || f.cashflowPositiv) {
      const z = finanzierung(o).zuzahlung;
      if (z === null) return false;
      if (f.cashflowPositiv && z > 0) return false;
      if (zuzVon !== null && z < zuzVon) return false;
      if (zuzBis !== null && z > zuzBis) return false;
    }
    if (f.zimmer.length) {
      const key = o.zimmer >= 5 ? "5" : String(Math.floor(o.zimmer));
      if (!f.zimmer.includes(key)) return false;
    }
    if (f.objekttypen.length && !f.objekttypen.includes(o.objekttyp)) return false;
    if (f.freiflaechen.length && !f.freiflaechen.some((x) => o.freiflaechen.includes(x)))
      return false;
    if (f.parken.length && !f.parken.some((x) => o.parken.includes(x))) return false;
    // Ausstattung: ALLE gewählten Merkmale müssen vorhanden sein (UND).
    // "Parkplatz" gilt als erfüllt, sobald irgendein Stellplatz-Typ eingetragen ist.
    const hat = (a: Ausstattung) =>
      a === "parkplatz" ? o.parken.length > 0 : o.ausstattung.includes(a);
    if (!f.ausstattung.every(hat)) return false;
    // Zustand: ein Objekt hat genau einen Zustand, es genügt einer der gewählten (ODER).
    if (f.zustand.length && (!o.zustand || !f.zustand.includes(o.zustand))) return false;
    return true;
  });

  const sorters: Record<SortKey, (a: Objekt, b: Objekt) => number> = {
    neueste: (a, b) => b.createdAt.localeCompare(a.createdAt),
    "preis-auf": (a, b) => a.preis - b.preis,
    "preis-ab": (a, b) => b.preis - a.preis,
    "flaeche-ab": (a, b) => b.wohnflaeche - a.wohnflaeche,
    "zuzahlung-auf": (a, b) =>
      (finanzierung(a).zuzahlung ?? Infinity) - (finanzierung(b).zuzahlung ?? Infinity) || 0,
  };
  return result.sort(sorters[f.sort]);
}

export function activeFilterCount(f: Filter): number {
  return (
    [f.suche, f.ort, f.plz, f.preisVon, f.preisBis, f.flaecheVon, f.flaecheBis, f.zuzahlungVon, f.zuzahlungBis].filter(
      (s) => s.trim() !== "",
    ).length +
    (f.cashflowPositiv ? 1 : 0) +
    f.zimmer.length +
    f.objekttypen.length +
    f.freiflaechen.length +
    f.parken.length +
    f.ausstattung.length +
    f.zustand.length
  );
}
