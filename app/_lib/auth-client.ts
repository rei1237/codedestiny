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

type RefreshSessionState = "success" | "invalid" | "transient";

let refreshInFlight: Promise<RefreshSessionState> | null = null;
let meRequestInFlight: Promise<Response> | null = null;
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

function buildAuthRequest(targetUrl: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
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
  meRequestInFlight = null;
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

async function requestTokenRefresh(apiBase: string) {
  return fetch(toAbsoluteApiUrl("/api/auth/refresh", apiBase), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { [CACHE_REFRESH_HEADER]: "1", ...mobileAppAuthHeaders() },
  });
}

async function refreshSession(apiBase: string) {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        let response = await requestTokenRefresh(apiBase);

        if (response.status === 401 || response.status === 403) {
          // The refresh cookie is shared across tabs — a sibling tab may have just rotated
          // it (server-side reuse-detection grace window). Retry once after a short delay
          // before treating this as a genuinely invalid session and logging every tab out.
          await sleep(400);
          response = await requestTokenRefresh(apiBase);
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

function isMeRequest(url: string, init: RequestInit = {}) {
  const method = String(init.method || "GET").trim().toUpperCase();
  if (method !== "GET") return false;
  try {
    const parsed = new URL(url, "http://localhost");
    return parsed.pathname === "/api/auth/me";
  } catch (e) {
    return false;
  }
}

async function performAuthFetch(targetUrl: string, init: RequestInit, retryOn401: boolean, apiBase: string) {
  let request = buildAuthRequest(targetUrl, init);
  let response = await fetch(request.clone());
  if (
    response.status === 401
    && retryOn401
    && shouldTryRefresh(targetUrl)
  ) {
    const refreshState = await refreshSession(apiBase);
    if (refreshState === "success") {
      request = buildAuthRequest(targetUrl, init);
      response = await fetch(request.clone());
    } else if (refreshState === "transient") {
      return buildRefreshTransientResponse(response.status);
    }
  }

  return response;
}

export async function authFetch(input: string, init: RequestInit = {}, options: { retryOn401?: boolean; apiBase?: string } = {}) {
  const apiBase = String(options.apiBase || getApiBaseUrl() || "").trim();
  const targetUrl = toAbsoluteApiUrl(input, apiBase);
  const retryOn401 = options.retryOn401 !== false;

  if (isMeRequest(targetUrl, init)) {
    if (!meRequestInFlight) {
      meRequestInFlight = performAuthFetch(targetUrl, init, retryOn401, apiBase)
        .finally(() => {
          meRequestInFlight = null;
        });
    }
    const sharedResponse = await meRequestInFlight;
    return sharedResponse.clone();
  }

  return performAuthFetch(targetUrl, init, retryOn401, apiBase);
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
