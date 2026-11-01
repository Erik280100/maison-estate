import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "./Container";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex-1 py-16">
      <Container className="max-w-3xl">
        <Link href="/" className="text-sm text-gold-600 hover:underline">
          ← Zurück zur Startseite
        </Link>
        <h1 className="mt-6 font-serif text-4xl sm:text-5xl">{title}</h1>
        <div className="mt-10 space-y-10 leading-relaxed text-navy-800 [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-navy-900 [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_a]:text-gold-600 [&_a]:underline">
          {children}
        </div>
      </Container>
    </main>
  );
}

/** Hebt unausgefüllte [TODO]-Felder gelb hervor. */
export function V({ children }: { children: string }) {
  return children.includes("[TODO") ? (
    <mark className="bg-yellow-200 px-1 text-navy-900">{children}</mark>
  ) : (
    <>{children}</>
  );
}
