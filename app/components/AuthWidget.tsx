"use client";

/**
 * AuthWidget — 전역 인증 상태 위젯
 *
 * localStorage의 fortune_auth_token / fortune_auth_user를 읽어
 * 로그인 여부에 따라 다른 UI를 표시합니다.
 *
 * - 로그인 상태: "{name}님" + "로그아웃" 버튼
 * - 비로그인 상태: "로그인" + "회원가입" 버튼
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  points?: number;
};

const ADMIN_VIRTUAL_COINS = 9999;

function isFlowerAdminSessionClient(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("flower_admin_token")) return true;
  } catch {}
  try {
    if (sessionStorage.getItem("flower_admin_token")) return true;
  } catch {}
  return false;
}

function readAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("fortune_auth_user");
    const token = localStorage.getItem("fortune_auth_token");
    if (!token || !raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function clearAuth() {
  localStorage.removeItem("fortune_auth_token");
  localStorage.removeItem("fortune_auth_user");
  document.cookie = "fortune_auth_token=; path=/; max-age=0";
  document.cookie = "fortune_auth_role=; path=/; max-age=0";
}

export default function AuthWidget() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(readAuthUser());

    // storage 변경 시 동기화 (다른 탭에서 로그인/로그아웃 시)
    const onStorage = () => setUser(readAuthUser());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 서버 로그아웃 실패해도 클라이언트는 정리
    }
    clearAuth();
    setUser(null);
    router.push("/");
    router.refresh();
  };

  // SSR 하이드레이션 불일치 방지 — mounted 전에는 렌더링 안 함
  if (!mounted) return null;

  if (user) {
    const adminMode = isFlowerAdminSessionClient();
    const displayPoints = adminMode ? ADMIN_VIRTUAL_COINS : (user.points ?? 0);
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-violet-200/80 max-w-[120px] truncate">
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
          ✦ {displayPoints.toLocaleString()}P
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
