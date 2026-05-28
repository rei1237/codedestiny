import { handleAuthRoutes } from "./routes/auth.js";
import { handleAdminRoutes } from "./routes/admin.js";
import { handleFortuneRoutes } from "./routes/fortune.js";
import { handleTarotRoutes } from "./routes/tarot.js";
import { handleCelestialHarmonyRoutes } from "./routes/celestial-harmony.js";
import { handleYoutubeRoutes } from "./routes/youtube.js";
import { handlePaymentRoutes } from "./routes/payments.js";
import { handleSajuLifebookRoutes } from "./routes/saju-lifebook.js";
import { handleSajuLoveSecretRoutes } from "./routes/saju-love-secret.js";
import { handleDreamRoutes } from "./routes/dream.js";
import { handleDebugRoutes } from "./routes/debug.js";
import { handleYogaGuruRoutes } from "./routes/yoga-guru.js";
import { handleSibylRoutes } from "./routes/sibyl.js";
import { handleOracleRoutes } from "./routes/oracle.js";
import { handleKasiRoutes } from "./routes/kasi.js";
import { handleUserRoutes } from "./routes/user.js";
import { handleProfileRoutes } from "./routes/profile.js";
import { handleSubscriptionRoutes } from "./routes/subscriptions.js";
import { handleAstroRoutes } from "./routes/astro.js";
import { handleInsightsRoutes } from "./routes/insights.js";
import { handleContentRoutes } from "./routes/content.js";
import { handlePalmRoutes } from "./routes/palm.js";
import { handleDestinyBiasRoutes } from "./routes/destiny-bias.js";
import { handleBillingRoutes } from "./routes/billing.js";
import { handleFptiRoutes } from "./routes/fpti.js";
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

const NO_CACHE_CONTROL = "no-store, no-cache, must-revalidate";

function applyNoCacheHeaders(headers) {
  headers.set("Cache-Control", NO_CACHE_CONTROL);
  headers.set("Pragma", "no-cache");
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
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  } catch {
    return false;
  }

  return false;
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const fallbackOrigin = normalizeOrigin(env.AUTH_FRONTEND_BASE_URL)
    || normalizeOrigin(env.SITE_BASE_URL)
    || normalizeOrigin(env.AUTH_URL)
    || "https://code-destiny.com";
  const allowOrigin = origin && isAllowedOrigin(origin, env) ? origin : fallbackOrigin;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
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
  applyNoCacheHeaders(headers);
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

function buildVersionPayload(env) {
  const commit = String(
    getEnv(env, "COMMIT_SHA")
    || getEnv(env, "CF_PAGES_COMMIT_SHA")
    || getEnv(env, "GITHUB_SHA")
    || getEnv(env, "VERCEL_GIT_COMMIT_SHA")
    || "",
  ).trim();
  const commitShort = commit ? commit.slice(0, 12) : "";
  const branch = String(
    getEnv(env, "BRANCH")
    || getEnv(env, "CF_PAGES_BRANCH")
    || getEnv(env, "GITHUB_REF_NAME")
    || getEnv(env, "VERCEL_GIT_COMMIT_REF")
    || "main",
  ).trim();
  const builtAt = String(
    getEnv(env, "BUILT_AT")
    || getEnv(env, "BUILD_TIME")
    || getEnv(env, "DEPLOY_TIME")
    || "",
  ).trim() || null;
  const source = String(getEnv(env, "DEPLOY_SOURCE") || "worker-native").trim() || "worker-native";
  const environment = String(getEnv(env, "NODE_ENV") || getEnv(env, "APP_ENV") || "production").trim() || "production";
  const deploymentMode = String(getEnv(env, "DEPLOYMENT_MODE") || "manual-pages-only").trim() || "manual-pages-only";
  const appVersion = String(
    getEnv(env, "APP_VERSION")
    || getEnv(env, "BUILD_ID")
    || commitShort
    || "unknown",
  ).trim() || "unknown";

  return {
    ok: true,
    appVersion,
    gitSha: commit || null,
    buildTime: builtAt,
    environment,
    source,
    commit: commit || null,
    commitShort: commitShort || null,
    branch,
    builtAt,
    deploymentMode,
  };
}

function stackSnippet(error) {
  const stack = String(error?.stack || "");
  if (!stack) return "";
  return stack
    .split("\n")
    .slice(0, 4)
    .map((line) => line.trim())
    .join(" | ")
    .slice(0, 600);
}

