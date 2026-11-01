"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Container } from "@/components/layout/Container";

function Bar() {
  const { session, signOut } = useAuth();
  return (
    <header className="bg-navy-900 text-gold-300">
      <Container className="flex items-center justify-between gap-4 py-4 text-sm">
        <nav className="flex gap-6" aria-label="Interne Navigation">
          <Link href="/intern/" className="font-serif text-xl text-gold-500">
            Maison Estate intern
          </Link>
          <Link href="/intern/objekte/" className="hover:text-gold-500">
            Objekte
          </Link>
          <Link href="/intern/rechner/" className="hover:text-gold-500">
            Rechner
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <span className="hidden text-stone-500 sm:inline">
            {session?.user.email}
          </span>
          <button
            onClick={() => signOut()}
            className="border border-gold-500/50 px-3 py-1 hover:border-gold-500 hover:text-gold-500"
          >
            Abmelden
          </button>
        </div>
      </Container>
    </header>
  );
}

export function InternShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <RequireAuth>
        <Bar />
        <main className="flex-1 py-10">
          <Container>{children}</Container>
        </main>
      </RequireAuth>
    </AuthProvider>
  );
}
