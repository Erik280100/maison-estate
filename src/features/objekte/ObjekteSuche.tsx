"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatArea, formatPrice } from "@/lib/format";
import { loadObjekte, type LoadResult } from "./api";
import { activeFilterCount, applyFilter, emptyFilter, type Filter, type SortKey } from "./filter";
import { FilterPanel } from "./FilterPanel";
import { LABELS, type Objekt } from "./types";

function ObjektZeile({ o }: { o: Objekt }) {
  const tags = [LABELS[o.objekttyp], ...o.freiflaechen.map((x) => LABELS[x]), ...o.parken.map((x) => LABELS[x])];
  return (
    <Link
      href={`/intern/objekte/detail/?id=${o.id}`}
      className="group grid gap-4 border border-ivory-100 bg-white p-4 transition-shadow hover:shadow-lg sm:grid-cols-[180px_1fr_auto]"
    >
      <div className="flex aspect-[4/3] items-center justify-center bg-navy-900 text-xs text-gold-500/60 sm:aspect-auto sm:min-h-28">
        Foto folgt
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-stone-500">
          {o.plz} {o.ort}
          {o.bezirk ? `, ${o.bezirk}` : ""}
        </p>
        <h3 className="mt-1 font-serif text-2xl leading-tight group-hover:text-gold-600">{o.titel}</h3>
        <p className="mt-2 text-sm text-navy-700">
          {formatArea(o.wohnflaeche)} · {o.zimmer} Zimmer
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <li key={t} className="border border-gold-500/40 px-2 py-0.5 text-xs text-navy-700">
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-start justify-between gap-2 sm:flex-col sm:items-end">
        <span className="bg-gold-500 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-navy-950">
          {LABELS[o.status]}
        </span>
        <div className="sm:text-right">
          <p className="font-serif text-2xl text-gold-600">{formatPrice(o.preis)}</p>
          <p className="text-xs text-stone-500">
            {formatPrice(Math.round(o.preis / o.wohnflaeche))} / m²
          </p>
        </div>
      </div>
    </Link>
  );
}

export function ObjekteSuche() {
  const [data, setData] = useState<LoadResult | null>(null);
  const [filter, setFilter] = useState<Filter>(emptyFilter);
  const [showFilter, setShowFilter] = useState(true);

  useEffect(() => {
    let alive = true;
    loadObjekte().then((r) => alive && setData(r));
    return () => {
      alive = false;
    };
  }, []);

  const treffer = useMemo(
    () => (data ? applyFilter(data.objekte, filter) : []),
    [data, filter],
  );
  const count = activeFilterCount(filter);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Objekte</h1>
          <p className="mt-1 text-stone-500">Suchen und filtern.</p>
        </div>
      </div>

      {data?.demo && (
        <p className="mt-4 border border-gold-500/50 bg-ivory-100 px-4 py-3 text-sm">
          <strong>Beispieldaten.</strong> Die Tabelle „objekte“ gibt es in Supabase noch nicht.
          Führe <code>supabase/001_objekte.sql</code> im SQL Editor aus, dann erscheinen hier
          eure echten Objekte.
        </p>
      )}
      {data?.error && (
        <p role="alert" className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {data.error}
        </p>
      )}

      <section aria-label="Filter" className="mt-6 border border-ivory-100 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setShowFilter((v) => !v)}
            aria-expanded={showFilter}
            className="text-sm font-medium"
          >
            Filter {showFilter ? "▴" : "▾"}
            {count > 0 && (
              <span className="ml-2 rounded-full bg-gold-500 px-2 py-0.5 text-xs text-navy-950">
                {count}
              </span>
            )}
          </button>
          {count > 0 && (
            <button
              type="button"
              onClick={() => setFilter({ ...emptyFilter, sort: filter.sort })}
              className="text-sm text-gold-600 hover:underline"
            >
              Zurücksetzen
            </button>
          )}
        </div>
        {showFilter && <FilterPanel filter={filter} onChange={setFilter} />}
      </section>

      <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-stone-500">
          {data ? `${treffer.length} von ${data.objekte.length} Objekten` : "Wird geladen …"}
        </p>
        <label className="flex items-center gap-2 text-sm">
          Sortierung
          <select
            value={filter.sort}
            onChange={(e) => setFilter({ ...filter, sort: e.target.value as SortKey })}
            className="rounded-sm border border-ivory-100 bg-white px-2 py-1.5"
          >
            <option value="neueste">Neueste zuerst</option>
            <option value="preis-auf">Preis aufsteigend</option>
            <option value="preis-ab">Preis absteigend</option>
            <option value="flaeche-ab">Wohnfläche absteigend</option>
          </select>
        </label>
      </div>

      <div className="space-y-4">
        {treffer.map((o) => (
          <ObjektZeile key={o.id} o={o} />
        ))}
        {data && !data.error && treffer.length === 0 && (
          <p className="border border-ivory-100 bg-white p-8 text-center text-stone-500">
            {data.objekte.length === 0
              ? "Noch keine Objekte angelegt."
              : "Keine Objekte für diese Filter. Versuche, einzelne Filter zu lockern."}
          </p>
        )}
      </div>
    </>
  );
}
