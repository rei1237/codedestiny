import { getSwissVedicPlanets, getSwissWesternChart } from "../lib/swiss-ephemeris.js";
import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { ASTRO_PREMIUM_CHAPTERS, ASTRO_PREMIUM_FEATURE_KEY } from "../lib/astro-premium-chapters.js";
import {
  generateAstroPremiumReport,
  normalizeAstroPremiumBirthInput,
  validateAstroPayloadForApi,
} from "../lib/astro-premium-generator.js";
import { VEDIC_PREMIUM_CHAPTERS, VEDIC_PREMIUM_FEATURE_KEY } from "../lib/vedic-premium-chapters.js";
import {
  generateVedicPremiumReport,
  normalizeVedicError,
  normalizeVedicPremiumBirthInput,
  validateVedicBirthInput,
} from "../lib/vedic-premium-generator.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const ASTRO_PREMIUM_LOCK_TTL_MS = 10 * 60 * 1000;
const astroPremiumGenerationLocks = new Map();
const VEDIC_PREMIUM_LOCK_TTL_MS = 10 * 60 * 1000;
const vedicPremiumGenerationLocks = new Map();

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
  return String(body?.premiumAccessToken || body?._premiumAccessToken || cookieValue(request, "cd_premium_access") || "").trim();
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

