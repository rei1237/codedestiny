"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch, isMobileAppRuntime } from "../_lib/auth-client";
import { canLoadAdsenseForCanonicalUrl } from "./adsense-route-policy";

export { canLoadAdsense, canLoadAdsenseForCanonicalPath, canLoadAdsenseForCanonicalUrl } from "./adsense-route-policy";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9863227498729828";
const AD_REMOVAL_CACHE_KEY = "cd_adsense_ad_removal_v1";
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
const AD_REMOVAL_FEATURE_KEYS = new Set([
  "ad_free",
  "ad_free_pass",
  "ad_removal",
  "ads_free",
  "ads_removed",
  "code_destiny_ad_free",
  "no_ads",
  "remove_ads",
]);
const AD_REMOVAL_FLAG_KEYS = new Set([
  "ad_free",
  "adfree",
  "ad_removal",
  "adremoval",
  "ads_disabled",
  "adsdisabled",
  "ads_free",
  "adsfree",
  "has_ad_removal",
  "hasadremoval",
  "no_ads",
  "noads",
  "remove_ads",
  "removeads",
]);
const AD_REMOVAL_ID_KEYS = new Set([
  "content_id",
  "contentid",
  "entitlement_id",
  "entitlementid",
  "feature_key",
  "featurekey",
  "key",
  "plan",
  "plan_id",
  "planid",
  "product_id",
  "productid",
  "slug",
]);
const AD_REMOVAL_CHILD_KEYS = new Set([
  "access",
  "entitlement",
  "entitlements",
  "features",
  "licenses",
  "membership",
  "pass",
  "raw",
  "subscription",
  "unlock_map",
  "unlockmap",
  "unlocked_features",
  "unlockedfeatures",
  "user",
]);

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

function normalizeAdRemovalToken(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isTruthyEntitlementValue(value: unknown) {
  if (value === true) return true;
  if (typeof value === "number") return value > 0;
  if (typeof value !== "string") return false;
  const normalized = normalizeAdRemovalToken(value);
  return normalized === "true" || normalized === "active" || normalized === "enabled" || normalized === "purchased" || normalized === "unlocked";
}

function isExplicitlyInactiveEntitlementValue(value: unknown) {
  if (value === false || value === null) return true;
  if (typeof value !== "string") return false;
  const normalized = normalizeAdRemovalToken(value);
  return normalized === "false" || normalized === "inactive" || normalized === "disabled" || normalized === "expired" || normalized === "cancelled" || normalized === "canceled";
}

function entitlementRecordLooksActive(record: Record<string, unknown>) {
  const expiresAt = record.expiresAt || record.expires_at || record.validUntil || record.valid_until;
  if (typeof expiresAt === "string" && expiresAt.trim()) {
    const expiresAtMs = Date.parse(expiresAt);
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) return false;
  }

  const status = record.status || record.subscriptionStatus || record.membershipStatus || record.state;
  if (isExplicitlyInactiveEntitlementValue(status)) return false;
  if (isTruthyEntitlementValue(record.isActive) || isTruthyEntitlementValue(record.active) || isTruthyEntitlementValue(record.enabled)) return true;
  if (isTruthyEntitlementValue(status)) return true;
  return status === undefined;
}

function isAdRemovalFeatureKey(value: unknown) {
  return AD_REMOVAL_FEATURE_KEYS.has(normalizeAdRemovalToken(value));
}

function hasAdRemovalEntitlement(input: unknown, depth = 0): boolean {
  if (!input || depth > 5) return false;

  if (typeof input === "string") return isAdRemovalFeatureKey(input);

  if (Array.isArray(input)) {
    return input.some((item) => hasAdRemovalEntitlement(item, depth + 1));
  }

  if (typeof input !== "object") return false;

  const record = input as Record<string, unknown>;
  const recordActive = entitlementRecordLooksActive(record);

  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeAdRemovalToken(key);

    if (AD_REMOVAL_FLAG_KEYS.has(normalizedKey) && isTruthyEntitlementValue(value)) return true;
    if (isAdRemovalFeatureKey(normalizedKey)) {
      if (isTruthyEntitlementValue(value)) return true;
      if (value && typeof value === "object" && entitlementRecordLooksActive(value as Record<string, unknown>)) return true;
    }
    if (AD_REMOVAL_ID_KEYS.has(normalizedKey) && isAdRemovalFeatureKey(value) && recordActive) return true;

    if (AD_REMOVAL_CHILD_KEYS.has(normalizedKey) && hasAdRemovalEntitlement(value, depth + 1)) {
      if (normalizedKey === "unlock_map" || normalizedKey === "unlockmap" || Array.isArray(value)) return true;
      if (recordActive) return true;
    }
  }

  return false;
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

async function currentViewerAllowsAdsense() {
  if (typeof window === "undefined") return false;
  const cachedAdRemoval = readCachedAdRemovalEntitlement();
  if (cachedAdRemoval !== null) return !cachedAdRemoval;
  if (!hasLocalAuthHint() && !hasCookieAuthHint()) return true;

  try {
    const response = await authFetch("/api/billing/balance", { method: "GET", cache: "no-store" });
    if (response.status === 401 || response.status === 403) {
      clearCachedAdRemovalEntitlement();
      return true;
    }
    if (!response.ok) {
      const fallbackCachedAdRemoval = readCachedAdRemovalEntitlement();
      return fallbackCachedAdRemoval !== null ? !fallbackCachedAdRemoval : true;
    }

    const payload = (await response.json()) as unknown;
    const hasAdRemoval = hasAdRemovalEntitlement(payload);
    writeCachedAdRemovalEntitlement(hasAdRemoval);
    return !hasAdRemoval;
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

    scheduleRefreshViewerAdsenseState(800);

    window.addEventListener("cd:auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleStorageChanged);

    return () => {
      cancelled = true;
      refreshPending = false;
      if (refreshTimerId !== null) window.clearTimeout(refreshTimerId);
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
        strategy="lazyOnload"
        async
        crossOrigin="anonymous"
        data-cd-adsense="1"
      />
    </div>
  );
}
