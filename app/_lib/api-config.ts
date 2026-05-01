/**
 * Cloudflare API configuration.
 *
 * In production the frontend should call same-origin /api/*. Cloudflare Pages
 * then forwards those requests to the API Worker through public/_redirects.
 * Local development can override this with NEXT_PUBLIC_API_BASE_URL or
 * window.CODE_DESTINY_API_BASE_URL.
 */

const FALLBACK_LOCAL_API_BASE_URL = "http://localhost:4000";

function normalizeBaseUrl(rawValue?: string | null): string {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    parsed.pathname = parsed.pathname.replace(/\/api\/?$/, "");
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return value.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
}

export function getApiBaseUrl(): string {
  const configuredBase = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_CODE_DESTINY_API_URL
  );

  if (typeof window !== "undefined") {
    const runtimeBase = normalizeBaseUrl((window as any).CODE_DESTINY_API_BASE_URL);
    if (runtimeBase) return runtimeBase;

    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return configuredBase || FALLBACK_LOCAL_API_BASE_URL;
    }

    // In production/previews, default to same-origin /api via Pages routing.
    return configuredBase || "";
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
