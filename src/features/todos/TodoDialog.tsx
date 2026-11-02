"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import {
  PRIO,
  PRIO_LABEL,
  STATUS,
  STATUS_LABEL,
  type Member,
  type Todo,
  type TodoInput,
  type TodoPrio,
  type TodoStatus,
} from "./types";

type Props = {
  /** null = neues To-do */
  todo: Todo | null;
  defaultStatus: TodoStatus;
  members: Member[];
  onClose: () => void;
  onSave: (input: TodoInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export function TodoDialog({ todo, defaultStatus, members, onClose, onSave, onDelete }: Props) {
  const [titel, setTitel] = useState(todo?.titel ?? "");
  const [beschreibung, setBeschreibung] = useState(todo?.beschreibung ?? "");
  const [status, setStatus] = useState<TodoStatus>(todo?.status ?? defaultStatus);
  const [prio, setPrio] = useState<TodoPrio>(todo?.prioritaet ?? "normal");
  const [wer, setWer] = useState(todo?.zugewiesenAn ?? "");
  const [start, setStart] = useState(todo?.startDatum ?? "");
  const [faellig, setFaellig] = useState(todo?.faelligDatum ?? "");
  const [busy, setBusy] = useState(false);

  const datumFehler = Boolean(start && faellig && start > faellig);
  const valid = titel.trim().length > 0 && !datumFehler;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{todo ? "To-do bearbeiten" : "Neues To-do"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField label="Titel" value={titel} onChange={(e) => setTitel(e.target.value)} autoFocus required />
          <TextField
            label="Beschreibung"
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            multiline
            minRows={3}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField select fullWidth label="Spalte" value={status} onChange={(e) => setStatus(e.target.value as TodoStatus)}>
              {STATUS.map((s) => (
                <MenuItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </MenuItem>
              ))}
            </TextField>
            <TextField select fullWidth label="Priorität" value={prio} onChange={(e) => setPrio(e.target.value as TodoPrio)}>
              {PRIO.map((p) => (
                <MenuItem key={p} value={p}>
                  {PRIO_LABEL[p]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField select label="Zugewiesen an" value={wer} onChange={(e) => setWer(e.target.value)}>
            <MenuItem value="">Niemand</MenuItem>
            {members.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.email}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              fullWidth
              type="date"
              label="Beginn"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth
              type="date"
              label="Abschluss bis"
              value={faellig}
              onChange={(e) => setFaellig(e.target.value)}
              error={datumFehler}
              helperText={datumFehler ? "Abschluss liegt vor dem Beginn" : undefined}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {onDelete && (
          <Button color="error" disabled={busy} onClick={() => run(onDelete)} sx={{ mr: "auto" }}>
            Löschen
          </Button>
        )}
        <Button onClick={onClose} disabled={busy}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          disabled={!valid || busy}
          onClick={() =>
            run(() =>
              onSave({
                titel: titel.trim(),
                beschreibung: beschreibung.trim() || null,
                status,
                prioritaet: prio,
                zugewiesenAn: wer || null,
                startDatum: start || null,
                faelligDatum: faellig || null,
              }),
            )
          }
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}
