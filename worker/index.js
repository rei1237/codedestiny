import { getEnv } from "./lib/env.js";

const ROUTE_METRICS_STATE = {
  byRoute: Object.create(null),
  total: 0,
};

const ROUTE_METRIC_FLUSH_EVERY = 500;
const PEXELS_IMAGE_ROUTE_CACHE = new Map();
const PEXELS_SECTION_IMAGES = {
  saju: "/fuctionassets/saju.webp",
  tarot: "/fuctionassets/tarolove.webp",
  astrology: "/fuctionassets/jumsung.webp",
  ziwei: "/fuctionassets/jami.webp",
  sukuyo: "/fuctionassets/sukyo.webp",
  vedic: "/fuctionassets/veda.webp",
  dream: "/fuctionassets/heamong.webp",
  famous: "/fuctionassets/placeholder.webp",
  career: "/fuctionassets/placeholder.webp",
  love: "/fuctionassets/flower4.webp",
  wealth: "/fuctionassets/placeholder.webp",
  health: "/fuctionassets/meditation.webp",
  default: "/fuctionassets/premiumstar.webp",
};

const PEXELS_SECTION_QUERIES = {
  saju: { query: "mystical astrology stars cosmic sky five elements", fallbackAlt: "별의 기운이 맴도는 사주 에너지" },
  tarot: { query: "mystic tarot cards stars nebula night sky", fallbackAlt: "카드 속 별빛으로 열리는 이야기" },
  astrology: { query: "astrology zodiac stars cosmic night sky", fallbackAlt: "천체 리듬이 스미는 점성의 하늘" },
  ziwei: { query: "purple galaxy stars cosmic astrology chart", fallbackAlt: "북두칠성의 기운이 흘러드는 자리" },
  sukuyo: { query: "moon stars mystical night sky constellation", fallbackAlt: "달빛과 별빛이 가는 길" },
  vedic: { query: "vedic astrology stars cosmic temple night", fallbackAlt: "밤하늘과 신성한 별자리의 흔적" },
  dream: { query: "dreamy moon stars mystical fog night sky", fallbackAlt: "꿈결처럼 피어오르는 운명의 시야" },
  famous: { query: "mystical cosmic portrait silhouette stars", fallbackAlt: "별빛에 둘러싸인 명인의 초상" },
  career: { query: "cosmic stage spotlight stars destiny", fallbackAlt: "무대 위 빛으로 비추는 운명" },
  love: { query: "mystical stars soft light cosmic love", fallbackAlt: "연결되는 마음의 별빛" },
  wealth: { query: "gold stars cosmic abundance mystical", fallbackAlt: "깃발처럼 반짝이는 풍요의 별빛" },
  health: { query: "meditation stars cosmic calm night", fallbackAlt: "고요한 별빛 아래의 치유" },
  default: { query: "mystical cosmos stars nebula night sky", fallbackAlt: "별빛의 정기가 어우러지는 순간" },
};

const PEXELS_IMAGE_ROUTE_SECTIONS = new Set(Object.keys(PEXELS_SECTION_IMAGES));
const PEXELS_IMAGE_ROUTE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PEXELS_KEYWORDS_RE = /(cosmic|cosmos|star|stars|nebula|galaxy|moon|mystic|mystical|astrology|zodiac)/i;

function getPexelsSection(value) {
  const key = String(value || "default").trim().toLowerCase();
  return PEXELS_IMAGE_ROUTE_SECTIONS.has(key) ? key : "default";
}

function getPexelsApiKey(env) {
  return String(
    env?.PEXELS_API_KEY
    || env?.NEXT_PUBLIC_PEXELS_API_KEY
    || env?.REACT_APP_PEXELS_API_KEY
    || env?.VITE_PEXELS_API_KEY
    || env?.PEXELS_APIKEY
    || env?.PEXES_APIKEY
    || "",
  ).trim();
}

function getPexelsFailureStatus(status) {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "server-error";
  return "empty";
}

function normalizePexelsQuery(rawQuery, section) {
  const query = String(rawQuery || "").trim();
  if (!query) return PEXELS_SECTION_QUERIES[section].query;
  if (/[\uac00-\ud7a3]/.test(query)) return PEXELS_SECTION_QUERIES[section].query;
  if (!PEXELS_KEYWORDS_RE.test(query)) return `${query} cosmic stars mystical`;
  return query;
}

