import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, mongoose } from "../lib/db.js";
import { LifeBookAiConsultation, MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory, User } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { canAccessPaidFeature } from "../lib/paid-feature-access.js";
import { callGeminiText } from "../lib/gemini.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { calculateLifeBookAiSaju } from "../lib/life-book-ai-saju.js";
import { handleBillingRoutes } from "./billing.js";

const SERVICE_KEY = "life-book-ai";
const FEATURE_KEY = "life-book-ai-consultation";
const ACCESS_TOKEN_TYPE = "life-book-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "인생의 책 AI 상담";

const GEMINI_ENV_KEYS = [
  "GEMINIF_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
];

const MESSAGES = Object.freeze({
  login: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  invalidInput: "인생의 책을 열기 위한 정보가 부족합니다. 생년월일과 성별을 다시 확인해 주세요.",
  genderRequired: "대운 흐름을 정확히 계산하려면 성별을 선택해 주세요.",
  birthTimeMissing: "출생시간을 입력하거나 출생시간 모름을 선택해 주세요.",
  prepareFailed: "인생의 책 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  sajuCalculationFailed: "명식 계산을 완료하지 못했습니다. 결제나 이용권은 차감되지 않았습니다.",
  llmFailed: "상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
  network: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
  resultNotFound: "저장된 인생의 책을 찾을 수 없습니다.",
});

const FOCUS_AREA_LABELS = Object.freeze({
  overall: "전체 인생 흐름",
  love: "사랑과 관계의 흐름",
  money: "재물과 안정의 흐름",
  career: "일과 커리어의 방향",
  relationship: "인간관계의 반복 장면",
  family: "가족과 인연의 장",
  lifePurpose: "삶의 목적과 사명",
  turningPoint: "전환점과 기회의 장",
});

const LEGACY_TOPIC_TO_FOCUS = Object.freeze({
  "전체 인생 흐름": "overall",
  "타고난 성향": "overall",
  "인생의 사명": "lifePurpose",
  "직업/사업 방향": "career",
  "재물 흐름": "money",
  "연애와 결혼": "love",
  "인간관계": "relationship",
  "가족과 상처": "family",
  "현재 인생의 전환점": "turningPoint",
  "앞으로의 기회": "turningPoint",
  "반복되는 실패 패턴": "overall",
  "나에게 맞는 삶의 방식": "lifePurpose",
});

const FOCUS_AREAS = new Set(Object.keys(FOCUS_AREA_LABELS));
const FORBIDDEN_RESULT_PATTERN = /\bPDF\b|\bprogress\b|\bjob\b|프롬프트|시스템|\bAI\b|인공지능|이 기능은|이 결과는|분석 결과는/gi;
const CANONICAL_TEN_GODS = Object.freeze(["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]);
const LIFE_BOOK_EXPECTED_CHAPTER_COUNT = 10;
const LIFE_BOOK_MIN_CHAPTER_CONTENT_CHARS = 700;
const LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS = 10000;
const LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS = 20000;
const LIFE_FORTUNE_MIN_CHAPTER_CONTENT_CHARS = 2400;
const LIFE_FORTUNE_MIN_EXPERT_READING_CONTENT_CHARS = 1200;
const LIFE_FORTUNE_MIN_TOTAL_CONTENT_CHARS = 30000;
const LIFE_FORTUNE_MAX_TOTAL_CONTENT_CHARS = 60000;
// 인생종합운은 총 30,000~60,000자 JSON 요구(한국어 1자≈1~1.5토큰) — 구 상한 40000은
// 최소 분량 상단에서도 잘려 LIFE_FORTUNE_REPORT_INVALID 하드 실패를 유발했다(모델 한계 65,536).
const LIFE_FORTUNE_MAX_OUTPUT_TOKENS = 65000;
// 인생의 책은 총 10,000~20,000자 JSON — 구 상한 18000은 목표 상단에서 잘렸다.
const LIFE_BOOK_MAX_OUTPUT_TOKENS = 32000;
const LIFE_FORTUNE_TIMEOUT_MS = 90000;
const LIFE_BOOK_GENERATING_REUSE_MS = 8 * 60 * 1000;
const LIFE_BOOK_GENERATING_STALE_MS = 45 * 60 * 1000;
// 2회 허용: 1회 생성 + 품질 미달 시 1회 수선. 1이면 수선 프롬프트가 데드코드가 된다.
const LIFE_BOOK_MAX_PROVIDER_CALLS_PER_GENERATION = 2;
const LIFE_BOOK_RESULT_TEXT_MAX_CHARS = 140000;
const LIFE_FORTUNE_CHAPTER_TITLES = Object.freeze([
  "타고난 명식의 중심",
  "성격과 마음의 결",
  "재능과 일의 방향",
  "재물과 생활 기반",
  "사랑과 인연의 흐름",
  "관계와 가족의 장",
  "건강과 생활 리듬",
  "대운으로 보는 큰 전환",
  "가까운 세운의 흐름",
  "앞으로 열릴 선택",
]);
const LIFE_FORTUNE_EVIDENCE_REF_ROOTS = Object.freeze([
  "yearPillar",
  "monthPillar",
  "dayPillar",
  "hourPillar",
  "dayMaster",
  "pillarDetails",
  "fiveElements",
  "tenGods",
  "tenGodsByPillar",
  "strength",
  "usefulGod",
  "unfavorableGod",
  "seasonalBalance",
  "natalInteractions",
  "relationSummary",
  "majorLuck",
  "yearlyLuck",
  "fortuneFacts",
  "interpretationPlan",
  "calculationMeta",
]);
const startLocks = new Map();

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
    hasGeminiKey,
    hasEnvAI,
    willUseRealLLM: hasGeminiKey || hasEnvAI,
    providerReason: hasGeminiKey ? "gemini_api_key_available" : hasEnvAI ? "workers_ai_binding_available" : "no_real_llm_provider_detected",
  };
}

function isDevelopmentEnv(env = {}) {
  const mode = clean(env?.NODE_ENV || env?.ENVIRONMENT || env?.APP_ENV || readProcessEnv("NODE_ENV"), 40).toLowerCase();
  return mode && mode !== "production";
}

function maskBirthDate(value) {
  const text = clean(value, 10);
  const match = text.match(/^(\d{4})-/);
  return match ? `${match[1]}-**-**` : "";
}

function maskName(value) {
  const text = clean(value, 80);
  if (!text) return "";
  if (text.length <= 1) return "*";
  return `${text.slice(0, 1)}${"*".repeat(Math.min(3, text.length - 1))}`;
}

function safeLogPayload({ route = "", requestId = "", body = {}, normalized = null, validation = "", access = "", payment = "", env = {}, error = null, providerReason = "" } = {}) {
  const input = normalized?.input || {};
  const birthInfo = input.birthInfo || body.birthInfo || {};
  const diagnostics = getProviderDiagnostics(env);
  return {
    route: clean(route || "/api/life-book-ai", 120),
    requestId: clean(requestId || body.requestId || body.idempotencyKey, 180),
    serviceType: clean(input.serviceType || body.serviceType || body.featureKey || FEATURE_KEY, 80),
    consultationType: clean(input.consultationType || body.consultationType || "lifeBook", 40),
    focusArea: clean(input.focusArea || body.focusArea || "", 40),
    validation,
    access,
    payment,
    name: maskName(input.birthInfo?.name || birthInfo.name || body.userName || body.name),
    gender: clean(input.birthInfo?.gender || birthInfo.gender || body.gender, 20),
    birthDate: maskBirthDate(input.birthInfo?.birthDate || birthInfo.birthDate || body.birthDate),
    calendarType: clean(input.birthInfo?.calendarType || birthInfo.calendarType || body.calendarType, 20),
    emphasisArea: clean(input.focusArea || body.focusArea || "", 40),
    ...diagnostics,
    providerReason: providerReason || diagnostics.providerReason,
    ...(error ? {
      errorMessage: clean(error?.message || error, 500),
      ...(isDevelopmentEnv(env) ? { stack: clean(error?.stack, 2000) } : {}),
    } : {}),
  };
}

function logLifeBookAi(marker, details = {}, level = "info") {
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  console[method](`[LifeBook AI ${marker}]`, details);
}

function sha256(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function shortHash(value, length = 16) {
  const text = clean(value);
  return text ? sha256(text).slice(0, length) : "";
}

function logLifeBookAction(action, details = {}, level = "info") {
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  console[method]("[LifeBook AI action]", {
    action,
    requestId: clean(details.requestId || "", 180),
    serviceId: clean(details.serviceId || FEATURE_KEY, 80),
    userIdHash: clean(details.userIdHash || shortHash(details.userId), 64),
    profileIdPresent: Boolean(details.profileId || details.profileIdPresent),
    idempotencyKeyHash: clean(details.idempotencyKeyHash || shortHash(details.idempotencyKey || details.requestId), 64),
    providerCallCount: Number(details.providerCallCount || 0) || 0,
    cacheHit: Boolean(details.cacheHit),
    duplicateBlocked: Boolean(details.duplicateBlocked),
    status: clean(details.status || "", 40),
    route: clean(details.route || "", 120),
    reason: clean(details.reason || "", 120),
  });
}

function buildProviderLogContext({ requestId = "", userId = "", idempotencyKey = "", providerCallCount = 0, cacheHit = false, duplicateBlocked = false } = {}) {
  return {
    requestId: clean(requestId, 180),
    serviceId: FEATURE_KEY,
    userIdHash: shortHash(userId),
    profileIdPresent: false,
    idempotencyKeyHash: shortHash(idempotencyKey || requestId),
    providerCallCount,
    cacheHit,
    duplicateBlocked,
  };
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
      || body?.requestId
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key"),
    180,
  ).replace(/[^a-zA-Z0-9._:-]/g, "-");
}

function randomToken(length = 10) {
  const bytes = new Uint8Array(Math.max(8, Math.ceil(length * 0.75)));
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map((byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, length);
}

function normalizeGender(value) {
  const text = clean(value, 20).toLowerCase();
  if (["m", "male", "man", "남", "남성", "남자"].includes(text)) return "male";
  if (["f", "female", "woman", "여", "여성", "여자"].includes(text)) return "female";
  if (["unknown", "other", "none", "비공개", "기타"].includes(text)) return "unknown";
  return text || "";
}

function normalizeCalendarType(value) {
  const text = clean(value, 20).toLowerCase();
  if (["solar", "양력"].includes(text)) return "solar";
  if (["lunar", "음력"].includes(text)) return "lunar";
  return "";
}

function normalizeServiceType(value) {
  const text = clean(value || FEATURE_KEY, 80);
  if ([FEATURE_KEY, SERVICE_KEY].includes(text)) return FEATURE_KEY;
  return "";
}

function normalizeConsultationType(value) {
  const text = clean(value || "lifeBook", 40);
  const lower = text.toLowerCase();
  if (["lifeBook", "lifebook", "life-book", "life_book"].includes(text)) return "lifeBook";
  if (["lifefortune", "life-fortune", "life_fortune", "lifeFortune"].includes(text) || ["lifefortune", "life-fortune", "life_fortune"].includes(lower)) return "lifeFortune";
  return "";
}

function isLifeFortuneInput(input = {}) {
  return clean(input.consultationType, 40) === "lifeFortune";
}

function getConsultationOrderName(input = {}) {
  return isLifeFortuneInput(input) ? "인생 총운 AI 상담" : ORDER_NAME;
}

function normalizeFocusArea(value, fallbackTopic = "") {
  const token = clean(value, 40);
  if (FOCUS_AREAS.has(token)) return token;
  const topic = clean(fallbackTopic, 120);
  if (LEGACY_TOPIC_TO_FOCUS[topic]) return LEGACY_TOPIC_TO_FOCUS[topic];
  const matched = Object.entries(FOCUS_AREA_LABELS).find(([, label]) => label === topic);
  return matched?.[0] || "";
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeConsultationInput(body = {}) {
  const birthSource = body.birthInfo && typeof body.birthInfo === "object" ? body.birthInfo : body;
  const serviceType = normalizeServiceType(body.serviceType || body.featureKey || FEATURE_KEY);
  const consultationType = normalizeConsultationType(body.consultationType || "lifeBook");
  const name = clean(body.userName ?? body.name ?? body.nickname ?? birthSource.name ?? birthSource.nickname, 80);
  const gender = normalizeGender(body.gender ?? birthSource.gender);
  const birthDate = clean(body.birthDate ?? birthSource.birthDate, 10);
  const birthTimeUnknown = body.birthTimeUnknown === true || birthSource.birthTimeUnknown === true;
  const birthTime = birthTimeUnknown ? "" : clean(body.birthTime ?? birthSource.birthTime, 5);
  const calendarType = normalizeCalendarType(body.calendarType ?? birthSource.calendarType);
  const normalizedFocusArea = normalizeFocusArea(body.focusArea, body.topic ?? body.consultationTopic);
  const focusArea = consultationType === "lifeFortune" ? (normalizedFocusArea || "overall") : normalizedFocusArea;
  const topic = consultationType === "lifeFortune"
    ? clean(body.topic ?? body.consultationTopic ?? "전체 인생 총운", 120)
    : clean(body.topic ?? body.consultationTopic ?? FOCUS_AREA_LABELS[focusArea], 120);
  const locale = clean(body.locale || "ko", 12) || "ko";

  if (!serviceType || !consultationType) return { ok: false, message: MESSAGES.invalidInput };
  if (!gender) return { ok: false, message: MESSAGES.invalidInput };
  if (consultationType === "lifeFortune" && gender === "unknown") return { ok: false, message: MESSAGES.genderRequired };
  if (!isValidDateKey(birthDate)) return { ok: false, message: MESSAGES.invalidInput };
  if (!calendarType) return { ok: false, message: MESSAGES.invalidInput };
  if (!birthTimeUnknown && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) return { ok: false, message: MESSAGES.birthTimeMissing };
  if (!focusArea || !FOCUS_AREAS.has(focusArea)) return { ok: false, message: MESSAGES.invalidInput };

  const normalized = {
    serviceType,
    consultationType,
    birthInfo: {
      name,
      gender,
      birthDate,
      birthTime,
      birthTimeUnknown,
      calendarType,
    },
    focusArea,
    topic: topic || FOCUS_AREA_LABELS[focusArea],
    locale,
  };
  return { ok: true, input: normalized, inputHash: sha256(stableJson(normalized)) };
}

function invalidInput(message = MESSAGES.invalidInput, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message }, { status });
}

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
}

