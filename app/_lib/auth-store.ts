"use client";

import { useSyncExternalStore } from "react";
import { getApiBaseUrl } from "./api-config";
import {
  authFetch,
  clearClientAuthState,
  clearEntitlementLocalStorage,
  logoutWithServer,
  waitForAuthLogoutToSettle,
} from "./auth-client";
import { fetchWithTimeout, toAbsoluteApiUrl } from "./http-client";
import {
  clearAuthUserCacheVerified,
  isAuthUserCacheVerified,
  markAuthUserCacheVerified,
  persistSanitizedAuthUser,
  readSanitizedAuthUser,
  type ClientAuthUser,
} from "./auth-storage";
import { resolveMonthlyStoneBalance } from "./monthly-stone";
import { showToast } from "../components/Toast";

const AUTH_STORE_TEXT_TRANSLATIONS = {
  ko: {
    loginFailed: "로그인 처리 중 오류가 발생했어요.",
  },
  en: {
    loginFailed: "An error occurred while processing login.",
  },
  ja: {
    loginFailed: "ログイン処理中にエラーが発生しました。",
  },
} as const;

export type AuthUser = ClientAuthUser & {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  monthlyStoneBalance?: number;
  monthlyCredits?: number;
};

export type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;
  authReady: boolean;
  error: string | null;
};

type LoginCredentials = {
  email: string;
  password: string;
  nextPath?: string;
  apiBase?: string;
};

type LoginApiPayload = {
  ok?: boolean;
  message?: string;
  code?: string;
  error?: string;
  nextPath?: string;
  accessToken?: string;
  user?: AuthUser;
  errors?: string[];
};

type BillingBalanceData = {
  authenticated?: boolean;
  degraded?: boolean;
  monthlyStoneBalance?: number;
  monthlyCredits?: number;
  membershipCreditBalance?: number;
  membership?: {
    monthlyStoneBalance?: number;
    membershipCreditBalance?: number;
    membershipCreditGranted?: number;
    membershipCreditUsed?: number;
    tier?: string;
    isActive?: boolean;
    expiresAt?: string | null;
    profileLimit?: number;
  };
};

type BillingBalancePayload = BillingBalanceData & {
  data?: BillingBalanceData;
};

// "성공 후 응답 유실 → 재시도" 유령 오류를 피하기 위해 자동 재시도 없이 1회만 요청한다.
const LOGIN_MAX_ATTEMPTS = 1;
const LOGIN_RETRY_BASE_DELAY_MS = 180;
// Server-side worst case (connect + op timeouts across up to 3 transient-failure retries in
// handleLogin, worker/routes/auth.js) can run well past 20s — a shorter client timeout used to
// abort and show a false "failed" error while the server might still succeed in the background.
const LOGIN_ATTEMPT_TIMEOUT_MS = 45000;
const AUTH_REFRESH_COOLDOWN_MS = 1500;
// 활성 이용권이 캐시에 있고 갱신까지 이만큼 이상 남았으면 profile-subscription 재조회를 생략한다.
const SUBSCRIPTION_REFETCH_MARGIN_MS = 60 * 60 * 1000;

const IS_DEV = process.env.NODE_ENV !== "production";

let state: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isLoggingIn: false,
  authReady: false,
  error: null,
};

const subscribers = new Set<() => void>();
let refreshInFlight: Promise<AuthUser | null> | null = null;
let billingBalanceInFlight: Promise<number | null> | null = null;
let meRequestSeq = 0;
let latestAppliedMeSeq = 0;
let lastRefreshCompletedAt = 0;
let authMutationSeq = 0;

function debugAuth(...args: unknown[]) {
  if (!IS_DEV) return;
  console.debug(...args);
}

function snapshot(): AuthState {
  return state;
}

function emitChange() {
  subscribers.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      // ignore listener failures
    }
  });
}

function setState(partial: Partial<AuthState>) {
  const keys = Object.keys(partial) as Array<keyof AuthState>;
  if (keys.length === 0) return;

  let changed = false;
  for (const key of keys) {
    if (state[key] !== partial[key]) {
      changed = true;
      break;
    }
  }

  if (!changed) return;
  state = { ...state, ...partial };
  emitChange();
}

