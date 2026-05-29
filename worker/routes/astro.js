import { getSwissVedicPlanets, getSwissWesternChart } from "../lib/swiss-ephemeris.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { ASTRO_PREMIUM_CHAPTERS, ASTRO_PREMIUM_FEATURE_KEY } from "../lib/astro-premium-chapters.js";
import {
  generateAstroPremiumReport,
  normalizeAstroPremiumBirthInput,
  toSwissChartInputFromBirthInput,
  validateAstroPayloadForApi,
} from "../lib/astro-premium-generator.js";
import { VEDIC_PREMIUM_CHAPTERS, VEDIC_PREMIUM_FEATURE_KEY } from "../lib/vedic-premium-chapters.js";
import { generateVedicPremiumReport, normalizeVedicError, validateVedicPayloadForApi } from "../lib/vedic-premium-generator.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const ASTRO_PREMIUM_LOCK_TTL_MS = 10 * 60 * 1000;
const astroPremiumGenerationLocks = new Map();

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

function toSafeBirthLog(input = {}, chapterCount = 0) {
  return {
    hasBirthDate: Boolean(String(input.birthDate || "").trim()),
    hasBirthTime: Number.isFinite(Number(input.birthHour)),
    birthHour: Number.isFinite(Number(input.birthHour)) ? Number(input.birthHour) : null,
    hasTimezone: Boolean(String(input.timezone || "").trim()),
    hasLocation: Boolean(String(input.birthPlace || "").trim()) || (Number.isFinite(Number(input.latitude)) && Number.isFinite(Number(input.longitude))),
    houseSystemUsed: true,
    chapterCount: Number(chapterCount || 0),
  };
}

function toAstroErrorMeta(error) {
  return {
    code: String(error?.code || "").trim() || null,
    status: Number(error?.status || 0) || null,
    message: String(error?.message || error || "unknown").trim(),
  };
}

function clean(value) {
  return String(value || "").trim();
}

function normalizeAstroError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return {
        message: String(error),
      };
    }
  }

  return {
    message: String(error),
  };
}

