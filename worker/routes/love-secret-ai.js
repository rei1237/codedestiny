import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, mongoose } from "../lib/db.js";
import { LoveSecretAiConsultation, MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory, User } from "../lib/models.js";
import { restoreMonthlyCreditLot } from "../lib/monthly-credit-store.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { callGeminiText } from "../lib/gemini.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { calculateLoveSecretAiSaju, normalizeLoveSecretAiInput } from "../lib/love-secret-ai-calculation.js";
import {
  LOVE_SECRET_AI_SYSTEM_PROMPT,
  buildFirstConsultationPrompt,
  buildFollowUpConsultationPrompt,
  describeLoveSecretGroundingIssues,
  normalizeFollowUpResponse,
  parseFirstConsultationResponse,
  validateLoveSecretGrounding,
} from "../lib/love-secret-ai-prompt.js";

const SERVICE_KEY = "love-secret-ai";
const FEATURE_KEY = "love-secret-ai-consultation";
const ACCESS_TOKEN_TYPE = "love-secret-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "연애 비책 AI 상담";
const GEMINI_ENV_KEYS = Object.freeze([
  "GEMINIF_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
]);
const RELATIONSHIP_STATUS_LABELS = Object.freeze({
  single: "솔로",
  crush: "짝사랑",
  some: "썸",
  dating: "연애 중",
  breakup: "이별 직후",
  reunion: "재회 고민",
  marriage: "결혼 고민",
  complicated: "관계 정리 고민",
  custom: "상대방 마음이 궁금한 상태",
  "짝사랑": "짝사랑",
  "썸": "썸",
  "연애 중": "연애 중",
  "장기 연애": "장기 연애",
  "이별 직후": "이별 직후",
  "재회 고민": "재회 고민",
  "연락이 끊긴 상태": "연락이 끊긴 상태",
  "결혼 고민": "결혼 고민",
  "부부 관계": "부부 관계",
  "관계 정리 고민": "관계 정리 고민",
  "상대방 마음이 궁금한 상태": "상대방 마음이 궁금한 상태",
});
const FOCUS_AREA_LABELS = Object.freeze({
  overall: "전체 연애 흐름",
  relationshipFlow: "현재 관계가 어디로 흘러갈지",
  distance: "상대의 마음과 거리감",
  crush: "상대방 마음",
  reunion: "재회 가능성",
  confession: "고백 타이밍",
  timing: "연락/고백/대화 타이밍",
  marriage: "결혼 가능성",
  longTerm: "결혼/장기 관계 가능성",
  conflict: "갈등 원인",
  compatibility: "상대방과의 궁합",
  intimacy: "속궁합과 친밀감 리듬",
  pattern: "내가 바꿔야 할 연애 패턴",
  custom: "직접 입력",
  "전체 연애 흐름": "전체 연애 흐름",
  "현재 관계가 어디로 흘러갈지": "현재 관계가 어디로 흘러갈지",
  "상대방 마음": "상대방 마음",
  "상대의 마음과 거리감": "상대의 마음과 거리감",
  "연락 타이밍": "연락 타이밍",
  "고백 타이밍": "고백 타이밍",
  "연락/고백/대화 타이밍": "연락/고백/대화 타이밍",
  "재회 가능성": "재회 가능성",
  "관계 회복 전략": "관계 회복 전략",
  "장기 연애 유지법": "장기 연애 유지법",
  "결혼 가능성": "결혼 가능성",
  "결혼/장기 관계 가능성": "결혼/장기 관계 가능성",
  "갈등 원인": "갈등 원인",
  "나의 연애 패턴": "나의 연애 패턴",
  "내가 바꿔야 할 연애 패턴": "내가 바꿔야 할 연애 패턴",
  "상대방과의 궁합": "상대방과의 궁합",
  "속궁합과 친밀감 리듬": "속궁합과 친밀감 리듬",
  "지금 밀어야 할지 기다려야 할지": "지금 밀어야 할지 기다려야 할지",
  "이 관계를 계속해도 되는지": "이 관계를 계속해도 되는지",
  "직접 입력": "직접 입력",
});

const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.";
const INVALID_INPUT_MESSAGE = "연애 비책 상담에 필요한 정보가 부족해요. 생년월일, 성별, 연애 상황을 다시 확인해 주세요.";
const QUESTION_REQUIRED_MESSAGE = "지금 가장 궁금한 연애 질문을 한 줄이라도 적어주세요.";
const CALCULATION_FAILED_MESSAGE = "연애 흐름 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.";
const SERVER_ERROR_MESSAGE = "연애 비책 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.";

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

function safeLogPayload({ route = "", requestId = "", body = {}, normalized = null, validation = "", access = "", env = {}, error = null, providerReason = "" } = {}) {
  const input = normalized?.input || {};
  const myInfo = input.myInfo || objectOf(body.myInfo);
  const diagnostics = getProviderDiagnostics(env);
  return {
    route: clean(route, 140),
    requestId: clean(requestId || body.requestId || body.idempotencyKey, 180),
    serviceType: clean(input.serviceType || body.serviceType || body.featureKey || FEATURE_KEY, 80),
    focusArea: clean(input.focusArea || body.focusArea || body.topic || "overall", 80),
    relationshipStatus: clean(input.relationshipStatus || body.relationshipStatus || body.relationshipType, 80),
    validation,
    access,
    birthDate: maskBirthDate(input.birthDate || myInfo.birthDate || body.birthDate),
    questionLength: clean(input.question || input.userQuestion || body.question || body.userQuestion || body.message, 1200).length,
    ...diagnostics,
    providerReason: clean(providerReason || diagnostics.providerReason, 160),
    ...(error ? {
      errorMessage: clean(error?.message || error, 500),
      ...(isDevelopmentEnv(env) ? { stack: clean(error?.stack, 2000) } : {}),
    } : {}),
  };
}

