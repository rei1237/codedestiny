import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { handleFortuneRoutes } from "./fortune.js";
import { handlePaymentRoutes } from "./payments.js";
import { getOptionalUserFromRequest } from "../lib/auth.js";
import {
  buildPremiumAccessCookie,
  createPremiumAccessToken,
  resolvePremiumAccessReportType,
} from "../lib/premium-access-token.js";
import {
  assertFeatureEnabled,
  getBillingFeaturePricing,
  listBillingFeatures,
} from "../lib/billing-feature-registry.js";
import {
  isUnlockPaidFeatureKey,
} from "../lib/paid-feature-registry.js";
import {
  completeServiceExecution,
  failServiceExecution,
  getServiceExecution,
  heartbeatServiceExecution,
  startServiceExecution,
} from "../lib/service-execution-task.js";
import { connectDb } from "../lib/db.js";
import {
  CONTENT_ENTITLEMENT_SCOPES,
  CONTENT_ENTITLEMENT_SERVICE_KEYS,
  CONTENT_ENTITLEMENT_SOURCES,
  CONTENT_ENTITLEMENT_STATUSES,
  ContentEntitlement,
  MonthlyCreditLedger,
  PointHistory,
  SAJU_LOCKED_CONTENT_KEYS,
  ServiceExecutionTransaction,
  User,
} from "../lib/models.js";
import { calculateKrwAmountFromCoins, calculateMembershipCreditCost, MEMBERSHIP_CREDIT_PER_COIN } from "../lib/billing-policy.js";
import {
  applyPdfPassDiscountToPricing,
  isPdfFeaturePricing,
} from "../lib/pdf-pass-discount.js";
import {
  findActivePaidContentUnlock,
  upsertPaidContentUnlock,
} from "../lib/content-unlocks.js";
import {
  canUseByPass,
  normalizeHoneyPassEntitlement,
  normalizePassTier,
} from "../lib/profile-limits.js";
import {
  getProfileCardMutationPolicy,
  PROFILE_CARD_DELETE_COST_MONTHLY_STONES,
  PROFILE_CARD_MUTATION_ACTIONS,
} from "../lib/profile-card-mutation-policy.js";

const ACCESS_DECISION_REASONS = Object.freeze({
  FREE: "free",
  AUTH_REQUIRED: "auth_required",
  ALREADY_UNLOCKED: "already_unlocked",
  SUBSCRIPTION_ACTIVE: "subscription_active",
  USAGE_PASS_ACTIVE: "usage_pass_active",
  INSUFFICIENT_COINS: "insufficient_coins",
  REQUIRES_PURCHASE: "requires_purchase",
});

const SAJU_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY = Object.freeze({
  section_daewun: SAJU_LOCKED_CONTENT_KEYS.DAEUN_ANALYSIS,
  section_summary: SAJU_LOCKED_CONTENT_KEYS.FULL_READING,
  section_compat: SAJU_LOCKED_CONTENT_KEYS.COMPATIBILITY,
});

const ZIWEI_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY = Object.freeze({
  ziwei_decade_luck: "ziwei.decadeLuck",
});

const PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY = Object.freeze({
  ...SAJU_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY,
  ...ZIWEI_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY,
});

const PROFILE_UNLOCK_FEATURE_BY_CONTENT_KEY = Object.freeze(
  Object.fromEntries(
    Object.entries(PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY).map(([featureKey, contentKey]) => [contentKey, featureKey]),
  ),
);

const PROFILE_UNLOCK_SERVICE_KEYS = Object.freeze([
  CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU,
  "ziwei",
]);

const ACCESS_METHOD_ORDER = Object.freeze(["pass", "one_time", "monthly"]);
const LOTTO_RITUAL_REPORT_FEATURE_KEY = "fun.quantumLotto.ritualReport";
const PROFILE_CARD_MANAGE_FEATURE_KEY = "profile-card-manage";
const ADMIN_TEST_USER_ID = "flower-admin";
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const PAID_ACCESS_DECISION_CACHE_TTL_MS = 4000;
const PAID_ACCESS_DECISION_CACHE_MAX_ENTRIES = 2500;
const PAID_ACCESS_DECISION_DB_TIMEOUT_MS = 1400;
const PAID_ACCESS_DB_ERROR_SIGNATURES = [
  "temporarily unavailable",
  "temporarily_unavailable",
  "server is unavailable",
  "database is temporarily unavailable",
  "connection",
  "connect",
  "server selection",
  "selection timeout",
  "timed out",
  "timeout",
  "econnrefused",
  "enotfound",
  "enotconn",
  "econnreset",
  "etimedout",
  "mongo",
  "mongoose",
  "mongodb",
  "network",
];

const paidAccessDecisionCache = globalThis.__paidAccessDecisionCache
  || (globalThis.__paidAccessDecisionCache = {
    entries: new Map(),
    lastPruneAt: 0,
  });

function buildPaidAccessDecisionCacheKey({ userId, profileId, featureKey, coinPrice, requestedPaymentMode, allowPassAutoUnlock }) {
  return [
    String(userId || ""),
    String(profileId || ""),
    String(featureKey || ""),
    Math.max(0, Math.floor(Number(coinPrice || 0))),
    String((requestedPaymentMode || "")).toLowerCase(),
    allowPassAutoUnlock === false ? "0" : "1",
  ].join("|");
}

function readPaidAccessDecisionFromCache(cacheKey) {
  if (!cacheKey) return null;
  const now = Date.now();
  const entry = paidAccessDecisionCache.entries.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    paidAccessDecisionCache.entries.delete(cacheKey);
    return null;
  }
  return entry.decision || null;
}

function writePaidAccessDecisionToCache(cacheKey, decision, priceCoin) {
  if (!cacheKey || !decision) return decision;
  const now = Date.now();
  if (paidAccessDecisionCache.lastPruneAt + 2000 < now) {
    paidAccessDecisionCache.lastPruneAt = now;
    for (const [key, entry] of paidAccessDecisionCache.entries.entries()) {
      if (!entry || entry.expiresAt <= now) paidAccessDecisionCache.entries.delete(key);
    }
  }
  if (paidAccessDecisionCache.entries.size > PAID_ACCESS_DECISION_CACHE_MAX_ENTRIES) {
    const earliestKey = paidAccessDecisionCache.entries.keys().next().value;
    if (earliestKey) paidAccessDecisionCache.entries.delete(earliestKey);
  }
  paidAccessDecisionCache.entries.set(cacheKey, {
    decision: decision,
    createdAt: now,
    expiresAt: now + Math.max(1000, Math.floor(PAID_ACCESS_DECISION_CACHE_TTL_MS)),
    priceCoin: Number.isFinite(Number(priceCoin)) ? Math.max(0, Math.floor(Number(priceCoin))) : 0,
  });
  return decision;
}

const SAJU_PDF_GENERATION_FEATURE_KEYS = new Set([
  "saju_life_book_pdf",
  "premium-lifebook-report",
  "premium_pdf_saju_life_book",
  "saju_love_book_pdf",
  "saju-love-book",
  "premium-love-secret-solo",
  "premium-love-secret-couple",
  "premium_pdf_saju_love_secret",
  "premium_pdf_saju_love_secret_compat",
  "saju_new_year_pdf",
  "premium-saju-newyear-report",
  "premium_pdf_saju_new_year",
  "premium_pdf_saju_yearly",
]);

function resolveSajuProfileUnlockContentKey(featureKey, contentKey = "") {
  const explicitContentKey = String(contentKey || "").trim();
  if (PROFILE_UNLOCK_FEATURE_BY_CONTENT_KEY[explicitContentKey]) return explicitContentKey;
  return PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY[String(featureKey || "").trim()] || "";
}

function createUnlockEntitlementSaveError(error) {
  const wrapped = new Error(String(error?.message || "Unlock entitlement save failed."));
  wrapped.code = String(error?.code || "UNLOCK_ENTITLEMENT_SAVE_FAILED");
  wrapped.cause = error;
  return wrapped;
}

async function findActiveSajuProfileUnlock(env, { userId, profileId, featureKey }) {
  await connectDb(env);
  return findActivePaidContentUnlock({ userId, profileId, featureKey });
}

async function hasUserScopedPermanentUnlock(env, { userId, featureKey }) {
  const key = String(featureKey || "").trim();
  if (!userId || !key || !isUnlockPaidFeatureKey(key) || resolveSajuProfileUnlockContentKey(key)) {
    return false;
  }
  await connectDb(env);
  const row = await User.exists({ _id: userId, unlockedFeatures: key });
  return Boolean(row);
}

async function upsertSajuProfileUnlockEntitlement(env, {
  userId,
  profileId,
  featureKey,
  contentKey = "",
  source,
  orderId = "",
  paymentId = "",
  passId = "",
  coinAmount = 0,
  unlockedAt = null,
}) {
  if (!userId) {
    const error = new Error("Profile id is required for profile-scoped unlock entitlement.");
    error.code = "INVALID_UNLOCK_TARGET";
    throw error;
  }

  await connectDb(env);
  const normalizedContentKey = resolveSajuProfileUnlockContentKey(featureKey, contentKey);
  return upsertPaidContentUnlock({
    userId,
    profileId,
    featureKey,
    contentKey: normalizedContentKey || undefined,
    source,
    orderId,
    paymentId,
    passId,
    coinAmount,
    unlockedAt,
  }).catch((error) => {
    throw createUnlockEntitlementSaveError(error);
  });
}

function resolveUsagePassCategories(pricing = {}) {
  const featureKey = String(pricing?.featureKey || "").trim().toLowerCase();
  const cost = Number(pricing?.coinPrice || pricing?.cost || 0);
  const categories = [];
  if (!featureKey) return categories;

  const isCompat = featureKey.includes("compat")
    || featureKey.includes("relationship")
    || featureKey === "section_compat"
    || featureKey === "vedic-compatibility-per-use"
    || featureKey === "premium-love-secret-couple"
    || featureKey === "premium_pdf_saju_love_secret_compat";
  const isSajuUnlock = featureKey === "section_daewun"
    || featureKey === "section_summary"
    || featureKey === "section_compat"
    || featureKey === LOTTO_RITUAL_REPORT_FEATURE_KEY.toLowerCase()
    || featureKey.startsWith("rpt_")
    || featureKey === "rpgcharacter"
    || featureKey === "traveldestiny"
    || featureKey === "healthreport"
    || featureKey === "sajudiary"
    || featureKey === "secrethouseepisodes";

  if (isCompat) categories.push("compat");
  if (isSajuUnlock) categories.push("saju_unlock");
  if (Number.isFinite(cost) && cost > 0 && cost <= 30) categories.push("fortune_30");
  if (Number.isFinite(cost) && cost > 0 && cost <= 50) categories.push("fortune_50");

  return Array.from(new Set(categories));
}

async function consumeUsagePassIfAvailable(env, authUserId, pricing, requestId) {
  const featureKey = String(pricing?.featureKey || "").trim();
  const normalizedRequestId = String(requestId || "").trim();
  const idempotencyMarker = normalizedRequestId && featureKey
    ? `usage-pass:${featureKey}:${normalizedRequestId}`
    : "";
  const categories = resolveUsagePassCategories(pricing);
  if (!categories.length) return null;

  await connectDb(env);

  if (idempotencyMarker) {
    const idempotentUser = await User.findOne({
      _id: authUserId,
      recentConsumeRequestIds: idempotencyMarker,
    })
      .select("points usagePasses")
      .lean();
    if (idempotentUser) {
      const usagePasses = Array.isArray(idempotentUser.usagePasses) ? idempotentUser.usagePasses : [];
      const idempotentCategory = categories.find((candidate) => usagePasses.some((entry) => String(entry?.category || "") === candidate)) || categories[0];
      const activePass = usagePasses.find((entry) => String(entry?.category || "") === idempotentCategory);
      return {
        category: idempotentCategory,
        remainingUses: Number(activePass?.remainingUses || 0),
        requestId: normalizedRequestId,
        transactionType: "usage_pass",
        idempotent: true,
        user: {
          id: String(authUserId || ""),
          points: Number(idempotentUser?.points || 0),
        },
      };
    }
  }

  let updatedUser = null;
  let category = "";
  for (let i = 0; i < categories.length; i += 1) {
    category = categories[i];
    updatedUser = await User.findOneAndUpdate(
      {
        _id: authUserId,
        ...(idempotencyMarker ? { recentConsumeRequestIds: { $ne: idempotencyMarker } } : {}),
        usagePasses: {
          $elemMatch: {
            category,
            remainingUses: { $gt: 0 },
          },
        },
      },
      {
        $inc: { "usagePasses.$.remainingUses": -1 },
        $set: { "usagePasses.$.updatedAt": new Date() },
        ...(idempotencyMarker ? { $addToSet: { recentConsumeRequestIds: idempotencyMarker } } : {}),
      },
      {
        returnDocument: "after",
        projection: { points: 1, usagePasses: 1 },
      },
    ).lean();
    if (updatedUser) break;
  }

  if (!updatedUser) return null;

  const usagePasses = Array.isArray(updatedUser.usagePasses) ? updatedUser.usagePasses : [];
  const activePass = usagePasses.find((entry) => String(entry?.category || "") === category);

  return {
    category,
    remainingUses: Number(activePass?.remainingUses || 0),
    requestId: normalizedRequestId,
    transactionType: "usage_pass",
    user: {
      id: String(authUserId || ""),
      points: Number(updatedUser?.points || 0),
    },
  };
}

function isActiveMembership(profileSubscription = {}) {
  return normalizeHoneyPassEntitlement({ profileSubscription }).isActive;
}

function buildPassPaymentDecision(entitlement = {}, pricing = {}, profileSubscription = {}, overrides = {}) {
  const coinCost = Math.max(0, Math.floor(Number(pricing?.coinPrice || pricing?.cost || 0)));
  const passLimitValue = Number(entitlement?.maxCoveredCoin || 0);
  const monthlyBalance = Math.max(0, Math.floor(Number(
    overrides.monthlyBalance ?? profileSubscription?.membershipCreditBalance ?? 0,
  )));
  const membershipCreditCost = Math.max(0, Math.floor(Number(
    pricing?.membershipCreditCost || calculateMembershipCreditCost(coinCost),
  )));
  const hasActivePass = entitlement?.isActive === true;
  const passTier = hasActivePass ? normalizePassTier(entitlement?.passTier || entitlement?.tier) : null;
  const pdfDiscountRequiresPayment = pricing?.passDiscount && Number(pricing.passDiscount.finalCoinPrice || coinCost || 0) > 0;
  const passCovered = !pdfDiscountRequiresPayment && canUseByPass(entitlement, coinCost);
  const monthlyCovered = coinCost > 0 && membershipCreditCost > 0 && monthlyBalance >= membershipCreditCost;

  return {
    coinCost,
    hasActivePass,
    passTier,
    passLimit: hasActivePass && passLimitValue > 0 ? passLimitValue : null,
    canUseByPass: passCovered,
    monthlyBalance,
    canUseByMonthly: monthlyCovered,
    canUseByCard: true,
    recommendedMethod: passCovered ? "PASS" : (monthlyCovered ? "MOONLIGHT_STONE" : "DIRECT_KRW"),
    hiddenMethods: passCovered ? ["DIRECT_KRW", "MOONLIGHT_STONE", "COIN"] : [],
    decisionReason: passCovered
      ? "PASS_COVERED"
      : (pdfDiscountRequiresPayment ? "PDF_PASS_DISCOUNT_APPLIED" : (hasActivePass && passLimitValue > 0 && coinCost > passLimitValue ? "PRICE_EXCEEDS_PASS_LIMIT" : "PAYMENT_REQUIRED")),
    ...(pricing?.passDiscount ? { passDiscount: pricing.passDiscount } : {}),
  };
}

function toAccessGateLicenseTier(value) {
  const tier = normalizePassTier(value);
  return tier ? String(tier).toUpperCase() : "";
}

function buildLicensePassAccessGateResult({
  pricing = {},
  paymentOptions = {},
  membershipPass = {},
  accessDecision = {},
} = {}) {
  const featureKey = String(pricing?.featureKey || "").trim();
  if (featureKey === PROFILE_CARD_MANAGE_FEATURE_KEY) return null;
  const licenseTier = toAccessGateLicenseTier(
    paymentOptions?.passTier
      || membershipPass?.passTier
      || membershipPass?.tier
      || accessDecision?.membershipPass?.passTier
      || accessDecision?.membershipPass?.tier,
  );
  if (!licenseTier) return null;
  const coveredCoinPrice = Math.max(0, Math.floor(Number(
    pricing?.coinPrice
      || pricing?.cost
      || paymentOptions?.coinCost
      || accessDecision?.priceCoin
      || 0,
  )));
  return {
    status: "license_passed",
    licenseTier,
    coveredCoinPrice,
    contentTitle: String(pricing?.reason || pricing?.categoryLabel || pricing?.featureKey || "").trim() || undefined,
    reason: licenseTier === "FAMILY" ? "family_all_access" : "license_coin_limit",
  };
}

function buildPaidContentAccessDecision({
  accessGranted = false,
  reason = "payment_required",
  shouldOpenPaymentSelector = false,
  availableMethods = ACCESS_METHOD_ORDER,
  unlockId = "",
  priceCoin = 0,
  paymentOptions = null,
  accessGateResult = null,
} = {}) {
  return {
    accessGranted: Boolean(accessGranted),
    reason,
    shouldOpenPaymentSelector: reason === "payment_required" ? Boolean(shouldOpenPaymentSelector) : false,
    availableMethods: Array.isArray(availableMethods) ? availableMethods : [...ACCESS_METHOD_ORDER],
    ...(unlockId ? { unlockId: String(unlockId) } : {}),
    priceCoin: Math.max(0, Math.floor(Number(priceCoin || 0))),
    ...(paymentOptions ? { paymentOptions } : {}),
    ...(accessGateResult ? { accessGateResult } : {}),
  };
}

function resolveProfileCardActionType(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text.includes("delete") || text.includes("remove")) return PROFILE_CARD_MUTATION_ACTIONS.DELETE;
  return "";
}

function buildProfileCardMutationMetadata(body = {}) {
  const actionType = resolveProfileCardActionType(body?.actionType || body?.profileAction || body?.action);
  if (actionType !== PROFILE_CARD_MUTATION_ACTIONS.DELETE) return {};
  return {
    actionType: "profile_card_delete",
    profileAction: PROFILE_CARD_MUTATION_ACTIONS.DELETE,
    action: PROFILE_CARD_MUTATION_ACTIONS.DELETE,
  };
}

function resolveMonthlyCreditCostForBilling(pricing, body = {}) {
  const coinPrice = Math.max(0, Math.floor(Number(pricing?.coinPrice || pricing?.cost || 0)));
  const featureKey = String(pricing?.featureKey || body?.featureKey || "").trim();
  const actionType = resolveProfileCardActionType(body?.actionType || body?.profileAction || body?.action);
  if (featureKey === PROFILE_CARD_MANAGE_FEATURE_KEY && actionType === PROFILE_CARD_MUTATION_ACTIONS.DELETE) {
    return Math.max(0, Math.floor(Number(PROFILE_CARD_DELETE_COST_MONTHLY_STONES || 0)));
  }
  return calculateMembershipCreditCost(coinPrice);
}

async function assertProfileCardPassPolicyIfNeeded({ userId, profileId, pricing, body = {} }) {
  const featureKey = String(pricing?.featureKey || body?.featureKey || "").trim();
  if (featureKey !== PROFILE_CARD_MANAGE_FEATURE_KEY) return { ok: true, policy: null };
  const actionType = resolveProfileCardActionType(body?.actionType || body?.profileAction || body?.action);
  const policy = await getProfileCardMutationPolicy(userId, profileId, actionType);
  if (policy?.allowed === true && policy?.requiresPayment !== true) return { ok: true, policy };
  const reason = String(policy?.reason || "").trim() || "PROFILE_LIMIT_EXCEEDED";
  return {
    ok: false,
    policy,
    reason: reason === "PRICE_EXCEEDS_PASS_LIMIT" ? "price_exceeds_pass_limit" : "profile_limit_exceeded",
  };
}

