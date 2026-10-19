"use client";

import { useEffect, useRef, useState } from "react";

import { pickRandomSongs } from "@/lib/random";
import {
  SINGER_SCOPE_LABELS,
  SONG_GENRE_LABELS,
  SONG_MOOD_LABELS,
} from "@/lib/song-constants";
import type { KaraokeSong } from "@/types/database";

type RandomRecommendationModalProps = {
  candidates: KaraokeSong[];
  conditionLabels: string[];
  onClose: () => void;
};

export function RandomRecommendationModal({
  candidates,
  conditionLabels,
  onClose,
}: RandomRecommendationModalProps) {
  const [recommendations, setRecommendations] = useState(() =>
    pickRandomSongs(candidates),
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const focusable = focusableElements ? [...focusableElements] : [];

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex h-[100dvh] items-center justify-center bg-zinc-950/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="max-h-full w-full overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-xl [-webkit-overflow-scrolling:touch] sm:max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="random-recommendation-title"
        onKeyDown={trapFocus}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <svg
              className="neon-blue size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m16 3 4 4-4 4" />
              <path d="M4 7h15" />
              <path d="m8 21-4-4 4-4" />
              <path d="M20 17H5" />
              <path d="m14 14 3 3-3 3" />
              <path d="m10 10-3-3 3-3" />
            </svg>
            <h2 id="random-recommendation-title" className="text-lg font-semibold">
              랜덤 추천
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            className="flex size-10 items-center justify-center rounded-lg text-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            type="button"
            onClick={onClose}
            aria-label="랜덤 추천 닫기"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <p className="text-xs font-medium text-zinc-500">추천 조건</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {conditionLabels.map((label) => (
                <span
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700"
                  key={label}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {recommendations.length === 0 ? (
            <div className="rounded-xl bg-zinc-50 px-4 py-10 text-center">
              <p className="font-medium text-zinc-800">현재 조건에 맞는 노래가 없어요.</p>
              <p className="mt-2 text-sm text-zinc-500">
                검색어나 필터를 변경해 보세요.
              </p>
            </div>
          ) : (
            <ol className="overflow-hidden rounded-xl border border-zinc-200">
              {recommendations.map((song, index) => (
                <li
                  className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3.5 last:border-0"
                  key={song.id}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{song.title}</p>
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
                </li>
              ))}
            </ol>
          )}

          <button
            className="min-h-12 w-full rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700"
            type="button"
            onClick={() => setRecommendations(pickRandomSongs(candidates))}
          >
            다시 추천하기
          </button>
        </div>
      </div>
    </div>
  );
}