function logLoveSecretAi(marker, details = {}, level = "info") {
  const writer = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  writer(`[LoveSecret AI ${marker}]`, details);
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

function invalidInput(message = INVALID_INPUT_MESSAGE, status = 422) {
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

function calculationFailed() {
  return json({ ok: false, reason: "CALCULATION_FAILED", message: CALCULATION_FAILED_MESSAGE }, { status: 422 });
}

function toBoolean(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function normalizeGenderForCalculation(value) {
  const text = clean(value, 20).toLowerCase();
  if (text === "unknown" || text === "비공개") return "unknown";
  return clean(value, 20);
}

function hasFlatPartnerSignal(body = {}) {
  return Boolean(
    clean(body.partnerName)
      || clean(body.partnerGender)
      || clean(body.partnerBirthDate)
      || clean(body.partnerBirthTime)
      || body.partnerBirthTimeUnknown === true
      || clean(body.partnerCalendarType),
  );
}

function normalizeRelationshipStatus(value) {
  const key = clean(value || "single", 80);
  return RELATIONSHIP_STATUS_LABELS[key] || RELATIONSHIP_STATUS_LABELS[key.toLowerCase()] || key;
}

function normalizeFocusArea(value) {
  const key = clean(value || "overall", 80);
  return FOCUS_AREA_LABELS[key] || FOCUS_AREA_LABELS[key.toLowerCase()] || key;
}

function normalizeCanonicalBody(body = {}) {
  const source = objectOf(body);
  const legacyMyInfo = objectOf(source.myInfo || source.self || source.user);
  const myInfo = Object.keys(legacyMyInfo).length
    ? legacyMyInfo
    : {
      name: source.userName || source.name || source.nickname,
      gender: source.gender,
      birthDate: source.birthDate,
      birthTime: source.birthTime,
      birthTimeUnknown: source.birthTimeUnknown,
      calendarType: source.calendarType,
    };
  const legacyPartnerInfo = objectOf(source.partnerInfo || source.partner);
  const includePartner = Object.keys(legacyPartnerInfo).length || hasFlatPartnerSignal(source);
  const partnerInfo = Object.keys(legacyPartnerInfo).length
    ? legacyPartnerInfo
    : {
      name: source.partnerName,
      gender: source.partnerGender,
      birthDate: source.partnerBirthDate,
      birthTime: source.partnerBirthTime,
      birthTimeUnknown: source.partnerBirthTimeUnknown,
      calendarType: source.partnerCalendarType,
    };
  const relationshipStatus = normalizeRelationshipStatus(source.relationshipStatus || source.relationshipType);
  const focusArea = clean(source.focusArea || source.topic || source.consultationTopic || "overall", 80);
  const topic = normalizeFocusArea(focusArea);
  const question = clean(source.question || source.userQuestion || source.message, 1200);
  const birthTimeUnknown = toBoolean(myInfo.birthTimeUnknown);

  if (!birthTimeUnknown && !clean(myInfo.birthTime)) {
    return { ok: false, message: "출생시간을 입력하거나 출생시간 모름을 선택해 주세요." };
  }
  if (clean(focusArea).toLowerCase() === "custom" && question.length < 2) {
    return { ok: false, message: QUESTION_REQUIRED_MESSAGE };
  }

  return {
    ok: true,
    serviceType: clean(source.serviceType || source.featureKey || FEATURE_KEY, 80) || FEATURE_KEY,
    consultationType: clean(source.consultationType || "loveSecret", 40) || "loveSecret",
    focusArea: clean(source.focusArea || "overall", 80) || "overall",
    question,
    legacyBody: {
      myInfo: {
        ...myInfo,
        gender: normalizeGenderForCalculation(myInfo.gender),
        birthTimeUnknown,
      },
      partnerInfo: includePartner
        ? {
          ...partnerInfo,
          gender: normalizeGenderForCalculation(partnerInfo.gender),
          birthTimeUnknown: toBoolean(partnerInfo.birthTimeUnknown),
        }
        : undefined,
      relationshipStatus,
      topic,
      userQuestion: question,
    },
  };
}

function normalizeRequestBody(body = {}) {
  const canonical = normalizeCanonicalBody(body);
  if (!canonical.ok) return canonical;
  const normalized = normalizeLoveSecretAiInput(canonical.legacyBody);
  if (!normalized.ok) return normalized;
  const input = {
    ...normalized.input,
    serviceType: canonical.serviceType,
    consultationType: canonical.consultationType,
    focusArea: canonical.focusArea,
    question: canonical.question,
  };
  return {
    ...normalized,
    input,
    inputHash: sha256(stableJson(input)),
  };
}

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = resolved?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || coinPrice * 100);
  if (!resolved?.ok || !pricing || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error("love-secret-ai price not found");
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

function monthlyCreditBalance(user = {}) {
  return Math.max(0, Math.floor(Number(
    user?.profileSubscription?.membershipCreditBalance
      || user?.profileSubscription?.monthlyStoneBalance
      || 0,
  )));
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

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function buildBillingGatePayload(pricing, idempotencyKey, user = {}) {
  const monthlyBalance = monthlyCreditBalance(user);
  return {
    billingMode: "coin-gate",
    featureKey: FEATURE_KEY,
    serviceKey: SERVICE_KEY,
    reason: ORDER_NAME,
    cost: pricing.coinPrice,
    coinPrice: pricing.coinPrice,
    amountKRW: pricing.amountKRW,
    membershipCreditCost: pricing.membershipCreditCost,
    requestId: idempotencyKey,
    idempotencyKey,
    runtimeGate: {
      title: ORDER_NAME,
      reason: ORDER_NAME,
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      featureKey: FEATURE_KEY,
      serviceKey: SERVICE_KEY,
      productId: SERVICE_KEY,
      productType: SERVICE_KEY,
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      amountKrw: pricing.amountKRW,
      membershipCreditCost: pricing.membershipCreditCost,
      monthlyBalance,
      monthlyCredits: monthlyBalance,
      membershipCreditBalance: monthlyBalance,
      allowedPaymentModes: ["monthly", "direct"],
      requestId: idempotencyKey,
      idempotencyKey,
    },
  };
}

function objectOf(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isObjectIdLike(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || ""));
}

function collectBillingEvidenceIds(body = {}) {
  const ids = new Set();
  const add = (value) => {
    const id = clean(value, 180);
    if (id) ids.add(id);
  };
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
      "attemptId",
      "requestId",
      "idempotencyKey",
      "orderId",
      "executionId",
      "evidenceId",
      "pointHistoryId",
      "monthlyCreditLedgerId",
      "receiptId",
    ].forEach((key) => add(source[key]));
    [
      "data",
      "billingGate",
      "billing",
      "billingResult",
      "paymentContext",
      "_paymentContext",
      "consume",
      "accessGrant",
      "payment",
      "pricing",
      "runtimeGate",
      "metadata",
    ].forEach((key) => visit(source[key], depth + 1));
  };
  visit(body);
  return [...ids];
}

function paymentIdFromBillingBody(body = {}) {
  const ids = collectBillingEvidenceIds(body);
  return clean(
    body.paymentId
      || objectOf(body.payment).paymentId
      || objectOf(body.payment).impUid
      || objectOf(body.payment).merchantUid
      || ids[0],
    160,
  );
}

function buildPaidExecutionEvidenceQuery(ids) {
  const or = [];
  ids.forEach((id) => {
    or.push(
      { requestId: id },
      { idempotencyKey: id },
      { executionId: id },
      { paymentId: id },
      { orderId: id },
      { "result.deferredUsage.requestId": id },
      { "result.deferredUsage.paymentId": id },
      { "result.deferredUsage.evidence.paymentId": id },
      { "result.deferredUsage.evidence.pointHistoryId": id },
      { "result.deferredUsage.evidence.ledgerId": id },
    );
    if (isObjectIdLike(id)) or.push({ _id: id });
  });
  return or;
}

function buildPointHistoryEvidenceQuery(ids) {
  const or = [];
  ids.forEach((id) => {
    or.push(
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.orderId": id },
      { "metadata.transactionId": id },
      { "metadata.ledgerId": id },
      { "metadata.evidenceId": id },
      { "metadata.paymentId": id },
    );
    if (isObjectIdLike(id)) or.push({ _id: id }, { paymentId: id });
  });
  return or;
}

function buildMonthlyLedgerEvidenceQuery(ids) {
  const or = [];
  ids.forEach((id) => {
    or.push(
      { sourceId: id },
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.orderId": id },
      { "metadata.pointHistoryId": id },
      { "metadata.transactionId": id },
      { "metadata.ledgerId": id },
      { "metadata.evidenceId": id },
      { "metadata.paymentId": id },
    );
    if (isObjectIdLike(id)) or.push({ _id: id });
  });
  return or;
}

function buildPaymentEvidenceQuery(ids) {
  const or = [];
  ids.forEach((id) => {
    or.push(
      { impUid: id },
      { merchantUid: id },
      { requestId: id },
      { idempotencyKey: id },
      { "metadata.requestId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.purchaseId": id },
      { "metadata.transactionId": id },
      { "metadata.paymentId": id },
    );
    if (isObjectIdLike(id)) or.push({ _id: id });
  });
  return or;
}

function mapBillingEvidenceAccessType(value) {
  const text = clean(value, 100).toLowerCase();
  if (/membership_credit|monthly|subscription/.test(text)) return "subscription";
  if (/membership_pass|family|pass|license/.test(text)) return "pass";
  return "paid";
}

async function resolveBillingUsageEvidence(env, auth, body = {}) {
  const ids = collectBillingEvidenceIds(body);
  if (!ids.length) return null;
  await connectDb(env);
  const deferredOr = buildPaidExecutionEvidenceQuery(ids);
  const deferredRecord = deferredOr.length
    ? await PaidExecutionRecord.findOne({
      userId: clean(auth.userId),
      featureId: FEATURE_KEY,
      status: { $in: ["paid_pending_generation", "completed", "paid", "success", "fulfilled"] },
      $or: deferredOr,
    }).sort({ updatedAt: -1, createdAt: -1 }).select("_id executionId requestId paymentId accessMethod result status").lean()
    : null;
  if (deferredRecord) {
    const deferredUsage = objectOf(objectOf(deferredRecord.result).deferredUsage);
    const accessType = mapBillingEvidenceAccessType(deferredUsage.accessType || deferredUsage.paymentMethod || deferredRecord.accessMethod);
    return {
      ok: true,
      accessType,
      accessSource: accessType === "subscription" ? "billing_gate_membership_credit" : accessType === "pass" ? "billing_gate_pass" : "billing_gate_paid",
      paymentId: clean(deferredRecord.paymentId || deferredRecord.executionId || deferredRecord._id, 160),
      billingEvidence: {
        executionId: clean(deferredRecord.executionId, 160),
        requestId: clean(deferredRecord.requestId, 180),
        paymentId: clean(deferredRecord.paymentId, 160),
        accessMethod: clean(deferredRecord.accessMethod, 80),
        deferredUsage,
      },
    };
  }

  const pointOr = buildPointHistoryEvidenceQuery(ids);
  const pointHistory = pointOr.length
    ? await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: FEATURE_KEY,
      "metadata.monthlyCreditRefundedForLoveSecretAiFailure": { $ne: true },
      $and: [
        { $or: pointOr },
        {
          $or: [
            { "metadata.accessType": { $in: ["membership_credit", "membership_pass", "family", "family_pass", "coin", "single_purchase"] } },
            { "metadata.transactionType": { $in: ["membership_credit", "membership_pass", "family", "family_pass", "coin", "single_purchase"] } },
            { "metadata.accessMethod": { $in: ["MONTHLY", "MONTHLY_CREDIT", "MOONLIGHT_STONE", "PASS", "MEMBERSHIP_PASS", "FAMILY", "FAMILY_PASS", "COIN", "DIRECT_KRW"] } },
            { "metadata.paymentMethod": { $in: ["MONTHLY", "MONTHLY_CREDIT", "MOONLIGHT_STONE", "PASS", "MEMBERSHIP_PASS", "FAMILY", "FAMILY_PASS", "COIN", "DIRECT_KRW"] } },
          ],
        },
      ],
    }).select("_id metadata").lean()
    : null;
  if (pointHistory) {
    const accessType = mapBillingEvidenceAccessType(
      pointHistory?.metadata?.accessType
        || pointHistory?.metadata?.transactionType
        || pointHistory?.metadata?.accessMethod
        || pointHistory?.metadata?.paymentMethod,
    );
    return {
      ok: true,
      accessType,
      accessSource: accessType === "subscription" ? "billing_gate_membership_credit" : accessType === "pass" ? "billing_gate_pass" : "billing_gate_paid",
      paymentId: String(pointHistory._id || body.paymentId || ""),
      billingEvidence: {
        pointHistoryId: String(pointHistory._id || ""),
        ledgerId: clean(pointHistory?.metadata?.ledgerId, 160),
        purchaseId: clean(pointHistory?.metadata?.purchaseId || pointHistory?.metadata?.requestId, 160),
        membershipCreditCost: Math.max(0, Math.floor(Number(pointHistory?.metadata?.membershipCreditCost || pointHistory?.metadata?.requiredMonthlyCredits || 0))),
        delta: Math.floor(Number(pointHistory?.delta || 0)),
        accessType: clean(pointHistory?.metadata?.accessType || pointHistory?.metadata?.transactionType || pointHistory?.metadata?.accessMethod, 80),
      },
    };
  }

  const ledgerOr = buildMonthlyLedgerEvidenceQuery(ids);
  const ledger = ledgerOr.length
    ? await MonthlyCreditLedger.findOne({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: FEATURE_KEY,
      "metadata.refundedForLoveSecretAiFailure": { $ne: true },
      $or: ledgerOr,
    }).select("_id amount sourceId metadata").lean()
    : null;
  if (ledger) {
    return {
      ok: true,
      accessType: "subscription",
      accessSource: "billing_gate_membership_credit",
      paymentId: String(ledger._id || body.paymentId || ""),
      billingEvidence: {
        ledgerId: String(ledger._id || ""),
        pointHistoryId: clean(ledger?.metadata?.pointHistoryId, 160),
        purchaseId: clean(ledger.sourceId || ledger?.metadata?.purchaseId || ledger?.metadata?.requestId, 160),
        membershipCreditCost: Math.max(0, Math.floor(Number(ledger.amount || ledger?.metadata?.requiredMonthlyCredits || 0))),
      },
    };
  }
  const paymentOr = buildPaymentEvidenceQuery(ids);
  const payment = paymentOr.length
    ? await Payment.findOne({
      userId: auth.userId,
      paymentType: "digital_content",
      status: { $in: ["paid", "success", "fulfilled"] },
      $and: [
        { $or: paymentOr },
        { $or: [{ featureKey: FEATURE_KEY }, { "pricingSnapshot.featureKey": FEATURE_KEY }, { "metadata.featureKey": FEATURE_KEY }] },
      ],
    }).sort({ paidAt: -1, updatedAt: -1, createdAt: -1 }).select("_id merchantUid impUid requestId idempotencyKey").lean()
    : null;
  if (payment) {
    return {
      ok: true,
      accessType: "paid",
      accessSource: "billing_gate_paid",
      paymentId: clean(payment.merchantUid || payment.impUid || payment.requestId || payment.idempotencyKey || payment._id, 160),
      billingEvidence: {
        paymentId: clean(payment._id, 160),
        merchantUid: clean(payment.merchantUid, 160),
        impUid: clean(payment.impUid, 160),
        requestId: clean(payment.requestId || payment.idempotencyKey, 180),
      },
    };
  }
  return null;
}

