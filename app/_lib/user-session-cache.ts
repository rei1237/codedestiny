"use client";

import { useCallback, useSyncExternalStore } from "react";
import { fetchBillingBalance } from "@/app/_lib/billing-client";

type CacheKind = "session" | "profile" | "entitlement" | "paymentAccess";

type CachedResponse = {
  body: string;
  cachedAt: number;
  fetchedAt: number;
  headers: [string, string][];
  kind: CacheKind;
  status: number;
  statusText: string;
  url: string;
  userKey: string;
};

export type UserAccessSnapshot = {
  userKey: string;
  profileStatus: "idle" | "loading" | "ready" | "error";
  entitlementStatus: "idle" | "loading" | "ready" | "error";
  paymentAccessStatus: "idle" | "loading" | "ready" | "error";
  fetchedAt: number;
  isLoading: boolean;
  error: string | null;
};

type RuntimeWindow = Window & {
  __cdUserAccessFetchCacheInstalled?: boolean;
  __cdUserAccessNativeFetch?: typeof window.fetch;
  CodeDestinyUserAccessCache?: {
    getUserAccessSnapshot: typeof getUserAccessSnapshot;
    ensureUserAccessLoaded: typeof ensureUserAccessLoaded;
    invalidateUserAccessCache: typeof invalidateUserAccessCache;
    refreshUserAccessAfterPayment: typeof refreshUserAccessAfterPayment;
    refreshUserProfileAfterUpdate: typeof refreshUserProfileAfterUpdate;
  };
};

const CACHE_REFRESH_HEADER = "x-code-destiny-cache-refresh";
const VOLATILE_QUERY_KEYS = new Set(["_", "t", "ts", "cb", "cache", "cacheBust", "cachebuster"]);
const REQUEST_GUARD_MARKER = "request-traffic-guard-v20260704";
const SUBSCRIPTION_STATUS_CACHE_TTL_MS = 180_000;
const cache = new Map<string, CachedResponse>();
const inFlight = new Map<string, Promise<Response>>();
const subscribers = new Set<() => void>();

let snapshot: UserAccessSnapshot = {
  userKey: "guest",
  profileStatus: "idle",
  entitlementStatus: "idle",
  paymentAccessStatus: "idle",
  fetchedAt: 0,
  isLoading: false,
  error: null,
};

function emit() {
  subscribers.forEach((listener) => {
    try {
      listener();
    } catch {
    }
  });
}

function setSnapshot(partial: Partial<UserAccessSnapshot>) {
  snapshot = { ...snapshot, ...partial };
  snapshot.isLoading = snapshot.profileStatus === "loading"
    || snapshot.entitlementStatus === "loading"
    || snapshot.paymentAccessStatus === "loading";
  emit();
}

function readJsonStorage(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || "";
    return raw ? JSON.parse(raw) as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  try {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(document.cookie || "").match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1] || "") : "";
  } catch {
    return "";
  }
}