async function handlePexelsImageRequest(request, env) {
  const url = new URL(request.url);
  const section = getPexelsSection(url.searchParams.get("section"));
  const normalizedQuery = normalizePexelsQuery(url.searchParams.get("query"), section);
  const fallbackMeta = PEXELS_SECTION_QUERIES[section] || PEXELS_SECTION_QUERIES.default;
  const fallback = {
    src: PEXELS_SECTION_IMAGES[section] || PEXELS_SECTION_IMAGES.default,
    alt: fallbackMeta.fallbackAlt || `${normalizedQuery}의 별빛 장면`,
    source: "fallback",
  };
  const cacheKey = `${section}:${normalizedQuery}`;
  const cached = PEXELS_IMAGE_ROUTE_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return jsonResponse(request, env, cached.image);
  }

  const apiKey = getPexelsApiKey(env);
  if (!apiKey) {
    return jsonResponse(request, env, { ...fallback, status: "missing-key" });
  }

  try {
    const pexelsUrl = new URL("https://api.pexels.com/v1/search");
    pexelsUrl.searchParams.set("query", normalizedQuery);
    pexelsUrl.searchParams.set("per_page", "8");
    pexelsUrl.searchParams.set("orientation", "landscape");
    pexelsUrl.searchParams.set("size", "large");
    pexelsUrl.searchParams.set("locale", "en-US");

    const response = await fetch(pexelsUrl, {
      headers: { Authorization: apiKey },
    });
    if (!response.ok) {
      return jsonResponse(request, env, { ...fallback, status: getPexelsFailureStatus(response.status) });
    }

    const payload = await response.json().catch(() => null);
    const photos = Array.isArray(payload?.photos) ? payload.photos : [];
    const photo = photos.find((item) => item?.src?.landscape || item?.src?.large2x || item?.src?.large || item?.src?.medium);
    const src = photo?.src?.landscape || photo?.src?.large2x || photo?.src?.large || photo?.src?.medium;
    if (!src) {
      return jsonResponse(request, env, { ...fallback, status: "empty" });
    }

    const image = {
      src,
      alt: photo?.alt || fallback.alt,
      credit: photo?.photographer || null,
      creditUrl: photo?.photographer_url || photo?.url || null,
      source: "pexels",
      status: "ok",
    };
    PEXELS_IMAGE_ROUTE_CACHE.set(cacheKey, {
      expiresAt: Date.now() + PEXELS_IMAGE_ROUTE_CACHE_TTL_MS,
      image,
    });
    return jsonResponse(request, env, image);
  } catch {
    return jsonResponse(request, env, { ...fallback, status: "network-error" });
  }
}

const RUNTIME_KEY_MATRIX_CACHE_TTL_MS = 30000;
const RUNTIME_KEY_MATRIX_CACHE = {
  expiresAt: 0,
  value: null,
};

let runtimeKeyMatrixModulePromise = null;

function isTruthyLike(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes";
}

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function shouldCollectRouteMetrics(env) {
  if (!env) return false;
  return isTruthyLike(getEnv(env, "WORKER_ROUTE_METRICS")) || isTruthyLike(getEnv(env, "WORKER_ROUTE_TRACE"));
}

function recordRouteMetrics(routeName, durationMs, statusCode = 200, errored = false) {
  const target = String(routeName || "unknown").trim() || "unknown";
  const normalizedCode = Number.isFinite(Number(statusCode)) ? Number(statusCode) : 500;
  const stats = ROUTE_METRICS_STATE.byRoute[target] || {
    count: 0,
    totalMs: 0,
    minMs: Infinity,
    maxMs: 0,
    errors: 0,
    lastMs: 0,
  };
  const rawMs = Number(durationMs);
  const ms = Number.isFinite(rawMs) ? Math.max(0, rawMs) : 0;

  stats.count += 1;
  stats.totalMs += ms;
  stats.lastMs = ms;
  if (ms < stats.minMs) stats.minMs = ms;
  if (ms > stats.maxMs) stats.maxMs = ms;
  if (errored || normalizedCode >= 500) stats.errors += 1;

  ROUTE_METRICS_STATE.byRoute[target] = stats;
  ROUTE_METRICS_STATE.total += 1;

  if (!ROUTE_METRICS_STATE.lastFlushAt) ROUTE_METRICS_STATE.lastFlushAt = 0;
  if ((ROUTE_METRICS_STATE.total % ROUTE_METRIC_FLUSH_EVERY) === 0) {
    const now = Date.now();
    if (now - ROUTE_METRICS_STATE.lastFlushAt >= 30000) {
      ROUTE_METRICS_STATE.lastFlushAt = now;
      console.log("[worker-route-metrics]", JSON.stringify({
        totalRequests: ROUTE_METRICS_STATE.total,
        activeRoutes: Object.keys(ROUTE_METRICS_STATE.byRoute).length,
      }));
    }
  }
}

