import { getEnv } from "./lib/env.js";
// 결제수단 판정 정본. coin-gate 의 갈래를 billing.js 와 같은 규칙으로 정하기 위해 여기서 쓴다
// (라우터에 별칭 목록을 복제하지 않는다 — 그 복제가 신·구 구현이 갈리던 원인이었다).
import { PAYMENT_METHODS, resolvePaymentCommandFromBody } from "./lib/payment-service.js";
import { enforceAiRouteSecurity } from "./lib/security/index.js";
import { resolveAiLocaleFromRequest, runWithAiLocale } from "./lib/ai-locale-context.js";

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
const GEOCODE_FALLBACK_SEOUL = {
  lat: 37.5665,
  lng: 126.978,
  name: "서울 (기본값)",
  timezone: "Asia/Seoul",
  fallback: true,
};

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

function cleanGeocodeText(value, maxLength = 0) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function validGeocodeCoordinates(lat, lng) {
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180;
}

function guessTimezoneFromLongitude(lng) {
  const offset = Math.max(-12, Math.min(14, Math.round(lng / 15)));
  if (offset === 9) return "Asia/Seoul";
  return `UTC${offset >= 0 ? "+" : ""}${offset}`;
}

async function handleGeocodeRequest(request, env) {
  const url = new URL(request.url);
  const place = cleanGeocodeText(url.searchParams.get("place"), 120);
  if (!place) return jsonResponse(request, env, { error: "NO_PLACE" }, { status: 400 });

  try {
    const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");
    geocodeUrl.searchParams.set("q", place);
    geocodeUrl.searchParams.set("format", "json");
    geocodeUrl.searchParams.set("limit", "1");
    geocodeUrl.searchParams.set("accept-language", "ko,en");

    const response = await fetch(geocodeUrl.toString(), {
      headers: { "User-Agent": "CodeDestiny/1.0 (geocode)" },
    });
    if (!response.ok) return jsonResponse(request, env, GEOCODE_FALLBACK_SEOUL);

    const payload = await response.json().catch(() => null);
    const first = Array.isArray(payload) ? payload[0] : null;
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    if (!first || !validGeocodeCoordinates(lat, lng)) return jsonResponse(request, env, GEOCODE_FALLBACK_SEOUL);

    return jsonResponse(request, env, {
      lat,
      lng,
      name: cleanGeocodeText(first.display_name || place, 180),
      timezone: guessTimezoneFromLongitude(lng),
      fallback: false,
    });
  } catch {
    return jsonResponse(request, env, GEOCODE_FALLBACK_SEOUL);
  }
}

const RUNTIME_KEY_MATRIX_CACHE_TTL_MS = 30000;
const RUNTIME_KEY_MATRIX_CACHE = {
  expiresAt: 0,
  value: null,
};

const CLIENT_API_TRACE_ALLOWED_SOURCES = new Set([
  "static:index-session-cache",
  "app:user-session-cache",
  "app:auth-store",
  "app:billing-client",
  "app:points",
  "app:points-history",
  "app:me",
  "legacy:destiny-profile",
  "feature:coin-gate",
]);
const CLIENT_API_TRACE_STARTS = new WeakMap();
const CLIENT_API_TRACE_LOGGED = new WeakSet();

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

function shouldCollectClientApiTrace(env) {
  return isTruthyLike(getEnv(env, "WORKER_CLIENT_API_TRACE"));
}

function getClientApiTraceSource(request) {
  const source = String(request?.headers?.get("x-code-destiny-client") || "").trim().toLowerCase();
  return CLIENT_API_TRACE_ALLOWED_SOURCES.has(source) ? source : "";
}

function logClientApiTrace(request, response) {
  if (!request || !response || CLIENT_API_TRACE_LOGGED.has(request)) return;
  const startedAt = CLIENT_API_TRACE_STARTS.get(request);
  const source = getClientApiTraceSource(request);
  if (!Number.isFinite(startedAt) || !source) return;

  CLIENT_API_TRACE_LOGGED.add(request);
  let pathname = "";
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    pathname = "unknown";
  }

  const status = Number(response.status) || 0;
  const payload = {
    event: "client-api-trace",
    clientSource: source,
    method: String(request.method || "GET").toUpperCase(),
    path: pathname,
    status,
    requestId: String(request.headers.get("x-request-id") || request.headers.get("cf-ray") || "").slice(0, 120),
    durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
    retryable: status === 0 || status === 429 || status === 503 || status === 504 || status >= 500,
  };

  try {
    const logger = status >= 500 ? console.warn : console.log;
    logger("[client-api-trace]", JSON.stringify(payload));
  } catch {
    // Observability must never change the response path.
  }
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
    const runRoute = () => (metricsEnabled
      ? runWithRouteMetrics(metricRouteName, env, executeHandler, metricsEnabled)
      : executeHandler());

    // 46개 라우트가 전부 이 팩토리를 통과하므로, AI 출력 로케일은 여기 한 곳에서만 잡으면 된다.
    // 컨텍스트가 없으면(cron 등) 하위에서 ko 로 떨어진다 — fail-safe.
    return runWithAiLocale(resolveAiLocaleFromRequest(args[0]), runRoute);
  };
}

