import { getApiBaseUrl } from "./api-config";
import { fetchWithTimeout, toAbsoluteApiUrl } from "./http-client";
import { persistSanitizedAuthUser } from "./auth-storage";
import { AI_LOCALE_HEADER } from "@/lib/i18n/ai-locale";
import { detectLocale } from "@/lib/i18n/dictionary";

// Must match CACHE_REFRESH_HEADER in user-session-cache.ts — tells that module's
// window.fetch monkeypatch to bypass its cache and fabricated guest response, since this
// store is the authoritative source of truth and its "no-store" intent must reach the network.
const CACHE_REFRESH_HEADER = "x-code-destiny-cache-refresh";
// worker/routes/auth.js 의 isMobileAppAuthRequest 와 짝을 이룬다. 한쪽만 바꾸면
// 앱의 로그인·로그아웃·세션갱신이 403 csrf_origin_mismatch 로 죽는다.
const MOBILE_APP_RUNTIME_HEADER = "x-code-destiny-runtime";
// 앱은 리프레시 쿠키를 받을 수 없어(SameSite=Lax + https://localhost 출처) 서버가 JSON 본문으로
// 리프레시 토큰을 내려주고, 갱신·로그아웃 때 이 헤더로 되돌려 받는다.
// worker/routes/auth.js 의 APP_REFRESH_TOKEN_HEADER 와 짝을 이룬다.
const MOBILE_APP_REFRESH_TOKEN_HEADER = "x-code-destiny-refresh-token";
const MOBILE_APP_REFRESH_TOKEN_KEY = "fortune_auth_refresh_token";
const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";
const AUTH_LOGOUT_INFLIGHT_KEY = "fortune_auth_logout_inflight_at";
const LOGOUT_TIMEOUT_MS = 3500;
const LOGOUT_INFLIGHT_TTL_MS = 5000;
const LOGOUT_INFLIGHT_POLL_MS = 80;
// 같은-탭 실제 로그아웃(logoutInFlight 프로미스)은 아래에서 온전히 await한다. 이 상한은
// 프로미스가 없고 persisted 마커만 남은 경우(다른 페이지/탭에서 로그아웃 후 전체 새로고침으로
// 진입)에만 적용된다 — 그 로그아웃 fetch는 이미 끝났거나 중단됐으므로 짧게만 확인하고 진행한다.
// (계정 전환 재로그인이 최대 3.5s 블로킹되던 문제 해소.)
const PERSISTED_LOGOUT_SETTLE_CAP_MS = 800;
// 🔴 authFetch 는 지금까지 요청 자체에 상한이 없었다. 그래서 401 이면
// /api/auth/me → /api/auth/refresh → /api/auth/me 3연쇄가 무기한 매달릴 수 있었고,
// 호출부(useCoinGate 등)의 Promise.race 상한은 "기다림"만 끊을 뿐 요청은 살려 뒀다.
// 값은 정적 셸이 같은 경로에 이미 검증해 쓰고 있는 상한과 맞춘다(index.html resolveTimeoutMs).
const AUTH_FETCH_TIMEOUT_MS = 22000;
const AUTH_REFRESH_TIMEOUT_MS = 20000;

type RefreshSessionState = "success" | "invalid" | "transient";

let refreshInFlight: Promise<RefreshSessionState> | null = null;
const authGetInFlight = new Map<string, Promise<Response>>();
let logoutInFlight: Promise<void> | null = null;

const AUTH_CLIENT_TEXT_TRANSLATIONS = {
  ko: {
    refreshUnavailable: "인증 갱신을 잠시 사용할 수 없습니다. 다시 시도해 주세요.",
  },
  en: {
    refreshUnavailable: "Authentication refresh is temporarily unavailable. Please retry.",
  },
  ja: {
    refreshUnavailable: "認証の更新は一時的に利用できません。もう一度お試しください。",
  },
} as const;

const AUTH_LOCAL_STORAGE_KEYS = [
  "fortune_auth_token",
  MOBILE_APP_REFRESH_TOKEN_KEY,
  "fortune_auth_user",
  "fortune_auth_role",
  "user",
  "cdToken",
];

