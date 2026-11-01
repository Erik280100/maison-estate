import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true, wenn die Supabase-Zugangsdaten beim Build gesetzt waren. */
export const authConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * Browser-Client (nur in Client-Komponenten verwenden).
 * Der Anon-Key ist öffentlich vorgesehen; Schutz erfolgt über Supabase Auth
 * und Row Level Security in der Datenbank.
 */
export function getSupabase(): SupabaseClient | null {
  if (!authConfigured) return null;
  client ??= createClient(url!, anonKey!);
  return client;
}
