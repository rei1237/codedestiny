"use client";

import { useSyncExternalStore } from "react";
import { getApiBaseUrl } from "./api-config";
import { authFetch, clearClientAuthState, logoutWithServer } from "./auth-client";
import { fetchBillingMe } from "./billing-client";
import { persistSanitizedAuthUser, readSanitizedAuthUser, type ClientAuthUser } from "./auth-storage";

export type AuthUser = ClientAuthUser & {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  points?: number;
};

export type AuthStatus = "checking" | "guest" | "login_submitting" | "authenticated" | "error";

export type AuthWallet = {
  coinBalance: number;
};

export type AuthState = {
  user: AuthUser | null;
  wallet: AuthWallet | null;
  status: AuthStatus;
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

type RegisterCredentials = {
  name: string;
  email: string;
  password: string;
  birthDate: string;
  birthTime: string;
  gender: "M" | "F" | "OTHER";
  nextPath?: string;
  apiBase?: string;
};

type LoginApiPayload = {
  ok?: boolean;
  authenticated?: boolean;
  message?: string;
  code?: string;
  error?: string;
  nextPath?: string;
  accessToken?: string;
  wallet?: {
    coinBalance?: number;
  } | null;
  user?: AuthUser;
  errors?: string[];
};

type MeApiPayload = {
  ok?: boolean;
  authenticated?: boolean;
  user?: AuthUser | null;
  wallet?: {
    coinBalance?: number;
  } | null;
  code?: string;
  error?: string;
};

function resolveUserId(user: unknown) {
  if (!user || typeof user !== "object") return "";
  const source = user as Record<string, unknown>;
  return String(source.id || source.userId || source._id || source.uid || "").trim();
}

function isAuthenticatedMePayload(payload: MeApiPayload | null | undefined) {
  if (!payload) return false;
  if (payload.authenticated === false) return false;
  const userId = resolveUserId(payload.user);
  if (!userId) return false;
  if (payload.authenticated === true) return true;
  // Backward-compatible support for legacy /api/auth/me payload shape.
  return payload.ok === true || payload.authenticated == null;
}

const IS_DEV = process.env.NODE_ENV !== "production";

let state: AuthState = {
  user: null,
  wallet: null,
  status: "checking",
  isAuthenticated: false,
  isLoading: false,
  isLoggingIn: false,
  authReady: false,
  error: null,
};

const subscribers = new Set<() => void>();
let refreshInFlight: Promise<AuthUser | null> | null = null;
let postLoginSyncInFlight: Promise<void> | null = null;
let meRequestSeq = 0;
let latestAppliedMeSeq = 0;

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
    } catch {
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
  } catch {
    // best-effort
  }
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("code-destiny-auth-sync");
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
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

const LOGIN_ME_RETRY_DELAYS_MS = [120] as const;

function isRetryableLoginSyncError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message === "auth_refresh_failed" || message === "AUTH_REFRESH_TEMPORARY_FAILURE";
}

async function resolveUserAfterLogin() {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= LOGIN_ME_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const meUser = await refreshAuth({ force: true, silent: attempt > 0 });
      if (meUser) return meUser;
      lastError = new Error("로그인은 완료되었지만 사용자 정보를 불러오지 못했습니다.");
    } catch (error) {
      const resolved = error instanceof Error ? error : new Error("로그인 인증 동기화 중 오류가 발생했습니다.");
      lastError = resolved;
      if (!isRetryableLoginSyncError(resolved) && attempt > 0) {
        break;
      }
    }

    if (attempt < LOGIN_ME_RETRY_DELAYS_MS.length) {
      await sleep(LOGIN_ME_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw (lastError || new Error("로그인은 완료되었지만 사용자 정보를 불러오지 못했습니다."));
}

function normalizeWallet(payloadWallet: MeApiPayload["wallet"], user: AuthUser | null): AuthWallet | null {
  const direct = Number(payloadWallet?.coinBalance);
  if (Number.isFinite(direct)) {
    return { coinBalance: direct };
  }

  const fromUser = Number(user?.points);
  if (Number.isFinite(fromUser)) {
    return { coinBalance: fromUser };
  }

  return null;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const rawText = await response.text();
  if (!rawText) return {} as T;

  try {
    return JSON.parse(rawText) as T;
  } catch {
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
    "fortune_user_profile",
    "fortune_profile_subscription",
    "fortune_profile_subscription_owner",
    "fortune_user_points",
    "fortune_billing_me",
    "fortune_billing_entitlements",
  ];
  staleKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore storage failures
    }
  });
}