function parseProviderFromPath(pathname = "") {
  const match = String(pathname).match(/\/api\/auth\/oauth\/([^/]+)\//i);
  return match ? String(match[1] || "").toLowerCase() : "";
}

function getWorkerEnvPresence(env) {
  return {
    hasAuthSecret: Boolean(getEnv(env, "AUTH_SECRET") || getEnv(env, "NEXTAUTH_SECRET")),
    hasJwtSecret: Boolean(getEnv(env, "JWT_SECRET") || getEnv(env, "NEXTAUTH_SECRET")),
    hasAuthUrl: Boolean(getEnv(env, "AUTH_URL") || getEnv(env, "NEXTAUTH_URL")),
    hasAuthApiBaseUrl: Boolean(getEnv(env, "AUTH_API_BASE_URL")),
    hasAuthTrustHost: Boolean(getEnv(env, "AUTH_TRUST_HOST") || getEnv(env, "NEXTAUTH_TRUST_HOST")),
    hasGoogleClientId: Boolean(getEnv(env, "GOOGLE_OAUTH_CLIENT_ID") || getEnv(env, "GOOGLE_CLIENT_ID")),
    hasGoogleClientSecret: Boolean(getEnv(env, "GOOGLE_OAUTH_CLIENT_SECRET") || getEnv(env, "GOOGLE_CLIENT_SECRET")),
    hasMongoUri: Boolean(getEnv(env, "MONGO_URI") || getEnv(env, "MONGODB_URI")),
  };
}

function logWorkerUnhandledError(request, env, error) {
  let pathname = "";
  let host = "";

  try {
    const parsed = new URL(request.url);
    pathname = parsed.pathname || "";
    host = parsed.host || "";
  } catch {
    // ignore parse failure
  }

  const payload = {
    routePath: pathname || "unknown",
    provider: parseProviderFromPath(pathname),
    requestHost: host,
    errorName: String(error?.name || "Error"),
    errorMessage: String(error?.message || "Internal server error").slice(0, 300),
    stackSnippet: stackSnippet(error),
    env: getWorkerEnvPresence(env),
  };

  try {
    console.error("[worker-unhandled]", JSON.stringify(payload));
  } catch {
    console.error("[worker-unhandled]", payload);
  }
}

function withCorsHeaders(request, env, response) {
  for (const [key, value] of Object.entries(getCorsHeaders(request, env))) {
    response.headers.set(key, value);
  }
  if (!response.headers.has("Cache-Control")) applyNoCacheHeaders(response.headers);
  if (!response.headers.has("Pragma")) response.headers.set("Pragma", "no-cache");
  return response;
}

function rewriteRequestPath(request, nextPathname) {
  const rewrittenUrl = new URL(request.url);
  rewrittenUrl.pathname = nextPathname;
  return new Request(rewrittenUrl.toString(), request);
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
  applyNoCacheHeaders(responseHeaders);
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
  async fetch(request, env, ctx) {
    try {
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
          nativeRoutes: ["auth", "admin", "payments", "fortune", "tarot", "youtube", "celestial-harmony", "premium", "ziwei-book", "lifebook", "love-secret", "dream", "yoga-guru", "sibyl", "oracle", "kasi", "astro", "vedic", "palm", "destiny-bias", "geo"],
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
        const jwtSecretConfigured = resolveHealthBool(env, ["JWT_SECRET", "AUTH_SECRET", "NEXTAUTH_SECRET"]);

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

      if (url.pathname === "/api/version") {
        return jsonResponse(request, env, buildVersionPayload(env));
      }

      // Legacy compatibility: 일부 런타임이 /api/status 상태 체크를 사용한다.
      if (url.pathname === "/api/status") {
        const version = buildVersionPayload(env);
        const upstreamOrigin = getUpstreamOrigin(env);
        return jsonResponse(request, env, {
          ...version,
          service: "code-destiny-api-worker",
          mode: "worker-native",
          backendOnly: true,
          buildSource: version.source,
          upstreamConfigured: Boolean(upstreamOrigin),
          status: "ok",
        });
      }

      if (url.pathname === "/api/auth" || url.pathname.startsWith("/api/auth/")) {
        return withCorsHeaders(request, env, await handleAuthRoutes(request, env));
      }

      if (url.pathname === "/api/session") {
        const rewrittenRequest = rewriteRequestPath(request, "/api/auth/session");
        return withCorsHeaders(request, env, await handleAuthRoutes(rewrittenRequest, env));
      }

      if (url.pathname === "/api/admin" || url.pathname.startsWith("/api/admin/")) {
        return withCorsHeaders(request, env, await handleAdminRoutes(request, env));
      }

      if (url.pathname === "/api/insights" || url.pathname.startsWith("/api/insights/")) {
        return withCorsHeaders(request, env, await handleInsightsRoutes(request, env));
      }

      if (url.pathname === "/api/content" || url.pathname.startsWith("/api/content/")) {
        return withCorsHeaders(request, env, await handleContentRoutes(request, env));
      }

      if (url.pathname === "/api/palm" || url.pathname.startsWith("/api/palm/")) {
        return withCorsHeaders(request, env, await handlePalmRoutes(request, env));
      }

      if (url.pathname === "/api/destiny-bias" || url.pathname.startsWith("/api/destiny-bias/")) {
        return withCorsHeaders(request, env, await handleDestinyBiasRoutes(request, env));
      }

      if (url.pathname === "/api/payments" || url.pathname.startsWith("/api/payments/")) {
        return withCorsHeaders(request, env, await handlePaymentRoutes(request, env));
      }

      if (url.pathname === "/api/billing" || url.pathname.startsWith("/api/billing/")) {
        return withCorsHeaders(request, env, await handleBillingRoutes(request, env));
      }

      // Legacy compatibility: singular payment namespace.
      if (url.pathname === "/api/payment" || url.pathname.startsWith("/api/payment/")) {
        const rewrittenRequest = rewriteRequestPath(request, url.pathname.replace("/api/payment", "/api/payments"));
        return withCorsHeaders(request, env, await handlePaymentRoutes(rewrittenRequest, env));
      }

      // Legacy compatibility: checkout namespace mapped to payments handlers.
      if (url.pathname === "/api/checkout" || url.pathname.startsWith("/api/checkout/")) {
        const rewrittenRequest = rewriteRequestPath(request, url.pathname.replace("/api/checkout", "/api/payments"));
        return withCorsHeaders(request, env, await handlePaymentRoutes(rewrittenRequest, env));
      }

      if (url.pathname === "/api/points/me") {
        const rewrittenRequest = rewriteRequestPath(request, "/api/payments/points/me");
        return withCorsHeaders(request, env, await handlePaymentRoutes(rewrittenRequest, env));
      }

      // Legacy compatibility: old clients may still request /api/points/balance.
      if (url.pathname === "/api/points/balance") {
        const rewrittenRequest = rewriteRequestPath(request, "/api/payments/points/me");
        return withCorsHeaders(request, env, await handlePaymentRoutes(rewrittenRequest, env));
      }

      if (url.pathname === "/api/fortune" || url.pathname.startsWith("/api/fortune/")) {
        return withCorsHeaders(request, env, await handleFortuneRoutes(request, env));
      }

      if (url.pathname === "/api/fpti" || url.pathname.startsWith("/api/fpti/")) {
        return withCorsHeaders(request, env, await handleFptiRoutes(request, env));
      }

      if (url.pathname === "/api/subscription/status") {
        const rewrittenRequest = rewriteRequestPath(request, "/api/fortune/pig-coin/profile-subscription/status");
        return withCorsHeaders(request, env, await handleFortuneRoutes(rewrittenRequest, env));
      }

      if (url.pathname === "/api/subscription/me") {
        const rewrittenRequest = rewriteRequestPath(request, "/api/fortune/pig-coin/profile-subscription/status");
        return withCorsHeaders(request, env, await handleFortuneRoutes(rewrittenRequest, env));
      }

      // Legacy compatibility: singular endpoint used by older destiny-profile bundles.
      if (url.pathname === "/api/user/destiny-profile") {
        const rewrittenRequest = rewriteRequestPath(request, "/api/user/destiny-profiles");
        return withCorsHeaders(request, env, await handleUserRoutes(rewrittenRequest, env));
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

      if (
        (url.pathname === "/api/premium" || url.pathname.startsWith("/api/premium/"))
        && !(
          url.pathname === "/api/premium/saju/life-book"
          || url.pathname.startsWith("/api/premium/saju/life-book/")
          || url.pathname === "/api/premium/saju-lifebook"
          || url.pathname.startsWith("/api/premium/saju-lifebook/")
        )
      ) {
        return jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "프리미엄 통합 PDF 엔드포인트는 제거되었습니다. 인생의 책은 /api/lifebook/* 경로를 사용하세요.",
          supported: ["/api/lifebook", "/api/lifebook/prepare"],
        }, { status: 410 });
      }

      if (url.pathname === "/api/premium-report" || url.pathname.startsWith("/api/premium-report/")) {
        return jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "premium-report 엔드포인트는 제거되었습니다. 인생의 책은 /api/lifebook/* 경로를 사용하세요.",
          supported: ["/api/lifebook", "/api/lifebook/prepare"],
        }, { status: 410 });
      }

      if (url.pathname === "/api/ziwei-book" || url.pathname.startsWith("/api/ziwei-book/")) {
        return jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "ziwei-book PDF 엔드포인트는 제거되었습니다.",
        }, { status: 410 });
      }

      if (url.pathname === "/api/ziwei" || url.pathname.startsWith("/api/ziwei/")) {
        return jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "ziwei PDF 엔드포인트는 제거되었습니다.",
        }, { status: 410 });
      }

      if (
        url.pathname === "/api/lifebook"
        || url.pathname.startsWith("/api/lifebook/")
        || url.pathname === "/api/premium/saju-lifebook"
        || url.pathname.startsWith("/api/premium/saju-lifebook/")
        || url.pathname === "/api/premium/saju/life-book"
        || url.pathname.startsWith("/api/premium/saju/life-book/")
      ) {
        let routedRequest = request;
        if (url.pathname === "/api/lifebook" || url.pathname.startsWith("/api/lifebook/")) {
          const suffix = url.pathname.slice("/api/lifebook".length);
          routedRequest = rewriteRequestPath(request, "/api/premium/saju-lifebook" + (suffix || ""));
        } else if (url.pathname === "/api/premium/saju/life-book" || url.pathname.startsWith("/api/premium/saju/life-book/")) {
          const suffix = url.pathname.slice("/api/premium/saju/life-book".length);
          routedRequest = rewriteRequestPath(request, "/api/premium/saju-lifebook" + (suffix || ""));
        }
        return withCorsHeaders(request, env, await handleSajuLifebookRoutes(routedRequest, env));
      }

      if (url.pathname === "/api/love-secret" || url.pathname.startsWith("/api/love-secret/")) {
        return withCorsHeaders(request, env, await handleSajuLoveSecretRoutes(request, env, ctx));
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

      if (url.pathname === "/api/kasi" || url.pathname.startsWith("/api/kasi/")) {
        return withCorsHeaders(request, env, await handleKasiRoutes(request, env));
      }

      if (
        url.pathname === "/api/astro/generate-chapter"
        || url.pathname === "/api/astro/session"
        || url.pathname === "/api/astro/generate"
      ) {
        return jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "astro premium PDF 엔드포인트는 제거되었습니다.",
        }, { status: 410 });
      }

      if (
        url.pathname === "/api/vedic/generate-chapter"
        || url.pathname === "/api/vedic/session"
        || url.pathname === "/api/vedic/generate"
      ) {
        return jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "vedic premium PDF 엔드포인트는 제거되었습니다.",
        }, { status: 410 });
      }

      if (
        url.pathname === "/api/sukuyo"
        || url.pathname.startsWith("/api/sukuyo/")
      ) {
        return jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "sukuyo premium PDF 엔드포인트는 제거되었습니다.",
        }, { status: 410 });
      }

      if (url.pathname === "/api/astro" || url.pathname.startsWith("/api/astro/")) {
        return withCorsHeaders(request, env, await handleAstroRoutes(request, env));
      }

      if (url.pathname === "/api/vedic" || url.pathname.startsWith("/api/vedic/")) {
        return withCorsHeaders(request, env, await handleAstroRoutes(request, env));
      }

      if (url.pathname === "/api/debug" || url.pathname.startsWith("/api/debug/")) {
        return withCorsHeaders(request, env, await handleDebugRoutes(request, env));
      }

      if (url.pathname === "/api/user" || url.pathname.startsWith("/api/user/")) {
        return withCorsHeaders(request, env, await handleUserRoutes(request, env));
      }

      if (url.pathname === "/api/profile" || url.pathname.startsWith("/api/profile/")) {
        return withCorsHeaders(request, env, await handleProfileRoutes(request, env));
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
    } catch (error) {
      logWorkerUnhandledError(request, env, error);
      return jsonResponse(request, env, {
        ok: false,
        error: "worker_unhandled_exception",
        message: "Authentication service error. Please retry login.",
      }, {
        status: 500,
        headers: {
          "X-CF-Worker-Error": "worker_unhandled_exception",
        },
      });
    }
  },

  async scheduled(event, env, ctx) {
    const { runDailyFortuneTask } = await import("./lib/daily-fortune-task.js");
    const { runCardSubscriptionBillingTask } = await import("./lib/subscription-billing-task.js");
    const { runServiceExecutionTimeoutTask } = await import("./lib/service-execution-task.js");
    ctx.waitUntil(Promise.all([
      runDailyFortuneTask(env),
      runCardSubscriptionBillingTask(env),
      runServiceExecutionTimeoutTask(env),
    ]));
  },
};
