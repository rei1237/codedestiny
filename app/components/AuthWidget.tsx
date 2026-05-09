"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch, clearClientAuthState, logoutWithServer } from "../_lib/auth-client";
import { persistSanitizedAuthUser, readSanitizedAuthUser } from "../_lib/auth-storage";

type AuthUser = {
  id?: string;
  userId?: string;
  _id?: string;
  uid?: string;
  name?: string;
  email?: string;
  image?: string;
  role: "user" | "admin";
  points?: number;
};

const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";

function readAuthUser(): AuthUser | null {
  try {
    return readSanitizedAuthUser() as AuthUser | null;
  } catch {
    return null;
  }
}

function persistAuthUser(user: AuthUser) {
  const safeUser = persistSanitizedAuthUser(user);
  const role = String((safeUser && safeUser.role) || user.role || "user");
  document.cookie = `fortune_auth_role=${encodeURIComponent(role)}; path=/; max-age=604800; samesite=lax`;
}

function clearAuth() {
  clearClientAuthState();
}

async function refreshCurrentUser(signal?: AbortSignal) {
  const response = await authFetch("/api/auth/me", {
    method: "GET",
    cache: "no-store",
    signal,
  }, { retryOn401: true });

  if (!response.ok) {
    if ([401, 403, 404].includes(response.status)) {
      clearAuth();
      return null;
    }
    throw new Error("auth_refresh_failed");
  }

  const payload = (await response.json()) as { user?: AuthUser };
  if (!payload.user?.id) {
    clearAuth();
    return null;
  }

  persistAuthUser(payload.user);
  return payload.user;
}

export default function AuthWidget() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const controller = new AbortController();
    const syncUser = () => {
      const cachedUser = readAuthUser();
      setUser(cachedUser);

      refreshCurrentUser(controller.signal)
        .then((nextUser) => setUser(nextUser))
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setUser(readAuthUser());
        });
    };

    syncUser();

    const onStorage = () => syncUser();
    window.addEventListener("storage", onStorage);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
        channel.onmessage = () => syncUser();
      }
    } catch {
      channel = null;
    }

    return () => {
      controller.abort();
      window.removeEventListener("storage", onStorage);
      channel?.close();
    };
  }, []);

  const handleLogout = async () => {
    await logoutWithServer();
    setUser(null);
    window.location.assign("/");
  };

  if (!mounted) return null;

  if (user) {
    const displayName = String(user.name || "사용자");
    const displayEmail = String(user.email || "");
    const displayImage = String(user.image || "");
    const initial = displayName.trim().charAt(0) || "사";
    const displayPoints = user.points ?? 0;
    return (
      <div className="flex items-center gap-2">
        {displayImage ? (
          <img
            src={displayImage}
            alt={`${displayName} 프로필`}
            className="h-7 w-7 rounded-full border border-violet-300/40 object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-violet-300/40 bg-violet-500/20 text-xs font-semibold text-violet-100">
            {initial}
          </span>
        )}
        <span className="flex max-w-[180px] flex-col leading-tight">
          <span className="truncate text-sm text-violet-200/90">{displayName}님</span>
          {displayEmail ? (
            <span className="truncate text-[11px] text-violet-200/60">{displayEmail}</span>
          ) : null}
        </span>
        {user.role === "admin" && (
          <Link
            href="/admin"
            className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-2.5 py-1 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/35"
          >
            관리자
          </Link>
        )}
        <Link
          href="/points"
          className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1 text-xs font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/25"
          title="포인트 충전/내역"
        >
          {displayPoints.toLocaleString()}P
        </Link>
        <Link
          href="/me"
          className="rounded-lg border border-slate-400/30 bg-slate-700/40 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-600/50"
          title="마이페이지"
        >
          계정
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-400/30 bg-slate-700/40 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-600/50"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="rounded-lg border border-violet-300/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/25"
      >
        로그인
      </Link>
      <Link
        href="/signup"
        className="rounded-lg border border-fuchsia-300/50 bg-gradient-to-r from-violet-600/60 to-fuchsia-600/60 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
      >
        회원가입
      </Link>
    </div>
  );
}