function buildLoveSecretGroundingTerms(sajuResult = {}) {
  return [
    sajuResult?.myChart?.dayMaster,
    sajuResult?.myChart?.reference?.dominantTenGod,
    sajuResult?.partnerChart?.dayMaster,
    sajuResult?.partnerChart?.reference?.dominantTenGod,
    "일간",
  ].map((term) => clean(term, 20)).filter(Boolean);
}

async function generateFirstConsultation(env, input, sajuResult, logContext = {}) {
  const basePrompt = buildFirstConsultationPrompt(input, sajuResult);
  // 러브시크릿 초기 상담(자유질문 포함) → 캐시 키가 프롬프트 전체로 잡혀 동일 입력만 히트.
  // follow-up(generateFollowUp)은 캐시 대상 아님.
  const loveSecretLlmCache = {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 30 * 24 * 60 * 60,
    keyExtra: "love-secret-ai-v1",
  };
  const callOnce = async (prompt) => {
    // 15개 섹션 body 합산 10,000~20,000자 JSON 요구(한국어 1자≈1~1.5토큰) —
    // plain callGeminiText는 잘림에 무방비라 잘리면 그대로 INVALID_LLM_JSON 하드 실패였다.
    // 잘림 반응형 재시도 헬퍼(JSON 모드 강제 + 잘리면 토큰 상향 재생성)로 교체.
    const ai = await callGeminiJsonWithRetry(env, prompt, {
      systemPrompt: LOVE_SECRET_AI_SYSTEM_PROMPT,
      temperature: 0.72,
      // 동기 POST 라우트라 왕복 시간을 묶기 위해 재시도는 1회로 제한(총 2회 시도).
      attempts: 2,
      baseTokens: 32000,
      capTokens: Math.round(32000 * 1.3),
      // 32,000토큰(gemini-2.5-flash ~200tok/s ≈ 160s) — 구 90s는 목표 분량대 상단에서 잘렸다.
      timeoutMs: Number(env?.LOVE_SECRET_AI_TIMEOUT_MS) || 150000,
      taskType: "fortune",
      // 대형 JSON은 llama 폴백이 감당 못 함 — 폴백 대기 없이 즉시 실패.
      fallbackToWorkersAI: false,
      cache: loveSecretLlmCache,
    });
    const provider = clean(ai?.provider);
    const model = clean(ai?.model);
    const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
    logLoveSecretAi("LLM Provider Selected", {
      ...logContext,
      providerReason: isMock ? "mock_provider_blocked" : provider || model || logContext.providerReason || "llm_provider_selected",
      provider,
      model,
    });
    if (!ai?.ok || isMock || !clean(ai.text)) {
      const error = new Error(ai?.message || ai?.error || "LLM_GENERATION_FAILED");
      error.code = "LLM_GENERATION_FAILED";
      throw error;
    }
    return { parsed: parseFirstConsultationResponse(ai.text), provider, model };
  };

  let { parsed, provider, model } = await callOnce(basePrompt);
  const groundingTerms = buildLoveSecretGroundingTerms(sajuResult);
  let groundingIssues = validateLoveSecretGrounding(parsed, groundingTerms);
  if (groundingIssues.length) {
    logLoveSecretAi("Grounding Retry", { ...logContext, issues: groundingIssues }, "warn");
    try {
      const retry = await callOnce([
        basePrompt,
        "",
        "직전 답변이 아래 근거 기준을 지키지 못해 반려되었다. 전부 지켜 처음부터 다시 작성하라:",
        ...describeLoveSecretGroundingIssues(groundingIssues),
      ].join("\n"));
      const retryIssues = validateLoveSecretGrounding(retry.parsed, groundingTerms);
      if (retryIssues.length <= groundingIssues.length) {
        ({ parsed, provider, model } = retry);
        groundingIssues = retryIssues;
      }
    } catch (retryError) {
      logLoveSecretAi("Grounding Retry Failed", { ...logContext, errorMessage: clean(retryError?.message || retryError, 300) }, "warn");
    }
    if (groundingIssues.length) {
      logLoveSecretAi("Grounding Residual", { ...logContext, issues: groundingIssues }, "warn");
    }
  }
  return {
    ...parsed,
    provider,
    model,
  };
}

