/**
 * Locale prefixes used by next.config.mjs beforeFiles rewrites (nested paths only).
 * Must match LOCALE_PATH_SLUGS in next.config.mjs.
 */
const LOCALE_PREFIXES = [
  "/en",
  "/ja",
  "/zh",
  "/en-us",
  "/ja-jp",
  "/zh-cn",
];

/**
 * Returns pathname without a leading /{locale} segment, e.g. /en-us/oracle/hwatu -> /oracle/hwatu
 */
export function stripLocalePrefix(pathname) {
  if (!pathname || pathname === "/") return "/";
  const lower = pathname.toLowerCase();
  for (const locale of LOCALE_PREFIXES) {
    if (lower === locale) return "/";
    if (lower.startsWith(`${locale}/`)) {
      const rest = pathname.slice(locale.length) || "/";
      return rest.startsWith("/") ? rest : `/${rest}`;
    }
  }
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}
