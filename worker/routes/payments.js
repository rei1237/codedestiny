import { connectDb, mongoose, withMongoRetry } from "../lib/db.js";
import {
  CONTENT_ENTITLEMENT_SCOPES,
  CONTENT_ENTITLEMENT_SERVICE_KEYS,
  CONTENT_ENTITLEMENT_SOURCES,
  CONTENT_ENTITLEMENT_STATUSES,
  ContentEntitlement,
  Payment,
  PaymentFailureLog,
  PaymentWebhookEvent,
  MonthlyCreditLedger,
  PaidExecutionRecord,
  PointHistory,
  ProfileCard,
  RECENT_CONSUME_REQUEST_ID_CAP,
  User,
} from "../lib/models.js";
import { requireUserFromRequest } from "../lib/auth.js";
import {
  cancelPortOnePayment,
  fetchPortOnePayment,
  getPortOneConfig,
  getPortOnePublicConfig,
  getPortOneWebhookSecret,
  getPortOneWebhookUrl,
} from "../lib/portone.js";
import { getEnv } from "../lib/env.js";
import { getRequestMeta, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { buildConfigErrorBody, evaluateFeatureKeyHealth } from "../lib/key-health.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateKrwAmountFromCoins, calculateMembershipCreditCost, normalizeKrwAmount } from "../lib/billing-policy.js";
import { deductLotsFIFO, ensureLotsForBalance, resolveNextExpiry } from "../lib/monthly-credit-lots.js";
import { HONEY_PASS_POLICY, normalizeHoneyPassEntitlement, normalizePassTier, PASS_TIERS } from "../lib/profile-limits.js";
import {
  validatePurchasePolicy,
  resolveServerProductType,
} from "../lib/entitlement-policy.js";
import { applyPdfPassDiscountToPricing } from "../lib/pdf-pass-discount.js";
import { isUnlockPaidFeatureKey } from "../lib/paid-feature-registry.js";
import {
  formatPermanentUnlockGrant,
  grantPermanentUnlock,
  resolvePaidContentUnlockTarget,
  USER_SCOPE_PROFILE_ID,
} from "../lib/content-unlocks.js";
// 환불 코어는 관리자 라우트(/api/admin/orders)와 공유한다 — 두 벌이 되면 한쪽만 고쳐지는 사고가 난다.
import {
  invalidatePaidAccessDecisionCacheForUser,
  isPartialCancel,
  refundPaymentAsOperator,
  revokeSinglePaymentContentAccess,
} from "../lib/payment-refund.js";
import {
  GUARDIAN_FORTUNE_CREDIT_PRODUCT_TYPE,
  buildGuardianFortunePurchasePolicySummary,
  createGuardianFortuneCreditOrder,
  getGuardianFortuneCreditBalance,
  isGuardianFortuneCreditPaymentRecord,
  isGuardianFortuneCreditSalesEnabled,
  listGuardianFortuneCreditProducts,
  settleGuardianFortunePayment,
} from "../lib/guardian-fortune-purchase.js";
import {
  createFusionFortuneTicketOrder,
  getFusionFortuneTicketBalance,
  getFusionFortuneTicketCatalog,
  isFusionFortuneTicketPaymentRecord,
  isFusionFortuneTicketSalesEnabled,
  settleFusionFortuneTicketPayment,
} from "../lib/fusion-fortune-purchase.js";

// 부분취소 판정도 환불 코어와 같은 함수를 쓴다(사본 금지). 기존 호출부 이름을 그대로 유지한다.
const isPartialSingleCancel = isPartialCancel;
import { enforceSensitiveEndpointSecurity, writeSecurityLog } from "../lib/security/index.js";
import { MIN_SELF_CONSENT_AGE, validateBirthDateWithAge } from "../lib/validation.js";

const SUKYO_YEARLY_FORTUNE_PRODUCT_KEY = "sukyo_yearly_fortune_unlock";
const SUKYO_YEARLY_FORTUNE_SERVICE_KEY = "sukuyo";

const PORTONE_SINGLE_PAYMENT_METHODS = new Set(["CARD", "TRANSFER", "VIRTUAL_ACCOUNT", "MOBILE", "EASY_PAY"]);
const SINGLE_PAYMENT_UNLOCKED_STATUSES = ["paid", "success", "fulfilled"];
const PORTONE_WEBHOOK_EVENTS = Object.freeze({
  PAID: "Transaction.Paid",
  VIRTUAL_ACCOUNT_ISSUED: "Transaction.VirtualAccountIssued",
  FAILED: "Transaction.Failed",
  CANCELLED: "Transaction.Cancelled",
  PARTIAL_CANCELLED: "Transaction.PartialCancelled",
});
const SUBSCRIPTION_DURATION_MS_PER_DAY = 86400000;
const PORTONE_WEBHOOK_PAYMENT_EVENTS = new Set(Object.values(PORTONE_WEBHOOK_EVENTS));
const SINGLE_PAYMENT_ORDER_STATES = Object.freeze({
  PENDING: "PENDING",
  REDIRECTED: "REDIRECTED",
  PAID_VERIFIED: "PAID_VERIFIED",
  UNLOCKED: "UNLOCKED",
  VIRTUAL_ACCOUNT_ISSUED: "VIRTUAL_ACCOUNT_ISSUED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  PARTIAL_CANCELLED: "PARTIAL_CANCELLED",
  VERIFY_FAILED: "VERIFY_FAILED",
  ERROR: "ERROR",
});

function toDateFromUnixSeconds(value) {
  const unixSeconds = Number(value);
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return new Date();
  return new Date(unixSeconds * 1000);
}

function normalizePaymentMethod(value) {
  const method = String(value || "unknown").trim();
  return method ? method.slice(0, 32) : "unknown";
}

async function rejectPurchasePolicy(request, env, auth, decision, context = {}) {
  if (decision?.allowed) return null;
  await writeSecurityLog({
    env,
    request,
    level: "warn",
    reason: decision?.auditCode || decision?.denialReason || "PURCHASE_POLICY_DENIED",
    userId: auth?.userId,
    endpoint: new URL(request.url).pathname,
    metadata: {
      policyVersion: decision?.policyVersion || "",
      productType: decision?.normalizedProductType || "",
      sku: decision?.sku || "",
      requestedPaymentMethod: context.requestedPaymentMethod || "",
      route: context.route || "",
    },
  });
  return json({
    ok: false,
    success: false,
    code: decision?.denialReason || "PURCHASE_POLICY_DENIED",
    reason: decision?.denialReason || "PURCHASE_POLICY_DENIED",
    message: decision?.denialReason === "CANNOT_BUY_PASS_WITH_PASS"
      ? "이용권 상품은 보유 이용권으로 구매할 수 없습니다. PG 결제 또는 명확히 허용된 월정석 결제 플로우를 이용해 주세요."
      : decision?.denialReason === "FAMILY_CANNOT_PURCHASE_HIGHER_TIER_PRODUCTS"
        ? "패밀리 이용권은 기능 이용 권한이며, 더 높은 가격의 이용권 구매 수단으로 사용할 수 없습니다."
        : "현재 상품은 PG 결제 또는 허용된 월정석 정책으로만 구매할 수 있습니다.",
    policyVersion: decision?.policyVersion || "",
    auditCode: decision?.auditCode || "PURCHASE_POLICY_DENIED",
  }, { status: 403 });
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

/* Standard Webhooks 의 webhook-signature 는 **공백으로 구분된** `v1,<base64서명>` 목록이다.
   키 로테이션 중에는 옛 키·새 키 서명이 함께 와서 `v1,AAA v1,BBB` 형태가 된다.
   예전에는 쉼표로 먼저 잘라 ["v1", "AAA v1", "BBB"] 로 부서졌고, 앞쪽 서명이 "AAA v1" 이라는
   쓰레기 문자열이 되어 그 서명이 유효한 경우에도 검증이 실패했다 — 로테이션 창에서 웹훅이
   전량 거부되는 장애다(fail-closed 라 결제 지급이 멈춘다). 서명 1개인 평시에는 우연히 동작했다. */
function parseStandardWebhookSignatures(headerValue) {
  return String(headerValue || "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    // 접두는 `v1,` 가 표준이고 일부 구현이 `v1=`/`v1:` 를 쓴다. 구분자를 요구하므로
    // "v1" 로 시작하는 base64 서명 자체(예: v1abc…)는 잘리지 않는다.
    .map((part) => part.replace(/^v1[,=:]\s*/i, "").trim())
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

function paymentRateLimitForPath(path = "") {
  if (path === "/confirm" || path === "/subscription/confirm" || path === "/single/complete") {
    return { limit: 20, windowSeconds: 60 };
  }
  if (path === "/prepare" || path === "/subscription/prepare" || path === "/single/start") {
    return { limit: 15, windowSeconds: 60 };
  }
  if (path === "/cancel" || path === "/single/cancel" || path === "/report-failure") {
    return { limit: 15, windowSeconds: 60 };
  }
  return { limit: 20, windowSeconds: 60 };
}

async function enforcePaymentRouteSecurity(request, env, auth, path) {
  const method = request.method.toUpperCase();
  if (method !== "POST" || path === "/webhook") return { ok: true };
  const meta = getRequestMeta(request);
  return enforceSensitiveEndpointSecurity({
    env,
    request,
    userId: auth?.userId,
    endpoint: `payments:${path}`,
    allowedMethods: ["POST"],
    requireJson: true,
    rateLimit: paymentRateLimitForPath(path),
    rateLimitKey: `${auth?.userId || "anonymous"}:${meta.ip || "unknown"}:${path}`,
  });
}

function isRemovedCountPassProductId(value) {
  const productId = String(value || "").trim().toLowerCase();
  return /^(?:saju_unlock_(?:3|5)|fortune_(?:30|50)_(?:3|10|30)|compat_(?:3|10|30))$/.test(productId);
}

function resolveDigitalContentPricing(body = {}) {
  if (isRemovedCountPassProductId(body?.productId)) {
    return {
      ok: false,
      status: 400,
      message: "지원하지 않는 결제 상품입니다.",
      code: "INVALID_PRODUCT_KEY",
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
  const label = String(pricing.reason || pricing.featureKey || body?.productName || "디지털 운세 콘텐츠").trim();
  return label.slice(0, 80) || "디지털 운세 콘텐츠";
}

const SUBSCRIPTION_BASE_PLANS = {
  [PASS_TIERS.STANDARD]: { tier: PASS_TIERS.STANDARD, name: "스탠다드 꿀 30일", monthlyWonPrice: 9900, profileLimit: HONEY_PASS_POLICY.standard.maxProfiles, maxCoveredCoin: HONEY_PASS_POLICY.standard.maxCoveredCoin },
  [PASS_TIERS.PREMIUM]: { tier: PASS_TIERS.PREMIUM, name: "프리미엄 꿀 30일", monthlyWonPrice: 29900, profileLimit: HONEY_PASS_POLICY.premium.maxProfiles, maxCoveredCoin: HONEY_PASS_POLICY.premium.maxCoveredCoin },
  [PASS_TIERS.VVIP]: { tier: PASS_TIERS.VVIP, name: "VVIP 꿀단지 30일", monthlyWonPrice: 59000, profileLimit: HONEY_PASS_POLICY.vvip.maxProfiles, maxCoveredCoin: HONEY_PASS_POLICY.vvip.maxCoveredCoin },
  [PASS_TIERS.FAMILY]: { tier: PASS_TIERS.FAMILY, name: "Code Destiny Family 30일", monthlyWonPrice: 149000, profileLimit: HONEY_PASS_POLICY.family.maxProfiles, maxCoveredCoin: HONEY_PASS_POLICY.family.maxCoveredCoin },
};

const SUBSCRIPTION_DURATION_DISCOUNTS = Object.freeze({
  1: 0,
});

const SUBSCRIPTION_TIER_RANK = Object.freeze({
  free: 0,
  [PASS_TIERS.STANDARD]: 1,
  [PASS_TIERS.PREMIUM]: 2,
  [PASS_TIERS.VVIP]: 3,
  [PASS_TIERS.FAMILY]: 4,
});

function resolveSubscriptionPlan(tierRaw, durationMonthsRaw = 1) {
  const tier = normalizePassTier(tierRaw);
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

function validateNewSubscriptionDuration(durationMonthsRaw, durationDaysRaw) {
  const durationMonths = Number(durationMonthsRaw || 1);
  const durationDays = durationDaysRaw === undefined || durationDaysRaw === null || durationDaysRaw === ""
    ? 30
    : Number(durationDaysRaw);
  return durationMonths === 1 && durationDays === 30;
}

function buildSubscriptionMerchantUid(userId, tier, durationMonths = 1) {
  const userTag = String(userId || "guest").replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "guest";
  const timestampTag = Date.now().toString(36);
  const tierCodeMap = {
    [PASS_TIERS.STANDARD]: "s",
    [PASS_TIERS.PREMIUM]: "p",
    [PASS_TIERS.VVIP]: "v",
    [PASS_TIERS.FAMILY]: "f",
  };
  const tierCode = tierCodeMap[tier] || String(tier || "x").replace(/[^a-zA-Z0-9]/g, "").slice(0, 3) || "x";
  const randomTag = Math.random().toString(36).slice(2, 6);
  return `sub_${timestampTag}_${tierCode}${durationMonths}m_${userTag}_${randomTag}`.slice(0, 40);
}

function buildSubscriptionCustomerUid(userId) {
  return `cdsub_${String(userId || "guest").replace(/[^a-zA-Z0-9]/g, "")}`;
}

function calculateSubscriptionMonthlyCreditCost(plan) {
  return Math.max(0, Math.ceil(Number(plan?.wonPrice || 0) / 10));
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

function readPaymentHeader(request, name) {
  try {
    return String(request?.headers?.get(name) || "").trim();
  } catch {
    return "";
  }
}

function createPaymentRequestId(request) {
  const incoming = readPaymentHeader(request, "x-request-id") || readPaymentHeader(request, "x-correlation-id");
  if (incoming) return incoming.slice(0, 120);
  const cfRay = readPaymentHeader(request, "cf-ray");
  if (cfRay) return `cf-${cfRay.slice(0, 80)}`;
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `payments-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function hashPaymentLogValue(value) {
  const input = String(value || "");
  if (!input) return "";
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function classifyPaymentDbError(error) {
  const name = String(error?.name || "");
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  if (code === "11000" || name === "MongoServerError" && message.includes("duplicate")) return "MONGO_DUPLICATE_KEY";
  if (name === "MongoOperationOverloadedError" || code === "MONGO_OPERATION_ADMISSION_TIMEOUT") return "MONGO_POOL_EXHAUSTED";
  if (name === "MongoServerSelectionError" || message.includes("server selection")) return "MONGO_SERVER_SELECTION_TIMEOUT";
  if (message.includes("wait queue") || message.includes("pool") || message.includes("checkout")) return "MONGO_POOL_EXHAUSTED";
  if (message.includes("network") || name === "MongoNetworkError") return "MONGO_NETWORK_ERROR";
  if (message.includes("timed out") || message.includes("timeout")) return "MONGO_QUERY_TIMEOUT";
  if (message.includes("write conflict")) return "MONGO_WRITE_CONFLICT";
  return "DATABASE_TEMPORARILY_UNAVAILABLE";
}

function isPaymentShopSummaryRequest(request) {
  try {
    return new URL(request.url).searchParams.get("view") === "shop";
  } catch {
    return false;
  }
}

function getPaymentDeploySha(env) {
  return String(env?.CF_PAGES_COMMIT_SHA || env?.COMMIT_SHA || env?.DEPLOY_COMMIT_SHA || "").slice(0, 80);
}

function logPaymentsMeTrace(level, fields) {
  const line = { event: "payments.me.lookup", ...fields };
  const writer = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  try {
    writer(JSON.stringify(line));
  } catch {
    writer(line);
  }
}

async function runPaymentsMeOptionalQuery(metrics, stage, operation) {
  const startedAt = Date.now();
  metrics.dbQueryCount += 1;
  try {
    const value = await withMongoRetry(metrics.env, operation);
    metrics.stageMs[stage] = Date.now() - startedAt;
    return { ok: true, value };
  } catch (error) {
    metrics.stageMs[stage] = Date.now() - startedAt;
    metrics.errors.push({
      stage,
      code: classifyPaymentDbError(error),
      originalErrorName: String(error?.name || "Error").slice(0, 120),
      message: String(error?.message || "").slice(0, 300),
    });
    return { ok: false, value: [] };
  }
}

function hasActiveSubscriptionConflict(sub) {
  const tier = normalizePassTier(sub?.tier || sub?.passTier || sub?.subscriptionTier || sub?.plan) || "free";
  const expAt = toValidDate(sub?.expiresAt);
  return tier !== "free" && !!expAt && expAt.getTime() > Date.now();
}

function buildSubscriptionUpdateGuard(existingSubscription, now) {
  const currentExpiresAt = toValidDate(existingSubscription?.expiresAt);
  if (currentExpiresAt && currentExpiresAt.getTime() > now.getTime()) {
    return { "profileSubscription.expiresAt": currentExpiresAt };
  }
  return {
    $or: [
      { "profileSubscription.expiresAt": { $exists: false } },
      { "profileSubscription.expiresAt": null },
      { "profileSubscription.expiresAt": { $lte: now } },
    ],
  };
}

function calculateSubscriptionActivationExpiresAt({
  existingSubscription,
  transitionCode,
  now,
  paidAt,
  durationDays,
}) {
  const nowMs = Number(now && now.getTime ? now.getTime() : NaN);
  const paidAtMs = Number(paidAt && paidAt.getTime ? paidAt.getTime() : NaN);
  const referenceMs = Number.isFinite(paidAtMs) && Number.isFinite(nowMs)
    ? Math.max(nowMs, paidAtMs)
    : Number.isFinite(nowMs) ? nowMs : Date.now();
  const duration = Number.isFinite(Number(durationDays)) ? Number(durationDays) : 30;
  const normalizedDurationDays = Math.max(1, Math.floor(duration));
  const existingExpiresAt = toValidDate(existingSubscription?.expiresAt);
  const isUpgrade = transitionCode === "UPGRADE_ALLOWED";
  const extendFromMs = isUpgrade
    ? referenceMs
    : existingExpiresAt && existingExpiresAt.getTime() > nowMs
      ? existingExpiresAt.getTime()
      : referenceMs;
  return new Date(extendFromMs + normalizedDurationDays * SUBSCRIPTION_DURATION_MS_PER_DAY);
}

function getTierRank(tierRaw) {
  const tier = normalizePassTier(tierRaw) || "free";
  return Number(SUBSCRIPTION_TIER_RANK[tier] || 0);
}

function evaluateSubscriptionTierTransition(currentSub, requestedTierRaw) {
  const requestedTier = normalizePassTier(requestedTierRaw) || "";
  const requestedRank = getTierRank(requestedTier);
  const active = hasActiveSubscriptionConflict(currentSub);
  if (!active) {
    return { allow: true, code: "OK", isUpgrade: false, activeTier: "free" };
  }

  const activeTier = normalizePassTier(currentSub?.tier || currentSub?.passTier || currentSub?.subscriptionTier || currentSub?.plan) || "free";
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

function resolvePaymentMethodLabel(payment) {
  const metadata = payment?.metadata && typeof payment.metadata === "object" ? payment.metadata : {};
  const method = String(payment?.paymentMethod || "").trim();
  const normalized = method.toLowerCase();
  const accessType = String(payment?.accessType || "").trim().toLowerCase();
  const currency = String(metadata.currency || "").trim().toUpperCase();

  if (normalized === "moonlight_stone" || normalized === "monthly_credit" || normalized === "monthly" || accessType === "membership_credit" || currency === "MOONLIGHT_STONE" || currency === "MONTHLY_CREDIT") {
    return "이용권 혜택";
  }
  if (normalized === "card_general" || normalized === "card") return "카드 결제";
  if (normalized === "virtual_account") return "가상계좌";
  if (normalized === "kakaopay") return "카카오페이";
  if (normalized === "naverpay") return "네이버페이";
  return method || "-";
}

function isSinglePurchaseDigitalPayment(payment) {
  return String(payment?.paymentType || "").trim().toLowerCase() === "digital_content"
    && String(payment?.accessType || "").trim().toLowerCase() === "single_purchase";
}

function isPaymentAutoCancelEligible(payment) {
  return isSinglePurchaseDigitalPayment(payment)
    && Number(payment?.paymentAmount || 0) > 0
    && Number(payment?.chargedPoints || 0) <= 0;
}

function formatPaymentResponse(payment) {
  if (!payment) return null;

  const rawPortOne = payment?.rawPortOne && typeof payment.rawPortOne === "object" ? payment.rawPortOne : {};
  const rawV2 = rawPortOne?.rawV2 && typeof rawPortOne.rawV2 === "object" ? rawPortOne.rawV2 : {};
  const rawPaidAt = rawPortOne?.paid_at
    ? toDateFromUnixSeconds(rawPortOne.paid_at)
    : (rawPortOne?.paidAt || rawPortOne?.transaction?.paidAt || rawPortOne?.statusChangedAt || rawV2?.paidAt || rawV2?.transaction?.paidAt || rawV2?.statusChangedAt);
  const approvalNumber = String(
    rawPortOne?.apply_num
      || rawPortOne?.apply_num_vbank
      || rawPortOne?.applyNum
      || rawPortOne?.approvalNumber
      || rawPortOne?.transaction?.approvalNumber
      || rawPortOne?.card?.approvalNumber
      || rawPortOne?.card?.approval_number
      || rawV2?.approvalNumber
      || rawV2?.transaction?.approvalNumber
      || rawV2?.card?.approvalNumber
      || rawV2?.card?.approval_number
      || "",
  ).trim() || null;
  const receiptUrl = String(rawPortOne?.receipt_url || rawPortOne?.receiptUrl || rawPortOne?.receipt?.url || rawPortOne?.transaction?.receiptUrl || rawV2?.receiptUrl || rawV2?.receipt?.url || rawV2?.transaction?.receiptUrl || "").trim() || null;
  const cancelAmount = Number(rawPortOne?.cancel_amount || 0);
  const cancelledAt = rawPortOne?.cancelled_at
    ? toDateFromUnixSeconds(rawPortOne.cancelled_at)
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
    paymentMethodLabel: resolvePaymentMethodLabel(payment),
    paymentType: payment.paymentType || "point_charge",
    subscriptionTier: payment.subscriptionTier || "",
    status: payment.status,
    orderState: String(payment.orderState || ""),
    createdAt: toIsoOrNull(payment.createdAt),
    updatedAt: toIsoOrNull(payment.updatedAt),
    paidAt: toIsoOrNull(payment.paidAt || rawPaidAt),
    failureCode: payment.failureCode,
    failureMessage: payment.failureMessage,
    failureStage: payment.failureStage,
    lastErrorAt: toIsoOrNull(payment.lastErrorAt),
    approvalNumber,
    receiptUrl,
    cancelAmount,
    cancelledAt: toIsoOrNull(cancelledAt),
    cancelEligible: isPaymentAutoCancelEligible(payment),
  };
}

const SENSITIVE_PAYLOAD_KEYS = new Set([
  "authorization",
  "card",
  "card_number",
  "cardnumber",
  "customer_uid",
  "customeruid",
  "email",
  "phone",
  "phone_number",
  "phonenumber",
  "receipt",
  "receipt_url",
  "receipturl",
  "refund_account",
  "refundaccount",
  "token",
]);

function summarizePayload(payload, depth = 0) {
  if (!payload || typeof payload !== "object") return null;
  if (depth > 4) return "[truncated]";
  if (Array.isArray(payload)) return payload.slice(0, 50).map((item) => summarizePayload(item, depth + 1));
  const clone = {};
  for (const [key, value] of Object.entries(payload)) {
    const normalizedKey = String(key || "").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
    if (SENSITIVE_PAYLOAD_KEYS.has(normalizedKey)) {
      clone[key] = "[redacted]";
      continue;
    }
    clone[key] = value && typeof value === "object" ? summarizePayload(value, depth + 1) : value;
  }
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
    rawPortOne: summarizePayload(rawPortOne),
  }).catch(() => {});
}

function extractPortOneWebhookId(headers) {
  return String(headers.get("webhook-id") || headers.get("x-webhook-id") || "").trim();
}

function isDuplicateKeyError(error) {
  return Number(error?.code) === 11000;
}

// PortOne는 at-least-once로 웹훅을 재전송한다. 첫 처리가 isolate kill 등으로 "processing"에서
// 멈춘 이벤트를 영구히 duplicate 취급하면 결제는 PAID인데 unlock이 반영되지 않는다. 아래 시간이
// 지난 stale "processing" 레코드는 다음 재전송에서 재클레임을 허용한다.
const WEBHOOK_STALE_PROCESSING_MS = 2 * 60 * 1000;

// 웹훅 이벤트 레코드가 재처리 가능한 상태인지 순수 판정한다(테스트 용이하도록 분리).
function isWebhookEventReclaimable(existing, nowMs = Date.now(), staleMs = WEBHOOK_STALE_PROCESSING_MS) {
  const status = String(existing?.status || "");
  if (status === "failed") return true;
  if (status === "processing") {
    const last = existing?.lastAttemptAt ? new Date(existing.lastAttemptAt).getTime() : 0;
    if (!Number.isFinite(last) || last <= 0) return true;
    return nowMs - last >= staleMs;
  }
  return false;
}

// 웹훅 핸들러 응답이 성공(2xx)인지 판정한다. 실패 응답을 processed로 마킹하면 PortOne 재전송이
// 우리 멱등성 계층에서 영구 차단되므로, 성공일 때만 processed로 확정해야 한다.
function isSuccessfulWebhookResponse(response) {
  const status = Number(response?.status || 0);
  // 202(Accepted)는 "아직 미완료"(예: 결제 pending)를 뜻하므로 processed로 확정하지 않고
  // 재시도 대상으로 남긴다. 그 외 2xx만 terminal 성공으로 본다.
  return status >= 200 && status < 300 && status !== 202;
}

async function reservePortOneWebhookEvent({ request, eventType, paymentId, body }) {
  const eventId = extractPortOneWebhookId(request.headers);
  if (!eventId) {
    return { ok: false, response: json({ message: "Webhook id is required." }, { status: 400 }) };
  }

  const now = new Date();
  const baseRecord = {
    provider: "portone",
    eventId,
    eventType,
    paymentId,
    status: "processing",
    receivedAt: now,
    lastAttemptAt: now,
    requestMeta: getRequestMeta(request),
    payload: summarizePayload(body),
  };

  try {
    const event = await PaymentWebhookEvent.create(baseRecord);
    return { ok: true, event, duplicate: false };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const existing = await PaymentWebhookEvent.findOne({ provider: "portone", eventId }).lean();
    if (isWebhookEventReclaimable(existing, now.getTime())) {
      // 원자적 재클레임: stale processing은 lastAttemptAt 조건까지 걸어 동시 재전송 중 한 요청만 이긴다.
      const staleCutoff = new Date(now.getTime() - WEBHOOK_STALE_PROCESSING_MS);
      const reclaimFilter = existing.status === "processing"
        ? { provider: "portone", eventId, status: "processing", lastAttemptAt: { $lte: staleCutoff } }
        : { provider: "portone", eventId, status: "failed" };
      const event = await PaymentWebhookEvent.findOneAndUpdate(
        reclaimFilter,
        {
          $set: {
            eventType,
            paymentId,
            status: "processing",
            lastAttemptAt: now,
            lastError: "",
            requestMeta: getRequestMeta(request),
            payload: summarizePayload(body),
          },
          $inc: { attempts: 1 },
        },
        { returnDocument: "after" },
      ).lean();
      if (event) return { ok: true, event, duplicate: false, retry: true };
    }
    return {
      ok: false,
      duplicate: true,
      response: json({
        ok: true,
        duplicate: true,
        ignored: true,
        type: eventType,
        paymentId,
        webhookStatus: existing?.status || "unknown",
      }),
    };
  }
}

async function markPortOneWebhookEventProcessed(event, response) {
  if (!event?._id) return;
  await PaymentWebhookEvent.findByIdAndUpdate(event._id, {
    $set: {
      status: "processed",
      processedAt: new Date(),
      lastError: "",
      "payload.resultStatus": Number(response?.status || 200),
    },
  }).catch(() => {});
}

async function markPortOneWebhookEventFailed(event, error) {
  if (!event?._id) return;
  await PaymentWebhookEvent.findByIdAndUpdate(event._id, {
    $set: {
      status: "failed",
      processedAt: null,
      lastAttemptAt: new Date(),
      lastError: String(error?.message || error || "Webhook processing failed.").slice(0, 500),
    },
  }).catch(() => {});
}

async function getUserPoints(userId) {
  const user = await User.findById(userId).select("points").lean();
  return Number(user?.points || 0);
}

function isSukuyoYearlyPaymentKey(value) {
  const key = String(value || "").trim();
  return key === SUKYO_YEARLY_FORTUNE_PRODUCT_KEY || key.startsWith(`${SUKYO_YEARLY_FORTUNE_PRODUCT_KEY}:`);
}

// 프로필 스코프 영구 해금(A유형) 대상인지 정본(content-unlocks.js)에 물어본다.
// requiresProfile 은 PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY 에 등재된 키(saju section_* 3종 + ziwei 5종)
// 에만 true 다. 이 게이트가 없으면 회당결제(PER_USE) 기능까지 영구 엔티틀먼트가 생겨 과금이 멈춘다.
function resolveProfileUnlockTargetForPayment(featureKey) {
  const target = resolvePaidContentUnlockTarget({ featureKey });
  return target.requiresProfile ? target : null;
}

function resolveProfileUnlockContentKey(featureKey, contentKey = "") {
  const explicitContentKey = String(contentKey || "").trim().slice(0, 160);
  if (isSukuyoYearlyPaymentKey(explicitContentKey)) return explicitContentKey;
  if (isSukuyoYearlyPaymentKey(featureKey)) return explicitContentKey || String(featureKey || "").trim();
  return resolveProfileUnlockTargetForPayment(featureKey)?.contentKey || "";
}

function resolveProfileUnlockServiceKey(featureKey, contentKey = "") {
  if (isSukuyoYearlyPaymentKey(featureKey) || isSukuyoYearlyPaymentKey(contentKey)) return SUKYO_YEARLY_FORTUNE_SERVICE_KEY;
  return resolveProfileUnlockTargetForPayment(featureKey)?.serviceKey || "";
}

function cleanProfileId(value) {
  return String(value || "").trim().slice(0, 80).replace(/\s+/g, "_");
}

function sanitizeAsciiPaymentSegment(value, fallback = "x") {
  const normalized = String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
  return normalized || fallback;
}

function randomAsciiToken(length = 8) {
  const bytes = new Uint8Array(Math.max(4, Math.ceil(length * 0.75)));
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, length);
}

function buildSinglePaymentId(userId) {
  const userTag = sanitizeAsciiPaymentSegment(String(userId || "").slice(-10), "guest");
  return `cd-single-${userTag}-${Date.now()}-${randomAsciiToken(8)}`;
}

function sanitizeReturnPath(value) {
  const raw = String(value || "/").trim();
  if (!raw) return "/";
  try {
    if (/^https?:\/\//i.test(raw)) {
      const parsed = new URL(raw);
      return `${parsed.pathname || "/"}${parsed.search || ""}${parsed.hash || ""}`.slice(0, 700);
    }
  } catch (_) {}
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw.slice(0, 700);
}

function trimUtf8Bytes(value, maxBytes) {
  const encoder = new TextEncoder();
  let output = "";
  for (const char of Array.from(String(value || ""))) {
    const next = `${output}${char}`;
    if (encoder.encode(next).length > maxBytes) break;
    output = next;
  }
  return output.trim();
}

function resolveSinglePaymentFeatureKey(body = {}) {
  const rawKey = String(
    body?.featureKey
      || body?.contentId
      || body?.subFeatureKey
      || body?.productId
      || "",
  ).trim().slice(0, 80);
  if (isSukuyoYearlyPaymentKey(rawKey)) return SUKYO_YEARLY_FORTUNE_PRODUCT_KEY;
  return rawKey;
}

function resolveSinglePayMethod(value) {
  const normalized = String(value || "CARD").trim().toUpperCase();
  return PORTONE_SINGLE_PAYMENT_METHODS.has(normalized) ? normalized : "CARD";
}

function getFrontendBaseUrl(env, request) {
  const configured = getEnv(env, "SITE_BASE_URL")
    || getEnv(env, "AUTH_FRONTEND_BASE_URL")
    || getEnv(env, "NEXT_PUBLIC_SITE_URL");
  const fallback = new URL(request.url).origin;
  return String(configured || fallback).replace(/\/+$/, "");
}

function buildSinglePaymentRedirectUrl({ env, request, returnPath, paymentId }) {
  const redirectUrl = new URL(sanitizeReturnPath(returnPath), getFrontendBaseUrl(env, request));
  redirectUrl.searchParams.set("portone_redirect", "1");
  redirectUrl.searchParams.set("payment_id", paymentId);
  redirectUrl.searchParams.set("merchant_uid", paymentId);
  redirectUrl.searchParams.set("returnPath", sanitizeReturnPath(returnPath));
  return redirectUrl.toString();
}

function pickFirstText(values = []) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function sanitizeCustomerEmail(value, userId) {
  const email = String(value || "").trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email.slice(0, 120);
  return `buyer-${sanitizeAsciiPaymentSegment(String(userId || "").slice(-10), "guest")}@code-destiny.com`;
}

function sanitizeCustomerPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const localDigits = digits.startsWith("82") && /^821\d{8,9}$/.test(digits) ? `0${digits.slice(2)}` : digits;
  if (/^01\d{8,9}$/.test(localDigits)) return localDigits;
  return "";
}

function buildSinglePaymentCustomer(user, userId) {
  const fullName = pickFirstText([user?.fullName, user?.name, user?.displayName, user?.username, "Code Destiny 고객"]).slice(0, 40);
  return {
    fullName,
    email: sanitizeCustomerEmail(user?.email, userId),
    phoneNumber: sanitizeCustomerPhone(user?.phoneNumber || user?.phone),
  };
}

async function verifySinglePaymentProfileOwner(userId, profileId) {
  const profile = await ProfileCard.findOne({ userId, profileId }).select("_id profileId").lean();
  if (profile) return profile;
  return null;
}

async function hasExistingSinglePaymentUnlock({ userId, profileId, featureKey, contentKey: requestedContentKey = "" }) {
  const contentKey = resolveProfileUnlockContentKey(featureKey, requestedContentKey);
  const serviceKey = resolveProfileUnlockServiceKey(featureKey, contentKey);
  if (contentKey && serviceKey) {
    // 결제창 호출 전에 프로필 단위 잠금 해제 이력을 먼저 확인해 중복 결제를 차단한다.
    const entitlement = await ContentEntitlement.findOne({
      userId: String(userId),
      profileId: String(profileId),
      serviceKey,
      contentKey,
      scope: CONTENT_ENTITLEMENT_SCOPES.PROFILE,
      status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }).select("_id unlockedAt orderId paymentId").lean();
    if (entitlement) return { source: "content_entitlement", entitlement };
  }

  // 영구 유료 콘텐츠는 결제 성공 주문도 보조 근거로 본다. Webhook/confirm 재시도 중에도 같은 콘텐츠 재결제를 막기 위함이다.
  const paidPayment = await Payment.findOne({
    userId,
    paymentType: "digital_content",
    accessType: "single_purchase",
    featureKey,
    status: { $in: SINGLE_PAYMENT_UNLOCKED_STATUSES },
    $and: [
      {
        $or: [
          { "pricingSnapshot.profileId": String(profileId) },
          { "pricingSnapshot.selectedProfileId": String(profileId) },
        ],
      },
      ...(contentKey ? [{
        $or: [
          { "pricingSnapshot.contentKey": contentKey },
          { "pricingSnapshot.contentId": contentKey },
        ],
      }] : []),
    ],
  }).sort({ createdAt: -1 }).lean();
  if (paidPayment) return { source: "payment", payment: paidPayment };
  return null;
}

function resolveSinglePaymentPricing(body = {}) {
  const featureKey = resolveSinglePaymentFeatureKey(body);
  if (!featureKey) {
    return {
      ok: false,
      status: 400,
      message: "contentId is required.",
      code: "CONTENT_ID_REQUIRED",
    };
  }

  const resolved = getBillingFeaturePricing({
    categoryKey: body?.categoryKey || body?.contentType,
    subFeatureKey: body?.subFeatureKey,
    featureKey,
    reason: body?.productName || body?.reason,
    mode: body?.mode,
    reportMode: body?.reportMode,
  });

  if (!resolved?.ok || !resolved.pricing) {
    return {
      ok: false,
      status: 400,
      message: resolved?.message || "Payment product price was not found.",
      code: "PRICE_NOT_FOUND",
    };
  }

  const pricing = resolved.pricing;
  const coinPrice = Number(pricing.coinPrice || pricing.cost || 0);
  if (!Number.isInteger(coinPrice) || coinPrice <= 0) {
    return {
      ok: false,
      status: 400,
      message: "Payment product value is invalid.",
      code: "INVALID_PRODUCT_PRICE",
    };
  }

  // 실제 청구 KRW는 레지스트리 정본(pricing.amountKRW)을 우선 사용한다. coinPrice*100 하드코딩은
  // KRW가 100의 배수가 아닌 상품에서 반올림 과금을 유발해 다른 결제 경로와 불일치하므로 쓰지 않는다.
  const amountKRW = normalizeKrwAmount(pricing.amountKRW) || calculateKrwAmountFromCoins(coinPrice);
  if (!Number.isInteger(amountKRW) || amountKRW <= 0) {
    return {
      ok: false,
      status: 400,
      message: "Payment product value is invalid.",
      code: "INVALID_PRODUCT_PRICE",
    };
  }

  return {
    ok: true,
    pricing,
    featureKey: String(pricing.featureKey || featureKey).trim(),
    coinPrice,
    amountKRW,
    source: resolved.source || "pricing",
  };
}

function buildSinglePaymentOrderResponse({ config, paymentId, orderName, amountKRW, coinPrice, payMethod, redirectUrl, customer, profileId, serviceId, contentId, contentKey, contentType, featureKey, targetYear, returnPath }) {
  return {
    storeId: config.storeId,
    channelKey: config.channelKey,
    paymentId,
    merchantUid: paymentId,
    orderName,
    totalAmount: amountKRW,
    paymentAmount: amountKRW,
    amountKRW,
    currency: config.currency || "CURRENCY_KRW",
    payMethod,
    // 🔴 noticeUrl 이 주문 응답에 없어서 클라가 인라인 config 경로를 탈 때 noticeUrls 가 전송되지
    // 않았고, 그 결과 웹훅 기반 결제 확정이 해피패스에서 조용히 비활성이었다.
    noticeUrl: config.noticeUrl || "",
    redirectUrl,
    customer,
    profileId,
    serviceId,
    contentId,
    contentKey,
    contentType,
    featureKey,
    targetYear,
    coinPrice,
    returnPath,
    orderState: SINGLE_PAYMENT_ORDER_STATES.PENDING,
  };
}

function normalizeSingleCompletePaymentId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 160);
}

function extractPortOneRawPaymentId(portOnePayment = {}) {
  const raw = portOnePayment?.rawV2 && typeof portOnePayment.rawV2 === "object" ? portOnePayment.rawV2 : portOnePayment;
  return String(
    raw?.paymentId
      || raw?.id
      || raw?.transaction?.paymentId
      || "",
  ).trim();
}

function extractPortOneStoreId(portOnePayment = {}) {
  const raw = portOnePayment?.rawV2 && typeof portOnePayment.rawV2 === "object" ? portOnePayment.rawV2 : portOnePayment;
  return String(
    raw?.storeId
      || raw?.store?.id
      || raw?.store?.storeId
      || portOnePayment?.storeId
      || "",
  ).trim();
}

function isPortOnePendingStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return ["ready", "pay_pending", "virtual_account_issued", "pending"].includes(normalized);
}

function buildSingleCompleteAccessGrant({ payment, entitlement, profileId, contentId, contentKey, contentType, serviceId, targetYear, paidAt }) {
  return {
    ok: true,
    accessType: "single_purchase",
    cancelEligible: true,
    purchaseId: String(payment?._id || ""),
    merchantUid: String(payment?.merchantUid || ""),
    paymentId: String(payment?.merchantUid || ""),
    featureKey: String(payment?.featureKey || contentId || ""),
    serviceId,
    contentId,
    contentKey,
    contentType,
    evidenceId: String(entitlement?._id || ""),
    profileId,
    selectedProfileId: profileId,
    targetYear,
    paidAt: paidAt ? new Date(paidAt).toISOString() : null,
  };
}

function isAdminPaymentAuth(auth = {}) {
  const role = String(auth?.role || "").trim().toLowerCase();
  return role === "admin" || auth?.isAdmin === true;
}

function readPositiveInteger(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return NaN;
  return number;
}

async function handleSinglePaymentCancel(request, env, auth) {
  // 인증·입력검증만 여기서 하고, 실제 취소/회수는 공용 코어(lib/payment-refund.js)에 위임한다.
  if (!isAdminPaymentAuth(auth)) {
    return json({ ok: false, message: "Admin permission is required.", code: "FORBIDDEN_ADMIN_REQUIRED" }, { status: 403 });
  }

  const body = await readJson(request);
  const paymentId = normalizeSingleCompletePaymentId(body?.paymentId || body?.merchantUid || body?.merchant_uid);
  const reason = String(body?.reason || "Admin single payment cancellation").trim().slice(0, 120);
  const requestedAmount = readPositiveInteger(body?.amount ?? body?.cancelAmount);
  const currentCancellableAmount = readPositiveInteger(body?.currentCancellableAmount);
  if (!paymentId) {
    return json({ ok: false, message: "paymentId is required.", code: "PAYMENT_ID_REQUIRED" }, { status: 400 });
  }
  if (Number.isNaN(requestedAmount)) {
    return json({ ok: false, message: "amount must be a positive integer.", code: "INVALID_CANCEL_AMOUNT" }, { status: 400 });
  }
  if (requestedAmount !== undefined && Number.isNaN(currentCancellableAmount)) {
    return json({ ok: false, message: "currentCancellableAmount must be a positive integer for partial cancellation.", code: "INVALID_CURRENT_CANCELLABLE_AMOUNT" }, { status: 400 });
  }
  if (requestedAmount !== undefined && currentCancellableAmount === undefined) {
    return json({ ok: false, message: "currentCancellableAmount is required for partial cancellation.", code: "CURRENT_CANCELLABLE_AMOUNT_REQUIRED" }, { status: 400 });
  }

  const paymentRecord = await Payment.findOne({
    merchantUid: paymentId,
    paymentType: "digital_content",
    accessType: "single_purchase",
  }).lean();
  if (!paymentRecord) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      merchantUid: paymentId,
      source: "system",
      stage: "single_cancel_order_lookup",
      code: "single_payment_order_not_found",
      message: "Single payment order was not found for cancellation.",
      status: 404,
      payload: { paymentId, securityEvent: true },
    });
    return json({ ok: false, message: "Single payment order was not found.", code: "ORDER_NOT_FOUND" }, { status: 404 });
  }

  if (isGuardianFortuneCreditPaymentRecord(paymentRecord)) {
    return json({
      ok: false,
      message: "대화권 환불은 사용 여부를 확인한 뒤 별도 검토가 필요합니다.",
      code: "GUARDIAN_FORTUNE_REFUND_REVIEW_REQUIRED",
    }, { status: 409 });
  }
  if (isFusionFortuneTicketPaymentRecord(paymentRecord)) {
    return json({
      ok: false,
      message: "초융합 운세 상담권 환불은 사용 여부를 확인한 뒤 별도 검토가 필요합니다.",
      code: "FUSION_FORTUNE_REFUND_REVIEW_REQUIRED",
    }, { status: 409 });
  }

  const result = await refundPaymentAsOperator({
    env,
    payment: paymentRecord,
    reason,
    amount: requestedAmount,
    currentCancellableAmount,
    actorId: auth.userId,
  });

  if (!result.ok) {
    return json({ ok: false, message: result.message, code: result.code }, { status: result.status || 400 });
  }

  return json({
    ok: true,
    idempotent: Boolean(result.idempotent),
    status: result.orderState,
    unlockRevoked: result.unlockRevoked === true,
    adminReviewRequired: result.adminReviewRequired === true,
    payment: formatPaymentResponse(result.payment || paymentRecord),
  });
}

async function upsertSinglePaymentUnlockRecord({ payment, paidAt }) {
  const profileId = cleanProfileId(payment?.pricingSnapshot?.profileId || payment?.pricingSnapshot?.selectedProfileId);
  const serviceId = String(payment?.pricingSnapshot?.serviceId || payment?.productId || CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU).trim().slice(0, 80);
  const contentId = String(payment?.pricingSnapshot?.contentId || payment?.featureKey || "").trim().slice(0, 160);
  const contentType = String(payment?.pricingSnapshot?.contentType || payment?.pricingSnapshot?.categoryKey || "digital_content").trim().slice(0, 80);
  const contentKey = resolveProfileUnlockContentKey(payment?.featureKey, payment?.pricingSnapshot?.contentKey || contentId) || contentId;
  const serviceKey = resolveProfileUnlockServiceKey(payment?.featureKey, contentKey) || CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU;
  const coinPrice = Math.max(0, Math.floor(Number(payment?.coinPrice || payment?.expectedChargedPoints || 0)));
  const amountKRW = Math.max(0, Math.floor(Number(payment?.paymentAmount || payment?.pricingSnapshot?.amountKRW || 0)));

  // 🔴 프로필 스코프 언락인지 아닌지로 엔타이틀먼트의 스코프가 갈린다. 판정 정본은
  // resolveProfileUnlockContentKey 하나다(다른 정산 경로 upsertSajuPaymentUnlockEntitlement 와
  // 코인 지급 경로 billing.js isProfileScopedUnlockKey 도 같은 판정을 쓴다).
  //
  // 이 구분이 없어서 profileId 가 없는 단건 결제(음악 트랙 등 프로필 무관 키 전부, 그리고 프로필
  // 카드가 0개인 계정의 모든 결제)가 Transaction.Paid 웹훅 정산에서 INVALID_UNLOCK_TARGET 으로
  // 죽었고, 그 catch 가 자동환불을 불러 PortOne 결제 취소 + paidFeatures 회수까지 갔다
  // — 즉 "결제 직후 서비스가 사라지는" 사고였다.
  const requiresProfile = Boolean(resolveProfileUnlockContentKey(payment?.featureKey, payment?.pricingSnapshot?.contentKey || contentId));

  // 🔴 계정 스코프 키는 주문에 profileId 가 실려 있어도 무시하고 USER 스코프로 고정한다.
  // 정적 셸(_cdBuildDirectCheckoutPayload)이 모든 단건 결제에 현재 프로필을 자동 주입하기 때문에,
  // 그대로 두면 계정 단위 상품이 프로필 단위로 잠겨 프로필을 바꾸는 순간 산 콘텐츠가 재잠김된다.
  const entitlementScope = requiresProfile ? CONTENT_ENTITLEMENT_SCOPES.PROFILE : CONTENT_ENTITLEMENT_SCOPES.USER;
  const entitlementProfileId = requiresProfile ? profileId : USER_SCOPE_PROFILE_ID;

  // 프로필 스코프 키의 진짜 결손(profileId 부재)은 계속 실패로 잡는다. 다만 호출부는 이걸
  // 자동환불이 아니라 관리자 검토 보류로 처리한다(handleSinglePaymentComplete 참고).
  if (!entitlementProfileId || !contentId || !contentKey) {
    const error = new Error("Single payment unlock target is missing.");
    error.code = "INVALID_UNLOCK_TARGET";
    throw error;
  }

  if (isUnlockPaidFeatureKey(payment?.featureKey)) {
    const entitlement = await grantPermanentUnlock({
      userId: String(payment.userId),
      profileId: entitlementProfileId,
      serviceKey,
      contentKey,
      featureKey: payment?.featureKey,
      scope: entitlementScope,
      source: CONTENT_ENTITLEMENT_SOURCES.PAYMENT,
      orderId: String(payment?.merchantUid || ""),
      paymentId: String(payment?.merchantUid || ""),
      evidenceId: String(payment?._id || payment?.merchantUid || ""),
      coinAmount: coinPrice,
      unlockedAt: paidAt,
    });
    return {
      ...entitlement,
      serviceId,
      contentId,
      contentType,
      coinPrice,
      amountKRW,
      unlockGrant: formatPermanentUnlockGrant(entitlement, {
        featureKey: payment?.featureKey,
        profileId: entitlementProfileId,
      }),
    };
  }

  const now = new Date();
  const effectiveUnlockedAt = paidAt ? new Date(paidAt) : now;
  // 결제 완료 API는 여러 번 호출될 수 있으므로 profileId + contentKey 단위로 upsert해 중복 unlock 생성을 막는다.
  return ContentEntitlement.findOneAndUpdate(
    {
      userId: String(payment.userId),
      profileId: entitlementProfileId,
      serviceKey,
      contentKey,
      scope: entitlementScope,
    },
    {
      $set: {
        serviceId,
        contentId,
        contentType,
        status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
        source: CONTENT_ENTITLEMENT_SOURCES.PAYMENT,
        unlockedBy: "single_payment",
        orderId: String(payment?.merchantUid || ""),
        paymentId: String(payment?.merchantUid || ""),
        coinAmount: coinPrice,
        coinPrice,
        amountKRW,
        expiresAt: null,
        updatedAt: now,
      },
      $setOnInsert: {
        userId: String(payment.userId),
        profileId: entitlementProfileId,
        serviceKey,
        contentKey,
        scope: entitlementScope,
        unlockedAt: Number.isNaN(effectiveUnlockedAt.getTime()) ? now : effectiveUnlockedAt,
        createdAt: now,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
}

// 지급 대상을 식별하지 못한 실패(프로필 결손 등)와 인프라 실패(Mongo 저장 실패)를 가른다.
// 전자는 돈을 돌려줄 사유가 아니다 — 이 시점에 recordUserPaidFeature 가 이미 권한을 줬고
// 실제 접근 판정(paid-feature-access.js)은 paidFeatures/unlockedFeatures 만 읽는다.
function isUnlockTargetIdentityError(error) {
  const code = String(error?.code || "").trim();
  return code === "INVALID_UNLOCK_TARGET" || code === "MISSING_PROFILE_ID";
}

function buildSinglePaymentRefundIdempotencyKey(payment, jobId = "no-job") {
  const paymentId = String(payment?.impUid || payment?.merchantUid || payment?._id || "no-payment").trim();
  const serviceId = String(payment?.pricingSnapshot?.serviceId || payment?.productId || payment?.featureKey || "unknown-service").trim();
  return `refund:${paymentId}:${serviceId}:${jobId || "no-job"}`.slice(0, 220);
}

function logPaidServicePaymentEvent(marker, payment = {}, extras = {}) {
  try {
    console.info(marker, JSON.stringify({
      userId: String(payment?.userId || extras.userId || ""),
      profileId: String(payment?.pricingSnapshot?.profileId || extras.profileId || ""),
      serviceId: String(payment?.pricingSnapshot?.serviceId || payment?.productId || payment?.featureKey || extras.serviceId || ""),
      paymentId: String(payment?.impUid || payment?.merchantUid || extras.paymentId || ""),
      merchantUid: String(payment?.merchantUid || extras.merchantUid || ""),
      impUid: String(payment?.impUid || extras.impUid || ""),
      jobId: String(extras.jobId || "no-job"),
      amount: Number(payment?.paymentAmount || extras.amount || 0),
      deliveryStatus: String(extras.deliveryStatus || ""),
      refundStatus: String(extras.refundStatus || ""),
      failureReason: String(extras.failureReason || payment?.failureMessage || ""),
    }));
  } catch (_) {
    console.info(marker);
  }
}

async function autoRefundSinglePaymentDeliveryFailure(env, payment, reasonCode, reasonMessage, failureStage) {
  if (!payment?._id) return { refunded: false, reason: "PAYMENT_MISSING" };
  if (payment.status === "cancelled" || payment.orderState === SINGLE_PAYMENT_ORDER_STATES.CANCELLED) {
    logPaidServicePaymentEvent("[PaidService Duplicate Refund Blocked]", payment, {
      deliveryStatus: "refunded",
      refundStatus: "refunded",
      failureReason: reasonMessage,
    });
    return { refunded: true, idempotent: true, payment };
  }

  const refundIdempotencyKey = buildSinglePaymentRefundIdempotencyKey(payment);
  logPaidServicePaymentEvent("[PaidService Auto Refund Requested]", payment, {
    deliveryStatus: "refund_pending",
    refundStatus: "pending",
    failureReason: reasonMessage,
  });

  try {
    const canceledPortOne = await cancelPortOnePayment(env, {
      impUid: payment.impUid || payment.merchantUid,
      merchantUid: payment.merchantUid || payment.impUid,
      reason: reasonMessage,
      checksum: Number(payment.paymentAmount || 0) || undefined,
      idempotencyKey: refundIdempotencyKey,
    });

    const now = new Date();
    const revocation = await revokeSinglePaymentContentAccess(payment, {
      status: CONTENT_ENTITLEMENT_STATUSES.REFUNDED,
      reason: reasonCode,
    });
    const canceledPayment = await Payment.findByIdAndUpdate(
      payment._id,
      {
        $set: {
          impUid: payment.impUid || payment.merchantUid || "",
          merchantUid: payment.merchantUid || payment.impUid || "",
          paymentAmount: Number(payment.paymentAmount || 0),
          status: "cancelled",
          orderState: SINGLE_PAYMENT_ORDER_STATES.CANCELLED,
          rawPortOne: canceledPortOne,
          failureCode: reasonCode,
          failureMessage: reasonMessage,
          failureStage,
          lastErrorAt: now,
          "metadata.deliveryStatus": "refunded",
          "metadata.refundStatus": "refunded",
          "metadata.refundIdempotencyKey": refundIdempotencyKey,
          "metadata.autoRefundedAt": now,
          "metadata.refundReason": reasonMessage,
          "metadata.unlockRevoked": revocation.unlockRevoked === true,
          "metadata.unlockRevocationStatus": revocation.status || CONTENT_ENTITLEMENT_STATUSES.REFUNDED,
          "metadata.unlockRevocationError": revocation.error || "",
        },
      },
      { returnDocument: "after" },
    ).lean();

    logPaidServicePaymentEvent("[PaidService Auto Refund Success]", canceledPayment || payment, {
      deliveryStatus: "refunded",
      refundStatus: "refunded",
      failureReason: reasonMessage,
    });
    return { refunded: true, payment: canceledPayment || payment };
  } catch (error) {
    const now = new Date();
    const failedPayment = await Payment.findByIdAndUpdate(
      payment._id,
      {
        $set: {
          orderState: SINGLE_PAYMENT_ORDER_STATES.ERROR,
          failureCode: `${reasonCode}_refund_failed`.slice(0, 120),
          failureMessage: String(error?.message || reasonMessage || "Automatic refund failed.").slice(0, 500),
          failureStage,
          lastErrorAt: now,
          "metadata.deliveryStatus": "refund_failed",
          "metadata.refundStatus": "refund_failed",
          "metadata.refundIdempotencyKey": refundIdempotencyKey,
          "metadata.refundFailedAt": now,
          "metadata.refundFailureReason": String(error?.message || error || "").slice(0, 500),
        },
      },
      { returnDocument: "after" },
    ).lean();
    logPaidServicePaymentEvent("[PaidService Auto Refund Failed]", failedPayment || payment, {
      deliveryStatus: "refund_failed",
      refundStatus: "refund_failed",
      failureReason: String(error?.message || reasonMessage || ""),
    });
    return { refunded: false, refundFailed: true, payment: failedPayment || payment, reason: String(error?.message || error || "") };
  }
}

async function recordUserPaidFeature(userId, featureKey, options = {}) {
  const key = String(featureKey || "").trim();
  if (!userId || !key) return null;
  const result = await User.updateOne(
    { _id: userId },
    {
      $addToSet: {
        paidFeatures: key,
        unlockedFeatures: key,
      },
    },
    options?.session ? { session: options.session } : undefined,
  );
  invalidatePaidAccessDecisionCacheForUser(userId);
  return result;
}

function buildSafePortOneLookupLog(portOnePayment = {}) {
  const raw = portOnePayment?.rawV2 && typeof portOnePayment.rawV2 === "object" ? portOnePayment.rawV2 : portOnePayment;
  const amountNode = raw?.amount && typeof raw.amount === "object" ? raw.amount : {};
  return {
    status: String(raw?.status || portOnePayment?.status || ""),
    hasPaymentId: Boolean(raw?.paymentId),
    hasId: Boolean(raw?.id),
    hasStoreId: Boolean(raw?.storeId || raw?.store?.id || raw?.store?.storeId),
    amountTotal: Number(amountNode?.total ?? portOnePayment?.amount ?? 0),
    currency: String(raw?.currency || amountNode?.currency || portOnePayment?.currency || ""),
  };
}

function extractPortOneTotalAmount(portOnePayment = {}) {
  const raw = portOnePayment?.rawV2 && typeof portOnePayment.rawV2 === "object" ? portOnePayment.rawV2 : portOnePayment;
  const amountNode = raw?.amount && typeof raw.amount === "object" ? raw.amount : {};
  const total = Number(amountNode?.total ?? portOnePayment?.amount);
  return Number.isFinite(total) ? total : 0;
}

function extractPortOneCurrency(portOnePayment = {}) {
  const raw = portOnePayment?.rawV2 && typeof portOnePayment.rawV2 === "object" ? portOnePayment.rawV2 : portOnePayment;
  const amountNode = raw?.amount && typeof raw.amount === "object" ? raw.amount : {};
  return normalizePortOneCurrency(raw?.currency || amountNode?.currency || portOnePayment?.currency);
}

// options.allowAutoRefund=false 로 부르면 지급 실패 시에도 PG 취소를 하지 않고 관리자 검토로 남긴다.
// 재조정 크론이 이 경로를 재사용하는데, 크론이 사람 승인 없이 돈을 돌려주면 안 되기 때문이다.
async function handleSinglePaymentComplete(request, env, auth, options = {}) {
  const allowAutoRefund = options.allowAutoRefund !== false;
  // forceDefer=true 는 allowAutoRefund 와 무관하게 PG 취소를 막는다. 지급 대상 식별 실패에 쓴다.
  const refundOrDefer = async (payment, reasonCode, reasonMessage, failureStage, { forceDefer = false } = {}) => {
    if (allowAutoRefund && !forceDefer) {
      return autoRefundSinglePaymentDeliveryFailure(env, payment, reasonCode, reasonMessage, failureStage);
    }
    await Payment.findByIdAndUpdate(payment._id, {
      $set: {
        failureCode: "delivery_failed_manual_review",
        failureMessage: String(reasonMessage || "").slice(0, 300),
        failureStage,
        lastErrorAt: new Date(),
      },
    }).catch(() => {});
    return { refunded: false, deferred: true, payment };
  };
  // 해금 기록 실패 응답. 식별 실패는 환불하지 않으므로 프론트가 "환불됐다"고 오안내하지 않도록
  // 코드·문구·상태를 분리한다. 2xx 로 내려 웹훅을 processed 로 확정한다 — profileId 결손은
  // 재시도해도 그대로라 재조정 크론이 같은 실패를 무한히 되풀이할 이유가 없다.
  const buildUnlockFailureResponse = (refund, fallbackPayment) => {
    if (refund.deferred) {
      return json({
        ok: false,
        code: "UNLOCK_RECORD_DEFERRED_ADMIN_REVIEW",
        message: "결제와 이용 권한은 정상 처리됐습니다. 해금 기록만 담당자가 확인 중이며 환불은 진행되지 않았습니다.",
        refundStatus: "not_refunded",
        adminReviewRequired: true,
        payment: formatPaymentResponse(refund.payment || fallbackPayment),
      }, { status: 202 });
    }
    return json({
      ok: false,
      code: refund.refunded ? "AUTO_REFUNDED_UNLOCK_UPSERT_FAILED" : "AUTO_REFUND_FAILED_UNLOCK_UPSERT_FAILED",
      message: refund.refunded
        ? "Paid content access could not be granted. The payment was fully refunded automatically."
        : "Paid content access could not be granted. Automatic refund requires administrator review.",
      refundStatus: refund.refunded ? "refunded" : "refund_failed",
      payment: formatPaymentResponse(refund.payment || fallbackPayment),
    }, { status: refund.refunded ? 502 : 500 });
  };
  const body = await readJson(request);
  const merchantUidHint = body?.merchantUid || body?.merchant_uid || body?.paymentId;
  const paymentId = normalizeSingleCompletePaymentId(merchantUidHint);
  if (!paymentId) {
    return json({ message: "paymentId is required.", code: "PAYMENT_ID_REQUIRED" }, { status: 400 });
  }

  const order = await Payment.findOne({
    merchantUid: paymentId,
    paymentType: "digital_content",
    accessType: "single_purchase",
  }).lean();

  if (!order) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      merchantUid: paymentId,
      source: "confirm",
      stage: "single_order_lookup",
      code: "single_payment_order_not_found",
      message: "Single payment order was not found.",
      status: 404,
      payload: { paymentId, securityEvent: true },
    });
    return json({ ok: false, message: "Single payment order was not found.", code: "ORDER_NOT_FOUND" }, { status: 404 });
  }

  if (String(order.userId) !== String(auth.userId)) {
    return json({ ok: false, message: "Only your own payment can be completed.", code: "FORBIDDEN_PAYMENT_OWNER" }, { status: 403 });
  }

  if (isGuardianFortuneCreditPaymentRecord(order)) {
    try {
      const result = await settleGuardianFortunePayment({
        env,
        paymentId,
        providerPaymentId: body?.impUid || body?.paymentId || paymentId,
        userId: auth.userId,
        source: "confirm",
      });
      const balance = await getGuardianFortuneCreditBalance(auth.userId);
      return json({
        ok: true,
        idempotent: Boolean(result.idempotent),
        message: "달빛 귀인 대화권이 충전되었어요.",
        product: result.product,
        balance,
        payment: formatPaymentResponse(result.payment),
      });
    } catch (error) {
      return json({
        ok: false,
        code: String(error?.code || "GUARDIAN_FORTUNE_PAYMENT_FAILED"),
        message: String(error?.message || "대화권 결제 확인에 실패했습니다."),
      }, { status: Number(error?.status) || 400 });
    }
  }

  if (isFusionFortuneTicketPaymentRecord(order)) {
    try {
      const result = await settleFusionFortuneTicketPayment({
        env,
        paymentId,
        providerPaymentId: body?.impUid || body?.paymentId || paymentId,
        userId: auth.userId,
      });
      const balance = await getFusionFortuneTicketBalance(auth.userId);
      return json({ ok: true, idempotent: Boolean(result.idempotent), message: "초융합 운세 상담권이 충전되었어요.", product: result.product, balance, payment: formatPaymentResponse(result.payment) });
    } catch (error) {
      return json({ ok: false, code: String(error?.code || "FUSION_FORTUNE_PAYMENT_FAILED"), message: String(error?.message || "초융합 운세 상담권 결제 확인에 실패했습니다.") }, { status: Number(error?.status) || 400 });
    }
  }

  if (order.status === "success" || order.status === "fulfilled") {
    const paidAt = order.paidAt ? new Date(order.paidAt) : new Date();
    let entitlement;
    try {
      // 🔴 권한 지급을 해금 기록보다 먼저 한다. 반대 순서면 upsert 가 throw 할 때 권한이 아예 안 나가서
      // "환불하지 않고 보류"가 성립하지 않는다. 정당한 환불 경로는 revokeSinglePaymentContentAccess 가
      // 이 권한까지 회수하므로 순서를 바꿔도 과지급이 남지 않는다.
      await recordUserPaidFeature(order.userId, order.featureKey);
      entitlement = await upsertSinglePaymentUnlockRecord({ payment: order, paidAt });
    } catch (error) {
      const reasonMessage = String(error?.message || "Unlock upsert failed.");
      const refund = await refundOrDefer(order, "unlock_upsert_failed", reasonMessage, "single_unlock_upsert", {
        forceDefer: isUnlockTargetIdentityError(error),
      });
      return buildUnlockFailureResponse(refund, order);
    }
    await Payment.findByIdAndUpdate(order._id, {
      $set: { orderState: SINGLE_PAYMENT_ORDER_STATES.UNLOCKED },
    }).catch(() => {});
    return json({
      ok: true,
      idempotent: true,
      alreadyCompleted: true,
      status: SINGLE_PAYMENT_ORDER_STATES.UNLOCKED,
      payment: formatPaymentResponse(order),
      unlockGrant: entitlement?.unlockGrant || null,
      accessGrant: buildSingleCompleteAccessGrant({
        payment: order,
        entitlement,
        profileId: String(entitlement?.profileId || order.pricingSnapshot?.profileId || ""),
        contentId: String(entitlement?.contentId || order.pricingSnapshot?.contentId || order.featureKey || ""),
        contentKey: String(entitlement?.contentKey || order.pricingSnapshot?.contentKey || ""),
        contentType: String(entitlement?.contentType || order.pricingSnapshot?.contentType || "digital_content"),
        serviceId: String(entitlement?.serviceId || order.pricingSnapshot?.serviceId || order.productId || ""),
        targetYear: order.pricingSnapshot?.targetYear,
        paidAt,
      }),
    });
  }

  if (order.status === "failed" || order.status === "cancelled" || order.status === "refunded") {
    return json({
      ok: false,
      idempotent: true,
      status: String(order.orderState || order.status || "").toUpperCase(),
      message: "Payment order is not completable.",
      payment: formatPaymentResponse(order),
    }, { status: 409 });
  }

  let portOnePayment;
  try {
    portOnePayment = await fetchPortOnePayment(env, paymentId);
  } catch (error) {
    await Payment.findByIdAndUpdate(order._id, {
      $set: {
        orderState: SINGLE_PAYMENT_ORDER_STATES.ERROR,
        failureCode: "portone_fetch_failed",
        failureMessage: error?.message || "PortOne payment lookup failed.",
        failureStage: "single_portone_fetch",
        lastErrorAt: new Date(),
      },
      $inc: { confirmAttempts: 1 },
    }).catch(() => {});
    await writeFailureLog({
      request,
      userId: auth.userId,
      merchantUid: paymentId,
      source: "confirm",
      stage: "single_portone_fetch",
      code: "portone_fetch_failed",
      message: error?.message || "PortOne payment lookup failed.",
      status: 502,
      payload: { paymentId },
    });
    return json({ ok: false, message: "Payment lookup failed. Please try again.", code: "PORTONE_FETCH_FAILED" }, { status: 502 });
  }

  const config = getPortOnePublicConfig(env);
  const rawPaymentId = extractPortOneRawPaymentId(portOnePayment);
  const portOneStatus = String(portOnePayment?.status || "").trim().toLowerCase();
  const portOneStoreId = extractPortOneStoreId(portOnePayment);
  const portOneAmount = extractPortOneTotalAmount(portOnePayment);
  const portOneCurrency = extractPortOneCurrency(portOnePayment);
  const expectedAmount = Number(order.paymentAmount || order.pricingSnapshot?.amountKRW || 0);
  const safePortOneLog = buildSafePortOneLookupLog(portOnePayment);

  if (!rawPaymentId || rawPaymentId !== paymentId) {
    await markPaymentFailure(order, {
      status: "failed",
      orderState: SINGLE_PAYMENT_ORDER_STATES.VERIFY_FAILED,
      paymentMethod: order.paymentMethod,
      failureCode: "portone_payment_id_mismatch",
      failureMessage: "PortOne payment id does not match internal paymentId.",
      failureStage: "single_payment_id_validate",
      incrementAttempt: true,
    });
    await writeFailureLog({
      request,
      userId: auth.userId,
      merchantUid: paymentId,
      source: "confirm",
      stage: "single_payment_id_validate",
      code: "portone_payment_id_mismatch",
      message: "PortOne payment id does not match internal paymentId.",
      status: 400,
      payload: { paymentId, portOne: safePortOneLog, securityEvent: true },
    });
    return json({ ok: false, message: "Payment id verification failed.", code: "PORTONE_PAYMENT_ID_MISMATCH" }, { status: 400 });
  }

  if (config.storeId && portOneStoreId !== config.storeId) {
    await markPaymentFailure(order, {
      status: "failed",
      orderState: SINGLE_PAYMENT_ORDER_STATES.VERIFY_FAILED,
      paymentMethod: order.paymentMethod,
      failureCode: "store_id_mismatch",
      failureMessage: "PortOne storeId does not match configured store.",
      failureStage: "single_store_validate",
      incrementAttempt: true,
    });
    await writeFailureLog({
      request,
      userId: auth.userId,
      merchantUid: paymentId,
      source: "confirm",
      stage: "single_store_validate",
      code: "store_id_mismatch",
      message: "PortOne storeId does not match configured store.",
      status: 400,
      payload: { paymentId, portOne: safePortOneLog, securityEvent: true },
    });
    return json({ ok: false, message: "Payment store verification failed.", code: "STORE_ID_MISMATCH" }, { status: 400 });
  }

  if (!Number.isInteger(portOneAmount) || portOneAmount !== expectedAmount) {
    await markPaymentFailure(order, {
      status: "failed",
      orderState: SINGLE_PAYMENT_ORDER_STATES.VERIFY_FAILED,
      paymentMethod: order.paymentMethod,
      failureCode: "amount_mismatch",
      failureMessage: "PortOne amount.total does not match internal order amount.",
      failureStage: "single_amount_validate",
      incrementAttempt: true,
    });
    await writeFailureLog({
      request,
      userId: auth.userId,
      merchantUid: paymentId,
      source: "confirm",
      stage: "single_amount_validate",
      code: "amount_mismatch",
      message: "PortOne amount.total does not match internal order amount.",
      status: 400,
      expectedAmount,
      portOneAmount,
      payload: { paymentId, portOne: safePortOneLog, securityEvent: true },
    });
    return json({ ok: false, message: "Payment amount verification failed.", code: "AMOUNT_MISMATCH" }, { status: 400 });
  }

  if (!isPortOneKrwCurrency(portOneCurrency)) {
    await markPaymentFailure(order, {
      status: "failed",
      orderState: SINGLE_PAYMENT_ORDER_STATES.VERIFY_FAILED,
      paymentMethod: order.paymentMethod,
      failureCode: "currency_mismatch",
      failureMessage: "PortOne currency must be KRW.",
      failureStage: "single_currency_validate",
      incrementAttempt: true,
    });
    await writeFailureLog({
      request,
      userId: auth.userId,
      merchantUid: paymentId,
      source: "confirm",
      stage: "single_currency_validate",
      code: "currency_mismatch",
      message: "PortOne currency must be KRW.",
      status: 400,
      payload: { paymentId, portOne: safePortOneLog, securityEvent: true },
    });
    return json({ ok: false, message: "Payment currency verification failed.", code: "CURRENCY_MISMATCH" }, { status: 400 });
  }

  if (portOneStatus !== "paid") {
    const nextStatus = portOneStatus === "cancelled" || portOneStatus === "failed"
      ? (portOneStatus === "cancelled" ? "cancelled" : "failed")
      : "pending";
    const nextOrderState = portOneStatus === "cancelled"
      ? SINGLE_PAYMENT_ORDER_STATES.CANCELLED
      : (portOneStatus === "failed"
        ? SINGLE_PAYMENT_ORDER_STATES.FAILED
        : (portOneStatus === "virtual_account_issued"
          ? SINGLE_PAYMENT_ORDER_STATES.VIRTUAL_ACCOUNT_ISSUED
          : SINGLE_PAYMENT_ORDER_STATES.PENDING));
    await Payment.findByIdAndUpdate(order._id, {
      $set: {
        status: nextStatus,
        orderState: nextOrderState,
        rawPortOne: portOnePayment,
        failureCode: nextStatus === "pending" ? null : "payment_not_paid",
        failureMessage: nextStatus === "pending" ? null : "Payment is not in paid status.",
        failureStage: nextStatus === "pending" ? null : "single_status_validate",
        lastErrorAt: nextStatus === "pending" ? null : new Date(),
      },
      $inc: { confirmAttempts: 1 },
    }).catch(() => {});
    return json({
      ok: false,
      pending: isPortOnePendingStatus(portOneStatus),
      status: portOneStatus ? portOneStatus.toUpperCase() : "UNKNOWN",
      orderState: nextOrderState,
      message: isPortOnePendingStatus(portOneStatus)
        ? "Payment is still pending."
        : "Payment is not in paid status.",
      code: isPortOnePendingStatus(portOneStatus) ? "PAYMENT_PENDING" : "PAYMENT_NOT_PAID",
    }, { status: isPortOnePendingStatus(portOneStatus) ? 202 : 400 });
  }

  const existingUnlock = await hasExistingSinglePaymentUnlock({
    userId: order.userId,
    profileId: order.pricingSnapshot?.profileId,
    featureKey: order.featureKey,
    contentKey: order.pricingSnapshot?.contentKey || order.pricingSnapshot?.contentId,
  });
  const paidAt = toDateFromUnixSeconds(portOnePayment.paid_at);

  const completedPayment = await Payment.findOneAndUpdate(
    { _id: order._id, status: { $nin: ["success", "fulfilled"] } },
    {
      $set: {
        impUid: paymentId,
        merchantUid: paymentId,
        paymentAmount: expectedAmount,
        expectedChargedPoints: Number(order.expectedChargedPoints || order.coinPrice || 0),
        chargedPoints: 0,
        coinPrice: Number(order.coinPrice || order.expectedChargedPoints || 0),
        membershipCreditCost: calculateMembershipCreditCost(Number(order.coinPrice || order.expectedChargedPoints || 0)),
        accessType: "single_purchase",
        status: "processing",
        orderState: SINGLE_PAYMENT_ORDER_STATES.PAID_VERIFIED,
        paidAt,
        source: "confirm",
        rawPortOne: portOnePayment,
        failureCode: null,
        failureMessage: null,
        failureStage: null,
        lastErrorAt: null,
      },
      $inc: { confirmAttempts: 1 },
    },
    { returnDocument: "after" },
  ).lean();

  const finalPayment = completedPayment || await Payment.findById(order._id).lean();
  let entitlement = existingUnlock?.entitlement || null;
  if (!entitlement) {
    try {
      // 권한 지급 먼저(위 멱등 경로와 같은 이유).
      await recordUserPaidFeature(finalPayment.userId, finalPayment.featureKey);
      entitlement = await upsertSinglePaymentUnlockRecord({ payment: finalPayment, paidAt });
    } catch (error) {
      const reasonMessage = String(error?.message || "Unlock upsert failed.");
      const refund = await refundOrDefer(finalPayment, "unlock_upsert_failed", reasonMessage, "single_unlock_upsert", {
        forceDefer: isUnlockTargetIdentityError(error),
      });
      return buildUnlockFailureResponse(refund, finalPayment);
    }
  } else {
    await recordUserPaidFeature(finalPayment.userId, finalPayment.featureKey);
  }
  const unlockedPayment = await Payment.findByIdAndUpdate(finalPayment._id, {
    $set: {
      status: "fulfilled",
      orderState: SINGLE_PAYMENT_ORDER_STATES.UNLOCKED,
      failureCode: null,
      failureMessage: null,
      failureStage: null,
      lastErrorAt: null,
    },
  }, { returnDocument: "after" }).lean();
  const responsePayment = unlockedPayment || { ...finalPayment, status: "fulfilled", orderState: SINGLE_PAYMENT_ORDER_STATES.UNLOCKED };

  return json({
    ok: true,
    idempotent: !completedPayment || Boolean(existingUnlock),
    alreadyUnlocked: Boolean(existingUnlock),
    status: SINGLE_PAYMENT_ORDER_STATES.UNLOCKED,
    payment: formatPaymentResponse(responsePayment),
    unlockGrant: entitlement?.unlockGrant || null,
    accessGrant: buildSingleCompleteAccessGrant({
      payment: responsePayment,
      entitlement,
      profileId: String(entitlement?.profileId || responsePayment?.pricingSnapshot?.profileId || ""),
      contentId: String(entitlement?.contentId || responsePayment?.pricingSnapshot?.contentId || responsePayment?.featureKey || ""),
      contentKey: String(entitlement?.contentKey || responsePayment?.pricingSnapshot?.contentKey || ""),
      contentType: String(entitlement?.contentType || responsePayment?.pricingSnapshot?.contentType || "digital_content"),
      serviceId: String(entitlement?.serviceId || responsePayment?.pricingSnapshot?.serviceId || responsePayment?.productId || ""),
      targetYear: responsePayment?.pricingSnapshot?.targetYear,
      paidAt,
    }),
  });
}

function extractPortOneWebhookType(body = {}) {
  return String(
    body?.type
      || body?.eventType
      || body?.webhookType
      || body?.data?.type
      || body?.data?.eventType
      || "",
  ).trim();
}

function extractPortOneWebhookPaymentId(body = {}) {
  return normalizeSingleCompletePaymentId(
    body?.data?.paymentId
      || body?.paymentId
      || body?.imp_uid
      || body?.impUid
      || body?.data?.imp_uid
      || body?.data?.id
      || "",
  );
}

async function runSinglePaymentCompleteFromWebhook(request, env, paymentId, body) {
  const order = await Payment.findOne({
    merchantUid: paymentId,
    paymentType: "digital_content",
    accessType: "single_purchase",
  }).select("userId merchantUid status paymentType accessType productId paymentAmount metadata").lean();

  if (!order) {
    await writeFailureLog({
      request,
      merchantUid: paymentId,
      source: "webhook",
      stage: "single_order_lookup",
      code: "single_payment_order_not_found",
      message: "Single payment order was not found for webhook.",
      status: 404,
      payload: { paymentId, type: extractPortOneWebhookType(body), securityEvent: true },
    });
    return json({ ok: false, message: "Single payment order was not found.", code: "ORDER_NOT_FOUND" }, { status: 404 });
  }

  // Transaction.Paid 웹훅은 body 자체를 신뢰하지 않고 Phase 5 complete 경로를 재사용해 포트원 단건 조회로 다시 검증한다.
  if (isGuardianFortuneCreditPaymentRecord(order)) {
    try {
      const result = await settleGuardianFortunePayment({
        env,
        paymentId,
        userId: order.userId,
        source: "webhook",
      });
      return json({
        ok: true,
        idempotent: Boolean(result.idempotent),
        paymentId,
        productId: result.product.productId,
        balanceAfter: result.balanceAfter,
      });
    } catch (error) {
      return json({
        ok: false,
        code: String(error?.code || "GUARDIAN_FORTUNE_WEBHOOK_SETTLEMENT_FAILED"),
        message: String(error?.message || "대화권 결제 적립에 실패했습니다."),
      }, { status: Number(error?.status) || 400 });
    }
  }


  if (isFusionFortuneTicketPaymentRecord(order)) {
    try {
      const result = await settleFusionFortuneTicketPayment({ env, paymentId, userId: order.userId });
      return json({ ok: true, idempotent: Boolean(result.idempotent), paymentId, productId: result.product.productId, balanceAfter: result.balanceAfter });
    } catch (error) {
      return json({ ok: false, code: String(error?.code || "FUSION_FORTUNE_WEBHOOK_SETTLEMENT_FAILED"), message: String(error?.message || "초융합 운세 상담권 결제 적립에 실패했습니다.") }, { status: Number(error?.status) || 400 });
    }
  }

  const completeRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ paymentId }),
  });
  return handleSinglePaymentComplete(completeRequest, env, { userId: order.userId });
}

async function markVirtualAccountIssuedFromWebhook({ request, paymentId, body }) {
  const updated = await Payment.findOneAndUpdate(
    {
      merchantUid: paymentId,
      paymentType: "digital_content",
      accessType: "single_purchase",
      status: { $nin: ["success", "fulfilled"] },
      orderState: { $nin: [SINGLE_PAYMENT_ORDER_STATES.PAID_VERIFIED, SINGLE_PAYMENT_ORDER_STATES.UNLOCKED] },
    },
    {
      $set: {
        status: "pending",
        orderState: SINGLE_PAYMENT_ORDER_STATES.VIRTUAL_ACCOUNT_ISSUED,
        paymentMethod: "VIRTUAL_ACCOUNT",
        source: "webhook",
        rawPortOne: body,
        failureCode: null,
        failureMessage: null,
        failureStage: null,
        lastErrorAt: null,
      },
      $inc: { confirmAttempts: 1 },
    },
    { returnDocument: "after" },
  ).lean();

  return json({
    ok: true,
    idempotent: !updated,
    status: "PENDING",
    pendingReason: "VIRTUAL_ACCOUNT_ISSUED",
    paymentId,
  });
}

async function markPaymentFailedFromWebhook({ request, paymentId, body }) {
  const updated = await Payment.findOneAndUpdate(
    {
      merchantUid: paymentId,
      paymentType: "digital_content",
      accessType: "single_purchase",
      status: { $nin: ["success", "fulfilled"] },
      orderState: { $nin: [SINGLE_PAYMENT_ORDER_STATES.PAID_VERIFIED, SINGLE_PAYMENT_ORDER_STATES.UNLOCKED] },
    },
    {
      $set: {
        status: "failed",
        orderState: SINGLE_PAYMENT_ORDER_STATES.FAILED,
        source: "webhook",
        rawPortOne: body,
        failureCode: "transaction_failed",
        failureMessage: "PortOne Transaction.Failed webhook received.",
        failureStage: "webhook_failed",
        lastErrorAt: new Date(),
      },
      $inc: { confirmAttempts: 1 },
    },
    { returnDocument: "after" },
  ).lean();

  return json({
    ok: true,
    idempotent: !updated,
    status: updated ? "FAILED" : "UNCHANGED",
    paymentId,
  });
}

async function markPaymentCancellationForAdminReview({ request, paymentId, body, partial = false }) {
  const current = await Payment.findOne({
    merchantUid: paymentId,
    paymentType: "digital_content",
    accessType: "single_purchase",
  }).lean();
  if (!current) {
    await writeFailureLog({
      request,
      merchantUid: paymentId,
      source: "webhook",
      stage: "cancel_order_lookup",
      code: "single_payment_order_not_found",
      message: "Single payment order was not found for cancellation webhook.",
      status: 404,
      payload: { paymentId, type: extractPortOneWebhookType(body) },
    });
    return json({ ok: true, ignored: true, reason: "ORDER_NOT_FOUND", paymentId });
  }

  if (isGuardianFortuneCreditPaymentRecord(current)) {
    await Payment.findByIdAndUpdate(current._id, {
      $set: {
        status: partial ? "refunded" : "cancelled",
        orderState: partial ? SINGLE_PAYMENT_ORDER_STATES.PARTIAL_CANCELLED : SINGLE_PAYMENT_ORDER_STATES.CANCELLED,
        source: "webhook",
        failureCode: "guardian_fortune_refund_review_required",
        failureMessage: "Guardian Fortune credit refund requires usage review.",
        failureStage: "webhook_guardian_fortune_refund_review",
        "metadata.guardianFortuneRefundReviewRequired": true,
        "metadata.guardianFortuneCreditRevoked": false,
        lastErrorAt: new Date(),
      },
      $inc: { confirmAttempts: 1 },
    }).catch(() => {});
    return json({
      ok: true,
      idempotent: false,
      status: "GUARDIAN_FORTUNE_REFUND_REVIEW_REQUIRED",
      paymentId,
      unlockRevoked: false,
      adminReviewRequired: true,
    });
  }

  if (isFusionFortuneTicketPaymentRecord(current)) {
    await Payment.findByIdAndUpdate(current._id, {
      $set: {
        status: partial ? "refunded" : "cancelled",
        orderState: partial ? SINGLE_PAYMENT_ORDER_STATES.PARTIAL_CANCELLED : SINGLE_PAYMENT_ORDER_STATES.CANCELLED,
        source: "webhook",
        failureCode: "fusion_fortune_refund_review_required",
        failureMessage: "Fusion Fortune ticket refund requires usage review.",
        failureStage: "webhook_fusion_fortune_refund_review",
        "metadata.fusionFortuneRefundReviewRequired": true,
        "metadata.fusionFortuneTicketRevoked": false,
        lastErrorAt: new Date(),
      },
      $inc: { confirmAttempts: 1 },
    }).catch(() => {});
    return json({ ok: true, idempotent: false, status: "FUSION_FORTUNE_REFUND_REVIEW_REQUIRED", paymentId, unlockRevoked: false, adminReviewRequired: true });
  }

  const completed = current.status === "success" || current.status === "fulfilled";
  const nextStatus = partial ? (completed ? current.status : "refunded") : "cancelled";
  const nextOrderState = partial
    ? SINGLE_PAYMENT_ORDER_STATES.PARTIAL_CANCELLED
    : SINGLE_PAYMENT_ORDER_STATES.CANCELLED;
  const revocation = partial
    ? { unlockRevoked: false, adminReviewRequired: true }
    : await revokeSinglePaymentContentAccess(current, {
      status: CONTENT_ENTITLEMENT_STATUSES.CANCELLED,
      reason: "webhook_payment_cancellation",
    });
  const adminReviewRequired = partial || revocation.adminReviewRequired === true;
  await Payment.findByIdAndUpdate(current._id, {
    $set: {
      status: nextStatus,
      orderState: nextOrderState,
      source: "webhook",
      rawPortOne: body,
      "metadata.unlockRevoked": revocation.unlockRevoked === true,
      "metadata.unlockRevocationStatus": revocation.status || (partial ? "" : CONTENT_ENTITLEMENT_STATUSES.CANCELLED),
      "metadata.unlockRevocationError": revocation.error || "",
      "pricingSnapshot.unlockRevoked": revocation.unlockRevoked === true,
      "pricingSnapshot.cancellationReviewRequired": adminReviewRequired,
      failureCode: partial ? "partial_cancel_admin_review" : "cancel_admin_review",
      failureMessage: partial
        ? "Partial cancellation webhook received. Unlock is not revoked automatically."
        : (adminReviewRequired
          ? "Cancellation webhook received. Unlock revocation requires administrator review."
          : "Cancellation webhook received. Unlock was revoked."),
      failureStage: adminReviewRequired ? "webhook_cancel_admin_review" : "webhook_cancel_unlock_revoked",
      lastErrorAt: new Date(),
    },
    $inc: { confirmAttempts: 1 },
  }).catch(() => {});

  return json({
    ok: true,
    idempotent: false,
    status: adminReviewRequired ? "ADMIN_REVIEW_REQUIRED" : nextOrderState,
    paymentId,
    unlockRevoked: revocation.unlockRevoked === true,
    adminReviewRequired,
  });
}

async function handleSinglePaymentStart(request, env, auth) {
  const body = await readJson(request);
  const profileId = cleanProfileId(body?.profileId || body?.selectedProfileId);
  if (!profileId) {
    return json({ message: "profileId is required.", code: "PROFILE_ID_REQUIRED" }, { status: 400 });
  }

  const ownedProfile = await verifySinglePaymentProfileOwner(auth.userId, profileId);
  if (!ownedProfile) {
    return json({ message: "Profile not found.", code: "PROFILE_NOT_FOUND" }, { status: 404 });
  }

  const resolved = resolveSinglePaymentPricing(body);
  if (!resolved.ok) {
    return json({ message: resolved.message, code: resolved.code || "PRICE_NOT_FOUND" }, { status: resolved.status || 400 });
  }

  const clientCoinPrice = body?.coinPrice === undefined || body?.coinPrice === null ? undefined : Number(body.coinPrice);
  if (clientCoinPrice !== undefined && clientCoinPrice !== resolved.coinPrice) {
    return json({
      message: "Client coinPrice does not match server product price.",
      code: "CLIENT_COIN_PRICE_MISMATCH",
      expectedCoinPrice: resolved.coinPrice,
      clientCoinPrice,
    }, { status: 400 });
  }

  const unlockEvidence = await hasExistingSinglePaymentUnlock({
    userId: auth.userId,
    profileId,
    featureKey: resolved.featureKey,
    contentKey: body?.contentKey,
  });
  if (unlockEvidence) {
    return json({
      ok: true,
      alreadyUnlocked: true,
      profileId,
      serviceId: String(body?.serviceId || resolved.pricing?.serviceId || "").trim().slice(0, 80),
      contentId: String(body?.contentId || resolved.featureKey).trim().slice(0, 120),
      contentType: String(body?.contentType || resolved.pricing?.categoryKey || "digital_content").trim().slice(0, 80),
      featureKey: resolved.featureKey,
      unlockSource: unlockEvidence.source,
    });
  }

  const config = getPortOnePublicConfig(env);
  if (!config.configured) {
    return json({
      message: "PortOne V2 KG Inicis payment config is missing.",
      code: "PORTONE_V2_CONFIG_MISSING",
      missing: {
        storeId: !config.storeId,
        channelKey: !config.channelKey,
        serverVerification: !config.serverVerificationConfigured,
        inicisMid: !config.inicisMidConfigured,
        inicisSignKey: !config.inicisSignKeyConfigured,
        inicisApiKey: !config.inicisApiKeyConfigured,
        inicisApiIv: !config.inicisApiIvConfigured,
      },
    }, { status: 503 });
  }

  const idempotencyKey = resolveIdempotencyKey(request, body);
  const serviceId = String(body?.serviceId || body?.serviceKey || resolved.pricing?.serviceId || "code-destiny").trim().slice(0, 80);
  const targetYear = body?.targetYear === undefined || body?.targetYear === null ? undefined : Number(body.targetYear);
  const contentKey = String(
    body?.contentKey
      || resolved.pricing?.contentKey
      || (isSukuyoYearlyPaymentKey(resolved.featureKey) && Number.isInteger(targetYear) ? `${SUKYO_YEARLY_FORTUNE_PRODUCT_KEY}:${targetYear}` : ""),
  ).trim().slice(0, 160);
  const contentId = String(body?.contentId || contentKey || resolved.featureKey).trim().slice(0, 120);
  const contentType = String(body?.contentType || resolved.pricing?.categoryKey || "digital_content").trim().slice(0, 80);
  const returnPath = sanitizeReturnPath(body?.returnPath);
  const payMethod = resolveSinglePayMethod(body?.payMethod || body?.paymentMethod);
  const productName = buildDigitalProductName(body, resolved.pricing);
  const orderName = trimUtf8Bytes(productName || "Code Destiny 운세", 40) || "Code Destiny";
  const user = await User.findById(auth.userId).select("name email phone phoneNumber fullName displayName username").lean();
  const customer = buildSinglePaymentCustomer(user, auth.userId);

  if (idempotencyKey) {
    const existing = await Payment.findOne({
      userId: auth.userId,
      idempotencyKey,
      paymentType: "digital_content",
    }).sort({ createdAt: -1 }).lean();

    if (existing) {
      const existingAmount = Number(existing.paymentAmount || 0);
      const existingCoins = Number(existing.coinPrice || existing.expectedChargedPoints || 0);
      const existingProfileId = String(existing.pricingSnapshot?.profileId || existing.pricingSnapshot?.selectedProfileId || "");
      const existingContentId = String(existing.pricingSnapshot?.contentId || existing.featureKey || "");
      const existingContentKey = String(existing.pricingSnapshot?.contentKey || (isSukuyoYearlyPaymentKey(existing.featureKey) ? existing.pricingSnapshot?.contentId : "") || "");
      const existingTargetYear = existing.pricingSnapshot?.targetYear === undefined || existing.pricingSnapshot?.targetYear === null ? undefined : Number(existing.pricingSnapshot.targetYear);
      const targetYearConflicts = targetYear !== undefined && existingTargetYear !== targetYear;
      if (existingAmount !== resolved.amountKRW || existingCoins !== resolved.coinPrice || existingProfileId !== profileId || existingContentId !== contentId || (contentKey && existingContentKey !== contentKey) || targetYearConflicts) {
        return json({
          message: "Idempotency key conflict. Request payload does not match existing single payment order.",
          code: "IDEMPOTENCY_CONFLICT",
        }, { status: 409 });
      }

      const existingPaymentId = String(existing.merchantUid || "");
      const redirectUrl = buildSinglePaymentRedirectUrl({ env, request, returnPath, paymentId: existingPaymentId });
      return json({
        ok: true,
        alreadyUnlocked: false,
        idempotent: true,
        order: buildSinglePaymentOrderResponse({
          config,
          paymentId: existingPaymentId,
          orderName,
          amountKRW: existingAmount,
          coinPrice: existingCoins,
          payMethod,
          redirectUrl,
          customer,
          profileId,
          serviceId,
          contentId,
          contentKey,
          contentType,
          featureKey: resolved.featureKey,
          targetYear,
          returnPath,
        }),
      });
    }
  }

  const paymentId = buildSinglePaymentId(auth.userId);
  const redirectUrl = buildSinglePaymentRedirectUrl({ env, request, returnPath, paymentId });

  // 내부 주문을 먼저 PENDING으로 저장한다. 이후 confirm/webhook에서 포트원 단건 조회로 금액/상태를 검증한 뒤 unlock을 저장한다.
  await Payment.create({
    userId: auth.userId,
    merchantUid: paymentId,
    idempotencyKey,
    paymentAmount: resolved.amountKRW,
    expectedChargedPoints: resolved.coinPrice,
    chargedPoints: 0,
    featureKey: resolved.featureKey,
    productId: serviceId,
    coinPrice: resolved.coinPrice,
    membershipCreditCost: calculateMembershipCreditCost(resolved.coinPrice),
    accessType: "single_purchase",
    pricingSnapshot: {
      ...resolved.pricing,
      userId: String(auth.userId || ""),
      profileId,
      selectedProfileId: profileId,
      serviceId,
      contentId,
      contentKey,
      contentType,
      serviceKey: serviceId,
      targetYear,
      coinPrice: resolved.coinPrice,
      amountKRW: resolved.amountKRW,
      paymentId,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      returnPath,
      orderName,
      payMethod,
      pricingSource: resolved.source,
    },
    paymentMethod: payMethod,
    status: "pending",
    orderState: SINGLE_PAYMENT_ORDER_STATES.PENDING,
    source: "prepare",
    paymentType: "digital_content",
    subscriptionTier: "",
  });

  return json({
    ok: true,
    alreadyUnlocked: false,
    idempotent: false,
    order: buildSinglePaymentOrderResponse({
      config,
      paymentId,
      orderName,
      amountKRW: resolved.amountKRW,
      coinPrice: resolved.coinPrice,
      payMethod,
      redirectUrl,
      customer,
      profileId,
      serviceId,
      contentId,
      contentKey,
      contentType,
      featureKey: resolved.featureKey,
      targetYear,
      returnPath,
    }),
  }, { status: 201 });
}

function resolveDigitalContentProfileId({ payment, body = {}, accessEvidence = null }) {
  return cleanProfileId(
    body?.profileId
      || body?.selectedProfileId
      || payment?.pricingSnapshot?.profileId
      || payment?.pricingSnapshot?.selectedProfileId
      || accessEvidence?.metadata?.profileId
      || accessEvidence?.metadata?.selectedProfileId
      || "",
  );
}

function createUnlockEntitlementSaveError(error) {
  const wrapped = new Error(String(error?.message || "Unlock entitlement save failed."));
  wrapped.code = String(error?.code || "UNLOCK_ENTITLEMENT_SAVE_FAILED");
  wrapped.cause = error;
  return wrapped;
}

async function upsertSajuPaymentUnlockEntitlement({
  userId,
  profileId,
  payment,
  body = {},
  accessEvidence = null,
  paidAt = null,
  session = null,
}) {
  const featureKey = String(payment?.featureKey || body?.featureKey || body?.subFeatureKey || "").trim();
  if (!isUnlockPaidFeatureKey(featureKey)) return null;
  const contentKey = resolveProfileUnlockContentKey(
    featureKey,
    body?.contentKey || payment?.pricingSnapshot?.contentKey || payment?.pricingSnapshot?.contentId,
  );
  const serviceKey = resolveProfileUnlockServiceKey(featureKey, contentKey);
  return grantPermanentUnlock({
    userId: String(userId),
    profileId,
    featureKey,
    contentKey: contentKey || undefined,
    serviceKey: serviceKey || undefined,
    source: CONTENT_ENTITLEMENT_SOURCES.PAYMENT,
    orderId: String(payment?.merchantUid || body?.merchantUid || body?.merchant_uid || ""),
    paymentId: String(payment?._id || accessEvidence?.metadata?.paymentId || ""),
    evidenceId: String(payment?._id || accessEvidence?._id || ""),
    coinAmount: Math.max(0, Math.floor(Number(payment?.coinPrice || payment?.expectedChargedPoints || body?.coinPrice || 0))),
    unlockedAt: paidAt,
    session,
  }).catch((error) => {
    throw createUnlockEntitlementSaveError(error);
  });
}

async function ensureSajuPaymentUnlockEntitlement(args) {
  const profileId = resolveDigitalContentProfileId(args);
  const unlockEntitlement = await upsertSajuPaymentUnlockEntitlement({
    ...args,
    profileId,
  });
  return { profileId, unlockEntitlement };
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

  const userQuery = User.findById(userId).select("points destinyProfilesCurrentId");
  if (session) userQuery.session(session);
  const user = await userQuery.lean();
  const currentPoints = Number(user?.points || 0);
  const coinPrice = Number(payment?.coinPrice || payment?.expectedChargedPoints || body?.coinPrice || 0);
  const requestId = String(payment?.requestId || body?.requestId || "").trim();
  const reportId = String(payment?.reportId || body?.reportId || "").trim();
  const sessionId = String(payment?.sessionId || body?.sessionId || body?.reportSessionId || "").trim();
  const profileId = String(
    body?.profileId
    || body?.selectedProfileId
    || payment?.pricingSnapshot?.profileId
    || payment?.pricingSnapshot?.selectedProfileId
    || user?.destinyProfilesCurrentId
    || "",
  ).trim().slice(0, 80).replace(/\s+/g, "_");
  const productType = String(
    body?.productType
    || body?.serviceType
    || payment?.pricingSnapshot?.productType
    || payment?.pricingSnapshot?.serviceType
    || "",
  ).trim().slice(0, 80);
  const serviceType = String(
    body?.serviceType
    || body?.productType
    || payment?.pricingSnapshot?.serviceType
    || payment?.pricingSnapshot?.productType
    || "",
  ).trim().slice(0, 80);
  const actionType = String(body?.actionType || payment?.pricingSnapshot?.actionType || "").trim().slice(0, 80);
  const contentKey = String(body?.contentKey || payment?.pricingSnapshot?.contentKey || "").trim().slice(0, 160);
  const contentId = String(body?.contentId || contentKey || payment?.pricingSnapshot?.contentId || payment?.featureKey || "").trim().slice(0, 160);
  const targetYear = body?.targetYear === undefined || body?.targetYear === null
    ? payment?.pricingSnapshot?.targetYear
    : Number(body.targetYear);
  const profileCardId = String(
    body?.profileCardId
    || body?.profileId
    || body?.selectedProfileId
    || payment?.pricingSnapshot?.profileCardId
    || payment?.pricingSnapshot?.profileId
    || profileId
    || "",
  ).trim().slice(0, 80).replace(/\s+/g, "_");
  const costCoins = Number(payment?.pricingSnapshot?.costCoins || body?.costCoins || coinPrice || 0);
  const amountKrw = Number(payment?.pricingSnapshot?.amountKrw || body?.amountKrw || payment?.paymentAmount || 0);
  const idempotencyKey = String(
    body?.idempotencyKey
    || payment?.pricingSnapshot?.idempotencyKey
    || payment?.idempotencyKey
    || "",
  ).trim().slice(0, 120);
  const orderId = String(
    body?.orderId
    || payment?.pricingSnapshot?.orderId
    || idempotencyKey
    || requestId
    || "",
  ).trim().slice(0, 120);

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
      profileId,
      selectedProfileId: profileId,
      profileCardId,
      productType,
      serviceType,
      actionType,
      contentKey,
      contentId,
      targetYear,
      featureKey,
      coinPrice,
      costCoins,
      paidAmount: Number(payment?.paymentAmount || 0),
      amountKrw,
      idempotencyKey,
      orderId,
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
      ...(patch.orderState ? { orderState: patch.orderState } : {}),
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
  // 신뢰할 수 있는 기대금액(클라 검증 금액 or 준비된 주문 금액)이 있었는지 — ensurePaymentRecord가
  // PortOne 금액으로 폴백(2611)하기 '이전' 시점의 값으로 판정한다. 이 값이 없으면 이후 금액 대조가
  // PortOne↔PortOne 순환이 되어 실질 검증이 사라진다(fail-closed 가드에서 사용).
  const hasVerifiableExpectedAmount = expectedAmount > 0;
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
    let accessEvidence = null;
    let profileId = "";
    let unlockEntitlement = null;
    if (isDigitalContentPayment) {
      accessEvidence = await createDigitalContentAccessEvidence({
        userId: ownerUserId,
        payment: paymentRecord,
        body,
        source,
        paidAt,
      }).catch(() => null);
      try {
        const entitlementResult = await ensureSajuPaymentUnlockEntitlement({
          userId: ownerUserId,
          payment: paymentRecord,
          body,
          accessEvidence,
          paidAt,
        });
        profileId = entitlementResult.profileId;
        unlockEntitlement = entitlementResult.unlockEntitlement;
      } catch (error) {
        return {
          ok: false,
          status: error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
          code: "UNLOCK_ENTITLEMENT_SAVE_FAILED",
          message: "Unlock entitlement could not be saved for an already processed payment.",
          payment: formatPaymentResponse(paymentRecord),
          pendingUnlock: true,
        };
      }
    }
    return {
      ok: true,
      idempotent: true,
      user: {
        id: ownerUserId,
        points: await getUserPoints(ownerUserId),
      },
      payment: formatPaymentResponse(paymentRecord),
      unlockGrant: unlockEntitlement ? formatPermanentUnlockGrant(unlockEntitlement, {
        featureKey: paymentRecord.featureKey,
        profileId,
      }) : null,
      accessGrant: isDigitalContentPayment ? {
        ok: true,
        accessType: "single_purchase",
        purchaseId: String(paymentRecord._id || ""),
        merchantUid: String(paymentRecord.merchantUid || ""),
        featureKey: String(paymentRecord.featureKey || body?.featureKey || ""),
        requestId: String(paymentRecord.requestId || body?.requestId || ""),
        reportId: String(paymentRecord.reportId || body?.reportId || ""),
        sessionId: String(paymentRecord.sessionId || body?.sessionId || body?.reportSessionId || ""),
        evidenceId: String(unlockEntitlement?._id || accessEvidence?._id || ""),
        profileId: profileId || undefined,
        selectedProfileId: profileId || undefined,
        contentKey: String(unlockEntitlement?.contentKey || paymentRecord.pricingSnapshot?.contentKey || body?.contentKey || ""),
        contentId: String(unlockEntitlement?.contentId || paymentRecord.pricingSnapshot?.contentId || body?.contentId || ""),
        targetYear: paymentRecord.pricingSnapshot?.targetYear ?? body?.targetYear,
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

  // Prepaid coin top-up (point_charge / any non-digital settlement) is retired. Only
  // digital_content products settle here; reject anything else before any DB mutation so
  // no "coin charge" crediting path can run. Currency/amount are still re-verified below.
  if (!isDigitalContentPayment) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "point_charge_disabled",
      failureMessage: "Prepaid coin top-up settlement is disabled.",
      failureStage: "policy_validate",
      incrementAttempt: true,
    });
    return {
      ok: false,
      status: 410,
      message: "선불형 잔액 결제는 더 이상 처리하지 않습니다. 상품별 원화 단건 결제를 이용해 주세요.",
    };
  }

  // 금액 대조 정본화(fail-closed): 위 두 대조(2759 클라·2800 서버)는 모두 조건부라, 신뢰할 기대금액이
  // 전혀 없으면(클라 금액 없음 + 준비된 주문 금액 없음) 조용히 건너뛰어진다. 그 경우 ensurePaymentRecord가
  // 기대금액을 PortOne 금액으로 채워(2611) 대조가 순환·무의미해지므로, 잠금 콘텐츠는 절대 확정하지 않는다.
  // 현재 정상 플로우(준비 주문은 항상 실금액 기록, 신규 레코드는 point_charge라 위에서 410 차단)에서는
  // 도달 불가능한 방어선이며, 상위 불변식이 깨질 때만 발동한다. PortOne은 정상(paid)이므로 실패로
  // 확정하지 않고(상태 불일치 방지) 준비 주문 기반 재조회(webhook/reconcile)에 맡기도록 보류한다.
  if (!hasVerifiableExpectedAmount) {
    await writeFailureLog({
      request,
      userId: ownerUserId,
      impUid,
      merchantUid,
      source,
      stage: "amount_match",
      code: "amount_unverifiable",
      message: "No trusted expected amount to verify against PortOne amount.",
      status: 409,
      portOneAmount,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return {
      ok: false,
      status: 409,
      code: "AMOUNT_UNVERIFIABLE",
      pendingUnlock: true,
      message: "결제 금액 확인에 필요한 주문 정보가 없어 아직 처리를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const ownerExists = await User.exists({ _id: ownerUserId });
  if (!ownerExists) {
    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod,
      rawPortOne: portOnePayment,
      failureCode: "user_not_found",
      failureMessage: "User not found for product payment.",
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
      message: "User not found for product payment.",
      status: 404,
      payload: body,
      rawPortOne: portOnePayment,
    });

    return { ok: false, status: 404, message: "User not found for product payment." };
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
          expectedChargedPoints,
          chargedPoints: 0,
          featureKey: String(paymentRecord.featureKey || body?.featureKey || body?.subFeatureKey || ""),
          productId: String(paymentRecord.productId || body?.productId || "").trim().toLowerCase(),
          coinPrice: expectedChargedPoints,
          membershipCreditCost: calculateMembershipCreditCost(expectedChargedPoints),
          accessType: "single_purchase",
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
      const accessEvidence = await createDigitalContentAccessEvidence({
        userId: ownerUserId,
        payment: finalizedPayment,
        body,
        source,
        paidAt,
      });
      let profileId = "";
      let unlockEntitlement = null;
      try {
        const entitlementResult = await ensureSajuPaymentUnlockEntitlement({
          userId: ownerUserId,
          payment: finalizedPayment,
          body,
          accessEvidence,
          paidAt,
        });
        profileId = entitlementResult.profileId;
        unlockEntitlement = entitlementResult.unlockEntitlement;
        await recordUserPaidFeature(ownerUserId, finalizedPayment.featureKey);
      } catch (error) {
        await Payment.findByIdAndUpdate(finalizedPayment._id, {
          $set: {
            failureCode: "unlock_entitlement_save_failed",
            failureMessage: String(error?.message || "Unlock entitlement save failed."),
            failureStage: "unlock_entitlement",
            lastErrorAt: new Date(),
          },
        }).catch(() => {});
        return {
          ok: false,
          status: error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
          code: "UNLOCK_ENTITLEMENT_SAVE_FAILED",
          message: "Unlock entitlement could not be saved after payment verification.",
          payment: formatPaymentResponse(finalizedPayment),
          pendingUnlock: true,
        };
      }
      return {
        ok: true,
        idempotent: false,
        user: { id: ownerUserId, points: await getUserPoints(ownerUserId) },
        payment: formatPaymentResponse(finalizedPayment),
        unlockGrant: unlockEntitlement ? formatPermanentUnlockGrant(unlockEntitlement, {
          featureKey: finalizedPayment.featureKey,
          profileId,
        }) : null,
        accessGrant: {
          ok: true,
          accessType: "single_purchase",
          purchaseId: String(finalizedPayment._id || ""),
          merchantUid: String(finalizedPayment.merchantUid || ""),
          featureKey: String(finalizedPayment.featureKey || body?.featureKey || ""),
          requestId: String(finalizedPayment.requestId || body?.requestId || ""),
          reportId: String(finalizedPayment.reportId || body?.reportId || ""),
          sessionId: String(finalizedPayment.sessionId || body?.sessionId || body?.reportSessionId || ""),
          evidenceId: String(unlockEntitlement?._id || accessEvidence?._id || ""),
          profileId: profileId || undefined,
          selectedProfileId: profileId || undefined,
          contentKey: String(unlockEntitlement?.contentKey || finalizedPayment.pricingSnapshot?.contentKey || body?.contentKey || ""),
          contentId: String(unlockEntitlement?.contentId || finalizedPayment.pricingSnapshot?.contentId || body?.contentId || ""),
          targetYear: finalizedPayment.pricingSnapshot?.targetYear ?? body?.targetYear,
          paidAt: paidAt.toISOString(),
        },
      };
    }

    // Unreachable: prepaid coin top-up is retired and rejected before mutation (guard above).
    return {
      ok: false,
      status: 410,
      message: "선불형 잔액 결제는 더 이상 처리하지 않습니다. 상품별 원화 단건 결제를 이용해 주세요.",
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
              expectedChargedPoints,
              chargedPoints: 0,
              featureKey: String(paymentRecord.featureKey || body?.featureKey || body?.subFeatureKey || ""),
              productId: String(paymentRecord.productId || body?.productId || "").trim().toLowerCase(),
              coinPrice: expectedChargedPoints,
              membershipCreditCost: calculateMembershipCreditCost(expectedChargedPoints),
              accessType: "single_purchase",
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
          const accessEvidence = await createDigitalContentAccessEvidence({
            userId: ownerUserId,
            payment: finalizedPayment,
            body,
            source,
            paidAt,
            session,
          });
          const entitlementResult = await ensureSajuPaymentUnlockEntitlement({
            userId: ownerUserId,
            payment: finalizedPayment,
            body,
            accessEvidence,
            paidAt,
            session,
          });
          const profileId = entitlementResult.profileId;
          const unlockEntitlement = entitlementResult.unlockEntitlement;
          await recordUserPaidFeature(ownerUserId, finalizedPayment.featureKey, { session });
          txResult = {
            ok: true,
            idempotent: false,
            user: { id: ownerUserId, points: await getUserPoints(ownerUserId) },
            payment: formatPaymentResponse(finalizedPayment),
            unlockGrant: unlockEntitlement ? formatPermanentUnlockGrant(unlockEntitlement, {
              featureKey: finalizedPayment.featureKey,
              profileId,
            }) : null,
        accessGrant: {
              ok: true,
              accessType: "single_purchase",
              purchaseId: String(finalizedPayment._id || ""),
              merchantUid: String(finalizedPayment.merchantUid || ""),
              featureKey: String(finalizedPayment.featureKey || body?.featureKey || ""),
              requestId: String(finalizedPayment.requestId || body?.requestId || ""),
              reportId: String(finalizedPayment.reportId || body?.reportId || ""),
              sessionId: String(finalizedPayment.sessionId || body?.sessionId || body?.reportSessionId || ""),
              evidenceId: String(unlockEntitlement?._id || accessEvidence?._id || ""),
              profileId: profileId || undefined,
              selectedProfileId: profileId || undefined,
              contentKey: String(unlockEntitlement?.contentKey || finalizedPayment.pricingSnapshot?.contentKey || body?.contentKey || ""),
              contentId: String(unlockEntitlement?.contentId || finalizedPayment.pricingSnapshot?.contentId || body?.contentId || ""),
              targetYear: finalizedPayment.pricingSnapshot?.targetYear ?? body?.targetYear,
              paidAt: paidAt.toISOString(),
            },
          };
          return;
        }

        // Unreachable: prepaid coin top-up is retired and rejected before mutation (guard above).
        txResult = {
          ok: false,
          status: 410,
          message: "선불형 잔액 결제는 더 이상 처리하지 않습니다. 상품별 원화 단건 결제를 이용해 주세요.",
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
    if (error?.code === "UNLOCK_ENTITLEMENT_SAVE_FAILED" || error?.code === "MISSING_PROFILE_ID") {
      settlementResult = {
        ok: false,
        status: error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
        code: "UNLOCK_ENTITLEMENT_SAVE_FAILED",
        message: "Unlock entitlement could not be saved after payment verification.",
        pendingUnlock: true,
      };
    } else if (!isTransactionUnsupported(error)) {
      throw error;
    } else {
      settlementResult = await runSettlementWithoutTransaction();
    }
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

async function handleWebhook(request, env, ctx) {
  /*
   * PortOne 관리자 콘솔 설정:
   * 결제 연동 → 연동 관리 → 결제알림(Webhook) 관리
   * 웹훅 버전: 결제모듈 V2, 최신 웹훅 버전 사용, Content-Type: application/json
   * Endpoint URL: https://<배포도메인>/api/webhooks/portone
   * 웹훅 시크릿은 환경별로 분리해 PORTONE_webhook에 저장한다.
   */
  const rawBody = await request.text();
  const webhookSecret = getPortOneWebhookSecret(env);
  if (!webhookSecret) {
    await writeFailureLog({
      request,
      source: "webhook",
      stage: "webhook_auth",
      code: "missing_webhook_secret",
      message: "PORTONE_webhook is required.",
      status: 503,
      payload: { rawBodyBytes: new TextEncoder().encode(rawBody).length },
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
      status: 400,
      payload: { rawBodyBytes: new TextEncoder().encode(rawBody).length },
    });
    return json({ message: "Invalid webhook request." }, { status: 400 });
  }

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

  const eventType = extractPortOneWebhookType(body);
  if (!PORTONE_WEBHOOK_PAYMENT_EVENTS.has(eventType)) {
    return json({ ok: true, ignored: true, type: eventType || "unknown" });
  }

  const paymentId = extractPortOneWebhookPaymentId(body);
  if (!paymentId) {
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

  const reservation = await reservePortOneWebhookEvent({ request, eventType, paymentId, body });
  if (!reservation.ok) return reservation.response;

  // Transaction.Paid만 포트원 단건조회(최대 8s)+지급 검증으로 무거워 포트원 웹훅 타임아웃(=재전송 실패
  // 반복)을 유발한다. ctx가 있으면 서명검증·이벤트예약까지만 동기로 끝내고 즉시 2xx로 ack한 뒤, 무거운
  // 검증·지급은 waitUntil 백그라운드로 분리한다. 즉시-ack으로 포트원 재전송에 기대지 못하게 된 신뢰성은
  // scheduled()의 재조정 태스크(runWebhookReconcileTask)가 대체한다(가상계좌 단독 건 지급 공백 방어).
  // ctx가 없는 경로(단위 테스트 등)는 기존 인라인 처리로 폴백한다.
  if (eventType === PORTONE_WEBHOOK_EVENTS.PAID && ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(
      settleReservedWebhookEvent({ request, env, eventType, paymentId, body, event: reservation.event })
        .catch(() => {}),
    );
    return json({ ok: true, accepted: true, type: eventType, paymentId });
  }

  return settleReservedWebhookEvent({ request, env, eventType, paymentId, body, event: reservation.event });
}

// 예약된 포트원 웹훅 이벤트를 실제 처리하고 결과(2xx/비-2xx)에 따라 processed/failed로 확정한다.
// handleWebhook의 인라인 폴백 경로, waitUntil 백그라운드 경로, 재조정 크론이 공유한다.
async function settleReservedWebhookEvent({ request, env, eventType, paymentId, body, event }) {
  try {
    let response;
    if (eventType === PORTONE_WEBHOOK_EVENTS.PAID) {
      response = await runSinglePaymentCompleteFromWebhook(request, env, paymentId, body);
    } else if (eventType === PORTONE_WEBHOOK_EVENTS.VIRTUAL_ACCOUNT_ISSUED) {
      response = await markVirtualAccountIssuedFromWebhook({ request, paymentId, body });
    } else if (eventType === PORTONE_WEBHOOK_EVENTS.FAILED) {
      response = await markPaymentFailedFromWebhook({ request, paymentId, body });
    } else if (eventType === PORTONE_WEBHOOK_EVENTS.CANCELLED || eventType === PORTONE_WEBHOOK_EVENTS.PARTIAL_CANCELLED) {
      response = await markPaymentCancellationForAdminReview({
        request,
        paymentId,
        body,
        partial: eventType === PORTONE_WEBHOOK_EVENTS.PARTIAL_CANCELLED,
      });
    } else {
      response = json({ ok: true, ignored: true, type: eventType });
    }
    // 성공(2xx) 응답일 때만 processed로 확정한다. 502(PortOne 조회 실패) 같은 비-2xx를 processed로
    // 마킹하면 재조정 재처리가 멱등성 계층에서 영구 차단돼 미지급 결제가 남는다. 실패는 failed로 남겨
    // 재조정 크론이 다시 집어가게 한다.
    if (isSuccessfulWebhookResponse(response)) {
      await markPortOneWebhookEventProcessed(event, response);
    } else {
      await markPortOneWebhookEventFailed(
        event,
        new Error(`Webhook handler returned non-success status ${Number(response?.status || 0)}.`),
      );
    }
    return response;
  } catch (error) {
    await markPortOneWebhookEventFailed(event, error);
    throw error;
  }
}

// 재조정 크론 진입점: 백그라운드 실패/유실로 미처리 상태에 머문 Transaction.Paid 웹훅 이벤트를
// 재클레임해 재처리한다. 즉시-ack 전환으로 포트원 재전송에 기대지 못하게 된 신뢰성을 대체하며,
// 사용자가 없는 가상계좌 입금 완료 건이 특히 이 경로에 의존한다. attempts 상한으로 폭주를 막는다.
// pending 주문 재조정 태스크가 쓰는 정산 진입점. 웹훅 경로와 똑같은 검증(포트원 재조회 → paymentId·
// storeId·금액·통화 대조 → 지급)을 그대로 태우기 위해 handleSinglePaymentComplete 를 합성 요청으로
// 부른다. 새 정산 로직을 만들지 않는다 — 멱등 CAS 도 그쪽 것을 그대로 쓴다.
export async function settleSinglePaymentForReconcile(env, { paymentId, userId }) {
  const request = new Request("https://internal.reconcile/api/payments/single/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentId }),
  });
  // 🔴 allowAutoRefund:false — 크론은 절대 돈을 돌려주지 않는다. 지급에 실패하면 주문에 사유만 남기고
  // 관리자 화면(/admin/orders)에서 사람이 판단하게 한다.
  return handleSinglePaymentComplete(request, env, { userId }, { allowAutoRefund: false });
}

export async function runWebhookReconcileTask(env, { limit = 20, maxAttempts = 10 } = {}) {
  await connectDb(env);
  const staleCutoff = new Date(Date.now() - WEBHOOK_STALE_PROCESSING_MS);
  const candidates = await PaymentWebhookEvent.find({
    provider: "portone",
    eventType: PORTONE_WEBHOOK_EVENTS.PAID,
    attempts: { $lt: maxAttempts },
    $or: [
      { status: "failed" },
      { status: "processing", lastAttemptAt: { $lte: staleCutoff } },
    ],
  })
    .sort({ lastAttemptAt: 1 })
    .limit(limit)
    .lean();

  const summary = { scanned: candidates.length, processed: 0, failed: 0, skipped: 0 };
  for (const candidate of candidates) {
    // 원자적 재클레임: 늦게 도착한 waitUntil이나 동시 크론이 같은 이벤트를 두 번 잡지 않도록
    // 조회 시점의 status/lastAttemptAt를 조건에 걸어 한 실행만 이기게 한다.
    const claimed = await PaymentWebhookEvent.findOneAndUpdate(
      { _id: candidate._id, status: candidate.status, lastAttemptAt: candidate.lastAttemptAt },
      { $set: { status: "processing", lastAttemptAt: new Date() }, $inc: { attempts: 1 } },
      { returnDocument: "after" },
    ).lean();
    if (!claimed) { summary.skipped += 1; continue; }
    if (!claimed.paymentId) {
      await markPortOneWebhookEventFailed(claimed, new Error("Reconcile skipped: missing paymentId."));
      summary.failed += 1;
      continue;
    }
    try {
      // 포트원 단건조회로 재검증하므로 웹훅 본문(payload)은 불필요. 최소 합성 요청만 넘긴다.
      const syntheticRequest = new Request("https://internal.reconcile/api/payments/webhook", { method: "POST" });
      const response = await settleReservedWebhookEvent({
        request: syntheticRequest,
        env,
        eventType: PORTONE_WEBHOOK_EVENTS.PAID,
        paymentId: claimed.paymentId,
        body: {},
        event: claimed,
      });
      if (isSuccessfulWebhookResponse(response)) summary.processed += 1;
      else summary.failed += 1;
    } catch (_error) {
      // settleReservedWebhookEvent가 이미 failed로 마킹했다.
      summary.failed += 1;
    }
  }
  return summary;
}

async function handleDigitalContentPrepare(request, env, auth, body) {
  if (isRemovedCountPassProductId(body?.productId)) {
    return json({
      message: "지원하지 않는 결제 상품입니다.",
      code: "INVALID_PRODUCT_KEY",
    }, { status: 400 });
  }

  // 인증 단계에서 이미 같은 필드를 읽어 두었다(PAYMENT_ROUTE_USER_PROJECTION). 그걸 재사용해
  // 왕복 1회를 없앤다. authUserDoc 은 access-token 경로에만 붙으므로 부재 시 종전 조회로 폴백한다.
  const paymentUser = auth.authUserDoc || await User.findById(auth.userId)
    .select("phoneNumber phone name email fullName displayName username destinyProfilesCurrentId")
    .lean();
  // 주문 응답에 customer 를 실어 보낸다. 예전에는 이 필드가 없어서 클라의 order.customer 가 항상
  // 비어 있었고, 결제마다 GET /api/me/payment-phone 을 한 번 더 타야 했다. 여기서 실어 보내면
  // 저장된 번호가 있는 사용자는 그 왕복이 통째로 사라진다(추가 조회 없음 — 위 문서를 그대로 쓴다).
  const orderCustomer = buildSinglePaymentCustomer(paymentUser || {}, auth.userId);
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
  const productId = String(body?.productId || "").trim().toLowerCase();
  const requestId = String(body?.requestId || "").trim().slice(0, 120);
  const reportId = String(body?.reportId || "").trim().slice(0, 120);
  const sessionId = String(body?.sessionId || body?.reportSessionId || "").trim().slice(0, 120);
  // 🔴 profileId 는 기능 성격이 아니라 실행 런타임이 정한다 — 정적 셸은 모든 단건 결제에 현재 프로필을
  // 자동 주입하지만, React 페이지(useCoinGate/billing-client)와 일부 독립 정적 페이지는 아무것도 싣지
  // 않는다. 그러면 프로필 스코프 상품(사주 3·자미두수 5·숙요 연간·FPTI)이 프로필 결손인 채로 결제돼
  // 정산이 관리자 검토로 빠진다. 서버가 마지막으로 기억하는 카드로 폴백해 그 격차를 메운다.
  // 계정 스코프 상품은 upsertSinglePaymentUnlockRecord 가 profileId 를 무시하므로 영향이 없다.
  // (paymentUser는 위에서 이미 읽은 문서다 — 추가 왕복 없음)
  const profileId = String(body?.profileId || body?.selectedProfileId || paymentUser?.destinyProfilesCurrentId || "").trim().slice(0, 80).replace(/\s+/g, "_");
  const productType = String(body?.productType || body?.serviceType || "").trim().slice(0, 80);
  const serviceType = String(body?.serviceType || body?.productType || "").trim().slice(0, 80);
  const actionType = String(body?.actionType || "").trim().slice(0, 80);
  const profileCardId = String(body?.profileCardId || body?.profileId || body?.selectedProfileId || "").trim().slice(0, 80).replace(/\s+/g, "_");
  const orderId = String(body?.orderId || idempotencyKey || requestId || "").trim().slice(0, 120);
  const membershipCreditCost = Number(resolved.pricing?.membershipCreditCost || calculateMembershipCreditCost(resolved.coinPrice));

  const merchantUid = buildMerchantUid(auth.userId);

  // 🔴 주문 응답에 PortOne V2 공개 설정을 함께 싣는다. 이게 없으면 클라이언트가 주문을 받은 뒤
  // GET /api/payments/config 를 **직렬로 한 번 더** 왕복해야 하고(js/destiny-profile.js), 그 왕복이
  // 503(PORTONE_V2_PUBLIC_CONFIG_MISSING)이면 그것만으로 PG창이 안 뜬다. 새 노출이 아니다 —
  // /api/payments/config 가 이미 같은 값을 공개하고, PortOne 브라우저 SDK 가 요구하는 값이다.
  // (buildSinglePaymentOrderResponse 가 쓰는 필드 형태를 그대로 따른다.)
  const portOneClientConfig = getPortOnePublicConfig(env);
  const orderClientConfig = {
    storeId: portOneClientConfig.storeId,
    channelKey: portOneClientConfig.channelKey,
    currency: portOneClientConfig.currency || "CURRENCY_KRW",
    payMethod: portOneClientConfig.payMethod || "CARD",
    noticeUrl: portOneClientConfig.noticeUrl,
  };

  // 기존 주문과 요청이 어긋나면 409 — 멱등 재요청 경로와 E11000 복구 경로가 **같은 판정**을 써야 한다.
  // 🔴 featureKey 비교가 비대칭인 것은 의도된 것이다(둘 중 하나가 비면 충돌 아님) — 레거시 행이 409 나지 않게.
  const buildIdempotentResponse = (existing) => {
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
        ...orderClientConfig,
        merchantUid: String(existing.merchantUid || ""),
        paymentAmount: existingAmount,
        amountKRW: existingAmount,
        coinPrice: existingCoins,
        membershipCreditCost: Number(existing.membershipCreditCost || calculateMembershipCreditCost(existingCoins)),
        featureKey: String(existing.featureKey || featureKey || ""),
        accessType: String(existing.accessType || "single_purchase"),
        productName,
        customer: orderCustomer,
        pricing: resolved.pricing,
      },
    });
  };

  const paymentDoc = {
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
    pricingSnapshot: {
      ...resolved.pricing,
      productType,
      serviceType,
      actionType,
      profileCardId,
      profileId,
      selectedProfileId: profileId,
      costCoins: resolved.coinPrice,
      amountKrw: resolved.paymentAmount,
      idempotencyKey,
      orderId,
    },
    paymentMethod,
    status: "pending",
    source: "prepare",
    paymentType: "digital_content",
    subscriptionTier: "",
  };

  try {
    if (idempotencyKey) {
      // 🔴 조회 + 생성 2왕복을 upsert 1왕복으로 합친다. 무료/공유혀 Atlas 에서는 왕복 1회가 곧 체감 지연이다.
      // 필터 3키는 유니크 부분 인덱스({userId, idempotencyKey, paymentType})와 정확히 일치한다.
      // sort 를 넘겨야 종전 .sort({createdAt:-1}) 의 "최신 우선" 의미가 유지된다(인덱스 생성 전 중복 행 대비).
      // $setOnInsert 에는 필터 3키를 넣지 않는다 — Mongo 가 필터 등식을 삽입 문서에 적용하므로 충돌한다.
      const { userId: _f1, idempotencyKey: _f2, paymentType: _f3, ...insertOnly } = paymentDoc;
      const upserted = await Payment.findOneAndUpdate(
        { userId: auth.userId, idempotencyKey, paymentType: "digital_content" },
        { $setOnInsert: insertOnly },
        { upsert: true, new: true, includeResultMetadata: true, sort: { createdAt: -1 } },
      );
      const insertedNow = upserted?.lastErrorObject?.updatedExisting === false;
      const doc = upserted?.value || null;
      // 기존 행을 만난 경우($setOnInsert 는 no-op) 멱등 응답 또는 409.
      if (!insertedNow && doc) return buildIdempotentResponse(doc);
    } else {
      // 🔴 키가 없으면 upsert 를 쓰면 안 된다. 유니크 부분 인덱스는 idempotencyKey: "" 를 덮지 않으므로
      // 이 사용자의 키 없는 모든 prepare 가 한 문서로 접혀 버린다.
      await Payment.create(paymentDoc);
    }
  } catch (error) {
    if (Number(error?.code) !== 11000) throw error;
    // 동시 요청이 같은 키로 동시에 insert 를 시도하면 진 쪽이 E11000 을 받는다. 그때만 한 번 더 읽어
    // 기존 주문을 그대로 돌려준다. 예전에는 이 분기가 없어(구독 핸들러엔 있었다) 동시 요청이
    // order 없는 409 로 죽었고, 클라는 그걸 복구할 방법이 없었다.
    const existing = await Payment.findOne({
      userId: auth.userId,
      paymentType: "digital_content",
      $or: [
        { merchantUid },
        ...(idempotencyKey ? [{ idempotencyKey }] : []),
      ],
    }).sort({ createdAt: -1 }).lean();
    if (!existing) throw error;
    return buildIdempotentResponse(existing);
  }

  return json({
    message: "Product payment preparation completed.",
    idempotent: false,
    order: {
      ...orderClientConfig,
      merchantUid,
      paymentAmount: resolved.paymentAmount,
      amountKRW: resolved.paymentAmount,
      coinPrice: resolved.coinPrice,
      membershipCreditCost,
      featureKey,
      accessType: "single_purchase",
      profileId,
      profileCardId,
      productType,
      serviceType,
      actionType,
      costCoins: resolved.coinPrice,
      amountKrw: resolved.paymentAmount,
      idempotencyKey,
      orderId,
      productName,
      customer: orderCustomer,
      pricing: resolved.pricing,
    },
  }, { status: 201 });
}

async function handlePrepare(request, env, auth) {
  const body = await readJson(request);

  if (
    String(body?.productType || "").trim().toLowerCase() === GUARDIAN_FORTUNE_CREDIT_PRODUCT_TYPE
    || /^guardian_fortune_chat_(?:3|10)$/.test(String(body?.productId || "").trim().toLowerCase())
  ) {
    return json({
      message: "오늘의 귀인 운세 대화권은 전용 PG 결제 경로를 이용해 주세요.",
      code: "GUARDIAN_FORTUNE_USE_DEDICATED_PURCHASE_ROUTE",
    }, { status: 409 });
  }

  if (isDigitalContentPaymentRequest(body)) {
    return handleDigitalContentPrepare(request, env, auth, body);
  }

  return json({
    message: "선불형 잔액 상품은 더 이상 판매하지 않습니다. 상품별 원화 단건 결제를 이용해 주세요.",
    code: "POINT_CHARGE_DISABLED",
  }, { status: 410 });
}

async function handleSubscriptionPrepare(request, env, auth) {
  const body = await readJson(request);

  // 결제 준비는 백엔드 가드(인증·멱등성·플랜/금액 검증·티어 전환·동시성)로 방어한다.
  const tier = normalizePassTier(body?.tier || body?.passTier || body?.subscriptionTier) || "";
  const durationMonths = Number(body?.durationMonths || 1);
  const planId = String(body?.planId || "").trim().toLowerCase();
  const productType = String(body?.productType || "membership_pass").trim().toLowerCase();
  const requestedAmount = body?.amount === undefined ? null : Number(body.amount);
  const requestedCurrency = String(body?.currency || "KRW").trim().toUpperCase();
  if (!validateNewSubscriptionDuration(durationMonths, body?.durationDays)) {
    return json({
      message: "Only 30-day membership passes are available for new purchase.",
      code: "INVALID_SUBSCRIPTION_DURATION",
    }, { status: 400 });
  }
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
  // 라우터가 인증과 같은 조회에서 profileSubscription 을 함께 읽어줬으면 재조회하지 않는다
  // (결제창 진입 왕복 1회 절감). refresh/admin 폴백 경로 등 authUserDoc 부재 시에만 직접 읽는다.
  const currentUser = auth.authUserDoc
    || await withMongoRetry(env, () => User.findById(auth.userId)
      // customer 필드는 아래 order.customer 를 만들기 위해 함께 읽는다 — 같은 쿼리라 왕복 추가가 없다.
      .select("profileSubscription phoneNumber phone fullName name email displayName username")
      .lean());
  if (!currentUser) {
    return json({ message: "User not found." }, { status: 404 });
  }
  const preparePolicy = validatePurchasePolicy({
    userId: auth.userId,
    sku: plan.planId,
    productId: plan.planId,
    productType: resolveServerProductType({
      body,
      paymentType: "membership_pass",
      serverProductType: plan.productType,
      productId: plan.planId,
    }),
    price: plan.wonPrice,
    requestedPaymentMethod: paymentMethod,
    currentSubscription: currentUser.profileSubscription,
    familyPlanInfo: currentUser.profileSubscription,
    orderContext: {
      route: "subscription_prepare",
      coveredByPass: body?.coveredByPass === true,
      userEntitlement: body?.userEntitlement,
    },
  });
  const preparePolicyResponse = await rejectPurchasePolicy(request, env, auth, preparePolicy, {
    sku: plan.planId,
    requestedPaymentMethod: paymentMethod,
    route: "subscription_prepare",
  });
  if (preparePolicyResponse) return preparePolicyResponse;
  // 🔴 이용권 주문 응답에도 customer 를 실어 보낸다. 예전에는 이 라우트만 customer 가 없어서(단건
  // 디지털콘텐츠 응답에는 있었다) 이용권 결제는 저장된 번호가 있어도 결제 직전에 항상
  // GET /api/me/payment-phone 을 한 번 더 타야 했고, 그 조회가 실패하면 번호 입력창이 다시 떴다.
  // authUserDoc(PAYMENT_ROUTE_USER_PROJECTION)을 그대로 쓰므로 추가 조회가 0 이다.
  const orderCustomer = buildSinglePaymentCustomer(currentUser, auth.userId);

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
    const existing = await withMongoRetry(env, () => Payment.findOne({
      userId: auth.userId,
      idempotencyKey,
      paymentType: "membership_pass",
    }).sort({ createdAt: -1 }).lean());

    if (existing) {
      const existingAmount = Number(existing.paymentAmount || 0);
      const existingTier = normalizePassTier(existing.subscriptionTier) || "";
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
          customer: orderCustomer,
          tier,
          planId: plan.planId,
          durationMonths: plan.durationMonths,
          paymentAmount: existingAmount,
          productName: plan.name,
          productType: plan.productType,
          profileLimit: plan.profileLimit,
          durationDays: plan.durationDays,
          recurring: false,
        },
      });
    }
  }

  const merchantUid = buildSubscriptionMerchantUid(auth.userId, tier, plan.durationMonths);
  const customerUid = buildSubscriptionCustomerUid(auth.userId);

  try {
    // 재시도는 같은 merchantUid 로 다시 insert 하므로, 첫 시도가 실제로는 성공했던 경우 두 번째 시도가
    // E11000 을 던지고 아래 catch 가 기존 주문을 그대로 돌려준다(중복 주문 없음).
    await withMongoRetry(env, () => Payment.create({
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
        durationDays: plan.durationDays,
        productType: plan.productType,
        currency: "KRW",
      },
    }));
  } catch (error) {
    if (Number(error?.code) !== 11000) throw error;

    const existing = await withMongoRetry(env, () => Payment.findOne({
      userId: auth.userId,
      paymentType: "membership_pass",
      $or: [
        { merchantUid },
        ...(idempotencyKey ? [{ idempotencyKey }] : []),
      ],
    }).sort({ createdAt: -1 }).lean());

    if (!existing) throw error;

    const existingAmount = Number(existing.paymentAmount || 0);
    const existingTier = normalizePassTier(existing.subscriptionTier) || "";
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
        customer: orderCustomer,
        tier,
        planId: plan.planId,
        durationMonths: plan.durationMonths,
        paymentAmount: existingAmount,
        productName: plan.name,
        productType: plan.productType,
        profileLimit: plan.profileLimit,
        durationDays: plan.durationDays,
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
      customer: orderCustomer,
      tier,
      planId: plan.planId,
      durationMonths: plan.durationMonths,
      paymentAmount: plan.wonPrice,
      productName: plan.name,
      productType: plan.productType,
      profileLimit: plan.profileLimit,
      durationDays: plan.durationDays,
      recurring: false,
    },
  }, { status: 201 });
}

async function handleSubscriptionMonthlyCreditConfirm(request, env, auth, { body, plan, tier, paymentMethodHint }) {
  const requestId = String(body?.requestId || body?.idempotencyKey || body?.merchantUid || "").trim().slice(0, 160)
    || `sub_monthly_${Date.now()}_${tier}_${String(auth.userId || "user").slice(-8)}`;
  const merchantUid = String(body?.merchantUid || body?.merchant_uid || requestId).trim().slice(0, 160);
  const customerUid = String(body?.customerUid || "").trim() || buildSubscriptionCustomerUid(auth.userId);
  const requiredMonthlyCredits = calculateSubscriptionMonthlyCreditCost(plan);

  let existingPayment = await Payment.findOne({
    userId: auth.userId,
    paymentType: "membership_pass",
    idempotencyKey: requestId,
  }).sort({ createdAt: -1 }).lean();

  if (existingPayment?.status === "success") {
    const currentUser = await User.findById(auth.userId).select("points profileSubscription").lean();
    const sub = currentUser?.profileSubscription || {};
    return json({
      message: "Membership pass monthly-credit payment already processed.",
      idempotent: true,
      payment: formatPaymentResponse(existingPayment),
      subscription: {
        tier: sub?.tier || "free",
        source: sub?.source || "pass",
        isActive: hasActiveSubscriptionConflict(sub),
        expiresAt: toIsoOrNull(sub?.expiresAt),
        profileLimit: plan.profileLimit,
        planId: String(sub?.planId || plan.planId),
        durationMonths: Number(sub?.durationMonths || plan.durationMonths),
        productType: String(sub?.productType || plan.productType),
        monthlyStoneBalance: Number(sub?.membershipCreditBalance || 0),
        membershipCreditBalance: Number(sub?.membershipCreditBalance || 0),
        membershipCreditGranted: Number(sub?.membershipCreditGranted || 0),
        membershipCreditUsed: Number(sub?.membershipCreditUsed || 0),
        membershipCreditCost: requiredMonthlyCredits,
        cancelAtPeriodEnd: Boolean(sub?.cancelAtPeriodEnd),
        cancelRequestedAt: toIsoOrNull(sub?.cancelRequestedAt),
        customerUid,
        paymentMethod: "monthly_credit",
        nextBillingAt: null,
        lastBillingStatus: "success",
      },
      monthlyStoneBalance: Number(sub?.membershipCreditBalance || 0),
      monthlyCredits: Number(sub?.membershipCreditBalance || 0),
      user: {
        id: String(auth.userId),
        points: Number(currentUser?.points || 0),
      },
    });
  }

  const now = new Date();
  const existingUser = await User.findById(auth.userId).select("points profileSubscription").lean();
  if (!existingUser) return json({ message: "User not found." }, { status: 404 });

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

  // 월정석은 지급일+30일 만료(지급분별) — 만료분을 제외한 "유효 잔액"으로 사용 가능 여부를 판정한다.
  const ensuredExisting = ensureLotsForBalance(existingUser?.profileSubscription, now.getTime());
  const currentMonthlyCredits = ensuredExisting.balance;
  if (currentMonthlyCredits < requiredMonthlyCredits) {
    return json({
      message: "이용권 혜택이 부족합니다.",
      code: "INSUFFICIENT_MONTHLY_CREDITS",
      requiredMonthlyCredits,
      currentMonthlyCredits,
      monthlyStoneBalance: currentMonthlyCredits,
      membershipCreditBalance: currentMonthlyCredits,
    }, { status: 402 });
  }

  const expiresAt = calculateSubscriptionActivationExpiresAt({
    existingSubscription: existingUser?.profileSubscription,
    transitionCode: transition.code,
    now,
    paidAt: now,
    durationDays: plan.durationDays,
  });
  const subscriptionUpdateGuard = buildSubscriptionUpdateGuard(existingUser?.profileSubscription, now);

  let paymentRecord = existingPayment;
  if (!paymentRecord) {
    try {
      paymentRecord = await Payment.create({
        userId: auth.userId,
        merchantUid,
        idempotencyKey: requestId,
        paymentAmount: plan.wonPrice,
        expectedChargedPoints: 0,
        chargedPoints: 0,
        paymentMethod: "monthly_credit",
        status: "pending",
        source: "prepare",
        paymentType: "membership_pass",
        subscriptionTier: tier,
        productId: plan.planId,
        membershipCreditCost: requiredMonthlyCredits,
        requestId,
        metadata: {
          planId: plan.planId,
          durationMonths: plan.durationMonths,
          durationDays: plan.durationDays,
          productType: plan.productType,
          currency: "MONTHLY_CREDIT",
          requiredMonthlyCredits,
          paymentMethod: paymentMethodHint,
        },
      });
    } catch (error) {
      if (Number(error?.code) !== 11000) throw error;
      paymentRecord = await Payment.findOne({
        userId: auth.userId,
        paymentType: "membership_pass",
        $or: [
          { idempotencyKey: requestId },
          { merchantUid },
        ],
      }).sort({ createdAt: -1 });
      if (!paymentRecord) throw error;
    }
  }

  // 월정석 지급분별(lot) FIFO 차감 + 이용권 활성화를 한 번의 원자적 write로 처리한다.
  // 단일 $inc로는 FIFO 배열 갱신이 불가하므로 버전 가드 기반 낙관적 write + 재시도로 경합을 처리한다.
  const PASS_BUY_MAX_ATTEMPTS = 5;
  let updatedUser = null;
  for (let attempt = 0; attempt < PASS_BUY_MAX_ATTEMPTS; attempt += 1) {
    const freshSub = attempt === 0
      ? (existingUser?.profileSubscription || {})
      : ((await User.findById(auth.userId).select("profileSubscription recentConsumeRequestIds").lean())?.profileSubscription || {});
    const ensuredForWrite = ensureLotsForBalance(freshSub, now.getTime());
    const deduction = deductLotsFIFO(ensuredForWrite.lots, requiredMonthlyCredits, now.getTime());
    if (!deduction.ok) break; // 유효 월정석 부족 → 아래 !updatedUser 블록이 insufficient로 분류
    const lotsVersion = Math.floor(Number(freshSub.membershipCreditLotsVersion || 0));
    updatedUser = await User.findOneAndUpdate(
      {
        _id: auth.userId,
        "profileSubscription.membershipCreditLotsVersion": lotsVersion,
        recentConsumeRequestIds: { $ne: requestId },
        ...subscriptionUpdateGuard,
      },
      {
        $set: {
          "profileSubscription.tier": tier,
          "profileSubscription.passTier": tier,
          "profileSubscription.planId": plan.planId,
          "profileSubscription.durationMonths": plan.durationMonths,
          "profileSubscription.productType": plan.productType,
          "profileSubscription.profileLimit": plan.profileLimit,
          "profileSubscription.maxCoveredCoin": Number(plan.maxCoveredCoin || 0),
          "profileSubscription.freeLimit": Number(plan.maxCoveredCoin || 0),
          "profileSubscription.passLimit": Number(plan.maxCoveredCoin || 0),
          "profileSubscription.source": "pass",
          "profileSubscription.startedAt": now,
          "profileSubscription.expiresAt": expiresAt,
          "profileSubscription.cancelAtPeriodEnd": false,
          "profileSubscription.cancelRequestedAt": null,
          "profileSubscription.customerUid": customerUid,
          "profileSubscription.paymentMethod": "monthly_credit",
          "profileSubscription.nextBillingAt": null,
          "profileSubscription.lastBillingAt": now,
          "profileSubscription.lastBillingStatus": "success",
          "profileSubscription.lastBillingError": "",
          "profileSubscription.firstSubAt": existingUser?.profileSubscription?.firstSubAt || now,
          "profileSubscription.membershipCreditLots": deduction.lots,
          "profileSubscription.membershipCreditBalance": deduction.balance,
        },
        $inc: {
          "profileSubscription.membershipCreditUsed": requiredMonthlyCredits,
          "profileSubscription.membershipCreditLotsVersion": 1,
        },
        // 중복 방지는 위 필터의 `$ne: requestId` 가드가 담당한다($push는 스스로 못 막는다).
        $push: {
          recentConsumeRequestIds: { $each: [requestId], $slice: -RECENT_CONSUME_REQUEST_ID_CAP },
        },
      },
      { returnDocument: "after", projection: { points: 1, profileSubscription: 1 } },
    ).lean();
    if (updatedUser) break;
    // null: 버전 충돌/멱등/구독 가드 미충족 → 재시도(멱등·insufficient·conflict는 아래 블록이 재분류).
  }

  if (!updatedUser) {
    const currentUser = await User.findById(auth.userId).select("points profileSubscription recentConsumeRequestIds").lean();
    if (Array.isArray(currentUser?.recentConsumeRequestIds) && currentUser.recentConsumeRequestIds.includes(requestId)) {
      const sub = currentUser?.profileSubscription || {};
      const activeExpiresAt = toValidDate(sub?.expiresAt);
      const remainingDays = activeExpiresAt
        ? Math.max(0, Math.ceil((activeExpiresAt.getTime() - Date.now()) / 86400000))
        : 0;
      return json({
        message: "Membership pass monthly-credit payment already processed.",
        idempotent: true,
        payment: formatPaymentResponse(await Payment.findById(paymentRecord._id).lean() || paymentRecord),
        subscription: {
          tier: sub?.tier || "free",
          source: sub?.source || "pass",
          isActive: hasActiveSubscriptionConflict(sub),
          expiresAt: toIsoOrNull(sub?.expiresAt),
          profileLimit: Number.isFinite(Number(sub?.profileLimit ?? plan.profileLimit)) ? Math.max(0, Math.floor(Number(sub?.profileLimit ?? plan.profileLimit))) : 1,
          planId: String(sub?.planId || plan.planId),
          durationMonths: Number(sub?.durationMonths || plan.durationMonths),
          productType: String(sub?.productType || plan.productType),
          membershipCreditBalance: Number(sub?.membershipCreditBalance || 0),
          membershipCreditGranted: Number(sub?.membershipCreditGranted || 0),
          membershipCreditUsed: Number(sub?.membershipCreditUsed || 0),
          membershipCreditCost: requiredMonthlyCredits,
          cancelAtPeriodEnd: Boolean(sub?.cancelAtPeriodEnd),
          cancelRequestedAt: toIsoOrNull(sub?.cancelRequestedAt),
          customerUid,
          paymentMethod: "monthly_credit",
          nextBillingAt: null,
          lastBillingStatus: String(sub?.lastBillingStatus || "success"),
        },
        monthlyCredits: Number(sub?.membershipCreditBalance || 0),
        membershipCreditBalance: Number(sub?.membershipCreditBalance || 0),
        passBalance: {
          active: hasActiveSubscriptionConflict(sub),
          tier: sub?.tier || "free",
          remainingDays,
          expiresAt: toIsoOrNull(sub?.expiresAt),
          profileLimit: Number.isFinite(Number(sub?.profileLimit ?? plan.profileLimit)) ? Math.max(0, Math.floor(Number(sub?.profileLimit ?? plan.profileLimit))) : 1,
        },
        user: {
          id: String(auth.userId),
          points: Number(currentUser?.points || 0),
        },
      });
    }
    const postTransition = evaluateSubscriptionTierTransition(currentUser?.profileSubscription, tier);
    if (!postTransition.allow) {
      await markPaymentFailure(paymentRecord, {
        status: "failed",
        paymentMethod: "monthly_credit",
        failureCode: "subscription_monthly_credit_conflict",
        failureMessage: "Subscription state changed before monthly-credit purchase could be completed.",
        failureStage: "subscription_monthly_credit_subscription_guard",
        incrementAttempt: true,
      }).catch(() => {});
      return json({
        message: postTransition.code === "SUBSCRIPTION_DOWNGRADE_BLOCKED"
          ? "A higher-tier subscription is currently active. Lower-tier purchase is disabled."
          : "An active subscription of the same tier already exists. Concurrent subscriptions are not allowed.",
        code: postTransition.code,
        activeTier: postTransition.activeTier,
        monthlyCredits: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
        membershipCreditBalance: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
      }, { status: 409 });
    }

    await markPaymentFailure(paymentRecord, {
      status: "failed",
      paymentMethod: "monthly_credit",
      failureCode: "subscription_monthly_credit_insufficient",
      failureMessage: "Insufficient monthly credits for membership pass purchase.",
      failureStage: "subscription_monthly_credit_consume",
      incrementAttempt: true,
    }).catch(() => {});
    return json({
      message: "이용권 혜택이 부족합니다.",
      code: "INSUFFICIENT_MONTHLY_CREDITS",
      requiredMonthlyCredits,
      currentMonthlyCredits,
    }, { status: 402 });
  }

  const updatedMonthlyCredits = Math.max(0, Math.floor(Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0)));
  const updatedExpiresAt = toValidDate(updatedUser?.profileSubscription?.expiresAt);
  const remainingPassDays = updatedExpiresAt
    ? Math.max(0, Math.ceil((updatedExpiresAt.getTime() - Date.now()) / 86400000))
    : 0;

  let ledger = null;
  try {
    ledger = await MonthlyCreditLedger.create({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      amount: requiredMonthlyCredits,
      beforeBalance: updatedMonthlyCredits + requiredMonthlyCredits,
      afterBalance: updatedMonthlyCredits,
      reason: `${plan.name} monthly-credit membership pass purchase`,
      sourceId: requestId,
      serviceKey: plan.planId,
      profileId: "",
      metadata: {
        paymentId: String(paymentRecord?._id || ""),
        merchantUid,
        requestId,
        planId: plan.planId,
        tier,
        durationMonths: plan.durationMonths,
        productType: plan.productType,
        wonPrice: plan.wonPrice,
        requiredMonthlyCredits,
      },
    });
  } catch (error) {
    if (Number(error?.code) === 11000) {
      // 동일 sourceId(requestId) 원장이 이미 존재 = 멱등 재시도. 크레딧 차감·구독 활성은 유효하므로
      // 롤백하지 않고 기존 원장을 재사용해 정상 완료 처리한다.
      ledger = await MonthlyCreditLedger.findOne({
        userId: auth.userId,
        type: "MONTHLY_CREDIT_SPEND",
        sourceId: requestId,
      }).lean().catch(() => null);
    } else {
      // 원장 생성 실패 시 크레딧 차감+구독 활성을 함께 되돌린다. profileSubscription 서브도큐먼트 전체를
      // 무조건 스냅샷으로 치환하면 그 사이 다른 요청의 변경을 덮어쓰므로, 우리가 방금 설정한 활성
      // 상태(expiresAt)가 그대로일 때만(=우리 활성이 최신일 때만) 스냅샷으로 복원한다.
      await User.updateOne(
        { _id: auth.userId, "profileSubscription.expiresAt": expiresAt },
        {
          $set: { profileSubscription: existingUser.profileSubscription || {} },
          $pull: { recentConsumeRequestIds: requestId },
        },
      ).catch(() => {});
      await markPaymentFailure(paymentRecord, {
        status: "failed",
        paymentMethod: "monthly_credit",
        failureCode: "subscription_monthly_credit_ledger_failed",
        failureMessage: String(error?.message || "Monthly credit ledger creation failed."),
        failureStage: "subscription_monthly_credit_ledger",
        incrementAttempt: true,
      }).catch(() => {});
      throw error;
    }
  }

  await Payment.findByIdAndUpdate(paymentRecord._id, {
    $set: {
      paymentAmount: plan.wonPrice,
      expectedChargedPoints: 0,
      chargedPoints: 0,
      paymentMethod: "monthly_credit",
      status: "success",
      paidAt: now,
      source: "confirm",
      paymentType: "membership_pass",
      subscriptionTier: tier,
      productId: plan.planId,
      membershipCreditCost: requiredMonthlyCredits,
      metadata: {
        ...(paymentRecord.metadata || {}),
        planId: plan.planId,
        durationMonths: plan.durationMonths,
        durationDays: plan.durationDays,
        productType: plan.productType,
        currency: "MONTHLY_CREDIT",
        verifiedAmount: plan.wonPrice,
        requiredMonthlyCredits,
        monthlyCreditLedgerId: String(ledger?._id || ""),
      },
      rawPortOne: null,
      failureCode: null,
      failureMessage: null,
      failureStage: null,
      lastErrorAt: null,
    },
  });

  return json({
    message: "이용권 혜택으로 달빛 이용권이 활성화되었습니다.",
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
      monthlyStoneBalance: Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0),
      membershipCreditBalance: Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0),
      membershipCreditGranted: Number(updatedUser?.profileSubscription?.membershipCreditGranted || 0),
      membershipCreditUsed: Number(updatedUser?.profileSubscription?.membershipCreditUsed || 0),
      membershipCreditCost: requiredMonthlyCredits,
      cancelAtPeriodEnd: false,
      cancelRequestedAt: null,
      customerUid,
      paymentMethod: "monthly_credit",
      nextBillingAt: null,
      lastBillingStatus: "success",
    },
    monthlyStoneBalance: updatedMonthlyCredits,
    monthlyCredits: updatedMonthlyCredits,
    membershipCreditBalance: updatedMonthlyCredits,
    passBalance: {
      active: true,
      tier,
      remainingDays: remainingPassDays,
      expiresAt: expiresAt.toISOString(),
      profileLimit: plan.profileLimit,
    },
    monthlyCreditLedger: ledger ? {
      id: String(ledger._id || ""),
      type: ledger.type,
      amount: Number(ledger.amount || 0),
      beforeBalance: Number(ledger.beforeBalance || 0),
      afterBalance: Number(ledger.afterBalance || 0),
      reason: String(ledger.reason || ""),
      createdAt: ledger.createdAt ? ledger.createdAt.toISOString() : new Date().toISOString(),
    } : null,
    user: {
      id: String(auth.userId),
      points: Number(updatedUser?.points || 0),
    },
  });
}

async function handleSubscriptionConfirm(request, env, auth) {
  const body = await readJson(request);
  const impUid = String(body?.impUid || body?.paymentId || "").trim();
  const tier = normalizePassTier(body?.tier || body?.passTier || body?.subscriptionTier) || "";
  const durationMonths = Number(body?.durationMonths || 1);
  const planId = String(body?.planId || "").trim().toLowerCase();
  const productType = String(body?.productType || "membership_pass").trim().toLowerCase();
  const requestedAmount = body?.amount === undefined ? null : Number(body.amount);
  const requestedCurrency = String(body?.currency || "KRW").trim().toUpperCase();
  const customerUidFromClient = String(body?.customerUid || "").trim();
  const merchantUidHint = String(body?.merchantUid || body?.merchant_uid || "").trim();
  const paymentMethodHint = normalizePaymentMethod(body?.paymentMethod || "card");
  if (!validateNewSubscriptionDuration(durationMonths, body?.durationDays)) {
    return json({
      message: "Only 30-day membership passes are available for new purchase.",
      code: "INVALID_SUBSCRIPTION_DURATION",
    }, { status: 400 });
  }
  const plan = resolveSubscriptionPlan(tier, durationMonths);

  if (!plan) {
    return json({ message: "Valid tier is required." }, { status: 400 });
  }
  if ((planId && planId !== plan.planId) || productType !== plan.productType) {
    return json({ message: "Subscription plan payload mismatch.", code: "SUBSCRIPTION_PLAN_MISMATCH" }, { status: 400 });
  }
  if ((requestedAmount !== null && requestedAmount !== plan.wonPrice) || !["KRW", "CURRENCY_KRW"].includes(requestedCurrency)) {
    return json({ message: "Subscription amount or currency mismatch.", code: "SUBSCRIPTION_PRICE_MISMATCH" }, { status: 400 });
  }
  const confirmPolicy = validatePurchasePolicy({
    userId: auth.userId,
    sku: plan.planId,
    productId: plan.planId,
    productType: resolveServerProductType({
      body,
      paymentType: "membership_pass",
      serverProductType: plan.productType,
      productId: plan.planId,
    }),
    price: plan.wonPrice,
    requestedPaymentMethod: paymentMethodHint,
    currentSubscription: auth.authUserDoc?.profileSubscription || null,
    familyPlanInfo: auth.authUserDoc?.profileSubscription || null,
    orderContext: {
      route: "subscription_confirm",
      coveredByPass: body?.coveredByPass === true,
      userEntitlement: body?.userEntitlement,
    },
  });
  const confirmPolicyResponse = await rejectPurchasePolicy(request, env, auth, confirmPolicy, {
    sku: plan.planId,
    requestedPaymentMethod: paymentMethodHint,
    route: "subscription_confirm",
  });
  if (confirmPolicyResponse) return confirmPolicyResponse;
  if (paymentMethodHint === "monthly_credit" || paymentMethodHint === "monthly") {
    return await handleSubscriptionMonthlyCreditConfirm(request, env, auth, { body, plan, tier, paymentMethodHint });
  }
  if (!impUid) {
    return json({ message: "impUid and valid tier are required." }, { status: 400 });
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

  const expiresAt = calculateSubscriptionActivationExpiresAt({
    existingSubscription: existingUser?.profileSubscription,
    transitionCode: transition.code,
    now,
    paidAt,
    durationDays: plan.durationDays,
  });

  const paymentActivationFields = {
    impUid,
    merchantUid,
    paymentAmount: plan.wonPrice,
    expectedChargedPoints: 0,
    chargedPoints: 0,
    paymentMethod: resolvedPaymentMethod,
    paidAt,
    source: "confirm",
    paymentType: "membership_pass",
    subscriptionTier: tier,
    productId: plan.planId,
    metadata: {
      ...(paymentRecord.metadata || {}),
      planId: plan.planId,
      durationMonths: plan.durationMonths,
      durationDays: plan.durationDays,
      productType: plan.productType,
      currency: "KRW",
      verifiedAmount: plan.wonPrice,
    },
    rawPortOne: portOnePayment,
  };
  const subscriptionActivationUpdate = {
    $set: {
      "profileSubscription.tier": tier,
      "profileSubscription.passTier": tier,
      "profileSubscription.planId": plan.planId,
      "profileSubscription.durationMonths": plan.durationMonths,
      "profileSubscription.productType": plan.productType,
      "profileSubscription.profileLimit": plan.profileLimit,
      "profileSubscription.maxCoveredCoin": Number(plan.maxCoveredCoin || 0),
      "profileSubscription.freeLimit": Number(plan.maxCoveredCoin || 0),
      "profileSubscription.passLimit": Number(plan.maxCoveredCoin || 0),
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
    },
  };

  const activateSubscriptionWithoutTransaction = async () => {
    // Idempotency gate: only claim a payment that is not already "success". A replayed or
    // concurrent confirm of an already-activated payment returns null here, so the membership
    // extension below is skipped (prevents expiresAt double-extension).
    const claimed = await Payment.findOneAndUpdate(
      { _id: paymentRecord._id, status: { $ne: "success" } },
      {
        $set: {
          ...paymentActivationFields,
          status: "processing",
          failureCode: null,
          failureMessage: null,
          failureStage: null,
          lastErrorAt: null,
        },
      },
      { returnDocument: "after" },
    ).lean();
    if (!claimed) {
      const existingPayment = await Payment.findById(paymentRecord._id).lean();
      const existingActiveUser = await User.findById(auth.userId, "points profileSubscription").lean();
      return { ok: true, idempotent: true, payment: existingPayment, updatedUser: existingActiveUser };
    }
    const updatedUser = await User.findByIdAndUpdate(
      auth.userId,
      subscriptionActivationUpdate,
      { returnDocument: "after", projection: { points: 1, profileSubscription: 1 } },
    ).lean();
    if (!updatedUser) {
      await Payment.findByIdAndUpdate(paymentRecord._id, {
        $set: {
          status: "retryable",
          failureCode: "subscription_user_update_failed",
          failureMessage: "Membership pass could not be activated after payment verification.",
          failureStage: "subscription_user_update",
          lastErrorAt: new Date(),
        },
      }).catch(() => {});
      return { ok: false, updatedUser: null, payment: await Payment.findById(paymentRecord._id).lean() };
    }
    const payment = await Payment.findByIdAndUpdate(paymentRecord._id, {
      $set: {
        status: "success",
        failureCode: null,
        failureMessage: null,
        failureStage: null,
        lastErrorAt: null,
      },
    }, { returnDocument: "after" }).lean();
    return { ok: true, updatedUser, payment };
  };

  const activateSubscriptionWithTransaction = async () => {
    const session = await mongoose.startSession();
    let activation = null;
    try {
      await session.withTransaction(async () => {
        // Idempotency gate: claim only a not-yet-success payment. A concurrent/replayed confirm
        // sees null and returns the current state without re-applying the membership extension.
        const payment = await Payment.findOneAndUpdate(
          { _id: paymentRecord._id, status: { $ne: "success" } },
          {
            $set: {
              ...paymentActivationFields,
              status: "success",
              failureCode: null,
              failureMessage: null,
              failureStage: null,
              lastErrorAt: null,
            },
          },
          { returnDocument: "after", session },
        ).lean();
        if (!payment) {
          const existingPayment = await Payment.findById(paymentRecord._id, null, { session }).lean();
          const existingActiveUser = await User.findById(
            auth.userId,
            "points profileSubscription",
            { session },
          ).lean();
          activation = { ok: true, idempotent: true, payment: existingPayment, updatedUser: existingActiveUser };
          return;
        }
        const updatedUser = await User.findByIdAndUpdate(
          auth.userId,
          subscriptionActivationUpdate,
          { returnDocument: "after", projection: { points: 1, profileSubscription: 1 }, session },
        ).lean();
        if (!updatedUser) throw new Error("subscription_activation_failed");
        activation = { ok: true, payment, updatedUser };
      });
      return activation;
    } finally {
      await session.endSession();
    }
  };

  let activation;
  try {
    activation = await activateSubscriptionWithTransaction();
  } catch (error) {
    if (!isTransactionUnsupported(error)) {
      await writeFailureLog({
        request,
        userId: auth.userId,
        impUid,
        merchantUid,
        source: "confirm",
        stage: "subscription_activation",
        code: "subscription_activation_failed",
        message: error?.message || "Membership pass activation failed.",
        status: 500,
        payload: body,
        rawPortOne: portOnePayment,
      });
      const paymentForRefund = {
        ...(await Payment.findById(paymentRecord._id).lean() || paymentRecord),
        ...paymentActivationFields,
        _id: paymentRecord._id,
      };
      const refund = await autoRefundSinglePaymentDeliveryFailure(
        env,
        paymentForRefund,
        "subscription_activation_failed",
        String(error?.message || "Membership pass activation failed."),
        "subscription_activation",
      );
      return json({
        message: refund.refunded
          ? "Membership pass activation failed. The payment was fully refunded automatically."
          : "Membership pass activation failed. Automatic refund requires administrator review.",
        code: refund.refunded ? "AUTO_REFUNDED_SUBSCRIPTION_ACTIVATION_FAILED" : "AUTO_REFUND_FAILED_SUBSCRIPTION_ACTIVATION_FAILED",
        refundStatus: refund.refunded ? "refunded" : "refund_failed",
        payment: formatPaymentResponse(refund.payment || paymentForRefund),
      }, { status: refund.refunded ? 502 : 500 });
    }
    activation = await activateSubscriptionWithoutTransaction();
  }

  if (!activation?.ok || !activation.updatedUser) {
    await writeFailureLog({
      request,
      userId: auth.userId,
      impUid,
      merchantUid,
      source: "confirm",
      stage: "subscription_user_update",
      code: "subscription_user_update_failed",
      message: "Membership pass could not be activated after payment verification.",
      status: 500,
      payload: body,
      rawPortOne: portOnePayment,
    });
    const paymentForRefund = {
      ...(activation?.payment || await Payment.findById(paymentRecord._id).lean() || paymentRecord),
      ...paymentActivationFields,
      _id: paymentRecord._id,
    };
    const refund = await autoRefundSinglePaymentDeliveryFailure(
      env,
      paymentForRefund,
      "subscription_user_update_failed",
      "Membership pass could not be activated after payment verification.",
      "subscription_user_update",
    );
    return json({
      message: refund.refunded
        ? "Membership pass activation failed. The payment was fully refunded automatically."
        : "Membership pass activation failed. Automatic refund requires administrator review.",
      code: refund.refunded ? "AUTO_REFUNDED_SUBSCRIPTION_USER_UPDATE_FAILED" : "AUTO_REFUND_FAILED_SUBSCRIPTION_USER_UPDATE_FAILED",
      pendingRecovery: !refund.refunded,
      refundStatus: refund.refunded ? "refunded" : "refund_failed",
      payment: formatPaymentResponse(refund.payment || paymentForRefund),
    }, { status: refund.refunded ? 502 : 500 });
  }

  const updatedUser = activation.updatedUser;

  return json({
    message: "30-day membership pass has been activated.",
    idempotent: false,
    payment: formatPaymentResponse(activation.payment || await Payment.findById(paymentRecord._id).lean()),
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
  if (
    String(body?.productType || "").trim().toLowerCase() === GUARDIAN_FORTUNE_CREDIT_PRODUCT_TYPE
    || /^guardian_fortune_chat_(?:3|10)$/.test(String(body?.productId || "").trim().toLowerCase())
  ) {
    return json({
      message: "오늘의 귀인 운세 대화권은 전용 PG 결제 확인 경로를 이용해 주세요.",
      code: "GUARDIAN_FORTUNE_USE_DEDICATED_CONFIRM_ROUTE",
    }, { status: 409 });
  }
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
    // Prepaid coin top-up (point_charge) confirm payloads are retired; only digital-content
    // and redirect-return confirms are accepted here.
    isValid = false;
    errors = ["Unsupported payment confirm payload. Prepaid coin top-up is no longer available."];
    sanitized = {
      impUid: "",
      merchantUid: undefined,
      paymentAmount: undefined,
      chargePoints: undefined,
      paymentMethod: undefined,
    };
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
      ...(settled.code ? { code: settled.code } : {}),
      ...(settled.pendingUnlock ? { pendingUnlock: true } : {}),
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
    accessGrant: settled.accessGrant || null,
    ...(settled.accessGrant?.accessType === "single_purchase" ? {
      accessMethod: "CARD",
      charged: Number(settled.payment?.paymentAmount || 0),
    } : {}),
  });
}

/* 취소 결과의 잠금-회수 흔적을 결제 문서에 남기는 필드 묶음.
   관리자 취소 경로(handleSinglePaymentCancel)가 쓰는 것과 같은 키를 쓴다 — 두 경로가 서로 다른
   필드에 기록하면 "환불했는데 콘텐츠가 남았는가"를 한 쿼리로 확인할 수 없다. */
function buildCancelRevocationFields(revocation, { partial = false } = {}) {
  const adminReviewRequired = partial || revocation?.adminReviewRequired === true;
  return {
    "pricingSnapshot.cancellationReviewRequired": adminReviewRequired,
    "pricingSnapshot.unlockRevoked": revocation?.unlockRevoked === true,
    "metadata.unlockRevoked": revocation?.unlockRevoked === true,
    "metadata.unlockRevocationStatus": revocation?.status || (partial ? "" : CONTENT_ENTITLEMENT_STATUSES.CANCELLED),
    "metadata.unlockRevocationError": revocation?.error || "",
  };
}

async function runCancelUpdate({ paymentRecord, canceledPortOne, pointsToRollback, auth, user, requestedCancelAmount, paidAmount, revocationFields = {} }) {
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
          ...revocationFields,
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
              ...revocationFields,
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

// 🔴 단건 디지털콘텐츠 결제는 "success" 로 끝나지 않는다 — /prepare 가 "pending" 으로 만들고(3532)
// 웹훅 정산은 "fulfilled" 로 끝난다(1827). "success" 는 레거시 confirm 정산 경로에서만 찍힌다.
// 그래서 아래 취소 가드가 "success" 만 허용하는 동안, 카드가 실제로 승인된 단건 주문조차 사용자
// 셀프 취소가 400 으로 막혔다(= 결제는 됐는데 환불 불가). 단건 주문에 한해 허용 상태를 넓힌다.
const SINGLE_PURCHASE_CANCELLABLE_STATUSES = new Set(["success", "fulfilled", "processing", "pending"]);
const DEFAULT_CANCELLABLE_STATUSES = new Set(["success"]);
// 우리 DB 가 아직 PG 승인 여부를 모르는 상태 — 취소를 쏘기 전에 PortOne 조회로 확인이 필요하다.
const CANCEL_REQUIRES_PORTONE_VERIFY_STATUSES = new Set(["processing", "pending"]);

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

  const recordStatus = String(paymentRecord.status || "");
  const isSinglePurchaseOrder = String(paymentRecord.paymentType || "") === "digital_content"
    && String(paymentRecord.accessType || "") === "single_purchase";
  const cancellableStatuses = isSinglePurchaseOrder
    ? SINGLE_PURCHASE_CANCELLABLE_STATUSES
    : DEFAULT_CANCELLABLE_STATUSES;
  if (!cancellableStatuses.has(recordStatus)) {
    return json({ message: "Only successful payments can be cancelled." }, { status: 400 });
  }

  const paidAmount = Number(paymentRecord.paymentAmount || 0);
  if (requestedCancelAmount !== undefined && requestedCancelAmount > paidAmount) {
    return json({ message: "Cancel amount exceeds paid amount." }, { status: 400 });
  }

  // 미확정 상태(pending/processing)는 PortOne 이 실제로 승인했는지부터 확인한다. 조회만 하고
  // 취소 요청 자체는 아래 기존 cancelPortOnePayment 경로를 그대로 쓴다.
  if (CANCEL_REQUIRES_PORTONE_VERIFY_STATUSES.has(recordStatus)) {
    let portOnePayment = null;
    try {
      portOnePayment = await fetchPortOnePayment(env, paymentRecord.impUid || paymentRecord.merchantUid || impUid || merchantUid);
    } catch (error) {
      await writeFailureLog({
        request,
        userId: auth.userId,
        impUid,
        merchantUid,
        source: "confirm",
        stage: "cancel_portone_verify",
        code: "portone_fetch_failed",
        message: error?.message || "PortOne payment lookup failed.",
        status: 502,
        payload: body,
      });
      return json({
        message: "Payment lookup failed. Please try again.",
        code: "PORTONE_FETCH_FAILED",
      }, { status: 502 });
    }

    const verifiedStatus = String(portOnePayment?.status || "").toLowerCase();
    if (verifiedStatus === "cancelled") {
      return json({
        message: "Payment was already cancelled.",
        idempotent: true,
        payment: formatPaymentResponse(paymentRecord),
      });
    }
    if (verifiedStatus !== "paid") {
      return json({
        message: "Only successful payments can be cancelled.",
        code: "PORTONE_NOT_PAID",
        status: verifiedStatus || undefined,
      }, { status: 400 });
    }
  }

  const pointsToRollback = Number(paymentRecord.chargedPoints || paymentRecord.expectedChargedPoints || 0);
  const user = await User.findById(auth.userId).select("points").lean();
  if (!user) return json({ message: "User not found." }, { status: 404 });

  if (pointsToRollback > 0 && Number(user.points || 0) < pointsToRollback) {
    return json({
      message: "Automatic refund is blocked because the charged points were already used. Please contact support.",
    }, { status: 409 });
  }

  /* 🔴 셀프 취소에서 잠금 콘텐츠 상품의 부분취소를 금지한다.
     아래 회수 로직은 부분취소면 회수를 건너뛰는데(관리자 경로와 같은 판단), 부분 여부를 정하는
     isPartialSingleCancel 은 결국 클라이언트가 보낸 cancelAmount 로 결정된다. 그대로 두면
     `cancelAmount: paidAmount - 1` 한 줄로 "99.99% 환불 + 콘텐츠 유지"가 되어 회수 자체가 무의미해진다.
     디지털 단건 상품은 애초에 부분 환불할 대상이 아니므로(전부 받거나 전부 못 받거나) 여기서 거절한다.
     부분 환불이 필요하면 관리자 취소 경로(currentCancellableAmount 를 요구하고 검토 플래그를 남긴다)를 쓴다.
     현재 클라이언트는 이 필드를 보내지 않으므로(app/points/PointsClient.tsx) 정상 흐름에 영향이 없다. */
  const isDigitalSinglePurchase = isSinglePurchaseDigitalPayment(paymentRecord);
  if (isDigitalSinglePurchase && requestedCancelAmount !== undefined && requestedCancelAmount < paidAmount) {
    return json({
      ok: false,
      message: "잠금 콘텐츠 상품은 부분 취소를 지원하지 않습니다. 전체 취소로 요청해 주세요.",
      code: "PARTIAL_CANCEL_NOT_SUPPORTED",
    }, { status: 400 });
  }

  const canceledPortOne = await cancelPortOnePayment(env, {
    impUid: paymentRecord.impUid || impUid,
    merchantUid: paymentRecord.merchantUid || merchantUid,
    reason,
    amount: requestedCancelAmount,
    checksum: paidAmount > 0 ? paidAmount : undefined,
  });

  /* 🔴 셀프 취소도 잠금 콘텐츠를 회수한다.
     예전에는 이 경로만 포인트 롤백으로 끝나고 ContentEntitlement·unlockedFeatures 를 그대로 둬,
     콘텐츠를 열람한 뒤 스스로 취소하면 "환불받고 콘텐츠도 유지"가 됐다. 나머지 취소 경로는 전부
     회수한다 — 관리자(handleSinglePaymentCancel)·취소 웹훅·실패보고 자동환불.

     🔴 회수 대상을 디지털 단건 결제로 한정하는 이유: revokePaymentContentAccess 의 뒷부분은
     ContentEntitlement 를 결제 단위로 정리한 뒤 User.paidFeatures/unlockedFeatures 를
     **사용자 전역 $pull** 로 지운다(worker/lib/content-unlocks.js). 그 키는 payment.productId 까지
     폴백하므로, 포인트충전·구독 결제를 이 경로로 취소하면 그 결제와 무관한 해금까지 날아갈 수 있다.
     형제 경로들이 전부 단건 디지털에 스코프돼 있는 것도(그리고 함수 이름이 Single 인 것도) 같은 이유다.
     (원칙 6 사전검사: handleCancel·runCancelUpdate 어디에도 기존 회수 호출이 없어 중첩이 아니다.) */
  const partialCancel = isPartialSingleCancel({
    requestedAmount: requestedCancelAmount,
    paidAmount,
    cancelResult: canceledPortOne,
  });
  let revocation = { unlockRevoked: false, adminReviewRequired: false };
  if (isDigitalSinglePurchase) {
    revocation = partialCancel
      // 위에서 부분취소를 거절하므로 여기 도달하는 것은 PortOne 이 PARTIAL_CANCELLED 를 돌려준 경우뿐이다.
      // 그때는 자동 회수 대신 검토 플래그를 남긴다(관리자 경로와 같은 판단).
      ? { unlockRevoked: false, adminReviewRequired: true }
      : await revokeSinglePaymentContentAccess(paymentRecord, {
        status: CONTENT_ENTITLEMENT_STATUSES.CANCELLED,
        reason: "self_service_payment_cancellation",
      });
  }

  const updateResult = await runCancelUpdate({
    paymentRecord,
    canceledPortOne,
    pointsToRollback,
    auth,
    user,
    requestedCancelAmount,
    paidAmount,
    revocationFields: buildCancelRevocationFields(revocation, { partial: partialCancel }),
  });

  // (엔타이틀먼트 회수는 위 #172 블록이 이미 수행한다 — 디지털 단건으로 스코프되어 있어
  //  포인트충전·구독 결제의 무관한 해금까지 날리지 않는다. 여기서 다시 회수하지 않는다.)

  return json({
    message: "Payment cancelled.",
    idempotent: false,
    unlockRevoked: revocation.unlockRevoked === true,
    adminReviewRequired: revocation.adminReviewRequired === true,
    user: {
      id: String(auth.userId),
      points: Number(updateResult?.updatedPoints || 0),
    },
    payment: formatPaymentResponse(updateResult?.canceledPayment),
  });
}

/* 🔴 자동 환불의 판단 근거를 클라이언트 주장에서 서버 기록으로 옮긴다.
   아래 shouldAutoCancelReportedResultFailure 가 보는 값은 전부 요청 본문에서 온다 —
   autoRefund/refundOnFailure/resultNotProvided 플래그도, reasonCode 문자열도 클라이언트가 정한다.
   즉 결과를 이미 받아 본 사용자가 "결과를 못 받았다"고 주장하면 실제 PortOne 취소까지 실행됐다
   (소비 후 환불). 그래서 "서버가 결과를 완성해 전달했다고 기록했는가"를 별도로 확인해 차단한다.
   생성 실패·미시작이거나 기록 자체가 없는 정당한 미전달은 종전대로 자동 환불이 열려 있다.
   판정 실패(Atlas 흔들림 등)는 fail-closed 로 둔다 — 환불을 미루는 것은 되돌릴 수 있지만,
   이미 전달된 콘텐츠에 환불을 내주는 것은 되돌릴 수 없다. */
async function resolvePaidResultDelivery(env, payment) {
  const candidates = [payment?.merchantUid, payment?.impUid, payment?.requestId, payment?._id]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const ownerId = String(payment?.userId || "").trim();
  if (!candidates.length || !ownerId) return { ok: true, delivered: false };

  // userId 로 좁힌다 — 없으면 남의 결제에 딸린 기록이 내 판정을 좌우할 수 있고,
  // orderId 는 클라이언트가 정하는 requestId 로도 채워져 타인 차단에 악용될 여지가 있다.
  const linkedToPayment = { $or: [{ paymentId: { $in: candidates } }, { orderId: { $in: candidates } }] };

  try {
    // 상품 유형이 둘이라 증거 테이블도 둘이다.
    //  - 회당 생성물: PaidExecutionRecord 가 남고 completed 여야 전달로 본다.
    //    generation_failed / paid_pending_generation 이면 정당한 미전달이라 환불이 열려 있어야 한다.
    //  - 잠금 콘텐츠: 실행 기록을 남기지 않는다(upsertSinglePaymentUnlockRecord 가 ContentEntitlement 만 쓴다).
    //    이 경우 "해금 = 전달"이므로 ACTIVE 엔타이틀먼트가 곧 증거다.
    //    실행 기록만 보던 이전 판정은 잠금 상품에서 항상 통과해 게이트가 사실상 없었다.
    const execution = await withMongoRetry(env, () => PaidExecutionRecord.findOne({
      userId: ownerId,
      ...linkedToPayment,
    }).select("status").lean());
    if (execution) {
      return { ok: true, delivered: String(execution.status || "") === "completed" };
    }

    const entitlement = await withMongoRetry(env, () => ContentEntitlement.findOne({
      userId: ownerId,
      status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
      ...linkedToPayment,
    }).select("_id").lean());
    return { ok: true, delivered: Boolean(entitlement) };
  } catch (error) {
    return { ok: false, delivered: false, error: String(error?.message || error).slice(0, 200) };
  }
}

function shouldAutoCancelReportedResultFailure(payment, body, reasonCode) {
  if (!isPaymentAutoCancelEligible(payment)) return false;
  const status = String(payment?.status || "").trim().toLowerCase();
  if (!["success", "fulfilled", "cancelled", "refunded"].includes(status)) return false;
  if (body?.autoRefund === true || body?.refundOnFailure === true || body?.resultNotProvided === true) return true;
  const code = String(reasonCode || "").trim().toLowerCase();
  return [
    "result_not_provided",
    "result_missing",
    "content_not_provided",
    "service_execution_failed",
    "generation_failed",
    "pdf_generation_failed",
    "premium_pdf_not_completed",
    "premium_pdf_completion_invalid",
    "execution_timeout",
    "timeout_auto_refund",
  ].includes(code);
}

async function cancelReportedResultFailurePayment(env, paymentRecord, reasonCode, reasonMessage) {
  if (paymentRecord.status === "cancelled" || paymentRecord.status === "refunded") {
    return {
      cancelled: true,
      idempotent: true,
      payment: formatPaymentResponse(paymentRecord),
    };
  }
  if (paymentRecord.status !== "success" && paymentRecord.status !== "fulfilled") {
    return {
      cancelled: false,
      skipped: true,
      payment: formatPaymentResponse(paymentRecord),
    };
  }

  const canceledPortOne = await cancelPortOnePayment(env, {
    impUid: paymentRecord.impUid || paymentRecord.merchantUid,
    merchantUid: paymentRecord.merchantUid || paymentRecord.impUid,
    reason: reasonMessage,
    checksum: Number(paymentRecord.paymentAmount || 0) || undefined,
    idempotencyKey: buildSinglePaymentRefundIdempotencyKey(paymentRecord),
  });

  const revocation = await revokeSinglePaymentContentAccess(paymentRecord, {
    status: CONTENT_ENTITLEMENT_STATUSES.REFUNDED,
    reason: reasonCode,
  });
  const canceledPayment = await Payment.findByIdAndUpdate(
    paymentRecord._id,
    {
      $set: {
        status: "cancelled",
        orderState: SINGLE_PAYMENT_ORDER_STATES.CANCELLED,
        rawPortOne: canceledPortOne,
        failureCode: reasonCode,
        failureMessage: reasonMessage,
        failureStage: "result_failure_auto_refund",
        lastErrorAt: new Date(),
        "metadata.refundStatus": "refunded",
        "metadata.unlockRevoked": revocation.unlockRevoked === true,
        "metadata.unlockRevocationStatus": revocation.status || CONTENT_ENTITLEMENT_STATUSES.REFUNDED,
        "metadata.unlockRevocationError": revocation.error || "",
      },
    },
    { returnDocument: "after" },
  ).lean();

  return {
    cancelled: true,
    idempotent: false,
    unlockRevoked: revocation.unlockRevoked === true,
    adminReviewRequired: revocation.adminReviewRequired === true,
    payment: formatPaymentResponse(canceledPayment || paymentRecord),
  };
}

async function handleReportFailure(request, env, auth) {
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

  let autoRefund = null;
  if (payment && shouldAutoCancelReportedResultFailure(payment, body, reasonCode)) {
    const delivery = await resolvePaidResultDelivery(env, payment);
    if (delivery.ok && !delivery.delivered) {
      autoRefund = await cancelReportedResultFailurePayment(env, payment, reasonCode, reasonMessage);
    } else {
      // 이미 전달된 결과이거나 확인 불가 — 자동 환불하지 않고 사람이 볼 근거를 남긴다.
      // adminReviewRequired 를 세워야 아래 공통 응답이 "검토 필요 없음"으로 나가지 않는다
      // (이 분기가 바로 사람 판단이 필요한 경우인데, 예전엔 그 필드가 false 로 나갔다).
      autoRefund = {
        cancelled: false,
        blocked: true,
        adminReviewRequired: true,
        code: delivery.ok ? "PAID_RESULT_ALREADY_DELIVERED" : "PAID_RESULT_DELIVERY_UNVERIFIED",
        payment: formatPaymentResponse(payment),
      };
      await writeFailureLog({
        request,
        userId: auth.userId,
        impUid,
        merchantUid,
        source: "client",
        stage: "auto_refund_gate",
        code: delivery.ok ? "auto_refund_blocked_delivered" : "auto_refund_blocked_unverified",
        message: delivery.ok
          ? "Auto refund blocked: server recorded a completed paid execution."
          : `Auto refund blocked: delivery check failed. ${delivery.error || ""}`.trim(),
        status: 409,
        payload: body,
      });
    }
  } else if (payment && payment.status !== "success") {
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

  return json({
    ok: true,
    message: autoRefund?.cancelled ? "Payment failure report recorded and refunded." : "Payment failure report recorded.",
    autoRefunded: Boolean(autoRefund?.cancelled),
    idempotent: Boolean(autoRefund?.idempotent),
    unlockRevoked: autoRefund?.unlockRevoked === true,
    adminReviewRequired: autoRefund?.adminReviewRequired === true,
    payment: autoRefund?.payment || undefined,
  });
}

function formatPointHistoryEntry(entry) {
  // 이용권(PASS/FAMILY) 무료 통과 기록은 payments가 아니라 PointHistory에만 남는다(billing.js recordPassAccessIfNeeded).
  // 주문 내역이 이를 "이용권으로 처리" 행으로 표시할 수 있도록 판별에 필요한 metadata만 추려 내보낸다
  // (metadata 통째 노출은 민감 필드가 섞일 수 있어 하지 않는다).
  const metadata = entry?.metadata && typeof entry.metadata === "object" ? entry.metadata : {};
  return {
    id: String(entry?._id || ""),
    kind: entry?.kind,
    delta: Number(entry?.delta || 0),
    balanceAfter: Number(entry?.balanceAfter || 0),
    reason: entry?.reason,
    featureKey: entry?.featureKey,
    createdAt: entry?.createdAt,
    accessType: String(metadata.accessType || ""),
    accessMethod: String(metadata.accessMethod || ""),
    coinPrice: Number(metadata.coinPrice ?? metadata.coinCost ?? 0),
    requestId: String(metadata.requestId || ""),
    passTier: String(metadata.passTier || ""),
  };
}

function hasMonthlyCreditRefundMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return false;
  return Boolean(
    metadata.refundedAt
      || metadata.refundedForUnlockFailure === true
      || metadata.refundedForServiceExecution === true
      || metadata.monthlyCreditRefundedForUnlockFailure === true
      || metadata.monthlyCreditRefundedForServiceExecution === true
      || metadata.refundForPointHistoryId
      || metadata.monthlyCreditRefundLedgerId
      || metadata.refundLedgerId,
  );
}

function resolveMonthlyCreditRefundedAt(metadata, fallback) {
  return metadata?.refundedAt
    || metadata?.monthlyCreditRefundedAt
    || metadata?.refundCreatedAt
    || metadata?.serviceExecutionRefundedAt
    || metadata?.unlockFailureRefundedAt
    || fallback
    || null;
}

function resolveMonthlyCreditRefundReason(metadata, fallback) {
  const reason = String(
    metadata?.refundReason
      || metadata?.monthlyCreditRefundReason
      || metadata?.failureMessage
      || metadata?.errorMessage
      || fallback
      || "",
  ).trim();
  return reason || "이용권 혜택 환불";
}

function formatMonthlyCreditLedgerEntry(entry) {
  const metadata = entry?.metadata && typeof entry.metadata === "object" ? entry.metadata : {};
  const rawType = String(entry?.type || "");
  const isRefund = rawType === "MONTHLY_CREDIT_GRANT" && hasMonthlyCreditRefundMetadata(metadata);
  return {
    id: String(entry?._id || entry?.id || ""),
    type: isRefund ? "MONTHLY_CREDIT_REFUND" : rawType,
    rawType,
    amount: Number(entry?.amount || 0),
    beforeBalance: Number(entry?.beforeBalance || 0),
    afterBalance: Number(entry?.afterBalance || 0),
    reason: isRefund ? resolveMonthlyCreditRefundReason(metadata, entry?.reason) : (entry?.reason ? String(entry.reason) : ""),
    sourceId: entry?.sourceId ? String(entry.sourceId) : "",
    serviceKey: entry?.serviceKey ? String(entry.serviceKey) : "",
    createdAt: entry?.createdAt,
    metadata,
  };
}

function collectMonthlyCreditLedgerKeys(entry) {
  const metadata = entry?.metadata && typeof entry.metadata === "object" ? entry.metadata : {};
  const baseKeys = [
    entry?.id,
    entry?._id,
    entry?.sourceId,
    metadata.pointHistoryId,
    metadata.purchaseId,
    metadata.requestId,
    metadata.idempotencyKey,
    metadata.orderId,
  ];
  const refundKeys = String(entry?.type || "") === "MONTHLY_CREDIT_REFUND" ? [
    metadata.refundForPointHistoryId ? `refund-for:${metadata.refundForPointHistoryId}` : "",
    metadata.refundSourceId ? `refund-source:${metadata.refundSourceId}` : "",
    metadata.originalLedgerId ? `refund-original:${metadata.originalLedgerId}` : "",
    metadata.monthlyCreditRefundLedgerId ? `refund-ledger:${metadata.monthlyCreditRefundLedgerId}` : "",
    metadata.refundLedgerId ? `refund-ledger:${metadata.refundLedgerId}` : "",
  ] : [];

  return baseKeys.concat(refundKeys)
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function formatMonthlyCreditRefundEntryFromLedger(entry) {
  const metadata = entry?.metadata && typeof entry.metadata === "object" ? entry.metadata : {};
  if (!hasMonthlyCreditRefundMetadata(metadata)) return null;
  if (String(entry?.type || "") !== "MONTHLY_CREDIT_SPEND") return null;

  const originalId = String(entry?._id || entry?.id || "").trim();
  const amount = Math.max(0, Math.floor(Number(entry?.amount || 0)));
  if (!originalId || amount <= 0) return null;

  const spendAfter = Math.max(0, Math.floor(Number(entry?.afterBalance || 0)));
  const refundLedgerId = String(metadata.monthlyCreditRefundLedgerId || metadata.refundLedgerId || "").trim();
  return {
    id: refundLedgerId ? `monthly-credit-refund:${refundLedgerId}` : `monthly-credit-refund:${originalId}`,
    type: "MONTHLY_CREDIT_REFUND",
    rawType: String(entry?.type || ""),
    amount,
    beforeBalance: spendAfter,
    afterBalance: spendAfter + amount,
    reason: resolveMonthlyCreditRefundReason(metadata, entry?.reason),
    sourceId: `refund:${String(entry?.sourceId || metadata.purchaseId || originalId).trim()}`.slice(0, 180),
    serviceKey: entry?.serviceKey ? String(entry.serviceKey) : "",
    createdAt: resolveMonthlyCreditRefundedAt(metadata, entry?.updatedAt || entry?.createdAt),
    metadata: {
      ...metadata,
      originalLedgerId: originalId,
      synthesizedFrom: "monthly_credit_spend_refund_metadata",
    },
  };
}

function formatMonthlyCreditLedgerEntryFromPointHistory(entry) {
  const metadata = entry?.metadata && typeof entry.metadata === "object" ? entry.metadata : {};
  const pointHistoryId = String(entry?._id || "").trim();
  if (!pointHistoryId) return null;

  const rewardType = String(metadata.rewardType || "").trim().toLowerCase();
  const accessType = String(metadata.accessType || "").trim().toLowerCase();
  const accessMethod = String(metadata.accessMethod || metadata.paymentMethod || "").trim().toUpperCase();
  const isGrant = String(entry?.kind || "") === "share_reward" && rewardType === "membership_credit";
  const isSpend = accessType === "membership_credit" || accessMethod === "MONTHLY";
  if (!isGrant && !isSpend) return null;

  const amount = Math.max(0, Math.floor(Number(
    isGrant
      ? (metadata.rewardMonthlyCredit ?? metadata.monthlyCreditAmount ?? entry?.delta)
      : (metadata.requiredMonthlyCredits ?? metadata.membershipCreditCost ?? metadata.monthlyCreditCost),
  )));
  if (amount <= 0) return null;

  const afterBalanceRaw = isGrant
    ? (entry?.balanceAfter ?? metadata.balanceAfter)
    : (metadata.remainingMembershipCredit ?? metadata.monthlyCredits ?? metadata.membershipCreditBalance);
  const afterBalance = Number.isFinite(Number(afterBalanceRaw))
    ? Math.max(0, Math.floor(Number(afterBalanceRaw)))
    : (isGrant ? amount : 0);
  const beforeBalance = isGrant
    ? Math.max(0, afterBalance - amount)
    : Math.max(0, afterBalance + amount);
  const sourceId = String(
    metadata.purchaseId
      || metadata.idempotencyKey
      || metadata.orderId
      || metadata.requestId
      || pointHistoryId,
  ).trim().slice(0, 180);

  return {
    id: `point-history:${pointHistoryId}`,
    type: isGrant ? "MONTHLY_CREDIT_GRANT" : "MONTHLY_CREDIT_SPEND",
    amount,
    beforeBalance,
    afterBalance,
    reason: entry?.reason ? String(entry.reason) : "",
    sourceId,
    serviceKey: entry?.featureKey ? String(entry.featureKey) : "",
    createdAt: entry?.createdAt,
    metadata: {
      ...metadata,
      pointHistoryId,
      synthesizedFrom: "point_history",
    },
  };
}

function formatMonthlyCreditRefundEntryFromPointHistory(entry) {
  const metadata = entry?.metadata && typeof entry.metadata === "object" ? entry.metadata : {};
  const pointHistoryId = String(entry?._id || "").trim();
  if (!pointHistoryId || !hasMonthlyCreditRefundMetadata(metadata)) return null;

  const accessType = String(metadata.accessType || "").trim().toLowerCase();
  const accessMethod = String(metadata.accessMethod || metadata.paymentMethod || "").trim().toUpperCase();
  const isMonthlyCreditSpend = accessType === "membership_credit" || accessMethod === "MONTHLY";
  if (!isMonthlyCreditSpend) return null;

  const amount = Math.max(0, Math.floor(Number(
    metadata.requiredMonthlyCredits
      ?? metadata.membershipCreditCost
      ?? metadata.monthlyCreditCost
      ?? 0,
  )));
  if (amount <= 0) return null;

  const spendAfterRaw = metadata.remainingMembershipCredit ?? metadata.monthlyCredits ?? metadata.membershipCreditBalance;
  const beforeBalance = Number.isFinite(Number(spendAfterRaw)) ? Math.max(0, Math.floor(Number(spendAfterRaw))) : 0;
  const refundLedgerId = String(metadata.monthlyCreditRefundLedgerId || metadata.refundLedgerId || "").trim();
  return {
    id: refundLedgerId ? `point-history-monthly-refund:${refundLedgerId}` : `point-history-monthly-refund:${pointHistoryId}`,
    type: "MONTHLY_CREDIT_REFUND",
    rawType: String(entry?.kind || ""),
    amount,
    beforeBalance,
    afterBalance: beforeBalance + amount,
    reason: resolveMonthlyCreditRefundReason(metadata, entry?.reason),
    sourceId: `refund:${String(metadata.purchaseId || metadata.requestId || pointHistoryId).trim()}`.slice(0, 180),
    serviceKey: entry?.featureKey ? String(entry.featureKey) : "",
    createdAt: resolveMonthlyCreditRefundedAt(metadata, entry?.updatedAt || entry?.createdAt),
    metadata: {
      ...metadata,
      pointHistoryId,
      synthesizedFrom: "point_history_refund_metadata",
    },
  };
}

function formatMonthlyCreditGrantSummary(auth, safeUser, ledgers) {
  if (ledgers.some((entry) => entry.type === "MONTHLY_CREDIT_GRANT")) return null;
  const sub = safeUser?.profileSubscription || {};
  const granted = Math.max(0, Math.floor(Number(sub.membershipCreditGranted || 0)));
  if (granted <= 0) return null;

  const balance = Math.max(0, Math.floor(Number(ensureLotsForBalance(sub, Date.now()).balance || 0)));
  const used = Math.max(0, Math.floor(Number(sub.membershipCreditUsed || 0)));
  const userId = String(auth?.userId || safeUser?._id || "").trim();
  const sourceId = `membership-credit-grant-summary:${userId || "unknown"}`;

  return {
    id: sourceId,
    type: "MONTHLY_CREDIT_GRANT",
    amount: granted,
    beforeBalance: 0,
    afterBalance: Math.max(granted, balance + used),
    reason: "이용권 혜택 지급",
    sourceId,
    serviceKey: "membership_credit_grant",
    createdAt: safeUser?.joinedAt || sub.legacyCoinCreditSeededAt || null,
    metadata: {
      synthesizedFrom: "membership_credit_summary",
      membershipCreditGranted: granted,
      membershipCreditUsed: used,
      membershipCreditBalance: balance,
    },
  };
}

function buildMonthlyCreditLedgerTimeline(auth, safeUser, monthlyCreditLedgers, pointHistories) {
  const seen = new Set();
  const result = [];
  const pushEntry = (entry) => {
    if (!entry?.id) return;
    const keys = collectMonthlyCreditLedgerKeys(entry);
    if (keys.some((key) => seen.has(key))) return;
    result.push(entry);
    for (const key of keys) seen.add(key);
  };

  if (Array.isArray(monthlyCreditLedgers)) {
    for (const ledger of monthlyCreditLedgers) {
      pushEntry(formatMonthlyCreditLedgerEntry(ledger));
      pushEntry(formatMonthlyCreditRefundEntryFromLedger(ledger));
    }
  }

  if (Array.isArray(pointHistories)) {
    for (const history of pointHistories) {
      pushEntry(formatMonthlyCreditLedgerEntryFromPointHistory(history));
      pushEntry(formatMonthlyCreditRefundEntryFromPointHistory(history));
    }
  }

  pushEntry(formatMonthlyCreditGrantSummary(auth, safeUser, result));

  return result
    .sort((a, b) => {
      const left = Date.parse(a?.createdAt || "");
      const right = Date.parse(b?.createdAt || "");
      return (Number.isFinite(right) ? right : 0) - (Number.isFinite(left) ? left : 0);
    })
    .slice(0, 20);
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
    passTier: entitlement.passTier || null,
    passLabel: entitlement.passLabel || entitlement.label,
    passColorTone: entitlement.passColorTone || null,
    label: entitlement.label,
    source: String(entitlement.source || sub.source || "pass"),
    isActive,
    expiresAt: validExpiresAt,
    profileLimit: Number.isFinite(Number(entitlement.maxProfiles)) ? Math.max(0, Math.floor(Number(entitlement.maxProfiles))) : 1,
    freeLimit: Number(entitlement.maxCoveredCoin || 0),
    startedAt: toIsoOrNull(sub.startedAt || sub.firstSubAt),
    membershipCreditBalance: Number(sub.membershipCreditBalance || 0),
    membershipCreditGranted: Number(sub.membershipCreditGranted || 0),
    membershipCreditUsed: Number(sub.membershipCreditUsed || 0),
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
    cancelRequestedAt: toIsoOrNull(sub.cancelRequestedAt),
  }];
}

function buildMeResponseBody(auth, user, recentPayments, pointHistories, monthlyCreditLedgers) {
  const safeUser = user || {};
  const unlockedFeatures = Array.isArray(safeUser.unlockedFeatures) ? safeUser.unlockedFeatures : [];
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
  const profileSubscription = safeUser.profileSubscription || {};
  // 스칼라 캐시 대신 활성(미만료) lot 합계로 표시 잔액 산출 — 아직 스윕 안 된 만료분을 즉시 제외한다.
  const monthlyCredits = Math.max(0, Math.floor(Number(ensureLotsForBalance(profileSubscription, Date.now()).balance || 0)));
  // 가장 이른 소멸 예정일(미만료 lot 중 가장 빨리 만료되는 것). 없으면 null.
  const monthlyStoneExpiresAt = resolveNextExpiry(profileSubscription.membershipCreditLots);
  const mappedMonthlyCreditLedgers = buildMonthlyCreditLedgerTimeline(auth, safeUser, monthlyCreditLedgers, pointHistories);

  return {
    success: true,
    ok: true,
    data: {
      balance,
      transactions: mappedTransactions,
      payments: mappedPayments,
      subscriptions,
      monthlyStoneBalance: monthlyCredits,
      monthlyCredits,
      membershipCreditBalance: monthlyCredits,
      monthlyStoneExpiresAt,
      monthlyCreditLedgers: mappedMonthlyCreditLedgers,
    },
    user: {
      id: String(auth.userId),
      name: safeUser.name || "",
      email: safeUser.email || "",
      points: balance,
      monthlyStoneBalance: monthlyCredits,
      monthlyCredits,
      unlockedFeatures,
    },
    unlockedFeatures,
    unlockMap,
    payments: mappedPayments,
    pointHistories: mappedTransactions,
    monthlyCreditLedgers: mappedMonthlyCreditLedgers,
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
      // 조회 실패로 만든 안전 기본값이다. 이 0 을 진짜 잔량으로 오인하면 결제창이 "월정석 0"으로 잠긴다.
      // 클라이언트는 이 플래그를 보고 잔량을 '미확정'으로 다루고 기존 표시값을 유지해야 한다.
      degradedMonthlyCredits: true,
      monthlyCredits: 0,
      membershipCreditBalance: 0,
      monthlyCreditLedgers: [],
    },
    user: {
      id: String(auth?.userId || ""),
      name: String(auth?.name || ""),
      email: String(auth?.email || ""),
      points: balance,
      monthlyCredits: 0,
      unlockedFeatures: [],
    },
    unlockedFeatures: [],
    unlockMap: {},
    payments: [],
    pointHistories: [],
    monthlyCreditLedgers: [],
    subscriptions: [],
  };
}

function buildDegradedPaymentsMeResponse(auth, {
  message,
  requestId,
  dbErrorCode = "DATABASE_TEMPORARILY_UNAVAILABLE",
  dbQueryCount = 0,
} = {}) {
  const body = buildTokenFallbackPaymentsMe(auth, message);
  body.requestId = requestId;
  body.degraded = true;
  body.retryable = true;
  body.reason = "DB_DEGRADED";
  body.code = "PAYMENTS_ME_DEGRADED";
  body.dbErrorCode = dbErrorCode;
  body.data.degradedPayments = true;
  body.data.degradedTransactions = true;
  body.data.degradedMonthlyCredits = true;
  body.data.historyDeferred = true;
  body.data.queryBudget = {
    dbQueryCount,
    maxConcurrentDbOps: 1,
  };
  return body;
}

async function handleMe(auth, env, request) {
  const startedAt = Date.now();
  const requestId = createPaymentRequestId(request);
  const shopSummary = isPaymentShopSummaryRequest(request);
  const metrics = {
    env,
    requestId,
    endpoint: "/api/payments/me",
    userHash: hashPaymentLogValue(auth?.userId),
    dbQueryCount: 0,
    internalFetchCount: 0,
    retryCount: 0,
    cache: auth?.authUserDoc ? "authUserDoc" : "miss",
    stageMs: {},
    errors: [],
    view: shopSummary ? "shop" : "full",
    commitSha: getPaymentDeploySha(env),
  };

  if (auth?.authDbFallback === true) {
    metrics.cache = "verifiedToken";
    logPaymentsMeTrace("warn", {
      ...metrics,
      env: undefined,
      status: 200,
      durationMs: Date.now() - startedAt,
      result: "degraded_token_snapshot",
    });
    return json(buildDegradedPaymentsMeResponse(auth, {
      message: "Payment data is temporarily unavailable. Kept the last verified client snapshot.",
      requestId,
      dbErrorCode: "AUTH_DB_DEGRADED",
      dbQueryCount: 0,
    }));
  }

  try {
    let user = auth.authUserDoc || null;
    if (!user) {
      const userStartedAt = Date.now();
      metrics.dbQueryCount += 1;
      user = await withMongoRetry(env, () => findUserByIdRaw(auth.userId, {
        name: 1,
        email: 1,
        points: 1,
        joinedAt: 1,
        unlockedFeatures: 1,
        profileSubscription: 1,
      }));
      metrics.stageMs.user = Date.now() - userStartedAt;
    }

    if (!user) {
      logPaymentsMeTrace("warn", {
        ...metrics,
        env: undefined,
        status: 404,
        durationMs: Date.now() - startedAt,
        result: "user_missing",
      });
      return json({
        success: false,
        ok: false,
        code: "USER_NOT_FOUND",
        requestId,
        message: "User profile was not found.",
      }, { status: 404 });
    }

    const recentPaymentsResult = shopSummary
      ? { ok: true, value: [] }
      : await runPaymentsMeOptionalQuery(metrics, "recentPayments", () => findRecentPaymentsForUser(auth.userId, 10));
    const pointHistoriesResult = shopSummary
      ? { ok: true, value: [] }
      : await runPaymentsMeOptionalQuery(metrics, "pointHistories", () => PointHistory.find({ userId: auth.userId }).sort({ createdAt: -1 }).limit(10).lean());
    const monthlyCreditLedgersResult = shopSummary
      ? { ok: true, value: [] }
      : await runPaymentsMeOptionalQuery(metrics, "monthlyCreditLedgers", () => MonthlyCreditLedger.find({ userId: auth.userId }).sort({ createdAt: -1 }).limit(10).lean());

    const recentPayments = recentPaymentsResult.ok ? recentPaymentsResult.value : [];
    const pointHistories = pointHistoriesResult.ok ? pointHistoriesResult.value : [];
    const monthlyCreditLedgers = monthlyCreditLedgersResult.ok ? monthlyCreditLedgersResult.value : [];

    const body = buildMeResponseBody(auth, user, recentPayments, pointHistories, monthlyCreditLedgers);
    body.requestId = requestId;
    body.data.degradedPayments = !recentPaymentsResult.ok;
    body.data.degradedTransactions = !pointHistoriesResult.ok;
    body.data.degradedMonthlyCredits = !monthlyCreditLedgersResult.ok;
    body.data.historyDeferred = shopSummary;
    body.data.queryBudget = {
      dbQueryCount: metrics.dbQueryCount,
      maxConcurrentDbOps: 1,
    };

    logPaymentsMeTrace(metrics.errors.length ? "warn" : "info", {
      ...metrics,
      env: undefined,
      status: 200,
      durationMs: Date.now() - startedAt,
      result: metrics.errors.length ? "partial" : "ok",
      paymentsCount: recentPayments.length,
      transactionsCount: pointHistories.length,
      monthlyCreditLedgerCount: monthlyCreditLedgers.length,
    });

    return json(body);
  } catch (error) {
    const code = classifyPaymentDbError(error);
    logPaymentsMeTrace("warn", {
      ...metrics,
      env: undefined,
      status: 200,
      durationMs: Date.now() - startedAt,
      result: "degraded_token_snapshot",
      errorCode: code,
      originalErrorName: String(error?.name || "Error").slice(0, 120),
      stack: String(error?.stack || "").slice(0, 2000),
    });
    return json(buildDegradedPaymentsMeResponse(auth, {
      message: "Payment data is temporarily unavailable. Kept the last verified client snapshot.",
      requestId,
      dbErrorCode: code,
      dbQueryCount: metrics.dbQueryCount,
    }));
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
  if (!config.configured) {
    console.warn("[payments/config] PORTONE config is not ready", {
      storeId: Boolean(config.storeId),
      channelKey: Boolean(config.channelKey),
      serverVerification: Boolean(config.serverVerificationConfigured),
      inicis: Boolean(config.inicisConfigured),
    });
    return json({
      message: "PortOne V2 KG Inicis public payment config is missing.",
      code: "PORTONE_V2_PUBLIC_CONFIG_MISSING",
      missing: {
        storeId: !config.storeId,
        channelKey: !config.channelKey,
        serverVerification: !config.serverVerificationConfigured,
        inicisMid: !config.inicisMidConfigured,
        inicisSignKey: !config.inicisSignKeyConfigured,
        inicisApiKey: !config.inicisApiKeyConfigured,
        inicisApiIv: !config.inicisApiIvConfigured,
      },
    }, { status: 503 });
  }

  return json({
    ok: true,
    configured: config.configured,
    serverVerificationConfigured: Boolean(config.serverVerificationConfigured),
    inicisConfigured: Boolean(config.inicisConfigured),
    inicisMidConfigured: Boolean(config.inicisMidConfigured),
    inicisSignKeyConfigured: Boolean(config.inicisSignKeyConfigured),
    inicisApiKeyConfigured: Boolean(config.inicisApiKeyConfigured),
    inicisApiIvConfigured: Boolean(config.inicisApiIvConfigured),
    provider: config.provider,
    pg: config.pg,
    storeId: config.storeId,
    channelKey: config.channelKey,
    currency: config.currency,
    payMethod: config.payMethod,
    noticeUrl: config.noticeUrl,
  });
}

// 결제 라우트 핸들러가 인증 직후 곧바로 필요로 하는 User 필드. 인증 리졸버에 userProjection으로
// 넘기면 인증 조회와 같은 왕복에서 함께 읽어 authUserDoc로 돌려준다(두 번째 Mongo 왕복 제거).
// 인증할 때 어차피 User 를 한 번 읽으므로, 결제 핸들러가 곧바로 쓰는 필드를 그때 함께 읽는다.
// Atlas 공유혀에서는 왕복 1회가 곧 체감 지연이라, 왕복 수를 줄이는 것이 유일하게 효과가 큰 레버다.
// 아래 두 묶음이 여기 있는 이유:
//  - pass/구독 필드: handleDigitalContentPrepare 가 이걸 위해 별도 User.findById 를 또 했다.
//  - customer 필드(phone/이름): 주문 응답의 customer 를 만들기 위해 필요하다. 이게 없어서
//    order.customer 가 아예 비어 있었고, 그 결과 클라가 결제마다 GET /api/me/payment-phone 을 탔다.
const PAYMENT_ROUTE_USER_PROJECTION = {
  _id: 1,
  name: 1,
  email: 1,
  points: 1,
  joinedAt: 1,
  birthDate: 1,
  unlockedFeatures: 1,
  profileSubscription: 1,
  // pass/구독 판정용
  subscription: 1,
  membership: 1,
  pass: 1,
  entitlement: 1,
  plan: 1,
  planId: 1,
  productId: 1,
  subscriptionTier: 1,
  membershipTier: 1,
  passTier: 1,
  status: 1,
  subscriptionStatus: 1,
  membershipStatus: 1,
  isActive: 1,
  isSubscribed: 1,
  expiresAt: 1,
  // PortOne customer 구성용
  phoneNumber: 1,
  phone: 1,
  fullName: 1,
  displayName: 1,
  username: 1,
  // 주문 스냅샷 profileId 폴백용(handleDigitalContentPrepare). 없으면 프로필 스코프 상품이
  // 프로필 결손 상태로 결제돼 정산이 관리자 검토로 빠진다.
  destinyProfilesCurrentId: 1,
};

// 만 14세 미만 계정은 무료 기능만 이용한다 — 미성년자 결제는 법정대리인 동의 없이는 사후 취소가
// 가능해(민법 제5조) 결제창이 뜨기 전 단계에서 막는다. 이미 승인된 결제의 완료(/confirm,
// /single/complete)는 막지 않는다 — 돈만 빠져나가고 지급이 안 되는 상태가 더 나쁘다.
const MINOR_BLOCKED_PAYMENT_PATHS = new Set(["/single/start", "/prepare", "/subscription/prepare", "/guardian-fortune/prepare", "/fusion-fortune/prepare"]);

async function enforceMinorPaymentRestriction(env, auth, method, path) {
  if (method !== "POST" || !MINOR_BLOCKED_PAYMENT_PATHS.has(path)) return null;

  let birthDate = String(auth?.authUserDoc?.birthDate || "").trim();
  if (!birthDate) {
    // refresh/admin 폴백 인증 경로에는 authUserDoc이 없다. 이때만 한 번 더 읽는다.
    try {
      const user = await withMongoRetry(env, () => findUserByIdRaw(auth.userId, { birthDate: 1 }));
      birthDate = String(user?.birthDate || "").trim();
    } catch (error) {
      return null;
    }
  }
  if (!birthDate) return null;

  // 나이 판정은 가입 검증과 같은 함수(KST 기준)를 쓴다.
  const ageCheck = validateBirthDateWithAge(birthDate);
  if (!ageCheck.isValid || !ageCheck.requiresGuardianConsent) return null;

  return json({
    message: `만 ${MIN_SELF_CONSENT_AGE}세 미만 계정은 유료 결제를 이용할 수 없습니다. 무료 기능만 이용해 주세요.`,
    code: "MINOR_PAYMENT_BLOCKED",
  }, { status: 403 });
}

// 🔴 여기 있던 "PortOne 401 관측 시 신규 주문 차단" 게이트는 제거했다.
// PortOne 은 '없는 결제 ID' 에도 401 UNAUTHORIZED 를 주므로 401 로는 자격증명 생사를 판별할 수 없다.
// 연속 카운트로도 구분이 안 됐고(재조정 크론이 그 오탐으로 매 틱 중단됐다), 이 게이트의 오탐은
// '전 사용자 결제 차단' 이라 막으려던 사고보다 피해가 크다. 신뢰할 수 없는 차단기는 두지 않는다.
// 자격증명 장애 감지는 재조정 태스크의 credentialSuspect 로그와 PaymentFailureLog 로 한다.

function guardianFortunePurchaseErrorResponse(error) {
  return json({
    ok: false,
    success: false,
    code: String(error?.code || "GUARDIAN_FORTUNE_PURCHASE_FAILED"),
    message: String(error?.message || "대화권 결제를 처리하지 못했습니다."),
  }, { status: Number(error?.status) || 400 });
}

async function handleGuardianFortuneCreditCatalog(env) {
  if (!isGuardianFortuneCreditSalesEnabled(env)) {
    return json({ ok: false, enabled: false, code: "GUARDIAN_FORTUNE_CREDITS_DISABLED" }, { status: 404 });
  }
  return json({
    ok: true,
    enabled: true,
    products: listGuardianFortuneCreditProducts(),
    policy: buildGuardianFortunePurchasePolicySummary(),
  });
}

async function handleGuardianFortuneCreditBalance(auth, env) {
  if (!isGuardianFortuneCreditSalesEnabled(env)) {
    return json({ ok: false, enabled: false, code: "GUARDIAN_FORTUNE_CREDITS_DISABLED" }, { status: 404 });
  }
  const balance = await getGuardianFortuneCreditBalance(auth.userId);
  return json({ ok: true, enabled: true, balance });
}

async function handleGuardianFortuneCreditPrepare(request, env, auth) {
  if (!isGuardianFortuneCreditSalesEnabled(env)) {
    return json({ ok: false, enabled: false, code: "GUARDIAN_FORTUNE_CREDITS_DISABLED" }, { status: 404 });
  }
  try {
    const body = await readJson(request);
    const result = await createGuardianFortuneCreditOrder({
      env,
      userId: auth.userId,
      body,
      requestUrl: request.url,
    });
    return json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    return guardianFortunePurchaseErrorResponse(error);
  }
}

async function handleGuardianFortuneCreditConfirm(request, env, auth) {
  if (!isGuardianFortuneCreditSalesEnabled(env)) {
    return json({ ok: false, enabled: false, code: "GUARDIAN_FORTUNE_CREDITS_DISABLED" }, { status: 404 });
  }
  try {
    const body = await readJson(request);
    const paymentId = String(body?.merchantUid || body?.paymentId || "").trim();
    const providerPaymentId = String(body?.paymentId || paymentId).trim();
    const result = await settleGuardianFortunePayment({
      env,
      paymentId,
      providerPaymentId,
      userId: auth.userId,
      source: "confirm",
    });
    const balance = await getGuardianFortuneCreditBalance(auth.userId);
    return json({
      ok: true,
      idempotent: Boolean(result.idempotent),
      message: `${result.product.productName}가 충전되었어요.`,
      product: result.product,
      balance,
      payment: formatPaymentResponse(result.payment),
    });
  } catch (error) {
    return guardianFortunePurchaseErrorResponse(error);
  }
}

async function handleFusionFortuneTicketCatalog(env) {
  if (!isFusionFortuneTicketSalesEnabled(env)) return json({ ok: false, enabled: false, code: "FUSION_FORTUNE_TICKET_SALES_DISABLED" }, { status: 404 });
  return json({ ok: true, enabled: true, products: getFusionFortuneTicketCatalog() });
}

async function handleFusionFortuneTicketBalance(auth, env) {
  if (!isFusionFortuneTicketSalesEnabled(env)) return json({ ok: false, enabled: false, code: "FUSION_FORTUNE_TICKET_SALES_DISABLED" }, { status: 404 });
  return json({ ok: true, balance: await getFusionFortuneTicketBalance(auth.userId) });
}

async function handleFusionFortuneTicketPrepare(request, env, auth) {
  if (!isFusionFortuneTicketSalesEnabled(env)) return json({ ok: false, enabled: false, code: "FUSION_FORTUNE_TICKET_SALES_DISABLED" }, { status: 404 });
  try {
    const result = await createFusionFortuneTicketOrder({ env, userId: auth.userId, body: await readJson(request), requestUrl: request.url });
    return json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    return json({ ok: false, code: error?.code || "FUSION_FORTUNE_TICKET_PREPARE_FAILED", message: error?.message || "이용권 결제를 준비하지 못했습니다." }, { status: Number(error?.status || 400) });
  }
}

async function handleFusionFortuneTicketConfirm(request, env, auth) {
  if (!isFusionFortuneTicketSalesEnabled(env)) return json({ ok: false, enabled: false, code: "FUSION_FORTUNE_TICKET_SALES_DISABLED" }, { status: 404 });
  try {
    const body = await readJson(request); const paymentId = String(body?.merchantUid || body?.paymentId || "").trim();
    const result = await settleFusionFortuneTicketPayment({ env, paymentId, providerPaymentId: String(body?.paymentId || paymentId), userId: auth.userId });
    return json({ ok: true, idempotent: Boolean(result.idempotent), product: result.product, balance: await getFusionFortuneTicketBalance(auth.userId), payment: formatPaymentResponse(result.payment) });
  } catch (error) {
    return json({ ok: false, code: error?.code || "FUSION_FORTUNE_TICKET_CONFIRM_FAILED", message: error?.message || "결제 확인에 실패했습니다." }, { status: Number(error?.status || 400) });
  }
}

export async function handlePaymentRoutes(request, env, ctx) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/payments");
  const portoneEnvConfig = getPortOneConfig(env);
  const portoneWebhookUrlConfigured = Boolean(getPortOneWebhookUrl(env));
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
      portoneApiSecretConfigured: Boolean(portoneEnvConfig.portoneApiSecret),
      portoneStoreIdConfigured: Boolean(portoneEnvConfig.portoneStoreId),
      portoneChannelKeyConfigured: Boolean(portoneEnvConfig.portoneChannelKey),
      portoneWebhookUrlConfigured: portoneWebhookUrlConfigured,
      portoneWebhookSecretConfigured: Boolean(portoneEnvConfig.portoneWebhookSecret),
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
      return await handleWebhook(request, env, ctx);
    }

    // 인증 확인과 동시에 결제 핸들러가 곧바로 쓰는 User 필드를 함께 읽어(authUserDoc) 인증-후 재조회
    // 왕복을 없앤다. 결제창이 뜨기까지의 Mongo 왕복이 곧 체감 지연이자 일시적 503의 표면적이라,
    // 왕복 하나를 줄이는 것이 지연과 503을 동시에 줄인다. (/api/auth/me 에서 검증된 패턴)
    // access-token 경로에서만 authUserDoc가 붙고, refresh/admin 폴백 경로에서는 없으므로
    // 각 핸들러는 authUserDoc 부재 시 종전대로 자체 조회로 폴백한다.
    // /api/billing/checkout|confirm already authenticated the same original request.
    // Reuse only that internal auth object so delegation does not issue a second User read.
    const delegatedAuth = ctx && typeof ctx === "object" && ctx.preverifiedAuth && typeof ctx.preverifiedAuth === "object"
      ? ctx.preverifiedAuth
      : null;
    const auth = delegatedAuth?.userId
      ? delegatedAuth
      : await requireUserFromRequest(request, env, {
        userProjection: PAYMENT_ROUTE_USER_PROJECTION,
        allowDbFallback: method === "GET" && path === "/me",
      });
    trace.authVerified = true;

    const security = await enforcePaymentRouteSecurity(request, env, auth, path);
    if (!security.ok) return security.response;

    const minorBlocked = await enforceMinorPaymentRestriction(env, auth, method, path);
    if (minorBlocked) return minorBlocked;

    if (method === "GET" && path === "/me") return await handleMe(auth, env, request);
    if (method === "GET" && path === "/points/me") return await handlePointsMe(auth, env);
    if (method === "GET" && path === "/guardian-fortune/catalog") return await handleGuardianFortuneCreditCatalog(env);
    if (method === "GET" && path === "/fusion-fortune/catalog") return await handleFusionFortuneTicketCatalog(env);

    await connectDb(env);
    trace.dbConnected = true;

    if (method === "POST" && path === "/single/start") return await handleSinglePaymentStart(request, env, auth);
    if (method === "POST" && path === "/single/complete") return await handleSinglePaymentComplete(request, env, auth);
    if (method === "POST" && path === "/single/cancel") return await handleSinglePaymentCancel(request, env, auth);
    if (method === "POST" && path === "/prepare") return await handlePrepare(request, env, auth);
    if (method === "GET" && path === "/guardian-fortune/balance") return await handleGuardianFortuneCreditBalance(auth, env);
    if (method === "POST" && path === "/guardian-fortune/prepare") return await handleGuardianFortuneCreditPrepare(request, env, auth);
    if (method === "POST" && path === "/guardian-fortune/confirm") return await handleGuardianFortuneCreditConfirm(request, env, auth);
    if (method === "GET" && path === "/fusion-fortune/balance") return await handleFusionFortuneTicketBalance(auth, env);
    if (method === "POST" && path === "/fusion-fortune/prepare") return await handleFusionFortuneTicketPrepare(request, env, auth);
    if (method === "POST" && path === "/fusion-fortune/confirm") return await handleFusionFortuneTicketConfirm(request, env, auth);
    if (method === "POST" && path === "/subscription/prepare") return await handleSubscriptionPrepare(request, env, auth);
    if (method === "POST" && path === "/confirm") return await handleConfirm(request, env, auth);
    if (method === "POST" && path === "/subscription/confirm") return await handleSubscriptionConfirm(request, env, auth);
    if (method === "POST" && path === "/cancel") return await handleCancel(request, env, auth);
    if (method === "POST" && path === "/report-failure") return await handleReportFailure(request, env, auth);
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
  handleSinglePaymentStart,
  handleSinglePaymentComplete,
  handleGuardianFortuneCreditCatalog,
  handleGuardianFortuneCreditBalance,
  handleGuardianFortuneCreditPrepare,
  handleGuardianFortuneCreditConfirm,
  handleFusionFortuneTicketCatalog,
  handleFusionFortuneTicketBalance,
  handleFusionFortuneTicketPrepare,
  handleFusionFortuneTicketConfirm,
  handleWebhook,
  markPaymentCancellationForAdminReview,
  handleSubscriptionPrepare,
  handleSubscriptionConfirm,
  handleMe,
  resolveIdempotencyKey,
  normalizeIdempotencyKey,
  signStandardWebhookPayload,
  verifyPortOneWebhookSignature,
  isWebhookEventReclaimable,
  isSuccessfulWebhookResponse,
  WEBHOOK_STALE_PROCESSING_MS,
};
