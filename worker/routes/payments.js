import { connectDb, mongoose } from "../lib/db.js";
import { Payment, PaymentFailureLog, PointHistory, User } from "../lib/models.js";
import { requireAuth } from "../lib/auth.js";
import { cancelPortOnePayment, fetchPortOnePayment, getPortOnePublicConfig, getPortOneWebhookSecret } from "../lib/portone.js";
import { resolveChargePointsByAmount, validatePointChargePayload } from "../lib/validation.js";
import { getEnv } from "../lib/env.js";
import { getRequestMeta, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { buildConfigErrorBody, evaluateFeatureKeyHealth } from "../lib/key-health.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";

function toDateFromUnixSeconds(value) {
  const unixSeconds = Number(value);
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return new Date();
  return new Date(unixSeconds * 1000);
}

function normalizePaymentMethod(value) {
  const method = String(value || "unknown").trim();
  return method ? method.slice(0, 32) : "unknown";
}

function normalizePortOneCurrency(value) {
  return String(value || "").trim().toUpperCase();
}

function isPortOneKrwCurrency(value) {
  const currency = normalizePortOneCurrency(value);
  return currency === "KRW" || currency === "CURRENCY_KRW";
}

function normalizeIdempotencyKey(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return normalized.slice(0, 120);
}

function base64ToBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function timingSafeEqualText(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function parseStandardWebhookSignatures(headerValue) {
  return String(headerValue || "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && part.startsWith("v1,") === false)
    .map((part) => part.replace(/^v1[=:]?/i, "").trim())
    .filter(Boolean);
}

function getWebhookSecretBytes(secret) {
  const value = String(secret || "").trim();
  if (value.startsWith("whsec_")) {
    try {
      return base64ToBytes(value.slice("whsec_".length));
    } catch (_) {}
  }
  return new TextEncoder().encode(value);
}

async function signStandardWebhookPayload(secret, webhookId, timestamp, rawBody) {
  const key = await crypto.subtle.importKey(
    "raw",
    getWebhookSecretBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedContent = `${webhookId}.${timestamp}.${rawBody}`;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
  return bytesToBase64(new Uint8Array(signature));
}

async function verifyPortOneWebhookSignature(secret, rawBody, headers) {
  const webhookId = String(headers.get("webhook-id") || headers.get("x-webhook-id") || "").trim();
  const timestamp = String(headers.get("webhook-timestamp") || headers.get("x-webhook-timestamp") || "").trim();
  const signatureHeader = String(headers.get("webhook-signature") || headers.get("x-webhook-signature") || "").trim();
  if (!webhookId || !timestamp || !signatureHeader) return false;

  const expected = await signStandardWebhookPayload(secret, webhookId, timestamp, rawBody);
  const signatures = parseStandardWebhookSignatures(signatureHeader);
  return signatures.some((signature) => timingSafeEqualText(signature, expected));
}

function resolveIdempotencyKey(request, body) {
  return normalizeIdempotencyKey(
    body?.idempotencyKey
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key")
      || "",
  );
}

function buildMerchantUid(userId) {
  const userTag = String(userId || "guest").replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "guest";
  const randomTag = Math.random().toString(36).slice(2, 8);
  return `md_${Date.now()}_${userTag}_${randomTag}`;
}

function isDigitalContentPaymentRequest(body = {}) {
  const paymentType = String(body?.paymentType || body?.type || "").trim().toLowerCase();
  return paymentType === "digital_content"
    || paymentType === "single_purchase"
    || Boolean(body?.featureKey || body?.reason || body?.categoryKey || body?.subFeatureKey || body?.productId);
}

const USAGE_PASS_PRODUCT_CATALOG = Object.freeze({
  saju_unlock_3: Object.freeze({ id: "saju_unlock_3", category: "saju_unlock", uses: 3, paymentAmount: 12000, coinPrice: 150, title: "사주 잠금 서비스 3개 해제권" }),
  saju_unlock_5: Object.freeze({ id: "saju_unlock_5", category: "saju_unlock", uses: 5, paymentAmount: 19000, coinPrice: 250, title: "사주 잠금 서비스 5개 해제권" }),
  fortune_30_3: Object.freeze({ id: "fortune_30_3", category: "fortune_30", uses: 3, paymentAmount: 6900, coinPrice: 90, title: "30코인 이하 운세 3회 이용권" }),
  fortune_30_10: Object.freeze({ id: "fortune_30_10", category: "fortune_30", uses: 10, paymentAmount: 22500, coinPrice: 300, title: "30코인 이하 운세 10회 이용권" }),
  fortune_30_30: Object.freeze({ id: "fortune_30_30", category: "fortune_30", uses: 30, paymentAmount: 63000, coinPrice: 900, title: "30코인 이하 운세 30회 이용권" }),
  fortune_50_3: Object.freeze({ id: "fortune_50_3", category: "fortune_50", uses: 3, paymentAmount: 11500, coinPrice: 150, title: "50코인 이하 운세 3회 이용권" }),
  fortune_50_10: Object.freeze({ id: "fortune_50_10", category: "fortune_50", uses: 10, paymentAmount: 37500, coinPrice: 500, title: "50코인 이하 운세 10회 이용권" }),
  fortune_50_30: Object.freeze({ id: "fortune_50_30", category: "fortune_50", uses: 30, paymentAmount: 105000, coinPrice: 1500, title: "50코인 이하 운세 30회 이용권" }),
  compat_3: Object.freeze({ id: "compat_3", category: "compat", uses: 3, paymentAmount: 11500, coinPrice: 150, title: "운세 서비스 궁합 3회 이용권" }),
  compat_10: Object.freeze({ id: "compat_10", category: "compat", uses: 10, paymentAmount: 37500, coinPrice: 500, title: "운세 서비스 궁합 10회 이용권" }),
  compat_30: Object.freeze({ id: "compat_30", category: "compat", uses: 30, paymentAmount: 105000, coinPrice: 1500, title: "운세 서비스 궁합 30회 이용권" }),
});

function resolveUsagePassProductFromBody(body = {}) {
  const productId = String(body?.productId || "").trim().toLowerCase();
  if (!productId) return null;
  return USAGE_PASS_PRODUCT_CATALOG[productId] || null;
}

function buildUsagePassPricing(product) {
  return {
    categoryKey: `${product.category}-usage-pass`,
    categoryLabel: `${product.category} 이용권`,
    subFeatureKey: String(product.id),
    featureKey: `usage-pass-${product.category}-${product.uses}`,
    cost: Number(product.coinPrice || 0),
    coinPrice: Number(product.coinPrice || 0),
    displayUnit: "coin",
    displayPrice: `${Number(product.coinPrice || 0).toLocaleString("ko-KR")}코인`,
    reason: String(product.title || "횟수형 이용권"),
    currency: "KRW",
    amountKRW: Number(product.paymentAmount || 0),
    cashPrice: Number(product.paymentAmount || 0),
    paymentMode: "single_purchase",
    coinDisplayOnly: true,
    usagePass: {
      category: String(product.category),
      uses: Number(product.uses || 0),
      productId: String(product.id || ""),
    },
  };
}

function resolveDigitalContentPricing(body = {}) {
  const usagePassProduct = resolveUsagePassProductFromBody(body);
  if (usagePassProduct) {
    const pricing = buildUsagePassPricing(usagePassProduct);
    return {
      ok: true,
      pricing,
      paymentAmount: Number(pricing.amountKRW || 0),
      coinPrice: Number(pricing.coinPrice || 0),
      source: "usage-pass-product",
      usagePass: pricing.usagePass,
    };
  }

  const resolved = getBillingFeaturePricing({
    categoryKey: body?.categoryKey,
    subFeatureKey: body?.subFeatureKey,
    featureKey: body?.featureKey,
    reason: body?.reason,
    mode: body?.mode,
    reportMode: body?.reportMode,
  });

  if (!resolved?.ok || !resolved.pricing) {
    return {
      ok: false,
      status: 400,
      message: resolved?.message || "결제 상품 정보를 확인할 수 없습니다.",
      code: "PRICE_NOT_FOUND",
    };
  }

  const pricing = resolved.pricing;
  const paymentAmount = Number(pricing.amountKRW || pricing.cashPrice || 0);
  const coinPrice = Number(pricing.coinPrice || pricing.cost || 0);
  if (!Number.isInteger(paymentAmount) || paymentAmount <= 0 || !Number.isInteger(coinPrice) || coinPrice <= 0) {
    return {
      ok: false,
      status: 400,
      message: "결제 상품 가격표가 올바르지 않습니다.",
      code: "INVALID_PRODUCT_PRICE",
    };
  }

  return { ok: true, pricing, paymentAmount, coinPrice, source: resolved.source || "pricing" };
}

function buildDigitalProductName(body = {}, pricing = {}) {
  const label = String(body?.productName || pricing.reason || pricing.featureKey || "디지털 운세 콘텐츠").trim();
  return label.slice(0, 80) || "디지털 운세 콘텐츠";
}

async function grantUsagePassToUser({ userId, product, paymentId, paidAt, session = null }) {
  if (!userId || !product) return null;

  const findQuery = User.findById(userId).select("usagePasses points");
  if (session) findQuery.session(session);
  const currentUser = await findQuery.lean();
  if (!currentUser) return null;

  const nextUsagePasses = Array.isArray(currentUser.usagePasses)
    ? currentUser.usagePasses.map((entry) => ({ ...entry }))
    : [];

  const category = String(product.category || "").trim();
  const addedUses = Number(product.uses || 0);
  if (!category || !Number.isInteger(addedUses) || addedUses <= 0) return null;

  const now = paidAt instanceof Date ? paidAt : new Date();
  const index = nextUsagePasses.findIndex((entry) => String(entry?.category || "") === category);
  if (index >= 0) {
    const prevRemaining = Number(nextUsagePasses[index]?.remainingUses || 0);
    const prevPurchased = Number(nextUsagePasses[index]?.purchasedUses || 0);
    nextUsagePasses[index] = {
      ...nextUsagePasses[index],
      category,
      remainingUses: Math.max(0, prevRemaining) + addedUses,
      purchasedUses: Math.max(0, prevPurchased) + addedUses,
      productId: String(product.id || ""),
      lastPaymentId: String(paymentId || ""),
      lastGrantedAt: now,
      updatedAt: now,
    };
  } else {
    nextUsagePasses.push({
      category,
      remainingUses: addedUses,
      purchasedUses: addedUses,
      productId: String(product.id || ""),
      lastPaymentId: String(paymentId || ""),
      lastGrantedAt: now,
      updatedAt: now,
    });
  }

  const updateQuery = User.findByIdAndUpdate(
    userId,
    { $set: { usagePasses: nextUsagePasses } },
    { returnDocument: "after", projection: { usagePasses: 1, points: 1 } },
  );
  if (session) updateQuery.session(session);
  const updatedUser = await updateQuery.lean();
  const updatedPasses = Array.isArray(updatedUser?.usagePasses) ? updatedUser.usagePasses : [];
  const resolved = updatedPasses.find((entry) => String(entry?.category || "") === category);

  return {
    category,
    productId: String(product.id || ""),
    addedUses,
    remainingUses: Number(resolved?.remainingUses || 0),
    points: Number(updatedUser?.points || 0),
  };
}

const SUBSCRIPTION_BASE_PLANS = {
  standard: { tier: "standard", name: "스탠다드 달빛 이용권", monthlyWonPrice: 9900, profileLimit: 3, membershipCreditGrant: 0 },
  premium: { tier: "premium", name: "프리미엄 달빛 이용권", monthlyWonPrice: 29900, profileLimit: 7, membershipCreditGrant: 0 },
  vvip: { tier: "vvip", name: "VVIP 달빛 이용권", monthlyWonPrice: 59000, profileLimit: 15, membershipCreditGrant: 0 },
};

const SUBSCRIPTION_DURATION_DISCOUNTS = Object.freeze({
  1: 0,
  3: 0.05,
  6: 0.10,
  12: 0.30,
});

const SUBSCRIPTION_TIER_RANK = Object.freeze({
  free: 0,
  standard: 1,
  premium: 2,
  vvip: 3,
});

function resolveSubscriptionPlan(tierRaw, durationMonthsRaw = 1) {
  const tier = String(tierRaw || "").trim().toLowerCase();
  const base = SUBSCRIPTION_BASE_PLANS[tier];
  if (!base) return null;
  const durationMonths = Number(durationMonthsRaw || 1);
  const discount = SUBSCRIPTION_DURATION_DISCOUNTS[durationMonths];
  if (discount === undefined) return null;
  return {
    ...base,
    planId: `${tier}_${durationMonths}m`,
    durationMonths,
    durationDays: durationMonths * 30,
    wonPrice: Math.round(base.monthlyWonPrice * durationMonths * (1 - discount)),
    productType: "membership_pass",
  };
}

function buildSubscriptionMerchantUid(userId, tier, durationMonths = 1) {
  const userTag = String(userId || "guest").replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "guest";
  const randomTag = Math.random().toString(36).slice(2, 6);
  return `sub_${Date.now()}_${tier}_${durationMonths}m_${userTag}_${randomTag}`;
}

function buildSubscriptionCustomerUid(userId) {
  return `cdsub_${String(userId || "guest").replace(/[^a-zA-Z0-9]/g, "")}`;
}

function toValidDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function toIsoOrNull(value) {
  const date = toValidDate(value);
  return date ? date.toISOString() : null;
}

async function findUserByIdRaw(userId, projection = {}) {
  const normalizedId = String(userId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(normalizedId)) return null;

  return User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(normalizedId) },
    { projection },
  );
}

async function findRecentPaymentsForUser(userId, limit = 20) {
  const normalizedId = String(userId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(normalizedId)) return [];

  const objectId = new mongoose.Types.ObjectId(normalizedId);
  return mongoose.connection.collection("payments")
    .find({ userId: { $in: [objectId, normalizedId] } })
    .sort({ createdAt: -1, paidAt: -1 })
    .limit(limit)
    .toArray();
}

function hasActiveSubscriptionConflict(sub) {
  const tier = String(sub?.tier || "free").toLowerCase();
  const expAt = toValidDate(sub?.expiresAt);
  return tier !== "free" && !!expAt && expAt.getTime() > Date.now();
}

function getTierRank(tierRaw) {
  const tier = String(tierRaw || "free").trim().toLowerCase();
  return Number(SUBSCRIPTION_TIER_RANK[tier] || 0);
}

function evaluateSubscriptionTierTransition(currentSub, requestedTierRaw) {
  const requestedTier = String(requestedTierRaw || "").trim().toLowerCase();
  const requestedRank = getTierRank(requestedTier);
  const active = hasActiveSubscriptionConflict(currentSub);
  if (!active) {
    return { allow: true, code: "OK", isUpgrade: false, activeTier: "free" };
  }

  const activeTier = String(currentSub?.tier || "free").trim().toLowerCase();
  const activeRank = getTierRank(activeTier);

  if (requestedRank >= activeRank) {
    return { allow: true, code: requestedRank > activeRank ? "UPGRADE_ALLOWED" : "EXTENSION_ALLOWED", isUpgrade: requestedRank > activeRank, activeTier };
  }

  if (requestedRank < activeRank) {
    return { allow: false, code: "SUBSCRIPTION_DOWNGRADE_BLOCKED", isUpgrade: false, activeTier };
  }

  return { allow: false, code: "SUBSCRIPTION_CONFLICT", isUpgrade: false, activeTier };
}

function parseCustomDataUserId(customData) {
  if (!customData) return null;

  let parsed = customData;
  if (typeof customData === "string") {
    try {
      parsed = JSON.parse(customData);
    } catch (e) {
      return null;
    }
  }

  const userId = String(parsed?.userId || parsed?.uid || "").trim();
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;
  return userId;
}

function formatPaymentResponse(payment) {
  if (!payment) return null;

  const approvalNumber = String(
    payment?.rawPortOne?.apply_num
      || payment?.rawPortOne?.apply_num_vbank
      || "",
  ).trim() || null;
  const receiptUrl = String(payment?.rawPortOne?.receipt_url || "").trim() || null;
  const cancelAmount = Number(payment?.rawPortOne?.cancel_amount || 0);
  const cancelledAt = payment?.rawPortOne?.cancelled_at
    ? toDateFromUnixSeconds(payment.rawPortOne.cancelled_at)
    : null;

  return {
    id: String(payment._id),
    impUid: payment.impUid,
    merchantUid: payment.merchantUid,
    paymentAmount: Number(payment.paymentAmount || 0),
    coinPrice: Number(payment.coinPrice || payment.expectedChargedPoints || 0),
    membershipCreditCost: Number(payment.membershipCreditCost || 0),
    chargedPoints: Number(payment.chargedPoints || 0),
    featureKey: String(payment.featureKey || ""),
    productId: String(payment.productId || ""),
    accessType: String(payment.accessType || ""),
    requestId: String(payment.requestId || ""),
    reportId: String(payment.reportId || ""),
    sessionId: String(payment.sessionId || ""),
    paymentMethod: payment.paymentMethod,
    paymentType: payment.paymentType || "point_charge",
    subscriptionTier: payment.subscriptionTier || "",
    status: payment.status,
    paidAt: payment.paidAt,
    failureCode: payment.failureCode,
    failureMessage: payment.failureMessage,
    failureStage: payment.failureStage,
    lastErrorAt: payment.lastErrorAt,
    approvalNumber,
    receiptUrl,
    cancelAmount,
    cancelledAt,
  };
}

function summarizePayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const clone = { ...payload };
  if (clone.card_number) clone.card_number = "[redacted]";
  if (clone.customer_uid) clone.customer_uid = "[redacted]";
  return clone;
}

async function writeFailureLog(params = {}) {
  const {
    request,
    userId,
    impUid,
    merchantUid,
    source,
    stage,
    code,
    message,
    status,
    expectedAmount,
    clientAmount,
    portOneAmount,
    portOneStatus,
    payload,
    rawPortOne,
  } = params;

  await PaymentFailureLog.create({
    userId: userId && mongoose.Types.ObjectId.isValid(String(userId)) ? userId : undefined,
    impUid,
    merchantUid,
    source: source || "system",
    stage: stage || "unknown",
    code,
    message,
    status,
    expectedAmount,
    clientAmount,
    portOneAmount,
    portOneStatus,
    requestMeta: request ? getRequestMeta(request) : undefined,
    payload: summarizePayload(payload),
    rawPortOne,
  }).catch(() => {});
}

async function getUserPoints(userId) {
  const user = await User.findById(userId).select("points").lean();
  return Number(user?.points || 0);
}

async function createDigitalContentAccessEvidence({ userId, payment, body = {}, source, paidAt, session = null }) {
  const featureKey = String(payment?.featureKey || body?.featureKey || body?.subFeatureKey || "").trim();
  const paymentId = String(payment?._id || "").trim();
  if (!featureKey || !paymentId) return null;

  const existingQuery = PointHistory.findOne({
    userId,
    kind: "deduct",
    featureKey,
    $or: [
      { paymentId: payment._id },
      { "metadata.paymentId": paymentId },
      { "metadata.purchaseId": paymentId },
    ],
  }).select("_id createdAt delta featureKey reason metadata");
  if (session) existingQuery.session(session);
  const existing = await existingQuery.lean();
  if (existing) return existing;

  const userQuery = User.findById(userId).select("points");
  if (session) userQuery.session(session);
  const user = await userQuery.lean();
  const currentPoints = Number(user?.points || 0);
  const coinPrice = Number(payment?.coinPrice || payment?.expectedChargedPoints || body?.coinPrice || 0);
  const requestId = String(payment?.requestId || body?.requestId || "").trim();
  const reportId = String(payment?.reportId || body?.reportId || "").trim();
  const sessionId = String(payment?.sessionId || body?.sessionId || body?.reportSessionId || "").trim();

  const docs = [{
    userId,
    kind: "deduct",
    delta: -Math.max(0, coinPrice),
    balanceAfter: currentPoints,
    reason: String(payment?.pricingSnapshot?.reason || body?.reason || "single_purchase_access"),
    featureKey,
    paymentId: payment._id,
    impUid: String(payment?.impUid || body?.impUid || body?.paymentId || ""),
    merchantUid: String(payment?.merchantUid || body?.merchantUid || body?.merchant_uid || ""),
    metadata: {
      accessType: "single_purchase",
      source,
      paymentId,
      purchaseId: paymentId,
      requestId,
      reportId,
      sessionId,
      reportSessionId: sessionId,
      featureKey,
      coinPrice,
      paidAmount: Number(payment?.paymentAmount || 0),
      paidAt: paidAt ? paidAt.toISOString() : null,
    },
  }];

  const created = session
    ? await PointHistory.create(docs, { session })
    : await PointHistory.create(docs);
  return Array.isArray(created) ? created[0] : created;
}

async function markPaymentFailure(paymentRecord, patch = {}) {
  if (!paymentRecord?._id) return;

  await Payment.findByIdAndUpdate(paymentRecord._id, {
    $set: {
      status: patch.status || "failed",
      paymentMethod: patch.paymentMethod || paymentRecord.paymentMethod || "unknown",
      rawPortOne: patch.rawPortOne,
      failureCode: patch.failureCode,
      failureMessage: patch.failureMessage,
      failureStage: patch.failureStage,
      lastErrorAt: new Date(),
    },
    ...(patch.incrementAttempt ? { $inc: { confirmAttempts: 1 } } : {}),
  }).catch(() => {});
}

async function findPaymentRecord(impUid, merchantUid) {
  if (impUid) {
    const byImp = await Payment.findOne({ impUid }).lean();
    if (byImp) return byImp;
  }

  if (merchantUid) {
    const byMerchant = await Payment.findOne({ merchantUid }).lean();
    if (byMerchant) return byMerchant;
  }

  return null;
}

async function ensurePaymentRecord({
  existing,
  userId,
  impUid,
  merchantUid,
  paymentAmount,
  expectedChargedPoints,
  paymentMethod,
  source,
}) {
  if (existing) return existing;

  const created = await Payment.create({
    userId,
    impUid,
    merchantUid: merchantUid || undefined,
    paymentAmount,
    expectedChargedPoints,
    chargedPoints: 0,
    paymentMethod,
    status: "pending",
    source,
  });

  return created.toObject();
}

function isTransactionUnsupported(error) {
  return /Transaction numbers are only allowed|replica set|Transaction .* not supported/i
    .test(String(error?.message || ""));
}

async function settlePaymentByImpUid({
  env,
  impUid,
  requestedUserId,
  requestedAmount,
  requestedChargePoints,
  requestedPaymentMethod,
  merchantUidHint,
  source,
  strictAmountMatch,
  request,
  body,
}) {
  let portOnePayment;
  try {
    portOnePayment = await fetchPortOnePayment(env, impUid);
  } catch (error) {
    await writeFailureLog({
      request,
      userId: requestedUserId,
      impUid,
      merchantUid: merchantUidHint,
      source,
      stage: "portone_fetch",
      code: "portone_fetch_failed",
      message: error?.message || "PortOne payment lookup failed.",
      status: 502,
      payload: body,
    });

    return {
      ok: false,
      status: 502,
      message: "Payment lookup failed. Please try again.",
    };
  }

  const portOneStatus = String(portOnePayment.status || "").toLowerCase();
  const portOneAmount = Number(portOnePayment.amount);
  const portOneCurrency = normalizePortOneCurrency(portOnePayment.currency);
  const merchantUid = String(portOnePayment.merchant_uid || merchantUidHint || "").trim();
  const paymentMethod = normalizePaymentMethod(portOnePayment.pay_method || requestedPaymentMethod);

  let paymentRecord = await findPaymentRecord(impUid, merchantUid);
  const customDataUserId = parseCustomDataUserId(portOnePayment.custom_data);
  const ownerUserId = paymentRecord?.userId
    ? String(paymentRecord.userId)
    : (requestedUserId ? String(requestedUserId) : customDataUserId);

  if (!ownerUserId || !mongoose.Types.ObjectId.isValid(ownerUserId)) {
    await writeFailureLog({
      request,
      userId: requestedUserId,
      impUid,
      merchantUid,
      source,
      stage: "owner_resolve",
      code: "owner_not_found",
      message: "Could not resolve the payment owner.",
      status: 400,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return { ok: false, status: 400, message: "Could not resolve the payment owner." };
  }

  if (requestedUserId && String(requestedUserId) !== ownerUserId) {
    await writeFailureLog({
      request,
      userId: requestedUserId,
      impUid,
      merchantUid,
      source,
      stage: "owner_mismatch",
      code: "forbidden_owner_mismatch",
      message: "Only your own payment can be processed.",
      status: 403,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return { ok: false, status: 403, message: "Only your own payment can be processed." };
  }

  const expectedAmount = Number.isInteger(Number(requestedAmount))
    ? Number(requestedAmount)
    : Number(paymentRecord?.paymentAmount || 0);
  const expectedChargedPoints = Number.isInteger(Number(requestedChargePoints))
    ? Number(requestedChargePoints)
    : Number(paymentRecord?.expectedChargedPoints || 0);

  paymentRecord = await ensurePaymentRecord({
    existing: paymentRecord,
    userId: ownerUserId,
    impUid,
    merchantUid,
    paymentAmount: expectedAmount > 0 ? expectedAmount : Math.max(Number(portOneAmount) || 0, 0),
    expectedChargedPoints,
    paymentMethod,
    source,
  });

  const paymentType = String(paymentRecord?.paymentType || "point_charge").trim();
  const isDigitalContentPayment = paymentType === "digital_content";
  const usagePassProduct = isDigitalContentPayment ? resolveUsagePassProductFromBody(body) : null;

  if (paymentType === "point_charge" && paymentRecord.status !== "success") {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "point_charge_disabled",
      failureMessage: "Point charge settlement is disabled.",
      failureStage: "policy_validate",
      incrementAttempt: true,
    });
    return {
      ok: false,
      status: 410,
      message: "선불형 잔액 결제는 더 이상 처리하지 않습니다. 상품별 원화 단건 결제를 이용해 주세요.",
    };
  }

  if (paymentRecord.status === "success") {
    const paidAt = paymentRecord.paidAt ? new Date(paymentRecord.paidAt) : null;
    if (isDigitalContentPayment) {
      await createDigitalContentAccessEvidence({
        userId: ownerUserId,
        payment: paymentRecord,
        body,
        source,
        paidAt,
      }).catch(() => null);
    }
    return {
      ok: true,
      idempotent: true,
      user: {
        id: ownerUserId,
        points: await getUserPoints(ownerUserId),
      },
      payment: formatPaymentResponse(paymentRecord),
      accessGrant: isDigitalContentPayment ? {
        ok: true,
        accessType: "single_purchase",
        purchaseId: String(paymentRecord._id || ""),
        merchantUid: String(paymentRecord.merchantUid || ""),
        featureKey: String(paymentRecord.featureKey || body?.featureKey || ""),
        requestId: String(paymentRecord.requestId || body?.requestId || ""),
        reportId: String(paymentRecord.reportId || body?.reportId || ""),
        sessionId: String(paymentRecord.sessionId || body?.sessionId || body?.reportSessionId || ""),
        paidAt: paymentRecord.paidAt ? new Date(paymentRecord.paidAt).toISOString() : null,
      } : null,
    };
  }

  if (!Number.isInteger(portOneAmount) || portOneAmount <= 0) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "invalid_portone_amount",
      failureMessage: "PortOne payment amount is invalid.",
      failureStage: "amount_validate",
      incrementAttempt: true,
    });

    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "amount_validate",
      code: "invalid_portone_amount",
      message: "PortOne payment amount is invalid.",
      status: 400,
      expectedAmount,
      portOneAmount,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return { ok: false, status: 400, message: "PortOne payment amount is invalid." };
  }

  if (!isPortOneKrwCurrency(portOneCurrency)) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "currency_mismatch",
      failureMessage: "PortOne payment currency must be KRW.",
      failureStage: "currency_validate",
      incrementAttempt: true,
    });

    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "currency_validate",
      code: "currency_mismatch",
      message: "PortOne payment currency must be KRW.",
      status: 400,
      expectedCurrency: "KRW",
      portOneCurrency,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return { ok: false, status: 400, message: "PortOne payment currency must be KRW." };
  }

  if (
    strictAmountMatch
    && requestedAmount !== undefined
    && requestedAmount !== null
    && Number(requestedAmount) !== portOneAmount
  ) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "client_amount_mismatch",
      failureMessage: "Client amount does not match PortOne amount.",
      failureStage: "amount_match",
      incrementAttempt: true,
    });

    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "amount_match",
      code: "client_amount_mismatch",
      message: "Client amount does not match PortOne amount.",
      status: 400,
      clientAmount: Number(requestedAmount),
      portOneAmount,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 400,
      message: "Client amount does not match PortOne amount.",
      clientAmount: Number(requestedAmount),
      portOneAmount,
    };
  }

  if (Number(paymentRecord.paymentAmount || 0) > 0 && Number(paymentRecord.paymentAmount) !== portOneAmount) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "server_amount_mismatch",
      failureMessage: "Prepared amount does not match PortOne amount.",
      failureStage: "amount_match",
      incrementAttempt: true,
    });

    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "amount_match",
      code: "server_amount_mismatch",
      message: "Prepared amount does not match PortOne amount.",
      status: 400,
      expectedAmount: Number(paymentRecord.paymentAmount),
      portOneAmount,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 400,
      message: "Prepared amount does not match PortOne amount.",
      expectedAmount: Number(paymentRecord.paymentAmount),
      portOneAmount,
    };
  }

  if (portOneStatus !== "paid") {
    const failedStatus = portOneStatus === "cancelled" ? "cancelled" : "failed";
    await markPaymentFailure(paymentRecord, {
      status: failedStatus,
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "payment_not_paid",
      failureMessage: "Payment is not in paid status.",
      failureStage: "status_validate",
      incrementAttempt: true,
    });

    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "status_validate",
      code: "payment_not_paid",
      message: "Payment is not in paid status.",
      status: 400,
      portOneStatus: portOneStatus || "unknown",
      payload: body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 400,
      message: "Payment is not in paid status.",
      portOneStatus: portOneStatus || "unknown",
    };
  }

  let chargedPoints;
  try {
    if (isDigitalContentPayment) {
      chargedPoints = 0;
    } else {
      const pointsForPolicy = expectedChargedPoints > 0 ? expectedChargedPoints : undefined;
      chargedPoints = resolveChargePointsByAmount(env, portOneAmount, pointsForPolicy);
    }
  } catch (error) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "charge_policy_invalid",
      failureMessage: error.message || "Charge point policy validation failed.",
      failureStage: "policy_validate",
      incrementAttempt: true,
    });

    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "policy_validate",
      code: "charge_policy_invalid",
      message: error.message || "Charge point policy validation failed.",
      status: 400,
      expectedAmount,
      portOneAmount,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return { ok: false, status: 400, message: error.message || "Charge point policy validation failed." };
  }

  const ownerExists = await User.exists({ _id: ownerUserId });
  if (!ownerExists) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "user_not_found",
      failureMessage: isDigitalContentPayment ? "User not found for product payment." : "User not found for point charge.",
      failureStage: "user_lookup",
      incrementAttempt: true,
    });

    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "user_lookup",
      code: "user_not_found",
      message: isDigitalContentPayment ? "User not found for product payment." : "User not found for point charge.",
      status: 404,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return { ok: false, status: 404, message: isDigitalContentPayment ? "User not found for product payment." : "User not found for point charge." };
  }

  const paidAt = toDateFromUnixSeconds(portOnePayment.paid_at);

  const runSettlementWithoutTransaction = async () => {
    const finalizedPayment = await Payment.findOneAndUpdate(
      { _id: paymentRecord._id, status: { $ne: "success" } },
      {
        $set: {
          userId: ownerUserId,
          impUid,
          merchantUid: merchantUid || paymentRecord.merchantUid || undefined,
          paymentAmount: portOneAmount,
          expectedChargedPoints: isDigitalContentPayment ? expectedChargedPoints : chargedPoints,
          chargedPoints,
          featureKey: String(paymentRecord.featureKey || body?.featureKey || body?.subFeatureKey || ""),
          productId: String(paymentRecord.productId || body?.productId || "").trim().toLowerCase(),
          coinPrice: isDigitalContentPayment ? expectedChargedPoints : 0,
          membershipCreditCost: isDigitalContentPayment ? calculateMembershipCreditCost(expectedChargedPoints) : 0,
          accessType: isDigitalContentPayment ? "single_purchase" : "",
          requestId: String(paymentRecord.requestId || body?.requestId || "").trim().slice(0, 120),
          reportId: String(paymentRecord.reportId || body?.reportId || "").trim().slice(0, 120),
          sessionId: String(paymentRecord.sessionId || body?.sessionId || body?.reportSessionId || "").trim().slice(0, 120),
          paymentMethod,
          status: "success",
          paidAt,
          source,
          rawPortOne: portOnePayment,
          failureCode: null,
          failureMessage: null,
          failureStage: null,
        },
        $inc: { confirmAttempts: 1 },
      },
      { returnDocument: "after" },
    ).lean();

    if (!finalizedPayment) {
      const latestPayment = await Payment.findById(paymentRecord._id).lean();
      return {
        ok: true,
        idempotent: true,
        user: { id: ownerUserId, points: await getUserPoints(ownerUserId) },
        payment: formatPaymentResponse(latestPayment),
      };
    }

    if (isDigitalContentPayment) {
      let usagePass = null;
      if (usagePassProduct) {
        usagePass = await grantUsagePassToUser({
          userId: ownerUserId,
          product: usagePassProduct,
          paymentId: String(finalizedPayment._id || ""),
          paidAt,
        });
      }
      const accessEvidence = await createDigitalContentAccessEvidence({
        userId: ownerUserId,
        payment: finalizedPayment,
        body,
        source,
        paidAt,
      });
      return {
        ok: true,
        idempotent: false,
        user: { id: ownerUserId, points: usagePass ? Number(usagePass.points || 0) : await getUserPoints(ownerUserId) },
        payment: formatPaymentResponse(finalizedPayment),
        usagePass,
        accessGrant: {
          ok: true,
          accessType: "single_purchase",
          purchaseId: String(finalizedPayment._id || ""),
          merchantUid: String(finalizedPayment.merchantUid || ""),
          featureKey: String(finalizedPayment.featureKey || body?.featureKey || ""),
          requestId: String(finalizedPayment.requestId || body?.requestId || ""),
          reportId: String(finalizedPayment.reportId || body?.reportId || ""),
          sessionId: String(finalizedPayment.sessionId || body?.sessionId || body?.reportSessionId || ""),
          evidenceId: String(accessEvidence?._id || ""),
          paidAt: paidAt.toISOString(),
        },
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      ownerUserId,
      { $inc: { points: chargedPoints } },
      { returnDocument: "after", projection: { points: 1 } },
    ).lean();

    if (!updatedUser) {
      await Payment.findByIdAndUpdate(finalizedPayment._id, {
        $set: {
          status: "failed",
          failureCode: "user_not_found",
          failureMessage: "User not found for point charge.",
          failureStage: "user_update",
          lastErrorAt: new Date(),
        },
      }).catch(() => {});

      return { ok: false, status: 404, message: "User not found for point charge." };
    }

    await PointHistory.create({
      userId: ownerUserId,
      kind: "charge",
      delta: chargedPoints,
      balanceAfter: Number(updatedUser.points || 0),
      reason: "Point charge",
      paymentId: finalizedPayment._id,
      impUid,
      merchantUid: finalizedPayment.merchantUid,
      metadata: { source, paymentAmount: portOneAmount, paymentMethod },
    }).catch(() => {});

    return {
      ok: true,
      idempotent: false,
      user: { id: ownerUserId, points: Number(updatedUser.points || 0) },
      payment: formatPaymentResponse(finalizedPayment),
    };
  };

  const runSettlementWithTransaction = async () => {
    const session = await mongoose.startSession();
    let txResult = null;

    try {
      await session.withTransaction(async () => {
        const finalizedPayment = await Payment.findOneAndUpdate(
          { _id: paymentRecord._id, status: { $ne: "success" } },
          {
            $set: {
              userId: ownerUserId,
              impUid,
              merchantUid: merchantUid || paymentRecord.merchantUid || undefined,
              paymentAmount: portOneAmount,
              expectedChargedPoints: isDigitalContentPayment ? expectedChargedPoints : chargedPoints,
              chargedPoints,
              featureKey: String(paymentRecord.featureKey || body?.featureKey || body?.subFeatureKey || ""),
              productId: String(paymentRecord.productId || body?.productId || "").trim().toLowerCase(),
              coinPrice: isDigitalContentPayment ? expectedChargedPoints : 0,
              membershipCreditCost: isDigitalContentPayment ? calculateMembershipCreditCost(expectedChargedPoints) : 0,
              accessType: isDigitalContentPayment ? "single_purchase" : "",
              requestId: String(paymentRecord.requestId || body?.requestId || "").trim().slice(0, 120),
              reportId: String(paymentRecord.reportId || body?.reportId || "").trim().slice(0, 120),
              sessionId: String(paymentRecord.sessionId || body?.sessionId || body?.reportSessionId || "").trim().slice(0, 120),
              paymentMethod,
              status: "success",
              paidAt,
              source,
              rawPortOne: portOnePayment,
              failureCode: null,
              failureMessage: null,
              failureStage: null,
            },
            $inc: { confirmAttempts: 1 },
          },
          { returnDocument: "after", session },
        ).lean();

        if (!finalizedPayment) {
          const latestPayment = await Payment.findById(paymentRecord._id).session(session).lean();
          txResult = {
            ok: true,
            idempotent: true,
            user: { id: ownerUserId, points: await getUserPoints(ownerUserId) },
            payment: formatPaymentResponse(latestPayment),
          };
          return;
        }

        if (isDigitalContentPayment) {
          let usagePass = null;
          if (usagePassProduct) {
            usagePass = await grantUsagePassToUser({
              userId: ownerUserId,
              product: usagePassProduct,
              paymentId: String(finalizedPayment._id || ""),
              paidAt,
              session,
            });
          }
          const accessEvidence = await createDigitalContentAccessEvidence({
            userId: ownerUserId,
            payment: finalizedPayment,
            body,
            source,
            paidAt,
            session,
          });
          txResult = {
            ok: true,
            idempotent: false,
            user: { id: ownerUserId, points: usagePass ? Number(usagePass.points || 0) : await getUserPoints(ownerUserId) },
            payment: formatPaymentResponse(finalizedPayment),
            usagePass,
            accessGrant: {
              ok: true,
              accessType: "single_purchase",
              purchaseId: String(finalizedPayment._id || ""),
              merchantUid: String(finalizedPayment.merchantUid || ""),
              featureKey: String(finalizedPayment.featureKey || body?.featureKey || ""),
              requestId: String(finalizedPayment.requestId || body?.requestId || ""),
              reportId: String(finalizedPayment.reportId || body?.reportId || ""),
              sessionId: String(finalizedPayment.sessionId || body?.sessionId || body?.reportSessionId || ""),
              evidenceId: String(accessEvidence?._id || ""),
              paidAt: paidAt.toISOString(),
            },
          };
          return;
        }

        const updatedUser = await User.findByIdAndUpdate(
          ownerUserId,
          { $inc: { points: chargedPoints } },
          { returnDocument: "after", projection: { points: 1 }, session },
        ).lean();

        if (!updatedUser) throw new Error("user_not_found");

        await PointHistory.create([{
          userId: ownerUserId,
          kind: "charge",
          delta: chargedPoints,
          balanceAfter: Number(updatedUser.points || 0),
          reason: "Point charge",
          paymentId: finalizedPayment._id,
          impUid,
          merchantUid: finalizedPayment.merchantUid,
          metadata: { source, paymentAmount: portOneAmount, paymentMethod },
        }], { session });

        txResult = {
          ok: true,
          idempotent: false,
          user: { id: ownerUserId, points: Number(updatedUser.points || 0) },
          payment: formatPaymentResponse(finalizedPayment),
        };
      });

      return txResult;
    } finally {
      await session.endSession();
    }
  };

  let settlementResult;
  try {
    settlementResult = await runSettlementWithTransaction();
  } catch (error) {
    if (!isTransactionUnsupported(error)) throw error;
    settlementResult = await runSettlementWithoutTransaction();
  }

  if (!settlementResult?.ok) {
    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "settlement",
      code: "settlement_failed",
      message: settlementResult?.message || "Payment settlement failed.",
      status: settlementResult?.status || 500,
      expectedAmount,
      portOneAmount,
      payload: body,
      rawPortOne: portOnePayment,
    });
  }

  return settlementResult;
}