async function runWithRouteMetrics(routeName, env, task, metricsEnabled = shouldCollectRouteMetrics(env)) {
  if (!metricsEnabled) {
    return task();
  }

  const startedAt = nowMs();
  let statusCode = 200;
  let errored = false;

  try {
    const response = await task();
    statusCode = Number(response?.status) || 200;
    return response;
  } catch (error) {
    errored = true;
    statusCode = 500;
    throw error;
  } finally {
    recordRouteMetrics(routeName, nowMs() - startedAt, statusCode, errored);
  }
}

function normalizeRouteMetricBuckets() {
  const buckets = Object.entries(ROUTE_METRICS_STATE.byRoute).map(([route, metric]) => {
    const count = Number(metric?.count || 0);
    const totalMs = Number(metric?.totalMs || 0);
    return {
      route,
      count,
      errors: Number(metric?.errors || 0),
      avgMs: count > 0 ? Math.round(totalMs / count * 100) / 100 : 0,
      minMs: Number.isFinite(Number(metric?.minMs)) ? Number(metric?.minMs) : 0,
      maxMs: Number(metric?.maxMs || 0),
      lastMs: Number(metric?.lastMs || 0),
    };
  });

  buckets.sort((a, b) => b.count - a.count || b.avgMs - a.avgMs);
  return {
    total: ROUTE_METRICS_STATE.total,
    routes: buckets,
  };
}

function normalizeRouteMetricName(routeName) {
  const normalized = String(routeName || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "");
  if (!normalized) return "";
  return normalized.startsWith("api/") ? normalized : `api/${normalized}`;
}

function routeMetricNameFromModulePath(modulePath) {
  const fileName = String(modulePath || "")
    .split("/")
    .pop()
    .replace(/\.js$/i, "")
    .trim()
    .toLowerCase();
  if (!fileName) return "";
  return normalizeRouteMetricName(fileName);
}

function routeMetricNameFromExportName(exportName) {
  const raw = String(exportName || "").replace(/^handle/, "").replace(/Routes?$/, "");
  if (!raw) return "";
  return normalizeRouteMetricName(
    raw.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
  );
}

function hasRouteMetricsToken(request, env) {
  const token = String(getEnv(env, "WORKER_ROUTE_METRICS_TOKEN") || "").trim();
  if (!token) return true;

  const headerToken = request.headers.get("x-cd-route-metrics-token") || "";
  const bearer = request.headers.get("authorization") || "";
  const bearerToken = bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : "";
  return headerToken === token || bearerToken === token;
}

function createLazyRouteHandler(modulePath, loadModule, exportName, routeNameOverride) {
  let modulePromise = null;
  const metricRouteName = normalizeRouteMetricName(
    routeNameOverride || routeMetricNameFromModulePath(modulePath) || routeMetricNameFromExportName(exportName),
  );

  return async (...args) => {
    const env = args[1] || {};

    if (!modulePromise) {
      modulePromise = loadModule().catch((error) => {
        modulePromise = null;
        throw error;
      });
    }

    const executeHandler = async () => {
      const moduleExports = await modulePromise;
      const handler = moduleExports?.[exportName];
      if (typeof handler !== "function") {
        throw new Error(`[worker-route-loader] Missing handler ${exportName} in ${modulePath}`);
      }
      return handler(...args);
    };

    const metricsEnabled = shouldCollectRouteMetrics(env);
    if (!metricsEnabled) {
      return executeHandler();
    }

    return runWithRouteMetrics(metricRouteName, env, executeHandler, metricsEnabled);
  };
}

