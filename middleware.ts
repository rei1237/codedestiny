import { NextResponse } from "next/server";

// 🔴 이 middleware 는 프로덕션에서 실행되지 않는다. next.config.mjs 가 프로덕션 빌드에
// `output: "export"` 를 쓰므로 정적 export 산출물에 middleware 가 포함되지 않는다 — 즉 아래
// 정규화 로직은 `next dev` 전용이다.
//
// 그래서 아래 REDIRECT_HOSTS 에 www 가 있어도 프로덕션 www 는 리다이렉트되지 않았고,
// 2026-07-30 까지 www.code-destiny.com 은 전 경로 522 였다(www 가 Pages 커스텀 도메인에도,
// Worker route 에도 없어 그 호스트를 받아줄 서비스가 없었다).
//
// 프로덕션 www → apex 301 의 정본은 **Cloudflare Redirect Rule** 이다:
//   zone `code-destiny.com` / 룰 이름 `www to apex canonical`
//   expression : http.host eq "www.code-destiny.com"
//   dynamic    : concat("https://code-destiny.com", http.request.uri)   (301, preserve-query OFF)
// 대시보드 설정이라 커밋되지 않으므로 `npm run verify:www-canonical` 이 하루 1회
// (.github/workflows/canonical-host-check.yml) 살아있는지 실측한다.
//
// 여기 로직을 고쳐도 프로덕션 동작은 바뀌지 않는다 — 호스트 정규화를 손봐야 하면 위 룰을 고칠 것.
const CANONICAL_HOST = "code-destiny.com";
const REDIRECT_HOSTS = new Set(["www.code-destiny.com", "code-destiny.pages.dev"]);

// Map supported browser languages to public locale roots.
const ACCEPT_LANG_MAP = [
  { prefix: "ja", slug: "/ja" },
  { prefix: "zh", slug: "/zh" },
  { prefix: "en", slug: "/en" },
];
// Legacy locale roots are redirected to the current short slugs.
const LEGACY_LOCALE_SLUGS = ["/en-us", "/ja-jp", "/zh-cn"];
const LOCALE_SLUGS = new Set([...ACCEPT_LANG_MAP.map((l) => l.slug), ...LEGACY_LOCALE_SLUGS]);
const LEGACY_LOCALE_REDIRECTS = new Map([
  ["/en-us", "/en"],
  ["/ja-jp", "/ja"],
  ["/zh-cn", "/zh"],
]);
const COUNTRY_TRANSLATE_LANG = new Map([
  ["US", "en"], ["GB", "en"], ["AU", "en"], ["NZ", "en"], ["IE", "en"], ["SG", "en"], ["PH", "en"],
  ["JP", "ja"],
  ["CN", "zh-CN"], ["HK", "zh-CN"], ["MO", "zh-CN"], ["TW", "zh-CN"],
  ["IN", "hi"],
  ["ES", "es"], ["MX", "es"], ["AR", "es"], ["CO", "es"], ["CL", "es"], ["PE", "es"], ["VE", "es"], ["UY", "es"], ["PY", "es"], ["BO", "es"], ["EC", "es"], ["GT", "es"], ["CR", "es"], ["PA", "es"], ["DO", "es"], ["HN", "es"], ["NI", "es"], ["SV", "es"], ["CU", "es"],
  ["FR", "fr"], ["MC", "fr"], ["LU", "fr"],
  ["DE", "de"], ["AT", "de"],
  ["NL", "nl"],
  ["MY", "ms"], ["BN", "ms"],
]);
function getLocaleSlugFromAcceptLang(acceptLang) {
  if (!acceptLang) return null;
  // e.g. "ja-JP,ja;q=0.9,en;q=0.8" -> ["ja-JP", "ja", "en"]
  const langs = acceptLang
    .split(",")
    .map((s) => s.split(";")[0].trim().toLowerCase())
    .filter(Boolean);
  for (const lang of langs) {
    if (lang.startsWith("ko")) return null;
    for (const entry of ACCEPT_LANG_MAP) {
      if (lang.startsWith(entry.prefix)) return entry.slug;
    }
  }
  return null;
}
function getTranslateLangFromAcceptLang(acceptLang) {
  if (!acceptLang) return null;
  const langs = acceptLang
    .split(",")
    .map((s) => s.split(";")[0].trim().toLowerCase())
    .filter(Boolean);
  for (const lang of langs) {
    if (lang.startsWith("ko")) return null;
    if (lang.startsWith("zh")) return "zh-CN";
    if (lang.startsWith("en")) return "en";
    if (lang.startsWith("ja")) return "ja";
    if (lang.startsWith("hi")) return "hi";
    if (lang.startsWith("es")) return "es";
    if (lang.startsWith("fr")) return "fr";
    if (lang.startsWith("de")) return "de";
    if (lang.startsWith("nl")) return "nl";
    if (lang.startsWith("ms")) return "ms";
  }
  return null;
}
function getRequestCountry(request) {
  const rawCountry =
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-vercel-ip-country") ||
    request.geo?.country ||
    "";
  return String(rawCountry || "").trim().toUpperCase();
}
function getAutoTranslateLang(request) {
  const countryLang = COUNTRY_TRANSLATE_LANG.get(getRequestCountry(request));
  if (countryLang) return countryLang;
  return getTranslateLangFromAcceptLang(request.headers.get("accept-language") || "");
}

