import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, mongoose } from "../lib/db.js";
import { MonthlyCreditLedger, Payment, PointHistory, User, ZiweiAiConsultation } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { fetchPortOnePayment, getPortOnePublicConfig } from "../lib/portone.js";
import { callGeminiText } from "../lib/gemini.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { calculateZiweiAiChart, formatStarWithBrightness } from "../lib/ziwei-ai-chart.js";

const SERVICE_KEY = "ziwei-ai";
const FEATURE_KEY = "ziwei-ai-consultation";
const ACCESS_TOKEN_TYPE = "ziwei-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "자미두수 AI 상담";
const COIN_PRICE = 300;
const AMOUNT_KRW = 30000;
const MIN_INITIAL_CONSULTATION_BODY_CHARS = 20000;
const MAX_INITIAL_CONSULTATION_BODY_CHARS = 30000;
const INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS = 26000;
const GEMINI_ENV_KEYS = [
  "GEMINIF_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
];

const MESSAGES = Object.freeze({
  login: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  invalidInput: "자미두수 상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간 정보를 다시 확인해 주세요.",
  birthTimeMissing: "자미두수는 출생시간이 중요해요. 출생시간을 입력하거나 ‘출생시간 모름’을 선택해 주세요.",
  customQuestionRequired: "별궁에 묻고 싶은 질문을 조금 더 구체적으로 적어 주세요.",
  calculationFailed: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  serverFailed: "자미두수 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  llmFailed: "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
});

const TOPICS = new Set([
  "전체 명반 해석",
  "타고난 성향",
  "인생의 큰 흐름",
  "직업/사업운",
  "재물운",
  "연애/결혼운",
  "인간관계",
  "가족/부모운",
  "건강/멘탈",
  "이직/창업",
  "올해 운세",
  "대운 흐름",
  "현재 고민 상담",
]);
const FOCUS_AREA_LABELS = Object.freeze({
  overall: "전체 명반 해석",
  love: "연애/결혼운",
  money: "재물운",
  career: "직업/사업운",
  health: "건강/멘탈",
  relationship: "인간관계",
  personality: "타고난 성향",
  custom: "현재 고민 상담",
});
const FOCUS_AREAS = new Set(Object.keys(FOCUS_AREA_LABELS));

const FORBIDDEN_RESULT_PATTERN = /\bAI\b|PDF|챕터|chapter|\bjob\b|\bprogress\b|프롬프트|시스템/i;

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function extractJsonObjectText(text) {
  const normalized = clean(text).replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) return "";
  return normalized.slice(start, end + 1);
}

function parseStructuredConsultationResult(text) {
  const jsonText = extractJsonObjectText(text);
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText);
    return parsed && typeof parsed === "object" && parsed.sections && typeof parsed.sections === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function countStructuredConsultationBodyChars(text) {
  const parsed = parseStructuredConsultationResult(text);
  if (!parsed) return 0;
  return Object.values(parsed.sections || {}).reduce((sum, section) => {
    if (!section || typeof section !== "object") return sum;
    return sum + clean(section.body).length;
  }, 0);
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

function safeLogPayload({ route = "", requestId = "", body = {}, normalized = null, validation = "", access = "", env = {}, error = null, providerReason = "" } = {}) {
  const input = normalized?.input || {};
  const birthInfo = input.birthInfo || body.birthInfo || {};
  const question = clean(input.userQuestion ?? input.question ?? body.userQuestion ?? body.question ?? body.message, 1200);
  return {
    route: clean(route || "/api/ziwei-ai", 120),
    requestId: clean(requestId || body.requestId || body.idempotencyKey, 180),
    serviceType: clean(input.serviceType || body.serviceType || body.featureKey || FEATURE_KEY, 80),
    consultationType: clean(input.consultationType || body.consultationType || "ziwei", 40),
    focusArea: clean(input.focusArea || body.focusArea || "overall", 40),
    validation,
    access,
    name: maskName(input.birthInfo?.name || birthInfo.name || body.userName || body.name),
    gender: clean(input.birthInfo?.gender || birthInfo.gender || body.gender, 20),
    birthDate: maskBirthDate(input.birthInfo?.birthDate || birthInfo.birthDate || body.birthDate),
    calendarType: clean(input.birthInfo?.calendarType || birthInfo.calendarType || body.calendarType, 20),
    questionLength: question.length,
    ...getProviderDiagnostics(env),
    providerReason: providerReason || getProviderDiagnostics(env).providerReason,
    ...(error ? {
      errorMessage: clean(error?.message || error, 500),
      ...(isDevelopmentEnv(env) ? { stack: clean(error?.stack, 2000) } : {}),
    } : {}),
  };
}

function logZiweiAi(marker, details = {}, level = "info") {
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  console[method](`[Ziwei AI LLM ${marker}]`, details);
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
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes).map((byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, length);
}

function buildPaymentId(userId) {
  const suffix = clean(userId, 40).replace(/[^a-zA-Z0-9_-]/g, "").slice(-10) || "guest";
  return `cd-zwai-${suffix}-${Date.now()}-${randomToken(8)}`;
}

function normalizeGender(value) {
  const text = clean(value, 20).toLowerCase();
  if (["m", "male", "man", "남", "남성", "남자"].includes(text)) return "male";
  if (["f", "female", "woman", "여", "여성", "여자"].includes(text)) return "female";
  if (["unknown", "other", "기타", "비공개"].includes(text)) return "unknown";
  return text || "";
}

function normalizeCalendarType(value) {
  const text = clean(value, 20).toLowerCase();
  if (text === "lunar" || text === "음력") return "lunar";
  return "solar";
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeFocusArea(value, fallbackTopic = "") {
  const token = clean(value, 40).toLowerCase();
  if (FOCUS_AREAS.has(token)) return token;
  const topic = clean(fallbackTopic, 80);
  const matched = Object.entries(FOCUS_AREA_LABELS).find(([, label]) => label === topic);
  return matched?.[0] || "overall";
}

function normalizeConsultationInput(body = {}) {
  const birthSource = body.birthInfo && typeof body.birthInfo === "object" ? body.birthInfo : body;
  const name = clean(body.userName ?? body.name ?? body.nickname ?? birthSource.name ?? birthSource.nickname, 80);
  const gender = normalizeGender(body.gender ?? birthSource.gender);
  const birthDate = clean(body.birthDate ?? birthSource.birthDate, 10);
  const birthTimeUnknown = body.birthTimeUnknown === true || birthSource.birthTimeUnknown === true;
  const birthTime = birthTimeUnknown ? "" : clean(body.birthTime ?? birthSource.birthTime, 5);
  const calendarType = normalizeCalendarType(body.calendarType ?? birthSource.calendarType);
  const isLeapMonth = body.isLeapMonth === true || birthSource.isLeapMonth === true;
  const focusArea = normalizeFocusArea(body.focusArea, body.topic ?? body.consultationTopic);
  const topic = clean(body.topic ?? body.consultationTopic ?? FOCUS_AREA_LABELS[focusArea], 80);
  const userQuestion = clean(body.userQuestion ?? body.question ?? body.message, 1200);
  const serviceType = clean(body.serviceType || FEATURE_KEY, 80);
  const consultationType = clean(body.consultationType || "ziwei", 40);
  const locale = clean(body.locale || "ko", 12);

  if (!gender) return { ok: false, message: MESSAGES.invalidInput };
  if (!isValidDateKey(birthDate)) return { ok: false, message: MESSAGES.invalidInput };
  if (!birthTimeUnknown && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) return { ok: false, message: MESSAGES.birthTimeMissing };
  if (!TOPICS.has(topic)) return { ok: false, message: "상담 주제를 다시 선택해 주세요." };
  if (!FOCUS_AREAS.has(focusArea)) return { ok: false, message: "상담 주제를 다시 선택해 주세요." };
  if (focusArea === "custom" && userQuestion.length < 2) return { ok: false, message: MESSAGES.customQuestionRequired };
  if (userQuestion && userQuestion.length < 2) return { ok: false, message: "현재 가장 궁금한 질문을 조금 더 구체적으로 적어 주세요." };

  const normalized = {
    serviceType,
    consultationType,
    focusArea,
    locale,
    birthInfo: {
      name,
      gender,
      birthDate,
      birthTime,
      birthTimeUnknown,
      calendarType,
      isLeapMonth,
    },
    topic,
    userQuestion,
  };

  return {
    ok: true,
    input: normalized,
    inputHash: sha256(stableJson(normalized)),
  };
}

function invalidInput(message = MESSAGES.invalidInput, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message: clean(message) || MESSAGES.invalidInput }, { status });
}

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
}

