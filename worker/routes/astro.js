import { getSwissVedicPlanets, getSwissWesternChart } from "../lib/swiss-ephemeris.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { ASTRO_PREMIUM_CHAPTERS, ASTRO_PREMIUM_FEATURE_KEY } from "../lib/astro-premium-chapters.js";
import { generateAstroPremiumReport, validateAstroPayloadForApi } from "../lib/astro-premium-generator.js";
import { VEDIC_PREMIUM_CHAPTERS, VEDIC_PREMIUM_FEATURE_KEY } from "../lib/vedic-premium-chapters.js";
import { generateVedicPremiumReport, validateVedicPayloadForApi } from "../lib/vedic-premium-generator.js";

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeChartInput(body = {}) {
  return {
    year: toNumber(body.year, NaN),
    month: toNumber(body.month, NaN),
    day: toNumber(body.day, NaN),
    hour: toNumber(body.hour, 12),
    minute: toNumber(body.minute, 0),
    timezone: toNumber(body.timezone, 9),
    lat: toNumber(body.lat, 37.5665),
    lon: toNumber(body.lon ?? body.lng, 126.978),
  };
}

async function handleAstroWesternChart(request, env) {
  const body = await readJson(request);
  const chart = await getSwissWesternChart(env, normalizeChartInput(body), { requestUrl: request.url });
  return json({ ok: true, ...chart });
}

async function handleVedicPlanets(request, env) {
  const body = await readJson(request);
  const result = await getSwissVedicPlanets(env, normalizeChartInput(body), { requestUrl: request.url });
  return json({ ok: true, ...result });
}

function readPremiumAccessToken(request, body = {}) {
  const headerToken = String(request.headers.get("x-premium-access-token") || "").trim();
  if (headerToken) return headerToken;
  return String(body?.premiumAccessToken || body?._premiumAccessToken || "").trim();
}

async function handleAstroPremiumPrepare(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const premiumAccessToken = readPremiumAccessToken(request, body);

  const validation = validateAstroPayloadForApi(body?.astroBase || body);
  if (!validation.ok) {
    return json({
      ok: false,
      code: "MISSING_ASTRO_DATA",
      message: "점성술 계산 데이터가 부족합니다. 기본 점성술 분석을 먼저 완료해 주세요.",
      missing: validation.missing,
    }, { status: 400 });
  }

  const access = await requirePremiumReportAccess(env, auth.userId, "westernAstrologyPremium", {
    reportType: "westernAstrologyPremium",
    featureKey: String(body?.featureKey || ASTRO_PREMIUM_FEATURE_KEY),
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/astro/premium/prepare",
  });

  if (!access?.ok) {
    return json({
      ok: false,
      code: access?.code || "UNAUTHORIZED",
      message: access?.message || "프리미엄 점성술 리포트 접근 권한이 필요합니다.",
    }, { status: Number(access?.status) || 403 });
  }

  const generated = await generateAstroPremiumReport(env, body?.astroBase || body);
  const reportId = `astro-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  return json({
    ok: true,
    featureKey: String(body?.featureKey || ASTRO_PREMIUM_FEATURE_KEY),
    chapterCount: generated.chapterCount,
    fallbackUsed: Boolean(generated.fallbackUsed),
    pdfUrl: "",
    reportId,
    chapters: generated.chapters,
    payload: generated.payload,
    pdfReady: generated.pdfReady,
  });
}

async function handleVedicPremiumPrepare(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const premiumAccessToken = readPremiumAccessToken(request, body);

  const validation = validateVedicPayloadForApi(body?.vedicBase || body);
  if (!validation.ok) {
    return json({
      ok: false,
      code: "MISSING_VEDIC_DATA",
      message: "베다점 계산 데이터가 부족합니다. 라그나와 달 나크샤트라 계산을 먼저 완료해 주세요.",
      missing: validation.missing,
    }, { status: 400 });
  }

  const access = await requirePremiumReportAccess(env, auth.userId, "vedicPremium", {
    reportType: "vedicPremium",
    featureKey: String(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY),
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/vedic/premium/prepare",
  });

  if (!access?.ok) {
    return json({
      ok: false,
      code: access?.code || "UNAUTHORIZED",
      message: access?.message || "베다점 프리미엄 PDF 접근 권한이 필요합니다.",
    }, { status: Number(access?.status) || 403 });
  }

  const generated = await generateVedicPremiumReport(env, body?.vedicBase || body);
  const reportId = `vedic-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  return json({
    ok: true,
    featureKey: String(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY),
    chapterCount: generated.chapterCount,
    fallbackUsed: Boolean(generated.fallbackUsed),
    pdfUrl: "",
    reportId,
    chapters: generated.chapters,
    payload: generated.payload,
    pdfReady: generated.pdfReady,
  });
}

export async function handleAstroRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const pathname = new URL(request.url).pathname;

    if (method === "POST") {
      await requireAuth(request, env);
    }

    if (pathname === "/api/astro" || pathname.startsWith("/api/astro/")) {
      const path = getRoutePath(request, "/api/astro");
      if (path === "/premium/chapters") {
        if (method !== "GET") return methodNotAllowed();
        return json({
          ok: true,
          featureKey: ASTRO_PREMIUM_FEATURE_KEY,
          chapterCount: ASTRO_PREMIUM_CHAPTERS.length,
          chapters: ASTRO_PREMIUM_CHAPTERS,
        });
      }
      if (path === "/premium/prepare") {
        if (method !== "POST") return methodNotAllowed();
        return await handleAstroPremiumPrepare(request, env);
      }
      if (path === "/western-chart") {
        if (method !== "POST") return methodNotAllowed();
        return await handleAstroWesternChart(request, env);
      }
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    if (pathname === "/api/vedic" || pathname.startsWith("/api/vedic/")) {
      const path = getRoutePath(request, "/api/vedic");
      if (path === "/premium/chapters") {
        if (method !== "GET") return methodNotAllowed();
        return json({
          ok: true,
          featureKey: VEDIC_PREMIUM_FEATURE_KEY,
          chapterCount: VEDIC_PREMIUM_CHAPTERS.length,
          chapters: VEDIC_PREMIUM_CHAPTERS,
        });
      }
      if (path === "/premium/prepare") {
        if (method !== "POST") return methodNotAllowed();
        return await handleVedicPremiumPrepare(request, env);
      }
      if (path === "/planets") {
        if (method !== "POST") return methodNotAllowed();
        return await handleVedicPlanets(request, env);
      }
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}
