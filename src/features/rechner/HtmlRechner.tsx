"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? "";

/**
 * Bettet einen eigenständigen HTML-Rechner (public/rechner/*.html) ein und
 * passt die Höhe an den Inhalt an. Die Datei liegt same-origin, daher ist der
 * Zugriff auf den Inhalt erlaubt.
 */
export function HtmlRechner({ file, title }: { file: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(900);
  const observer = useRef<ResizeObserver | null>(null);

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

  return (
    <Box
      component="iframe"
      ref={ref}
      src={`${basePath}/rechner/${file}`}
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
