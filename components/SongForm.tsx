"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AlbumArtworkPicker } from "@/components/AlbumArtworkPicker";
import { useSongStore } from "@/components/SongDataProvider";
import { SINGER_SCOPE_LABELS, SONG_GENRE_LABELS, SONG_MOOD_LABELS, SONG_STATUS_LABELS } from "@/lib/song-constants";
import { createSong, updateSong } from "@/lib/songs";
import { getSupabaseClient } from "@/lib/supabase";
import type { CreateSongInput, KaraokeSong, SingerScope, SongGenre, SongMood, SongStatus } from "@/types/database";
import type { KaraokeNumberSearchResponse } from "@/types/karaoke-number-search";
import type { ItunesSearchResult } from "@/types/music-search";

type FormValues = Omit<CreateSongInput, "singer_scope"> & {
  singer_scope: SingerScope | "";
};

type KaraokeNumberSnapshot = Pick<FormValues, "artist" | "title" | "tj_number" | "ky_number">;

type DuplicateCandidate = {
  song: KaraokeSong;
};

function normalizeDuplicateText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[\s\-_.!"#$%&'()*+,/:;<=>?@[\\\]^`{|}~·…]/g, "");
}

function getMatchScore(query: string, value: string) {
  if (query === value) return 100;
  if (value.startsWith(query) || query.startsWith(value)) return 75;
  if (value.includes(query) || query.includes(value)) return 60;
  return 0;
}

