-- Before running this migration, verify that public.karaoke_songs does not already exist.
-- This migration creates only karaoke_-prefixed objects and does not modify existing tables.

begin;

create table public.karaoke_songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) > 0),
  artist text not null check (char_length(btrim(artist)) > 0),
  album text,
  artwork_url text,
  itunes_id text,
  manana_id text,
  tj_number text,
  ky_number text,
  singer_scope text not null check (singer_scope in ('inwoo', 'lydia', 'both')),
  genre text check (genre in ('ballad', 'dance', 'rock', 'hiphop', 'rnb', 'other')),
  mood text check (mood in ('upbeat', 'calm')),
  is_practice boolean not null default false,
  is_favorite boolean not null default false,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index karaoke_songs_created_at_idx
  on public.karaoke_songs (created_at desc);

create function public.karaoke_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger karaoke_songs_set_updated_at
before update on public.karaoke_songs
for each row
execute function public.karaoke_set_updated_at();

alter table public.karaoke_songs enable row level security;

-- Explicit table privileges: anonymous users have none; authenticated users can CRUD.
revoke all on table public.karaoke_songs from public;
revoke all on table public.karaoke_songs from anon;
revoke all on table public.karaoke_songs from authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.karaoke_songs to authenticated;

create policy "karaoke_songs_select_authenticated"
on public.karaoke_songs
for select
to authenticated
using (true);

create policy "karaoke_songs_insert_authenticated"
on public.karaoke_songs
for insert
to authenticated
with check (true);

create policy "karaoke_songs_update_authenticated"
on public.karaoke_songs
for update
to authenticated
using (true)
with check (true);

create policy "karaoke_songs_delete_authenticated"
on public.karaoke_songs
for delete
to authenticated
using (true);

commit;
