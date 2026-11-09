"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { LEER, abonnieren, isMissing, ladeAlles, profile, type Daten } from "./api";
import { kontenMit } from "./konten";
import type { Ctx } from "./logik/buchung";

type Bh = {
  sb: SupabaseClient;
  uid: string;
  email: string;
  holder: string;
  d: Daten;
  konten: Record<string, string>;
  kontenListe: [string, string][];
  ctx: Ctx;
  reload: () => Promise<void>;
  who: (id?: string | null) => string;
  toast: (t: string) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
};

const BhContext = createContext<Bh | null>(null);
export const useBh = () => {
  const v = useContext(BhContext);
  if (!v) throw new Error("useBh außerhalb von BhProvider");
  return v;
};

export function BhProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const sb = getSupabase();
  const uid = session?.user.id;
  const email = session?.user.email ?? "";
  const [d, setD] = useState<Daten>(LEER);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [holder] = useState(() => Math.random().toString(36).slice(2));

  const reload = useCallback(async () => {
    if (!sb) return;
    try {
      setD(await ladeAlles(sb));
      setError(null);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (isMissing(code)) setSetup(true);
      else setError("Buchhaltungsdaten konnten nicht geladen werden.");
    } finally {
      setLoaded(true);
    }
  }, [sb]);

  useEffect(() => {
    if (!sb || !uid) return;
    // Daten beim Öffnen laden und per Realtime/Polling aktuell halten
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    return abonnieren(sb, () => void reload());
  }, [sb, uid, reload]);

  // Anzeigenamen der Personen nachladen
  useEffect(() => {
    if (!sb) return;
    const ids = [...new Set([...d.belege.flatMap((b) => [b.erfasstVon, b.gebuchtVon, b.freigabeVon]), ...d.protokoll.map((p) => p.user)].filter(Boolean) as string[])].filter((i) => !(i in names));
    if (!ids.length) return;
    void profile(sb, ids).then((p) => setNames((n) => ({ ...n, ...Object.fromEntries(ids.map((i) => [i, p[i] ?? ""])) })));
  }, [sb, d.belege, d.protokoll, names]);

  const kontenListe = useMemo(() => kontenMit(d.gesellschafter), [d.gesellschafter]);
  const konten = useMemo(() => Object.fromEntries(kontenListe), [kontenListe]);
  const ctx = useMemo<Ctx>(() => ({ belege: d.belege, perioden: d.perioden, konten }), [d.belege, d.perioden, konten]);
  const who = useCallback((id?: string | null) => (id ? names[id] || "Gesellschafter" : "–"), [names]);

  if (!sb) return <Alert severity="error">Supabase ist nicht konfiguriert.</Alert>;
  if (setup)
    return (
      <Alert severity="warning">
        Die Buchhaltungs-Tabellen fehlen. Bitte im Supabase SQL Editor <code>supabase/007_buchhaltung.sql</code> und danach{" "}
        <code>supabase/011_buchhaltung_erweiterung.sql</code> ausführen.
      </Alert>
    );
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!loaded || !uid) return <CircularProgress aria-label="Buchhaltung wird geladen" />;

  const value: Bh = { sb, uid, email, holder, d, konten, kontenListe, ctx, reload, who, toast: setMsg, busy, setBusy };
  return (
    <BhContext.Provider value={value}>
      {children}
      <Snackbar open={!!msg} autoHideDuration={3500} onClose={() => setMsg(null)} message={msg} />
    </BhContext.Provider>
  );
}
