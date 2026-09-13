"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useAccessStore, useAccessStoreSnapshot } from "@/app/providers/UnlockProvider";
import { readPendingOptimisticUnlockKeys, recordOptimisticUnlock } from "@/app/_lib/optimistic-unlock-ledger";
import { LEGACY_LOVE_CODE_FEATURE_KEYS, LOVE_CODE_FEATURE_KEY, normalizeLoveCodeFeatureKey } from "@/app/_lib/love-code-entitlement";

export type ContentUnlockStatus = "loading" | "ready" | "degraded" | "error";

export type UseContentUnlockResult = {
  unlocked: Record<string, boolean>;
  status: ContentUnlockStatus;
  isLoading: boolean;
  isDegraded: boolean;
  refetch: (options?: { force?: boolean }) => Promise<void>;
  lastUpdatedAt: number;
  markOptimisticallyUnlocked: (key: string) => void;
};

export type FeatureAccessState = "loading" | "unlocked" | "locked" | "error";

export type UseCanUseFeatureResult = {
  state: FeatureAccessState;
  canUse: boolean;
  isChecking: boolean;
  refetch: (options?: { force?: boolean }) => Promise<void>;
  lastUpdatedAt: number;
};

/**
 * 🔴 원장은 답이 아니라 **대기 버퍼**다 (Phase 4 D3). 결제 성공과 서버 반영 사이의 공백에서만,
 * 아직 페이로드에 안 보이는 **낙관** 엔트리로 기울인다. 확정 기록(`confirmed`·`legacy_verified`)은
 * 서버가 이미 아는 사실이라 여기서 읽지 않는다 — 읽으면 서버가 회수한 뒤에도 원장이 열어 준다.
 */
export function readLedgerUnlockedMap(keys: string[]): Record<string, boolean> {
  const ledgerKeys = readPendingOptimisticUnlockKeys();
  const next: Record<string, boolean> = {};
  for (const key of keys) {
    const canonicalKey = normalizeLoveCodeFeatureKey(key);
    next[canonicalKey] = ledgerKeys.some((ledgerKey) => normalizeLoveCodeFeatureKey(ledgerKey) === canonicalKey);
  }
  return next;
}

type AccessStoreSnapshot = ReturnType<typeof useAccessStoreSnapshot>;

function snapshotIncludesFeature(snapshot: AccessStoreSnapshot, key: string): boolean {
  const aliases = key === LOVE_CODE_FEATURE_KEY ? [LOVE_CODE_FEATURE_KEY, ...LEGACY_LOVE_CODE_FEATURE_KEYS] : [key];
  return aliases.some((alias) => snapshot.confirmedUnlocks[alias] === true || snapshot.persistentUnlocks[alias] === true || Boolean(snapshot.optimistic[alias]));
}

/**
 * 🔴 서버 정본이 도착했는가 (Phase 4 D3). 도착했으면 원장은 입을 닫는다 — 그 순간부터 해금 집합의
 * 답은 서버 하나이고, 원장이 남긴 기록은 그 답을 넓히기만 하기 때문이다.
 *
 * 판정 기준은 access-store 가 스냅샷을 권위로 인정하는 기준과 같다(access-store.js:656-658, :711):
 * degraded 가 아니고 completeness: "full" · authority: "server" 인 응답. 서버는 이 둘을 최상위와
 * entitlementSnapshot 양쪽에 낸다(worker/lib/access-state.js:209·216·269·271).
 * 🔴 방향은 fail-open 이다 — 확신이 없으면(로딩·degraded·stale) 원장을 계속 듣는다. 여기서 잘못
 * 닫으면 산 사람이 잠긴다.
 */
export function snapshotCarriesServerAuthority(snapshot: AccessStoreSnapshot): boolean {
  if (snapshot.status !== "ready") return false;
  const entitlement = snapshot.entitlementSnapshot as { completeness?: unknown; authority?: unknown } | null | undefined;
  if (!entitlement || typeof entitlement !== "object") return false;
  return String(entitlement.completeness || "").toLowerCase() === "full"
    && String(entitlement.authority || "").toLowerCase() === "server";
}

/**
 * W1(access-store) 과 W3(원장)의 합류 지점. 훅 밖으로 꺼내 둔 이유는 이 한 줄이 Phase 4 의 수렴
 * 대상이라 실행으로 고정해야 하기 때문이다(__tests__/ui/permission-writer-divergence.behavior.test.js).
 */
export function resolveUnlockedMap(snapshot: AccessStoreSnapshot, keys: string[]): Record<string, boolean> {
  const ledger = snapshotCarriesServerAuthority(snapshot) ? null : readLedgerUnlockedMap(keys);
  const next: Record<string, boolean> = {};
  for (const rawKey of keys) {
    const key = normalizeLoveCodeFeatureKey(rawKey);
    next[key] = snapshotIncludesFeature(snapshot, key) || (ledger !== null && ledger[key] === true);
  }
  return next;
}

function normalizeStatus(value: string): ContentUnlockStatus {
  if (value === "ready" || value === "degraded" || value === "error") return value;
  return "loading";
}

/**
 * All content unlock reads go through the browser-global AccessStore.
 * Components only select from the shared snapshot; they never own a request.
 */
export function useContentUnlock(keys: string[], options: { auto?: boolean } = {}): UseContentUnlockResult {
  const auto = options.auto !== false;
  const store = useAccessStore();
  const snapshot = useAccessStoreSnapshot();
  const keySignature = keys.join("\u0001");

  const unlocked = useMemo(() => resolveUnlockedMap(snapshot, keys), [keys, snapshot]);

  const refetch = useCallback(async (refetchOptions: { force?: boolean } = {}) => {
    if (!store) return;
    if (refetchOptions.force) {
      await store.revalidate({ reason: "content-unlock-refetch" });
    } else {
      await store.ensureLoaded({ reason: "content-unlock-read" });
    }
  }, [store]);

  const markOptimisticallyUnlocked = useCallback((key: string) => {
    recordOptimisticUnlock(key);
    store?.markOptimisticallyUnlocked(key, snapshot.profileId, { source: "content-unlock-hook" });
  }, [snapshot.profileId, store]);

  useEffect(() => {
    if (!auto || !store) return;
    void store.ensureLoaded({ reason: "content-unlock-hook", authenticated: true });
  }, [auto, keySignature, store]);

  const status = normalizeStatus(snapshot.status);
  return {
    unlocked,
    status,
    isLoading: status === "loading",
    isDegraded: status === "degraded",
    refetch,
    lastUpdatedAt: snapshot.checkedAt,
    markOptimisticallyUnlocked,
  };
}

/** Shared feature selector. Server snapshots remain the final authority after every payment/resume. */
export function useCanUseFeature(featureKey: string, options: { auto?: boolean } = {}): UseCanUseFeatureResult {
  const canonicalKey = normalizeLoveCodeFeatureKey(featureKey);
  const content = useContentUnlock([canonicalKey], options);
  const canUse = content.unlocked[canonicalKey] === true;
  const state: FeatureAccessState = content.status === "loading"
    ? "loading"
    : content.status === "error" || content.status === "degraded"
      ? "error"
      : canUse
        ? "unlocked"
        : "locked";
  return {
    state,
    canUse,
    isChecking: state === "loading",
    refetch: content.refetch,
    lastUpdatedAt: content.lastUpdatedAt,
  };
}
