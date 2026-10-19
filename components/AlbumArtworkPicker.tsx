"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

import type { ItunesSearchResult } from "@/types/music-search";

type AlbumArtworkPickerProps = {
  candidates: ItunesSearchResult[];
  defaultCandidates: ItunesSearchResult[];
  error: string;
  loading: boolean;
  onClose: () => void;
  onRestoreDefault: () => void;
  onSearch: (query: string) => Promise<void>;
  onSelect: (candidate: ItunesSearchResult | null) => void;
  selectedUrl: string | null | undefined;
};

export function AlbumArtworkPicker({
  candidates,
  defaultCandidates,
  error,
  loading,
  onClose,
  onRestoreDefault,
  onSearch,
  onSelect,
  selectedUrl,
}: AlbumArtworkPickerProps) {
  const [query, setQuery] = useState("");
  const showingCustomResults = candidates !== defaultCandidates;

  async function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery || loading) return;
    await onSearch(trimmedQuery);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-zinc-950/40 sm:items-center sm:justify-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="artwork-picker-title"
      >
        <div className="flex items-center justify-between">
          <h2 id="artwork-picker-title" className="text-lg font-semibold">앨범 이미지 선택</h2>
          <button className="flex size-10 items-center justify-center rounded-lg text-xl text-zinc-500 hover:bg-zinc-100" type="button" onClick={onClose} aria-label="닫기">×</button>
        </div>

        <p className="mt-3 text-sm text-zinc-500">원하는 커버가 없으면 제목, 가수 또는 앨범명으로 다시 검색해 보세요.</p>
        <form className="mt-3 flex gap-2" onSubmit={(event) => void submitSearch(event)}>
          <label className="sr-only" htmlFor="artwork-search">앨범 이미지 다시 검색</label>
          <div className="relative min-w-0 flex-1">
            <input
              id="artwork-search"
              className="min-h-11 w-full rounded-lg border border-zinc-200 py-2 pl-3 pr-10 text-sm outline-none focus:border-zinc-500"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목, 가수 또는 앨범명으로 다시 검색"
              disabled={loading}
            />
            {query && <button className="absolute inset-y-0 right-1 flex w-9 items-center justify-center text-lg text-zinc-400" type="button" onClick={() => setQuery("")} aria-label="검색어 지우기">×</button>}
          </div>
          <button className="min-h-11 shrink-0 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:bg-zinc-400" type="submit" disabled={loading || !query.trim()}>{loading ? "검색 중" : "검색"}</button>
        </form>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        {showingCustomResults && defaultCandidates.length > 0 && <button className="mt-3 text-sm font-medium text-zinc-600 underline underline-offset-2" type="button" onClick={onRestoreDefault}>기본 추천으로 돌아가기</button>}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button className={`rounded-xl border p-2 text-left ${!selectedUrl ? "border-zinc-900 ring-2 ring-zinc-200" : "border-zinc-200"}`} type="button" onClick={() => onSelect(null)}>
            <div className="flex aspect-square items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-500">이미지 없음</div>
            <p className="mt-2 text-sm font-medium">이미지 없음</p>
          </button>
          {candidates.map((candidate) => <button className={`overflow-hidden rounded-xl border p-2 text-left ${selectedUrl === candidate.artworkUrl ? "border-zinc-900 ring-2 ring-zinc-200" : "border-zinc-200"}`} type="button" key={candidate.id} onClick={() => onSelect(candidate)}>
            <div className="aspect-square overflow-hidden rounded-lg bg-zinc-100">{candidate.artworkUrl ? <img className="size-full object-cover" src={candidate.artworkUrl} alt={`${candidate.title} 앨범 이미지`} /> : <div className="flex size-full items-center justify-center text-sm text-zinc-500">이미지 없음</div>}</div>
            <p className="mt-2 truncate text-sm font-medium">{candidate.title}</p>
            <p className="truncate text-xs text-zinc-500">{candidate.artist}</p>
          </button>)}
        </div>
        {!loading && candidates.length === 0 && <p className="mt-5 rounded-xl bg-zinc-50 p-4 text-center text-sm text-zinc-500">검색된 앨범 이미지가 없습니다.</p>}
      </div>
    </div>
  );
}
