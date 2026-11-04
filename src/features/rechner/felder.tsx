"use client";

// Gemeinsame Formularhelfer für die Rechner: Zahlenfelder, Schalter und Auswahlfelder aus einer Feldliste.
import Grid from "@mui/material/Grid";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { NumField } from "./ankauf/ui";

export type NF<T> = { k: keyof T; label: string; unit: string; helper?: string; when?: (s: T) => boolean };
export type CF<T> = { k: keyof T; label: string; helper?: string; when?: (s: T) => boolean };
export type SF<T> = { k: keyof T; label: string; options: [string | number, string][]; when?: (s: T) => boolean };

export function Fields<T>({ list, s, set }: { list: NF<T>[]; s: T; set: (k: keyof T, v: number) => void }) {
  return (
    <Grid container spacing={2}>
      {list
        .filter((f) => !f.when || f.when(s))
        .map((f) => (
          <Grid key={String(f.k)} size={{ xs: 12, sm: 6 }}>
            <NumField label={f.label} suffix={f.unit} value={s[f.k] as number} onChange={(x) => set(f.k, Number.isNaN(x) ? 0 : x)} helper={f.helper} />
          </Grid>
        ))}
    </Grid>
  );
}

export function Switches<T>({ list, s, set }: { list: CF<T>[]; s: T; set: (k: keyof T, v: boolean) => void }) {
  return (
    <>
      {list
        .filter((f) => !f.when || f.when(s))
        .map((f) => (
          <FormControlLabel
            key={String(f.k)}
            control={<Switch checked={!!s[f.k]} onChange={(e) => set(f.k, e.target.checked)} />}
            label={
              <span>
                {f.label}
                {f.helper && (
                  <Typography variant="caption" color="text.secondary" component="span" sx={{ display: "block" }}>
                    {f.helper}
                  </Typography>
                )}
              </span>
            }
          />
        ))}
    </>
  );
}

export function Selects<T>({ list, s, set }: { list: SF<T>[]; s: T; set: (k: keyof T, v: string | number) => void }) {
  return (
    <Grid container spacing={2}>
      {list
        .filter((f) => !f.when || f.when(s))
        .map((f) => (
          <Grid key={String(f.k)} size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth select label={f.label} value={s[f.k] as string | number} onChange={(e) => {
              const raw = e.target.value;
              set(f.k, typeof f.options[0][0] === "number" ? Number(raw) : raw);
            }}>
              {f.options.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
            </TextField>
          </Grid>
        ))}
    </Grid>
  );
}
