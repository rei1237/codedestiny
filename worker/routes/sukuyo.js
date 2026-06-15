import { Solar } from "lunar-javascript";
import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { verifyPremiumAccessToken } from "../lib/premium-access-token.js";
import { normalizePaidFeatureKey } from "../lib/paid-feature-registry.js";
import {
  SUKYO_PDF_ALIAS_FEATURE_KEY,
  SUKYO_PDF_CHAPTER_COUNT,
  SUKYO_PDF_CHAPTERS,
  SUKYO_PDF_CONFIG,
  SUKYO_PDF_FEATURE_KEY,
  buildSukyoPdfSeed,
  generateSukyoPremiumReport,
  validateSukyoPdfCompletionPayload,
  validateSukyoPdfInput,
} from "../lib/sukyo-pdf.js";
import { buildCanonicalSukuyoCompatibility, buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import { generateSukuyoLocalPdf } from "../pdf-v2/sukuyo-local-pdf.js";

const SUKUYO_SESSION_LOCK_TTL_MS = 20 * 60 * 1000;
const SUKYO_COMPAT_TOKEN_MIN_COINS = 490;
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
  if (["m", "male", "man", "남", "남성", "남자"].includes(token)) return "male";
  if (["f", "female", "woman", "여", "여성", "여자"].includes(token)) return "female";
  return "unknown";
}

function normalizeCalendarType(raw) {
  const token = clean(raw).toLowerCase();
  if (token.includes("lunar_leap") || token.includes("lunar-leap") || token.includes("leap") || token.includes("\uc724")) return "lunar_leap";
  if (token.includes("solar") || token.includes("양")) return "solar";
  if (token.includes("lunar") || token.includes("음")) return "lunar";
  return "unknown";
}

