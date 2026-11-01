import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Container } from "./Container";

const nav = [
  { href: "/immobilien", label: "Immobilien" },
  { href: "/verkaufen", label: "Verkaufen" },
  { href: "/ueber-uns", label: "Über uns" },
];

export function Header() {
  return (
    <header className="bg-navy-900 text-gold-500">
      <Container className="flex items-center justify-between py-4">
        <Link href="/" aria-label="Maison Estate – Startseite">
          <Logo variant="emblem" className="h-12 w-auto" />
        </Link>
        <nav className="flex gap-6 text-sm" aria-label="Hauptnavigation">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-gold-300 transition-colors hover:text-gold-500"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}