async function handleWebhook(request, env) {
  const rawBody = await request.text();
  let body = {};
  try {
    body = rawBody.trim() ? JSON.parse(rawBody) : {};
  } catch (error) {
    await writeFailureLog({
      request,
      source: "webhook",
      stage: "payload_parse",
      code: "invalid_webhook_json",
      message: "Webhook body must be valid JSON.",
      status: 400,
      payload: { parseError: String(error?.message || error) },
    });
    return json({ message: "Webhook body must be valid JSON." }, { status: 400 });
  }

  const webhookSecret = getPortOneWebhookSecret(env);
  if (!webhookSecret) {
    await writeFailureLog({
      request,
      source: "webhook",
      stage: "webhook_auth",
      code: "missing_webhook_secret",
      message: "PORTONE_webhook_Secret is required.",
      status: 503,
      payload: body,
    });
    return json({ message: "Webhook verification is not configured." }, { status: 503 });
  }

  const verifiedWebhook = await verifyPortOneWebhookSignature(webhookSecret, rawBody, request.headers);
  if (!verifiedWebhook) {
    await writeFailureLog({
      request,
      source: "webhook",
      stage: "webhook_auth",
      code: "invalid_webhook_signature",
      message: "Webhook signature mismatch.",
      status: 401,
      payload: body,
    });
    return json({ message: "Invalid webhook request." }, { status: 401 });
  }

  const impUid = String(
    body?.data?.paymentId
      || body?.paymentId
      || body?.imp_uid
      || body?.impUid
      || body?.data?.imp_uid
      || "",
  ).trim();

  const merchantUid = String(
    body?.merchant_uid
      || body?.merchantUid
      || body?.data?.paymentId
      || body?.data?.merchant_uid
      || "",
  ).trim();

  if (!impUid) {
    await writeFailureLog({
      request,
      source: "webhook",
      stage: "payload_validate",
      code: "missing_payment_id",
      message: "Webhook body must include paymentId.",
      status: 400,
      payload: body,
    });
    return json({ message: "Webhook body must include paymentId." }, { status: 400 });
  }

  const settled = await settlePaymentByImpUid({
    env,
    impUid,
    merchantUidHint: merchantUid || undefined,
    source: "webhook",
    strictAmountMatch: false,
    request,
    body,
  });

  if (!settled.ok) {
    return json({ ok: false, message: settled.message });
  }

  return json({
    ok: true,
    idempotent: Boolean(settled.idempotent),
    payment: settled.payment,
  });
}