function getAstroSessionId(body = {}) {
  const fromBody = clean(body?.sessionId || body?.reportSessionId || body?.generationId);
  if (fromBody) return fromBody.slice(0, 160);
  return `astro-premium:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function compactAstroPremiumLocks(now = Date.now()) {
  for (const [sessionId, state] of astroPremiumGenerationLocks.entries()) {
    const startedAtMs = Number(state?.startedAtMs || 0);
    if (!startedAtMs || now - startedAtMs > ASTRO_PREMIUM_LOCK_TTL_MS) {
      astroPremiumGenerationLocks.delete(sessionId);
    }
  }
}

function toSafeVedicBirthLog(input = {}, chapterCount = 0) {
  return {
    hasBirthDate: Boolean(String(input.birthDate || "").trim()),
    hasBirthTime: Boolean(String(input.birthTime || "").trim()),
    birthHour: Number.isFinite(Number(input.birthHour)) ? Number(input.birthHour) : null,
    hasTimezone: Boolean(String(input.timezone || "").trim()),
    hasLocation: Boolean(String(input.birthPlace || "").trim()) || (Number.isFinite(Number(input.latitude)) && Number.isFinite(Number(input.longitude))),
    chapterCount: Number(chapterCount || 0),
  };
}

function toSafeVedicChartLog(localVedicChartJson = {}) {
  return {
    hasAyanamsa: Boolean(String(localVedicChartJson?.settings?.ayanamsa || "").trim()),
    hasLagna: Boolean(String(localVedicChartJson?.chart?.lagnaSign || "").trim()),
    hasMoonSign: Boolean(String(localVedicChartJson?.chart?.moonSign || "").trim()),
    hasNakshatra: Boolean(String(localVedicChartJson?.chart?.nakshatra?.name || "").trim()),
  };
}

async function handleAstroPremiumPrepare(request, env) {
  let auth = null;
  let body = {};
  let sessionId = "";
  try {
    auth = await requireAuth(request, env);
    body = await readJson(request);
    sessionId = getAstroSessionId(body);
    const premiumAccessToken = readPremiumAccessToken(request, body);
    const featureKey = String(body?.featureKey || ASTRO_PREMIUM_FEATURE_KEY);
    const birthInput = normalizeAstroPremiumBirthInput(body);

    compactAstroPremiumLocks();
    const existingLock = astroPremiumGenerationLocks.get(sessionId);
    if (existingLock?.status === "running") {
      return json({
        ok: true,
        deduped: true,
        status: "running",
        sessionId,
        startedAt: existingLock.startedAt,
      }, { status: 202 });
    }
    if (existingLock?.status === "done" && existingLock?.result) {
      return json({
        ...existingLock.result,
        deduped: true,
        status: "done",
        sessionId,
      });
    }

    astroPremiumGenerationLocks.set(sessionId, {
      sessionId,
      status: "running",
      startedAt: new Date().toISOString(),
      startedAtMs: Date.now(),
      stage: "request-received",
    });

    console.info("[AstroPremiumPDF][RequestReceived]", {
      userId: auth.userId,
      featureKey,
      sessionId,
      ...toSafeBirthLog(birthInput, ASTRO_PREMIUM_CHAPTERS.length),
    });

    const validation = validateAstroPayloadForApi({ birthInput });
    if (!validation.ok) {
      const missingTime = validation.missing.includes("birthHour");
      astroPremiumGenerationLocks.set(sessionId, {
        sessionId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "birth-input-invalid",
      });
      return json({
        ok: false,
        code: "MISSING_ASTRO_DATA",
        message: missingTime
          ? "점성술 PDF는 상승궁과 하우스 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요."
          : "점성술 계산 데이터가 부족합니다. 생년월일/출생정보를 먼저 확인해 주세요.",
        missing: validation.missing,
      }, { status: 422 });
    }

    console.info("[AstroPremiumPDF][BirthInputValidated]", toSafeBirthLog(birthInput, ASTRO_PREMIUM_CHAPTERS.length));
    console.info("[AstroPremiumPDF][LocalCalculationStart]", toSafeBirthLog(birthInput));

    const swissInput = toSwissChartInputFromBirthInput(birthInput);
    let swissChart = {};
    try {
      swissChart = await getSwissWesternChart(env, swissInput, { requestUrl: request.url });
      console.info("[AstroPremiumPDF][LocalCalculationSuccess]", {
        planetCount: Object.keys(swissChart?.planets || {}).length,
        hasAscendant: Boolean(swissChart?.ascendant),
        hasMidheaven: Boolean(swissChart?.midheaven),
        ...toSafeBirthLog(birthInput, ASTRO_PREMIUM_CHAPTERS.length),
      });
    } catch (error) {
      swissChart = {};
      console.warn("[AstroPremiumPDF][LocalCalculationRecovered]", {
        ...toSafeBirthLog(birthInput, ASTRO_PREMIUM_CHAPTERS.length),
        error: toAstroErrorMeta(error),
      });
    }

    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "westernAstrologyPremium", {
      reportType: "westernAstrologyPremium",
      featureKey,
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/astro/premium/prepare",
    });

    if (!access?.ok) {
      astroPremiumGenerationLocks.set(sessionId, {
        sessionId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "access-denied",
      });
      return json({
        ok: false,
        code: access?.code || "UNAUTHORIZED",
        message: access?.message || "프리미엄 점성술 리포트 접근 권한이 필요합니다.",
      }, { status: Number(access?.status) || 403 });
    }

    const executionCtx = buildPremiumExecutionContext({
      serviceKey: "astro-premium",
      reportType: "westernAstrologyPremium",
      userId: auth.userId,
      featureKey,
      sessionId,
      reportId: clean(body?.reportId || body?.accessGrant?.reportId),
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await startPremiumPdfExecution(env, auth.userId, executionCtx);

    const generated = await generateAstroPremiumReport(env, {
      ...body,
      sessionId,
      birthInput,
      swissChart,
      chart: swissChart,
    }, {
      log: (stage, payload) => {
        const tag = `[AstroPremiumPDF][${stage}]`;
        if (stage === "LLMEnhanceFailedUseLocal") {
          console.warn(tag, payload || {});
          return;
        }
        console.info(tag, payload || {});
      },
    });
    if (!generated?.validation?.ok) {
      const error = new Error("점성술 프리미엄 원고 검증에 실패했습니다.");
      error.code = "ASTRO_MANUSCRIPT_INVALID";
      error.status = 422;
      throw error;
    }
    const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `astro-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      chapterCount: generated.chapterCount,
      manuscriptSource: generated.manuscriptSource,
      archive: {
        reportId,
        reportType: "western_astro_book",
        displayName: "점성술",
        title: `${clean(generated?.payload?.profile?.name || body?.name || "사용자")}님의 점성술 리포트`,
        mode: clean(body?.mode || body?.reportMode || "personal"),
        birthName: clean(generated?.payload?.profile?.name || body?.name),
        summary: clean(generated?.chapters?.[0]?.sections?.[0]?.body || "", 1000),
        pdfUrl: clean(generated?.pdfReady?.pdfUrl),
        chapters: generated.chapters,
        payload: generated.payload,
        pdfReady: generated.pdfReady,
        canReopen: true,
        canDownload: Boolean(clean(generated?.pdfReady?.pdfUrl)),
      },
    });

    const responsePayload = {
      ok: true,
      featureKey,
      sessionId,
      status: "completed",
      chapterCount: generated.chapterCount,
      fallbackUsed: Boolean(generated.fallbackUsed),
      pdfUrl: "",
      reportId,
      chapters: generated.chapters,
      payload: generated.payload,
      pdfReady: generated.pdfReady,
      localAstroChartJson: generated.localAstroChartJson,
      validation: generated.validation,
      manuscriptSource: generated.manuscriptSource,
      finalManuscript: generated.finalManuscript,
      totalLength: generated.totalLength,
      localDraftChapterCount: Array.isArray(generated?.finalManuscript) ? generated.finalManuscript.length : 0,
      finalChapterCount: Array.isArray(generated?.chapters) ? generated.chapters.length : 0,
    };

    astroPremiumGenerationLocks.set(sessionId, {
      sessionId,
      status: "done",
      startedAt: new Date().toISOString(),
      startedAtMs: Date.now(),
      stage: "done",
      result: responsePayload,
    });

    return json(responsePayload);
  } catch (error) {
    await failPremiumPdfExecution(
      env,
      auth?.userId,
      buildPremiumExecutionContext({
        serviceKey: "astro-premium",
        reportType: "westernAstrologyPremium",
        userId: auth?.userId,
        featureKey: String(body?.featureKey || ASTRO_PREMIUM_FEATURE_KEY),
        sessionId,
        reportId: clean(body?.reportId || body?.accessGrant?.reportId),
        access: null,
        body,
        timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
      }),
      "astro_generation_failed",
      clean(error?.message || "점성술 프리미엄 PDF 생성에 실패했습니다."),
      "astro-generation",
    );
    if (sessionId) {
      astroPremiumGenerationLocks.set(sessionId, {
        sessionId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "error",
      });
    }
    console.error("[AstroPremiumPDF][Error]", {
      ...toAstroErrorMeta(error),
      details: normalizeAstroError(error),
    });
    throw error;
  }
}

