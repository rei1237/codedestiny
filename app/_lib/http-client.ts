function isLocalApiOrigin(rawValue: string): boolean {
  const value = String(rawValue || "").trim();
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
  } catch (e) {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(value);
  }
}

export function toAbsoluteApiUrl(pathOrUrl: string, apiBase: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalizedBase = String(apiBase || "").replace(/\/+$/, "");
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  if (
    typeof window !== "undefined"
    && normalizedPath.startsWith("/api/")
    && isLocalApiOrigin(normalizedBase)
  ) {
    const currentOrigin = String(window.location?.origin || "").replace(/\/+$/, "");
    return currentOrigin ? `${currentOrigin}${normalizedPath}` : normalizedPath;
  }
  return `${normalizedBase}${normalizedPath}`;
}

export async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  if (typeof AbortController === "undefined") {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
