-- Durchschnittlich erzielbare Monatsmiete (EUR) zu den Objekten hinzufügen.
-- Ausführen in Supabase: SQL Editor -> New query -> einfügen -> Run
-- (Mehrfaches Ausführen ist unbedenklich.)

alter table public.objekte add column if not exists miete numeric;

alter table public.objekte drop constraint if exists objekte_miete_check;
alter table public.objekte
  add constraint objekte_miete_check
  check (miete is null or miete >= 0);