function serverError(message = MESSAGES.prepareFailed, status = 500) {
  return json({ ok: false, reason: "SERVER_ERROR", message }, { status });
}

function paymentVerifyFailed() {
  return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: MESSAGES.paymentVerifyFailed }, { status: 402 });
}

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = resolved?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice ?? pricing?.cost);
  const amountKRW = Number(pricing?.amountKRW ?? pricing?.paymentAmount ?? pricing?.cashPrice);
  if (!resolved?.ok || !pricing || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error("life-book-ai price not found");
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
    .select("email name phoneNumber role points profileSubscription monthlySubscription subscription membership pass entitlement licenses paidFeatures unlockedFeatures")
    .lean();
}

async function findPaidPayment({ userId, idempotencyKey = "", paymentId = "" }) {
  const clauses = [];
  if (idempotencyKey) clauses.push({ idempotencyKey });
  if (paymentId) clauses.push({ merchantUid: paymentId }, { impUid: paymentId }, { requestId: paymentId });
  if (!clauses.length) return null;
  return Payment.findOne({
    userId,
    featureKey: FEATURE_KEY,
    paymentType: "digital_content",
    accessType: "single_purchase",
    status: { $in: ["paid", "success", "fulfilled"] },
    $or: clauses,
  }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
}

function mapPaidDecision(decision = {}) {
  const source = clean(decision.accessSource).toLowerCase();
  const license = clean(decision.licenseType).toLowerCase();
  const reason = clean(decision.reason).toLowerCase();
  if (license === "single_purchase" || source.includes("paidfeature") || reason.includes("already_purchased")) return null;
  if (source.includes("monthly") || license.includes("monthly") || reason.includes("monthly")) {
    return { accessType: "subscription", accessSource: "monthly_subscription" };
  }
  if (source.includes("license") || license.includes("license")) return { accessType: "pass", accessSource: source || "license" };
  return { accessType: "pass", accessSource: source || "pass" };
}

async function resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash, input = {}, paymentId = "" }) {
  const orderName = getConsultationOrderName(input);
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", accessSource: "admin", paymentId: "" };
  }

  const paidPayment = await findPaidPayment({ userId: auth.userId, idempotencyKey, paymentId });
  if (paidPayment) {
    const storedHash = clean(paidPayment?.pricingSnapshot?.inputHash);
    if (storedHash && storedHash !== inputHash) return { ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput };
    return { ok: true, accessType: "paid", accessSource: "single_purchase", paymentId: clean(paidPayment.merchantUid || paidPayment.impUid || paymentId, 160) };
  }

  const pass = normalizeHoneyPassEntitlement(user || {});
  if (canUseByPass(pass, pricing.coinPrice)) return { ok: true, accessType: "pass", accessSource: "license_pass", paymentId: "" };

  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env: pricing.env, reason: orderName });
  if (decision?.allowed) {
    const mapped = mapPaidDecision(decision);
    if (mapped) return { ok: true, ...mapped, paymentId: "" };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function buildBillingGatePayload(pricing, idempotencyKey, input = {}, inputHash = "") {
  const orderName = getConsultationOrderName(input);
  const consultationType = normalizeConsultationType(input.consultationType || "lifeBook");
  return {
    billingMode: "coin-gate",
    featureKey: FEATURE_KEY,
    serviceId: SERVICE_KEY,
    serviceType: FEATURE_KEY,
    contentId: FEATURE_KEY,
    contentType: SERVICE_KEY,
    consultationType,
    orderName,
    reason: orderName,
    cost: pricing.coinPrice,
    coinPrice: pricing.coinPrice,
    amountKRW: pricing.amountKRW,
    amountKrw: pricing.amountKRW,
    paymentAmount: pricing.amountKRW,
    membershipCreditCost: pricing.membershipCreditCost,
    requestId: idempotencyKey,
    idempotencyKey,
    inputHash,
    deferUsage: true,
    forceDeduct: true,
    runtimeGate: {
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      featureKey: FEATURE_KEY,
      consultationType,
      orderName,
      reason: orderName,
      productId: SERVICE_KEY,
      productType: SERVICE_KEY,
      serviceType: FEATURE_KEY,
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      amountKrw: pricing.amountKRW,
      paymentAmount: pricing.amountKRW,
      membershipCreditCost: pricing.membershipCreditCost,
      requestId: idempotencyKey,
      idempotencyKey,
      inputHash,
      deferUsage: true,
      forceDeduct: true,
    },
  };
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function billingGateSource(body = {}) {
  return objectValue(body.billingGate || body.billing || body.billingResult || body.paymentContext || body._paymentContext);
}

function collectBillingObjects(body = {}) {
  const gate = billingGateSource(body);
  const result = objectValue(body.result || gate.result);
  const payment = objectValue(body.payment || gate.payment);
  const consume = objectValue(body.consume || gate.consume);
  const accessGrant = objectValue(body.accessGrant || gate.accessGrant || gate.accessGateResult);
  const pricing = objectValue(body.pricing || gate.pricing);
  const pricingSnapshot = objectValue(body.pricingSnapshot || gate.pricingSnapshot || payment.pricingSnapshot || pricing.pricingSnapshot);
  const runtimeGate = objectValue(body.runtimeGate || gate.runtimeGate || accessGrant.runtimeGate);
  const licensePass = objectValue(body.licensePass || body.membershipPass || gate.licensePass || gate.membershipPass || accessGrant.licensePass || accessGrant.membershipPass);
  const metadata = objectValue(body.metadata || gate.metadata || payment.metadata || consume.metadata || accessGrant.metadata || pricing.metadata || pricingSnapshot.metadata);
  const deferredUsage = objectValue(body.deferredUsage || gate.deferredUsage || result.deferredUsage || metadata.deferredUsage);
  return { gate, runtimeGate, consume, accessGrant, pricing, pricingSnapshot, payment, licensePass, metadata, deferredUsage };
}

function billingFeatureMatches(body = {}) {
  const { gate, runtimeGate, consume, accessGrant, pricing, pricingSnapshot, payment, licensePass, metadata, deferredUsage } = collectBillingObjects(body);
  const keys = [
    body.featureKey,
    body.subFeatureKey,
    body.serviceType,
    gate.featureKey,
    gate.subFeatureKey,
    gate.serviceType,
    runtimeGate.featureKey,
    runtimeGate.subFeatureKey,
    runtimeGate.serviceType,
    consume.featureKey,
    accessGrant.featureKey,
    pricing.featureKey,
    pricing.subFeatureKey,
    pricingSnapshot.featureKey,
    pricingSnapshot.subFeatureKey,
    payment.featureKey,
    licensePass.featureKey,
    metadata.featureKey,
    metadata.subFeatureKey,
    deferredUsage.featureKey,
    deferredUsage.serviceType,
  ].map((item) => clean(item).toLowerCase()).filter(Boolean);
  return keys.includes(FEATURE_KEY) || keys.includes(SERVICE_KEY);
}

function addEvidenceId(ids, value) {
  const id = clean(value, 180);
  if (id) ids.add(id);
}

function collectBillingEvidenceIds(body = {}) {
  const ids = new Set();
  const visit = (source, depth = 0) => {
    if (!source || typeof source !== "object" || Array.isArray(source) || depth > 3) return;
    [
      "_id",
      "id",
      "paymentId",
      "merchantUid",
      "merchant_uid",
      "impUid",
      "imp_uid",
      "transactionId",
      "purchaseId",
      "ledgerId",
      "evidenceId",
      "requestId",
      "idempotencyKey",
      "orderId",
      "executionId",
      "pointHistoryId",
      "monthlyCreditLedgerId",
      "receiptId",
    ].forEach((key) => addEvidenceId(ids, source?.[key]));
    [
      "data",
      "billingGate",
      "billing",
      "billingResult",
      "paymentContext",
      "_paymentContext",
      "runtimeGate",
      "consume",
      "accessGrant",
      "accessGateResult",
      "pricing",
      "pricingSnapshot",
      "payment",
      "licensePass",
      "membershipPass",
      "metadata",
      "result",
      "deferredUsage",
      "evidence",
    ].forEach((key) => visit(source?.[key], depth + 1));
  };
  visit(body);
  return [...ids];
}

function collectBillingContractValues(body = {}, field = "") {
  const values = new Set();
  const { gate, runtimeGate, consume, accessGrant, pricing, pricingSnapshot, payment, licensePass, metadata, deferredUsage } = collectBillingObjects(body);
  const deferredEvidence = objectValue(deferredUsage.evidence);
  const sources = [body, gate, runtimeGate, consume, accessGrant, pricing, pricingSnapshot, payment, licensePass, metadata, deferredUsage, deferredEvidence];
  for (const source of sources) {
    addEvidenceId(values, source?.[field]);
    if (field === "requestId" || field === "idempotencyKey") {
      addEvidenceId(values, source?.purchaseId);
      addEvidenceId(values, source?.executionId);
    }
    if (field === "inputHash") {
      addEvidenceId(values, source?.payloadHash);
      addEvidenceId(values, source?.input_hash);
      addEvidenceId(values, source?.pricingSnapshot?.inputHash);
      addEvidenceId(values, source?.pricingSnapshot?.payloadHash);
    }
  }
  return [...values];
}

function billingContractMatches(body = {}, { idempotencyKey = "", inputHash = "", consultationType = "" } = {}) {
  const requestValues = new Set([
    ...collectBillingContractValues(body, "requestId"),
    ...collectBillingContractValues(body, "idempotencyKey"),
  ].map((value) => clean(value, 180)).filter(Boolean));
  if (idempotencyKey && (!requestValues.size || !requestValues.has(idempotencyKey))) return false;

  const inputHashes = collectBillingContractValues(body, "inputHash").map((value) => clean(value, 120)).filter(Boolean);
  if (inputHashes.length && inputHash && !inputHashes.includes(inputHash)) return false;

  const consultationTypes = collectBillingContractValues(body, "consultationType").map((value) => normalizeConsultationType(value)).filter(Boolean);
  if (consultationTypes.length && consultationType && !consultationTypes.includes(consultationType)) return false;

  return true;
}

function objectIdLike(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function pointHistoryEvidenceClauses(ids = []) {
  const clauses = [];
  for (const id of ids) {
    clauses.push({ "metadata.requestId": id });
    clauses.push({ "metadata.purchaseId": id });
    clauses.push({ "metadata.idempotencyKey": id });
    clauses.push({ "metadata.orderId": id });
    clauses.push({ "metadata.transactionId": id });
    clauses.push({ "metadata.ledgerId": id });
    clauses.push({ "metadata.evidenceId": id });
    clauses.push({ impUid: id });
    clauses.push({ merchantUid: id });
    if (objectIdLike(id)) clauses.push({ _id: id }, { paymentId: id });
  }
  return clauses;
}

function paymentEvidenceClauses(ids = []) {
  const clauses = [];
  for (const id of ids) {
    clauses.push({ requestId: id });
    clauses.push({ idempotencyKey: id });
    clauses.push({ merchantUid: id });
    clauses.push({ impUid: id });
    clauses.push({ "metadata.requestId": id });
    clauses.push({ "metadata.idempotencyKey": id });
    clauses.push({ "metadata.purchaseId": id });
    clauses.push({ "metadata.transactionId": id });
    clauses.push({ "metadata.paymentId": id });
    if (objectIdLike(id)) clauses.push({ _id: id });
  }
  return clauses;
}

function monthlyLedgerEvidenceClauses(ids = []) {
  const clauses = [];
  for (const id of ids) {
    clauses.push({ sourceId: id });
    clauses.push({ "metadata.requestId": id });
    clauses.push({ "metadata.purchaseId": id });
    clauses.push({ "metadata.idempotencyKey": id });
    clauses.push({ "metadata.orderId": id });
    clauses.push({ "metadata.pointHistoryId": id });
    clauses.push({ "metadata.transactionId": id });
    clauses.push({ "metadata.ledgerId": id });
    clauses.push({ "metadata.evidenceId": id });
    if (objectIdLike(id)) clauses.push({ _id: id });
  }
  return clauses;
}

function billingContractEvidenceClauses({ idempotencyKey = "", inputHash = "" } = {}) {
  const clauses = [];
  if (idempotencyKey) {
    clauses.push(
      { requestId: idempotencyKey },
      { idempotencyKey },
      { executionId: idempotencyKey },
      { orderId: idempotencyKey },
      { sourceId: idempotencyKey },
      { "metadata.requestId": idempotencyKey },
      { "metadata.idempotencyKey": idempotencyKey },
      { "metadata.orderId": idempotencyKey },
      { "metadata.purchaseId": idempotencyKey },
      { "metadata.sourceId": idempotencyKey },
      { "result.deferredUsage.requestId": idempotencyKey },
      { "result.deferredUsage.idempotencyKey": idempotencyKey },
      { "result.deferredUsage.purchaseId": idempotencyKey },
      { "result.deferredUsage.evidence.requestId": idempotencyKey },
    );
  }
  if (inputHash) {
    clauses.push(
      { inputHash },
      { payloadHash: inputHash },
      { "metadata.inputHash": inputHash },
      { "metadata.payloadHash": inputHash },
      { "pricingSnapshot.inputHash": inputHash },
      { "pricingSnapshot.payloadHash": inputHash },
      { "result.deferredUsage.inputHash": inputHash },
      { "result.deferredUsage.payloadHash": inputHash },
      { "result.deferredUsage.evidence.inputHash": inputHash },
      { "result.deferredUsage.evidence.payloadHash": inputHash },
    );
  }
  return clauses;
}

function mapBillingGateAccessType(source = {}) {
  const haystack = [
    source.accessType,
    source.accessMethod,
    source.paymentMethod,
    source.transactionType,
    source.paymentMode,
  ].map((item) => clean(item).toLowerCase()).join(" ");
  if (/admin/.test(haystack)) return "admin";
  if (/membership_credit|monthly|moonlight/.test(haystack)) return "subscription";
  if (/membership_pass|family_pass|license|pass|family/.test(haystack)) return "pass";
  return "paid";
}

async function resolveBillingGateAccess({ env, auth, body, idempotencyKey = "", inputHash = "", consultationType = "" }) {
  if (!billingFeatureMatches(body)) return null;
  if (!billingContractMatches(body, { idempotencyKey, inputHash, consultationType })) return null;
  const ids = collectBillingEvidenceIds(body);
  if (!ids.length) return null;
  const contractClauses = billingContractEvidenceClauses({ idempotencyKey, inputHash });

  await connectDb(env);
  const deferredClauses = [];
  for (const id of ids) {
    deferredClauses.push({ requestId: id }, { executionId: id }, { paymentId: id }, { orderId: id });
    if (objectIdLike(id)) deferredClauses.push({ _id: id });
  }
  const deferredRecord = deferredClauses.length
    ? await PaidExecutionRecord.findOne({
      userId: clean(auth.userId),
      featureId: FEATURE_KEY,
      status: { $in: ["paid_pending_generation", "generating", "generation_failed", "completed"] },
      $and: [
        { $or: deferredClauses },
        ...(contractClauses.length ? [{ $or: contractClauses }] : []),
      ],
    }).sort({ updatedAt: -1, createdAt: -1 }).select("_id executionId accessMethod paymentId result status").lean()
    : null;
  if (deferredRecord) {
    const deferredUsage = objectValue(deferredRecord?.result?.deferredUsage);
    return {
      ok: true,
      accessType: mapBillingGateAccessType({
        accessType: deferredUsage.accessType,
        accessMethod: deferredUsage.paymentMethod || deferredRecord.accessMethod,
      }),
      accessSource: "billing_gate_deferred",
      executionId: clean(deferredRecord.executionId, 160),
      paymentId: String(deferredRecord._id || deferredRecord.paymentId || ""),
    };
  }

  const pointClauses = pointHistoryEvidenceClauses(ids);
  const pointHistory = pointClauses.length
    ? await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: FEATURE_KEY,
      "metadata.refundedForServiceExecution": { $ne: true },
      $and: [
        { $or: pointClauses },
        ...(contractClauses.length ? [{ $or: contractClauses }] : []),
      ],
    }).sort({ createdAt: -1 }).select("_id delta metadata").lean()
    : null;
  if (pointHistory) {
    return {
      ok: true,
      accessType: mapBillingGateAccessType(pointHistory.metadata || {}),
      accessSource: "billing_gate",
      paymentId: String(pointHistory._id || ""),
      evidenceType: "coin",
      evidenceId: String(pointHistory._id || ""),
      amount: Math.max(0, Math.floor(Math.abs(Number(pointHistory.delta || pointHistory?.metadata?.chargedCoins || 0)))),
    };
  }

  const ledgerClauses = monthlyLedgerEvidenceClauses(ids);
  const ledger = ledgerClauses.length
    ? await MonthlyCreditLedger.findOne({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: { $in: [FEATURE_KEY, SERVICE_KEY] },
      "metadata.refundedForServiceExecution": { $ne: true },
      $and: [
        { $or: ledgerClauses },
        ...(contractClauses.length ? [{ $or: contractClauses }] : []),
      ],
    }).sort({ createdAt: -1 }).select("_id amount sourceId").lean()
    : null;
  if (ledger) {
    return {
      ok: true,
      accessType: "subscription",
      accessSource: "billing_gate",
      paymentId: String(ledger._id || ""),
      evidenceType: "monthly_credit",
      evidenceId: String(ledger._id || ""),
      amount: Math.max(0, Math.floor(Number(ledger.amount || 0))),
    };
  }

  const paymentClauses = paymentEvidenceClauses(ids);
  const payment = paymentClauses.length
    ? await Payment.findOne({
      userId: auth.userId,
      paymentType: "digital_content",
      status: { $in: ["paid", "success", "fulfilled"] },
      $and: [
        { $or: paymentClauses },
        ...(contractClauses.length ? [{ $or: contractClauses }] : []),
        {
          $or: [
            { featureKey: FEATURE_KEY },
            { "pricingSnapshot.featureKey": FEATURE_KEY },
            { "metadata.featureKey": FEATURE_KEY },
          ],
        },
      ],
    }).sort({ paidAt: -1, updatedAt: -1, createdAt: -1 }).select("_id merchantUid impUid requestId").lean()
    : null;
  if (payment) {
    return {
      ok: true,
      accessType: "paid",
      accessSource: "billing_gate",
      paymentId: clean(payment.merchantUid || payment.impUid || payment.requestId || payment._id, 160),
      evidenceType: "payment",
      evidenceId: String(payment._id || ""),
    };
  }

  return null;
}

function buildSystemPrompt(consultationType = "lifeBook") {
  const isFortune = consultationType === "lifeFortune";
  const toneLines = isFortune
    ? [
      "이 상담은 '인생 총운' — 서사보다 정확한 진단과 통찰이 중심입니다. 문장마다 명리 근거(일간, 용신, 십성, 대운)를 붙이고, 근거 없는 덕담과 보일러플레이트('당신은 특별합니다' 류)는 금지합니다.",
      "강점과 리스크를 균형 있게 제시합니다. 리스크를 말할 때는 반드시 조절 방법을 함께 붙이고, 강점을 말할 때는 그것이 통하는 조건을 함께 붙입니다.",
    ]
    : [
      "이 상담은 '인생의 책' — 읽는 경험 자체가 선물인 서사형 리포트입니다. 각 장은 설명문 나열이 아니라, 한 사람의 인생 소설을 곁에서 읽어 주는 다정한 화자의 이야기로 씁니다.",
      "명리 근거는 각주처럼 나열하지 말고 이야기 속 문장으로 자연스럽게 녹입니다. 예: '경금 일간의 당신은…'처럼 근거가 서사의 일부가 되게 하되, 근거 없는 뜬구름 덕담으로 문단을 채우지 않습니다.",
      "화자의 시점과 톤은 처음부터 끝까지 같은 사람이 읽어 주듯 일관되게 유지합니다.",
    ];
  return [
    "당신은 30년 경력의 사주 명리학자이자, 한 사람의 삶을 조용히 오래 살펴 온 운명 상담가입니다.",
    "사용자의 생년월일, 성별, 출생시간, 계산된 사주 명리 데이터를 바탕으로 삶의 흐름을 한 권의 책처럼 읽어 줍니다.",
    ...toneLines,
    "질문에 짧게 답하지 말고, 타고난 사주, 성격, 사랑, 일, 재물, 대운, 세운, 삶의 목적이 서로 이어지는 깊은 상담문으로 작성합니다.",
    "각 장은 명식에서 드러나는 근거, 그 근거가 삶에서 만드는 의미, 지금 현실에서 선택할 수 있는 조언의 순서로 자연스럽게 흐르게 합니다.",
    "인생을 단정하거나 겁주지 말고, 사용자가 앞으로 선택할 수 있는 방향을 부드럽고도 분명하게 비춥니다.",
    "“당신은 이렇게 살 운명이다”, “반드시 실패한다”, “무조건 성공한다” 같은 단정적 표현을 쓰지 않습니다.",
    `십성 이름은 계산 데이터에 있는 이름만 그대로 사용합니다. 허용되는 십성 이름: ${CANONICAL_TEN_GODS.join(", ")}.`,
    "명식, 십성, 대운, 세운은 서버 계산 JSON의 값을 근거로 삼고, 계산 데이터에 없는 간지·십성·대운 시작일을 새로 만들지 않습니다.",
    "각 장은 자연스러운 한국어 문장으로 충분히 길고 구체적으로 작성하되, 같은 표현과 같은 결론을 반복하지 않습니다.",
    "사용자가 실제로 오늘 선택할 수 있는 행동 조언을 포함하고, 조언은 감정 위로와 현실적 방향이 함께 느껴지게 씁니다.",
    "PDF, 다운로드, 진행률, job, prompt, system, AI 같은 기술 표현은 결과에 드러내지 않습니다.",
  ].join("\n");
}

function buildLifeFortunePrompt(input, sajuResult) {
  const birth = input.birthInfo || {};
  const chapterGuides = [
    "1장 타고난 명식의 중심: 년주·월주·일주·시주, 일간, 월지, 지장간, 오행 분포, 신강·신약의 근거를 먼저 잡고 명식 전체의 중심축을 풉니다.",
    "2장 성격과 마음의 결: 일간과 월령, 인성·비겁·식상의 작동을 통해 마음의 방어 방식, 회복 방식, 반복되는 감정 습관을 풉니다.",
    "3장 재능과 일의 방향: 식상·재성·관성의 연결, 월주와 시주의 사회적 쓰임, 직업 선택에서 살아나는 강점과 피해야 할 소모를 풉니다.",
    "4장 재물과 생활 기반: 재성의 위치와 강약, 비겁과 재성의 관계, 식상이 재성을 생하는 흐름, 지출과 축적의 리듬을 풉니다.",
    "5장 사랑과 인연의 흐름: 배우자성, 일지, 합충형파해 가능성, 관계에서 반복되는 끌림과 거리 조절 방식을 풉니다.",
    "6장 관계와 가족의 장: 년주·월주가 드러내는 뿌리, 가족 안에서 맡기 쉬운 역할, 인간관계에서 생기는 책임과 경계의 문제를 풉니다.",
    "7장 건강과 생활 리듬: 월령과 조후, 오행 과다·부족, 수면·소화·호흡·긴장 패턴처럼 현실 생활에서 조절할 리듬을 풉니다.",
    "8장 대운으로 보는 큰 전환: majorLuck.currentCycle, cycles, direction, startSolarDate, natalInteractions를 근거로 현재 대운의 배경과 다음 전환의 준비를 풉니다.",
    "9장 가까운 세운의 흐름: yearlyLuck의 각 연도 간지, 세운 십성, majorLuckPillar, natalInteractions를 바탕으로 가까운 5년의 기회와 주의 흐름을 풉니다.",
    "10장 앞으로 열릴 선택: 앞선 9장의 근거를 종합해 삶, 일, 재물, 관계, 건강을 어떤 순서로 조율하면 좋은지 구체적인 선택 기준을 남깁니다.",
  ];
  return [
    "아래 입력과 계산 가능한 명리 데이터를 바탕으로 인생 총운 상담문을 작성하세요.",
    "문체는 전문 명리학자가 한 사람을 오래 마주하고 직접 읽어 주듯 따뜻하고 깊게 유지하세요.",
    "각 장은 명식 근거, 삶에서 드러나는 의미, 현실에서 조정할 수 있는 선택을 자연스럽게 이어 주세요.",
    "반드시 JSON 객체 하나만 반환하세요. Markdown 제목, 코드블록, 안내 문장 없이 JSON만 남기세요.",
    "",
    "[사용자 입력]",
    `- 이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `- 성별: ${birth.gender}`,
    `- 생년월일: ${birth.birthDate}`,
    `- 출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `- 달력 기준: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `- 상담 주제: ${input.topic || "전체 인생 총운"}`,
    "",
    "[계산 가능한 사주 명리 데이터]",
    JSON.stringify(sajuResult, null, 2),
    "",
    "[반환 JSON 구조]",
    JSON.stringify({
      title: "인생 총운",
      subtitle: "타고난 명식과 시간의 흐름으로 읽는 삶의 큰 방향",
      profileSummary: {
        name: birth.name || "",
        birthDate: birth.birthDate || "",
        calendarType: birth.calendarType === "lunar" ? "음력" : "양력",
        birthTime: birth.birthTimeUnknown ? "모름" : birth.birthTime || "",
        gender: birth.gender || "",
      },
      coreSummary: {
        oneLine: "",
        lifeTheme: "",
        strongestElement: "",
        neededBalance: "",
      },
      chapters: [
        { chapterNumber: 1, title: "타고난 명식의 중심", summary: "", content: "", advice: [], evidenceRefs: ["dayMaster", "monthPillar", "seasonalBalance"] },
        { chapterNumber: 2, title: "성격과 마음의 결", summary: "", content: "", advice: [], evidenceRefs: ["dayMaster", "tenGodsByPillar.day", "tenGods"] },
        { chapterNumber: 3, title: "재능과 일의 방향", summary: "", content: "", advice: [], evidenceRefs: ["tenGods", "tenGodsByPillar.month", "fortuneFacts.strongestTenGods"] },
        { chapterNumber: 4, title: "재물과 생활 기반", summary: "", content: "", advice: [], evidenceRefs: ["tenGods", "fiveElements", "usefulGod"] },
        { chapterNumber: 5, title: "사랑과 인연의 흐름", summary: "", content: "", advice: [], evidenceRefs: ["pillarDetails.day", "natalInteractions", "tenGodsByPillar"] },
        { chapterNumber: 6, title: "관계와 가족의 장", summary: "", content: "", advice: [], evidenceRefs: ["pillarDetails.year", "pillarDetails.month", "relationSummary"] },
        { chapterNumber: 7, title: "건강과 생활 리듬", summary: "", content: "", advice: [], evidenceRefs: ["seasonalBalance", "fiveElements", "strength"] },
        { chapterNumber: 8, title: "대운으로 보는 큰 전환", summary: "", content: "", advice: [], evidenceRefs: ["majorLuck.currentCycle", "majorLuck.cycles", "majorLuck.direction"] },
        { chapterNumber: 9, title: "가까운 세운의 흐름", summary: "", content: "", advice: [], evidenceRefs: ["yearlyLuck", "majorLuck.currentCycle", "yearlyLuck.natalInteractions"] },
        { chapterNumber: 10, title: "앞으로 열릴 선택", summary: "", content: "", advice: [], evidenceRefs: ["fortuneFacts", "interpretationPlan", "usefulGod"] },
      ],
      expertReadings: [
        { title: "일간과 월지가 여는 중심 기질", content: "", guidance: [], evidenceRefs: ["dayMaster", "seasonalBalance", "pillarDetails.month"] },
        { title: "오행과 조후가 청하는 보완", content: "", guidance: [], evidenceRefs: ["fiveElements", "seasonalBalance", "usefulGod"] },
        { title: "십성으로 읽는 관계와 일의 방식", content: "", guidance: [], evidenceRefs: ["tenGods", "tenGodsByPillar", "fortuneFacts.strongestTenGods"] },
        { title: "대운과 세운이 비추는 선택의 시기", content: "", guidance: [], evidenceRefs: ["majorLuck", "yearlyLuck", "relationSummary"] },
      ],
      finalMessage: "",
      pdfSections: [],
    }, null, 2),
    "",
    "반드시 포함할 판독: 일간 중심 기질, 월지와 계절감, 오행 균형, 십성 구조, 조후, 강점과 약점, 사랑과 인연, 일과 재능, 재물 흐름, 인간관계, 가족과 뿌리, 건강과 생활 리듬, 대운 흐름, 가까운 세운 흐름, 삶의 목적, 지금 실천할 조언.",
    "[각 장별 상세 판독 기준]",
    chapterGuides.join("\n"),
    "각 장과 깊은 판독에는 evidenceRefs를 반드시 넣으세요. evidenceRefs는 계산 JSON 안의 경로만 적고, 각 장은 최소 3개 이상, 깊은 판독은 최소 2개 이상을 담으세요.",
    `evidenceRefs의 첫 경로는 다음 중 하나여야 합니다: ${LIFE_FORTUNE_EVIDENCE_REF_ROOTS.join(", ")}.`,
    "십성 이름은 계산 데이터의 tenGods 키와 허용 목록에 있는 이름만 사용하세요. 없는 십성 이름을 새로 만들거나 바꿔 부르지 마세요.",
    "대운은 majorLuck의 direction, startSolarDate, currentCycle, cycles, natalInteractions에 있는 값만 근거로 삼고, 세운은 yearlyLuck의 year, pillar, stemTenGod, majorLuckPillar, natalInteractions만 근거로 삼으세요.",
    "합·충·형·파·해, 삼합, 방합은 natalInteractions, majorLuck.cycles[].natalInteractions, yearlyLuck[].natalInteractions에 있는 항목만 말하세요.",
    "출생시간을 모르는 입력이거나 계산 데이터가 제한적이면 단정하지 말고 계산 가능한 범위에서만 상담하세요.",
    "열 장의 content와 expertReadings의 content를 모두 합산한 전체 본문은 최소 30,000자 이상, 60,000자 이하로 맞추며, 단순 반복이 아니라 장별 근거와 현실 조언을 세밀하게 보강하세요.",
    "분량이 부족할 때는 같은 문장을 늘리지 말고, 사주 전문가로서 일간·월지·오행·조후·십성·대운·세운을 더 세밀하게 판독하는 expertReadings를 보강하세요.",
    "문장의 양보다 명식 근거, 해석의 연결성, 현실 조언의 정확도를 우선하고, 근거 없이 감성 문장만 길게 늘리지 마세요.",
    "각 장 summary는 한 장의 핵심을 한 문장으로 담고, content는 최소 2,400자 이상의 6문단 이상으로 충분히 깊게 쓰며, advice는 사용자가 바로 붙잡을 수 있는 현실 조언을 3개 이상 담으세요.",
    "expertReadings의 각 content는 최소 1,200자 이상으로 쓰고, 원국·오행·조후·십성·대운·세운을 서로 다른 관점에서 보강하세요.",
    "열 장의 관점이 서로 겹치지 않게 하며, 같은 표현을 반복하기보다 장마다 다른 결을 살려 주세요.",
  ].join("\n");
}

function buildFirstPrompt(input, sajuResult) {
  if (isLifeFortuneInput(input)) return buildLifeFortunePrompt(input, sajuResult);
  const birth = input.birthInfo || {};
  return [
    "아래 입력과 계산 가능한 명리 데이터를 바탕으로 인생의 책 리포트를 작성하세요.",
    "문체는 전문 명리학자가 조용한 서재에서 한 사람을 오래 마주하고 직접 읽어 주듯 따뜻하고 깊게 유지하세요.",
    "각 장은 명식 근거, 삶에서 드러나는 의미, 오늘부터 현실에서 조정할 수 있는 선택을 자연스럽게 이어 주세요.",
    "가능하면 아래 JSON 구조만 반환하세요. JSON이 어렵다면 같은 장 구성을 Markdown `##` 제목으로 작성하세요.",
    "",
    "[사용자 입력]",
    `- 이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `- 성별: ${birth.gender}`,
    `- 생년월일: ${birth.birthDate}`,
    `- 출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `- 달력 기준: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `- 리포트 강조 영역: ${input.topic}`,
    "",
    "[계산 가능한 사주 명리 데이터]",
    JSON.stringify(sajuResult, null, 2),
    "",
    "[반환 JSON 구조]",
    JSON.stringify({
      title: "인생의 책",
      subtitle: "타고난 사주와 시간의 흐름으로 읽는 삶의 장면",
      profileSummary: {
        name: birth.name || "",
        birthDate: birth.birthDate || "",
        calendarType: birth.calendarType === "lunar" ? "음력" : "양력",
        birthTime: birth.birthTimeUnknown ? "모름" : birth.birthTime || "",
        gender: birth.gender || "",
      },
      coreSummary: {
        oneLine: "",
        lifeTheme: "",
        strongestElement: "",
        neededBalance: "",
      },
      chapters: [
        { chapterNumber: 1, title: "타고난 사주의 원형", summary: "", content: "", advice: [] },
        { chapterNumber: 2, title: "성격과 내면의 작동 방식", summary: "", content: "", advice: [] },
        { chapterNumber: 3, title: "재능과 일의 방향", summary: "", content: "", advice: [] },
        { chapterNumber: 4, title: "사랑과 인연", summary: "", content: "", advice: [] },
        { chapterNumber: 5, title: "재물과 현실 기반", summary: "", content: "", advice: [] },
        { chapterNumber: 6, title: "인간관계와 가족의 장", summary: "", content: "", advice: [] },
        { chapterNumber: 7, title: "건강과 조후의 균형", summary: "", content: "", advice: [] },
        { chapterNumber: 8, title: "대운으로 보는 인생의 큰 장면", summary: "", content: "", advice: [] },
        { chapterNumber: 9, title: "가까운 시기의 세운 조언", summary: "", content: "", advice: [] },
        { chapterNumber: 10, title: "인생의 책 마지막 문장", summary: "", content: "", advice: [] },
      ],
      expertReadings: [
        { title: "일간과 월지가 여는 중심 기질", content: "", guidance: [] },
        { title: "오행과 조후가 청하는 보완", content: "", guidance: [] },
        { title: "십성으로 읽는 관계와 일의 방식", content: "", guidance: [] },
        { title: "대운과 세운이 비추는 선택의 시기", content: "", guidance: [] },
      ],
      finalMessage: "",
      pdfSections: [],
    }, null, 2),
    "",
    "반드시 포함할 분석: 일간 중심 기질, 월지와 계절감, 오행 균형, 십성 구조, 조후, 강점과 약점, 사랑과 인연, 일과 재능, 재물 흐름, 인간관계, 가족과 뿌리, 건강과 생활 리듬, 대운 흐름, 가까운 세운 흐름, 삶의 목적, 지금 실천할 조언.",
    "십성 이름은 계산 데이터의 tenGods 키와 허용 목록에 있는 이름만 사용하세요. 없는 십성 이름을 새로 만들거나 바꿔 부르지 마세요.",
    "계산 데이터가 제한적이면 단정하지 말고 계산 가능한 범위에서만 상담하세요.",
    "열 장의 content와 expertReadings의 content를 모두 합산한 전체 본문은 10,000자 이상 20,000자 이하로 맞추며, 장별 10,000자가 아니라 전체 합산 기준입니다.",
    "분량이 부족할 때는 같은 문장을 늘리지 말고, 사주 전문가로서 일간·월지·오행·조후·십성·대운·세운을 더 세밀하게 판독하는 expertReadings를 보강하세요.",
    "문장의 양보다 명식 근거, 해석의 연결성, 현실 조언의 정확도를 우선하고, 근거 없이 감성 문장만 길게 늘리지 마세요.",
    "각 장 summary는 한 장의 핵심을 한 문장으로 담고, content는 최소 700자 이상의 3문단 이상으로 충분히 깊게 쓰며, advice는 사용자가 바로 붙잡을 수 있는 현실 조언을 2개 이상 담으세요.",
    "각 장 content에는 그 장과 관련된 명식 근거(일간, 월지, 오행, 십성, 대운 간지 중 해당되는 것)를 최소 2개, 설명체 각주가 아니라 이야기 속 문장으로 자연스럽게 녹여 언급하세요.",
    "열 장의 관점이 서로 겹치지 않게 하며, 같은 문장을 다른 장에 다시 쓰지 마세요. 같은 표현을 반복하기보다 장마다 다른 결을 살려 주세요.",
  ].join("\n");
}

function cleanForbiddenResult(value) {
  return clean(value, LIFE_BOOK_RESULT_TEXT_MAX_CHARS).replace(FORBIDDEN_RESULT_PATTERN, "").replace(/\n{3,}/g, "\n\n").trim();
}

function extractReportJson(content) {
  const raw = clean(content, LIFE_BOOK_RESULT_TEXT_MAX_CHARS).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function cleanEvidenceRefs(value) {
  return Array.isArray(value)
    ? value.map((item) => clean(item, 160)).filter(Boolean)
    : [];
}

function evidenceRefRoot(ref = "") {
  return clean(ref, 160).split(".")[0] || "";
}

function hasValidEvidenceRefs(refs = [], minCount = 1) {
  const cleaned = cleanEvidenceRefs(refs);
  if (cleaned.length < minCount) return false;
  return cleaned.every((ref) => LIFE_FORTUNE_EVIDENCE_REF_ROOTS.includes(evidenceRefRoot(ref)));
}

function getLifeBookReportQualityIssues(content, input = {}) {
  const issues = [];
  const text = clean(content, LIFE_BOOK_RESULT_TEXT_MAX_CHARS);
  const lifeFortune = isLifeFortuneInput(input);
  const minChapterContentChars = lifeFortune ? LIFE_FORTUNE_MIN_CHAPTER_CONTENT_CHARS : LIFE_BOOK_MIN_CHAPTER_CONTENT_CHARS;
  const minExpertReadingContentChars = lifeFortune ? LIFE_FORTUNE_MIN_EXPERT_READING_CONTENT_CHARS : 350;
  const minTotalContentChars = lifeFortune ? LIFE_FORTUNE_MIN_TOTAL_CONTENT_CHARS : LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS;
  const maxTotalContentChars = lifeFortune ? LIFE_FORTUNE_MAX_TOTAL_CONTENT_CHARS : LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS;
  if (!text) return ["empty_result"];
  if (hasForbiddenResultTerms(text)) issues.push("forbidden_terms");
  const report = extractReportJson(text);
  if (!report) {
    issues.push("report_json_missing");
    if (text.length < minTotalContentChars) issues.push("total_content_too_short");
    if (text.length > maxTotalContentChars) issues.push("total_content_too_long");
    return issues;
  }

  if (lifeFortune && !clean(report.title, 120).includes("인생 총운")) issues.push("life_fortune_title_missing");

  const chapters = Array.isArray(report.chapters) ? report.chapters : [];
  if (chapters.length !== LIFE_BOOK_EXPECTED_CHAPTER_COUNT) issues.push("chapter_count_mismatch");

  let totalContentLength = 0;
  chapters.forEach((chapter, index) => {
    const chapterNumber = index + 1;
    const summary = clean(chapter?.summary, 1200);
    const chapterContent = clean(chapter?.content, 20000);
    const advice = Array.isArray(chapter?.advice)
      ? chapter.advice.map((item) => clean(item, 1000)).filter(Boolean)
      : [];
    totalContentLength += chapterContent.length;
    if (lifeFortune && !clean(chapter?.title, 120).includes(LIFE_FORTUNE_CHAPTER_TITLES[index] || "")) issues.push(`chapter_${chapterNumber}_title_mismatch`);
    if (lifeFortune && !hasValidEvidenceRefs(chapter?.evidenceRefs, 3)) issues.push(`chapter_${chapterNumber}_evidence_refs_missing`);
    if (!summary) issues.push(`chapter_${chapterNumber}_summary_missing`);
    if (!chapterContent) issues.push(`chapter_${chapterNumber}_content_missing`);
    if (chapterContent && chapterContent.length < minChapterContentChars) issues.push(`chapter_${chapterNumber}_content_too_short`);
    if (advice.length < (lifeFortune ? 3 : 1)) issues.push(`chapter_${chapterNumber}_advice_missing`);
  });

  const expertReadings = Array.isArray(report.expertReadings) ? report.expertReadings : [];
  if (lifeFortune && expertReadings.length < 4) issues.push("expert_reading_count_too_short");
  expertReadings.forEach((reading, index) => {
    const readingNumber = index + 1;
    const title = clean(reading?.title, 200);
    const readingContent = clean(reading?.content, 12000);
    const guidance = Array.isArray(reading?.guidance)
      ? reading.guidance.map((item) => clean(item, 1000)).filter(Boolean)
      : [];
    totalContentLength += readingContent.length;
    if (lifeFortune && !hasValidEvidenceRefs(reading?.evidenceRefs, 2)) issues.push(`expert_reading_${readingNumber}_evidence_refs_missing`);
    if (!title) issues.push(`expert_reading_${readingNumber}_title_missing`);
    if (!readingContent) issues.push(`expert_reading_${readingNumber}_content_missing`);
    if (readingContent && readingContent.length < minExpertReadingContentChars) issues.push(`expert_reading_${readingNumber}_content_too_short`);
    if (readingContent && !guidance.length) issues.push(`expert_reading_${readingNumber}_guidance_missing`);
  });

  if (totalContentLength < minTotalContentChars) issues.push("total_content_too_short");
  if (totalContentLength > maxTotalContentChars) issues.push("total_content_too_long");

  // 장 간 중복 서사 검출: 20자 이상 동일 문장이 서로 다른 장에 다시 나오면 반려
  const sentenceOwner = new Map();
  let duplicateCount = 0;
  chapters.forEach((chapter, index) => {
    const sentences = clean(chapter?.content, 20000)
      .split(/(?<=[.!?다요])\s+|\n+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length >= 20);
    for (const sentence of new Set(sentences)) {
      if (sentenceOwner.has(sentence) && sentenceOwner.get(sentence) !== index) duplicateCount += 1;
      else sentenceOwner.set(sentence, index);
    }
  });
  if (duplicateCount >= 3) issues.push(`duplicate_narrative:${duplicateCount}`);
  return issues;
}

function buildLifeBookRepairPrompt(content, issues, input = {}) {
  const lifeFortune = isLifeFortuneInput(input);
  const reportName = lifeFortune ? "인생 총운 상담문" : "인생의 책 상담문";
  const chapterTitles = lifeFortune
    ? LIFE_FORTUNE_CHAPTER_TITLES
    : [
      "타고난 사주의 원형",
      "성격과 내면의 작동 방식",
      "재능과 일의 방향",
      "사랑과 인연",
      "재물과 현실 기반",
      "인간관계와 가족의 장",
      "건강과 조후의 균형",
      "대운으로 보는 인생의 큰 장면",
      "가까운 시기의 세운 조언",
      "인생의 책 마지막 문장",
    ];
  return [
    `다음 ${reportName}을 같은 JSON 구조로 다시 정돈해 주세요.`,
    lifeFortune ? "title은 반드시 \"인생 총운\"을 포함하고, 전체 상담은 총운의 큰 강줄기 안에서 삶, 일, 재물, 관계, 건강, 전환의 시기를 함께 펼쳐 주세요." : "title은 인생의 책 결을 유지하고, 전체 상담은 타고난 사주와 시간의 흐름을 한 권의 긴 상담문처럼 이어 주세요.",
    `권장 장 이름: ${chapterTitles.join(" / ")}`,
    lifeFortune
      ? "열 장을 모두 채우고, 각 장에는 summary, content, advice, evidenceRefs를 빠짐없이 담아 주세요."
      : "열 장을 모두 채우고, 각 장에는 summary, content, advice를 빠짐없이 담아 주세요.",
    lifeFortune
      ? "열 장 content와 expertReadings content의 전체 합산은 30,000자 이상 60,000자 이하로 조정하고, 각 장 content는 최소 2,400자 이상, expertReadings 각 content는 최소 1,200자 이상으로 유지해 주세요."
      : "열 장 content와 expertReadings content의 전체 합산은 10,000자 이상 20,000자 이하로 조정하고, 각 장 content는 최소 700자 이상으로 유지해 주세요.",
    lifeFortune
      ? "짧은 문장을 반복하지 말고, 부족한 깊이는 일간·월지·오행·조후·십성·지장간·대운·세운의 구체 근거로 각 장에 나누어 보강하세요. 60,000자를 넘었다면 중복되는 위로와 반복 결론만 덜어내고 명식 근거는 남겨 주세요."
      : "짧은 문장을 반복하지 말고, 부족한 깊이는 사주 전문가의 판독으로 expertReadings에 더해 주세요. 20,000자를 넘었다면 반복되는 위로와 중복 결론을 덜어내고 핵심 근거를 선명하게 남겨 주세요.",
    "각 장 content는 명식 근거, 삶에서 드러나는 의미, 현실 조언이 자연스럽게 이어지도록 충분히 깊게 써 주세요.",
    lifeFortune ? "대운과 세운은 계산 JSON의 majorLuck, yearlyLuck 값만 사용하고, 계산 데이터에 없는 간지·십성·대운 시작일은 만들지 마세요." : "",
    lifeFortune ? `각 장 evidenceRefs는 최소 3개, expertReadings evidenceRefs는 최소 2개를 넣고, 첫 경로는 ${LIFE_FORTUNE_EVIDENCE_REF_ROOTS.join(", ")} 중 하나로 시작해야 합니다.` : "",
    lifeFortune ? "합·충·형·파·해, 삼합, 방합은 natalInteractions, majorLuck.cycles[].natalInteractions, yearlyLuck[].natalInteractions에 있는 항목만 말하세요." : "",
    "전체 본문은 짧게 줄이지 말고, 같은 표현을 반복하지 않으며 전문 명리학자의 상담처럼 부드럽고 분명하게 유지하세요.",
    "기술 표현은 결과에 드러내지 말고, 계산 데이터에 없는 십성 이름은 만들지 마세요.",
    issues.some((issue) => String(issue).startsWith("duplicate_narrative"))
      ? "서로 다른 장에 같은 문장이 반복되었습니다. 각 장은 서로 다른 인생 영역과 시기를 다루므로, 겹친 문장을 그 장 고유의 근거와 장면으로 전부 새로 쓰세요."
      : "",
    `보완할 지점: ${issues.join(", ")}`,
    "",
    content,
  ].join("\n");
}

function hasForbiddenResultTerms(value) {
  FORBIDDEN_RESULT_PATTERN.lastIndex = 0;
  return FORBIDDEN_RESULT_PATTERN.test(value);
}

async function generateConsultationText(env, prompt, options = {}) {
  const diagnostics = getProviderDiagnostics(env);
  logLifeBookAi("LLM Provider Selected", {
    ...(options.logContext || {}),
    ...diagnostics,
    providerReason: diagnostics.providerReason,
  });
  const maxProviderCalls = Math.max(1, Math.floor(Number(options.maxProviderCalls || LIFE_BOOK_MAX_PROVIDER_CALLS_PER_GENERATION) || 1));
  const promptConsultationType = isLifeFortuneInput(options.input || {}) ? "lifeFortune" : "lifeBook";
  // 결정적(생년월일+토픽 기반) 인생서 상담 → LLM 응답 캐시 + in-flight dedup.
  const lifeBookLlmCache = {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 30 * 24 * 60 * 60,
    keyExtra: "life-book-ai-v1",
  };
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: buildSystemPrompt(promptConsultationType),
    taskType: "fortune",
    temperature: options.temperature || 0.72,
    maxOutputTokens: options.maxOutputTokens || LIFE_BOOK_MAX_OUTPUT_TOKENS,
    timeoutMs: Number(options.timeoutMs || env.LIFE_BOOK_AI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 55000),
    fallbackToWorkersAI: undefined,
    logContext: options.logContext,
    cache: lifeBookLlmCache,
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  const text = clean(ai?.text);
  if (!ai?.ok || isMock || !text) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    throw error;
  }
  const qualityInput = options.input || {};
  const lifeFortune = isLifeFortuneInput(qualityInput);
  const issues = getLifeBookReportQualityIssues(text, qualityInput);
  if (!issues.length) return { text, provider, model: clean(ai?.model) };
  if (maxProviderCalls <= 1) {
    // 경량 보장 계약: 수선 여력이 없어도 렌더 가능한 본문이면 버리지 않고 degrade로 전달한다.
    if (hasRenderableLlmText(text, { minChars: 400 })) {
      return { text, provider, model: clean(ai?.model), degraded: true };
    }
    const error = new Error(`Life book result quality check failed: ${issues.join(", ")}`);
    error.code = "LLM_QUALITY_CHECK_FAILED";
    throw error;
  }

  const repair = await callGeminiText(env, buildLifeBookRepairPrompt(text, issues, qualityInput), {
    systemPrompt: buildSystemPrompt(promptConsultationType),
    taskType: "fortune",
    temperature: 0.52,
    maxOutputTokens: Math.max(Number(options.maxOutputTokens || 0), lifeFortune ? LIFE_FORTUNE_MAX_OUTPUT_TOKENS : LIFE_BOOK_MAX_OUTPUT_TOKENS),
    timeoutMs: Number(options.timeoutMs || env.LIFE_BOOK_AI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 55000),
    fallbackToWorkersAI: undefined,
    cache: lifeBookLlmCache,
    logContext: {
      ...(options.logContext || {}),
      providerCallCount: Number(options.logContext?.providerCallCount || 1) + 1,
    },
  });
  const repaired = cleanForbiddenResult(repair?.ok ? repair?.text : text);
  const repairedIssues = getLifeBookReportQualityIssues(repaired, qualityInput);
  if (repairedIssues.length) {
    // 경량 보장 계약: 수선 후에도 품질 미달이나, 렌더 가능한 본문이면 버리지 않고 degrade로 전달한다.
    if (hasRenderableLlmText(repaired, { minChars: 400 })) {
      return {
        text: repaired,
        provider: clean(repair?.provider || provider),
        model: clean(repair?.model || ai?.model),
        degraded: true,
      };
    }
    const error = new Error(`Life book result quality check failed: ${repairedIssues.join(", ")}`);
    error.code = "LLM_QUALITY_CHECK_FAILED";
    throw error;
  }
  return {
    text: repaired,
    provider: clean(repair?.provider || provider),
    model: clean(repair?.model || ai?.model),
  };
}

function extractTitle(content, fallbackName = "", consultationType = "lifeBook") {
  const report = extractReportJson(content);
  if (report?.title) return clean(report.title, 100);
  const lines = clean(content).split(/\n+/).map((line) => line.replace(/^[-*#\s]+/, "").trim()).filter(Boolean);
  const firstLine = lines[0] || "";
  const title = firstLine
    .replace(/^(인생의 책이 여는 첫 문장|첫 문장)\s*[:：]?\s*/, "")
    .replace(/^["“”'‘’]+|["“”'‘’]+$/g, "")
    .trim();
  if (consultationType === "lifeFortune") return clean(title || `${fallbackName || "당신"}의 인생 총운`, 100);
  return clean(title || `${fallbackName || "당신"}의 인생의 책`, 100);
}

function extractKeywords(content, topic) {
  const report = extractReportJson(content);
  if (Array.isArray(report?.chapters)) {
    const chapterWords = report.chapters.map((chapter) => clean(chapter?.title, 40)).filter(Boolean);
    const picked = [topic, ...chapterWords].filter(Boolean).slice(0, 3);
    while (picked.length < 3) picked.push(["자기 이해", "전환점", "오늘의 행동"][picked.length]);
    return Array.from(new Set(picked)).slice(0, 3);
  }
  const candidates = [
    topic,
    "전환점",
    "자기 이해",
    "관계",
    "재물",
    "기질",
    "오늘의 행동",
  ];
  const text = clean(content);
  const picked = candidates.filter((word) => word && text.includes(word)).slice(0, 3);
  while (picked.length < 3) picked.push(["자기 이해", "전환점", "오늘의 행동"][picked.length]);
  return Array.from(new Set(picked)).slice(0, 3);
}

async function callDeferredBillingRoute({ request, env, path, body }) {
  const url = new URL(request.url);
  url.pathname = `/api/billing/coin-gate/deferred/${path}`;
  url.search = "";
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  return handleBillingRoutes(new Request(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }), env);
}

async function finalizeDeferredBillingUsage({ request, env, access, idempotencyKey, sessionId, orderName = ORDER_NAME }) {
  if (access.accessSource !== "billing_gate_deferred") return true;
  const response = await callDeferredBillingRoute({
    request,
    env,
    path: "apply",
    body: {
      featureKey: FEATURE_KEY,
      productId: SERVICE_KEY,
      serviceType: FEATURE_KEY,
      orderName,
      reason: orderName,
      requestId: idempotencyKey,
      idempotencyKey,
      executionId: access.executionId || access.paymentId || "",
      paymentId: access.paymentId || "",
      sessionId,
      resultId: sessionId,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok !== true) {
    throw Object.assign(new Error(MESSAGES.paymentVerifyFailed), { code: "DEFERRED_USAGE_APPLY_FAILED" });
  }
  return true;
}

async function cancelDeferredBillingUsage({ request, env, access, idempotencyKey, sessionId, error, orderName = ORDER_NAME }) {
  if (access?.accessSource !== "billing_gate_deferred") return false;
  await callDeferredBillingRoute({
    request,
    env,
    path: "cancel",
    body: {
      featureKey: FEATURE_KEY,
      productId: SERVICE_KEY,
      serviceType: FEATURE_KEY,
      orderName,
      reason: orderName,
      requestId: idempotencyKey,
      idempotencyKey,
      executionId: access.executionId || access.paymentId || "",
      paymentId: access.paymentId || "",
      sessionId,
      code: clean(error?.code || "LLM_GENERATION_FAILED", 80),
      message: clean(error?.message || error, 500),
    },
  }).catch(() => null);
  return true;
}

async function restoreBillingGateAccessOnFailure({ userId, access, reason = MESSAGES.llmFailed, orderName = ORDER_NAME }) {
  if (access?.accessSource !== "billing_gate") return false;
  if (access.evidenceType === "coin" && access.evidenceId && access.amount > 0) {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { points: access.amount } },
      { new: true, projection: { points: 1 } },
    ).lean();
    if (!updatedUser) return false;
    await PointHistory.create({
      userId,
      kind: "refund",
      delta: access.amount,
      balanceAfter: Number(updatedUser.points || 0),
      reason,
      featureKey: FEATURE_KEY,
      metadata: {
        source: "life-book-ai",
        orderName,
        refundedForServiceExecution: true,
        originalPointHistoryId: access.evidenceId,
        refundedAt: new Date(),
      },
    }).catch(() => {});
    await PointHistory.updateOne(
      { _id: access.evidenceId, userId },
      { $set: { "metadata.refundedForServiceExecution": true, "metadata.refundedAt": new Date() } },
    ).catch(() => {});
    return true;
  }

  if (access.evidenceType === "monthly_credit" && access.evidenceId && access.amount > 0) {
    const refundSourceId = `life-book-ai-restore:${access.evidenceId}`.slice(0, 180);
    const existing = await MonthlyCreditLedger.findOne({ userId, type: "MONTHLY_CREDIT_GRANT", sourceId: refundSourceId }).lean();
    if (existing) return true;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          "profileSubscription.membershipCreditBalance": access.amount,
          "profileSubscription.membershipCreditUsed": -access.amount,
        },
      },
      { new: true, projection: { profileSubscription: 1 } },
    ).lean();
    if (!updatedUser) return false;
    const afterBalance = Math.max(0, Math.floor(Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0)));
    await MonthlyCreditLedger.create({
      userId,
      type: "MONTHLY_CREDIT_GRANT",
      amount: access.amount,
      beforeBalance: Math.max(0, afterBalance - access.amount),
      afterBalance,
      reason,
      sourceId: refundSourceId,
      serviceKey: FEATURE_KEY,
      metadata: {
        source: "life-book-ai",
        orderName,
        refundedForServiceExecution: true,
        originalLedgerId: access.evidenceId,
        refundedAt: new Date(),
      },
    }).catch((error) => {
      if (error?.code !== 11000) throw error;
    });
    await MonthlyCreditLedger.updateOne(
      { _id: access.evidenceId, userId },
      { $set: { "metadata.refundedForServiceExecution": true, "metadata.refundedAt": new Date() } },
    ).catch(() => {});
    return true;
  }
  return false;
}

async function applyUsageOnce({ request, env, userId, sessionId, access, idempotencyKey, pricing, orderName = ORDER_NAME }) {
  const existing = await LifeBookAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;

  if (access.accessSource === "billing_gate_deferred") {
    await finalizeDeferredBillingUsage({ request, env, access, idempotencyKey, sessionId, orderName });
  } else if (access.accessSource !== "billing_gate" && access.accessType === "subscription") {
    const sourceId = `${SERVICE_KEY}:${sessionId}`;
    const ledger = await MonthlyCreditLedger.findOne({ userId, type: "MONTHLY_CREDIT_SPEND", sourceId }).lean();
    if (!ledger) {
      const beforeUser = await User.findById(userId).select("profileSubscription.membershipCreditBalance").lean();
      const beforeBalance = Math.max(0, Math.floor(Number(beforeUser?.profileSubscription?.membershipCreditBalance || 0)));
      const updated = await User.findOneAndUpdate(
        { _id: userId, "profileSubscription.membershipCreditBalance": { $gte: pricing.membershipCreditCost } },
        {
          $inc: {
            "profileSubscription.membershipCreditBalance": -pricing.membershipCreditCost,
            "profileSubscription.membershipCreditUsed": pricing.membershipCreditCost,
          },
        },
        { new: true },
      ).select("profileSubscription.membershipCreditBalance").lean();
      if (!updated) {
        const error = new Error("membership credit balance is insufficient");
        error.code = "MEMBERSHIP_CREDIT_CONSUME_FAILED";
        throw error;
      }
      await MonthlyCreditLedger.create({
        userId,
        type: "MONTHLY_CREDIT_SPEND",
        amount: pricing.membershipCreditCost,
        beforeBalance,
        afterBalance: Math.max(0, Math.floor(Number(updated?.profileSubscription?.membershipCreditBalance || 0))),
        reason: orderName,
        sourceId,
        serviceKey: FEATURE_KEY,
        metadata: { featureKey: FEATURE_KEY, sessionId, requestId: idempotencyKey, orderName },
      }).catch((error) => {
        if (error?.code !== 11000) throw error;
      });
    }
  } else if (access.accessType === "paid" && access.paymentId) {
    await Payment.updateOne(
      { userId, featureKey: FEATURE_KEY, merchantUid: access.paymentId },
      {
        $set: {
          status: "fulfilled",
          orderState: "UNLOCKED",
          reportId: sessionId,
          sessionId,
          "pricingSnapshot.sessionId": sessionId,
          "pricingSnapshot.usageAppliedAt": new Date().toISOString(),
        },
      },
    ).catch(() => {});
  }

  await LifeBookAiConsultation.updateOne(
    { id: sessionId, usageAppliedAt: null },
    { $set: { usageAppliedAt: new Date() } },
  );
  return true;
}

function publicSession(doc) {
  return {
    ok: true,
    sessionId: clean(doc.id),
    consultationId: clean(doc.id),
    idempotencyKey: clean(doc.idempotencyKey),
    accessType: clean(doc.accessType),
    status: clean(doc.status),
    consultationType: clean(doc.llmMeta?.input?.consultationType || "lifeBook"),
    title: clean(doc.title || ""),
    topic: clean(doc.topic || ""),
    birthInfo: doc.birthInfo || null,
    keywords: Array.isArray(doc.keywords) ? doc.keywords : [],
    sajuResult: doc.sajuResult || null,
    reportJson: doc.llmMeta?.reportJson || null,
    generationError: doc.generationError || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    messages: Array.isArray(doc.messages)
      ? doc.messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      }))
      : [],
  };
}

async function handleEnsureAccess(request, env, route = "/api/life-book-ai/prepare") {
  logLifeBookAi("LLM Prepare Start", { route });
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logLifeBookAi("LLM Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));

  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logLifeBookAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "failed", env, error: normalized.message }), "warn");
    return invalidInput(normalized.message);
  }
  if (idempotencyKey.length < 12) return invalidInput(MESSAGES.invalidInput);
  logLifeBookAi("LLM Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", env }));

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();
  logLifeBookAction("entitlement_check", {
    route,
    requestId: idempotencyKey,
    userId: auth.userId,
    idempotencyKey,
    status: "checking",
  });

  logLifeBookAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: "checking", env }));
  const pricing = { ...getPricing(), env };
  if (isAdmin(auth)) {
    logLifeBookAction("entitlement_check", {
      route,
      requestId: idempotencyKey,
      userId: auth.userId,
      idempotencyKey,
      status: "granted",
      reason: "admin",
    });
    logLifeBookAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: "admin", env }));
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: "admin",
        accessSource: "admin",
        idempotencyKey,
        inputHash: normalized.inputHash,
      }),
      accessType: "admin",
    });
  }

  await connectDb(env);
  const user = await loadBillingUser(auth.userId);
  if (!user) return loginRequired();

  const access = await resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, input: normalized.input });
  if (access.ok) {
    logLifeBookAction("entitlement_check", {
      route,
      requestId: idempotencyKey,
      userId: auth.userId,
      idempotencyKey,
      status: "granted",
      reason: access.accessType,
    });
    logLifeBookAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, env }));
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: access.accessType,
        accessSource: access.accessSource,
        idempotencyKey,
        inputHash: normalized.inputHash,
        paymentId: access.paymentId || "",
      }),
      accessType: access.accessType,
    });
  }
  if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);

  logLifeBookAction("entitlement_check", {
    route,
    requestId: idempotencyKey,
    userId: auth.userId,
    idempotencyKey,
    status: "payment_required",
    reason: access.reason,
  });
  logLifeBookAi("Payment Required", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: "payment_required", env }));
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    paymentPayload: buildBillingGatePayload(pricing, idempotencyKey, normalized.input, normalized.inputHash),
  }, { status: 402 });
}

async function resolveStartAccess({ request, env, auth, body, normalized, idempotencyKey }) {
  const token = clean(body?.accessToken || request.headers.get("x-life-book-ai-access-token"));
  if (token) {
    try {
      const payload = await verifyAccessToken(env, token);
      if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
        return { ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput };
      }
      return {
        ok: true,
        accessType: clean(payload.accessType),
        accessSource: clean(payload.accessSource),
        paymentId: clean(payload.paymentId, 160),
      };
    } catch (_) {
      return { ok: false, reason: "PAYMENT_VERIFY_FAILED" };
    }
  }

  const billingGateAccess = await resolveBillingGateAccess({
    env,
    auth,
    body,
    idempotencyKey,
    inputHash: normalized.inputHash,
    consultationType: normalized.input.consultationType,
  });
  if (billingGateAccess?.ok) return billingGateAccess;

  return { ok: false, reason: "PAYMENT_VERIFY_FAILED" };
}

function buildLimitedSajuResult(error, birthInfo = {}) {
  return {
    yearPillar: "",
    monthPillar: "",
    dayPillar: "",
    hourPillar: "",
    dayMaster: "",
    fiveElements: null,
    tenGods: null,
    strength: "",
    usefulGod: "",
    unfavorableGod: "",
    majorLuck: null,
    yearlyLuck: null,
    calculationMeta: {
      available: false,
      birthTimeUnknown: Boolean(birthInfo.birthTimeUnknown),
      limitation: "입력값 기준으로 계산 가능한 범위에서만 상담합니다.",
      errorCode: clean(error?.code || "SAJU_CALCULATION_LIMITED", 80),
    },
  };
}

function hasRequiredLifeFortuneSaju(sajuResult, birthInfo = {}) {
  if (!sajuResult || sajuResult.calculationMeta?.available === false) return false;
  if (!sajuResult.yearPillar || !sajuResult.monthPillar || !sajuResult.dayPillar || !sajuResult.dayMaster) return false;
  if (!birthInfo.birthTimeUnknown && !sajuResult.hourPillar) return false;
  if (!sajuResult.pillarDetails?.year || !sajuResult.pillarDetails?.month || !sajuResult.pillarDetails?.day) return false;
  if (!sajuResult.fiveElements || !sajuResult.tenGods) return false;
  if (!sajuResult.tenGodsByPillar?.month || !sajuResult.seasonalBalance?.monthBranch) return false;
  if (!sajuResult.natalInteractions || !sajuResult.relationSummary || !sajuResult.fortuneFacts) return false;
  if (!Array.isArray(sajuResult.interpretationPlan) || sajuResult.interpretationPlan.length < 10) return false;
  if (sajuResult.majorLuck?.available !== true || !Array.isArray(sajuResult.majorLuck?.cycles) || !sajuResult.majorLuck.cycles.length) return false;
  if (!Array.isArray(sajuResult.yearlyLuck) || !sajuResult.yearlyLuck.length) return false;
  return true;
}

async function restoreAccessBeforeGenerationFailure({ request, env, userId, access, idempotencyKey, sessionId, error, orderName, reason = MESSAGES.llmFailed }) {
  const deferredCanceled = await cancelDeferredBillingUsage({
    request,
    env,
    access,
    idempotencyKey,
    sessionId,
    error,
    orderName,
  });
  return deferredCanceled || await restoreBillingGateAccessOnFailure({ userId, access, reason, orderName }).catch(() => false);
}

async function reserveProviderCallOnce({ userId, sessionId, idempotencyKey, route }) {
  const updated = await LifeBookAiConsultation.findOneAndUpdate(
    {
      id: sessionId,
      userId: clean(userId),
      idempotencyKey,
      status: "generating",
      $or: [
        { "llmMeta.providerCallCount": { $exists: false } },
        { "llmMeta.providerCallCount": { $lt: LIFE_BOOK_MAX_PROVIDER_CALLS_PER_GENERATION } },
      ],
    },
    {
      $inc: { "llmMeta.providerCallCount": 1 },
      $set: {
        "llmMeta.providerCallLastAt": new Date().toISOString(),
      },
    },
    { new: true },
  ).lean();

  if (!updated) {
    const existing = await LifeBookAiConsultation.findOne({ userId: clean(userId), idempotencyKey }).select("id status llmMeta").lean();
    logLifeBookAction("generate_blocked_duplicate", {
      route,
      requestId: idempotencyKey,
      userId,
      idempotencyKey,
      status: existing?.status || "unknown",
      providerCallCount: Number(existing?.llmMeta?.providerCallCount || 0),
      duplicateBlocked: true,
      reason: "provider_call_limit_reached",
    }, "warn");
    const error = new Error("Duplicate provider call blocked.");
    error.code = "PROVIDER_DUPLICATE_BLOCKED";
    throw error;
  }

  return Number(updated.llmMeta?.providerCallCount || 1);
}

async function handleResult(request, env, pathId = "") {
  const url = new URL(request.url);
  const attemptId = clean(url.searchParams.get("attemptId") || url.searchParams.get("idempotencyKey"), 180);
  const sessionId = clean(pathId || url.searchParams.get("sessionId") || url.searchParams.get("consultationId"), 120);
  if (!attemptId && !sessionId) return invalidInput(MESSAGES.resultNotFound, 404);

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const clauses = [];
  if (attemptId) clauses.push({ idempotencyKey: attemptId }, { id: attemptId });
  if (sessionId) clauses.push({ id: sessionId });

  const consultation = await LifeBookAiConsultation.findOne({
    userId: clean(auth.userId),
    $or: clauses,
  }).lean();

  if (!consultation) {
    logLifeBookAction("status_check", {
      requestId: attemptId || sessionId,
      userId: auth.userId,
      idempotencyKey: attemptId,
      status: "not_found",
      cacheHit: false,
      reason: "RESULT_NOT_FOUND",
      route: "/api/life-book-ai/result",
    });
    return json({ ok: false, reason: "RESULT_NOT_FOUND", message: MESSAGES.resultNotFound }, { status: 404 });
  }
  if (consultation.status === "generating") {
    const lastTouchedAt = new Date(consultation.updatedAt || consultation.createdAt).getTime();
    if (Date.now() - lastTouchedAt >= LIFE_BOOK_GENERATING_STALE_MS) {
      await LifeBookAiConsultation.updateOne(
        { id: consultation.id, status: "generating" },
        {
          $set: {
            status: "generation_failed",
            generationError: {
              code: "GENERATION_STALLED",
              message: "Generation did not complete within the allowed window.",
              at: new Date().toISOString(),
            },
          },
        },
      ).catch(() => {});
      const failed = await LifeBookAiConsultation.findOne({ id: consultation.id }).lean();
      logLifeBookAction("result_fetch", {
        requestId: attemptId || sessionId,
        userId: auth.userId,
        idempotencyKey: consultation.idempotencyKey,
        status: "generation_failed",
        cacheHit: true,
        providerCallCount: Number(consultation.llmMeta?.providerCallCount || 0),
        reason: "GENERATION_STALLED",
        route: "/api/life-book-ai/result",
      }, "warn");
      return json({
        ...publicSession(failed || consultation),
        ok: false,
        reason: "GENERATION_STALLED",
        message: MESSAGES.llmFailed,
      }, { status: 503 });
    }
    const orderName = getConsultationOrderName({ consultationType: consultation.llmMeta?.input?.consultationType });
    logLifeBookAction("status_check", {
      requestId: attemptId || sessionId,
      userId: auth.userId,
      idempotencyKey: consultation.idempotencyKey,
      status: "generating",
      cacheHit: true,
      providerCallCount: Number(consultation.llmMeta?.providerCallCount || 0),
      route: "/api/life-book-ai/result",
    });
    return json({ ...publicSession(consultation), message: `${orderName}을 완성하는 중입니다.` }, { status: 202, headers: { "Retry-After": "3", "Cache-Control": "no-store" } });
  }
  if (consultation.status === "generation_failed") {
    logLifeBookAction("result_fetch", {
      requestId: attemptId || sessionId,
      userId: auth.userId,
      idempotencyKey: consultation.idempotencyKey,
      status: "generation_failed",
      cacheHit: true,
      providerCallCount: Number(consultation.llmMeta?.providerCallCount || 0),
      reason: clean(consultation.generationError?.code || "LLM_ERROR", 80),
      route: "/api/life-book-ai/result",
    }, "warn");
    return json({
      ...publicSession(consultation),
      ok: false,
      reason: "LLM_ERROR",
      message: MESSAGES.llmFailed,
    }, { status: 503 });
  }

  const payload = publicSession(consultation);
  const assistantContent = payload.messages.find((message) => message.role === "assistant")?.content || "";
  if (!assistantContent.trim()) {
    logLifeBookAction("result_fetch", {
      requestId: attemptId || sessionId,
      userId: auth.userId,
      idempotencyKey: consultation.idempotencyKey,
      status: "empty",
      cacheHit: true,
      providerCallCount: Number(consultation.llmMeta?.providerCallCount || 0),
      reason: "RESULT_EMPTY",
      route: "/api/life-book-ai/result",
    }, "warn");
    return json({ ok: false, reason: "RESULT_EMPTY", message: MESSAGES.llmFailed }, { status: 409 });
  }
  logLifeBookAction("result_fetch", {
    requestId: attemptId || sessionId,
    userId: auth.userId,
    idempotencyKey: consultation.idempotencyKey,
    status: "completed",
    cacheHit: true,
    providerCallCount: Number(consultation.llmMeta?.providerCallCount || 0),
    route: "/api/life-book-ai/result",
  });
  return json(payload, { headers: { "Cache-Control": "private, max-age=300" } });
}

async function handleStart(request, env, route = "/api/life-book-ai/generate") {
  logLifeBookAi("LLM Generate Start", { route });
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logLifeBookAi("LLM Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));

  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logLifeBookAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "failed", env, error: normalized.message }), "warn");
    return invalidInput(normalized.message);
  }
  if (idempotencyKey.length < 12) return invalidInput(MESSAGES.invalidInput);
  logLifeBookAi("LLM Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", env }));

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();
  logLifeBookAction("generate_start", {
    route,
    requestId: idempotencyKey,
    userId: auth.userId,
    idempotencyKey,
    status: "received",
  });

  const lockKey = `${clean(auth.userId)}:${idempotencyKey}`;
  if (startLocks.has(lockKey)) {
    logLifeBookAction("generate_reused", {
      route,
      requestId: idempotencyKey,
      userId: auth.userId,
      idempotencyKey,
      status: "single_flight",
      cacheHit: true,
      duplicateBlocked: true,
      reason: "in_memory_lock",
    });
    const lockedResponse = await startLocks.get(lockKey);
    return lockedResponse.clone();
  }

  const pending = (async () => {
    await connectDb(env);
    const pricing = getPricing();
    const orderName = getConsultationOrderName(normalized.input);

    const existing = await LifeBookAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
    if (existing && clean(existing.inputHash) !== normalized.inputHash) return invalidInput(MESSAGES.invalidInput, 409);
    if (existing?.status === "completed") {
      logLifeBookAction("generate_reused", {
        route,
        requestId: idempotencyKey,
        userId: auth.userId,
        idempotencyKey,
        status: "completed",
        cacheHit: true,
        providerCallCount: Number(existing.llmMeta?.providerCallCount || 0),
      });
      return json(publicSession(existing));
    }
    if (existing?.status === "generating") {
      const lastTouchedAt = new Date(existing.updatedAt || existing.createdAt).getTime();
      if (Date.now() - lastTouchedAt >= LIFE_BOOK_GENERATING_STALE_MS) {
        await LifeBookAiConsultation.updateOne(
          { id: existing.id, status: "generating" },
          {
            $set: {
              status: "generation_failed",
              generationError: {
                code: "GENERATION_STALLED",
                message: "Generation did not complete within the allowed window.",
                at: new Date().toISOString(),
              },
            },
          },
        ).catch(() => {});
        const failed = await LifeBookAiConsultation.findOne({ id: existing.id }).lean();
        logLifeBookAction("generate_blocked_duplicate", {
          route,
          requestId: idempotencyKey,
          userId: auth.userId,
          idempotencyKey,
          status: "generation_failed",
          cacheHit: true,
          duplicateBlocked: true,
          providerCallCount: Number(failed?.llmMeta?.providerCallCount || existing.llmMeta?.providerCallCount || 0),
          reason: "GENERATION_STALLED",
        }, "warn");
        return json({
          ...publicSession(failed || existing),
          ok: false,
          reason: "GENERATION_STALLED",
          message: MESSAGES.llmFailed,
        }, { status: 503 });
      }
      logLifeBookAction("generate_reused", {
        route,
        requestId: idempotencyKey,
        userId: auth.userId,
        idempotencyKey,
        status: "generating",
        cacheHit: true,
        duplicateBlocked: true,
        providerCallCount: Number(existing.llmMeta?.providerCallCount || 0),
      });
      return json({ ok: true, sessionId: existing.id, status: "generating", message: `${orderName}을 완성하는 중입니다.` }, { status: 202 });
    }
    if (existing?.status === "generation_failed") {
      logLifeBookAction("generate_blocked_duplicate", {
        route,
        requestId: idempotencyKey,
        userId: auth.userId,
        idempotencyKey,
        status: "generation_failed",
        cacheHit: true,
        duplicateBlocked: true,
        providerCallCount: Number(existing.llmMeta?.providerCallCount || 0),
        reason: clean(existing.generationError?.code || "GENERATION_ALREADY_FAILED", 80),
      }, "warn");
      return json({
        ...publicSession(existing),
        ok: false,
        reason: "GENERATION_ALREADY_FAILED",
        message: MESSAGES.llmFailed,
      }, { status: 409 });
    }

    logLifeBookAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: "checking", env }));
    const access = await resolveStartAccess({ request, env, auth, body, normalized, idempotencyKey });
    if (!access.ok) {
      if (access.reason === "LOGIN_REQUIRED") return loginRequired();
      if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
      return paymentVerifyFailed();
    }
    logLifeBookAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, env }));

    let sajuResult = null;
    try {
      sajuResult = calculateLifeBookAiSaju(normalized.input.birthInfo);
    } catch (error) {
      if (isLifeFortuneInput(normalized.input)) {
        await restoreAccessBeforeGenerationFailure({
          request,
          env,
          userId: auth.userId,
          access,
          idempotencyKey,
          sessionId: existing?.id || idempotencyKey,
          error,
          orderName,
          reason: MESSAGES.sajuCalculationFailed,
        });
        logLifeBookAi("LLM Error", safeLogPayload({
          route,
          requestId: idempotencyKey,
          body,
          normalized,
          validation: "saju_calculation_failed",
          access: access.accessType,
          env,
          error,
        }), "warn");
        return json({ ok: false, reason: "SAJU_CALCULATION_FAILED", message: MESSAGES.sajuCalculationFailed }, { status: 422 });
      }
      sajuResult = buildLimitedSajuResult(error, normalized.input.birthInfo);
      logLifeBookAi("LLM Error", safeLogPayload({
        route,
        requestId: idempotencyKey,
        body,
        normalized,
        validation: "saju_calculation_limited",
        access: access.accessType,
        env,
        error,
      }), "warn");
    }
    if (isLifeFortuneInput(normalized.input) && !hasRequiredLifeFortuneSaju(sajuResult, normalized.input.birthInfo)) {
      const error = Object.assign(new Error("life fortune saju result is incomplete"), { code: "SAJU_RESULT_INCOMPLETE" });
      await restoreAccessBeforeGenerationFailure({
        request,
        env,
        userId: auth.userId,
        access,
        idempotencyKey,
        sessionId: existing?.id || idempotencyKey,
        error,
        orderName,
        reason: MESSAGES.sajuCalculationFailed,
      });
      logLifeBookAi("LLM Error", safeLogPayload({
        route,
        requestId: idempotencyKey,
        body,
        normalized,
        validation: "saju_result_incomplete",
        access: access.accessType,
        env,
        error,
      }), "warn");
      return json({ ok: false, reason: "SAJU_CALCULATION_FAILED", message: MESSAGES.sajuCalculationFailed }, { status: 422 });
    }

    const sessionId = existing?.id || `lbai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
    const now = new Date();
    const seed = {
      id: sessionId,
      userId: clean(auth.userId),
      birthInfo: normalized.input.birthInfo,
      sajuResult,
      topic: normalized.input.topic,
      accessType: access.accessType,
      accessSource: access.accessSource || "",
      paymentId: clean(access.paymentId, 160),
      messages: [],
      title: "",
      keywords: [],
      idempotencyKey,
      inputHash: normalized.inputHash,
      status: "generating",
      generationError: null,
      llmMeta: {
        providerCallCount: 0,
        providerCallLastAt: null,
        input: {
          serviceType: normalized.input.serviceType,
          consultationType: normalized.input.consultationType,
          focusArea: normalized.input.focusArea,
          locale: normalized.input.locale,
        },
      },
    };

    if (existing) {
      await LifeBookAiConsultation.updateOne(
        { id: existing.id },
        { $set: { ...seed, updatedAt: now } },
      );
    } else {
      try {
        await LifeBookAiConsultation.create(seed);
      } catch (error) {
        if (error?.code === 11000) {
          const duplicate = await LifeBookAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
          logLifeBookAction("generate_reused", {
            route,
            requestId: idempotencyKey,
            userId: auth.userId,
            idempotencyKey,
            status: duplicate?.status || "generating",
            cacheHit: true,
            duplicateBlocked: true,
            providerCallCount: Number(duplicate?.llmMeta?.providerCallCount || 0),
            reason: "unique_index_collision",
          });
          if (duplicate?.status === "completed") return json(publicSession(duplicate));
          if (duplicate?.status === "generation_failed") {
            return json({
              ...publicSession(duplicate),
              ok: false,
              reason: "GENERATION_ALREADY_FAILED",
              message: MESSAGES.llmFailed,
            }, { status: 409 });
          }
          return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: `${orderName}을 완성하는 중입니다.` }, { status: 202 });
        }
        throw error;
      }
    }

    try {
      const providerCallCount = await reserveProviderCallOnce({
        userId: auth.userId,
        sessionId,
        idempotencyKey,
        route,
      });
      const logContext = {
        ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, env }),
        ...buildProviderLogContext({
          requestId: idempotencyKey,
          userId: auth.userId,
          idempotencyKey,
          providerCallCount,
        }),
      };
      const generated = await generateConsultationText(env, buildFirstPrompt(normalized.input, sajuResult), {
        minLength: isLifeFortuneInput(normalized.input) ? LIFE_FORTUNE_MIN_TOTAL_CONTENT_CHARS : LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS,
        maxOutputTokens: isLifeFortuneInput(normalized.input) ? LIFE_FORTUNE_MAX_OUTPUT_TOKENS : LIFE_BOOK_MAX_OUTPUT_TOKENS,
        timeoutMs: isLifeFortuneInput(normalized.input) ? LIFE_FORTUNE_TIMEOUT_MS : undefined,
        logContext,
        maxProviderCalls: LIFE_BOOK_MAX_PROVIDER_CALLS_PER_GENERATION,
        input: normalized.input,
      });
      const title = extractTitle(generated.text, normalized.input.birthInfo.name, normalized.input.consultationType);
      const keywords = extractKeywords(generated.text, normalized.input.topic);
      const reportJson = extractReportJson(generated.text);
      if (isLifeFortuneInput(normalized.input)) {
        const reportIssues = getLifeBookReportQualityIssues(generated.text, normalized.input);
        if (!reportJson || reportIssues.length) {
          const error = new Error(`Life fortune report quality check failed: ${reportIssues.join(", ") || "report_json_missing"}`);
          error.code = "LIFE_FORTUNE_REPORT_INVALID";
          throw error;
        }
      }
      await applyUsageOnce({
        request,
        env,
        userId: auth.userId,
        sessionId,
        access,
        idempotencyKey,
        pricing,
        orderName,
      });
      if (access.accessType === "pass") {
        logLifeBookAi("Pass Consumed", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, payment: "usage_applied", env }));
      }
      const userMessage = normalized.input.consultationType === "lifeFortune"
        ? `상담 주제: ${normalized.input.topic}`
        : `리포트 강조 영역: ${normalized.input.topic}`;
      const completed = await LifeBookAiConsultation.findOneAndUpdate(
        { id: sessionId },
        {
          $set: {
            status: "completed",
            title,
            keywords,
            messages: [
              { role: "user", content: userMessage, createdAt: now },
              { role: "assistant", content: generated.text, createdAt: new Date() },
            ],
            llmMeta: {
              provider: generated.provider,
              model: generated.model,
              reportJson,
              providerCallCount,
              providerCallLastAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              input: {
                serviceType: normalized.input.serviceType,
                consultationType: normalized.input.consultationType,
                focusArea: normalized.input.focusArea,
                locale: normalized.input.locale,
              },
            },
            generationError: null,
          },
        },
        { new: true },
      ).lean();
      logLifeBookAi("LLM Generate Success", safeLogPayload({
        route,
        requestId: idempotencyKey,
        body,
        normalized,
        validation: "passed",
        access: access.accessType,
        payment: "usage_applied",
        env,
        providerReason: generated.provider || generated.model,
      }));
      return json(publicSession(completed));
    } catch (error) {
      if (clean(error?.code) === "PROVIDER_DUPLICATE_BLOCKED") {
        const duplicate = await LifeBookAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicSession(duplicate));
        if (duplicate?.status === "generation_failed") {
          return json({
            ...publicSession(duplicate),
            ok: false,
            reason: "GENERATION_ALREADY_FAILED",
            message: MESSAGES.llmFailed,
          }, { status: 409 });
        }
        return json({
          ok: true,
          sessionId: duplicate?.id || sessionId,
          status: "generating",
          message: `${orderName}을 완성하는 중입니다.`,
        }, { status: 202 });
      }
      const restored = await restoreAccessBeforeGenerationFailure({
        request,
        env,
        userId: auth.userId,
        access,
        idempotencyKey,
        sessionId,
        error,
        orderName,
      });
      logLifeBookAi("Refund Or Restore", safeLogPayload({
        route,
        requestId: idempotencyKey,
        body,
        normalized,
        validation: "passed",
        access: access.accessType,
        payment: restored ? "restored_or_canceled" : "no_deferred_usage_to_restore",
        env,
        error,
      }), restored ? "info" : "warn");
      await LifeBookAiConsultation.updateOne(
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
      logLifeBookAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, env, error }), "error");
      if (clean(error?.code) === "DEFERRED_USAGE_APPLY_FAILED") return paymentVerifyFailed();
      return json({ ok: false, reason: "LLM_ERROR", message: MESSAGES.llmFailed }, { status: 503 });
    }
  })().catch((error) => {
    logLifeBookAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "server_error", env, error }), "error");
    return serverError();
  }).finally(() => {
    startLocks.delete(lockKey);
  });
  startLocks.set(lockKey, pending);
  return pending;
}

export async function handleLifeBookAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/life-book-ai");
  const route = `/api/life-book-ai${path}`;
  try {
    logLifeBookAi("Route Matched", { route, method });
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (method === "GET" && path.startsWith("/result/")) return await handleResult(request, env, path.slice("/result/".length));
    if (method === "POST" && (path === "/prepare" || path === "/ensure-access")) {
      return await handleEnsureAccess(request, env, path === "/prepare" ? "/api/life-book-ai/prepare" : "/api/life-book-ai/ensure-access");
    }
    if (method === "POST" && (path === "/generate" || path === "/start")) {
      return await handleStart(request, env, path === "/generate" ? "/api/life-book-ai/generate" : "/api/life-book-ai/start");
    }
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    logLifeBookAi("LLM Error", {
      route,
      message: clean(error?.message || error, 500),
      ...(isDevelopmentEnv(env) ? { stack: clean(error?.stack, 2000) } : {}),
    }, "error");
    return serverError();
  }
}

export const __lifeBookAiTestUtils = {
  normalizeConsultationInput,
  extractTitle,
  extractKeywords,
  cleanForbiddenResult,
  getLifeBookReportQualityIssues,
  buildLifeBookRepairPrompt,
  buildFirstPrompt,
};