async function handleDigitalContentPrepare(request, auth, body) {
  const resolved = resolveDigitalContentPricing(body);
  if (!resolved.ok) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      source: "prepare",
      stage: "digital_product_price",
      code: resolved.code || "PRICE_NOT_FOUND",
      message: resolved.message,
      status: resolved.status || 400,
      payload: body,
    });
    return json({ message: resolved.message, code: resolved.code || "PRICE_NOT_FOUND" }, { status: resolved.status || 400 });
  }

  const clientAmount = body?.paymentAmount ?? body?.amount;
  if (clientAmount !== undefined && clientAmount !== null && Number(clientAmount) !== resolved.paymentAmount) {
    return json({
      message: "Client amount does not match server product price.",
      code: "CLIENT_AMOUNT_MISMATCH",
      expectedAmount: resolved.paymentAmount,
      clientAmount: Number(clientAmount),
    }, { status: 400 });
  }

  const paymentMethod = normalizePaymentMethod(body?.paymentMethod || "single_purchase");
  const productName = buildDigitalProductName(body, resolved.pricing);
  const idempotencyKey = resolveIdempotencyKey(request, body);
  const featureKey = String(resolved.pricing?.featureKey || body?.featureKey || "").trim();
  const productId = String(body?.productId || resolved.pricing?.usagePass?.productId || "").trim().toLowerCase();
  const requestId = String(body?.requestId || "").trim().slice(0, 120);
  const reportId = String(body?.reportId || "").trim().slice(0, 120);
  const sessionId = String(body?.sessionId || body?.reportSessionId || "").trim().slice(0, 120);
  const membershipCreditCost = Number(resolved.pricing?.membershipCreditCost || calculateMembershipCreditCost(resolved.coinPrice));

  if (idempotencyKey) {
    const existing = await Payment.findOne({
      userId: auth.userId,
      idempotencyKey,
      paymentType: "digital_content",
    }).sort({ createdAt: -1 }).lean();

    if (existing) {
      const existingAmount = Number(existing.paymentAmount || 0);
      const existingCoins = Number(existing.expectedChargedPoints || 0);
      const existingFeatureKey = String(existing.featureKey || "");
      if (existingAmount !== resolved.paymentAmount || existingCoins !== resolved.coinPrice || (featureKey && existingFeatureKey && existingFeatureKey !== featureKey)) {
        return json({
          message: "Idempotency key conflict. Request payload does not match existing product payment preparation.",
          code: "IDEMPOTENCY_CONFLICT",
        }, { status: 409 });
      }

      return json({
        message: "Product payment preparation already completed.",
        idempotent: true,
        order: {
          merchantUid: String(existing.merchantUid || ""),
          paymentAmount: existingAmount,
          amountKRW: existingAmount,
          coinPrice: existingCoins,
          membershipCreditCost: Number(existing.membershipCreditCost || calculateMembershipCreditCost(existingCoins)),
          featureKey: String(existing.featureKey || featureKey || ""),
          accessType: String(existing.accessType || "single_purchase"),
          productName,
          pricing: resolved.pricing,
        },
      });
    }
  }

  const merchantUid = buildMerchantUid(auth.userId);
  await Payment.create({
    userId: auth.userId,
    merchantUid,
    idempotencyKey,
    paymentAmount: resolved.paymentAmount,
    expectedChargedPoints: resolved.coinPrice,
    chargedPoints: 0,
    featureKey,
    productId,
    coinPrice: resolved.coinPrice,
    membershipCreditCost,
    accessType: "single_purchase",
    requestId,
    reportId,
    sessionId,
    pricingSnapshot: resolved.pricing,
    paymentMethod,
    status: "pending",
    source: "prepare",
    paymentType: "digital_content",
    subscriptionTier: "",
  });

  return json({
    message: "Product payment preparation completed.",
    idempotent: false,
    order: {
      merchantUid,
      paymentAmount: resolved.paymentAmount,
      amountKRW: resolved.paymentAmount,
      coinPrice: resolved.coinPrice,
      membershipCreditCost,
      featureKey,
      accessType: "single_purchase",
      productName,
      pricing: resolved.pricing,
    },
  }, { status: 201 });
}

