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
import { calculateMembershipCreditCost, MEMBERSHIP_CREDIT_PER_COIN } from "../lib/billing-policy.js";
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

const SAJU_PROFILE_UNLOCK_FEATURE_BY_CONTENT_KEY = Object.freeze(
  Object.fromEntries(
    Object.entries(SAJU_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY).map(([featureKey, contentKey]) => [contentKey, featureKey]),
  ),
);

const ACCESS_METHOD_ORDER = Object.freeze(["pass", "one_time", "monthly"]);
const LOTTO_RITUAL_REPORT_FEATURE_KEY = "fun.quantumLotto.ritualReport";
const PROFILE_CARD_MANAGE_FEATURE_KEY = "profile-card-manage";
const ADMIN_TEST_USER_ID = "flower-admin";
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
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

function resolveSajuProfileUnlockContentKey(featureKey) {
  return SAJU_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY[String(featureKey || "").trim()] || "";
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

async function upsertSajuProfileUnlockEntitlement(env, {
  userId,
  profileId,
  featureKey,
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
  return upsertPaidContentUnlock({
    userId,
    profileId,
    featureKey,
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
  const categories = resolveUsagePassCategories(pricing);
  if (!categories.length) return null;

  await connectDb(env);

  let updatedUser = null;
  let category = "";
  for (let i = 0; i < categories.length; i += 1) {
    category = categories[i];
    updatedUser = await User.findOneAndUpdate(
      {
        _id: authUserId,
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
    requestId: String(requestId || ""),
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

  return {
    coinCost,
    hasActivePass,
    passTier,
    passLimit: hasActivePass && passLimitValue > 0 ? passLimitValue : null,
    canUseByPass: canUseByPass(entitlement, coinCost),
    monthlyBalance,
    canUseByMonthly: coinCost > 0 && membershipCreditCost > 0 && monthlyBalance >= membershipCreditCost,
    canUseByCard: true,
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
} = {}) {
  return {
    accessGranted: Boolean(accessGranted),
    reason,
    shouldOpenPaymentSelector: reason === "payment_required" ? Boolean(shouldOpenPaymentSelector) : false,
    availableMethods: Array.isArray(availableMethods) ? availableMethods : [...ACCESS_METHOD_ORDER],
    ...(unlockId ? { unlockId: String(unlockId) } : {}),
    priceCoin: Math.max(0, Math.floor(Number(priceCoin || 0))),
    ...(paymentOptions ? { paymentOptions } : {}),
  };
}

function resolveProfileCardActionType(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text.includes("delete") || text.includes("remove")) return PROFILE_CARD_MUTATION_ACTIONS.DELETE;
  return PROFILE_CARD_MUTATION_ACTIONS.EDIT;
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

  if (!userId) {
    return buildPaidContentAccessDecision({
      reason: "not_logged_in",
      priceCoin,
    });
  }

  if ((resolveSajuProfileUnlockContentKey(featureKey) || featureKey === LOTTO_RITUAL_REPORT_FEATURE_KEY) && !profileId) {
    return buildPaidContentAccessDecision({
      reason: "invalid_profile",
      priceCoin,
    });
  }

  try {
    const existingUnlock = await findActiveSajuProfileUnlock(env, { userId, profileId, featureKey });
    if (existingUnlock) {
      return buildPaidContentAccessDecision({
        accessGranted: true,
        reason: "already_unlocked",
        unlockId: existingUnlock._id,
        priceCoin,
      });
    }

    const activePass = subscriptionPass || await getActiveMembershipPassForUser(env, userId);
    const paymentOptions = buildPassPaymentDecision(
      activePass.entitlement,
      pricing,
      activePass.profileSubscription,
    );
    const normalizedPaymentMode = String(requestedPaymentMode || "").trim().toLowerCase();

    if (normalizedPaymentMode.includes("monthly") && !paymentOptions.canUseByMonthly) {
      return buildPaidContentAccessDecision({
        reason: "monthly_balance_required",
        priceCoin,
        paymentOptions,
      });
    }

    if (paymentOptions.canUseByPass && allowPassAutoUnlock) {
      const profilePolicy = await assertProfileCardPassPolicyIfNeeded({ userId, profileId, pricing, body });
      if (!profilePolicy.ok) {
        return buildPaidContentAccessDecision({
          reason: profilePolicy.reason,
          priceCoin,
          paymentOptions: {
            ...paymentOptions,
            profilePolicy: profilePolicy.policy || null,
          },
        });
      }
      const unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
        userId,
        profileId,
        featureKey,
        source: CONTENT_ENTITLEMENT_SOURCES.PASS,
        passId: `membership:${activePass.tier || "pass"}:${requestId || Date.now().toString(36)}`,
        coinAmount: 0,
      });
      return buildPaidContentAccessDecision({
        accessGranted: true,
        reason: "pass_covered",
        unlockId: unlockEntitlement?._id,
        priceCoin,
        paymentOptions,
      });
    }

    return buildPaidContentAccessDecision({
      reason: "payment_required",
      shouldOpenPaymentSelector: true,
      priceCoin,
      paymentOptions,
    });
  } catch (error) {
    return buildPaidContentAccessDecision({
      reason: String(error?.code || "") === "MISSING_PROFILE_ID" ? "invalid_profile" : "error",
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
  const requiredCredit = calculateMembershipCreditCost(coinPrice);
  if (!Number.isInteger(requiredCredit) || requiredCredit <= 0) return null;

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

async function resolveBillingProfileId(authUserId, body = {}) {
  const explicit = cleanProfileId(body?.profileId || body?.selectedProfileId || body?.profile?.profileId || body?.profile?.id);
  if (explicit || !authUserId) return explicit;
  const user = await User.findById(authUserId).select("destinyProfilesCurrentId").lean();
  return cleanProfileId(user?.destinyProfilesCurrentId);
}

function isProfileScopedUnlockKey(featureKey) {
  const key = String(featureKey || "").trim();
  if (!key) return false;
  return key === LOTTO_RITUAL_REPORT_FEATURE_KEY
    || Boolean(UNLOCK_PRODUCT_BY_FEATURE_KEY[key])
    || /^section_(daewun|summary|compat)$/.test(key);
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
    serviceKey: CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU,
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
      return SAJU_PROFILE_UNLOCK_FEATURE_BY_CONTENT_KEY[contentKey]
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

async function successWithPremiumAccess(env, authUserId, data, message = "요청이 성공했습니다.") {
  const pricing = data?.pricing || {};
  const consume = data?.consume || {};
  const featureKey = String(pricing?.featureKey || consume?.featureKey || data?.accessGrant?.featureKey || "").trim();
  const reason = String(pricing?.reason || "").trim();
  const profileId = cleanProfileId(data?.accessGrant?.profileId || consume?.profileId || data?.profileId);
  const transactionId = String(
    consume?.transactionId
      || data?.accessGrant?.evidenceId
      || data?.accessGrant?.purchaseId
      || data?.accessGrant?.requestId
      || "",
  ).trim();
  const reportType = resolvePremiumAccessReportType(featureKey, reason);
  const premiumAccessToken = reportType
    ? await createPremiumAccessToken(env, {
      userId: String(authUserId || ""),
      reportType,
      featureKey,
      reason,
      transactionId,
      chargedCoins: Number(consume?.chargedCoins || 0),
      freeBySubscription: data?.freeBySubscription === true || consume?.accessType === "membership_pass",
    })
    : "";
  const responseHeaders = new Headers();
  if (premiumAccessToken) {
    responseHeaders.append("Set-Cookie", buildPremiumAccessCookie(premiumAccessToken, isProductionRuntime(env)));
  }
  let unlockedFeatures = Array.isArray(data?.unlockedFeatures) ? [...data.unlockedFeatures] : [];
  let unlockMap = data?.unlockMap && typeof data.unlockMap === "object" ? { ...data.unlockMap } : {};
  const isAdminTestAccess = data?.adminBypass === true || data?.adminTestMode === true || consume?.adminBypass === true || consume?.adminTestMode === true;
  const isPermanentUnlock = !isAdminTestAccess && (pricing?.categoryKey === "unlock-feature"
    || featureKey === LOTTO_RITUAL_REPORT_FEATURE_KEY
    || /^section_(daewun|summary|compat)$/.test(featureKey));
  if (authUserId && featureKey && isPermanentUnlock) {
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
  }, message, premiumAccessToken ? { headers: responseHeaders } : {});
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
  soulOriginKarma: { reportType: "soul_origin_book", displayName: "운명의 기원서" },
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
  return code === "COIN_GATE_CONSUME_TIMEOUT" || code === "WORKER_UNHANDLED_EXCEPTION";
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
  return isSajuPdfGenerationFeatureKey(pricing?.featureKey);
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
  const pricing = pricingResult.pricing;
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
    || requestedPaymentMode === "membership_credit";
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

  const reportId = String(body?.reportId || body?.accessGrant?.reportId || "").trim();
  const reportSessionId = String(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || (reportId ? `love-book:${reportId}` : requestId)).trim();
  const isPdfGenerationService = canGeneratePaidPdf(pricing);
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
      unlockedFeatures: adminFeatureKey && !isPdfGenerationService ? [adminFeatureKey] : [],
      unlockMap: adminFeatureKey && !isPdfGenerationService ? { [adminFeatureKey]: true } : {},
      freeBySubscription: false,
    }, "ADMIN_TEST_PAYMENT_BYPASS");
  }
  const profileId = authCheck?.auth?.userId ? await resolveBillingProfileId(authCheck.auth.userId, body) : "";
  const scopedBody = profileId ? { ...body, profileId, selectedProfileId: profileId } : body;
  const subscriptionPassForDecision = !isPdfGenerationService && authCheck?.auth?.userId
    ? await getActiveMembershipPassForUser(env, authCheck.auth.userId)
    : null;
  let paymentDecision = buildPassPaymentDecision(null, pricing, null);
  let accessDecision = buildPaidContentAccessDecision({
    reason: "payment_required",
    shouldOpenPaymentSelector: true,
    priceCoin: Number(pricing?.coinPrice || pricing?.cost || 0),
    paymentOptions: paymentDecision,
  });
  if (!isPdfGenerationService) {
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

  if (!isPdfGenerationService) {
    const existingProfileUnlock = await findActiveSajuProfileUnlock(env, {
      userId: authCheck.auth.userId,
      profileId,
      featureKey: pricing?.featureKey,
    });
    if (existingProfileUnlock) {
      return await successWithPremiumAccess(env, authCheck.auth.userId, {
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

  let usagePassChecked = false;
  const tryUsagePassAccess = async () => {
    usagePassChecked = true;
    const usagePassConsume = await consumeUsagePassIfAvailable(env, authCheck.auth.userId, pricing, requestId);
    if (!usagePassConsume) return null;
    let unlockEntitlement = null;
    if (!isPdfGenerationService) {
      try {
        unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
          userId: authCheck.auth.userId,
          profileId,
          featureKey: pricing.featureKey,
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
      freeBySubscription: true,
    }, "이용권으로 콘텐츠 이용 권한을 발급했습니다.");
  };

  if (authCheck?.auth?.userId) {
    const subscriptionPass = await getActiveMembershipPassForUser(env, authCheck.auth.userId);
    const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
    paymentDecision = buildPassPaymentDecision(
      subscriptionPass.entitlement,
      pricing,
      subscriptionPass.profileSubscription,
    );
    if (paymentDecision.canUseByPass && !passBlockedByAccessDecision) {
      if (!singleOrMonthlyOnly) {
      const passEvidence = await recordPassAccessIfNeeded(env, authCheck.auth.userId, pricing, requestId, {
        ...scopedBody,
        reportId,
        sessionId: reportSessionId,
        reportSessionId,
      }, subscriptionPass.entitlement);
      let unlockEntitlement = null;
      if (!isPdfGenerationService) {
        try {
          unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
            userId: authCheck.auth.userId,
            profileId,
            featureKey: pricing.featureKey,
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

      }
    if (membershipPassOnly) {
      const passFailureCode = accessDecision.reason === "profile_limit_exceeded"
        ? "PROFILE_LIMIT_EXCEEDED"
        : (accessDecision.reason === "price_exceeds_pass_limit" ? "PRICE_EXCEEDS_PASS_LIMIT" : "MEMBERSHIP_PASS_NOT_COVERED");
      return failure(402, passFailureCode, "현재 이용권 한도 밖 서비스입니다. 월정석 또는 단건 결제로 이용해 주세요.", undefined, {
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
        if (!isPdfGenerationService) {
          try {
            unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
              userId: authCheck.auth.userId,
              profileId,
              featureKey: pricing.featureKey,
              source: CONTENT_ENTITLEMENT_SOURCES.COIN,
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
        }, "월정석 크레딧으로 콘텐츠 이용 권한을 발급했습니다.");
      }
    } catch (error) {
      logBillingRouteError("membership-credit-consume", error, request, {
        featureKey: String(pricing?.featureKey || ""),
        requestId,
      });
      return failure(
        500,
        "MEMBERSHIP_CREDIT_CONSUME_FAILED",
        "월정석 크레딧 처리 중 오류가 발생했습니다.",
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
      return failure(402, "INSUFFICIENT_MONTHLY_CREDITS", "월정석 잔량이 부족합니다.", undefined, {
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

    const usagePassConsume = usagePassChecked || singleOrMonthlyOnly ? null : await consumeUsagePassIfAvailable(env, authCheck.auth.userId, pricing, requestId);
    if (usagePassConsume) {
      let unlockEntitlement = null;
      if (!isPdfGenerationService) {
        try {
          unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
            userId: authCheck.auth.userId,
            profileId,
            featureKey: pricing.featureKey,
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
        consume: {
          ok: true,
          transactionType: "usage_pass",
          requestId,
          featureKey: String(pricing.featureKey || ""),
          category: usagePassConsume.category,
          remainingUses: usagePassConsume.remainingUses,
        },
        premiumAccessToken: null,
        accessGrant: {
          ok: true,
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
        }, "이미 처리된 코인 결제 요청입니다.");
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
        }, "이미 처리된 코인 결제 요청입니다.");
      }
      return failure(402, "INSUFFICIENT_COINS", "코인 잔액이 부족합니다.", undefined, {
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
    if (!isPdfGenerationService) {
      try {
        unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
          userId: authCheck.auth.userId,
          profileId,
          featureKey: coinFeatureKey,
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

    return success({
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
    }, "코인으로 콘텐츠 이용 권한을 발급했습니다.");
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

  return success({
    pricing,
    accessMethod: "COIN",
    paymentMode: "COIN",
    consume: {
      ...(payload && typeof payload === "object" ? payload : {}),
      accessType: "coin",
      accessMethod: "COIN",
      paymentMethod: "COIN",
      transactionType: "coin",
    },
    premiumAccessToken: premiumAccessToken || null,
    accessGrant,
    balance: Number.isFinite(balance) ? balance : null,
    user: payload?.user || null,
  }, toMessage(payload, "이용권 확인이 완료되었습니다."), {
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
  try {
    const auth = await getOptionalUserFromRequest(request, env);
    if (auth?.userId) {
      await connectDb(env);
      await seedMembershipCreditForExistingPassIfNeeded(auth.userId);
      const user = await User.findById(auth.userId)
        .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt points destinyProfilesCurrentId")
        .lean();
      const sub = user?.profileSubscription || {};
      const entitlement = normalizeHoneyPassEntitlement(user || {});
      scopedProfileId = cleanProfileId(user?.destinyProfilesCurrentId);
      scopedUnlocks = await resolveProfileScopedUnlocks(auth.userId, scopedProfileId);
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
    user: payload?.user || null,
    unlockedFeatures: scopedUnlocks ? scopedUnlocks.unlockedFeatures : [],
    unlockMap: scopedUnlocks ? scopedUnlocks.unlockMap : {},
    raw: payload,
  }, "이용 가능 혜택을 조회했습니다.");
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
    return {
      isActive: Boolean(payload?.isActive),
      tier: String(payload?.tier || "free"),
      passTier: payload?.passTier || null,
      freeLimit: Number(payload?.freeLimit || 0),
    };
  } catch (_) {
    return { isActive: false, tier: "free", passTier: null, freeLimit: 0 };
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

  const balanceResponse = await handleBalance(request, env);
  const balancePayload = await readPayloadSafe(balanceResponse);

  if (!balancePayload?.ok) {
    return balanceResponse;
  }

  const data = balancePayload.data || {};
  const unlockMap = data.unlockMap && typeof data.unlockMap === "object" ? data.unlockMap : {};
  const pricing = pricingResult.pricing;
  let unlocked = Boolean(unlockMap[pricing.featureKey]);
  const currentBalance = Number(data.balance || 0);
  const subscription = await readSubscriptionStatusSnapshot(request, env);
  let paymentDecision = buildPassPaymentDecision({
    isActive: subscription.isActive,
    tier: subscription.tier,
    passTier: subscription.passTier,
    maxCoveredCoin: subscription.freeLimit,
    expiresAt: subscription.entitlement?.expiresAt || null,
  }, pricing, {
    membershipCreditBalance: Number(data.membershipCreditBalance ?? data.membership?.membershipCreditBalance ?? 0),
  });

  const auth = await getOptionalUserFromRequest(request, env);
    const accessDecision = await resolvePaidContentAccess(env, {
      userId: auth?.userId || "",
      profileId: cleanProfileId(url.searchParams.get("profileId") || data.currentProfileId || ""),
      pricing,
      requestId: String(url.searchParams.get("requestId") || "").trim(),
      body: {
        actionType: String(url.searchParams.get("actionType") || "").trim(),
      },
    });
  if (accessDecision.paymentOptions) paymentDecision = accessDecision.paymentOptions;
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
    accessDecision,
    accessReason: accessDecision.reason === "already_unlocked"
      ? ACCESS_DECISION_REASONS.ALREADY_UNLOCKED
      : (accessDecision.reason === "pass_covered" ? ACCESS_DECISION_REASONS.SUBSCRIPTION_ACTIVE : legacyAccess.reason),
    subscriptionTier: subscription.tier,
    freeLimit: Number(subscription.freeLimit || 0),
    freeBySubscription: accessDecision.reason === "pass_covered",
    currentBalance,
    requiredCoins: accessDecision.accessGranted ? 0 : Number(pricing.cost || 0),
    shouldOpenPaymentSelector: accessDecision.shouldOpenPaymentSelector,
    availableMethods: accessDecision.availableMethods,
    canAccess: Boolean(accessDecision.accessGranted),
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

  const pricing = pricingResult.pricing;
  const isPdfGenerationService = canGeneratePaidPdf(pricing);
  const requestId = resolveRequestId(request, body);
  const reportId = String(body?.reportId || body?.accessGrant?.reportId || "").trim();
  const reportSessionId = String(
    body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || (reportId ? `love-book:${reportId}` : requestId),
  ).trim();
  if (authCheck.adminMode) {
    const adminAuthUserId = String(authCheck?.auth?.userId || ADMIN_TEST_USER_ID);
    const adminFeatureKey = String(pricing?.featureKey || "").trim();
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
      unlockedFeatures: adminFeatureKey && !isPdfGenerationService ? [adminFeatureKey] : [],
      unlockMap: adminFeatureKey && !isPdfGenerationService ? { [adminFeatureKey]: true } : {},
      freeBySubscription: false,
    }, "ADMIN_TEST_PAYMENT_BYPASS");
  }
  const profileId = await resolveBillingProfileId(authCheck.auth.userId, body);
  const scopedBody = profileId ? { ...body, profileId, selectedProfileId: profileId } : body;
  if (!isPdfGenerationService) {
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

  const subscriptionPass = await getActiveMembershipPassForUser(env, authCheck.auth.userId);
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
  if (!isPdfGenerationService) {
    try {
      unlockEntitlement = await upsertSajuProfileUnlockEntitlement(env, {
        userId: authCheck.auth.userId,
        profileId,
        featureKey: pricing.featureKey,
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

async function handleCheckout(request, env) {
  const body = await readJson(request);
  const isSubscription = Boolean(body?.subscriptionTier) || String(body?.paymentType || "").toLowerCase() === "subscription";
  if (!isSubscription && !shouldCreateDirectPortOneOrder(body)) {
    const passAccess = await grantPassFreeAccessBeforeCardIfAvailable(request, env, body);
    if (passAccess) return passAccess;
  }
  const targetPath = isSubscription ? "/api/payments/subscription/prepare" : "/api/payments/prepare";
  return delegateToPayments(request, env, targetPath, body);
}

async function handleConfirm(request, env) {
  const body = await readJson(request);
  const isSubscription = Boolean(body?.subscriptionTier) || String(body?.paymentType || "").toLowerCase() === "subscription";
  const hasPaymentVerificationPayload = Boolean(body?.impUid || body?.paymentId || body?.merchantUid || body?.merchant_uid);
  const pricingResult = !isSubscription ? resolvePricingFromBody(body) : null;
  if (!isSubscription && !hasPaymentVerificationPayload) {
    const passAccess = await grantPassFreeAccessBeforeCardIfAvailable(request, env, body);
    if (passAccess) return passAccess;
  }
  let premiumAccessOptions = null;
  if (!isSubscription && hasPaymentVerificationPayload && pricingResult?.ok) {
    const reportType = resolvePremiumAccessReportType(pricingResult.pricing?.featureKey, pricingResult.pricing?.reason);
    if (reportType) {
      const authCheck = await requireBillingAuth(request, env, pricingResult.pricing);
      if (!authCheck.ok) return authCheck.response;
      premiumAccessOptions = {
        premiumAccess: true,
        authUserId: authCheck.auth.userId,
        pricing: pricingResult.pricing,
      };
    }
  }
  const targetPath = isSubscription ? "/api/payments/subscription/confirm" : "/api/payments/confirm";
  return delegateToPayments(request, env, targetPath, body, premiumAccessOptions || undefined);
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
    if (method === "GET" && path === "/balance") return await handleBalance(request, env);
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
  requireBillingAuth,
  resolvePaidContentAccess,
};
