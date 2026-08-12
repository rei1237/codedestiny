/**
 * Cloudflare API configuration.
 *
 * In production the frontend should call same-origin /api/*. Cloudflare Pages
 * serves those routes from the deployed Worker output.
 * The production client reads only NEXT_PUBLIC_EFFECTIVE_API_BASE_URL so local
 * API origins are filtered before bundle generation.
 * Local development can override this with window.CODE_DESTINY_API_BASE_URL.
 */

import appContext from "@/js/core/app-context.js";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const API_BASE = process.env.NEXT_PUBLIC_EFFECTIVE_API_BASE_URL || "";

if (process.env.NODE_ENV === "production" && !API_BASE) {
  throw new Error(
    "[code-destiny] NEXT_PUBLIC_API_URL is not set in production. " +
    "Check Cloudflare Pages environment variables.",
  );
}

type RuntimeApiWindow = Window & {
  CODE_DESTINY_API_BASE_URL?: string;
};

const NATIVE_APP_API_FALLBACK = "https://code-destiny.com";

/** 🔴 판정 규칙 자체는 js/core/app-context.js 가 소유한다(셸·독립 정적과 공유). */
function isCapacitorNativeRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return appContext.isApp();
}

export function normalizeBaseUrl(rawValue?: string | null): string {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    parsed.pathname = parsed.pathname.replace(/\/api\/?$/, "");
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch (e) {
    return value.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
}

function isLocalHostname(hostname?: string | null): boolean {
  return LOCAL_HOSTS.has(String(hostname || "").trim().toLowerCase());
}

function isLocalBaseUrl(baseUrl?: string | null): boolean {
  const value = String(baseUrl || "").trim();
  if (!value) return false;

  try {
    return isLocalHostname(new URL(value).hostname);
  } catch (e) {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(value);
  }
}

function isWorkersDevBaseUrl(baseUrl?: string | null): boolean {
  const value = String(baseUrl || "").trim();
  if (!value) return false;

  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "workers.dev" || hostname.endsWith(".workers.dev");
  } catch (e) {
    return /workers\.dev/i.test(value);
  }
}

export function getApiBaseUrl(): string {
  const configuredBase = normalizeBaseUrl(API_BASE);

  if (typeof window !== "undefined") {
    const runtimeBase = normalizeBaseUrl((window as RuntimeApiWindow).CODE_DESTINY_API_BASE_URL);

    // Capacitor 네이티브 앱: 번들이 https://localhost 출처에서 서빙되지만 그 출처엔 서버가 없다.
    // 동일출처(localhost)로 API를 부르면 전부 404가 되므로, 프로덕션 API 출처를 강제한다.
    // (런타임 주입값 우선 → 빌드 상수 → 프로덕션 폴백). 웹/로컬dev에는 영향 없음.
    if (isCapacitorNativeRuntime()) {
      if (runtimeBase && !isLocalBaseUrl(runtimeBase)) return runtimeBase;
      if (configuredBase && !isLocalBaseUrl(configuredBase) && !isWorkersDevBaseUrl(configuredBase)) return configuredBase;
      return NATIVE_APP_API_FALLBACK;
    }

    const isLocalDev = isLocalHostname(window.location.hostname);
    const sameOriginBase = normalizeBaseUrl(window.location.origin);
    const currentHostIsWorkersDev = isWorkersDevBaseUrl(sameOriginBase);
    const runtimeIsWorkersDev = isWorkersDevBaseUrl(runtimeBase);
    const configuredIsWorkersDev = isWorkersDevBaseUrl(configuredBase);

    if (isLocalDev) {
      return sameOriginBase;
    }

    if (
      runtimeBase
      && !isLocalBaseUrl(runtimeBase)
      && (!runtimeIsWorkersDev || currentHostIsWorkersDev)
    ) {
      return runtimeBase;
    }

    // In production custom domain, keep auth/API same-origin for stable secure cookies.
    if (!currentHostIsWorkersDev) {
      if (configuredBase && !isLocalBaseUrl(configuredBase) && !isWorkersDevBaseUrl(configuredBase)) return configuredBase;
      return sameOriginBase;
    }

    if (configuredBase && !isLocalBaseUrl(configuredBase)) return configuredBase;
    return configuredIsWorkersDev ? sameOriginBase : "";
  }

  return configuredBase;
}

export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export async function safeFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API fetch error:", error);
    throw error;
  }
}
