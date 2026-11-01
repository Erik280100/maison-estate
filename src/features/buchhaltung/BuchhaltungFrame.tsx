"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { createCapabilities } from "./capabilities";

declare global {
  interface Window {
    __maisonBh?: ReturnType<typeof createCapabilities>;
  }
}

/** Läuft im iframe vor dem App-Code: stellt claude.use() bereit und lenkt /_blob/ um. */
const PRELUDE = `<script>
window.claude={use:function(n){return parent.__maisonBh.use(n)}};
(function(){
  var bh=function(){return parent.__maisonBh};
  var f=window.fetch.bind(window);
  window.fetch=function(u,o){
    if(typeof u==="string"&&u.indexOf("/_blob/")===0)
      return bh().blob(u.slice(7)).then(function(b){return new Response(b)});
    return f(u,o);
  };
  document.addEventListener("click",function(e){
    var a=e.target.closest&&e.target.closest("a[data-blob]"); if(!a) return;
    e.preventDefault();
    var w=window.open("about:blank","_blank");
    bh().blob(a.getAttribute("data-blob")).then(function(b){w.location=URL.createObjectURL(b)}).catch(function(){w.close()});
  });
  new MutationObserver(function(){
    document.querySelectorAll("img[data-blob]:not([data-bl])").forEach(function(i){
      i.setAttribute("data-bl","1");
      bh().blob(i.getAttribute("data-blob")).then(function(b){i.src=URL.createObjectURL(b)});
    });
  }).observe(document,{childList:true,subtree:true});
})();
</script>`;

function prepare(html: string): string {
  const patched = html
    .replace(/src="\/_blob\/(\$\{[^}]*\})"/g, 'data-blob="$1" src="data:,"')
    .replace(/href="\/_blob\/(\$\{[^}]*\})"/g, 'href="#" data-blob="$1"');
  return patched.replace(/<head[^>]*>/i, (m) => m + PRELUDE);
}

/**
 * Buchhaltung: lädt die App aus dem privaten Bucket "buchhaltung" (nur mit Login)
 * und stellt ihr Datenbank, Belegspeicher und Nutzer über Supabase bereit.
 */
export function BuchhaltungFrame() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const email = session?.user.email ?? "";
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const caps = useMemo(() => {
    const sb = getSupabase();
    return sb && userId ? createCapabilities(sb, userId, email) : null;
  }, [userId, email]);

  useEffect(() => {
    if (!caps) return;
    window.__maisonBh = caps;
    return () => {
      delete window.__maisonBh;
    };
  }, [caps]);

  useEffect(() => {
    let cancelled = false;
    const sb = getSupabase();
    if (!sb) return;
    sb.storage
      .from("buchhaltung")
      .download("app.html")
      .then(async ({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data) {
          setError("Buchhaltung konnte nicht geladen werden. Ist app.html im Bucket „buchhaltung“ hochgeladen?");
          return;
        }
        setHtml(prepare(await data.text()));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!getSupabase()) return <Alert severity="error">Supabase ist nicht konfiguriert.</Alert>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (html === null || !caps) return <CircularProgress aria-label="Buchhaltung wird geladen" />;

  return (
    <Box
      component="iframe"
      srcDoc={html}
      title="Buchhaltung"
      sx={{
        display: "block",
        width: "100%",
        height: "calc(100vh - 220px)",
        minHeight: 600,
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        bgcolor: "background.paper",
      }}
    />
  );
}
