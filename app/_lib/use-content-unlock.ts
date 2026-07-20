"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchBillingBalance } from "@/app/_lib/billing-client";
import { readLedgerUnlockKeys, recordOptimisticUnlock, recordVerifiedUnlock } from "@/app/_lib/optimistic-unlock-ledger";

export type ContentUnlockStatus = "loading" | "ready" | "degraded" | "error";

export type UseContentUnlockResult = {
  unlocked: Record<string, boolean>;
  status: ContentUnlockStatus;
  isLoading: boolean;
  isDegraded: boolean;
  refetch: (options?: { force?: boolean }) => Promise<void>;
  lastUpdatedAt: number;
  /** 결제 성공 직후 서버 확정 전까지 임시로 true로 표시한다. */
  markOptimisticallyUnlocked: (key: string) => void;
};

function buildUnlockedMap(keys: string[], data: { unlockedFeatures?: string[]; unlockMap?: Record<string, boolean> } | null): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  const unlockedFeatures = Array.isArray(data?.unlockedFeatures) ? data!.unlockedFeatures : [];
  const unlockMap = data?.unlockMap && typeof data.unlockMap === "object" ? data!.unlockMap : {};
  const ledgerKeys = readLedgerUnlockKeys();
  for (const key of keys) {
    const serverUnlocked = unlockMap[key] === true || unlockedFeatures.includes(key);
    // 서버가 확정한 해금은 원장에도 남겨 다음 방문에서 스피너 없이 바로 열리게 한다.
    if (serverUnlocked) recordVerifiedUnlock(key);
    next[key] = serverUnlocked || ledgerKeys.includes(key);
  }
  return next;
}

/** 서버 왕복 없이 원장만으로 만드는 즉시 판정 — 첫 페인트에서 대기 화면을 건너뛰는 데 쓴다. */
export function readLedgerUnlockedMap(keys: string[]): Record<string, boolean> {
  const ledgerKeys = readLedgerUnlockKeys();
  const next: Record<string, boolean> = {};
  for (const key of keys) next[key] = ledgerKeys.includes(key);
  return next;
}

/**
 * 잠금 콘텐츠 해제 여부의 단일 판정 지점. 서버(/api/billing/balance)를 진실 원천으로 삼고,
 * 네트워크 오류/degraded 응답에서는 직전 성공 스냅샷을 유지한 채 status만 표시한다 — 잠금
 * 콘텐츠를 "로딩/불확실" 상태에서 성급히 false로 떨어뜨리지 않기 위함이다.
 */
export function useContentUnlock(keys: string[], options: { auto?: boolean } = {}): UseContentUnlockResult {
  const auto = options.auto !== false;
  const keysRef = useRef(keys);
  keysRef.current = keys;

  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<ContentUnlockStatus>("loading");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(0);
  const optimisticRef = useRef<Record<string, number>>({});
  const OPTIMISTIC_HOLD_MS = 15000;

  const refetch = useCallback(async (opts: { force?: boolean } = {}) => {
    setStatus((prev) => (prev === "ready" ? prev : "loading"));
    const response = await fetchBillingBalance({ force: opts.force === true }).catch(() => null);
    const data = response?.ok ? response.data : null;
    if (!response || !response.ok || !data) {
      // 이미 확보한 unlocked 스냅샷은 그대로 유지한다 — "확인 실패"를 "미구매"로 취급하지 않는다.
      setStatus((prev) => (prev === "loading" ? "error" : prev));
      return;
    }
    if (data.degraded === true) {
      setStatus("degraded");
      return;
    }
    const now = Date.now();
    const resolved = buildUnlockedMap(keysRef.current, data);
    setUnlocked((prev) => {
      const next = { ...prev, ...resolved };
      // 결제 직후 낙관적으로 true 처리한 키는, 홀드 기간 동안 서버가 아직 그 키를
      // 명시적으로 false로 확정하지 않는 한 되돌리지 않는다(엔티틀먼트 반영 지연 대비).
      for (const key of Object.keys(optimisticRef.current)) {
        const markedAt = optimisticRef.current[key];
        if (now - markedAt > OPTIMISTIC_HOLD_MS) {
          delete optimisticRef.current[key];
          continue;
        }
        if (resolved[key] === true) {
          delete optimisticRef.current[key];
        } else if (key in next) {
          next[key] = true;
        }
      }
      return next;
    });
    setStatus("ready");
    setLastUpdatedAt(now);
  }, []);

  const markOptimisticallyUnlocked = useCallback((key: string) => {
    optimisticRef.current[key] = Date.now();
    recordOptimisticUnlock(key);
    setUnlocked((prev) => ({ ...prev, [key]: true }));
  }, []);

  // 원장(셸/다른 탭에서 확정·낙관 기록된 해금)을 서버 왕복 없이 즉시 반영한다.
  const mergeLedger = useCallback(() => {
    const ledgerKeys = readLedgerUnlockKeys();
    if (!ledgerKeys.length) return;
    setUnlocked((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of keysRef.current) {
        if (ledgerKeys.includes(key) && next[key] !== true) {
          next[key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    if (!auto) return;
    // 서버 응답을 기다리는 동안 대기 화면을 띄우지 않기 위해, 마운트 직후 원장부터 반영한다.
    mergeLedger();
    refetch();
    const onBillingUpdated = () => refetch();
    const onAuthChanged = () => refetch({ force: true });
    const onUnlocksChanged = () => mergeLedger();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };
    window.addEventListener("cd:billing-balance-updated", onBillingUpdated);
    window.addEventListener("cd:auth-changed", onAuthChanged);
    window.addEventListener("cd:unlocks-changed", onUnlocksChanged);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("cd:billing-balance-updated", onBillingUpdated);
      window.removeEventListener("cd:auth-changed", onAuthChanged);
      window.removeEventListener("cd:unlocks-changed", onUnlocksChanged);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, refetch, mergeLedger]);

  return {
    unlocked,
    status,
    isLoading: status === "loading",
    isDegraded: status === "degraded",
    refetch,
    lastUpdatedAt,
    markOptimisticallyUnlocked,
  };
}