function normalizeRequestedMode(raw) {
  const token = clean(raw).toLowerCase();
  if (["compatibility", "compat", "couple", "궁합"].some((v) => token.includes(v))) return "compatibility";
  if (["personal", "solo", "single", "개인", "나만"].some((v) => token.includes(v))) return "personal";
  return "compatibility";
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

function buildSukuyoGenderValidationError(input) {
  const fieldErrors = {};
  const missing = [];
  if (!["male", "female"].includes(clean(input?.self?.gender))) {
    missing.push("self.gender");
    fieldErrors.skSelfGender = "나의 성별을 남자 또는 여자로 선택해 주세요.";
  }
  if (!["male", "female"].includes(clean(input?.partner?.gender))) {
    missing.push("partner.gender");
    fieldErrors.skPartnerGender = "상대방 성별을 남자 또는 여자로 선택해 주세요.";
  }
  if (!missing.length) return null;
  return {
    ok: false,
    code: "SUKUYO_GENDER_REQUIRED",
    message: "숙요점 프리미엄 PDF는 두 사람의 성별을 남자 또는 여자로 확정해야 생성할 수 있습니다.",
    hardMissingFields: missing,
    fieldErrors,
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
  const mode = normalizeRequestedMode(body?.mode || body?.reportMode || body?.questionType);
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

function buildSukuyoSeedErrorResponse(error, fallbackMessage = "숙요점 궁합 계산에 필요한 입력값을 확인해 주세요.") {
  return {
    ok: false,
    code: clean(error?.code || "SUKUYO_SEED_BUILD_FAILED"),
    message: clean(error?.message) || fallbackMessage,
    missing: Array.isArray(error?.missing) ? error.missing : undefined,
  };
}

function buildSukuyoRunningResponse(request, { sessionId = "", reportId = "", featureKey = "", progress = null, startedAt = "" } = {}) {
  const runningLinks = buildSukuyoRunningLinks(request, sessionId, reportId);
  return {
    ok: true,
    status: "running",
    serverStatus: "running",
    sessionId,
    reportId,
    featureKey,
    reportType: "sookyoPremium",
    mode: "compatibility",
    message: "같은 세션의 숙요점 PDF 생성이 이미 진행 중입니다.",
    progress,
    startedAt,
    archiveUrl: runningLinks.archiveUrl,
    statusPollUrl: runningLinks.statusPollUrl,
  };
}

async function findSukuyoReusableExecution(env, userId, executionCtx = {}, fallback = {}) {
  try {
    await connectDb(withPdfFastDbEnv(env));
    const filters = [];
    const executionKey = clean(executionCtx.executionKey);
    const sessionId = clean(executionCtx.sessionId || fallback.sessionId);
    const reportId = clean(executionCtx.reportId || fallback.reportId);
    const paymentSessionId = clean(executionCtx.paymentSessionId);
    if (executionKey) filters.push({ executionKey });
    if (sessionId) filters.push({ sessionId });
    if (reportId) filters.push({ reportId });
    if (paymentSessionId) filters.push({ paymentSessionId });
    if (!filters.length) return null;
    return await ServiceExecutionTransaction.findOne({
      userId,
      reportType: "sookyoPremium",
      $or: filters,
    }).sort({ completedAt: -1, updatedAt: -1, createdAt: -1 }).lean();
  } catch (error) {
    console.warn("[SukuyoPremiumPDF][ReusableExecutionLookupFailed]", { reason: clean(error?.message || error) });
    return null;
  }
}

function buildSukuyoReusableExecutionResponse(request, doc = {}, fallback = {}) {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata?.archive && typeof metadata.archive === "object" ? metadata.archive : {};
  const reportId = clean(doc.reportId || archive.reportId || metadata.reportId || fallback.reportId);
  const sessionId = clean(doc.sessionId || metadata.sessionId || fallback.sessionId);
  const featureKey = clean(doc.featureKey || metadata.featureKey || fallback.featureKey);
  const status = clean(doc.status);
  const premiumStatus = clean(doc.premiumStatus);

  if (status === "success" && premiumStatus === "completed" && isSukuyoCompletedPayloadReady(archive)) {
    return {
      status: 200,
      payload: {
        ...archive,
        ok: true,
        status: "completed",
        serverStatus: "completed",
        qualityStatus: "passed",
        reportId,
        sessionId,
        featureKey,
        fromCache: true,
      },
    };
  }

  if (status === "pending" || premiumStatus === "generating") {
    return {
      status: 202,
      payload: buildSukuyoRunningResponse(request, {
        sessionId,
        reportId,
        featureKey,
        progress: metadata.progress || { stage: "payment-verified" },
        startedAt: doc.generationStartedAt || doc.createdAt || "",
      }),
    };
  }

  return null;
}

async function acquireSukuyoExecutionLease(env, userId, executionCtx = {}) {
  const executionKey = clean(executionCtx.executionKey);
  if (!executionKey) return { ok: true };
  try {
    await connectDb(withPdfFastDbEnv(env));
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + Math.max(20 * 60 * 1000, Number(executionCtx.timeoutSeconds || 1800) * 1000));
    const token = `${executionKey}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    const doc = await ServiceExecutionTransaction.findOneAndUpdate(
      {
        userId,
        executionKey,
        status: "pending",
        $or: [
          { "lock.until": { $lte: now } },
          { "lock.until": null },
          { "lock.until": { $exists: false } },
          { "lock.token": "" },
        ],
      },
      {
        $set: {
          "lock.token": token,
          "lock.until": leaseUntil,
          "lock.acquiredAt": now,
          heartbeatAt: now,
        },
      },
      { returnDocument: "after" },
    ).lean();
    return { ok: Boolean(doc), doc, token };
  } catch (error) {
    console.warn("[SukuyoPremiumPDF][ExecutionLeaseAcquireFailed]", { reason: clean(error?.message || error) });
    return { ok: false, error };
  }
}

function readPremiumAccessToken(request, body = {}) {
  const headerToken = clean(request.headers.get("x-premium-access-token"));
  if (headerToken) return headerToken;
  return clean(
    body?.premiumAccessToken
    || body?._premiumAccessToken
    || body?.accessToken
    || body?.accessGrant?.premiumAccessToken
    || cookieValue(request, "cd_premium_access")
    || cookieValue(request, "cd_premium_access_token"),
  );
}

function resolveSukuyoReportId(body = {}, sessionId = "") {
  return clean(
    body?.reportId
    || body?.accessGrant?.reportId
    || body?.reportSessionId
    || sessionId
    || `sukyo-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );
}

function buildSukuyoRunningLinks(request, sessionId, reportId) {
  const origin = new URL(request.url).origin;
  const resolvedReportId = clean(reportId);
  const params = new URLSearchParams();
  if (clean(sessionId)) params.set("sessionId", clean(sessionId));
  if (resolvedReportId) params.set("reportId", resolvedReportId);
  return {
    archiveUrl: resolvedReportId ? `${origin}/api/premium/pdf-archive/${encodeURIComponent(resolvedReportId)}` : "",
    statusPollUrl: `${origin}/api/billing/executions/status${params.toString() ? `?${params.toString()}` : ""}`,
  };
}

function withSukuyoArchiveFormat(url, format = "pdf") {
  const value = clean(url);
  const targetFormat = clean(format) || "pdf";
  if (!value || !/\/api\/premium\/pdf-archive\//.test(value)) return value;
  if (/[?&]format=/i.test(value)) {
    return value.replace(/([?&]format=)[^&]+/i, `$1${encodeURIComponent(targetFormat)}`);
  }
  return `${value}${value.includes("?") ? "&" : "?"}format=${encodeURIComponent(targetFormat)}`;
}

function buildSukuyoPdfFilename(reportId = "") {
  const id = clean(reportId).replace(/[^\w.-]+/g, "-") || new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `sukyo-premium-${id}.pdf`;
}

function isSukuyoCompatibilityFeatureKey(value = "") {
  const raw = clean(value).toLowerCase();
  const normalized = clean(normalizePaidFeatureKey(value)).toLowerCase();
  const candidates = [SUKYO_PDF_FEATURE_KEY, SUKYO_PDF_ALIAS_FEATURE_KEY]
    .flatMap((key) => [clean(key).toLowerCase(), clean(normalizePaidFeatureKey(key)).toLowerCase()]);
  return Boolean(raw && candidates.includes(raw)) || Boolean(normalized && candidates.includes(normalized));
}

function isSukuyoReportType(value = "") {
  return ["sookyoPremium", "sukyoPremium", "sukyo_book"].includes(clean(value));
}

async function resolveSukuyoSignedTokenAccess(env, userId, premiumAccessToken) {
  const token = clean(premiumAccessToken);
  if (!token) return null;

  const tokenCheck = await verifyPremiumAccessToken(token, env, { userId: clean(userId) });
  if (!tokenCheck?.ok) return null;

  const payload = tokenCheck.payload || {};
  const tokenFeatureKey = clean(payload.featureKey);
  const normalizedFeatureKey = clean(normalizePaidFeatureKey(tokenFeatureKey));
  const reason = clean(payload.reason).replace(/\s+/g, "");
  const chargedCoins = Math.max(0, Math.abs(Number(payload.chargedCoins || 0)));
  const transactionId = clean(payload.transactionId);
  const isCompatFeature = isSukuyoCompatibilityFeatureKey(tokenFeatureKey);
  const isCoinGateCompat = normalizedFeatureKey === "coin-gate-per-use"
    && chargedCoins >= SUKYO_COMPAT_TOKEN_MIN_COINS
    && reason.includes("숙요점")
    && reason.includes("궁합");

  if (!isSukuyoReportType(payload.reportType) || (!isCompatFeature && !isCoinGateCompat)) return null;
  if (payload.freeBySubscription !== true && chargedCoins < SUKYO_COMPAT_TOKEN_MIN_COINS && !transactionId) return null;

  return {
    ok: true,
    accessType: "signed-payment-token-route",
    reportType: "sookyoPremium",
    matchedTransactionId: transactionId,
    featureKey: isCompatFeature ? tokenFeatureKey : SUKYO_PDF_FEATURE_KEY,
    chargedCoins,
    signedTokenFallback: true,
  };
}

function buildSukuyoArchiveMetadata(input, generated, pdfReady, reportId) {
  return {
    reportId,
    reportType: "sukyo_book",
    reportTypeAliases: ["sookyoPremium", "sukyoPremium", "sukyo_book"],
    displayName: "숙요점",
    title: `${clean(input?.self?.name || "사용자")} · ${clean(input?.partner?.name || "상대")} 궁합 리포트`,
    mode: "compatibility",
    birthName: clean(input?.self?.name),
    targetName: clean(input?.partner?.name),
    summary: clean(generated?.chapters?.[0]?.sections?.[0]?.body || "", 1000),
    pdfUrl: pdfReady.pdfUrl,
    htmlUrl: pdfReady.htmlUrl,
    downloadUrl: pdfReady.downloadUrl,
    chapters: generated.chapters,
    payload: generated.payload,
    localSukuyoCompatibilityJson: generated?.payload?.localSukuyoCompatibilityJson || generated?.payload,
    pdfReady,
    manuscriptSource: generated.manuscriptSource || SUKYO_PDF_CONFIG.generationMode,
    generationMode: generated.generationMode || SUKYO_PDF_CONFIG.generationMode,
    provider: generated.provider || SUKYO_PDF_CONFIG.provider,
    writingPipeline: generated.writingPipeline || "local-calculation-to-local-assembled-pdf",
    localAssembly: generated.localAssembly || generated?.payload?.localAssembly || {
      enabled: true,
      source: generated.manuscriptSource || SUKYO_PDF_CONFIG.generationMode,
      provider: generated.provider || SUKYO_PDF_CONFIG.provider,
      templateVersion: SUKYO_PDF_CONFIG.templateVersion,
      chapterCount: Array.isArray(generated.chapters) ? generated.chapters.length : SUKYO_PDF_CHAPTER_COUNT,
      expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
      externalGeneration: false,
      externalCallsAllowed: false,
    },
    pdfCompletionValidation: generated.pdfCompletionValidation,
    canReopen: true,
    canDownload: true,
  };
}

function hasCompleteSukuyoChapters(chapters = []) {
  if (!Array.isArray(chapters) || chapters.length !== SUKYO_PDF_CHAPTER_COUNT) return false;
  return chapters.every((chapter, index) => {
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    const expectedSections = Array.isArray(SUKYO_PDF_CHAPTERS[index]?.sections) ? SUKYO_PDF_CHAPTERS[index].sections.length : 5;
    return clean(chapter?.title)
      && sections.length === expectedSections
      && sections.every((section) => clean(section?.heading) && clean(section?.body));
  });
}

function isSukuyoCompletedPayloadReady(payload = {}) {
  const chapters = Array.isArray(payload?.chapters) ? payload.chapters : [];
  const ready = payload?.pdfReady && typeof payload.pdfReady === "object" ? payload.pdfReady : {};
  const hasUrl = Boolean(clean(payload?.downloadUrl || payload?.pdfUrl || payload?.htmlUrl || ready?.downloadUrl || ready?.pdfUrl || ready?.htmlUrl));
  const manuscriptSource = clean(payload?.manuscriptSource || ready?.manuscriptSource);
  const localAssembly = payload?.localAssembly && typeof payload.localAssembly === "object"
    ? payload.localAssembly
    : ready?.localAssembly && typeof ready.localAssembly === "object"
      ? ready.localAssembly
      : {};
  const sourceIsLocal = ["local", SUKYO_PDF_CONFIG.generationMode].includes(manuscriptSource);
  const localAssemblyOk = localAssembly.enabled === true
    && localAssembly.externalGeneration === false
    && localAssembly.externalCallsAllowed === false
    && Number(localAssembly.chapterCount || 0) === SUKYO_PDF_CHAPTER_COUNT
    && Number(localAssembly.expectedChapterCount || 0) === SUKYO_PDF_CHAPTER_COUNT
    && clean(localAssembly.templateVersion) === SUKYO_PDF_CONFIG.templateVersion;
  const chapterQuality = payload?.chapterQuality && typeof payload.chapterQuality === "object"
    ? payload.chapterQuality
    : payload?.payload?.chapterQuality && typeof payload.payload.chapterQuality === "object"
      ? payload.payload.chapterQuality
      : null;
  const chapterQualityOk = !chapterQuality || chapterQuality.ok === true;
  return Boolean(
    clean(payload?.reportId)
    && hasUrl
    && hasCompleteSukuyoChapters(chapters)
    && clean(payload?.serverStatus) === "completed"
    && clean(payload?.qualityStatus) === "passed"
    && sourceIsLocal
    && localAssemblyOk
    && chapterQualityOk
  );
}

async function handleSukuyoPremiumPreflight(request) {
  const body = await readJson(request);
  const input = normalizeCompatibilityInput(body);

  if (input.mode !== "compatibility") {
    return json({
      ok: false,
      code: "SUKUYO_COMPATIBILITY_ONLY",
      message: "숙요점 프리미엄 PDF는 궁합 전용입니다. 본인과 상대 숙 정보가 모두 필요합니다.",
      mode: input.mode,
      requiredMode: "compatibility",
    }, { status: 400 });
  }

  const genderError = buildSukuyoGenderValidationError(input);
  if (genderError) return json(genderError, { status: 400 });

  const validation = validateSukyoPdfInput({
    mode: input.mode,
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

  let seed = null;
  try {
    seed = buildSukuyoSeedFromCompatibility(input);
  } catch (error) {
    return json(buildSukuyoSeedErrorResponse(error), { status: Number(error?.status) || 422 });
  }

  return json({
    ok: true,
    mode: "compatibility",
    dryRun: {
      selfStarReady: Boolean(clean(seed?.userSukyo?.nameKo)),
      partnerStarReady: Boolean(clean(seed?.partnerSukyo?.nameKo)),
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
  const reportId = resolveSukuyoReportId(body, sessionId);
  let executionCtx = null;

  const input = normalizeCompatibilityInput(body);
  if (input.mode !== "compatibility") {
    return json({
      ok: false,
      code: "SUKUYO_COMPATIBILITY_ONLY",
      message: "숙요점 프리미엄 PDF는 궁합 전용입니다. 본인과 상대 숙 정보를 모두 입력해 주세요.",
      mode: input.mode,
      requiredMode: "compatibility",
    }, { status: 400 });
  }

  const genderError = buildSukuyoGenderValidationError(input);
  if (genderError) return json(genderError, { status: 400 });

  const validation = validateSukyoPdfInput({
    mode: input.mode,
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

  let dryRunSeed = null;
  try {
    dryRunSeed = buildSukuyoSeedFromCompatibility(input);
  } catch (error) {
    return json(buildSukuyoSeedErrorResponse(error), { status: Number(error?.status) || 422 });
  }

  const reusableExecutionCtx = buildPremiumExecutionContext({
    serviceKey: "sukuyo-premium",
    reportType: "sookyoPremium",
    userId: auth.userId,
    featureKey,
    sessionId,
    reportId,
    access: null,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  const reusableExecution = await findSukuyoReusableExecution(env, auth.userId, reusableExecutionCtx, { sessionId, reportId, featureKey });
  const reusableResponse = reusableExecution ? buildSukuyoReusableExecutionResponse(request, reusableExecution, { sessionId, reportId, featureKey }) : null;
  if (reusableResponse) {
    return json(reusableResponse.payload, { status: reusableResponse.status });
  }

  const existingLock = sukuyoPdfGenerationLocks.get(sessionId);
  if (existingLock?.status === "running") {
    return json(buildSukuyoRunningResponse(request, {
      sessionId,
      reportId: clean(existingLock.reportId || reportId),
      featureKey: clean(existingLock.featureKey || featureKey),
      progress: existingLock.progress || null,
      startedAt: existingLock.startedAt,
    }));
  }

  if (existingLock?.status === "done" && existingLock?.result) {
    if (!isSukuyoCompletedPayloadReady(existingLock.result)) {
      sukuyoPdfGenerationLocks.delete(sessionId);
    } else {
    return json({
      ...existingLock.result,
      status: "done",
      sessionId,
      fromCache: true,
    });
    }
  }

  sukuyoPdfGenerationLocks.set(sessionId, {
    sessionId,
    reportId,
    featureKey,
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
    const signedTokenAccess = await resolveSukuyoSignedTokenAccess(env, auth.userId, premiumAccessToken);
    const access = signedTokenAccess || await requirePremiumReportAccess(
      withPdfFastDbEnv(env),
      auth.userId,
      "sookyoPremium",
      {
        ...body,
        reportType: "sookyoPremium",
        mode: "compatibility",
        reportMode: "compatibility",
        featureKey,
        premiumAccessToken: premiumAccessToken || undefined,
        _accessRoute: "/api/sukuyo/premium/prepare",
      },
    );

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
        message: access?.message || "프리미엄 궁합 PDF 생성을 위해 원화 결제 또는 이용권 확인이 필요합니다.",
      }, { status: Number(access?.status) || 403 });
    }

    executionCtx = buildPremiumExecutionContext({
      serviceKey: "sukuyo-premium",
      reportType: "sookyoPremium",
      userId: auth.userId,
      featureKey,
      sessionId,
      reportId,
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await startPremiumPdfExecution(env, auth.userId, executionCtx);
    const executionLease = await acquireSukuyoExecutionLease(env, auth.userId, executionCtx);
    if (!executionLease.ok && !executionLease.error) {
      return json(buildSukuyoRunningResponse(request, {
        sessionId,
        reportId,
        featureKey,
        progress: { stage: "payment-verified" },
        startedAt: new Date().toISOString(),
      }), { status: 202 });
    }

    sukuyoPdfGenerationLocks.set(sessionId, {
      sessionId,
      reportId,
      featureKey,
      status: "running",
      startedAt: new Date().toISOString(),
      progress: { stage: "payment-verified" },
    });

    dryRunSeed.sessionId = sessionId;
    dryRunSeed.reportId = reportId;
    dryRunSeed.requestId = clean(body?.requestId || body?.accessGrant?.requestId || body?._paymentContext?.requestId || sessionId);
    dryRunSeed.featureKey = featureKey;

    const generated = await generateSukyoPremiumReport(env, dryRunSeed);
    const archiveUrl = buildSukuyoRunningLinks(request, sessionId, reportId).archiveUrl;
    const archivePdfUrl = withSukuyoArchiveFormat(archiveUrl, "pdf");
    const archiveHtmlUrl = withSukuyoArchiveFormat(archiveUrl, "html");
    const pdfReady = {
      ...(generated?.pdfReady || {}),
      html: generated?.pdfReady?.html || generated?.html || "",
      filename: clean(generated?.pdfReady?.filename || generated?.filename || buildSukuyoPdfFilename(reportId)).replace(/\.html?$/i, ".pdf"),
      htmlUrl: withSukuyoArchiveFormat(generated?.pdfReady?.htmlUrl || archiveHtmlUrl || archiveUrl, "html"),
      pdfUrl: withSukuyoArchiveFormat(generated?.pdfReady?.pdfUrl || generated?.pdfReady?.downloadUrl || archivePdfUrl || archiveUrl, "pdf"),
      downloadUrl: withSukuyoArchiveFormat(generated?.pdfReady?.downloadUrl || generated?.pdfReady?.pdfUrl || archivePdfUrl || archiveUrl, "pdf"),
      storageKey: clean(generated?.pdfReady?.storageKey || `premium-archive:sukyo:${reportId}`),
      mimeType: "application/pdf",
      contentType: "application/pdf",
      renderFormat: "pdf-archive",
      manuscriptSource: clean(generated?.manuscriptSource || generated?.payload?.manuscriptSource || SUKYO_PDF_CONFIG.generationMode),
      localAssembly: generated?.localAssembly || generated?.payload?.localAssembly || {
        enabled: true,
        source: clean(generated?.manuscriptSource || generated?.payload?.manuscriptSource || SUKYO_PDF_CONFIG.generationMode),
        provider: clean(generated?.provider || generated?.payload?.provider || SUKYO_PDF_CONFIG.provider),
        templateVersion: SUKYO_PDF_CONFIG.templateVersion,
        chapterCount: Number(generated?.chapterCount || SUKYO_PDF_CHAPTER_COUNT),
        expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
        externalGeneration: false,
        externalCallsAllowed: false,
      },
    };

    if (!clean(pdfReady?.html) || !clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl)) {
      throw Object.assign(new Error("숙요점 PDF 저장 URL 생성에 실패했습니다."), {
        status: 500,
        code: "SUKUYO_REPORT_URL_MISSING",
      });
    }
    const pdfCompletionValidation = validateSukyoPdfCompletionPayload({
      pdfReady,
      chapters: generated.chapters,
      seed: dryRunSeed,
      requireDownloadUrl: true,
    });
    if (!pdfCompletionValidation.ok) {
      throw Object.assign(new Error("숙요점 PDF 완료 검증에 실패했습니다."), {
        status: 500,
        code: "SUKUYO_REPORT_COMPLETION_INVALID",
        issues: pdfCompletionValidation.issues,
      });
    }
    pdfReady.pdfCompletionValidation = pdfCompletionValidation;
    const localPdfResult = await generateSukuyoLocalPdf({
      reportId,
      sessionId,
      featureKey,
      chapterCount: generated.chapterCount,
      manuscriptSource: generated.manuscriptSource || SUKYO_PDF_CONFIG.generationMode,
      chapters: generated.chapters,
      localAssembly: generated.localAssembly || generated?.payload?.localAssembly || pdfReady.localAssembly,
      pdfReady,
      pdfCompletionValidation,
      pdfUrl: pdfReady.pdfUrl,
      htmlUrl: pdfReady.htmlUrl,
      downloadUrl: pdfReady.downloadUrl,
    }, {
      config: SUKYO_PDF_CONFIG,
      expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
      buildLocalPdf: (payload) => payload,
    });

    const archiveMetadata = buildSukuyoArchiveMetadata(input, generated, pdfReady, reportId);
    let archiveStatus = "completed";
    let archiveErrorCode = "";
    let archiveErrorMessage = "";
    let completedExecution = null;

    try {
      completedExecution = await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
        chapterCount: generated.chapterCount,
        manuscriptSource: generated.manuscriptSource || SUKYO_PDF_CONFIG.generationMode,
        localAssembly: generated.localAssembly || generated?.payload?.localAssembly || pdfReady.localAssembly,
        pdfCompletionValidation,
        archive: archiveMetadata,
      });
      if (!completedExecution?.ok) {
        throw Object.assign(new Error("숙요점 PDF 완료 저장에 실패했습니다."), {
          status: 500,
          code: "SUKUYO_EXECUTION_COMPLETE_FAILED",
        });
      }
    } catch (completionError) {
      archiveStatus = "pending";
      archiveErrorCode = clean(completionError?.code || "SUKUYO_ARCHIVE_PENDING");
      archiveErrorMessage = clean(completionError?.message || "숙요점 PDF 저장소 연결이 지연되고 있습니다.");
      console.warn("[SukuyoPremiumPDF][ArchivePending]", {
        reportId,
        sessionId,
        code: archiveErrorCode,
        message: archiveErrorMessage,
      });
    }

    pdfReady.archiveStatus = archiveStatus;
    pdfReady.archivePending = archiveStatus !== "completed";
    pdfReady.archiveErrorCode = archiveErrorCode || undefined;
    pdfReady.canDownload = true;

    const responseBody = {
      ok: true,
      serviceKey: "sukuyo-premium",
      reportType: "sookyoPremium",
      mode: "compatibility",
      status: "completed",
      serverStatus: "completed",
      qualityStatus: "passed",
      sessionId,
      featureKey,
      canonicalFeatureKey: SUKYO_PDF_FEATURE_KEY,
      aliasFeatureKey: SUKYO_PDF_ALIAS_FEATURE_KEY,
      canonicalReportType: "sookyoPremium",
      aliasReportTypes: ["sukyoPremium", "sukyo_book"],
      chapterCount: generated.chapterCount,
      manuscriptSource: generated.manuscriptSource || SUKYO_PDF_CONFIG.generationMode,
      generationMode: generated.generationMode || SUKYO_PDF_CONFIG.generationMode,
      provider: generated.provider || SUKYO_PDF_CONFIG.provider,
      writingPipeline: generated.writingPipeline || "local-calculation-to-local-assembled-pdf",
      localAssembly: generated.localAssembly || generated?.payload?.localAssembly || pdfReady.localAssembly,
      localOnly: localPdfResult.localOnly,
      localContract: localPdfResult.localContract,
      pdfCompletionValidation,
      archiveStatus,
      archivePending: archiveStatus !== "completed",
      archiveErrorCode: archiveErrorCode || undefined,
      archiveErrorMessage: archiveErrorMessage || undefined,
      completedExecutionStored: archiveStatus === "completed",
      reportId,
      chapters: generated.chapters,
      payload: generated.payload,
      pdfReady,
      pdfUrl: pdfReady.pdfUrl,
      htmlUrl: pdfReady.htmlUrl,
      downloadUrl: pdfReady.downloadUrl,
      canReopen: true,
      canDownload: true,
    };
    if (!isSukuyoCompletedPayloadReady(responseBody)) {
      throw Object.assign(new Error("숙요점 PDF 완료 응답 검증에 실패했습니다."), {
        status: 500,
        code: "SUKUYO_COMPLETED_PAYLOAD_INVALID",
      });
    }

    sukuyoPdfGenerationLocks.set(sessionId, {
      sessionId,
      reportId,
      featureKey,
      status: "done",
      startedAt: new Date().toISOString(),
      progress: { stage: "done", chapterCount: generated.chapterCount },
      result: responseBody,
    });

    return json(responseBody);
  } catch (error) {
    const failedCtx = executionCtx || buildPremiumExecutionContext({
      serviceKey: "sukuyo-premium",
      reportType: "sookyoPremium",
      userId: auth.userId,
      featureKey,
      sessionId,
      reportId,
      access: null,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await failPremiumPdfExecution(
      env,
      auth.userId,
      failedCtx,
      "sukuyo_generation_failed",
      clean(error?.message || "숙요점 PDF 생성에 실패했습니다."),
      "sukuyo-generation",
    );
    sukuyoPdfGenerationLocks.set(sessionId, {
      sessionId,
      reportId,
      featureKey,
      status: "failed",
      startedAt: new Date().toISOString(),
      progress: { stage: "failed", error: clean(error?.message || "unknown") },
    });
    throw error;
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
