import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, mongoose } from "../lib/db.js";
import { MonthlyCreditLedger, NewYearAiConsultation, PointHistory, User } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { callGeminiText } from "../lib/gemini.js";
import { Lunar, Solar } from "lunar-javascript";

const SERVICE_KEY = "new-year-ai";
const FEATURE_KEY = "new-year-ai-consultation";
const ACCESS_TOKEN_TYPE = "new-year-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "신년운세 AI 상담";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";

const FORBIDDEN_RESULT_PATTERN = /\bPDF\b|챕터|\bprogress\b|\bjob\b/i;
const FOCUS_AREA_LABELS = Object.freeze({
  overall: "전체운",
  love: "연애운",
  money: "재물운",
  career: "일과 직업운",
  health: "건강운",
  relationship: "인간관계",
  study: "학업운",
  custom: "직접 질문",
});
const GEMINI_ENV_KEYS = [
  "GEMINIF_API_KEY",
  "GEMINIF_API_KEY1",
  "GEMINIF_API_KEY2",
  "GEMINIF_API_KEY3",
  "GEMINIF_API_KEY4",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
];
const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const ELEMENTS = ["목", "화", "토", "금", "수"];
const STEM_ELEMENT = {
  갑: "목", 을: "목",
  병: "화", 정: "화",
  무: "토", 기: "토",
  경: "금", 신: "금",
  임: "수", 계: "수",
};
const STEM_POLARITY = {
  갑: "yang", 병: "yang", 무: "yang", 경: "yang", 임: "yang",
  을: "yin", 정: "yin", 기: "yin", 신: "yin", 계: "yin",
};
const BRANCH_ELEMENT = {
  자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화",
  오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수",
};
const HIDDEN_STEMS = {
  자: ["계"],
  축: ["기", "계", "신"],
  인: ["갑", "병", "무"],
  묘: ["을"],
  진: ["무", "을", "계"],
  사: ["병", "무", "경"],
  오: ["정", "기"],
  미: ["기", "정", "을"],
  신: ["경", "임", "무"],
  유: ["신"],
  술: ["무", "신", "정"],
  해: ["임", "갑"],
};
const PRODUCES = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CONTROLS = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };
const BRANCH_CLASH = { 자: "오", 축: "미", 인: "신", 묘: "유", 진: "술", 사: "해", 오: "자", 미: "축", 신: "인", 유: "묘", 술: "진", 해: "사" };
const BRANCH_COMBINATION = { 자: "축", 축: "자", 인: "해", 해: "인", 묘: "술", 술: "묘", 진: "유", 유: "진", 사: "신", 신: "사", 오: "미", 미: "오" };

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function readProcessEnv(key) {
  if (typeof process === "undefined") return "";
  return clean(process.env?.[key], 2000);
}

function getProviderDiagnostics(env = {}) {
  const hasGeminiKey = GEMINI_ENV_KEYS.some((key) => clean(env?.[key], 2000) || readProcessEnv(key));
  const hasEnvAI = typeof env?.AI?.run === "function";
  return {
    hasEnvAI,
    willUseRealLLM: hasGeminiKey || hasEnvAI,
    providerReason: hasGeminiKey ? "gemini_api_key_available" : hasEnvAI ? "workers_ai_binding_available" : "no_real_llm_provider_detected",
  };
}

function isDevelopmentEnv(env = {}) {
  const mode = clean(env?.NODE_ENV || env?.ENVIRONMENT || readProcessEnv("NODE_ENV"), 40).toLowerCase();
  return mode && mode !== "production";
}

function maskBirthDate(value) {
  const text = clean(value, 10);
  const match = text.match(/^(\d{4})-/);
  return match ? `${match[1]}-**-**` : "";
}

function safeLogPayload({ route = "", requestId = "", body = {}, normalized = null, validation = "", access = "", env = {}, error = null } = {}) {
  const input = normalized?.input || {};
  const birthInfo = input.birthInfo || body.birthInfo || {};
  const question = clean(input.question ?? body.question ?? body.topic ?? body.consultationTopic, 1000);
  const diagnostics = getProviderDiagnostics(env);
  return {
    route,
    requestId: clean(requestId || body.requestId || body.idempotencyKey, 180),
    serviceType: clean(input.serviceType || body.serviceType || body.featureKey || FEATURE_KEY, 80),
    targetYear: Number(input.targetYear || input.year || body.targetYear || body.year || 0) || null,
    focusArea: clean(input.focusArea || body.focusArea || "overall", 40),
    validation,
    access,
    birthDate: maskBirthDate(input.birthInfo?.birthDate || birthInfo.birthDate || body.birthDate),
    questionLength: question.length,
    ...diagnostics,
    ...(error ? {
      errorMessage: clean(error?.message || error, 500),
      ...(isDevelopmentEnv(env) ? { stack: clean(error?.stack, 2000) } : {}),
    } : {}),
  };
}

