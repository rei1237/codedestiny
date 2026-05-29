import { Solar } from "lunar-javascript";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import {
  SUKYO_PDF_ALIAS_FEATURE_KEY,
  SUKYO_PDF_CHAPTER_COUNT,
  SUKYO_PDF_CHAPTERS,
  SUKYO_PDF_FEATURE_KEY,
  buildSukyoPdfSeed,
  generateSukyoPremiumReport,
  validateSukyoPdfInput,
} from "../lib/sukyo-pdf.js";
import { buildCanonicalSukuyoCompatibility, buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const SUKUYO_SESSION_LOCK_TTL_MS = 20 * 60 * 1000;
const sukuyoPdfGenerationLocks = new Map();

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function toNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSukuyoError(error) {
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

function getSukuyoSessionId(body = {}) {
  const raw = clean(body?.sessionId || body?.requestId || body?.reportId);
  return raw || `sukyo-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanupExpiredSukuyoLocks() {
  const now = Date.now();
  for (const [key, value] of sukuyoPdfGenerationLocks.entries()) {
    const startedAtMs = Date.parse(value?.startedAt || "") || 0;
    if (startedAtMs <= 0 || now - startedAtMs > SUKUYO_SESSION_LOCK_TTL_MS) {
      sukuyoPdfGenerationLocks.delete(key);
    }
  }
}

function parseDateParts(value) {
  const raw = clean(value);
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = toNumber(match[1]);
  const month = toNumber(match[2]);
  const day = toNumber(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

const KOREAN_HOUR_MAP = {
  자시: 23,
  축시: 1,
  인시: 3,
  묘시: 5,
  진시: 7,
  사시: 9,
  오시: 11,
  미시: 13,
  신시: 15,
  유시: 17,
  술시: 19,
  해시: 21,
};

function parseTimeParts(value) {
  const raw = clean(value);
  const lower = raw.toLowerCase();

  if (!raw || /모름|unknown/.test(lower)) {
    return { hour: 12, minute: 0, hasTime: false, isTimeUnknown: true, normalizedTime: "" };
  }

  if (Number.isFinite(KOREAN_HOUR_MAP[raw])) {
    const hour = KOREAN_HOUR_MAP[raw];
    return { hour, minute: 0, hasTime: true, isTimeUnknown: false, normalizedTime: `${String(hour).padStart(2, "0")}:00` };
  }

  let hour = null;
  let minute = 0;

  const hhmm = lower.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (hhmm) {
    hour = Number(hhmm[1]);
    minute = Number(hhmm[2] || "0");
  }

  const korean = lower.match(/^(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?$/);
  if (korean) {
    const base = Number(korean[2]);
    const isPm = korean[1] === "오후";
    hour = base % 12;
    if (isPm) hour += 12;
    minute = Number(korean[3] || "0");
  }

  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return { hour: 12, minute: 0, hasTime: false, isTimeUnknown: true, normalizedTime: "" };
  }

  return {
    hour,
    minute,
    hasTime: true,
    isTimeUnknown: false,
    normalizedTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function normalizeGender(raw) {
  const token = clean(raw).toLowerCase();
  if (["m", "male", "man", "남", "남성"].includes(token)) return "male";
  if (["f", "female", "woman", "여", "여성"].includes(token)) return "female";
  return "unknown";
}

function normalizeCalendarType(raw) {
  const token = clean(raw).toLowerCase();
  if (token.includes("solar") || token.includes("양")) return "solar";
  if (token.includes("lunar") || token.includes("음")) return "lunar";
  return "unknown";
}

function normalizePersonInput(raw = {}, fallbackName = "사용자") {
  const profile = raw.profile && typeof raw.profile === "object" ? raw.profile : raw;
  const birthDate = clean(
    profile.birthDate
      || profile.birthday
      || profile.solarDate
      || profile.lunarDate
      || profile.date
      || profile.partnerBirth
      || profile.partnerBirthDate
      || profile.targetBirth
      || profile.targetDate,
  );

  const date = parseDateParts(birthDate);
  const time = parseTimeParts(
    profile.birthTime
      || profile.time
      || profile.partnerTime
      || profile.hour
      || profile.birth_hour,
  );

  return {
    name: clean(profile.name || profile.label || fallbackName),
    gender: normalizeGender(profile.gender || profile.sex),
    calendarType: normalizeCalendarType(profile.calendarType || profile.calType),
    birthDate,
    birthYear: date?.year ?? null,
    birthMonth: date?.month ?? null,
    birthDay: date?.day ?? null,
    birthTime: time.normalizedTime,
    birthHour: time.hasTime ? time.hour : null,
    birthMinute: time.hasTime ? time.minute : null,
    timezone: clean(profile.timezone || "Asia/Seoul") || "Asia/Seoul",
    isTimeUnknown: time.isTimeUnknown,
  };
}

function toLunarBirth(person) {
  if (!Number.isFinite(person.birthYear) || !Number.isFinite(person.birthMonth) || !Number.isFinite(person.birthDay)) {
    throw Object.assign(new Error("두 사람의 생년월일을 정확히 입력해 주세요."), { status: 400, code: "SUKUYO_MISSING_BIRTH" });
  }

  if (person.calendarType === "lunar") {
    return {
      lunarYear: person.birthYear,
      lunarMonth: person.birthMonth,
      lunarDay: person.birthDay,
      isLeapMonth: false,
      source: "user-lunar-input",
    };
  }

  const hour = Number.isFinite(person.birthHour) ? person.birthHour : 12;
  const minute = Number.isFinite(person.birthMinute) ? person.birthMinute : 0;
  const solar = Solar.fromYmdHms(person.birthYear, person.birthMonth, person.birthDay, hour, minute, 0);
  const lunar = solar.getLunar();
  const lunarMonth = Number(lunar.getMonth());

  return {
    lunarYear: Number(lunar.getYear()),
    lunarMonth: Math.abs(lunarMonth),
    lunarDay: Number(lunar.getDay()),
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  };
}

function buildPersonSukuyo(person) {
  const lunar = toLunarBirth(person);
  const sukuyo = buildSukuyoFromLunar(lunar.lunarMonth, lunar.lunarDay, {
    isLeapMonth: lunar.isLeapMonth,
    source: lunar.source,
  });
  if (!sukuyo) {
    throw Object.assign(new Error("숙요점 27숙 계산에 실패했습니다."), { status: 422, code: "SUKUYO_CALC_FAILED" });
  }
  return { ...sukuyo, lunarYear: lunar.lunarYear };
}

function normalizeCompatibilityInput(body = {}) {
  const mode = "compatibility";
  const self = normalizePersonInput(body.self || body.user || body.userProfile || body.birthInput || {}, "사용자");
  const partner = normalizePersonInput(body.partner || body.partnerProfile || body.partnerInput || {}, "상대방");
  return { mode, self, partner };
}

function buildSukuyoSeedFromCompatibility(input = {}) {
  const selfSukuyo = buildPersonSukuyo(input.self);
  const partnerSukuyo = buildPersonSukuyo(input.partner);

  const canonical = buildCanonicalSukuyoCompatibility({
    reportType: "compatibility",
    personAName: input.self.name,
    personBName: input.partner.name,
    personAInput: {
      year: input.self.birthYear,
      month: input.self.birthMonth,
      day: input.self.birthDay,
      hour: input.self.birthHour,
      minute: input.self.birthMinute,
    },
    personBInput: {
      year: input.partner.birthYear,
      month: input.partner.birthMonth,
      day: input.partner.birthDay,
      hour: input.partner.birthHour,
      minute: input.partner.birthMinute,
    },
    personASukuyo: selfSukuyo,
    personBSukuyo: partnerSukuyo,
    calendarSource: "lunar-javascript",
    methodVersion: "sukyo-premium-compat-v2",
  });

  if (!canonical?.validation?.hasPersonAHost || !canonical?.validation?.hasPersonBHost || !canonical?.validation?.hasRelationType) {
    throw Object.assign(new Error("숙요점 궁합 계산 필수값이 부족합니다."), {
      status: 422,
      code: "SUKUYO_PDF_MISSING_FIELDS",
      missing: canonical?.validation?.missingFields || [],
    });
  }

  return buildSukyoPdfSeed({
    mode: "compatibility",
    userProfile: input.self,
    partnerProfile: input.partner,
    userSukyo: canonical.personA?.sukuyo,
    partnerSukyo: canonical.personB?.sukuyo,
    canonical,
  });
}

function readPremiumAccessToken(request, body = {}) {
  const headerToken = clean(request.headers.get("x-premium-access-token"));
  if (headerToken) return headerToken;
  return clean(body?.premiumAccessToken || body?._premiumAccessToken || body?.accessToken);
}

async function handleSukuyoPremiumPreflight(request) {
  const body = await readJson(request);
  const input = normalizeCompatibilityInput(body);

  const validation = validateSukyoPdfInput({
    mode: "compatibility",
    self: input.self,
    partner: input.partner,
    sukuyoResult: { relationshipType: "preflight" },
  });

  if (!validation.canGenerate) {
    return json({
      ok: false,
      code: "SUKUYO_INVALID_INPUT_BEFORE_PAYMENT",
      message: "두 사람의 생년월일을 정확히 입력해 주세요.",
      hardMissingFields: validation.hardMissingFields,
      softMissingFields: validation.softMissingFields,
    }, { status: 400 });
  }

  const seed = buildSukuyoSeedFromCompatibility(input);
  return json({
    ok: true,
    mode: "compatibility",
    input,
    dryRun: {
      selfStarReady: Boolean(clean(seed?.userSukyo?.nameKo)),
      partnerStarReady: Boolean(clean(seed?.partnerSukyo?.nameKo)),
      relationType: clean(seed?.compatibility?.relationType),
      distance: clean(seed?.compatibility?.distanceLabel),
      chapterCount: SUKYO_PDF_CHAPTER_COUNT,
    },
  });
}

async function handleSukuyoPremiumPrepare(request, env) {
  console.log("[SukuyoPremiumPDF][RequestReceived]");
  cleanupExpiredSukuyoLocks();

  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const sessionId = getSukuyoSessionId(body);
  const premiumAccessToken = readPremiumAccessToken(request, body);
  const featureKey = clean(body?.featureKey) || SUKYO_PDF_FEATURE_KEY;

  const input = normalizeCompatibilityInput(body);
  const validation = validateSukyoPdfInput({
    mode: "compatibility",
    self: input.self,
    partner: input.partner,
    sukuyoResult: { relationshipType: "pre-validated" },
  });

  if (!validation.canGenerate) {
    return json({
      ok: false,
      code: "SUKUYO_INVALID_INPUT_BEFORE_PAYMENT",
      message: "두 사람의 생년월일을 정확히 입력해 주세요.",
      hardMissingFields: validation.hardMissingFields,
      softMissingFields: validation.softMissingFields,
    }, { status: 400 });
  }

  const dryRunSeed = buildSukuyoSeedFromCompatibility(input);

  const existingLock = sukuyoPdfGenerationLocks.get(sessionId);
  if (existingLock?.status === "running") {
    return json({
      ok: true,
      status: "running",
      sessionId,
      reportType: "sookyoPremium",
      mode: "compatibility",
      message: "같은 세션의 숙요점 PDF 생성이 이미 진행 중입니다.",
      progress: existingLock.progress || null,
      startedAt: existingLock.startedAt,
    });
  }

  if (existingLock?.status === "done" && existingLock?.result) {
    return json({
      ...existingLock.result,
      status: "done",
      sessionId,
      fromCache: true,
    });
  }

  sukuyoPdfGenerationLocks.set(sessionId, {
    sessionId,
    status: "running",
    startedAt: new Date().toISOString(),
    progress: {
      stage: "input-validated",
      selfBirthDateReady: Boolean(clean(input.self.birthDate)),
      partnerBirthDateReady: Boolean(clean(input.partner.birthDate)),
    },
  });

  console.log("[SukuyoPremiumPDF][CompatibilityInputValidated]", {
    selfBirthDate: Boolean(clean(input.self.birthDate)),
    partnerBirthDate: Boolean(clean(input.partner.birthDate)),
    selfStarReady: Boolean(clean(dryRunSeed?.userSukyo?.nameKo)),
    partnerStarReady: Boolean(clean(dryRunSeed?.partnerSukyo?.nameKo)),
    relationType: clean(dryRunSeed?.compatibility?.relationType),
    distance: clean(dryRunSeed?.compatibility?.distanceLabel),
  });

  try {
    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "sookyoPremium", {
      reportType: "sookyoPremium",
      mode: "compatibility",
      reportMode: "compatibility",
      featureKey,
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/sukuyo/premium/prepare",
    });

    if (!access?.ok) {
      sukuyoPdfGenerationLocks.set(sessionId, {
        sessionId,
        status: "failed",
        startedAt: new Date().toISOString(),
        progress: { stage: "payment-required" },
      });
      return json({
        ok: false,
        code: access?.code || "SUKUYO_PAYMENT_REQUIRED",
        message: access?.message || "프리미엄 궁합 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다.",
      }, { status: Number(access?.status) || 403 });
    }

    const executionCtx = buildPremiumExecutionContext({
      serviceKey: "sukuyo-premium",
      reportType: "sookyoPremium",
      userId: auth.userId,
      featureKey,
      sessionId,
      reportId: clean(body?.reportId || body?.accessGrant?.reportId),
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await startPremiumPdfExecution(env, auth.userId, executionCtx);

    sukuyoPdfGenerationLocks.set(sessionId, {
      sessionId,
      status: "running",
      startedAt: new Date().toISOString(),
      progress: { stage: "payment-verified" },
    });

    const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `sukyo-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    const generated = await generateSukyoPremiumReport(env, dryRunSeed);

    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      chapterCount: generated.chapterCount,
      manuscriptSource: generated.manuscriptSource,
      archive: {
        reportId,
        reportType: "sukyo_compatibility_book",
        displayName: "숙요점",
        title: `${clean(input?.self?.name || "사용자")} · ${clean(input?.partner?.name || "상대")} 궁합 리포트`,
        mode: "compatibility",
        birthName: clean(input?.self?.name),
        targetName: clean(input?.partner?.name),
        summary: clean(generated?.chapters?.[0]?.sections?.[0]?.body || "").slice(0, 1000),
        pdfUrl: clean(generated?.pdfReady?.pdfUrl),
        pdfStorageKey: clean(generated?.pdfReady?.pdfStorageKey),
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        chapters: generated.chapters,
        payload: generated.payload,
        pdfReady: generated.pdfReady,
        paymentSessionId: clean(executionCtx?.paymentSessionId),
        coinAmount: Number(executionCtx?.coinAmount || 0),
        status: "completed",
        canReopen: true,
        canDownload: Boolean(clean(generated?.pdfReady?.pdfUrl)),
      },
    });

    const responseBody = {
      ok: true,
      reportType: "sookyoPremium",
      mode: "compatibility",
      serverStatus: generated.serverStatus || "completed",
      qualityStatus: generated.qualityStatus || "passed",
      sessionId,
      featureKey,
      canonicalFeatureKey: SUKYO_PDF_FEATURE_KEY,
      aliasFeatureKey: SUKYO_PDF_ALIAS_FEATURE_KEY,
      chapterCount: generated.chapterCount,
      localDraftChapterCount: generated.localDraftChapterCount,
      fallbackUsed: Boolean(generated.fallbackUsed),
      manuscriptSource: generated.manuscriptSource || "local",
      reportId,
      chapters: generated.chapters,
      payload: generated.payload,
      pdfReady: generated.pdfReady,
    };

    sukuyoPdfGenerationLocks.set(sessionId, {
      sessionId,
      status: "done",
      startedAt: new Date().toISOString(),
      progress: { stage: "done", chapterCount: generated.chapterCount },
      result: responseBody,
    });

    return json(responseBody);
  } catch (error) {
    await failPremiumPdfExecution(
      env,
      auth.userId,
      buildPremiumExecutionContext({
        serviceKey: "sukuyo-premium",
        reportType: "sookyoPremium",
        userId: auth.userId,
        featureKey,
        sessionId,
        reportId: clean(body?.reportId || body?.accessGrant?.reportId),
        access: null,
        body,
        timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
      }),
      "sukuyo_generation_failed",
      clean(error?.message || "숙요점 PDF 생성에 실패했습니다."),
      "sukuyo-generation",
    );
    sukuyoPdfGenerationLocks.set(sessionId, {
      sessionId,
      status: "failed",
      startedAt: new Date().toISOString(),
      progress: { stage: "failed", error: clean(error?.message || "unknown") },
    });
    const safeMessage = clean(error?.message || "");
    const refundMessage = safeMessage.includes("환불")
      ? safeMessage
      : "숙요점 PDF 생성이 완료되지 않아 사용된 코인이 자동으로 환불되었습니다. 다시 시도해 주세요.";
    return json({
      ok: false,
      code: clean(error?.code) || "SUKYO_GENERATION_FAILED",
      message: refundMessage,
      autoRefunded: true,
    }, { status: Number(error?.status) || 502 });
  }
}

