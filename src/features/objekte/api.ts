import { getSupabase } from "@/lib/supabase";
import { demoObjekte } from "./demo";
import type { Objekt } from "./types";

type Row = {
  id: string;
  created_at: string;
  titel: string;
  status: Objekt["status"];
  objekttyp: Objekt["objekttyp"];
  strasse: string | null;
  plz: string;
  ort: string;
  bezirk: string | null;
  preis: number | string;
  wohnflaeche: number | string;
  zimmer: number;
  freiflaechen: Objekt["freiflaechen"];
  parken: Objekt["parken"];
  /** Fehlt, solange Migration 003 noch nicht ausgeführt wurde */
  ausstattung?: Objekt["ausstattung"] | null;
  /** Fehlt, solange Migration 005 noch nicht ausgeführt wurde */
  zustand?: Objekt["zustand"];
  /** Fehlt, solange Migration 009 noch nicht ausgeführt wurde */
  miete?: number | string | null;
  beschreibung: string | null;
};

const fromRow = (r: Row): Objekt => ({
  id: r.id,
  titel: r.titel,
  status: r.status,
  objekttyp: r.objekttyp,
  strasse: r.strasse,
  plz: r.plz,
  ort: r.ort,
  bezirk: r.bezirk,
  preis: Number(r.preis),
  wohnflaeche: Number(r.wohnflaeche),
  zimmer: r.zimmer,
  freiflaechen: r.freiflaechen ?? [],
  parken: r.parken ?? [],
  ausstattung: r.ausstattung ?? [],
  zustand: r.zustand ?? null,
  miete: r.miete == null ? null : Number(r.miete),
  beschreibung: r.beschreibung,
  createdAt: r.created_at,
});

export type LoadResult = {
  objekte: Objekt[];
  /** true = Tabelle fehlt noch, es werden Beispieldaten angezeigt */
  demo: boolean;
  error: string | null;
};

// PostgREST: Tabelle nicht gefunden (PGRST205) bzw. Postgres undefined_table (42P01)
const isMissingTable = (code?: string) => code === "PGRST205" || code === "42P01";

export async function loadObjekte(): Promise<LoadResult> {
  const supabase = getSupabase();
  if (!supabase) return { objekte: [], demo: false, error: "Supabase ist nicht konfiguriert." };

  const { data, error } = await supabase
    .from("objekte")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTable(error.code)) return { objekte: demoObjekte, demo: true, error: null };
    return { objekte: [], demo: false, error: "Objekte konnten nicht geladen werden." };
  }
  return { objekte: (data as Row[]).map(fromRow), demo: false, error: null };
}

export async function loadObjekt(id: string): Promise<Objekt | null> {
  if (id.startsWith("demo-")) return demoObjekte.find((o) => o.id === id) ?? null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("objekte").select("*").eq("id", id).maybeSingle();
  return data ? fromRow(data as Row) : null;
}
