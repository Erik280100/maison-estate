import Link from "next/link";
import { rechner } from "@/features/rechner/registry";

export default function InternHome() {
  return (
    <>
      <h1 className="font-serif text-4xl">Interner Bereich</h1>
      <p className="mt-2 mb-8 text-stone-500">
        Werkzeuge für das Team. Neue Bereiche lassen sich hier ergänzen.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/intern/objekte/"
          className="block border border-ivory-100 bg-white p-6 transition-shadow hover:shadow-lg"
        >
          <p className="text-xs uppercase tracking-wider text-gold-600">Verwaltung</p>
          <h2 className="mt-2 font-serif text-2xl">Objekte</h2>
          <p className="mt-2 text-sm text-stone-500">
            Immobilien suchen und filtern nach Ort, PLZ, Preis, Fläche, Zimmer, Typ und Ausstattung.
          </p>
        </Link>
        {rechner.map((r) => (
          <Link
            key={r.slug}
            href={`/intern/rechner/${r.slug}/`}
            className="block border border-ivory-100 bg-white p-6 transition-shadow hover:shadow-lg"
          >
            <p className="text-xs uppercase tracking-wider text-gold-600">Rechner</p>
            <h2 className="mt-2 font-serif text-2xl">{r.title}</h2>
            <p className="mt-2 text-sm text-stone-500">{r.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
