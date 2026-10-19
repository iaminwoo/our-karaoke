export type SingerScope = "inwoo" | "lydia" | "both";
export type SongGenre = "ballad" | "dance" | "rock" | "hiphop" | "rnb" | "other";
export type SongMood = "upbeat" | "calm";
export type SongStatus = "practice" | "normal" | "favorite";

export type KaraokeSong = {
  artist: string;
  artwork_url: string | null;
  created_at: string;
  genre: SongGenre | null;
  id: string;
  ky_number: string | null;
  memo: string | null;
  mood: SongMood | null;
  singer_scope: SingerScope;
  song_status: SongStatus;
  title: string;
  tj_number: string | null;
  updated_at: string;
};

export type CreateSongInput = {
  artist: string;
  artwork_url?: string | null;
  genre?: SongGenre | null;
  ky_number?: string | null;
  memo?: string | null;
  mood?: SongMood | null;
  singer_scope: SingerScope;
  song_status?: SongStatus;
  title: string;
  tj_number?: string | null;
};

export type UpdateSongInput = Partial<CreateSongInput>;

/**
 * Mirrors the karaoke_songs migration until generated Supabase types are available.
 */
export type Database = {
  public: {
    Tables: {
      karaoke_songs: {
        Row: KaraokeSong;
        Insert: CreateSongInput;
        Update: UpdateSongInput;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
