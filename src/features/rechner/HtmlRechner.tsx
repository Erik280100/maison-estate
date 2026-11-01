"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { getSupabase } from "@/lib/supabase";

/**
 * Lädt einen eigenständigen HTML-Rechner aus dem privaten Supabase-Bucket
 * "rechner" (nur mit Login lesbar) und zeigt ihn per srcdoc an. Die Datei
 * liegt bewusst nicht in public/, damit sie nicht ohne Login abrufbar ist.
 */
export function HtmlRechner({ file, title }: { file: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState(900);
  const observer = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase ist nicht konfiguriert.");
      return;
    }
    supabase.storage
      .from("rechner")
      .download(file)
      .then(async ({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data) {
          setError(
            "Rechner konnte nicht geladen werden. Ist die Datei im Bucket „rechner“ hochgeladen?",
          );
          return;
        }
        setHtml(await data.text());
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const measure = useCallback(() => {
    const doc = ref.current?.contentDocument;
    if (!doc?.documentElement) return;
    setHeight(Math.max(600, doc.documentElement.scrollHeight));
  }, []);

  const onLoad = useCallback(() => {
    const doc = ref.current?.contentDocument;
    if (!doc?.body) return;
    measure();
    observer.current?.disconnect();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(doc.body);
  }, [measure]);

  useEffect(() => () => observer.current?.disconnect(), []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (html === null) return <CircularProgress aria-label="Rechner wird geladen" />;

  return (
    <Box
      component="iframe"
      ref={ref}
      srcDoc={html}
      title={title}
      onLoad={onLoad}
      sx={{
        display: "block",
        width: "100%",
        height,
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        bgcolor: "background.paper",
      }}
    />
  );
}