function publishAuthSync(event: "login" | "logout") {
  if (typeof window === "undefined") return;
  const payload = {
    source: "auth-store",
    event,
    at: Date.now(),
  };
  try {
    window.dispatchEvent(new CustomEvent("cd:auth-changed", { detail: payload }));
  } catch (e) {
    // best-effort
  }
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("code-destiny-auth-sync");
      channel.postMessage(payload);
      channel.close();
    }
  } catch (e) {
    // best-effort
  }
}

function publishMonthlyStoneBalanceSync(monthlyStoneBalance: number) {
  if (typeof window === "undefined") return;
  const payload = {
    source: "auth-store",
    event: "monthlyStoneBalance",
    monthlyStoneBalance,
    at: Date.now(),
  };
  try {
    window.dispatchEvent(new CustomEvent("cd:auth-changed", { detail: payload }));
  } catch (e) {
    // best-effort
  }
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("code-destiny-auth-sync");
      channel.postMessage(payload);
      channel.close();
    }
  } catch (e) {
    // best-effort
  }
}

function resolveSafeUser(user: unknown): AuthUser | null {
  const safe = persistSanitizedAuthUser(user) as AuthUser | null;
  if (!safe) return null;
  const role = String(safe.role || "user");
  if (typeof document !== "undefined") {
    document.cookie = `fortune_auth_role=${encodeURIComponent(role)}; path=/; max-age=604800; samesite=lax`;
  }
  return safe;
}

type ProfileSubscriptionShape = NonNullable<ClientAuthUser["profileSubscription"]> & { source?: string };

// 활성·미만료 이용권인지 판별 (tier가 free이거나 비활성이거나 만료됐으면 false).
function isActiveUnexpiredSubscription(sub: ProfileSubscriptionShape | null | undefined): boolean {
  if (!sub || !sub.isActive) return false;
  if (String(sub.tier || "free").toLowerCase() === "free") return false;
  if (typeof sub.expiresAt === "string" && sub.expiresAt.trim()) {
    const expiry = new Date(sub.expiresAt).getTime();
    if (Number.isFinite(expiry) && expiry <= Date.now()) return false;
  }
  return true;
}

// 권위 없는 강등 신호(토큰 폴백 / free / 비활성)인지 판별.
function isDowngradeSubscriptionPatch(sub: ProfileSubscriptionShape | null | undefined): boolean {
  if (!sub) return true;
  if (sub.source === "token") return true;
  if (!sub.isActive) return true;
  if (String(sub.tier || "free").toLowerCase() === "free") return true;
  return false;
}

// 유효한 활성 이용권이 캐시에 있고 갱신 여유가 충분하면 재조회를 생략해도 되는지 판별.
function shouldSkipSubscriptionRefetch(sub: ProfileSubscriptionShape | null | undefined): boolean {
  if (!isActiveUnexpiredSubscription(sub)) return false;
  if (!sub || typeof sub.expiresAt !== "string" || !sub.expiresAt.trim()) return false;
  const expiry = new Date(sub.expiresAt).getTime();
  if (!Number.isFinite(expiry)) return false;
  return expiry - Date.now() > SUBSCRIPTION_REFETCH_MARGIN_MS;
}