const handleAuthRoutes = createLazyRouteHandler("./routes/auth.js", () => import("./routes/auth.js"), "handleAuthRoutes");
const handleAppStoreRoutes = createLazyRouteHandler("./routes/app-store.js", () => import("./routes/app-store.js"), "handleAppStoreRoutes", "api/app-store");
const handleAdminRoutes = createLazyRouteHandler("./routes/admin.js", () => import("./routes/admin.js"), "handleAdminRoutes");
const handleFortuneRoutes = createLazyRouteHandler("./routes/fortune.js", () => import("./routes/fortune.js"), "handleFortuneRoutes");
const handleFortuneTodayRoutes = createLazyRouteHandler("./routes/fortune-today.js", () => import("./routes/fortune-today.js"), "handleFortuneTodayRoutes");
const handleFusionFortuneRoutes = createLazyRouteHandler("./routes/fusion-fortune.js", () => import("./routes/fusion-fortune.js"), "handleFusionFortuneRoutes", "api/fusion-fortune");
const handleFortuneChatRoutes = createLazyRouteHandler("./routes/fortune-chat.js", () => import("./routes/fortune-chat.js"), "handleFortuneChatRoutes", "api/fortune-chat");
const handleTarotRoutes = createLazyRouteHandler("./routes/tarot.js", () => import("./routes/tarot.js"), "handleTarotRoutes");
const handleCelestialHarmonyRoutes = createLazyRouteHandler("./routes/celestial-harmony.js", () => import("./routes/celestial-harmony.js"), "handleCelestialHarmonyRoutes");
const handlePaymentRoutes = createLazyRouteHandler("./routes/payments.js", () => import("./routes/payments.js"), "handlePaymentRoutes", "payments");
const handleMusicRoutes = createLazyRouteHandler("./routes/music.js", () => import("./routes/music.js"), "handleMusicRoutes", "api/music");
const handleLifeBookAiRoutes = createLazyRouteHandler("./routes/life-book-ai.js", () => import("./routes/life-book-ai.js"), "handleLifeBookAiRoutes", "api/life-book-ai");
const handleSajuGuardianImageRoutes = createLazyRouteHandler("./routes/guardian-image.js", () => import("./routes/guardian-image.js"), "handleSajuGuardianImageRoutes", "api/guardian");
const handleLoveSecretAiRoutes = createLazyRouteHandler("./routes/love-secret-ai.js", () => import("./routes/love-secret-ai.js"), "handleLoveSecretAiRoutes", "api/love-secret-ai");
const handleSajuNewYearRoutes = createLazyRouteHandler("./routes/saju-new-year.js", () => import("./routes/saju-new-year.js"), "handleSajuNewYearRoutes");
const handleNewYearAiRoutes = createLazyRouteHandler("./routes/new-year-ai.js", () => import("./routes/new-year-ai.js"), "handleNewYearAiRoutes", "api/new-year-ai");
const handleVedicAiRoutes = createLazyRouteHandler("./routes/vedic-ai.js", () => import("./routes/vedic-ai.js"), "handleVedicAiRoutes", "api/vedic-ai");
const handleKarmaDestinyAiRoutes = createLazyRouteHandler("./routes/karma-destiny-ai.js", () => import("./routes/karma-destiny-ai.js"), "handleKarmaDestinyAiRoutes", "api/karma-destiny-ai");
const handleZiweiAiRoutes = createLazyRouteHandler("./routes/ziwei-ai.js", () => import("./routes/ziwei-ai.js"), "handleZiweiAiRoutes", "api/ziwei-ai");
// 심화 자미두수 PDF (ZIWEI_DEEP_PDF) — 회당 결제 LLM 15챕터 심층 리포트
const handleZiweiDeepReportRoutes = createLazyRouteHandler("./routes/ziwei-deep-report.js", () => import("./routes/ziwei-deep-report.js"), "handleZiweiDeepReportRoutes", "api/ziwei-deep-report");
const handleMasterLoveCodexRoutes = createLazyRouteHandler("./routes/master-love-codex.js", () => import("./routes/master-love-codex.js"), "handleMasterLoveCodexRoutes", "api/master-love-codex");
const handleFortuneTeaHouseRoutes = createLazyRouteHandler("./routes/fortune-tea-house.js", () => import("./routes/fortune-tea-house.js"), "handleFortuneTeaHouseRoutes", "api/fortune-tea-house");
const handleZiweiDaehanRoutes = createLazyRouteHandler("./routes/ziwei-daehan.js", () => import("./routes/ziwei-daehan.js"), "handleZiweiDaehanRoutes");
// 운명의 섬 — 무인증·무DB 결정론 계산(명반→섬 청사진)
const handleZiweiIslandRoutes = createLazyRouteHandler("./routes/ziwei-island.js", () => import("./routes/ziwei-island.js"), "handleZiweiIslandRoutes", "api/ziwei-island");
// 운명의 지도 — 무인증·무DB AI 문장화(규칙 산출 데이터 문장화만, 실패 시 클라 템플릿 폴백)
const handleDestinyCompassRoutes = createLazyRouteHandler("./routes/destiny-compass.js", () => import("./routes/destiny-compass.js"), "handleDestinyCompassRoutes", "api/destiny-compass");
// 운명의 지도 심층 리포트(₩10,000) — 회당 결제 9섹션 LLM 상담. 두 웨이브 동기 생성(waitUntil 금지)
const handleDestinyCompassAiRoutes = createLazyRouteHandler("./routes/destiny-compass-ai.js", () => import("./routes/destiny-compass-ai.js"), "handleDestinyCompassAiRoutes", "api/destiny-compass-ai");
// AI 반려동물 사주 — 무인증·무DB 결정론 계산(프로필→오행 청사진)
const handlePetSajuRoutes = createLazyRouteHandler("./routes/pet-saju.js", () => import("./routes/pet-saju.js"), "handlePetSajuRoutes", "api/pet-saju");
// AI 반려동물 사주 심층 리포트·궁합(각 ₩5,000) — 회당 결제 LLM 서술(결정론 수치는 위 엔진이 계산)
const handlePetSajuAiRoutes = createLazyRouteHandler("./routes/pet-saju-ai.js", () => import("./routes/pet-saju-ai.js"), "handlePetSajuAiRoutes", "api/pet-saju-ai");
// 운명의 섬 12궁 심층 유료 상담(₩20,000) — 별도 상품, ziwei-ai 결제 흐름 복제(runAiRouteWithSecurity)
const handleZiweiIslandAiRoutes = createLazyRouteHandler("./routes/ziwei-island-ai.js", () => import("./routes/ziwei-island-ai.js"), "handleZiweiIslandAiRoutes", "api/ziwei-island-ai");
// 운명의 섬 12궁 심층 리포트(₩5,000) — 정적 결정론 콘텐츠, 영구 해금 상태만 검사
const handleZiweiIslandReportRoutes = createLazyRouteHandler("./routes/ziwei-island-report.js", () => import("./routes/ziwei-island-report.js"), "handleZiweiIslandReportRoutes", "api/ziwei-island-report");
const handleDreamRoutes = createLazyRouteHandler("./routes/dream.js", () => import("./routes/dream.js"), "handleDreamRoutes");
const handleDebugRoutes = createLazyRouteHandler("./routes/debug.js", () => import("./routes/debug.js"), "handleDebugRoutes");
const handleYogaGuruRoutes = createLazyRouteHandler("./routes/yoga-guru.js", () => import("./routes/yoga-guru.js"), "handleYogaGuruRoutes");
const handleSibylRoutes = createLazyRouteHandler("./routes/sibyl.js", () => import("./routes/sibyl.js"), "handleSibylRoutes");
const handleOracleRoutes = createLazyRouteHandler("./routes/oracle.js", () => import("./routes/oracle.js"), "handleOracleRoutes");
const handleAnimalTotemRoutes = createLazyRouteHandler("./routes/animal-totem.js", () => import("./routes/animal-totem.js"), "handleAnimalTotemRoutes", "api/animal-totem");
const handleKasiRoutes = createLazyRouteHandler("./routes/kasi.js", () => import("./routes/kasi.js"), "handleKasiRoutes");
const handleUserRoutes = createLazyRouteHandler("./routes/user.js", () => import("./routes/user.js"), "handleUserRoutes");
const handleProfileRoutes = createLazyRouteHandler("./routes/profile.js", () => import("./routes/profile.js"), "handleProfileRoutes");
const handleAccessStateRoutes = createLazyRouteHandler("./routes/access-state.js", () => import("./routes/access-state.js"), "handleAccessStateRoutes", "api/me/access-state");
const handleSubscriptionRoutes = createLazyRouteHandler("./routes/subscriptions.js", () => import("./routes/subscriptions.js"), "handleSubscriptionRoutes");
const handleAstrologyAiRoutes = createLazyRouteHandler("./routes/astrology-ai.js", () => import("./routes/astrology-ai.js"), "handleAstrologyAiRoutes");
const handleNeoOperationRoomRoutes = createLazyRouteHandler("./routes/neo-operation-room.js", () => import("./routes/neo-operation-room.js"), "handleNeoOperationRoomRoutes", "api/neo-operation-room");
const handleAstroRoutes = createLazyRouteHandler("./routes/astro.js", () => import("./routes/astro.js"), "handleAstroRoutes");
const handleAstrologyRoutes = createLazyRouteHandler("./routes/astro.js", () => import("./routes/astro.js"), "handleAstrologyRoutes");
const handleSukuyoRoutes = createLazyRouteHandler("./routes/sukuyo.js", () => import("./routes/sukuyo.js"), "handleSukuyoRoutes");
const handleNakshatraRoutes = createLazyRouteHandler("./routes/nakshatra.js", () => import("./routes/nakshatra.js"), "handleNakshatraRoutes");
const handleNakshatraAiRoutes = createLazyRouteHandler("./routes/nakshatra-ai.js", () => import("./routes/nakshatra-ai.js"), "handleNakshatraAiRoutes", "api/nakshatra-ai");
const handleNakshatraPremiumRoutes = createLazyRouteHandler("./routes/nakshatra-premium.js", () => import("./routes/nakshatra-premium.js"), "handleNakshatraPremiumRoutes");
const handleSukuyoCompatibilityAiRoutes = createLazyRouteHandler("./routes/sukuyo-compatibility-ai.js", () => import("./routes/sukuyo-compatibility-ai.js"), "handleSukuyoCompatibilityAiRoutes");
const handleInsightsRoutes = createLazyRouteHandler("./routes/insights.js", () => import("./routes/insights.js"), "handleInsightsRoutes");
const handleCmsRoutes = createLazyRouteHandler("./routes/cms.js", () => import("./routes/cms.js"), "handleCmsRoutes", "api/cms");
const handleReviewRoutes = createLazyRouteHandler("./routes/reviews.js", () => import("./routes/reviews.js"), "handleReviewRoutes");
const handleFeedbackRoutes = createLazyRouteHandler("./routes/feedback.js", () => import("./routes/feedback.js"), "handleFeedbackRoutes");
const handleContentRoutes = createLazyRouteHandler("./routes/content.js", () => import("./routes/content.js"), "handleContentRoutes");
const handleContentFeedRoutes = createLazyRouteHandler("./routes/content.js", () => import("./routes/content.js"), "handleContentFeedRoutes", "api/content-feed");
const handlePalmRoutes = createLazyRouteHandler("./routes/palm.js", () => import("./routes/palm.js"), "handlePalmRoutes");
const handleDestinyBiasRoutes = createLazyRouteHandler("./routes/destiny-bias.js", () => import("./routes/destiny-bias.js"), "handleDestinyBiasRoutes");
const handleBillingRoutes = createLazyRouteHandler("./routes/billing.js", () => import("./routes/billing.js"), "handleBillingRoutes");
const handleNamingPromptRoutes = createLazyRouteHandler("./routes/naming-prompt.js", () => import("./routes/naming-prompt.js"), "handleNamingPromptRoutes");
const handleAccessRoutes = createLazyRouteHandler("./routes/access.js", () => import("./routes/access.js"), "handleAccessRoutes");
const handleRpgRoutes = createLazyRouteHandler("./routes/rpg.js", () => import("./routes/rpg.js"), "handleRpgRoutes");
const handleFptiRoutes = createLazyRouteHandler("./routes/fpti.js", () => import("./routes/fpti.js"), "handleFptiRoutes");

