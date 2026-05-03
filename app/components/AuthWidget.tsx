"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  points?: number;
};

const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";

function readAuthToken() {
  try {
    return localStorage.getItem("fortune_auth_token") || "";
  } catch {
    return "";
  }
}

function readAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("fortune_auth_user");
    const token = readAuthToken();
    if (!token || !raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function persistAuthUser(user: AuthUser) {
  localStorage.setItem("fortune_auth_user", JSON.stringify(user));
  document.cookie = `fortune_auth_role=${encodeURIComponent(user.role)}; path=/; max-age=604800; samesite=lax`;
}

function clearAuth() {
  localStorage.removeItem("fortune_auth_token");
  localStorage.removeItem("fortune_auth_user");
  document.cookie = "fortune_auth_token=; path=/; max-age=0; samesite=lax";
  document.cookie = "fortune_auth_role=; path=/; max-age=0; samesite=lax";
}

function publishAuthSync(event: "login" | "logout") {
  try {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
    channel.postMessage({ source: "auth-widget", event, at: Date.now() });
    channel.close();
  } catch {
    // Cross-tab sync is best-effort only.
  }
}

async function refreshCurrentUser(signal?: AbortSignal) {
  const token = readAuthToken();
  if (!token) {
    clearAuth();
    return null;
  }

  const response = await fetch("/api/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal,
  });

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

      if (!readAuthToken()) {
        setUser(null);
        return;
      }

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
    const token = readAuthToken();
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {
      // Local cleanup still needs to happen if the network request fails.
    }
    clearAuth();
    publishAuthSync("logout");
    setUser(null);
    window.location.assign("/");
  };

  if (!mounted) return null;

  if (user) {
    const displayPoints = user.points ?? 0;
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-[120px] truncate text-sm text-violet-200/80">
          {user.name}님
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