// 계정 귀속 권한/결제 캐시 — 공용 기기에서 다음 사용자에게 상속되면 안 되는 키.
const ENTITLEMENT_LOCAL_STORAGE_KEYS = [
  "fortune_profile_subscription",
  "fortune_profile_subscription_owner",
  "fortune_user_points",
];

const ENTITLEMENT_LOCAL_STORAGE_PREFIXES = [
  "cd_premium",
  "premium:",
  "cd_tetogen",
  "fortune_pending_",
];

export function clearEntitlementLocalStorage() {
  try {
    ENTITLEMENT_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    const swept: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && ENTITLEMENT_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        swept.push(key);
      }
    }
    swept.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    // ignore storage failures
  }
}

const AUTH_COOKIE_NAMES = [
  "fortune_auth_token",
  "fortune_auth_refresh",
  "fortune_auth_role",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
];

function buildRefreshTransientResponse(originalStatus: number) {
  return new Response(
    JSON.stringify({
      ok: false,
      code: "AUTH_REFRESH_TEMPORARY_FAILURE",
      message: AUTH_CLIENT_TEXT_TRANSLATIONS.en.refreshUnavailable,
      originalStatus,
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

function clearLegacyClientAccessToken() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("fortune_auth_token");
  } catch (e) {
    // ignore storage failures
  }
}

export function isMobileAppRuntime() {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_RUNTIME_TARGET === "mobile-app";
  const runtimeTarget = (window as unknown as { __CODE_DESTINY_RUNTIME_TARGET?: string }).__CODE_DESTINY_RUNTIME_TARGET
    || document.documentElement.dataset.runtimeTarget
    || process.env.NEXT_PUBLIC_RUNTIME_TARGET;
  return runtimeTarget === "mobile-app";
}

function readMobileAppAccessToken() {
  if (typeof window === "undefined" || !isMobileAppRuntime()) return "";
  try {
    return String(localStorage.getItem("fortune_auth_token") || "").trim();
  } catch (e) {
    return "";
  }
}

export function persistMobileAppAccessToken(accessToken: string) {
  if (typeof window === "undefined" || !isMobileAppRuntime()) return;
  const token = String(accessToken || "").trim();
  if (!token) return;
  try {
    localStorage.setItem("fortune_auth_token", token);
  } catch (e) {
    void e;
  }
}

function readMobileAppRefreshToken() {
  if (typeof window === "undefined" || !isMobileAppRuntime()) return "";
  try {
    return String(localStorage.getItem(MOBILE_APP_REFRESH_TOKEN_KEY) || "").trim();
  } catch (e) {
    return "";
  }
}

// 서버는 회전할 때마다 새 리프레시 토큰을 준다. 앱에서 이걸 갱신하지 않으면 다음 갱신이
// 이미 회전된 토큰을 보내 재사용 탐지에 걸리고 전 세션이 폐기된다.
export function persistMobileAppRefreshToken(refreshToken: string) {
  if (typeof window === "undefined" || !isMobileAppRuntime()) return;
  const token = String(refreshToken || "").trim();
  if (!token) return;
  try {
    localStorage.setItem(MOBILE_APP_REFRESH_TOKEN_KEY, token);
  } catch (e) {
    void e;
  }
}

// 앱 전용 인증 헤더. 웹에서는 빈 객체라 기존 쿠키 동작이 그대로다.
export function mobileAppAuthHeaders() {
  if (!isMobileAppRuntime()) return {} as Record<string, string>;
  const headers: Record<string, string> = { [MOBILE_APP_RUNTIME_HEADER]: "mobile-app" };
  const refreshToken = readMobileAppRefreshToken();
  if (refreshToken) headers[MOBILE_APP_REFRESH_TOKEN_HEADER] = refreshToken;
  return headers;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readLogoutInFlightStartedAt(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(AUTH_LOGOUT_INFLIGHT_KEY) || sessionStorage.getItem(AUTH_LOGOUT_INFLIGHT_KEY) || 0);
  } catch (e) {
    return 0;
  }
}

function markLogoutInFlight() {
  if (typeof window === "undefined") return;
  const value = String(Date.now());
  try {
    localStorage.setItem(AUTH_LOGOUT_INFLIGHT_KEY, value);
  } catch (e) {
    void e;
  }
  try {
    sessionStorage.setItem(AUTH_LOGOUT_INFLIGHT_KEY, value);
  } catch (e) {
    void e;
  }
}

function clearLogoutInFlightMarker() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_LOGOUT_INFLIGHT_KEY);
  } catch (e) {
    void e;
  }
  try {
    sessionStorage.removeItem(AUTH_LOGOUT_INFLIGHT_KEY);
  } catch (e) {
    void e;
  }
}