async function resolvePaidContentAccess(env, {
  userId,
  profileId,
  pricing,
  requestId = "",
  requestedPaymentMode = "",
  allowPassAutoUnlock = true,
  subscriptionPass = null,
  body = {},
} = {}) {
  const priceCoin = Math.max(0, Math.floor(Number(pricing?.coinPrice || pricing?.cost || 0)));
  const featureKey = String(pricing?.featureKey || "").trim();
  const cacheKey = buildPaidAccessDecisionCacheKey({
    userId,
    profileId,
    featureKey,
    coinPrice: priceCoin,
    requestedPaymentMode,
    allowPassAutoUnlock,
  });
  const cachedAccessDecision = readPaidAccessDecisionFromCache(cacheKey);
  if (cachedAccessDecision) return cachedAccessDecision;

  if (!userId) {
    return buildPaidContentAccessDecision({
      reason: "not_logged_in",
      priceCoin,
    });
  }

  if (resolveSajuProfileUnlockContentKey(featureKey) && !profileId) {
    return buildPaidContentAccessDecision({
      reason: "invalid_profile",
      priceCoin,
    });
  }

  try {
    const [existingUnlock, userPermanentUnlock, existingPass] = await withDbAccessTimeout(Promise.all([
      findActiveSajuProfileUnlock(env, { userId, profileId, featureKey }),
      hasUserScopedPermanentUnlock(env, { userId, featureKey }),
      Promise.resolve(subscriptionPass || getActiveMembershipPassForUser(env, userId)),
    ]), PAID_ACCESS_DECISION_DB_TIMEOUT_MS, "UNLOCK_ACCESS_DECISION_TIMEOUT");
    if (existingUnlock || userPermanentUnlock) {
      return writePaidAccessDecisionToCache(cacheKey, buildPaidContentAccessDecision({
        accessGranted: true,
        reason: "already_unlocked",
        unlockId: String(existingUnlock?._id || `user:${featureKey}`),
        priceCoin,
      }), priceCoin);
    }

    const activePass = existingPass || {
      isActive: false,
      tier: "free",
      passTier: null,
      freeLimit: 0,
      profileSubscription: null,
      entitlement: {},
    };
    const paymentOptions = buildPassPaymentDecision(
      activePass.entitlement,
      pricing,
      activePass.profileSubscription,
    );
    const normalizedPaymentMode = String(requestedPaymentMode || "").trim().toLowerCase();

    if (normalizedPaymentMode.includes("monthly") && !paymentOptions.canUseByMonthly) {
      return writePaidAccessDecisionToCache(cacheKey, buildPaidContentAccessDecision({
        reason: "monthly_balance_required",
        priceCoin,
        paymentOptions,
      }), priceCoin);
    }

    if (paymentOptions.canUseByPass && allowPassAutoUnlock) {
      const profilePolicy = await assertProfileCardPassPolicyIfNeeded({ userId, profileId, pricing, body });
      if (!profilePolicy.ok) {
        return writePaidAccessDecisionToCache(cacheKey, buildPaidContentAccessDecision({
          reason: profilePolicy.reason,
          priceCoin,
          paymentOptions: {
            ...paymentOptions,
            profilePolicy: profilePolicy.policy || null,
          },
        }), priceCoin);
      }
      const unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
        userId,
        profileId,
        featureKey,
        contentKey: body?.contentKey,
        source: CONTENT_ENTITLEMENT_SOURCES.PASS,
        passId: `membership:${activePass.tier || "pass"}:${requestId || Date.now().toString(36)}`,
        coinAmount: 0,
      });
      return writePaidAccessDecisionToCache(cacheKey, buildPaidContentAccessDecision({
        accessGranted: true,
        reason: "pass_covered",
        unlockId: unlockEntitlement?._id,
        priceCoin,
        paymentOptions,
        accessGateResult: buildLicensePassAccessGateResult({
          pricing,
          paymentOptions,
          membershipPass: activePass,
        }),
      }), priceCoin);
    }

    return writePaidAccessDecisionToCache(cacheKey, buildPaidContentAccessDecision({
      reason: "payment_required",
      shouldOpenPaymentSelector: true,
      priceCoin,
      paymentOptions,
    }), priceCoin);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return writePaidAccessDecisionToCache(cacheKey, buildPaidContentAccessDecision({
        reason: "payment_required",
        shouldOpenPaymentSelector: true,
        priceCoin,
        paymentOptions: buildPassPaymentDecisionFallback(pricing, { membershipCreditBalance: 0 }),
      }), priceCoin);
    }

    if (String(error?.code || "") === "MISSING_PROFILE_ID") {
      return buildPaidContentAccessDecision({
        reason: "invalid_profile",
        priceCoin,
      });
    }

    return buildPaidContentAccessDecision({
      reason: "error",
      priceCoin,
    });
  }
}

async function getActiveMembershipPassForUser(env, authUserId) {
  await connectDb(env);
  const user = await User.findById(authUserId)
    .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
    .lean();
  const entitlement = normalizeHoneyPassEntitlement(user || {});
  return {
    isActive: entitlement.isActive,
    tier: entitlement.isActive ? entitlement.tier : "free",
    passTier: entitlement.isActive ? entitlement.passTier : null,
    freeLimit: entitlement.isActive ? Number(entitlement.maxCoveredCoin || 0) : 0,
    profileSubscription: user?.profileSubscription || null,
    entitlement,
  };
}

function buildMembershipPassFromStatusSnapshot(snapshot = {}) {
  const rawStatus = String(
    snapshot?.status
      || snapshot?.subscriptionStatus
      || snapshot?.membershipStatus
      || snapshot?.subscription?.status
      || "",
  ).trim().toLowerCase();
  const inactiveStatus = rawStatus === "expired"
    || rawStatus === "canceled"
    || rawStatus === "cancelled"
    || rawStatus === "inactive"
    || rawStatus === "failed"
    || rawStatus === "paused"
    || rawStatus === "refunded";
  const activeStatus = rawStatus === "active"
    || rawStatus === "paid"
    || rawStatus === "current"
    || rawStatus === "subscribed"
    || rawStatus === "trialing"
    || rawStatus === "success"
    || rawStatus === "registered"
    || rawStatus === "registering"
    || rawStatus === "pending"
    || rawStatus === "processing"
    || rawStatus === "enrolled"
    || rawStatus === "enabled"
    || rawStatus === "valid"
    || rawStatus === "ok"
    || rawStatus === "complete"
    || rawStatus === "completed"
    || rawStatus === "confirmed"
    || rawStatus === "approved"
    || rawStatus === "\uB4F1\uB85D\uC911"
    || rawStatus === "\uC774\uC6A9\uC911"
    || rawStatus === "\uC720\uD6A8"
    || rawStatus === "\uC644\uB8CC";
  const isSnapshotActive = !inactiveStatus && (
    snapshot?.isActive === true
      || snapshot?.isSubscribed === true
      || snapshot?.active === true
      || snapshot?.enabled === true
      || snapshot?.valid === true
      || snapshot?.registered === true
      || activeStatus
  );
  if (!isSnapshotActive) return null;
  const tier = String(snapshot?.tier || snapshot?.plan || snapshot?.passTier || "free").trim().toLowerCase();
  if (!tier || tier === "free") return null;
  const profileSubscription = {
    tier,
    passTier: snapshot?.passTier || tier,
    isActive: true,
    isSubscribed: true,
    status: rawStatus || "active",
    expiresAt: snapshot?.expiresAt || snapshot?.subscription?.expiresAt || null,
    freeLimit: Number(snapshot?.freeLimit || 0),
    source: snapshot?.source || "subscription_status_snapshot",
  };
  const entitlement = normalizeHoneyPassEntitlement({ profileSubscription });
  if (!entitlement.isActive) return null;
  return {
    isActive: true,
    tier: entitlement.tier,
    passTier: entitlement.passTier,
    freeLimit: Number(entitlement.maxCoveredCoin || 0),
    profileSubscription,
    entitlement,
  };
}

async function getMembershipPassForBillingRequest(request, env, authUserId) {
  const directPass = await getActiveMembershipPassForUser(env, authUserId);
  if (directPass?.isActive === true) return directPass;
  const snapshot = await readSubscriptionStatusSnapshot(request, env);
  return buildMembershipPassFromStatusSnapshot(snapshot) || directPass;
}

async function seedMembershipCreditForExistingPassIfNeeded(authUserId) {
  const user = await User.findById(authUserId)
    .select("points profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
    .lean();
  const sub = user?.profileSubscription || {};
  const legacyPoints = Number(user?.points || 0);
  if (!user?._id) return null;

  const legacyCredit = !sub?.legacyCoinCreditSeeded && legacyPoints > 0
    ? Math.floor(legacyPoints * MEMBERSHIP_CREDIT_PER_COIN)
    : 0;
  let updatedUser = null;

  if (legacyCredit > 0) {
    updatedUser = await User.findOneAndUpdate(
      {
        _id: authUserId,
        "profileSubscription.legacyCoinCreditSeeded": { $ne: true },
      },
      {
        $inc: {
          "profileSubscription.membershipCreditBalance": legacyCredit,
          "profileSubscription.membershipCreditGranted": legacyCredit,
        },
        $set: {
          "profileSubscription.legacyCoinCreditSeeded": true,
          "profileSubscription.legacyCoinCreditSeededAt": new Date(),
          "profileSubscription.legacyCoinCreditSeededPoints": Math.floor(legacyPoints),
        },
      },
      {
        returnDocument: "after",
        projection: { points: 1, profileSubscription: 1 },
      },
    ).lean();
  }

  return updatedUser;
}

async function consumeMembershipCreditIfAvailable(env, authUserId, pricing, requestId, body = {}) {
  const coinPrice = Math.max(0, Math.floor(Number(pricing?.coinPrice || pricing?.cost || 0)));
  const requiredCredit = resolveMonthlyCreditCostForBilling(pricing, body);
  if (!Number.isInteger(requiredCredit) || requiredCredit <= 0) return null;
  const profileMutationMetadata = buildProfileCardMutationMetadata(body);

  await connectDb(env);
  await seedMembershipCreditForExistingPassIfNeeded(authUserId);

  const featureKey = String(pricing?.featureKey || body?.featureKey || "").trim();
  const normalizedRequestId = String(requestId || "").trim();
  const purchaseId = String(
    body?.purchaseId
    || body?.paymentId
    || body?.orderId
    || body?.idempotencyKey
    || normalizedRequestId
    || "",
  ).trim().slice(0, 160);
  if (purchaseId) {
    const existingLedger = await MonthlyCreditLedger.findOne({
      userId: authUserId,
      type: "MONTHLY_CREDIT_SPEND",
      sourceId: purchaseId,
      "metadata.refundedForUnlockFailure": { $ne: true },
    }).select("_id amount afterBalance metadata").lean();
    if (existingLedger) {
      const currentUser = await User.findById(authUserId)
        .select("points profileSubscription")
        .lean();
      const currentCredit = Number(currentUser?.profileSubscription?.membershipCreditBalance ?? existingLedger?.afterBalance ?? 0);
      return {
        transactionId: String(existingLedger?.metadata?.pointHistoryId || existingLedger?._id || ""),
        ledgerId: String(existingLedger?._id || ""),
        requestId: normalizedRequestId,
        purchaseId,
        transactionType: "membership_credit",
        accessType: "membership_credit",
        accessMethod: "MONTHLY",
        paymentMethod: "MONTHLY",
        featureKey,
        coinPrice,
        membershipCreditCost: Math.max(0, Math.floor(Number(existingLedger?.amount || requiredCredit))),
        requiredMonthlyCredits: Math.max(0, Math.floor(Number(existingLedger?.amount || requiredCredit))),
        remainingMembershipCredit: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) : 0,
        monthlyCredits: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) : 0,
        monthlyCreditsAsCoins: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) / MEMBERSHIP_CREDIT_PER_COIN : 0,
        idempotent: true,
        user: {
          id: String(authUserId || ""),
          points: Number(currentUser?.points || 0),
          profileSubscription: currentUser?.profileSubscription || null,
        },
      };
    }
  }
  if (purchaseId && featureKey) {
    const existing = await PointHistory.findOne({
      userId: authUserId,
      featureKey,
      "metadata.accessType": "membership_credit",
      "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
      $or: [
        { "metadata.purchaseId": purchaseId },
        { "metadata.idempotencyKey": purchaseId },
        { "metadata.orderId": purchaseId },
        ...(normalizedRequestId ? [{ "metadata.requestId": normalizedRequestId }] : []),
      ],
    }).select("_id metadata").lean();
    if (existing) {
      const currentUser = await User.findById(authUserId)
        .select("points profileSubscription")
        .lean();
      const currentCredit = Number(currentUser?.profileSubscription?.membershipCreditBalance ?? existing?.metadata?.remainingMembershipCredit ?? 0);
      return {
        transactionId: String(existing?._id || ""),
        requestId: normalizedRequestId,
        purchaseId,
        transactionType: "membership_credit",
        accessType: "membership_credit",
        accessMethod: "MONTHLY",
        paymentMethod: "MONTHLY",
        featureKey,
        coinPrice,
        membershipCreditCost: requiredCredit,
        requiredMonthlyCredits: requiredCredit,
        remainingMembershipCredit: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) : 0,
        monthlyCredits: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) : 0,
        monthlyCreditsAsCoins: Number.isFinite(currentCredit) ? Math.max(0, Math.floor(currentCredit)) / MEMBERSHIP_CREDIT_PER_COIN : 0,
        idempotent: true,
        user: {
          id: String(authUserId || ""),
          points: Number(currentUser?.points || existing?.metadata?.balanceAfter || 0),
          profileSubscription: currentUser?.profileSubscription || null,
        },
      };
    }
  }

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: authUserId,
      "profileSubscription.membershipCreditBalance": { $gte: requiredCredit },
      ...(purchaseId ? { recentConsumeRequestIds: { $ne: purchaseId } } : {}),
    },
    {
      $inc: {
        "profileSubscription.membershipCreditBalance": -requiredCredit,
        "profileSubscription.membershipCreditUsed": requiredCredit,
      },
      ...(purchaseId ? { $addToSet: { recentConsumeRequestIds: purchaseId } } : {}),
    },
    {
      returnDocument: "after",
      projection: { points: 1, profileSubscription: 1 },
    },
  ).lean();

  if (!updatedUser) return null;

  const monthlyCredits = Math.max(0, Math.floor(Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0)));
  const reportId = String(body?.reportId || body?.accessGrant?.reportId || "").trim();
  const sessionId = String(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || "").trim();
  const profileId = cleanProfileId(body?.profileId || body?.selectedProfileId);
  const history = await PointHistory.create({
    userId: authUserId,
    kind: "deduct",
    delta: -Math.max(0, coinPrice),
    balanceAfter: Number(updatedUser?.points || 0),
    reason: String(pricing?.reason || "membership_credit_access"),
    featureKey,
    metadata: {
      accessType: "membership_credit",
      accessMethod: "MONTHLY",
      paymentMethod: "MONTHLY",
      ...profileMutationMetadata,
      requestId: normalizedRequestId,
      purchaseId,
      idempotencyKey: String(body?.idempotencyKey || purchaseId || "").trim().slice(0, 160),
      orderId: String(body?.orderId || purchaseId || "").trim().slice(0, 160),
      reportId,
      sessionId,
      reportSessionId: sessionId,
      profileId,
      selectedProfileId: profileId,
      featureKey,
      coinPrice,
      membershipCreditCost: requiredCredit,
      requiredMonthlyCredits: requiredCredit,
      remainingMembershipCredit: monthlyCredits,
      monthlyCredits,
      monthlyCreditsAsCoins: monthlyCredits / MEMBERSHIP_CREDIT_PER_COIN,
      balanceAfter: Number(updatedUser?.points || 0),
    },
  }).catch(async (error) => {
    await User.findByIdAndUpdate(authUserId, {
      $inc: {
        "profileSubscription.membershipCreditBalance": requiredCredit,
        "profileSubscription.membershipCreditUsed": -requiredCredit,
      },
      ...(purchaseId ? { $pull: { recentConsumeRequestIds: purchaseId } } : {}),
    }).catch(() => {});
    throw error;
  });

  const ledger = await MonthlyCreditLedger.create({
    userId: authUserId,
    type: "MONTHLY_CREDIT_SPEND",
    amount: requiredCredit,
    beforeBalance: monthlyCredits + requiredCredit,
    afterBalance: monthlyCredits,
    reason: String(pricing?.reason || "membership_credit_access"),
    sourceId: purchaseId || String(history?._id || ""),
    serviceKey: featureKey,
    profileId,
    metadata: {
      pointHistoryId: String(history?._id || ""),
      ...profileMutationMetadata,
      requestId: normalizedRequestId,
      purchaseId,
      idempotencyKey: String(body?.idempotencyKey || purchaseId || "").trim().slice(0, 160),
      orderId: String(body?.orderId || purchaseId || "").trim().slice(0, 160),
      coinPrice,
      requiredMonthlyCredits: requiredCredit,
      accessType: "membership_credit",
      accessMethod: "MONTHLY",
    },
  }).catch(async (error) => {
    await User.findByIdAndUpdate(authUserId, {
      $inc: {
        "profileSubscription.membershipCreditBalance": requiredCredit,
        "profileSubscription.membershipCreditUsed": -requiredCredit,
      },
      ...(purchaseId ? { $pull: { recentConsumeRequestIds: purchaseId } } : {}),
    }).catch(() => {});
    await PointHistory.updateOne(
      { _id: history?._id, userId: authUserId },
      {
        $set: {
          "metadata.monthlyCreditLedgerFailed": true,
          "metadata.monthlyCreditLedgerFailedAt": new Date(),
          "metadata.monthlyCreditLedgerFailureMessage": String(error?.message || "").slice(0, 500),
          "metadata.monthlyCreditRefundedForLedgerFailure": true,
        },
      },
    ).catch(() => {});
    throw error;
  });

  return {
    transactionId: String(history?._id || ""),
    ledgerId: String(ledger?._id || ""),
    requestId: String(requestId || ""),
    purchaseId,
    transactionType: "membership_credit",
    accessType: "membership_credit",
    accessMethod: "MONTHLY",
    paymentMethod: "MONTHLY",
    ...profileMutationMetadata,
    featureKey,
    coinPrice,
    membershipCreditCost: requiredCredit,
    requiredMonthlyCredits: requiredCredit,
    remainingMembershipCredit: monthlyCredits,
    monthlyCredits,
    monthlyCreditsAsCoins: monthlyCredits / MEMBERSHIP_CREDIT_PER_COIN,
    user: {
      id: String(authUserId || ""),
      points: Number(updatedUser?.points || 0),
      profileSubscription: updatedUser?.profileSubscription || null,
    },
  };
}

async function recordPassAccessIfNeeded(env, authUserId, pricing, requestId, body = {}, entitlement = {}) {
  const featureKey = String(pricing?.featureKey || body?.featureKey || "").trim();
  const normalizedRequestId = String(requestId || "").trim();
  if (!authUserId || !featureKey || !normalizedRequestId) return null;

  await connectDb(env);
  const existing = await PointHistory.findOne({
    userId: authUserId,
    kind: "deduct",
    featureKey,
    "metadata.requestId": normalizedRequestId,
    "metadata.accessMethod": "PASS",
  }).select("_id createdAt delta featureKey reason metadata").lean();
  if (existing) return existing;

  const user = await User.findById(authUserId).select("points").lean();
  const reportId = String(body?.reportId || body?.accessGrant?.reportId || "").trim();
  const sessionId = String(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || "").trim();
  const profileId = cleanProfileId(body?.profileId || body?.selectedProfileId);
  const coinCost = Math.max(0, Math.floor(Number(pricing?.coinPrice || pricing?.cost || 0)));

  return PointHistory.create({
    userId: authUserId,
    kind: "deduct",
    delta: 0,
    balanceAfter: Number(user?.points || 0),
    reason: String(pricing?.reason || "pass_access"),
    featureKey,
    metadata: {
      accessType: "membership_pass",
      accessMethod: "PASS",
      paymentMethod: "PASS",
      requestId: normalizedRequestId,
      purchaseId: normalizedRequestId,
      reportId,
      sessionId,
      reportSessionId: sessionId,
      profileId,
      selectedProfileId: profileId,
      featureKey,
      coinCost,
      coinPrice: coinCost,
      passTier: entitlement?.passTier || null,
      passLimit: Number(entitlement?.maxCoveredCoin || 0),
    },
  });
}

function buildBillingErrorDetails(stage, error, extras = {}) {
  return {
    stage: String(stage || "billing-route"),
    name: error?.name || "Error",
    code: error?.code || "BILLING_ROUTE_ERROR",
    message: String(error?.message || "Unknown error"),
    ...(extras && typeof extras === "object" ? extras : {}),
  };
}

function logBillingRouteError(stage, error, request, extras = {}) {
  const payload = {
    route: "billing",
    method: request?.method || "",
    path: request ? new URL(request.url).pathname : "",
    ...buildBillingErrorDetails(stage, error, extras),
  };

  try {
    console.error("[worker-billing-route-error]", JSON.stringify(payload));
  } catch (e) {
    console.error("[worker-billing-route-error]", payload);
  }
}

function toMessage(payload, fallbackMessage) {
  if (!payload || typeof payload !== "object") return fallbackMessage;
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  if (payload.error && typeof payload.error.message === "string" && payload.error.message.trim()) {
    return payload.error.message;
  }
  return fallbackMessage;
}

function toCode(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.code === "string") return payload.code;
  if (payload.error && typeof payload.error.code === "string") return payload.error.code;
  return "";
}

function success(data, message = "요청이 성공했습니다.", init = {}) {
  const responseStatus = data && typeof data.status === "string" && data.status.trim() ? data.status.trim() : undefined;
  return json({ ok: true, ...(responseStatus ? { status: responseStatus } : {}), data, message }, init);
}

function normalizeBillingErrorCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return "SERVER_ERROR";
  if (normalized === "LOGIN_REQUIRED" || normalized === "UNAUTHORIZED") return "AUTH_REQUIRED";
  if (normalized === "INSUFFICIENT_BALANCE" || normalized === "INSUFFICIENT_POINTS") return "INSUFFICIENT_COINS";
  if (normalized === "INVALID_CONFIRM_PAYLOAD" || normalized === "VERIFY_FAILED" || normalized === "PAYMENT_VERIFY_FAILED") return "PAYMENT_VERIFICATION_FAILED";
  if (normalized === "INVALID_PAYMENT_MODE" || normalized === "INVALID_PAYMENT_METHOD") return "UNKNOWN_PAYMENT_METHOD";
  return normalized;
}

function resolveSuccessAccessStatus(data = {}, consume = {}, accessGrant = {}) {
  const accessType = String(data.accessType || consume.accessType || accessGrant.accessType || "").trim().toLowerCase();
  const transactionType = String(data.transactionType || consume.transactionType || accessGrant.transactionType || "").trim().toLowerCase();
  const accessMethod = String(data.accessMethod || consume.accessMethod || accessGrant.accessMethod || "").trim().toLowerCase();
  if (data.alreadyUnlocked === true || accessType === "already_unlocked" || transactionType === "unlock_entitlement") return "already_unlocked";
  if (data.freeBySubscription === true || accessType === "membership_pass" || transactionType === "membership_pass" || accessMethod === "pass") return "pass_applied";
  return "success";
}

