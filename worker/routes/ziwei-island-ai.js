// 운명의 섬 12궁 심층 유료 상담 (₩20,000) — 독립 신규 상품.
// 결제/게이트/환불 배선은 검증된 worker/routes/ziwei-ai.js에서 "상수만 바꿔" 그대로 복제했다.
// (기존 ziwei-ai 상품/라우트는 무수정 — 회귀 0). 상담 내용만 궁별 프롬프트(palace-prompts)로 대체.
import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import { clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";
import { MonthlyCreditLedger, Payment, PointHistory, User, ZiweiAiConsultation } from "../lib/models.js";
import { decryptPhoneNumber } from "../lib/pii-crypto.js";
import { restoreMonthlyCreditLot } from "../lib/monthly-credit-store.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { resolveFeatureAccessPolicy } from "../lib/entitlement-policy.js";
import { fetchPortOnePayment, getPortOnePublicConfig } from "../lib/portone.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { calculateZiweiAiChart } from "../lib/ziwei-ai-chart.js";
import { stripEmptyParens } from "../lib/ziwei-hanja.js";
import { buildPalaceFirstPrompt, buildSystemPrompt, getPalaceConfig, isValidPalace } from "../lib/island/consult/palace-prompts.js";

// ── 상품 상수(ziwei-ai와 유일하게 다른 부분) ──
const SERVICE_KEY = "ziwei-island-ai";
const FEATURE_KEY = "ziwei-island-palace-consult";
const ACCESS_TOKEN_TYPE = "ziwei-island-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "운명의 섬 12궁 심층 상담";
const COIN_PRICE = 200;
const AMOUNT_KRW = 20000;
const PALACE_CONSULT_MAX_OUTPUT_TOKENS = 8000;

const GEMINI_ENV_KEYS = ["GEMINIF_API_KEY", "GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"];

const MESSAGES = Object.freeze({
  login: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  invalidInput: "상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간을 다시 확인해 주세요.",
  birthTimeMissing: "자미두수는 출생시간이 중요해요. 출생시간을 입력하거나 ‘출생시간 모름’을 선택해 주세요.",
  palaceRequired: "어느 궁의 상담인지 선택해 주세요.",
  calculationFailed: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  serverFailed: "상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  llmFailed: "전문가 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
});

// ══════════════════════════════════════════════════════════════
//  아래 헬퍼는 worker/routes/ziwei-ai.js에서 verbatim 복제(상수만 위에서 교체).
// ══════════════════════════════════════════════════════════════
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
function safeLogPayload({ route = "", requestId = "", body = {}, normalized = null, validation = "", access = "", env = {}, error = null } = {}) {
  const input = normalized?.input || {};
  const birthInfo = input.birthInfo || body.birthInfo || {};
  return {
    route: clean(route || "/api/ziwei-island-ai", 120),
    requestId: clean(requestId || body.requestId || body.idempotencyKey, 180),
    serviceType: FEATURE_KEY,
    palaceKey: clean(input.palaceKey || body.palaceKey, 20),
    validation,
    access,
    name: maskName(birthInfo.name || body.userName || body.name),
    birthDate: maskBirthDate(birthInfo.birthDate || body.birthDate),
    ...getProviderDiagnostics(env),
    ...(error ? {
      errorMessage: clean(error?.message || error, 500),
      ...(isDevelopmentEnv(env) ? { stack: clean(error?.stack, 2000) } : {}),
    } : {}),
  };
}
function logZiweiIsland(marker, details = {}, level = "info") {
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  console[method](`[Ziwei Island ${marker}]`, details);
}
function sha256(value) { return createHash("sha256").update(String(value || "")).digest("hex"); }
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function readIdempotencyKey(request, body = {}) {
  return clean(body?.idempotencyKey || request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key"), 180);
}
function randomToken(length = 10) {
  const bytes = new Uint8Array(Math.max(8, Math.ceil(length * 0.75)));
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return Array.from(bytes).map((byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, length);
}
function buildPaymentId(userId) {
  const suffix = clean(userId, 40).replace(/[^a-zA-Z0-9_-]/g, "").slice(-10) || "guest";
  return `cd-zwisl-${suffix}-${Date.now()}-${randomToken(8)}`;
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
function invalidInput(message = MESSAGES.invalidInput, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message: clean(message) || MESSAGES.invalidInput }, { status });
}
function loginRequired() { return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 }); }
function serverError(message = MESSAGES.serverFailed, status = 500) { return json({ ok: false, reason: "SERVER_ERROR", message }, { status }); }
function paymentVerifyFailed() { return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: MESSAGES.paymentVerifyFailed }, { status: 402 }); }
function calculationFailed() { return json({ ok: false, reason: "CALCULATION_FAILED", message: MESSAGES.calculationFailed }, { status: 422 }); }

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = resolved?.pricing || {};
  const coinPrice = Number(pricing.coinPrice || pricing.cost || COIN_PRICE);
  const amountKRW = Number(pricing.amountKRW || pricing.paymentAmount || AMOUNT_KRW);
  return {
    pricing: { ...pricing, featureKey: FEATURE_KEY, cost: coinPrice, coinPrice, amountKRW, paymentAmount: amountKRW, reason: pricing.reason || ORDER_NAME },
    coinPrice,
    amountKRW,
    membershipCreditCost: calculateMembershipCreditCost(coinPrice),
  };
}
async function createAccessToken(env, payload) {
  return signJwt(
    { typ: ACCESS_TOKEN_TYPE, serviceKey: SERVICE_KEY, featureKey: FEATURE_KEY, ...payload },
    getAccessTokenSecret(env),
    { expiresIn: ACCESS_TOKEN_TTL, issuer: getJwtIssuer(env), audience: getJwtAudience(env) },
  );
}
async function verifyAccessToken(env, token) {
  const payload = await verifyJwt(token, getAccessTokenSecret(env), { issuer: getJwtIssuer(env), audience: getJwtAudience(env) });
  if (payload?.typ !== ACCESS_TOKEN_TYPE || payload?.serviceKey !== SERVICE_KEY || payload?.featureKey !== FEATURE_KEY) {
    const error = new Error("invalid access token");
    error.code = "INVALID_ACCESS_TOKEN";
    throw error;
  }
  return payload;
}
function isAdmin(auth = {}) { return clean(auth.role).toLowerCase() === "admin"; }
async function loadBillingUser(userId, env) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return null;
  const user = await User.findById(userId)
    .select("email name phoneNumber points role profileSubscription subscription membership pass entitlement paidFeatures unlockedFeatures recentConsumeRequestIds")
    .lean();
  // 저장값이 암호화 봉투일 수 있으므로 여기서 평문으로 되돌린다(worker/lib/pii-crypto.js).
  // 아래 customerFromUser 는 동기 함수라 그대로 두고, 로드 지점 한 곳에서만 푼다.
  if (user) user.phoneNumber = await decryptPhoneNumber(user.phoneNumber, env);
  return user;
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
    userId, featureKey: FEATURE_KEY, paymentType: "digital_content", accessType: "single_purchase",
    status: { $in: ["paid", "success", "fulfilled"] }, $or: clauses,
  }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
}
function asObject(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function uniq(values = []) { return [...new Set(values.map((value) => clean(value, 180)).filter(Boolean))]; }
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
    idempotencyKey, body.paymentId, body.merchantUid, body.merchant_uid, body.impUid, body.imp_uid, body.transactionId, body.purchaseId,
    ctx.billing.transactionId, ctx.billing.purchaseId, ctx.billing.paymentId, ctx.billing.requestId,
    ctx.consume.transactionId, ctx.consume.purchaseId, ctx.consume.requestId, ctx.consume.receiptId, ctx.consume.pointHistoryId, ctx.consume.ledgerId, ctx.consume.monthlyCreditLedgerId,
    ctx.accessGrant.evidenceId, ctx.accessGrant.purchaseId, ctx.accessGrant.paymentId, ctx.accessGrant.merchantUid, ctx.accessGrant.impUid, ctx.accessGrant.requestId,
    ctx.payment.paymentId, ctx.payment.merchantUid, ctx.payment.impUid, ctx.payment.id, ctx.payment._id,
  ]);
}
function readBillingAccessSignal(body = {}) {
  const ctx = readBillingContext(body);
  return [
    body.accessType, body.accessMethod, body.paymentMode,
    ctx.billing.accessType, ctx.billing.accessMethod, ctx.billing.paymentMode,
    ctx.consume.accessType, ctx.consume.accessMethod, ctx.consume.paymentMethod, ctx.consume.paymentMode, ctx.consume.transactionType,
    ctx.accessGrant.accessType, ctx.accessGrant.accessMethod, ctx.accessGrant.paymentMethod,
  ].map((value) => clean(value).toLowerCase()).filter(Boolean).join("|");
}
function billingTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ requestId: token }, { idempotencyKey: token }, { merchantUid: token }, { impUid: token });
    if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: token });
  });
  return clauses;
}
function pointHistoryTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ "metadata.requestId": token }, { "metadata.purchaseId": token }, { "metadata.idempotencyKey": token }, { "metadata.orderId": token }, { "metadata.transactionId": token }, { "metadata.pointHistoryId": token });
    if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: token });
  });
  return clauses;
}
function monthlyCreditTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ sourceId: token }, { "metadata.requestId": token }, { "metadata.purchaseId": token }, { "metadata.idempotencyKey": token }, { "metadata.orderId": token }, { "metadata.pointHistoryId": token }, { "metadata.ledgerId": token }, { "metadata.monthlyCreditLedgerId": token });
    if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: token });
  });
  return clauses;
}
async function resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash, paymentId = "" }) {
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") return { ok: true, accessType: "admin", paymentId: "" };
  const paidPayment = await findPaidPayment({ userId: auth.userId, idempotencyKey, paymentId });
  if (paidPayment) {
    const storedHash = clean(paidPayment?.pricingSnapshot?.inputHash);
    if (storedHash && storedHash !== inputHash) return { ok: false, reason: "INVALID_INPUT", message: "같은 요청 키로 다른 상담 정보를 사용할 수 없습니다." };
    return { ok: true, accessType: "paid", paymentId: clean(paidPayment.merchantUid || paidPayment.impUid || paymentId, 160) };
  }
  const featureAccess = resolveFeatureAccessPolicy({ user: user || {}, pricing, coinCost: pricing.coinPrice });
  if (featureAccess.allowed) return { ok: true, accessType: featureAccess.accessType || "pass", paymentId: "" };
  if (hasMonthlyCredit(user, pricing.membershipCreditCost)) return { ok: true, accessType: "subscription", paymentId: "" };
  return { ok: false, reason: "PAYMENT_REQUIRED" };
}
async function resolveBillingGateAccess({ auth, user, body, pricing, idempotencyKey }) {
  const signal = readBillingAccessSignal(body);
  const tokens = collectBillingTokens(body, idempotencyKey);
  const featureKeys = [FEATURE_KEY];
  const hasEvidencePayload = tokens.length > 0 || signal.includes("pass") || signal.includes("monthly") || signal.includes("credit") || signal.includes("coin");
  if (!hasEvidencePayload) return null;
  if (/usage[-_]pass/.test(signal)) return null;
  if (signal.includes("pass") || signal.includes("membership_pass")) {
    const featureAccess = resolveFeatureAccessPolicy({ user: user || {}, pricing, coinCost: pricing.coinPrice });
    if (featureAccess.allowed) return { ok: true, accessType: featureAccess.accessType || "pass", paymentId: tokens[0] || "", prepaid: true, evidenceType: "pass" };
  }
  const paymentClauses = billingTokenClauses(tokens);
  if (paymentClauses.length) {
    const payment = await Payment.findOne({
      userId: auth.userId, paymentType: "digital_content", featureKey: { $in: featureKeys },
      status: { $in: ["paid", "success", "fulfilled"] }, $or: paymentClauses,
    }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
    if (payment) return { ok: true, accessType: "paid", paymentId: clean(payment.merchantUid || payment.impUid || payment._id, 160), prepaid: true, evidenceType: "direct_payment", evidenceId: clean(payment._id, 160) };
  }
  const pointClauses = pointHistoryTokenClauses(tokens);
  if (pointClauses.length) {
    const pointHistory = await PointHistory.findOne({
      userId: auth.userId, kind: "deduct", featureKey: { $in: featureKeys },
      "metadata.coinRefundedForUnlockFailure": { $ne: true }, "metadata.refundedForServiceExecution": { $ne: true }, $or: pointClauses,
    }).sort({ createdAt: -1 }).lean();
    if (pointHistory) return {
      ok: true, accessType: "paid", paymentId: clean(pointHistory._id, 160), prepaid: true, evidenceType: "coin", evidenceId: clean(pointHistory._id, 160),
      amount: Math.max(0, Math.floor(Math.abs(Number(pointHistory.delta || pointHistory?.metadata?.chargedCoins || pricing.coinPrice || 0)))),
      purchaseId: clean(pointHistory?.metadata?.purchaseId || pointHistory?.metadata?.idempotencyKey || pointHistory?.metadata?.orderId || "", 180),
    };
  }
  const monthlyClauses = monthlyCreditTokenClauses(tokens);
  if (monthlyClauses.length) {
    const ledger = await MonthlyCreditLedger.findOne({
      userId: auth.userId, type: "MONTHLY_CREDIT_SPEND", serviceKey: { $in: [FEATURE_KEY, SERVICE_KEY] },
      "metadata.refundedForUnlockFailure": { $ne: true }, "metadata.refundedForServiceExecution": { $ne: true }, $or: monthlyClauses,
    }).sort({ createdAt: -1 }).lean();
    if (ledger) return {
      ok: true, accessType: "subscription", paymentId: clean(ledger._id, 160), prepaid: true, evidenceType: "monthly_credit", evidenceId: clean(ledger._id, 160),
      amount: Math.max(0, Math.floor(Number(ledger.amount || pricing.membershipCreditCost || 0))),
      purchaseId: clean(ledger.sourceId || ledger?.metadata?.purchaseId || ledger?.metadata?.idempotencyKey || "", 180),
    };
  }
  return null;
}
function customerFromUser(user, userId) {
  const email = clean(user?.email).toLowerCase();
  const safeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : `buyer-${clean(userId).slice(-10) || "guest"}@code-destiny.com`;
  return { fullName: clean(user?.name, 40) || "Code Destiny", email: safeEmail, phoneNumber: clean(user?.phoneNumber).replace(/\D/g, "").slice(0, 11) };
}
function buildPaymentPayload({ config, paymentId, pricing, user, userId, idempotencyKey }) {
  return {
    storeId: config.storeId || "", channelKey: config.channelKey || "", paymentId, merchantUid: paymentId,
    orderName: ORDER_NAME, totalAmount: pricing.amountKRW, paymentAmount: pricing.amountKRW, amountKRW: pricing.amountKRW,
    currency: config.currency || "CURRENCY_KRW", payMethod: config.payMethod || "CARD", customer: customerFromUser(user, userId),
    featureKey: FEATURE_KEY, serviceId: SERVICE_KEY, serviceKey: SERVICE_KEY, contentId: FEATURE_KEY, contentType: SERVICE_KEY,
    idempotencyKey, noticeUrl: config.noticeUrl || "", customData: { serviceKey: SERVICE_KEY, featureKey: FEATURE_KEY, idempotencyKey },
    runtimeGate: {
      title: ORDER_NAME, reason: ORDER_NAME, featureKey: FEATURE_KEY, categoryKey: "premium-consultation", subFeatureKey: FEATURE_KEY, serviceKey: SERVICE_KEY,
      cost: pricing.coinPrice, coinPrice: pricing.coinPrice, amountKRW: pricing.amountKRW, amountKrw: pricing.amountKRW,
      membershipCreditCost: pricing.membershipCreditCost, requestId: idempotencyKey, idempotencyKey,
    },
  };
}
async function createOrReusePaymentPayload({ env, auth, user, pricing, idempotencyKey, inputHash }) {
  const config = getPortOnePublicConfig(env || {});
  const existing = await withMongoRetry(env, () => Payment.findOne({ userId: auth.userId, idempotencyKey, paymentType: "digital_content" }).sort({ createdAt: -1 }).lean());
  if (existing) {
    if (clean(existing.featureKey) !== FEATURE_KEY || clean(existing?.pricingSnapshot?.inputHash) !== inputHash) return { ok: false, message: "같은 요청 키로 다른 결제 요청을 만들 수 없습니다." };
    const paymentId = clean(existing.merchantUid || existing.impUid, 160);
    return { ok: true, paymentPayload: buildPaymentPayload({ config, paymentId, pricing, user, userId: auth.userId, idempotencyKey }) };
  }
  if (!config.configured) return { ok: true, paymentPayload: buildPaymentPayload({ config, paymentId: idempotencyKey, pricing, user, userId: auth.userId, idempotencyKey }) };
  const paymentId = buildPaymentId(auth.userId);
  await Payment.create({
    userId: auth.userId, merchantUid: paymentId, idempotencyKey, paymentAmount: pricing.amountKRW, expectedChargedPoints: pricing.coinPrice, chargedPoints: 0,
    featureKey: FEATURE_KEY, productId: SERVICE_KEY, coinPrice: pricing.coinPrice, membershipCreditCost: pricing.membershipCreditCost,
    accessType: "single_purchase", requestId: idempotencyKey,
    pricingSnapshot: {
      ...pricing.pricing, serviceKey: SERVICE_KEY, serviceId: SERVICE_KEY, featureKey: FEATURE_KEY, contentId: FEATURE_KEY, contentType: SERVICE_KEY,
      inputHash, idempotencyKey, paymentId, orderName: ORDER_NAME, amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice,
      createdAt: new Date().toISOString(), returnPath: "/island-consult",
    },
    paymentMethod: "CARD", status: "pending", orderState: "PENDING", source: "prepare", paymentType: "digital_content",
  });
  return { ok: true, paymentPayload: buildPaymentPayload({ config, paymentId, pricing, user, userId: auth.userId, idempotencyKey }) };
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
  const order = await withMongoRetry(env, () => Payment.findOne({ userId: auth.userId, merchantUid: normalizedPaymentId, featureKey: FEATURE_KEY, paymentType: "digital_content", accessType: "single_purchase" }).lean());
  if (!order) return { ok: false };
  if (clean(order?.pricingSnapshot?.inputHash) !== inputHash || clean(order.idempotencyKey) !== idempotencyKey) return { ok: false };
  if (["paid", "success", "fulfilled"].includes(clean(order.status).toLowerCase())) return { ok: true, accessType: "paid", paymentId: normalizedPaymentId };
  let portOnePayment = null;
  // 🔴 실패를 삼키면 카드 승인 후 원인 추적이 불가능해진다(2026-07 PortOne 401 장애). 동작은 그대로 두고 사유만 남긴다.
  try { portOnePayment = await fetchPortOnePayment(env, normalizedPaymentId); } catch (error) {
    console.error("[ziwei-island-ai] PortOne payment lookup failed", normalizedPaymentId, error?.message || error);
    await Payment.findByIdAndUpdate(order._id, {
      $set: {
        failureCode: "portone_fetch_failed",
        failureMessage: String(error?.message || "PortOne payment lookup failed.").slice(0, 300),
        failureStage: "ziwei_island_ai_portone_fetch",
        lastErrorAt: new Date(),
      },
    }).catch(() => {});
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
  const paidAt = portOnePayment?.paid_at ? new Date(Number(portOnePayment.paid_at) * 1000) : new Date();
  await Payment.findByIdAndUpdate(order._id, {
    $set: { impUid: normalizedPaymentId, merchantUid: normalizedPaymentId, paymentAmount: pricing.amountKRW, expectedChargedPoints: pricing.coinPrice, chargedPoints: 0, coinPrice: pricing.coinPrice, membershipCreditCost: pricing.membershipCreditCost, status: "success", orderState: "PAID_VERIFIED", paidAt, source: "confirm", rawPortOne: portOnePayment, failureCode: null, failureMessage: null, failureStage: null, lastErrorAt: null },
    $inc: { confirmAttempts: 1 },
  }).catch(() => {});
  return { ok: true, accessType: "paid", paymentId: normalizedPaymentId };
}
async function applyUsageOnce({ userId, sessionId, accessType, paymentId, pricing, prepaid = false }) {
  const existing = await ZiweiAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;
  if (prepaid) { await ZiweiAiConsultation.updateOne({ id: sessionId, usageAppliedAt: null }, { $set: { usageAppliedAt: new Date() } }); return true; }
  if (accessType === "subscription") {
    const error = new Error("A Payment Service access grant is required for monthly usage.");
    error.code = "PAYMENT_ACCESS_GRANT_REQUIRED";
    throw error;
  }
  if (accessType === "paid" && paymentId) {
    await Payment.updateOne({ userId, featureKey: FEATURE_KEY, merchantUid: paymentId }, { $set: { status: "fulfilled", orderState: "UNLOCKED", reportId: sessionId, sessionId, "pricingSnapshot.sessionId": sessionId, "pricingSnapshot.usageAppliedAt": new Date().toISOString() } }).catch(() => {});
  }
  await ZiweiAiConsultation.updateOne({ id: sessionId, usageAppliedAt: null }, { $set: { usageAppliedAt: new Date() } });
  return true;
}
async function restorePrepaidAccessOnFailure({ userId, access = {}, idempotencyKey = "", pricing = getPricing(), error = null }) {
  if (!access?.prepaid) return false;
  const evidenceType = clean(access.evidenceType, 80);
  const evidenceId = clean(access.evidenceId || access.paymentId, 160);
  const failureMessage = clean(error?.message || error || "service execution failed", 500);
  const now = new Date();
  try {
    if (evidenceType === "coin" && mongoose.Types.ObjectId.isValid(evidenceId)) {
      const history = await PointHistory.findOne({ _id: evidenceId, userId, kind: "deduct", featureKey: FEATURE_KEY, "metadata.refundedForServiceExecution": { $ne: true } }).lean();
      if (!history) return false;
      const refundCoins = Math.max(0, Math.floor(Math.abs(Number(history.delta || access.amount || pricing.coinPrice || 0))));
      if (!refundCoins) return false;
      const marked = await PointHistory.updateOne({ _id: history._id, userId, "metadata.refundedForServiceExecution": { $ne: true } }, { $set: { "metadata.refundedForServiceExecution": true, "metadata.serviceExecutionRefundedAt": now, "metadata.serviceExecutionFailureMessage": failureMessage } });
      if (!marked.modifiedCount) return false;
      const purchaseId = clean(access.purchaseId || history?.metadata?.purchaseId || history?.metadata?.idempotencyKey || idempotencyKey, 180);
      const updated = await User.findByIdAndUpdate(userId, { $inc: { points: refundCoins }, ...(purchaseId ? { $pull: { recentConsumeRequestIds: purchaseId } } : {}) }, { new: true, projection: { points: 1 } }).lean();
      await PointHistory.create({ userId, kind: "refund", delta: refundCoins, balanceAfter: Math.max(0, Math.floor(Number(updated?.points || 0))), reason: `${ORDER_NAME} 생성 실패 환급`, featureKey: FEATURE_KEY, metadata: { refundedForServiceExecution: true, originalPointHistoryId: clean(history._id, 160), idempotencyKey, purchaseId, failureMessage } }).catch(() => {});
      return true;
    }
    if (evidenceType === "monthly_credit") {
      const ledgerQuery = mongoose.Types.ObjectId.isValid(evidenceId) ? { _id: evidenceId } : { sourceId: access.purchaseId || idempotencyKey };
      const ledger = await MonthlyCreditLedger.findOne({ ...ledgerQuery, userId, type: "MONTHLY_CREDIT_SPEND", serviceKey: { $in: [FEATURE_KEY, SERVICE_KEY] }, "metadata.refundedForServiceExecution": { $ne: true } }).lean();
      if (!ledger) return false;
      const refundCredit = Math.max(0, Math.floor(Number(ledger.amount || access.amount || pricing.membershipCreditCost || 0)));
      if (!refundCredit) return false;
      const marked = await MonthlyCreditLedger.updateOne({ _id: ledger._id, userId, "metadata.refundedForServiceExecution": { $ne: true } }, { $set: { "metadata.refundedForServiceExecution": true, "metadata.serviceExecutionRefundedAt": now, "metadata.serviceExecutionFailureMessage": failureMessage } });
      if (!marked.modifiedCount) return false;
      const purchaseId = clean(access.purchaseId || ledger.sourceId || idempotencyKey, 180);
      await restoreMonthlyCreditLot({ userId, lotId: `ziwei-island-refund:${String(ledger._id)}`, amount: refundCredit, pullRequestId: purchaseId || "" }).catch(() => {});
      const clauses = pointHistoryTokenClauses([purchaseId, evidenceId, idempotencyKey].filter(Boolean));
      if (clauses.length) {
        await PointHistory.updateMany({ userId, kind: "deduct", featureKey: FEATURE_KEY, "metadata.refundedForServiceExecution": { $ne: true }, $or: clauses }, { $set: { "metadata.refundedForServiceExecution": true, "metadata.serviceExecutionRefundedAt": now, "metadata.serviceExecutionFailureMessage": failureMessage } }).catch(() => {});
      }
      return true;
    }
  } catch (restoreError) {
    console.warn("[ziwei-island] prepaid access restore failed", { userId: clean(userId, 80), evidenceType, evidenceId, message: clean(restoreError?.message || restoreError, 300) });
  }
  return false;
}

// ── 결과 공개(궁 상담 전용) ──
function parseSections(text) {
  const t = clean(text).replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const s = t.indexOf("{"); const e = t.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  try { const parsed = JSON.parse(t.slice(s, e + 1)); return parsed && typeof parsed === "object" ? parsed : null; } catch { return null; }
}
function publicConsultation(doc) {
  const assistant = Array.isArray(doc.messages) ? doc.messages.find((m) => m.role === "assistant") : null;
  // 생성 경로는 이미 정화해 저장하지만, 이 변경 이전에 저장된 상담에는 빈 괄호가 남아 있다.
  // 재열람 응답에서도 지워야 과거 상담이 화면에서 깨끗해진다.
  const parsed = assistant ? parseSections(stripEmptyParens(assistant.content)) : null;
  return {
    ok: true,
    sessionId: clean(doc.id),
    consultation: {
      id: clean(doc.id),
      accessType: clean(doc.accessType),
      status: clean(doc.status),
      palaceKey: clean(doc.palaceKey, 20),
      palaceTitle: clean(getPalaceConfig(doc.palaceKey)?.title, 40),
      sectionKeys: Array.isArray(doc.sectionKeys) ? doc.sectionKeys : [],
      birthInfo: doc.birthInfo || {},
      topic: clean(doc.topic),
      userQuestion: clean(doc.userQuestion),
      result: parsed,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
  };
}

// ── 궁 상담 입력 정규화(신규) ──
function normalizePalaceInput(body = {}) {
  const palaceKey = clean(body.palaceKey || body.palace, 20);
  if (!isValidPalace(palaceKey)) return { ok: false, message: MESSAGES.palaceRequired };
  const birthSource = body.birthInfo && typeof body.birthInfo === "object" ? body.birthInfo : body;
  const name = clean(body.userName ?? body.name ?? birthSource.name, 80);
  const gender = normalizeGender(body.gender ?? birthSource.gender);
  const birthDate = clean(body.birthDate ?? birthSource.birthDate, 10);
  const birthTimeUnknown = body.birthTimeUnknown === true || birthSource.birthTimeUnknown === true;
  const birthTime = birthTimeUnknown ? "" : clean(body.birthTime ?? birthSource.birthTime, 5);
  const calendarType = normalizeCalendarType(body.calendarType ?? birthSource.calendarType);
  const isLeapMonth = body.isLeapMonth === true || birthSource.isLeapMonth === true;
  const userQuestion = clean(body.userQuestion ?? body.question, 1200);
  if (!gender) return { ok: false, message: MESSAGES.invalidInput };
  if (!isValidDateKey(birthDate)) return { ok: false, message: MESSAGES.invalidInput };
  if (!birthTimeUnknown && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) return { ok: false, message: MESSAGES.birthTimeMissing };
  if (userQuestion && userQuestion.length < 2) return { ok: false, message: "질문을 조금 더 구체적으로 적어 주세요." };
  const cfg = getPalaceConfig(palaceKey);
  const normalized = {
    serviceType: FEATURE_KEY,
    palaceKey,
    sectionKeys: cfg.sections.map(([k]) => k),
    birthInfo: { name, gender, birthDate, birthTime, birthTimeUnknown, calendarType, isLeapMonth },
    topic: `${palaceKey} · ${cfg.title}`,
    userQuestion,
  };
  return { ok: true, input: normalized, inputHash: sha256(stableJson(normalized)) };
}

async function generatePalaceText(env, prompt, options = {}) {
  const cache = { store: createLlmCacheStore(env), deterministic: true, ttlSeconds: 30 * 24 * 60 * 60, keyExtra: "ziwei-island-v1" };
  const timeoutMs = clampSyncLlmTimeoutMs(Number(env?.ZIWEI_ISLAND_TIMEOUT_MS) || 120000);
  const baseTokens = options.maxOutputTokens || PALACE_CONSULT_MAX_OUTPUT_TOKENS;
  const ai = await callGeminiJsonWithRetry(env, prompt, {
    systemPrompt: buildSystemPrompt(), taskType: "fortune", temperature: 0.72, timeoutMs, cache, attempts: 2,
    baseTokens, capTokens: Math.round(baseTokens * 1.3), responseMimeType: "application/json", fallbackMinChars: 600,
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  const text = clean(ai?.text);
  if (!ai?.ok || isMock || !hasRenderableLlmText(text, { minChars: options.minLength || 300 })) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    throw error;
  }
  // 이 프롬프트는 한자 화이트리스트 병기를 허용한다(palace-prompts 규칙 D). 모델이 확실한 한자를 못 찾으면
  // 괄호만 열고 비우는 일이 있어 화면에 `천이궁( )` 이 남는다 — ziwei-ai 에서 실제로 났던 증상이라 같은
  // 후처리를 여기서도 건다. 병기된 한자는 그대로 두고 빈 괄호만 지운다.
  return { text: stripEmptyParens(text), provider, model: clean(ai?.model) };
}

// ── /prepare ──
async function handleEnsureAccess(request, env, route = "/api/ziwei-island-ai/prepare") {
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  const normalized = normalizePalaceInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");
  try { calculateZiweiAiChart(normalized.input, { year: new Date().getFullYear() }); }
  catch (error) { logZiweiIsland("Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "chart_data_failed", env, error }), "error"); return calculationFailed(); }
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();
  const pricing = getPricing();
  if (isAdmin(auth)) {
    return json({ ok: true, accessToken: await createAccessToken(env, { userId: auth.userId, accessType: "admin", idempotencyKey, inputHash: normalized.inputHash }), accessType: "admin" });
  }
  await connectDb(env);
  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId, env));
  if (!user) return loginRequired();
  const access = await withMongoRetry(env, () => resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash }));
  if (access.ok) {
    return json({ ok: true, accessToken: await createAccessToken(env, { userId: auth.userId, accessType: access.accessType, idempotencyKey, inputHash: normalized.inputHash, paymentId: access.paymentId || "" }), accessType: access.accessType });
  }
  if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
  const payment = await createOrReusePaymentPayload({ env, auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash });
  if (!payment.ok) return invalidInput(payment.message, 409);
  return json({ ok: false, reason: "PAYMENT_REQUIRED", message: MESSAGES.paymentRequired, paymentPayload: payment.paymentPayload }, { status: 402 });
}

async function resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey }) {
  const token = clean(body?.accessToken || request.headers.get("x-ziwei-island-access-token"));
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: "상담 접근 정보가 현재 입력값과 일치하지 않습니다." };
    }
    const accessType = clean(payload.accessType);
    if (!["admin", "paid", "pass", "subscription"].includes(accessType)) return { ok: false, reason: "PAYMENT_REQUIRED" };
    return { ok: true, accessType, paymentId: clean(payload.paymentId, 160) };
  }
  const paymentId = clean(body?.paymentId || body?.merchantUid || body?.merchant_uid, 160);
  if (paymentId) {
    const directVerify = await verifyPaymentForStart({ env, auth, paymentId, idempotencyKey, inputHash: normalized.inputHash, pricing });
    if (directVerify.ok) return directVerify;
  }
  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId, env));
  if (!user && !isAdmin(auth)) return { ok: false, reason: "LOGIN_REQUIRED" };
  const billingAccess = await withMongoRetry(env, () => resolveBillingGateAccess({ auth, user, body, pricing, idempotencyKey }));
  if (billingAccess?.ok) return billingAccess;
  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

