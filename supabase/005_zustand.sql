-- Zustand (Erstbezug, Neuwertig, Saniert, ...) zu den Objekten hinzufügen.
-- Ausführen in Supabase: SQL Editor -> New query -> einfügen -> Run
-- (Mehrfaches Ausführen ist unbedenklich.)

alter table public.objekte add column if not exists zustand text;

alter table public.objekte drop constraint if exists objekte_zustand_check;
alter table public.objekte
  add constraint objekte_zustand_check
  check (zustand is null or zustand in (
    'erstbezug','neuwertig','saniert','modernisiert',
    'vollstaendig_renoviert','renovierungsbeduerftig'
  ));
