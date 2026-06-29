import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, mongoose } from "../lib/db.js";
import { KarmaDestinyAiConsultation, MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory, User } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { callGeminiText } from "../lib/gemini.js";
import { buildKarmaDestinyIntegratedResult } from "../lib/karma-destiny-ai-calculations.js";
import { handleBillingRoutes } from "./billing.js";

const SERVICE_KEY = "karma-destiny-ai";
const FEATURE_KEY = "karma-destiny-ai-consultation";
const ACCESS_TOKEN_TYPE = "karma-destiny-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "운명의 업 AI 상담";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "생년월일, 출생시간, 출생지 정보를 다시 확인해 주세요.";
const PLACE_ERROR_MESSAGE = "출생지 정보를 확인하지 못했습니다. 도시와 국가를 다시 입력해 주세요.";
const CALCULATION_ERROR_MESSAGE = "운명의 업 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.";
const CUSTOM_QUESTION_REQUIRED_MESSAGE = "직접 질문을 선택했다면 지금 가장 궁금한 내용을 짧게 적어 주세요.";

const GEMINI_ENV_KEYS = [
  "GEMINIF_API_KEY",
  "GEMINIF_API_KEY1",
  "GEMINIF_API_KEY2",
  "GEMINIF_API_KEY3",
  "GEMINIF_API_KEY4",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
];

const FOCUS_AREA_LABELS = Object.freeze({
  overall: "전체 운명의 업",
  love: "사랑과 이별의 업",
  money: "돈과 일에서 반복되는 문제",
  career: "재능과 사명의 방향",
  relationship: "관계에서 반복되는 상처",
  family: "가족과 인연의 업",
  lifePattern: "반복되는 인생 패턴",
  spirituality: "고독감과 내면의 숙제",
  custom: "현재 고민 상담",
});

const VALID_TOPICS = new Set([
  "전체 운명의 업",
  "반복되는 인생 패턴",
  "관계에서 반복되는 상처",
  "돈과 일에서 반복되는 문제",
  "가족과 인연의 업",
  "사랑과 이별의 업",
  "고독감과 내면의 숙제",
  "재능과 사명의 방향",
  "지금 인생의 전환점",
  "앞으로 풀어야 할 삶의 과제",
  "올해의 업과 기회",
  "현재 고민 상담",
]);

const FORBIDDEN_RESULT_PATTERN = /\bPDF\b|챕터|\bchapter\b|\bprogress\b|\bjob\b|프롬프트|시스템|\bAI\b|이 기능은|해당 기능|본 기능|기능|이 결과는|결과는|상담 결과|생성 결과|분석 결과|결과물|출력|서버 계산 데이터|분석 데이터/gi;

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
  const question = clean(input.question ?? body.question ?? input.userQuestion ?? body.userQuestion, 2000);
  return {
    route,
    requestId: clean(requestId || body.requestId || body.idempotencyKey, 180),
    serviceType: clean(input.serviceType || body.serviceType || FEATURE_KEY, 80),
    focusArea: clean(input.focusArea || body.focusArea || "overall", 40),
    validation,
    access,
    birthDate: maskBirthDate(input.birthInfo?.birthDate || birthInfo.birthDate || body.birthDate),
    questionLength: question.length,
    ...getProviderDiagnostics(env),
    ...(error ? {
      errorMessage: clean(error?.message || error, 500),
      ...(isDevelopmentEnv(env) ? { stack: clean(error?.stack, 2000) } : {}),
    } : {}),
  };
}

function logKarmaAi(marker, details = {}, level = "info") {
  const payload = { marker: `[Karma AI ${marker}]`, ...details };
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  console[method](payload.marker, JSON.stringify(payload));
}

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniq(values = []) {
  return [...new Set(values.map((value) => clean(value, 180)).filter(Boolean))];
}

function objectIdLike(value) {
  const text = clean(value);
  return Boolean(text && mongoose.Types.ObjectId.isValid(text));
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

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidTimeKey(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clean(value, 5));
}

function parseFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeBirthPlace(value = {}, fallback = {}) {
  const place = asObject(value);
  const fallbackPlace = asObject(fallback.birthPlace);
  const textPlace = typeof value === "string"
    ? clean(value, 160)
    : typeof fallback.birthPlace === "string"
      ? clean(fallback.birthPlace, 160)
      : "";
  const [textCity = "", ...textCountryParts] = textPlace.split(",").map((part) => clean(part, 100)).filter(Boolean);
  const textCountry = textCountryParts.join(", ");
  const city = clean(place.city || place.name || place.birthCity || fallbackPlace.city || fallbackPlace.name || fallback.city || textCity, 100);
  const country = clean(place.country || place.countryCode || place.birthCountry || fallbackPlace.country || fallbackPlace.countryCode || fallback.country || textCountry, 100);
  const timezone = clean(place.timezone || place.tz || place.timezoneName || fallbackPlace.timezone || fallbackPlace.tz || fallback.timezone || fallback.tz, 80);
  const latitude = parseFiniteNumber(place.latitude ?? place.lat ?? fallback.latitude ?? fallback.lat);
  const longitude = parseFiniteNumber(place.longitude ?? place.lng ?? place.lon ?? fallback.longitude ?? fallback.lng ?? fallback.lon);
  return { city, country, latitude, longitude, timezone };
}

