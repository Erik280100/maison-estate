"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
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
      <Box sx={{ p: 4 }}>
        <Alert severity="info">Login ist noch nicht eingerichtet (Supabase-Zugangsdaten fehlen).</Alert>
      </Box>
    );
  }
  if (loading || !session) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }
  return <>{children}</>;
}
