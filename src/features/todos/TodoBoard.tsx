"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddRounded from "@mui/icons-material/AddRounded";
import EventRounded from "@mui/icons-material/EventRounded";
import { useAuth } from "@/components/auth/AuthProvider";
import { createTodo, deleteTodo, loadMembers, loadTodos, subscribeTodos, updateTodo } from "./api";
import { TodoDialog } from "./TodoDialog";
import {
  PRIO_LABEL,
  STATUS,
  STATUS_LABEL,
  type Member,
  type Todo,
  type TodoInput,
  type TodoStatus,
} from "./types";

const laneAccent: Record<TodoStatus, string> = {
  offen: "#9aa4b8",
  in_arbeit: "#c2a467",
  wartet: "#e0a030",
  erledigt: "#4c9a6a",
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
};

const initials = (email: string) => email.slice(0, 2).toUpperCase();

/** Sortierung innerhalb einer Spalte: früheste Fälligkeit zuerst, ohne Datum unten. */
const byDue = (a: Todo, b: Todo) =>
  (a.faelligDatum ?? "9999").localeCompare(b.faelligDatum ?? "9999") || b.createdAt.localeCompare(a.createdAt);

function TodoCard({
  todo,
  member,
  today,
  onOpen,
}: {
  todo: Todo;
  member?: Member;
  today: string;
  onOpen: () => void;
}) {
  const done = todo.status === "erledigt";
  const overdue = !done && todo.faelligDatum !== null && todo.faelligDatum < today;
  // Beginn erreicht, aber noch nicht angefangen
  const startDue = todo.status === "offen" && todo.startDatum !== null && todo.startDatum <= today;
  return (
    <Card
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", todo.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onOpen}
      sx={{
        p: 1.5,
        cursor: "grab",
        opacity: done ? 0.7 : 1,
        "&:hover": { boxShadow: 4, borderColor: "secondary.main" },
        "&:active": { cursor: "grabbing" },
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, textDecoration: done ? "line-through" : "none" }}>
        {todo.titel}
      </Typography>
      {todo.beschreibung && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", mt: 0.5 }}
        >
          {todo.beschreibung}
        </Typography>
      )}
      <Stack direction="row" useFlexGap spacing={0.75} sx={{ mt: 1, flexWrap: "wrap", alignItems: "center" }}>
        {todo.prioritaet === "hoch" && <Chip size="small" color="error" label={PRIO_LABEL.hoch} />}
        {todo.startDatum && (
          <Chip
            size="small"
            variant="outlined"
            color={startDue ? "warning" : "default"}
            icon={<EventRounded />}
            label={`ab ${fmtDate(todo.startDatum)}`}
          />
        )}
        {todo.faelligDatum && (
          <Chip
            size="small"
            variant={overdue ? "filled" : "outlined"}
            color={overdue ? "error" : "default"}
            icon={<EventRounded />}
            label={`bis ${fmtDate(todo.faelligDatum)}`}
          />
        )}
        <Box sx={{ flex: 1 }} />
        {todo.zugewiesenAn && (
          <Tooltip title={member?.email ?? "Zugewiesen"}>
            <Avatar sx={{ width: 26, height: 26, fontSize: 11, bgcolor: "primary.main", color: "secondary.main" }}>
              {member ? initials(member.email) : "?"}
            </Avatar>
          </Tooltip>
        )}
      </Stack>
    </Card>
  );
}

type DialogState = { todo: Todo | null; status: TodoStatus } | null;

