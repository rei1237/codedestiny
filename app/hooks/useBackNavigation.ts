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
    } catch {
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
}

export default useBackNavigation;