function writeCookie(name: string, value: string, maxAge?: number) {
  if (typeof document === "undefined") return;
  try {
    const age = typeof maxAge === "number" ? `; max-age=${Math.max(0, Math.floor(maxAge))}` : "";
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/${age}; SameSite=Lax${secure}`;
  } catch {
  }
}

function ensureSessionCookie() {
  const current = readCookie("cd_session_guard");
  if (current) return current;
  const token = `sg.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 10)}`;
  writeCookie("cd_session_guard", token);
  return token;
}

function hasAuthCookieHint() {
  const role = readCookie("fortune_auth_role").trim().toLowerCase();
  return Boolean(role && role !== "guest" && role !== "anonymous");
}

function hasClientAuthHint() {
  if (typeof window === "undefined") return false;
  try {
    const token = String(
      window.localStorage.getItem("fortune_auth_token")
        || window.sessionStorage.getItem("fortune_auth_token")
        || "",
    ).trim();
    if (token) return true;
    if (readJsonStorage("fortune_auth_user")) return true;
  } catch {
  }
  return hasAuthCookieHint();
}

function resolveUserKey() {
  const user = readJsonStorage("fortune_auth_user");
  const rawId = user && (user.id || user.userId || user._id || user.uid || user.email || user.userEmail);
  const userId = String(rawId || "").trim().toLowerCase();
  if (userId) return `user:${userId}`;
  try {
    const token = String(
      window.localStorage.getItem("fortune_auth_token")
        || window.sessionStorage.getItem("fortune_auth_token")
        || "",
    ).trim();
    if (token) return `token:${token.length}:${token.slice(0, 8)}:${token.slice(-12)}`;
  } catch {
  }
  try {
    const role = String(document.cookie || "").match(/(?:^|;\s*)fortune_auth_role=([^;]*)/)?.[1] || "";
    if (role) return `cookie:${decodeURIComponent(role).toLowerCase()}`;
  } catch {
  }
  return "guest";
}

function resolveCacheKind(pathname: string): CacheKind | null {
  if (pathname === "/api/auth/me") return "session";
  if (pathname === "/api/profile" || pathname === "/api/profile/current") return "profile";
  if (pathname === "/api/subscription/status" || pathname === "/api/subscription/me") return "entitlement";
  if (pathname === "/api/fortune/pig-coin/profile-subscription/status" || pathname === "/api/profile-subscription/status") return "entitlement";
  if (pathname === "/api/billing/balance" || pathname === "/api/billing/features" || pathname === "/api/billing/unlock-status") return "paymentAccess";
  return null;
}

function readMethod(input: RequestInfo | URL, init?: RequestInit) {
  return String(init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();
}

function readUrl(input: RequestInfo | URL) {
  if (input instanceof Request) return input.url;
  if (input instanceof URL) return input.toString();
  return String(input || "");
}

function readHeaders(init?: RequestInit) {
  return new Headers(init?.headers || {});
}

function shouldBypass(init?: RequestInit) {
  const headers = readHeaders(init);
  return headers.get(CACHE_REFRESH_HEADER) === "1";
}

function normalizeSearchParams(url: URL) {
  const kept: [string, string][] = [];
  url.searchParams.forEach((value, key) => {
    if (!VOLATILE_QUERY_KEYS.has(key)) kept.push([key, value]);
  });
  kept.sort((a, b) => a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0]));
  return kept.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
}

function makeCacheKey(userKey: string, url: URL, kind: CacheKind) {
  return [kind, userKey, url.pathname, normalizeSearchParams(url)].join("|");
}

function responseFromCached(entry: CachedResponse) {
  return new Response(entry.body, {
    status: entry.status,
    statusText: entry.statusText,
    headers: new Headers(entry.headers),
  });
}

function getCacheTtlMs(kind: CacheKind) {
  if (kind === "entitlement") return SUBSCRIPTION_STATUS_CACHE_TTL_MS;
  if (kind === "session") return 300_000;
  if (kind === "profile") return 120_000;
  return 120_000;
}

function isFreshCachedResponse(entry: CachedResponse | undefined, kind: CacheKind) {
  if (!entry || !Number.isFinite(entry.cachedAt)) return false;
  return Date.now() - entry.cachedAt <= getCacheTtlMs(kind);
}

function guardedGuestAuthResponse() {
  return new Response(JSON.stringify({
    ok: true,
    authenticated: false,
    guest: true,
    reason: "no_auth_hint",
    clientGuard: REQUEST_GUARD_MARKER,
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Code-Destiny-Client-Guard": REQUEST_GUARD_MARKER,
    },
  });
}

async function hasAuthenticatedSession(response: Response | null) {
  if (!response?.ok) return false;
  try {
    const payload = await response.clone().json() as Record<string, unknown>;
    const nested = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : null;
    if (payload.authenticated === false || payload.loggedIn === false || nested?.authenticated === false) return false;
    if (payload.authenticated === true || payload.loggedIn === true || nested?.authenticated === true) return true;
    return Boolean(payload.user || payload.account || nested?.user || nested?.account || resolveUserKey() !== "guest");
  } catch {
    return resolveUserKey() !== "guest";
  }
}

function updateStatus(kind: CacheKind, status: UserAccessSnapshot["profileStatus"], error?: string | null) {
  const field = kind === "profile"
    ? "profileStatus"
    : kind === "session"
      ? "entitlementStatus"
      : kind === "entitlement"
        ? "entitlementStatus"
        : "paymentAccessStatus";
  setSnapshot({
    [field]: status,
    fetchedAt: status === "ready" ? Date.now() : snapshot.fetchedAt,
    userKey: resolveUserKey(),
    error: error ?? (status === "error" ? "user_access_fetch_failed" : null),
  } as Partial<UserAccessSnapshot>);
}

function rememberResponse(key: string, response: Response, url: string, kind: CacheKind, userKey: string) {
  if (!response.ok) return;
  void response.clone().text().then((body) => {
    const now = Date.now();
    cache.set(key, {
      body,
      cachedAt: now,
      fetchedAt: now,
      headers: Array.from(response.headers.entries()),
      kind,
      status: response.status,
      statusText: response.statusText,
      url,
      userKey,
    });
    updateStatus(kind, "ready", null);
  }).catch(() => {
    updateStatus(kind, "error", "cache_store_failed");
  });
}

function invalidateMatching(predicate: (entry: CachedResponse) => boolean) {
  Array.from(cache.entries()).forEach(([key, entry]) => {
    if (predicate(entry)) cache.delete(key);
  });
  inFlight.clear();
}

export function getUserAccessSnapshot(): UserAccessSnapshot {
  return snapshot;
}

export function invalidateUserAccessCache(reason = "manual") {
  cache.clear();
  inFlight.clear();
  setSnapshot({
    userKey: resolveUserKey(),
    profileStatus: "idle",
    entitlementStatus: "idle",
    paymentAccessStatus: "idle",
    fetchedAt: 0,
    error: null,
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cd:user-access-cache-invalidated", { detail: { reason, at: Date.now() } }));
  }
}

export function invalidateSessionCache(reason = "manual") {
  invalidateMatching((entry) => entry.kind === "session");
  updateStatus("session", "idle", null);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cd:user-access-cache-invalidated", { detail: { reason, kind: "session", at: Date.now() } }));
  }
}

export function invalidateEntitlementCache(reason = "manual") {
  invalidateMatching((entry) => entry.kind === "entitlement" || entry.kind === "paymentAccess");
  setSnapshot({
    entitlementStatus: "idle",
    paymentAccessStatus: "idle",
    error: null,
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cd:user-access-cache-invalidated", { detail: { reason, kind: "entitlement", at: Date.now() } }));
  }
}

export function invalidateProfileCache(reason = "manual") {
  invalidateMatching((entry) => entry.kind === "profile");
  updateStatus("profile", "idle", null);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cd:user-access-cache-invalidated", { detail: { reason, kind: "profile", at: Date.now() } }));
  }
}

export async function ensureUserAccessLoaded(options: { force?: boolean; includeProfile?: boolean; includeBilling?: boolean; reason?: string } = {}) {
  if (typeof window === "undefined") return getUserAccessSnapshot();
  installUserAccessFetchCache();
  ensureSessionCookie();
  if (!hasClientAuthHint()) return getUserAccessSnapshot();
  const headers = options.force ? { [CACHE_REFRESH_HEADER]: "1" } : undefined;
  const init: RequestInit = { method: "GET", credentials: "include", cache: "no-store", headers };
  const authResponse = await fetch("/api/auth/me", init).catch(() => null);
  const hasSession = await hasAuthenticatedSession(authResponse);
  if (!hasSession) return getUserAccessSnapshot();
  const tasks: Promise<unknown>[] = [];
  if (options.includeProfile !== false) {
    tasks.push(fetch("/api/profile", init).catch((error) => error));
  }
  if (options.includeBilling !== false) {
    tasks.push(fetch("/api/subscription/status", init).catch((error) => error));
    tasks.push(fetchBillingBalance({ force: options.force, emit: false }).catch((error) => error));
  }
  await Promise.allSettled(tasks);
  return getUserAccessSnapshot();
}

export async function refreshUserAccessAfterPayment() {
  invalidateEntitlementCache("payment");
  invalidateProfileCache("payment");
  // billing 잔액은 ensureUserAccessLoaded(includeBilling)가 force로 1회 조회하므로
  // 별도의 선행 fetchBillingBalance 직접 호출(중복)을 제거한다.
  return ensureUserAccessLoaded({ force: true, includeBilling: true, includeProfile: true, reason: "payment" });
}

export async function refreshUserProfileAfterUpdate() {
  invalidateMatching((entry) => entry.kind === "profile");
  updateStatus("profile", "idle", null);
  return ensureUserAccessLoaded({ force: true, includeBilling: false, includeProfile: true, reason: "profile" });
}

export function subscribeUserAccess(listener: () => void) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function useUserAccess() {
  return useSyncExternalStore(subscribeUserAccess, getUserAccessSnapshot, getUserAccessSnapshot);
}

export function useUserProfile() {
  const access = useUserAccess();
  const refresh = useCallback(() => refreshUserProfileAfterUpdate(), []);
  return {
    status: access.profileStatus,
    isLoading: access.profileStatus === "loading",
    fetchedAt: access.fetchedAt,
    refresh,
  };
}

export function useRequireAccess() {
  const access = useUserAccess();
  const refresh = useCallback(() => refreshUserAccessAfterPayment(), []);
  return {
    access,
    ready: access.entitlementStatus === "ready" || access.paymentAccessStatus === "ready",
    isLoading: access.isLoading,
    refresh,
  };
}

export function installUserAccessFetchCache() {
  if (typeof window === "undefined") return;
  const runtimeWindow = window as RuntimeWindow;
  if (runtimeWindow.__cdUserAccessFetchCacheInstalled) return;
  const nativeFetch = runtimeWindow.fetch.bind(window);
  runtimeWindow.__cdUserAccessNativeFetch = nativeFetch;
  runtimeWindow.__cdUserAccessFetchCacheInstalled = true;

  runtimeWindow.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const method = readMethod(input, init);
    if (method !== "GET") return nativeFetch(input, init);

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(readUrl(input), window.location.href);
    } catch {
      return nativeFetch(input, init);
    }

    const kind = resolveCacheKind(parsedUrl.pathname);
    if (!kind || parsedUrl.origin !== window.location.origin) return nativeFetch(input, init);
    ensureSessionCookie();
    if (parsedUrl.pathname === "/api/auth/me" && !hasClientAuthHint()) {
      return Promise.resolve(guardedGuestAuthResponse());
    }

    const userKey = resolveUserKey();
    const cacheKey = makeCacheKey(userKey, parsedUrl, kind);
    if (!shouldBypass(init)) {
      const cached = cache.get(cacheKey);
      if (isFreshCachedResponse(cached, kind) && cached) return Promise.resolve(responseFromCached(cached));
      if (cached) cache.delete(cacheKey);
      const pending = inFlight.get(cacheKey);
      if (pending) return pending.then((response) => response.clone());
    } else {
      cache.delete(cacheKey);
      inFlight.delete(cacheKey);
    }

    updateStatus(kind, "loading", null);
    const request = nativeFetch(input, init)
      .then((response) => {
        if (response.status === 401 || response.status === 403) {
          invalidateUserAccessCache(`auth-status-${response.status}`);
          return response;
        }
        rememberResponse(cacheKey, response, parsedUrl.toString(), kind, userKey);
        return response;
      })
      .catch((error) => {
        updateStatus(kind, "error", error instanceof Error ? error.message : "fetch_failed");
        throw error;
      })
      .finally(() => {
        inFlight.delete(cacheKey);
      });
    inFlight.set(cacheKey, request);
    return request;
  }) as typeof window.fetch;

  runtimeWindow.CodeDestinyUserAccessCache = {
    getUserAccessSnapshot,
    ensureUserAccessLoaded,
    invalidateUserAccessCache,
    refreshUserAccessAfterPayment,
    refreshUserProfileAfterUpdate,
  };
}

export function installUserAccessInvalidationListeners() {
  if (typeof window === "undefined") return () => {};
  const onAuthChanged = (event: Event) => {
    const detail = event instanceof CustomEvent ? event.detail as Record<string, unknown> | null : null;
    const source = String(detail?.source || "").toLowerCase();
    const kind = String(detail?.event || "").toLowerCase();
    if (source === "subscription-sync" && kind === "subscription") return;
    if (kind === "logout" || kind === "login") {
      invalidateUserAccessCache(kind);
    } else if (kind === "subscription" || kind === "payment") {
      invalidateEntitlementCache(kind);
    } else if (kind === "profile") {
      invalidateProfileCache(kind);
    }
  };
  const onBillingUpdated = () => {
    invalidateMatching((entry) => entry.kind === "entitlement" || entry.kind === "paymentAccess");
  };
  const onProfileChanged = () => {
    invalidateMatching((entry) => entry.kind === "profile");
    updateStatus("profile", "idle", null);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === "fortune_auth_user" || event.key === "fortune_auth_token") {
      invalidateSessionCache("auth-storage");
    } else if (event.key === "fortune_auth_role") {
      invalidateEntitlementCache("auth-storage");
    }
  };

  window.addEventListener("cd:auth-changed", onAuthChanged as EventListener);
  window.addEventListener("cd:billing-balance-updated", onBillingUpdated as EventListener);
  window.addEventListener("destinyProfileChanged", onProfileChanged as EventListener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("cd:auth-changed", onAuthChanged as EventListener);
    window.removeEventListener("cd:billing-balance-updated", onBillingUpdated as EventListener);
    window.removeEventListener("destinyProfileChanged", onProfileChanged as EventListener);
    window.removeEventListener("storage", onStorage);
  };
}