function serverError(message = MESSAGES.serverFailed, status = 500) {
  return json({ ok: false, reason: "SERVER_ERROR", message }, { status });
}

function paymentVerifyFailed() {
  return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: MESSAGES.paymentVerifyFailed }, { status: 402 });
}

function calculationFailed() {
  return json({ ok: false, reason: "CALCULATION_FAILED", message: MESSAGES.calculationFailed }, { status: 422 });
}

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = resolved?.pricing || {};
  const coinPrice = Number(pricing.coinPrice || pricing.cost || COIN_PRICE);
  const amountKRW = Number(pricing.amountKRW || pricing.paymentAmount || AMOUNT_KRW);
  return {
    pricing: {
      ...pricing,
      featureKey: FEATURE_KEY,
      cost: coinPrice,
      coinPrice,
      amountKRW,
      paymentAmount: amountKRW,
      reason: pricing.reason || ORDER_NAME,
    },
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
    .select("email name phoneNumber points role profileSubscription subscription membership pass entitlement paidFeatures unlockedFeatures recentConsumeRequestIds")
    .lean();
}

function hasMonthlyCredit(user = {}, membershipCreditCost = 0) {
  const balance = Math.max(0, Math.floor(Number(user?.profileSubscription?.membershipCreditBalance || user?.profileSubscription?.monthlyStoneBalance || 0)));
  return membershipCreditCost > 0 && balance >= membershipCreditCost;
}

async function findPaidPayment({ userId, idempotencyKey = "", paymentId = "" }) {
  const clauses = [];
  if (idempotencyKey) clauses.push({ idempotencyKey });
  if (paymentId) clauses.push({ merchantUid: paymentId }, { impUid: paymentId });
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

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniq(values = []) {
  return [...new Set(values.map((value) => clean(value, 180)).filter(Boolean))];
}

function readBillingContext(body = {}) {
  const billing = asObject(body.billingEvidence || body.billing || body.paymentEvidence);
  const consume = asObject(body.consume || billing.consume);
  const accessGrant = asObject(body.accessGrant || billing.accessGrant);
  const payment = asObject(body.payment || billing.payment);
  return { billing, consume, accessGrant, payment };
}

function collectBillingTokens(body = {}, idempotencyKey = "") {
  const ctx = readBillingContext(body);
  return uniq([
    idempotencyKey,
    body.paymentId,
    body.merchantUid,
    body.merchant_uid,
    body.impUid,
    body.imp_uid,
    body.transactionId,
    body.purchaseId,
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
    ctx.accessGrant.merchantUid,
    ctx.accessGrant.impUid,
    ctx.accessGrant.requestId,
    ctx.payment.paymentId,
    ctx.payment.merchantUid,
    ctx.payment.impUid,
    ctx.payment.id,
    ctx.payment._id,
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
    clauses.push({ requestId: token });
    clauses.push({ idempotencyKey: token });
    clauses.push({ merchantUid: token });
    clauses.push({ impUid: token });
    if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: token });
  });
  return clauses;
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

async function resolveBillingGateAccess({ auth, user, body, pricing, idempotencyKey }) {
  const signal = readBillingAccessSignal(body);
  const tokens = collectBillingTokens(body, idempotencyKey);
  const featureKeys = [FEATURE_KEY];
  const hasEvidencePayload = tokens.length > 0 || signal.includes("pass") || signal.includes("monthly") || signal.includes("credit") || signal.includes("coin");
  if (!hasEvidencePayload) return null;

  if (/usage[-_]pass/.test(signal)) return null;

  if (signal.includes("pass") || signal.includes("membership_pass")) {
    const pass = normalizeHoneyPassEntitlement(user || {});
    if (canUseByPass(pass, pricing.coinPrice)) {
      return {
        ok: true,
        accessType: "pass",
        paymentId: tokens[0] || "",
        prepaid: true,
        evidenceType: "pass",
      };
    }
  }

  const paymentClauses = billingTokenClauses(tokens);
  if (paymentClauses.length) {
    const payment = await Payment.findOne({
      userId: auth.userId,
      paymentType: "digital_content",
      featureKey: { $in: featureKeys },
      status: { $in: ["paid", "success", "fulfilled"] },
      $or: paymentClauses,
    }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
    if (payment) {
      return {
        ok: true,
        accessType: "paid",
        paymentId: clean(payment.merchantUid || payment.impUid || payment._id, 160),
        prepaid: true,
        evidenceType: "direct_payment",
        evidenceId: clean(payment._id, 160),
      };
    }
  }

  const pointClauses = pointHistoryTokenClauses(tokens);
  if (pointClauses.length) {
    const pointHistory = await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: { $in: featureKeys },
      "metadata.coinRefundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: pointClauses,
    }).sort({ createdAt: -1 }).lean();
    if (pointHistory) {
      return {
        ok: true,
        accessType: "paid",
        paymentId: clean(pointHistory._id, 160),
        prepaid: true,
        evidenceType: "coin",
        evidenceId: clean(pointHistory._id, 160),
        amount: Math.max(0, Math.floor(Math.abs(Number(pointHistory.delta || pointHistory?.metadata?.chargedCoins || pricing.coinPrice || 0)))),
        purchaseId: clean(pointHistory?.metadata?.purchaseId || pointHistory?.metadata?.idempotencyKey || pointHistory?.metadata?.orderId || "", 180),
      };
    }
  }

  const monthlyClauses = monthlyCreditTokenClauses(tokens);
  if (monthlyClauses.length) {
    const ledger = await MonthlyCreditLedger.findOne({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: { $in: [FEATURE_KEY, SERVICE_KEY] },
      "metadata.refundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: monthlyClauses,
    }).sort({ createdAt: -1 }).lean();
    if (ledger) {
      return {
        ok: true,
        accessType: "subscription",
        paymentId: clean(ledger._id, 160),
        prepaid: true,
        evidenceType: "monthly_credit",
        evidenceId: clean(ledger._id, 160),
        amount: Math.max(0, Math.floor(Number(ledger.amount || pricing.membershipCreditCost || 0))),
        purchaseId: clean(ledger.sourceId || ledger?.metadata?.purchaseId || ledger?.metadata?.idempotencyKey || "", 180),
      };
    }
  }

  return null;
}