function normalizeFocusArea(value) {
  const raw = clean(value, 40);
  if (FOCUS_AREA_LABELS[raw]) return raw;
  const lower = raw.toLowerCase();
  if (FOCUS_AREA_LABELS[lower]) return lower;
  return "overall";
}

function normalizeConsultationInput(body = {}) {
  const birthInfo = asObject(body.birthInfo);
  const name = clean(body.userName ?? body.name ?? body.nickname ?? birthInfo.name, 80);
  const gender = normalizeGender(body.gender ?? birthInfo.gender);
  const birthDate = clean(body.birthDate ?? birthInfo.birthDate, 10);
  const birthTimeUnknown = body.birthTimeUnknown === true || birthInfo.birthTimeUnknown === true;
  const birthTime = birthTimeUnknown ? "" : clean(body.birthTime ?? birthInfo.birthTime, 5);
  const calendarType = clean(body.calendarType ?? birthInfo.calendarType, 20).toLowerCase();
  const birthPlace = normalizeBirthPlace(body.birthPlace || birthInfo.birthPlace || {}, body);
  const focusArea = normalizeFocusArea(body.focusArea);
  const topic = clean(body.topic ?? body.consultationTopic ?? FOCUS_AREA_LABELS[focusArea], 100);
  const question = clean(body.question ?? body.userQuestion, 1600);

  if (!gender) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!isValidDateKey(birthDate)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!birthTimeUnknown && !isValidTimeKey(birthTime)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (calendarType !== "solar" && calendarType !== "lunar") return { ok: false, message: INVALID_INPUT_MESSAGE };
  if ((birthPlace.latitude !== null && (birthPlace.latitude < -90 || birthPlace.latitude > 90))
    || (birthPlace.longitude !== null && (birthPlace.longitude < -180 || birthPlace.longitude > 180))) {
    return { ok: false, message: PLACE_ERROR_MESSAGE };
  }
  if (!VALID_TOPICS.has(topic)) return { ok: false, message: "상담 주제를 다시 선택해 주세요." };
  if (focusArea === "custom" && question.length < 2) return { ok: false, message: CUSTOM_QUESTION_REQUIRED_MESSAGE };

  const normalized = {
    serviceType: clean(body.serviceType || "karma-ai-consultation", 80),
    consultationType: clean(body.consultationType || "destinyKarma", 80),
    birthInfo: {
      name,
      gender,
      birthDate,
      birthTime,
      birthTimeUnknown,
      calendarType,
      birthPlace,
    },
    focusArea,
    topic,
    question,
    userQuestion: question,
    locale: clean(body.locale || "ko", 10),
  };

  return {
    ok: true,
    input: normalized,
    inputHash: sha256(stableJson(normalized)),
  };
}

function invalidInput(message, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message: clean(message) || INVALID_INPUT_MESSAGE }, { status });
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
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || 50000);
  if (!resolved?.ok || !pricing || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error("karma-destiny-ai price not found");
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

function normalizeAccessType(value) {
  const raw = clean(value).toLowerCase();
  if (["membership_credit", "monthly_credit", "monthly", "subscription"].includes(raw)) return "monthly_credit";
  if (["membership_pass", "family_pass", "pass", "usage_pass"].includes(raw)) return "pass";
  if (["admin"].includes(raw)) return "admin";
  return "paid";
}

function isMonthlyCreditAccess(accessType) {
  return ["membership_credit", "monthly_credit", "monthly", "subscription"].includes(clean(accessType).toLowerCase());
}

function readBillingContext(body = {}) {
  const billing = asObject(body.billingGate || body.billingEvidence || body.billing || body.paymentEvidence);
  const consume = asObject(body.billingConsume || body.consume || billing.consume);
  const accessGrant = asObject(body.billingAccessGrant || body.accessGrant || billing.accessGrant);
  const pricing = asObject(body.pricing || billing.pricing);
  return { billing, consume, accessGrant, pricing };
}

function collectBillingTokens(body = {}, idempotencyKey = "") {
  const ctx = readBillingContext(body);
  return uniq([
    idempotencyKey,
    body.billingRequestId,
    body.paymentId,
    body.transactionId,
    body.purchaseId,
    body.requestId,
    ctx.billing.executionId,
    ctx.billing.transactionId,
    ctx.billing.purchaseId,
    ctx.billing.paymentId,
    ctx.billing.requestId,
    ctx.consume.executionId,
    ctx.consume.transactionId,
    ctx.consume.purchaseId,
    ctx.consume.requestId,
    ctx.consume.receiptId,
    ctx.consume.pointHistoryId,
    ctx.consume.ledgerId,
    ctx.consume.monthlyCreditLedgerId,
    ctx.accessGrant.executionId,
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

function billingTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ "metadata.requestId": token });
    clauses.push({ "metadata.purchaseId": token });
    clauses.push({ "metadata.idempotencyKey": token });
    clauses.push({ "metadata.orderId": token });
    clauses.push({ "metadata.transactionId": token });
    clauses.push({ "metadata.pointHistoryId": token });
    clauses.push({ sourceId: token });
    if (objectIdLike(token)) clauses.push({ _id: token }, { paymentId: token });
  });
  return clauses;
}

function paymentTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ requestId: token }, { idempotencyKey: token }, { merchantUid: token }, { impUid: token });
    clauses.push({ "metadata.requestId": token }, { "metadata.purchaseId": token }, { "metadata.idempotencyKey": token });
  });
  return clauses;
}

function deferredTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ requestId: token }, { idempotencyKey: token }, { executionId: token }, { paymentId: token }, { orderId: token });
    clauses.push({ "result.deferredUsage.requestId": token }, { "result.deferredUsage.paymentId": token });
    if (objectIdLike(token)) clauses.push({ _id: token });
  });
  return clauses;
}

function normalizeDeferredAccessType(value) {
  const raw = clean(value).toLowerCase();
  if (["monthly", "membership_credit", "monthly_credit"].includes(raw)) return "monthly_credit";
  if (["pass", "family", "membership_pass", "family_pass"].includes(raw)) return "pass";
  return "paid";
}

async function findBillingGateEvidence({ userId, idempotencyKey, body = {} }) {
  const tokens = collectBillingTokens(body, idempotencyKey);
  const signal = readBillingAccessSignal(body);
  const ctx = readBillingContext(body);
  const featureKey = clean(ctx.pricing.featureKey || ctx.billing.featureKey || ctx.consume.featureKey || ctx.accessGrant.featureKey);
  if (featureKey && featureKey !== FEATURE_KEY) return null;

  const pointClauses = billingTokenClauses(tokens);
  if (pointClauses.length && mongoose.Types.ObjectId.isValid(String(userId || ""))) {
    const point = await PointHistory.findOne({
      userId,
      featureKey: FEATURE_KEY,
      kind: "deduct",
      "metadata.coinRefundedForUnlockFailure": { $ne: true },
      "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: pointClauses,
    }).sort({ createdAt: -1 }).lean();
    if (point) {
      return {
        ok: true,
        accessType: normalizeAccessType(point?.metadata?.accessType || point?.metadata?.paymentMethod || signal),
        paymentId: clean(point._id, 160),
        billingRequestId: clean(point?.metadata?.requestId || idempotencyKey, 180),
        usageAlreadyApplied: true,
      };
    }
  }

  const monthlyClauses = billingTokenClauses(tokens);
  if (monthlyClauses.length && mongoose.Types.ObjectId.isValid(String(userId || ""))) {
    const ledger = await MonthlyCreditLedger.findOne({
      userId,
      type: "MONTHLY_CREDIT_SPEND",
      "metadata.featureKey": FEATURE_KEY,
      "metadata.refundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: monthlyClauses,
    }).sort({ createdAt: -1 }).lean();
    if (ledger) {
      return {
        ok: true,
        accessType: "monthly_credit",
        paymentId: clean(ledger._id, 160),
        billingRequestId: clean(ledger?.metadata?.requestId || idempotencyKey, 180),
        usageAlreadyApplied: true,
      };
    }
  }

  const deferredClauses = deferredTokenClauses(tokens);
  if (deferredClauses.length && mongoose.Types.ObjectId.isValid(String(userId || ""))) {
    const record = await PaidExecutionRecord.findOne({
      userId: clean(userId),
      featureId: FEATURE_KEY,
      status: { $in: ["paid_pending_generation", "generating", "completed"] },
      $or: deferredClauses,
    }).sort({ updatedAt: -1, createdAt: -1 }).lean();
    if (record) {
      return {
        ok: true,
        accessType: normalizeDeferredAccessType(record.accessMethod || signal),
        paymentId: clean(record._id, 160),
        billingRequestId: clean(record.requestId || idempotencyKey, 180),
        deferredUsage: record.status !== "completed",
        usageAlreadyApplied: record.status === "completed",
      };
    }
  }

  const paymentClauses = paymentTokenClauses(tokens);
  if (paymentClauses.length && mongoose.Types.ObjectId.isValid(String(userId || ""))) {
    const payment = await Payment.findOne({
      userId,
      featureKey: FEATURE_KEY,
      status: { $in: ["paid", "success", "fulfilled"] },
      $or: paymentClauses,
    }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
    if (payment) {
      return {
        ok: true,
        accessType: "paid",
        paymentId: clean(payment.merchantUid || payment.impUid || tokens[0], 160),
        billingRequestId: clean(payment.requestId || payment.idempotencyKey || idempotencyKey, 180),
        usageAlreadyApplied: true,
      };
    }
  }

  return null;
}

async function resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash, body = {} }) {
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", paymentId: "", usageAlreadyApplied: true };
  }

  const existing = await KarmaDestinyAiConsultation.findOne({
    userId: clean(auth.userId),
    idempotencyKey,
    inputHash,
    status: "completed",
  }).select("id accessType paymentId billingRequestId").lean();
  if (existing) {
    return {
      ok: true,
      accessType: clean(existing.accessType) || "paid",
      paymentId: clean(existing.paymentId, 160),
      billingRequestId: clean(existing.billingRequestId, 180),
      usageAlreadyApplied: true,
    };
  }

  const billing = await findBillingGateEvidence({ userId: auth.userId, idempotencyKey, body });
  if (billing?.ok) return {
    ...billing,
    usageAlreadyApplied: billing.usageAlreadyApplied === true,
  };

  const pass = normalizeHoneyPassEntitlement(user || {});
  if (canUseByPass(pass, pricing.coinPrice)) {
    return { ok: true, accessType: "pass", paymentId: "", usageAlreadyApplied: false };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function buildBillingGatePayload(pricing, idempotencyKey) {
  return {
    billingMode: "coin-gate",
    featureKey: FEATURE_KEY,
    serviceKey: SERVICE_KEY,
    serviceId: SERVICE_KEY,
    serviceType: "karma-ai-consultation",
    consultationType: "destinyKarma",
    categoryKey: "premium-consultation",
    subFeatureKey: FEATURE_KEY,
    contentId: FEATURE_KEY,
    orderName: ORDER_NAME,
    reason: ORDER_NAME,
    requestId: idempotencyKey,
    idempotencyKey,
    coinPrice: pricing.coinPrice,
    cost: pricing.coinPrice,
    membershipCreditCost: pricing.membershipCreditCost,
    totalAmount: pricing.amountKRW,
    paymentAmount: pricing.amountKRW,
    amountKRW: pricing.amountKRW,
    currency: "CURRENCY_KRW",
    runtimeGate: {
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      featureKey: FEATURE_KEY,
      reason: ORDER_NAME,
      productId: SERVICE_KEY,
      productType: SERVICE_KEY,
      serviceType: "karma-ai-consultation",
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      membershipCreditCost: pricing.membershipCreditCost,
    },
  };
}

function buildSystemPrompt(mode = "initial") {
  const shared = [
    "당신은 오래 상담해 온 운명의 업 상담가입니다.",
    "명리학자의 현실 감각, 서양 점성술사의 상징 해석, 베다 점성술사의 카르마 통찰을 한 목소리로 엮습니다.",
    "사주명리학은 일간의 기질, 오행 구조, 대운 흐름, 육친 관계, 강약 오행에서 드러나는 현실 처방을 맡습니다.",
    "서양 점성술은 태양의 욕구, 달의 감정 반응, 상승궁의 대면 방식, 카이런의 상처와 치유 서사를 맡습니다.",
    "베다 점성술은 라시와 나크샤트라의 본질, 다샤 행성 주기, 라후-케투 축의 카르마 과제, 다르마와 아르타 하우스의 소명을 맡습니다.",
    "세 체계의 이름을 설명표처럼 나열하지 말고, 필요한 근거가 상담 문장 안에서 자연스럽게 드러나게 합니다.",
    "",
    "언어와 문체:",
    "한국어 격식체로 씁니다.",
    "운세 전문가가 직접 사용자를 마주 보고 말하듯 전문적이고 신비로우며 감정적으로 자연스럽게 씁니다.",
    "각 단락은 서로 다른 은유와 이미지를 사용합니다.",
    "‘업’은 벌이나 저주가 아니라 반복되는 선택, 감정 습관, 관계 패턴, 성장 과제로 해석합니다.",
    "불안감이나 죄책감을 자극하지 않고, 운명 확정 표현을 사실처럼 단정하지 않습니다.",
    "PDF, 챕터, chapter, job, progress, 프롬프트, 시스템, AI, 기능, 결과, 분석 결과, 출력, 데이터 같은 작업 표현을 노출하지 않습니다.",
  ];

  if (mode === "follow_up") {
    return [
      ...shared,
      "",
      "추가 질문 응답 방식:",
      "처음 상담의 7개 장 제목을 반복하지 않습니다.",
      "첫 문장부터 사용자의 새 질문에 직접 답합니다.",
      "이전 상담에서 이미 말한 내용을 길게 되풀이하지 말고, 새 질문에 필요한 흐름만 다시 짚습니다.",
      "사주, 서양 점성술, 베다 점성술의 근거는 필요한 만큼만 섞어 2~4개의 완성된 산문 단락으로 답합니다.",
      "단순 위로가 아니라 지금 사용자가 취할 수 있는 말, 태도, 선택을 구체적으로 비춥니다.",
      "불릿 포인트와 번호 나열을 사용하지 않습니다.",
      "전체 분량은 900~1,600자로 맞춥니다.",
      "마지막 문장은 사용자가 지금 해볼 수 있는 한 가지 행동으로 따뜻하게 닫습니다.",
    ].join("\n");
  }

  return [
    ...shared,
    "",
    "초기 상담 구조:",
    "아래 7개 섹션을 순서대로 작성하고, 각 섹션은 300~500자의 완성된 산문으로 씁니다.",
    "불릿 리스트나 단순 나열을 사용하지 않습니다.",
    "## ① 命 — 당신이라는 별의 본질",
    "사주 일간과 태양 별자리, 나크샤트라를 통합하여 이 사람의 본질 에너지를 하나의 통일된 은유로 묘사합니다. 반드시 “당신은 ~와 같은 존재입니다”로 시작합니다.",
    "## ② 業 — 반복되는 삶의 문양",
    "사주 비겁/식상 구조, 달의 별자리 감정 패턴, 라후-케투 카르마 축을 통합하여 반복되는 관계·감정·선택 패턴을 서술합니다. 반드시 “삶은 당신에게 반복해서 ~라는 장면을 보여줍니다”로 시작합니다.",
    "## ③ 時 — 지금 이 계절의 의미",
    "현재 대운, 서양 점성술 트랜짓, 베다 다샤 주기를 통합하여 지금 이 시기가 인생에서 어떤 국면인지 계절이나 자연 현상의 은유로 서술합니다.",
    "## ④ 情 — 관계에서 흐르는 강물",
    "육친 구조, 금성·화성 위치, 베다 7하우스를 통합하여 관계에서 반복되는 감정 구조와 지금 필요한 전환을 서술합니다.",
    "## ⑤ 財 — 재능과 물질이 만나는 지점",
    "사주 재성·식상 구조, 서양 2하우스·MC, 베다 아르타 하우스를 통합하여 돈과 재능에서 반복되는 선택 흐름과 지금 시기의 기회를 서술합니다.",
    "## ⑥ 課 — 이 생의 핵심 과제",
    "사주 용신·희신, 카이런, 라후의 방향을 통합하여 이 생에서 영혼이 배워야 할 가장 핵심적인 한 가지를 선명하게 서술합니다. 반드시 “당신의 운명은 ~를 배우도록 설계되어 있습니다”로 시작합니다.",
    "## ⑦ 箋 — 오늘을 위한 운명의 처방",
    "앞의 흐름을 바탕으로 지금 당장 실천 가능한 구체적인 방향을 제시합니다. 추상적 조언이 아니라 “오늘, ~를 해보세요”처럼 구체적으로 작성합니다. 마지막 문장은 사용자의 이름이나 닉네임을 불러 따뜻하게 마무리합니다.",
    "",
    "초기 상담 금지 사항:",
    "‘당신의 사주를 보면’, ‘점성술에 따르면’ 등 출처 언급을 금지합니다.",
    "동일한 내용을 다른 섹션에서 반복하지 않습니다.",
    "‘~할 수 있습니다’, ‘~일 것입니다’의 반복적 어미를 피합니다.",
    "7개 섹션 외의 추가 내용을 쓰지 않습니다.",
    "마지막에 추가 질문을 유도하지 않습니다.",
    "전체 분량은 2,500~3,500자로 맞춥니다.",
  ].join("\n");
}

function buildFirstPrompt(input, integratedResult) {
  const birth = input.birthInfo || {};
  const place = birth.birthPlace || {};
  return [
    "[상담 정보]",
    `이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `성별: ${birth.gender}`,
    `생년월일: ${birth.birthDate}`,
    `출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `달력: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `출생지: ${[place.city, place.country].filter(Boolean).join(", ")}`,
    `상담 주제: ${input.topic}`,
    `상담 초점: ${input.focusArea}`,
    `현재 가장 궁금한 질문: ${input.question || "선택한 상담 주제를 중심으로 봅니다."}`,
    "",
    "[상담 근거]",
    JSON.stringify(integratedResult),
    "",
    "위 계산 데이터를 바탕으로 7개 섹션만 작성하세요.",
    "각 섹션 제목은 지정된 한자와 한글 제목을 그대로 사용하되, 본문은 산문으로 이어 쓰세요.",
    "사용자의 선택 주제와 질문은 전체 서사의 중심 감정으로 녹이고, 별도 문답 형식으로 나누지 마세요.",
    "각 섹션에는 사주명리학, 서양 점성술, 베다 점성술의 근거가 설명표처럼 분리되지 않고 자연스럽게 스며들어야 합니다.",
  ].join("\n");
}

function buildFollowUpPrompt(consultation, question) {
  const birth = consultation.birthInfo || {};
  const history = safeArray(consultation.messages)
    .slice(-8)
    .map((message) => `${message.role === "assistant" ? "상담가" : "사용자"}: ${clean(message.content, 1400)}`)
    .join("\n\n");
  return [
    "[상담 정보]",
    `이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `성별: ${birth.gender}`,
    `생년월일: ${birth.birthDate}`,
    `출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `처음 상담 주제: ${consultation.topic}`,
    `처음 상담 질문: ${consultation.userQuestion || "선택한 상담 주제를 중심으로 봅니다."}`,
    "",
    "[상담 근거]",
    JSON.stringify(consultation.integratedResult || {}),
    "",
    "[이전 대화]",
    history,
    "",
    "[새 질문]",
    question,
    "",
    "7개 섹션을 반복하지 말고, 첫 문장부터 새 질문에 직접 답하세요.",
    "이전 상담 흐름을 이어받되 필요한 부분만 짚고, 업을 죄나 벌이 아닌 반복 패턴과 성장 과제로 풀어주세요.",
  ].join("\n");
}

function cleanForbiddenResult(text) {
  return clean(text)
    .replace(/\bPDF\b/gi, "상담")
    .replace(/챕터/g, "상담 항목")
    .replace(/\bchapter\b/gi, "상담 항목")
    .replace(/\bprogress\b/gi, "흐름")
    .replace(/\bjob\b/gi, "상담")
    .replace(/프롬프트/g, "상담 문장")
    .replace(/시스템/g, "상담 흐름")
    .replace(/\bAI\b/g, "상담")
    .replace(/이 기능은|해당 기능|본 기능/g, "이 흐름은")
    .replace(/기능/g, "흐름")
    .replace(/분석 결과는|이 결과는|상담 결과는|생성 결과는|결과는/g, "상담 흐름은")
    .replace(/분석 결과|상담 결과|생성 결과|결과물/g, "상담 흐름")
    .replace(/출력/g, "상담")
    .replace(/서버 계산 데이터|분석 데이터/g, "상담 근거");
}

async function generateConsultationText(env, prompt, options = {}) {
  const providerDiagnostics = getProviderDiagnostics(env);
  const mode = options.mode === "follow_up" ? "follow_up" : "initial";
  const systemPrompt = buildSystemPrompt(mode);
  logKarmaAi("LLM Provider Selected", {
    ...(options.logContext || {}),
    ...providerDiagnostics,
  });
  const ai = await callGeminiText(env, prompt, {
    systemPrompt,
    taskType: "fortune",
    temperature: options.temperature || (mode === "follow_up" ? 0.68 : 0.74),
    maxOutputTokens: options.maxOutputTokens || 7600,
    timeoutMs: Number(env?.KARMA_DESTINY_AI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 65000),
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  const text = clean(ai?.text);
  if (!ai?.ok || isMock || text.length < (options.minLength || 220)) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    error.providerDiagnostics = providerDiagnostics;
    throw error;
  }
  if (!FORBIDDEN_RESULT_PATTERN.test(text)) return { text, provider, model: clean(ai?.model) };

  const repair = await callGeminiText(env, [
    "다음 상담 답변에서 시스템성 표현과 작업 용어를 모두 제거하고, 자연스러운 운명의 업 상담문으로만 다시 써주세요.",
    "",
    text,
  ].join("\n"), {
    systemPrompt,
    taskType: "fortune",
    temperature: 0.58,
    maxOutputTokens: options.maxOutputTokens || 7600,
  });
  const repaired = clean(repair?.text);
  return {
    text: cleanForbiddenResult(repair?.ok && repaired.length >= 160 ? repaired : text),
    provider: clean(repair?.provider || provider),
    model: clean(repair?.model || ai?.model),
  };
}

function buildSummaryCards(integratedResult = {}) {
  const synthesis = asObject(integratedResult.synthesis);
  const themes = safeArray(synthesis.karmicThemes).map((item) => clean(item)).filter(Boolean);
  const patterns = safeArray(synthesis.commonPatterns).map((item) => clean(item)).filter(Boolean);
  const keywordCandidates = uniq([...themes, ...patterns]
    .map((item) => clean(String(item).replace(/[.!?。]/g, "").split(/[·ㆍ,，:：/]/)[0], 28))
    .filter(Boolean));
  const keywords = uniq([...keywordCandidates, "반복 선택", "관계의 매듭", "재능의 숙제"]).slice(0, 3);
  return {
    keywords,
    repeatingPattern: clean(patterns[0], 180) || "익숙한 감정 반응이 관계와 일의 선택에서 되풀이되는 흐름",
    currentTask: clean(synthesis.currentLifeTask, 180) || clean(themes[0], 180) || "같은 장면에서 한 번 더 느린 선택을 연습하는 일",
  };
}

async function applyUsageOnce({ userId, sessionId, accessType, pricing }) {
  const existing = await KarmaDestinyAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;

  if (accessType === "pass") {
    const passUpdate = await User.updateOne(
      { _id: userId, "profileSubscription.passRemainingUses": { $gt: 0 } },
      {
        $inc: {
          "profileSubscription.passRemainingUses": -1,
          "profileSubscription.passUsedCount": 1,
        },
      },
    );
    if (!passUpdate?.modifiedCount) {
      const error = new Error("membership pass balance is insufficient");
      error.code = "MEMBERSHIP_PASS_CONSUME_FAILED";
      throw error;
    }
  }

  await KarmaDestinyAiConsultation.updateOne(
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
    integratedResult: doc.integratedResult || null,
    summaryCards: doc.summaryCards || null,
    messages: safeArray(doc.messages).map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  };
}

async function handleEnsureAccess(request, env) {
  const route = "/api/karma-destiny-ai/ensure-access";
  logKarmaAi("LLM Prepare Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logKarmaAi("LLM Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logKarmaAi("LLM Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  const pricing = getPricing();
  logKarmaAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  if (isAdmin(auth)) {
    logKarmaAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "admin", env }));
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: "admin",
        idempotencyKey,
        inputHash: normalized.inputHash,
        usageAlreadyApplied: true,
      }),
      accessType: "admin",
    });
  }

  await connectDb(env);
  const user = await loadBillingUser(auth.userId);
  if (!user) return loginRequired();

  const access = await resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, body });
  if (access.ok) {
    logKarmaAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: access.accessType,
        idempotencyKey,
        inputHash: normalized.inputHash,
        paymentId: access.paymentId || "",
        billingRequestId: access.billingRequestId || "",
        usageAlreadyApplied: access.usageAlreadyApplied === true,
        deferredUsage: access.deferredUsage === true,
      }),
      accessType: access.accessType,
    });
  }

  logKarmaAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "payment_required", env }));
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    message: "운명의 업 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
    paymentPayload: buildBillingGatePayload(pricing, idempotencyKey),
  }, { status: 402 });
}

async function resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey }) {
  const token = clean(body?.accessToken || request.headers.get("x-karma-destiny-ai-access-token"));
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: "상담 접근 정보가 현재 입력값과 일치하지 않습니다." };
    }
    return {
      ok: true,
      accessType: clean(payload.accessType),
      paymentId: clean(payload.paymentId, 160),
      billingRequestId: clean(payload.billingRequestId, 180),
      usageAlreadyApplied: payload.usageAlreadyApplied === true,
      deferredUsage: payload.deferredUsage === true,
    };
  }

  const billing = await findBillingGateEvidence({ userId: auth.userId, idempotencyKey, body });
  if (billing?.ok) return {
    ...billing,
    usageAlreadyApplied: billing.usageAlreadyApplied === true,
  };

  return {
    ok: false,
    reason: "PAYMENT_REQUIRED",
    message: "상담 생성 전 결제 확인이 필요합니다.",
    code: "START_ACCESS_CONFIRMATION_REQUIRED",
  };
}

function cloneBillingHeaders(request) {
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  headers.delete("content-length");
  return headers;
}

async function callDeferredUsageRoute({ request, env, path, idempotencyKey, sessionId, code = "", message = "" }) {
  const url = new URL(request.url);
  url.pathname = `/api/billing/coin-gate/deferred/${path}`;
  url.search = "";
  const response = await handleBillingRoutes(new Request(url.toString(), {
    method: "POST",
    headers: cloneBillingHeaders(request),
    body: JSON.stringify({
      featureKey: FEATURE_KEY,
      serviceType: "karma-ai-consultation",
      consultationType: "destinyKarma",
      reason: ORDER_NAME,
      requestId: idempotencyKey,
      idempotencyKey,
      sessionId,
      resultId: sessionId,
      code,
      message,
    }),
  }), env);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    const error = new Error(clean(payload?.message || payload?.error?.message || `Deferred usage ${path} failed.`, 500));
    error.code = clean(payload?.error?.code || `DEFERRED_USAGE_${path.toUpperCase()}_FAILED`, 80);
    throw error;
  }
  return payload?.data || payload;
}

async function handleStart(request, env) {
  const route = "/api/karma-destiny-ai/start";
  logKarmaAi("LLM Generate Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logKarmaAi("LLM Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logKarmaAi("LLM Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  logKarmaAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return paymentVerifyFailed();
  }
  logKarmaAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
  logKarmaAi("LLM Payment Guard Passed", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));

  const existing = await KarmaDestinyAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
  if (existing && clean(existing.inputHash) !== normalized.inputHash) {
    return invalidInput("같은 요청 키로 다른 상담 정보를 사용할 수 없습니다.", 409);
  }
  if (existing?.status === "completed") return json(publicSession(existing));
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 90000) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "삶의 반복 패턴과 업의 흐름을 읽고 있습니다" }, { status: 202 });
  }

  const sessionId = existing?.id || `kdai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
  const now = new Date();
  const seed = {
    id: sessionId,
    userId: clean(auth.userId),
    birthInfo: normalized.input.birthInfo,
    topic: normalized.input.topic,
    userQuestion: normalized.input.userQuestion,
    accessType: access.accessType,
    paymentId: clean(access.paymentId, 160),
    billingRequestId: clean(access.billingRequestId || idempotencyKey, 180),
    messages: [],
    idempotencyKey,
    inputHash: normalized.inputHash,
    status: "generating",
    generationError: null,
  };

  if (existing) {
    await KarmaDestinyAiConsultation.updateOne(
      { id: existing.id },
      { $set: { ...seed, updatedAt: now } },
    );
  } else {
    try {
      await KarmaDestinyAiConsultation.create(seed);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await KarmaDestinyAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicSession(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "삶의 반복 패턴과 업의 흐름을 읽고 있습니다" }, { status: 202 });
      }
      throw error;
    }
  }

  try {
    logKarmaAi("LLM Fortune Data Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    const integratedResult = await buildKarmaDestinyIntegratedResult(env, normalized.input.birthInfo);
    if (!integratedResult?.saju && !integratedResult?.westernAstrology && !integratedResult?.vedicAstrology) {
      const calculationError = new Error(CALCULATION_ERROR_MESSAGE);
      calculationError.code = "CALCULATION_ERROR";
      throw calculationError;
    }
    logKarmaAi("LLM Fortune Data Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    const summaryCards = buildSummaryCards(integratedResult);
    const generated = await generateConsultationText(env, buildFirstPrompt(normalized.input, integratedResult), {
      mode: "initial",
      minLength: 360,
      maxOutputTokens: 8200,
      logContext: safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }),
    });
    if (access.deferredUsage) {
      await callDeferredUsageRoute({ request, env, path: "apply", idempotencyKey, sessionId });
    } else if (!access.usageAlreadyApplied && access.accessType === "pass") {
      await applyUsageOnce({ userId: auth.userId, sessionId, accessType: access.accessType, pricing });
    } else if (!access.usageAlreadyApplied && isMonthlyCreditAccess(access.accessType)) {
      const gateError = new Error("monthly credit must be confirmed by common billing gate");
      gateError.code = "MONTHLY_CREDIT_GATE_REQUIRED";
      throw gateError;
    } else {
      await KarmaDestinyAiConsultation.updateOne(
        { id: sessionId, usageAppliedAt: null },
        { $set: { usageAppliedAt: new Date() } },
      );
    }
    const completed = await KarmaDestinyAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "completed",
          integratedResult,
          summaryCards,
          messages: [
            { role: "user", content: `${normalized.input.topic}${normalized.input.question ? `\n${normalized.input.question}` : ""}`, createdAt: now },
            { role: "assistant", content: generated.text, createdAt: new Date() },
          ],
          usageAppliedAt: new Date(),
          llmMeta: { provider: generated.provider, model: generated.model, completedAt: new Date().toISOString(), deferredUsageApplied: access.deferredUsage === true },
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    logKarmaAi("LLM Generate Success", {
      ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }),
      provider: generated.provider,
      model: generated.model,
    });
    return json(publicSession(completed));
  } catch (error) {
    await KarmaDestinyAiConsultation.updateOne(
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
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }), "error");
    if (access.deferredUsage) {
      await callDeferredUsageRoute({
        request,
        env,
        path: "cancel",
        idempotencyKey,
        sessionId,
        code: clean(error?.code || "LLM_GENERATION_FAILED", 80),
        message: clean(error?.message || error, 500),
      }).catch((restoreError) => {
        logKarmaAi("LLM Refund Or Restore", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error: restoreError }), "warn");
      });
    }
    logKarmaAi("LLM Refund Or Restore", {
      ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }),
      restoreMode: access.deferredUsage ? "deferred_usage_cancelled_or_pending" : "same_request_id_retry_preserves_billing_evidence",
    }, "warn");
    if (clean(error?.code) === "CALCULATION_ERROR") {
      return json({ ok: false, reason: "CALCULATION_ERROR", message: CALCULATION_ERROR_MESSAGE }, { status: 422 });
    }
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

