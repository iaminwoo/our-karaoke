"use client";

import { use } from "react";

import { SongForm } from "@/components/SongForm";
import { useSongStore } from "@/components/SongDataProvider";

export function EditSongPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { songs, isLoading } = useSongStore();
  const song = songs.find((item) => item.id === id);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6 text-center text-sm text-zinc-600">
        불러오는 중...
      </main>
    );
  }

  return song ? (
    <SongForm key={`${song.id}:${song.updated_at}`} song={song} />
  ) : (
    <main className="min-h-screen bg-zinc-50 p-6 text-center text-sm text-zinc-600">
      노래를 찾을 수 없습니다.
    </main>
  );
}