async function resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash, paymentId = "" }) {
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", paymentId: "" };
  }

  const paidPayment = await findPaidPayment({ userId: auth.userId, idempotencyKey, paymentId });
  if (paidPayment) {
    const storedHash = clean(paidPayment?.pricingSnapshot?.inputHash);
    if (storedHash && storedHash !== inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: "같은 요청 키로 다른 상담 정보를 사용할 수 없습니다." };
    }
    return { ok: true, accessType: "paid", paymentId: clean(paidPayment.merchantUid || paidPayment.impUid || paymentId, 160) };
  }

  const pass = normalizeHoneyPassEntitlement(user || {});
  if (canUseByPass(pass, pricing.coinPrice)) {
    return { ok: true, accessType: "pass", paymentId: "" };
  }

  if (hasMonthlyCredit(user, pricing.membershipCreditCost)) {
    return { ok: true, accessType: "subscription", paymentId: "" };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function customerFromUser(user, userId) {
  const email = clean(user?.email).toLowerCase();
  const safeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : `buyer-${clean(userId).slice(-10) || "guest"}@code-destiny.com`;
  return {
    fullName: clean(user?.name, 40) || "Code Destiny",
    email: safeEmail,
    phoneNumber: clean(user?.phoneNumber).replace(/\D/g, "").slice(0, 11),
  };
}

function buildPaymentPayload({ config, paymentId, pricing, user, userId, idempotencyKey }) {
  return {
    storeId: config.storeId || "",
    channelKey: config.channelKey || "",
    paymentId,
    merchantUid: paymentId,
    orderName: ORDER_NAME,
    totalAmount: pricing.amountKRW,
    paymentAmount: pricing.amountKRW,
    amountKRW: pricing.amountKRW,
    currency: config.currency || "CURRENCY_KRW",
    payMethod: config.payMethod || "CARD",
    customer: customerFromUser(user, userId),
    featureKey: FEATURE_KEY,
    serviceId: SERVICE_KEY,
    serviceKey: SERVICE_KEY,
    contentId: FEATURE_KEY,
    contentType: SERVICE_KEY,
    idempotencyKey,
    noticeUrl: config.noticeUrl || "",
    customData: {
      serviceKey: SERVICE_KEY,
      featureKey: FEATURE_KEY,
      idempotencyKey,
    },
    runtimeGate: {
      title: ORDER_NAME,
      reason: ORDER_NAME,
      featureKey: FEATURE_KEY,
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      serviceKey: SERVICE_KEY,
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      amountKrw: pricing.amountKRW,
      membershipCreditCost: pricing.membershipCreditCost,
      paymentMode: "DIRECT_KRW",
      requestId: idempotencyKey,
      idempotencyKey,
    },
  };
}

async function createOrReusePaymentPayload({ env, auth, user, pricing, idempotencyKey, inputHash }) {
  const config = getPortOnePublicConfig(env || {});

  const existing = await Payment.findOne({
    userId: auth.userId,
    idempotencyKey,
    paymentType: "digital_content",
  }).sort({ createdAt: -1 }).lean();

  if (existing) {
    if (clean(existing.featureKey) !== FEATURE_KEY || clean(existing?.pricingSnapshot?.inputHash) !== inputHash) {
      return { ok: false, message: "같은 요청 키로 다른 결제 요청을 만들 수 없습니다." };
    }
    const paymentId = clean(existing.merchantUid || existing.impUid, 160);
    return {
      ok: true,
      paymentPayload: buildPaymentPayload({ config, paymentId, pricing, user, userId: auth.userId, idempotencyKey }),
    };
  }

  if (!config.configured) {
    return {
      ok: true,
      paymentPayload: buildPaymentPayload({ config, paymentId: idempotencyKey, pricing, user, userId: auth.userId, idempotencyKey }),
    };
  }

  const paymentId = buildPaymentId(auth.userId);
  await Payment.create({
    userId: auth.userId,
    merchantUid: paymentId,
    idempotencyKey,
    paymentAmount: pricing.amountKRW,
    expectedChargedPoints: pricing.coinPrice,
    chargedPoints: 0,
    featureKey: FEATURE_KEY,
    productId: SERVICE_KEY,
    coinPrice: pricing.coinPrice,
    membershipCreditCost: pricing.membershipCreditCost,
    accessType: "single_purchase",
    requestId: idempotencyKey,
    pricingSnapshot: {
      ...pricing.pricing,
      serviceKey: SERVICE_KEY,
      serviceId: SERVICE_KEY,
      featureKey: FEATURE_KEY,
      contentId: FEATURE_KEY,
      contentType: SERVICE_KEY,
      inputHash,
      idempotencyKey,
      paymentId,
      orderName: ORDER_NAME,
      amountKRW: pricing.amountKRW,
      coinPrice: pricing.coinPrice,
      createdAt: new Date().toISOString(),
      returnPath: "/ziwei-ai",
    },
    paymentMethod: "CARD",
    status: "pending",
    orderState: "PENDING",
    source: "prepare",
    paymentType: "digital_content",
  });

  return {
    ok: true,
    paymentPayload: buildPaymentPayload({ config, paymentId, pricing, user, userId: auth.userId, idempotencyKey }),
  };
}

function extractPortOneStoreId(payment = {}) {
  const raw = payment?.rawV2 && typeof payment.rawV2 === "object" ? payment.rawV2 : payment;
  return clean(raw?.storeId || raw?.store?.id || raw?.store?.storeId);
}

function isKrwCurrency(value) {
  const currency = clean(value).toUpperCase();
  return currency === "KRW" || currency === "CURRENCY_KRW";
}

async function verifyPaymentForStart({ env, auth, paymentId, idempotencyKey, inputHash, pricing }) {
  const normalizedPaymentId = clean(paymentId, 160);
  if (!normalizedPaymentId) return { ok: false };

  const order = await Payment.findOne({
    userId: auth.userId,
    merchantUid: normalizedPaymentId,
    featureKey: FEATURE_KEY,
    paymentType: "digital_content",
    accessType: "single_purchase",
  }).lean();
  if (!order) return { ok: false };
  if (clean(order?.pricingSnapshot?.inputHash) !== inputHash || clean(order.idempotencyKey) !== idempotencyKey) return { ok: false };

  if (["paid", "success", "fulfilled"].includes(clean(order.status).toLowerCase())) {
    return { ok: true, accessType: "paid", paymentId: normalizedPaymentId };
  }

  let portOnePayment = null;
  try {
    portOnePayment = await fetchPortOnePayment(env, normalizedPaymentId);
  } catch (_) {
    return { ok: false };
  }

  const config = getPortOnePublicConfig(env);
  const portOneStoreId = extractPortOneStoreId(portOnePayment);
  const amount = Number(portOnePayment?.amount || 0);
  const status = clean(portOnePayment?.status).toLowerCase();
  if (clean(portOnePayment?.paymentId || portOnePayment?.id) !== normalizedPaymentId) return { ok: false };
  if (config.storeId && portOneStoreId && portOneStoreId !== config.storeId) return { ok: false };
  if (amount !== pricing.amountKRW) return { ok: false };
  if (!isKrwCurrency(portOnePayment?.currency)) return { ok: false };
  if (status !== "paid") return { ok: false };

  const paidAt = portOnePayment?.paid_at
    ? new Date(Number(portOnePayment.paid_at) * 1000)
    : new Date();

  await Payment.findByIdAndUpdate(order._id, {
    $set: {
      impUid: normalizedPaymentId,
      merchantUid: normalizedPaymentId,
      paymentAmount: pricing.amountKRW,
      expectedChargedPoints: pricing.coinPrice,
      chargedPoints: 0,
      coinPrice: pricing.coinPrice,
      membershipCreditCost: pricing.membershipCreditCost,
      status: "success",
      orderState: "PAID_VERIFIED",
      paidAt,
      source: "confirm",
      rawPortOne: portOnePayment,
      failureCode: null,
      failureMessage: null,
      failureStage: null,
      lastErrorAt: null,
    },
    $inc: { confirmAttempts: 1 },
  }).catch(() => {});

  return { ok: true, accessType: "paid", paymentId: normalizedPaymentId };
}

function buildSystemPrompt() {
  return [
    "당신은 30년 경력의 자미두수(紫微斗數) 명인입니다. 눈앞에 앉은 사람의 명반을 손끝으로 짚어 가며, 따뜻하지만 정확하게 짚어 주는 현역 상담가처럼 답합니다.",
    "",
    "대만·홍콩 정통 파계를 기반으로 하되, 현대인의 삶에 실용적으로 적용하는 심화 독법으로 상담합니다.",
    "정확도는 계산된 명반 데이터에 둡니다. 없는 별, 없는 궁, 확인되지 않은 사건은 만들지 말고, 근거가 약한 부분은 부드러운 가능성으로 말합니다.",
    "상담은 사용자의 질문을 중심에 두고, 명반의 근거와 현실의 선택지를 한 흐름으로 이어 줍니다.",
    "",
    "가장 중요한 두 원칙(무조건 우선):",
    "A. 별 하나만 보고 길흉을 단정하지 않습니다. 반드시 해당 궁의 주성·보좌성, 삼방사정에서 회조(會照)되는 별, 회·조·협 관계, 사화(祿權科忌)의 비입/자화를 함께 종합해 서술합니다.",
    "B. 사전식 별 정의를 나열하지 않습니다('자미는 제왕의 별입니다' 같은 문장 금지). 대신 그 근거가 사용자의 삶에서 어떤 성향·사건 패턴·선택 습관으로 나타나는지로 풀어냅니다.",
    "",
    "서술 방식(각 핵심 문단을 이 3단으로):",
    "① 한 줄 핵심 — 이 궁/주제의 기조를 은유·이미지로 한 문장. (감성 한 스푼)",
    "② 왜 그런가(근거) — 성요·강약·사화·삼방사정을 근거로 '명궁의 자미가 삼방에서 천부를 회조하니…'처럼 논리를 노출해 2~3문장.",
    "③ 그래서 삶에서는 — 추상론이 아니라 지금 실행할 수 있는 행동 제안 1~2문장.",
    "",
    "표기 규칙: 별·용어는 한자를 한 번 병기하고(예: 자미(紫微), 화기(化忌)), 초심자도 읽히게 그 자리에서 한 번은 쉬운 말로 풀어 줍니다.",
    "",
    "그 밖의 원칙:",
    "1. 보고서처럼 딱딱하게 쓰지 말고, 실제 상담사가 명반을 놓고 설명하듯 자연스럽게 답변합니다.",
    "2. 명반 데이터의 각 궁에는 별의 강약(묘·왕·득·리·평·함) 값이 brightness로 함께 제공됩니다. 이 값을 반드시 해석의 핵심 근거로 사용하고([아래 계산 확정값]의 강약 표기를 그대로 인용), 표에 없는 별은 강약을 지어내지 말고 궁의 조합·사화·삼방사정으로만 근거를 세웁니다.",
    "3. 사화는 화록·화권·화과·화기가 어느 궁에 떨어지는지에 따라 확장, 장악력, 인정, 집착과 차질의 흐름으로 구분합니다.",
    "4. 보성은 도움과 보완으로, 살성은 위험 단정이 아니라 긴장, 압박, 돌파력, 반복되는 시험으로 해석합니다.",
    "5. 현재 대운과 세운은 지금 사용자가 실제로 선택할 타이밍 언어로 연결합니다.",
    "6. 화기(化忌)가 앉은 궁은 '주의'가 직관적으로 드러나게 짚되, 공포를 조장하지 말고 반드시 대처법을 함께 제시합니다.",
    "7. 질액궁은 건강을 단정하지 말고 생활 습관과 취약 경향으로 조심스럽게 해석합니다.",
    "8. 운세를 절대적 예언처럼 말하지 않고 불안감을 조장하지 않습니다.",
    "9. 같은 문장을 반복하지 않습니다.",
    "10. PDF, 챕터, job, progress, 프롬프트, 시스템 같은 표현을 결과에 노출하지 않습니다.",
    "11. 사용자가 선택한 상담 주제와 자유 질문을 가장 깊게 다룹니다.",
    "12. 삼방사정은 한 궁만 따로 끊어 보지 않고, 질문과 연결된 축의 힘이 어디서 들어오고 어디로 새는지 읽는 방식으로 반영합니다.",
  ].join("\n");
}

// 사화 4성이 실제로 앉은 궁을 명반에서 찾아 확정값으로 요약한다.
function resolveSihuaPlacements(chart) {
  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const transforms = chart?.fourTransformations || {};
  const labels = { huaLu: "화록", huaQuan: "화권", huaKe: "화과", huaJi: "화기" };
  const placements = {};
  for (const [key, star] of Object.entries(transforms)) {
    if (!star) continue;
    const palace = palaces.find((item) => [
      ...(item.mainStars || []),
      ...(item.assistantStars || []),
      ...(item.maleficStars || []),
    ].includes(star));
    placements[key] = { label: labels[key] || key, star, palace: palace?.name || "" };
  }
  return placements;
}

// 궁의 주성/보성/살성 이름에 brightness(강약) 표기를 붙인 텍스트로 변환한다. 표에 없는 별은 이름만 표기(가짜 강약 생성 금지).
function starsWithBrightness(palace, stars) {
  const list = Array.isArray(stars) ? stars : [];
  if (!list.length) return "무주성(차성안궁)";
  const brightness = palace?.brightness && typeof palace.brightness === "object" ? palace.brightness : {};
  return list.map((name) => formatStarWithBrightness(name, brightness[name])).join(", ");
}

function buildCanonicalZiweiFacts(chart) {
  const lines = [];
  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const lifePalaceData = palaces.find((item) => item.name === "명궁");
  if (chart?.lifePalace || lifePalaceData) {
    lines.push(`명궁: ${lifePalaceData?.earthlyBranch ? `${lifePalaceData.earthlyBranch}궁` : ""} 주성 ${starsWithBrightness(lifePalaceData, lifePalaceData?.mainStars)}`.trim());
  }
  if (chart?.bodyPalace) lines.push(`신궁: ${chart.bodyPalace}`);
  const sihua = resolveSihuaPlacements(chart);
  const sihuaLine = Object.values(sihua)
    .map((item) => `${item.label}=${item.star}${item.palace ? `(${item.palace})` : ""}`)
    .join(" · ");
  if (sihuaLine) lines.push(`사화: ${sihuaLine}`);
  if (chart?.bureau?.name) lines.push(`오행국: ${chart.bureau.name} (첫 대한 ${chart.bureau.number}세 시작)`);
  if (palaces.length) {
    lines.push("12궁 강약(◎=묘·최상, O=득·안정, ▲=리·이로움, △=평·보통, X=함·주의):");
    for (const palace of palaces) {
      const allStars = [...(palace.mainStars || []), ...(palace.assistantStars || []), ...(palace.maleficStars || [])];
      if (!allStars.length) continue;
      lines.push(`- ${palace.name}(${palace.earthlyBranch}): ${starsWithBrightness(palace, allStars)}`);
    }
  }
  return lines;
}

// LLM 응답의 meta를 서버 계산 확정값으로 덮어쓰고, 본문이 사화·12궁을 실제로 참조했는지 검증한다.
function enforceZiweiChartFacts(text, chart) {
  const parsed = parseStructuredConsultationResult(text);
  if (!parsed || typeof parsed !== "object") return { text, issues: [] };

  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const lifeData = palaces.find((item) => item.name === "명궁") || null;
  const bodyData = palaces.find((item) => item.name === chart?.bodyPalace) || null;
  const sihua = resolveSihuaPlacements(chart);
  const meta = parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {};

  meta.mingong = {
    ...(meta.mingong && typeof meta.mingong === "object" ? meta.mingong : {}),
    branch: lifeData?.earthlyBranch || "",
    main_stars: lifeData?.mainStars || [],
  };
  meta.shengong = {
    ...(meta.shengong && typeof meta.shengong === "object" ? meta.shengong : {}),
    palace: chart?.bodyPalace || "",
    main_stars: bodyData?.mainStars || [],
  };
  const sihuaKeyMap = { huaLu: "lu", huaQuan: "quan", huaKe: "ke", huaJi: "ji" };
  const metaSihua = meta.sihua && typeof meta.sihua === "object" ? meta.sihua : {};
  for (const [key, placement] of Object.entries(sihua)) {
    metaSihua[sihuaKeyMap[key] || key] = { star: placement.star, palace: placement.palace };
  }
  meta.sihua = metaSihua;

  const currentYear = new Date().getFullYear();
  const lunarYear = Number(chart?.lunar?.year);
  const age = Number.isFinite(lunarYear) ? currentYear - lunarYear + 1 : null;
  const currentLuck = age != null
    ? (chart?.majorLuck || []).find((cycle) => Number(cycle.startAge) <= age && age <= Number(cycle.endAge))
    : null;
  if (currentLuck) {
    const luckPalace = palaces.find((item) => item.name === currentLuck.palaceName) || null;
    meta.dayun = {
      ...(meta.dayun && typeof meta.dayun === "object" ? meta.dayun : {}),
      current_palace: currentLuck.palaceName || "",
      age_range: currentLuck.range || "",
      main_stars: luckPalace?.mainStars || [],
    };
  }
  parsed.meta = meta;

  const sections = parsed.sections && typeof parsed.sections === "object" ? parsed.sections : {};
  const bodyText = Object.values(sections).map((section) => clean(section?.body)).join("\n");
  const issues = [];
  for (const placement of Object.values(sihua)) {
    if (placement.star && bodyText && !bodyText.includes(placement.star)) {
      issues.push(`SIHUA_STAR_UNSTATED:${placement.star}`);
    }
  }
  if (bodyText && palaces.length) {
    const mentioned = palaces.filter((item) => bodyText.includes(item.name)).length;
    if (mentioned < 9) issues.push(`PALACE_COVERAGE:${mentioned}/12`);
  }
  if (bodyText && (lifeData?.mainStars || []).length && !lifeData.mainStars.some((star) => bodyText.includes(star))) {
    issues.push("MINGGONG_STAR_UNSTATED");
  }

  return { text: JSON.stringify(parsed, null, 2), issues };
}

function describeZiweiGroundingIssues(issues, chart) {
  const lines = [];
  const missingStars = issues.filter((issue) => issue.startsWith("SIHUA_STAR_UNSTATED:")).map((issue) => issue.split(":")[1]);
  if (missingStars.length) lines.push(`- 사화 별 ${missingStars.join(", ")}를 본문에서 별 이름으로 직접 언급하며 해석하라.`);
  if (issues.some((issue) => issue.startsWith("PALACE_COVERAGE"))) {
    lines.push("- 12궁 가운데 최소 9개 궁을 본문에서 궁 이름으로 직접 참조하라. 막연한 총평으로 궁 참조를 대체하지 마라.");
  }
  if (issues.includes("MINGGONG_STAR_UNSTATED")) lines.push("- 명궁 주성을 본문에서 별 이름으로 직접 언급하며 근거로 삼아라.");
  lines.push("아래 계산 확정값과 다르게 서술하는 것은 금지한다:");
  lines.push(...buildCanonicalZiweiFacts(chart));
  return lines;
}

function buildFirstPrompt(input, chart) {
  const birth = input.birthInfo || {};
  return [
    "[상담 정보]",
    `이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `성별: ${birth.gender}`,
    `생년월일: ${birth.birthDate}`,
    `출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `달력: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `윤달 여부: ${birth.isLeapMonth ? "윤달" : "아님"}`,
    `상담 주제: ${input.topic}`,
    `현재 가장 궁금한 질문: ${input.userQuestion || "자미두수 명반의 전체 흐름을 알고 싶습니다."}`,
    "",
    "[계산된 자미두수 명반 데이터]",
    JSON.stringify(chart, null, 2),
    "",
    "[계산 확정값 — 본문과 meta에서 이 값과 다르게 서술하는 것을 금지]",
    ...buildCanonicalZiweiFacts(chart),
    "",
    "반드시 아래 JSON 구조만 반환해 주세요. JSON 앞뒤에 설명, 마크다운 코드블록, 인사말을 붙이지 마세요.",
    JSON.stringify({
      meta: {
        name: birth.name || "이름 미입력",
        gender: birth.gender || "미입력",
        mingong: {
          branch: "명궁 지지",
          main_stars: ["별 이름"],
          description: "명궁 핵심 요약",
        },
        shengong: {
          palace: "신궁 이름",
          main_stars: ["별 이름"],
        },
        sihua: {
          lu: { star: "별 이름", palace: "궁 이름" },
          quan: { star: "별 이름", palace: "궁 이름" },
          ke: { star: "별 이름", palace: "궁 이름" },
          ji: { star: "별 이름", palace: "궁 이름" },
        },
        dayun: {
          current_palace: "현재 대운궁 이름",
          age_range: "나이 범위",
          main_stars: ["별 이름"],
          theme: "현재 대운의 핵심 한 줄",
        },
        scores: {
          career: 0,
          wealth: 0,
          relationship: 0,
          health: 0,
          overall: 0,
        },
      },
      sections: {
        reading_guide: { title: "이 명반을 읽는 순서", body: "상담 본문" },
        essence: { title: "명궁이 말하는 본질", body: "상담 본문" },
        flow: { title: "사화와 흐름의 물결", body: "상담 본문" },
        triad_axis: { title: "삼방사정이 여는 축", body: "상담 본문" },
        twelve_palaces: { title: "12궁의 연결 지도", body: "상담 본문" },
        career: { title: "일과 사업의 지도", body: "상담 본문" },
        wealth: { title: "재물이 머무는 방식", body: "상담 본문" },
        relationship: { title: "관계와 인연의 결", body: "상담 본문" },
        dayun_now: { title: "지금의 대운", body: "상담 본문" },
        timing_strategy: { title: "대한과 세운의 선택 전략", body: "상담 본문" },
        caution: { title: "반복되는 함정과 전환점", body: "상담 본문" },
        core_answer: { title: "지금 질문에 대한 별궁의 답", body: "상담 본문" },
        prescription: { title: "지금의 처방", body: "상담 본문" },
      },
    }, null, 2),
    "",
    "작성 규칙:",
    "0. reading_guide는 이 명반을 어떤 순서로 읽으면 좋은지 안내하는 2~3문장입니다. '먼저 명궁으로 성향을, 신궁으로 후천의 힘을, 그다음 질문과 가까운 핵심 궁과 삼방사정으로 관계를 읽으세요'처럼 초심자를 이끄는 짧은 길잡이로 쓰세요. 이 문단은 3단 구조를 적용하지 않습니다.",
    "1. reading_guide를 제외한 각 body는 완결된 상담 문단으로 작성하고, '① 한 줄 핵심(은유) → ② 근거(궁·별·강약·사화·삼방사정) → ③ 지금 실행할 행동 조언' 3단으로 자연스럽게 이어 쓰세요. 서로 같은 첫 문장 구조를 반복하지 마세요.",
    `2. sections의 모든 body를 합산한 실제 상담 본문은 공백 포함 ${MIN_INITIAL_CONSULTATION_BODY_CHARS.toLocaleString("ko-KR")}자 이상 ${MAX_INITIAL_CONSULTATION_BODY_CHARS.toLocaleString("ko-KR")}자 이하로 작성하세요. 문장만 늘리지 말고 자미두수 전문가가 실제로 더 살필 파트를 각 흐름에 고르게 나누어 주세요.`,
    "3. 사용자의 상담 주제와 자유 질문을 먼저 붙잡고, 그 질문에 직접 닿는 궁과 별을 우선순위로 삼으세요.",
    "4. essence는 명궁 주성과 강약을 첫 흐름에 자연스럽게 밝히고, 신궁·보성·살성의 영향까지 통합하세요.",
    "5. flow는 화록·화권·화과·화기 네 별을 모두 별 이름으로 직접 언급하고, 위 계산 확정값의 궁 위치 그대로 각 사화가 놓인 궁의 욕망, 힘, 인정, 막힘을 현실적인 언어로 풀어주세요.",
    "6. triad_axis는 질문과 가장 가까운 궁의 삼방사정, 대궁, 협조궁을 함께 읽어 에너지가 들어오고 새는 길을 밝히세요.",
    "7. twelve_palaces는 12궁 전체를 단순 나열하지 말고 명궁·재백궁·관록궁·부부궁·복덕궁·질액궁의 상호작용을 중심으로 연결해 주세요.",
    "8. career, wealth, relationship, dayun_now는 관련 궁의 주성 강약, 삼방사정, 대운·세운 흐름을 질문 주제와 연결하세요.",
    "9. timing_strategy는 현재 대한, 올해 세운, 가까운 4주와 6개월의 선택 리듬을 분리해 말하세요.",
    "10. health는 질병을 단정하지 말고 질액궁의 긴장, 회복 습관, 생활 리듬의 취약 경향으로 조심스럽게 말하세요.",
    "11. caution은 반복되는 패턴 1~2개와 전환 방법을 흐름 있게 말하되, 겁을 주는 예언형 문장은 피하세요. 화기(化忌)가 앉은 궁이 있으면 그 주의점이 직관적으로 드러나게 짚되, 반드시 대처법을 함께 제시하세요.",
    "12. core_answer는 사용자의 질문에 대해 자미두수 전문가가 마지막으로 짚어 줄 핵심 답을 명확하게 전하세요.",
    "13. prescription은 지금 집중할 방향을 3가지 이내의 자연스러운 문단으로 마무리하세요.",
    "14. 별·용어는 한자를 한 번 병기하고(예: 자미(紫微), 화기(化忌)), 초심자도 읽히게 그 자리에서 한 번은 쉬운 말로 풀어 주세요. 단, 별 하나만 보고 단정하지 말고 반드시 삼방사정 회조와 사화 근거를 함께 녹이세요.",
    "15. career, wealth, relationship, health는 각 20점 만점, overall은 별도 종합 판단으로 100점 만점에 맞추세요.",
    "16. 전체 문체는 전문적이고 신비롭되, 개발 문서나 기능 안내처럼 들리면 안 됩니다.",
    "17. 결과를 소개하거나 화면을 설명하는 도입어, 서비스나 기능 안내처럼 들리는 표현을 쓰지 마세요.",
    "18. [계산 확정값]의 '12궁 강약' 표기(◎묘·O득·▲리·△평·X함)를 모든 궁 해석의 핵심 근거로 사용하세요. 강한 별(◎/O)은 확장·기회로, 약한 별(△/X)은 관리·주의가 필요한 지점으로 명시적으로 연결하고, 표에 없는 별의 강약은 지어내지 마세요.",
    chart?.uncertainty?.birthTimeUnknown ? "출생시간을 모르는 입력이므로, 단정하지 말고 '입력된 정보 기준으로 본 흐름'이라는 뉘앙스를 자연스럽게 반영해 주세요." : "",
  ].filter(Boolean).join("\n");
}

function buildFollowUpPrompt(consultation, question) {
  const birth = consultation.birthInfo || {};
  const history = (consultation.messages || [])
    .slice(-8)
    .map((message) => `${message.role === "assistant" ? "상담가" : "사용자"}: ${clean(message.content, 1400)}`)
    .join("\n\n");
  return [
    "[상담 정보]",
    `이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `성별: ${birth.gender}`,
    `생년월일: ${birth.birthDate}`,
    `출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `달력: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `처음 상담 주제: ${consultation.topic}`,
    "",
    "[자미두수 명반 데이터]",
    JSON.stringify(consultation.ziweiChart || {}, null, 2),
    "",
    "[이전 대화]",
    history,
    "",
    "[새 질문]",
    question,
    "",
    "이전 상담의 흐름을 이어받아 새 질문에 직접 답해 주세요. 질문과 가장 가까운 궁을 먼저 잡고, 명궁·신궁·주성 강약·사화·삼방사정·대운/세운 연결을 사용자가 이해할 수 있는 상담형 문장으로 풀어 주세요.",
    "새 답변도 명반 근거, 현실에서 드러나는 모습, 지금 선택할 조언이 자연스럽게 이어져야 합니다. 절대적 예언, 건강 단정, 불안을 키우는 표현은 피하세요.",
  ].join("\n");
}

function cleanForbiddenResult(text) {
  return clean(text)
    .replace(/\bAI\b/gi, "상담")
    .replace(/PDF/gi, "상담")
    .replace(/챕터/g, "흐름")
    .replace(/chapter/gi, "흐름")
    .replace(/\bprogress\b/gi, "흐름")
    .replace(/\bjob\b/gi, "상담")
    .replace(/프롬프트/g, "질문")
    .replace(/시스템/g, "상담 흐름");
}

function bodyCharRangeProblem(bodyChars, minBodyChars, maxBodyChars) {
  if (minBodyChars && bodyChars < minBodyChars) return "short";
  if (maxBodyChars && bodyChars > maxBodyChars) return "long";
  return "";
}

function buildBodyRangeRepairPrompt(text, { minBodyChars, maxBodyChars, bodyChars }) {
  const problem = bodyCharRangeProblem(bodyChars, minBodyChars, maxBodyChars);
  return [
    "다음 자미두수 상담 JSON을 같은 JSON 구조로 유지하면서 상담 본문 품질을 정리해 주세요.",
    `현재 sections body 합산은 약 ${Number(bodyChars || 0).toLocaleString("ko-KR")}자입니다.`,
    `sections의 모든 body 합산은 공백 포함 ${Number(minBodyChars).toLocaleString("ko-KR")}자 이상 ${Number(maxBodyChars).toLocaleString("ko-KR")}자 이하로 맞춰 주세요.`,
    problem === "short"
      ? "부족한 분량은 같은 말을 늘리지 말고 triad_axis, twelve_palaces, timing_strategy, core_answer 흐름에 실제 자미두수 상담에서 더 살필 근거를 보강해 주세요."
      : "너무 길어진 분량은 중복 문장과 반복 조언을 줄이고, 핵심 근거와 상담의 결은 보존해 주세요.",
    "전체 body에 명궁, 신궁, 주성 강약, 보성, 살성, 사화, 삼방사정, 대운과 세운의 근거를 고르게 나누어 풀어 주세요.",
    "사용자의 질문에 직접 닿는 현실 조언을 충분히 담되, 불안을 키우는 단정이나 건강 진단은 피하세요.",
    "반드시 JSON만 반환하고, JSON 앞뒤에 설명이나 마크다운 코드블록을 붙이지 마세요.",
    "금지 표현: AI, PDF, 챕터, chapter, job, progress, 프롬프트, 시스템",
    "",
    text,
  ].join("\n");
}

async function generateConsultationText(env, prompt, options = {}) {
  const logContext = options.logContext || {};
  logZiweiAi("Provider Selected", {
    ...logContext,
    ...getProviderDiagnostics(env),
  });
  // 자미두수 상담(자유질문 포함) → 캐시 키가 프롬프트 전체(질문 포함)로 잡혀 동일 입력만 히트.
  // 재제출/더블클릭 dedup + 결정적 재열람. follow-up(handleMessage)은 캐시 대상 아님.
  const ziweiLlmCache = {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 30 * 24 * 60 * 60,
    keyExtra: "ziwei-ai-v1",
  };
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: 0.72,
    maxOutputTokens: options.maxOutputTokens || 7000,
    timeoutMs: Number(env?.ZIWEI_AI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 55000),
    cache: ziweiLlmCache,
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  let text = clean(ai?.text);
  if (!ai?.ok || isMock || text.length < (options.minLength || 180)) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    throw error;
  }
  const minBodyChars = Number(options.minBodyChars || 0);
  const maxBodyChars = Number(options.maxBodyChars || 0);
  let bodyChars = countStructuredConsultationBodyChars(text);
  const initialRangeProblem = bodyCharRangeProblem(bodyChars, minBodyChars, maxBodyChars);
  if (initialRangeProblem) {
    const expanded = await callGeminiText(env, buildBodyRangeRepairPrompt(text, { minBodyChars, maxBodyChars, bodyChars }), {
      systemPrompt: buildSystemPrompt(),
      taskType: "fortune",
      temperature: 0.62,
      maxOutputTokens: options.maxOutputTokens || INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS,
      timeoutMs: Number(env?.ZIWEI_AI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 55000),
      cache: ziweiLlmCache,
    });
    const expandedText = clean(expanded?.text);
    const expandedBodyChars = countStructuredConsultationBodyChars(expandedText);
    const expandedRangeProblem = bodyCharRangeProblem(expandedBodyChars, minBodyChars, maxBodyChars);
    const improved = initialRangeProblem === "short"
      ? expandedBodyChars > bodyChars
      : expandedBodyChars > 0 && expandedBodyChars < bodyChars;
    if (expanded?.ok && !/mock/i.test(clean(expanded?.provider || expanded?.model)) && (!expandedRangeProblem || improved)) {
      text = expandedText;
      bodyChars = countStructuredConsultationBodyChars(text);
    }
  }
  if (!FORBIDDEN_RESULT_PATTERN.test(text)) {
    const cleanText = cleanForbiddenResult(text);
    const finalBodyChars = countStructuredConsultationBodyChars(cleanText);
    const rangeProblem = bodyCharRangeProblem(finalBodyChars, minBodyChars, maxBodyChars);
    if (rangeProblem) {
      // 경량 보장 계약: 목표 분량 범위를 벗어나도 렌더 가능한 상담문이면 버리지 않고 degrade로 전달한다.
      if (hasRenderableLlmText(cleanText, { minChars: 400 })) {
        return { text: cleanText, provider, model: clean(ai?.model), degraded: true };
      }
      const error = new Error("Generated consultation body is outside required range.");
      error.code = rangeProblem === "short" ? "INSUFFICIENT_RESULT_LENGTH" : "EXCESSIVE_RESULT_LENGTH";
      throw error;
    }
    return { text: cleanText, provider, model: clean(ai?.model) };
  }

  const repair = await callGeminiText(env, [
    "다음 상담 답변에서 개발 또는 제작 과정처럼 들리는 표현을 모두 빼고, 자연스러운 자미두수 상담문으로만 다시 써 주세요.",
    minBodyChars && maxBodyChars ? `sections의 모든 body 합산은 ${Number(minBodyChars).toLocaleString("ko-KR")}자 이상 ${Number(maxBodyChars).toLocaleString("ko-KR")}자 이하로 유지해 주세요.` : "",
    "금지 표현: AI, PDF, 챕터, chapter, job, progress, 프롬프트, 시스템",
    "",
    text,
  ].filter(Boolean).join("\n"), {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: 0.58,
    maxOutputTokens: options.maxOutputTokens || 16000,
    timeoutMs: 90000,
    cache: ziweiLlmCache,
  });
  const repaired = clean(repair?.text);
  const finalText = cleanForbiddenResult(repair?.ok && repaired.length >= 120 ? repaired : text);
  const finalBodyChars = countStructuredConsultationBodyChars(finalText);
  const finalRangeProblem = bodyCharRangeProblem(finalBodyChars, minBodyChars, maxBodyChars);
  if (finalRangeProblem) {
    // 경량 보장 계약: 수선 후에도 분량 범위를 벗어나나, 렌더 가능한 상담문이면 degrade로 전달한다.
    if (hasRenderableLlmText(finalText, { minChars: 400 })) {
      return {
        text: finalText,
        provider: clean(repair?.provider || provider),
        model: clean(repair?.model || ai?.model),
        degraded: true,
      };
    }
    const error = new Error("Generated consultation body is outside required range.");
    error.code = finalRangeProblem === "short" ? "INSUFFICIENT_RESULT_LENGTH" : "EXCESSIVE_RESULT_LENGTH";
    throw error;
  }
  return {
    text: finalText,
    provider: clean(repair?.provider || provider),
    model: clean(repair?.model || ai?.model),
  };
}

