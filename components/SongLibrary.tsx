"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DetailedFilterAccordion } from "@/components/DetailedFilterAccordion";
import { RandomRecommendationModal } from "@/components/RandomRecommendationModal";
import { SignOutButton } from "@/components/SignOutButton";
import { useSongStore } from "@/components/SongDataProvider";
import { SongDetailModal } from "@/components/SongDetailModal";
import {
  SINGER_SCOPE_LABELS,
  SONG_GENRE_LABELS,
  SONG_MOOD_LABELS,
  SONG_STATUS_LABELS,
} from "@/lib/song-constants";
import type {
  KaraokeSong,
  SingerScope,
  SongGenre,
  SongMood,
  SongStatus,
} from "@/types/database";

type SortOrder = "newest" | "title" | "favorite" | "practice";

type RecommendationSnapshot = {
  candidates: KaraokeSong[];
  conditionLabels: string[];
};

const singerOptions: Array<{ label: string; value: "all" | SingerScope }> = [
  { label: "전체", value: "all" },
  { label: SINGER_SCOPE_LABELS.inwoo, value: "inwoo" },
  { label: SINGER_SCOPE_LABELS.lydia, value: "lydia" },
  { label: SINGER_SCOPE_LABELS.both, value: "both" },
];

export function SongLibrary() {
  const router = useRouter();
  const {
    songs,
    isLoading,
    error: loadError,
    removeSong,
    refresh: loadSongs,
  } = useSongStore();
  const [query, setQuery] = useState("");
  const [singerScope, setSingerScope] = useState<"all" | SingerScope>("all");
  const [genre, setGenre] = useState<"all" | SongGenre>("all");
  const [mood, setMood] = useState<"all" | SongMood>("all");
  const [songStatus, setSongStatus] = useState<"all" | SongStatus>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [detailFiltersExpanded, setDetailFiltersExpanded] = useState(false);
  const [recommendation, setRecommendation] =
    useState<RecommendationSnapshot | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const updateScrollTopVisibility = () => {
      setShowScrollTop(window.scrollY > 320);
    };

    updateScrollTopVisibility();
    window.addEventListener("scroll", updateScrollTopVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrollTopVisibility);
    };
  }, []);

  const filteredSongs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");

    return songs
      .filter((song) => {
        const matchesQuery =
          !normalizedQuery ||
          song.title.toLocaleLowerCase("ko-KR").includes(normalizedQuery) ||
          song.artist.toLocaleLowerCase("ko-KR").includes(normalizedQuery);

        return (
          matchesQuery &&
          (singerScope === "all" || song.singer_scope === singerScope) &&
          (genre === "all" || song.genre === genre) &&
          (mood === "all" || song.mood === mood) &&
          (songStatus === "all" || song.song_status === songStatus)
        );
      })
      .sort((first, second) => {
        if (sortOrder === "title") {
          return first.title.localeCompare(second.title, "ko-KR");
        }
        if (sortOrder === "favorite" || sortOrder === "practice") {
          const order = sortOrder === "favorite"
            ? { favorite: 0, normal: 1, practice: 2 }
            : { practice: 0, normal: 1, favorite: 2 };
          return order[first.song_status] - order[second.song_status]
            || second.created_at.localeCompare(first.created_at);
        }
        return second.created_at.localeCompare(first.created_at);
      });
  }, [
    genre,
    mood,
    query,
    singerScope,
    songs,
    songStatus,
    sortOrder,
  ]);

  const detailedFilterCount = [
    genre !== "all",
    mood !== "all",
    songStatus !== "all",
  ].filter(Boolean).length;

  function openRecommendation() {
    const conditionLabels = [
      query.trim() ? `검색: ${query.trim()}` : null,
      singerScope === "all" ? null : SINGER_SCOPE_LABELS[singerScope],
      genre === "all" ? null : SONG_GENRE_LABELS[genre],
      mood === "all" ? null : SONG_MOOD_LABELS[mood],
      songStatus === "all" ? null : SONG_STATUS_LABELS[songStatus],
    ].filter((label): label is string => Boolean(label));

    setRecommendation({
      candidates: [...filteredSongs],
      conditionLabels:
        conditionLabels.length > 0 ? conditionLabels : ["전체 노래"],
    });
  }

  function scrollToTop() {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  function handleSongDeleted(id: string) {
    removeSong(id);
    setRecommendation((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.filter((song) => song.id !== id),
          }
        : null,
    );
  }

  function openNewSongForm(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) {
      return;
    }

    event.preventDefault();
    const entry = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    router.push(`/songs/new?entry=${entry}`);
  }

  const selectedSong = selectedSongId
    ? (songs.find((song) => song.id === selectedSongId) ?? null)
    : null;

  return (
    <main className="min-h-screen bg-zinc-50 pb-32 font-sans text-zinc-900">
      <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="karaoke-title text-2xl font-semibold tracking-tight">
              뭐 부를까?
            </h1>
            <p className="mt-1 text-sm text-zinc-500">우리만의 플레이리스트</p>
          </div>
          <div className="flex items-start gap-1">
            <button
              className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={() => void loadSongs()}
              disabled={isLoading}
              aria-label="노래 목록 새로고침"
            >
              <svg
                className={isLoading ? "size-5 animate-spin" : "size-5"}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
                <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
              </svg>
            </button>
            <SignOutButton />
          </div>
        </header>

        <section className="mt-6 space-y-3" aria-label="노래 검색 및 필터">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                className="karaoke-library-control-border min-h-12 w-full rounded-xl border bg-white py-3 pl-4 pr-10 text-base outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="노래 제목 또는 가수 검색"
                aria-label="노래 제목 또는 가수 검색"
              />
              {query && (
                <button
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-lg text-zinc-400 hover:text-zinc-700"
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="검색어 지우기"
                >
                  ×
                </button>
              )}
            </div>
            <Link
              className="flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white transition hover:bg-zinc-700"
              href="/songs/new"
              aria-label="노래 추가"
              onClick={openNewSongForm}
            >
              + 노래추가
            </Link>
          </div>

          <div
            className="-mx-1 -my-1 flex flex-wrap gap-2 px-1 py-1"
            role="group"
            aria-label="부르는 사람"
          >
            {singerOptions.map((option) => {
              const isSelected = singerScope === option.value;
              return (
                <button
                  className={`relative min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition ${isSelected ? "z-10 bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100"}`}
                  type="button"
                  key={option.value}
                  onClick={() => setSingerScope(option.value)}
                  aria-pressed={isSelected}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${detailedFilterCount > 0 ? "border-transparent bg-zinc-900 text-white" : "karaoke-library-filter-idle-border bg-white text-zinc-600 hover:bg-zinc-100"}`}
              type="button"
              onClick={() => setDetailFiltersExpanded((expanded) => !expanded)}
              aria-expanded={detailFiltersExpanded}
              aria-controls="detailed-filter-panel"
            >
              <svg
                className="size-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  d="M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6"
                  strokeLinecap="round"
                />
              </svg>
              <span className="whitespace-nowrap">
                상세 필터
                {detailedFilterCount > 0 ? ` · ${detailedFilterCount}` : ""}
              </span>
              <svg
                className={`size-4 shrink-0 transition-transform ${detailFiltersExpanded ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  d="m6 9 6 6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${detailFiltersExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              aria-hidden={!detailFiltersExpanded}
              inert={!detailFiltersExpanded || undefined}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="pt-3">
                  <DetailedFilterAccordion
                    genre={genre}
                    mood={mood}
                    songStatus={songStatus}
                    onGenreChange={setGenre}
                    onMoodChange={setMood}
                    onSongStatusChange={setSongStatus}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5" aria-labelledby="song-list-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="song-list-heading" className="text-base font-semibold">
              노래 {filteredSongs.length}곡
            </h2>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm text-zinc-500">정렬</span>
              <div className="relative">
                <select
                  id="sort-order"
                  aria-label="노래 목록 정렬"
                  className="karaoke-library-control-border min-h-11 appearance-none rounded-xl border bg-white py-0 pl-3 pr-9 text-sm text-zinc-700 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  value={sortOrder}
                  onChange={(event) =>
                    setSortOrder(event.target.value as SortOrder)
                  }
                >
                  <option value="newest">최신순</option>
                  <option value="title">가나다순</option>
                  <option value="favorite">애창곡 우선</option>
                  <option value="practice">연습곡 우선</option>
                </select>
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    d="m6 9 6 6 6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {loadError && songs.length > 0 && (
            <div
              className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              <span>{loadError}</span>
              <button
                className="font-medium underline"
                type="button"
                onClick={() => void loadSongs()}
              >
                재시도
              </button>
            </div>
          )}

          {isLoading && songs.length === 0 ? (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-12 text-center text-sm text-zinc-500">
              노래 목록을 불러오는 중입니다...
            </div>
          ) : loadError && songs.length === 0 ? (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-10 text-center">
              <p className="text-sm text-red-700">{loadError}</p>
              <button
                className="mt-4 min-h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white"
                type="button"
                onClick={() => void loadSongs()}
              >
                다시 시도
              </button>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-12 text-center text-sm text-zinc-500">
              {songs.length === 0
                ? "등록된 노래가 없습니다."
                : "현재 조건에 맞는 노래가 없습니다."}
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {filteredSongs.map((song) => (
                <SongRow
                  song={song}
                  key={song.id}
                  onSelect={() => setSelectedSongId(song.id)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {showScrollTop ? (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-20 flex size-11 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-[0_6px_18px_rgba(244,90,189,0.28)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:right-6"
          aria-label="최상단으로 이동"
        >
          <svg
            aria-hidden="true"
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 14 6-6 6 6" />
          </svg>
        </button>
      ) : null}

      <div className="karaoke-bottom-bar pointer-events-none fixed inset-x-0 bottom-0 z-10 pt-4">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          <button
            className="pointer-events-auto min-h-12 w-full rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
            type="button"
            onClick={openRecommendation}
            disabled={isLoading}
          >
            랜덤 추천 5곡
          </button>
        </div>
      </div>
      {recommendation && (
        <RandomRecommendationModal
          candidates={recommendation.candidates}
          conditionLabels={recommendation.conditionLabels}
          onClose={() => setRecommendation(null)}
        />
      )}
      {selectedSong && (
        <SongDetailModal
          song={selectedSong}
          onClose={() => setSelectedSongId(null)}
          onDeleted={handleSongDeleted}
        />
      )}
    </main>
  );
}

function SongRow({
  song,
  onSelect,
}: {
  song: KaraokeSong;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-zinc-50 focus:bg-zinc-50"
        type="button"
        onClick={onSelect}
      >
        <AlbumCover song={song} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-zinc-900">{song.title}</h3>
          <p className="mt-0.5 truncate text-sm text-zinc-600">{song.artist}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">
              {SINGER_SCOPE_LABELS[song.singer_scope]}
            </span>
            {song.genre && (
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">
                {SONG_GENRE_LABELS[song.genre]}
              </span>
            )}
            {song.mood && (
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">
                {SONG_MOOD_LABELS[song.mood]}
              </span>
            )}
            {song.song_status === "practice" && (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">
                연습곡
              </span>
            )}
            {song.song_status === "favorite" && (
              <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">
                ♥ 애창곡
              </span>
            )}
          </div>
        </div>
        <span className="text-xl text-zinc-300" aria-hidden="true">
          ›
        </span>
      </button>
    </li>
  );
}

function AlbumCover({ song }: { song: KaraokeSong }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(song.artwork_url) && !failed;

  return (
    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 text-zinc-400">
      {showImage ? (
        <img
          className="size-full object-cover"
          src={song.artwork_url!}
          alt=""
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-xl" aria-label="앨범 이미지 없음">
          ◉
        </span>
      )}
    </div>
  );
}
