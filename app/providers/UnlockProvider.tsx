"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

type AccessStoreSnapshot = {
  cacheKey: string;
  profileId: string;
  userId: string;
  persistentUnlocks: Record<string, boolean>;
  optimistic: Record<string, unknown>;
  membership: unknown;
  accessDecision: Record<string, unknown>;
  status: "loading" | "ready" | "degraded" | "error" | string;
  error: unknown;
  checkedAt: number;
  source: string;
  lastPayload: unknown;
};

type AccessStore = {
  subscribe: (listener: (snapshot: AccessStoreSnapshot) => void) => () => void;
  getSnapshot: () => AccessStoreSnapshot;
  ensureLoaded: (options?: Record<string, unknown>) => Promise<unknown>;
  revalidate: (options?: Record<string, unknown>) => Promise<unknown>;
  getAccessDecision: (options?: Record<string, unknown>) => Promise<{
    ok: boolean;
    status?: number;
    payload?: Record<string, unknown> | null;
    code?: string;
    aborted?: boolean;
  }>;
  invalidateAccessDecision: () => void;
  isUnlocked: (featureKey: string) => boolean;
  applyPaymentPayload: (payload: unknown, options?: Record<string, unknown>) => string[];
  markOptimisticallyUnlocked: (featureKey: string, profileId?: string, metadata?: Record<string, unknown>) => boolean;
};

declare global {
  interface Window {
    CodeDestinyAccessStore?: AccessStore;
  }
}

const EMPTY_SNAPSHOT: AccessStoreSnapshot = {
  cacheKey: "",
  profileId: "",
  userId: "anonymous",
  persistentUnlocks: {},
  optimistic: {},
  membership: null,
  accessDecision: {},
  status: "loading",
  error: null,
  checkedAt: 0,
  source: "empty",
  lastPayload: null,
};

const AccessStoreContext = createContext<AccessStore | null>(null);

function getStore(): AccessStore | null {
  if (typeof window === "undefined") return null;
  return window.CodeDestinyAccessStore || null;
}

export function useAccessStore(): AccessStore | null {
  return useContext(AccessStoreContext) || getStore();
}

export function useAccessStoreSnapshot(): AccessStoreSnapshot {
  const store = useAccessStore();
  return useSyncExternalStore(
    (listener) => store?.subscribe(listener) || (() => undefined),
    () => store?.getSnapshot() || EMPTY_SNAPSHOT,
    () => EMPTY_SNAPSHOT,
  );
}

export default function UnlockProvider({ children }: { children: ReactNode }) {
  const store = getStore();
  const contextValue = useMemo(() => store, [store]);

  useEffect(() => {
    if (!store) return;
    void store.ensureLoaded({ reason: "provider-mount", authenticated: true });
  }, [store]);

  return <AccessStoreContext.Provider value={contextValue}>{children}</AccessStoreContext.Provider>;
}
