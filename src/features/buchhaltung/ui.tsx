"use client";

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { fmtE, parseNum } from "./logik/util";

export function Kpi({ label, value, negative, hint }: { label: string; value: ReactNode; negative?: boolean; hint?: string }) {
  return (
    <Card variant="outlined" sx={{ p: 2, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontVariantNumeric: "tabular-nums", color: negative ? "error.main" : "text.primary" }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Card>
  );
}

export const KpiGrid = ({ children }: { children: ReactNode }) => (
  <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>{children}</Box>
);

export const Pill = ({ tone, children }: { tone: "ok" | "warn" | "err" | "neu"; children: ReactNode }) => (
  <Chip
    size="small"
    label={children}
    color={tone === "ok" ? "success" : tone === "warn" ? "warning" : tone === "err" ? "error" : "default"}
    variant={tone === "neu" ? "outlined" : "filled"}
  />
);

/** Euro-Eingabe: zeigt "1.234,56", übernimmt beim Verlassen des Feldes. */
export function EuroField({
  label, value, onChange, disabled, readOnly, helper, fullWidth = true,
}: {
  label: string; value: number | null | undefined; onChange: (v: number) => void;
  disabled?: boolean; readOnly?: boolean; helper?: string; fullWidth?: boolean;
}) {
  const show = (v: number | null | undefined) => (v == null ? "" : fmtE(v));
  const [txt, setTxt] = useState(show(value));
  // Anzeige nachziehen, wenn der Wert von außen geändert wird (kein Effekt nötig)
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setTxt(show(value));
  }
  return (
    <TextField
      label={label}
      size="small"
      fullWidth={fullWidth}
      value={txt}
      disabled={disabled}
      helperText={helper}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={() => {
        const n = Math.round(parseNum(txt) * 100) / 100;
        setTxt(show(n));
        if (n !== value) onChange(n);
      }}
      slotProps={{ htmlInput: { inputMode: "decimal", readOnly, style: { textAlign: "right" } } }}
    />
  );
}

export function Sel<T extends string | number>({
  label, value, onChange, options, disabled, fullWidth = true,
}: {
  label: string; value: T; onChange: (v: string) => void; options: [T, string][]; disabled?: boolean; fullWidth?: boolean;
}) {
  return (
    <TextField select size="small" label={label} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} fullWidth={fullWidth}>
      {options.map(([v, l]) => (
        <MenuItem key={String(v)} value={v}>
          {l}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function Txt({
  label, value, onChange, disabled, type, placeholder, multiline, fullWidth = true,
}: {
  label: string; value: string | undefined; onChange: (v: string) => void; disabled?: boolean;
  type?: "date" | "text" | "month"; placeholder?: string; multiline?: boolean; fullWidth?: boolean;
}) {
  return (
    <TextField
      size="small"
      label={label}
      value={value ?? ""}
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      multiline={multiline}
      fullWidth={fullWidth}
      onChange={(e) => onChange(e.target.value)}
      slotProps={type === "date" || type === "month" ? { inputLabel: { shrink: true } } : undefined}
    />
  );
}

export const Num = ({ children, neg }: { children: ReactNode; neg?: boolean }) => (
  <Box component="span" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: neg ? "error.main" : undefined }}>
    {children}
  </Box>
);

export const Leer = ({ titel, text }: { titel: string; text: string }) => (
  <Card variant="outlined" sx={{ p: 4, textAlign: "center" }}>
    <Typography sx={{ fontWeight: 700 }}>{titel}</Typography>
    <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
      {text}
    </Typography>
  </Card>
);

export const Hinweis = ({ children }: { children: ReactNode }) => (
  <Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: "80ch" }}>
    {children}
  </Typography>
);
