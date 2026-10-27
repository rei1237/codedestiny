"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import SignupChannelInvite from '../components/SignupChannelInvite';
import {
  ensureUserAccessLoaded,
  installUserAccessFetchCache,
  installUserAccessInvalidationListeners,
} from "@/app/_lib/user-session-cache";

export default function UserSessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const profileOnly = pathname?.replace(/\/$/, '') === '/saju/career-style';
  useLayoutEffect(() => {
    installUserAccessFetchCache();
  }, []);

  useEffect(() => {
    // This free report verifies ownership through its existing profile API; it has no paid entry.
    if (profileOnly) return;
    const cleanup = installUserAccessInvalidationListeners();
    const warmup = () => {
      void ensureUserAccessLoaded({ includeProfile: true, includeBilling: true, reason: "app-bootstrap" });
    };
    const runtimeWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof runtimeWindow.requestIdleCallback === "function") {
      const id = runtimeWindow.requestIdleCallback(warmup, { timeout: 1800 });
      return () => {
        cleanup();
        runtimeWindow.cancelIdleCallback?.(id);
      };
    }
    const timer = window.setTimeout(warmup, 250);
    return () => {
      cleanup();
      window.clearTimeout(timer);
    };
  }, [profileOnly]);

  return <>{children}{!profileOnly && <SignupChannelInvite />}</>;
}
