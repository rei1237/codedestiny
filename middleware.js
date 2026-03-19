import { NextResponse } from "next/server";

const CANONICAL_HOST = "code-destiny.com";
const REDIRECT_HOSTS = new Set(["www.code-destiny.com", "code-destiny-web.pages.dev"]);
const BOT_UA_RE =
  /(googlebot|bingbot|baiduspider|yandexbot|duckduckbot|slurp|facebot|ia_archiver|sogou|360spider|bytespider|semrushbot|ahrefsbot)/i;
const COUNTRY_TO_LOCALE_PATH = {
  KR: "/",
  US: "/en-us",
  GB: "/en-gb",
  CA: "/en-ca",
  AU: "/en-au",
  SG: "/en-sg",
  PH: "/en-ph",
  IN: "/hi-in",
  ZA: "/en-za",
  JP: "/ja-jp",
  CN: "/zh-cn",
  TW: "/zh-tw",
  FR: "/fr-fr",
  DE: "/de-de",
  NL: "/nl-nl",
  ES: "/es-es",
  MY: "/ms-my",
  TH: "/th-th",
  VN: "/vi-vn",
};
const LOCALE_COOKIE_TO_PATH = {
  "ko-KR": "/",
  "en-US": "/en-us",
  "en-CA": "/en-ca",
  "en-SG": "/en-sg",
  "en-GB": "/en-gb",
  "en-AU": "/en-au",
  "en-PH": "/en-ph",
  "en-IN": "/en-in",
  "hi-IN": "/hi-in",
  "en-ZA": "/en-za",
  "fr-FR": "/fr-fr",
  "fr-CA": "/fr-ca",
  "de-DE": "/de-de",
  "it-IT": "/it-it",
  "hu-HU": "/hu-hu",
  "nl-NL": "/nl-nl",
  "ja-JP": "/ja-jp",
  "zh-CN": "/zh-cn",
  "zh-TW": "/zh-tw",
  "es-ES": "/es-es",
  "th-TH": "/th-th",
  "vi-VN": "/vi-vn",
  "ms-MY": "/ms-my",
};

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

  // Keep legacy/static pages referencing an icon path without 404ing.
  if (pathname === "/icons/icon-192x192.png") {
    const url = request.nextUrl.clone();
    url.pathname = "/icons/samba-mode-icon.png";
    url.search = search;
    return NextResponse.rewrite(url);
  }

  // Prevent SEO split: let bots index "/" instead of "/index.html".
  if (pathname === "/index.html") {
    if (BOT_UA_RE.test(ua)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = search;
      return NextResponse.redirect(url, 301);
    }
  }

  // Geo-locale redirect for users on the root only.
  // Bots stay on "/" so canonical indexing remains stable.
  if (pathname === "/" && !BOT_UA_RE.test(ua)) {
    const cookieLocale = request.cookies.get("cd_locale")?.value;
    const cookieTarget = cookieLocale ? LOCALE_COOKIE_TO_PATH[cookieLocale] : null;
    const geoCountry = (request.headers.get("cf-ipcountry") || "").toUpperCase().trim();
    const geoTarget = geoCountry ? COUNTRY_TO_LOCALE_PATH[geoCountry] : null;
    const targetPath = cookieTarget || geoTarget;

    if (targetPath && targetPath !== "/") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = targetPath;
      redirectUrl.search = search;
      return NextResponse.redirect(redirectUrl, 307);
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/:path*"],
};