function mergeAuthUsers(base: AuthUser | null, patch: AuthUser | null): AuthUser | null {
  if (!base && !patch) return null;
  if (!base) return patch;
  if (!patch) return base;

  const merged: AuthUser = { ...base };

  for (const key of ["id", "userId", "_id", "uid", "name", "email", "image", "role", "plan"] as const) {
    const nextValue = patch[key];
    if (typeof nextValue === "string" && nextValue.trim()) {
      merged[key] = nextValue.trim();
    }
  }

  if (typeof patch.hasLocalAuth === "boolean") {
    merged.hasLocalAuth = patch.hasLocalAuth;
  }

  if (Number.isFinite(Number(patch.monthlyStoneBalance)) && Number(patch.monthlyStoneBalance) >= 0) {
    merged.monthlyStoneBalance = Number(patch.monthlyStoneBalance);
  } else if (Number.isFinite(Number(patch.monthlyCredits)) && Number(patch.monthlyCredits) >= 0) {
    merged.monthlyStoneBalance = Number(patch.monthlyCredits);
  }

  if (patch.profileSubscription && typeof patch.profileSubscription === "object") {
    const current = base.profileSubscription || {};
    const next = patch.profileSubscription;
    // 활성·미만료 이용권을 권위 없는 강등(토큰 폴백/free/비활성) 응답이 덮어쓰지 못하게 막는다.
    // 갱신 기간(expiresAt) 도래 전까지 캐시된 등급을 유지한다.
    if (isActiveUnexpiredSubscription(current) && isDowngradeSubscriptionPatch(next)) {
      merged.profileSubscription = current;
    } else {
      merged.profileSubscription = {
        tier: typeof next.tier === "string" && next.tier.trim() ? next.tier : current.tier || "free",
        isActive: typeof next.isActive === "boolean" ? next.isActive : !!current.isActive,
        expiresAt: typeof next.expiresAt === "string" ? next.expiresAt : (current.expiresAt ?? null),
        profileLimit: Number.isFinite(Number(next.profileLimit))
          ? Number(next.profileLimit)
          : (Number.isFinite(Number(current.profileLimit)) ? Number(current.profileLimit) : undefined),
        monthlyStoneBalance: Number.isFinite(Number(next.monthlyStoneBalance))
          ? Number(next.monthlyStoneBalance)
          : (Number.isFinite(Number(current.monthlyStoneBalance)) ? Number(current.monthlyStoneBalance) : undefined),
        membershipCreditBalance: Number.isFinite(Number(next.monthlyStoneBalance))
          ? Number(next.monthlyStoneBalance)
          : (Number.isFinite(Number(next.membershipCreditBalance))
            ? Number(next.membershipCreditBalance)
            : (Number.isFinite(Number(current.membershipCreditBalance)) ? Number(current.membershipCreditBalance) : undefined)),
        membershipCreditGranted: Number.isFinite(Number(next.membershipCreditGranted))
          ? Number(next.membershipCreditGranted)
          : (Number.isFinite(Number(current.membershipCreditGranted)) ? Number(current.membershipCreditGranted) : undefined),
        membershipCreditUsed: Number.isFinite(Number(next.membershipCreditUsed))
          ? Number(next.membershipCreditUsed)
          : (Number.isFinite(Number(current.membershipCreditUsed)) ? Number(current.membershipCreditUsed) : undefined),
      };
    }
  }

  return merged;
}

function normalizeAuthApiError(payload: LoginApiPayload, fallbackMessage: string): string {
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.join(" ");
  }

  const code = String(payload.code || payload.error || "").trim().toUpperCase();
  if (code === "EMAIL_ALREADY_REGISTERED" || code === "DUPLICATE_EMAIL") {
    return "이미 사용 중인 이메일이에요.";
  }
  if (code === "EMAIL_NOT_FOUND" || code === "USER_NOT_FOUND") {
    return "가입되지 않은 이메일이에요.";
  }
  if (code === "PASSWORD_MISMATCH" || code === "INVALID_PASSWORD") {
    return "비밀번호가 올바르지 않아요.";
  }
  if (code === "SOCIAL_ACCOUNT") {
    return "소셜 로그인으로 가입된 계정이에요. 구글/카카오/네이버로 로그인해 주세요.";
  }
  if (code === "INVALID_CREDENTIALS") {
    return "이메일 또는 비밀번호를 다시 확인해 주세요.";
  }

  return payload.message || fallbackMessage;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { name?: unknown };
  return String(maybe.name || "") === "AbortError";
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const rawText = await response.text();
  if (!rawText) return {} as T;

  try {
    return JSON.parse(rawText) as T;
  } catch (e) {
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const looksLikeHtml = contentType.includes("text/html") || /^\s*</.test(rawText);
    if (looksLikeHtml) {
      throw new Error("서버가 JSON 대신 HTML을 반환했습니다. 배포/캐시 상태를 확인해 주세요.");
    }
    throw new Error("서버 응답 파싱 중 오류가 발생했습니다.");
  }
}

function clearStaleGuestCache() {
  if (typeof window === "undefined") return;
  const staleKeys = [
    "fortune_auth_user",
    "fortune_profile_subscription",
    "fortune_profile_subscription_owner",
    "fortune_user_points",
  ];
  staleKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // ignore storage failures
    }
  });
  clearEntitlementLocalStorage();
}

