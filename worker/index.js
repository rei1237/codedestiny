import { handleAuthRoutes } from "./routes/auth.js";
import { handleAdminRoutes } from "./routes/admin.js";
import { handleFortuneRoutes } from "./routes/fortune.js";
import { handleTarotRoutes } from "./routes/tarot.js";
import { handleCelestialHarmonyRoutes } from "./routes/celestial-harmony.js";
import { handleYoutubeRoutes } from "./routes/youtube.js";
import { handlePaymentRoutes } from "./routes/payments.js";
import {
  handleLifebookRoutes,
  handleLoveSecretRoutes,
  handlePremiumRoutes,
  handleZiweiBookRoutes,
} from "./routes/premium.js";
import { handleDreamRoutes } from "./routes/dream.js";
import { handleDebugRoutes } from "./routes/debug.js";
import { handleYogaGuruRoutes } from "./routes/yoga-guru.js";
import { handleSibylRoutes } from "./routes/sibyl.js";
import { handleOracleRoutes } from "./routes/oracle.js";
import { handleUserRoutes } from "./routes/user.js";
import { handleSubscriptionRoutes } from "./routes/subscriptions.js";
import { buildRuntimeKeyMatrix } from "./lib/key-health.js";
import { getEnv } from "./lib/env.js";

/**
 * Code Destiny API Worker.
 *
 * Backend-only runtime for /api/*.
 * Auth, payment, fortune, premium, lifebook, love-secret, and ziwei-book routes run natively.
 * API_UPSTREAM_ORIGIN remains optional as a fallback for unported API groups.
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
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
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

function resolveHealthBool(env, keys = []) {
  return keys.some((key) => Boolean(getEnv(env, key)));
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

function detectCountry(request) {
  const fromCf = String(request?.cf?.country || "").trim().toUpperCase();
  if (fromCf && fromCf !== "XX") return fromCf;

  const fromHeader = String(request.headers.get("CF-IPCountry") || "").trim().toUpperCase();
  if (fromHeader && fromHeader !== "XX") return fromHeader;

  return "KR";
}

function detectLocale(country) {
  const localeMap = {
    KR: "ko-KR",
    US: "en-US",
    GB: "en-GB",
    AU: "en-AU",
    CA: "en-CA",
    SG: "en-SG",
    PH: "en-PH",
    ZA: "en-ZA",
    IN: "hi-IN",
    JP: "ja-JP",
    CN: "zh-CN",
    TW: "zh-TW",
    ES: "es-ES",
    MX: "es-MX",
    CO: "es-CO",
    AR: "es-AR",
    PE: "es-PE",
    FR: "fr-FR",
    DE: "de-DE",
    IT: "it-IT",
    HU: "hu-HU",
    NL: "nl-NL",
    TH: "th-TH",
    VN: "vi-VN",
    MY: "ms-MY",
  };

  return localeMap[country] || "en-US";
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

async function proxyApiRequest(request, env) {
  const upstreamOrigin = getUpstreamOrigin(env);
  if (!upstreamOrigin) {
    const pathname = new URL(request.url).pathname;
    const isAdminPath = pathname.startsWith("/api/admin/") || pathname === "/api/admin";
    return jsonResponse(request, env, {
      ok: false,
      error: "api_upstream_missing",
      message: "Set API_UPSTREAM_ORIGIN on the Cloudflare Worker.",
      requiredKeys: ["API_UPSTREAM_ORIGIN"],
      impact: isAdminPath ? "미포팅 /api/admin/* 레거시 API" : "미포팅 /api/* 레거시 API",
      hint: isAdminPath
        ? "관리자 비밀번호 게이트는 /api/admin/entry/password 네이티브 지원됨. 그 외 admin API는 API_UPSTREAM_ORIGIN 필요."
        : "현재 네이티브 미포팅 API는 외부 upstream 설정이 필요합니다.",
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

    if (url.pathname === "/api/health") {
      const upstreamOrigin = getUpstreamOrigin(env);
      const keyMatrix = buildRuntimeKeyMatrix(env);
      const brokenFeatures = keyMatrix
        .filter((item) => !item.ok)
        .map((item) => item.feature);
      return jsonResponse(request, env, {
        ok: true,
        service: "code-destiny-api-worker",
        mode: "worker-native",
        backendOnly: true,
        nativeRoutes: ["auth", "admin", "payments", "fortune", "tarot", "youtube", "celestial-harmony", "premium", "ziwei-book", "lifebook", "love-secret", "dream", "yoga-guru", "sibyl", "oracle", "geo"],
        fallbackProxyMode: upstreamOrigin
          ? (isFrontendOrigin(upstreamOrigin, env) ? "misconfigured" : "enabled")
          : "disabled",
        upstreamConfigured: Boolean(upstreamOrigin),
        keyHealth: {
          ok: brokenFeatures.length === 0,
          brokenFeatures,
          checkEndpoint: "/api/admin/keys",
        },
        legacyMode:
          upstreamOrigin
            ? (isFrontendOrigin(upstreamOrigin, env) ? "misconfigured" : "proxy")
            : "not_configured",
      });
    }

    if (url.pathname === "/api/health/auth-env") {
      const mongoUriConfigured = resolveHealthBool(env, ["MONGO_URI", "MONGODB_URI"]);
      const mongoDbNameConfigured = resolveHealthBool(env, ["MONGO_DB_NAME", "MONGO_NAME", "MONGODB_DB_NAME"]);
      const jwtSecretConfigured = resolveHealthBool(env, ["JWT_SECRET", "AUTH_SECRET"]);

      return jsonResponse(request, env, {
        ok: true,
        service: "code-destiny-api-worker",
        authEnv: {
          mongoUriConfigured,
          mongoDbNameConfigured,
          jwtSecretConfigured,
        },
      });
    }

    if (url.pathname === "/api/geo") {
      const country = detectCountry(request);
      return jsonResponse(request, env, {
        ok: true,
        country,
        locale: detectLocale(country),
      });
    }

    if (url.pathname === "/api/auth" || url.pathname.startsWith("/api/auth/")) {
      return withCorsHeaders(request, env, await handleAuthRoutes(request, env));
    }

    if (url.pathname === "/api/admin" || url.pathname.startsWith("/api/admin/")) {
      return withCorsHeaders(request, env, await handleAdminRoutes(request, env));
    }

    if (url.pathname === "/api/payments" || url.pathname.startsWith("/api/payments/")) {
      return withCorsHeaders(request, env, await handlePaymentRoutes(request, env));
    }

    if (url.pathname === "/api/fortune" || url.pathname.startsWith("/api/fortune/")) {
      return withCorsHeaders(request, env, await handleFortuneRoutes(request, env));
    }

    if (url.pathname === "/api/tarot" || url.pathname.startsWith("/api/tarot/")) {
      return withCorsHeaders(request, env, await handleTarotRoutes(request, env));
    }

    if (url.pathname === "/api/youtube" || url.pathname.startsWith("/api/youtube/")) {
      return withCorsHeaders(request, env, await handleYoutubeRoutes(request, env));
    }

    if (url.pathname === "/api/celestial-harmony" || url.pathname.startsWith("/api/celestial-harmony/")) {
      return withCorsHeaders(request, env, await handleCelestialHarmonyRoutes(request, env));
    }

    if (url.pathname === "/api/premium" || url.pathname.startsWith("/api/premium/")) {
      return withCorsHeaders(request, env, await handlePremiumRoutes(request, env));
    }

    if (url.pathname === "/api/ziwei-book" || url.pathname.startsWith("/api/ziwei-book/")) {
      return withCorsHeaders(request, env, await handleZiweiBookRoutes(request, env));
    }

    if (url.pathname === "/api/lifebook" || url.pathname.startsWith("/api/lifebook/")) {
      return withCorsHeaders(request, env, await handleLifebookRoutes(request, env));
    }

    if (url.pathname === "/api/love-secret" || url.pathname.startsWith("/api/love-secret/")) {
      return withCorsHeaders(request, env, await handleLoveSecretRoutes(request, env));
    }

    if (url.pathname === "/api/dream" || url.pathname.startsWith("/api/dream/")) {
      return withCorsHeaders(request, env, await handleDreamRoutes(request, env));
    }

    if (url.pathname === "/api/yoga-guru" || url.pathname.startsWith("/api/yoga-guru/")) {
      return withCorsHeaders(request, env, await handleYogaGuruRoutes(request, env));
    }

    if (url.pathname === "/api/sibyl" || url.pathname.startsWith("/api/sibyl/")) {
      return withCorsHeaders(request, env, await handleSibylRoutes(request, env));
    }

    if (url.pathname === "/api/oracle" || url.pathname.startsWith("/api/oracle/")) {
      return withCorsHeaders(request, env, await handleOracleRoutes(request, env));
    }

    if (url.pathname === "/api/debug" || url.pathname.startsWith("/api/debug/")) {
      return withCorsHeaders(request, env, await handleDebugRoutes(request, env));
    }

    if (url.pathname === "/api/user" || url.pathname.startsWith("/api/user/")) {
      return withCorsHeaders(request, env, await handleUserRoutes(request, env));
    }

    if (url.pathname === "/api/subscriptions" || url.pathname.startsWith("/api/subscriptions/")) {
      return withCorsHeaders(request, env, await handleSubscriptionRoutes(request, env));
    }

    if (url.pathname.startsWith("/api/")) {
      return proxyApiRequest(request, env);
    }

    return jsonResponse(request, env, {
      ok: false,
      error: "backend_only",
      message: "This Worker only serves backend API routes under /api/*.",
    }, { status: 404, headers: { "X-CF-Worker-Error": "backend_only" } });
  },

  async scheduled(event, env, ctx) {
    const { runDailyFortuneTask } = await import("./lib/daily-fortune-task.js");
    ctx.waitUntil(runDailyFortuneTask(env));
  },
};
