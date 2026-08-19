"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isMobileAppRuntime } from "../_lib/auth-client";
import { canLoadAdsenseForCanonicalUrl } from "./adsense-route-policy";

export { canLoadAdsense, canLoadAdsenseForCanonicalPath, canLoadAdsenseForCanonicalUrl } from "./adsense-route-policy";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9863227498729828";
const AD_REMOVAL_CACHE_KEY = "cd_adsense_ad_removal_v1";
const AD_REMOVAL_FEATURE_KEYS = new Set([
  "ad_free",
  "ad_free_pass",
  "ad_removal",
  "ads_free",
  "ads_removed",
]);
const AD_REMOVAL_CACHE_TTL_MS = 10 * 60 * 1000;
const LOCAL_AUTH_HINT_KEYS = ["fortune_auth_user", "fortune_auth_token", "cdToken", "user", "cd_user"];
const ADSENSE_AUTH_STORAGE_KEYS = new Set([...LOCAL_AUTH_HINT_KEYS, AD_REMOVAL_CACHE_KEY]);
const ADSENSE_AUTH_SYNC_EVENTS = new Set(["login", "logout", "subscription"]);
const COOKIE_AUTH_HINT_KEYS = [
  "fortune_auth_token",
  "fortune_auth_refresh",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

function currentDocumentAllowsAdsense(pathname: string | null) {
  if (typeof document === "undefined") return false;
  // AdSense는 앱에 넣을 수 없다. 프로그램 정책이 "Google ads may not be integrated into a
  // software application"을 명시한다(AdMob만 예외 — support.google.com/adsense/answer/48182).
  // 위반하면 AdSense 계정 자체가 정지될 수 있고, 그러면 웹 광고 수익까지 함께 잃는다.
  // 그래서 앱 런타임에서는 광고 스크립트를 '로드조차' 하지 않는다.
  if (isMobileAppRuntime()) return false;
  const robotsText = Array.from(document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]'))
    .map((element) => element.getAttribute("content") || "")
    .join(",")
    .toLowerCase();
  const canonicalHref = document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";

  return (
    canLoadAdsenseForCanonicalUrl(pathname || window.location.pathname, canonicalHref, window.location.href) &&
    !robotsText.includes("noindex") &&
    !robotsText.includes("nofollow")
  );
}

function readCachedAdRemovalEntitlement(): boolean | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(AD_REMOVAL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { active?: unknown; checkedAt?: unknown };
    const checkedAt = Number(parsed.checkedAt || 0);
    if (!checkedAt || Date.now() - checkedAt > AD_REMOVAL_CACHE_TTL_MS) return null;
    return parsed.active === true;
  } catch {
    return null;
  }
}

function writeCachedAdRemovalEntitlement(active: boolean) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(AD_REMOVAL_CACHE_KEY, JSON.stringify({ active, checkedAt: Date.now() }));
  } catch {
    return;
  }
}

function clearCachedAdRemovalEntitlement() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(AD_REMOVAL_CACHE_KEY);
  } catch {
    return;
  }
}

function hasLocalAuthHint() {
  if (typeof localStorage === "undefined") return false;
  try {
    return LOCAL_AUTH_HINT_KEYS.some((key) => String(localStorage.getItem(key) || "").trim().length > 0);
  } catch {
    return false;
  }
}

function hasCookieAuthHint() {
  if (typeof document === "undefined") return false;
  const cookieText = String(document.cookie || "");
  return COOKIE_AUTH_HINT_KEYS.some((key) => cookieText.includes(`${key}=`));
}

type AdsenseAccessStore = {
  getSnapshot?: () => { checkedAt?: number; status?: string };
  subscribe?: (listener: () => void) => () => void;
  isUnlocked?: (key: string) => boolean;
};

type AdsenseWindow = Window & typeof globalThis & {
  CodeDestinyAccessStore?: AdsenseAccessStore;
};

function hasAdRemovalEntitlement(accessStore: AdsenseAccessStore | null) {
  // Ad removal is read only from the shared access snapshot.
  if (!accessStore || typeof accessStore.isUnlocked !== "function") return false;
  return Array.from(AD_REMOVAL_FEATURE_KEYS).some((key) => accessStore.isUnlocked?.(key) === true);
}

