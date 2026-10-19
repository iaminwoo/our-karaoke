import type { KaraokeSong } from "@/types/database";

/** Returns up to `limit` unique songs without mutating the source array. */
export function pickRandomSongs(
  songs: readonly KaraokeSong[],
  limit = 5,
): KaraokeSong[] {
  const shuffled = [...songs];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled.slice(0, Math.min(limit, shuffled.length));
}
