"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logout, refreshAuth, useAuthStore } from "../_lib/auth-store";
import { ensureUserAccessLoaded, useUserAccess } from "../_lib/user-session-cache";
import { formatKrwAmount } from "@/lib/payment/coin-pricing";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type AuthUser = {
  id?: string;
  userId?: string;
  _id?: string;
  uid?: string;
  name?: string;
  email?: string;
  image?: string;
  role: "user" | "admin";
  monthlyStoneBalance?: number;
  monthlyCredits?: number;
  profileSubscription?: {
    tier?: string;
    isActive?: boolean;
    monthlyStoneBalance?: number;
    membershipCreditBalance?: number;
  };
};

const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";
const AUTH_STORAGE_KEYS = new Set([
  "fortune_auth_user",
  "fortune_auth_token",
  "fortune_auth_role",
  "fortune_auth_cache_verified_v1",
]);
const AUTH_WIDGET_SYNC_EVENTS = new Set(["login", "logout", "subscription"]);

/**
 * 이용권 월 한도의 **잔여**. 서버가 access-state 에서 limit - used 로 파생 계산해 내려주는 값만
 * 읽는다(worker/lib/access-state.js buildPassUsage) — 화면에서 다시 계산하지 않는다.
 * 🔴 null 은 '잔여 0' 이 아니라 '셀 수 없음'(만료일 없음 등)이다. 이때는 등급명만 보여준다.
 * 🔴 코인 단위를 그대로 렌더하지 않는다 — 표시 단위는 항상 KRW 다.
 */
function readPassRemainingKRW(accessState: unknown): number | null {
  if (!accessState || typeof accessState !== "object") return null;
  const snapshot = (accessState as { entitlementSnapshot?: unknown }).entitlementSnapshot;
  if (!snapshot || typeof snapshot !== "object") return null;
  const usage = (snapshot as { passUsage?: unknown }).passUsage;
  if (!usage || typeof usage !== "object") return null;
  const remaining = Number((usage as { remainingKRW?: unknown }).remainingKRW);
  return Number.isFinite(remaining) && remaining >= 0 ? remaining : null;
}

function shouldSyncAuthFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return true;
  const event = String((payload as { event?: unknown }).event || "");
  return AUTH_WIDGET_SYNC_EVENTS.has(event);
}

