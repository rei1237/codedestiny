import { getApiBaseUrl } from "./api-config";
import { toAbsoluteApiUrl } from "./http-client";
import { persistSanitizedAuthUser } from "./auth-storage";

const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";

type RefreshSessionState = "success" | "invalid" | "transient";

let refreshInFlight: Promise<RefreshSessionState> | null = null;
let meRequestInFlight: Promise<Response> | null = null;

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

function readClientAccessToken() {
  if (typeof window === "undefined") return "";
  try {
    return String(localStorage.getItem("fortune_auth_token") || "").trim();
  } catch {
    return "";
  }
}

function persistClientAccessToken(token: unknown) {
  if (typeof window === "undefined") return;
  const normalized = String(token || "").trim();
  if (!normalized) return;
  try {
    localStorage.setItem("fortune_auth_token", normalized);
  } catch {
    // ignore storage failures
  }
}

function buildAuthRequest(targetUrl: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const token = readClientAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
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
  } catch {
    return false;
  }
}

function publishAuthSync(event: "login" | "logout") {
  if (typeof window === "undefined") return;
  const payload = { source: "auth-client", event, at: Date.now() };

  try {
    window.dispatchEvent(new CustomEvent("cd:auth-changed", { detail: payload }));
  } catch {
    // best-effort
  }

  try {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // best-effort
  }
}

export function clearClientAuthState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("fortune_auth_token");
    localStorage.removeItem("fortune_auth_user");
  } catch {
    // ignore storage failures
  }
  document.cookie = "fortune_auth_token=; path=/; max-age=0; samesite=lax";
  document.cookie = "fortune_auth_refresh=; path=/; max-age=0; samesite=lax";
  document.cookie = "fortune_auth_role=; path=/; max-age=0; samesite=lax";
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
          persistClientAccessToken(payload?.accessToken);
          if (payload?.user) {
            persistSanitizedAuthUser(payload.user);
            publishAuthSync("login");
          }
        } catch {
          // non-json responses are ignored here
        }
        return "success";
      } catch {
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
  } catch {
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
  const resolvedBase = String(apiBase || getApiBaseUrl() || "").trim();
  try {
    await fetch(toAbsoluteApiUrl("/api/auth/logout", resolvedBase), {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    // local cleanup still required
  }
  clearClientAuthState();
  publishAuthSync("logout");
}