function resolvePaymentRequiredReason(code, extras = {}) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  const debug = extras?.membershipPassDebug && typeof extras.membershipPassDebug === "object" ? extras.membershipPassDebug : {};
  const requestedCoinPrice = Number(debug.requestedCoinPrice || extras?.pricing?.coinPrice || extras?.pricing?.cost || 0);
  const passLimit = Number(debug.passLimit || debug.freeLimit || extras?.paymentOptions?.passLimit || 0);
  const statusText = String(debug.status || "").trim().toLowerCase();
  if (normalizedCode === "PROFILE_LIMIT_EXCEEDED" || statusText.includes("profile_limit")) return "PROFILE_LIMIT_EXCEEDED";
  if (normalizedCode === "AUTH_REQUIRED") return "AUTH_REQUIRED";
  if (normalizedCode === "MEMBERSHIP_PASS_NOT_COVERED" || normalizedCode === "PAYMENT_REQUIRED") {
    if (statusText === "expired" || statusText === "canceled" || statusText === "cancelled" || statusText === "inactive") return "PASS_EXPIRED";
    if (Number.isFinite(requestedCoinPrice) && Number.isFinite(passLimit) && passLimit > 0 && requestedCoinPrice > passLimit) return "PRICE_EXCEEDS_PASS_LIMIT";
    if (debug.hasActivePass === false || !passLimit) return "NO_ACTIVE_PASS";
    return "PRICE_EXCEEDS_PASS_LIMIT";
  }
  if (normalizedCode === "PRICE_EXCEEDS_PASS_LIMIT") return "PRICE_EXCEEDS_PASS_LIMIT";
  return normalizedCode || "PAYMENT_REQUIRED";
}

function cleanProfileId(value) {
  return String(value || "").trim().slice(0, 80).replace(/\s+/g, "_");
}

async function resolveBillingProfileId(authUserId, body = {}, env = {}) {
  const explicit = cleanProfileId(body?.profileId || body?.selectedProfileId || body?.profile?.profileId || body?.profile?.id);
  if (explicit || !authUserId) return explicit;
  await connectDb(env);
  const user = await User.findById(authUserId).select("destinyProfilesCurrentId").lean();
  return cleanProfileId(user?.destinyProfilesCurrentId);
}

function isProfileScopedUnlockKey(featureKey) {
  const key = String(featureKey || "").trim();
  if (!key || !isUnlockPaidFeatureKey(key)) return false;
  return Boolean(resolveSajuProfileUnlockContentKey(key));
}

async function resolveProfileScopedUnlocks(authUserId, profileId) {
  if (!authUserId || !profileId) return { unlockedFeatures: [], unlockMap: {} };
  const keys = await PointHistory.distinct("featureKey", {
    userId: authUserId,
    kind: "deduct",
    featureKey: { $ne: "" },
    $or: [
      { "metadata.profileId": profileId },
      { "metadata.selectedProfileId": profileId },
    ],
  });
  const now = new Date();
  const entitlementDocs = await ContentEntitlement.find({
    userId: String(authUserId),
    profileId: String(profileId),
    serviceKey: { $in: PROFILE_UNLOCK_SERVICE_KEYS },
    scope: CONTENT_ENTITLEMENT_SCOPES.PROFILE,
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    $or: [
      { expiresAt: null },
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } },
    ],
  }).select("contentKey").lean();
  const entitlementKeys = entitlementDocs
    .map((doc) => {
      const contentKey = String(doc?.contentKey || "").trim();
      return PROFILE_UNLOCK_FEATURE_BY_CONTENT_KEY[contentKey]
        || (isProfileScopedUnlockKey(contentKey) ? contentKey : "");
    })
    .filter(Boolean);
  const unlockedFeatures = Array.from(new Set([
    ...keys.map((key) => String(key || "").trim()).filter(isProfileScopedUnlockKey),
    ...entitlementKeys,
  ]));
  const unlockMap = Object.create(null);
  for (const key of unlockedFeatures) unlockMap[key] = true;
  return { unlockedFeatures, unlockMap };
}

async function successWithPremiumAccess(env, authUserId, data, message = "요청이 성공했습니다.", init = {}) {
  const pricing = data?.pricing || {};
  const consume = data?.consume || {};
  const accessGrant = data?.accessGrant && typeof data.accessGrant === "object" ? data.accessGrant : {};
  const featureKey = String(pricing?.featureKey || consume?.featureKey || accessGrant?.featureKey || "").trim();
  const reason = String(pricing?.reason || "").trim();
  const profileId = cleanProfileId(accessGrant?.profileId || consume?.profileId || data?.profileId);
  const transactionId = String(
    consume?.transactionId
      || accessGrant?.evidenceId
      || accessGrant?.purchaseId
      || accessGrant?.requestId
      || "",
  ).trim();
  const tokenReportId = String(data?.reportId || accessGrant?.reportId || consume?.reportId || "").trim();
  const tokenSessionId = String(
    data?.sessionId
      || data?.reportSessionId
      || accessGrant?.sessionId
      || accessGrant?.reportSessionId
      || consume?.sessionId
      || consume?.reportSessionId
      || "",
  ).trim();
  const tokenRequestId = String(data?.requestId || accessGrant?.requestId || consume?.requestId || "").trim();
  const tokenPurchaseId = String(data?.purchaseId || accessGrant?.purchaseId || consume?.purchaseId || "").trim();
  const reportType = resolvePremiumAccessReportType(featureKey, reason);
  const premiumAccessToken = reportType
    ? await createPremiumAccessToken(env, {
      userId: String(authUserId || ""),
      reportType,
      featureKey,
      reason,
      transactionId,
      reportId: tokenReportId,
      sessionId: tokenSessionId,
      requestId: tokenRequestId,
      purchaseId: tokenPurchaseId,
      chargedCoins: Number(consume?.chargedCoins || 0),
      freeBySubscription: data?.freeBySubscription === true || consume?.accessType === "membership_pass",
    })
    : "";
  const responseHeaders = new Headers(init?.headers || {});
  if (premiumAccessToken) {
    responseHeaders.append("Set-Cookie", buildPremiumAccessCookie(premiumAccessToken, isProductionRuntime(env)));
  }
  let unlockedFeatures = Array.isArray(data?.unlockedFeatures) ? [...data.unlockedFeatures] : [];
  let unlockMap = data?.unlockMap && typeof data.unlockMap === "object" ? { ...data.unlockMap } : {};
  const isAdminTestAccess = data?.adminBypass === true || data?.adminTestMode === true || consume?.adminBypass === true || consume?.adminTestMode === true;
  const isPermanentUnlock = !isAdminTestAccess && isUnlockPaidFeatureKey(featureKey);
  const isUserScopedPermanentUnlock = isPermanentUnlock
    && !resolveSajuProfileUnlockContentKey(featureKey)
    && featureKey !== LOTTO_RITUAL_REPORT_FEATURE_KEY;
  if (authUserId && featureKey && isUserScopedPermanentUnlock) {
    await connectDb(env);
    const updatedUser = await User.findByIdAndUpdate(
      authUserId,
      { $addToSet: { unlockedFeatures: featureKey } },
      { returnDocument: "after", projection: { unlockedFeatures: 1 } },
    ).lean();
    unlockedFeatures = Array.isArray(updatedUser?.unlockedFeatures) ? updatedUser.unlockedFeatures : unlockedFeatures;
    unlockMap = { ...unlockMap, [featureKey]: true };
  }
  const accessStatus = resolveSuccessAccessStatus(data, consume, data?.accessGrant || {});
  const coinCharged = Number(consume?.chargedCoins || data?.charged || 0);
  const monthlyStoneCharged = String(consume?.accessType || "").toLowerCase() === "membership_credit"
    ? Number(consume?.membershipCreditCost || 0)
    : 0;
  const normalizedAccessType = String(consume?.accessType || data?.accessGrant?.accessType || "").toLowerCase();
  const normalizedTransactionType = String(consume?.transactionType || data?.accessGrant?.transactionType || "").toLowerCase();
  const membershipPassApplied = normalizedAccessType === "membership_pass" || normalizedTransactionType === "membership_pass";
  const accessGateResult = data?.accessGateResult
    || data?.accessDecision?.accessGateResult
    || (membershipPassApplied
      ? buildLicensePassAccessGateResult({
        pricing,
        paymentOptions: data?.paymentOptions || data,
        membershipPass: data?.membershipPass || {},
        accessDecision: data?.accessDecision || {},
      })
      : null);
  const hasResponseHeaders = Array.from(responseHeaders.keys()).length > 0;
  return success({
    ...data,
    status: accessStatus,
    contentId: String(data?.contentId || data?.accessGrant?.reportId || featureKey || "").trim(),
    serviceType: String(data?.serviceType || pricing?.categoryKey || featureKey || "").trim(),
    coinCharged,
    monthlyStoneCharged,
    featureKey,
    chargedCoins: Number(consume?.chargedCoins || 0),
    transactionId,
    freeBySubscription: data?.freeBySubscription === true || consume?.accessType === "membership_pass",
    premiumAccessToken: premiumAccessToken || data?.premiumAccessToken || null,
    profileId: profileId || undefined,
    unlockedFeatures,
    unlockMap,
    ...(accessGateResult ? { accessGateResult, licensePass: accessGateResult } : {}),
  }, message, hasResponseHeaders ? { ...init, headers: responseHeaders } : init);
}

function cleanText(value, max = 240) {
  return String(value || "").trim().slice(0, max);
}

function toIso(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

const REPORT_TYPE_FALLBACK = Object.freeze({
  lifeBook: { reportType: "life_book", displayName: "사주 인생의 책" },
  loveSecret: { reportType: "love_book", displayName: "사주 연애 비책" },
  sajuNewYear: { reportType: "new_year", displayName: "사주 신년운세" },
  ziweiPremium: { reportType: "ziwei_book", displayName: "자미두수" },
  sookyoPremium: { reportType: "sukyo_book", displayName: "숙요점" },
  westernAstrologyPremium: { reportType: "western_astro_book", displayName: "점성술" },
  vedicPremium: { reportType: "vedic_book", displayName: "베다점" },
  soulOriginKarma: { reportType: "soul_origin_book", displayName: "운명의 업" },
});

function toArchiveBase(doc) {
  const metadata = (doc && typeof doc.metadata === "object" && doc.metadata) ? doc.metadata : {};
  const archive = (metadata.archive && typeof metadata.archive === "object") ? metadata.archive : {};
  const fallback = REPORT_TYPE_FALLBACK[String(doc?.reportType || "")] || {
    reportType: cleanText(doc?.reportType || "premium_report", 80) || "premium_report",
    displayName: "프리미엄 리포트",
  };

  const reportId = cleanText(doc?.reportId || archive.reportId || metadata.reportId, 120);
  const createdAt = toIso(doc?.createdAt || archive.createdAt || doc?.updatedAt);
  const completedAt = toIso(doc?.completedAt || archive.completedAt || doc?.updatedAt || doc?.createdAt);
  const updatedAt = toIso(doc?.updatedAt || completedAt || createdAt);
  const pdfUrl = cleanText(archive.pdfUrl || archive?.pdfReady?.pdfUrl, 500);
  const chapters = Array.isArray(archive.chapters) ? archive.chapters : [];
  const canReopen = Boolean(pdfUrl || chapters.length > 0 || (archive.payload && typeof archive.payload === "object"));

  return {
    reportId,
    reportType: cleanText(archive.reportType || fallback.reportType, 80) || fallback.reportType,
    title: cleanText(archive.title || "", 240),
    displayName: cleanText(archive.displayName || fallback.displayName, 120) || fallback.displayName,
    mode: cleanText(archive.mode || "", 40),
    status: "completed",
    createdAt,
    completedAt,
    updatedAt,
    birthName: cleanText(archive.birthName || "", 120),
    targetName: cleanText(archive.targetName || "", 120),
    pdfUrl,
    pdfStorageKey: cleanText(archive.pdfStorageKey || "", 200),
    summary: cleanText(archive.summary || "", 1000),
    chapters,
    payload: archive.payload && typeof archive.payload === "object" ? archive.payload : null,
    paymentSessionId: cleanText(doc?.paymentSessionId || metadata.purchaseId || "", 160),
    coinAmount: Number(doc?.coinAmount || 0),
    canReopen,
    canDownload: Boolean(pdfUrl),
  };
}

function stripArchiveHtmlText(html) {
  const source = String(html || "");
  const withBreaks = source
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|h[1-6]|li|tr|table|main|header|footer)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return withBreaks
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => {
      const codePoint = parseInt(hex, 16);
      try { return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : " "; } catch (_) { return " "; }
    })
    .replace(/&#(\d+);/g, (_match, raw) => {
      const codePoint = parseInt(raw, 10);
      try { return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : " "; } catch (_) { return " "; }
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'");
}

function archivePlainText(value) {
  const source = String(value || "");
  const decoded = /<[^>]+>/.test(source) ? stripArchiveHtmlText(source) : source;
  return decoded
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function archiveTextUnits(value) {
  return Array.from(String(value || "")).reduce((sum, char) => {
    const codePoint = char.codePointAt(0) || 0;
    if (/\s/.test(char)) return sum + 0.35;
    if (codePoint <= 0x007f) return sum + 0.58;
    if (codePoint <= 0x024f) return sum + 0.72;
    return sum + 1;
  }, 0);
}

function wrapArchivePdfText(value, maxUnits = 52) {
  const plain = archivePlainText(value);
  if (!plain) return [];
  const lines = [];
  const paragraphs = plain.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  for (const paragraph of paragraphs) {
    let line = "";
    let lineUnits = 0;
    const tokens = paragraph.split(/(\s+)/).filter((token) => token.length > 0);
    for (const token of tokens) {
      const tokenUnits = archiveTextUnits(token);
      if (line && lineUnits + tokenUnits > maxUnits) {
        lines.push(line.trim());
        line = "";
        lineUnits = 0;
      }
      if (tokenUnits > maxUnits) {
        for (const char of Array.from(token)) {
          const charUnits = archiveTextUnits(char);
          if (line && lineUnits + charUnits > maxUnits) {
            lines.push(line.trim());
            line = "";
            lineUnits = 0;
          }
          line += char;
          lineUnits += charUnits;
        }
      } else {
        line += token;
        lineUnits += tokenUnits;
      }
    }
    if (line.trim()) lines.push(line.trim());
    lines.push("");
  }
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines;
}

function archivePdfHex(value) {
  let hex = "";
  for (const char of Array.from(String(value || ""))) {
    let codePoint = char.codePointAt(0) || 0x20;
    if (codePoint > 0xffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) codePoint = 0x25a1;
    if (codePoint < 0x20 && codePoint !== 0x09) codePoint = 0x20;
    hex += codePoint.toString(16).toUpperCase().padStart(4, "0");
  }
  return hex || "0020";
}

function archivePdfLineOp(text, x, y, size, color = "0.11 0.08 0.18") {
  return `${color} rg BT /F1 ${Number(size).toFixed(2)} Tf 1 0 0 1 ${Number(x).toFixed(2)} ${Number(y).toFixed(2)} Tm <${archivePdfHex(text)}> Tj ET\n`;
}

function pushArchivePdfBlock(blocks, label, value) {
  const text = archivePlainText(value);
  if (!text) return;
  if (label) blocks.push({ type: "heading", text: label });
  blocks.push({ type: "body", text });
}

function pushArchivePdfListBlock(blocks, label, values) {
  const items = (Array.isArray(values) ? values : [])
    .map((item) => archivePlainText(item))
    .filter(Boolean)
    .slice(0, 8);
  if (!items.length) return;
  if (label) blocks.push({ type: "heading", text: label });
  blocks.push({ type: "list", text: items.map((item) => `• ${item}`).join("\n") });
}

function pushArchivePdfTableBlock(blocks, section = {}) {
  const rows = Array.isArray(section?.tableRows) ? section.tableRows : [];
  if (!rows.length) return;
  const headers = Array.isArray(section?.tableHeaders) ? section.tableHeaders.map((header) => archivePlainText(header)).filter(Boolean) : [];
  const title = archivePlainText(section?.tableTitle || "관계 흐름 표");
  blocks.push({ type: "heading", text: title });
  if (headers.length) blocks.push({ type: "table", text: headers.join(" | ") });
  blocks.push({
    type: "table",
    text: rows
      .slice(0, 12)
      .map((row) => (Array.isArray(row) ? row : [row]).map((cell) => archivePlainText(cell)).filter(Boolean).join(" | "))
      .filter(Boolean)
      .join("\n"),
  });
}

function buildArchivePdfSections({ archive = {}, metadata = {}, reportId = "", htmlContent = "" } = {}) {
  const title = archivePlainText(archive?.title || archive?.displayName || metadata?.displayName || "Code Destiny Premium PDF");
  const reportType = archivePlainText(archive?.archiveReportType || archive?.reportType || metadata?.reportType || "");
  const displayName = archivePlainText(archive?.displayName || metadata?.displayName || title || "프리미엄 운명 리포트");
  const coverKicker = /vedic|jyotish/i.test(reportType)
    ? "VEDIC JYOTISH PREMIUM"
    : /love[_-]?book|love[_-]?secret/i.test(reportType)
    ? "PREMIUM LOVE READING"
    : /soul[_-]?origin|soulOriginKarma/i.test(reportType)
      ? "SOUL ORIGIN KARMA REPORT"
      : "CODE DESTINY PREMIUM REPORT";
  const generatedAt = toIso(archive?.completedAt || archive?.generatedAt || archive?.pdfReady?.generatedAt || metadata?.completedAt || metadata?.generatedAt || new Date());
  const chapters = Array.isArray(archive?.chapters) ? archive.chapters : [];
  const sections = chapters.map((chapter, index) => {
    const chapterTitle = archivePlainText(chapter?.title || chapter?.name || `Chapter ${index + 1}`);
    const blocks = [];
    pushArchivePdfBlock(blocks, "", chapter?.summary || chapter?.overview || chapter?.intro);
    pushArchivePdfListBlock(blocks, "핵심 요약", chapter?.summaryCards || chapter?.keyPoints);
    pushArchivePdfListBlock(blocks, "실행 방향", chapter?.actionItems || chapter?.actionGuide || chapter?.advice);
    pushArchivePdfListBlock(blocks, "확인 체크리스트", chapter?.checklist);
    if (Array.isArray(chapter?.categories)) {
      for (const category of chapter.categories) {
        pushArchivePdfBlock(blocks, category?.title || category?.name || "", category?.finalText || category?.text || category?.content || category?.summary);
      }
    }
    if (Array.isArray(chapter?.sections)) {
      for (const section of chapter.sections) {
        pushArchivePdfBlock(blocks, section?.title || section?.name || "", section?.finalText || section?.text || section?.content || section?.body);
        pushArchivePdfListBlock(blocks, "사주 근거", section?.sajuEvidence);
        pushArchivePdfListBlock(blocks, "핵심 포인트", section?.keyPoints);
        pushArchivePdfListBlock(blocks, "실천 조언", section?.actionGuide || section?.actionItems || section?.advice);
        pushArchivePdfListBlock(blocks, "주의할 흐름", section?.caution);
        pushArchivePdfListBlock(blocks, "체크리스트", section?.checklist);
        pushArchivePdfTableBlock(blocks, section);
      }
    }
    pushArchivePdfBlock(blocks, "실전 조언", chapter?.practicalAdvice);
    pushArchivePdfBlock(blocks, "주의할 흐름", chapter?.cautionFlow);
    pushArchivePdfBlock(blocks, "전환의 문장", chapter?.transitionLine);
    pushArchivePdfBlock(blocks, "", chapter?.finalText || chapter?.text || chapter?.content || chapter?.body);
    return { title: chapterTitle, blocks };
  }).filter((section) => section.title || section.blocks.length);
  if (!sections.length) {
    const fallbackLines = archivePlainText(htmlContent).split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const blocks = fallbackLines.slice(0, 160).map((line) => ({ type: "body", text: line }));
    if (blocks.length) sections.push({ title: title || "Premium Report", blocks });
  }
  return { title, displayName, coverKicker, generatedAt, reportId: cleanText(reportId, 120), sections };
}

function buildNativeArchivePdfBytes(input = {}) {
  const encoder = new TextEncoder();
  const model = buildArchivePdfSections(input);
  const width = 595.28;
  const height = 841.89;
  const marginX = 52;
  const pages = [];
  const title = model.title || "Code Destiny Premium PDF";
  const generatedDate = model.generatedAt ? model.generatedAt.slice(0, 10) : "";

  function pageBase(sectionTitle) {
    let ops = "";
    ops += "0.985 0.978 1 rg 0 0 595.28 841.89 re f\n";
    ops += "0.155 0.09 0.29 rg 0 801.89 595.28 40 re f\n";
    ops += archivePdfLineOp("CODE DESTINY", marginX, 818, 9, "0.88 0.82 1");
    ops += archivePdfLineOp(sectionTitle || title, marginX, 785, 13, "0.20 0.11 0.34");
    ops += "0.82 0.78 0.90 RG 0.8 w 52 769 m 543 769 l S\n";
    return ops;
  }

  function finalizePage(ops, pageNo) {
    let next = ops;
    next += "0.82 0.78 0.90 RG 0.6 w 52 42 m 543 42 l S\n";
    next += archivePdfLineOp(`${pageNo}`, 526, 24, 8, "0.46 0.40 0.55");
    return next;
  }

  function addCoverPage() {
    let ops = "";
    ops += "0.105 0.07 0.19 rg 0 0 595.28 841.89 re f\n";
    ops += "0.35 0.18 0.67 rg 0 0 595.28 210 re f\n";
    ops += archivePdfLineOp(model.coverKicker || "CODE DESTINY PREMIUM REPORT", marginX, 708, 11, "0.82 0.72 1");
    const coverTitleLines = wrapArchivePdfText(title, 22).slice(0, 4);
    coverTitleLines.forEach((line, index) => {
      ops += archivePdfLineOp(line, marginX, 650 - (index * 28), 24, "0.98 0.95 1");
    });
    ops += archivePdfLineOp(model.displayName || "프리미엄 운명 리포트", marginX, 548, 14, "0.94 0.86 1");
    if (generatedDate) ops += archivePdfLineOp(`생성일 ${generatedDate}`, marginX, 514, 10, "0.83 0.77 0.92");
    if (model.reportId) ops += archivePdfLineOp(`고유번호 ${model.reportId}`, marginX, 492, 8, "0.72 0.66 0.84");
    pages.push(ops);
  }

  function addTextSection(section, sectionIndex) {
    let ops = pageBase(section.title);
    let y = 742;
    const pageTitle = section.title || `${sectionIndex + 1}`;
    function commitPage() {
      pages.push(ops);
      ops = pageBase(pageTitle);
      y = 742;
    }
    function ensureLine(needed = 16) {
      if (y < 70 + needed) commitPage();
    }
    for (const line of wrapArchivePdfText(`${String(sectionIndex + 1).padStart(2, "0")}  ${pageTitle}`, 38)) {
      ensureLine(24);
      ops += archivePdfLineOp(line, marginX, y, 17, "0.18 0.09 0.31");
      y -= 27;
    }
    y -= 5;
    for (const block of section.blocks || []) {
      const blockType = archivePlainText(block?.type || "body");
      const isHeading = blockType === "heading";
      const isList = blockType === "list";
      const isTable = blockType === "table";
      const size = isHeading ? 11.2 : isTable ? 8.8 : isList ? 9.2 : 9.8;
      const leading = isHeading ? 20 : isTable ? 13.2 : isList ? 14.2 : 15.2;
      const maxUnits = isHeading ? 44 : isTable ? 64 : isList ? 56 : 58;
      const color = isHeading ? "0.32 0.14 0.55" : isTable ? "0.30 0.23 0.38" : isList ? "0.22 0.12 0.30" : "0.13 0.10 0.18";
      const lines = wrapArchivePdfText(block?.text || "", maxUnits);
      if (!lines.length) continue;
      if (isHeading) y -= 4;
      for (const line of lines) {
        if (!line) {
          y -= 7;
          continue;
        }
        ensureLine(leading);
        ops += archivePdfLineOp(line, marginX, y, size, color);
        y -= leading;
      }
      y -= isHeading ? 2 : 7;
    }
    pages.push(ops);
  }

  addCoverPage();
  if (model.sections.length > 1) {
    let ops = pageBase("목차");
    let y = 742;
    model.sections.forEach((section, index) => {
      if (y < 76) {
        pages.push(ops);
        ops = pageBase("목차");
        y = 742;
      }
      ops += archivePdfLineOp(`${String(index + 1).padStart(2, "0")}  ${section.title}`, marginX, y, 11, "0.16 0.10 0.26");
      y -= 20;
    });
    pages.push(ops);
  }
  model.sections.forEach(addTextSection);
  if (!pages.length) pages.push(pageBase(title));

  const finalizedPages = pages.map((ops, index) => finalizePage(ops, index + 1));
  const objects = [null];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");
  objects.push("<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HYGoThic-Medium /CIDSystemInfo << /Registry (Adobe) /Ordering (Korea1) /Supplement 2 >> >>");
  objects.push("<< /Type /Font /Subtype /Type0 /BaseFont /HYGoThic-Medium /Encoding /UniKS-UCS2-H /DescendantFonts [3 0 R] >>");
  const pageIds = [];
  for (const pageOps of finalizedPages) {
    const contentId = objects.length;
    objects.push(`<< /Length ${encoder.encode(pageOps).length} >>\nstream\n${pageOps}endstream`);
    const pageId = objects.length;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let pdf = "%PDF-1.7\n%\u00E2\u00E3\u00CF\u00D3\n";
  const offsets = [];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = encoder.encode(pdf).length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return encoder.encode(pdf);
}

async function requireArchiveAuth(request, env) {
  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth?.userId) {
    return {
      ok: false,
      response: failure(401, "AUTH_REQUIRED", "로그인이 필요합니다."),
      auth: null,
    };
  }
  return { ok: true, auth, response: null };
}

async function handlePdfArchiveList(request, env) {
  const authCheck = await requireArchiveAuth(request, env);
  if (!authCheck.ok) return authCheck.response;

  await connectDb(env);
  const docs = await ServiceExecutionTransaction.find({
    userId: authCheck.auth.userId,
    status: "success",
    premiumStatus: "completed",
    reportId: { $exists: true, $ne: "" },
  })
    .sort({ completedAt: -1, updatedAt: -1, createdAt: -1 })
    .limit(120)
    .lean();

  const items = docs
    .map((doc) => toArchiveBase(doc))
    .filter((item) => item.reportId)
    .sort((a, b) => String(b.completedAt || b.updatedAt || "").localeCompare(String(a.completedAt || a.updatedAt || "")));

  return json({ ok: true, items });
}

async function handlePdfArchiveDetail(request, env, reportIdRaw) {
  const authCheck = await requireArchiveAuth(request, env);
  if (!authCheck.ok) return authCheck.response;

  const reportId = cleanText(reportIdRaw, 120);
  if (!reportId) {
    return failure(400, "MISSING_REPORT_ID", "reportId가 필요합니다.");
  }

  await connectDb(env);

  const foundAny = await ServiceExecutionTransaction.findOne({ reportId }).lean();
  if (foundAny && String(foundAny.userId || "") !== String(authCheck.auth.userId || "")) {
    return failure(403, "FORBIDDEN", "이 리포트를 열람할 권한이 없습니다.");
  }

  const doc = await ServiceExecutionTransaction.findOne({
    userId: authCheck.auth.userId,
    reportId,
    status: "success",
    premiumStatus: "completed",
  })
    .sort({ completedAt: -1, updatedAt: -1 })
    .lean();

  if (!doc) {
    return failure(404, "REPORT_NOT_FOUND", "저장된 PDF 결과를 찾을 수 없습니다.");
  }

  const format = cleanText(new URL(request.url).searchParams.get("format"), 40).toLowerCase();
  const metadata = (doc && typeof doc.metadata === "object" && doc.metadata) ? doc.metadata : {};
  const archive = (metadata.archive && typeof metadata.archive === "object") ? metadata.archive : {};
  const htmlContent = String(
    archive?.pdfReady?.html
    || archive?.lifeBookPdfRecord?.htmlContent
    || metadata?.lifeBookPdfRecord?.htmlContent
    || "",
  );
  if (format === "html" || format === "document" || format === "print") {
    if (!htmlContent.trim()) {
      return failure(404, "PDF_HTML_NOT_FOUND", "저장된 PDF 문서를 찾을 수 없습니다.");
    }
    const fileBase = cleanText(archive?.title || archive?.displayName || reportId, 120)
      .replace(/[^\w가-힣.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      || "code-destiny-report";
    const asciiFileBase = fileBase.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "code-destiny-report";
    const encodedFileName = encodeURIComponent(`${fileBase}.html`);
    return new Response(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Content-Disposition": `inline; filename="${asciiFileBase}.html"; filename*=UTF-8''${encodedFileName}`,
        "Cache-Control": "private, no-store",
      },
    });
  }
  if (format === "pdf" || format === "download") {
    const hasArchiveChapters = Array.isArray(archive?.chapters) && archive.chapters.length > 0;
    if (!htmlContent.trim() && !hasArchiveChapters) {
      return failure(404, "PDF_HTML_NOT_FOUND", "저장된 PDF 문서를 찾을 수 없습니다.");
    }
    const fileBase = cleanText(archive?.title || archive?.displayName || reportId, 120)
      .replace(/[^\w가-힣.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      || "code-destiny-report";
    const asciiFileBase = fileBase.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "code-destiny-report";
    const encodedFileName = encodeURIComponent(`${fileBase}.pdf`);
    const pdfBytes = buildNativeArchivePdfBytes({ archive, metadata, reportId, htmlContent });
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asciiFileBase}.pdf"; filename*=UTF-8''${encodedFileName}`,
        "Cache-Control": "private, no-store",
        "X-CD-PDF-Renderer": "native-text-v1",
      },
    });
  }

  const report = toArchiveBase(doc);
  return json({ ok: true, report });
}

