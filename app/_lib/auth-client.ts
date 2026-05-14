import { getApiBaseUrl } from "./api-config";
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

function toAbsoluteApiUrl(pathOrUrl: string, apiBase: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalizedBase = String(apiBase || "").replace(/\/+$/, "");
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${normalizedBase}${normalizedPath}`;
}

function isLocalHostname(hostname: string) {
  const normalized = String(hostname || "").trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "[::1]";
}

function isWorkersDevHostname(hostname: string) {
  const normalized = String(hostname || "").trim().toLowerCase();
  return normalized === "workers.dev" || normalized.endsWith(".workers.dev");
}

function resolveApiBaseForRequest(pathOrUrl: string, apiBase: string) {
  if (typeof window === "undefined") return apiBase;
  if (/^https?:\/\//i.test(pathOrUrl)) return apiBase;

  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  const isAuthPath = normalizedPath.startsWith("/api/auth/");
  const isPaymentCriticalPath = normalizedPath.startsWith("/api/payments/")
    || normalizedPath.startsWith("/api/billing/")
    || normalizedPath.startsWith("/api/subscription/");

  if (!isAuthPath && !isPaymentCriticalPath) return apiBase;

  const currentHost = String(window.location.hostname || "");
  if (isLocalHostname(currentHost)) {
    // In local dev, keep explicit local API base if configured.
    return apiBase;
  }

  if (isWorkersDevHostname(currentHost)) {
    // workers.dev host already serves API on the same origin.
    return apiBase;
  }

  // In preview/production, auth should stay same-origin for reliable cookies.
  return "";
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
    [
      "fortune_auth_token",
      "fortune_auth_user",
      "fortune_user_profile",
      "fortune_profile_subscription",
      "fortune_profile_subscription_owner",
      "fortune_user_points",
      "fortune_billing_me",
      "fortune_billing_entitlements",
      "premium:ziwei:unlock:v1",
      "premium:ziwei:result:v5",
      "premium:ziwei:result:v7",
      "FORTUNE_APP_USER_PROFILES.current",
      "FORTUNE_APP_USER_PROFILES.list",
      "FORTUNE_APP_USER_PROFILES",
    ].forEach((key) => localStorage.removeItem(key));

    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith("FORTUNE_APP_USER_PROFILES.")
        || key.startsWith("premium:")
        || key.startsWith("cd_premium_tx_")
      ) {
        localStorage.removeItem(key);
      }
    });

    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("premium:") || key.startsWith("cd_premium_tx_")) {
        sessionStorage.removeItem(key);
      }
    });
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
  const configuredBase = String(options.apiBase || getApiBaseUrl() || "").trim();
  const apiBase = resolveApiBaseForRequest(input, configuredBase);
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
  const configuredBase = String(apiBase || getApiBaseUrl() || "").trim();
  const resolvedBase = resolveApiBaseForRequest("/api/auth/logout", configuredBase);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    timeoutId = controller
      ? setTimeout(() => {
          try {
            controller.abort();
          } catch {
            // ignore abort failures
          }
        }, 1200)
      : null;

    await fetch(toAbsoluteApiUrl("/api/auth/logout", resolvedBase), {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      keepalive: true,
      signal: controller?.signal,
    });
  } catch {
    // local cleanup still required
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
  clearClientAuthState();
  publishAuthSync("logout");
}
