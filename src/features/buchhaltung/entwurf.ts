import type { SupabaseClient } from "@supabase/supabase-js";
import type { Beleg } from "./types";
import { neu } from "./api";
import { today } from "./logik/util";

/** Manuellen Buchungsentwurf (z. B. Erstattung, AfA) in der Datenbank anlegen. */
export async function manuellerEntwurf(sb: SupabaseClient, uid: string, d: Partial<Beleg> & Pick<Beleg, "zeilen" | "beschreibung">): Promise<Beleg> {
  const b: Omit<Beleg, "id"> = {
    art: "MB",
    status: "Entwurf",
    belegdatum: today(),
    partner: "",
    manuell: true,
    positionen: [],
    hinweise: [],
    erfasstVon: uid,
    erfasstAm: new Date().toISOString(),
    ...d,
  };
  const id = await neu(sb, "belege", b);
  return { id, ...b };
}
