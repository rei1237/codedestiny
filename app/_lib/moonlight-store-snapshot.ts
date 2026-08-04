"use client";

import { authFetch } from "./auth-client";
import { getApiBaseUrl } from "./api-config";
import { remoteQueryKeyToString, remoteQueryKeys } from "./remote-query-keys";

export const MOONLIGHT_STORE_SNAPSHOT_SCHEMA_VERSION = 1;
export const MOONLIGHT_STORE_SNAPSHOT_TTL_MS = 30_000;

export type MoonlightStoreAreaStatus =
  | "ready"
  | "stale"
  | "unavailable"
  | "unauthenticated"
  | "deferred"
  | "unrequested";

export type MoonlightStoreProductSummary = {
  productType: "guardian-fortune" | "fusion-fortune";
  status: "available" | "unavailable" | "unrequested";
  remaining: number | null;
  detailRequired: boolean;
};

export type MoonlightStoreSnapshot = {
  schemaVersion: number;
  generatedAt: string;
  expiresAt: string;
  source: "db" | "token" | "legacy";
  areas: {
    moonstone: {
      status: MoonlightStoreAreaStatus;
      balance: number | null;
      expiresAt: string | null;
    };
    membership: {
      status: MoonlightStoreAreaStatus;
      tier: string | null;
      isActive: boolean | null;
      expiresAt: string | null;
    };
    passes: {
      status: MoonlightStoreAreaStatus;
      summary: MoonlightStoreProductSummary[];
    };
    orders: {
      status: "deferred" | "ready" | "unavailable";
      hasRecentOrders: boolean | null;
    };
  };
  availability: {
    status: "ready" | "unavailable";
    purchasesEnabled: boolean;
  };
};

type SnapshotPayload = {
  ok?: boolean;
  success?: boolean;
  degraded?: boolean;
  retryable?: boolean;
  code?: string;
  message?: string;
  requestId?: string;
  data?: {
    storeSnapshot?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type MoonlightStoreSnapshotFetchResult = {
  status: number;
  ok: boolean;
  payload: SnapshotPayload;
  fromCache: boolean;
  retryAfterMs?: number | null;
};

type CachedSnapshot = {
  expiresAt: number;
  result: MoonlightStoreSnapshotFetchResult;
};

const cache = new Map<string, CachedSnapshot>();
const inFlight = new Map<string, Promise<MoonlightStoreSnapshotFetchResult>>();
const circuitFailures = new Map<string, { failures: number; openUntil: number }>();
const SNAPSHOT_CIRCUIT_COOLDOWN_MS = 5_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumberOrNull(value: unknown) {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isSnapshotAreaStatus(value: unknown): value is MoonlightStoreAreaStatus {
  return value === "ready"
    || value === "stale"
    || value === "unavailable"
    || value === "unauthenticated"
    || value === "deferred"
    || value === "unrequested";
}

export function isMoonlightStoreSnapshot(value: unknown): value is MoonlightStoreSnapshot {
  if (!isRecord(value) || Number(value.schemaVersion) !== MOONLIGHT_STORE_SNAPSHOT_SCHEMA_VERSION) return false;
  if (typeof value.generatedAt !== "string" || !Number.isFinite(Date.parse(value.generatedAt))) return false;
  if (typeof value.expiresAt !== "string" || !Number.isFinite(Date.parse(value.expiresAt))) return false;
  if (value.source !== "db" && value.source !== "token" && value.source !== "legacy") return false;

  const areas = isRecord(value.areas) ? value.areas : null;
  const moonstone = areas && isRecord(areas.moonstone) ? areas.moonstone : null;
  const membership = areas && isRecord(areas.membership) ? areas.membership : null;
  const passes = areas && isRecord(areas.passes) ? areas.passes : null;
  const orders = areas && isRecord(areas.orders) ? areas.orders : null;
  const availability = isRecord(value.availability) ? value.availability : null;
  if (!moonstone || !membership || !passes || !orders || !availability) return false;
  if (!isSnapshotAreaStatus(moonstone.status) || !isFiniteNumberOrNull(moonstone.balance)) return false;
  if (moonstone.expiresAt !== null && typeof moonstone.expiresAt !== "string") return false;
  if (!isSnapshotAreaStatus(membership.status)) return false;
  if (membership.tier !== null && typeof membership.tier !== "string") return false;
  if (membership.isActive !== null && typeof membership.isActive !== "boolean") return false;
  if (membership.expiresAt !== null && typeof membership.expiresAt !== "string") return false;
  if (!isSnapshotAreaStatus(passes.status) || !Array.isArray(passes.summary)) return false;
  if (orders.status !== "deferred" && orders.status !== "ready" && orders.status !== "unavailable") return false;
  if (orders.hasRecentOrders !== null && typeof orders.hasRecentOrders !== "boolean") return false;
  if (availability.status !== "ready" && availability.status !== "unavailable") return false;
  if (typeof availability.purchasesEnabled !== "boolean") return false;

  return passes.summary.every((entry) => {
    if (!isRecord(entry)) return false;
    const productType = entry.productType;
    return (productType === "guardian-fortune" || productType === "fusion-fortune")
      && (entry.status === "available" || entry.status === "unavailable" || entry.status === "unrequested")
      && isFiniteNumberOrNull(entry.remaining)
      && entry.detailRequired === true;
  });
}

function snapshotKey(userId: string, apiBase: string) {
  return `${remoteQueryKeyToString(remoteQueryKeys.commerce.moonlightSnapshot())}:${String(apiBase || "").trim()}::${String(userId || "").trim().toLowerCase()}`;
}

function toPayload(value: unknown): SnapshotPayload {
  return isRecord(value) ? value as SnapshotPayload : {
    ok: false,
    code: "STORE_SNAPSHOT_MALFORMED_RESPONSE",
    message: "상점 요약 응답을 확인하지 못했습니다.",
  };
}

function snapshotCircuitOpenResult(): MoonlightStoreSnapshotFetchResult {
  return {
    status: 503,
    ok: false,
    payload: {
      ok: false,
      retryable: true,
      code: "STORE_SNAPSHOT_CIRCUIT_OPEN",
      message: "상점 요약 조회를 잠시 중단했습니다. 잠시 후 다시 확인해 주세요.",
    },
    fromCache: false,
    retryAfterMs: SNAPSHOT_CIRCUIT_COOLDOWN_MS,
  };
}

function readRetryAfterMs(response: Response) {
  const value = String(response.headers.get("Retry-After") || "").trim();
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.min(5_000, Math.round(seconds * 1_000)));
  const dateMs = Date.parse(value);
  return Number.isFinite(dateMs) ? Math.max(0, Math.min(5_000, dateMs - Date.now())) : null;
}

function isRetryableSnapshotResult(result: MoonlightStoreSnapshotFetchResult) {
  return result.status >= 500
    && result.status <= 504
    && (result.status === 502 || result.status === 503 || result.status === 504 || result.payload.retryable === true);
}

function waitForSnapshotRetry(delayMs: number, signal?: AbortSignal) {
  if (signal?.aborted) {
    const error = new Error("Snapshot request aborted");
    error.name = "AbortError";
    return Promise.reject(error);
  }
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, Math.max(0, delayMs));
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      const error = new Error("Snapshot request aborted");
      error.name = "AbortError";
      reject(error);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function clearMoonlightStoreSnapshot(userId?: string, apiBase = getApiBaseUrl()) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    cache.clear();
    return;
  }
  cache.delete(snapshotKey(normalizedUserId, apiBase));
}