async function handlePrepare(request, env, auth) {
  const body = await readJson(request);
  if (isDigitalContentPaymentRequest(body)) {
    return handleDigitalContentPrepare(request, auth, body);
  }

  return json({
    message: "선불형 잔액 상품은 더 이상 판매하지 않습니다. 상품별 원화 단건 결제를 이용해 주세요.",
    code: "POINT_CHARGE_DISABLED",
  }, { status: 410 });

  const paymentAmount = Number(body?.paymentAmount ?? body?.amount);
  const requestedChargePoints = body?.chargePoints === undefined || body?.chargePoints === null
    ? undefined
    : Number(body?.chargePoints);

  if (!Number.isInteger(paymentAmount) || paymentAmount <= 0) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      source: "prepare",
      stage: "payload_validate",
      code: "invalid_payment_amount",
      message: "paymentAmount must be a positive integer.",
      status: 400,
      payload: body,
    });
    return json({ message: "paymentAmount must be a positive integer." }, { status: 400 });
  }

  if (requestedChargePoints !== undefined && (!Number.isInteger(requestedChargePoints) || requestedChargePoints <= 0)) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      source: "prepare",
      stage: "payload_validate",
      code: "invalid_charge_points",
      message: "chargePoints must be a positive integer.",
      status: 400,
      payload: body,
    });
    return json({ message: "chargePoints must be a positive integer." }, { status: 400 });
  }

  const chargedPoints = resolveChargePointsByAmount(env, paymentAmount, requestedChargePoints);
  const paymentMethod = normalizePaymentMethod(body?.paymentMethod);
  const rawProductName = String(body?.productName || `${chargedPoints.toLocaleString("ko-KR")} point charge`).trim();
  const productName = rawProductName.slice(0, 80) || `${chargedPoints.toLocaleString("ko-KR")} point charge`;
  const idempotencyKey = resolveIdempotencyKey(request, body);

  if (idempotencyKey) {
    const existing = await Payment.findOne({
      userId: auth.userId,
      idempotencyKey,
      paymentType: "point_charge",
    }).sort({ createdAt: -1 }).lean();

    if (existing) {
      const existingAmount = Number(existing.paymentAmount || 0);
      const existingPoints = Number(existing.expectedChargedPoints || 0);
      if (existingAmount !== paymentAmount || existingPoints !== chargedPoints) {
        return json({
          message: "Idempotency key conflict. Request payload does not match existing payment preparation.",
          code: "IDEMPOTENCY_CONFLICT",
        }, { status: 409 });
      }

      return json({
        message: "Payment preparation already completed.",
        idempotent: true,
        order: {
          merchantUid: String(existing.merchantUid || ""),
          paymentAmount: existingAmount,
          chargePoints: existingPoints,
          productName,
        },
      });
    }
  }

  const merchantUid = buildMerchantUid(auth.userId);

  try {
    await Payment.create({
      userId: auth.userId,
      merchantUid,
      idempotencyKey,
      paymentAmount,
      expectedChargedPoints: chargedPoints,
      chargedPoints: 0,
      paymentMethod,
      status: "pending",
      source: "prepare",
      paymentType: "point_charge",
      subscriptionTier: "",
    });
  } catch (error) {
    if (Number(error?.code) !== 11000 || !idempotencyKey) throw error;

    const existing = await Payment.findOne({
      userId: auth.userId,
      idempotencyKey,
      paymentType: "point_charge",
    }).sort({ createdAt: -1 }).lean();

    if (!existing) throw error;

    const existingAmount = Number(existing.paymentAmount || 0);
    const existingPoints = Number(existing.expectedChargedPoints || 0);
    if (existingAmount !== paymentAmount || existingPoints !== chargedPoints) {
      return json({
        message: "Idempotency key conflict. Request payload does not match existing payment preparation.",
        code: "IDEMPOTENCY_CONFLICT",
      }, { status: 409 });
    }

    return json({
      message: "Payment preparation already completed.",
      idempotent: true,
      order: {
        merchantUid: String(existing.merchantUid || ""),
        paymentAmount: existingAmount,
        chargePoints: existingPoints,
        productName,
      },
    });
  }

  return json({
    message: "Payment preparation completed.",
    idempotent: false,
    order: {
      merchantUid,
      paymentAmount,
      chargePoints: chargedPoints,
      productName,
    },
  }, { status: 201 });
}

