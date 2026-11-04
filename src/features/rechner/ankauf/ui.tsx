"use client";

import type { ReactNode } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Card from "@mui/material/Card";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";

export function NumField({
  label,
  suffix,
  value,
  onChange,
  helper,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (n: number) => void;
  helper?: string;
}) {
  return (
    <TextField
      fullWidth
      type="number"
      label={label}
      helperText={helper}
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
      slotProps={{
        htmlInput: { step: "any", inputMode: "decimal" },
        input: { endAdornment: <InputAdornment position="end">{suffix}</InputAdornment> },
      }}
    />
  );
}

export function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: intro ? 0.5 : 2 }}>
        {title}
      </Typography>
      {intro && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {intro}
        </Typography>
      )}
      <Stack spacing={2}>{children}</Stack>
    </Card>
  );
}

export function Details({ title, sum, children }: { title: string; sum: string; children: ReactNode }) {
  return (
    <Accordion disableGutters variant="outlined" sx={{ "&::before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMoreRounded />}>
        <Stack direction="row" sx={{ width: "100%", pr: 1, justifyContent: "space-between", gap: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {sum}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

export function Line({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
        {hint ? ` · ${hint}` : ""}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: strong ? 800 : 600, whiteSpace: "nowrap" }}>
        {value}
      </Typography>
    </Stack>
  );
}

export const ampelColor = { good: "success.main", warn: "warning.main", bad: "error.main" } as const;
