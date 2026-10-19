"use client";

import { useState } from "react";

import { useAuth } from "@/components/AuthGate";

export function SignOutButton() {
  const { signOut } = useAuth();
  const [error, setError] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    setError("");

    try {
      await signOut();
    } catch {
      setError("로그아웃에 실패했습니다. 다시 시도해주세요.");
      setIsSigningOut(false);
    }
  }

  return (
    <div className="text-right">
      <button
        className="min-h-10 rounded-lg px-3 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? "로그아웃 중..." : "로그아웃"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
