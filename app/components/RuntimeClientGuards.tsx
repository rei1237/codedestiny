"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const DeferredAdsense = dynamic(() => import("./DeferredAdsense"), {
  ssr: false,
  loading: () => null,
});

const LocaleRuntimeBridge = dynamic(() => import("./LocaleRuntimeBridge"), {
  ssr: false,
  loading: () => null,
});

const LegacyAuthTokenCleanup = dynamic(() => import("./LegacyAuthTokenCleanup"), {
  ssr: false,
  loading: () => null,
});

const BuildInfoLogger =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(() => import("./BuildInfoLogger"), {
        ssr: false,
        loading: () => null,
      });

const AppVersionGuard = dynamic(() => import("./AppVersionGuard"), {
  ssr: false,
  loading: () => null,
});

const DevPaymentTester =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(() => import("./DevPaymentTester"), {
        ssr: false,
        loading: () => null,
      });

type BrowserIdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function useDeferredMount(delayMs: number, idleTimeoutMs: number) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let idleCallbackId: number | null = null;
    const browserWindow = window as BrowserIdleWindow;

    const activate = () => {
      if (!cancelled) setMounted(true);
    };

    const timerId = window.setTimeout(() => {
      idleCallbackId = browserWindow.requestIdleCallback?.(activate, { timeout: idleTimeoutMs }) ?? null;
      if (idleCallbackId === null) activate();
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      if (idleCallbackId !== null) browserWindow.cancelIdleCallback?.(idleCallbackId);
    };
  }, [delayMs, idleTimeoutMs]);

  return mounted;
}

export default function RuntimeClientGuards() {
  const mountAdsense = useDeferredMount(900, 1600);
  const mountMaintenanceGuards = useDeferredMount(2800, 2500);

  return (
    <>
      <LocaleRuntimeBridge />
      {mountAdsense ? <DeferredAdsense /> : null}
      {mountMaintenanceGuards ? (
        <>
          <LegacyAuthTokenCleanup />
          {BuildInfoLogger ? <BuildInfoLogger /> : null}
          <AppVersionGuard />
          {DevPaymentTester ? <DevPaymentTester /> : null}
        </>
      ) : null}
    </>
  );
}
