"use client";

import { SONG_GENRE_LABELS, SONG_MOOD_LABELS, SONG_STATUS_LABELS } from "@/lib/song-constants";
import type { SongGenre, SongMood, SongStatus } from "@/types/database";

type DetailedFilterAccordionProps = {
  genre: "all" | SongGenre;
  mood: "all" | SongMood;
  songStatus: "all" | SongStatus;
  onGenreChange: (genre: "all" | SongGenre) => void;
  onMoodChange: (mood: "all" | SongMood) => void;
  onSongStatusChange: (songStatus: "all" | SongStatus) => void;
};

export function DetailedFilterAccordion({
  genre,
  mood,
  songStatus,
  onGenreChange,
  onMoodChange,
  onSongStatusChange,
}: DetailedFilterAccordionProps) {
  const hasActiveFilters = genre !== "all" || mood !== "all" || songStatus !== "all";

  function resetFilters() {
    onGenreChange("all");
    onMoodChange("all");
    onSongStatusChange("all");
  }

  return (
    <section
      id="detailed-filter-panel"
      className="rounded-xl border border-zinc-200 bg-white p-4"
      aria-label="상세 필터 옵션"
    >
      <div className="space-y-5">
        <FilterChips
          label="장르"
          options={[['all', '전체'], ...Object.entries(SONG_GENRE_LABELS)]}
          value={genre}
          onChange={(value) => onGenreChange(value as "all" | SongGenre)}
        />
        <FilterChips
          label="분위기"
          options={[['all', '전체'], ...Object.entries(SONG_MOOD_LABELS)]}
          value={mood}
          onChange={(value) => onMoodChange(value as "all" | SongMood)}
        />
        <FilterChips
          label="곡 상태"
          options={[["all", "전체"], ["practice", SONG_STATUS_LABELS.practice], ["favorite", SONG_STATUS_LABELS.favorite]]}
          value={songStatus}
          onChange={(value) => onSongStatusChange(value as "all" | SongStatus)}
        />
      </div>

      {hasActiveFilters && <div className="mt-5 flex justify-end border-t border-zinc-100 pt-3"><button className="min-h-10 px-2 text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-900" type="button" onClick={resetFilters}>필터 초기화</button></div>}

    </section>
  );
}

function FilterChips({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map(([optionValue, optionLabel]) => {
          const selected = value === optionValue;
          return (
            <button
              className={`min-h-10 rounded-full px-3 text-sm font-medium ${selected ? "bg-zinc-900 text-white ring-2 ring-zinc-200" : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 hover:bg-white"}`}
              type="button"
              key={optionValue}
              onClick={() => onChange(optionValue)}
              aria-pressed={selected}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

