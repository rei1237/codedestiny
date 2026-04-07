import { NextResponse } from "next/server";

const CANONICAL_HOST = "code-destiny.com";
const REDIRECT_HOSTS = new Set(["www.code-destiny.com", "code-destiny.pages.dev"]);

/**
 * Accept-Language → locale slug 매핑
 * 브라우저 언어 감지 후 해당 경로로 자동 리다이렉트
 */
const ACCEPT_LANG_MAP = [
  { prefix: "ja", slug: "/ja-jp" },
  { prefix: "zh", slug: "/zh-cn" },
  { prefix: "hi", slug: "/hi-in" },
  { prefix: "es", slug: "/es-es" },
  { prefix: "fr", slug: "/fr-fr" },
  { prefix: "de", slug: "/de-de" },
  { prefix: "nl", slug: "/nl-nl" },
  { prefix: "ms", slug: "/ms-my" },
  { prefix: "en", slug: "/en-us" },
];
/** 이미 로케일 prefix 하에 있는 경로인지 확인 */
const LOCALE_SLUGS = new Set(ACCEPT_LANG_MAP.map((l) => l.slug));
function getLocaleSlugFromAcceptLang(acceptLang) {
  if (!acceptLang) return null;
  // e.g. "ja-JP,ja;q=0.9,en;q=0.8" → ["ja-JP","ja","en"]
  const langs = acceptLang
    .split(",")
    .map((s) => s.split(";")[0].trim().toLowerCase())
    .filter(Boolean);
  for (const lang of langs) {
    // ko → 한국어이면 리다이렉트 불필요
    if (lang.startsWith("ko")) return null;
    for (const entry of ACCEPT_LANG_MAP) {
      if (lang.startsWith(entry.prefix)) return entry.slug;
    }
  }
  return null;
}
const SEO_PUBLIC_PATHS = new Set([
  "/robots.txt",
  "/sitemap.xml",
  "/rss.xml",
  "/favicon.ico",
  "/manifest.json",
  "/manifest-samba.json",
  "/status.json",
]);

const STATIC_PREFIXES = [
  "/styles/",
  "/css/",
  "/js/",
  "/icons/",
  "/fuctionassets/",
  "/tarot-cards/",
  "/lib/",
  "/sudda/",
  "/_next/",
];

function isStaticAssetPath(pathname) {
  if (!pathname) return false;
  for (const prefix of STATIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return /\.[a-z0-9]+$/i.test(pathname);
}
function isLocalHost(host) {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function shouldRedirectToCanonical(host) {
  if (!host || isLocalHost(host) || host === CANONICAL_HOST) {
    return false;
  }

  if (REDIRECT_HOSTS.has(host)) {
    return true;
  }

  return host.endsWith(".pages.dev");
}

export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const ua = request.headers.get("user-agent") || "";
  const method = (request.method || "GET").toUpperCase();

  // SEO/public discovery files and static assets should always pass through unchanged.
  if (SEO_PUBLIC_PATHS.has(pathname) || isStaticAssetPath(pathname)) {
    return NextResponse.next();
  }

  // API routes and non-idempotent requests must not be canonical-redirected.
  // Redirecting these can break POST flows and trigger cross-origin CORS failures.
  if (pathname.startsWith("/api/") || !["GET", "HEAD", "OPTIONS"].includes(method)) {
    return NextResponse.next();
  }

  /**
   * Address bar stays https://code-destiny.com/ (rewrite serves legacy in next.config).
   * If someone opens /static/index.html directly, normalize to / for one canonical URL.
   */
  if (pathname === "/static/index.html") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = search;
    return NextResponse.redirect(url, 308);
  }
  if (pathname === "/index.html") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = search;
    return NextResponse.redirect(url, 301);
  }

  // Keep legacy/static pages referencing an icon path without 404ing.
  if (pathname === "/icons/icon-192x192.png") {
    const url = request.nextUrl.clone();
    url.pathname = "/icons/samba-mode-icon.png";
    url.search = search;
    return NextResponse.rewrite(url);
  }

  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const host = rawHost.toLowerCase().split(":")[0];

  if (shouldRedirectToCanonical(host)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.protocol = "https";
    redirectUrl.host = CANONICAL_HOST;
    return NextResponse.redirect(redirectUrl, 308);
  }

  // Locale roots: app/{locale}/page.js. Nested /{locale}/* : next.config.mjs beforeFiles rewrites.

  /**
   * Accept-Language 자동 리다이렉트:
   * 루트(/) 방문 시 브라우저 언어가 비한국어이면 해당 로케일 경로로 301 리다이렉트.
   * - 이미 로케일 경로 하에 있으면 스킵 (무한루프 방지)
   * - 쿠키 `cd_locale_ack=1` 이 있으면 스킵 (사용자가 언어 선택했을 때 세팅)
   */
  const isLocaleRoot = LOCALE_SLUGS.has(rawPath.replace(/\/$/, "")) ||
    [...LOCALE_SLUGS].some((s) => rawPath.startsWith(s + "/"));
  if (!isLocaleRoot && (rawPath === "/" || rawPath === "")) {
    const localeAck = request.cookies.get("cd_locale_ack");
    if (!localeAck) {
      const acceptLang = request.headers.get("accept-language") || "";
      const targetSlug = getLocaleSlugFromAcceptLang(acceptLang);
      if (targetSlug) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = targetSlug;
        // 307 Temporary: SEO 관점에서 한국어가 기본 canonical이므로 임시 리다이렉트
        return NextResponse.redirect(redirectUrl, 307);
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  const rawPath = request.nextUrl.pathname || "/";
  const pathForLocale = rawPath === "" ? "/" : rawPath;
  // Only pass document path to layout: RSC / _next /api must not overwrite x-pathname (breaks / on Workers).
  if (!rawPath.startsWith("/_next") && !rawPath.startsWith("/api")) {
    requestHeaders.set("x-pathname", pathForLocale);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/",
    "/((?!_next|api|favicon.ico|robots.txt|sitemap.xml|rss.xml|manifest.json|manifest-samba.json|status.json|styles/|css/|js/|icons/|fuctionassets/|tarot-cards/|lib/|sudda/).*)",
  ],
};