async function restorePrepaidAccessOnFailure({ userId, access = {}, idempotencyKey = "", pricing = getPricing(), error = null }) {
  if (!access?.prepaid) return false;
  const evidenceType = clean(access.evidenceType, 80);
  const evidenceId = clean(access.evidenceId || access.paymentId, 160);
  const failureMessage = clean(error?.message || error || "service execution failed", 500);
  const now = new Date();

  try {
    if (evidenceType === "coin" && mongoose.Types.ObjectId.isValid(evidenceId)) {
      const history = await PointHistory.findOne({
        _id: evidenceId,
        userId,
        kind: "deduct",
        featureKey: FEATURE_KEY,
        "metadata.refundedForServiceExecution": { $ne: true },
      }).lean();
      if (!history) return false;

      const refundCoins = Math.max(0, Math.floor(Math.abs(Number(history.delta || access.amount || pricing.coinPrice || 0))));
      if (!refundCoins) return false;

      const marked = await PointHistory.updateOne(
        { _id: history._id, userId, "metadata.refundedForServiceExecution": { $ne: true } },
        {
          $set: {
            "metadata.refundedForServiceExecution": true,
            "metadata.serviceExecutionRefundedAt": now,
            "metadata.serviceExecutionFailureMessage": failureMessage,
          },
        },
      );
      if (!marked.modifiedCount) return false;

      const purchaseId = clean(access.purchaseId || history?.metadata?.purchaseId || history?.metadata?.idempotencyKey || idempotencyKey, 180);
      const updated = await User.findByIdAndUpdate(
        userId,
        {
          $inc: { points: refundCoins },
          ...(purchaseId ? { $pull: { recentConsumeRequestIds: purchaseId } } : {}),
        },
        { new: true, projection: { points: 1 } },
      ).lean();

      await PointHistory.create({
        userId,
        kind: "refund",
        delta: refundCoins,
        balanceAfter: Math.max(0, Math.floor(Number(updated?.points || 0))),
        reason: `${ORDER_NAME} 생성 실패 환급`,
        featureKey: FEATURE_KEY,
        metadata: {
          refundedForServiceExecution: true,
          originalPointHistoryId: clean(history._id, 160),
          idempotencyKey,
          purchaseId,
          failureMessage,
        },
      }).catch(() => {});
      return true;
    }

    if (evidenceType === "monthly_credit") {
      const ledgerQuery = mongoose.Types.ObjectId.isValid(evidenceId)
        ? { _id: evidenceId }
        : { sourceId: access.purchaseId || idempotencyKey };
      const ledger = await MonthlyCreditLedger.findOne({
        ...ledgerQuery,
        userId,
        type: "MONTHLY_CREDIT_SPEND",
        serviceKey: { $in: [FEATURE_KEY, SERVICE_KEY] },
        "metadata.refundedForServiceExecution": { $ne: true },
      }).lean();
      if (!ledger) return false;

      const refundCredit = Math.max(0, Math.floor(Number(ledger.amount || access.amount || pricing.membershipCreditCost || 0)));
      if (!refundCredit) return false;

      const marked = await MonthlyCreditLedger.updateOne(
        { _id: ledger._id, userId, "metadata.refundedForServiceExecution": { $ne: true } },
        {
          $set: {
            "metadata.refundedForServiceExecution": true,
            "metadata.serviceExecutionRefundedAt": now,
            "metadata.serviceExecutionFailureMessage": failureMessage,
          },
        },
      );
      if (!marked.modifiedCount) return false;

      const purchaseId = clean(access.purchaseId || ledger.sourceId || idempotencyKey, 180);
      await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            "profileSubscription.membershipCreditBalance": refundCredit,
            "profileSubscription.membershipCreditUsed": -refundCredit,
          },
          ...(purchaseId ? { $pull: { recentConsumeRequestIds: purchaseId } } : {}),
        },
      ).catch(() => {});

      const clauses = pointHistoryTokenClauses([purchaseId, evidenceId, idempotencyKey].filter(Boolean));
      if (clauses.length) {
        await PointHistory.updateMany(
          {
            userId,
            kind: "deduct",
            featureKey: FEATURE_KEY,
            "metadata.refundedForServiceExecution": { $ne: true },
            $or: clauses,
          },
          {
            $set: {
              "metadata.refundedForServiceExecution": true,
              "metadata.serviceExecutionRefundedAt": now,
              "metadata.serviceExecutionFailureMessage": failureMessage,
            },
          },
        ).catch(() => {});
      }
      return true;
    }
  } catch (restoreError) {
    console.warn("[ziwei-ai] prepaid access restore failed", {
      userId: clean(userId, 80),
      evidenceType,
      evidenceId,
      message: clean(restoreError?.message || restoreError, 300),
    });
  }
  return false;
}