function getVedicSessionId(body = {}) {
  const fromBody = clean(body?.sessionId || body?.reportSessionId || body?.generationId);
  if (fromBody) return fromBody.slice(0, 160);
  return `vedic-premium:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function compactVedicPremiumLocks(now = Date.now()) {
  for (const [sessionId, state] of vedicPremiumGenerationLocks.entries()) {
    const startedAtMs = Number(state?.startedAtMs || 0);
    if (!startedAtMs || now - startedAtMs > VEDIC_PREMIUM_LOCK_TTL_MS) {
      vedicPremiumGenerationLocks.delete(sessionId);
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

function toVedicTimezoneOffset(timezoneValue) {
  const raw = clean(timezoneValue);
  if (!raw) return 9;
  const direct = Number(raw);
  if (Number.isFinite(direct)) return direct;
  const token = raw.toLowerCase();
  if (token === "asia/seoul" || token === "asia/tokyo") return 9;
  if (token === "utc" || token === "etc/utc" || token === "gmt") return 0;
  return 9;
}

function normalizeVedicChartSourceForPdf(chartSource = {}) {
  return {
    planets: chartSource?.planets && typeof chartSource.planets === "object" ? chartSource.planets : {},
    retrograde: chartSource?.retrograde && typeof chartSource.retrograde === "object" ? chartSource.retrograde : {},
    ayanamsaName: clean(chartSource?.ayanamsaName || chartSource?.ayanamsaType || "Lahiri") || "Lahiri",
    ayanamsa: Number.isFinite(Number(chartSource?.ayanamsa)) ? Number(chartSource.ayanamsa) : undefined,
    ascendantSidereal: Number.isFinite(Number(chartSource?.ascendantSidereal ?? chartSource?.ascendant ?? chartSource?.lagnaLongitude))
      ? Number(chartSource?.ascendantSidereal ?? chartSource?.ascendant ?? chartSource?.lagnaLongitude)
      : null,
    source: clean(chartSource?.source || "server-local"),
  };
}

function hasUsableVedicChartSource(chartSource = {}) {
  const source = normalizeVedicChartSourceForPdf(chartSource);
  const requiredPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];
  const hasAllPlanets = requiredPlanets.every((planet) => Number.isFinite(Number(source?.planets?.[planet])));
  const hasAsc = Number.isFinite(Number(source?.ascendantSidereal));
  return hasAllPlanets && hasAsc;
}

function extractProvidedVedicBase(rawInput = {}) {
  const candidates = [
    rawInput?.vedicBase?.chart,
    rawInput?.vedicBase,
    rawInput?.chart,
    rawInput?.localVedicChartJson,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      if (candidate?.planets || candidate?.ascendantSidereal || candidate?.lagnaLongitude || candidate?.ascendant) {
        return candidate;
      }
    }
  }
  return null;
}

function toSwissVedicInputFromBirthInput(birthInput = {}) {
  return {
    year: Number(birthInput?.birthYear),
    month: Number(birthInput?.birthMonth),
    day: Number(birthInput?.birthDay),
    hour: Number(birthInput?.birthHour),
    minute: Number.isFinite(Number(birthInput?.birthMinute)) ? Number(birthInput.birthMinute) : 0,
    timezone: toVedicTimezoneOffset(birthInput?.timezone),
    lat: Number.isFinite(Number(birthInput?.latitude)) ? Number(birthInput.latitude) : 37.5665,
    lon: Number.isFinite(Number(birthInput?.longitude)) ? Number(birthInput.longitude) : 126.978,
  };
}

async function resolveVedicChartForPremiumPdf(rawInput, birthInput, env, requestUrl) {
  const provided = extractProvidedVedicBase(rawInput);
  if (provided && hasUsableVedicChartSource(provided)) {
    return {
      source: "provided",
      chartSource: normalizeVedicChartSourceForPdf(provided),
    };
  }

  const calculated = await getSwissVedicPlanets(env, toSwissVedicInputFromBirthInput(birthInput), { requestUrl });
  return {
    source: "server-local",
    chartSource: normalizeVedicChartSourceForPdf(calculated),
  };
}

async function handleAstroPremiumPrepare(request, env) {
  let auth = null;
  let body = {};
  let sessionId = "";
  try {
    auth = await requireAuth(request, env);
    body = await readJson(request);
    sessionId = getAstroSessionId({
      ...body,
      sessionId: clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId),
      reportSessionId: clean(body?.reportSessionId || body?.accessGrant?.reportSessionId || body?.accessGrant?.sessionId),
    });
    const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `astro-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    const premiumAccessToken = readPremiumAccessToken(request, body);
    const featureKey = clean(body?.featureKey || ASTRO_PREMIUM_FEATURE_KEY) || ASTRO_PREMIUM_FEATURE_KEY;
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

    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "westernAstrologyPremium", {
      ...body,
      reportType: "westernAstrologyPremium",
      featureKey,
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/astro/premium/prepare",
    });

    if (!access?.ok) {
      const status = Number(access?.status || 402);
      const hasSessionId = Boolean(clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId));
      const hasPurchaseId = Boolean(clean(body?.purchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId));
      const hasRequestId = Boolean(clean(body?.requestId || body?.accessGrant?.requestId || body?.payment?.requestId || body?._paymentContext?.requestId));
      const hasPaymentToken = Boolean(premiumAccessToken);
      const paymentConfirmedButMissing = status === 402 && (hasSessionId || hasPurchaseId || hasRequestId || hasPaymentToken);
      const message = status === 401
        ? "로그인 후 점성술 PDF를 생성할 수 있습니다."
        : paymentConfirmedButMissing
          ? "결제는 확인되었지만 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
          : status === 402
            ? "프리미엄 PDF 생성 권한이 필요합니다."
            : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      astroPremiumGenerationLocks.set(sessionId, {
        sessionId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "access-denied",
      });
      return json({
        ok: false,
        code: paymentConfirmedButMissing ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING" : (access?.code || "PAYMENT_REQUIRED"),
        message,
        debugSafe: {
          featureKey,
          hasSessionId,
          hasPurchaseId,
          hasRequestId,
          hasPaymentToken,
        },
      }, { status });
    }

    const executionCtx = buildPremiumExecutionContext({
      serviceKey: "astro-premium",
      reportType: "westernAstrologyPremium",
      userId: auth.userId,
      featureKey,
      sessionId,
      reportId,
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await startPremiumPdfExecution(env, auth.userId, executionCtx);

    const generated = await generateAstroPremiumReport(env, {
      ...body,
      sessionId,
      birthInput,
    }, {
      requestUrl: request.url,
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
    const requestOrigin = new URL(request.url).origin;
    const archiveUrl = `${requestOrigin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`;
    const pdfReady = {
      ...(generated?.pdfReady || {}),
      pdfUrl: clean(generated?.pdfReady?.pdfUrl || generated?.pdfReady?.downloadUrl || archiveUrl),
      htmlUrl: clean(generated?.pdfReady?.htmlUrl || archiveUrl),
      downloadUrl: clean(generated?.pdfReady?.downloadUrl || generated?.pdfReady?.pdfUrl || generated?.pdfReady?.htmlUrl || archiveUrl),
      storageKey: clean(generated?.pdfReady?.storageKey || `premium-archive:astro:${reportId}`),
      mimeType: clean(generated?.pdfReady?.mimeType || "text/html"),
    };

    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      chapterCount: generated.chapterCount,
      manuscriptSource: generated.manuscriptSource,
      archive: {
        reportId,
        reportType: "western_astrology_book",
        displayName: "점성술",
        title: `${clean(generated?.payload?.profile?.name || body?.name || "사용자")}님의 점성술 코즈믹 차트`,
        mode: clean(body?.mode || body?.reportMode || "personal"),
        birthName: clean(generated?.payload?.profile?.name || body?.name),
        summary: clean(generated?.finalManuscript?.[0]?.sections?.[0]?.body || generated?.chapters?.[0]?.categories?.[0]?.text || "", 1000),
        pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
        htmlUrl: clean(pdfReady?.htmlUrl),
        chapters: generated.chapters,
        chapterDrafts: generated.finalManuscript,
        payload: generated.payload,
        localAstroChartJson: generated.localAstroChartJson,
        pdfReady,
        canReopen: true,
        canDownload: Boolean(clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl)),
      },
    });

    const responsePayload = {
      ok: true,
      serviceKey: "astro-premium",
      featureKey,
      sessionId,
      status: "completed",
      chapterCount: generated.chapterCount,
      fallbackUsed: false,
      reportId,
      chapters: generated.chapters,
      chapterDrafts: generated.finalManuscript,
      payload: generated.payload,
      pdfReady,
      pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
      htmlUrl: clean(pdfReady?.htmlUrl),
      canReopen: true,
      canDownload: Boolean(clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl)),
      localAstroChartJson: generated.localAstroChartJson,
      validation: generated.validation,
      manuscriptSource: "local-only",
      quality: generated.quality,
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
    try {
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
    } catch (failErr) {
      console.error("[AstroPremiumPDF][ErrorFailPdfExecution]", {
        reason: clean(failErr?.message || failErr),
      });
    }
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
    const rawMessage = clean(error?.message || "점성술 프리미엄 PDF 생성에 실패했습니다.");
    const userFacingMessage = rawMessage.includes("태어난 시간") || rawMessage.includes("birth")
      ? "점성술 PDF 생성에 필요한 출생시 정보가 부족합니다. 프로필 카드에서 태어난 시간을 확인해 주세요."
      : rawMessage.includes("원고") || rawMessage.includes("검증")
        ? "생성된 점성술 원고가 품질 기준을 통과하지 못했습니다. 잠시 후 다시 시도해 주세요."
        : rawMessage.includes("Swiss") || rawMessage.includes("차트")
          ? "점성술 차트 계산 중 일시적 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
          : "점성술 PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return json({
      ok: false,
      code: error?.code || "ASTRO_PREMIUM_GENERATION_FAILED",
      message: userFacingMessage,
      debugSafe: {
        stage: "local-only-generation",
        sessionId,
        reportId: clean(body?.reportId || body?.accessGrant?.reportId),
        originalCode: error?.code || null,
      },
    }, { status: Number(error?.status || 500) });
  }
}

