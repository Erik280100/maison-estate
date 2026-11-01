import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,var(--color-navy-800)_0%,var(--color-navy-900)_55%,var(--color-navy-950)_100%)] px-4 text-gold-300">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-4xl">Interner Bereich</h1>
        <p className="mt-2 text-sm text-stone-500">
          Nur für das Maison-Estate-Team.
        </p>
        <LoginForm />
        <Link
          href="/"
          className="mt-8 inline-block text-sm text-stone-500 hover:text-gold-500"
        >
          ← Zur Startseite
        </Link>
      </div>
    </main>
  );
}