async function handleVedicPremiumPrepare(request, env) {
  let auth = null;
  let body = {};
  try {
    auth = await requireAuth(request, env);
    body = await readJson(request);
    const premiumAccessToken = readPremiumAccessToken(request, body);
    const featureKey = String(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY);

    console.info("[VedicPremiumPDF][RequestReceived]", {
      userId: auth.userId,
      featureKey,
      hasPremiumAccessToken: Boolean(premiumAccessToken),
    });

    const validation = validateVedicPayloadForApi(body?.vedicBase || body);
    if (!validation.ok) {
      console.error("[VedicPremiumPDF][Error]", {
        code: String(validation?.code || "MISSING_VEDIC_DATA"),
        message: String(validation?.message || "베다점 계산 데이터가 부족합니다."),
        ...toSafeVedicBirthLog(validation?.birthInput, VEDIC_PREMIUM_CHAPTERS.length),
      });
      return json({
        ok: false,
        code: validation?.code || "MISSING_VEDIC_DATA",
        message: validation?.message || "베다점 계산 데이터가 부족합니다. 라그나와 달 나크샤트라 계산을 먼저 완료해 주세요.",
        missing: validation?.missing || [],
      }, { status: 422 });
    }

    console.info("[VedicPremiumPDF][BirthInputValidated]", {
      ...toSafeVedicBirthLog(validation?.birthInput, VEDIC_PREMIUM_CHAPTERS.length),
      ...toSafeVedicChartLog(validation?.localVedicChartJson),
    });

    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "vedicPremium", {
      reportType: "vedicPremium",
      featureKey,
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/vedic/premium/prepare",
    });

    if (!access?.ok) {
      console.error("[VedicPremiumPDF][Error]", {
        code: String(access?.code || "UNAUTHORIZED"),
        message: String(access?.message || "베다점 프리미엄 PDF 접근 권한이 필요합니다."),
        ...toSafeVedicBirthLog(validation?.birthInput, VEDIC_PREMIUM_CHAPTERS.length),
      });
      return json({
        ok: false,
        code: access?.code || "UNAUTHORIZED",
        message: access?.message || "베다점 프리미엄 PDF 접근 권한이 필요합니다.",
      }, { status: Number(access?.status) || 403 });
    }

    const executionCtx = buildPremiumExecutionContext({
      serviceKey: "vedic-premium",
      reportType: "vedicPremium",
      userId: auth.userId,
      featureKey,
      sessionId: clean(body?.sessionId || body?.reportSessionId || body?.generationId),
      reportId: clean(body?.reportId || body?.accessGrant?.reportId),
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await startPremiumPdfExecution(env, auth.userId, executionCtx);

    const generated = await generateVedicPremiumReport(env, body?.vedicBase || body, {
      log: (stage, payload) => {
        const tag = `[VedicPremiumPDF][${stage}]`;
        if (stage === "LLMEnhanceFailedUseLocal") {
          console.warn(tag, payload || {});
          return;
        }
        console.info(tag, payload || {});
      },
    });
    if (!generated?.diagnostics?.manuscript?.ok) {
      const error = new Error("베다점 프리미엄 원고 검증에 실패했습니다.");
      error.code = "VEDIC_MANUSCRIPT_INVALID";
      error.status = 422;
      throw error;
    }
    const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `vedic-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    const vedicSessionId = clean(body?.sessionId || body?.reportSessionId || body?.generationId) || `vedic-premium:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      chapterCount: generated.chapterCount,
      manuscriptSource: generated.manuscriptSource,
      archive: {
        reportId,
        reportType: "vedic_book",
        displayName: "베다점",
        title: `${clean(generated?.payload?.profile?.name || body?.name || "사용자")}님의 베다점 리포트`,
        mode: clean(body?.mode || body?.reportMode || "personal"),
        birthName: clean(generated?.payload?.profile?.name || body?.name),
        summary: clean(generated?.chapters?.[0]?.sections?.[0]?.body || "", 1000),
        pdfUrl: clean(generated?.pdfReady?.pdfUrl),
        chapters: generated.chapters,
        payload: generated.payload,
        pdfReady: generated.pdfReady,
        canReopen: true,
        canDownload: Boolean(clean(generated?.pdfReady?.pdfUrl)),
      },
    });

    return json({
      ok: true,
      featureKey,
      status: "completed",
      sessionId: vedicSessionId,
      chapterCount: generated.chapterCount,
      fallbackUsed: Boolean(generated.fallbackUsed),
      pdfUrl: "",
      reportId,
      chapters: generated.chapters,
      payload: generated.payload,
      pdfReady: generated.pdfReady,
      quality: generated.quality,
      manuscriptSource: generated.manuscriptSource,
      localDraftChapterCount: Array.isArray(generated?.localDraft?.chapters) ? generated.localDraft.chapters.length : 0,
      finalChapterCount: Array.isArray(generated?.chapters) ? generated.chapters.length : 0,
    });
  } catch (error) {
    await failPremiumPdfExecution(
      env,
      auth?.userId,
      buildPremiumExecutionContext({
        serviceKey: "vedic-premium",
        reportType: "vedicPremium",
        userId: auth?.userId,
        featureKey: String(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY),
        sessionId: clean(body?.sessionId || body?.reportSessionId || body?.generationId),
        reportId: clean(body?.reportId || body?.accessGrant?.reportId),
        access: null,
        body,
        timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
      }),
      "vedic_generation_failed",
      clean(error?.message || "베다점 프리미엄 PDF 생성에 실패했습니다."),
      "vedic-generation",
    );
    console.error("[VedicPremiumPDF][Error]", {
      code: String(error?.code || "VEDIC_PREMIUM_GENERATION_FAILED"),
      message: String(error?.message || "베다점 프리미엄 PDF 생성에 실패했습니다."),
      status: Number(error?.status || 500),
      details: normalizeVedicError(error),
    });
    throw error;
  }
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
