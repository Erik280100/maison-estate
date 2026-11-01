"use client";

import { useState } from "react";
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
    eigenkapital > 0 && v.monate > 0
      ? ((gewinn / eigenkapital) * 12 * 100) / v.monate
      : 0;

  const rows: [string, string][] = [
    ["Gesamtinvestition inkl. Zinsen", formatPrice(Math.round(invest))],
    ["Eingesetztes Eigenkapital", formatPrice(Math.round(eigenkapital))],
    ["Gewinn vor Steuern", formatPrice(Math.round(gewinn))],
    ["Marge auf Investition", `${marge.toFixed(1)} %`],
    ["Eigenkapitalrendite p. a.", `${roiPa.toFixed(1)} %`],
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="grid gap-4 sm:grid-cols-2">
        {initial.map((f) => (
          <label key={f.key} className="block text-sm">
            {f.label} <span className="text-stone-500">({f.suffix})</span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={Number.isFinite(v[f.key]) ? v[f.key] : ""}
              onChange={(e) => setV({ ...v, [f.key]: e.target.valueAsNumber })}
              className="mt-1 w-full rounded-sm border border-ivory-100 bg-white px-3 py-2 outline-none focus:border-gold-500"
            />
          </label>
        ))}
      </div>
      <dl className="h-fit divide-y divide-ivory-100 border border-ivory-100 bg-white">
        {rows.map(([k, val]) => (
          <div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm">
            <dt className="text-stone-500">{k}</dt>
            <dd className="font-medium">{Number.isFinite(invest) ? val : "–"}</dd>
          </div>
        ))}
        <p className="px-5 py-3 text-xs text-stone-500">
          Beispielrechnung ohne Steuern. Werte sind Platzhalter.
        </p>
      </dl>
    </div>
  );
}