async function handleSubscriptionPrepare(request, auth) {
  const body = await readJson(request);
  const tier = String(body?.tier || "").trim().toLowerCase();
  const durationMonths = Number(body?.durationMonths || 1);
  const planId = String(body?.planId || "").trim().toLowerCase();
  const productType = String(body?.productType || "membership_pass").trim().toLowerCase();
  const requestedAmount = body?.amount === undefined ? null : Number(body.amount);
  const requestedCurrency = String(body?.currency || "KRW").trim().toUpperCase();
  const plan = resolveSubscriptionPlan(tier, durationMonths);
  if (!plan) {
    return json({ message: "Unsupported subscription plan.", code: "INVALID_SUBSCRIPTION_TIER" }, { status: 400 });
  }
  if ((planId && planId !== plan.planId) || productType !== plan.productType) {
    return json({ message: "Subscription plan payload mismatch.", code: "SUBSCRIPTION_PLAN_MISMATCH" }, { status: 400 });
  }
  if ((requestedAmount !== null && requestedAmount !== plan.wonPrice) || !["KRW", "CURRENCY_KRW"].includes(requestedCurrency)) {
    return json({ message: "Subscription amount or currency mismatch.", code: "SUBSCRIPTION_PRICE_MISMATCH" }, { status: 400 });
  }

  const paymentMethod = normalizePaymentMethod(body?.paymentMethod || "card_general");
  const currentUser = await User.findById(auth.userId).select("profileSubscription").lean();
  if (!currentUser) {
    return json({ message: "User not found." }, { status: 404 });
  }

  const transition = evaluateSubscriptionTierTransition(currentUser?.profileSubscription, tier);
  if (!transition.allow) {
    return json({
      message: transition.code === "SUBSCRIPTION_DOWNGRADE_BLOCKED"
        ? "A higher-tier subscription is currently active. Lower-tier purchase is disabled."
        : "An active subscription of the same tier already exists. Concurrent subscriptions are not allowed.",
      code: transition.code,
      activeTier: transition.activeTier,
    }, { status: 409 });
  }

  const idempotencyKey = resolveIdempotencyKey(request, body);
  if (idempotencyKey) {
    const existing = await Payment.findOne({
      userId: auth.userId,
      idempotencyKey,
      paymentType: "membership_pass",
    }).sort({ createdAt: -1 }).lean();

    if (existing) {
      const existingAmount = Number(existing.paymentAmount || 0);
      const existingTier = String(existing.subscriptionTier || "").trim().toLowerCase();
      if (existingAmount !== plan.wonPrice || existingTier !== tier) {
        return json({
          message: "Idempotency key conflict. Request payload does not match existing subscription preparation.",
          code: "IDEMPOTENCY_CONFLICT",
        }, { status: 409 });
      }

      return json({
        message: "Membership pass payment preparation already completed.",
        idempotent: true,
        order: {
          merchantUid: String(existing.merchantUid || ""),
          customerUid: buildSubscriptionCustomerUid(auth.userId),
          tier,
          planId: plan.planId,
          durationMonths: plan.durationMonths,
          paymentAmount: existingAmount,
          productName: `${plan.name} ${plan.durationMonths}개월`,
          productType: plan.productType,
          profileLimit: plan.profileLimit,
          durationDays: plan.durationDays,
          membershipCreditGrant: plan.membershipCreditGrant,
          recurring: false,
        },
      });
    }
  }

  const merchantUid = buildSubscriptionMerchantUid(auth.userId, tier, plan.durationMonths);
  const customerUid = buildSubscriptionCustomerUid(auth.userId);

  try {
    await Payment.create({
      userId: auth.userId,
      merchantUid,
      idempotencyKey,
      paymentAmount: plan.wonPrice,
      expectedChargedPoints: 0,
      chargedPoints: 0,
      paymentMethod,
      status: "pending",
      source: "prepare",
      paymentType: "membership_pass",
      subscriptionTier: tier,
      productId: plan.planId,
      metadata: {
        planId: plan.planId,
        durationMonths: plan.durationMonths,
        productType: plan.productType,
        currency: "KRW",
      },
    });
  } catch (error) {
    if (Number(error?.code) !== 11000 || !idempotencyKey) throw error;

    const existing = await Payment.findOne({
      userId: auth.userId,
      idempotencyKey,
      paymentType: "membership_pass",
    }).sort({ createdAt: -1 }).lean();

    if (!existing) throw error;

    const existingAmount = Number(existing.paymentAmount || 0);
    const existingTier = String(existing.subscriptionTier || "").trim().toLowerCase();
    if (existingAmount !== plan.wonPrice || existingTier !== tier) {
      return json({
        message: "Idempotency key conflict. Request payload does not match existing subscription preparation.",
        code: "IDEMPOTENCY_CONFLICT",
      }, { status: 409 });
    }

    return json({
      message: "Membership pass payment preparation already completed.",
      idempotent: true,
      order: {
        merchantUid: String(existing.merchantUid || ""),
        customerUid,
        tier,
        planId: plan.planId,
        durationMonths: plan.durationMonths,
        paymentAmount: existingAmount,
        productName: `${plan.name} ${plan.durationMonths}개월`,
        productType: plan.productType,
        profileLimit: plan.profileLimit,
        durationDays: plan.durationDays,
        membershipCreditGrant: plan.membershipCreditGrant,
        recurring: false,
      },
    });
  }

  return json({
    message: "Membership pass payment preparation completed.",
    idempotent: false,
    order: {
      merchantUid,
      customerUid,
      tier,
      planId: plan.planId,
      durationMonths: plan.durationMonths,
      paymentAmount: plan.wonPrice,
      productName: `${plan.name} ${plan.durationMonths}개월`,
      productType: plan.productType,
      profileLimit: plan.profileLimit,
      durationDays: plan.durationDays,
      membershipCreditGrant: plan.membershipCreditGrant,
      recurring: false,
    },
  }, { status: 201 });
}

