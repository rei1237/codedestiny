const AUTH_ROUTE_PREFIXES = ["/login", "/signup", "/auth/"];
const MAX_AUTH_RETURN_LENGTH = 1200;

/** @param {string | null | undefined} rawValue */
export function sanitizeAuthReturnPath(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw || raw.length > MAX_AUTH_RETURN_LENGTH) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || /[\u0000-\u001f\u007f]/.test(raw)) return null;

  try {
    const base = "https://code-destiny.invalid";
    const parsed = new URL(raw, base);
    if (parsed.origin !== base) return null;
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (AUTH_ROUTE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix))) return null;
    return normalized;
  } catch {
    return null;
  }
}

/** @param {URLSearchParams} params */
export function resolveAuthReturnPath(params) {
  return sanitizeAuthReturnPath(params.get("returnTo"))
    || sanitizeAuthReturnPath(params.get("next"))
    || sanitizeAuthReturnPath(params.get("redirect"))
    || "/";
}