// ── /start(=/generate) : 동기 생성 ──
async function handleStart(request, env, route = "/api/ziwei-island-ai/generate") {
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  const normalized = normalizePalaceInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();
  await connectDb(env);
  const pricing = getPricing();
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return paymentVerifyFailed();
  }
  const existing = await withMongoRetry(env, () => ZiweiAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean());
  if (existing && clean(existing.inputHash) !== normalized.inputHash) return invalidInput("같은 요청 키로 다른 상담 정보를 사용할 수 없습니다.", 409);
  if (existing?.status === "completed") return json(publicConsultation(existing));
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 300000) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "궁의 별을 읽고 있어요" }, { status: 202 });
  }
  let chart;
  try { chart = calculateZiweiAiChart(normalized.input, { year: new Date().getFullYear() }); }
  catch (error) { await restorePrepaidAccessOnFailure({ userId: auth.userId, access, idempotencyKey, pricing, error }); return calculationFailed(); }

  const sessionId = existing?.id || `zwisl_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
  const now = new Date();
  const seed = {
    id: sessionId, userId: clean(auth.userId), birthInfo: normalized.input.birthInfo, topic: normalized.input.topic, userQuestion: normalized.input.userQuestion,
    ziweiChart: chart, serviceType: FEATURE_KEY, palaceKey: normalized.input.palaceKey, sectionKeys: normalized.input.sectionKeys,
    accessType: access.accessType, paymentId: clean(access.paymentId, 160), messages: [], idempotencyKey, inputHash: normalized.inputHash, status: "generating", generationError: null,
  };
  if (existing) await ZiweiAiConsultation.updateOne({ id: existing.id }, { $set: { ...seed, updatedAt: now } });
  else {
    try { await ZiweiAiConsultation.create(seed); }
    catch (error) {
      if (error?.code === 11000) {
        const duplicate = await ZiweiAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicConsultation(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "궁의 별을 읽고 있어요" }, { status: 202 });
      }
      throw error;
    }
  }

  const runGeneration = async () => {
    try {
      const { prompt } = buildPalaceFirstPrompt(normalized.input.palaceKey, normalized.input, chart);
      const generated = await generatePalaceText(env, prompt, { minLength: 300, maxOutputTokens: PALACE_CONSULT_MAX_OUTPUT_TOKENS });
      await applyUsageOnce({ userId: auth.userId, sessionId, accessType: access.accessType, paymentId: access.paymentId || "", pricing, prepaid: access.prepaid === true });
      const firstUserMessage = normalized.input.userQuestion || normalized.input.topic;
      const completed = await ZiweiAiConsultation.findOneAndUpdate(
        { id: sessionId },
        { $set: { status: "completed", messages: [{ role: "user", content: firstUserMessage, createdAt: now }, { role: "assistant", content: generated.text, createdAt: new Date() }], llmMeta: { provider: generated.provider, model: generated.model, completedAt: new Date().toISOString() }, generationError: null } },
        { new: true },
      ).lean();
      logZiweiIsland("Generate Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
      return completed;
    } catch (error) {
      const restored = await restorePrepaidAccessOnFailure({ userId: auth.userId, access, idempotencyKey, pricing, error });
      logZiweiIsland("Refund Or Restore", { ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }), restored }, restored ? "info" : "warn");
      await ZiweiAiConsultation.updateOne({ id: sessionId }, { $set: { status: "generation_failed", generationError: { code: clean(error?.code || "LLM_GENERATION_FAILED", 80), message: clean(error?.message || error, 500), at: new Date().toISOString() } } }).catch(() => {});
      throw error;
    }
  };
  try { return json(publicConsultation(await runGeneration())); }
  catch { return json({ ok: false, reason: "LLM_ERROR", message: MESSAGES.llmFailed }, { status: 503 }); }
}

// ── /result 폴링 ──
async function handleResult(request, env) {
  let auth = null;
  try { auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true }); }
  catch { return json({ ok: false, retryable: true, reason: "DB_DEGRADED", message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요." }, { status: 503 }); }
  if (!auth) return loginRequired();
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("id") || url.searchParams.get("sessionId"), 120);
  await connectDb(env);
  if (!sessionId) {
    const rows = await ZiweiAiConsultation.find({ userId: clean(auth.userId), serviceType: FEATURE_KEY, status: "completed" })
      .sort({ updatedAt: -1 }).limit(10).select("id palaceKey topic birthInfo createdAt updatedAt").lean();
    return json({ ok: true, consultations: rows.map((row) => ({ id: clean(row.id), palaceKey: clean(row.palaceKey, 20), topic: clean(row.topic), name: clean(row.birthInfo?.name, 80), createdAt: row.createdAt, updatedAt: row.updatedAt })) });
  }
  const consultation = await ZiweiAiConsultation.findOne({ id: sessionId, userId: clean(auth.userId), serviceType: FEATURE_KEY }).lean();
  if (!consultation) return notFound();
  if (consultation.status === "generating") return json({ ok: true, sessionId: consultation.id, status: "generating", message: "궁의 별을 읽고 있어요" }, { status: 202, headers: { "Retry-After": "3" } });
  if (consultation.status !== "completed") return json({ ok: false, reason: "GENERATION_FAILED", message: MESSAGES.llmFailed }, { status: 409 });
  return json(publicConsultation(consultation));
}

export async function handleZiweiIslandAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/ziwei-island-ai");
  try {
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (method === "POST" && (path === "/prepare" || path === "/ensure-access")) return await handleEnsureAccess(request, env, `/api/ziwei-island-ai${path}`);
    if (method === "POST" && (path === "/generate" || path === "/start")) return await handleStart(request, env, `/api/ziwei-island-ai${path}`);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[ziwei-island-ai]", clean(error?.code || error?.message || error, 500));
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) {
      return json({ ok: false, retryable: true, reason: "DB_DEGRADED", message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
    }
    return serverError();
  }
}

export const __ziweiIslandTestUtils = { normalizePalaceInput, getPricing, publicConsultation, FEATURE_KEY, SERVICE_KEY, ACCESS_TOKEN_TYPE };
