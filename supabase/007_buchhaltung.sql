-- Buchhaltung: Dokumentenspeicher, Sperre, Namen, privater Bucket.
-- Ausführen im SQL Editor. Danach im Dashboard unter Storage -> buchhaltung
-- die Datei app.html hochladen (aus supabase/rechner/buchhaltung.html, umbenannt).

-- 1) Dokumente (Belege, Kontoauszüge, Kredite, Protokoll, System)
create table if not exists public.buchhaltung_docs (
  collection text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
alter table public.buchhaltung_docs enable row level security;
drop policy if exists "team liest bh"   on public.buchhaltung_docs;
drop policy if exists "team schreibt bh" on public.buchhaltung_docs;
drop policy if exists "team aendert bh" on public.buchhaltung_docs;
drop policy if exists "team loescht bh" on public.buchhaltung_docs;
create policy "team liest bh"    on public.buchhaltung_docs for select to authenticated using (true);
create policy "team schreibt bh" on public.buchhaltung_docs for insert to authenticated with check (true);
create policy "team aendert bh"  on public.buchhaltung_docs for update to authenticated using (true) with check (true);
-- Löschen nur für Entwürfe (gebuchte Belege bleiben erhalten)
create policy "team loescht bh"  on public.buchhaltung_docs for delete to authenticated
  using (collection = 'belege' and data->>'status' = 'Entwurf');

-- Live-Updates
do $$ begin
  alter publication supabase_realtime add table public.buchhaltung_docs;
exception when duplicate_object then null; end $$;

-- 2) Teilmengen-Update (entspricht Firestore update)
create or replace function public.bh_update(p_collection text, p_id text, p_patch jsonb)
returns void language sql security invoker as $$
  update public.buchhaltung_docs
     set data = data || p_patch, updated_at = now()
   where collection = p_collection and id = p_id;
$$;

-- 3) Sperre für das Buchen (Hash-Kette)
create table if not exists public.buchhaltung_locks (
  path text primary key,
  holder text not null,
  expires_at timestamptz not null
);
alter table public.buchhaltung_locks enable row level security;
create or replace function public.bh_acquire(p_path text, p_holder text, p_ttl_ms int)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if auth.uid() is null then return false; end if;
  insert into public.buchhaltung_locks as l (path, holder, expires_at)
  values (p_path, p_holder, now() + make_interval(secs => p_ttl_ms / 1000.0))
  on conflict (path) do update
    set holder = excluded.holder, expires_at = excluded.expires_at
    where l.expires_at < now() or l.holder = excluded.holder
  returning true into ok;
  return coalesce(ok, false);
end $$;
revoke all on function public.bh_acquire(text, text, int) from public, anon;
grant execute on function public.bh_acquire(text, text, int) to authenticated;

-- 4) Anzeigenamen der Teammitglieder (E-Mail)
create or replace function public.bh_profiles(p_ids uuid[])
returns table (id uuid, name text) language sql security definer set search_path = public, auth as $$
  select u.id, u.email::text from auth.users u where u.id = any(p_ids) and auth.uid() is not null;
$$;
revoke all on function public.bh_profiles(uuid[]) from public, anon;
grant execute on function public.bh_profiles(uuid[]) to authenticated;

-- 5) Privater Bucket: App (app.html) und Originalbelege (belege/…)
insert into storage.buckets (id, name, public) values ('buchhaltung', 'buchhaltung', false)
on conflict (id) do update set public = false;

drop policy if exists "team liest buchhaltung"   on storage.objects;
drop policy if exists "team ladet belege hoch" on storage.objects;
create policy "team liest buchhaltung" on storage.objects
  for select to authenticated using (bucket_id = 'buchhaltung');
create policy "team ladet belege hoch" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'buchhaltung' and name like 'belege/%');
