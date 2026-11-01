"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

/**
 * Blendet Inhalte nur für eingeloggte Personen ein.
 * Achtung: Das ist eine Anzeige-Sperre im Browser. Vertrauliche Daten dürfen
 * nur aus Supabase (mit Row Level Security) kommen, nicht im Code stehen.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace("/login/");
  }, [loading, session, router]);

  if (!configured) {
    return (
      <p className="p-8 text-stone-500">
        Login ist noch nicht eingerichtet (Supabase-Zugangsdaten fehlen).
      </p>
    );
  }
  if (loading || !session) {
    return <p className="p-8 text-stone-500">Wird geladen …</p>;
  }
  return <>{children}</>;
}
