import { getSupabase } from "@/lib/supabase";
import type { Member, Todo, TodoInput } from "./types";

type Row = {
  id: string;
  created_at: string;
  titel: string;
  beschreibung: string | null;
  status: Todo["status"];
  prioritaet: Todo["prioritaet"];
  zugewiesen_an: string | null;
  start_datum: string | null;
  faellig_datum: string | null;
};

const fromRow = (r: Row): Todo => ({
  id: r.id,
  titel: r.titel,
  beschreibung: r.beschreibung,
  status: r.status,
  prioritaet: r.prioritaet,
  zugewiesenAn: r.zugewiesen_an,
  startDatum: r.start_datum,
  faelligDatum: r.faellig_datum,
  createdAt: r.created_at,
});

const toRow = (t: Partial<TodoInput>) => ({
  ...(t.titel !== undefined && { titel: t.titel }),
  ...(t.beschreibung !== undefined && { beschreibung: t.beschreibung }),
  ...(t.status !== undefined && { status: t.status }),
  ...(t.prioritaet !== undefined && { prioritaet: t.prioritaet }),
  ...(t.zugewiesenAn !== undefined && { zugewiesen_an: t.zugewiesenAn }),
  ...(t.startDatum !== undefined && { start_datum: t.startDatum }),
  ...(t.faelligDatum !== undefined && { faellig_datum: t.faelligDatum }),
});

// PostgREST: Tabelle/Funktion nicht gefunden bzw. Postgres undefined_table/undefined_function
const isMissing = (code?: string) => ["PGRST205", "PGRST202", "42P01", "42883"].includes(code ?? "");

export type TodoLoad = { todos: Todo[]; setupNeeded: boolean; error: string | null };

export async function loadTodos(): Promise<TodoLoad> {
  const supabase = getSupabase();
  if (!supabase) return { todos: [], setupNeeded: false, error: "Supabase ist nicht konfiguriert." };
  const { data, error } = await supabase.from("todos").select("*").order("created_at", { ascending: false });
  if (error) {
    if (isMissing(error.code)) return { todos: [], setupNeeded: true, error: null };
    return { todos: [], setupNeeded: false, error: "To-dos konnten nicht geladen werden." };
  }
  return { todos: (data as Row[]).map(fromRow), setupNeeded: false, error: null };
}

export async function loadMembers(): Promise<Member[]> {
  const { data } = (await getSupabase()?.rpc("todo_team")) ?? { data: null };
  return (data as Member[] | null) ?? [];
}

export async function createTodo(input: TodoInput): Promise<string | null> {
  const { error } = (await getSupabase()?.from("todos").insert(toRow(input))) ?? {};
  return error ? "Speichern fehlgeschlagen." : null;
}

export async function updateTodo(id: string, patch: Partial<TodoInput>): Promise<string | null> {
  const { error } = (await getSupabase()?.from("todos").update(toRow(patch)).eq("id", id)) ?? {};
  return error ? "Speichern fehlgeschlagen." : null;
}

export async function deleteTodo(id: string): Promise<string | null> {
  const { error } = (await getSupabase()?.from("todos").delete().eq("id", id)) ?? {};
  return error ? "Löschen fehlgeschlagen." : null;
}

/** Live-Updates; gibt eine Abmelde-Funktion zurück. */
export function subscribeTodos(onChange: () => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const ch = supabase
    .channel("todos-board")
    .on("postgres_changes", { event: "*", schema: "public", table: "todos" }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}