async function refreshProfileSubscriptionCache(expectedAuthMutationSeq = authMutationSeq) {
  // 유효한(활성·미만료·갱신 여유) 이용권이 캐시에 있으면 재조회로 뒤집지 않고 즉시 반환한다.
  const cachedSub = (readSanitizedAuthUser() as AuthUser | null)?.profileSubscription;
  if (shouldSkipSubscriptionRefetch(cachedSub)) return;
  const response = await authFetch("/api/fortune/pig-coin/profile-subscription/status", {
    method: "GET",
    cache: "no-store",
  });
  if (expectedAuthMutationSeq !== authMutationSeq) return;
  if (!response.ok) return;
  const statusPayload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (expectedAuthMutationSeq !== authMutationSeq) return;
  if (!statusPayload) return;
  // DB 일시오류 시 서버는 HTTP 200 + {ok:false, degraded:true, tier:"free"} 스냅샷을
  // 반환한다(worker buildDbFallbackSubscriptionStatus). refreshBillingBalance와 대칭으로
  // 이를 걸러 유료 이용권이 free로 덮어써지는 것을 막는다.
  if (statusPayload.authenticated === false || statusPayload.degraded === true) return;

  const base = readSanitizedAuthUser() as AuthUser | null;
  const merged = mergeAuthUsers(base, {
    profileSubscription: {
      tier: String(statusPayload.tier || "free"),
      isActive: !!statusPayload.isActive,
      expiresAt: typeof statusPayload.expiresAt === "string" ? statusPayload.expiresAt : null,
      profileLimit: Number.isFinite(Number(statusPayload.profileLimit)) ? Number(statusPayload.profileLimit) : undefined,
    },
  });
  if (expectedAuthMutationSeq !== authMutationSeq) return;
  resolveSafeUser(merged);
}

export async function refreshBillingBalance(expectedAuthMutationSeq = authMutationSeq) {
  if (billingBalanceInFlight) return billingBalanceInFlight;

  const requestAuthMutationSeq = expectedAuthMutationSeq;
  const nextBillingBalanceInFlight = (async () => {
    // billing-client의 fetchBillingBalance와 동일한 URL(쿼리 없음)로 통일해
    // window.fetch 세션 캐시(paymentAccess kind)에서 단일 항목으로 dedup되게 한다.
    // compact 파라미터는 unlocks 포함 여부만 토글하며 membership 필드는 두 응답 모두 포함된다.
    const response = await authFetch("/api/billing/balance", {
      method: "GET",
      cache: "no-store",
    });
    if (requestAuthMutationSeq !== authMutationSeq) return null;
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as BillingBalancePayload | null;
    if (requestAuthMutationSeq !== authMutationSeq) return null;
    if (!payload) return null;
    const balanceData = payload.data && typeof payload.data === "object" ? payload.data : payload;
    if (balanceData.authenticated === false || balanceData.degraded === true) return null;

    const monthlyStoneBalance = resolveMonthlyStoneBalance(balanceData, balanceData.membership);
    const normalizedMonthlyStoneBalance = monthlyStoneBalance !== null
      ? monthlyStoneBalance
      : undefined;
    const base = readSanitizedAuthUser() as AuthUser | null;
    const membershipPatch = balanceData.membership && typeof balanceData.membership === "object"
      ? {
          tier: String(balanceData.membership.tier || "free"),
          isActive: !!balanceData.membership.isActive,
          expiresAt: typeof balanceData.membership.expiresAt === "string" ? balanceData.membership.expiresAt : null,
          profileLimit: Number.isFinite(Number(balanceData.membership.profileLimit))
            ? Number(balanceData.membership.profileLimit)
            : undefined,
          monthlyStoneBalance: normalizedMonthlyStoneBalance,
          membershipCreditBalance: normalizedMonthlyStoneBalance,
          membershipCreditGranted: Number.isFinite(Number(balanceData.membership.membershipCreditGranted))
            ? Number(balanceData.membership.membershipCreditGranted)
            : undefined,
          membershipCreditUsed: Number.isFinite(Number(balanceData.membership.membershipCreditUsed))
            ? Number(balanceData.membership.membershipCreditUsed)
            : undefined,
        }
      : {
          monthlyStoneBalance: normalizedMonthlyStoneBalance,
          membershipCreditBalance: normalizedMonthlyStoneBalance,
        };
    const merged = mergeAuthUsers(base, {
      monthlyStoneBalance: normalizedMonthlyStoneBalance,
      profileSubscription: membershipPatch,
    });
    if (requestAuthMutationSeq !== authMutationSeq) return null;
    const safe = resolveSafeUser(merged);
    if (safe) applyResolvedUser(safe);
    if (typeof normalizedMonthlyStoneBalance === "number") {
      publishMonthlyStoneBalanceSync(normalizedMonthlyStoneBalance);
      return normalizedMonthlyStoneBalance;
    }
    return null;
  })();
  billingBalanceInFlight = nextBillingBalanceInFlight;

  try {
    return await nextBillingBalanceInFlight;
  } finally {
    if (billingBalanceInFlight === nextBillingBalanceInFlight) {
      billingBalanceInFlight = null;
    }
  }
}