function failure(status, code, message, debugMessage, extras = {}, errorDetails) {
  const normalizedCode = normalizeBillingErrorCode(code);
  const responseStatus = extras?.status || (Number(status) === 402 ? "payment_required" : "error");
  const responseReason = extras?.reason || (responseStatus === "payment_required" ? resolvePaymentRequiredReason(normalizedCode, extras) : normalizedCode);
  const requiredMonthlyCredits = Math.max(0, Math.floor(Number(extras?.requiredMonthlyCredits ?? extras?.membershipCreditCost ?? 0)));
  const currentMonthlyCredits = Math.max(0, Math.floor(Number(extras?.currentMonthlyCredits ?? extras?.monthlyCredits ?? extras?.membershipCreditBalance ?? 0)));
  return json({
    ok: false,
    code: normalizedCode,
    message,
    status: responseStatus,
    reason: responseReason,
    ...extras,
    ...(requiredMonthlyCredits > 0 ? { requiredMonthlyCredits } : {}),
    ...(normalizedCode === "INSUFFICIENT_MONTHLY_CREDITS" ? { currentMonthlyCredits } : {}),
    error: {
      code: normalizedCode,
      message,
      ...(debugMessage ? { debugMessage: String(debugMessage).slice(0, 300) } : {}),
      ...(errorDetails && typeof errorDetails === "object" ? { details: errorDetails } : {}),
    },
  }, { status });
}

function buildRoutedRequest(request, targetPath, method, body) {
  const url = new URL(request.url);
  url.pathname = targetPath;

  const headers = new Headers(request.headers || {});
  const nextMethod = String(method || request.method || "GET").toUpperCase();

  const init = {
    method: nextMethod,
    headers,
  };

  if (body !== undefined && body !== null && nextMethod !== "GET") {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(body);
  }

  return new Request(url.toString(), init);
}

async function readPayloadSafe(response) {
  try {
    return await response.clone().json();
  } catch (e) {
    return {};
  }
}