export function TodoBoard() {
  const { session } = useAuth();
  const me = session?.user.id ?? null;
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("alle"); // alle | meine | nicht | <userId>
  const [dialog, setDialog] = useState<DialogState>(null);
  const [overLane, setOverLane] = useState<TodoStatus | null>(null);
  const [today] = useState(todayIso);

  const reload = useCallback(async () => {
    const r = await loadTodos();
    setTodos(r.todos);
    setSetupNeeded(r.setupNeeded);
    setError(r.error);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Mounten laden
    void reload();
    void loadMembers().then(setMembers);
    return subscribeTodos(() => void reload());
  }, [reload]);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const visible = useMemo(() => {
    const list = todos ?? [];
    if (filter === "alle") return list;
    if (filter === "meine") return list.filter((t) => t.zugewiesenAn === me);
    if (filter === "nicht") return list.filter((t) => !t.zugewiesenAn);
    return list.filter((t) => t.zugewiesenAn === filter);
  }, [todos, filter, me]);

  const move = async (id: string, status: TodoStatus) => {
    const cur = todos?.find((t) => t.id === id);
    if (!cur || cur.status === status) return;
    setTodos((prev) => prev?.map((t) => (t.id === id ? { ...t, status } : t)) ?? prev);
    const err = await updateTodo(id, { status });
    if (err) setError(err);
    void reload();
  };

  const save = async (input: TodoInput) => {
    const err = dialog?.todo ? await updateTodo(dialog.todo.id, input) : await createTodo(input);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setDialog(null);
    await reload();
  };

  const remove = async () => {
    if (!dialog?.todo) return;
    if (!window.confirm("Dieses To-do wirklich löschen?")) return;
    const err = await deleteTodo(dialog.todo.id);
    if (err) {
      setError(err);
      return;
    }
    setDialog(null);
    await reload();
  };

  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" component="h1">
            To-dos
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Karten zwischen den Spalten ziehen, zuweisen und mit Beginn und Abschluss terminieren.
          </Typography>
        </Box>
        <TextField select size="small" label="Zuständig" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="alle">Alle</MenuItem>
          <MenuItem value="meine">Meine</MenuItem>
          <MenuItem value="nicht">Nicht zugewiesen</MenuItem>
          {members.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.email}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDialog({ todo: null, status: "offen" })} disabled={setupNeeded}>
          Neues To-do
        </Button>
      </Stack>

      {setupNeeded && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Die Tabelle fehlt noch. Bitte <code>supabase/008_todos.sql</code> im Supabase SQL Editor ausführen.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridAutoFlow: "column",
          gridAutoColumns: { xs: "minmax(260px, 85%)", md: "minmax(0, 1fr)" },
          gap: 2,
          overflowX: "auto",
          pb: 1,
          alignItems: "start",
        }}
      >
        {STATUS.map((s) => {
          const items = visible.filter((t) => t.status === s).sort(byDue);
          return (
            <Box
              key={s}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOverLane(s);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverLane(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setOverLane(null);
                void move(e.dataTransfer.getData("text/plain"), s);
              }}
              sx={{
                bgcolor: overLane === s ? "rgba(194,164,103,0.18)" : "rgba(15,31,61,0.05)",
                outline: overLane === s ? "2px dashed" : "none",
                outlineColor: "secondary.main",
                borderRadius: 3,
                p: 1.5,
                minHeight: 240,
                transition: "background-color .15s",
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5, px: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: laneAccent[s] }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
                  {STATUS_LABEL[s]}
                </Typography>
                <Chip size="small" label={items.length} />
                <IconButton
                  size="small"
                  aria-label={`Neues To-do in ${STATUS_LABEL[s]}`}
                  disabled={setupNeeded}
                  onClick={() => setDialog({ todo: null, status: s })}
                >
                  <AddRounded fontSize="small" />
                </IconButton>
              </Stack>
              <Stack spacing={1.25}>
                {todos === null ? (
                  <Skeleton variant="rounded" height={72} />
                ) : (
                  items.map((t) => (
                    <TodoCard
                      key={t.id}
                      todo={t}
                      today={today}
                      member={t.zugewiesenAn ? memberById.get(t.zugewiesenAn) : undefined}
                      onOpen={() => setDialog({ todo: t, status: t.status })}
                    />
                  ))
                )}
              </Stack>
            </Box>
          );
        })}
      </Box>

      {dialog && (
        <TodoDialog
          key={dialog.todo?.id ?? "neu"}
          todo={dialog.todo}
          defaultStatus={dialog.status}
          members={members}
          onClose={() => setDialog(null)}
          onSave={save}
          onDelete={dialog.todo ? remove : undefined}
        />
      )}
    </>
  );
}
