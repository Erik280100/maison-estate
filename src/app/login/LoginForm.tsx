"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
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
    return <Alert severity="info">Login ist noch nicht eingerichtet.</Alert>;
  }

  return (
    <Card sx={{ p: 3.5 }}>
      <Stack component="form" onSubmit={onSubmit} spacing={2.5}>
        <TextField
          label="E-Mail"
          type="email"
          required
          fullWidth
          size="medium"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Passwort"
          type="password"
          required
          fullWidth
          size="medium"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={busy} fullWidth>
          {busy ? <CircularProgress size={22} color="inherit" /> : "Anmelden"}
        </Button>
      </Stack>
    </Card>
  );
}

export function LoginForm() {
  return (
    <AuthProvider>
      <Form />
    </AuthProvider>
  );
}
