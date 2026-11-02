-- To-dos (CRM-Board mit Swimlanes). Ausführen im SQL Editor.

create table if not exists public.todos (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,

  titel       text not null check (length(trim(titel)) > 0),
  beschreibung text,
  status      text not null default 'offen'
              check (status in ('offen','in_arbeit','wartet','erledigt')),
  prioritaet  text not null default 'normal'
              check (prioritaet in ('niedrig','normal','hoch')),
  zugewiesen_an uuid references auth.users(id) on delete set null,
  start_datum date,
  faellig_datum date,
  check (start_datum is null or faellig_datum is null or start_datum <= faellig_datum)
);

create index if not exists todos_status_idx on public.todos (status);

drop trigger if exists todos_updated_at on public.todos;
create trigger todos_updated_at before update on public.todos
  for each row execute function public.set_updated_at();

alter table public.todos enable row level security;
drop policy if exists "team liest todos"   on public.todos;
drop policy if exists "team legt todos an" on public.todos;
drop policy if exists "team aendert todos" on public.todos;
drop policy if exists "team loescht todos" on public.todos;
create policy "team liest todos"   on public.todos for select to authenticated using (true);
create policy "team legt todos an" on public.todos for insert to authenticated with check (true);
create policy "team aendert todos" on public.todos for update to authenticated using (true) with check (true);
create policy "team loescht todos" on public.todos for delete to authenticated using (true);

-- Live-Updates
do $$ begin
  alter publication supabase_realtime add table public.todos;
exception when duplicate_object then null; end $$;

-- Teammitglieder für die Zuweisung (id + E-Mail), nur für eingeloggte Personen
create or replace function public.todo_team()
returns table (id uuid, email text) language sql security definer set search_path = public, auth as $$
  select u.id, u.email::text from auth.users u where auth.uid() is not null order by u.email;
$$;
revoke all on function public.todo_team() from public, anon;
grant execute on function public.todo_team() to authenticated;