function logNewYearAi(marker, details = {}, level = "info") {
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  console[method](`[NewYear AI LLM ${marker}]`, details);
}

function parseDateParts(value) {
  const raw = clean(value, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

function parseBirthTime(value) {
  const raw = clean(value, 5);
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return { hour: 12, minute: 0, timeUnknown: true };
  return { hour: Number(match[1]), minute: Number(match[2]), timeUnknown: false };
}

function pillarStem(pillar = "") {
  return clean(pillar).slice(0, 1);
}

function pillarBranch(pillar = "") {
  return clean(pillar).slice(1, 2);
}

function emptyElementCounts() {
  return ELEMENTS.reduce((acc, element) => ({ ...acc, [element]: 0 }), {});
}

function addElement(counts, element, weight = 1) {
  if (!element || !Object.prototype.hasOwnProperty.call(counts, element)) return;
  counts[element] = Number((Number(counts[element] || 0) + weight).toFixed(2));
}

function tenGodFor(dayStem, targetStem) {
  const dayElement = STEM_ELEMENT[dayStem];
  const targetElement = STEM_ELEMENT[targetStem];
  const samePolarity = STEM_POLARITY[dayStem] === STEM_POLARITY[targetStem];
  if (!dayElement || !targetElement) return "";
  if (targetElement === dayElement) return samePolarity ? "비견" : "겁재";
  if (PRODUCES[dayElement] === targetElement) return samePolarity ? "식신" : "상관";
  if (CONTROLS[dayElement] === targetElement) return samePolarity ? "편재" : "정재";
  if (CONTROLS[targetElement] === dayElement) return samePolarity ? "편관" : "정관";
  if (PRODUCES[targetElement] === dayElement) return samePolarity ? "편인" : "정인";
  return "";
}

function buildElementDistribution(pillars) {
  const counts = emptyElementCounts();
  for (const pillar of pillars.filter(Boolean)) {
    addElement(counts, STEM_ELEMENT[pillarStem(pillar)], 1);
    addElement(counts, BRANCH_ELEMENT[pillarBranch(pillar)], 1);
  }
  return counts;
}

function buildTenGodDistribution(dayStem, pillars) {
  const counts = {};
  for (const pillar of pillars.filter(Boolean)) {
    const stem = pillarStem(pillar);
    const branch = pillarBranch(pillar);
    const main = tenGodFor(dayStem, stem);
    if (main) counts[main] = Number((Number(counts[main] || 0) + 1).toFixed(2));
    for (const hidden of HIDDEN_STEMS[branch] || []) {
      const hiddenGod = tenGodFor(dayStem, hidden);
      if (hiddenGod) counts[hiddenGod] = Number((Number(counts[hiddenGod] || 0) + 0.35).toFixed(2));
    }
  }
  return counts;
}

function pickElement(fiveElements, direction = "dominant") {
  const entries = Object.entries(fiveElements || {}).sort((a, b) => (
    direction === "weak" ? Number(a[1]) - Number(b[1]) : Number(b[1]) - Number(a[1])
  ));
  return entries[0]?.[0] || "";
}

function judgeStrength(dayStem, fiveElements) {
  const dayElement = STEM_ELEMENT[dayStem] || "";
  const total = Object.values(fiveElements || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const own = Number(fiveElements?.[dayElement] || 0);
  const ratio = total > 0 ? own / total : 0;
  if (ratio >= 0.34) return "일간의 기운이 강한 편";
  if (ratio <= 0.18) return "일간의 기운이 약한 편";
  return "일간의 기운이 비교적 균형적인 편";
}

function describeBranchRelation(sourceBranch, targetBranch) {
  if (!sourceBranch || !targetBranch) return "";
  if (BRANCH_CLASH[sourceBranch] === targetBranch) return `${sourceBranch}-${targetBranch} 충으로 변화와 조정 압력이 생기기 쉬움`;
  if (BRANCH_COMBINATION[sourceBranch] === targetBranch) return `${sourceBranch}-${targetBranch} 합으로 관계와 협력의 실마리가 열리기 쉬움`;
  if (sourceBranch === targetBranch) return `${targetBranch} 기운이 반복되어 같은 패턴이 강해지기 쉬움`;
  return "큰 충돌보다는 기존 구조 위에 새 기운이 더해지는 흐름";
}

function buildLunarFromInput(dateParts, birthTime, calendarType) {
  if (calendarType === "lunar") {
    return Lunar.fromYmdHms(dateParts.year, dateParts.month, dateParts.day, birthTime.hour, birthTime.minute, 0);
  }
  return Solar.fromYmdHms(dateParts.year, dateParts.month, dateParts.day, birthTime.hour, birthTime.minute, 0).getLunar();
}

// 사주·세운 계산은 LLM에 넘길 구조 데이터만 만들고, 해석 문장은 LLM 상담 단계에서 생성한다.
function calculateNewYearFortuneData(input) {
  const birth = input.birthInfo || {};
  const dateParts = parseDateParts(birth.birthDate);
  if (!dateParts) {
    const error = new Error("Invalid birth date for new-year consultation.");
    error.code = "INVALID_BIRTH_DATE";
    throw error;
  }
  const birthTime = parseBirthTime(birth.birthTime);
  const lunar = buildLunarFromInput(dateParts, birthTime, birth.calendarType);
  const solar = lunar.getSolar();
  const yearPillar = lunar.getYearInGanZhi();
  const monthPillar = lunar.getMonthInGanZhi();
  const dayPillar = lunar.getDayInGanZhi();
  const hourPillar = birthTime.timeUnknown ? "" : lunar.getTimeInGanZhi();
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar].filter(Boolean);
  const dayMaster = pillarStem(dayPillar);
  const dayBranch = pillarBranch(dayPillar);
  const fiveElements = buildElementDistribution(pillars);
  const tenGods = buildTenGodDistribution(dayMaster, pillars);
  const targetYear = Number(input.targetYear || input.year);
  const targetLunar = Solar.fromYmdHms(targetYear, 7, 1, 12, 0, 0).getLunar();
  const targetPillar = targetLunar.getYearInGanZhi();
  const targetStem = pillarStem(targetPillar);
  const targetBranch = pillarBranch(targetPillar);
  const monthlyFlow = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthPillar = Solar.fromYmdHms(targetYear, month, 15, 12, 0, 0).getLunar().getMonthInGanZhi();
    return {
      month,
      pillar: monthPillar,
      stem: pillarStem(monthPillar),
      branch: pillarBranch(monthPillar),
      element: STEM_ELEMENT[pillarStem(monthPillar)] || BRANCH_ELEMENT[pillarBranch(monthPillar)] || "",
      tenGod: tenGodFor(dayMaster, pillarStem(monthPillar)),
    };
  });

  return {
    birthCalendar: {
      solarDate: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, "0")}-${String(solar.getDay()).padStart(2, "0")}`,
      inputCalendarType: birth.calendarType,
      timeUnknown: birthTime.timeUnknown,
    },
    saju: {
      yearPillar,
      monthPillar,
      dayPillar,
      hourPillar: hourPillar || "출생시간 미입력",
      dayMaster,
      dayBranch,
      fiveElements,
      tenGods,
      strength: judgeStrength(dayMaster, fiveElements),
      dominantElement: pickElement(fiveElements, "dominant"),
      balancingElement: pickElement(fiveElements, "weak"),
    },
    targetYear: {
      year: targetYear,
      pillar: targetPillar,
      stem: targetStem,
      branch: targetBranch,
      stemElement: STEM_ELEMENT[targetStem] || "",
      branchElement: BRANCH_ELEMENT[targetBranch] || "",
      tenGodToDayMaster: tenGodFor(dayMaster, targetStem),
      relationToDayBranch: describeBranchRelation(dayBranch, targetBranch),
      relationToYearBranch: describeBranchRelation(pillarBranch(yearPillar), targetBranch),
    },
    focus: {
      focusArea: input.focusArea,
      focusLabel: FOCUS_AREA_LABELS[input.focusArea] || FOCUS_AREA_LABELS.overall,
      question: input.question || "",
    },
    monthlyFlow,
  };
}

function sha256(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function readIdempotencyKey(request, body = {}) {
  return clean(
    body?.idempotencyKey
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key"),
    180,
  );
}

function randomToken(length = 10) {
  const bytes = new Uint8Array(Math.max(8, Math.ceil(length * 0.75)));
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, length);
}

function normalizeGender(value) {
  const text = clean(value, 20).toLowerCase();
  if (["m", "male", "man", "남", "남성"].includes(text)) return "male";
  if (["f", "female", "woman", "여", "여성"].includes(text)) return "female";
  if (["other", "unknown", "none", "기타", "비공개"].includes(text)) return "unknown";
  return text || "";
}

function normalizeFocusArea(value) {
  const text = clean(value, 40).toLowerCase();
  if (Object.prototype.hasOwnProperty.call(FOCUS_AREA_LABELS, text)) return text;
  return "overall";
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeConsultationInput(body = {}) {
  const rawYear = body.targetYear ?? body.year ?? body.consultationYear;
  const year = Math.floor(Number(rawYear));
  const birthInfo = body.birthInfo && typeof body.birthInfo === "object" ? body.birthInfo : {};
  const serviceType = clean(body.serviceType || body.featureKey || FEATURE_KEY, 80) || FEATURE_KEY;
  const consultationType = clean(body.consultationType || "newYearFortune", 80);
  const name = clean(body.userName ?? body.name ?? body.nickname ?? birthInfo.name, 80);
  const gender = normalizeGender(body.gender ?? birthInfo.gender);
  const birthDate = clean(body.birthDate ?? birthInfo.birthDate, 10);
  const birthTime = clean(body.birthTime ?? birthInfo.birthTime, 5);
  const calendarType = clean(body.calendarType ?? birthInfo.calendarType, 20).toLowerCase();
  const focusArea = normalizeFocusArea(body.focusArea ?? body.topicArea ?? body.domain);
  const question = clean(body.question ?? body.topic ?? body.consultationTopic, 1000);
  const topic = question || `${FOCUS_AREA_LABELS[focusArea] || FOCUS_AREA_LABELS.overall} 중심의 ${year || ""}년 신년운세`;

  if (rawYear === undefined || rawYear === null || clean(rawYear) === "") {
    return { ok: false, message: "상담할 연도를 선택해 주세요." };
  }
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return { ok: false, message: "상담 연도를 정확히 입력해 주세요." };
  }
  if (!gender || !birthDate || !calendarType) {
    return { ok: false, message: "신년운세 상담에 필요한 정보가 부족해요. 생년월일, 성별, 달력 기준을 다시 확인해 주세요." };
  }
  if (!isValidDateKey(birthDate)) return { ok: false, message: "생년월일을 YYYY-MM-DD 형식으로 입력해 주세요." };
  if (birthTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) {
    return { ok: false, message: "출생시간은 HH:mm 형식으로 입력해 주세요." };
  }
  if (calendarType !== "solar" && calendarType !== "lunar") {
    return { ok: false, message: "양력 또는 음력을 선택해 주세요." };
  }
  if (focusArea === "custom" && question.length < 2) return { ok: false, message: "직접 질문을 선택했다면 궁금한 내용을 짧게 적어 주세요." };

  const normalized = {
    year,
    targetYear: year,
    serviceType,
    consultationType,
    birthInfo: { name, gender, birthDate, birthTime, calendarType },
    focusArea,
    question,
    topic,
  };

  return {
    ok: true,
    input: normalized,
    inputHash: sha256(stableJson(normalized)),
  };
}

function invalidInput(message, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message: clean(message) || "입력값을 확인해 주세요." }, { status });
}

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: LOGIN_REQUIRED_MESSAGE }, { status: 401 });
}

function serverError(message = SERVER_ERROR_MESSAGE, status = 500) {
  return json({ ok: false, reason: "SERVER_ERROR", message }, { status });
}

function paymentVerifyFailed() {
  return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: PAYMENT_VERIFY_FAILED_MESSAGE }, { status: 402 });
}

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = resolved?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || coinPrice * 100);
  if (!resolved?.ok || !pricing || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error("new-year-ai price not found");
    error.code = "PRICE_NOT_FOUND";
    throw error;
  }
  return {
    pricing,
    coinPrice,
    amountKRW,
    membershipCreditCost: calculateMembershipCreditCost(coinPrice),
  };
}

async function createAccessToken(env, payload) {
  return signJwt(
    {
      typ: ACCESS_TOKEN_TYPE,
      serviceKey: SERVICE_KEY,
      featureKey: FEATURE_KEY,
      ...payload,
    },
    getAccessTokenSecret(env),
    {
      expiresIn: ACCESS_TOKEN_TTL,
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    },
  );
}

async function verifyAccessToken(env, token) {
  const payload = await verifyJwt(token, getAccessTokenSecret(env), {
    issuer: getJwtIssuer(env),
    audience: getJwtAudience(env),
  });
  if (payload?.typ !== ACCESS_TOKEN_TYPE || payload?.serviceKey !== SERVICE_KEY || payload?.featureKey !== FEATURE_KEY) {
    const error = new Error("invalid access token");
    error.code = "INVALID_ACCESS_TOKEN";
    throw error;
  }
  return payload;
}

function isAdmin(auth = {}) {
  return clean(auth.role).toLowerCase() === "admin";
}

async function loadBillingUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return null;
  return User.findById(userId)
    .select("email name phoneNumber points role profileSubscription subscription membership pass entitlement paidFeatures unlockedFeatures")
    .lean();
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniq(values = []) {
  return [...new Set(values.map((value) => clean(value, 180)).filter(Boolean))];
}

function readBillingContext(body = {}) {
  const billing = asObject(body.billingGate || body.billingEvidence || body.billing || body.paymentEvidence);
  const consume = asObject(body.consume || billing.consume);
  const accessGrant = asObject(body.accessGrant || billing.accessGrant);
  const pricing = asObject(body.pricing || billing.pricing);
  return { billing, consume, accessGrant, pricing };
}

function collectBillingTokens(body = {}, idempotencyKey = "") {
  const ctx = readBillingContext(body);
  return uniq([
    idempotencyKey,
    body.paymentId,
    body.transactionId,
    body.purchaseId,
    body.requestId,
    ctx.billing.transactionId,
    ctx.billing.purchaseId,
    ctx.billing.paymentId,
    ctx.billing.requestId,
    ctx.consume.transactionId,
    ctx.consume.purchaseId,
    ctx.consume.requestId,
    ctx.consume.receiptId,
    ctx.consume.pointHistoryId,
    ctx.consume.ledgerId,
    ctx.consume.monthlyCreditLedgerId,
    ctx.accessGrant.evidenceId,
    ctx.accessGrant.purchaseId,
    ctx.accessGrant.paymentId,
    ctx.accessGrant.requestId,
  ]);
}

function readBillingAccessSignal(body = {}) {
  const ctx = readBillingContext(body);
  return [
    body.accessType,
    body.accessMethod,
    body.paymentMode,
    ctx.billing.accessType,
    ctx.billing.accessMethod,
    ctx.billing.paymentMode,
    ctx.billing.paymentMethod,
    ctx.consume.accessType,
    ctx.consume.accessMethod,
    ctx.consume.paymentMethod,
    ctx.consume.paymentMode,
    ctx.consume.transactionType,
    ctx.accessGrant.accessType,
    ctx.accessGrant.accessMethod,
    ctx.accessGrant.paymentMethod,
  ].map((value) => clean(value).toLowerCase()).filter(Boolean).join("|");
}

function pointHistoryTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ "metadata.requestId": token });
    clauses.push({ "metadata.purchaseId": token });
    clauses.push({ "metadata.idempotencyKey": token });
    clauses.push({ "metadata.orderId": token });
    clauses.push({ "metadata.transactionId": token });
    clauses.push({ "metadata.pointHistoryId": token });
    if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: token });
  });
  return clauses;
}

function monthlyCreditTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ sourceId: token });
    clauses.push({ "metadata.requestId": token });
    clauses.push({ "metadata.purchaseId": token });
    clauses.push({ "metadata.idempotencyKey": token });
    clauses.push({ "metadata.orderId": token });
    clauses.push({ "metadata.pointHistoryId": token });
    clauses.push({ "metadata.ledgerId": token });
    clauses.push({ "metadata.monthlyCreditLedgerId": token });
    if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: token });
  });
  return clauses;
}

function normalizeBillingAccessType(value) {
  const accessType = clean(value).toLowerCase();
  if (["membership_credit", "monthly_credit", "moonlight_stone", "monthly", "subscription"].includes(accessType)) return "subscription";
  if (["membership_pass", "license_pass", "subscription_pass", "usage_pass", "pass", "family", "family_pass"].includes(accessType)) return "pass";
  return "paid";
}

async function resolveBillingGateAccess({ auth, user, body, pricing, idempotencyKey }) {
  const signal = readBillingAccessSignal(body);
  const tokens = collectBillingTokens(body, idempotencyKey);
  const ctx = readBillingContext(body);
  const featureKey = clean(ctx.pricing.featureKey || ctx.billing.featureKey || ctx.consume.featureKey || ctx.accessGrant.featureKey);
  const hasEvidencePayload = tokens.length > 0
    || signal.includes("pass")
    || signal.includes("monthly")
    || signal.includes("credit")
    || signal.includes("coin");
  if (!hasEvidencePayload) return null;
  if (featureKey && featureKey !== FEATURE_KEY) return null;

  if (signal.includes("pass")) {
    const pass = normalizeHoneyPassEntitlement(user || {});
    const usageMarker = `usage-pass:${FEATURE_KEY}:${idempotencyKey}`;
    const usagePassConsumed = Array.isArray(user?.recentConsumeRequestIds) && user.recentConsumeRequestIds.includes(usageMarker);
    if (canUseByPass(pass, pricing.coinPrice) || usagePassConsumed) {
      return { ok: true, accessType: "pass", paymentId: tokens[0] || "", prepaid: true };
    }
  }

  const pointClauses = pointHistoryTokenClauses(tokens);
  if (pointClauses.length) {
    const pointHistory = await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: FEATURE_KEY,
      "metadata.coinRefundedForUnlockFailure": { $ne: true },
      "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: pointClauses,
    }).sort({ createdAt: -1 }).lean();
    if (pointHistory) {
      return {
        ok: true,
        accessType: normalizeBillingAccessType(pointHistory?.metadata?.accessType || signal),
        paymentId: clean(pointHistory._id, 160),
        prepaid: true,
      };
    }
  }

  const monthlyClauses = monthlyCreditTokenClauses(tokens);
  if (monthlyClauses.length) {
    const ledger = await MonthlyCreditLedger.findOne({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      "metadata.featureKey": FEATURE_KEY,
      "metadata.refundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: monthlyClauses,
    }).sort({ createdAt: -1 }).lean();
    if (ledger) {
      return { ok: true, accessType: "subscription", paymentId: clean(ledger._id, 160), prepaid: true };
    }
  }

  return null;
}

function buildBillingGatePayload({ pricing, idempotencyKey }) {
  return {
    billingMode: "coin-gate",
    featureKey: FEATURE_KEY,
    serviceKey: SERVICE_KEY,
    serviceType: FEATURE_KEY,
    consultationType: "newYearFortune",
    reason: ORDER_NAME,
    cost: pricing.coinPrice,
    coinPrice: pricing.coinPrice,
    amountKRW: pricing.amountKRW,
    membershipCreditCost: pricing.membershipCreditCost,
    requestId: idempotencyKey,
    idempotencyKey,
  };
}

async function resolveServerAccess({ auth, user, pricing }) {
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", paymentId: "" };
  }

  const pass = normalizeHoneyPassEntitlement(user || {});
  if (canUseByPass(pass, pricing.coinPrice)) {
    return { ok: true, accessType: "pass", paymentId: "" };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function buildSystemPrompt() {
  return [
    "당신은 사주명리학과 세운 분석에 능한 전문 상담가입니다.",
    "",
    "사용자의 생년월일과 사주 구조, 목표 연도의 세운을 바탕으로 신년운세를 상담형 문장으로 해석합니다.",
    "",
    "반드시 지켜야 할 원칙:",
    "1. 보고서처럼 딱딱하게 쓰지 말고, 실제 상담사가 말하듯 자연스럽게 답변합니다.",
    "2. 명리학적 근거를 사용하되 사용자가 이해하기 쉬운 말로 풀이합니다.",
    "3. 재물운, 연애운, 직장/사업운, 인간관계, 건강/멘탈, 월별 흐름을 균형 있게 봅니다.",
    "4. 불안감을 조장하지 않습니다.",
    "5. 무조건 성공한다, 반드시 망한다 같은 단정적 표현을 쓰지 않습니다.",
    "6. 사용자가 당장 실천할 수 있는 조언을 포함합니다.",
    "7. 같은 문장을 반복하지 않습니다.",
    "8. “AI로 생성되었습니다”, “프롬프트”, “시스템” 같은 표현은 결과에 노출하지 않습니다.",
    "9. 사용자가 처음 입력한 더 깊게 보고 싶은 흐름이 있으면 그 주제를 가장 깊게 다룹니다.",
    "10. 답변 마지막에는 추가 질문을 유도하지 말고, 새해를 여는 한 줄 조언으로 마무리합니다.",
    "11. PDF, 챕터, progress, job이라는 단어를 쓰지 않습니다.",
  ].join("\n");
}

function buildFirstPrompt(input, fortuneData) {
  const birth = input.birthInfo || {};
  return [
    "아래 사용자 입력과 서버에서 계산된 사주·세운 데이터를 바탕으로 신년운세 첫 상담문을 작성하세요.",
    "문장은 전문적이고 따뜻하게, 실제 선택에 도움이 되도록 현실적으로 말하세요.",
    "",
    "[사용자 입력]",
    `- 이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `- 성별: ${birth.gender}`,
    `- 생년월일: ${birth.birthDate}`,
    `- 출생시간: ${birth.birthTime || "모름"}`,
    `- 달력: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `- 상담 연도: ${input.targetYear || input.year}`,
    `- 집중 상담 분야: ${FOCUS_AREA_LABELS[input.focusArea] || FOCUS_AREA_LABELS.overall}`,
    `- 처음 입력한 더 깊게 보고 싶은 흐름: ${input.question || "전체 흐름 중심"}`,
    "",
    "[계산된 사주와 세운 데이터]",
    JSON.stringify(fortuneData, null, 2),
    "",
    "첫 답변은 아래 흐름을 모두 자연스럽게 포함하세요.",
    "1. 새해 전체 운의 핵심 결론",
    "2. 올해 당신에게 들어오는 큰 기운",
    "3. 일과 직업운",
    "4. 재물운과 돈의 흐름",
    "5. 연애운과 인간관계",
    "6. 건강과 컨디션 관리",
    "7. 조심해야 할 시기와 패턴",
    "8. 기회를 살리는 행동 전략",
    "9. 월별 흐름 요약",
    "10. 새해를 여는 한 줄 조언",
    "",
    "출생시간이 없거나 계산상 불확실한 부분은 단정하지 말고 입력된 정보 기준으로 본 흐름이라고 자연스럽게 말하세요.",
  ].join("\n");
}

function cleanForbiddenResult(text) {
  return clean(text)
    .replace(/\bPDF\b/gi, "상담")
    .replace(/챕터/g, "상담 항목")
    .replace(/\bprogress\b/gi, "흐름")
    .replace(/\bjob\b/gi, "상담");
}

async function generateConsultationText(env, prompt, options = {}) {
  const providerDiagnostics = getProviderDiagnostics(env);
  logNewYearAi("Provider Selected", {
    ...(options.logContext || {}),
    ...providerDiagnostics,
  });
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: 0.72,
    maxOutputTokens: options.maxOutputTokens || 6144,
    timeoutMs: Number(env?.NEW_YEAR_AI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 55000),
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  const text = clean(ai?.text);
  if (!ai?.ok || isMock || text.length < (options.minLength || 180)) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    error.providerDiagnostics = providerDiagnostics;
    throw error;
  }
  if (!FORBIDDEN_RESULT_PATTERN.test(text)) return { text, provider, model: clean(ai?.model) };

  const repair = await callGeminiText(env, [
    "다음 상담 답변에서 금지된 시스템성 표현을 모두 제거하고, 자연스러운 신년운세 상담문으로만 다시 써주세요.",
    "",
    text,
  ].join("\n"), {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: 0.58,
    maxOutputTokens: options.maxOutputTokens || 6144,
  });
  const repaired = clean(repair?.text);
  return {
    text: cleanForbiddenResult(repair?.ok && repaired.length >= 120 ? repaired : text),
    provider: clean(repair?.provider || provider),
    model: clean(repair?.model || ai?.model),
  };
}

async function applyUsageOnce({ sessionId }) {
  const existing = await NewYearAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;
  await NewYearAiConsultation.updateOne(
    { id: sessionId, usageAppliedAt: null },
    { $set: { usageAppliedAt: new Date() } },
  );
  return true;
}

function publicSession(doc) {
  return {
    ok: true,
    sessionId: clean(doc.id),
    accessType: clean(doc.accessType),
    status: clean(doc.status),
    messages: Array.isArray(doc.messages)
      ? doc.messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      }))
      : [],
  };
}

async function handleEnsureAccess(request, env) {
  const route = "/api/new-year-ai/ensure-access";
  logNewYearAi("Prepare Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logNewYearAi("Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logNewYearAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logNewYearAi("Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  try {
    logNewYearAi("Fortune Data Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
    calculateNewYearFortuneData(normalized.input);
    logNewYearAi("Fortune Data Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  } catch (error) {
    logNewYearAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "fortune_data_failed", env, error }), "error");
    return serverError(SERVER_ERROR_MESSAGE, 500);
  }

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  const pricing = getPricing();
  logNewYearAi("Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  if (isAdmin(auth)) {
    logNewYearAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "admin", env }));
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: "admin",
        idempotencyKey,
        inputHash: normalized.inputHash,
      }),
      accessType: "admin",
    });
  }

  await connectDb(env);
  const user = await loadBillingUser(auth.userId);
  if (!user) return loginRequired();

  const access = await resolveServerAccess({ auth, user, pricing });
  if (access.ok) {
    logNewYearAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: access.accessType,
        idempotencyKey,
        inputHash: normalized.inputHash,
        paymentId: access.paymentId || "",
      }),
      accessType: access.accessType,
    });
  }
  if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);

  logNewYearAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "payment_required", env }));
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    paymentPayload: buildBillingGatePayload({ pricing, idempotencyKey }),
  }, { status: 402 });
}

async function resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey }) {
  const token = clean(body?.accessToken || request.headers.get("x-new-year-ai-access-token"));
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: "상담 접근 정보가 현재 입력값과 일치하지 않습니다." };
    }
    return { ok: true, accessType: clean(payload.accessType), paymentId: clean(payload.paymentId, 160) };
  }

  const user = await loadBillingUser(auth.userId);
  if (!user && !isAdmin(auth)) return { ok: false, reason: "LOGIN_REQUIRED" };
  const billingAccess = await resolveBillingGateAccess({ auth, user, body, pricing, idempotencyKey });
  if (billingAccess?.ok) return billingAccess;
  return resolveServerAccess({ auth, user, pricing });
}

async function handleStart(request, env) {
  const route = "/api/new-year-ai/start";
  logNewYearAi("Generate Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logNewYearAi("Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logNewYearAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logNewYearAi("Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  logNewYearAi("Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return paymentVerifyFailed();
  }
  logNewYearAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
  logNewYearAi("Payment Guard Passed", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));

  let fortuneData = null;
  try {
    logNewYearAi("Fortune Data Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    fortuneData = calculateNewYearFortuneData(normalized.input);
    logNewYearAi("Fortune Data Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
  } catch (error) {
    logNewYearAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "fortune_data_failed", access: access.accessType, env, error }), "error");
    return serverError(SERVER_ERROR_MESSAGE, 500);
  }

  const existing = await NewYearAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
  if (existing && clean(existing.inputHash) !== normalized.inputHash) {
    return invalidInput("같은 요청 키로 다른 상담 정보를 사용할 수 없습니다.", 409);
  }
  if (existing?.status === "completed") return json(publicSession(existing));
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 90000) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "올해의 흐름을 읽고 있습니다" }, { status: 202 });
  }

  const sessionId = existing?.id || `nyai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
  const now = new Date();
  const seed = {
    id: sessionId,
    userId: clean(auth.userId),
    year: normalized.input.year,
    birthInfo: normalized.input.birthInfo,
    topic: normalized.input.topic,
    accessType: access.accessType,
    paymentId: clean(access.paymentId, 160),
    messages: [],
    idempotencyKey,
    inputHash: normalized.inputHash,
    status: "generating",
    generationError: null,
  };

  if (existing) {
    await NewYearAiConsultation.updateOne(
      { id: existing.id },
      { $set: { ...seed, updatedAt: now } },
    );
  } else {
    try {
      await NewYearAiConsultation.create(seed);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await NewYearAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicSession(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "올해의 흐름을 읽고 있습니다" }, { status: 202 });
      }
      throw error;
    }
  }

  try {
    const generated = await generateConsultationText(env, buildFirstPrompt(normalized.input, fortuneData), {
      minLength: 240,
      maxOutputTokens: 7000,
      logContext: safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }),
    });
    await applyUsageOnce({ userId: auth.userId, sessionId, accessType: access.accessType, pricing, prepaid: access.prepaid === true });
    const completed = await NewYearAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "completed",
          messages: [
            { role: "user", content: normalized.input.topic, createdAt: now },
            { role: "assistant", content: generated.text, createdAt: new Date() },
          ],
          llmMeta: { provider: generated.provider, model: generated.model, completedAt: new Date().toISOString(), fortuneData },
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    logNewYearAi("Generate Success", {
      ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }),
      provider: generated.provider,
      model: generated.model,
    });
    return json(publicSession(completed));
  } catch (error) {
    await NewYearAiConsultation.updateOne(
      { id: sessionId },
      {
        $set: {
          status: "generation_failed",
          generationError: {
            code: clean(error?.code || "LLM_GENERATION_FAILED", 80),
            message: clean(error?.message || error, 500),
            at: new Date().toISOString(),
          },
        },
      },
    ).catch(() => {});
    logNewYearAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }), "error");
    logNewYearAi("Refund Or Restore", {
      ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }),
      restoreMode: "same_request_id_retry_preserves_billing_evidence",
    }, "warn");
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

async function handleMessage(request, env) {
  const route = "/api/new-year-ai/message";
  const body = await readJson(request);
  const requestId = clean(body?.requestId || body?.idempotencyKey || body?.sessionId || body?.consultationId, 180);
  logNewYearAi("Error", {
    ...safeLogPayload({ route, requestId, body, env }),
    disabledReason: "follow_up_llm_disabled",
  }, "warn");
  return json({
    ok: false,
    reason: "FOLLOW_UP_DISABLED",
    message: "신년운세 AI 상담은 처음 입력한 흐름을 기준으로 한 번 생성됩니다. 더 깊게 보고 싶은 내용은 상담 시작 전에 입력해 주세요.",
  }, { status: 410 });
}

export async function handleNewYearAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/new-year-ai");

  try {
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[new-year-ai]", clean(error?.code || error?.message || error, 500));
    logNewYearAi("Error", safeLogPayload({ route: "/api/new-year-ai", env, error }), "error");
    return serverError();
  }
}

export const __newYearAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeConsultationInput,
  calculateNewYearFortuneData,
  buildFirstPrompt,
  buildSystemPrompt,
  cleanForbiddenResult,
};
