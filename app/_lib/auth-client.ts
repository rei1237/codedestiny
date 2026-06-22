import { getApiBaseUrl } from "./api-config";
import { fetchWithTimeout, toAbsoluteApiUrl } from "./http-client";
import { persistSanitizedAuthUser } from "./auth-storage";

const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";
const AUTH_LOGOUT_INFLIGHT_KEY = "fortune_auth_logout_inflight_at";
const LOGOUT_TIMEOUT_MS = 3500;
const LOGOUT_INFLIGHT_TTL_MS = 5000;
const LOGOUT_INFLIGHT_POLL_MS = 80;

type RefreshSessionState = "success" | "invalid" | "transient";

let refreshInFlight: Promise<RefreshSessionState> | null = null;
let meRequestInFlight: Promise<Response> | null = null;
let logoutInFlight: Promise<void> | null = null;

const AUTH_LOCAL_STORAGE_KEYS = [
  "fortune_auth_token",
  "fortune_auth_user",
  "fortune_auth_role",
  "user",
  "cdToken",
];

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
      message: "Authentication refresh is temporarily unavailable. Please retry.",
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

  const deadline = Math.min(startedAt + LOGOUT_INFLIGHT_TTL_MS, Date.now() + timeoutMs);
  while (Date.now() < deadline) {
    if (readLogoutInFlightStartedAt() <= 0) return;
    await sleep(Math.min(LOGOUT_INFLIGHT_POLL_MS, Math.max(0, deadline - Date.now())));
  }
  clearLogoutInFlightMarker();
}

function buildAuthRequest(targetUrl: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});

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

export function clearClientAuthState() {
  if (typeof window === "undefined") return;
  refreshInFlight = null;
  meRequestInFlight = null;
  try {
    AUTH_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    // ignore storage failures
  }
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

async function refreshSession(apiBase: string) {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(toAbsoluteApiUrl("/api/auth/refresh", apiBase), {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          // Only clear local auth state for explicit auth invalid responses.
          if (response.status === 401 || response.status === 403) {
            clearClientAuthState();
            publishAuthSync("logout");
            return "invalid";
          }
          return "transient";
        }

        try {
          const payload = (await response.json()) as { user?: unknown; accessToken?: string };
          clearLegacyClientAccessToken();
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
    clearClientAuthState();
    try {
      await fetchWithTimeout(toAbsoluteApiUrl("/api/auth/logout", resolvedBase), {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        keepalive: true,
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
