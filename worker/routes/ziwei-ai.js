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
import { calculateZiweiAiChart } from "../lib/ziwei-ai-chart.js";

const SERVICE_KEY = "ziwei-ai";
const FEATURE_KEY = "ziwei-ai-consultation";
const ACCESS_TOKEN_TYPE = "ziwei-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "자미두수 AI 상담";
const COIN_PRICE = 300;
const AMOUNT_KRW = 30000;

const MESSAGES = Object.freeze({
  login: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "자미두수 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  invalidInput: "생년월일과 출생시간 정보를 다시 확인해 주세요.",
  calculationFailed: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  serverFailed: "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.",
  llmFailed: "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.",
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

const FORBIDDEN_RESULT_PATTERN = /\bAI\b|PDF|챕터|chapter|\bjob\b|\bprogress\b|프롬프트|시스템/i;

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
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
  if (["other", "기타", "unknown"].includes(text)) return text === "unknown" ? "" : "other";
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

function normalizeConsultationInput(body = {}) {
  const birthSource = body.birthInfo && typeof body.birthInfo === "object" ? body.birthInfo : body;
  const name = clean(body.name ?? body.nickname ?? birthSource.name ?? birthSource.nickname, 80);
  const gender = normalizeGender(body.gender ?? birthSource.gender);
  const birthDate = clean(body.birthDate ?? birthSource.birthDate, 10);
  const birthTimeUnknown = body.birthTimeUnknown === true || birthSource.birthTimeUnknown === true;
  const birthTime = birthTimeUnknown ? "" : clean(body.birthTime ?? birthSource.birthTime, 5);
  const calendarType = normalizeCalendarType(body.calendarType ?? birthSource.calendarType);
  const isLeapMonth = body.isLeapMonth === true || birthSource.isLeapMonth === true;
  const topic = clean(body.topic ?? body.consultationTopic, 80);
  const userQuestion = clean(body.userQuestion ?? body.question ?? body.message, 1200);

  if (!gender) return { ok: false, message: MESSAGES.invalidInput };
  if (!isValidDateKey(birthDate)) return { ok: false, message: MESSAGES.invalidInput };
  if (!birthTimeUnknown && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) return { ok: false, message: MESSAGES.invalidInput };
  if (!TOPICS.has(topic)) return { ok: false, message: "상담 주제를 다시 선택해 주세요." };
  if (userQuestion && userQuestion.length < 2) return { ok: false, message: "현재 가장 궁금한 질문을 조금 더 구체적으로 적어 주세요." };

  const normalized = {
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
    .select("email name phoneNumber points role profileSubscription subscription membership pass entitlement paidFeatures unlockedFeatures recentConsumeRequestIds usagePasses")
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

  if (signal.includes("pass") || signal.includes("membership_pass") || signal.includes("usage_pass")) {
    const pass = normalizeHoneyPassEntitlement(user || {});
    const ctx = getBillingEvidenceContext(body);
    const usageMarker = `usage-pass:${FEATURE_KEY}:${idempotencyKey}`;
    const usagePassConsumed = Array.isArray(user?.recentConsumeRequestIds) && user.recentConsumeRequestIds.includes(usageMarker);
    if (canUseByPass(pass, pricing.coinPrice) || usagePassConsumed) {
      return {
        ok: true,
        accessType: "pass",
        paymentId: tokens[0] || "",
        prepaid: true,
        evidenceType: usagePassConsumed ? "usage_pass" : "pass",
        usageMarker: usagePassConsumed ? usageMarker : "",
        usageCategory: clean(ctx.consume.category || ctx.accessGrant.category, 120),
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
    storeId: config.storeId,
    channelKey: config.channelKey,
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
      paymentMode: "DIRECT_KRW",
      requestId: idempotencyKey,
      idempotencyKey,
    },
  };
}

async function createOrReusePaymentPayload({ env, auth, user, pricing, idempotencyKey, inputHash }) {
  const config = getPortOnePublicConfig(env || {});
  if (!config.configured) {
    return { ok: false, serverError: true, message: "결제 설정을 확인할 수 없습니다." };
  }

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
    "당신은 자미두수를 상담하는 최고 수준의 자미두수 명반 상담가입니다.",
    "",
    "사용자의 생년월일, 성별, 출생시간, 양력/음력 정보와 계산된 자미두수 명반 데이터를 바탕으로 사용자의 삶의 흐름을 상담형으로 해석합니다.",
    "",
    "반드시 지켜야 할 원칙:",
    "1. 보고서처럼 딱딱하게 쓰지 말고, 실제 상담사가 명반을 놓고 설명하듯 자연스럽게 답변합니다.",
    "2. 명궁, 신궁, 12궁, 주성, 보성, 살성, 사화, 삼방사정, 대운과 세운의 흐름을 반영합니다.",
    "3. 별 이름만 나열하지 말고, 사용자의 삶에서 어떤 성향과 사건 패턴으로 나타나는지 풀어냅니다.",
    "4. 명궁은 타고난 기질과 삶의 기본 방향으로 해석합니다.",
    "5. 신궁은 후천적으로 강해지는 삶의 방향과 행동 패턴으로 해석합니다.",
    "6. 관록궁은 직업, 사회적 역할, 일의 방식으로 해석합니다.",
    "7. 재백궁은 돈의 흐름, 벌고 쓰는 방식, 재물 감각으로 해석합니다.",
    "8. 부부궁은 연애, 결혼, 친밀한 관계의 패턴으로 해석합니다.",
    "9. 복덕궁은 내면 만족감, 정신적 안정, 외로움, 삶의 여백으로 해석합니다.",
    "10. 질액궁은 건강을 단정하지 말고 생활 습관과 취약 경향으로 조심스럽게 해석합니다.",
    "11. 사화는 삶에서 강하게 작동하는 방향성으로 해석하되, 화기를 공포스럽게 말하지 않습니다.",
    "12. 살성은 위험이 아니라 긴장, 압박, 돌파력, 반복되는 시험으로 해석합니다.",
    "13. 운세를 절대적 예언처럼 말하지 않습니다.",
    "14. 불안감을 조장하지 않습니다.",
    "15. 같은 문장을 반복하지 않습니다.",
    "16. PDF, 챕터, job, progress, 프롬프트, 시스템 같은 표현을 결과에 노출하지 않습니다.",
    "17. 사용자가 선택한 상담 주제와 자유 질문을 가장 깊게 다룹니다.",
    "18. 마지막에는 사용자가 추가 질문을 할 수 있도록 자연스럽게 상담을 이어갑니다.",
  ].join("\n");
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
    "첫 답변은 다음 흐름을 자연스럽게 포함해 주세요.",
    "명반의 핵심 인상, 명궁과 신궁으로 본 타고난 방향, 가장 강한 별의 흐름, 반복되기 쉬운 패턴, 직업/사업 방향, 재물 흐름, 연애/결혼 흐름, 인간관계와 사회적 위치, 내면의 불안과 복덕의 흐름, 현재 상담 주제에 대한 집중 해석, 앞으로 살려야 할 방향, 조심해야 할 선택, 현실적인 행동 조언, 마지막 상담 메시지.",
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
    "이전 상담의 흐름을 이어받아 새 질문에 직접 답해 주세요. 명반의 궁, 별, 사화, 대운/세운 연결을 설명하되 사용자가 이해할 수 있는 상담형 문장으로 풀어 주세요.",
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

async function generateConsultationText(env, prompt, options = {}) {
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: 0.72,
    maxOutputTokens: options.maxOutputTokens || 7000,
    timeoutMs: Number(env?.ZIWEI_AI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 55000),
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  const text = clean(ai?.text);
  if (!ai?.ok || isMock || text.length < (options.minLength || 180)) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    throw error;
  }
  if (!FORBIDDEN_RESULT_PATTERN.test(text)) return { text, provider, model: clean(ai?.model) };

  const repair = await callGeminiText(env, [
    "다음 상담 답변에서 개발 또는 제작 과정처럼 들리는 표현을 모두 빼고, 자연스러운 자미두수 상담문으로만 다시 써 주세요.",
    "금지 표현: AI, PDF, 챕터, chapter, job, progress, 프롬프트, 시스템",
    "",
    text,
  ].join("\n"), {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: 0.58,
    maxOutputTokens: options.maxOutputTokens || 7000,
  });
  const repaired = clean(repair?.text);
  return {
    text: cleanForbiddenResult(repair?.ok && repaired.length >= 120 ? repaired : text),
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
    if (evidenceType === "usage_pass" && access.usageMarker && access.usageCategory) {
      await User.updateOne(
        {
          _id: userId,
          recentConsumeRequestIds: access.usageMarker,
          "usagePasses.category": access.usageCategory,
        },
        {
          $inc: { "usagePasses.$.remainingUses": 1 },
          $set: { "usagePasses.$.updatedAt": now },
          $pull: { recentConsumeRequestIds: access.usageMarker },
        },
      );
      return true;
    }

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

  if (accessType === "pass") {
    await User.updateOne(
      { _id: userId, "profileSubscription.passRemainingUses": { $gt: 0 } },
      {
        $inc: {
          "profileSubscription.passRemainingUses": -1,
          "profileSubscription.passUsedCount": 1,
        },
      },
    ).catch(() => {});
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

async function handleEnsureAccess(request, env) {
  const body = await readJson(request);
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  const pricing = getPricing();
  if (isAdmin(auth)) {
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
    return { ok: true, accessType: clean(payload.accessType), paymentId: clean(payload.paymentId, 160) };
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
  return resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash });
}

async function handleStart(request, env) {
  const body = await readJson(request);
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return paymentVerifyFailed();
  }

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
    chart = calculateZiweiAiChart(normalized.input, { year: new Date().getFullYear() });
  } catch (error) {
    console.warn("[ziwei-ai] chart calculation failed", {
      inputHash: normalized.inputHash,
      code: clean(error?.code || ""),
      message: clean(error?.message || error, 300),
    });
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
    const generated = await generateConsultationText(env, buildFirstPrompt(normalized.input, chart), { minLength: 360, maxOutputTokens: 8000 });
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
    return json(publicConsultation(completed));
  } catch (error) {
    await restorePrepaidAccessOnFailure({ userId: auth.userId, access, idempotencyKey, pricing, error });
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
    const generated = await generateConsultationText(env, buildFollowUpPrompt(consultation, message), {
      minLength: 100,
      maxOutputTokens: 5000,
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
    return json(publicConsultation(updated));
  } catch (error) {
    return json({ ok: false, reason: "LLM_ERROR", message: MESSAGES.llmFailed }, { status: 503 });
  }
}

export async function handleZiweiAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/ziwei-ai");

  try {
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
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
  cleanForbiddenResult,
};