const AUTH_WIDGET_COPY: Record<LoadingLocale, {
  userFallback: string;
  initialFallback: string;
  profileAlt: (name: string) => string;
  nameLabel: (name: string) => string;
  admin: string;
  subscriptionTitle: string;
  passRemaining: (amount: string) => string;
  logout: string;
  login: string;
  signup: string;
}> = {
  ko: { userFallback: "사용자", initialFallback: "사", profileAlt: (name) => `${name} 프로필`, nameLabel: (name) => `${name}님`, admin: "관리자", subscriptionTitle: "현재 구독 티어", passRemaining: (amount) => `${amount} 남음`, logout: "로그아웃", login: "로그인", signup: "회원가입" },
  en: { userFallback: "User", initialFallback: "U", profileAlt: (name) => `${name}'s profile`, nameLabel: (name) => name, admin: "Admin", subscriptionTitle: "Current subscription tier", passRemaining: (amount) => `${amount} left`, logout: "Log out", login: "Log in", signup: "Sign up" },
  ja: { userFallback: "ユーザー", initialFallback: "ユ", profileAlt: (name) => `${name}のプロフィール`, nameLabel: (name) => `${name}様`, admin: "管理者", subscriptionTitle: "現在のサブスクリプション", passRemaining: (amount) => `残り${amount}`, logout: "ログアウト", login: "ログイン", signup: "新規登録" },
  "zh-CN": { userFallback: "用户", initialFallback: "用", profileAlt: (name) => `${name}的个人资料`, nameLabel: (name) => name, admin: "管理员", subscriptionTitle: "当前订阅等级", passRemaining: (amount) => `剩余${amount}`, logout: "退出登录", login: "登录", signup: "注册" },
  "zh-TW": { userFallback: "使用者", initialFallback: "使", profileAlt: (name) => `${name}的個人資料`, nameLabel: (name) => name, admin: "管理員", subscriptionTitle: "目前訂閱等級", passRemaining: (amount) => `剩餘${amount}`, logout: "登出", login: "登入", signup: "註冊" },
  vi: { userFallback: "Người dùng", initialFallback: "N", profileAlt: (name) => `Hồ sơ của ${name}`, nameLabel: (name) => name, admin: "Quản trị", subscriptionTitle: "Gói đăng ký hiện tại", passRemaining: (amount) => `${amount} left`, logout: "Đăng xuất", login: "Đăng nhập", signup: "Đăng ký" },
  hi: { userFallback: "उपयोगकर्ता", initialFallback: "उ", profileAlt: (name) => `${name} की प्रोफ़ाइल`, nameLabel: (name) => name, admin: "एडमिन", subscriptionTitle: "वर्तमान सदस्यता स्तर", passRemaining: (amount) => `${amount} left`, logout: "लॉग आउट", login: "लॉग इन", signup: "साइन अप" },
  es: { userFallback: "Usuario", initialFallback: "U", profileAlt: (name) => `Perfil de ${name}`, nameLabel: (name) => name, admin: "Admin", subscriptionTitle: "Nivel de suscripción actual", passRemaining: (amount) => `${amount} left`, logout: "Cerrar sesión", login: "Iniciar sesión", signup: "Registrarse" },
  fr: { userFallback: "Utilisateur", initialFallback: "U", profileAlt: (name) => `Profil de ${name}`, nameLabel: (name) => name, admin: "Admin", subscriptionTitle: "Niveau d'abonnement actuel", passRemaining: (amount) => `${amount} left`, logout: "Déconnexion", login: "Connexion", signup: "Inscription" },
  de: { userFallback: "Nutzer", initialFallback: "N", profileAlt: (name) => `Profil von ${name}`, nameLabel: (name) => name, admin: "Admin", subscriptionTitle: "Aktuelle Abo-Stufe", passRemaining: (amount) => `${amount} left`, logout: "Abmelden", login: "Anmelden", signup: "Registrieren" },
  nl: { userFallback: "Gebruiker", initialFallback: "G", profileAlt: (name) => `Profiel van ${name}`, nameLabel: (name) => name, admin: "Admin", subscriptionTitle: "Huidig abonnementsniveau", passRemaining: (amount) => `${amount} left`, logout: "Uitloggen", login: "Inloggen", signup: "Registreren" },
  ms: { userFallback: "Pengguna", initialFallback: "P", profileAlt: (name) => `Profil ${name}`, nameLabel: (name) => name, admin: "Admin", subscriptionTitle: "Tahap langganan semasa", passRemaining: (amount) => `${amount} left`, logout: "Log keluar", login: "Log masuk", signup: "Daftar" },
};