async function handleSubscriptionConfirm(request, env, auth) {
  const body = await readJson(request);
  const impUid = String(body?.impUid || body?.paymentId || "").trim();
  const tier = String(body?.tier || "").trim().toLowerCase();
  const durationMonths = Number(body?.durationMonths || 1);
  const planId = String(body?.planId || "").trim().toLowerCase();
  const productType = String(body?.productType || "membership_pass").trim().toLowerCase();
  const requestedAmount = body?.amount === undefined ? null : Number(body.amount);
  const requestedCurrency = String(body?.currency || "KRW").trim().toUpperCase();
  const customerUidFromClient = String(body?.customerUid || "").trim();
  const merchantUidHint = String(body?.merchantUid || body?.merchant_uid || "").trim();
  const paymentMethodHint = normalizePaymentMethod(body?.paymentMethod || "card");
  const plan = resolveSubscriptionPlan(tier, durationMonths);

  if (!impUid || !plan) {
    return json({ message: "impUid and valid tier are required." }, { status: 400 });
  }
  if ((planId && planId !== plan.planId) || productType !== plan.productType) {
    return json({ message: "Subscription plan payload mismatch.", code: "SUBSCRIPTION_PLAN_MISMATCH" }, { status: 400 });
  }
  if ((requestedAmount !== null && requestedAmount !== plan.wonPrice) || !["KRW", "CURRENCY_KRW"].includes(requestedCurrency)) {
    return json({ message: "Subscription amount or currency mismatch.", code: "SUBSCRIPTION_PRICE_MISMATCH" }, { status: 400 });
  }

  let portOnePayment;
  try {
    portOnePayment = await fetchPortOnePayment(env, impUid);
  } catch (error) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      impUid,
      merchantUid: merchantUidHint || undefined,
      source: "confirm",
      stage: "subscription_portone_fetch",
      code: "portone_fetch_failed",
      message: error?.message || "PortOne payment lookup failed.",
      status: 502,
      payload: body,
    });
    return json({ message: "Failed to verify payment." }, { status: 502 });
  }

  const portOneStatus = String(portOnePayment?.status || "").toLowerCase();
  const portOneAmount = Number(portOnePayment?.amount || 0);
  const portOneCurrency = normalizePortOneCurrency(portOnePayment?.currency);
  const merchantUid = String(portOnePayment?.merchant_uid || merchantUidHint || "").trim();
  const resolvedPaymentMethod = normalizePaymentMethod(portOnePayment?.pay_method || paymentMethodHint);

  if (merchantUidHint && merchantUidHint !== merchantUid) {
    return json({ message: "merchantUid mismatch." }, { status: 400 });
  }

  const paymentRecord = await findPaymentRecord(impUid, merchantUid);
  if (!paymentRecord) {
    return json({ message: "Payment record not found." }, { status: 404 });
  }

  if (String(paymentRecord.userId) !== String(auth.userId)) {
    return json({ message: "Only your own payment can be processed." }, { status: 403 });
  }
  if (String(paymentRecord.productId || paymentRecord.metadata?.planId || plan.planId) !== plan.planId) {
    return json({ message: "Payment record plan mismatch.", code: "SUBSCRIPTION_PLAN_MISMATCH" }, { status: 400 });
  }

  if (paymentRecord.status === "success") {
    const currentUser = await User.findById(auth.userId).select("profileSubscription").lean();
    const sub = currentUser?.profileSubscription || {};
    return json({
      message: "Membership pass payment already processed.",
      idempotent: true,
      payment: formatPaymentResponse(paymentRecord),
      subscription: {
        tier: sub?.tier || "free",
        source: sub?.source || "pass",
        isActive: hasActiveSubscriptionConflict(sub),
        expiresAt: toIsoOrNull(sub?.expiresAt),
        profileLimit: plan.profileLimit,
        planId: String(sub?.planId || plan.planId),
        durationMonths: Number(sub?.durationMonths || plan.durationMonths),
        membershipCreditBalance: Number(sub?.membershipCreditBalance || 0),
        membershipCreditGranted: Number(sub?.membershipCreditGranted || 0),
        membershipCreditUsed: Number(sub?.membershipCreditUsed || 0),
        cancelAtPeriodEnd: Boolean(sub?.cancelAtPeriodEnd),
        cancelRequestedAt: toIsoOrNull(sub?.cancelRequestedAt),
      },
    });
  }

  if (portOneStatus !== "paid") {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod: resolvedPaymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "subscription_not_paid",
      failureMessage: `Unexpected payment status: ${portOneStatus || "unknown"}`,
      failureStage: "subscription_status_validate",
      incrementAttempt: true,
    });
    return json({ message: "Payment is not completed.", status: portOneStatus || "unknown" }, { status: 400 });
  }

  if (!Number.isInteger(portOneAmount) || portOneAmount !== plan.wonPrice) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod: resolvedPaymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "subscription_amount_mismatch",
      failureMessage: "Membership pass payment amount mismatch.",
      failureStage: "subscription_amount_validate",
      incrementAttempt: true,
    });
    return json({ message: "Membership pass payment amount mismatch." }, { status: 400 });
  }

  if (!isPortOneKrwCurrency(portOneCurrency)) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod: resolvedPaymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "subscription_currency_mismatch",
      failureMessage: "Membership pass payment currency must be KRW.",
      failureStage: "subscription_currency_validate",
      incrementAttempt: true,
    });
    return json({ message: "Membership pass payment currency must be KRW." }, { status: 400 });
  }

  const now = new Date();
  const paidAt = portOnePayment?.paid_at ? toDateFromUnixSeconds(portOnePayment.paid_at) : now;
  const customerUid = customerUidFromClient || buildSubscriptionCustomerUid(auth.userId);

  const existingUser = await User.findById(auth.userId).select("profileSubscription").lean();
  const transition = evaluateSubscriptionTierTransition(existingUser?.profileSubscription, tier);
  if (!transition.allow) {
    return json({
      message: transition.code === "SUBSCRIPTION_DOWNGRADE_BLOCKED"
        ? "A higher-tier subscription is currently active. Lower-tier purchase is disabled."
        : "An active subscription of the same tier already exists. Concurrent subscriptions are not allowed.",
      code: transition.code,
      activeTier: transition.activeTier,
    }, { status: 409 });
  }

  const currentExpiresAt = toValidDate(existingUser?.profileSubscription?.expiresAt);
  const extensionBaseTime = currentExpiresAt && currentExpiresAt.getTime() > paidAt.getTime()
    ? currentExpiresAt.getTime()
    : Math.max(now.getTime(), paidAt.getTime());
  const expiresAt = new Date(extensionBaseTime + plan.durationDays * 86400000);

  await Payment.findByIdAndUpdate(paymentRecord._id, {
    $set: {
      impUid,
      merchantUid,
      paymentAmount: plan.wonPrice,
      expectedChargedPoints: 0,
      chargedPoints: 0,
      paymentMethod: resolvedPaymentMethod,
      status: "success",
      paidAt,
      source: "confirm",
      paymentType: "membership_pass",
      subscriptionTier: tier,
      productId: plan.planId,
      metadata: {
        ...(paymentRecord.metadata || {}),
        planId: plan.planId,
        durationMonths: plan.durationMonths,
        productType: plan.productType,
        currency: "KRW",
        verifiedAmount: plan.wonPrice,
      },
      rawPortOne: portOnePayment,
      failureCode: null,
      failureMessage: null,
      failureStage: null,
      lastErrorAt: null,
    },
  });

  const updatedUser = await User.findByIdAndUpdate(
    auth.userId,
    {
      $set: {
        "profileSubscription.tier": tier,
        "profileSubscription.planId": plan.planId,
        "profileSubscription.durationMonths": plan.durationMonths,
        "profileSubscription.productType": plan.productType,
        "profileSubscription.source": "pass",
        "profileSubscription.startedAt": paidAt,
        "profileSubscription.expiresAt": expiresAt,
        "profileSubscription.cancelAtPeriodEnd": false,
        "profileSubscription.cancelRequestedAt": null,
        "profileSubscription.customerUid": customerUid,
        "profileSubscription.paymentMethod": resolvedPaymentMethod,
        "profileSubscription.nextBillingAt": null,
        "profileSubscription.lastBillingAt": paidAt,
        "profileSubscription.lastBillingStatus": "success",
        "profileSubscription.lastBillingError": "",
        "profileSubscription.firstSubAt": existingUser?.profileSubscription?.firstSubAt || paidAt,
        "profileSubscription.membershipCreditBalance": 0,
        "profileSubscription.membershipCreditGranted": 0,
        "profileSubscription.membershipCreditUsed": 0,
      },
    },
    { returnDocument: "after", projection: { points: 1, profileSubscription: 1 } },
  ).lean();

  return json({
    message: "30-day membership pass has been activated.",
    idempotent: false,
    payment: formatPaymentResponse(await Payment.findById(paymentRecord._id).lean()),
    subscription: {
      tier,
      source: "pass",
      isActive: true,
      expiresAt: expiresAt.toISOString(),
      profileLimit: plan.profileLimit,
      planId: plan.planId,
      durationMonths: plan.durationMonths,
      productType: plan.productType,
      membershipCreditBalance: Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0),
      membershipCreditGranted: Number(updatedUser?.profileSubscription?.membershipCreditGranted || 0),
      membershipCreditUsed: Number(updatedUser?.profileSubscription?.membershipCreditUsed || 0),
      membershipCreditGrant: plan.membershipCreditGrant,
      cancelAtPeriodEnd: false,
      cancelRequestedAt: null,
      customerUid,
      paymentMethod: resolvedPaymentMethod,
      nextBillingAt: null,
      lastBillingStatus: "success",
    },
    user: {
      id: String(auth.userId),
      points: Number(updatedUser?.points || 0),
    },
  });
}