function writeLocalJsonCache(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value ?? null));
  } catch {
    // ignore storage failures
  }
}

async function refreshProfileMeFromServer() {
  const response = await authFetch("/api/profile/me", {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) return;
  const payload = (await response.json().catch(() => null)) as { profile?: Record<string, unknown> } | null;
  if (!payload?.profile) return;

  writeLocalJsonCache("fortune_user_profile", payload.profile);

  const base = (readSanitizedAuthUser() || {}) as Record<string, unknown>;
  const merged = {
    ...base,
    ...(typeof payload.profile.displayName === "string" && payload.profile.displayName.trim()
      ? { name: String(payload.profile.displayName) }
      : {}),
    ...(typeof payload.profile.birthDate === "string" && payload.profile.birthDate.trim()
      ? { birthDate: String(payload.profile.birthDate) }
      : {}),
    ...(typeof payload.profile.birthTime === "string" && payload.profile.birthTime.trim()
      ? { birthTime: String(payload.profile.birthTime) }
      : {}),
  };
  resolveSafeUser(merged);
}

async function refreshBillingMeFromServer() {
  const result = await fetchBillingMe();
  if (!result.ok || !result.data) return;

  writeLocalJsonCache("fortune_billing_me", result.data);

  const base = (readSanitizedAuthUser() || {}) as Record<string, unknown>;
  const points = Number(result.data.balance);
  if (Number.isFinite(points)) {
    resolveSafeUser({
      ...base,
      points,
    });
    if (state.isAuthenticated) {
      setState({ wallet: { coinBalance: points } });
    }
    try {
      localStorage.setItem("fortune_user_points", String(points));
    } catch {
      // ignore storage failures
    }
  }
}

async function refreshSubscriptionMeFromServer() {
  const response = await authFetch("/api/subscription/me", {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) return;

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) return;

  writeLocalJsonCache("fortune_profile_subscription", payload);
}

export async function syncPostLoginData() {
  if (postLoginSyncInFlight) return postLoginSyncInFlight;

  postLoginSyncInFlight = Promise.allSettled([
    refreshProfileMeFromServer(),
    refreshBillingMeFromServer(),
    refreshSubscriptionMeFromServer(),
  ])
    .then(() => undefined)
    .finally(() => {
      postLoginSyncInFlight = null;
    });

  return postLoginSyncInFlight;
}

function applyResolvedUser(user: AuthUser | null) {
  if (!user) {
    setState({
      user: null,
      wallet: null,
      status: "guest",
      isAuthenticated: false,
    });
    return;
  }

  setState({
    user,
    wallet: normalizeWallet(null, user),
    status: "authenticated",
    isAuthenticated: true,
  });
}

function clearAuthStateHard() {
  clearClientAuthState();
  setState({
    user: null,
    wallet: null,
    status: "guest",
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

    const payload = (await response.json().catch(() => null)) as MeApiPayload | null;
    const code = String(payload?.code || payload?.error || "").trim().toUpperCase();
    if (code === "AUTH_REFRESH_TEMPORARY_FAILURE") {
      throw new Error("AUTH_REFRESH_TEMPORARY_FAILURE");
    }
    throw new Error("auth_refresh_failed");
  }

  const payload = (await response.json()) as MeApiPayload;
  const authenticated = isAuthenticatedMePayload(payload);
  const user = authenticated ? (resolveSafeUser(payload?.user) as AuthUser | null) : null;
  latestAppliedMeSeq = requestSeq;

  if (!authenticated || !user) {
    clearAuthStateHard();
    publishAuthSync("logout");
    return null;
  }

  setState({
    user,
    wallet: normalizeWallet(payload?.wallet, user),
    status: "authenticated",
    isAuthenticated: true,
    error: null,
  });

  return user;
}

export async function refreshAuth(options: { force?: boolean; silent?: boolean } = {}) {
  const { force = false, silent = false } = options;
  if (!force && refreshInFlight) return refreshInFlight;

  if (!silent) {
    setState({
      isLoading: true,
      status: state.isLoggingIn ? "login_submitting" : "checking",
    });
  }

  refreshInFlight = (async () => {
    try {
      const user = await loadMeFromServer();
      setState({
        authReady: true,
        isLoading: false,
        status: user ? "authenticated" : "guest",
      });
      if (user) {
        setState({ error: null });
      }
      return user;
    } catch (error) {
      setState({
        authReady: true,
        isLoading: false,
        status: state.isLoggingIn ? "login_submitting" : "guest",
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
    isLoading: true,
    status: "login_submitting",
    error: null,
  });

  clearStaleGuestCache();
  debugAuth("[auth] login started");

  const requestLogin = () => authFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      nextPath,
    }),
  }, {
    apiBase,
    retryOn401: false,
    timeoutMs: 9000,
    transientRetries: 0,
  });

  try {
    const response = await requestLogin();

    const payload = await parseJsonResponse<LoginApiPayload>(response);
    if (!response.ok) {
      throw new Error(normalizeAuthApiError(payload, "로그인에 실패했습니다."));
    }

    debugAuth("[auth] login api success");

    let meUser = resolveSafeUser(payload.user);
    if (meUser) {
      setState({
        user: meUser,
        wallet: normalizeWallet(payload.wallet || null, meUser),
        status: "authenticated",
        isAuthenticated: true,
        error: null,
      });
    } else {
      meUser = await refreshAuth({ force: true, silent: true });
      if (!meUser) {
        throw new Error("로그인은 완료되었지만 사용자 정보를 불러오지 못했습니다.");
      }
    }

    debugAuth("[auth] me loaded", meUser.id || meUser.userId || meUser._id || meUser.uid || "");
    publishAuthSync("login");
    void syncPostLoginData();
    void refreshAuth({ force: true, silent: true }).catch(() => {});

    debugAuth("[auth] auth store updated");
    return {
      user: state.user || meUser,
      nextPath: String(payload.nextPath || nextPath || "/"),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "로그인 처리 중 오류가 발생했습니다.";
    setState({
      user: null,
      wallet: null,
      isAuthenticated: false,
      status: "error",
      error: message,
    });
    throw error;
  } finally {
    setState({
      isLoggingIn: false,
      authReady: true,
      isLoading: false,
      status: state.isAuthenticated ? "authenticated" : (state.error ? "error" : "guest"),
    });
  }
}

export async function register(credentials: RegisterCredentials) {
  const apiBase = String(credentials.apiBase || getApiBaseUrl() || "").trim();
  const name = String(credentials.name || "").trim();
  const email = String(credentials.email || "").trim();
  const password = String(credentials.password || "");
  const birthDate = String(credentials.birthDate || "").trim();
  const birthTime = String(credentials.birthTime || "").trim();
  const gender = credentials.gender;
  const nextPath = String(credentials.nextPath || "/");

  if (!name || name.length < 2 || !email || password.length < 8 || !birthDate || !birthTime || !gender) {
    throw new Error("이름, 아이디(이메일), 비밀번호, 생년월일/시간을 다시 확인해 주세요.");
  }

  setState({
    isLoading: true,
    status: state.isAuthenticated ? "authenticated" : "checking",
    error: null,
  });

  clearStaleGuestCache();
  debugAuth("[auth] register started");

  const requestRegister = () => authFetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      password,
      birthDate,
      birthTime,
      gender,
      nextPath,
    }),
  }, {
    apiBase,
    retryOn401: false,
    timeoutMs: 9000,
    transientRetries: 1,
  });

  try {
    let response: Response | null = null;
    try {
      response = await requestRegister();
    } catch {
      await sleep(180);
      response = await requestRegister();
    }

    if (response.status === 503) {
      await sleep(180);
      response = await requestRegister();
    }

    if (!response) {
      throw new Error("회원가입 요청에 실패했습니다.");
    }

    const payload = await parseJsonResponse<LoginApiPayload>(response);
    if (!response.ok) {
      throw new Error(normalizeAuthApiError(payload, "회원가입에 실패했습니다."));
    }

    const meUser = await resolveUserAfterLogin();
    publishAuthSync("login");
    void syncPostLoginData();

    setState({ error: null });
    return {
      user: state.user || meUser,
      nextPath: String(payload.nextPath || nextPath || "/"),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "회원가입 처리 중 오류가 발생했습니다.";
    setState({
      user: null,
      wallet: null,
      isAuthenticated: false,
      status: "error",
      error: message,
    });
    throw error;
  } finally {
    setState({
      authReady: true,
      isLoading: false,
      status: state.isAuthenticated ? "authenticated" : (state.error ? "error" : "guest"),
    });
  }
}

export async function logout(apiBase?: string) {
  clearAuthStateHard();
  publishAuthSync("logout");
  await logoutWithServer(apiBase);
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
  readSanitizedAuthUser();
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
