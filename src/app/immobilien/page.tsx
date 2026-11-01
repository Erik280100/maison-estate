import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isLive } from "@/lib/site-mode";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { PropertyGrid } from "@/components/properties/PropertyGrid";
import { getProperties } from "@/lib/properties";

export const metadata: Metadata = {
  title: "Immobilien",
  description: "Aktuelle Wohnungen zum Kauf von Maison Estate.",
};

export default async function ImmobilienPage() {
  if (!isLive) redirect("/");
  const properties = await getProperties();
  return (
    <>
      <Header />
      <main className="flex-1 py-12">
        <Container>
          <h1 className="font-serif text-4xl sm:text-5xl">Unsere Immobilien</h1>
          <p className="mt-3 mb-10 text-stone-500">
            Aktuell verfügbare Wohnungen im Überblick.
          </p>
          <PropertyGrid properties={properties} />
        </Container>
      </main>
      <Footer tone="light" />
    </>
  );
}
