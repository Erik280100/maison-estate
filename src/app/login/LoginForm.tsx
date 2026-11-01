"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";

function Form() {
  const router = useRouter();
  const { session, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.replace("/intern/");
  }, [session, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError("Anmeldung fehlgeschlagen. Bitte Eingaben prüfen.");
  }

  if (!configured) {
    return (
      <p className="mt-8 text-sm text-stone-500">
        Login ist noch nicht eingerichtet.
      </p>
    );
  }

  const input =
    "mt-1 w-full rounded-sm border border-navy-700 bg-navy-950 px-3 py-2 text-gold-300 outline-none focus:border-gold-500";

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <label className="block text-sm">
        E-Mail
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
      </label>
      <label className="block text-sm">
        Passwort
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={input}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-sm bg-gold-500 px-4 py-2 font-medium text-navy-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
      >
        {busy ? "Anmelden …" : "Anmelden"}
      </button>
    </form>
  );
}

export function LoginForm() {
  return (
    <AuthProvider>
      <Form />
    </AuthProvider>
  );
}
