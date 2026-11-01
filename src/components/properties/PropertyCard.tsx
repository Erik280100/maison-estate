import Link from "next/link";
import type { Property } from "@/types/property";
import { formatArea, formatPrice, formatRooms } from "@/lib/format";

export function PropertyCard({ property }: { property: Property }) {
  const p = property;
  return (
    <Link
      href={`/immobilien/${p.slug}`}
      className="group block overflow-hidden rounded-sm border border-ivory-100 bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center bg-navy-900 text-sm text-gold-500/60">
        Bild folgt
        <span className="absolute left-3 top-3 bg-gold-500 px-2 py-1 text-xs font-medium uppercase tracking-wide text-navy-950">
          {p.status}
        </span>
      </div>
      <div className="space-y-2 p-5">
        <p className="text-xs uppercase tracking-wider text-stone-500">
          {p.postalCode} {p.city}, {p.district}
        </p>
        <h3 className="font-serif text-2xl leading-tight group-hover:text-gold-600">
          {p.title}
        </h3>
        <p className="text-sm text-navy-700">
          {formatArea(p.livingArea)} · {formatRooms(p.rooms)}
        </p>
        <p className="pt-2 font-serif text-2xl text-gold-600">
          {formatPrice(p.price)}
        </p>
      </div>
    </Link>
  );
}
