"use client";

import { createContext, useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getActivePaidAttemptSession,
  isPaidAttemptInProgress,
  logPaidAttemptEvent,
} from "@/app/_lib/paid-attempt-session";
import { trackEvent } from "@/lib/analytics";
import {
  createPopstateDebouncer,
  ensureGuardState,
  isTransientBaseState,
  rearmGuardState,
  resolveBackPolicy,
  type BackPolicy,
} from "@/lib/navigation/backHandler";
import { installTransientBackHost } from "@/lib/navigation/transientBack";

/**
 * Back handlers are evaluated from the most local transient surface outward.
 * A sheet must close before a wizard changes step, and a wizard must change
 * step before an analysis route leaves the current document.
 */
export type BackHandlerScope = "overlay" | "wizard" | "analysis";

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
  ensureTransientBackGuard: () => void;
  releaseTransientBackGuard: () => void;
};

export const BackNavigationContext = createContext<BackNavigationContextValue | null>(null);

const TRANSITION_LOCK_MS = 220;

function toPathKey(pathname: string) {
  return pathname || "/";
}

function getAnalysisFallbackPath(pathname: string) {
  if (!pathname || pathname.startsWith("/saju")) return "/saju";
  const localeMatch = pathname.match(/^\/(en|ja|zh|en-us|ja-jp|zh-cn)(?=\/|$)/i);
  if (!localeMatch) return "/saju";
  return `/${localeMatch[1]}/saju`;
}

// 웹·PWA의 루트에는 종료 가드를 두지 않는다. Android 종료는 주입 브릿지가 소유한다.
function resolveRuntimeBackPolicy(pathKey: string): BackPolicy {
  const policy = resolveBackPolicy(pathKey);
  return policy.kind === "main" ? { kind: "none" } : policy;
}

const SCOPE_PRIORITY: Record<BackHandlerScope, number> = {
  overlay: 300,
  wizard: 200,
  analysis: 100,
};

function pickActiveBackHandler(
  handlers: Map<string, BackHandlerRegistration>,
) {
  const list: BackHandlerRegistration[] = [];
  handlers.forEach((handler) => {
    if (!handler.enabled()) return;
    list.push(handler);
  });
  if (list.length === 0) return null;
  list.sort((a, b) => {
    const scopeDelta = SCOPE_PRIORITY[b.scope] - SCOPE_PRIORITY[a.scope];
    if (scopeDelta !== 0) return scopeDelta;
    return (b.priority || 0) - (a.priority || 0);
  });
  return list[0];
}

