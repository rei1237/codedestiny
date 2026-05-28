export type BackPolicyKind = "none" | "main" | "analysis";

export type BackPolicy = {
  kind: BackPolicyKind;
  maxInternalBackSteps?: number;
};

export type RuntimeEnvironment = {
  userAgent: string;
  isAndroid: boolean;
  isIOS: boolean;
  isSamsungInternet: boolean;
  isAndroidChrome: boolean;
  isStandalone: boolean;
  isWebView: boolean;
  isCapacitor: boolean;
  isCordova: boolean;
};

export type ExitAttemptResult = {
  handled: boolean;
  strategy: string;
};

type HistoryStateLike = Record<string, unknown>;

const LOCALE_PREFIX_RE = /^\/(ko|en|ja|zh|en-us|ja-jp|zh-cn)(?=\/|$)/i;

const BACK_GUARD_FLAG = "__cdBackGuardV1";
const BACK_POLICY_FLAG = "__cdBackPolicyV1";
const BACK_PATH_FLAG = "__cdBackPathV1";
const BACK_STAMP_FLAG = "__cdBackStampV1";

declare global {
  interface Window {
    Android?: {
      exitApp?: () => void;
    };
    Capacitor?: {
      Plugins?: {
        App?: {
          exitApp?: () => void | Promise<void>;
        };
      };
    };
    cordova?: {
      plugins?: {
        App?: {
          exitApp?: () => void;
        };
      };
    };
    ReactNativeWebView?: {
      postMessage?: (message: string) => void;
    };
    webkit?: {
      messageHandlers?: {
        exitApp?: {
          postMessage?: (payload: unknown) => void;
        };
      };
    };
  }

  interface Navigator {
    standalone?: boolean;
    app?: {
      exitApp?: () => void;
    };
  }
}