async function applyUsageOnce({ userId, sessionId, accessType, paymentId, pricing, prepaid = false }) {
  const existing = await ZiweiAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;
  if (prepaid) {
    await ZiweiAiConsultation.updateOne(
      { id: sessionId, usageAppliedAt: null },
      { $set: { usageAppliedAt: new Date() } },
    );
    return true;
  }

  if (accessType === "subscription") {
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
        reason: ORDER_NAME,
        sourceId,
        serviceKey: SERVICE_KEY,
        metadata: { featureKey: FEATURE_KEY, sessionId },
      }).catch((error) => {
        if (error?.code !== 11000) throw error;
      });
    }
  }

  if (accessType === "paid" && paymentId) {
    await Payment.updateOne(
      { userId, featureKey: FEATURE_KEY, merchantUid: paymentId },
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

  await ZiweiAiConsultation.updateOne(
    { id: sessionId, usageAppliedAt: null },
    { $set: { usageAppliedAt: new Date() } },
  );
  return true;
}

function buildSummaryCards(chart = {}, topic = "") {
  const palaces = Array.isArray(chart.palaces) ? chart.palaces : [];
  const life = palaces.find((item) => item.name === chart.lifePalace) || palaces.find((item) => item.name === "명궁") || {};
  const keyStars = [...new Set([
    ...(life.mainStars || []),
    ...palaces.flatMap((item) => item.mainStars || []),
  ])].slice(0, 4);
  const keywords = [
    topic,
    life.mainStars?.[0] ? `${life.mainStars[0]}의 중심성` : "명궁의 방향",
    chart.fourTransformations?.huaJi ? `${chart.fourTransformations.huaJi} 화기 조율` : "삼방사정 균형",
  ].filter(Boolean).slice(0, 3);
  return {
    lifePalace: chart.lifePalace || "",
    bodyPalace: chart.bodyPalace || "",
    keyStars,
    keywords,
  };
}

function publicConsultation(doc) {
  const chart = doc.ziweiChart || {};
  return {
    ok: true,
    sessionId: clean(doc.id),
    consultation: {
      id: clean(doc.id),
      accessType: clean(doc.accessType),
      status: clean(doc.status),
      birthInfo: doc.birthInfo || {},
      topic: clean(doc.topic),
      userQuestion: clean(doc.userQuestion),
      summaryCards: buildSummaryCards(chart, doc.topic),
      ziweiChart: chart,
      messages: Array.isArray(doc.messages)
        ? doc.messages.map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
        }))
        : [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
  };
}

