"use client";

import type { Filter } from "./filter";
import { MultiCheckDropdown } from "./MultiCheckDropdown";
import {
  FREIFLAECHEN,
  OBJEKTTYPEN,
  PARKEN,
  ZIMMER_OPTIONEN,
  type Freiflaeche,
  type Objekttyp,
  type Parkplatz,
} from "./types";

const input =
  "w-full rounded-sm border border-ivory-100 bg-white px-3 py-2 text-sm outline-none focus:border-gold-500";

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
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">
        {label} <span className="font-normal text-stone-500">({unit})</span>
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={0}
          inputMode="decimal"
          placeholder="von"
          aria-label={`${label} von`}
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          className={input}
        />
        <input
          type="number"
          min={0}
          inputMode="decimal"
          placeholder="bis"
          aria-label={`${label} bis`}
          value={to}
          onChange={(e) => onTo(e.target.value)}
          className={input}
        />
      </div>
    </fieldset>
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
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className="space-y-1">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 py-0.5 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-gold-600"
              checked={selected.includes(o.value)}
              onChange={() =>
                onChange(
                  selected.includes(o.value)
                    ? selected.filter((v) => v !== o.value)
                    : [...selected, o.value],
                )
              }
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
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
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Ort
          <input
            type="search"
            placeholder="z. B. Wien oder Leopoldstadt"
            value={filter.ort}
            onChange={(e) => set("ort", e.target.value)}
            className={`${input} mt-1 font-normal`}
          />
        </label>
        <label className="block text-sm font-medium">
          PLZ
          <input
            type="search"
            inputMode="numeric"
            placeholder="z. B. 1020 oder 10"
            value={filter.plz}
            onChange={(e) => set("plz", e.target.value)}
            className={`${input} mt-1 font-normal`}
          />
        </label>
        <div>
          <span className="mb-1 block text-sm font-medium">Zimmer</span>
          <MultiCheckDropdown
            label="Zimmer"
            options={ZIMMER_OPTIONEN}
            selected={filter.zimmer}
            onChange={(v) => set("zimmer", v)}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Range
          label="Preis"
          unit="€"
          from={filter.preisVon}
          to={filter.preisBis}
          onFrom={(v) => set("preisVon", v)}
          onTo={(v) => set("preisBis", v)}
        />
        <Range
          label="Wohnfläche"
          unit="m²"
          from={filter.flaecheVon}
          to={filter.flaecheBis}
          onFrom={(v) => set("flaecheVon", v)}
          onTo={(v) => set("flaecheBis", v)}
        />
        <CheckGroup<Objekttyp>
          legend="Objekttyp"
          options={OBJEKTTYPEN}
          selected={filter.objekttypen}
          onChange={(v) => set("objekttypen", v)}
        />
        <div className="grid grid-cols-2 gap-4 sm:col-span-2 lg:col-span-1 lg:grid-cols-1">
          <CheckGroup<Freiflaeche>
            legend="Freifläche"
            options={FREIFLAECHEN}
            selected={filter.freiflaechen}
            onChange={(v) => set("freiflaechen", v)}
          />
          <CheckGroup<Parkplatz>
            legend="Parken"
            options={PARKEN}
            selected={filter.parken}
            onChange={(v) => set("parken", v)}
          />
        </div>
      </div>
    </div>
  );
}
