import { NextResponse } from "next/server";

const CANONICAL_HOST = "code-destiny.com";
const REDIRECT_HOSTS = new Set(["www.code-destiny.com", "code-destiny-web.pages.dev"]);
const BOT_UA_RE =
  /(googlebot|bingbot|baiduspider|yandexbot|duckduckbot|slurp|facebot|ia_archiver|sogou|360spider|bytespider|semrushbot|ahrefsbot)/i;

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

  // API routes and non-idempotent requests must not be canonical-redirected.
  // Redirecting these can break POST flows and trigger cross-origin CORS failures.
  if (pathname.startsWith("/api/") || !["GET", "HEAD", "OPTIONS"].includes(method)) {
    return NextResponse.next();
  }

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

  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const host = rawHost.toLowerCase().split(":")[0];

  if (shouldRedirectToCanonical(host)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.protocol = "https";
    redirectUrl.host = CANONICAL_HOST;
    return NextResponse.redirect(redirectUrl, 308);
  }

  // Locale roots: app/{locale}/page.js. Nested /{locale}/* : next.config.mjs beforeFiles rewrites.

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
