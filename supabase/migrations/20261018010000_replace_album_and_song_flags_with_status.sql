-- Run this migration manually in the Supabase SQL Editor immediately before
-- starting or deploying the matching application code. It modifies only
-- public.karaoke_songs.

begin;

alter table public.karaoke_songs
  add column song_status text;

update public.karaoke_songs
set song_status = case
  when is_practice then 'practice'
  when is_favorite then 'favorite'
  else 'normal'
end;

alter table public.karaoke_songs
  alter column song_status set default 'normal',
  alter column song_status set not null,
  add constraint karaoke_songs_song_status_check
    check (song_status in ('practice', 'normal', 'favorite'));

alter table public.karaoke_songs
  drop column album,
  drop column is_practice,
  drop column is_favorite;

commit;