async function generateFollowUp(env, consultation, message) {
  const ai = await callGeminiText(env, buildFollowUpConsultationPrompt(consultation, message), {
    systemPrompt: LOVE_SECRET_AI_SYSTEM_PROMPT,
    temperature: 0.7,
    maxOutputTokens: 5000,
    taskType: "fortune",
  });
  if (!ai?.ok || !clean(ai.text)) {
    const error = new Error(ai?.message || ai?.error || "LLM_GENERATION_FAILED");
    error.code = "LLM_GENERATION_FAILED";
    throw error;
  }
  return {
    text: normalizeFollowUpResponse(ai.text),
    provider: clean(ai.provider),
    model: clean(ai.model),
  };
}

async function applyUsageOnce({ sessionId }) {
  const existing = await LoveSecretAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;
  await LoveSecretAiConsultation.updateOne(
    { id: sessionId, usageAppliedAt: null },
    { $set: { usageAppliedAt: new Date() } },
  );
  return true;
}

async function refundBillingGateMonthlyCredit({ userId, evidence = {}, reason = LLM_ERROR_MESSAGE }) {
  const amount = Math.max(0, Math.floor(Number(evidence.membershipCreditCost || 0)));
  const sourceId = clean(evidence.ledgerId || evidence.pointHistoryId || evidence.purchaseId, 160);
  if (!amount || !sourceId) return { refunded: false };

  const refundSourceId = `love-secret-ai-refund:${sourceId}`.slice(0, 180);
  const existing = await MonthlyCreditLedger.findOne({
    userId,
    type: "MONTHLY_CREDIT_GRANT",
    sourceId: refundSourceId,
  }).lean();
  if (existing) return { refunded: true, idempotent: true };

  // 복원분은 신규 30일 lot으로 재적립. lotId=refundSourceId로 멱등, recentConsumeRequestIds도 정리.
  const updatedUser = await restoreMonthlyCreditLot({
    userId,
    lotId: refundSourceId,
    amount,
    pullRequestId: evidence.purchaseId || "",
  });
  if (!updatedUser) return { refunded: false };

  const afterBalance = Math.max(0, Math.floor(Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0)));
  await MonthlyCreditLedger.create({
    userId,
    type: "MONTHLY_CREDIT_GRANT",
    amount,
    beforeBalance: Math.max(0, afterBalance - amount),
    afterBalance,
    reason,
    sourceId: refundSourceId,
    serviceKey: FEATURE_KEY,
    metadata: {
      source: "love-secret-ai",
      refundFor: sourceId,
      originalLedgerId: clean(evidence.ledgerId, 160),
      originalPointHistoryId: clean(evidence.pointHistoryId, 160),
      purchaseId: clean(evidence.purchaseId, 160),
      refundedAt: new Date(),
    },
  }).catch((error) => {
    if (error?.code !== 11000) throw error;
  });

  if (evidence.pointHistoryId && mongoose.Types.ObjectId.isValid(String(evidence.pointHistoryId))) {
    await PointHistory.updateOne(
      { _id: evidence.pointHistoryId, userId },
      {
        $set: {
          "metadata.monthlyCreditRefundedForLoveSecretAiFailure": true,
          "metadata.monthlyCreditRefundedForUnlockFailure": true,
          "metadata.monthlyCreditRefundedAt": new Date(),
        },
      },
    ).catch(() => {});
  }
  if (evidence.ledgerId && mongoose.Types.ObjectId.isValid(String(evidence.ledgerId))) {
    await MonthlyCreditLedger.updateOne(
      { _id: evidence.ledgerId, userId },
      {
        $set: {
          "metadata.refundedForLoveSecretAiFailure": true,
          "metadata.refundedForUnlockFailure": true,
          "metadata.refundedAt": new Date(),
        },
      },
    ).catch(() => {});
  }
  return { refunded: true };
}