async function currentViewerAllowsAdsense() {
  if (typeof window === "undefined") return false;
  const cachedAdRemoval = readCachedAdRemovalEntitlement();
  if (cachedAdRemoval !== null) return !cachedAdRemoval;
  if (!hasLocalAuthHint() && !hasCookieAuthHint()) return true;

  try {
    const accessStore = (window as AdsenseWindow).CodeDestinyAccessStore;
    if (accessStore) {
      const snapshot = accessStore.getSnapshot?.();
      if (!snapshot || Number(snapshot.checkedAt || 0) <= 0 || snapshot.status === "loading") return false;
      const hasAdRemoval = hasAdRemovalEntitlement(accessStore);
      writeCachedAdRemovalEntitlement(hasAdRemoval);
      return !hasAdRemoval;
    }
    const fallbackCachedAdRemoval = readCachedAdRemovalEntitlement();
    return fallbackCachedAdRemoval !== null ? !fallbackCachedAdRemoval : true;
  } catch {
    const fallbackCachedAdRemoval = readCachedAdRemovalEntitlement();
    return fallbackCachedAdRemoval !== null ? !fallbackCachedAdRemoval : true;
  }
}

function shouldRefreshAdsenseViewerStateFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return true;
  const event = String((payload as { event?: unknown }).event || "");
  return ADSENSE_AUTH_SYNC_EVENTS.has(event);
}

export default function DeferredAdsense() {
  const pathname = usePathname();
  const [documentAllowsAdsense, setDocumentAllowsAdsense] = useState(false);
  const [viewerAllowsAdsense, setViewerAllowsAdsense] = useState(false);

  useEffect(() => {
    setDocumentAllowsAdsense(currentDocumentAllowsAdsense(pathname));
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    let refreshTimerId: number | null = null;
    let refreshInFlight = false;
    let refreshPending = false;

    async function refreshViewerAdsenseState() {
      const allowed = await currentViewerAllowsAdsense();
      if (!cancelled) setViewerAllowsAdsense(allowed);
    }

    function runRefreshViewerAdsenseState() {
      refreshTimerId = null;
      if (refreshInFlight || !refreshPending) return;

      refreshPending = false;
      refreshInFlight = true;
      refreshViewerAdsenseState()
        .catch(() => {
          if (!cancelled) setViewerAllowsAdsense(true);
        })
        .finally(() => {
          refreshInFlight = false;
          if (refreshPending) refreshTimerId = window.setTimeout(runRefreshViewerAdsenseState, 250);
        });
    }

    function scheduleRefreshViewerAdsenseState(delayMs = 250) {
      refreshPending = true;
      if (refreshTimerId !== null) window.clearTimeout(refreshTimerId);
      refreshTimerId = window.setTimeout(runRefreshViewerAdsenseState, delayMs);
    }

    function handleAuthChanged(event: Event) {
      const detail = (event as CustomEvent<{ event?: string }>).detail;
      if (!shouldRefreshAdsenseViewerStateFromPayload(detail)) return;
      clearCachedAdRemovalEntitlement();
      scheduleRefreshViewerAdsenseState();
    }

    function handleStorageChanged(event: StorageEvent) {
      if (event.key !== null && !ADSENSE_AUTH_STORAGE_KEYS.has(event.key)) return;
      if (event.key !== AD_REMOVAL_CACHE_KEY) clearCachedAdRemovalEntitlement();
      scheduleRefreshViewerAdsenseState();
    }

    // 이 컴포넌트는 이미 RuntimeClientGuards 의 유휴 지연 뒤에 마운트된다.
    // 여기서 다시 800ms 를 기다리면 광고가 그려지는 시점이 첫 페인트에서 2.5초 넘게 밀렸고,
    // AdSense 심사는 광고가 실제로 나가는 것을 봐야 한다. 첫 페인트 보호는 위쪽 지연이 맡는다.
    scheduleRefreshViewerAdsenseState(150);

    const accessStore = (window as AdsenseWindow).CodeDestinyAccessStore;
    const unsubscribeAccessStore = accessStore?.subscribe?.(() => scheduleRefreshViewerAdsenseState(50));

    window.addEventListener("cd:auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleStorageChanged);

    return () => {
      cancelled = true;
      refreshPending = false;
      if (refreshTimerId !== null) window.clearTimeout(refreshTimerId);
      unsubscribeAccessStore?.();
      window.removeEventListener("cd:auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleStorageChanged);
    };
  }, [pathname]);

  if (!documentAllowsAdsense || !viewerAllowsAdsense) return null;

  return (
    <div
      style={{
        minHeight: '250px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Script
        id="cd-adsense"
        src={ADSENSE_SRC}
        strategy="afterInteractive"
        async
        crossOrigin="anonymous"
        data-cd-adsense="1"
      />
    </div>
  );
}
