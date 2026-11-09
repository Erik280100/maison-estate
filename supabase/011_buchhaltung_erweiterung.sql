-- Buchhaltung: Erweiterung um Projekte/Objekte, Anlagen, Gesellschafter und Kontoauszüge.
-- Voraussetzung: 007_buchhaltung.sql. Ausführen im SQL Editor (mehrfaches Ausführen ist unbedenklich).

-- Löschen bleibt eng begrenzt: gebuchte Belege sind unveränderbar.
-- Erlaubt sind Entwürfe sowie Stammdaten ohne Buchungen (Projekte, Anlagen, Gesellschafter, Kredite)
-- und Kontoauszüge ohne gebuchte Umsätze (das prüft die App, die Policy erlaubt nur die Collections).
drop policy if exists "team loescht bh" on public.buchhaltung_docs;
create policy "team loescht bh" on public.buchhaltung_docs for delete to authenticated
  using (
    (collection = 'belege' and data->>'status' = 'Entwurf')
    or collection in ('projekte', 'anlagen', 'gesellschafter')
  );

-- Schnellere Listen
create index if not exists buchhaltung_docs_collection_idx on public.buchhaltung_docs (collection);
create index if not exists buchhaltung_docs_belege_status_idx
  on public.buchhaltung_docs ((data->>'status')) where collection = 'belege';

-- Hinweis: Neue Collections (gesellschafter, projekte, anlagen) brauchen keine neuen Tabellen –
-- sie liegen wie Belege und Kontoauszüge in public.buchhaltung_docs.