async function restoreBillingGateAccessOnFailure({ userId, access = {}, idempotencyKey = "", pricing = getPricing(), error = null }) {
  const evidence = objectOf(access.billingEvidence);
  const failureMessage = clean(error?.message || error || "love secret ai generation failed", 500);
  const now = new Date();
  if (access.accessSource === "billing_gate_membership_credit") {
    return refundBillingGateMonthlyCredit({ userId, evidence, reason: LLM_ERROR_MESSAGE });
  }

  const pointHistoryId = clean(evidence.pointHistoryId || access.paymentId, 160);
  if (access.accessSource !== "billing_gate_paid" || !mongoose.Types.ObjectId.isValid(pointHistoryId)) {
    return { restored: false };
  }

  const history = await PointHistory.findOne({
    _id: pointHistoryId,
    userId,
    kind: "deduct",
    featureKey: FEATURE_KEY,
    "metadata.refundedForLoveSecretAiFailure": { $ne: true },
  }).lean();
  if (!history) return { restored: false };

  const refundCoins = Math.max(0, Math.floor(Math.abs(Number(history.delta || evidence.delta || pricing.coinPrice || 0))));
  if (!refundCoins) return { restored: false };

  const marked = await PointHistory.updateOne(
    { _id: history._id, userId, "metadata.refundedForLoveSecretAiFailure": { $ne: true } },
    {
      $set: {
        "metadata.refundedForLoveSecretAiFailure": true,
        "metadata.refundedForServiceExecution": true,
        "metadata.serviceExecutionRefundedAt": now,
        "metadata.serviceExecutionFailureMessage": failureMessage,
      },
    },
  );
  if (!marked.modifiedCount) return { restored: false };

  const purchaseId = clean(evidence.purchaseId || history?.metadata?.purchaseId || history?.metadata?.idempotencyKey || idempotencyKey, 180);
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
      refundedForLoveSecretAiFailure: true,
      refundedForServiceExecution: true,
      originalPointHistoryId: clean(history._id, 160),
      idempotencyKey,
      purchaseId,
      failureMessage,
    },
  }).catch(() => {});

  return { restored: true, type: "point_refund", amount: refundCoins };
}

