/**
 * Cloudflare API configuration.
 *
 * In production the frontend should call same-origin /api/*. Cloudflare Pages
 * then forwards those requests to the API Worker through public/_redirects.
 * If same-origin routing is unavailable, set NEXT_PUBLIC_AUTH_API_BASE_URL
 * to an explicit Worker origin.
 * Local development can override this with NEXT_PUBLIC_API_BASE_URL or
 * window.CODE_DESTINY_API_BASE_URL.
 */

const FALLBACK_LOCAL_API_BASE_URL = "http://localhost:4000";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

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

function isLocalHostname(hostname?: string | null): boolean {
  return LOCAL_HOSTS.has(String(hostname || "").trim().toLowerCase());
}

function isLocalBaseUrl(baseUrl?: string | null): boolean {
  const value = String(baseUrl || "").trim();
  if (!value) return false;

  try {
    return isLocalHostname(new URL(value).hostname);
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(value);
  }
}

function pickPreferredLocalBase(candidates: Array<string>): string {
  for (const candidate of candidates) {
    if (isLocalBaseUrl(candidate)) return candidate;
  }
  return "";
}

export function getApiBaseUrl(): string {
  const configuredBase = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  const configuredAuthBase = normalizeBaseUrl(process.env.NEXT_PUBLIC_AUTH_API_BASE_URL);

  if (typeof window !== "undefined") {
    const runtimeBase = normalizeBaseUrl((window as any).CODE_DESTINY_API_BASE_URL);
    const isLocalDev = isLocalHostname(window.location.hostname);

    if (isLocalDev) {
      const localBase = pickPreferredLocalBase([
        runtimeBase,
        configuredAuthBase,
        configuredBase,
      ]);
      return localBase || FALLBACK_LOCAL_API_BASE_URL;
    }

    if (runtimeBase) return runtimeBase;

    // In production/previews, prefer same-origin /api via Pages routing first.
    // If routing is unavailable, configure NEXT_PUBLIC_AUTH_API_BASE_URL.
    return configuredBase || configuredAuthBase || "";
  }

  return configuredBase || configuredAuthBase;
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