async function runAiRouteWithSecurity(request, env, serviceKey, handler, ctx) {
  const security = await enforceAiRouteSecurity({
    request,
    env,
    serviceKey,
    path: new URL(request.url).pathname,
  });
  if (!security.ok) return withCorsHeaders(request, env, security.response);
  // ctx는 즉시-202 + waitUntil 백그라운드 생성이 필요한 라우트(neo)만 사용한다.
  // (request, env) 시그니처의 다른 핸들러는 잉여 인자를 무시한다.
  return withCorsHeaders(request, env, await handler(request, env, ctx));
}

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
 * Auth, payment, fortune, premium, lifebook, love-secret-ai, and ziwei-ai routes run natively.
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

function buildNoCacheRedirectResponse(location, status = 302) {
  const headers = new Headers({ Location: location });
  applyNoCacheHeaders(headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(null, { status, headers });
}

function buildOAuthCallbackShimHtmlResponse(provider) {
  const callbackPath = `/api/auth/oauth/${provider}/callback`;
  const callbackPathJson = JSON.stringify(callbackPath);
  const body = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Code Destiny</title></head><body><p>Connecting login.</p><script>location.replace(${callbackPathJson}+location.search+location.hash);</script><noscript><a href="${callbackPath}">${callbackPath}</a></noscript></body></html>`;
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "X-Robots-Tag": "noindex, nofollow",
  });
  applyNoCacheHeaders(headers);
  return new Response(body, { status: 200, headers });
}

function buildOAuthCallbackShimResponse(request, provider) {
  if (provider !== "kakao") return buildOAuthCallbackShimHtmlResponse(provider);

  const sourceUrl = new URL(request.url);
  if (sourceUrl.searchParams.has("social_grant")) {
    const loginUrl = new URL("/login", sourceUrl.origin);
    loginUrl.searchParams.set("authError", provider);
    loginUrl.searchParams.set("social_error", "expired_callback");
    if (provider === "kakao") {
      console.info("[Kakao Callback] loopGuardTriggered", JSON.stringify({
        routePath: sourceUrl.pathname,
        redirectTarget: "/login",
      }));
    }
    return buildNoCacheRedirectResponse(loginUrl.toString());
  }

  const callbackUrl = new URL(`/api/auth/oauth/${provider}/callback`, sourceUrl.origin);
  callbackUrl.search = sourceUrl.search;
  return buildNoCacheRedirectResponse(callbackUrl.toString());
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

function isProductionRuntime(env) {
  const nodeEnv = String(getEnv(env, "NODE_ENV") || "").trim().toLowerCase();
  if (nodeEnv === "production") return true;

  const appEnv = String(getEnv(env, "APP_ENV") || getEnv(env, "DEPLOY_ENV") || getEnv(env, "ENVIRONMENT") || "").trim().toLowerCase();
  return appEnv === "prod" || appEnv === "production";
}

function isAllowedOrigin(origin, env) {
  if (!origin) return true;
  if (origin === "null") return false;

  const allowedOrigins = getAllowedOrigins(env);
  if (allowedOrigins.has(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    // credentialed CORS는 실제 웹 표면만 명시 허용 (서브도메인 와일드카드 금지 —
    // assets/music 등 정적 CDN 서브도메인 탈취 시 credentialed 호출을 막는다)
    if (hostname === "code-destiny.com" || hostname === "www.code-destiny.com" || hostname === "api.code-destiny.com") return true;

    // 🔴 프로덕션에서 여는 localhost 는 Capacitor 앱 셸 오리진 하나뿐이다.
    // capacitor.config.ts 의 androidScheme:"https" 때문에 앱 문서 오리진은 정확히 "https://localhost"(포트 없음)다.
    // 예전에는 hostname 만 봐서 임의 포트·http 까지 전부 통과시켰는데, 그러면 피해자 기기의 로컬호스트에서
    // 페이지를 띄울 수 있는 공격자(악성 npm 패키지가 띄운 로컬 서버, 내장 HTTP 서버를 가진 다른 설치 앱)가
    // Access-Control-Allow-Credentials: true 를 받아 인증된 결제·프로필 응답을 그대로 읽을 수 있었다.
    if (origin === "https://localhost") return true;

    // 로컬 개발용 임의 포트는 프로덕션이 아닐 때만. 상시 쓰는 포트(3000/3001/4000)는 이미
    // DEFAULT_ALLOWED_ORIGINS 에 있고, 그 밖의 포트는 CORS_ORIGIN 으로 넣으면 프로덕션에서도 열린다.
    if (!isProductionRuntime(env) && (hostname === "localhost" || hostname === "127.0.0.1")) return true;
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
      || "Content-Type, Authorization, X-Admin-Token, X-Admin-Subscription-Tier, X-Code-Destiny-Client",
    "Access-Control-Expose-Headers": "X-Request-ID, X-CD-Error-Stage, Server-Timing, Retry-After, ETag, Last-Modified",
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

  const response = new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
  logClientApiTrace(request, response);
  return response;
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
  if (response.status === 503 || response.status === 504) {
    const stage = String(response.headers.get("X-CD-Error-Stage") || (response.status === 504 ? "timeout" : "route"));
    if (!response.headers.has("X-Request-ID")) {
      response.headers.set("X-Request-ID", String(request.headers.get("x-request-id") || request.headers.get("cf-ray") || "unknown").slice(0, 120));
    }
    if (!response.headers.has("X-CD-Error-Stage")) response.headers.set("X-CD-Error-Stage", stage);
    if (!response.headers.has("Server-Timing")) response.headers.set("Server-Timing", `cd-error;desc=\"${stage}\"`);
    if (!response.headers.has("Retry-After")) response.headers.set("Retry-After", "2");
  }
  logClientApiTrace(request, response);
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
    // 🔴 404 다, 503 이 아니다. upstream 이 설정되지 않은 배포에서 네이티브로 없는 /api/* 경로는
    // **일시적으로 못 쓰는 게 아니라 그냥 존재하지 않는다.** 503 으로 답하면 두 가지가 망가진다:
    //   ① 클라이언트가 재시도할 이유가 없는 요청을 재시도한다(503 은 재시도 신호다).
    //   ② 오타·구버전 클라이언트의 죽은 경로 호출이 "서버 장애" 처럼 보여, 진짜 인프라 503 과
    //      구분이 안 된다 — 실제로 /api/subscription·/api/profile-cards 같은 미등록 경로가
    //      503 을 뱉고 있었고, 이 바디에는 code 필드가 없어 셸의 재시도 허용목록에도 안 걸려
    //      정체불명 503 으로 남았다.
    // 알려진 prefix 의 미매칭 하위경로는 이미 각 라우터가 404 not_found 를 낸다. 여기만 어긋나 있었다.
    // 진단 정보(requiredKeys/hint)는 그대로 둔다 — upstream 을 정말 붙일 때 필요한 단서다.
    return jsonResponse(request, env, {
      ok: false,
      error: "not_found",
      code: "NOT_FOUND",
      message: "Requested API route does not exist on this deployment.",
      requiredKeys: ["API_UPSTREAM_ORIGIN"],
      impact: isAdminPath ? "미포팅 /api/admin/* 레거시 API" : "미포팅 /api/* 레거시 API",
      hint: isAdminPath
        ? "관리자 비밀번호 게이트는 /api/admin/entry/password 네이티브 지원됨. 그 외 admin API는 API_UPSTREAM_ORIGIN 필요."
        : "현재 네이티브 미포팅 API는 외부 upstream 설정이 필요합니다.",
    }, { status: 404 });
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

// wrangler.toml 의 crons 배열과 반드시 같은 문자열이어야 한다. 다르면 재조정이 영영 안 돌거나,
// 반대로 일일 태스크가 10분마다 도는 사고가 난다.
const PAYMENT_RECONCILE_CRON = "*/10 * * * *";

export default {
  async fetch(request, env, ctx) {
    if (shouldCollectClientApiTrace(env) && getClientApiTraceSource(request)) {
      CLIENT_API_TRACE_STARTS.set(request, nowMs());
    }
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
        return buildOAuthCallbackShimResponse(request, String(oauthCallbackPageMatch[1] || "").toLowerCase());
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
            nativeRoutes: ["auth", "admin", "payments", "fortune", "tarot", "celestial-harmony", "premium", "ziwei-ai", "life-book-ai", "love-secret-ai", "karma-destiny-ai", "dream", "yoga-guru", "sibyl", "oracle", "kasi", "astro", "vedic", "soul-origin", "palm", "destiny-bias", "geo"],
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

      if (url.pathname === "/api/geocode") {
        return runWithRouteMetrics("api/geocode", env, () => handleGeocodeRequest(request, env));
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

      // ctx: 로그아웃의 세션 폐기를 즉시-응답 + waitUntil 백그라운드로 돌리기 위해 전달.
      if (url.pathname === "/api/auth" || url.pathname.startsWith("/api/auth/")) {
        return withCorsHeaders(request, env, await handleAuthRoutes(request, env, ctx));
      }

      if (url.pathname === "/api/app-store" || url.pathname.startsWith("/api/app-store/")) {
        return withCorsHeaders(request, env, await handleAppStoreRoutes(request, env));
      }

      if (url.pathname === "/api/me/payment-phone") {
        const rewrittenRequest = rewriteRequestPath(request, "/api/auth/me/payment-phone");
        return withCorsHeaders(request, env, await handleAuthRoutes(rewrittenRequest, env));
      }

      // /sitemap.xml 은 정적 종합 사이트맵(scripts/generate-sitemap.mjs 산출물)이 Pages 정적 자산으로 서빙됨.
      // Worker 는 MongoDB Insight 글 전용 사이트맵을 /sitemap-insights.xml 에서만 동적 생성한다.
      if (url.pathname === "/sitemap-insights.xml" || url.pathname === "/rss.xml" || url.pathname === "/insights/rss.xml") {
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

      // 공개 CMS 번들(인증 없음, 발행본만). 관리자 경로는 /api/admin/cms/* 로 admin.js 가 처리한다.
      if (url.pathname === "/api/cms" || url.pathname.startsWith("/api/cms/")) {
        return withCorsHeaders(request, env, await handleCmsRoutes(request, env));
      }

      if (url.pathname === "/api/reviews" || url.pathname.startsWith("/api/reviews/")) {
        return withCorsHeaders(request, env, await handleReviewRoutes(request, env));
      }

      // ctx 를 넘기는 이유: 관리자 알림 메일/웹훅을 응답 이후 백그라운드로 돌려
      // 제보 접수 응답을 지연시키지 않는다(routes/feedback.js handleCreate).
      if (url.pathname === "/api/feedback" || url.pathname.startsWith("/api/feedback/")) {
        return withCorsHeaders(request, env, await handleFeedbackRoutes(request, env, ctx));
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
        // 🔴 이 얼라이어스 블록은 /api/payments 블록보다 **먼저** 평가된다 — PortOne 콘솔의 실제
        // Endpoint URL 이 /api/webhooks/portone 이라, 아래 /api/payments 블록에만 컷오버 훅을 두면
        // 웹훅 트래픽 전부가 훅을 우회해 구 핸들러로 간다. 두 진입을 여기서 같은 판정으로 묶는다.
        if (request.method === "POST") {
          const rewrittenV2Request = rewriteRequestPath(request, "/api/payments/webhook");
          const { handlePaymentsContext } = await import("./payments/index.js");
          return withCorsHeaders(request, env, await handlePaymentsContext(rewrittenV2Request, env, { prefix: "/api/payments" }));
        }
        // ctx: 단건 결제(Transaction.Paid) 웹훅을 즉시-2xx ack + waitUntil 백그라운드 처리로 돌려
        // 포트원 웹훅 타임아웃(재전송 실패)을 없애기 위해 전달한다.
        const rewrittenRequest = rewriteRequestPath(request, "/api/payments/webhook");
        return withCorsHeaders(request, env, await handlePaymentRoutes(rewrittenRequest, env, ctx));
      }

      if (url.pathname === "/api/payments" || url.pathname.startsWith("/api/payments/")) {
        /* 컷오버 완료(2026-08-13). 아래 경로들은 **신규 모듈(worker/payments/)이 정본**이며 env 게이트가
           없다. 예전에는 PAYMENTS_V2_ROUTES allowlist 로 하나씩 열었고 되돌리기는 이름 제거였는데,
           그 구조의 실제 기본값은 "구 코드"였다 — 대시보드 변수가 비거나 오타 하나만 나도 결제 전체가
           조용히 구 로직으로 떨어졌고, 구 로직의 결함(reprice 없는 하드 409·CAS 패배 503)이 바로 그
           장애의 원인이었다. 지금 되돌리기는 PR revert 다(월정석이 2026-08-12 에 먼저 밟은 선례).
           응답은 legacyShape 로 나간다: 서버만 바뀌고 클라이언트는 그대로인 구간에서 키가 어긋나면
           200 이 오고 파싱도 되는데 값만 undefined 라 **에러 없이 화면이 빈다**(worker/payments/compat.js). */
        if (request.method === "GET"
          && /^\/api\/payments\/orders\/[^/]+$/.test(url.pathname)) {
          const { handlePaymentsContext } = await import("./payments/index.js");
          return withCorsHeaders(request, env, await handlePaymentsContext(request, env, {
            prefix: "/api/payments",
            legacyShape: true,
          }));
        }
        // 웹훅은 서버-서버 경로라 legacyShape 이 필요 없다(PortOne 은 HTTP 상태만 본다).
        // 콘솔 Endpoint 얼라이어스(/api/webhooks/portone)는 위 :1267 블록이 같은 판정으로 처리한다.
        if (request.method === "POST"
          && url.pathname === "/api/payments/webhook") {
          const { handlePaymentsContext } = await import("./payments/index.js");
          return withCorsHeaders(request, env, await handlePaymentsContext(request, env, { prefix: "/api/payments" }));
        }
        // 주문 발급 컷오버 — 구 prepare 봉투(평면 {message,idempotent,order})를 어댑터가 재현한다.
        if (request.method === "POST"
          && url.pathname === "/api/payments/prepare") {
          const { handlePaymentsContext } = await import("./payments/index.js");
          return withCorsHeaders(request, env, await handlePaymentsContext(request, env, {
            prefix: "/api/payments",
            legacyEnvelope: "prepare",
          }));
        }
        // 결제 공개 설정 컷오버 — Mongo 0회 무인증 조회. 봉투는 구 handlePaymentConfig 와 동일.
        if (request.method === "GET"
          && url.pathname === "/api/payments/config") {
          const { handlePaymentsContext } = await import("./payments/index.js");
          return withCorsHeaders(request, env, await handlePaymentsContext(request, env, { prefix: "/api/payments" }));
        }
        // 이용권(구독) — prepare·confirm 은 같은 주문 계약을 공유하므로 한 단위로 다룬다
        // (한쪽만 V2 면 주문 스킴이 갈린다).
        if (request.method === "POST"
          && (url.pathname === "/api/payments/subscription/prepare" || url.pathname === "/api/payments/subscription/confirm")) {
          const { handlePaymentsContext } = await import("./payments/index.js");
          return withCorsHeaders(request, env, await handlePaymentsContext(request, env, { prefix: "/api/payments" }));
        }
        return withCorsHeaders(request, env, await handlePaymentRoutes(request, env, ctx));
      }

      if (url.pathname === "/api/billing" || url.pathname.startsWith("/api/billing/")) {
        // 주문 발급 — 구 /api/billing/checkout 은 prepare 를 위임 래핑({ok,data:{…,order}})해
        // 답하던 경로라, 같은 어댑터를 billing 봉투로 마운트한다.
        if (request.method === "POST"
          && url.pathname === "/api/billing/checkout") {
          const rewrittenCheckout = rewriteRequestPath(request, "/api/payments/prepare");
          const { handlePaymentsContext } = await import("./payments/index.js");
          return withCorsHeaders(request, env, await handlePaymentsContext(rewrittenCheckout, env, {
            prefix: "/api/payments",
            legacyEnvelope: "billing-checkout",
          }));
        }
        // 확정 — 구 /api/billing/confirm 을 V2 confirmOrder 로. 구 /api/payments/confirm
        // (PointsClient 상점 경로)은 응답 계약이 달라 아직 구 핸들러에 남는다(별도 라우트 이름으로 후속).
        if (request.method === "POST"
          && url.pathname === "/api/billing/confirm") {
          const rewrittenConfirm = rewriteRequestPath(request, "/api/payments/confirm");
          const { handlePaymentsContext } = await import("./payments/index.js");
          return withCorsHeaders(request, env, await handlePaymentsContext(rewrittenConfirm, env, {
            prefix: "/api/payments",
          }));
        }
        /* coin-gate 는 다중 결제수단 라우트라 본문의 paymentMode 로 갈래를 정한다. 월정석(MOONLIGHT_STONE)
           과 이용권 검사(MEMBERSHIP_PASS)는 V2 가 정본이고, 나머지 모드(DIRECT_KRW·deferred 등)는 아래
           구 billing 핸들러가 계속 답한다.

           🔴 본문은 **여기서 한 번만** 읽는다(2026-08-13). 예전에는 두 갈래가 각자 clone().text() +
           JSON.parse 를 해서 요청 하나에 clone 2회·parse 2회가 붙었고, 그 뒤 컨텍스트가 또 읽어 3회째였다.
           결제 임계경로에서 같은 본문을 세 번 사는 비용이라 읽은 문자열을 bodyText 로 넘겨 재사용한다
           (원 요청은 읽지 않은 채로 남아 구 핸들러 폴스루가 그대로 동작한다). */
        if (request.method === "POST"
          && url.pathname === "/api/billing/coin-gate") {
          let coinGateBodyText = "";
          let coinGateMethod = "";
          try {
            coinGateBodyText = await request.clone().text();
            /* 🔴 판정은 **billing.js 와 같은 함수**로 한다(2026-08-13). 예전에는 여기서 `paymentMode` 를
               대문자 정확 일치로만 봤는데, 핸들러는 resolvePaymentCommand 의 별칭 집합(monthly ·
               monthly_credit · membership_credit · membership …)과 `accessMode` 필드까지 받는다.
               그래서 같은 월정석·이용권 결제가 **필드 철자에 따라** 신·구 구현으로 갈렸고, 별칭으로 온
               요청은 우리가 방금 고친 결함(CAS 패배 503 · 고아 예약 409)이 남아 있는 구 코드로 갔다.
               단건 신호(forceDirectPayment·provider 조합 등)가 있으면 DIRECT_KRW 로 확정돼 여기서
               걸러진다 — 그 판정도 같은 함수 안에 있다. */
            coinGateMethod = resolvePaymentCommandFromBody(JSON.parse(coinGateBodyText || "{}")).method;
          } catch { coinGateMethod = ""; }
          const coinGateV2Path = coinGateMethod === PAYMENT_METHODS.MONTHLY
            ? "/api/payments/coin-gate/moonstone"
            : coinGateMethod === PAYMENT_METHODS.MEMBERSHIP_PASS
              ? "/api/payments/coin-gate/pass-check"
              : "";
          if (coinGateV2Path) {
            const rewrittenCoinGate = rewriteRequestPath(request, coinGateV2Path);
            const { handlePaymentsContext } = await import("./payments/index.js");
            return withCorsHeaders(request, env, await handlePaymentsContext(rewrittenCoinGate, env, {
              prefix: "/api/payments",
              bodyText: coinGateBodyText,
            }));
          }
        }
        return withCorsHeaders(request, env, await handleBillingRoutes(request, env, ctx));
      }

      if (url.pathname === "/api/music" || url.pathname.startsWith("/api/music/")) {
        return withCorsHeaders(request, env, await handleMusicRoutes(request, env));
      }

      if (url.pathname === "/api/naming-prompt" || url.pathname.startsWith("/api/naming-prompt/")) {
        // ctx: 작명 생성(generate)을 즉시-202 + waitUntil 백그라운드로 돌리기 위해 전달(ziwei-ai와 동일 패턴).
        return runAiRouteWithSecurity(request, env, "naming-prompt", handleNamingPromptRoutes, ctx);
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

      // 홈 "오늘의 운세" 허브 — 무료·무인증. Swiss WASM 을 쓰므로 별도 모듈로 떼어
      // /api/fortune/* 본 번들(결제·상담)이 그 무게를 지지 않게 한다. 그래서 catch-all 앞에 온다.
      if (url.pathname === "/api/fortune/today-hub") {
        return withCorsHeaders(request, env, await handleFortuneTodayRoutes(request, env));
      }

      if (url.pathname === "/api/fortune" || url.pathname.startsWith("/api/fortune/")) {
        // ctx: 사주 전문가 상담 생성을 즉시-202 + waitUntil 백그라운드로 돌리기 위해 전달.
        return withCorsHeaders(request, env, await handleFortuneRoutes(request, env, ctx));
      }

      if (url.pathname === "/api/fusion-fortune" || url.pathname.startsWith("/api/fusion-fortune/")) {
        return withCorsHeaders(request, env, await handleFusionFortuneRoutes(request, env, ctx));
      }

      if (url.pathname === "/api/fortune-chat" || url.pathname.startsWith("/api/fortune-chat/")) {
        return withCorsHeaders(request, env, await handleFortuneChatRoutes(request, env, ctx));
      }

      if (url.pathname === "/api/fortune-tea-house" || url.pathname.startsWith("/api/fortune-tea-house/")) {
        // ctx: consult 생성을 즉시-202 + waitUntil 백그라운드로 돌리기 위해 전달.
        return runAiRouteWithSecurity(request, env, "fortune-tea-house", handleFortuneTeaHouseRoutes, ctx);
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

      // 애니멀 토템 '연이 종합 해설'. /api/tarot 과 같은 성격(회당결제 + 서버 증빙 + 동기 LLM)이라 옆에 둔다.
      if (url.pathname === "/api/animal-totem" || url.pathname.startsWith("/api/animal-totem/")) {
        return withCorsHeaders(request, env, await handleAnimalTotemRoutes(request, env));
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
          message: "프리미엄 통합 PDF 엔드포인트는 제거되었습니다. 인생의 책 전문가 상담은 /life-book-ai에서 시작해 주세요.",
          supported: ["/api/life-book-ai/ensure-access", "/api/life-book-ai/start", "/api/life-book-ai/message"],
        }, { status: 410 }));
      }

      if (url.pathname === "/api/premium-report" || url.pathname.startsWith("/api/premium-report/")) {
        return runWithRouteMetrics("api/premium-report", env, () => jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "premium-report 엔드포인트는 제거되었습니다. 인생의 책 전문가 상담은 /life-book-ai에서 시작해 주세요.",
          supported: ["/api/life-book-ai/ensure-access", "/api/life-book-ai/start", "/api/life-book-ai/message"],
        }, { status: 410 }));
      }

      if (url.pathname === "/api/ziwei-ai" || url.pathname.startsWith("/api/ziwei-ai/")) {
        // ctx: 생성(generate)을 즉시-202 + waitUntil 백그라운드로 돌리기 위해 전달(neo와 동일 패턴).
        return runAiRouteWithSecurity(request, env, "ziwei-ai", handleZiweiAiRoutes, ctx);
      }

      // 심화 자미두수 PDF (ZIWEI_DEEP_PDF)
      if (url.pathname === "/api/ziwei-deep-report" || url.pathname.startsWith("/api/ziwei-deep-report/")) {
        return runAiRouteWithSecurity(request, env, "ziwei-deep-report", handleZiweiDeepReportRoutes);
      }

      if (url.pathname === "/api/master-love-codex" || url.pathname.startsWith("/api/master-love-codex/")) {
        return runAiRouteWithSecurity(request, env, "master-love-codex", handleMasterLoveCodexRoutes);
      }

      if (url.pathname === "/api/ziwei/daehan" || url.pathname.startsWith("/api/ziwei/daehan/")) {
        return withCorsHeaders(request, env, await handleZiweiDaehanRoutes(request, env));
      }

      // 운명의 섬 청사진 (무인증·무DB 순수 계산 — /api/ziwei 툼스톤보다 먼저 매칭될 필요는 없으나 ziwei 계열과 함께 둔다)
      if (url.pathname === "/api/ziwei-island-ai" || url.pathname.startsWith("/api/ziwei-island-ai/")) {
        return runAiRouteWithSecurity(request, env, "ziwei-island-ai", handleZiweiIslandAiRoutes, ctx);
      }

      // ⚠️ 반드시 /api/ziwei-island 블록보다 위 — 접두사가 겹치는 형제 라우트다.
      if (url.pathname === "/api/ziwei-island-report" || url.pathname.startsWith("/api/ziwei-island-report/")) {
        return withCorsHeaders(request, env, await handleZiweiIslandReportRoutes(request, env));
      }

      if (url.pathname === "/api/ziwei-island" || url.pathname.startsWith("/api/ziwei-island/")) {
        return withCorsHeaders(request, env, await handleZiweiIslandRoutes(request, env));
      }

      // ⚠️ 반드시 /api/pet-saju 블록보다 위 — 접두사가 겹치는 형제 라우트다.
      if (url.pathname === "/api/pet-saju-ai" || url.pathname.startsWith("/api/pet-saju-ai/")) {
        return runAiRouteWithSecurity(request, env, "pet-saju-ai", handlePetSajuAiRoutes, ctx);
      }

      // AI 반려동물 사주 청사진 (무인증·무DB 순수 계산)
      if (url.pathname === "/api/pet-saju" || url.pathname.startsWith("/api/pet-saju/")) {
        return withCorsHeaders(request, env, await handlePetSajuRoutes(request, env));
      }

      // ⚠️ 반드시 /api/destiny-compass 블록보다 위 — 접두사가 겹치는 형제 라우트다.
      //    아래에 두면 유료 리포트가 무인증 핸들러로 새어 들어간다.
      if (url.pathname === "/api/destiny-compass-ai" || url.pathname.startsWith("/api/destiny-compass-ai/")) {
        return runAiRouteWithSecurity(request, env, "destiny-compass-ai", handleDestinyCompassAiRoutes, ctx);
      }

      if (url.pathname === "/api/destiny-compass" || url.pathname.startsWith("/api/destiny-compass/")) {
        return withCorsHeaders(request, env, await handleDestinyCompassRoutes(request, env));
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
        return runWithRouteMetrics("api/lifebook-legacy", env, () => jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "이전 인생의 책 생성 경로는 종료되었습니다. 인생의 책 전문가 상담은 /life-book-ai에서 시작해 주세요.",
          supported: ["/api/life-book-ai/ensure-access", "/api/life-book-ai/start", "/api/life-book-ai/message"],
        }, { status: 410 }));
      }

      if (url.pathname === "/api/love-secret-ai" || url.pathname.startsWith("/api/love-secret-ai/")) {
        return runAiRouteWithSecurity(request, env, "love-secret-ai", handleLoveSecretAiRoutes, ctx);
      }

      if (url.pathname === "/api/saju-new-year" || url.pathname.startsWith("/api/saju-new-year/")) {
        return withCorsHeaders(request, env, await handleSajuNewYearRoutes(request, env));
      }
      if (url.pathname === "/api/new-year-ai" || url.pathname.startsWith("/api/new-year-ai/")) {
        return runAiRouteWithSecurity(request, env, "new-year-ai", handleNewYearAiRoutes, ctx);
      }

      if (url.pathname === "/api/karma-destiny-ai" || url.pathname.startsWith("/api/karma-destiny-ai/")) {
        return runAiRouteWithSecurity(request, env, "karma-destiny-ai", handleKarmaDestinyAiRoutes);
      }

      if (url.pathname === "/api/vedic-ai" || url.pathname.startsWith("/api/vedic-ai/")) {
        return runAiRouteWithSecurity(request, env, "vedic-ai", handleVedicAiRoutes);
      }

      if (url.pathname === "/api/neo-operation-room" || url.pathname.startsWith("/api/neo-operation-room/")) {
        return runAiRouteWithSecurity(request, env, "neo-operation-room", handleNeoOperationRoomRoutes, ctx);
      }

      if (url.pathname === "/api/life-book-ai" || url.pathname.startsWith("/api/life-book-ai/")) {
        return runAiRouteWithSecurity(request, env, "life-book-ai", handleLifeBookAiRoutes, ctx);
      }

      if (url.pathname === "/api/guardian" || url.pathname.startsWith("/api/guardian/")) {
        return runAiRouteWithSecurity(request, env, "guardian", handleSajuGuardianImageRoutes);
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
        || url.pathname === "/api/vedic/prepare"
        || url.pathname === "/api/vedic/create-job"
        || url.pathname.startsWith("/api/vedic/pdf/")
        || url.pathname.startsWith("/api/vedic/premium/")
      ) {
        return runWithRouteMetrics("api/vedic", env, () => jsonResponse(request, env, {
          ok: false,
          error: "removed_feature",
          message: "베다점 상담은 /vedic-ai에서 시작해 주세요.",
          next: "/vedic-ai",
        }, { status: 410 }));
      }


      if (
        url.pathname === "/api/astrology-ai"
        || url.pathname.startsWith("/api/astrology-ai/")
      ) {
        return runAiRouteWithSecurity(request, env, "astrology-ai", handleAstrologyAiRoutes, ctx);
      }


      if (
        url.pathname === "/api/sukuyo-compatibility-ai"
        || url.pathname.startsWith("/api/sukuyo-compatibility-ai/")
      ) {
        return runAiRouteWithSecurity(request, env, "sukuyo-compatibility-ai", handleSukuyoCompatibilityAiRoutes);
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

      // 나크샤트라 결정판 전문가 심화 상담(유료·인증) — 동기 생성(숙요/베다 2덱). 무료 라우트보다 먼저 검사한다.
      if (url.pathname === "/api/nakshatra-ai" || url.pathname.startsWith("/api/nakshatra-ai/")) {
        return runAiRouteWithSecurity(request, env, "nakshatra-ai", handleNakshatraAiRoutes, ctx);
      }

      // 나크샤트라 심화 리포트 2종(유료·영구해금) — 결정론 조립. 무료 라우트보다 먼저 검사한다.
      if (url.pathname === "/api/nakshatra-premium" || url.pathname.startsWith("/api/nakshatra-premium/")) {
        return withCorsHeaders(request, env, await handleNakshatraPremiumRoutes(request, env));
      }

      // 나크샤트라 결정판(무료·무인증) — 숙요×나크샤트라 통합 계산.
      if (
        url.pathname === "/api/nakshatra"
        || url.pathname.startsWith("/api/nakshatra/")
      ) {
        return withCorsHeaders(request, env, await handleNakshatraRoutes(request, env));
      }

      if (url.pathname === "/api/pdf/sukyo" || url.pathname.startsWith("/api/pdf/sukyo/")) {
        return withCorsHeaders(request, env, jsonResponse(request, env, {
          ok: false,
          code: "SUKUYO_COMPATIBILITY_PDF_REMOVED",
          message: "숙요점 궁합은 숙요점 궁합 전문가 상담으로 전환되었습니다.",
          next: "/sukuyo-compatibility-ai",
        }, { status: 410 }));
      }

      if (url.pathname === "/api/astrology" || url.pathname.startsWith("/api/astrology/")) {
        return withCorsHeaders(request, env, jsonResponse(request, env, {
          ok: false,
          code: "ASTROLOGY_PDF_REMOVED",
          message: "점성술 상담은 점성술 전문가 상담으로 전환되었습니다.",
          next: "/astrology-ai",
        }, { status: 410 }));
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

      if (url.pathname === "/api/profiles" || url.pathname.startsWith("/api/profiles/")) {
        const rewrittenRequest = rewriteRequestPath(request, url.pathname.replace("/api/profiles", "/api/profile"));
        return withCorsHeaders(request, env, await handleProfileRoutes(rewrittenRequest, env));
      }

      if (url.pathname === "/api/profile" || url.pathname.startsWith("/api/profile/")) {
        return withCorsHeaders(request, env, await handleProfileRoutes(request, env));
      }

      if (url.pathname === "/api/me/access-state") {
        return withCorsHeaders(request, env, await handleAccessStateRoutes(request, env));
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
      const errorName = String(error?.name || "Error");
      const probe = `${errorName} ${String(error?.message || "")}`;
      const transient = /MongoPoolCleared|PoolCleared|MongoNetwork|MongoTimeout|server selection timed out|connection timed out|connection is not ready|ECONNRESET|ETIMEDOUT|EPIPE|ENOTFOUND|ECONNREFUSED/i.test(probe);
      if (transient) {
        return jsonResponse(request, env, {
          ok: false,
          error: "service_unavailable",
          code: "SERVICE_UNAVAILABLE",
          message: "일시적으로 서비스 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
        }, {
          status: 503,
          headers: {
            "X-CF-Worker-Error": "worker_transient_db_error",
            "Retry-After": "2",
          },
        });
      }
      return jsonResponse(request, env, {
        ok: false,
        error: "worker_unhandled_exception",
        code: "INTERNAL_SERVER_ERROR",
        message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        errorName,
      }, {
        status: 500,
        headers: {
          "X-CF-Worker-Error": "worker_unhandled_exception",
        },
      });
    }
  },

  // 🔴 크론이 둘이므로 event.cron 으로 반드시 분기한다. 분기 없이 두면 일일 태스크(운세 발송·구독 정산 등)가
  // 10분마다 돌아 중복 지급이 난다. 알 수 없는 cron 값은 일일 세트로 폴백한다(스케줄을 추가했는데
  // 분기를 빠뜨렸을 때 태스크가 통째로 멈추는 것보다 낫다).
  async scheduled(event, env, ctx) {
    const cron = String(event?.cron || "").trim();

    if (cron === PAYMENT_RECONCILE_CRON) {
      const { runPaymentReconcileTask } = await import("./lib/payment-reconcile-task.js");
      ctx.waitUntil(runPaymentReconcileTask(env).catch((error) => {
        console.error("[payment-reconcile] task failed:", error?.message || error);
      }));
      // V2 자가치유 — 컷오버로 V2 confirm 이 GRANT_PENDING(지급 마무리는 크론 몫) 계약을 쓰기
      // 시작했으므로, 그 집행자를 같은 10분 주기에 함께 돌린다. 경계: V2 는 status:"paid" 주문만,
      // 구 태스크는 레거시 상태 주문만 본다 — 같은 주문의 이중 처리가 구조적으로 없다.
      // 한쪽 실패가 다른 쪽을 죽이지 않도록 각자 waitUntil·catch 로 격리한다.
      const { runPaymentsV2Reconcile } = await import("./payments/index.js");
      ctx.waitUntil(runPaymentsV2Reconcile(env).catch((error) => {
        console.error("[payments-v2-reconcile] task failed:", error?.message || error);
      }));
      return;
    }

    const { runDailyFortuneTask } = await import("./lib/daily-fortune-task.js");
    const { runCardSubscriptionBillingTask } = await import("./lib/subscription-billing-task.js");
    const { runServiceExecutionTimeoutTask } = await import("./lib/service-execution-task.js");
    const { runMonthlyCreditExpiryTask } = await import("./lib/monthly-credit-expiry-task.js");
    // 웹훅 즉시-ack 전환으로 백그라운드 실패/유실된 Transaction.Paid 지급을 재조정한다.
    const { runWebhookReconcileTask } = await import("./routes/payments.js");
    // 🔴 allSettled — 예전 Promise.all 은 한 태스크가 throw 하면(runServiceExecutionTimeoutTask 는 실제로
    // re-throw 한다) 나머지 태스크가 함께 죽었다. 실패는 반드시 로그로 남긴다(조용히 삼키지 않는다).
    const tasks = [
      ["daily-fortune", runDailyFortuneTask],
      ["subscription-billing", runCardSubscriptionBillingTask],
      ["service-execution-timeout", runServiceExecutionTimeoutTask],
      ["monthly-credit-expiry", runMonthlyCreditExpiryTask],
      ["webhook-reconcile", runWebhookReconcileTask],
    ];
    ctx.waitUntil(Promise.allSettled(tasks.map(([name, run]) => Promise.resolve()
      .then(() => run(env))
      .catch((error) => {
        console.error(`[cron:${name}] task failed:`, error?.message || error);
      }))));
  },
};