function getDuplicateCandidate(songs: KaraokeSong[], title: string, artist: string): DuplicateCandidate | null {
  const normalizedTitle = normalizeDuplicateText(title);
  const normalizedArtist = normalizeDuplicateText(artist);

  if (!normalizedTitle && !normalizedArtist) return null;

  return songs
    .flatMap((song) => {
      const titleScore = getMatchScore(normalizedTitle, normalizeDuplicateText(song.title));
      const artistScore = getMatchScore(normalizedArtist, normalizeDuplicateText(song.artist));

      const hasTitleMismatch = Boolean(normalizedTitle) && !titleScore;
      const hasArtistMismatch = Boolean(normalizedArtist) && !artistScore;
      const minimumScore = normalizedTitle && normalizedArtist ? 160 : 75;

      if (hasTitleMismatch || hasArtistMismatch || titleScore + artistScore < minimumScore) return [];

      return [{
        song,
        score: titleScore + artistScore,
      }];
    })
    .sort((first, second) => second.score - first.score || first.song.title.localeCompare(second.song.title, "ko-KR"))
    .map(({ song }) => ({ song }))[0] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isKaraokeNumberCandidate(value: unknown) {
  return isRecord(value)
    && (value.provider === "tj" || value.provider === "ky")
    && typeof value.number === "string"
    && typeof value.videoTitle === "string"
    && typeof value.videoUrl === "string"
    && typeof value.titleMatches === "boolean"
    && typeof value.artistMatches === "boolean";
}

function isKaraokeNumberSearchResponse(value: unknown): value is KaraokeNumberSearchResponse {
  if (!isRecord(value)) return false;

  return (["tj", "ky"] as const).every((provider) => {
    const result = value[provider];
    return isRecord(result)
      && Array.isArray(result.candidates)
      && result.candidates.every(isKaraokeNumberCandidate)
      && (result.error === null || typeof result.error === "string");
  });
}

function toValues(song: KaraokeSong): FormValues {
  return {
    title: song.title,
    artist: song.artist,
    artwork_url: song.artwork_url,
    tj_number: song.tj_number,
    ky_number: song.ky_number,
    singer_scope: song.singer_scope,
    genre: song.genre,
    mood: song.mood,
    song_status: song.song_status,
    memo: song.memo,
  };
}

function newSongValues(): FormValues {
  return {
    title: "",
    artist: "",
    tj_number: null,
    ky_number: null,
    singer_scope: "both",
    genre: "ballad",
    mood: null,
    song_status: "normal",
    artwork_url: null,
    memo: null,
  };
}

export function SongForm({ song }: { song?: KaraokeSong }) {
  const router = useRouter();
  const { songs, upsertSong, replaceSong } = useSongStore();
  const [values, setValues] = useState<FormValues>(() => song ? toValues(song) : newSongValues());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [defaultCandidates, setDefaultCandidates] = useState<ItunesSearchResult[]>([]);
  const [candidates, setCandidates] = useState<ItunesSearchResult[]>([]);
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [isNumberSearching, setIsNumberSearching] = useState(false);
  const [numberSearchError, setNumberSearchError] = useState("");
  const currentValues = useRef(values);
  const mounted = useRef(true);
  const numberSearchAbortController = useRef<AbortController | null>(null);
  const numberSearchId = useRef(0);
  const pendingNumberSnapshot = useRef<KaraokeNumberSnapshot | null>(null);
  const [duplicateCheckDismissed, setDuplicateCheckDismissed] = useState(false);
  const [displayedDuplicateCandidate, setDisplayedDuplicateCandidate] = useState<KaraokeSong | null>(null);
  const [isDuplicateCandidateVisible, setIsDuplicateCandidateVisible] = useState(false);
  const duplicateCandidateExitTimeout = useRef<number | null>(null);

  const formValues = values;
  const editing = Boolean(song);
  const canSearchCover = Boolean(formValues.title.trim() && formValues.artist.trim());
  const hasDuplicateSearchInput = Boolean(formValues.title.trim() || formValues.artist.trim());
  const shouldCheckDuplicate = !editing && !duplicateCheckDismissed && hasDuplicateSearchInput;

  const hideDuplicateCandidate = useCallback(() => {
    setIsDuplicateCandidateVisible(false);
    if (duplicateCandidateExitTimeout.current) {
      window.clearTimeout(duplicateCandidateExitTimeout.current);
    }
    duplicateCandidateExitTimeout.current = window.setTimeout(() => {
      setDisplayedDuplicateCandidate(null);
      duplicateCandidateExitTimeout.current = null;
    }, 220);
  }, []);

  const showDuplicateCandidate = useCallback((candidate: KaraokeSong | null) => {
    if (!candidate) {
      hideDuplicateCandidate();
      return;
    }

    if (duplicateCandidateExitTimeout.current) {
      window.clearTimeout(duplicateCandidateExitTimeout.current);
      duplicateCandidateExitTimeout.current = null;
    }
    setDisplayedDuplicateCandidate(candidate);
    requestAnimationFrame(() => setIsDuplicateCandidateVisible(true));
  }, [hideDuplicateCandidate]);

  useEffect(() => {
    currentValues.current = values;
  }, [values]);

  useEffect(() => {
    if (!shouldCheckDuplicate) return;

    const timer = window.setTimeout(() => {
      showDuplicateCandidate(getDuplicateCandidate(songs, formValues.title, formValues.artist)?.song ?? null);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [formValues.artist, formValues.title, shouldCheckDuplicate, showDuplicateCandidate, songs]);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      numberSearchAbortController.current?.abort();
      if (duplicateCandidateExitTimeout.current) {
        window.clearTimeout(duplicateCandidateExitTimeout.current);
      }
    };
  }, []);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => current ? { ...current, [key]: value } : current);
    if (!editing && (key === "title" || key === "artist")) {
      hideDuplicateCandidate();
    }
  }

  async function fetchItunesCandidates(query: string, isDefaultSearch = false) {
    setCoverLoading(true);
    setCoverError("");

    try {
      const response = await fetch(`/api/itunes-search?q=${encodeURIComponent(query)}&limit=5`);
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload?.itunes?.results)) throw new Error();

      const results = payload.itunes.results as ItunesSearchResult[];
      setCandidates(results);
      if (isDefaultSearch) setDefaultCandidates(results);
    } catch {
      setCoverError("앨범 이미지를 불러오지 못했습니다. 기존 후보와 입력값은 유지됩니다.");
    } finally {
      setCoverLoading(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const valuesToSave = isNumberSearching && pendingNumberSnapshot.current
        ? {
          ...formValues,
          tj_number: pendingNumberSnapshot.current.tj_number,
          ky_number: pendingNumberSnapshot.current.ky_number,
        }
        : formValues;

      if (!valuesToSave.title.trim() || !valuesToSave.artist.trim() || !valuesToSave.singer_scope) {
        setError("노래 제목, 가수, 부르는 사람을 입력해 주세요.");
        setSaving(false);
        return;
      }
      const input: CreateSongInput = {
        ...valuesToSave,
        title: valuesToSave.title.trim(),
        artist: valuesToSave.artist.trim(),
        singer_scope: valuesToSave.singer_scope,
      };

      if (!editing) {
        const duplicate = songs.some((item) =>
          item.title === input.title
          && item.artist === input.artist
          && ((input.tj_number && item.tj_number === input.tj_number)
            || (input.ky_number && item.ky_number === input.ky_number)),
        );
        if (duplicate && !window.confirm("같은 제목·가수와 노래방 번호를 가진 노래가 있습니다. 계속 등록할까요?")) {
          setSaving(false);
          return;
        }
        const saved = await createSong(input);
        upsertSong(saved);
      } else {
        const saved = await updateSong(song!.id, input);
        replaceSong(saved);
      }
      numberSearchId.current += 1;
      numberSearchAbortController.current?.abort();
      setSaving(false);
      router.push("/");
    } catch {
      setError("저장하지 못했습니다. 입력값은 유지됩니다. 다시 시도해주세요.");
      setSaving(false);
    }
  }

  async function openCoverPicker() {
    if (!canSearchCover) return;

    if (!editing) {
      setDuplicateCheckDismissed(true);
      hideDuplicateCandidate();
    }
    setCoverOpen(true);
    if (candidates.length === 0 && !coverLoading) {
      await fetchItunesCandidates(`${formValues.title} ${formValues.artist}`, true);
    }
  }

  function restoreNumbers(snapshot: KaraokeNumberSnapshot) {
    setValues((current) => ({
      ...current,
      tj_number: snapshot.tj_number,
      ky_number: snapshot.ky_number,
    }));
  }

  async function searchKaraokeNumbers() {
    if (!canSearchCover || isNumberSearching) return;

    const snapshot: KaraokeNumberSnapshot = {
      title: formValues.title.trim(),
      artist: formValues.artist.trim(),
      tj_number: formValues.tj_number,
      ky_number: formValues.ky_number,
    };
    const searchId = numberSearchId.current + 1;
    const abortController = new AbortController();
    numberSearchId.current = searchId;
    numberSearchAbortController.current?.abort();
    numberSearchAbortController.current = abortController;
    pendingNumberSnapshot.current = snapshot;
    setIsNumberSearching(true);
    setNumberSearchError("");
    setValues((current) => ({ ...current, tj_number: null, ky_number: null }));

    try {
      const {
        data: { session },
      } = await getSupabaseClient().auth.getSession();
      if (!session) {
        throw new Error("로그인 정보를 확인하지 못했습니다. 다시 로그인한 뒤 시도해주세요.");
      }

      const response = await fetch("/api/karaoke-number-search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: snapshot.title, artist: snapshot.artist }),
        signal: abortController.signal,
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isKaraokeNumberSearchResponse(payload)) {
        const message = isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : "번호 검색을 완료하지 못했습니다. 다시 시도해주세요.";
        throw new Error(message);
      }

      if (!mounted.current || numberSearchId.current !== searchId) return;
      const latest = currentValues.current;
      if (latest.title.trim() !== snapshot.title || latest.artist.trim() !== snapshot.artist) {
        restoreNumbers(snapshot);
        setNumberSearchError("검색 중 곡명 또는 가수명이 바뀌어 결과를 적용하지 않았습니다.");
        return;
      }

      const tjCandidate = payload.tj.candidates[0];
      const kyCandidate = payload.ky.candidates[0];
      const tjNumber = tjCandidate?.titleMatches && tjCandidate.artistMatches
        ? tjCandidate.number
        : snapshot.tj_number;
      const kyNumber = kyCandidate?.titleMatches && kyCandidate.artistMatches
        ? kyCandidate.number
        : snapshot.ky_number;
      setValues((current) => ({
        ...current,
        tj_number: tjNumber,
        ky_number: kyNumber,
      }));

      const hasUnavailableNumber = Boolean(
        payload.tj.error
        || payload.ky.error
        || !tjCandidate
        || !kyCandidate
        || !tjCandidate.titleMatches
        || !tjCandidate.artistMatches
        || !kyCandidate.titleMatches
        || !kyCandidate.artistMatches,
      );
      if (hasUnavailableNumber) {
        setNumberSearchError("번호를 찾을 수 없습니다.");
      }
    } catch (searchError) {
      if (!mounted.current || numberSearchId.current !== searchId || abortController.signal.aborted) return;
      restoreNumbers(snapshot);
      setNumberSearchError(searchError instanceof Error ? searchError.message : "번호 검색을 완료하지 못했습니다. 다시 시도해주세요.");
    } finally {
      if (mounted.current && numberSearchId.current === searchId) {
        setIsNumberSearching(false);
        pendingNumberSnapshot.current = null;
        numberSearchAbortController.current = null;
      }
    }
  }

  function selectCover(candidate: ItunesSearchResult | null) {
    if (candidate) {
      set("artwork_url", candidate.artworkUrl);
    } else {
      set("artwork_url", null);
    }
    setCoverOpen(false);
  }

  return (
    <main className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6">
        <header className="flex items-center gap-3">
          <Link className="flex size-10 items-center justify-center rounded-lg text-xl text-zinc-600 hover:bg-white" href="/">←</Link>
          <div>
            <h1 className="text-2xl font-semibold">{editing ? "노래 수정" : "노래 정보 입력"}</h1>
            <p className="mt-1 text-sm text-zinc-500">필수 정보를 확인하고 저장해 주세요.</p>
          </div>
        </header>
        <form className="mt-7 space-y-5" onSubmit={save}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-5"><BasicFields values={formValues} set={set} /></div>
            <button className="flex min-h-full flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-center disabled:cursor-not-allowed disabled:border-zinc-100 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:opacity-70" type="button" onClick={() => void openCoverPicker()} disabled={!canSearchCover}>
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 text-xs text-zinc-500">
                {formValues.artwork_url ? <img className="size-full object-cover" src={formValues.artwork_url} alt="선택한 앨범 이미지" /> : "이미지 없음"}
              </div>
              <span>
                <strong className="block text-sm">앨범 이미지</strong>
                <span className="mt-1 block text-xs text-zinc-500">{coverLoading ? "후보 불러오는 중..." : "눌러서 이미지 선택"}</span>
              </span>
            </button>
          </div>
          {coverError && !coverOpen && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{coverError}</p>}
          {!editing && (
            <div
              className={`-mt-2 mb-2 grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${shouldCheckDuplicate ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              aria-hidden={!shouldCheckDuplicate}
              inert={!shouldCheckDuplicate || undefined}
            >
              <div className="min-h-0 overflow-hidden">
                <DuplicateCheckNotice
                  song={displayedDuplicateCandidate}
                  visible={isDuplicateCandidateVisible}
                />
              </div>
            </div>
          )}
          <Fields
            isNumberSearching={isNumberSearching}
            numberSearchError={numberSearchError}
            onSearchKaraokeNumbers={() => void searchKaraokeNumbers()}
            values={formValues}
            set={set}
          />
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button className="min-h-12 w-full rounded-xl bg-zinc-900 text-sm font-semibold text-white disabled:bg-zinc-400" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
        </form>
      </div>
      {coverOpen && <AlbumArtworkPicker
        candidates={candidates}
        defaultCandidates={defaultCandidates}
        error={coverError}
        loading={coverLoading}
        selectedUrl={formValues.artwork_url}
        onClose={() => setCoverOpen(false)}
        onRestoreDefault={() => setCandidates(defaultCandidates)}
        onSearch={(query) => fetchItunesCandidates(query)}
        onSelect={selectCover}
      />}
    </main>
  );
}

function Fields({
  isNumberSearching,
  numberSearchError,
  onSearchKaraokeNumbers,
  values,
  set,
}: {
  isNumberSearching: boolean;
  numberSearchError: string;
  onSearchKaraokeNumbers: () => void;
  values: FormValues;
  set: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
}) {
  return <>
    <section aria-labelledby="karaoke-number-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="karaoke-number-title" className="text-sm font-medium">노래방 번호</h2>
        <button className="min-h-10 shrink-0 rounded-full bg-zinc-900 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300" type="button" onClick={onSearchKaraokeNumbers} disabled={isNumberSearching || !values.title.trim() || !values.artist.trim()}>{isNumberSearching ? "번호 찾는 중..." : "번호 찾기"}</button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">TJ 번호<input className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 font-normal disabled:cursor-not-allowed disabled:border-zinc-100 disabled:bg-zinc-100 disabled:text-zinc-400" value={values.tj_number ?? ""} onChange={(event) => set("tj_number", event.target.value || null)} disabled={isNumberSearching} placeholder={isNumberSearching ? "검색하는 중입니다..." : "번호 입력"} /></label>
        <label className="text-sm font-medium">KY 번호<input className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 font-normal disabled:cursor-not-allowed disabled:border-zinc-100 disabled:bg-zinc-100 disabled:text-zinc-400" value={values.ky_number ?? ""} onChange={(event) => set("ky_number", event.target.value || null)} disabled={isNumberSearching} placeholder={isNumberSearching ? "검색하는 중입니다..." : "번호 입력"} /></label>
      </div>
      {numberSearchError && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{numberSearchError}</p>}
    </section>
    <CapsuleFieldset
      label="부르는 사람"
      options={(["both", "lydia", "inwoo"] as SingerScope[]).map((scope) => [scope, SINGER_SCOPE_LABELS[scope]])}
      value={values.singer_scope}
      onChange={(value) => set("singer_scope", value as SingerScope)}
    />
    <CapsuleFieldset
      label="장르"
      options={Object.entries(SONG_GENRE_LABELS) as Array<[SongGenre, string]>}
      value={values.genre ?? "other"}
      onChange={(value) => set("genre", value as SongGenre)}
    />
    <CapsuleFieldset
      label="분위기"
      options={[["", "미지정"], ...(Object.entries(SONG_MOOD_LABELS) as Array<[SongMood, string]>)]}
      value={values.mood ?? ""}
      onChange={(value) => set("mood", (value || null) as SongMood | null)}
    />
    <fieldset><legend className="text-sm font-medium">곡 상태</legend><div className="mt-2 flex flex-wrap gap-2">{(["normal", "practice", "favorite"] as SongStatus[]).map((status) => <button className={`min-h-10 rounded-full px-3 text-sm font-medium ${values.song_status === status ? "bg-zinc-900 text-white ring-2 ring-zinc-200" : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 hover:bg-white"}`} type="button" key={status} onClick={() => set("song_status", status)} aria-pressed={values.song_status === status}>{SONG_STATUS_LABELS[status]}</button>)}</div></fieldset>
    <label className="block text-sm font-medium">메모<textarea className="mt-2 min-h-24 w-full rounded-lg border border-zinc-200 bg-white p-3 font-normal" value={values.memo ?? ""} onChange={(event) => set("memo", event.target.value || null)} /></label>
  </>;
}


function BasicFields({ values, set }: { values: FormValues; set: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void }) {
  return <>
    <label className="block text-sm font-medium">곡명<input className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 font-normal" value={values.title} onChange={(event) => set("title", event.target.value)} required /></label>
    <label className="block text-sm font-medium">가수명<input className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 font-normal" value={values.artist} onChange={(event) => set("artist", event.target.value)} required /></label>
  </>;
}

function DuplicateCheckNotice({
  song,
  visible,
}: {
  song: KaraokeSong | null;
  visible: boolean;
}) {
  return (
    <section className="min-h-8" aria-live="polite" aria-label="중복 확인">
      <p className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
        <span className="text-xs text-zinc-500">혹시?</span>
        <span className={`inline-block transition-all duration-200 ease-out motion-reduce:transition-none ${visible && song ? "ml-2 translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}>
          {song && <><span className="font-semibold text-zinc-900">{song.title}</span> - {song.artist}</>}
        </span>
      </p>
    </section>
  );
}

function CapsuleFieldset({
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
  return <fieldset>
    <legend className="text-sm font-medium">{label}</legend>
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map(([optionValue, optionLabel]) => {
        const selected = value === optionValue;

        return <button className={`min-h-10 rounded-full px-3 text-sm font-medium ${selected ? "bg-zinc-900 text-white ring-2 ring-zinc-200" : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 hover:bg-white"}`} type="button" key={optionValue || "unspecified"} onClick={() => onChange(optionValue)} aria-pressed={selected}>{optionLabel}</button>;
      })}
    </div>
  </fieldset>;
}
