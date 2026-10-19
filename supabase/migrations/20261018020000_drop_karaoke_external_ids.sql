-- Run after 20261018010000_replace_album_and_song_flags_with_status.sql.
-- This migration modifies only public.karaoke_songs.

begin;

alter table public.karaoke_songs
  drop column itunes_id,
  drop column manana_id;

commit;