export async function waitForAuthLogoutToSettle(timeoutMs = LOGOUT_TIMEOUT_MS) {
  if (logoutInFlight) {
    try {
      await logoutInFlight;
    } catch (e) {
      void e;
    }
    return;
  }

  const startedAt = readLogoutInFlightStartedAt();
  if (!Number.isFinite(startedAt) || startedAt <= 0) return;

  const deadline = Math.min(
    startedAt + LOGOUT_INFLIGHT_TTL_MS,
    Date.now() + Math.min(timeoutMs, PERSISTED_LOGOUT_SETTLE_CAP_MS),
  );
  while (Date.now() < deadline) {
    if (readLogoutInFlightStartedAt() <= 0) return;
    await sleep(Math.min(LOGOUT_INFLIGHT_POLL_MS, Math.max(0, deadline - Date.now())));
  }
  clearLogoutInFlightMarker();
}

function isAuthoritativeAuthPath(url: string) {
  try {
    const pathname = new URL(url, "http://localhost").pathname;
    return pathname === "/api/auth/me" || pathname === "/api/auth/refresh";
  } catch (e) {
    return false;
  }
}

function buildAuthRequest(targetUrl: string, init: RequestInit = {}, clientSource?: string) {
  const headers = new Headers(init.headers || {});
  const normalizedClientSource = String(clientSource || "").trim().toLowerCase();
  if (normalizedClientSource && !headers.has("X-Code-Destiny-Client")) {
    headers.set("X-Code-Destiny-Client", normalizedClientSource);
  }
  const accessToken = readMobileAppAccessToken();
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (isMobileAppRuntime()) {
    // 앱은 https://localhost 출처라 워커의 CSRF 가드가 cross-site 로 보고 막는다.
    // 이 헤더 + 앱 출처가 둘 다 맞을 때만 가드가 면제된다(worker/routes/auth.js
    // isMobileAppAuthRequest). 쿠키가 아닌 Bearer 토큰 인증이라 CSRF 가 성립하지 않는다.
    headers.set(MOBILE_APP_RUNTIME_HEADER, "mobile-app");
  }
  if (isAuthoritativeAuthPath(targetUrl)) {
    headers.set(CACHE_REFRESH_HEADER, "1");
  }
  if (!headers.has("X-Request-ID")) {
    const requestId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `cd-client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    headers.set("X-Request-ID", requestId.slice(0, 120));
  }
  // AI 응답 언어. 모든 React AI 클라이언트가 authFetch 를 타므로 여기 한 줄이면 전 기능이 커버된다.
  // 워커는 worker/lib/ai-locale-context.js 가 이 헤더를 읽어 요청 스코프에 심는다.
  if (!headers.has(AI_LOCALE_HEADER)) {
    headers.set(AI_LOCALE_HEADER, detectLocale());
  }

  return new Request(targetUrl, {
    ...init,
    headers,
    credentials: "include",
    cache: init.cache || "no-store",
  });
}

function shouldTryRefresh(url: string) {
  try {
    const parsed = new URL(url, "http://localhost");
    const path = parsed.pathname;
    if (!path.startsWith("/api/")) return false;
    if (path === "/api/auth/refresh") return false;
    if (path === "/api/auth/login") return false;
    if (path === "/api/auth/register") return false;
    if (path === "/api/auth/logout") return false;
    if (path === "/api/auth/oauth/complete") return false;
    return true;
  } catch (e) {
    return false;
  }
}

function publishAuthSync(event: "login" | "logout") {
  if (typeof window === "undefined") return;
  const payload = { source: "auth-client", event, at: Date.now() };

  try {
    window.dispatchEvent(new CustomEvent("cd:auth-changed", { detail: payload }));
  } catch (e) {
    // best-effort
  }

  try {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch (e) {
    // best-effort
  }
}

// 서버가 "확정적 미인증"을 알린 터미널 신호. auth-store 가 이 이벤트를 받아
// handleSessionInvalidated 로 강제 로그아웃한다(auth-store → auth-client 단방향 import 를
// 유지하기 위해 직접 호출 대신 이벤트를 쓴다). 정적 셸도 같은 채널을 들을 수 있다.
export const AUTH_SESSION_INVALIDATED_EVENT = "cd:auth-session-invalidated";

function dispatchSessionInvalidated(source: string) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(AUTH_SESSION_INVALIDATED_EVENT, { detail: { source, at: Date.now() } }),
    );
  } catch (e) {
    // best-effort
  }
}

export function clearClientAuthState() {
  if (typeof window === "undefined") return;
  refreshInFlight = null;
  authGetInFlight.clear();
  try {
    AUTH_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    // ignore storage failures
  }
  clearEntitlementLocalStorage();
  try {
    sessionStorage.clear();
  } catch (e) {
    // ignore storage failures
  }
  try {
    const Kakao = (window as unknown as { Kakao?: { Auth?: { logout?: () => void } } }).Kakao;
    Kakao?.Auth?.logout?.();
  } catch (e) {
    // ignore SDK logout failures
  }
  AUTH_COOKIE_NAMES.forEach((name) => {
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax; secure`;
  });
}

