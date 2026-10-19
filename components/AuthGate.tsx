"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type AuthContextValue = {
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth는 AuthGate 내부에서 사용해야 합니다.");
  }

  return context;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const configured = isSupabaseConfigured();
  const isAuthenticated = Boolean(session);
  const showOverlay = !configured || !isAuthenticated;

  useEffect(() => {
    if (!configured) {
      return;
    }

    const supabase = getSupabaseClient();

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const { error: authError } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("이메일 또는 비밀번호를 확인해주세요.");
    }

    setIsSubmitting(false);
  }

  async function signOut() {
    if (!configured) {
      return;
    }

    const { error: authError } = await getSupabaseClient().auth.signOut();

    if (authError) {
      throw authError;
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, signOut }}>
      <div
        aria-hidden={showOverlay}
        className={showOverlay ? "invisible" : undefined}
        inert={showOverlay || undefined}
      >
        {children}
      </div>
      {showOverlay && (
        <AuthOverlay
          configured={configured}
          email={email}
          error={error}
          isCheckingSession={configured && session === undefined}
          isSubmitting={isSubmitting}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={signIn}
          password={password}
        />
      )}
    </AuthContext.Provider>
  );
}

function AuthOverlay({
  configured,
  email,
  error,
  isCheckingSession,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  password,
}: {
  configured: boolean;
  email: string;
  error: string;
  isCheckingSession: boolean;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  password: string;
}) {
  return (
    <main className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-zinc-50 px-6 font-sans text-zinc-900">
      {!configured ? (
        <section className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-zinc-200">
          <h1 className="karaoke-title text-2xl font-semibold">뭐 부를까?</h1>
          <p className="mt-3 text-sm text-zinc-600">Supabase 환경변수를 설정해주세요.</p>
        </section>
      ) : isCheckingSession ? (
        <p className="text-sm text-zinc-600">초기 세션 확인 중...</p>
      ) : (
        <form
          className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200"
          onSubmit={(event) => void onSubmit(event)}
        >
          <div className="space-y-1 text-center">
            <h1 className="karaoke-title text-2xl font-semibold">뭐 부를까?</h1>
            <p className="text-sm text-zinc-600">노래방 레퍼토리 관리 웹앱</p>
          </div>

          <label className="block space-y-2 text-sm font-medium">
            이메일
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base font-normal outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="block space-y-2 text-sm font-medium">
            비밀번호
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base font-normal outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

          <button
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>
      )}
    </main>
  );
}