function resolveRequestId(request, body) {
  const rawRequestId = String(
    body?.requestId
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key")
      || "",
  ).trim().slice(0, 120);

  if (rawRequestId) return rawRequestId;
  return `billing:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function shouldRetryCoinConsume(responseStatus, payload) {
  const status = Number(responseStatus || 0);
  if (status >= 500) return true;
  const code = String(toCode(payload) || "").trim().toUpperCase();
  return code === "SERVICE_UNAVAILABLE" || code === "WORKER_UNHANDLED_EXCEPTION";
}

function sleep(ms) {
  const delay = Number(ms);
  if (!Number.isFinite(delay) || delay <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function withTimeout(promise, timeoutMs, code = "BILLING_TIMEOUT") {
  const ms = Math.max(1000, Number(timeoutMs || 15000));
  let timer = null;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(`Billing operation timed out after ${ms}ms`);
          error.code = code;
          reject(error);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function shouldRetryCoinConsumeException(error) {
  const code = String(error?.code || "").trim().toUpperCase();
  const name = String(error?.name || "").trim().toUpperCase();
  const message = String(error?.message || "").trim().toUpperCase();
  return code === "COIN_GATE_CONSUME_TIMEOUT"
    || code === "WORKER_UNHANDLED_EXCEPTION"
    || name === "MONGOTOPOLOGYCLOSEDERROR"
    || message.includes("TOPOLOGY IS CLOSED")
    || message.includes("TOPOLOGY CLOSED");
}

function hasDbErrorSignature(rawText) {
  const text = String(rawText || "").trim().toLowerCase();
  if (!text) return false;
  return PAID_ACCESS_DB_ERROR_SIGNATURES.some((needle) => text.includes(needle));
}

function isDatabaseUnavailableError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || error?.name || "").toLowerCase();
  return hasDbErrorSignature(message) || hasDbErrorSignature(code);
}

function withDbAccessTimeout(promise, timeoutMs, message) {
  return withTimeout(promise, timeoutMs, String(message || "UNLOCK_DB_TIMEOUT"));
}

function buildPassPaymentDecisionFallback(pricing, profileSubscription = null) {
  return buildPassPaymentDecision({}, pricing, profileSubscription || {
    membershipCreditBalance: 0,
  });
}

function isProductionRuntime(env) {
  const nodeEnv = String(env?.NODE_ENV || "").trim().toLowerCase();
  if (nodeEnv === "production") return true;

  const appEnv = String(env?.APP_ENV || env?.DEPLOY_ENV || env?.ENVIRONMENT || "").trim().toLowerCase();
  return appEnv === "prod" || appEnv === "production";
}

function isTruthyFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function shouldCreateDirectPortOneOrder(body = {}) {
  const paymentMode = String(body?.paymentMode || body?.accessMode || body?.mode || "").trim().toLowerCase();
  const provider = String(body?.provider || body?.paymentProvider || "").trim().toLowerCase();
  const pg = String(body?.pg || body?.pgProvider || "").trim().toLowerCase();
  return paymentMode === "direct_krw"
    || paymentMode === "single_payment"
    || paymentMode === "single"
    || isTruthyFlag(body?.forceDirectPayment)
    || isTruthyFlag(body?.disableAdminTestPaymentBypass)
    || isTruthyFlag(body?.skipAdminTestPaymentBypass)
    || (provider === "portone_v2" && (pg === "kg_inicis" || pg === "kg-inicis" || pg === "inicis"));
}

function isAdminPaidServiceBypassEnabled() {
  return true;
}

function isPaidServiceFeaturePricing(pricing = {}) {
  const featureKey = String(pricing?.featureKey || "").trim();
  const cost = Number(pricing?.coinPrice || pricing?.cost || 0);
  return Boolean(featureKey) && Number.isFinite(cost) && cost > 0;
}

function isSajuPdfGenerationFeatureKey(featureKey) {
  const key = String(featureKey || "").trim();
  if (!key) return false;
  return SAJU_PDF_GENERATION_FEATURE_KEYS.has(key) || SAJU_PDF_GENERATION_FEATURE_KEYS.has(key.toLowerCase());
}

function canGeneratePaidPdf(pricing = {}) {
  return isSajuPdfGenerationFeatureKey(pricing?.featureKey) || isPdfFeaturePricing(pricing);
}

function shouldPersistProfileUnlockEntitlement(pricing = {}) {
  return !canGeneratePaidPdf(pricing) && isProfileScopedUnlockKey(pricing?.featureKey);
}

function decodeCookieValue(rawValue) {
  try {
    return decodeURIComponent(String(rawValue || ""));
  } catch (e) {
    return String(rawValue || "");
  }
}

function extractFlowerAdminToken(request) {
  const headerToken = String(request.headers.get("x-admin-token") || "").trim();
  if (FLOWER_ADMIN_TOKEN_RE.test(headerToken)) return headerToken;

  const auth = String(request.headers.get("authorization") || "").trim();
  if (auth.toLowerCase().startsWith("bearer ")) {
    const bearer = auth.slice(7).trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(bearer)) return bearer;
  }

  const cookie = String(request.headers.get("cookie") || "");
  const match = cookie.match(/(?:^|;\s*)flower_admin_token=([^;]+)/i);
  if (!match) return "";
  const token = decodeCookieValue(match[1]);
  return FLOWER_ADMIN_TOKEN_RE.test(token) ? token : "";
}

function timingSafeEqualText(a, b) {
  const lhs = String(a || "");
  const rhs = String(b || "");
  if (lhs.length !== rhs.length) return false;

  let diff = 0;
  for (let index = 0; index < lhs.length; index += 1) {
    diff |= lhs.charCodeAt(index) ^ rhs.charCodeAt(index);
  }
  return diff === 0;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function base64urlDecode(value) {
  const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  return atob(base64 + "=".repeat(pad));
}

async function hmacSha256Hex(text, secret) {
  const subtle = globalThis?.crypto?.subtle;
  if (!subtle) return "";
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return bytesToHex(new Uint8Array(signature));
}

async function verifyFlowerAdminToken(request, env) {
  const token = extractFlowerAdminToken(request);
  if (!token) return false;

  const dotIdx = token.lastIndexOf(".");
  if (dotIdx < 1) return false;

  const payloadB64 = token.slice(0, dotIdx);
  const signatureHex = token.slice(dotIdx + 1);
  if (!/^[a-f0-9]{64}$/i.test(signatureHex)) return false;

  const expectedHex = await hmacSha256Hex(
    payloadB64,
    String(env?.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000"),
  );
  if (!timingSafeEqualText(expectedHex, signatureHex.toLowerCase())) return false;

  let payload = null;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64));
  } catch (e) {
    return false;
  }

  const exp = Number(payload?.exp || 0);
  const nowSec = Math.floor(Date.now() / 1000);
  return payload?.v === 1 && Number.isFinite(exp) && nowSec <= exp;
}

function logCoinGateResult(payload) {
  try {
    console.log("[worker-billing-coin-gate]", JSON.stringify(payload));
  } catch (e) {
    console.log("[worker-billing-coin-gate]", payload);
  }
}

async function consumeCoinWithRetry(request, env, delegatedBody) {
  const maxAttempts = 2;
  const consumeTimeoutMs = Math.max(2000, Number(env?.BILLING_COIN_GATE_TIMEOUT_MS || env?.COIN_GATE_TIMEOUT_MS || 15000));
  let delegatedResponse = null;
  let payload = {};

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/consume", "POST", delegatedBody);
    try {
      delegatedResponse = await withTimeout(
        handleFortuneRoutes(delegatedRequest, env),
        consumeTimeoutMs,
        "COIN_GATE_CONSUME_TIMEOUT",
      );
      payload = await readPayloadSafe(delegatedResponse);
    } catch (error) {
      payload = {};
      if (attempt >= maxAttempts || !shouldRetryCoinConsumeException(error)) {
        throw error;
      }
      await sleep(120);
      continue;
    }

    if (delegatedResponse.ok) break;
    if (attempt >= maxAttempts) break;
    if (!shouldRetryCoinConsume(delegatedResponse.status, payload)) break;
    await sleep(120);
  }

  return { delegatedResponse, payload };
}

function mapCoinGateFailure(responseStatus, payload) {
  const rawCode = String(toCode(payload) || "").trim().toUpperCase();
  const message = toMessage(payload, "이용권 확인 중 오류가 발생했습니다.");

  if (rawCode === "SERVER_CONFIG_ERROR") {
    return {
      status: 500,
      code: "SERVER_CONFIG_ERROR",
      message: "서버 설정을 확인해 주세요.",
      debugMessage: message,
    };
  }

  if (
    responseStatus === 401
    || responseStatus === 403
    || rawCode === "AUTH_REQUIRED"
    || rawCode === "LOGIN_REQUIRED"
    || rawCode === "UNAUTHORIZED"
  ) {
    return {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "로그인이 필요합니다.",
      debugMessage: message,
    };
  }

  if (
    responseStatus === 402
    || rawCode === "INSUFFICIENT_BALANCE"
    || rawCode === "INSUFFICIENT_POINTS"
    || rawCode === "INSUFFICIENT_COINS"
  ) {
    return {
      status: 402,
      code: "PAYMENT_REQUIRED",
      message: "상품별 원화 단건 결제가 필요합니다.",
      debugMessage: message,
    };
  }

  if (
    responseStatus === 404
    || rawCode === "PRICE_NOT_FOUND"
    || rawCode === "SERVER_PRICE_REQUIRED"
    || rawCode === "UNKNOWN_FEATURE_KEY"
  ) {
    return {
      status: 404,
      code: "PRICE_NOT_FOUND",
      message: "요청한 기능의 서버 가격표를 찾을 수 없습니다.",
      debugMessage: message,
    };
  }

  if (responseStatus >= 500) {
    if (rawCode === "SERVICE_UNAVAILABLE") {
      return {
        status: 500,
        code: "SERVER_CONFIG_ERROR",
        message: "서버 설정을 확인해 주세요.",
        debugMessage: message,
      };
    }
    return {
      status: 500,
      code: "SERVER_ERROR",
      message: "서버 처리 중 오류가 발생했습니다.",
      debugMessage: message,
    };
  }

  return {
    status: 400,
    code: "SERVER_ERROR",
    message: "이용권 확인 요청이 거부되었습니다.",
    debugMessage: message,
  };
}

function buildAccessDecision({
  pricing,
  authenticated,
  balance,
  unlockMap,
  subscription,
  usagePassMap,
} = {}) {
  const cost = Number(pricing?.cost || 0);
  const featureKey = String(pricing?.featureKey || "").trim();
  const currentBalance = Number(balance || 0);
  const unlocked = Boolean(featureKey && unlockMap && typeof unlockMap === "object" && unlockMap[featureKey]);
  const hasUsagePass = Boolean(featureKey && usagePassMap && typeof usagePassMap === "object" && usagePassMap[featureKey]);
  const subActive = Boolean(subscription?.isActive);
  const subFreeLimit = Number(subscription?.freeLimit || 0);

  if (!Number.isFinite(cost) || cost <= 0) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.FREE,
      requiredCoins: 0,
    };
  }

  if (!authenticated) {
    return {
      allowed: false,
      reason: ACCESS_DECISION_REASONS.AUTH_REQUIRED,
      requiredCoins: cost,
    };
  }

  if (unlocked) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.ALREADY_UNLOCKED,
      requiredCoins: cost,
    };
  }

  if (hasUsagePass) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.USAGE_PASS_ACTIVE,
      requiredCoins: cost,
    };
  }

  if (subActive && Number.isFinite(subFreeLimit) && cost <= subFreeLimit) {
    return {
      allowed: true,
      reason: ACCESS_DECISION_REASONS.SUBSCRIPTION_ACTIVE,
      requiredCoins: cost,
    };
  }

  return {
    allowed: false,
    reason: ACCESS_DECISION_REASONS.REQUIRES_PURCHASE,
    requiredCoins: cost,
  };
}

async function requireBillingAuth(request, env, pricing = {}) {
  const cost = Number(pricing?.cost || 0);
  const featureKey = String(pricing?.featureKey || "").trim();
  if (Number.isFinite(cost) && cost <= 0 && !featureKey) {
    return { ok: true, auth: null };
  }

  const adminMode = isPaidServiceFeaturePricing(pricing) && isAdminPaidServiceBypassEnabled(env)
    ? await verifyFlowerAdminToken(request, env)
    : false;
  const auth = await getOptionalUserFromRequest(request, env);
  if (auth) {
    return { ok: true, auth, adminMode };
  }

  if (adminMode) {
    return {
      ok: true,
      auth: {
        userId: ADMIN_TEST_USER_ID,
        role: "admin",
        isAdmin: true,
      },
      adminMode: true,
    };
  }

  return {
    ok: false,
    response: failure(401, "AUTH_REQUIRED", "로그인이 필요합니다."),
  };
}

function resolvePricingFromBody(body = {}) {
  return getBillingFeaturePricing({
    categoryKey: body?.categoryKey,
    subFeatureKey: body?.subFeatureKey,
    featureKey: body?.featureKey,
    reason: body?.reason,
    mode: body?.mode,
    reportMode: body?.reportMode,
  });
}

async function processCoinGateFromPricing(request, env, body, pricingResult) {
  const authCheck = await requireBillingAuth(request, env, pricingResult?.pricing || {});
  if (!authCheck.ok) return authCheck.response;

  const enabled = assertFeatureEnabled(pricingResult.pricing);
  if (!enabled.ok) {
    return failure(403, enabled.code || "FEATURE_DISABLED", enabled.message || "현재 이용할 수 없는 기능입니다.");
  }

  const requestId = resolveRequestId(request, body);
  let pricing = pricingResult.pricing;
  const forceDeductRaw = body?.forceDeduct;
  const forceDeduct = forceDeductRaw === undefined
    ? true
    : (forceDeductRaw === true || String(forceDeductRaw).toLowerCase() === "true");
  const forceDeductRequested = forceDeductRaw !== undefined
    && (forceDeductRaw === true || String(forceDeductRaw).toLowerCase() === "true");
  const requestedPaymentMode = String(body?.paymentMode || body?.accessMode || "").trim().toLowerCase();
  const membershipPassOnly = requestedPaymentMode === "membership_pass" || requestedPaymentMode === "membership";
  const monthlyBalanceRequested = requestedPaymentMode === "monthly_credit"
    || requestedPaymentMode === "monthly"
    || requestedPaymentMode === "membership_credit"
    || requestedPaymentMode === "moonlight_stone"
    || requestedPaymentMode === "moonlight stone"
    || requestedPaymentMode === "moonlightstone";
  const directPaymentRequested = shouldCreateDirectPortOneOrder(body);
  const coinPaymentRequested = requestedPaymentMode === "coin"
    || requestedPaymentMode === "coins"
    || requestedPaymentMode === "coin_credit"
    || requestedPaymentMode === "coin_payment"
    || requestedPaymentMode === "pig_coin"
    || requestedPaymentMode === "pig-coin"
    || (!requestedPaymentMode && forceDeductRequested && !directPaymentRequested);
  const knownPaymentMode = !requestedPaymentMode
    || membershipPassOnly
    || monthlyBalanceRequested
    || directPaymentRequested
    || coinPaymentRequested;
  if (!knownPaymentMode) {
    return failure(400, "UNKNOWN_PAYMENT_METHOD", "알 수 없는 결제 수단입니다.", undefined, {
      paymentMode: requestedPaymentMode,
    });
  }
  const singleOrMonthlyOnly = monthlyBalanceRequested;
  const shouldAutoConsumeUsagePass = !membershipPassOnly
    && !monthlyBalanceRequested
    && !directPaymentRequested
    && !coinPaymentRequested;

  const reportId = String(body?.reportId || body?.accessGrant?.reportId || "").trim();
  const reportSessionId = String(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || (reportId ? `love-book:${reportId}` : requestId)).trim();
  const isPdfGenerationService = canGeneratePaidPdf(pricing);
  const persistProfileUnlockEntitlement = shouldPersistProfileUnlockEntitlement(pricing);
  if (authCheck.adminMode) {
    const adminAuthUserId = String(authCheck?.auth?.userId || ADMIN_TEST_USER_ID);
    const adminFeatureKey = String(pricing?.featureKey || "").trim();
    const adminPurchaseId = String(requestId || `admin:${adminFeatureKey || "paid-service"}:${Date.now().toString(36)}`).trim();
    const adminProfileId = cleanProfileId(body?.profileId || body?.selectedProfileId || body?.profile?.profileId || body?.profile?.id);
    const adminPaymentDecision = buildPassPaymentDecision(null, pricing, null);
    return await successWithPremiumAccess(env, adminAuthUserId, {
      pricing,
      ...adminPaymentDecision,
      paymentOptions: adminPaymentDecision,
      adminBypass: true,
      adminTestMode: true,
      paymentMode: "admin_bypass",
      accessMethod: "ADMIN_TEST",
      charged: 0,
      consume: {
        ok: true,
        transactionId: adminPurchaseId,
        transactionType: isPdfGenerationService ? "admin_pdf_generation" : "admin_paid_service",
        accessType: "admin_test",
        accessMethod: "ADMIN_TEST",
        paymentMethod: "ADMIN_TEST",
        requestId,
        featureKey: adminFeatureKey,
        coinPrice: Number(pricing.coinPrice || pricing.cost || 0),
        chargedCoins: 0,
        membershipCreditCost: 0,
        adminBypass: true,
        adminTestMode: true,
        paymentMode: "admin_bypass",
      },
      accessGrant: {
        ok: true,
        accessType: "admin_test",
        accessMethod: "ADMIN_TEST",
        paymentMode: "admin_bypass",
        adminTestMode: true,
        adminBypass: true,
        featureKey: adminFeatureKey,
        sessionId: reportSessionId || undefined,
        requestId,
        purchaseId: adminPurchaseId,
        evidenceId: adminPurchaseId,
        reportId: reportId || undefined,
        profileId: adminProfileId || undefined,
        paidAt: new Date().toISOString(),
      },
      balance: null,
      user: {
        id: adminAuthUserId,
        role: "admin",
        adminMode: true,
      },
      unlockedFeatures: adminFeatureKey && persistProfileUnlockEntitlement ? [adminFeatureKey] : [],
      unlockMap: adminFeatureKey && persistProfileUnlockEntitlement ? { [adminFeatureKey]: true } : {},
      freeBySubscription: false,
    }, "ADMIN_TEST_PAYMENT_BYPASS");
  }
  const profileId = authCheck?.auth?.userId ? await withDbAccessTimeout(
    resolveBillingProfileId(authCheck.auth.userId, body, env),
    PAID_ACCESS_DECISION_DB_TIMEOUT_MS,
    "COIN_GATE_PROFILE_RESOLVE_TIMEOUT",
  ).catch((error) => {
    if (!isDatabaseUnavailableError(error)) {
      throw error;
    }
    return "";
  }) : "";
  const subscriptionPassForDecision = authCheck?.auth?.userId ? await withDbAccessTimeout(
    getMembershipPassForBillingRequest(
      request,
      env,
      authCheck.auth.userId,
    ),
    PAID_ACCESS_DECISION_DB_TIMEOUT_MS,
    "COIN_GATE_PASS_RESOLVE_TIMEOUT",
  ).catch((error) => {
    if (!isDatabaseUnavailableError(error)) {
      throw error;
    }
    return null;
  }) : null;
  pricing = applyPdfPassDiscountToPricing(pricing, subscriptionPassForDecision?.entitlement || {});
  const scopedBody = profileId ? { ...body, profileId, selectedProfileId: profileId } : body;
  if (persistProfileUnlockEntitlement && !profileId) {
    return failure(403, "MISSING_PROFILE_ID", "Profile selection is required before unlocking this paid section.", undefined, {
      pricing,
      reason: "missing_profile_id",
      accessGrant: null,
      paymentOptions: buildPassPaymentDecision(
        subscriptionPassForDecision?.entitlement,
        pricing,
        subscriptionPassForDecision?.profileSubscription,
      ),
      requiresProfile: true,
    });
  }
  let paymentDecision = buildPassPaymentDecision(null, pricing, null);
  let accessDecision = buildPaidContentAccessDecision({
    reason: "payment_required",
    shouldOpenPaymentSelector: true,
    priceCoin: Number(pricing?.coinPrice || pricing?.cost || 0),
    paymentOptions: paymentDecision,
  });
  if (persistProfileUnlockEntitlement) {
    accessDecision = await resolvePaidContentAccess(env, {
      userId: authCheck.auth.userId,
      profileId,
      pricing,
      requestId,
      requestedPaymentMode,
      allowPassAutoUnlock: true,
      subscriptionPass: subscriptionPassForDecision,
      body: scopedBody,
    });
  }

  if (accessDecision.paymentOptions) paymentDecision = accessDecision.paymentOptions;
  if (accessDecision.reason === "already_unlocked" || accessDecision.reason === "pass_covered") {
    const accessType = accessDecision.reason === "already_unlocked" ? "already_unlocked" : "membership_pass";
    return await successWithPremiumAccess(env, authCheck.auth.userId, {
      pricing,
      ...paymentDecision,
      paymentOptions: paymentDecision,
      alreadyUnlocked: accessDecision.reason === "already_unlocked",
      accessMethod: accessDecision.reason === "pass_covered" ? "PASS" : undefined,
      consume: {
        ok: true,
        transactionType: accessDecision.reason === "already_unlocked" ? "unlock_entitlement" : "membership_pass",
        accessType,
        accessMethod: accessDecision.reason === "pass_covered" ? "PASS" : undefined,
        paymentMethod: accessDecision.reason === "pass_covered" ? "PASS" : undefined,
        requestId,
        featureKey: String(pricing.featureKey || ""),
        profileId: profileId || undefined,
        chargedCoins: 0,
        membershipCreditCost: 0,
      },
      accessGrant: {
        ok: true,
        accessType,
        accessMethod: accessDecision.reason === "pass_covered" ? "PASS" : undefined,
        featureKey: String(pricing.featureKey || ""),
        sessionId: reportSessionId || undefined,
        requestId,
        purchaseId: String(accessDecision.unlockId || requestId),
        evidenceId: String(accessDecision.unlockId || ""),
        reportId: reportId || undefined,
        profileId: profileId || undefined,
        paidAt: new Date().toISOString(),
      },
      accessDecision,
      unlockedFeatures: [String(pricing.featureKey || "")],
      unlockMap: { [String(pricing.featureKey || "")]: true },
      balance: null,
      membershipPass: accessDecision.reason === "pass_covered" && subscriptionPassForDecision ? {
        tier: subscriptionPassForDecision.tier,
        passTier: subscriptionPassForDecision.passTier,
        freeLimit: subscriptionPassForDecision.freeLimit,
      } : undefined,
      user: {
        id: String(authCheck.auth.userId || ""),
        profileSubscription: subscriptionPassForDecision?.profileSubscription || null,
      },
      freeBySubscription: accessDecision.reason === "pass_covered",
    }, accessDecision.reason === "already_unlocked" ? "ALREADY_UNLOCKED" : "PASS_FREE");
  }
  if (accessDecision.reason === "invalid_profile") {
    return failure(403, "INVALID_PROFILE", "Profile access could not be verified.", undefined, {
      pricing,
      accessDecision,
    });
  }
  if (accessDecision.reason === "error") {
    return failure(500, "ACCESS_DECISION_ERROR", "Paid content access could not be verified.", undefined, {
      pricing,
      accessDecision,
    });
  }
  const passBlockedByAccessDecision = accessDecision.reason === "profile_limit_exceeded"
    || accessDecision.reason === "price_exceeds_pass_limit";

  let usagePassChecked = false;
  const tryUsagePassAccess = async () => {
    if (!shouldAutoConsumeUsagePass) return null;
    usagePassChecked = true;
    const usagePassConsume = await consumeUsagePassIfAvailable(env, authCheck.auth.userId, pricing, requestId);
    if (!usagePassConsume) return null;
    let unlockEntitlement = null;
    if (persistProfileUnlockEntitlement) {
      try {
        unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
          userId: authCheck.auth.userId,
          profileId,
          featureKey: pricing.featureKey,
          contentKey: body?.contentKey,
          source: CONTENT_ENTITLEMENT_SOURCES.PASS,
          passId: `${usagePassConsume.category}:${requestId}`,
          coinAmount: 0,
        });
      } catch (error) {
        return failure(
          error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
          "UNLOCK_ENTITLEMENT_SAVE_FAILED",
          "Unlock entitlement could not be saved after usage pass consumption.",
          String(error?.message || ""),
          {
            pricing,
            pendingUnlock: true,
            settlement: {
              source: "USAGE_PASS",
              category: usagePassConsume.category,
              requestId,
              profileId: profileId || undefined,
            },
          },
        );
      }
    }
    return await successWithPremiumAccess(env, authCheck.auth.userId, {
      pricing,
      ...paymentDecision,
      paymentOptions: paymentDecision,
      accessMethod: "PASS",
      consume: {
        ok: true,
        transactionType: "usage_pass",
        accessType: "usage_pass",
        accessMethod: "PASS",
        paymentMethod: "PASS",
        requestId,
        featureKey: String(pricing.featureKey || ""),
        category: usagePassConsume.category,
        remainingUses: usagePassConsume.remainingUses,
        idempotent: Boolean(usagePassConsume.idempotent),
        chargedCoins: 0,
        membershipCreditCost: 0,
      },
      premiumAccessToken: null,
      accessGrant: {
        ok: true,
        accessType: "usage_pass",
        accessMethod: "PASS",
        featureKey: String(pricing.featureKey || ""),
        sessionId: reportSessionId || undefined,
        requestId,
        purchaseId: String(unlockEntitlement?._id || requestId),
        evidenceId: String(unlockEntitlement?._id || ""),
        reportId: reportId || undefined,
        profileId: profileId || undefined,
        paidAt: new Date().toISOString(),
      },
      balance: Number(usagePassConsume?.user?.points || 0),
      user: usagePassConsume.user,
      freeBySubscription: false,
    }, "이용권으로 콘텐츠 이용 권한을 발급했습니다.");
  };

  if (authCheck?.auth?.userId) {
    const subscriptionPass = subscriptionPassForDecision || {
      isActive: false,
      entitlement: {},
      profileSubscription: null,
      tier: "free",
      passTier: null,
      freeLimit: 0,
    };
    const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
    paymentDecision = buildPassPaymentDecision(
      subscriptionPass.entitlement,
      pricing,
      subscriptionPass.profileSubscription,
    );
    if (paymentDecision.canUseByPass && !passBlockedByAccessDecision) {
      const passEvidence = await recordPassAccessIfNeeded(env, authCheck.auth.userId, pricing, requestId, {
        ...scopedBody,
        reportId,
        sessionId: reportSessionId,
        reportSessionId,
      }, subscriptionPass.entitlement);
      let unlockEntitlement = null;
      if (persistProfileUnlockEntitlement) {
        try {
          unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
            userId: authCheck.auth.userId,
            profileId,
            featureKey: pricing.featureKey,
            contentKey: body?.contentKey,
            source: CONTENT_ENTITLEMENT_SOURCES.PASS,
            passId: `membership:${subscriptionPass.tier}:${requestId}`,
            coinAmount: 0,
          });
        } catch (error) {
          return failure(
            error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
            "UNLOCK_ENTITLEMENT_SAVE_FAILED",
            "Unlock entitlement could not be saved.",
            String(error?.message || ""),
            {
              pricing,
              pendingUnlock: true,
              accessGrant: {
                featureKey: String(pricing.featureKey || ""),
                requestId,
                evidenceId: String(passEvidence?._id || ""),
                profileId: profileId || undefined,
              },
            },
          );
        }
      }
      return await successWithPremiumAccess(env, authCheck.auth.userId, {
        pricing,
        ...paymentDecision,
        paymentOptions: paymentDecision,
        accessMethod: "PASS",
        charged: 0,
        consume: {
          ok: true,
          transactionType: "membership_pass",
          accessType: "membership_pass",
          accessMethod: "PASS",
          paymentMethod: "PASS",
          requestId,
          featureKey: String(pricing.featureKey || ""),
          coinPrice,
          chargedCoins: 0,
          membershipCreditCost: 0,
        },
        premiumAccessToken: null,
        accessGrant: {
          ok: true,
          accessType: "membership_pass",
          featureKey: String(pricing.featureKey || ""),
          sessionId: reportSessionId || undefined,
          requestId,
          purchaseId: requestId,
          evidenceId: String(unlockEntitlement?._id || passEvidence?._id || `membership:${subscriptionPass.tier}:${requestId}`),
          reportId: reportId || undefined,
          profileId: profileId || undefined,
          paidAt: new Date().toISOString(),
          accessMethod: "PASS",
        },
        balance: null,
        membershipPass: {
          tier: subscriptionPass.tier,
          passTier: subscriptionPass.passTier,
          freeLimit: subscriptionPass.freeLimit,
        },
        user: {
          id: String(authCheck.auth.userId || ""),
          profileSubscription: subscriptionPass.profileSubscription || null,
        },
        freeBySubscription: true,
      }, "이용권 무료 한도 조건으로 서비스를 열었습니다.");
    }

    if (membershipPassOnly) {
      const passFailureCode = accessDecision.reason === "profile_limit_exceeded"
        ? "PROFILE_LIMIT_EXCEEDED"
        : (accessDecision.reason === "price_exceeds_pass_limit" ? "PRICE_EXCEEDS_PASS_LIMIT" : "MEMBERSHIP_PASS_NOT_COVERED");
      return failure(402, passFailureCode, "현재 이용권 한도 밖 서비스입니다. 원화 단건 결제로 이용해 주세요.", undefined, {
        pricing,
        ...paymentDecision,
        paymentOptions: paymentDecision,
        accessGrant: null,
        balance: null,
        membershipPass: {
          tier: subscriptionPass.tier,
          passTier: subscriptionPass.passTier,
          freeLimit: subscriptionPass.freeLimit,
        },
        membershipPassDebug: {
          detectedTier: subscriptionPass.tier,
          passTier: subscriptionPass.passTier,
          freeLimit: subscriptionPass.freeLimit,
          passLimit: paymentDecision.passLimit,
          requestedCoinPrice: Number(pricing?.coinPrice || pricing?.cost || 0),
          hasActivePass: paymentDecision.hasActivePass,
          canUseByPass: paymentDecision.canUseByPass,
          status: subscriptionPass.profileSubscription?.status
            || subscriptionPass.profileSubscription?.subscriptionStatus
            || subscriptionPass.profileSubscription?.membershipStatus
            || null,
          expiresAt: subscriptionPass.profileSubscription?.expiresAt || null,
        },
      });
    }

    const usagePassAccess = await tryUsagePassAccess();
    if (usagePassAccess) return usagePassAccess;

    if (monthlyBalanceRequested) {
      try {
      const membershipConsume = await consumeMembershipCreditIfAvailable(env, authCheck.auth.userId, pricing, requestId, {
        ...scopedBody,
        reportId,
        sessionId: reportSessionId,
        reportSessionId,
      });
      if (membershipConsume) {
        let unlockEntitlement = null;
        if (persistProfileUnlockEntitlement) {
          try {
            unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
              userId: authCheck.auth.userId,
              profileId,
              featureKey: pricing.featureKey,
              contentKey: body?.contentKey,
              source: CONTENT_ENTITLEMENT_SOURCES.MONTHLY,
              orderId: membershipConsume.purchaseId || requestId,
              paymentId: membershipConsume.transactionId || requestId,
              coinAmount: Number(membershipConsume.coinPrice || 0),
            });
          } catch (error) {
            if (!membershipConsume.idempotent) {
              const refundCredit = Math.max(0, Math.floor(Number(membershipConsume.requiredMonthlyCredits || membershipConsume.membershipCreditCost || 0)));
              const refundPurchaseId = String(membershipConsume.purchaseId || requestId || "").trim();
              if (refundCredit > 0) {
                await User.findByIdAndUpdate(authCheck.auth.userId, {
                  $inc: {
                    "profileSubscription.membershipCreditBalance": refundCredit,
                    "profileSubscription.membershipCreditUsed": -refundCredit,
                  },
                  ...(refundPurchaseId ? { $pull: { recentConsumeRequestIds: refundPurchaseId } } : {}),
                }).catch(() => {});
                await PointHistory.updateOne(
                  { _id: membershipConsume.transactionId, userId: authCheck.auth.userId },
                  {
                    $set: {
                      "metadata.monthlyCreditRefundedForUnlockFailure": true,
                      "metadata.monthlyCreditRefundedAt": new Date(),
                      "metadata.unlockFailureMessage": String(error?.message || "").slice(0, 500),
                    },
                  },
                ).catch(() => {});
                if (membershipConsume.ledgerId) {
                  await MonthlyCreditLedger.updateOne(
                    { _id: membershipConsume.ledgerId, userId: authCheck.auth.userId },
                    {
                      $set: {
                        "metadata.refundedForUnlockFailure": true,
                        "metadata.refundedAt": new Date(),
                        "metadata.unlockFailureMessage": String(error?.message || "").slice(0, 500),
                      },
                    },
                  ).catch(() => {});
                }
              }
            }
            return failure(
              error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
              "UNLOCK_ENTITLEMENT_SAVE_FAILED",
              "Unlock entitlement could not be saved after monthly credit consumption.",
              String(error?.message || ""),
              {
                pricing,
                pendingUnlock: true,
                settlement: {
                  source: "MONTHLY",
                  transactionId: membershipConsume.transactionId || "",
                  requestId,
                  profileId: profileId || undefined,
                },
              },
            );
          }
        }
        const updatedPaymentDecision = buildPassPaymentDecision(
          subscriptionPass.entitlement,
          pricing,
          membershipConsume?.user?.profileSubscription || subscriptionPass.profileSubscription,
        );
        return await successWithPremiumAccess(env, authCheck.auth.userId, {
          pricing,
          ...updatedPaymentDecision,
          paymentOptions: updatedPaymentDecision,
          accessMethod: "MONTHLY",
          charged: Number(membershipConsume.coinPrice || 0),
          consume: {
            ok: true,
            transactionType: "membership_credit",
            accessType: "membership_credit",
            accessMethod: "MONTHLY",
            paymentMethod: "MONTHLY",
            requestId,
            featureKey: String(pricing.featureKey || ""),
            profileId: profileId || undefined,
            coinPrice: membershipConsume.coinPrice,
            chargedCoins: Number(membershipConsume.coinPrice || 0),
            membershipCreditCost: membershipConsume.membershipCreditCost,
            requiredMonthlyCredits: membershipConsume.requiredMonthlyCredits,
            remainingMembershipCredit: membershipConsume.remainingMembershipCredit,
            monthlyCredits: membershipConsume.monthlyCredits,
            monthlyCreditsAsCoins: membershipConsume.monthlyCreditsAsCoins,
            idempotent: Boolean(membershipConsume.idempotent),
          },
          premiumAccessToken: null,
          accessGrant: {
            ok: true,
            accessType: "membership_credit",
            featureKey: String(pricing.featureKey || ""),
            sessionId: reportSessionId || undefined,
            requestId,
            purchaseId: membershipConsume.purchaseId || requestId,
            evidenceId: String(unlockEntitlement?._id || membershipConsume.transactionId || ""),
            reportId: reportId || undefined,
            profileId: profileId || undefined,
            paidAt: new Date().toISOString(),
            accessMethod: "MONTHLY",
          },
          balance: Number(membershipConsume?.user?.points || 0),
          membershipCreditBalance: membershipConsume.remainingMembershipCredit,
          monthlyCredits: membershipConsume.monthlyCredits,
          monthlyCreditsAsCoins: membershipConsume.monthlyCreditsAsCoins,
          user: membershipConsume.user,
        }, "이용권 혜택으로 콘텐츠 이용 권한을 발급했습니다.");
      }
    } catch (error) {
      logBillingRouteError("membership-credit-consume", error, request, {
        featureKey: String(pricing?.featureKey || ""),
        requestId,
      });
      return failure(
        500,
        "MEMBERSHIP_CREDIT_CONSUME_FAILED",
        "이용권 혜택 처리 중 오류가 발생했습니다.",
        String(error?.message || ""),
      );
    }
    }

    if (monthlyBalanceRequested) {
      const currentUser = await User.findById(authCheck.auth.userId)
        .select("profileSubscription")
        .lean();
      const monthlyCredits = Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0)));
      const requiredMonthlyCredits = calculateMembershipCreditCost(Number(pricing?.coinPrice || pricing?.cost || 0));
      return failure(402, "INSUFFICIENT_MONTHLY_CREDITS", "이용권 혜택이 부족합니다.", undefined, {
        pricing,
        ...paymentDecision,
        paymentOptions: {
          ...paymentDecision,
          monthlyBalance: monthlyCredits,
          canUseByMonthly: false,
        },
        accessGrant: null,
        requiredMonthlyCredits,
        currentMonthlyCredits: monthlyCredits,
        membershipCreditCost: requiredMonthlyCredits,
        membershipCreditBalance: monthlyCredits,
        monthlyCredits,
        monthlyCreditsAsCoins: monthlyCredits / MEMBERSHIP_CREDIT_PER_COIN,
        canUseByCard: true,
      });
    }

    const usagePassConsume = usagePassChecked || !shouldAutoConsumeUsagePass || singleOrMonthlyOnly ? null : await consumeUsagePassIfAvailable(env, authCheck.auth.userId, pricing, requestId);
    if (usagePassConsume) {
      let unlockEntitlement = null;
      if (persistProfileUnlockEntitlement) {
        try {
          unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
            userId: authCheck.auth.userId,
            profileId,
            featureKey: pricing.featureKey,
            contentKey: body?.contentKey,
            source: CONTENT_ENTITLEMENT_SOURCES.PASS,
            passId: `${usagePassConsume.category}:${requestId}`,
            coinAmount: 0,
          });
        } catch (error) {
          return failure(
            error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
            "UNLOCK_ENTITLEMENT_SAVE_FAILED",
            "Unlock entitlement could not be saved after usage pass consumption.",
            String(error?.message || ""),
            {
              pricing,
              pendingUnlock: true,
              settlement: {
                source: "USAGE_PASS",
                category: usagePassConsume.category,
                requestId,
                profileId: profileId || undefined,
              },
            },
          );
        }
      }
      return await successWithPremiumAccess(env, authCheck.auth.userId, {
        pricing,
        ...paymentDecision,
        paymentOptions: paymentDecision,
        accessMethod: "PASS",
        consume: {
          ok: true,
          transactionType: "usage_pass",
          accessType: "usage_pass",
          accessMethod: "PASS",
          paymentMethod: "PASS",
          requestId,
          featureKey: String(pricing.featureKey || ""),
          category: usagePassConsume.category,
          remainingUses: usagePassConsume.remainingUses,
          idempotent: Boolean(usagePassConsume.idempotent),
          chargedCoins: 0,
          membershipCreditCost: 0,
        },
        premiumAccessToken: null,
        accessGrant: {
          ok: true,
          accessType: "usage_pass",
          accessMethod: "PASS",
          featureKey: String(pricing.featureKey || ""),
          sessionId: reportSessionId || undefined,
          requestId,
          purchaseId: String(unlockEntitlement?._id || requestId),
          evidenceId: String(unlockEntitlement?._id || ""),
          reportId: reportId || undefined,
          profileId: profileId || undefined,
          paidAt: new Date().toISOString(),
        },
        balance: Number(usagePassConsume?.user?.points || 0),
        user: usagePassConsume.user,
        freeBySubscription: false,
      }, "이용권 회차를 사용해 서비스를 열었습니다.");
    }
  }

  if (!coinPaymentRequested) return failure(402, "PAYMENT_REQUIRED", "상품별 원화 단건 결제가 필요합니다.", undefined, {
    pricing,
    ...paymentDecision,
    paymentOptions: paymentDecision,
    accessDecision,
    shouldOpenPaymentSelector: accessDecision.shouldOpenPaymentSelector,
    availableMethods: accessDecision.availableMethods,
    accessGrant: null,
    balance: null,
    checkout: {
      endpoint: "/api/billing/checkout",
      payload: {
        paymentType: "digital_content",
        featureKey: String(pricing.featureKey || ""),
        reason: String(pricing.reason || ""),
        categoryKey: pricing.categoryKey,
        subFeatureKey: pricing.subFeatureKey,
        paymentAmount: Number(pricing.amountKRW || pricing.cashPrice || 0),
        coinPrice: Number(pricing.coinPrice || pricing.cost || 0),
        membershipCreditCost: Number(pricing.membershipCreditCost || calculateMembershipCreditCost(pricing.coinPrice || pricing.cost || 0)),
        requestId,
        reportId: reportId || undefined,
        sessionId: reportSessionId || undefined,
        profileId: profileId || undefined,
      },
    },
  });

  if (coinPaymentRequested) {
    await connectDb(env);
    const requiredCoins = Math.max(0, Math.floor(Number(pricing?.coinPrice || pricing?.cost || 0)));
    const coinPurchaseId = String(body?.purchaseId || body?.idempotencyKey || body?.orderId || requestId || "").trim();
    const coinFeatureKey = String(pricing?.featureKey || body?.featureKey || "").trim();

    if (coinPurchaseId && coinFeatureKey) {
      const existingCoinSpend = await PointHistory.findOne({
        userId: authCheck.auth.userId,
        kind: "deduct",
        featureKey: coinFeatureKey,
        "metadata.accessType": "coin",
        $or: [
          { "metadata.purchaseId": coinPurchaseId },
          { "metadata.idempotencyKey": coinPurchaseId },
          { "metadata.orderId": coinPurchaseId },
          { "metadata.requestId": coinPurchaseId },
        ],
      }).select("_id balanceAfter metadata").lean();
      if (existingCoinSpend) {
        const currentUser = await User.findById(authCheck.auth.userId)
          .select("points profileSubscription")
          .lean();
        const currentBalance = Math.max(0, Math.floor(Number(currentUser?.points || existingCoinSpend.balanceAfter || 0)));
        if (isUnlockPaidFeatureKey(coinFeatureKey) && !isProfileScopedUnlockKey(coinFeatureKey)) {
          await User.updateOne(
            { _id: authCheck.auth.userId },
            { $addToSet: { unlockedFeatures: coinFeatureKey } },
          );
        }
        return success({
          pricing,
          accessMethod: "COIN",
          paymentMode: "COIN",
          consume: {
            ok: true,
            transactionId: String(existingCoinSpend._id || ""),
            purchaseId: coinPurchaseId,
            requestId,
            transactionType: "coin",
            accessType: "coin",
            accessMethod: "COIN",
            paymentMethod: "COIN",
            featureKey: coinFeatureKey,
            chargedCoins: requiredCoins,
            idempotent: true,
          },
          premiumAccessToken: null,
          accessGrant: {
            ok: true,
            accessType: "coin",
            accessMethod: "COIN",
            paymentMethod: "COIN",
            featureKey: coinFeatureKey,
            sessionId: reportSessionId || undefined,
            requestId,
            purchaseId: coinPurchaseId,
            evidenceId: String(existingCoinSpend._id || ""),
            reportId: reportId || undefined,
            profileId: profileId || undefined,
            paidAt: existingCoinSpend?.metadata?.paidAt || new Date().toISOString(),
          },
          balance: currentBalance,
          membershipCreditBalance: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
          monthlyCredits: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
          user: {
            id: String(authCheck.auth.userId || ""),
            points: currentBalance,
            profileSubscription: currentUser?.profileSubscription || null,
          },
        }, "이미 처리된 원화 결제 요청입니다.");
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: authCheck.auth.userId,
        points: { $gte: requiredCoins },
        ...(coinPurchaseId ? { recentConsumeRequestIds: { $ne: coinPurchaseId } } : {}),
      },
      {
        $inc: { points: -requiredCoins },
        ...(coinPurchaseId ? { $addToSet: { recentConsumeRequestIds: coinPurchaseId } } : {}),
      },
      { returnDocument: "after", projection: { points: 1, profileSubscription: 1 } },
    ).lean();

    if (!updatedUser) {
      const currentUser = await User.findById(authCheck.auth.userId)
        .select("points profileSubscription recentConsumeRequestIds")
        .lean();
      if (coinPurchaseId && Array.isArray(currentUser?.recentConsumeRequestIds) && currentUser.recentConsumeRequestIds.includes(coinPurchaseId)) {
        return success({
          pricing,
          accessMethod: "COIN",
          paymentMode: "COIN",
          consume: {
            ok: true,
            purchaseId: coinPurchaseId,
            requestId,
            transactionType: "coin",
            accessType: "coin",
            accessMethod: "COIN",
            paymentMethod: "COIN",
            featureKey: coinFeatureKey,
            chargedCoins: requiredCoins,
            idempotent: true,
          },
          accessGrant: null,
          balance: Math.max(0, Math.floor(Number(currentUser?.points || 0))),
          membershipCreditBalance: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
          monthlyCredits: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
          user: {
            id: String(authCheck.auth.userId || ""),
            points: Math.max(0, Math.floor(Number(currentUser?.points || 0))),
            profileSubscription: currentUser?.profileSubscription || null,
          },
        }, "이미 처리된 원화 결제 요청입니다.");
      }
      return failure(402, "INSUFFICIENT_COINS", "결제 가능 금액이 부족합니다. 원화 단건 결제를 이용해 주세요.", undefined, {
        pricing,
        requiredCoins,
        currentCoins: Math.max(0, Math.floor(Number(currentUser?.points || 0))),
        membershipCreditBalance: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
        monthlyCredits: Math.max(0, Math.floor(Number(currentUser?.profileSubscription?.membershipCreditBalance || 0))),
        canUseByCard: true,
      });
    }

    const coinBalance = Math.max(0, Math.floor(Number(updatedUser?.points || 0)));
    const monthlyCredits = Math.max(0, Math.floor(Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0)));
    let coinHistory = null;
    try {
      coinHistory = await PointHistory.create({
        userId: authCheck.auth.userId,
        kind: "deduct",
        delta: -requiredCoins,
        balanceAfter: coinBalance,
        reason: String(pricing?.reason || "coin_access"),
        featureKey: coinFeatureKey,
        metadata: {
          accessType: "coin",
          accessMethod: "COIN",
          paymentMethod: "COIN",
          transactionType: "coin",
          ...buildProfileCardMutationMetadata(body),
          requestId,
          purchaseId: coinPurchaseId,
          idempotencyKey: String(body?.idempotencyKey || coinPurchaseId || "").trim().slice(0, 160),
          orderId: String(body?.orderId || coinPurchaseId || "").trim().slice(0, 160),
          reportId,
          sessionId: reportSessionId,
          reportSessionId,
          profileId,
          selectedProfileId: profileId,
          featureKey: coinFeatureKey,
          coinPrice: requiredCoins,
          chargedCoins: requiredCoins,
          paidAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      await User.findByIdAndUpdate(authCheck.auth.userId, {
        $inc: { points: requiredCoins },
        ...(coinPurchaseId ? { $pull: { recentConsumeRequestIds: coinPurchaseId } } : {}),
      }).catch(() => {});
      throw error;
    }

    let accessGrant = null;
    let unlockEntitlement = null;
    if (persistProfileUnlockEntitlement) {
      try {
        unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
          userId: authCheck.auth.userId,
          profileId,
          featureKey: coinFeatureKey,
          contentKey: body?.contentKey,
          source: CONTENT_ENTITLEMENT_SOURCES.COIN,
          paymentId: String(coinHistory?._id || coinPurchaseId || requestId),
          orderId: coinPurchaseId || requestId,
          coinAmount: requiredCoins,
        });
      } catch (error) {
        await User.findByIdAndUpdate(authCheck.auth.userId, {
          $inc: { points: requiredCoins },
          ...(coinPurchaseId ? { $pull: { recentConsumeRequestIds: coinPurchaseId } } : {}),
        }).catch(() => {});
        await PointHistory.updateOne(
          { _id: coinHistory?._id, userId: authCheck.auth.userId },
          {
            $set: {
              "metadata.coinRefundedForUnlockFailure": true,
              "metadata.coinRefundedAt": new Date(),
              "metadata.unlockFailureMessage": String(error?.message || "").slice(0, 500),
            },
          },
        ).catch(() => {});
        return failure(
          error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
          "UNLOCK_ENTITLEMENT_SAVE_FAILED",
          "Unlock entitlement could not be saved after coin consumption.",
          String(error?.message || ""),
          {
            pricing,
            pendingUnlock: true,
            settlement: {
              source: "COIN",
              transactionId: String(coinHistory?._id || ""),
              requestId,
              profileId: profileId || undefined,
            },
          },
        );
      }
    }

    accessGrant = {
      ok: true,
      accessType: "coin",
      accessMethod: "COIN",
      paymentMethod: "COIN",
      featureKey: coinFeatureKey,
      sessionId: reportSessionId || undefined,
      requestId,
      purchaseId: coinPurchaseId || String(coinHistory?._id || ""),
      evidenceId: String(unlockEntitlement?._id || coinHistory?._id || ""),
      reportId: reportId || undefined,
      profileId: profileId || undefined,
      paidAt: new Date().toISOString(),
    };

    const coinSuccessPayload = {
      pricing,
      accessMethod: "COIN",
      paymentMode: "COIN",
      consume: {
        ok: true,
        transactionId: String(coinHistory?._id || ""),
        purchaseId: coinPurchaseId || String(coinHistory?._id || ""),
        requestId,
        transactionType: "coin",
        accessType: "coin",
        accessMethod: "COIN",
        paymentMethod: "COIN",
        featureKey: coinFeatureKey,
        chargedCoins: requiredCoins,
        idempotent: false,
      },
      premiumAccessToken: null,
      accessGrant,
      balance: coinBalance,
      membershipCreditBalance: monthlyCredits,
      monthlyCredits,
      monthlyCreditsAsCoins: monthlyCredits / MEMBERSHIP_CREDIT_PER_COIN,
      user: {
        id: String(authCheck.auth.userId || ""),
        points: coinBalance,
        profileSubscription: updatedUser?.profileSubscription || null,
      },
    };

    if (isPdfGenerationService || isUnlockPaidFeatureKey(coinFeatureKey)) {
      return await successWithPremiumAccess(env, authCheck.auth.userId, coinSuccessPayload, `${calculateKrwAmountFromCoins(Number(pricing?.coinPrice || pricing?.cost || 0)).toLocaleString("ko-KR")}원 결제로 콘텐츠 이용 권한을 발급했습니다.`);
    }

    return success(coinSuccessPayload, `${calculateKrwAmountFromCoins(Number(pricing?.coinPrice || pricing?.cost || 0)).toLocaleString("ko-KR")}원 결제로 콘텐츠 이용 권한을 발급했습니다.`);
  }

  const delegatedBody = {
    cost: Number(pricing.cost),
    reason: String(pricing.reason),
    featureKey: String(pricing.featureKey),
    requestId,
    forceDeduct,
    categoryKey: pricing.categoryKey,
    subFeatureKey: pricing.subFeatureKey,
    payloadHash: String(body?.payloadHash || "").trim().slice(0, 120),
    reportId: reportId || undefined,
    sessionId: reportSessionId || undefined,
    reportSessionId: reportSessionId || undefined,
    profileId: profileId || undefined,
    selectedProfileId: profileId || undefined,
  };

  if (body?.productId) {
    delegatedBody.productId = String(body.productId).trim().toLowerCase();
  }

  let delegatedResponse = null;
  let payload = {};
  try {
    const consumeResult = await consumeCoinWithRetry(request, env, delegatedBody);
    delegatedResponse = consumeResult.delegatedResponse;
    payload = consumeResult.payload;
  } catch (error) {
    logBillingRouteError("coin-gate-consume", error, request, {
      featureKey: String(pricing?.featureKey || ""),
      requestId,
    });
    return failure(
      500,
      "SERVER_ERROR",
      "이용권 확인 중 오류가 발생했습니다.",
      String(error?.message || ""),
      {},
      buildBillingErrorDetails("coin-gate-consume", error, { featureKey: String(pricing?.featureKey || "") }),
    );
  }

  if (!delegatedResponse.ok) {
    const mapped = mapCoinGateFailure(delegatedResponse.status, payload);
    logCoinGateResult({
      status: "failed",
      requestId,
      featureKey: String(pricing?.featureKey || ""),
      responseStatus: Number(delegatedResponse.status || 0),
      code: mapped.code,
      delegatedCode: String(toCode(payload) || ""),
      hasPremiumAccessToken: Boolean(String(payload?.premiumAccessToken || "").trim()),
      transactionId: String(payload?.transactionId || ""),
    });
    return failure(mapped.status, mapped.code, mapped.message, mapped.debugMessage);
  }

  const balance = Number(payload?.user?.points ?? payload?.balance ?? 0);
  const premiumAccessToken = String(
    payload?.premiumAccessToken
    || payload?.data?.premiumAccessToken
    || "",
  ).trim();
  const responseHeaders = new Headers();
  const delegatedCookie = String(delegatedResponse.headers?.get("set-cookie") || "").trim();
  if (delegatedCookie) responseHeaders.append("Set-Cookie", delegatedCookie);
  if (premiumAccessToken) {
    responseHeaders.append("Set-Cookie", buildPremiumAccessCookie(premiumAccessToken, isProductionRuntime(env)));
  }

  logCoinGateResult({
    status: "ok",
    requestId,
    featureKey: String(pricing?.featureKey || ""),
    responseStatus: Number(delegatedResponse.status || 200),
    hasPremiumAccessToken: Boolean(premiumAccessToken),
    transactionId: String(payload?.transactionId || ""),
    chargedCoins: Number(payload?.chargedCoins || payload?.delta || payload?.deductedAmount || 0),
    balance: Number.isFinite(balance) ? balance : null,
  });

  const requestedFeatureKey = String(body?.featureKey || pricing?.featureKey || "").trim() || String(pricing?.featureKey || "").trim();
  const purchaseId = String(payload?.transactionId || payload?.data?.transactionId || "").trim();
  const requestedFeatureIsPdfGeneration = canGeneratePaidPdf({ featureKey: requestedFeatureKey });
  const accessGrant = requestedFeatureKey && purchaseId
    ? {
      ok: true,
      featureKey: requestedFeatureKey,
      sessionId: reportSessionId || undefined,
      purchaseId: purchaseId || undefined,
      requestId: requestId || undefined,
      reportId: reportId || undefined,
      profileId: profileId || undefined,
      paidAt: new Date().toISOString(),
    }
    : null;

  let unlockEntitlement = null;
  if (!requestedFeatureIsPdfGeneration) {
    try {
      unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
        userId: authCheck.auth.userId,
        profileId,
        featureKey: requestedFeatureKey,
        contentKey: body?.contentKey,
        source: CONTENT_ENTITLEMENT_SOURCES.COIN,
        paymentId: purchaseId,
        orderId: requestId,
        coinAmount: Number(payload?.chargedCoins || payload?.delta || payload?.deductedAmount || pricing?.coinPrice || pricing?.cost || 0),
      });
    } catch (error) {
      return failure(
        error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
        "UNLOCK_ENTITLEMENT_SAVE_FAILED",
        "Unlock entitlement could not be saved after coin consumption.",
        String(error?.message || ""),
        {
          pricing,
          pendingUnlock: true,
          settlement: {
            source: "COIN",
            transactionId: purchaseId || "",
            requestId,
            profileId: profileId || undefined,
          },
        },
      );
    }
  }
  if (accessGrant && unlockEntitlement?._id) {
    accessGrant.evidenceId = String(unlockEntitlement._id || "");
  }
  if (accessGrant) {
    accessGrant.accessType = "coin";
    accessGrant.accessMethod = "COIN";
    accessGrant.paymentMethod = "COIN";
  }

  const delegatedSuccessPayload = {
    pricing,
    accessMethod: "COIN",
    paymentMode: "COIN",
    consume: {
      ...(payload && typeof payload === "object" ? payload : {}),
      transactionId: purchaseId || payload?.transactionId || payload?.data?.transactionId || undefined,
      featureKey: requestedFeatureKey,
      accessType: "coin",
      accessMethod: "COIN",
      paymentMethod: "COIN",
      transactionType: "coin",
    },
    premiumAccessToken: premiumAccessToken || null,
    accessGrant,
    balance: Number.isFinite(balance) ? balance : null,
    user: payload?.user || null,
  };

  if (
    requestedFeatureIsPdfGeneration
    || isUnlockPaidFeatureKey(requestedFeatureKey)
    || resolvePremiumAccessReportType(requestedFeatureKey, String(pricing?.reason || ""))
  ) {
    return await successWithPremiumAccess(
      env,
      authCheck.auth.userId,
      delegatedSuccessPayload,
      toMessage(payload, "이용권 확인이 완료되었습니다."),
      { headers: responseHeaders },
    );
  }

  return success(delegatedSuccessPayload, toMessage(payload, "이용권 확인이 완료되었습니다."), {
    headers: responseHeaders,
  });
}

async function handleFeatures(request) {
  const url = new URL(request.url);
  const categoryKey = String(url.searchParams.get("categoryKey") || "").trim();
  const subFeatureKey = String(url.searchParams.get("subFeatureKey") || "").trim();
  const featureKey = String(url.searchParams.get("featureKey") || "").trim();
  const reason = String(url.searchParams.get("reason") || "").trim();

  if (categoryKey || subFeatureKey || featureKey || reason) {
    const resolved = getBillingFeaturePricing({ categoryKey, subFeatureKey, featureKey, reason });
    if (!resolved.ok) {
      return failure(404, "PRICE_NOT_FOUND", resolved.message || "가격 정보를 찾을 수 없습니다.");
    }

    return success({ pricing: resolved.pricing, source: resolved.source }, "기능 가격 정보를 조회했습니다.");
  }

  return success(listBillingFeatures(), "서버 기능 가격표를 조회했습니다.");
}

async function handleBalance(request, env) {
  let delegatedResponse = null;
  let payload = {};
  try {
    const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/balance", "GET");
    delegatedResponse = await handleFortuneRoutes(delegatedRequest, env);
    payload = await readPayloadSafe(delegatedResponse);
  } catch (error) {
    logBillingRouteError("balance-delegate-fortune", error, request);
    return success({
      authenticated: false,
      balance: 0,
      coins: 0,
      monthlyCredits: 0,
      monthlyCreditsAsCoins: 0,
      user: null,
      unlockedFeatures: [],
      unlockMap: {},
      degraded: true,
      error: {
        code: "SERVER_ERROR",
        message: "서버 처리 중 오류가 발생했습니다.",
        errorDetails: buildBillingErrorDetails("balance-delegate-fortune", error),
      },
    }, "잔액 정보를 일시적으로 불러오지 못해 기본값으로 응답합니다.");
  }

  if (!delegatedResponse.ok) {
    const mapped = mapCoinGateFailure(delegatedResponse.status, payload);
    const authRequired = mapped.status === 401 || mapped.code === "AUTH_REQUIRED";

    if (authRequired) {
      return success({
        authenticated: false,
        balance: 0,
        user: null,
        unlockedFeatures: [],
        unlockMap: {},
        degraded: false,
      }, "로그인이 필요하여 기본 잔액 상태로 응답합니다.");
    }

    return success({
      authenticated: false,
      balance: 0,
      user: null,
      unlockedFeatures: [],
      unlockMap: {},
      degraded: true,
      error: {
        code: mapped.code,
        message: mapped.message,
      },
    }, "잔액 정보를 일시적으로 불러오지 못해 기본값으로 응답합니다.");
  }

  const balance = Number(payload?.user?.points ?? payload?.balance ?? 0);
  let membershipCreditBalance = 0;
  let membership = null;
  let scopedProfileId = "";
  let scopedUnlocks = null;
  let userScopedUnlockedFeatures = [];
  let userScopedUnlockMap = {};
  try {
    const auth = await getOptionalUserFromRequest(request, env);
    if (auth?.userId) {
      await connectDb(env);
      await seedMembershipCreditForExistingPassIfNeeded(auth.userId);
      const user = await User.findById(auth.userId)
        .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt points destinyProfilesCurrentId unlockedFeatures")
        .lean();
      const sub = user?.profileSubscription || {};
      const entitlement = normalizeHoneyPassEntitlement(user || {});
      scopedProfileId = cleanProfileId(user?.destinyProfilesCurrentId);
      scopedUnlocks = await resolveProfileScopedUnlocks(auth.userId, scopedProfileId);
      userScopedUnlockedFeatures = Array.isArray(user?.unlockedFeatures)
        ? user.unlockedFeatures
          .map((key) => String(key || "").trim())
          .filter((key) => key && isUnlockPaidFeatureKey(key) && !resolveSajuProfileUnlockContentKey(key) && key !== LOTTO_RITUAL_REPORT_FEATURE_KEY)
        : [];
      userScopedUnlockMap = userScopedUnlockedFeatures.reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {});
      membershipCreditBalance = Number(sub?.membershipCreditBalance || 0);
      membership = {
        tier: entitlement.isActive ? entitlement.tier : String(sub?.tier || "free"),
        passTier: entitlement.passTier || null,
        passLabel: entitlement.passLabel || entitlement.label,
        passColorTone: entitlement.passColorTone || null,
        label: entitlement.label,
        isActive: entitlement.isActive,
        freeLimit: entitlement.maxCoveredCoin,
        profileLimit: entitlement.maxProfiles,
        source: entitlement.source,
        expiresAt: entitlement.expiresAt || sub?.expiresAt || null,
        membershipCreditBalance,
        membershipCreditGranted: Number(sub?.membershipCreditGranted || 0),
        membershipCreditUsed: Number(sub?.membershipCreditUsed || 0),
        legacyCoinCreditSeeded: Boolean(sub?.legacyCoinCreditSeeded),
        legacyCoinCreditSeededPoints: Number(sub?.legacyCoinCreditSeededPoints || 0),
        legacyCoinBalance: Number(user?.points || 0),
      };
    }
  } catch (_) {
    membership = null;
  }

  const mergedUnlockedFeatures = Array.from(new Set([
    ...userScopedUnlockedFeatures,
    ...(scopedUnlocks ? scopedUnlocks.unlockedFeatures : []),
  ]));
  const mergedUnlockMap = {
    ...userScopedUnlockMap,
    ...(scopedUnlocks ? scopedUnlocks.unlockMap : {}),
  };
  const responseUser = payload?.user && typeof payload.user === "object"
    ? { ...payload.user, unlockedFeatures: mergedUnlockedFeatures }
    : null;

  return success({
    authenticated: Boolean(payload?.authenticated),
    balance: Number.isFinite(balance) ? balance : 0,
    legacyCoinBalance: Number.isFinite(balance) ? balance : 0,
    coins: Number.isFinite(balance) ? balance : 0,
    membershipCreditBalance,
    monthlyCredits: Math.max(0, Math.floor(Number(membershipCreditBalance || 0))),
    monthlyCreditsAsCoins: Math.max(0, Math.floor(Number(membershipCreditBalance || 0))) / MEMBERSHIP_CREDIT_PER_COIN,
    membership,
    currentProfileId: scopedProfileId || undefined,
    user: responseUser,
    unlockedFeatures: mergedUnlockedFeatures,
    unlockMap: mergedUnlockMap,
    raw: payload,
  }, "이용 가능 혜택을 조회했습니다.");
}

async function handleBillingSnapshotBalance(request, env) {
  const snapshot = await readBillingSnapshot(request, env);
  if (snapshot?.degraded === true) {
    return failure(
      503,
      "BALANCE_SNAPSHOT_UNAVAILABLE",
      "이용권 혜택을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      undefined,
      {
        status: "error",
        degraded: true,
        membershipCreditBalance: 0,
        monthlyCredits: 0,
        monthlyCreditsAsCoins: 0,
      },
      snapshot?.error?.details,
    );
  }
  return success({
    ...snapshot,
    raw: {
      source: "billing_snapshot",
      degraded: Boolean(snapshot.degraded),
    },
  }, "Billing balance loaded.");
}

async function readSubscriptionStatusSnapshot(request, env) {
  try {
    const auth = await getOptionalUserFromRequest(request, env);
    if (auth?.userId) {
      await connectDb(env);
      const user = await User.findById(auth.userId)
        .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
        .lean();
      const entitlement = normalizeHoneyPassEntitlement(user || {});
      if (entitlement.isActive) {
        return {
          isActive: true,
          tier: entitlement.tier,
          passTier: entitlement.passTier || null,
          passLabel: entitlement.passLabel || entitlement.label,
          passColorTone: entitlement.passColorTone || null,
          freeLimit: Number(entitlement.maxCoveredCoin || 0),
          entitlement,
        };
      }
    }

    const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/profile-subscription/status", "GET");
    const delegatedResponse = await handleFortuneRoutes(delegatedRequest, env);
    if (!delegatedResponse.ok) {
      return { isActive: false, tier: "free", passTier: null, freeLimit: 0 };
    }
    const payload = await readPayloadSafe(delegatedResponse);
    const subscription = payload?.subscription && typeof payload.subscription === "object" ? payload.subscription : null;
    return {
      isActive: Boolean(payload?.isActive),
      isSubscribed: Boolean(payload?.isSubscribed || subscription?.isSubscribed),
      active: payload?.active,
      enabled: payload?.enabled,
      valid: payload?.valid,
      registered: payload?.registered,
      tier: String(payload?.tier || subscription?.tier || payload?.plan || subscription?.plan || payload?.passTier || subscription?.passTier || "free"),
      plan: payload?.plan || subscription?.plan || null,
      passTier: payload?.passTier || subscription?.passTier || null,
      status: payload?.status || subscription?.status || null,
      subscriptionStatus: payload?.subscriptionStatus || subscription?.subscriptionStatus || null,
      membershipStatus: payload?.membershipStatus || subscription?.membershipStatus || null,
      expiresAt: payload?.expiresAt || subscription?.expiresAt || null,
      freeLimit: Number(payload?.freeLimit || subscription?.freeLimit || 0),
      source: payload?.source || subscription?.source || "profile_subscription_status",
      subscription,
    };
  } catch (_) {
    return { isActive: false, tier: "free", passTier: null, freeLimit: 0 };
  }
}

function buildBillingSubscriptionSnapshot(user = {}) {
  const sub = user?.profileSubscription || {};
  const entitlement = normalizeHoneyPassEntitlement(user || {});
  return {
    isActive: entitlement.isActive,
    isSubscribed: Boolean(user?.isSubscribed || sub?.isSubscribed || entitlement.isActive),
    active: entitlement.isActive,
    enabled: entitlement.isActive,
    valid: entitlement.isActive,
    registered: entitlement.isActive,
    tier: entitlement.isActive ? entitlement.tier : String(sub?.tier || "free"),
    plan: user?.plan || sub?.plan || null,
    passTier: entitlement.passTier || sub?.passTier || null,
    status: user?.status || user?.subscriptionStatus || user?.membershipStatus || sub?.status || null,
    subscriptionStatus: user?.subscriptionStatus || sub?.subscriptionStatus || null,
    membershipStatus: user?.membershipStatus || sub?.membershipStatus || null,
    expiresAt: entitlement.expiresAt || sub?.expiresAt || user?.expiresAt || null,
    freeLimit: Number(entitlement.maxCoveredCoin || 0),
    source: entitlement.source || "billing_snapshot",
    subscription: sub,
    entitlement,
  };
}

function buildBillingSnapshotUser(auth, user, balance, unlockedFeatures, monthlyCredits, membership) {
  return {
    id: String(auth?.userId || user?._id || ""),
    points: Number(balance || 0),
    monthlyCredits,
    membershipCreditBalance: monthlyCredits,
    profileSubscriptionTier: membership?.tier || "free",
    subscriptionTier: membership?.tier || "free",
    profileSubscription: user?.profileSubscription || null,
    unlockedFeatures,
  };
}

function buildMembershipPassFromBillingSnapshot(snapshot = {}) {
  if (!snapshot?.authenticated) return null;
  const subscription = snapshot.subscription && typeof snapshot.subscription === "object" ? snapshot.subscription : {};
  const subscriptionRecord = subscription.subscription && typeof subscription.subscription === "object" ? subscription.subscription : {};
  const profileSubscription = {
    ...subscriptionRecord,
    membershipCreditBalance: Math.max(0, Math.floor(Number(snapshot.membershipCreditBalance || 0))),
  };
  const entitlement = subscription.entitlement && typeof subscription.entitlement === "object"
    ? subscription.entitlement
    : normalizeHoneyPassEntitlement({ profileSubscription });
  return {
    isActive: Boolean(subscription.isActive),
    tier: String(subscription.tier || entitlement.tier || "free"),
    passTier: subscription.passTier || entitlement.passTier || null,
    freeLimit: Number(subscription.freeLimit || entitlement.maxCoveredCoin || 0),
    profileSubscription,
    entitlement,
  };
}

async function readBillingSnapshot(request, env, options = {}) {
  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth?.userId) {
    return {
      authenticated: false,
      authUserId: "",
      balance: 0,
      membershipCreditBalance: 0,
      monthlyCredits: 0,
      monthlyCreditsAsCoins: 0,
      membership: null,
      subscription: { isActive: false, tier: "free", passTier: null, freeLimit: 0 },
      currentProfileId: "",
      user: null,
      unlockedFeatures: [],
      unlockMap: {},
      degraded: false,
    };
  }

  try {
    await connectDb(env);
    const seededUser = options.seedLegacyCredit === false
      ? null
      : await seedMembershipCreditForExistingPassIfNeeded(auth.userId);
    const user = await User.findById(auth.userId)
      .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt points destinyProfilesCurrentId unlockedFeatures")
      .lean();
    const effectiveUser = seededUser ? { ...(user || {}), ...seededUser } : user;
    const sub = effectiveUser?.profileSubscription || {};
    const entitlement = normalizeHoneyPassEntitlement(effectiveUser || {});
    const scopedProfileId = cleanProfileId(effectiveUser?.destinyProfilesCurrentId);
    const scopedUnlocks = await resolveProfileScopedUnlocks(auth.userId, scopedProfileId);
    const userScopedUnlockedFeatures = Array.isArray(effectiveUser?.unlockedFeatures)
      ? effectiveUser.unlockedFeatures
        .map((key) => String(key || "").trim())
        .filter((key) => key && isUnlockPaidFeatureKey(key) && !resolveSajuProfileUnlockContentKey(key) && key !== LOTTO_RITUAL_REPORT_FEATURE_KEY)
      : [];
    const unlockedFeatures = Array.from(new Set([
      ...userScopedUnlockedFeatures,
      ...scopedUnlocks.unlockedFeatures,
    ]));
    const unlockMap = {
      ...userScopedUnlockedFeatures.reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {}),
      ...scopedUnlocks.unlockMap,
    };
    const balance = Number(effectiveUser?.points || 0);
    const membershipCreditBalance = Math.max(0, Math.floor(Number(sub?.membershipCreditBalance || 0)));
    const membership = {
      tier: entitlement.isActive ? entitlement.tier : String(sub?.tier || "free"),
      passTier: entitlement.passTier || null,
      passLabel: entitlement.passLabel || entitlement.label,
      passColorTone: entitlement.passColorTone || null,
      label: entitlement.label,
      isActive: entitlement.isActive,
      freeLimit: entitlement.maxCoveredCoin,
      profileLimit: entitlement.maxProfiles,
      source: entitlement.source,
      expiresAt: entitlement.expiresAt || sub?.expiresAt || null,
      membershipCreditBalance,
      membershipCreditGranted: Number(sub?.membershipCreditGranted || 0),
      membershipCreditUsed: Number(sub?.membershipCreditUsed || 0),
      legacyCoinCreditSeeded: Boolean(sub?.legacyCoinCreditSeeded),
      legacyCoinCreditSeededPoints: Number(sub?.legacyCoinCreditSeededPoints || 0),
      legacyCoinBalance: balance,
    };
    const subscription = buildBillingSubscriptionSnapshot(effectiveUser || {});

    return {
      authenticated: true,
      authUserId: String(auth.userId || ""),
      balance: Number.isFinite(balance) ? balance : 0,
      legacyCoinBalance: Number.isFinite(balance) ? balance : 0,
      coins: Number.isFinite(balance) ? balance : 0,
      membershipCreditBalance,
      monthlyCredits: membershipCreditBalance,
      monthlyCreditsAsCoins: membershipCreditBalance / MEMBERSHIP_CREDIT_PER_COIN,
      membership,
      subscription,
      currentProfileId: scopedProfileId || undefined,
      user: buildBillingSnapshotUser(auth, effectiveUser, balance, unlockedFeatures, membershipCreditBalance, membership),
      unlockedFeatures,
      unlockMap,
      degraded: false,
    };
  } catch (error) {
    logBillingRouteError("billing-snapshot", error, request);
    const fallbackBalance = Number.isFinite(Number(auth?.points)) ? Number(auth.points) : 0;
    return {
      authenticated: true,
      authUserId: String(auth.userId || ""),
      balance: fallbackBalance,
      legacyCoinBalance: fallbackBalance,
      coins: fallbackBalance,
      membershipCreditBalance: 0,
      monthlyCredits: 0,
      monthlyCreditsAsCoins: 0,
      membership: null,
      subscription: { isActive: false, tier: "free", passTier: null, freeLimit: 0 },
      currentProfileId: undefined,
      user: {
        id: String(auth.userId || ""),
        points: fallbackBalance,
        monthlyCredits: 0,
        membershipCreditBalance: 0,
        unlockedFeatures: [],
      },
      unlockedFeatures: [],
      unlockMap: {},
      degraded: true,
      error: {
        code: "DB_FALLBACK",
        message: "Billing snapshot fallback applied.",
        errorDetails: buildBillingErrorDetails("billing-snapshot", error),
      },
    };
  }
}

async function handleUnlockStatus(request, env) {
  const url = new URL(request.url);
  const categoryKey = String(url.searchParams.get("categoryKey") || "").trim();
  const subFeatureKey = String(url.searchParams.get("subFeatureKey") || "").trim();
  const featureKey = String(url.searchParams.get("featureKey") || "").trim();
  const reason = String(url.searchParams.get("reason") || "").trim();

  const pricingResult = getBillingFeaturePricing({ categoryKey, subFeatureKey, featureKey, reason });
  if (!pricingResult.ok) {
    return failure(404, "PRICE_NOT_FOUND", pricingResult.message || "가격 정보를 찾을 수 없습니다.");
  }

  const data = await readBillingSnapshot(request, env, { seedLegacyCredit: false });
  if (data?.degraded === true) {
    return failure(
      503,
      "BALANCE_SNAPSHOT_UNAVAILABLE",
      "이용권 혜택을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      undefined,
      {
        status: "error",
        degraded: true,
        membershipCreditBalance: 0,
        monthlyCredits: 0,
        monthlyCreditsAsCoins: 0,
      },
      data?.error?.errorDetails || data?.error?.details,
    );
  }
  const unlockMap = data.unlockMap && typeof data.unlockMap === "object" ? data.unlockMap : {};
  let pricing = pricingResult.pricing;
  let unlocked = Boolean(unlockMap[pricing.featureKey]);
  const currentBalance = Number(data.balance || 0);
  const subscription = data.subscription || { isActive: false, tier: "free", passTier: null, freeLimit: 0 };
  const subscriptionEntitlement = {
    isActive: subscription.isActive,
    tier: subscription.tier,
    passTier: subscription.passTier,
    maxCoveredCoin: subscription.freeLimit,
    expiresAt: subscription.entitlement?.expiresAt || null,
  };
  pricing = applyPdfPassDiscountToPricing(pricing, subscriptionEntitlement);
  let paymentDecision = buildPassPaymentDecision(subscriptionEntitlement, pricing, {
    membershipCreditBalance: Number(data.membershipCreditBalance ?? data.membership?.membershipCreditBalance ?? 0),
  });

  const subscriptionPass = buildMembershipPassFromBillingSnapshot(data);
  const accessDecision = await resolvePaidContentAccess(env, {
    userId: String(data.authUserId || ""),
    profileId: cleanProfileId(url.searchParams.get("profileId") || data.currentProfileId || ""),
    pricing,
    requestId: String(url.searchParams.get("requestId") || "").trim(),
    allowPassAutoUnlock: shouldPersistProfileUnlockEntitlement(pricing),
    subscriptionPass,
    body: {
      actionType: String(url.searchParams.get("actionType") || "").trim(),
    },
  });
  if (accessDecision.paymentOptions) paymentDecision = accessDecision.paymentOptions;
  const passStatusCovered = accessDecision.reason === "pass_covered"
    || (!shouldPersistProfileUnlockEntitlement(pricing) && paymentDecision.canUseByPass === true);
  const responseAccessDecision = passStatusCovered && !accessDecision.accessGranted
    ? {
      ...accessDecision,
      accessGranted: true,
      reason: "pass_covered",
      shouldOpenPaymentSelector: false,
    }
    : accessDecision;
  if (accessDecision.accessGranted) {
    unlocked = true;
    if (pricing.featureKey) unlockMap[pricing.featureKey] = true;
  }

  const legacyAccess = buildAccessDecision({
    pricing,
    authenticated: Boolean(data.authenticated),
    balance: currentBalance,
    unlockMap,
    subscription,
  });

  return success({
    pricing,
    ...paymentDecision,
    paymentOptions: paymentDecision,
    unlocked,
    accessDecision: responseAccessDecision,
    accessReason: accessDecision.reason === "already_unlocked"
      ? ACCESS_DECISION_REASONS.ALREADY_UNLOCKED
      : (passStatusCovered ? ACCESS_DECISION_REASONS.SUBSCRIPTION_ACTIVE : legacyAccess.reason),
    subscriptionTier: subscription.tier,
    freeLimit: Number(subscription.freeLimit || 0),
    freeBySubscription: passStatusCovered,
    accessGateResult: accessDecision.accessGateResult || null,
    licensePass: accessDecision.accessGateResult || null,
    currentBalance,
    requiredCoins: accessDecision.accessGranted || passStatusCovered ? 0 : Number(pricing.cost || 0),
    shouldOpenPaymentSelector: passStatusCovered ? false : accessDecision.shouldOpenPaymentSelector,
    availableMethods: accessDecision.availableMethods,
    canAccess: Boolean(accessDecision.accessGranted || passStatusCovered),
  }, "기능 접근 상태를 조회했습니다.");
}

async function handleCoinGate(request, env) {
  const body = await readJson(request);
  const pricingResult = resolvePricingFromBody(body);

  if (!pricingResult.ok) {
    return failure(404, "PRICE_NOT_FOUND", pricingResult.message || "가격 정보를 찾을 수 없습니다.");
  }

  return processCoinGateFromPricing(request, env, body, pricingResult);
}

async function handleLegacyPurchaseOrCharge(request, env) {
  const body = await readJson(request);
  const pricingResult = resolvePricingFromBody(body);

  if (!pricingResult.ok) {
    return failure(
      400,
      "UNKNOWN_FEATURE_KEY",
      "결제 상품 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      undefined,
      {
        featureKey: String(body?.featureKey || "").trim() || undefined,
      },
    );
  }

  return processCoinGateFromPricing(request, env, body, pricingResult);
}

async function handleLegacyRefund(request, env) {
  const authCheck = await requireBillingAuth(request, env, { cost: 1 });
  if (!authCheck.ok) return authCheck.response;

  const body = await readJson(request);
  let delegatedResponse = null;
  let payload = {};
  try {
    const delegatedRequest = buildRoutedRequest(request, "/api/fortune/pig-coin/refund", "POST", body);
    delegatedResponse = await handleFortuneRoutes(delegatedRequest, env);
    payload = await readPayloadSafe(delegatedResponse);
  } catch (error) {
    logBillingRouteError("refund-delegate-fortune", error, request);
    return failure(
      500,
      "SERVER_ERROR",
      "환불 처리 중 서버 오류가 발생했습니다.",
      String(error?.message || ""),
      {},
      buildBillingErrorDetails("refund-delegate-fortune", error),
    );
  }

  if (!delegatedResponse.ok) {
    const mapped = mapCoinGateFailure(delegatedResponse.status, payload);
    return failure(mapped.status, mapped.code, mapped.message, mapped.debugMessage);
  }

  return success(payload, toMessage(payload, "환불 요청이 처리되었습니다."));
}

async function delegateToPayments(request, env, targetPath, body, options = {}) {
  let delegatedResponse = null;
  let payload = {};
  try {
    const delegatedRequest = buildRoutedRequest(request, targetPath, "POST", body);
    delegatedResponse = await handlePaymentRoutes(delegatedRequest, env);
    payload = await readPayloadSafe(delegatedResponse);
  } catch (error) {
    logBillingRouteError("delegate-to-payments", error, request, { targetPath });
    return failure(
      500,
      "SERVER_ERROR",
      "결제 서버 처리 중 오류가 발생했습니다.",
      String(error?.message || ""),
      {},
      buildBillingErrorDetails("delegate-to-payments", error, { targetPath }),
    );
  }

  if (!delegatedResponse.ok) {
    const rawCode = normalizeBillingErrorCode(toCode(payload));
    const code = delegatedResponse.status === 401 || delegatedResponse.status === 403
      ? "AUTH_REQUIRED"
      : (rawCode !== "SERVER_ERROR" ? rawCode : (String(targetPath || "").includes("/confirm") ? "PAYMENT_VERIFICATION_FAILED" : "SERVER_ERROR"));
    return failure(
      delegatedResponse.status,
      code,
      code === "PAYMENT_VERIFICATION_FAILED"
        ? "결제 검증에 실패했습니다."
        : (delegatedResponse.status >= 500 ? "서버 결제 처리 중 오류가 발생했습니다." : "결제 요청이 거부되었습니다."),
      toMessage(payload, "결제 요청 실패"),
    );
  }

  if (options?.premiumAccess === true && options?.authUserId && options?.pricing) {
    const pricing = options.pricing;
    const accessGrant = payload?.accessGrant && typeof payload.accessGrant === "object" ? payload.accessGrant : null;
    const payment = payload?.payment && typeof payload.payment === "object" ? payload.payment : null;
    const transactionId = String(
      accessGrant?.evidenceId
        || accessGrant?.purchaseId
        || payment?._id
        || payment?.id
        || payment?.merchantUid
        || body?.merchantUid
        || body?.merchant_uid
        || body?.paymentId
        || body?.impUid
        || "",
    ).trim();
    return successWithPremiumAccess(env, options.authUserId, {
      pricing,
      ...payload,
      consume: {
        ok: true,
        featureKey: String(pricing.featureKey || ""),
        transactionId,
        chargedCoins: Number(pricing.coinPrice || pricing.cost || body?.coinPrice || 0),
        accessType: String(accessGrant?.accessType || "single_purchase"),
      },
      accessGrant: accessGrant || {
        ok: true,
        accessType: "single_purchase",
        featureKey: String(pricing.featureKey || ""),
        requestId: String(body?.requestId || ""),
        evidenceId: transactionId || undefined,
      },
    }, toMessage(payload, "결제 확인이 완료되었습니다."));
  }

  return success(payload, toMessage(payload, "결제 요청이 성공했습니다."));
}

async function grantPassFreeAccessBeforeCardIfAvailable(request, env, body = {}) {
  const pricingResult = resolvePricingFromBody(body);
  if (!pricingResult?.ok) return null;

  const authCheck = await requireBillingAuth(request, env, pricingResult.pricing);
  if (!authCheck.ok || !authCheck?.auth?.userId) return null;

  let pricing = pricingResult.pricing;
  const isPdfGenerationService = canGeneratePaidPdf(pricing);
  const requestId = resolveRequestId(request, body);
  const reportId = String(body?.reportId || body?.accessGrant?.reportId || "").trim();
  const reportSessionId = String(
    body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || (reportId ? `love-book:${reportId}` : requestId),
  ).trim();
  if (authCheck.adminMode) {
    const adminAuthUserId = String(authCheck?.auth?.userId || ADMIN_TEST_USER_ID);
    const adminFeatureKey = String(pricing?.featureKey || "").trim();
    const persistProfileUnlockEntitlement = shouldPersistProfileUnlockEntitlement(pricing);
    const adminPurchaseId = String(requestId || `admin:${adminFeatureKey || "paid-service"}:${Date.now().toString(36)}`).trim();
    const adminProfileId = cleanProfileId(body?.profileId || body?.selectedProfileId || body?.profile?.profileId || body?.profile?.id);
    const adminPaymentDecision = buildPassPaymentDecision(null, pricing, null);
    return successWithPremiumAccess(env, adminAuthUserId, {
      pricing,
      ...adminPaymentDecision,
      paymentOptions: adminPaymentDecision,
      adminBypass: true,
      adminTestMode: true,
      paymentMode: "admin_bypass",
      accessMethod: "ADMIN_TEST",
      charged: 0,
      consume: {
        ok: true,
        transactionId: adminPurchaseId,
        transactionType: isPdfGenerationService ? "admin_pdf_generation" : "admin_paid_service",
        accessType: "admin_test",
        accessMethod: "ADMIN_TEST",
        paymentMethod: "ADMIN_TEST",
        requestId,
        featureKey: adminFeatureKey,
        coinPrice: Number(pricing.coinPrice || pricing.cost || 0),
        chargedCoins: 0,
        membershipCreditCost: 0,
        adminBypass: true,
        adminTestMode: true,
        paymentMode: "admin_bypass",
      },
      accessGrant: {
        ok: true,
        accessType: "admin_test",
        accessMethod: "ADMIN_TEST",
        paymentMode: "admin_bypass",
        adminTestMode: true,
        adminBypass: true,
        featureKey: adminFeatureKey,
        sessionId: reportSessionId || undefined,
        requestId,
        purchaseId: adminPurchaseId,
        evidenceId: adminPurchaseId,
        reportId: reportId || undefined,
        profileId: adminProfileId || undefined,
        paidAt: new Date().toISOString(),
      },
      balance: null,
      user: {
        id: adminAuthUserId,
        role: "admin",
        adminMode: true,
      },
      unlockedFeatures: adminFeatureKey && persistProfileUnlockEntitlement ? [adminFeatureKey] : [],
      unlockMap: adminFeatureKey && persistProfileUnlockEntitlement ? { [adminFeatureKey]: true } : {},
      freeBySubscription: false,
    }, "ADMIN_TEST_PAYMENT_BYPASS");
  }
  const profileId = await resolveBillingProfileId(authCheck.auth.userId, body, env);
  const scopedBody = profileId ? { ...body, profileId, selectedProfileId: profileId } : body;
  const persistProfileUnlockEntitlement = shouldPersistProfileUnlockEntitlement(pricing);
  if (persistProfileUnlockEntitlement) {
    const existingProfileUnlock = await findActiveSajuProfileUnlock(env, {
      userId: authCheck.auth.userId,
      profileId,
      featureKey: pricing?.featureKey,
    });
    if (existingProfileUnlock) {
      return successWithPremiumAccess(env, authCheck.auth.userId, {
        pricing,
        alreadyUnlocked: true,
        consume: {
          ok: true,
          transactionType: "unlock_entitlement",
          accessType: "already_unlocked",
          requestId,
          featureKey: String(pricing.featureKey || ""),
          profileId: profileId || undefined,
          chargedCoins: 0,
        },
        premiumAccessToken: null,
        accessGrant: {
          ok: true,
          accessType: "already_unlocked",
          featureKey: String(pricing.featureKey || ""),
          sessionId: reportSessionId || undefined,
          requestId,
          purchaseId: String(existingProfileUnlock._id || ""),
          evidenceId: String(existingProfileUnlock._id || ""),
          reportId: reportId || undefined,
          profileId: profileId || undefined,
          paidAt: existingProfileUnlock.unlockedAt ? new Date(existingProfileUnlock.unlockedAt).toISOString() : new Date().toISOString(),
        },
        unlockedFeatures: [String(pricing.featureKey || "")],
        unlockMap: { [String(pricing.featureKey || "")]: true },
        balance: null,
      }, "ALREADY_UNLOCKED");
    }
  }

  const subscriptionPass = await getMembershipPassForBillingRequest(request, env, authCheck.auth.userId);
  pricing = applyPdfPassDiscountToPricing(pricing, subscriptionPass.entitlement || {});
  const paymentDecision = buildPassPaymentDecision(
    subscriptionPass.entitlement,
    pricing,
    subscriptionPass.profileSubscription,
  );
  if (!paymentDecision.canUseByPass) return null;
  const profilePolicy = await assertProfileCardPassPolicyIfNeeded({
    userId: authCheck.auth.userId,
    profileId,
    pricing,
    body: scopedBody,
  });
  if (!profilePolicy.ok) {
    return failure(
      402,
      profilePolicy.reason === "price_exceeds_pass_limit" ? "PRICE_EXCEEDS_PASS_LIMIT" : "PROFILE_LIMIT_EXCEEDED",
      "현재 이용권 정책으로 처리할 수 없는 프로필 카드 요청입니다.",
      undefined,
      {
        pricing,
        ...paymentDecision,
        paymentOptions: {
          ...paymentDecision,
          profilePolicy: profilePolicy.policy || null,
        },
        accessGrant: null,
        balance: null,
      },
    );
  }

  const passEvidence = await recordPassAccessIfNeeded(env, authCheck.auth.userId, pricing, requestId, {
    ...scopedBody,
    reportId,
    sessionId: reportSessionId,
    reportSessionId,
  }, subscriptionPass.entitlement);
  let unlockEntitlement = null;
  if (persistProfileUnlockEntitlement) {
    try {
      unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
        userId: authCheck.auth.userId,
        profileId,
        featureKey: pricing.featureKey,
        contentKey: body?.contentKey,
        source: CONTENT_ENTITLEMENT_SOURCES.PASS,
        passId: `membership:${subscriptionPass.tier}:${requestId}`,
        coinAmount: 0,
      });
    } catch (error) {
      return failure(
        error?.code === "MISSING_PROFILE_ID" ? 403 : 500,
        "UNLOCK_ENTITLEMENT_SAVE_FAILED",
        "Unlock entitlement could not be saved.",
        String(error?.message || ""),
        {
          pricing,
          pendingUnlock: true,
          accessGrant: {
            featureKey: String(pricing.featureKey || ""),
            requestId,
            evidenceId: String(passEvidence?._id || ""),
            profileId: profileId || undefined,
          },
        },
      );
    }
  }

  return successWithPremiumAccess(env, authCheck.auth.userId, {
    pricing,
    ...paymentDecision,
    paymentOptions: paymentDecision,
    accessMethod: "PASS",
    charged: 0,
    consume: {
      ok: true,
      transactionType: "membership_pass",
      accessType: "membership_pass",
      accessMethod: "PASS",
      paymentMethod: "PASS",
      requestId,
      featureKey: String(pricing.featureKey || ""),
      coinPrice: Number(pricing.coinPrice || pricing.cost || 0),
      chargedCoins: 0,
      membershipCreditCost: 0,
    },
    premiumAccessToken: null,
    accessGrant: {
      ok: true,
      accessType: "membership_pass",
      accessMethod: "PASS",
      featureKey: String(pricing.featureKey || ""),
      sessionId: reportSessionId || undefined,
      requestId,
      purchaseId: requestId,
      evidenceId: String(unlockEntitlement?._id || passEvidence?._id || `membership:${subscriptionPass.tier}:${requestId}`),
      reportId: reportId || undefined,
      profileId: profileId || undefined,
      paidAt: new Date().toISOString(),
    },
    balance: null,
    membershipPass: {
      tier: subscriptionPass.tier,
      passTier: subscriptionPass.passTier,
      freeLimit: subscriptionPass.freeLimit,
    },
    user: {
      id: String(authCheck.auth.userId || ""),
      profileSubscription: subscriptionPass.profileSubscription || null,
    },
    freeBySubscription: true,
  }, "PASS_FREE");
}

async function buildDiscountedPdfPaymentDelegation(request, env, body = {}, pricingResult = null) {
  const resolved = pricingResult || resolvePricingFromBody(body);
  if (!resolved?.ok || !canGeneratePaidPdf(resolved.pricing)) {
    return { body, pricing: resolved?.pricing || null };
  }

  const authCheck = await requireBillingAuth(request, env, resolved.pricing);
  if (!authCheck.ok || !authCheck?.auth?.userId) return { body, pricing: resolved.pricing, response: authCheck.response };

  const subscriptionPass = await getMembershipPassForBillingRequest(request, env, authCheck.auth.userId);
  const pricing = applyPdfPassDiscountToPricing(resolved.pricing, subscriptionPass.entitlement || {});
  if (!pricing?.passDiscount || Number(pricing.coinPrice || pricing.cost || 0) <= 0) return { body, pricing };

  return {
    pricing,
    body: {
      ...body,
      cost: Number(pricing.cost || 0),
      coinPrice: Number(pricing.coinPrice || 0),
      paymentAmount: Number(pricing.amountKRW || pricing.cashPrice || 0),
      amount: Number(pricing.amountKRW || pricing.cashPrice || 0),
      membershipCreditCost: Number(pricing.membershipCreditCost || 0),
      pricingSnapshot: pricing,
      passDiscount: pricing.passDiscount,
      pdfPassDiscount: pricing.passDiscount,
    },
  };
}

async function handleCheckout(request, env) {
  const body = await readJson(request);
  const isSubscription = Boolean(body?.subscriptionTier) || String(body?.paymentType || "").toLowerCase() === "subscription";
  let delegatedBody = body;
  if (!isSubscription) {
    const passAccess = await grantPassFreeAccessBeforeCardIfAvailable(request, env, body);
    if (passAccess) return passAccess;
    const discounted = await buildDiscountedPdfPaymentDelegation(request, env, body);
    if (discounted.response) return discounted.response;
    delegatedBody = discounted.body;
  }
  const targetPath = isSubscription ? "/api/payments/subscription/prepare" : "/api/payments/prepare";
  return delegateToPayments(request, env, targetPath, delegatedBody);
}

async function handleConfirm(request, env) {
  const body = await readJson(request);
  const isSubscription = Boolean(body?.subscriptionTier) || String(body?.paymentType || "").toLowerCase() === "subscription";
  const hasPaymentVerificationPayload = Boolean(body?.impUid || body?.paymentId || body?.merchantUid || body?.merchant_uid);
  const pricingResult = !isSubscription ? resolvePricingFromBody(body) : null;
  let delegatedBody = body;
  let delegatedPricing = pricingResult?.pricing || null;
  if (!isSubscription && !hasPaymentVerificationPayload) {
    const passAccess = await grantPassFreeAccessBeforeCardIfAvailable(request, env, body);
    if (passAccess) return passAccess;
  }
  if (!isSubscription && pricingResult?.ok) {
    const discounted = await buildDiscountedPdfPaymentDelegation(request, env, body, pricingResult);
    if (discounted.response) return discounted.response;
    delegatedBody = discounted.body;
    delegatedPricing = discounted.pricing || delegatedPricing;
  }
  let premiumAccessOptions = null;
  if (!isSubscription && hasPaymentVerificationPayload && pricingResult?.ok) {
    const delegatedFeatureKey = String(delegatedPricing?.featureKey || "").trim();
    const reportType = resolvePremiumAccessReportType(delegatedFeatureKey, delegatedPricing?.reason);
    if (reportType || isUnlockPaidFeatureKey(delegatedFeatureKey)) {
      const authCheck = await requireBillingAuth(request, env, delegatedPricing);
      if (!authCheck.ok) return authCheck.response;
      premiumAccessOptions = {
        premiumAccess: true,
        authUserId: authCheck.auth.userId,
        pricing: delegatedPricing,
      };
    }
  }
  const targetPath = isSubscription ? "/api/payments/subscription/confirm" : "/api/payments/confirm";
  return delegateToPayments(request, env, targetPath, delegatedBody, premiumAccessOptions || undefined);
}

async function runServiceExecutionAction(request, env, action) {
  const authCheck = await requireBillingAuth(request, env, { cost: 1 });
  if (!authCheck.ok) return authCheck.response;

  const body = await readJson(request);
  let result;
  if (action === "start") {
    result = await startServiceExecution(env, authCheck.auth.userId, body);
  } else if (action === "heartbeat") {
    result = await heartbeatServiceExecution(env, authCheck.auth.userId, body);
  } else if (action === "complete") {
    result = await completeServiceExecution(env, authCheck.auth.userId, body);
  } else if (action === "fail") {
    result = await failServiceExecution(env, authCheck.auth.userId, body);
  } else {
    return failure(400, "INVALID_EXECUTION_ACTION", "지원하지 않는 실행 액션입니다.");
  }

  if (!result?.ok) {
    return failure(
      Number(result?.status || 400),
      "SERVICE_EXECUTION_ERROR",
      String(result?.message || "서비스 실행 상태를 처리하지 못했습니다."),
    );
  }

  return success({
    idempotent: Boolean(result.idempotent),
    execution: result.execution || null,
    settlement: result.settlement || null,
  }, "서비스 실행 상태가 반영되었습니다.", { status: Number(result.status || 200) });
}

async function getServiceExecutionStatus(request, env) {
  const authCheck = await requireBillingAuth(request, env, { cost: 1 });
  if (!authCheck.ok) return authCheck.response;

  const url = new URL(request.url);
  const result = await getServiceExecution(env, authCheck.auth.userId, {
    executionKey: String(url.searchParams.get("executionKey") || "").trim(),
    requestId: String(url.searchParams.get("requestId") || "").trim(),
    sessionId: String(url.searchParams.get("sessionId") || "").trim(),
    reportId: String(url.searchParams.get("reportId") || "").trim(),
  });

  if (!result?.ok) {
    return failure(
      Number(result?.status || 400),
      "SERVICE_EXECUTION_NOT_FOUND",
      String(result?.message || "서비스 실행 상태를 찾을 수 없습니다."),
    );
  }

  return success({ execution: result.execution || null }, "서비스 실행 상태를 조회했습니다.");
}

export async function handleBillingRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/billing");
  const trace = {
    route: "billing",
    requestPath: new URL(request.url).pathname,
    method,
  };

  try {
    if (method === "GET" && path === "/features") return await handleFeatures(request);
    if (method === "GET" && path === "/balance") return await handleBillingSnapshotBalance(request, env);
    if (method === "GET" && path === "/unlock-status") return await handleUnlockStatus(request, env);

    if (method === "POST" && path === "/coin-gate") return await handleCoinGate(request, env);
    if (method === "POST" && (path === "/purchase" || path === "/charge")) return await handleLegacyPurchaseOrCharge(request, env);
    if (method === "POST" && path === "/refund") return await handleLegacyRefund(request, env);
    if (method === "POST" && path === "/checkout") return await handleCheckout(request, env);
    if (method === "POST" && path === "/confirm") return await handleConfirm(request, env);
    if (method === "POST" && path === "/executions/start") return await runServiceExecutionAction(request, env, "start");
    if (method === "POST" && path === "/executions/heartbeat") return await runServiceExecutionAction(request, env, "heartbeat");
    if (method === "POST" && path === "/executions/complete") return await runServiceExecutionAction(request, env, "complete");
    if (method === "POST" && path === "/executions/fail") return await runServiceExecutionAction(request, env, "fail");
    if (method === "GET" && path === "/executions/status") return await getServiceExecutionStatus(request, env);
    if (method === "GET" && path === "/pdf-archive") return await handlePdfArchiveList(request, env);
    if (method === "GET" && path.startsWith("/pdf-archive/")) {
      const reportId = cleanText(path.slice("/pdf-archive/".length), 120);
      return await handlePdfArchiveDetail(request, env, reportId);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    logBillingRouteError("handle-billing-routes", error, request);
    return handleRouteError(error, { request, env, trace });
  }
}

export const __billingTestUtils = {
  ACCESS_DECISION_REASONS,
  buildAccessDecision,
  buildPaidContentAccessDecision,
  buildPassPaymentDecision,
  buildNativeArchivePdfBytes,
  requireBillingAuth,
  resolvePaidContentAccess,
};
