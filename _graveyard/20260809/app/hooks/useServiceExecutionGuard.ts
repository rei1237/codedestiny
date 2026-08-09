"use client";

import { useEffect, useRef } from "react";
import { failServiceExecution, heartbeatServiceExecution, type ServiceExecutionPayload } from "@/app/_lib/billing-client";

type UseServiceExecutionGuardOptions = {
  active: boolean;
  heartbeatMs?: number;
  onVisibilityFail?: boolean;
  payload: ServiceExecutionPayload;
};

function buildFailBody(payload: ServiceExecutionPayload, reasonCode: string, reasonMessage: string) {
  return {
    ...payload,
    reasonCode,
    reasonMessage,
  };
}

function sendFailBeacon(body: Record<string, unknown>) {
  try {
    const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/billing/executions/fail", blob);
      return;
    }
  } catch (e) {
    // no-op
  }

  void fetch("/api/billing/executions/fail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

export function useServiceExecutionGuard(options: UseServiceExecutionGuardOptions) {
  const {
    active,
    heartbeatMs = 20000,
    onVisibilityFail = false,
    payload,
  } = options;

  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (!active) return undefined;

    hasCompletedRef.current = false;

    const timer = window.setInterval(() => {
      void heartbeatServiceExecution(payload).catch(() => {});
    }, Math.max(5000, heartbeatMs));

    const onBeforeUnload = () => {
      if (hasCompletedRef.current) return;
      sendFailBeacon(buildFailBody(payload, "client_disconnect", "Browser closed before completion."));
    };

    const onVisibilityChange = () => {
      if (!onVisibilityFail || hasCompletedRef.current) return;
      if (document.visibilityState !== "hidden") return;
      sendFailBeacon(buildFailBody(payload, "client_background", "Tab hidden while execution still pending."));
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(timer);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [active, heartbeatMs, onVisibilityFail, payload]);

  return {
    async markFailed(reasonCode = "manual_abort", reasonMessage = "User aborted execution.") {
      hasCompletedRef.current = true;
      return failServiceExecution(buildFailBody(payload, reasonCode, reasonMessage));
    },
    markCompleted() {
      hasCompletedRef.current = true;
    },
  };
}