async function handleVedicPremiumPrepare(request, env) {
  let auth = null;
  let body = {};
  let birthInput = {};
  let executionCtx = null;
  let vedicSessionId = "";
  try {
    auth = await requireAuth(request, env);
    body = await readJson(request);
    vedicSessionId = getVedicSessionId(body);
    const premiumAccessToken = readPremiumAccessToken(request, body);
    const featureKey = String(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY);
    birthInput = normalizeVedicPremiumBirthInput(body);

    compactVedicPremiumLocks();
    const existingLock = vedicPremiumGenerationLocks.get(vedicSessionId);
    if (existingLock?.status === "running") {
      return json({
        ok: true,
        deduped: true,
        status: "running",
        sessionId: vedicSessionId,
        startedAt: existingLock.startedAt,
      }, { status: 202 });
    }
    if (existingLock?.status === "done" && existingLock?.result) {
      return json({
        ...existingLock.result,
        deduped: true,
        status: "done",
        sessionId: vedicSessionId,
      });
    }

    vedicPremiumGenerationLocks.set(vedicSessionId, {
      sessionId: vedicSessionId,
      status: "running",
      startedAt: new Date().toISOString(),
      startedAtMs: Date.now(),
      stage: "request-received",
    });

    console.info("[VedicPremiumPDF][RequestReceived]", {
      userId: auth.userId,
      featureKey,
      hasPremiumAccessToken: Boolean(premiumAccessToken),
    });

    const birthValidation = validateVedicBirthInput(birthInput);
    if (!birthValidation.ok) {
      vedicPremiumGenerationLocks.set(vedicSessionId, {
        sessionId: vedicSessionId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "birth-input-invalid",
      });
      console.error("[VedicPremiumPDF][Error]", {
        code: "BIRTH_INPUT_INVALID",
        message: String(birthValidation?.message || "출생 정보가 올바르지 않습니다."),
        ...toSafeVedicBirthLog(birthInput, VEDIC_PREMIUM_CHAPTERS.length),
      });
      return json({
        ok: false,
        code: "BIRTH_INPUT_INVALID",
        message: birthValidation?.message || "베다 차트 계산을 완료하지 못했습니다. 출생 정보와 지역 정보를 확인해 주세요.",
        missing: birthValidation?.hardFail || [],
      }, { status: 422 });
    }

    console.info("[VedicPremiumPDF][BirthInputValidated]", toSafeVedicBirthLog(birthInput, VEDIC_PREMIUM_CHAPTERS.length));

    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "vedicPremium", {
      reportType: "vedicPremium",
      featureKey,
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/vedic/premium/prepare",
    });

    if (!access?.ok) {
      vedicPremiumGenerationLocks.set(vedicSessionId, {
        sessionId: vedicSessionId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "access-denied",
      });
      console.error("[VedicPremiumPDF][Error]", {
        code: String(access?.code || "UNAUTHORIZED"),
        message: String(access?.message || "베다점 프리미엄 PDF 접근 권한이 필요합니다."),
        ...toSafeVedicBirthLog(birthInput, VEDIC_PREMIUM_CHAPTERS.length),
      });
      return json({
        ok: false,
        code: access?.code || "UNAUTHORIZED",
        message: access?.message || "베다점 프리미엄 PDF 접근 권한이 필요합니다.",
      }, { status: Number(access?.status) || 403 });
    }

    executionCtx = buildPremiumExecutionContext({
      serviceKey: "vedic-premium",
      reportType: "vedicPremium",
      userId: auth.userId,
      featureKey,
      sessionId: vedicSessionId,
      reportId: clean(body?.reportId || body?.accessGrant?.reportId),
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await startPremiumPdfExecution(env, auth.userId, executionCtx);

    const resolved = await resolveVedicChartForPremiumPdf(body, birthInput, env, request.url);
    if (!hasUsableVedicChartSource(resolved?.chartSource)) {
      const error = new Error("베다 차트 계산을 완료하지 못했습니다. 출생 정보와 지역 정보를 확인해 주세요.");
      error.code = "VEDIC_CHART_SOURCE_INVALID";
      error.status = 422;
      throw error;
    }

    const preparedPayload = {
      ...body,
      birthInput,
      vedicBase: {
        ...(body?.vedicBase && typeof body.vedicBase === "object" ? body.vedicBase : {}),
        birthInput,
        chart: resolved.chartSource,
      },
    };

    const generated = await generateVedicPremiumReport(env, preparedPayload, {
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
    const requestOrigin = new URL(request.url).origin;
    const archiveUrl = `${requestOrigin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`;
    const pdfReady = {
      ...(generated?.pdfReady || {}),
      pdfUrl: clean(generated?.pdfReady?.pdfUrl || generated?.pdfReady?.downloadUrl || archiveUrl),
      htmlUrl: clean(generated?.pdfReady?.htmlUrl || archiveUrl),
      downloadUrl: clean(generated?.pdfReady?.downloadUrl || generated?.pdfReady?.pdfUrl || generated?.pdfReady?.htmlUrl || archiveUrl),
      storageKey: clean(generated?.pdfReady?.storageKey || `premium-archive:vedic:${reportId}`),
      mimeType: clean(generated?.pdfReady?.mimeType || "text/html"),
    };

    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      chapterCount: generated.chapterCount,
      manuscriptSource: generated.manuscriptSource,
      archive: {
        reportId,
        reportType: "vedic_book",
        displayName: "베다점",
        title: `${clean(birthInput?.name || generated?.payload?.profile?.name || body?.name || "사용자")}님의 베다점 리포트`,
        mode: clean(body?.mode || body?.reportMode || "personal"),
        birthName: clean(birthInput?.name || generated?.payload?.profile?.name || body?.name),
        summary: clean(generated?.chapterDrafts?.[0]?.sections?.[0]?.body || generated?.chapters?.[0]?.categories?.[0]?.body || "", 1000),
        pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
        htmlUrl: clean(pdfReady?.htmlUrl),
        chapters: generated.chapters,
        chapterDrafts: generated.chapterDrafts,
        payload: generated.payload,
        localVedicChartJson: generated.localVedicChartJson,
        pdfReady,
        canReopen: true,
        canDownload: Boolean(clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl)),
      },
    });

    const responsePayload = {
      ok: true,
      serviceKey: "vedic-premium",
      featureKey,
      status: "completed",
      sessionId: vedicSessionId,
      chapterCount: generated.chapterCount,
      fallbackUsed: false,
      reportId,
      chapters: generated.chapters,
      chapterDrafts: generated.chapterDrafts,
      payload: generated.payload,
      localVedicChartJson: generated.localVedicChartJson,
      pdfReady,
      pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
      htmlUrl: clean(pdfReady?.htmlUrl),
      canReopen: true,
      canDownload: Boolean(clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl)),
      quality: generated.quality,
      manuscriptSource: "local-only",
      localDraftChapterCount: Array.isArray(generated?.localDraft?.chapters) ? generated.localDraft.chapters.length : 0,
      finalChapterCount: Array.isArray(generated?.chapters) ? generated.chapters.length : 0,
    };

    vedicPremiumGenerationLocks.set(vedicSessionId, {
      sessionId: vedicSessionId,
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
      executionCtx || buildPremiumExecutionContext({
        serviceKey: "vedic-premium",
        reportType: "vedicPremium",
        userId: auth?.userId,
        featureKey: String(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY),
        sessionId: vedicSessionId || clean(body?.sessionId || body?.reportSessionId || body?.generationId),
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
    if (vedicSessionId) {
      vedicPremiumGenerationLocks.set(vedicSessionId, {
        sessionId: vedicSessionId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "error",
      });
    }
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
