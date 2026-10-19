import { getSupabaseClient } from "@/lib/supabase";
import type {
  CreateSongInput,
  KaraokeSong,
  UpdateSongInput,
} from "@/types/database";

const SONG_TABLE = "karaoke_songs";

export async function getSongs(): Promise<KaraokeSong[]> {
  const { data, error } = await getSupabaseClient()
    .from(SONG_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getSongById(id: string): Promise<KaraokeSong | null> {
  const { data, error } = await getSupabaseClient()
    .from(SONG_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createSong(input: CreateSongInput): Promise<KaraokeSong> {
  const { data, error } = await getSupabaseClient()
    .from(SONG_TABLE)
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateSong(
  id: string,
  input: UpdateSongInput,
): Promise<KaraokeSong> {
  const { data, error } = await getSupabaseClient()
    .from(SONG_TABLE)
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteSong(id: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from(SONG_TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}
