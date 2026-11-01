import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLive } from "@/lib/site-mode";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { getProperties, getPropertyBySlug } from "@/lib/properties";
import { formatArea, formatPrice, formatRooms } from "@/lib/format";

export async function generateStaticParams() {
  const properties = await getProperties();
  return properties.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) return {};
  return {
    title: property.title,
    description: `${formatRooms(property.rooms)}, ${formatArea(property.livingArea)} in ${property.postalCode} ${property.city} – ${formatPrice(property.price)}`,
  };
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isLive) redirect("/");
  const { slug } = await params;
  const p = await getPropertyBySlug(slug);
  if (!p) notFound();

  const facts: [string, string][] = [
    ["Kaufpreis", formatPrice(p.price)],
    ["Wohnfläche", formatArea(p.livingArea)],
    ["Zimmer", String(p.rooms)],
    ["Stockwerk", p.floor],
    ["Lage", `${p.postalCode} ${p.city}, ${p.district}`],
    ["Energieklasse (HWB)", p.energyClass],
    ["Status", p.status],
  ];

  return (
    <>
      <Header />
      <main className="flex-1 py-12">
        <Container>
          <Link href="/immobilien" className="text-sm text-gold-600 hover:underline">
            ← Alle Immobilien
          </Link>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">{p.title}</h1>

          <div className="mt-8 grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex aspect-[16/10] items-center justify-center bg-navy-900 text-gold-500/60">
                Galerie folgt
              </div>
              <p className="mt-8 leading-relaxed text-navy-800">{p.description}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="border border-gold-500/50 px-3 py-1 text-sm text-navy-700"
                  >
                    {f}
                  </li>
                ))}
              </ul>
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
        </Container>
      </main>
      <Footer tone="light" />
    </>
  );
}