function publicSession(doc) {
  const raw = typeof doc?.toObject === "function" ? doc.toObject() : doc;
  const meta = raw?.llmMeta || {};
  return {
    ok: true,
    id: clean(raw?.id),
    sessionId: clean(raw?.id),
    attemptId: clean(raw?.attemptId, 180),
    requestId: clean(raw?.idempotencyKey, 180),
    accessType: clean(raw?.accessType),
    status: clean(raw?.status),
    myInfo: raw?.myInfo || null,
    partnerInfo: raw?.partnerInfo || null,
    relationshipStatus: clean(raw?.relationshipStatus, 80),
    topic: clean(raw?.topic, 120),
    userQuestion: clean(raw?.userQuestion, 1400),
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
    keywords: Array.isArray(raw?.keywords) ? raw.keywords.map((item) => clean(item)).filter(Boolean).slice(0, 3) : [],
    strategy: clean(raw?.strategy),
    sections: Array.isArray(meta?.sections)
      ? meta.sections.map((section) => ({
        title: clean(section?.title, 80),
        body: clean(section?.body, 12000),
      })).filter((section) => section.title && section.body)
      : [],
    finalLine: clean(meta?.finalLine, 700),
    reading: meta?.reading || null,
    pdfSections: Array.isArray(meta?.pdfSections)
      ? meta.pdfSections.map((section) => ({
        title: clean(section?.title, 80),
        body: clean(section?.body, 12000),
      })).filter((section) => section.title && section.body)
      : [],
    sajuSummary: publicSajuSummary(raw?.sajuResult),
    consultationMode: clean(raw?.sajuResult?.consultationMode),
    messages: Array.isArray(raw?.messages)
      ? raw.messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      }))
      : [],
  };
}

function publicDistribution(source = {}) {
  if (!source || typeof source !== "object") return {};
  return Object.fromEntries(
    Object.entries(source)
      .map(([key, value]) => [clean(key, 20), Number(value || 0)])
      .filter(([key, value]) => key && Number.isFinite(value)),
  );
}

function publicChartSummary(chart = {}) {
  if (!chart || typeof chart !== "object") return null;
  return {
    yearPillar: clean(chart.yearPillar, 20),
    monthPillar: clean(chart.monthPillar, 20),
    dayPillar: clean(chart.dayPillar, 20),
    hourPillar: clean(chart.hourPillar, 20),
    dayMaster: clean(chart.dayMaster, 20),
    fiveElements: publicDistribution(chart.fiveElements),
    tenGods: publicDistribution(chart.tenGods),
    lovePattern: clean(chart.lovePattern, 600),
    reference: {
      dayElement: clean(chart?.reference?.dayElement, 20),
      dominantElement: clean(chart?.reference?.dominantElement, 20),
      deficientElement: clean(chart?.reference?.deficientElement, 20),
      dominantTenGod: clean(chart?.reference?.dominantTenGod, 30),
      yongshinElement: clean(chart?.reference?.yongshinElement, 20),
    },
  };
}

