"use client";

import { useContext, useEffect, useRef } from "react";
import {
  BackNavigationContext,
  type BackHandlerScope,
} from "@/app/providers/NavigationProvider";

type MaybeResolver<T> = T | (() => T);

type UseBackNavigationOptions = {
  scope?: BackHandlerScope;
  priority?: number;
  maxInternalBackSteps?: number;
  enabled?: MaybeResolver<boolean>;
  isLocked?: MaybeResolver<boolean>;
  canGoBack?: MaybeResolver<boolean>;
  onBack: () => boolean | void;
};

function resolveMaybe<T>(value: MaybeResolver<T> | undefined, fallback: T) {
  if (typeof value === "function") {
    try {
      return (value as () => T)();
    } catch (e) {
      return fallback;
    }
  }
  if (typeof value === "undefined") return fallback;
  return value;
}

export function useBackNavigation(options: UseBackNavigationOptions) {
  const context = useContext(BackNavigationContext);
  const optionsRef = useRef(options);
  const handlerIdRef = useRef(`cd-back-${Math.random().toString(36).slice(2, 11)}`);
  const wizardArmedRef = useRef(false);

  optionsRef.current = options;

  useEffect(() => {
    if (!context) return;

    const unregister = context.registerBackHandler({
      id: handlerIdRef.current,
      scope: optionsRef.current.scope || "analysis",
      priority: optionsRef.current.priority || 0,
      maxInternalBackSteps: optionsRef.current.maxInternalBackSteps,
      enabled: () => resolveMaybe(optionsRef.current.enabled, true),
      isLocked: () => resolveMaybe(optionsRef.current.isLocked, false),
      canGoBack: () => resolveMaybe(optionsRef.current.canGoBack, true),
      onBack: () => optionsRef.current.onBack(),
    });

    return () => {
      unregister();
    };
  }, [context]);

  // route 전환 없이 열리는 sheet/modal 은 guard entry 가 있어야 브라우저 back 이
  // 이전 문서로 이탈하기 전에 이 hook 의 onBack 으로 들어온다. enabled 가 함수인
  // 기존 analysis 호출부는 현재 동작을 보존하고, 새 transient 표면은 boolean enabled
  // 를 넘겨 렌더 시점마다 안전하게 guard 를 동기화한다.
  useEffect(() => {
    if (!context) return;
    const scope = options.scope || "analysis";
    if (scope === "analysis") return;
    const enabled = resolveMaybe(options.enabled, true);
    if (enabled) {
      context.ensureTransientBackGuard();
    } else if (scope === "wizard" && wizardArmedRef.current) {
      // 첫 단계로 돌아왔다. 남은 가드는 다음 뒤로가기가 걷고 그대로 이전 화면으로 간다.
      context.releaseTransientBackGuard();
    }
    wizardArmedRef.current = scope === "wizard" && enabled;
  }, [context, options.enabled, options.scope]);

  // 단계 중간에 흐름이 화면에서 빠져도(다른 입력 방식으로 전환 등) 같은 이유로 가드를 걷는다.
  useEffect(() => () => {
    if (wizardArmedRef.current) context?.releaseTransientBackGuard();
  }, [context]);
}

export default useBackNavigation;