async function requestTokenRefresh(apiBase: string, clientSource?: string) {
  const headers = new Headers({ [CACHE_REFRESH_HEADER]: "1", ...mobileAppAuthHeaders() });
  const normalizedClientSource = String(clientSource || "").trim().toLowerCase();
  if (normalizedClientSource) headers.set("X-Code-Destiny-Client", normalizedClientSource);
  return fetchWithTimeout(toAbsoluteApiUrl("/api/auth/refresh", apiBase), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers,
  }, AUTH_REFRESH_TIMEOUT_MS);
}

async function refreshSession(apiBase: string, clientSource?: string) {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        let response = await requestTokenRefresh(apiBase, clientSource);

        if (response.status === 401 || response.status === 403) {
          // The refresh cookie is shared across tabs — a sibling tab may have just rotated
          // it (server-side reuse-detection grace window). Retry once after a short delay
          // before treating this as a genuinely invalid session and logging every tab out.
          await sleep(400);
          response = await requestTokenRefresh(apiBase, clientSource);
        }

        if (!response.ok) {
          // Only clear local auth state for explicit auth invalid responses.
          if (response.status === 401 || response.status === 403) {
            clearClientAuthState();
            publishAuthSync("logout");
            dispatchSessionInvalidated("refresh-401");
            return "invalid";
          }
          return "transient";
        }

        try {
          const payload = (await response.json()) as { user?: unknown; accessToken?: string; refreshToken?: string };
          if (isMobileAppRuntime() && payload?.accessToken) {
            persistMobileAppAccessToken(payload.accessToken);
            // 회전된 토큰을 즉시 갈아끼운다 — 놓치면 다음 갱신이 재사용 탐지에 걸린다.
            persistMobileAppRefreshToken(payload.refreshToken || "");
          } else {
            clearLegacyClientAccessToken();
          }
          if (payload?.user) {
            persistSanitizedAuthUser(payload.user);
            publishAuthSync("login");
          }
        } catch (e) {
          // non-json responses are ignored here
        }
        return "success";
      } catch (e) {
        return "transient";
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

function authGetDedupeKey(url: string, init: RequestInit = {}) {
  const method = String(init.method || "GET").trim().toUpperCase();
  if (method !== "GET") return "";
  try {
    const parsed = new URL(url, "http://localhost");
    const safePaths = [
      "/api/auth/me",
      "/api/profile",
      "/api/profile/current",
      "/api/billing/balance",
      "/api/payments/me",
      "/api/me/access-state",
      "/api/subscription/status",
      "/api/fortune/pig-coin/profile-subscription/status",
      "/api/fusion-fortune/status",
      "/api/payments/guardian-fortune/catalog",
      "/api/payments/guardian-fortune/balance",
      "/api/payments/guardian-fortune/shop-preview",
      "/api/payments/fusion-fortune/catalog",
      "/api/payments/fusion-fortune/balance",
      "/api/payments/fusion-fortune/shop-preview",
    ];
    const isOrderPath = parsed.pathname === "/api/payments/orders"
      || /^\/api\/payments\/orders\/[^/]+$/.test(parsed.pathname);
    if (!safePaths.includes(parsed.pathname) && !isOrderPath) return "";
    const headers = new Headers(init.headers || {});
    return `${url}|refresh:${headers.get(CACHE_REFRESH_HEADER) || "0"}`;
  } catch (e) {
    return "";
  }
}

function withCallerAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new DOMException("The operation was aborted.", "AbortError"));
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

