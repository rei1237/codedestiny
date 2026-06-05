"use client";

import { useSyncExternalStore } from "react";
import { getApiBaseUrl } from "./api-config";
import { authFetch, clearClientAuthState, logoutWithServer } from "./auth-client";
import { fetchWithTimeout, toAbsoluteApiUrl } from "./http-client";
import { persistSanitizedAuthUser, readSanitizedAuthUser, type ClientAuthUser } from "./auth-storage";

export type AuthUser = ClientAuthUser & {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
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

const LOGIN_MAX_ATTEMPTS = 2;
const LOGIN_RETRY_BASE_DELAY_MS = 180;
const LOGIN_ATTEMPT_TIMEOUT_MS = 7000;
const AUTH_REFRESH_COOLDOWN_MS = 1500;

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
let meRequestSeq = 0;
let latestAppliedMeSeq = 0;
let lastRefreshCompletedAt = 0;

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

function resolveSafeUser(user: unknown): AuthUser | null {
  const safe = persistSanitizedAuthUser(user) as AuthUser | null;
  if (!safe) return null;
  const role = String(safe.role || "user");
  if (typeof document !== "undefined") {
    document.cookie = `fortune_auth_role=${encodeURIComponent(role)}; path=/; max-age=604800; samesite=lax`;
  }
  return safe;
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

  if (Number.isFinite(Number(patch.monthlyCredits)) && Number(patch.monthlyCredits) >= 0) {
    merged.monthlyCredits = Number(patch.monthlyCredits);
  }

  if (patch.profileSubscription && typeof patch.profileSubscription === "object") {
    const current = base.profileSubscription || {};
    const next = patch.profileSubscription;
    merged.profileSubscription = {
      tier: typeof next.tier === "string" && next.tier.trim() ? next.tier : current.tier || "free",
      isActive: typeof next.isActive === "boolean" ? next.isActive : !!current.isActive,
      expiresAt: typeof next.expiresAt === "string" ? next.expiresAt : (current.expiresAt ?? null),
      profileLimit: Number.isFinite(Number(next.profileLimit))
        ? Number(next.profileLimit)
        : (Number.isFinite(Number(current.profileLimit)) ? Number(current.profileLimit) : undefined),
      membershipCreditBalance: Number.isFinite(Number(next.membershipCreditBalance))
        ? Number(next.membershipCreditBalance)
        : (Number.isFinite(Number(current.membershipCreditBalance)) ? Number(current.membershipCreditBalance) : undefined),
      membershipCreditGranted: Number.isFinite(Number(next.membershipCreditGranted))
        ? Number(next.membershipCreditGranted)
        : (Number.isFinite(Number(current.membershipCreditGranted)) ? Number(current.membershipCreditGranted) : undefined),
      membershipCreditUsed: Number.isFinite(Number(next.membershipCreditUsed))
        ? Number(next.membershipCreditUsed)
        : (Number.isFinite(Number(current.membershipCreditUsed)) ? Number(current.membershipCreditUsed) : undefined),
    };
  }

  return merged;
}

function normalizeAuthApiError(payload: LoginApiPayload, fallbackMessage: string): string {
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.join(" ");
  }

  const code = String(payload.code || payload.error || "").trim().toUpperCase();
  if (code === "EMAIL_ALREADY_REGISTERED" || code === "DUPLICATE_EMAIL") {
    return "이미 가입된 이메일입니다. 로그인 페이지에서 로그인해 주세요.";
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
}

async function refreshProfileSubscriptionCache() {
  const response = await authFetch("/api/fortune/pig-coin/profile-subscription/status", {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) return;
  const statusPayload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!statusPayload) return;

  const base = readSanitizedAuthUser() as AuthUser | null;
  const merged = mergeAuthUsers(base, {
    profileSubscription: {
      tier: String(statusPayload.tier || "free"),
      isActive: !!statusPayload.isActive,
      expiresAt: typeof statusPayload.expiresAt === "string" ? statusPayload.expiresAt : null,
      profileLimit: Number.isFinite(Number(statusPayload.profileLimit)) ? Number(statusPayload.profileLimit) : undefined,
    },
  });
  resolveSafeUser(merged);
}

async function refreshEntitlements() {
  const response = await authFetch("/api/billing/balance", {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) return;
  const payload = (await response.json().catch(() => null)) as {
    monthlyCredits?: number;
    membershipCreditBalance?: number;
    membership?: {
      membershipCreditBalance?: number;
      membershipCreditGranted?: number;
      membershipCreditUsed?: number;
      tier?: string;
      isActive?: boolean;
      expiresAt?: string | null;
      profileLimit?: number;
    };
  } | null;
  if (!payload) return;

  const monthlyCredits = Number(
    payload.monthlyCredits
    ?? payload.membershipCreditBalance
    ?? payload.membership?.membershipCreditBalance,
  );
  const base = readSanitizedAuthUser() as AuthUser | null;
  const merged = mergeAuthUsers(base, {
    monthlyCredits: Number.isFinite(monthlyCredits) ? monthlyCredits : undefined,
    profileSubscription: {
      tier: String(payload.membership?.tier || "free"),
      isActive: !!payload.membership?.isActive,
      expiresAt: typeof payload.membership?.expiresAt === "string" ? payload.membership?.expiresAt : null,
      profileLimit: Number.isFinite(Number(payload.membership?.profileLimit))
        ? Number(payload.membership?.profileLimit)
        : undefined,
      membershipCreditBalance: Number.isFinite(monthlyCredits) ? monthlyCredits : undefined,
      membershipCreditGranted: Number.isFinite(Number(payload.membership?.membershipCreditGranted))
        ? Number(payload.membership?.membershipCreditGranted)
        : undefined,
      membershipCreditUsed: Number.isFinite(Number(payload.membership?.membershipCreditUsed))
        ? Number(payload.membership?.membershipCreditUsed)
        : undefined,
    },
  });
  resolveSafeUser(merged);
}

export async function syncPostLoginData() {
  await Promise.allSettled([
    refreshProfileSubscriptionCache(),
    refreshEntitlements(),
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

function clearAuthStateHard() {
  clearClientAuthState();
  setState({
    user: null,
    isAuthenticated: false,
  });
}

async function loadMeFromServer() {
  const requestSeq = ++meRequestSeq;
  const response = await authFetch("/api/auth/me", {
    method: "GET",
    cache: "no-store",
  }, { retryOn401: true });

  if (requestSeq < latestAppliedMeSeq) {
    return state.user;
  }

  if (!response.ok) {
    if ([401, 403].includes(response.status)) {
      latestAppliedMeSeq = requestSeq;
      clearAuthStateHard();
      publishAuthSync("logout");
      return null;
    }
    throw new Error("auth_refresh_failed");
  }

  const payload = (await response.json()) as { user?: AuthUser };
  const cachedUser = readSanitizedAuthUser() as AuthUser | null;
  const user = resolveSafeUser(mergeAuthUsers(cachedUser, payload?.user || null)) as AuthUser | null;
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

  if (!force) {
    if (refreshInFlight) return refreshInFlight;
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
    throw new Error("로그인이 이미 진행 중입니다. 잠시만 기다려 주세요.");
  }

  const apiBase = String(credentials.apiBase || getApiBaseUrl() || "").trim();
  const email = String(credentials.email || "").trim();
  const password = String(credentials.password || "");
  const nextPath = String(credentials.nextPath || "/");

  if (!email || password.length < 8) {
    throw new Error("아이디(이메일)와 비밀번호를 확인해 주세요.");
  }

  setState({
    isLoggingIn: true,
    error: null,
  });

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
          ? new Error("로그인 요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.")
          : null;
        lastError = timeoutError || (error instanceof Error ? error : new Error("네트워크 오류가 발생했습니다."));
        if (attempt < LOGIN_MAX_ATTEMPTS - 1) {
          await sleep(LOGIN_RETRY_BASE_DELAY_MS * (attempt + 1));
          continue;
        }
      }
    }

    if (!response) {
      throw (lastError || new Error("로그인 처리 중 오류가 발생했습니다."));
    }

    const payload = await parseJsonResponse<LoginApiPayload>(response);
    if (!response.ok) {
      throw new Error(normalizeAuthApiError(payload, "로그인에 실패했습니다."));
    }

    if (payload.accessToken) {
      try {
        localStorage.setItem("fortune_auth_token", String(payload.accessToken));
      } catch (e) {
        // ignore storage failures
      }
    }

    debugAuth("[auth] login api success");
    const payloadUser = resolveSafeUser(payload.user) as AuthUser | null;
    let resolvedUser = payloadUser;

    if (!resolvedUser) {
      resolvedUser = await refreshAuth({ force: true });
    } else {
      applyResolvedUser(payloadUser);
      void refreshAuth({ force: false, silent: true }).catch((error) => {
        debugAuth("[auth] silent me refresh skipped", error);
      });
    }

    if (!resolvedUser) {
      throw new Error("로그인은 완료되었지만 사용자 정보를 불러오지 못했습니다.");
    }

    debugAuth("[auth] user ready", resolvedUser.id || resolvedUser.userId || resolvedUser._id || resolvedUser.uid || "");

    void syncPostLoginData().then(() => {
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
    const message = error instanceof Error ? error.message : "로그인 처리 중 오류가 발생했습니다.";
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
  await logoutWithServer(apiBase);
  clearAuthStateHard();
  publishAuthSync("logout");
}

export function clearAuthError() {
  setState({ error: null });
}

export function setUser(user: AuthUser | null) {
  const safeUser = user ? resolveSafeUser(user) : null;
  applyResolvedUser(safeUser);
}

export function primeAuthFromCache() {
  if (typeof window === "undefined") return;
  const cached = readSanitizedAuthUser() as AuthUser | null;
  if (cached) {
    applyResolvedUser(cached);
  }
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