export function readMoonlightStoreSnapshot(userId: string, apiBase = getApiBaseUrl()) {
  const entry = cache.get(snapshotKey(userId, apiBase));
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.result;
}

export async function fetchMoonlightStoreSnapshot({
  userId,
  apiBase = getApiBaseUrl(),
  force = false,
  signal,
}: {
  userId: string;
  apiBase?: string;
  force?: boolean;
  signal?: AbortSignal;
}): Promise<MoonlightStoreSnapshotFetchResult> {
  const key = snapshotKey(userId, apiBase);
  if (!force) {
    const cached = readMoonlightStoreSnapshot(userId, apiBase);
    if (cached) return cached;
    const circuit = circuitFailures.get(key);
    if (circuit?.openUntil && circuit.openUntil > Date.now()) return snapshotCircuitOpenResult();
    if (circuit?.openUntil && circuit.openUntil <= Date.now()) circuitFailures.delete(key);
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const requestPromise = (async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await authFetch(`${apiBase}/api/payments/me?view=shop`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        ...(signal ? { signal } : {}),
      }, {
        retryOn401: true,
        apiBase,
        clientSource: "app:points:snapshot",
      });
      let payload: SnapshotPayload;
      try {
        payload = toPayload(await response.json());
      } catch {
        payload = {
          ok: false,
          code: "STORE_SNAPSHOT_MALFORMED_RESPONSE",
          message: "상점 요약 응답을 확인하지 못했습니다.",
        };
      }

      const snapshot = payload.data?.storeSnapshot;
      const contractValid = snapshot === undefined || isMoonlightStoreSnapshot(snapshot);
      const result: MoonlightStoreSnapshotFetchResult = contractValid
        ? { status: response.status, ok: response.ok && payload.ok !== false, payload, fromCache: false, retryAfterMs: readRetryAfterMs(response) }
        : {
          status: response.status,
          ok: false,
          payload: {
            ...payload,
            ok: false,
            code: "STORE_SNAPSHOT_CONTRACT_INVALID",
            message: "상점 요약 계약을 확인하지 못했습니다.",
          },
          fromCache: false,
          retryAfterMs: readRetryAfterMs(response),
        };

      if (result.ok && !payload.degraded && isMoonlightStoreSnapshot(snapshot)) {
        circuitFailures.delete(key);
        cache.set(key, {
          expiresAt: Date.now() + MOONLIGHT_STORE_SNAPSHOT_TTL_MS,
          result,
        });
      }
      if (!isRetryableSnapshotResult(result) || attempt === 1) {
        if (isRetryableSnapshotResult(result)) {
          const previous = circuitFailures.get(key);
          const failures = (previous?.failures || 0) + 1;
          circuitFailures.set(key, {
            failures,
            openUntil: failures >= 2 ? Date.now() + SNAPSHOT_CIRCUIT_COOLDOWN_MS : 0,
          });
        }
        return result;
      }
      const retryDelayMs = result.retryAfterMs ?? (700 + Math.floor(Math.random() * 250));
      await waitForSnapshotRetry(retryDelayMs, signal);
    }
    throw new Error("Moonlight store snapshot did not settle");
  })();

  inFlight.set(key, requestPromise);
  try {
    return await requestPromise;
  } finally {
    if (inFlight.get(key) === requestPromise) inFlight.delete(key);
  }
}
