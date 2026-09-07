"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useAccessStore, useAccessStoreSnapshot } from "@/app/providers/UnlockProvider";
import { readLedgerUnlockKeys, recordOptimisticUnlock } from "@/app/_lib/optimistic-unlock-ledger";
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

/** Legacy ledger remains readable for already-paid users during the Store migration. */
export function readLedgerUnlockedMap(keys: string[]): Record<string, boolean> {
  const ledgerKeys = readLedgerUnlockKeys();
  const next: Record<string, boolean> = {};
  for (const key of keys) {
    const canonicalKey = normalizeLoveCodeFeatureKey(key);
    next[canonicalKey] = ledgerKeys.some((ledgerKey) => normalizeLoveCodeFeatureKey(ledgerKey) === canonicalKey);
  }
  return next;
}

function snapshotIncludesFeature(snapshot: ReturnType<typeof useAccessStoreSnapshot>, key: string): boolean {
  const aliases = key === LOVE_CODE_FEATURE_KEY ? [LOVE_CODE_FEATURE_KEY, ...LEGACY_LOVE_CODE_FEATURE_KEYS] : [key];
  return aliases.some((alias) => snapshot.confirmedUnlocks[alias] === true || snapshot.persistentUnlocks[alias] === true || Boolean(snapshot.optimistic[alias]));
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

  const unlocked = useMemo(() => {
    const ledger = readLedgerUnlockedMap(keys);
    const next: Record<string, boolean> = {};
    for (const rawKey of keys) {
      const key = normalizeLoveCodeFeatureKey(rawKey);
      next[key] = snapshotIncludesFeature(snapshot, key) || ledger[key] === true;
    }
    return next;
  }, [keys, snapshot]);

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