async function refreshEntitlements(expectedAuthMutationSeq = authMutationSeq) {
  await refreshBillingBalance(expectedAuthMutationSeq);
}

export async function syncPostLoginData(expectedAuthMutationSeq = authMutationSeq) {
  await Promise.allSettled([
    refreshProfileSubscriptionCache(expectedAuthMutationSeq),
    refreshEntitlements(expectedAuthMutationSeq),
  ]);
}

function applyResolvedUser(user: AuthUser | null) {
  if (!user) {
    setState({
      user: null,
      isAuthenticated: false,
    });
    return;
  }

  setState({
    user,
    isAuthenticated: true,
  });
}

// 재방문 부트스트랩에서 /api/auth/me 왕복이 끝나기 전까지 헤더 위젯이 아무 등급도
// 렌더하지 못해 스켈레톤/로그인버튼/FREE가 잠깐 노출되던 문제를 없앤다. 서버가 한 번
// 확인해 둔(fortune_auth_cache_verified_v1) 로컬 캐시가 있으면 그 사용자로 즉시 시드하고,
// refreshAuth가 뒤이어 백그라운드에서 /api/auth/me로 재검증한다(stale-while-revalidate).
let bootstrapSeeded = false;
function seedBootstrapFromVerifiedCache() {
  if (bootstrapSeeded) return;
  bootstrapSeeded = true;
  if (typeof window === "undefined") return;
  // 이미 인증 상태가 확정된 경우엔 캐시로 덮어쓰지 않는다.
  if (state.authReady || state.user) return;

  const cachedUser = readSanitizedAuthUser() as AuthUser | null;
  if (!cachedUser) return;
  // 서버가 검증한 스코프와 일치할 때만 신뢰한다(로그인 안 한 방문자에게 stale 프로필 노출 방지).
  if (!isAuthUserCacheVerified(cachedUser)) return;

  // lastRefreshCompletedAt은 0으로 두어 직후 refreshAuth(force:false)가 재검증을 건너뛰지 않게 한다.
  setState({
    user: cachedUser,
    isAuthenticated: true,
    authReady: true,
  });
}

// 소비(차감) 시 billing-client가 쏘는 표준 브로드캐스트(cd:billing-balance-updated)를 받아,
// 네트워크 없이 스토어의 월정석 잔량을 즉시 갱신한다(차감 즉시·정확 반영). detail에서 잔량을
// 못 뽑으면(코인만 실린 이벤트 등) 무시한다 — 월정석을 0으로 지우는 회귀 방지.
function handleBillingBalanceUpdatedEvent(event: Event) {
  try {
    const detail = (event as CustomEvent<Record<string, unknown>>)?.detail || {};
    const resolved = resolveMonthlyStoneBalance(detail);
    if (resolved === null) return;
    if (!state.user) return; // 미로그인 사용자에게 유령 유저를 만들지 않는다.
    const merged = mergeAuthUsers(state.user, {
      monthlyStoneBalance: resolved,
      profileSubscription: {
        monthlyStoneBalance: resolved,
        membershipCreditBalance: resolved,
      },
    });
    const safe = resolveSafeUser(merged); // localStorage 스냅샷도 갱신(결제창·타 탭 storage 반영)
    if (safe) applyResolvedUser(safe);
  } catch {
    // best-effort
  }
}

