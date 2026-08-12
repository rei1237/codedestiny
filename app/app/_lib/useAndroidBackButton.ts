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

type BridgeWindow = Window & {
  __cdAppNativeBridge?: { installed?: boolean };
  __cdAppBackIntercept?: () => boolean;
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
 *
 * scripts/app-native-bridge.js(모든 앱 HTML 에 주입)가 이미 backButton 리스너를 갖고
 * 있으므로, 브릿지가 있으면 두 번째 리스너를 달지 않고 브릿지의 인터셉트 슬롯
 * (__cdAppBackIntercept)에 끼운다 — 리스너를 이중 등록하면 백 1회에 2단계 후퇴한다.
 * 모달 닫기(계약 ①)는 브릿지가 인터셉트보다 먼저 처리하므로 여기서는 내비게이션만 본다.
 */
export function useAndroidBackButton(options: { isRoot: boolean; onExitHint?: () => void }) {
  const { isRoot, onExitHint } = options;

  useEffect(() => {
    const plugin = getAppPlugin();
    if (!plugin?.addListener) return undefined;

    let exitArmedAt = 0;

    const handleBack = (event?: BackButtonEvent): boolean => {
      const canGoBack = event?.canGoBack !== false && window.history.length > 1;
      if (!isRoot && canGoBack) {
        window.history.back();
        return true;
      }

      const now = Date.now();
      if (now - exitArmedAt < 2000) {
        void plugin.exitApp?.();
        return true;
      }
      exitArmedAt = now;
      onExitHint?.();
      return true;
    };

    const bridgeWindow = window as unknown as BridgeWindow;
    if (bridgeWindow.__cdAppNativeBridge?.installed) {
      const intercept = () => handleBack();
      const previous = bridgeWindow.__cdAppBackIntercept;
      bridgeWindow.__cdAppBackIntercept = intercept;
      return () => {
        if (bridgeWindow.__cdAppBackIntercept === intercept) {
          bridgeWindow.__cdAppBackIntercept = previous;
        }
      };
    }

    let handle: ListenerHandle | null = null;
    let disposed = false;

    const listenerResult = plugin.addListener("backButton", (event) => {
      handleBack(event);
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
