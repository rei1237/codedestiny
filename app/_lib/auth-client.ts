import { getApiBaseUrl } from "./api-config";
import { persistSanitizedAuthUser } from "./auth-storage";

const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";

let refreshInFlight: Promise<boolean> | null = null;

function toAbsoluteApiUrl(pathOrUrl: string, apiBase: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalizedBase = String(apiBase || "").replace(/\/+$/, "");
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${normalizedBase}${normalizedPath}`;
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
  try {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
    channel.postMessage({ source: "auth-client", event, at: Date.now() });
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
          clearClientAuthState();
          publishAuthSync("logout");
          return false;
        }

        try {
          const payload = (await response.json()) as { user?: unknown };
          if (payload?.user) {
            persistSanitizedAuthUser(payload.user);
            publishAuthSync("login");
          }
        } catch {
          // non-json responses are ignored here
        }
        return true;
      } catch {
        clearClientAuthState();
        publishAuthSync("logout");
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

export async function authFetch(input: string, init: RequestInit = {}, options: { retryOn401?: boolean; apiBase?: string } = {}) {
  const apiBase = String(options.apiBase || getApiBaseUrl() || "").trim();
  const targetUrl = toAbsoluteApiUrl(input, apiBase);
  const retryOn401 = options.retryOn401 !== false;

  const request = new Request(targetUrl, {
    ...init,
    credentials: "include",
    cache: init.cache || "no-store",
  });

  let response = await fetch(request.clone());
  if (
    response.status === 401
    && retryOn401
    && shouldTryRefresh(targetUrl)
  ) {
    const refreshed = await refreshSession(apiBase);
    if (refreshed) {
      response = await fetch(request.clone());
    }
  }

  return response;
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
