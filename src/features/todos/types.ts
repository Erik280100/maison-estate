export const STATUS = ["offen", "in_arbeit", "wartet", "erledigt"] as const;
export type TodoStatus = (typeof STATUS)[number];

export const PRIO = ["niedrig", "normal", "hoch"] as const;
export type TodoPrio = (typeof PRIO)[number];

export const STATUS_LABEL: Record<TodoStatus, string> = {
  offen: "Offen",
  in_arbeit: "In Arbeit",
  wartet: "Wartet",
  erledigt: "Erledigt",
};

export const PRIO_LABEL: Record<TodoPrio, string> = {
  niedrig: "Niedrig",
  normal: "Normal",
  hoch: "Hoch",
};

export type Todo = {
  id: string;
  titel: string;
  beschreibung: string | null;
  status: TodoStatus;
  prioritaet: TodoPrio;
  zugewiesenAn: string | null;
  /** ISO-Datum (YYYY-MM-DD) */
  startDatum: string | null;
  faelligDatum: string | null;
  createdAt: string;
};

export type TodoInput = Omit<Todo, "id" | "createdAt">;

export type Member = { id: string; email: string };
