-- Privater Storage-Bucket für die HTML-Rechner (nur eingeloggte Nutzer dürfen lesen).
-- Danach im Dashboard unter Storage -> rechner die drei Dateien hochladen:
-- umschuldung.html, fix-und-flip.html, mietrechner.html

insert into storage.buckets (id, name, public)
values ('rechner', 'rechner', false)
on conflict (id) do update set public = false;

drop policy if exists "team liest rechner" on storage.objects;
create policy "team liest rechner" on storage.objects
  for select to authenticated
  using (bucket_id = 'rechner');