export default function AuthWidget() {
  const auth = useAuthStore();
  const userAccess = useUserAccess();
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const user = (auth.user as AuthUser | null) || null;
  const copy = AUTH_WIDGET_COPY[locale] || AUTH_WIDGET_COPY.ko;

  // 잔여 한도는 캐시나 클라이언트 로컬 상태가 아니라 서버 계산값이어야 한다 — 헤더가 직접
  // access-state 를 확보한다(이미 받아 둔 응답이 있으면 그대로 재사용된다).
  useEffect(() => {
    if (!auth.isAuthenticated) return;
    ensureUserAccessLoaded({
      force: false,
      includeProfile: false,
      includeBilling: false,
      reason: "auth-widget-pass-remaining",
    }).catch(() => {
      // 잔여 표시는 부가 정보다 — 실패해도 등급 배지는 그대로 나간다.
    });
  }, [auth.isAuthenticated]);

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
    setMounted(true);
    refreshAuth({ force: false, silent: true }).catch(() => {
      // best-effort bootstrap sync
    });

    let syncTimerId: number | null = null;
    let syncInFlight = false;
    let syncPending = false;

    const runSyncUser = () => {
      syncTimerId = null;
      if (syncInFlight || !syncPending) return;

      syncPending = false;
      syncInFlight = true;
      refreshAuth({ force: true, silent: true })
        .catch(() => {
          // transient failures should not break header rendering
        })
        .finally(() => {
          syncInFlight = false;
          if (syncPending) {
            syncTimerId = window.setTimeout(runSyncUser, 250);
          }
        });
    };

    const scheduleSyncUser = () => {
      syncPending = true;
      if (syncTimerId !== null) window.clearTimeout(syncTimerId);
      syncTimerId = window.setTimeout(runSyncUser, 250);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && !AUTH_STORAGE_KEYS.has(event.key)) return;
      scheduleSyncUser();
    };
    const onAuthChanged = (event: Event) => {
      if (event instanceof CustomEvent) {
        const detail = event.detail as { source?: unknown; event?: unknown } | null;
        const source = String(detail?.source || "");
        const evt = String(detail?.event || "");
        // 같은 탭에서 auth-store가 login/logout으로 스토어를 이미 갱신한 경우
        // /api/auth/me를 다시 강제 호출하지 않는다(로그인 직후 요청 버스트 제거).
        // 타 탭 로그인은 아래 BroadcastChannel 경로로 계속 동기화된다.
        if (source === "auth-store" && (evt === "login" || evt === "logout")) return;
        if (!shouldSyncAuthFromPayload(detail)) return;
      }
      scheduleSyncUser();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("cd:auth-changed", onAuthChanged as EventListener);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
        channel.onmessage = (event) => {
          if (!shouldSyncAuthFromPayload(event.data)) return;
          scheduleSyncUser();
        };
      }
    } catch (e) {
      channel = null;
    }

    return () => {
      syncPending = false;
      if (syncTimerId !== null) window.clearTimeout(syncTimerId);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cd:auth-changed", onAuthChanged as EventListener);
      channel?.close();
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.assign("/");
  };

  if (!mounted) return null;
  const isVerifiedUser = auth.isAuthenticated && !!user;
  const isCheckingAuth = !auth.authReady || (auth.isLoading && !isVerifiedUser);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-[34px] items-center gap-2" aria-live="polite" aria-busy="true">
        <span className="h-7 w-7 animate-pulse rounded-full border border-violet-300/30 bg-violet-500/15" />
        <span className="h-7 w-20 animate-pulse rounded-lg border border-violet-300/20 bg-violet-500/10" />
        <span className="h-7 w-16 animate-pulse rounded-lg border border-fuchsia-300/20 bg-fuchsia-500/10" />
      </div>
    );
  }

  if (isVerifiedUser) {
    const displayName = String(user.name || copy.userFallback);
    const displayEmail = String(user.email || "");
    const displayImage = String(user.image || "");
    const initial = displayName.trim().charAt(0) || copy.initialFallback;
    const subscriptionTier = user.profileSubscription?.isActive
      ? String(user.profileSubscription?.tier || "free").toLowerCase()
      : "free";
    const subscriptionLabel = subscriptionTier === "family"
      ? "FAMILY"
      : subscriptionTier === "vvip"
      ? "VVIP"
      : subscriptionTier === "premium"
        ? "PREMIUM"
        : subscriptionTier === "standard"
          ? "STANDARD"
          : "FREE";
    // 등급이 free 이거나 서버가 잔여를 못 세는 상태면 등급명만 — '0원 남음' 으로 쓰지 않는다.
    const passRemainingKRW = subscriptionTier === "free" ? null : readPassRemainingKRW(userAccess.accessState);
    const passRemainingLabel = passRemainingKRW === null
      ? ""
      : copy.passRemaining(formatKrwAmount(passRemainingKRW, locale));
    const subscriptionCls = subscriptionTier === "family"
      ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-100"
      : subscriptionTier === "vvip"
      ? "border-purple-300/50 bg-purple-500/15 text-purple-100"
      : subscriptionTier === "premium"
        ? "border-rose-300/50 bg-rose-500/15 text-rose-100"
        : subscriptionTier === "standard"
          ? "border-amber-300/50 bg-amber-500/15 text-amber-100"
          : "border-slate-400/30 bg-slate-700/40 text-slate-300";
    return (
      <div className="flex items-center gap-2">
        {displayImage ? (
          <img
            src={displayImage}
            alt={copy.profileAlt(displayName)}
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
          <span className="truncate text-sm text-violet-200/90">{copy.nameLabel(displayName)}</span>
          {displayEmail ? (
            <span className="truncate text-[11px] text-violet-200/60">{displayEmail}</span>
          ) : null}
        </span>
        {user.role === "admin" && (
          <Link
            href="/admin"
            className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-2.5 py-1 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/35"
          >
            {copy.admin}
          </Link>
        )}
        <Link
          href="/points"
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${subscriptionCls}`}
          title={passRemainingLabel ? `${copy.subscriptionTitle} · ${passRemainingLabel}` : copy.subscriptionTitle}
        >
          {subscriptionLabel}
          {passRemainingLabel ? (
            <span className="ml-1 font-normal opacity-80">· {passRemainingLabel}</span>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-400/30 bg-slate-700/40 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-600/50"
        >
          {copy.logout}
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
        {copy.login}
      </Link>
      <Link
        href="/signup"
        className="rounded-lg border border-fuchsia-300/50 bg-gradient-to-r from-violet-600/60 to-fuchsia-600/60 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
      >
        {copy.signup}
      </Link>
    </div>
  );
}
