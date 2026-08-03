"use client";

import { useEffect, useRef } from "react";

type TraceWindow = Window & {
  __cdMobileFortuneTrace?: {
    record?: (type: string, detail?: Record<string, unknown>) => void;
  };
};

export function recordMobileFortuneTrace(type: string, detail?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  (window as TraceWindow).__cdMobileFortuneTrace?.record?.(type, detail);
}

export function useMobileFortuneRenderTrace(component: string) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  recordMobileFortuneTrace("component:render", { component, render: renderCount.current });

  useEffect(() => {
    recordMobileFortuneTrace("component:mount", { component });
    return () => recordMobileFortuneTrace("component:unmount", { component });
  }, [component]);
}
