import type { SingerScope, SongGenre, SongMood, SongStatus } from "@/types/database";

export const SINGER_SCOPE_LABELS: Record<SingerScope, string> = {
  inwoo: "인우",
  lydia: "루디아",
  both: "같이",
};

export const SONG_GENRE_LABELS: Record<SongGenre, string> = {
  ballad: "발라드",
  dance: "댄스",
  rock: "록",
  hiphop: "힙합",
  rnb: "R&B",
  other: "기타",
};

export const SONG_MOOD_LABELS: Record<SongMood, string> = {
  upbeat: "신나는",
  calm: "잔잔한",
};

export const SONG_STATUS_LABELS: Record<SongStatus, string> = {
  practice: "연습곡",
  normal: "일반곡",
  favorite: "애창곡",
};
