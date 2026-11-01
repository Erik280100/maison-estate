import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HtmlRechner } from "@/features/rechner/HtmlRechner";
import { rechner } from "@/features/rechner/registry";

export function generateStaticParams() {
  return rechner.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: rechner.find((r) => r.slug === slug)?.title };
}

export default async function RechnerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = rechner.find((x) => x.slug === slug);
  if (!r) notFound();

  return (
    <>
      <Link href="/intern/" className="text-sm text-gold-600 hover:underline">
        ← Übersicht
      </Link>
      <h1 className="mt-4 mb-8 font-serif text-4xl">{r.title}</h1>
      {r.htmlFile ? (
        <HtmlRechner file={r.htmlFile} title={r.title} />
      ) : (
        r.Component && <r.Component />
      )}
    </>
  );
}
