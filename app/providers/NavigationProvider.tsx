"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ExitToast from "@/app/components/common/ExitToast";
import {
  attemptAppExit,
  createPopstateDebouncer,
  ensureGuardState,
  rearmGuardState,
  resolveBackPolicy,
  type BackPolicy,
} from "@/lib/navigation/backHandler";

export type BackHandlerScope = "analysis";

export type BackHandlerRegistration = {
  id: string;
  scope: BackHandlerScope;
  priority?: number;
  maxInternalBackSteps?: number;
  enabled: () => boolean;
  isLocked: () => boolean;
  canGoBack: () => boolean;
  onBack: () => boolean | void;
};

type BackNavigationContextValue = {
  registerBackHandler: (registration: BackHandlerRegistration) => () => void;
};

export const BackNavigationContext = createContext<BackNavigationContextValue | null>(null);

const MAIN_EXIT_WINDOW_MS = 2000;
const TRANSITION_LOCK_MS = 220;

function toPathKey(pathname: string) {
  return pathname || "/";
}

function pickActiveAnalysisHandler(
  handlers: Map<string, BackHandlerRegistration>,
) {
  const list: BackHandlerRegistration[] = [];
  handlers.forEach((handler) => {
    if (handler.scope !== "analysis") return;
    if (!handler.enabled()) return;
    list.push(handler);
  });
  if (list.length === 0) return null;
  list.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return list[0];
}

export default function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  const handlersRef = useRef<Map<string, BackHandlerRegistration>>(new Map());
  const pathRef = useRef(pathname);
  const routeChangedAtRef = useRef(0);
  const firstMainBackAtRef = useRef(0);
  const hideToastTimerRef = useRef<number | null>(null);
  const popDebounceRef = useRef(createPopstateDebouncer(170));
  const analysisDepthByPathRef = useRef<Record<string, number>>({});

  const [exitToastVisible, setExitToastVisible] = useState(false);
  const [exitToastMessage, setExitToastMessage] = useState("한 번 더 누르면 종료됩니다");

  const clearToastTimer = useCallback(() => {
    if (hideToastTimerRef.current !== null) {
      window.clearTimeout(hideToastTimerRef.current);
      hideToastTimerRef.current = null;
    }
  }, []);

  const hideExitToast = useCallback(() => {
    clearToastTimer();
    setExitToastVisible(false);
  }, [clearToastTimer]);

  const showExitToast = useCallback((message: string) => {
    clearToastTimer();
    setExitToastMessage(message);
    setExitToastVisible(true);
    hideToastTimerRef.current = window.setTimeout(() => {
      setExitToastVisible(false);
      firstMainBackAtRef.current = 0;
      hideToastTimerRef.current = null;
    }, MAIN_EXIT_WINDOW_MS);
  }, [clearToastTimer]);

  const registerBackHandler = useCallback((registration: BackHandlerRegistration) => {
    handlersRef.current.set(registration.id, registration);
    return () => {
      handlersRef.current.delete(registration.id);
    };
  }, []);

  useEffect(() => {
    pathRef.current = pathname;
    routeChangedAtRef.current = Date.now();

    const pathKey = toPathKey(pathname);
    const policy = resolveBackPolicy(pathKey);

    if (policy.kind !== "none") {
      ensureGuardState(pathKey, policy.kind);
    }

    if (policy.kind !== "main") {
      firstMainBackAtRef.current = 0;
      hideExitToast();
    }

    analysisDepthByPathRef.current[pathKey] = 0;
  }, [pathname, hideExitToast]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMainBack = (pathKey: string) => {
      const now = Date.now();
      if (now - firstMainBackAtRef.current <= MAIN_EXIT_WINDOW_MS) {
        hideExitToast();
        const exitResult = attemptAppExit(window);
        firstMainBackAtRef.current = 0;
        if (!exitResult.handled) {
          rearmGuardState(pathKey, "main");
        }
        return;
      }

      firstMainBackAtRef.current = now;
      showExitToast("한 번 더 누르면 종료됩니다");
      rearmGuardState(pathKey, "main");
    };

    const handleAnalysisBack = (pathKey: string, policy: BackPolicy) => {
      const activeHandler = pickActiveAnalysisHandler(handlersRef.current);
      if (!activeHandler) {
        router.replace("/");
        return;
      }

      if (activeHandler.isLocked()) {
        rearmGuardState(pathKey, "analysis");
        return;
      }

      const maxInternalBackSteps = Math.max(
        1,
        Number(activeHandler.maxInternalBackSteps || policy.maxInternalBackSteps || 1),
      );
      const usedDepth = Number(analysisDepthByPathRef.current[pathKey] || 0);

      if (usedDepth < maxInternalBackSteps && activeHandler.canGoBack()) {
        const handled = activeHandler.onBack();
        if (handled !== false) {
          analysisDepthByPathRef.current[pathKey] = usedDepth + 1;
          rearmGuardState(pathKey, "analysis");
          return;
        }
      }

      analysisDepthByPathRef.current[pathKey] = 0;
      router.replace("/");
    };

    const onPopState = () => {
      const pathKey = toPathKey(pathRef.current || "/");
      const policy = resolveBackPolicy(pathKey);
      if (policy.kind === "none") return;

      if (!popDebounceRef.current()) {
        rearmGuardState(pathKey, policy.kind);
        return;
      }

      const elapsedFromPathChange = Date.now() - routeChangedAtRef.current;
      if (elapsedFromPathChange < TRANSITION_LOCK_MS) {
        rearmGuardState(pathKey, policy.kind);
        return;
      }

      if (policy.kind === "main") {
        handleMainBack(pathKey);
        return;
      }

      if (policy.kind === "analysis") {
        handleAnalysisBack(pathKey, policy);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [hideExitToast, router, showExitToast]);

  useEffect(() => {
    return () => {
      clearToastTimer();
    };
  }, [clearToastTimer]);

  const contextValue = useMemo<BackNavigationContextValue>(() => {
    return {
      registerBackHandler,
    };
  }, [registerBackHandler]);

  return (
    <BackNavigationContext.Provider value={contextValue}>
      {children}
      <ExitToast visible={exitToastVisible} message={exitToastMessage} />
    </BackNavigationContext.Provider>
  );
}