function publicSajuSummary(sajuResult = {}) {
  const myChart = publicChartSummary(sajuResult?.myChart);
  const partnerChart = publicChartSummary(sajuResult?.partnerChart);
  return {
    myChart,
    partnerChart,
    compatibility: sajuResult?.compatibility && typeof sajuResult.compatibility === "object"
      ? {
        summary: clean(sajuResult.compatibility.summary, 700),
        attractionPattern: clean(sajuResult.compatibility.attractionPattern, 700),
        conflictPattern: clean(sajuResult.compatibility.conflictPattern, 700),
        stability: clean(sajuResult.compatibility.stability, 700),
      }
      : null,
    uncertainty: Array.isArray(sajuResult?.uncertainty) ? sajuResult.uncertainty.map((item) => clean(item, 80)).filter(Boolean) : [],
    consultationMode: clean(sajuResult?.consultationMode, 40),
  };
}

async function handleEnsureAccess(request, env, route = "/api/love-secret-ai/prepare") {
  logLoveSecretAi("LLM Prepare Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logLoveSecretAi("LLM Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeRequestBody(body);
  if (!normalized.ok) {
    logLoveSecretAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logLoveSecretAi("LLM Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 정보가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  try {
    logLoveSecretAi("Fortune Data Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
    calculateLoveSecretAiSaju(normalized);
    logLoveSecretAi("Fortune Data Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  } catch (error) {
    logLoveSecretAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "fortune_data_failed", env, error }), "error");
    return calculationFailed();
  }

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  const pricing = getPricing();
  logLoveSecretAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  if (isAdmin(auth)) {
    logLoveSecretAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "admin", env }));
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
  if (access.ok) {
    logLoveSecretAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
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

  logLoveSecretAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "payment_required", env }));
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    paymentPayload: buildBillingGatePayload(pricing, idempotencyKey, user),
  }, { status: 402 });
}

async function resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey }) {
  const token = clean(body?.accessToken || request.headers.get("x-love-secret-ai-access-token"));
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: "상담 접근 정보가 현재 입력값과 일치하지 않습니다." };
    }
    return { ok: true, accessType: clean(payload.accessType), paymentId: clean(payload.paymentId, 160) };
  }

  const billingEvidence = await resolveBillingUsageEvidence(env, auth, body);
  if (billingEvidence?.ok) return billingEvidence;

  const user = await loadBillingUser(auth.userId);
  if (!user && !isAdmin(auth)) return { ok: false, reason: "LOGIN_REQUIRED" };
  return resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, paymentId: paymentIdFromBillingBody(body) });
}