async function handleEnsureAccess(request, env, route = "/api/ziwei-ai/prepare") {
  logZiweiAi("Prepare Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logZiweiAi("Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logZiweiAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logZiweiAi("Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  try {
    logZiweiAi("Chart Data Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
    calculateZiweiAiChart(normalized.input, { year: new Date().getFullYear() });
    logZiweiAi("Chart Data Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  } catch (error) {
    logZiweiAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "chart_data_failed", env, error }), "error");
    return calculationFailed();
  }

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  const pricing = getPricing();
  logZiweiAi("Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  if (isAdmin(auth)) {
    logZiweiAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "admin", env }));
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

  const access = await resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash });
  if (access.ok && access.accessType === "paid") {
    logZiweiAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
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
  if (access.ok) {
    logZiweiAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "billing_gate_required", env }));
  }
  if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);

  const payment = await createOrReusePaymentPayload({
    env,
    auth,
    user,
    pricing,
    idempotencyKey,
    inputHash: normalized.inputHash,
  });
  if (!payment.ok) {
    if (payment.serverError) return serverError(payment.message, 503);
    return invalidInput(payment.message, 409);
  }

  logZiweiAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "payment_required", env }));
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    message: MESSAGES.paymentRequired,
    paymentPayload: payment.paymentPayload,
  }, { status: 402 });
}