const handleAuthRoutes = createLazyRouteHandler("./routes/auth.js", () => import("./routes/auth.js"), "handleAuthRoutes");
const handleAdminRoutes = createLazyRouteHandler("./routes/admin.js", () => import("./routes/admin.js"), "handleAdminRoutes");
const handleFortuneRoutes = createLazyRouteHandler("./routes/fortune.js", () => import("./routes/fortune.js"), "handleFortuneRoutes");
const handleTarotRoutes = createLazyRouteHandler("./routes/tarot.js", () => import("./routes/tarot.js"), "handleTarotRoutes");
const handleCelestialHarmonyRoutes = createLazyRouteHandler("./routes/celestial-harmony.js", () => import("./routes/celestial-harmony.js"), "handleCelestialHarmonyRoutes");
const handleYoutubeRoutes = createLazyRouteHandler("./routes/youtube.js", () => import("./routes/youtube.js"), "handleYoutubeRoutes");
const handlePaymentRoutes = createLazyRouteHandler("./routes/payments.js", () => import("./routes/payments.js"), "handlePaymentRoutes", "payments");
const handleSajuLifebookRoutes = createLazyRouteHandler("./routes/saju-lifebook.js", () => import("./routes/saju-lifebook.js"), "handleSajuLifebookRoutes");
const handleSajuLoveSecretRoutes = createLazyRouteHandler("./routes/saju-love-secret.js", () => import("./routes/saju-love-secret.js"), "handleSajuLoveSecretRoutes");
const handleSajuNewYearRoutes = createLazyRouteHandler("./routes/saju-new-year.js", () => import("./routes/saju-new-year.js"), "handleSajuNewYearRoutes");
const handleZiweiBookRoutes = createLazyRouteHandler("./routes/ziwei-book.js", () => import("./routes/ziwei-book.js"), "handleZiweiBookRoutes");
const handleZiweiDaehanRoutes = createLazyRouteHandler("./routes/ziwei-daehan.js", () => import("./routes/ziwei-daehan.js"), "handleZiweiDaehanRoutes");
const handleDreamRoutes = createLazyRouteHandler("./routes/dream.js", () => import("./routes/dream.js"), "handleDreamRoutes");
const handleDebugRoutes = createLazyRouteHandler("./routes/debug.js", () => import("./routes/debug.js"), "handleDebugRoutes");
const handleYogaGuruRoutes = createLazyRouteHandler("./routes/yoga-guru.js", () => import("./routes/yoga-guru.js"), "handleYogaGuruRoutes");
const handleSibylRoutes = createLazyRouteHandler("./routes/sibyl.js", () => import("./routes/sibyl.js"), "handleSibylRoutes");
const handleOracleRoutes = createLazyRouteHandler("./routes/oracle.js", () => import("./routes/oracle.js"), "handleOracleRoutes");
const handleKasiRoutes = createLazyRouteHandler("./routes/kasi.js", () => import("./routes/kasi.js"), "handleKasiRoutes");
const handleUserRoutes = createLazyRouteHandler("./routes/user.js", () => import("./routes/user.js"), "handleUserRoutes");
const handleProfileRoutes = createLazyRouteHandler("./routes/profile.js", () => import("./routes/profile.js"), "handleProfileRoutes");
const handleSubscriptionRoutes = createLazyRouteHandler("./routes/subscriptions.js", () => import("./routes/subscriptions.js"), "handleSubscriptionRoutes");
const handleAstroRoutes = createLazyRouteHandler("./routes/astro.js", () => import("./routes/astro.js"), "handleAstroRoutes");
const handleAstrologyRoutes = createLazyRouteHandler("./routes/astro.js", () => import("./routes/astro.js"), "handleAstrologyRoutes");
const handleSukuyoRoutes = createLazyRouteHandler("./routes/sukuyo.js", () => import("./routes/sukuyo.js"), "handleSukuyoRoutes");
const handleSukyoPdfMockRoutes = createLazyRouteHandler("./routes/sukyo-pdf-mock.js", () => import("./routes/sukyo-pdf-mock.js"), "handleSukyoPdfMockRoutes", "api/pdf/sukyo");
const handleSoulOriginRoutes = createLazyRouteHandler("./routes/soul-origin.js", () => import("./routes/soul-origin.js"), "handleSoulOriginRoutes");
const handleInsightsRoutes = createLazyRouteHandler("./routes/insights.js", () => import("./routes/insights.js"), "handleInsightsRoutes");
const handleContentRoutes = createLazyRouteHandler("./routes/content.js", () => import("./routes/content.js"), "handleContentRoutes");
const handleContentFeedRoutes = createLazyRouteHandler("./routes/content.js", () => import("./routes/content.js"), "handleContentFeedRoutes", "api/content-feed");
const handlePalmRoutes = createLazyRouteHandler("./routes/palm.js", () => import("./routes/palm.js"), "handlePalmRoutes");
const handleDestinyBiasRoutes = createLazyRouteHandler("./routes/destiny-bias.js", () => import("./routes/destiny-bias.js"), "handleDestinyBiasRoutes");
const handleBillingRoutes = createLazyRouteHandler("./routes/billing.js", () => import("./routes/billing.js"), "handleBillingRoutes");
const handleNamingPromptRoutes = createLazyRouteHandler("./routes/naming-prompt.js", () => import("./routes/naming-prompt.js"), "handleNamingPromptRoutes");
const handleAccessRoutes = createLazyRouteHandler("./routes/access.js", () => import("./routes/access.js"), "handleAccessRoutes");
const handleRpgRoutes = createLazyRouteHandler("./routes/rpg.js", () => import("./routes/rpg.js"), "handleRpgRoutes");
const handleFptiRoutes = createLazyRouteHandler("./routes/fpti.js", () => import("./routes/fpti.js"), "handleFptiRoutes");

