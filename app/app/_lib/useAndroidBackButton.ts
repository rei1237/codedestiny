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
};

function getAppPlugin(): CapacitorAppPlugin | null {
  if (typeof window === "undefined") return null;
  const capacitor = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string; Plugins?: { App?: CapacitorAppPlugin } } }).Capacitor;
  if (!capacitor?.isNativePlatform?.() || capacitor.getPlatform?.() !== "android") return null;
  return capacitor.Plugins?.App || null;
}

/**
 * Android 물리 백버튼 처리.
 *
 * 처리하지 않으면 어느 화면에서든 백버튼이 앱을 즉시 종료시킨다 — 브라우저 히스토리에
 * 기대는 웹 습관이 앱에서는 통하지 않는다. 뒤로 갈 곳이 있으면 뒤로 가고, 루트에서만
 * 종료한다(오조작 방지를 위해 2초 내 두 번 눌러야 종료).
 *
 * scripts/app-native-bridge.js(모든 앱 HTML 에 주입)가 이미 backButton 리스너를 갖고
 * 있으므로, 브릿지가 있으면 리스너를 추가하지 않는다.
 * 아래 폴백은 네이티브 브릿지가 없는 구형 앱 셸에서만 사용한다.
 */
export function useAndroidBackButton(options: { isRoot: boolean; onExitHint?: () => void }) {
  const { isRoot, onExitHint } = options;

  useEffect(() => {
    // 주입 브릿지가 모든 서비스의 루트·팝업·입력 단계를 한 번만 처리한다.
    if ((window as BridgeWindow).__cdAppNativeBridge?.installed) return undefined;
    const plugin = getAppPlugin();
    if (!plugin?.addListener || !plugin.exitApp) return undefined;

    let exitArmedAt = 0;

    const handleBack = (event?: BackButtonEvent): boolean => {
      for (const scope of ["overlay", "screen"]) {
        if (!window.dispatchEvent(new CustomEvent("cd:app-back", { cancelable: true, detail: { scope } }))) {
          exitArmedAt = 0;
          return true;
        }
      }
      const canGoBack = event?.canGoBack !== false && window.history.length > 1;
      if (!isRoot) {
        exitArmedAt = 0;
        if (canGoBack) window.history.back();
        else window.location.replace("/app/");
        return true;
      }

      const now = Date.now();
      if (exitArmedAt > 0 && now - exitArmedAt < 2000) {
        void plugin.exitApp?.();
        return true;
      }
      exitArmedAt = now;
      onExitHint?.();
      return true;
    };

    const reset = () => { exitArmedAt = 0; };
    window.addEventListener("pagehide", reset);
    window.addEventListener("pageshow", reset);
    document.addEventListener("visibilitychange", reset);
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
      window.removeEventListener("pagehide", reset);
      window.removeEventListener("pageshow", reset);
      document.removeEventListener("visibilitychange", reset);
      void handle?.remove?.();
    };
  }, [isRoot, onExitHint]);
}