async function handleConfirm(request, env, auth) {
  const body = await readJson(request);
  const hasMinimalRedirectPayload = Boolean(
    (body?.impUid || body?.paymentId)
      && (body?.merchantUid || body?.merchant_uid)
      && (body?.paymentAmount === undefined && body?.amount === undefined),
  );
  const hasDigitalContentPayload = isDigitalContentPaymentRequest(body);

  let isValid = false;
  let errors = [];
  let sanitized = null;

  if (hasMinimalRedirectPayload || hasDigitalContentPayload) {
    sanitized = {
      impUid: String(body?.impUid || body?.paymentId || "").trim(),
      merchantUid: String(body?.merchantUid || body?.merchant_uid || "").trim() || undefined,
      paymentAmount: hasDigitalContentPayload && (body?.paymentAmount !== undefined || body?.amount !== undefined)
        ? Number(body?.paymentAmount ?? body?.amount)
        : undefined,
      chargePoints: undefined,
      paymentMethod: String(body?.paymentMethod || "").trim() || undefined,
    };
    isValid = Boolean(sanitized.impUid);
    if (!isValid) errors = ["impUid is required."];
  } else {
    const validated = validatePointChargePayload(body);
    isValid = validated.isValid;
    errors = validated.errors;
    sanitized = validated.sanitized;
  }

  if (!isValid) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      impUid: String(body?.impUid || body?.paymentId || "").trim() || undefined,
      merchantUid: String(body?.merchantUid || body?.merchant_uid || "").trim() || undefined,
      source: "confirm",
      stage: "payload_validate",
      code: "invalid_confirm_payload",
      message: "Invalid payment confirm payload.",
      status: 400,
      payload: { ...body, errors },
    });

    return json({ message: "Invalid payment confirm payload.", errors }, { status: 400 });
  }

  const settled = await settlePaymentByImpUid({
    env,
    impUid: sanitized.impUid,
    requestedUserId: auth.userId,
    requestedAmount: sanitized.paymentAmount,
    requestedChargePoints: sanitized.chargePoints,
    requestedPaymentMethod: sanitized.paymentMethod,
    merchantUidHint: sanitized.merchantUid,
    source: "confirm",
    strictAmountMatch: true,
    request,
    body,
  });

  if (!settled.ok) {
    return json({
      message: settled.message,
      ...(settled.clientAmount !== undefined ? { clientAmount: settled.clientAmount } : {}),
      ...(settled.portOneAmount !== undefined ? { portOneAmount: settled.portOneAmount } : {}),
      ...(settled.expectedAmount !== undefined ? { expectedAmount: settled.expectedAmount } : {}),
      ...(settled.portOneStatus ? { status: settled.portOneStatus } : {}),
    }, { status: settled.status || 400 });
  }

  return json({
    message: settled.idempotent ? "Payment was already processed." : "Payment completed.",
    idempotent: Boolean(settled.idempotent),
    user: settled.user,
    payment: settled.payment,
    usagePass: settled.usagePass || null,
    accessGrant: settled.accessGrant || null,
  });
}

async function runCancelUpdate({ paymentRecord, canceledPortOne, pointsToRollback, auth, user, requestedCancelAmount, paidAmount }) {
  const runWithoutTransaction = async () => {
    const canceledPayment = await Payment.findByIdAndUpdate(
      paymentRecord._id,
      {
        $set: {
          status: "cancelled",
          rawPortOne: canceledPortOne,
          paymentMethod: normalizePaymentMethod(canceledPortOne?.pay_method || paymentRecord.paymentMethod),
          failureCode: null,
          failureMessage: null,
          failureStage: null,
        },
      },
      { returnDocument: "after" },
    ).lean();

    let updatedPoints = Number(user.points || 0);
    if (pointsToRollback > 0) {
      const updatedUser = await User.findByIdAndUpdate(
        auth.userId,
        { $inc: { points: -pointsToRollback } },
        { returnDocument: "after", projection: { points: 1 } },
      ).lean();
      updatedPoints = Number(updatedUser?.points || 0);

      await PointHistory.create({
        userId: auth.userId,
        kind: "deduct",
        delta: -pointsToRollback,
        balanceAfter: updatedPoints,
        reason: "Point rollback after payment cancellation",
        paymentId: paymentRecord._id,
        impUid: paymentRecord.impUid,
        merchantUid: paymentRecord.merchantUid,
        metadata: {
          source: "cancel",
          cancelAmount: Number(canceledPortOne?.cancel_amount || requestedCancelAmount || paidAmount || 0),
        },
      }).catch(() => {});
    }

    return { canceledPayment, updatedPoints };
  };

  const runWithTransaction = async () => {
    const session = await mongoose.startSession();
    let txPayload = null;

    try {
      await session.withTransaction(async () => {
        const canceledPayment = await Payment.findByIdAndUpdate(
          paymentRecord._id,
          {
            $set: {
              status: "cancelled",
              rawPortOne: canceledPortOne,
              paymentMethod: normalizePaymentMethod(canceledPortOne?.pay_method || paymentRecord.paymentMethod),
              failureCode: null,
              failureMessage: null,
              failureStage: null,
            },
          },
          { returnDocument: "after", session },
        ).lean();

        let updatedPoints = Number(user.points || 0);
        if (pointsToRollback > 0) {
          const updatedUser = await User.findByIdAndUpdate(
            auth.userId,
            { $inc: { points: -pointsToRollback } },
            { returnDocument: "after", projection: { points: 1 }, session },
          ).lean();
          updatedPoints = Number(updatedUser?.points || 0);

          await PointHistory.create([{
            userId: auth.userId,
            kind: "deduct",
            delta: -pointsToRollback,
            balanceAfter: updatedPoints,
            reason: "Point rollback after payment cancellation",
            paymentId: paymentRecord._id,
            impUid: paymentRecord.impUid,
            merchantUid: paymentRecord.merchantUid,
            metadata: {
              source: "cancel",
              cancelAmount: Number(canceledPortOne?.cancel_amount || requestedCancelAmount || paidAmount || 0),
            },
          }], { session });
        }

        txPayload = { canceledPayment, updatedPoints };
      });

      return txPayload;
    } finally {
      await session.endSession();
    }
  };

  try {
    return await runWithTransaction();
  } catch (error) {
    if (!isTransactionUnsupported(error)) throw error;
    return runWithoutTransaction();
  }
}

async function handleCancel(request, env, auth) {
  const body = await readJson(request);
  const impUid = String(body?.impUid || body?.imp_uid || "").trim() || undefined;
  const merchantUid = String(body?.merchantUid || body?.merchant_uid || "").trim() || undefined;
  const reason = String(body?.reason || "Customer refund request").trim().slice(0, 120);
  const requestedCancelAmountRaw = body?.cancelAmount ?? body?.amount;
  const requestedCancelAmount = requestedCancelAmountRaw === undefined || requestedCancelAmountRaw === null
    ? undefined
    : Number(requestedCancelAmountRaw);

  if (!impUid && !merchantUid) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      source: "confirm",
      stage: "cancel_payload",
      code: "missing_cancel_key",
      message: "impUid or merchantUid is required.",
      status: 400,
      payload: body,
    });
    return json({ message: "impUid or merchantUid is required." }, { status: 400 });
  }

  if (requestedCancelAmount !== undefined && (!Number.isInteger(requestedCancelAmount) || requestedCancelAmount <= 0)) {
    return json({ message: "cancelAmount must be a positive integer." }, { status: 400 });
  }

  const paymentRecord = await findPaymentRecord(impUid, merchantUid);
  if (!paymentRecord) return json({ message: "Payment not found." }, { status: 404 });

  if (String(paymentRecord.userId) !== String(auth.userId)) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      impUid,
      merchantUid,
      source: "confirm",
      stage: "cancel_owner",
      code: "forbidden_owner_mismatch",
      message: "Only your own payment can be cancelled.",
      status: 403,
      payload: body,
    });
    return json({ message: "Only your own payment can be cancelled." }, { status: 403 });
  }

  if (paymentRecord.status === "cancelled") {
    return json({
      message: "Payment was already cancelled.",
      idempotent: true,
      payment: formatPaymentResponse(paymentRecord),
    });
  }

  if (paymentRecord.status !== "success") {
    return json({ message: "Only successful payments can be cancelled." }, { status: 400 });
  }

  const paidAmount = Number(paymentRecord.paymentAmount || 0);
  if (requestedCancelAmount !== undefined && requestedCancelAmount > paidAmount) {
    return json({ message: "Cancel amount exceeds paid amount." }, { status: 400 });
  }

  const pointsToRollback = Number(paymentRecord.chargedPoints || paymentRecord.expectedChargedPoints || 0);
  const user = await User.findById(auth.userId).select("points").lean();
  if (!user) return json({ message: "User not found." }, { status: 404 });

  if (pointsToRollback > 0 && Number(user.points || 0) < pointsToRollback) {
    return json({
      message: "Automatic refund is blocked because the charged points were already used. Please contact support.",
    }, { status: 409 });
  }

  const canceledPortOne = await cancelPortOnePayment(env, {
    impUid: paymentRecord.impUid || impUid,
    merchantUid: paymentRecord.merchantUid || merchantUid,
    reason,
    amount: requestedCancelAmount,
    checksum: paidAmount > 0 ? paidAmount : undefined,
  });

  const updateResult = await runCancelUpdate({
    paymentRecord,
    canceledPortOne,
    pointsToRollback,
    auth,
    user,
    requestedCancelAmount,
    paidAmount,
  });

  return json({
    message: "Payment cancelled.",
    idempotent: false,
    user: {
      id: String(auth.userId),
      points: Number(updateResult?.updatedPoints || 0),
    },
    payment: formatPaymentResponse(updateResult?.canceledPayment),
  });
}

async function handleReportFailure(request, auth) {
  const body = await readJson(request);
  const merchantUid = String(body?.merchantUid || body?.merchant_uid || "").trim() || undefined;
  const impUid = String(body?.impUid || body?.paymentId || "").trim() || undefined;
  const reasonCode = String(body?.reasonCode || "client_failure").trim().slice(0, 80);
  const reasonMessage = String(body?.reasonMessage || "Payment was not completed on the client.").trim().slice(0, 500);

  const payment = await findPaymentRecord(impUid, merchantUid);
  if (payment && String(payment.userId) !== String(auth.userId)) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      impUid,
      merchantUid,
      source: "client",
      stage: "report_failure",
      code: "forbidden_owner_mismatch",
      message: "Only your own payment can be reported.",
      status: 403,
      payload: body,
    });
    return json({ message: "Only your own payment can be reported." }, { status: 403 });
  }

  if (payment && payment.status !== "success") {
    await markPaymentFailure(payment, {
      status: reasonCode === "cancelled" ? "cancelled" : "failed",
      paymentMethod: payment.paymentMethod,
      failureCode: reasonCode,
      failureMessage: reasonMessage,
      failureStage: "client_report",
      incrementAttempt: false,
    });
  }

  await writeFailureLog({
    request,
    userId: auth.userId,
    impUid,
    merchantUid,
    source: "client",
    stage: "client_report",
    code: reasonCode,
    message: reasonMessage,
    status: 200,
    payload: body,
  });

  return json({ ok: true, message: "Payment failure report recorded." });
}