// 소비 외 서버 변경(지급/만료/타 기기)도 탭 복귀 시 빠르게 반영. refreshAuth는 1.5s 쿨다운을 존중.
function refreshBalanceOnForeground() {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  if (!state.user) return;
  refreshAuth({ silent: true }).catch(() => {});
}

if (typeof window !== "undefined") {
  seedBootstrapFromVerifiedCache();
  window.addEventListener("cd:billing-balance-updated", handleBillingBalanceUpdatedEvent as EventListener);
  document.addEventListener("visibilitychange", refreshBalanceOnForeground);
  window.addEventListener("focus", refreshBalanceOnForeground);
}

function clearAuthStateHard() {
  authMutationSeq += 1;
  refreshInFlight = null;
  billingBalanceInFlight = null;
  lastRefreshCompletedAt = 0;
  clearClientAuthState();
  setState({
    user: null,
    isAuthenticated: false,
  });
}

const SESSION_EXPIRED_MESSAGE: Record<string, string> = {
  ko: "세션이 만료되었습니다. 다시 로그인해 주세요.",
  en: "Your session has expired. Please sign in again.",
  ja: "セッションの有効期限が切れました。もう一度ログインしてください。",
  zh: "登录状态已过期，请重新登录。",
};

function resolveSessionExpiredMessage(): string {
  let lang = "ko";
  try {
    const runtimeLang = (window as typeof window & { cdGetCurrentLanguage?: () => string }).cdGetCurrentLanguage?.();
    const stored = runtimeLang || window.localStorage.getItem("cd_lang") || "";
    const normalized = String(stored).trim().toLowerCase();
    if (normalized.startsWith("en")) lang = "en";
    else if (normalized.startsWith("ja")) lang = "ja";
    else if (normalized.startsWith("zh")) lang = "zh";
  } catch (e) {
    // fall back to Korean
  }
  return SESSION_EXPIRED_MESSAGE[lang] || SESSION_EXPIRED_MESSAGE.ko;
}

function isAuthRedirectExemptPath(pathname: string): boolean {
  const path = String(pathname || "");
  return path === "/"
    || path.startsWith("/login")
    || path.startsWith("/signup")
    || path.startsWith("/admin/login");
}

// 세션 만료 디바운스 — 여러 기능 호출이 동시에 401을 받아도 토스트/리다이렉트는 1회만.
let lastSessionInvalidationAt = 0;
const SESSION_INVALIDATION_DEBOUNCE_MS = 1500;

// 서버가 "확정적 미인증(401/403 또는 non-degraded authenticated:false)"을 알렸을 때 호출한다.
// 일시적 오류(5xx/네트워크/degraded)에는 호출하지 않는다 — degrade-not-throw 유지.
// redirect:true는 사용자가 능동적으로 기능을 눌러 401을 받은 경우(useCoinGate 등)에만 사용한다.
export function handleSessionInvalidated(options: { redirect?: boolean } = {}) {
  if (typeof window === "undefined") return;

  const wasAuthenticated = state.isAuthenticated || !!state.user;
  const now = Date.now();
  const recentlyHandled = now - lastSessionInvalidationAt < SESSION_INVALIDATION_DEBOUNCE_MS;
  lastSessionInvalidationAt = now;

  clearAuthStateHard();
  clearAuthUserCacheVerified();
  publishAuthSync("logout");

  // 버스트 중복 호출은 상태 정리만 하고 토스트/리다이렉트는 생략.
  if (recentlyHandled) return;

  // 이미 로그아웃 상태(진짜 게스트)였다면 만료 안내를 띄우지 않는다.
  if (wasAuthenticated) {
    try {
      showToast(resolveSessionExpiredMessage(), "info");
    } catch (e) {
      // best-effort
    }
  }

  if (options.redirect && !isAuthRedirectExemptPath(window.location.pathname)) {
    try {
      const { pathname, search } = window.location;
      const nextParam = encodeURIComponent(`${pathname}${search || ""}`);
      window.location.assign(`/login?next=${nextParam}&returnTo=${nextParam}&redirect=${nextParam}`);
    } catch (e) {
      // best-effort
    }
  }
}

