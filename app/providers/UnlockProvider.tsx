"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { authFetch } from "@/app/_lib/auth-client";

type AccessStoreSnapshot = {
  cacheKey: string;
  profileId: string;
  userId: string;
  persistentUnlocks: Record<string, boolean>;
  optimistic: Record<string, unknown>;
  membership: unknown;
  entitlementSnapshot?: unknown;
  monthlyBalance?: unknown;
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
  refreshEntitlements?: (options?: Record<string, unknown>) => Promise<unknown>;
  applyAccessStateSnapshot?: (payload: unknown, options?: Record<string, unknown>) => boolean;
  getEffectiveTier?: () => string;
  canAccessFeature?: (featureId: string) => boolean;
  canPurchaseProduct?: (productId: string) => { canPurchase: boolean | null; requiresServerVerification: true; source?: string };
  getMonthlyBalance?: () => unknown;
  getAccessDecision: (options?: Record<string, unknown>) => Promise<{
    ok: boolean;
    status?: number;
    payload?: Record<string, unknown> | null;
    code?: string;
    aborted?: boolean;
  }>;
  invalidateAccessDecision: () => void;
  invalidateEntitlements?: (reason?: string) => Promise<unknown>;
  isUnlocked: (featureKey: string) => boolean;
  applyPaymentPayload: (payload: unknown, options?: Record<string, unknown>) => string[];
  applyOptimisticUpdate?: (update: unknown) => string[];
  rollbackOptimisticUpdate?: (reason?: string) => boolean;
  markOptimisticallyUnlocked: (featureKey: string, profileId?: string, metadata?: Record<string, unknown>) => boolean;
  setRequestAdapter?: (adapter: ((url: string, init?: RequestInit) => Promise<Response>) | null) => boolean;
};

type AccessStoreWindow = Window & {
  CodeDestinyAccessStore?: AccessStore;
};

const EMPTY_SNAPSHOT: AccessStoreSnapshot = {
  cacheKey: "",
  profileId: "",
  userId: "anonymous",
  persistentUnlocks: {},
  optimistic: {},
  membership: null,
  entitlementSnapshot: null,
  monthlyBalance: null,
  accessDecision: {},
  status: "loading",
  error: null,
  checkedAt: 0,
  source: "empty",
  lastPayload: null,
};

const AccessStoreContext = createContext<AccessStore | null>(null);

function accessStoreAuthFetch(url: string, init?: RequestInit) {
  return authFetch(url, init, { clientSource: "app:access-store" });
}

function getStore(): AccessStore | null {
  if (typeof window === "undefined") return null;
  const store = (window as AccessStoreWindow).CodeDestinyAccessStore || null;
  store?.setRequestAdapter?.(accessStoreAuthFetch);
  return store;
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

  return <AccessStoreContext.Provider value={contextValue}>{children}</AccessStoreContext.Provider>;
}
