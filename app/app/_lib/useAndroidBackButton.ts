"use client";

import { useEffect } from "react";

type ListenerHandle = { remove?: () => Promise<void> | void };

type BackButtonEvent = { canGoBack?: boolean };

type CapacitorAppPlugin = {
  addListener?: (
    eventName: "backButton",
    listenerFunc: (event: BackButtonEvent) => void,
  ) => Promise<ListenerHandle> | ListenerHandle;
  exitApp?: () => Promise<void> | void;
};

function getAppPlugin(): CapacitorAppPlugin | null {
  if (typeof window === "undefined") return null;
  const capacitor = (window as unknown as { Capacitor?: { Plugins?: { App?: CapacitorAppPlugin } } }).Capacitor;
  return capacitor?.Plugins?.App || null;
}

/**
 * Android 물리 백버튼 처리.
 *
 * 처리하지 않으면 어느 화면에서든 백버튼이 앱을 즉시 종료시킨다 — 브라우저 히스토리에
 * 기대는 웹 습관이 앱에서는 통하지 않는다. 뒤로 갈 곳이 있으면 뒤로 가고, 루트에서만
 * 종료한다(오조작 방지를 위해 2초 내 두 번 눌러야 종료).
 */
export function useAndroidBackButton(options: { isRoot: boolean; onExitHint?: () => void }) {
  const { isRoot, onExitHint } = options;

  useEffect(() => {
    const plugin = getAppPlugin();
    if (!plugin?.addListener) return undefined;

    let handle: ListenerHandle | null = null;
    let exitArmedAt = 0;
    let disposed = false;

    const listenerResult = plugin.addListener("backButton", (event) => {
      const canGoBack = event?.canGoBack !== false && window.history.length > 1;
      if (!isRoot && canGoBack) {
        window.history.back();
        return;
      }

      const now = Date.now();
      if (now - exitArmedAt < 2000) {
        void plugin.exitApp?.();
        return;
      }
      exitArmedAt = now;
      onExitHint?.();
    });

    Promise.resolve(listenerResult)
      .then((resolved) => {
        if (disposed) {
          void resolved?.remove?.();
          return;
        }
        handle = resolved || null;
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      void handle?.remove?.();
    };
  }, [isRoot, onExitHint]);
}