async function loadMeFromServer() {
  const requestSeq = ++meRequestSeq;
  const requestAuthMutationSeq = authMutationSeq;
  const response = await authFetch("/api/auth/me", {
    method: "GET",
    cache: "no-store",
  }, { retryOn401: true });

  if (requestAuthMutationSeq !== authMutationSeq) {
    return state.user;
  }

  if (requestSeq < latestAppliedMeSeq) {
    return state.user;
  }

  if (!response.ok) {
    const cachedUser = readSanitizedAuthUser() as AuthUser | null;
    if (response.status >= 500 && cachedUser) {
      latestAppliedMeSeq = requestSeq;
      applyResolvedUser(cachedUser);
      return cachedUser;
    }
    if ([401, 403].includes(response.status)) {
      latestAppliedMeSeq = requestSeq;
      handleSessionInvalidated({ redirect: false });
      return null;
    }
    throw new Error("auth_refresh_failed");
  }

  const payload = (await response.json()) as { authenticated?: boolean; degraded?: boolean; user?: AuthUser };
  if (requestAuthMutationSeq !== authMutationSeq) {
    return state.user;
  }

  if (payload?.authenticated === false) {
    const cachedUser = readSanitizedAuthUser() as AuthUser | null;
    if (payload.degraded && cachedUser) {
      latestAppliedMeSeq = requestSeq;
      applyResolvedUser(cachedUser);
      return cachedUser;
    }
    latestAppliedMeSeq = requestSeq;
    handleSessionInvalidated({ redirect: false });
    return null;
  }

  const cachedUser = readSanitizedAuthUser() as AuthUser | null;
  // handleMe가 DB 일시오류 시 토큰 폴백 유저(profileSubscription.source:"token", tier:free)를
  // authenticated:true로 반환한다. 권위 없는 이 이용권이 캐시된 활성 등급을 덮어쓰지 않도록
  // 병합 전에 제거한다(mergeAuthUsers 다운그레이드 가드와 이중 방어).
  let mePatch = payload?.user || null;
  const patchSubSource = (mePatch?.profileSubscription as { source?: string } | undefined)?.source;
  if (mePatch && (payload?.degraded === true || patchSubSource === "token")) {
    const rest = { ...(mePatch as AuthUser) };
    delete rest.profileSubscription;
    mePatch = rest;
  }
  const user = resolveSafeUser(mergeAuthUsers(cachedUser, mePatch)) as AuthUser | null;
  latestAppliedMeSeq = requestSeq;

  if (!user) {
    clearAuthStateHard();
    publishAuthSync("logout");
    return null;
  }

  applyResolvedUser(user);
  return user;
}

