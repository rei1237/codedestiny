const CONTROL_OR_BACKSLASH = /[\\\u0000-\u001f\u007f]/;

export function resolveInternalRedirectUrl(value, origin) {
  const base = new URL(origin);
  const fallback = new URL("/", base.origin).toString();
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/") || path.startsWith("//") || CONTROL_OR_BACKSLASH.test(path)) return fallback;

  const resolved = new URL(path, base.origin);
  return resolved.origin === base.origin ? resolved.toString() : fallback;
}
