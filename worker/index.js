import { handleAuthRoutes } from "./routes/auth.js";
import { handleFortuneRoutes } from "./routes/fortune.js";
import { handlePaymentRoutes } from "./routes/payments.js";
import { handlePremiumRoutes, handleZiweiBookRoutes } from "./routes/premium.js";

/**
 * Code Destiny API Worker.
 *
 * Auth, payment, and fortune APIs now run as Worker-native Fetch handlers.
 * API_UPSTREAM_ORIGIN remains optional as a fallback for API groups that have
 * not been ported yet.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4000",
  "https://code-destiny.com",
  "https://www.code-destiny.com",
  "https://code-destiny.pages.dev",
  "https://codedestiny.pages.dev",
];

function generateSitemap() {
  const base = "https://code-destiny.com";
  const urls = [
    { path: "/", priority: "1.0", freq: "daily" },
    { path: "/saju", priority: "0.97", freq: "daily" },
    { path: "/saju/basic", priority: "0.95", freq: "weekly" },
    { path: "/saju/lifebook", priority: "0.92", freq: "weekly" },
    { path: "/saju/love-secret", priority: "0.91", freq: "weekly" },
    { path: "/saju/love-simulation", priority: "0.90", freq: "weekly" },
    { path: "/saju-picture", priority: "0.86", freq: "weekly" },
    { path: "/ziwei/chart", priority: "0.95", freq: "weekly" },
    { path: "/tarot", priority: "0.92", freq: "weekly" },
    { path: "/tarot/year", priority: "0.85", freq: "monthly" },
    { path: "/tarot/healing", priority: "0.84", freq: "monthly" },
    { path: "/tarot/love", priority: "0.82", freq: "monthly" },
    { path: "/oracle", priority: "0.88", freq: "weekly" },
    { path: "/oracle/hwatu-life", priority: "0.78", freq: "monthly" },
    { path: "/olympus", priority: "0.72", freq: "monthly" },
    { path: "/premium-unlock", priority: "0.68", freq: "monthly" },
    { path: "/points", priority: "0.66", freq: "monthly" },
    { path: "/insights", priority: "0.85", freq: "weekly" },
    { path: "/about", priority: "0.90", freq: "monthly" },
    { path: "/faq", priority: "0.88", freq: "monthly" },
    { path: "/login", priority: "0.50", freq: "monthly" },
    { path: "/signup", priority: "0.50", freq: "monthly" },
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ path, priority, freq }) => `  <url>
    <loc>${base}${path}</loc>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join("\n")}
</urlset>`;
}

function generateRobots() {
  return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://code-destiny.com/sitemap.xml`;
}

function normalizeOrigin(rawValue) {
  const value = String(rawValue || "").trim().replace(/\/+$/, "");
  if (!value) return "";

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function splitCsv(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getAllowedOrigins(env) {
  return new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...splitCsv(env.CORS_ORIGIN),
    normalizeOrigin(env.AUTH_FRONTEND_BASE_URL),
    normalizeOrigin(env.SITE_BASE_URL),
    normalizeOrigin(env.AUTH_URL),
  ].filter(Boolean));
}

function isAllowedOrigin(origin, env) {
  if (!origin) return true;

  const allowedOrigins = getAllowedOrigins(env);
  if (allowedOrigins.has(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    if (hostname === "code-destiny.com" || hostname.endsWith(".code-destiny.com")) return true;
    if (hostname.endsWith(".pages.dev")) return true;
  } catch {
    return false;
  }

  return false;
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = isAllowedOrigin(origin, env) ? (origin || "*") : "https://code-destiny.com";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers")
      || "Content-Type, Authorization, X-Admin-Token, X-Admin-Subscription-Tier",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(request, env, body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  for (const [key, value] of Object.entries(getCorsHeaders(request, env))) {
    headers.set(key, value);
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

function withCorsHeaders(request, env, response) {
  for (const [key, value] of Object.entries(getCorsHeaders(request, env))) {
    response.headers.set(key, value);
  }
  if (!response.headers.has("Cache-Control")) {
    response.headers.set("Cache-Control", "no-store");
  }
  return response;
}

function getUpstreamOrigin(env) {
  return normalizeOrigin(env.API_UPSTREAM_ORIGIN);
}

function isLoop(requestUrl, upstreamOrigin) {
  if (!upstreamOrigin) return false;

  try {
    const incoming = new URL(requestUrl);
    const upstream = new URL(upstreamOrigin);
    return incoming.protocol === upstream.protocol
      && incoming.hostname === upstream.hostname
      && incoming.port === upstream.port;
  } catch {
    return false;
  }
}

function isFrontendOrigin(upstreamOrigin, env) {
  const frontendOrigins = new Set([
    normalizeOrigin(env.AUTH_FRONTEND_BASE_URL),
    normalizeOrigin(env.SITE_BASE_URL),
    normalizeOrigin(env.AUTH_URL),
    "https://code-destiny.com",
    "https://www.code-destiny.com",
    "https://code-destiny.pages.dev",
    "https://codedestiny.pages.dev",
  ].filter(Boolean));

  return frontendOrigins.has(upstreamOrigin);
}

function copyRequestHeaders(request) {
  const headers = new Headers(request.headers);
  headers.delete("Host");
  headers.delete("Content-Length");
  headers.delete("CF-Connecting-IP");
  headers.delete("CF-IPCountry");
  headers.delete("CF-Ray");
  headers.delete("CF-Visitor");
  return headers;
}

function selectFrontendProxyOrigin(request, env) {
  const incomingOrigin = new URL(request.url).origin;
  const candidates = [
    normalizeOrigin(env.FRONTEND_PROXY_ORIGIN),
    normalizeOrigin(env.SITE_BASE_URL),
    normalizeOrigin(env.AUTH_FRONTEND_BASE_URL),
    "https://7dd8ce02.code-destiny.pages.dev",
    "https://code-destiny.pages.dev",
    "https://codedestiny.pages.dev",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate !== incomingOrigin) {
      return candidate;
    }
  }

  return "";
}

function copyProxyResponseHeaders(responseHeaders, request, env) {
  const headers = new Headers(responseHeaders);
  headers.delete("Content-Security-Policy");
  headers.delete("Content-Security-Policy-Report-Only");
  for (const [key, value] of Object.entries(getCorsHeaders(request, env))) {
    headers.set(key, value);
  }
  return headers;
}

async function proxyFrontendRequest(request, env) {
  const frontendOrigin = selectFrontendProxyOrigin(request, env);
  if (!frontendOrigin) {
    return jsonResponse(request, env, {
      ok: false,
      error: "frontend_proxy_origin_missing",
      message: "Set FRONTEND_PROXY_ORIGIN to your Cloudflare Pages domain.",
    }, { status: 503 });
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(frontendOrigin);
  targetUrl.pathname = incomingUrl.pathname;
  targetUrl.search = incomingUrl.search;

  const headers = copyRequestHeaders(request);
  headers.set("X-Forwarded-Host", incomingUrl.host);
  headers.set("X-Forwarded-Proto", incomingUrl.protocol.replace(":", ""));
  headers.set("X-Code-Destiny-Worker", "frontend-proxy");

  const method = request.method.toUpperCase();
  const init = {
    method,
    headers,
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = request.body;
  }

  try {
    const response = await fetch(targetUrl.toString(), init);
    const responseHeaders = copyProxyResponseHeaders(response.headers, request, env);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return jsonResponse(request, env, {
      ok: false,
      error: "frontend_proxy_failed",
      message: "Failed to reach frontend origin from Worker.",
      detail: String(error && error.message ? error.message : error),
      target: targetUrl.origin,
    }, { status: 502 });
  }
}

async function proxyApiRequest(request, env) {
  const upstreamOrigin = getUpstreamOrigin(env);
  if (!upstreamOrigin) {
    return jsonResponse(request, env, {
      ok: false,
      error: "api_upstream_missing",
      message: "Set API_UPSTREAM_ORIGIN on the Cloudflare Worker.",
    }, { status: 503 });
  }

  if (isLoop(request.url, upstreamOrigin)) {
    return jsonResponse(request, env, {
      ok: false,
      error: "api_upstream_loop",
      message: "The API upstream points back to this Worker. Use an external API origin.",
    }, { status: 500 });
  }

  if (isFrontendOrigin(upstreamOrigin, env)) {
    return jsonResponse(request, env, {
      ok: false,
      error: "api_upstream_points_to_frontend",
      message: "The API upstream points to the frontend. Set API_UPSTREAM_ORIGIN to the real external API origin.",
    }, { status: 500 });
  }

  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(upstreamOrigin);
  upstreamUrl.pathname = incomingUrl.pathname;
  upstreamUrl.search = incomingUrl.search;

  const headers = copyRequestHeaders(request);
  headers.set("X-Forwarded-Host", incomingUrl.host);
  headers.set("X-Forwarded-Proto", incomingUrl.protocol.replace(":", ""));
  headers.set("X-Code-Destiny-Worker", "api-gateway");

  const method = request.method.toUpperCase();
  const init = {
    method,
    headers,
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = request.body;
  }

  const response = await fetch(upstreamUrl.toString(), init);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("Cache-Control", "no-store");
  for (const [key, value] of Object.entries(getCorsHeaders(request, env))) {
    responseHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request, env),
      });
    }

    if (url.pathname === "/sitemap.xml") {
      return new Response(generateSitemap(), {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    if (url.pathname === "/robots.txt") {
      return new Response(generateRobots(), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    if (url.pathname === "/api/health") {
      const upstreamOrigin = getUpstreamOrigin(env);
      return jsonResponse(request, env, {
        ok: true,
        service: "code-destiny-api-worker",
        mode: "worker-native",
        nativeRoutes: ["auth", "payments", "fortune", "premium", "ziwei-book"],
        fallbackProxyMode: upstreamOrigin
          ? (isFrontendOrigin(upstreamOrigin, env) ? "misconfigured" : "enabled")
          : "disabled",
        upstreamConfigured: Boolean(upstreamOrigin),
        legacyMode:
          upstreamOrigin
            ? (isFrontendOrigin(upstreamOrigin, env) ? "misconfigured" : "proxy")
            : "not_configured",
      });
    }

    if (url.pathname === "/api/auth" || url.pathname.startsWith("/api/auth/")) {
      return withCorsHeaders(request, env, await handleAuthRoutes(request, env));
    }

    if (url.pathname === "/api/payments" || url.pathname.startsWith("/api/payments/")) {
      return withCorsHeaders(request, env, await handlePaymentRoutes(request, env));
    }

    if (url.pathname === "/api/fortune" || url.pathname.startsWith("/api/fortune/")) {
      return withCorsHeaders(request, env, await handleFortuneRoutes(request, env));
    }

    if (url.pathname === "/api/premium" || url.pathname.startsWith("/api/premium/")) {
      return withCorsHeaders(request, env, await handlePremiumRoutes(request, env));
    }

    if (url.pathname === "/api/ziwei-book" || url.pathname.startsWith("/api/ziwei-book/")) {
      return withCorsHeaders(request, env, await handleZiweiBookRoutes(request, env));
    }

    if (url.pathname.startsWith("/api/")) {
      return proxyApiRequest(request, env);
    }

    if (request.method === "GET" || request.method === "HEAD") {
      return proxyFrontendRequest(request, env);
    }

    return jsonResponse(request, env, {
      ok: false,
      error: "method_not_allowed",
      message: "Only GET/HEAD are supported for non-API routes.",
    }, { status: 405 });
  },
};