function normalizeRuntimeLang(value) {
  const lang = String(value || "").trim().toLowerCase().replace("_", "-");
  if (lang === "ko") return "ko";
  if (lang === "en" || lang === "en-us") return "en";
  if (lang === "ja" || lang === "ja-jp") return "ja";
  if (lang === "zh" || lang === "zh-cn" || lang === "zh-hans") return "zh-CN";
  if (lang === "zh-tw" || lang === "zh-hant") return "zh-TW";
  if (["vi", "hi", "es", "fr", "de", "nl", "ms"].includes(lang)) return lang;
  return "";
}

function getRuntimeLangFromPath(pathname) {
  const normalized = normalizePathname(pathname);
  const firstSegment = normalized.split("/").filter(Boolean)[0] || "";
  return normalizeRuntimeLang(firstSegment);
}

function getRuntimeLangFromRequest(request) {
  const queryLang = normalizeRuntimeLang(request.nextUrl.searchParams.get("lang"));
  if (queryLang) return queryLang;
  const pathLang = getRuntimeLangFromPath(request.nextUrl.pathname || "");
  if (pathLang) return pathLang;
  return normalizeRuntimeLang(request.cookies.get("cd_locale")?.value || "");
}

function attachLocaleCookies(response, lang) {
  const runtimeLang = normalizeRuntimeLang(lang);
  if (!runtimeLang) return response;
  response.cookies.set("cd_locale", runtimeLang, {
    path: "/",
    maxAge: 315360000,
    sameSite: "lax",
  });
  response.cookies.set("cd_locale_ack", "1", {
    path: "/",
    maxAge: 315360000,
    sameSite: "lax",
  });
  return response;
}
const SEO_PUBLIC_PATHS = new Set([
  "/robots.txt",
  "/sitemap.xml",
  "/rss.xml",
  "/favicon.ico",
  "/manifest.json",
  "/manifest-neo.json",
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

const SERVICE_ROUTE_ACTIONS = new Map([
  ["/tarot", "openTarotModal"],
  ["/tarot/love", "openTarotLoveModal"],
  ["/tarot/self-esteem", "openTarotSelfEsteemModal"],
  ["/tarot/reunion", "openTarotReunionModal"],
  ["/tarot/year", "openTarotYearFortuneModal"],
  ["/tarot/mingri", "openTarotModal"],
  ["/tarot/mingri/play", "openTarotModal"],
  ["/tarot/mindscan", "startMindScanTarot"],
  ["/tarot/crystal-soul", "openCelestialHarmony"],
  ["/saju", "checkPrivacyAndCalculate"],
  ["/saju/basic", "checkPrivacyAndCalculate"],
  ["/saju/basic/play", "checkPrivacyAndCalculate"],
  ["/saju/sibyl", "openSibylModal"],
  ["/saju/love-simulation", "openLoveSimulation"],
  ["/oracle", "openHwatuModal"],
  ["/oracle/hwatu-life", "openHwatuModal"],
  ["/oracle/royal-tea", "openRoyalTeaOracle"],
  ["/oracle/rune", "openRuneOracle"],
  ["/oracle/ifa", "openIfaOracle"],
  ["/astrology", "openAstroModal"],
  ["/astrology/cosmic", "openAstroModal"],
  ["/ziwei", "openZiweiModal"],
  ["/ziwei/chart", "openZiweiModal"],
  ["/olympus", "openOlympusOracleModal"],
]);

const SERVICE_ROUTE_PARAMS = new Map([
  ["/oracle/sikojen-povailu", ["service", "pig-oracle"]],
]);

const SERVICE_ROUTE_EXTRA_QUERY = new Map([]);

const LANDING_ONLY_ROUTES = new Set([
  "/high-value",
  "/methodology",
  "/landing",
]);

const PROTECTED_AUTH_ROUTE_PREFIXES = [
  "/dashboard",
  "/mypage",
  "/points",
];

const AUTH_MIDDLEWARE_BYPASS_PATHS = new Set([
  "/auth/kakao/callback",
  "/api/auth/kakao/callback",
  "/api/auth/oauth/kakao/callback",
  "/auth/error",
  "/login",
]);

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

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function isAuthMiddlewareBypassPath(pathname) {
  return AUTH_MIDDLEWARE_BYPASS_PATHS.has(normalizePathname(pathname));
}

function isKakaoCallbackPath(pathname) {
  const normalized = normalizePathname(pathname);
  return normalized === "/auth/kakao/callback"
    || normalized === "/api/auth/kakao/callback"
    || normalized === "/api/auth/oauth/kakao/callback";
}

function logKakaoMiddlewareBypass(request) {
  if (!isKakaoCallbackPath(request.nextUrl.pathname)) return;
  const payload = {
    routePath: request.nextUrl.pathname,
    requestHost: request.nextUrl.host,
  };
  try {
    console.info("[Kakao Callback] middlewareBypass", JSON.stringify(payload));
  } catch (error) {
    console.info("[Kakao Callback] middlewareBypass");
  }
}

function stripLocaleSlug(pathname) {
  const normalized = normalizePathname(pathname);
  for (const slug of LOCALE_SLUGS) {
    if (normalized === slug) return "/";
    if (normalized.startsWith(slug + "/")) return normalized.slice(slug.length) || "/";
  }
  return normalized;
}

function buildMainRedirectUrl(request, paramsPatchFn) {
  const url = request.nextUrl.clone();
  url.pathname = "/index.html";
  const params = new URLSearchParams(url.search || "");
  const runtimeLang = getRuntimeLangFromRequest(request);
  if (runtimeLang && runtimeLang !== "ko" && !params.has("lang")) {
    params.set("lang", runtimeLang);
  }
  paramsPatchFn(params);
  const q = params.toString();
  url.search = q ? `?${q}` : "";
  return url;
}

function decodeJwtPayload(token) {
  const raw = String(token || "").trim();
  const parts = raw.split(".");
  if (parts.length < 2) return null;

  const base64Url = String(parts[1] || "").trim();
  if (!base64Url) return null;

  const normalized = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const paddingNeeded = normalized.length % 4;
  const padded = `${normalized}${paddingNeeded ? "=".repeat(4 - paddingNeeded) : ""}`;

  try {
    if (typeof atob !== "function") return null;
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function hasJwtShape(rawToken) {
  const token = String(rawToken || "").trim();
  if (!token) return false;
  return token.split(".").length >= 2;
}

function isUsableAuthToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return false;

  const payload = decodeJwtPayload(raw);
  if (!payload || typeof payload !== "object") return false;

  const exp = Number(payload.exp);
  if (!Number.isFinite(exp)) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  return exp > nowSec + 5;
}

function mergeMusicCspForAudio(cspHeader) {
  const cspValue = String(cspHeader || "").trim();
  const mediaDomain = "https://music.code-destiny.com";
  const mediaDirective = `media-src 'self' ${mediaDomain}`;
  const fallbackMusicCsp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
    "script-src-elem 'self' 'unsafe-inline'",
    "connect-src 'self' https://music.code-destiny.com",
    mediaDirective,
    "style-src 'self' 'unsafe-inline'",
    "style-src-elem 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://assets.code-destiny.com",
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "manifest-src 'self'",
  ].join("; ");

  if (!cspValue) {
    return fallbackMusicCsp;
  }

  const directives = cspValue.split(";").map((part) => part.trim()).filter(Boolean);
  let mediaDirectiveFound = false;

  const merged = directives.map((directive) => {
    if (!/^media-src\b/i.test(directive)) return directive;

    mediaDirectiveFound = true;
    const values = directive
      .replace(/^media-src\b/i, "")
      .trim()
      .split(/\s+/)
      .filter((v) => v.length > 0);

    const sourceSet = new Set(values);
    sourceSet.add("'self'");
    sourceSet.add(mediaDomain);
    const ordered = ["'self'"];
    const mediaSources = Array.from(sourceSet).filter((value) => value !== "'self'");
    return `media-src ${ordered.concat(mediaSources).join(" ")}`;
  });

  if (!mediaDirectiveFound) {
    merged.push(mediaDirective);
  }

  return merged.join("; ");
}

function hasAuthSessionCookie(request) {
  const accessToken = String(request.cookies.get("fortune_auth_token")?.value || "").trim();
  if (isUsableAuthToken(accessToken)) return true;

  const refreshToken = String(request.cookies.get("fortune_auth_refresh")?.value || "").trim();
  return hasJwtShape(refreshToken);
}

function buildLoginRedirectUrl(request) {
  const loginUrl = request.nextUrl.clone();
  const redirectTo = `${request.nextUrl.pathname}${request.nextUrl.search || ""}`;
  loginUrl.pathname = "/login";
  loginUrl.search = `?returnTo=${encodeURIComponent(redirectTo)}&next=${encodeURIComponent(redirectTo)}&redirect=${encodeURIComponent(redirectTo)}`;
  return loginUrl;
}

function middlewareStackSnippet(error) {
  const stack = String(error?.stack || "");
  if (!stack) return "";
  return stack
    .split("\n")
    .slice(0, 4)
    .map((line) => line.trim())
    .join(" | ")
    .slice(0, 600);
}

function logMiddlewareError(request, error) {
  const payload = {
    routePath: String(request?.nextUrl?.pathname || ""),
    provider: "",
    requestHost: String(request?.nextUrl?.host || ""),
    errorName: String(error?.name || "Error"),
    errorMessage: String(error?.message || "middleware_error").slice(0, 300),
    stackSnippet: middlewareStackSnippet(error),
    env: {
      hasAuthSecret: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
      hasJwtSecret: Boolean(process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET),
      hasAuthUrl: Boolean(process.env.AUTH_URL || process.env.NEXTAUTH_URL),
      hasAuthApiBaseUrl: Boolean(process.env.AUTH_API_BASE_URL),
      hasAuthTrustHost: Boolean(process.env.AUTH_TRUST_HOST || process.env.NEXTAUTH_TRUST_HOST),
      hasGoogleClientId: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID),
      hasGoogleClientSecret: Boolean(process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET),
      hasMongoUri: Boolean(process.env.MONGO_URI || process.env.MONGODB_URI),
    },
  };

  try {
    console.error("[middleware-auth-diagnostic]", JSON.stringify(payload));
  } catch {
    console.error("[middleware-auth-diagnostic]", payload);
  }
}

export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const method = (request.method || "GET").toUpperCase();

  try {
    if (pathname === "/secret-house-final.html") {
      const url = request.nextUrl.clone();
      url.pathname = "/secret-house_real.html";
      url.search = search;
      return NextResponse.redirect(url, 308);
    }

    // SEO/public discovery files and static assets should always pass through unchanged.
    if (SEO_PUBLIC_PATHS.has(pathname) || isStaticAssetPath(pathname)) {
      return NextResponse.next();
    }

    // API routes and non-idempotent requests must not be canonical-redirected.
    // Redirecting these can break POST flows and trigger cross-origin CORS failures.
    if (pathname.startsWith("/api/") && isAuthMiddlewareBypassPath(pathname)) {
      logKakaoMiddlewareBypass(request);
      const response = NextResponse.next();
      if (isKakaoCallbackPath(pathname)) {
        response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
        response.headers.set("Pragma", "no-cache");
      }
      return response;
    }

    if (pathname.startsWith("/api/") || !["GET", "HEAD", "OPTIONS"].includes(method)) {
      return NextResponse.next();
    }

    /**
     * Canonical entry path is "/".
     * - "/" is served from the unified main shell (/index.html) via rewrite.
     * - Legacy /static paths are normalized to "/".
     */
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      const localeAck = request.cookies.get("cd_locale_ack");
      const hasLangParam = url.searchParams.has("lang");
      if (!localeAck && !hasLangParam) {
        const targetLang = getAutoTranslateLang(request);
        if (targetLang) {
          url.searchParams.set("lang", targetLang);
          return attachLocaleCookies(NextResponse.redirect(url, 307), targetLang);
        }
      }
      url.pathname = "/index.html";
      url.search = search;
      return attachLocaleCookies(NextResponse.rewrite(url), getRuntimeLangFromRequest(request));
    }

    if (pathname === "/static" || pathname === "/static/" || pathname === "/static/index.html") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = search;
      return NextResponse.redirect(url, 308);
    }

    // Keep legacy/static pages referencing an icon path without 404ing.
    if (pathname === "/icons/icon-192x192.png") {
      const url = request.nextUrl.clone();
      url.pathname = "/icons/neo-mode-icon.png";
      url.search = search;
      return NextResponse.rewrite(url);
    }

    // Admin route protection: /admin/* (except /admin/login) requires flower_admin_token cookie
    if (pathname.startsWith("/admin") && pathname !== "/admin/login" && pathname !== "/admin/login/") {
      const tokenCookie = request.cookies.get("flower_admin_token")?.value;
      if (!tokenCookie) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/admin/login";
        return NextResponse.redirect(loginUrl);
      }
    }

  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const host = rawHost.toLowerCase().split(":")[0];

  if (shouldRedirectToCanonical(host)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.protocol = "https";
    redirectUrl.host = CANONICAL_HOST;
    return NextResponse.redirect(redirectUrl, 308);
  }

  const normalizedPath = normalizePathname(pathname);
  for (const [legacyPrefix, newPrefix] of LEGACY_LOCALE_REDIRECTS) {
    if (normalizedPath === legacyPrefix || normalizedPath.startsWith(`${legacyPrefix}/`)) {
      const redirectUrl = request.nextUrl.clone();
      const suffix = normalizedPath.slice(legacyPrefix.length);
      redirectUrl.pathname = `${newPrefix}${suffix || ""}` || newPrefix;
      redirectUrl.search = search;
      return NextResponse.redirect(redirectUrl, 308);
    }
  }

  const routePath = stripLocaleSlug(normalizedPath);

  if (isAuthMiddlewareBypassPath(routePath)) {
    logKakaoMiddlewareBypass(request);
    const response = NextResponse.next();
    if (isKakaoCallbackPath(routePath)) {
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      response.headers.set("Pragma", "no-cache");
    }
    return response;
  }

  if (routePath === "/saju/love-secret" || routePath === "/saju/love-bible" || routePath === "/premium/saju-love-bible") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/love-secret-ai";
    redirectUrl.search = "";
    return attachLocaleCookies(NextResponse.redirect(redirectUrl, 308), getRuntimeLangFromRequest(request));
  }

  if (PROTECTED_AUTH_ROUTE_PREFIXES.some((prefix) => routePath === prefix || routePath.startsWith(`${prefix}/`))) {
    if (!hasAuthSessionCookie(request)) {
      return attachLocaleCookies(NextResponse.redirect(buildLoginRedirectUrl(request), 307), getRuntimeLangFromRequest(request));
    }
  }

  const actionForRoute = SERVICE_ROUTE_ACTIONS.get(routePath);
  if (actionForRoute) {
    if (!hasAuthSessionCookie(request)) {
      return attachLocaleCookies(NextResponse.redirect(buildLoginRedirectUrl(request), 307), getRuntimeLangFromRequest(request));
    }
    const redirectUrl = buildMainRedirectUrl(request, (params) => {
      params.set("action", actionForRoute);
      const extra = SERVICE_ROUTE_EXTRA_QUERY.get(routePath);
      if (extra && typeof extra === "object") {
        Object.entries(extra).forEach(([key, value]) => {
          if (!key) return;
          const safe = String(value || "").trim();
          if (safe) params.set(key, safe);
        });
      }
    });
    return attachLocaleCookies(NextResponse.redirect(redirectUrl, 308), getRuntimeLangFromRequest(request));
  }

  const serviceParam = SERVICE_ROUTE_PARAMS.get(routePath);
  if (serviceParam) {
    if (!hasAuthSessionCookie(request)) {
      return attachLocaleCookies(NextResponse.redirect(buildLoginRedirectUrl(request), 307), getRuntimeLangFromRequest(request));
    }
    const redirectUrl = buildMainRedirectUrl(request, (params) => {
      params.set(serviceParam[0], serviceParam[1]);
    });
    return attachLocaleCookies(NextResponse.redirect(redirectUrl, 308), getRuntimeLangFromRequest(request));
  }

  if (LANDING_ONLY_ROUTES.has(routePath)) {
    const redirectUrl = buildMainRedirectUrl(request, () => {});
    return attachLocaleCookies(NextResponse.redirect(redirectUrl, 308), getRuntimeLangFromRequest(request));
  }

  const rawPath = request.nextUrl.pathname || "/";

  // Locale roots: app/{locale}/page.js. Nested /{locale}/* : next.config.mjs beforeFiles rewrites.

  // Redirect first-time root visits to a supported locale when the browser language is non-Korean.
  // Existing locale paths and users with cd_locale_ack are left unchanged.
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
        return NextResponse.redirect(redirectUrl, 307);
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  const pathForLocale = rawPath === "" ? "/" : rawPath;
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "") || "https";
  requestHeaders.set("x-forwarded-host", forwardedHost);
  requestHeaders.set("x-forwarded-proto", forwardedProto);
  // Only pass document path to layout: RSC / _next /api must not overwrite x-pathname (breaks / on Workers).
  if (!rawPath.startsWith("/_next") && !rawPath.startsWith("/api")) {
    requestHeaders.set("x-pathname", pathForLocale);
  }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    const musicPath = request.nextUrl.pathname || "/";
    if (musicPath.startsWith("/music") || /^\/(?:en|ja|zh)\/music(?:\/|$)/.test(musicPath)) {
      const cspHeader = response.headers.get("Content-Security-Policy");
      response.headers.set("Content-Security-Policy", mergeMusicCspForAudio(cspHeader));
    }

    return attachLocaleCookies(response, getRuntimeLangFromRequest(request));
  } catch (error) {
    logMiddlewareError(request, error);
    // Fail-open for auth middleware errors so OAuth/login pages remain reachable.
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/",
    "/((?!_next|api|favicon.ico|robots.txt|sitemap.xml|rss.xml|manifest.json|manifest-neo.json|status.json|styles/|css/|js/|icons/|fuctionassets/|tarot-cards/|lib/|sudda/).*)",
  ],
};
