import { getApiBaseUrl } from "./api-config";
import { persistSanitizedAuthUser } from "./auth-storage";

const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";
const DEFAULT_AUTH_TIMEOUT_MS = 10000;
const MAX_TRANSIENT_RETRIES = 2;
const DEFAULT_WORKER_API_BASE = "https://code-destiny-web.bulegyung.workers.dev";

type AuthFetchOptions = {
  retryOn401?: boolean;
  apiBase?: string;
  timeoutMs?: number;
  transientRetries?: number;
};

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

function buildAuthRequest(targetUrl: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});

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

function normalizeCandidateBase(base: string) {
  return String(base || "").trim().replace(/\/+$/, "");
}

function isSensitiveApiPath(pathname: string) {
  const path = String(pathname || "");
  return path.startsWith("/api/auth/")
    || path.startsWith("/api/user/")
    || path.startsWith("/api/fortune/pig-coin/")
    || path.startsWith("/api/billing/")
    || path.startsWith("/api/payments/")
    || path.startsWith("/api/subscription/");
}

function canUseWorkerFallback(pathname: string) {
  const path = String(pathname || "");
  if (!path.startsWith("/api/")) return false;
  if (!isSensitiveApiPath(path)) return true;
  if (path === "/api/auth/refresh" || path === "/api/auth/logout" || path === "/api/auth/login" || path === "/api/auth/register") {
    return false;
  }
  if (path.startsWith("/api/auth/oauth/")) return false;
  if (path === "/api/auth/me") return true;
  return path.startsWith("/api/user/destiny-profiles")
    || path.startsWith("/api/fortune/pig-coin/")
    || path.startsWith("/api/billing/")
    || path.startsWith("/api/payments/")
    || path.startsWith("/api/subscription/");
}

function readWindowApiBaseCandidates() {
  if (typeof window === "undefined") return [] as string[];

  const values: string[] = [];
  try { values.push(String((window as any).__CD_API_BASE_URL || "")); } catch {}
  try { values.push(String((window as any).CODE_DESTINY_API_BASE_URL || "")); } catch {}
  try { values.push(String((window as any).__CF_PAGES_API_BASE_URL || "")); } catch {}
  try { values.push(String(window.location.origin || "")); } catch {}
  try { values.push(String(localStorage.getItem("fortune_api_base_url") || "")); } catch {}
  return values;
}

function rememberApiBase(base: string) {
  const normalized = normalizeCandidateBase(base);
  if (!normalized) return;
  if (typeof window === "undefined") return;

  try { localStorage.setItem("fortune_api_base_url", normalized); } catch {}
  try {
    (window as any).__CD_API_BASE_URL = normalized;
    (window as any).CODE_DESTINY_API_BASE_URL = normalized;
    (window as any).__CF_PAGES_API_BASE_URL = normalized;
  } catch {
    // ignore runtime assignment failures
  }
}

function parseApiPath(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    try {
      return new URL(pathOrUrl).pathname || "";
    } catch {
      return "";
    }
  }
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return normalizedPath;
}

function buildApiBaseCandidates(pathOrUrl: string, configuredBase: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return [{ base: configuredBase, url: pathOrUrl }];
  }

  const path = parseApiPath(pathOrUrl);
  const seen = new Set<string>();
  const candidates: Array<{ base: string; url: string }> = [];

  const push = (rawBase: string) => {
    const base = normalizeCandidateBase(rawBase);
    const url = toAbsoluteApiUrl(path, base);
    if (seen.has(url)) return;
    seen.add(url);
    candidates.push({ base, url });
  };

  const resolvedBase = resolveApiBaseForRequest(path, configuredBase);
  push(resolvedBase);
  push("");

  readWindowApiBaseCandidates().forEach((base) => push(base));

  if (canUseWorkerFallback(path)) {
    push(DEFAULT_WORKER_API_BASE);
  }

  return candidates.length ? candidates : [{ base: "", url: toAbsoluteApiUrl(path, "") }];
}

async function looksLikeHtmlResponse(response: Response) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("text/html")) return true;
  if (contentType.includes("application/json")) return false;

  const bodyText = await response.clone().text().catch(() => "");
  return /^\s*</.test(bodyText);
}

function shouldTryNextCandidate(response: Response, looksHtml: boolean) {
  const status = Number(response.status || 0);
  if (looksHtml) return true;
  return status === 0 || status === 404 || status >= 500;
}