const getRuntimeKeyMatrix = async (env, forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && RUNTIME_KEY_MATRIX_CACHE.value && RUNTIME_KEY_MATRIX_CACHE.expiresAt > now) {
    return RUNTIME_KEY_MATRIX_CACHE.value;
  }

  if (!runtimeKeyMatrixModulePromise) {
    runtimeKeyMatrixModulePromise = import("./lib/key-health.js").catch((error) => {
      runtimeKeyMatrixModulePromise = null;
      throw error;
    });
  }

  const { buildRuntimeKeyMatrix } = await runtimeKeyMatrixModulePromise;
  const value = buildRuntimeKeyMatrix(env);
  RUNTIME_KEY_MATRIX_CACHE.value = value;
  RUNTIME_KEY_MATRIX_CACHE.expiresAt = now + RUNTIME_KEY_MATRIX_CACHE_TTL_MS;
  return value;
};

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

function buildOAuthCallbackShimResponse(provider) {
  const callbackPath = `/api/auth/oauth/${provider}/callback`;
  const callbackPathJson = JSON.stringify(callbackPath);
  const body = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Code Destiny</title></head><body><p>로그인을 연결하는 중입니다.</p><script>location.replace(${callbackPathJson}+location.search+location.hash);</script><noscript><a href="${callbackPath}">${callbackPath}</a></noscript></body></html>`;
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "X-Robots-Tag": "noindex, nofollow",
  });
  applyNoCacheHeaders(headers);
  return new Response(body, { status: 200, headers });
}

function normalizeOrigin(rawValue) {
  const value = String(rawValue || "").trim().replace(/\/+$/, "");
  if (!value) return "";

  try {
    return new URL(value).origin;
  } catch (e) {
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
  if (origin === "null") return false;

  const allowedOrigins = getAllowedOrigins(env);
  if (allowedOrigins.has(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    if (hostname === "code-destiny.com" || hostname.endsWith(".code-destiny.com")) return true;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  } catch (e) {
    return false;
  }

  return false;
}

function isLocalWorkerRequest(request) {
  try {
    const { hostname } = new URL(request.url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch (e) {
    return false;
  }
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const fallbackOrigin = normalizeOrigin(env.AUTH_FRONTEND_BASE_URL)
    || normalizeOrigin(env.SITE_BASE_URL)
    || normalizeOrigin(env.AUTH_URL)
    || "https://code-destiny.com";
  const allowOrigin = origin === "null" && isLocalWorkerRequest(request)
    ? "null"
    : (origin && isAllowedOrigin(origin, env) ? origin : fallbackOrigin);

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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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

      const oauthCallbackPageMatch = url.pathname.match(/^\/auth\/(google|naver|kakao)\/callback$/);
      if (request.method === "GET" && oauthCallbackPageMatch) {
        return buildOAuthCallbackShimResponse(String(oauthCallbackPageMatch[1] || "").toLowerCase());
      }

      if (url.pathname === "/api/health") {
        return runWithRouteMetrics("api/health", env, async () => {
          const upstreamOrigin = getUpstreamOrigin(env);
          const keyMatrix = await getRuntimeKeyMatrix(env, url.searchParams.get("refresh") === "1");
          const brokenFeatures = keyMatrix
            .filter((item) => !item.ok)
            .map((item) => item.feature);
          return jsonResponse(request, env, {
            ok: true,
            service: "code-destiny-api-worker",
            mode: "worker-native",
            backendOnly: true,
            nativeRoutes: ["auth", "admin", "payments", "fortune", "tarot", "youtube", "celestial-harmony", "premium", "ziwei-book", "lifebook", "love-secret", "dream", "yoga-guru", "sibyl", "oracle", "kasi", "astro", "vedic", "soul-origin", "palm", "destiny-bias", "geo"],
            fallbackProxyMode: upstreamOrigin
              ? (isFrontendOrigin(upstreamOrigin, env) ? "misconfigured" : "enabled")
              : "disabled",
            upstreamConfigured: Boolean(upstreamOrigin),
            routeMetrics: {
              enabled: shouldCollectRouteMetrics(env),
              endpoint: "/api/health/route-metrics",
            },
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
        });
      }

      if (url.pathname === "/api/health/auth-env") {
        return runWithRouteMetrics("api/health/auth-env", env, () => {
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
        });
      }

      if (url.pathname === "/api/health/route-metrics") {
        return runWithRouteMetrics("api/health/route-metrics", env, () => {
          if (request.method !== "GET") {
            return jsonResponse(request, env, {
              ok: false,
              error: "method_not_allowed",
              message: "Only GET is allowed for route metrics.",
            }, { status: 405 });
          }

          const metricsEnabled = shouldCollectRouteMetrics(env);
          if (!hasRouteMetricsToken(request, env)) {
            return jsonResponse(request, env, {
              ok: false,
              error: "forbidden",
              message: "Route metrics token required.",
            }, { status: 401 });
          }

          const metricPayload = normalizeRouteMetricBuckets();
          const top = Math.min(Math.max(parseInt(url.searchParams.get("top") || "50", 10), 1), 200);
          const queryRoute = String(url.searchParams.get("route") || "").trim().toLowerCase();
          const sort = String(url.searchParams.get("sort") || "count").trim().toLowerCase();

          const filteredRoutes = queryRoute
            ? metricPayload.routes.filter((item) => item.route.includes(queryRoute))
            : metricPayload.routes;

          const sortableRoutes = [...filteredRoutes].sort((a, b) => {
            if (sort === "avg" || sort === "avgms" || sort === "avg_ms") return b.avgMs - a.avgMs;
            if (sort === "min") return a.minMs - b.minMs;
            if (sort === "max") return b.maxMs - a.maxMs;
            if (sort === "errors") return b.errors - a.errors;
            if (sort === "route") return String(a.route).localeCompare(String(b.route));
            return b.count - a.count;
          });

          return jsonResponse(request, env, {
            ok: true,
            enabled: metricsEnabled,
            endpoint: "/api/health/route-metrics",
            total: metricPayload.total,
            routes: sortableRoutes.slice(0, top),
            routeCount: sortableRoutes.length,
            updatedAt: new Date().toISOString(),
          });
        });
      }

      if (url.pathname === "/api/geo") {
        return runWithRouteMetrics("api/geo", env, () => {
          const country = detectCountry(request);
          return jsonResponse(request, env, {
            ok: true,
            country,
            locale: detectLocale(country),
          });
        });
      }

      if (url.pathname === "/api/version") {
        return runWithRouteMetrics("api/version", env, () => jsonResponse(request, env, buildVersionPayload(env)));
      }

      if (url.pathname === "/api/pexels-image") {
        return runWithRouteMetrics("api/pexels-image", env, () => handlePexelsImageRequest(request, env));
      }

      // Legacy compatibility: 일부 런타임이 /api/status 상태 체크를 사용한다.
      if (url.pathname === "/api/status") {
        return runWithRouteMetrics("api/status", env, () => {
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
        });
      }

      if (url.pathname === "/api/auth" || url.pathname.startsWith("/api/auth/")) {
        return withCorsHeaders(request, env, await handleAuthRoutes(request, env));
      }

      if (url.pathname === "/api/me/payment-phone") {
        const rewrittenRequest = rewriteRequestPath(request, "/api/auth/me/payment-phone");
        return withCorsHeaders(request, env, await handleAuthRoutes(rewrittenRequest, env));
      }

      if (url.pathname === "/api/session") {
        const rewrittenRequest = rewriteRequestPath(request, "/api/auth/session");
        return withCorsHeaders(request, env, await handleAuthRoutes(rewrittenRequest, env));
      }

      if (url.pathname === "/sitemap.xml" || url.pathname === "/rss.xml" || url.pathname === "/insights/rss.xml") {
        const rewrittenRequest = rewriteRequestPath(request, `/api/content-feed${url.pathname}`);
        const routedResponse = await handleContentFeedRoutes(rewrittenRequest, env);
        const response = new Response(routedResponse.body, routedResponse);
        response.headers.set("X-Code-Destiny-Feed", "merged");
        return response;
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

      if (url.pathname === "/api/content-feed" || url.pathname.startsWith("/api/content-feed/")) {
        return withCorsHeaders(request, env, await handleContentFeedRoutes(request, env));
      }

      if (url.pathname === "/api/palm" || url.pathname.startsWith("/api/palm/")) {
        return withCorsHeaders(request, env, await handlePalmRoutes(request, env));
      }

      if (url.pathname === "/api/destiny-bias" || url.pathname.startsWith("/api/destiny-bias/")) {
        return withCorsHeaders(request, env, await handleDestinyBiasRoutes(request, env));
      }

      if (url.pathname === "/api/webhooks/portone" || url.pathname === "/api/payments/portone/webhook") {
        const rewrittenRequest = rewriteRequestPath(request, "/api/payments/webhook");
        return withCorsHeaders(request, env, await handlePaymentRoutes(rewrittenRequest, env));
      }

      if (url.pathname === "/api/payments" || url.pathname.startsWith("/api/payments/")) {
        return withCorsHeaders(request, env, await handlePaymentRoutes(request, env));
      }

      if (url.pathname === "/api/billing" || url.pathname.startsWith("/api/billing/")) {
        return withCorsHeaders(request, env, await handleBillingRoutes(request, env));
      }

      if (url.pathname === "/api/naming-prompt" || url.pathname.startsWith("/api/naming-prompt/")) {
        return withCorsHeaders(request, env, await handleNamingPromptRoutes(request, env));
      }

      if (url.pathname === "/api/access" || url.pathname.startsWith("/api/access/")) {
        return withCorsHeaders(request, env, await handleAccessRoutes(request, env));
      }

      if (url.pathname === "/api/unlocks" || url.pathname.startsWith("/api/unlocks/")) {
        const rewrittenRequest = rewriteRequestPath(request, url.pathname.replace("/api/unlocks", "/api/access"));
        return withCorsHeaders(request, env, await handleAccessRoutes(rewrittenRequest, env));
      }

      if (url.pathname === "/api/rpg" || url.pathname.startsWith("/api/rpg/")) {
        return withCorsHeaders(request, env, await handleRpgRoutes(request, env));
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

      if (url.pathname === "/api/premium/pdf-archive" || url.pathname.startsWith("/api/premium/pdf-archive/")) {
        const suffix = url.pathname.slice("/api/premium/pdf-archive".length);
        const routedRequest = rewriteRequestPath(request, "/api/billing/pdf-archive" + (suffix || ""));
        return withCorsHeaders(request, env, await handleBillingRoutes(routedRequest, env));
      }

      if (url.pathname === "/api/celestial-harmony" || url.pathname.startsWith("/api/celestial-harmony/")) {
        return withCorsHeaders(request, env, await handleCelestialHarmonyRoutes(request, env));
      }

      if (
        (url.pathname === "/api/premium" || url.pathname.startsWith("/api/premium/"))
        && !(
          url.pathname === "/api/premium/pdf-archive"
          || url.pathname.startsWith("/api/premium/pdf-archive/")
          || url.pathname === "/api/premium/saju/life-book"
          || url.pathname.startsWith("/api/premium/saju/life-book/")
          || url.pathname === "/api/premium/saju-lifebook"
          || url.pathname.startsWith("/api/premium/saju-lifebook/")
        )
      ) {
        return runWithRouteMetrics("api/premium", env, () => jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "프리미엄 통합 PDF 엔드포인트는 제거되었습니다. 인생의 책은 /api/premium/saju-lifebook/prepare 경로를 사용하세요.",
          supported: ["/api/premium/saju-lifebook", "/api/premium/saju-lifebook/prepare", "/api/lifebook", "/api/lifebook/prepare"],
        }, { status: 410 }));
      }

      if (url.pathname === "/api/premium-report" || url.pathname.startsWith("/api/premium-report/")) {
        return runWithRouteMetrics("api/premium-report", env, () => jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "premium-report 엔드포인트는 제거되었습니다. 인생의 책은 /api/premium/saju-lifebook/prepare 경로를 사용하세요.",
          supported: ["/api/premium/saju-lifebook", "/api/premium/saju-lifebook/prepare", "/api/lifebook", "/api/lifebook/prepare"],
        }, { status: 410 }));
      }

      if (url.pathname === "/api/ziwei-book" || url.pathname.startsWith("/api/ziwei-book/")) {
        return withCorsHeaders(request, env, await handleZiweiBookRoutes(request, env, ctx));
      }

      if (url.pathname === "/api/ziwei/daehan" || url.pathname.startsWith("/api/ziwei/daehan/")) {
        return withCorsHeaders(request, env, await handleZiweiDaehanRoutes(request, env));
      }

      if (url.pathname === "/api/ziwei" || url.pathname.startsWith("/api/ziwei/")) {
        return runWithRouteMetrics("api/ziwei", env, () => jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "ziwei PDF 엔드포인트는 제거되었습니다.",
        }, { status: 410 }));
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
        return withCorsHeaders(request, env, await handleSajuLifebookRoutes(routedRequest, env, ctx));
      }

      if (url.pathname === "/api/love-secret" || url.pathname.startsWith("/api/love-secret/")) {
        return withCorsHeaders(request, env, await handleSajuLoveSecretRoutes(request, env, ctx));
      }

      if (url.pathname === "/api/saju-new-year" || url.pathname.startsWith("/api/saju-new-year/")) {
        return withCorsHeaders(request, env, await handleSajuNewYearRoutes(request, env));
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
        return runWithRouteMetrics("api/astro", env, () => jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "astro premium PDF 엔드포인트는 제거되었습니다.",
        }, { status: 410 }));
      }

      if (
        url.pathname === "/api/vedic/generate-chapter"
        || url.pathname === "/api/vedic/session"
        || url.pathname === "/api/vedic/generate"
      ) {
        return runWithRouteMetrics("api/vedic", env, () => jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "vedic premium PDF 엔드포인트는 제거되었습니다.",
        }, { status: 410 }));
      }

      if (
        url.pathname === "/api/sukuyo"
        || url.pathname.startsWith("/api/sukuyo/")
        || url.pathname === "/api/sukyo"
        || url.pathname.startsWith("/api/sukyo/")
      ) {
        const routedRequest = url.pathname.startsWith("/api/sukyo")
          ? rewriteRequestPath(request, url.pathname.replace("/api/sukyo", "/api/sukuyo"))
          : request;
        return withCorsHeaders(request, env, await handleSukuyoRoutes(routedRequest, env, ctx));
      }

      if (url.pathname === "/api/pdf/sukyo" || url.pathname.startsWith("/api/pdf/sukyo/")) {
        return withCorsHeaders(request, env, await handleSukyoPdfMockRoutes(request, env, ctx));
      }

      if (url.pathname === "/api/astrology" || url.pathname.startsWith("/api/astrology/")) {
        return withCorsHeaders(request, env, await handleAstrologyRoutes(request, env));
      }

      if (url.pathname === "/api/astro" || url.pathname.startsWith("/api/astro/")) {
        return withCorsHeaders(request, env, await handleAstroRoutes(request, env));
      }

      if (url.pathname === "/api/vedic" || url.pathname.startsWith("/api/vedic/")) {
        return withCorsHeaders(request, env, await handleAstroRoutes(request, env));
      }

      if (url.pathname === "/api/soul-origin" || url.pathname.startsWith("/api/soul-origin/")) {
        return withCorsHeaders(request, env, await handleSoulOriginRoutes(request, env));
      }

      if (url.pathname === "/api/debug" || url.pathname.startsWith("/api/debug/")) {
        return withCorsHeaders(request, env, await handleDebugRoutes(request, env));
      }

      if (url.pathname === "/api/user" || url.pathname.startsWith("/api/user/")) {
        return withCorsHeaders(request, env, await handleUserRoutes(request, env));
      }

      if (url.pathname === "/api/profiles" || url.pathname.startsWith("/api/profiles/")) {
        const rewrittenRequest = rewriteRequestPath(request, url.pathname.replace("/api/profiles", "/api/profile"));
        return withCorsHeaders(request, env, await handleProfileRoutes(rewrittenRequest, env));
      }

      if (url.pathname === "/api/profile" || url.pathname.startsWith("/api/profile/")) {
        return withCorsHeaders(request, env, await handleProfileRoutes(request, env));
      }

      if (url.pathname === "/api/subscriptions" || url.pathname.startsWith("/api/subscriptions/")) {
        return withCorsHeaders(request, env, await handleSubscriptionRoutes(request, env));
      }

      if (url.pathname.startsWith("/api/")) {
        return runWithRouteMetrics("api/proxy", env, () => proxyApiRequest(request, env));
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