async function resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey }) {
  const token = clean(body?.accessToken || request.headers.get("x-ziwei-ai-access-token"));
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: "상담 접근 정보가 현재 입력값과 일치하지 않습니다." };
    }
    const accessType = clean(payload.accessType);
    if (accessType !== "admin" && accessType !== "paid") return { ok: false, reason: "PAYMENT_REQUIRED" };
    return { ok: true, accessType, paymentId: clean(payload.paymentId, 160) };
  }

  const paymentId = clean(body?.paymentId || body?.merchantUid || body?.merchant_uid, 160);
  if (paymentId) {
    const directVerify = await verifyPaymentForStart({ env, auth, paymentId, idempotencyKey, inputHash: normalized.inputHash, pricing });
    if (directVerify.ok) return directVerify;
  }

  const user = await loadBillingUser(auth.userId);
  if (!user && !isAdmin(auth)) return { ok: false, reason: "LOGIN_REQUIRED" };
  const billingAccess = await resolveBillingGateAccess({ auth, user, body, pricing, idempotencyKey });
  if (billingAccess?.ok) return billingAccess;
  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

async function handleStart(request, env, route = "/api/ziwei-ai/generate") {
  logZiweiAi("Generate Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logZiweiAi("Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logZiweiAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logZiweiAi("Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  logZiweiAi("Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return paymentVerifyFailed();
  }
  logZiweiAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
  logZiweiAi("Payment Guard Passed", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));

  const existing = await ZiweiAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
  if (existing && clean(existing.inputHash) !== normalized.inputHash) {
    return invalidInput("같은 요청 키로 다른 상담 정보를 사용할 수 없습니다.", 409);
  }
  if (existing?.status === "completed") return json(publicConsultation(existing));
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 90000) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "별궁의 흐름을 읽고 있습니다" }, { status: 202 });
  }

  let chart;
  try {
    logZiweiAi("Chart Data Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    chart = calculateZiweiAiChart(normalized.input, { year: new Date().getFullYear() });
    logZiweiAi("Chart Data Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
  } catch (error) {
    logZiweiAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "chart_data_failed", access: access.accessType, env, error }), "error");
    await restorePrepaidAccessOnFailure({ userId: auth.userId, access, idempotencyKey, pricing, error });
    return calculationFailed();
  }

  const sessionId = existing?.id || `zwai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
  const now = new Date();
  const seed = {
    id: sessionId,
    userId: clean(auth.userId),
    birthInfo: normalized.input.birthInfo,
    topic: normalized.input.topic,
    userQuestion: normalized.input.userQuestion,
    ziweiChart: chart,
    accessType: access.accessType,
    paymentId: clean(access.paymentId, 160),
    messages: [],
    idempotencyKey,
    inputHash: normalized.inputHash,
    status: "generating",
    generationError: null,
  };

  if (existing) {
    await ZiweiAiConsultation.updateOne(
      { id: existing.id },
      { $set: { ...seed, updatedAt: now } },
    );
  } else {
    try {
      await ZiweiAiConsultation.create(seed);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await ZiweiAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicConsultation(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "별궁의 흐름을 읽고 있습니다" }, { status: 202 });
      }
      throw error;
    }
  }

  try {
    const logContext = safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env });
    const generationOptions = {
      minLength: 360,
      minBodyChars: MIN_INITIAL_CONSULTATION_BODY_CHARS,
      maxBodyChars: MAX_INITIAL_CONSULTATION_BODY_CHARS,
      maxOutputTokens: INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS,
      logContext,
    };
    let generated = await generateConsultationText(env, buildFirstPrompt(normalized.input, chart), generationOptions);
    let grounding = enforceZiweiChartFacts(generated.text, chart);
    if (grounding.issues.length) {
      logZiweiAi("Grounding Retry", { ...logContext, issues: grounding.issues }, "warn");
      const retryPrompt = [
        buildFirstPrompt(normalized.input, chart),
        "",
        "직전 답변이 아래 근거 기준을 지키지 못해 반려되었다. 전부 지켜 처음부터 다시 작성하라:",
        ...describeZiweiGroundingIssues(grounding.issues, chart),
      ].join("\n");
      try {
        generated = await generateConsultationText(env, retryPrompt, generationOptions);
        grounding = enforceZiweiChartFacts(generated.text, chart);
      } catch (retryError) {
        logZiweiAi("Grounding Retry Failed", { ...logContext, errorMessage: clean(retryError?.message || retryError, 300) }, "warn");
      }
      // meta는 서버 확정값으로 덮어썼으므로, 본문 인용이 여전히 부족해도 실패 처리하지 않고 경고만 남긴다.
      if (grounding.issues.length) logZiweiAi("Grounding Residual", { ...logContext, issues: grounding.issues }, "warn");
    }
    generated = { ...generated, text: grounding.text };
    await applyUsageOnce({ userId: auth.userId, sessionId, accessType: access.accessType, paymentId: access.paymentId || "", pricing, prepaid: access.prepaid === true });
    const firstUserMessage = normalized.input.userQuestion || normalized.input.topic;
    const completed = await ZiweiAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "completed",
          messages: [
            { role: "user", content: firstUserMessage, createdAt: now },
            { role: "assistant", content: generated.text, createdAt: new Date() },
          ],
          llmMeta: { provider: generated.provider, model: generated.model, completedAt: new Date().toISOString() },
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    logZiweiAi("Generate Success", {
      ...logContext,
      providerReason: generated.provider || generated.model || "real_llm_success",
      provider: generated.provider,
      model: generated.model,
    });
    return json(publicConsultation(completed));
  } catch (error) {
    logZiweiAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }), "error");
    const restored = await restorePrepaidAccessOnFailure({ userId: auth.userId, access, idempotencyKey, pricing, error });
    logZiweiAi("Refund Or Restore", {
      ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }),
      restored,
      accessPrepaid: access.prepaid === true,
    }, restored ? "info" : "warn");
    await ZiweiAiConsultation.updateOne(
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
    return json({ ok: false, reason: "LLM_ERROR", message: MESSAGES.llmFailed }, { status: 503 });
  }
}

async function handleMessage(request, env) {
  const route = "/api/ziwei-ai/message";
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.consultationId, 120);
  const message = clean(body?.message || body?.question, 1200);
  if (!sessionId) return invalidInput("상담 기록을 찾을 수 없습니다.", 404);
  if (message.length < 2) return invalidInput("추가 질문을 입력해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const consultation = await ZiweiAiConsultation.findOne({
    id: sessionId,
    userId: clean(auth.userId),
    status: "completed",
  }).lean();
  if (!consultation) return invalidInput("상담 기록을 찾을 수 없습니다.", 404);

  try {
    const logContext = safeLogPayload({ route, requestId: sessionId, body, access: "follow_up", env });
    const generated = await generateConsultationText(env, buildFollowUpPrompt(consultation, message), {
      minLength: 100,
      maxOutputTokens: 5000,
      logContext,
    });
    const userMessage = { role: "user", content: message, createdAt: new Date() };
    const assistantMessage = { role: "assistant", content: generated.text, createdAt: new Date() };
    const updated = await ZiweiAiConsultation.findOneAndUpdate(
      { id: sessionId, userId: clean(auth.userId) },
      {
        $push: { messages: { $each: [userMessage, assistantMessage] } },
        $set: {
          llmMeta: { provider: generated.provider, model: generated.model, updatedAt: new Date().toISOString() },
        },
      },
      { new: true },
    ).lean();
    logZiweiAi("Generate Success", {
      ...logContext,
      providerReason: generated.provider || generated.model || "real_llm_success",
      provider: generated.provider,
      model: generated.model,
    });
    return json(publicConsultation(updated));
  } catch (error) {
    logZiweiAi("Error", safeLogPayload({ route, requestId: sessionId, body, access: "follow_up", env, error }), "error");
    return json({ ok: false, reason: "LLM_ERROR", message: MESSAGES.llmFailed }, { status: 503 });
  }
}

async function handleResult(request, env) {
  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("id") || url.searchParams.get("sessionId"), 120);

  await connectDb(env);
  if (!sessionId) {
    const rows = await ZiweiAiConsultation.find({ userId: clean(auth.userId), status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("id topic birthInfo ziweiChart.lifePalace ziweiChart.chartSummary createdAt updatedAt")
      .lean();
    return json({
      ok: true,
      consultations: rows.map((row) => ({
        id: clean(row.id),
        topic: clean(row.topic),
        name: clean(row.birthInfo?.name, 80),
        lifePalace: clean(row.ziweiChart?.lifePalace, 20),
        chartSummary: clean(row.ziweiChart?.chartSummary, 200),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    });
  }

  const consultation = await ZiweiAiConsultation.findOne({
    id: sessionId,
    userId: clean(auth.userId),
    status: "completed",
  }).lean();
  if (!consultation) return notFound();
  return json(publicConsultation(consultation));
}

export async function handleZiweiAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/ziwei-ai");

  try {
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (method === "POST" && (path === "/prepare" || path === "/ensure-access")) {
      return await handleEnsureAccess(request, env, path === "/prepare" ? "/api/ziwei-ai/prepare" : "/api/ziwei-ai/ensure-access");
    }
    if (method === "POST" && (path === "/generate" || path === "/start")) {
      return await handleStart(request, env, path === "/generate" ? "/api/ziwei-ai/generate" : "/api/ziwei-ai/start");
    }
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[ziwei-ai]", clean(error?.code || error?.message || error, 500));
    return serverError();
  }
}

export const __ziweiAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeConsultationInput,
  buildFirstPrompt,
  buildSystemPrompt,
  buildCanonicalZiweiFacts,
  resolveSihuaPlacements,
  enforceZiweiChartFacts,
  describeZiweiGroundingIssues,
  cleanForbiddenResult,
  countStructuredConsultationBodyChars,
  MIN_INITIAL_CONSULTATION_BODY_CHARS,
  MAX_INITIAL_CONSULTATION_BODY_CHARS,
};
