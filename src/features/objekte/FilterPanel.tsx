"use client";

import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormLabel from "@mui/material/FormLabel";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import PlaceRounded from "@mui/icons-material/PlaceRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import type { Filter } from "./filter";
import { MultiCheckDropdown } from "./MultiCheckDropdown";
import {
  AUSSTATTUNG,
  ZUSTAND,
  FREIFLAECHEN,
  OBJEKTTYPEN,
  PARKEN,
  ZIMMER_OPTIONEN,

  type Freiflaeche,
  type Objekttyp,
  type Parkplatz,
} from "./types";

function Range({
  label,
  unit,
  from,
  to,
  onFrom,
  onTo,
}: {
  label: string;
  unit: string;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  const adornment = { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> };
  return (
    <FormControl component="fieldset" fullWidth>
      <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600, color: "text.primary" }}>
        {label}
      </FormLabel>
      <Stack direction="row" spacing={1}>
        <TextField
          type="number"
          label="von"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          slotProps={{ htmlInput: { min: 0, inputMode: "decimal" }, input: adornment }}
        />
        <TextField
          type="number"
          label="bis"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          slotProps={{ htmlInput: { min: 0, inputMode: "decimal" }, input: adornment }}
        />
      </Stack>
    </FormControl>
  );
}

function CheckGroup<T extends string>({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <FormControl component="fieldset">
      <FormLabel component="legend" sx={{ fontWeight: 600, color: "text.primary" }}>
        {legend}
      </FormLabel>
      <FormGroup>
        {options.map((o) => (
          <FormControlLabel
            key={o.value}
            label={o.label}
            control={
              <Checkbox
                size="small"
                color="secondary"
                checked={selected.includes(o.value)}
                onChange={() =>
                  onChange(
                    selected.includes(o.value)
                      ? selected.filter((v) => v !== o.value)
                      : [...selected, o.value],
                  )
                }
              />
            }
          />
        ))}
      </FormGroup>
    </FormControl>
  );
}

/** Aufklappbare Checkbox-Gruppe (Zustand, Ausstattung). */
function AufklappGruppe<T extends string>({
  id,
  title,
  options,
  selected,
  onChange,
  hint,
}: {
  id: string;
  title: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (next: T[]) => void;
  hint: string;
}) {
  return (
    <Accordion disableGutters variant="outlined" sx={{ borderRadius: 2, "&::before": { display: "none" } }}>
      <AccordionSummary
        expandIcon={<ExpandMoreRounded />}
        aria-controls={`${id}-content`}
        id={`${id}-header`}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>{title}</span>
          {selected.length > 0 && (
            <Chip size="small" color="secondary" label={`${selected.length} gewählt`} />
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails id={`${id}-content`}>
        <FormGroup sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
          {options.map((o) => (
            <FormControlLabel
              key={o.value}
              label={o.label}
              control={
                <Checkbox
                  size="small"
                  color="secondary"
                  checked={selected.includes(o.value)}
                  onChange={() =>
                    onChange(
                      selected.includes(o.value)
                        ? selected.filter((v) => v !== o.value)
                        : [...selected, o.value],
                    )
                  }
                />
              }
            />
          ))}
        </FormGroup>
        <FormLabel sx={{ display: "block", mt: 1.5, fontSize: 12 }}>{hint}</FormLabel>
      </AccordionDetails>
    </Accordion>
  );
}

export function FilterPanel({
  filter,
  onChange,
}: {
  filter: Filter;
  onChange: (next: Filter) => void;
}) {
  const set = <K extends keyof Filter>(key: K, value: Filter[K]) =>
    onChange({ ...filter, [key]: value });

  return (
    <Stack spacing={4}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 5 }}>
          <TextField
            fullWidth
            type="search"
            label="Ort"
            placeholder="z. B. Wien oder Leopoldstadt"
            value={filter.ort}
            onChange={(e) => set("ort", e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            type="search"
            label="PLZ"
            placeholder="z. B. 1020 oder 10"
            value={filter.plz}
            onChange={(e) => set("plz", e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { inputMode: "numeric" },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PlaceRounded fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <MultiCheckDropdown
            label="Zimmer"
            options={ZIMMER_OPTIONEN}
            selected={filter.zimmer}
            onChange={(v) => set("zimmer", v)}
          />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Range
            label="Preis"
            unit="€"
            from={filter.preisVon}
            to={filter.preisBis}
            onFrom={(v) => set("preisVon", v)}
            onTo={(v) => set("preisBis", v)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Range
            label="Wohnfläche"
            unit="m²"
            from={filter.flaecheVon}
            to={filter.flaecheBis}
            onFrom={(v) => set("flaecheVon", v)}
            onTo={(v) => set("flaecheBis", v)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, lg: 2 }}>
          <CheckGroup<Objekttyp>
            legend="Objekttyp"
            options={OBJEKTTYPEN}
            selected={filter.objekttypen}
            onChange={(v) => set("objekttypen", v)}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <CheckGroup<Freiflaeche>
            legend="Freifläche"
            options={FREIFLAECHEN}
            selected={filter.freiflaechen}
            onChange={(v) => set("freiflaechen", v)}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <CheckGroup<Parkplatz>
            legend="Parken"
            options={PARKEN}
            selected={filter.parken}
            onChange={(v) => set("parken", v)}
          />
        </Grid>
      </Grid>

      <AufklappGruppe
        id="zustand"
        title="Zustand"
        options={ZUSTAND}
        selected={filter.zustand}
        onChange={(v) => set("zustand", v)}
        hint="Es werden Objekte angezeigt, die einen der gewählten Zustände haben."
      />

      <AufklappGruppe
        id="ausstattung"
        title="Ausstattung"
        options={AUSSTATTUNG}
        selected={filter.ausstattung}
        onChange={(v) => set("ausstattung", v)}
        hint="Es werden nur Objekte angezeigt, die alle gewählten Merkmale haben."
      />
    </Stack>
  );
}
