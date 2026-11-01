-- Maison Estate: Tabelle "objekte" (internes Immobilien-Verwaltungstool)
-- Ausführen in Supabase: SQL Editor -> New query -> einfügen -> Run

create table if not exists public.objekte (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid default auth.uid() references auth.users(id) on delete set null,

  titel        text not null,
  status       text not null default 'verfuegbar'
               check (status in ('verfuegbar','reserviert','verkauft')),
  objekttyp    text not null
               check (objekttyp in ('erdgeschoss','dachgeschoss','garconniere','sonstige')),

  strasse      text,
  plz          text not null check (plz ~ '^[0-9]{4}$'),
  ort          text not null,
  bezirk       text,

  preis        numeric(12,2) not null check (preis >= 0),
  wohnflaeche  numeric(7,2)  not null check (wohnflaeche > 0),
  zimmer       smallint      not null check (zimmer between 1 and 20),

  freiflaechen text[] not null default '{}'
               check (freiflaechen <@ array['terrasse','garten','balkon']),
  parken       text[] not null default '{}'
               check (parken <@ array['freistellplatz','carport','garage']),

  beschreibung text
);

create index if not exists objekte_plz_idx   on public.objekte (plz);
create index if not exists objekte_preis_idx on public.objekte (preis);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists objekte_updated_at on public.objekte;
create trigger objekte_updated_at before update on public.objekte
  for each row execute function public.set_updated_at();

-- Zugriff: nur eingeloggte Teammitglieder. Ohne Login (anon) ist nichts lesbar.
alter table public.objekte enable row level security;

drop policy if exists "team liest"       on public.objekte;
drop policy if exists "team legt an"     on public.objekte;
drop policy if exists "team aendert"     on public.objekte;
drop policy if exists "team loescht"     on public.objekte;

create policy "team liest"   on public.objekte for select to authenticated using (true);
create policy "team legt an" on public.objekte for insert to authenticated with check (true);
create policy "team aendert" on public.objekte for update to authenticated using (true) with check (true);
create policy "team loescht" on public.objekte for delete to authenticated using (true);