export async function handleSukuyoRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/sukuyo");

    if (path === "/premium/chapters") {
      if (method !== "GET") return methodNotAllowed();
      return json({
        ok: true,
        reportType: "sookyoPremium",
        mode: "compatibility",
        featureKey: SUKYO_PDF_FEATURE_KEY,
        aliasFeatureKey: SUKYO_PDF_ALIAS_FEATURE_KEY,
        chapterCount: SUKYO_PDF_CHAPTER_COUNT,
        chapters: SUKYO_PDF_CHAPTERS,
      });
    }

    if (path === "/premium/preflight") {
      if (method !== "POST") return methodNotAllowed();
      return await handleSukuyoPremiumPreflight(request);
    }

    if (path === "/premium/prepare") {
      if (method !== "POST") return methodNotAllowed();
      return await handleSukuyoPremiumPrepare(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[SukuyoPremiumPDF][Error]", normalizeSukuyoError(error));
    const status = Number(error?.status) || 0;
    if (status >= 400 && status < 500) {
      return json({
        ok: false,
        code: clean(error?.code) || "SUKUYO_REQUEST_FAILED",
        message: clean(error?.message) || "숙요점 PDF 요청을 처리하지 못했습니다.",
        missing: Array.isArray(error?.missing) ? error.missing : undefined,
      }, { status });
    }
    return handleRouteError(error);
  }
}