function buildNetworkFailureResponse() {
  return new Response(
    JSON.stringify({
      ok: false,
      code: "NETWORK_ERROR",
      message: "Network request failed. Please retry.",
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

function isTransientStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 504);
}

function isRetryableRequestPath(url: string) {
  try {
    const parsed = new URL(url, "http://localhost");
    const path = parsed.pathname;
    return path.startsWith("/api/auth/")
      || path.startsWith("/api/billing/")
      || path.startsWith("/api/payments/")
      || path.startsWith("/api/subscription/")
      || path.startsWith("/api/fortune/pig-coin/");
  } catch {
    return false;
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRequestWithTimeout(request: Request, timeoutMs: number) {
  const safeTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? Math.floor(timeoutMs)
    : DEFAULT_AUTH_TIMEOUT_MS;

  if (typeof AbortController === "undefined") {
    return fetch(request.clone());
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch {
      // ignore abort failures
    }
  }, safeTimeoutMs);

  try {
    return await fetch(new Request(request.clone(), { signal: controller.signal }));
  } finally {
    clearTimeout(timeoutId);
  }
}

async function performFetchWithTransientRetry(
  targetUrl: string,
  init: RequestInit,
  timeoutMs: number,
  transientRetries: number,
) {
  const retryablePath = isRetryableRequestPath(targetUrl);
  const maxRetries = retryablePath
    ? Math.min(Math.max(Math.floor(transientRetries), 0), MAX_TRANSIENT_RETRIES)
    : 0;

  let attempt = 0;
  while (true) {
    try {
      const request = buildAuthRequest(targetUrl, init);
      const response = await fetchRequestWithTimeout(request, timeoutMs);
      if (attempt < maxRetries && isTransientStatus(response.status)) {
        attempt += 1;
        await sleep(120 * attempt);
        continue;
      }
      return response;
    } catch (error) {
      const canRetry = attempt < maxRetries && (isAbortError(error) || isNetworkError(error));
      if (canRetry) {
        attempt += 1;
        await sleep(120 * attempt);
        continue;
      }
      throw error;
    }
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

async function performAuthFetch(
  targetUrl: string,
  init: RequestInit,
  retryOn401: boolean,
  apiBase: string,
  timeoutMs: number,
  transientRetries: number,
) {
  let response = await performFetchWithTransientRetry(targetUrl, init, timeoutMs, transientRetries);
  if (
    response.status === 401
    && retryOn401
    && shouldTryRefresh(targetUrl)
  ) {
    const refreshState = await refreshSession(apiBase);
    if (refreshState === "success") {
      response = await performFetchWithTransientRetry(targetUrl, init, timeoutMs, transientRetries);
    } else if (refreshState === "transient") {
      return buildRefreshTransientResponse(response.status);
    }
  }

  return response;
}

export async function authFetch(input: string, init: RequestInit = {}, options: AuthFetchOptions = {}) {
  const configuredBase = String(options.apiBase || getApiBaseUrl() || "").trim();
  const retryOn401 = options.retryOn401 !== false;
  const timeoutMs = Number(options.timeoutMs);
  const resolvedTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? Math.floor(timeoutMs)
    : DEFAULT_AUTH_TIMEOUT_MS;
  const transientRetries = Number.isFinite(Number(options.transientRetries))
    ? Number(options.transientRetries)
    : 1;

  const candidates = buildApiBaseCandidates(input, configuredBase);

  const performAcrossCandidates = async () => {
    let lastResponse: Response | null = null;

    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      try {
        const response = await performAuthFetch(
          candidate.url,
          init,
          retryOn401,
          candidate.base,
          resolvedTimeoutMs,
          transientRetries,
        );

        const looksHtml = await looksLikeHtmlResponse(response);
        if (response.ok && !looksHtml) {
          rememberApiBase(candidate.base);
          return response;
        }

        lastResponse = response;
        const hasNext = i < candidates.length - 1;
        if (!hasNext || !shouldTryNextCandidate(response, looksHtml)) {
          return response;
        }
      } catch {
        const hasNext = i < candidates.length - 1;
        if (!hasNext) {
          return buildNetworkFailureResponse();
        }
      }
    }

    return lastResponse || buildNetworkFailureResponse();
  };

  const mePath = parseApiPath(input);

  if (isMeRequest(mePath, init)) {
    if (!meRequestInFlight) {
      meRequestInFlight = performAcrossCandidates()
        .finally(() => {
          meRequestInFlight = null;
        });
    }
    const sharedResponse = await meRequestInFlight;
    return sharedResponse.clone();
  }

  return performAcrossCandidates();
}

export async function logoutWithServer(apiBase?: string) {
  const configuredBase = String(apiBase || getApiBaseUrl() || "").trim();
  const resolvedBase = resolveApiBaseForRequest("/api/auth/logout", configuredBase);
  const logoutUrl = toAbsoluteApiUrl("/api/auth/logout", resolvedBase);
  const requestWithTimeout = async (timeoutMs: number, keepalive: boolean) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    if (controller) {
      timeoutId = setTimeout(() => {
        try {
          controller.abort();
        } catch {
          // ignore abort failures
        }
      }, timeoutMs);
    }

    try {
      await fetch(logoutUrl, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        keepalive,
        signal: controller?.signal,
      });
      return true;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  try {
    await requestWithTimeout(3500, true);
  } catch {
    try {
      await requestWithTimeout(3500, false);
    } catch {
      // local cleanup still required
    }
  }

  clearClientAuthState();
  publishAuthSync("logout");
}