async function handleStart(request, env, route = "/api/love-secret-ai/generate") {
  logLoveSecretAi("LLM Generate Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logLoveSecretAi("LLM Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeRequestBody(body);
  if (!normalized.ok) {
    logLoveSecretAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logLoveSecretAi("LLM Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 정보가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  logLoveSecretAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return paymentVerifyFailed();
  }
  logLoveSecretAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
  logLoveSecretAi("LLM Payment Guard Passed", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));

  const existing = await LoveSecretAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
  if (existing && clean(existing.inputHash) !== normalized.inputHash) {
    return invalidInput("같은 요청 키로 다른 상담 정보를 사용할 수 없습니다.", 409);
  }
  if (existing?.status === "completed") return json(publicSession(existing));
  // 신선도 창 = 최악 파이프라인(초기 150s + grounding 재시도 150s) + 마진.
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 360000) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "연애 비책 상담을 준비하고 있습니다" }, { status: 202 });
  }

  let sajuResult;
  try {
    logLoveSecretAi("Fortune Data Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    sajuResult = calculateLoveSecretAiSaju(normalized);
    logLoveSecretAi("Fortune Data Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
  } catch (error) {
    logLoveSecretAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "fortune_data_failed", access: access.accessType, env, error }), "error");
    const restored = await restoreBillingGateAccessOnFailure({ userId: auth.userId, access, idempotencyKey, pricing, error }).catch((restoreError) => ({ restored: false, error: clean(restoreError?.message || restoreError, 300) }));
    logLoveSecretAi("LLM Refund Or Restore", {
      ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }),
      restored,
    }, restored?.restored || restored?.refunded ? "info" : "warn");
    return calculationFailed();
  }

  const sessionId = existing?.id || `lsai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
  const now = new Date();
  const attemptId = clean(
    body?.attemptId
      || body?.paidAttemptId
      || objectOf(body?.payment)?.attemptId
      || objectOf(body?.accessGrant)?.attemptId
      || objectOf(body?.consume)?.attemptId,
    180,
  );
  const seed = {
    id: sessionId,
    userId: clean(auth.userId),
    attemptId,
    myInfo: normalized.input.myInfo,
    partnerInfo: normalized.input.partnerInfo || null,
    relationshipStatus: normalized.input.relationshipStatus,
    topic: normalized.input.topic,
    userQuestion: normalized.input.userQuestion || "",
    sajuResult,
    accessType: access.accessType,
    paymentId: clean(access.paymentId, 160),
    keywords: [],
    strategy: "",
    messages: [],
    idempotencyKey,
    inputHash: normalized.inputHash,
    status: "generating",
    generationError: null,
  };

  if (existing) {
    await LoveSecretAiConsultation.updateOne(
      { id: existing.id },
      { $set: { ...seed, updatedAt: now } },
    );
  } else {
    try {
      await LoveSecretAiConsultation.create(seed);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await LoveSecretAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicSession(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "연애 비책 상담을 준비하고 있습니다" }, { status: 202 });
      }
      throw error;
    }
  }

  try {
    const logContext = safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env });
    const generated = await generateFirstConsultation(env, normalized.input, sajuResult, logContext);
    const completed = await LoveSecretAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "completed",
          keywords: generated.keywords,
          strategy: generated.strategy,
          messages: [
            {
              role: "user",
              content: normalized.input.userQuestion || `${normalized.input.relationshipStatus} · ${normalized.input.topic}`,
              createdAt: now,
            },
            { role: "assistant", content: generated.answer, createdAt: new Date() },
          ],
          llmMeta: {
            provider: generated.provider,
            model: generated.model,
            completedAt: new Date().toISOString(),
            sections: generated.sections,
            reading: generated.reading,
            pdfSections: generated.pdfSections,
            finalLine: generated.finalLine,
          },
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    await applyUsageOnce({
      userId: auth.userId,
      sessionId,
      accessType: access.accessType,
      accessSource: access.accessSource || "",
      paymentId: clean(access.paymentId, 160),
      pricing,
    });
    const finalDoc = await LoveSecretAiConsultation.findOne({ id: sessionId }).lean();
    logLoveSecretAi("LLM Generate Success", {
      ...logContext,
      providerReason: generated.provider || generated.model || "real_llm_success",
      provider: generated.provider,
      model: generated.model,
    });
    return json(publicSession(finalDoc || completed));
  } catch (error) {
    logLoveSecretAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }), "error");
    const restored = await restoreBillingGateAccessOnFailure({ userId: auth.userId, access, idempotencyKey, pricing, error }).catch((restoreError) => ({ restored: false, error: clean(restoreError?.message || restoreError, 300) }));
    logLoveSecretAi("LLM Refund Or Restore", {
      ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }),
      restored,
    }, restored?.restored || restored?.refunded ? "info" : "warn");
    await LoveSecretAiConsultation.updateOne(
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
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

async function handleResult(request, env, pathId = "") {
  const url = new URL(request.url);
  const rawIds = [
    pathId,
    url.searchParams.get("sessionId"),
    url.searchParams.get("id"),
    url.searchParams.get("requestId"),
    url.searchParams.get("idempotencyKey"),
    url.searchParams.get("attemptId"),
  ];
  const ids = [...new Set(rawIds.map((item) => {
    try {
      return clean(decodeURIComponent(item || ""), 180);
    } catch (_) {
      return clean(item, 180);
    }
  }).filter(Boolean))];
  if (!ids.length) return invalidInput("저장된 연애 비책 상담 결과를 찾을 수 없습니다.", 404);

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const or = [];
  ids.forEach((id) => {
    or.push({ id }, { idempotencyKey: id }, { attemptId: id });
  });
  const consultation = await LoveSecretAiConsultation.findOne({
    userId: clean(auth.userId),
    $or: or,
  }).lean();
  if (!consultation) {
    return json({ ok: false, reason: "RESULT_NOT_FOUND", message: "저장된 연애 비책 상담 결과를 찾을 수 없습니다." }, { status: 404 });
  }
  if (consultation.status === "generating") {
    return json({
      ok: true,
      sessionId: clean(consultation.id),
      attemptId: clean(consultation.attemptId, 180),
      requestId: clean(consultation.idempotencyKey, 180),
      status: "generating",
      message: "두 사람의 마음의 온도를 읽고 있습니다.",
    }, { status: 202 });
  }
  if (consultation.status === "generation_failed") {
    return json({
      ok: false,
      sessionId: clean(consultation.id),
      status: "generation_failed",
      reason: "LLM_ERROR",
      message: LLM_ERROR_MESSAGE,
    }, { status: 503 });
  }

  const payload = publicSession(consultation);
  const assistantContent = payload.messages.find((message) => message.role === "assistant")?.content || "";
  if (!assistantContent.trim() && !payload.sections.length) {
    return json({ ok: false, reason: "RESULT_EMPTY", message: LLM_ERROR_MESSAGE }, { status: 409 });
  }
  return json(payload);
}

async function handleMessage(request, env) {
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.consultationId, 120);
  const message = clean(body?.message || body?.question, 1200);
  if (!sessionId) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);
  if (message.length < 2) return invalidInput("추가 질문을 입력해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const consultation = await LoveSecretAiConsultation.findOne({
    id: sessionId,
    userId: clean(auth.userId),
    status: "completed",
  }).lean();
  if (!consultation) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);

  try {
    const generated = await generateFollowUp(env, consultation, message);
    const userMessage = { role: "user", content: message, createdAt: new Date() };
    const assistantMessage = { role: "assistant", content: generated.text, createdAt: new Date() };
    const updated = await LoveSecretAiConsultation.findOneAndUpdate(
      { id: sessionId, userId: clean(auth.userId) },
      {
        $push: { messages: { $each: [userMessage, assistantMessage] } },
        $set: {
          llmMeta: { provider: generated.provider, model: generated.model, updatedAt: new Date().toISOString() },
        },
      },
      { new: true },
    ).lean();
    return json(publicSession(updated));
  } catch (error) {
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

export async function handleLoveSecretAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/love-secret-ai");
  logLoveSecretAi("Route Matched", safeLogPayload({ route: `/api/love-secret-ai${path}`, env }));

  try {
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (method === "GET" && path.startsWith("/result/")) return await handleResult(request, env, path.slice("/result/".length));
    if (method === "POST" && (path === "/prepare" || path === "/ensure-access")) {
      return await handleEnsureAccess(request, env, path === "/prepare" ? "/api/love-secret-ai/prepare" : "/api/love-secret-ai/ensure-access");
    }
    if (method === "POST" && (path === "/generate" || path === "/start")) {
      return await handleStart(request, env, path === "/generate" ? "/api/love-secret-ai/generate" : "/api/love-secret-ai/start");
    }
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[love-secret-ai]", clean(error?.code || error?.message || error, 500));
    return serverError();
  }
}

export const __loveSecretAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeRequestBody,
  getPricing,
};
