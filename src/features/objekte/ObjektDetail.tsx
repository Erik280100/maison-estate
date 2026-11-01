"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatArea, formatPrice } from "@/lib/format";
import { loadObjekt } from "./api";
import { LABELS, type Objekt } from "./types";

export function ObjektDetail() {
  const id = useSearchParams().get("id");
  const [loaded, setLoaded] = useState<{ id: string; objekt: Objekt | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    loadObjekt(id).then((o) => alive && setLoaded({ id, objekt: o }));
    return () => {
      alive = false;
    };
  }, [id]);

  // undefined = lädt noch, null = nicht gefunden
  const objekt: Objekt | null | undefined = !id
    ? null
    : loaded?.id === id
      ? loaded.objekt
      : undefined;

  const back = (
    <Link href="/intern/objekte/" className="text-sm text-gold-600 hover:underline">
      ← Alle Objekte
    </Link>
  );

  if (objekt === undefined) return <p className="text-stone-500">Wird geladen …</p>;
  if (objekt === null)
    return (
      <>
        {back}
        <p className="mt-6">Objekt nicht gefunden.</p>
      </>
    );

  const o = objekt;
  const facts: [string, string][] = [
    ["Status", LABELS[o.status]],
    ["Objekttyp", LABELS[o.objekttyp]],
    ["Kaufpreis", formatPrice(o.preis)],
    ["Preis pro m²", formatPrice(Math.round(o.preis / o.wohnflaeche))],
    ["Wohnfläche", formatArea(o.wohnflaeche)],
    ["Zimmer", String(o.zimmer)],
    ["Lage", `${o.plz} ${o.ort}${o.bezirk ? `, ${o.bezirk}` : ""}`],
    ["Adresse", o.strasse ?? "–"],
    ["Freifläche", o.freiflaechen.map((x) => LABELS[x]).join(", ") || "–"],
    ["Parken", o.parken.map((x) => LABELS[x]).join(", ") || "–"],
  ];

  return (
    <>
      {back}
      <h1 className="mt-4 font-serif text-4xl">{o.titel}</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex aspect-[16/10] items-center justify-center bg-navy-900 text-gold-500/60">
            Fotos folgen
          </div>
          {o.beschreibung && <p className="mt-8 leading-relaxed">{o.beschreibung}</p>}
        </div>
        <dl className="h-fit divide-y divide-ivory-100 border border-ivory-100 bg-white">
          {facts.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm">
              <dt className="text-stone-500">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