async function handleMessage(request, env) {
  const route = "/api/karma-destiny-ai/message";
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.consultationId, 120);
  const message = clean(body?.message || body?.question, 1200);
  if (!sessionId) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);
  if (message.length < 2) return invalidInput("추가 질문을 입력해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const consultation = await KarmaDestinyAiConsultation.findOne({
    id: sessionId,
    userId: clean(auth.userId),
    status: "completed",
  }).lean();
  if (!consultation) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);

  try {
    const logContext = safeLogPayload({
      route,
      requestId: sessionId,
      body: { ...body, question: message },
      normalized: {
        input: {
          serviceType: "karma-ai-consultation",
          focusArea: "follow_up",
          question: message,
          birthInfo: consultation.birthInfo,
        },
      },
      access: consultation.accessType,
      env,
    });
    const generated = await generateConsultationText(env, buildFollowUpPrompt(consultation, message), {
      mode: "follow_up",
      minLength: 180,
      maxOutputTokens: 4600,
      logContext,
    });
    const userMessage = { role: "user", content: message, createdAt: new Date() };
    const assistantMessage = { role: "assistant", content: generated.text, createdAt: new Date() };
    const updated = await KarmaDestinyAiConsultation.findOneAndUpdate(
      { id: sessionId, userId: clean(auth.userId) },
      {
        $push: { messages: { $each: [userMessage, assistantMessage] } },
        $set: {
          llmMeta: { provider: generated.provider, model: generated.model, updatedAt: new Date().toISOString() },
        },
      },
      { new: true },
    ).lean();
    logKarmaAi("LLM Generate Success", { ...logContext, provider: generated.provider, model: generated.model });
    return json(publicSession(updated));
  } catch (error) {
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: sessionId, body, access: "follow_up", env, error }), "error");
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

export async function handleKarmaDestinyAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/karma-destiny-ai");

  try {
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[karma-destiny-ai]", clean(error?.code || error?.message || error, 500));
    logKarmaAi("LLM Error", safeLogPayload({ route: "/api/karma-destiny-ai", env, error }), "error");
    return serverError();
  }
}

export const __karmaDestinyAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeConsultationInput,
  resolveStartAccess,
  buildFirstPrompt,
  buildSystemPrompt,
  cleanForbiddenResult,
};
