"use client";

import { useState } from "react";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { formatPrice } from "@/lib/format";

type Field = { key: string; label: string; suffix: string; value: number };

// Platzhalterwerte – die tatsächlichen Nebenkosten und Steuern mit Steuerberater abstimmen.
const initial: Field[] = [
  { key: "kauf", label: "Ankaufspreis", suffix: "€", value: 200000 },
  { key: "kaufNk", label: "Ankaufsnebenkosten", suffix: "%", value: 10 },
  { key: "sanierung", label: "Sanierungskosten", suffix: "€", value: 30000 },
  { key: "monate", label: "Haltedauer", suffix: "Monate", value: 9 },
  { key: "zins", label: "Finanzierungszins", suffix: "% p. a.", value: 4.5 },
  { key: "fremd", label: "Fremdkapital", suffix: "€", value: 150000 },
  { key: "verkauf", label: "Verkaufspreis", suffix: "€", value: 300000 },
  { key: "verkaufNk", label: "Verkaufsnebenkosten", suffix: "%", value: 4 },
];

export function AnkaufVerkaufRechner() {
  const [v, setV] = useState<Record<string, number>>(
    Object.fromEntries(initial.map((f) => [f.key, f.value])),
  );

  const kaufNk = (v.kauf * v.kaufNk) / 100;
  const zinsen = (v.fremd * (v.zins / 100) * v.monate) / 12;
  const verkaufNk = (v.verkauf * v.verkaufNk) / 100;
  const invest = v.kauf + kaufNk + v.sanierung + zinsen;
  const gewinn = v.verkauf - verkaufNk - invest;
  const marge = invest > 0 ? (gewinn / invest) * 100 : 0;
  const eigenkapital = v.kauf + kaufNk + v.sanierung - v.fremd;
  const roiPa =
    eigenkapital > 0 && v.monate > 0 ? ((gewinn / eigenkapital) * 12 * 100) / v.monate : 0;

  const ok = Number.isFinite(invest) && Number.isFinite(gewinn);
  const rows: [string, string, boolean?][] = [
    ["Gesamtinvestition inkl. Zinsen", formatPrice(Math.round(invest))],
    ["Eingesetztes Eigenkapital", formatPrice(Math.round(eigenkapital))],
    ["Gewinn vor Steuern", formatPrice(Math.round(gewinn)), true],
    ["Marge auf Investition", `${marge.toFixed(1)} %`],
    ["Eigenkapitalrendite p. a.", `${roiPa.toFixed(1)} %`],
  ];

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 7 }}>
        <Card sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {initial.map((f) => (
              <Grid key={f.key} size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label={f.label}
                  value={Number.isFinite(v[f.key]) ? v[f.key] : ""}
                  onChange={(e) =>
                    setV({ ...v, [f.key]: e.target.value === "" ? NaN : Number(e.target.value) })
                  }
                  slotProps={{
                    htmlInput: { step: "any", inputMode: "decimal" },
                    input: { endAdornment: <InputAdornment position="end">{f.suffix}</InputAdornment> },
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, lg: 5 }}>
        <Card sx={{ p: 3, bgcolor: "primary.main", color: "common.white" }}>
          <Typography variant="overline" sx={{ color: "secondary.light" }}>
            Ergebnis
          </Typography>
          <Stack divider={<Divider flexItem sx={{ borderColor: "rgba(255,255,255,0.12)" }} />} sx={{ mt: 1 }}>
            {rows.map(([k, val, strong]) => (
              <Stack key={k} direction="row" sx={{ py: 1.5, gap: 2, justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  {k}
                </Typography>
                <Typography
                  variant={strong ? "h6" : "body1"}
                  sx={{ fontWeight: 700, color: strong ? "secondary.main" : "inherit" }}
                >
                  {ok ? val : "–"}
                </Typography>
              </Stack>
            ))}
          </Stack>
          <Typography variant="caption" sx={{ display: "block", mt: 2, color: "rgba(255,255,255,0.55)" }}>
            Beispielrechnung ohne Steuern. Werte sind Platzhalter.
          </Typography>
        </Card>
      </Grid>
    </Grid>
  );
}