// 호출부가 자기 signal 을 준 경우(취소 제어를 이미 쥐고 있는 경우)에는 건드리지 않는다.
// 그 외에만 상한을 걸어 hang 을 실제로 끊는다.
async function fetchAuthRequest(request: Request, callerControlsAbort: boolean) {
  if (callerControlsAbort || typeof AbortController === "undefined") {
    return fetch(request);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch (e) {
      void e;
    }
  }, AUTH_FETCH_TIMEOUT_MS);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function performAuthFetch(targetUrl: string, init: RequestInit, retryOn401: boolean, apiBase: string, clientSource?: string) {
  const callerControlsAbort = Boolean(init.signal);
  let request = buildAuthRequest(targetUrl, init, clientSource);
  let response = await fetchAuthRequest(request.clone(), callerControlsAbort);
  if (
    response.status === 401
    && retryOn401
    && shouldTryRefresh(targetUrl)
  ) {
    const refreshState = await refreshSession(apiBase, clientSource);
    if (refreshState === "success") {
      request = buildAuthRequest(targetUrl, init, clientSource);
      response = await fetchAuthRequest(request.clone(), callerControlsAbort);
    } else if (refreshState === "transient") {
      return buildRefreshTransientResponse(response.status);
    }
  }

  return response;
}

export async function authFetch(
  input: string,
  init: RequestInit = {},
  options: { retryOn401?: boolean; apiBase?: string; clientSource?: string } = {},
) {
  const apiBase = String(options.apiBase || getApiBaseUrl() || "").trim();
  const targetUrl = toAbsoluteApiUrl(input, apiBase);
  const retryOn401 = options.retryOn401 !== false;
  const clientSource = String(options.clientSource || "").trim().toLowerCase();

  const dedupeKey = authGetDedupeKey(targetUrl, init);
  if (!dedupeKey) return performAuthFetch(targetUrl, init, retryOn401, apiBase, clientSource);

  let pending = authGetInFlight.get(dedupeKey);
  if (!pending) {
    // A shared GET must not be cancelled by one consumer. Each caller still gets
    // its own abort race below, while the network request remains single-flight.
    const sharedInit = init.signal ? { ...init, signal: undefined } : init;
    pending = performAuthFetch(targetUrl, sharedInit, retryOn401, apiBase, clientSource)
      .finally(() => {
        if (authGetInFlight.get(dedupeKey) === pending) authGetInFlight.delete(dedupeKey);
      });
    authGetInFlight.set(dedupeKey, pending);
  }
  return (await withCallerAbort(pending, init.signal ?? undefined)).clone();
}

export async function logoutWithServer(apiBase?: string) {
  if (logoutInFlight) return logoutInFlight;
  const resolvedBase = String(apiBase || getApiBaseUrl() || "").trim();
  const nextLogoutInFlight = (async () => {
    markLogoutInFlight();
    // 로컬 상태를 지우기 전에 확보한다 — 지운 뒤엔 앱이 서버에 보낼 리프레시 토큰이 없어져
    // 워커가 세션을 폐기하지 못하고(쿠키도 오지 않는다) 리프레시 토큰이 살아남는다.
    const appLogoutHeaders = mobileAppAuthHeaders();
    clearClientAuthState();
    try {
      await fetchWithTimeout(toAbsoluteApiUrl("/api/auth/logout", resolvedBase), {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        keepalive: true,
        headers: appLogoutHeaders,
      }, LOGOUT_TIMEOUT_MS);
    } catch (e) {
      void e;
    } finally {
      clearLogoutInFlightMarker();
    }
    clearClientAuthState();
    publishAuthSync("logout");
  })();

  logoutInFlight = nextLogoutInFlight;
  try {
    await nextLogoutInFlight;
  } finally {
    if (logoutInFlight === nextLogoutInFlight) {
      logoutInFlight = null;
    }
  }
}