function normalizePathname(pathname: string) {
  if (!pathname) return "/";
  if (pathname === "/") return pathname;
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function stripLocalePrefix(pathname: string) {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") return "/";
  const match = normalized.match(LOCALE_PREFIX_RE);
  if (!match) return normalized;
  const next = normalized.slice(match[0].length);
  return next ? (next.startsWith("/") ? next : `/${next}`) : "/";
}

export function resolveBackPolicy(pathname: string): BackPolicy {
  const normalized = stripLocalePrefix(pathname);
  if (normalized === "/" || normalized === "/index.html" || normalized === "/index") {
    return { kind: "main" };
  }
  if (normalized === "/saju" || normalized.startsWith("/saju/")) {
    return { kind: "analysis", maxInternalBackSteps: 1 };
  }
  return { kind: "none" };
}

export function detectRuntimeEnvironment(win: Window): RuntimeEnvironment {
  const userAgent = String(win.navigator.userAgent || "");
  const lower = userAgent.toLowerCase();

  const isAndroid = /android/i.test(userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isSamsungInternet = /samsungbrowser/i.test(userAgent);
  const isAndroidChrome = isAndroid && /chrome/i.test(userAgent) && !isSamsungInternet;
  const isStandalone =
    win.matchMedia?.("(display-mode: standalone)")?.matches ||
    win.navigator.standalone === true;
  const hasWvToken = /; wv\)|\bwv\b/.test(lower);
  const hasAndroidBridge = typeof win.Android?.exitApp === "function";
  const hasWebkitBridge = typeof win.webkit?.messageHandlers?.exitApp?.postMessage === "function";
  const hasReactNativeBridge = typeof win.ReactNativeWebView?.postMessage === "function";
  const isWebView =
    hasWvToken ||
    hasAndroidBridge ||
    hasWebkitBridge ||
    hasReactNativeBridge ||
    (/version\/[\d.]+.*mobile.*safari/i.test(userAgent) && !/criOS|fxios/i.test(userAgent));

  return {
    userAgent,
    isAndroid,
    isIOS,
    isSamsungInternet,
    isAndroidChrome,
    isStandalone,
    isWebView,
    isCapacitor: Boolean(win.Capacitor?.Plugins?.App),
    isCordova: Boolean(win.cordova || win.navigator.app?.exitApp),
  };
}

function getHistoryState(): HistoryStateLike {
  if (typeof window === "undefined") return {};
  const state = window.history.state;
  if (!state || typeof state !== "object") return {};
  return state as HistoryStateLike;
}

function buildHistoryState(pathname: string, policyKind: BackPolicyKind, isGuard: boolean): HistoryStateLike {
  return {
    ...getHistoryState(),
    [BACK_PATH_FLAG]: pathname,
    [BACK_POLICY_FLAG]: policyKind,
    [BACK_GUARD_FLAG]: isGuard,
    [BACK_STAMP_FLAG]: Date.now(),
  };
}

function isCurrentGuardState(pathname: string, policyKind: BackPolicyKind) {
  const state = getHistoryState();
  return (
    state[BACK_GUARD_FLAG] === true &&
    state[BACK_PATH_FLAG] === pathname &&
    state[BACK_POLICY_FLAG] === policyKind
  );
}

export function ensureGuardState(pathname: string, policyKind: BackPolicyKind) {
  if (typeof window === "undefined" || policyKind === "none") return;
  if (isCurrentGuardState(pathname, policyKind)) return;

  try {
    const normalizedState = buildHistoryState(pathname, policyKind, false);
    window.history.replaceState(normalizedState, "", window.location.href);
    const guardState = buildHistoryState(pathname, policyKind, true);
    window.history.pushState(guardState, "", window.location.href);
  } catch (e) {
    // Ignore browser history permission/state errors.
  }
}

export function rearmGuardState(pathname: string, policyKind: BackPolicyKind) {
  if (typeof window === "undefined" || policyKind === "none") return;
  if (isCurrentGuardState(pathname, policyKind)) return;

  try {
    const guardState = buildHistoryState(pathname, policyKind, true);
    window.history.pushState(guardState, "", window.location.href);
  } catch (e) {
    // Ignore browser history permission/state errors.
  }
}

export function createPopstateDebouncer(minIntervalMs = 180) {
  let lastHandledAt = 0;
  return () => {
    const now = Date.now();
    if (now - lastHandledAt < minIntervalMs) {
      return false;
    }
    lastHandledAt = now;
    return true;
  };
}

function tryExitWithBridge(win: Window): ExitAttemptResult | null {
  try {
    if (typeof win.Android?.exitApp === "function") {
      win.Android.exitApp();
      return { handled: true, strategy: "android-webview-bridge" };
    }

    if (typeof win.webkit?.messageHandlers?.exitApp?.postMessage === "function") {
      win.webkit.messageHandlers.exitApp.postMessage({ source: "code-destiny" });
      return { handled: true, strategy: "webkit-message-handler" };
    }

    if (typeof win.Capacitor?.Plugins?.App?.exitApp === "function") {
      win.Capacitor.Plugins.App.exitApp();
      return { handled: true, strategy: "capacitor-app-exit" };
    }

    if (typeof win.cordova?.plugins?.App?.exitApp === "function") {
      win.cordova.plugins.App.exitApp();
      return { handled: true, strategy: "cordova-app-exit" };
    }

    if (typeof win.navigator.app?.exitApp === "function") {
      win.navigator.app.exitApp();
      return { handled: true, strategy: "navigator-app-exit" };
    }

    if (typeof win.ReactNativeWebView?.postMessage === "function") {
      win.ReactNativeWebView.postMessage(
        JSON.stringify({ type: "EXIT_APP", source: "code-destiny", ts: Date.now() }),
      );
      return { handled: true, strategy: "react-native-webview-postmessage" };
    }
  } catch (e) {
    return null;
  }

  return null;
}

export function attemptAppExit(win: Window): ExitAttemptResult {
  const env = detectRuntimeEnvironment(win);
  const bridged = tryExitWithBridge(win);
  if (bridged?.handled) return bridged;

  try {
    if (win.history.length > 1) {
      win.history.back();
      if (env.isStandalone) {
        return { handled: true, strategy: "standalone-history-back" };
      }
      return { handled: true, strategy: "history-back" };
    }
  } catch (e) {
    // Ignore history errors.
  }

  try {
    win.close();
    if (win.closed) {
      return { handled: true, strategy: "window-close" };
    }
  } catch (e) {
    // Ignore close errors.
  }

  try {
    win.navigator.vibrate?.(18);
  } catch (e) {
    // Ignore unsupported vibration APIs.
  }

  return { handled: false, strategy: "browser-restricted" };
}