export default function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  const handlersRef = useRef<Map<string, BackHandlerRegistration>>(new Map());
  const pathRef = useRef(pathname);
  const routeChangedAtRef = useRef(0);
  const popDebounceRef = useRef(createPopstateDebouncer(170));
  const analysisDepthByPathRef = useRef<Record<string, number>>({});
  const transientDismissersRef = useRef<Set<() => void>>(new Set());
  const staleTransientPathRef = useRef<string | null>(null);

  const registerBackHandler = useCallback((registration: BackHandlerRegistration) => {
    handlersRef.current.set(registration.id, registration);
    return () => {
      handlersRef.current.delete(registration.id);
    };
  }, []);

  const ensureTransientBackGuard = useCallback(() => {
    staleTransientPathRef.current = null;
    ensureGuardState(toPathKey(pathRef.current), "transient");
  }, []);

  // 단계형 흐름이 첫 단계로 돌아오면(뒤로가기·이전 버튼 모두) 가드 엔트리가 하나 남는다.
  // 임시 표면을 버튼으로 닫았을 때처럼, 다음 뒤로가기 때 한 칸 더 내려 준다(onPopState).
  const releaseTransientBackGuard = useCallback(() => {
    staleTransientPathRef.current = toPathKey(pathRef.current);
  }, []);

  const fallbackHistoryBack = useCallback(
    (pathKey: string, policy: BackPolicy) => {
      if (typeof window === "undefined") {
        router.replace(getAnalysisFallbackPath(pathKey));
        return;
      }

      const startPath = window.location.pathname || pathKey;
      const startLength = Number(window.history.length || 0);
      const fallbackPath = getAnalysisFallbackPath(pathKey);

      window.history.back();

      window.setTimeout(() => {
        if (window.location.pathname !== startPath) {
          rearmGuardState(pathKey, policy.kind);
          return;
        }

        if (startLength > 1) {
          window.history.back();
          window.setTimeout(() => {
            if (window.location.pathname !== startPath) {
              rearmGuardState(pathKey, policy.kind);
              return;
            }

            router.replace(fallbackPath);
          }, 120);
          return;
        }

        router.replace(fallbackPath);
      }, 120);
    },
    [router],
  );

  useEffect(() => {
    // 🔴 첫 진입은 js/core/analytics.js 의 gtag("config") 가 이미 page_view 를 한 번 쏜다.
    // 여기서 무조건 쏘면 진입 화면만 두 번 잡히므로, 경로가 실제로 바뀐 전환에만 보낸다
    // (pathRef 는 useRef(pathname) 으로 시작하므로 마운트 시에는 같다).
    if (pathRef.current !== pathname) {
      trackEvent("page_view", { page_path: pathname });
      // 이전 화면에서 연 임시 표면(결제 선택창 등)을 새 화면 위에 남기지 않는다.
      transientDismissersRef.current.forEach((dismiss) => dismiss());
      staleTransientPathRef.current = null;
    }
    pathRef.current = pathname;
    routeChangedAtRef.current = Date.now();

    const pathKey = toPathKey(pathname);
    const policy = resolveRuntimeBackPolicy(pathKey);

    if (policy.kind !== "none") {
      ensureGuardState(pathKey, policy.kind);
    }

    analysisDepthByPathRef.current[pathKey] = 0;
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAnalysisBack = (pathKey: string, policy: BackPolicy) => {
      const activeAttempt = getActivePaidAttemptSession();
      const activeHandler = pickActiveBackHandler(handlersRef.current);
      // overlay/wizard 는 실제 라우트가 바뀌지 않는 임시 표면이다. 분석 핸들러는
      // 기존 결제 시도 보호와 내부 단계 규칙을 그대로 탄다.
      if (activeHandler && activeHandler.scope !== "analysis") {
        if (activeHandler.isLocked() || !activeHandler.canGoBack()) {
          rearmGuardState(pathKey, "transient");
          return;
        }
        const handled = activeHandler.onBack();
        if (handled === false) {
          rearmGuardState(pathKey, "transient");
          return;
        }
        // overlay 는 이번 popstate 자체로 닫힌다. 다시 guard 를 넣으면 X/브라우저
        // back 뒤에 불필요한 한 번의 back 이 생긴다. wizard 는 이전 단계가 남으므로
        // 다음 back 도 같은 흐름으로 받는다.
        if (activeHandler.scope === "wizard") {
          rearmGuardState(pathKey, "transient");
        }
        return;
      }
      if (!activeHandler) {
        if (activeAttempt && isPaidAttemptInProgress()) {
          logPaidAttemptEvent("PaidAttempt.RedirectBlocked", {
            attemptId: activeAttempt.attemptId,
            featureKey: activeAttempt.featureKey,
            paymentStatus: activeAttempt.paymentStatus,
            generationStatus: activeAttempt.generationStatus,
            reason: "analysis_back_without_handler",
          });
          rearmGuardState(pathKey, "analysis");
          return;
        }
        fallbackHistoryBack(pathKey, policy);
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
      if (activeAttempt && isPaidAttemptInProgress()) {
        logPaidAttemptEvent("PaidAttempt.RedirectBlocked", {
          attemptId: activeAttempt.attemptId,
          featureKey: activeAttempt.featureKey,
          paymentStatus: activeAttempt.paymentStatus,
          generationStatus: activeAttempt.generationStatus,
          reason: "analysis_back_depth_exhausted",
        });
        rearmGuardState(pathKey, "analysis");
        return;
      }
      fallbackHistoryBack(pathKey, policy);
    };

    const onPopState = () => {
      const pathKey = toPathKey(pathRef.current || "/");
      const activeHandler = pickActiveBackHandler(handlersRef.current);
      const policy = activeHandler && activeHandler.scope !== "analysis"
        ? { kind: "transient" as const }
        : resolveRuntimeBackPolicy(pathKey);
      if (policy.kind === "none") {
        // 버튼으로 닫힌 임시 표면의 가드에서 한 칸 내려온 것뿐이면, 이 뒤로가기가 하려던 이동을 마저 한다.
        if (staleTransientPathRef.current === pathKey && isTransientBaseState(pathKey)) {
          staleTransientPathRef.current = null;
          window.history.back();
        }
        return;
      }

      if (!popDebounceRef.current()) {
        rearmGuardState(pathKey, policy.kind);
        return;
      }

      const elapsedFromPathChange = Date.now() - routeChangedAtRef.current;
      if (elapsedFromPathChange < TRANSITION_LOCK_MS) {
        rearmGuardState(pathKey, policy.kind);
        return;
      }

      if (policy.kind === "analysis" || policy.kind === "transient") {
        handleAnalysisBack(pathKey, policy);
      }
    };

    const onNativeBack = (event: Event) => {
      const scope = (event as CustomEvent<{ scope: string }>).detail?.scope;
      const active = pickActiveBackHandler(handlersRef.current);
      if (scope === "overlay" && active?.scope !== "overlay") return;
      if (!active) {
        // 처리 중인 상담은 기존 이탈 보호를 네이티브에서도 우선한다.
        if (scope !== "overlay" && isPaidAttemptInProgress()) event.preventDefault();
        return;
      }
      event.preventDefault();
      if (active.isLocked() || !active.canGoBack()) return;
      const pathKey = toPathKey(pathRef.current);
      ensureGuardState(pathKey, active.scope === "analysis" ? "analysis" : "transient");
      window.history.back();
    };
    window.addEventListener("cd:app-back", onNativeBack);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("cd:app-back", onNativeBack);
      window.removeEventListener("popstate", onPopState);
    };
  }, [fallbackHistoryBack]);

  useEffect(() => {
    let seq = 0;
    return installTransientBackHost((surface) => {
      seq += 1;
      const pathKey = toPathKey(pathRef.current);
      let released = false;
      let closingByBack = false;
      const dismiss = () => {
        if (!released) surface.dismiss();
      };
      const unregister = registerBackHandler({
        id: `transient-surface-${seq}`,
        scope: "overlay",
        enabled: () => !released,
        isLocked: () => Boolean(surface.isLocked?.()),
        canGoBack: () => true,
        onBack: () => {
          closingByBack = true;
          const stillOpen = surface.onBack();
          closingByBack = false;
          if (stillOpen) return false;
          // 열 때 이 라우트의 가드를 transient 기준 엔트리로 바꿔 두었으므로, 닫혔으면 되돌린다.
          const basePolicy = resolveRuntimeBackPolicy(pathKey);
          if (basePolicy.kind !== "none") rearmGuardState(pathKey, basePolicy.kind);
          return true;
        },
      });
      transientDismissersRef.current.add(dismiss);
      staleTransientPathRef.current = null;
      ensureGuardState(pathKey, "transient");
      return () => {
        if (released) return;
        released = true;
        unregister();
        transientDismissersRef.current.delete(dismiss);
        // 버튼·선택으로 닫혔으면 가드 엔트리가 남는다. 여기서 바로 걷으면(history.back) 이어지는
        // 결제창·상점 이동과 경합하므로, 다음 뒤로가기 때 한 칸 더 내려 준다(onPopState).
        if (!closingByBack) staleTransientPathRef.current = pathKey;
      };
    });
  }, [registerBackHandler]);

  // HTML dialog 기반 이용 안내·영상도 개별 화면 수정 없이 같은 뒤로가기 순서를 따른다.
  useEffect(() => {
    let dialog: HTMLDialogElement | null = null;
    let unregister: (() => void) | null = null;
    const syncDialog = () => {
      const dialogs = document.querySelectorAll<HTMLDialogElement>("dialog[open]");
      const next = dialogs[dialogs.length - 1] || null;
      if (next === dialog) return;
      unregister?.();
      unregister = null;
      if (dialog) releaseTransientBackGuard();
      dialog = next;
      if (!next) {
        if (pickActiveBackHandler(handlersRef.current)) ensureTransientBackGuard();
        return;
      }
      unregister = registerBackHandler({
        id: "html-dialog", scope: "overlay", priority: 10,
        enabled: () => next.open && next.isConnected,
        isLocked: () => false, canGoBack: () => true,
        onBack: () => {
          if (next.dispatchEvent(new Event("cancel", { cancelable: true }))) next.close();
          return !next.open;
        },
      });
      ensureTransientBackGuard();
    };
    const observer = new MutationObserver(syncDialog);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    syncDialog();
    return () => { observer.disconnect(); unregister?.(); };
  }, [ensureTransientBackGuard, registerBackHandler, releaseTransientBackGuard]);

  const contextValue = useMemo<BackNavigationContextValue>(() => {
    return {
      registerBackHandler,
      ensureTransientBackGuard,
      releaseTransientBackGuard,
    };
  }, [ensureTransientBackGuard, registerBackHandler, releaseTransientBackGuard]);

  return (
    <BackNavigationContext.Provider value={contextValue}>
      {children}
    </BackNavigationContext.Provider>
  );
}