function formatPointHistoryEntry(entry) {
  return {
    id: String(entry?._id || ""),
    kind: entry?.kind,
    delta: Number(entry?.delta || 0),
    balanceAfter: Number(entry?.balanceAfter || 0),
    reason: entry?.reason,
    featureKey: entry?.featureKey,
    createdAt: entry?.createdAt,
  };
}

function buildSubscriptionSummary(profileSubscription) {
  const sub = profileSubscription || {};
  const entitlement = normalizeHoneyPassEntitlement({ profileSubscription: sub });
  const tier = entitlement.isActive ? entitlement.tier : String(sub.tier || "free").trim() || "free";
  const validExpiresAt = entitlement.expiresAt || toIsoOrNull(sub.expiresAt);
  const isActive = Boolean(entitlement.isActive);

  if (!isActive) return [];

  return [{
    tier,
    label: entitlement.label,
    source: String(entitlement.source || sub.source || "pass"),
    isActive,
    expiresAt: validExpiresAt,
    profileLimit: Number(entitlement.maxProfiles || 1),
    freeLimit: Number(entitlement.maxCoveredCoin || 0),
    membershipCreditBalance: Number(sub.membershipCreditBalance || 0),
    membershipCreditGranted: Number(sub.membershipCreditGranted || 0),
    membershipCreditUsed: Number(sub.membershipCreditUsed || 0),
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
    cancelRequestedAt: toIsoOrNull(sub.cancelRequestedAt),
  }];
}

function buildMeResponseBody(auth, user, recentPayments, pointHistories) {
  const safeUser = user || {};
  const unlockedFeatures = Array.isArray(safeUser.unlockedFeatures) ? safeUser.unlockedFeatures : [];
  const usagePasses = Array.isArray(safeUser.usagePasses)
    ? safeUser.usagePasses.map((entry) => ({
      category: String(entry?.category || ""),
      remainingUses: Number(entry?.remainingUses || 0),
      purchasedUses: Number(entry?.purchasedUses || 0),
      productId: String(entry?.productId || ""),
      updatedAt: entry?.updatedAt || null,
    }))
    : [];
  const unlockMap = Object.create(null);
  for (let i = 0; i < unlockedFeatures.length; i += 1) {
    const key = String(unlockedFeatures[i] || "").trim();
    if (key) unlockMap[key] = true;
  }

  const mappedPayments = Array.isArray(recentPayments)
    ? recentPayments.map((payment) => formatPaymentResponse(payment)).filter(Boolean)
    : [];
  const mappedTransactions = Array.isArray(pointHistories)
    ? pointHistories.map((entry) => formatPointHistoryEntry(entry)).filter((entry) => entry.id)
    : [];
  const subscriptions = buildSubscriptionSummary(safeUser.profileSubscription);
  const balance = Number(safeUser.points || 0);

  return {
    success: true,
    ok: true,
    data: {
      balance,
      transactions: mappedTransactions,
      payments: mappedPayments,
      subscriptions,
      usagePasses,
    },
    user: {
      id: String(auth.userId),
      name: safeUser.name || "",
      email: safeUser.email || "",
      points: balance,
      unlockedFeatures,
      usagePasses,
    },
    unlockedFeatures,
    usagePasses,
    unlockMap,
    payments: mappedPayments,
    pointHistories: mappedTransactions,
    subscriptions,
  };
}

function buildTokenFallbackPaymentsMe(auth, message) {
  const balance = Number.isFinite(Number(auth?.points)) ? Number(auth.points) : 0;
  return {
    success: true,
    ok: true,
    message: message || "Payment data is temporarily unavailable. Loaded safe account data from token.",
    userFound: false,
    source: "token",
    data: {
      balance,
      transactions: [],
      payments: [],
      subscriptions: [],
      usagePasses: [],
    },
    user: {
      id: String(auth?.userId || ""),
      name: String(auth?.name || ""),
      email: String(auth?.email || ""),
      points: balance,
      unlockedFeatures: [],
      usagePasses: [],
    },
    unlockedFeatures: [],
    usagePasses: [],
    unlockMap: {},
    payments: [],
    pointHistories: [],
    subscriptions: [],
  };
}

async function handleMe(auth, env) {
  try {
    await connectDb(env);
    const user = await findUserByIdRaw(auth.userId, {
      name: 1,
      email: 1,
      points: 1,
      unlockedFeatures: 1,
      usagePasses: 1,
      profileSubscription: 1,
    });

    const [recentPaymentsResult, pointHistoriesResult] = await Promise.allSettled([
      findRecentPaymentsForUser(auth.userId, 20),
      PointHistory.find({ userId: auth.userId }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    const recentPayments = recentPaymentsResult.status === "fulfilled" ? recentPaymentsResult.value : [];
    const pointHistories = pointHistoriesResult.status === "fulfilled" ? pointHistoriesResult.value : [];

    const body = buildMeResponseBody(auth, user, recentPayments, pointHistories);
    body.data.degradedPayments = recentPaymentsResult.status === "rejected";
    body.data.degradedTransactions = pointHistoriesResult.status === "rejected";
    if (!user) {
      body.message = "User profile is missing. Returned safe defaults.";
      body.userFound = false;
    }

    return json(body);
  } catch (error) {
    console.warn("[payments/me] degraded fallback to token:", String(error?.message || "unknown"));
    return json(buildTokenFallbackPaymentsMe(auth));
  }
}

async function handlePointsMe(auth, env) {
  try {
    await connectDb(env);
    const user = await findUserByIdRaw(auth.userId, {
      name: 1,
      email: 1,
      points: 1,
    });

    const pointHistories = await PointHistory.find({ userId: auth.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const transactions = Array.isArray(pointHistories)
      ? pointHistories.map((entry) => formatPointHistoryEntry(entry)).filter((entry) => entry.id)
      : [];
    const balance = Number(user?.points || 0);

    return json({
      success: true,
      ok: true,
      data: {
        balance,
        transactions,
        payments: [],
        subscriptions: [],
      },
      user: {
        id: String(auth.userId),
        name: user?.name || "",
        email: user?.email || "",
        points: balance,
      },
      pointHistories: transactions,
      transactions,
    });
  } catch (error) {
    console.warn("[payments/points-me] degraded fallback to token:", String(error?.message || "unknown"));
    const fallbackBody = buildTokenFallbackPaymentsMe(auth, "Point history is temporarily unavailable. Loaded safe account data from token.");
    return json({
      success: true,
      ok: true,
      source: fallbackBody.source,
      message: fallbackBody.message,
      data: {
        balance: fallbackBody.data.balance,
        transactions: [],
        payments: [],
        subscriptions: [],
      },
      user: {
        id: fallbackBody.user.id,
        name: fallbackBody.user.name,
        email: fallbackBody.user.email,
        points: fallbackBody.user.points,
      },
      pointHistories: [],
      transactions: [],
    });
  }
}

function handlePaymentConfig(env) {
  const config = getPortOnePublicConfig(env);
  if (!config.storeId || !config.channelKey || !config.noticeUrl) {
    return json({
      message: "PortOne V2 KG Inicis public payment config is missing.",
      code: "PORTONE_V2_PUBLIC_CONFIG_MISSING",
      missing: {
        storeId: !config.storeId,
        channelKey: !config.channelKey,
        noticeUrl: !config.noticeUrl,
      },
    }, { status: 503 });
  }

  return json({
    ok: true,
    provider: config.provider,
    pg: config.pg,
    storeId: config.storeId,
    channelKey: config.channelKey,
    noticeUrl: config.noticeUrl || "",
    currency: config.currency,
    payMethod: config.payMethod,
  });
}

export async function handlePaymentRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/payments");
  const trace = {
    route: "payments",
    requestPath: new URL(request.url).pathname,
    method,
    authPresent: Boolean(request.headers.get("Authorization") || request.headers.get("Cookie")),
    authVerified: false,
    dbConnected: false,
    mongoQueryFailed: false,
    paymentProviderFailed: false,
    env: {
      mongoUriConfigured: Boolean(getEnv(env, "MONGO_URI") || getEnv(env, "MONGODB_URI")),
      jwtSecretConfigured: Boolean(getEnv(env, "JWT_SECRET") || getEnv(env, "AUTH_SECRET")),
      portoneApiSecretConfigured: Boolean(env?.PORTONE_API_Secret || globalThis.process?.env?.PORTONE_API_Secret),
      portoneStoreIdConfigured: Boolean(env?.PORTONE_Store || globalThis.process?.env?.PORTONE_Store),
      portoneChannelKeyConfigured: Boolean(env?.PORTONE_channel || globalThis.process?.env?.PORTONE_channel),
      portoneWebhookUrlConfigured: Boolean(env?.PORTONE_webhook_URL || globalThis.process?.env?.PORTONE_webhook_URL),
      portoneWebhookSecretConfigured: Boolean(env?.PORTONE_webhook_Secret || globalThis.process?.env?.PORTONE_webhook_Secret),
    },
  };

  try {
    if (method === "GET" && path === "/config") return handlePaymentConfig(env);

    const keyFeature = "auth-basic";
    const keyHealth = evaluateFeatureKeyHealth(env, keyFeature);
    if (!keyHealth.ok) {
      return json(buildConfigErrorBody(keyFeature, keyHealth), { status: 503 });
    }

    if (method === "POST" && path === "/webhook") {
      await connectDb(env);
      trace.dbConnected = true;
      return await handleWebhook(request, env);
    }

    const auth = await requireAuth(request, env);
    trace.authVerified = true;

    if (method === "GET" && path === "/me") return await handleMe(auth, env);
    if (method === "GET" && path === "/points/me") return await handlePointsMe(auth, env);

    await connectDb(env);
    trace.dbConnected = true;

    if (method === "POST" && path === "/prepare") return await handlePrepare(request, env, auth);
    if (method === "POST" && path === "/subscription/prepare") return await handleSubscriptionPrepare(request, auth);
    if (method === "POST" && path === "/confirm") return await handleConfirm(request, env, auth);
    if (method === "POST" && path === "/subscription/confirm") return await handleSubscriptionConfirm(request, env, auth);
    if (method === "POST" && path === "/cancel") return await handleCancel(request, env, auth);
    if (method === "POST" && path === "/report-failure") return await handleReportFailure(request, auth);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    if (error && error.code === 11000) {
      return json({ message: "Duplicate payment key." }, { status: 409 });
    }
    const errorText = String(error?.message || "");
    trace.mongoQueryFailed = /mongo|mongoose|cast to objectid|findbyid|findone|query/i.test(errorText);
    trace.paymentProviderFailed = /portone|iamport|payment provider|merchant_uid|imp_uid/i.test(errorText);
    return handleRouteError(error, { request, env, trace });
  }
}

export const __paymentsTestUtils = {
  handlePrepare,
  handleSubscriptionPrepare,
  resolveIdempotencyKey,
  normalizeIdempotencyKey,
};
