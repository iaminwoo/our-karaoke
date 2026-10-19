"use client";

/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  SINGER_SCOPE_LABELS,
  SONG_GENRE_LABELS,
  SONG_MOOD_LABELS,
  SONG_STATUS_LABELS,
} from "@/lib/song-constants";
import { deleteSong } from "@/lib/songs";
import type { KaraokeSong } from "@/types/database";

type SongDetailModalProps = {
  song: KaraokeSong;
  onClose: () => void;
  onDeleted: (id: string) => void;
};

export function SongDetailModal({
  song,
  onClose,
  onDeleted,
}: SongDetailModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const [broken, setBroken] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (isDeleteDialogOpen) {
        if (!isDeleting) {
          event.preventDefault();
          setIsDeleteDialogOpen(false);
          requestAnimationFrame(() => deleteButtonRef.current?.focus());
        }
        return;
      }

      onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isDeleteDialogOpen, isDeleting, onClose]);

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const items = [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href]',
      ) ?? []),
    ];
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openDeleteDialog() {
    setDeleteError("");
    setIsDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    if (isDeleting) return;

    setIsDeleteDialogOpen(false);
    requestAnimationFrame(() => deleteButtonRef.current?.focus());
  }

  async function handleDelete() {
    if (isDeleting) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      await deleteSong(song.id);
      onDeleted(song.id);
      onClose();
    } catch {
      setDeleteError("노래를 삭제하지 못했습니다. 다시 시도해주세요.");
      setIsDeleting(false);
    }
  }

  const image = song.artwork_url && !broken;
  const statusTone =
    song.song_status === "practice"
      ? "amber"
      : song.song_status === "favorite"
        ? "rose"
        : "zinc";

  return (
    <div
      className="fixed inset-0 z-60 flex h-[100dvh] items-center justify-center bg-zinc-950/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleteDialogOpen) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="max-h-full w-full overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-xl [-webkit-overflow-scrolling:touch] sm:max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-hidden={isDeleteDialogOpen || undefined}
        aria-labelledby="song-detail-title"
        inert={isDeleteDialogOpen || undefined}
        onKeyDown={trapFocus}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 id="song-detail-title" className="text-lg font-semibold">노래 상세</h2>
          <button
            ref={closeRef}
            className="flex size-10 items-center justify-center rounded-lg text-xl text-zinc-500 hover:bg-zinc-100"
            type="button"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 p-5">
          <section className="flex gap-4">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 text-zinc-400">
              {image ? (
                <img
                  className="size-full object-cover"
                  src={song.artwork_url!}
                  alt={`${song.title} 앨범 이미지`}
                  onError={() => setBroken(true)}
                />
              ) : (
                <span className="text-3xl" aria-label="앨범 이미지 없음">◉</span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="break-words text-xl font-semibold">{song.title}</h3>
              <p className="mt-1 text-zinc-600">{song.artist}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <Tag>{SINGER_SCOPE_LABELS[song.singer_scope]}</Tag>
                {song.genre && <Tag>{SONG_GENRE_LABELS[song.genre]}</Tag>}
                {song.mood && <Tag>{SONG_MOOD_LABELS[song.mood]}</Tag>}
                <Tag tone={statusTone}>
                  {song.song_status === "favorite" ? "♥ " : ""}
                  {SONG_STATUS_LABELS[song.song_status]}
                </Tag>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-medium text-zinc-500">노래방 번호</h3>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <NumberRow label="TJ" value={song.tj_number} />
              <NumberRow label="금영" value={song.ky_number} />
            </div>
          </section>

          {song.memo && (
            <section>
              <h3 className="text-sm font-medium text-zinc-500">메모</h3>
              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
                {song.memo}
              </p>
            </section>
          )}

          <div className="flex gap-3">
            <button
              className="min-h-12 min-w-0 basis-0 flex-[2] rounded-xl bg-zinc-900 text-sm font-semibold text-white"
              type="button"
              onClick={() => {
                onClose();
                router.push(`/songs/${song.id}/edit`);
              }}
            >
              수정하기
            </button>
            <button
              ref={deleteButtonRef}
              className="flex min-h-12 min-w-0 basis-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed"
              type="button"
              onClick={openDeleteDialog}
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7l1-3h4l1 3" />
              </svg>
              삭제
            </button>
          </div>
        </div>
      </div>

      {isDeleteDialogOpen && (
        <DeleteConfirmationDialog
          title={song.title}
          artist={song.artist}
          error={deleteError}
          isDeleting={isDeleting}
          onCancel={closeDeleteDialog}
          onConfirm={() => void handleDelete()}
        />
      )}
    </div>
  );
}

function DeleteConfirmationDialog({
  title,
  artist,
  error,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  title: string;
  artist: string;
  error: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const items = [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled])',
      ) ?? []),
    ];
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex h-[100dvh] items-center justify-center bg-zinc-950/60 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-song-title"
        aria-describedby="delete-song-description"
        onKeyDown={trapFocus}
      >
        <h2 id="delete-song-title" className="text-lg font-semibold">
          노래를 삭제할까요?
        </h2>
        <p id="delete-song-description" className="mt-3 text-sm leading-6 text-zinc-600">
          ‘{title} - {artist}’를 목록에서 삭제합니다. 삭제한 노래는 복구할 수 없습니다.
        </p>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-3">
          <button
            ref={cancelRef}
            className="min-h-11 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed"
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
          >
            취소
          </button>
          <button
            className="min-h-11 flex-1 rounded-xl border border-red-100 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "삭제하는 중..." : "삭제하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex min-h-12 min-w-0 items-center justify-between gap-2 rounded-xl border border-zinc-200 px-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <strong className="truncate text-lg text-zinc-900">{value ?? "미등록"}</strong>
    </div>
  );
}

function Tag({
  children,
  tone = "zinc",
}: {
  children: React.ReactNode;
  tone?: "zinc" | "amber" | "rose";
}) {
  const classes = {
    zinc: "bg-zinc-100 text-zinc-600",
    amber: "bg-amber-50 text-amber-800",
    rose: "bg-rose-50 text-rose-700",
  };

  return <span className={`rounded-full px-2 py-1 ${classes[tone]}`}>{children}</span>;
}