export async function refreshAuth(options: { force?: boolean; silent?: boolean } = {}) {
  const { force = false, silent = false } = options;

  // 진행 중인 요청이 있으면 force 여부와 무관하게 공유한다. (마운트 위젯·게이트가
  // 동시에 force:true로 /api/auth/me를 중복 발사하던 것을 한 요청으로 병합)
  if (refreshInFlight) return refreshInFlight;
  if (!force) {
    if (state.authReady && (Date.now() - lastRefreshCompletedAt) < AUTH_REFRESH_COOLDOWN_MS) {
      return state.user;
    }
  }

  if (!silent) {
    setState({ isLoading: true });
  }

  refreshInFlight = (async () => {
    try {
      const user = await loadMeFromServer();
      lastRefreshCompletedAt = Date.now();
      setState({
        authReady: true,
        isLoading: false,
      });
      if (user) {
        setState({ error: null });
      }
      return user;
    } catch (error) {
      setState({
        authReady: true,
        isLoading: false,
      });
      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function login(credentials: LoginCredentials) {
  if (state.isLoggingIn) {
    throw new Error("로그인이 이미 진행 중이에요. 잠시만 기다려 주세요.");
  }

  const apiBase = String(credentials.apiBase || getApiBaseUrl() || "").trim();
  const email = String(credentials.email || "").trim();
  const password = String(credentials.password || "");
  const nextPath = String(credentials.nextPath || "/");

  if (!email || password.length < 8) {
    throw new Error("이메일과 비밀번호를 확인해 주세요.");
  }

  setState({
    isLoggingIn: true,
    error: null,
  });

  try {
    await waitForAuthLogoutToSettle();
  } catch (e) {
    void e;
  }

  authMutationSeq += 1;
  refreshInFlight = null;
  billingBalanceInFlight = null;
  lastRefreshCompletedAt = 0;
  const loginAuthMutationSeq = authMutationSeq;

  clearStaleGuestCache();
  debugAuth("[auth] login started");
  const loginStartedAt = Date.now();

  try {
    let response: Response | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < LOGIN_MAX_ATTEMPTS; attempt += 1) {
      try {
      const nextResponse = await fetchWithTimeout(toAbsoluteApiUrl("/api/auth/login", apiBase), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          nextPath,
        }),
      }, LOGIN_ATTEMPT_TIMEOUT_MS);

        if (nextResponse.status >= 500 && attempt < LOGIN_MAX_ATTEMPTS - 1) {
          await sleep(LOGIN_RETRY_BASE_DELAY_MS * (attempt + 1));
          continue;
        }

        response = nextResponse;
        break;
      } catch (error) {
        const timeoutError = isAbortError(error)
          ? new Error("로그인 요청 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.")
          : null;
        lastError = timeoutError || (error instanceof Error ? error : new Error("네트워크 오류가 발생했어요."));
        if (attempt < LOGIN_MAX_ATTEMPTS - 1) {
          await sleep(LOGIN_RETRY_BASE_DELAY_MS * (attempt + 1));
          continue;
        }
      }
    }

    if (!response) {
      throw (lastError || new Error("로그인 처리 중 오류가 발생했어요."));
    }

    const payload = await parseJsonResponse<LoginApiPayload>(response);
    if (!response.ok) {
      throw new Error(normalizeAuthApiError(payload, "로그인에 실패했어요."));
    }

    try {
      localStorage.removeItem("fortune_auth_token");
    } catch (e) {
      // ignore storage failures
    }

    debugAuth("[auth] login api success");
    const payloadUser = resolveSafeUser(payload.user) as AuthUser | null;
    let resolvedUser = payloadUser;

    if (!resolvedUser) {
      resolvedUser = await refreshAuth({ force: true });
    } else {
      // The login response already carries the full normalized user (same shape
      // /api/auth/me returns) — an extra silent /api/auth/me round trip here would
      // just re-fetch data we already have.
      applyResolvedUser(payloadUser);
    }

    if (!resolvedUser) {
      throw new Error("로그인은 완료됐지만 사용자 정보를 불러오지 못했어요.");
    }

    debugAuth("[auth] user ready", resolvedUser.id || resolvedUser.userId || resolvedUser._id || resolvedUser.uid || "");

    markAuthUserCacheVerified((readSanitizedAuthUser() as AuthUser | null) || resolvedUser);

    void syncPostLoginData(loginAuthMutationSeq).then(() => {
      if (loginAuthMutationSeq !== authMutationSeq) return;
      const mergedUser = (readSanitizedAuthUser() as AuthUser | null) || resolvedUser;
      applyResolvedUser(mergedUser);
      debugAuth("[auth] post-login sync completed");
    });

    applyResolvedUser((readSanitizedAuthUser() as AuthUser | null) || resolvedUser);
    debugAuth("[auth] auth store updated");
    publishAuthSync("login");

    debugAuth("[auth] login latency(ms)", Date.now() - loginStartedAt);
    setState({ error: null });
    return {
      user: state.user || resolvedUser,
      nextPath: String(payload.nextPath || nextPath || "/"),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : AUTH_STORE_TEXT_TRANSLATIONS.ko.loginFailed;
    setState({ error: message });
    throw error;
  } finally {
    setState({
      isLoggingIn: false,
      authReady: true,
      isLoading: false,
    });
  }
}

export async function logout(apiBase?: string) {
  clearAuthStateHard();
  publishAuthSync("logout");
  void logoutWithServer(apiBase);
}

export function clearAuthError() {
  setState({ error: null });
}

export function setUser(user: AuthUser | null) {
  const safeUser = user ? resolveSafeUser(user) : null;
  applyResolvedUser(safeUser);
}

export function primeAuthFromCache() {
  if (typeof window === "undefined") return null;
  return readSanitizedAuthUser() as AuthUser | null;
}

export function subscribeAuth(listener: () => void) {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function getAuthState() {
  return snapshot();
}

export function useAuthStore() {
  return useSyncExternalStore(subscribeAuth, getAuthState, getAuthState);
}
