-- Ausstattung als Mehrfachauswahl zu den Objekten hinzufügen.
-- Ausführen in Supabase: SQL Editor -> New query -> einfügen -> Run
-- (Mehrfaches Ausführen ist unbedenklich.)

alter table public.objekte
  add column if not exists ausstattung text[] not null default '{}';

alter table public.objekte drop constraint if exists objekte_ausstattung_check;
alter table public.objekte
  add constraint objekte_ausstattung_check
  check (ausstattung <@ array[
    'lift','klimaanlage','badewanne','regendusche',
    'rollstuhlgerecht','keller','moebliert'
  ]);

-- Hinweis: "Parkplatz" wird nicht hier gespeichert, sondern in der Spalte "parken"
-- (Freistellplatz, Carport, Garage). Der Filter "Parkplatz" findet jedes Objekt mit mindestens einem Eintrag dort.
