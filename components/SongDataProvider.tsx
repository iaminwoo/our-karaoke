"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { useAuth } from "@/components/AuthGate";
import { getSongs } from "@/lib/songs";
import type { KaraokeSong } from "@/types/database";

type SongStore = {
  error: string;
  isLoading: boolean;
  removeSong: (id: string) => void;
  refresh: () => Promise<void>;
  replaceSong: (song: KaraokeSong) => void;
  songs: KaraokeSong[];
  upsertSong: (song: KaraokeSong) => void;
};

type SongStoreState = Omit<SongStore, "removeSong" | "replaceSong" | "upsertSong">;

const SongStoreContext = createContext<SongStoreState | null>(null);

export function SongDataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  return (
    <SongDataProviderState
      key={isAuthenticated ? "authenticated" : "unauthenticated"}
      isAuthenticated={isAuthenticated}
    >
      {children}
    </SongDataProviderState>
  );
}

function SongDataProviderState({
  children,
  isAuthenticated,
}: {
  children: ReactNode;
  isAuthenticated: boolean;
}) {
  const [songs, setSongs] = useState<KaraokeSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const initialLoadStarted = useRef(false);
  const requestInFlight = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || requestInFlight.current) return;

    requestInFlight.current = true;
    setIsLoading(true);
    setError("");

    try {
      const loadedSongs = await getSongs();
      if (mounted.current) {
        setSongs(loadedSongs);
      }
    } catch {
      if (mounted.current) {
        setError("노래 목록을 불러오지 못했습니다. 다시 시도해주세요.");
      }
    } finally {
      if (mounted.current) {
        requestInFlight.current = false;
        setIsLoading(false);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || initialLoadStarted.current) return;

    initialLoadStarted.current = true;
    void refresh();
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const upsertSong = useCallback((song: KaraokeSong) => {
    setSongs((current) => [song, ...current.filter((item) => item.id !== song.id)]);
  }, []);
  const replaceSong = useCallback((song: KaraokeSong) => {
    setSongs((current) => current.map((item) => (item.id === song.id ? song : item)));
  }, []);
  const removeSong = useCallback((id: string) => {
    setSongs((current) => current.filter((item) => item.id !== id));
  }, []);

  return <SongStoreContext.Provider value={{ songs, isLoading, error, refresh }}><SongStoreActionsContext.Provider value={{ removeSong, replaceSong, upsertSong }}>{children}</SongStoreActionsContext.Provider></SongStoreContext.Provider>;
}

const SongStoreActionsContext = createContext<Pick<SongStore, "removeSong" | "replaceSong" | "upsertSong"> | null>(null);

export function useSongStore() {
  const store = useContext(SongStoreContext);
  const actions = useContext(SongStoreActionsContext);
  if (!store || !actions) throw new Error("useSongStore는 SongDataProvider 내부에서 사용해야 합니다.");
  return { ...store, ...actions };
}
