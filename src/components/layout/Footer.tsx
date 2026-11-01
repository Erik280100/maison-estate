import Link from "next/link";
import { company } from "@/config/company";

export function Footer({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const base =
    tone === "dark"
      ? "text-stone-500 border-navy-800"
      : "text-navy-700 border-ivory-100";
  return (
    <footer className={`border-t px-4 py-6 text-sm ${base}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
        <p>© 2026 {company.displayName}</p>
        <nav className="flex gap-6" aria-label="Rechtliches">
          <Link href="/impressum" className="hover:text-gold-500 transition-colors">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-gold-500 transition-colors">
            Datenschutz
          </Link>
          <Link href="/login" className="hover:text-gold-500 transition-colors">
            Login
          </Link>
        </nav>
      </div>
    </footer>
  );
}
