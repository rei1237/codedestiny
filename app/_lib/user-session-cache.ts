"use client";

import { useCallback, useSyncExternalStore } from "react";

type CacheKind = "session" | "profile" | "entitlement" | "paymentAccess";

type CachedResponse = {
  body: string;
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

function makeCacheKey(userKey: string, url: URL, kind: CacheKind) {
  return [kind, userKey, url.pathname, url.searchParams.toString()].join("|");
}

function responseFromCached(entry: CachedResponse) {
  return new Response(entry.body, {
    status: entry.status,
    statusText: entry.statusText,
    headers: new Headers(entry.headers),
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
    cache.set(key, {
      body,
      fetchedAt: Date.now(),
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

export async function ensureUserAccessLoaded(options: { force?: boolean; includeProfile?: boolean; includeBilling?: boolean; reason?: string } = {}) {
  if (typeof window === "undefined") return getUserAccessSnapshot();
  installUserAccessFetchCache();
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
    tasks.push(fetch("/api/billing/balance", init).catch((error) => error));
  }
  await Promise.allSettled(tasks);
  return getUserAccessSnapshot();
}

export async function refreshUserAccessAfterPayment() {
  invalidateUserAccessCache("payment");
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

    const userKey = resolveUserKey();
    const cacheKey = makeCacheKey(userKey, parsedUrl, kind);
    if (!shouldBypass(init)) {
      const cached = cache.get(cacheKey);
      if (cached) return Promise.resolve(responseFromCached(cached));
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
    if (kind === "logout" || kind === "login" || kind === "subscription" || kind === "payment" || kind === "profile") {
      invalidateUserAccessCache(kind);
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
    if (event.key === "fortune_auth_user" || event.key === "fortune_auth_token" || event.key === "fortune_auth_role") {
      invalidateUserAccessCache("auth-storage");
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
