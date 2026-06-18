import { ProfileCard, User } from "./models.js";
import { normalizeHoneyPassEntitlement, PROFILE_LIMIT_BY_TIER } from "./profile-limits.js";

export const PROFILE_CARD_DELETE_COST_COINS = 50;
export const PROFILE_CARD_DELETE_COST_KRW = 5000;
export const PROFILE_CARD_DELETE_COST_MONTHLY_STONES = PROFILE_CARD_DELETE_COST_COINS * 10;
export const FAMILY_OR_ABOVE_FREE_PROFILE_DELETE = true;
export const FAMILY_OR_ABOVE_CAN_ADD_PROFILE = true;
export const FREE_INITIAL_PROFILE_CARD_COUNT = 1;

export const PROFILE_CARD_MUTATION_ACTIONS = Object.freeze({
  CREATE: "create",
  DELETE: "delete",
});

export const PROFILE_CARD_PAID_ACTIONS = Object.freeze({
  DELETE: "profile_card_delete",
  ADD_EXTRA: "profile_card_add_extra",
});

const VALID_PROFILE_CARD_MUTATION_ACTIONS = new Set([
  PROFILE_CARD_MUTATION_ACTIONS.CREATE,
  PROFILE_CARD_MUTATION_ACTIONS.DELETE,
]);

const USER_PROFILE_POLICY_SELECT = "profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt";

function normalizeProfileCardMutationAction(actionType) {
  const text = String(actionType || "").trim().toLowerCase();
  if (text === PROFILE_CARD_PAID_ACTIONS.DELETE) return PROFILE_CARD_MUTATION_ACTIONS.DELETE;
  if (text === PROFILE_CARD_PAID_ACTIONS.ADD_EXTRA) return PROFILE_CARD_MUTATION_ACTIONS.CREATE;
  return text;
}

function normalizeProfileCardId(profileCardId) {
  return String(profileCardId || "").trim().slice(0, 80).replace(/\s+/g, "_");
}

function resolveProfileCardSlotLimit(entitlement) {
  const tier = String(entitlement?.tier || entitlement?.passTier || "").trim().toLowerCase();
  const entitlementLimit = Number(entitlement?.maxProfiles || 0);
  if (Number.isInteger(entitlementLimit) && entitlementLimit >= 0) return entitlementLimit;
  if (tier && Object.prototype.hasOwnProperty.call(PROFILE_LIMIT_BY_TIER, tier)) return Number(PROFILE_LIMIT_BY_TIER[tier] || 0);
  return 1;
}

function buildProfileCardMutationPolicyResult(overrides = {}) {
  return {
    allowed: false,
    requiresPayment: true,
    costCoins: PROFILE_CARD_DELETE_COST_COINS,
    costKrw: PROFILE_CARD_DELETE_COST_KRW,
    monthlyStones: PROFILE_CARD_DELETE_COST_MONTHLY_STONES,
    reason: "PAYMENT_REQUIRED",
    passType: undefined,
    limit: undefined,
    currentProfileCardCount: undefined,
    ...overrides,
  };
}

export function isFamilyOrAbove(userMembership) {
  const entitlement = normalizeHoneyPassEntitlement(userMembership || {});
  return Boolean(entitlement?.isActive === true && String(entitlement?.tier || "").toLowerCase() === "family");
}

function buildFamilyProfileCardBypassPolicy(entitlement, currentProfileCardCount) {
  return buildProfileCardMutationPolicyResult({
    allowed: true,
    requiresPayment: false,
    costCoins: 0,
    costKrw: 0,
    monthlyStones: 0,
    reason: "PROFILE_CARD_PAYMENT_BYPASS",
    passType: String(entitlement?.passTier || entitlement?.tier || "family"),
    limit: 0,
    currentProfileCardCount,
  });
}

function buildInitialProfileCardFreePolicy(currentProfileCardCount) {
  return buildProfileCardMutationPolicyResult({
    allowed: true,
    requiresPayment: false,
    costCoins: 0,
    costKrw: 0,
    monthlyStones: 0,
    reason: "INITIAL_PROFILE_CARD_FREE",
    limit: FREE_INITIAL_PROFILE_CARD_COUNT,
    currentProfileCardCount,
  });
}

export function canAddProfile(userMembership, currentProfileCount) {
  if (FAMILY_OR_ABOVE_CAN_ADD_PROFILE && isFamilyOrAbove(userMembership)) {
    return { allowed: true, reason: "FAMILY_OR_ABOVE_CAN_ADD_PROFILE", limit: 0 };
  }

  const entitlement = normalizeHoneyPassEntitlement(userMembership || {});
  if (entitlement?.isActive !== true) {
    return { allowed: false, reason: "PROFILE_SUBSCRIPTION_INACTIVE", limit: 1 };
  }

  const limit = resolveProfileCardSlotLimit(entitlement);
  if (limit === 0) {
    return { allowed: true, reason: "PROFILE_LIMIT_AVAILABLE", limit: 0 };
  }

  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 1;
  const count = Math.max(0, Math.floor(Number(currentProfileCount || 0)));
  return {
    allowed: count < safeLimit,
    reason: count < safeLimit ? "PROFILE_LIMIT_AVAILABLE" : "PROFILE_LIMIT_EXCEEDED",
    limit: safeLimit,
  };
}

export function getProfileDeletePrice(userMembership) {
  return FAMILY_OR_ABOVE_FREE_PROFILE_DELETE && isFamilyOrAbove(userMembership)
    ? 0
    : PROFILE_CARD_DELETE_COST_COINS;
}

export async function getProfileCardMutationPolicy(userId, profileCardId, actionType, options = {}) {
  const normalizedUserId = String(userId || "").trim();
  const normalizedProfileCardId = normalizeProfileCardId(profileCardId);
  const normalizedActionType = normalizeProfileCardMutationAction(actionType);
  const paymentSettled = options?.paymentSettled === true;

  if (!normalizedUserId) {
    return buildProfileCardMutationPolicyResult({
      requiresPayment: false,
      reason: "AUTH_REQUIRED",
    });
  }

  if (!VALID_PROFILE_CARD_MUTATION_ACTIONS.has(normalizedActionType)) {
    return buildProfileCardMutationPolicyResult({
      requiresPayment: false,
      reason: "INVALID_ACTION_TYPE",
    });
  }

  if (!normalizedProfileCardId) {
    return buildProfileCardMutationPolicyResult({
      requiresPayment: false,
      reason: "PROFILE_CARD_ID_REQUIRED",
    });
  }

  const [user, profileCard, currentProfileCardCount] = await Promise.all([
    User.findById(normalizedUserId).select(USER_PROFILE_POLICY_SELECT).lean(),
    ProfileCard.findOne({ userId: normalizedUserId, profileId: normalizedProfileCardId }).lean(),
    ProfileCard.countDocuments({ userId: normalizedUserId }),
  ]);

  if (!user) {
    return buildProfileCardMutationPolicyResult({
      requiresPayment: false,
      reason: "USER_NOT_FOUND",
      currentProfileCardCount,
    });
  }

  if (normalizedActionType === PROFILE_CARD_MUTATION_ACTIONS.CREATE && profileCard) {
    return buildProfileCardMutationPolicyResult({
      requiresPayment: false,
      reason: "PROFILE_CARD_ALREADY_EXISTS",
      currentProfileCardCount,
    });
  }

  if (normalizedActionType === PROFILE_CARD_MUTATION_ACTIONS.DELETE && !profileCard) {
    return buildProfileCardMutationPolicyResult({
      requiresPayment: false,
      reason: "PROFILE_CARD_NOT_FOUND_OR_NOT_OWNED",
      currentProfileCardCount,
    });
  }

  const entitlement = normalizeHoneyPassEntitlement(user);
  const slotLimit = resolveProfileCardSlotLimit(entitlement);

  if (
    normalizedActionType === PROFILE_CARD_MUTATION_ACTIONS.CREATE
    && currentProfileCardCount < FREE_INITIAL_PROFILE_CARD_COUNT
  ) {
    return buildInitialProfileCardFreePolicy(currentProfileCardCount);
  }

  if (isFamilyOrAbove(user) && (
    normalizedActionType === PROFILE_CARD_MUTATION_ACTIONS.CREATE
    || (FAMILY_OR_ABOVE_FREE_PROFILE_DELETE && normalizedActionType === PROFILE_CARD_MUTATION_ACTIONS.DELETE)
  )) {
    return buildFamilyProfileCardBypassPolicy(entitlement, currentProfileCardCount);
  }

  if (normalizedActionType === PROFILE_CARD_MUTATION_ACTIONS.CREATE && !paymentSettled) {
    const slot = canAddProfile(user, currentProfileCardCount);
    if (slot.allowed) {
      return buildProfileCardMutationPolicyResult({
        allowed: true,
        requiresPayment: true,
        costCoins: PROFILE_CARD_DELETE_COST_COINS,
        costKrw: PROFILE_CARD_DELETE_COST_KRW,
        monthlyStones: PROFILE_CARD_DELETE_COST_MONTHLY_STONES,
        reason: "PROFILE_CARD_CREATE_PAYMENT_REQUIRED",
        passType: entitlement?.isActive ? String(entitlement.passTier || entitlement.tier || "") : undefined,
        limit: slot.limit,
        currentProfileCardCount,
      });
    }
  }

  if (paymentSettled) {
    return buildProfileCardMutationPolicyResult({
      allowed: true,
      requiresPayment: false,
      reason: "PAID_PROFILE_CARD_MUTATION",
      passType: entitlement?.isActive ? String(entitlement.passTier || entitlement.tier || "") : undefined,
      limit: slotLimit,
      currentProfileCardCount,
    });
  }

  return buildProfileCardMutationPolicyResult({
    allowed: false,
    requiresPayment: true,
    reason: normalizedActionType === PROFILE_CARD_MUTATION_ACTIONS.CREATE
      ? "PROFILE_CARD_CREATE_PAYMENT_REQUIRED"
      : "PROFILE_CARD_DELETE_PAYMENT_REQUIRED",
    passType: entitlement?.isActive ? String(entitlement.passTier || entitlement.tier || "") : undefined,
    limit: slotLimit,
    currentProfileCardCount,
  });
}

export async function resolveProfileCardActionAccess({
  userId,
  action,
  currentProfileCount,
  targetProfileId,
} = {}) {
  const normalizedUserId = String(userId || "").trim();
  const normalizedAction = normalizeProfileCardMutationAction(action);
  const normalizedTargetProfileId = normalizeProfileCardId(targetProfileId);
  const count = Math.max(0, Math.floor(Number(currentProfileCount || 0)));

  if (!normalizedUserId) {
    return buildProfileCardMutationPolicyResult({
      requiresPayment: false,
      reason: "AUTH_REQUIRED",
      currentProfileCardCount: count,
    });
  }

  if (normalizedAction === "profile_card_view" || normalizedAction === "view") {
    return buildProfileCardMutationPolicyResult({
      allowed: true,
      requiresPayment: false,
      costCoins: 0,
      costKrw: 0,
      monthlyStones: 0,
      reason: "PROFILE_CARD_VIEW_FREE",
      currentProfileCardCount: count,
    });
  }

  const user = await User.findById(normalizedUserId).select(USER_PROFILE_POLICY_SELECT).lean();
  if (!user) {
    return buildProfileCardMutationPolicyResult({
      requiresPayment: false,
      reason: "USER_NOT_FOUND",
      currentProfileCardCount: count,
    });
  }

  const entitlement = normalizeHoneyPassEntitlement(user);

  if (normalizedAction === PROFILE_CARD_MUTATION_ACTIONS.DELETE) {
    if (!normalizedTargetProfileId) {
      return buildProfileCardMutationPolicyResult({
        requiresPayment: false,
        reason: "PROFILE_CARD_ID_REQUIRED",
        currentProfileCardCount: count,
      });
    }

    if (FAMILY_OR_ABOVE_FREE_PROFILE_DELETE && isFamilyOrAbove(user)) {
      return buildFamilyProfileCardBypassPolicy(entitlement, count);
    }

    return buildProfileCardMutationPolicyResult({
      allowed: false,
      requiresPayment: true,
      reason: "PROFILE_CARD_DELETE_PAYMENT_REQUIRED",
      passType: entitlement?.isActive ? String(entitlement.passTier || entitlement.tier || "") : undefined,
      limit: resolveProfileCardSlotLimit(entitlement),
      currentProfileCardCount: count,
    });
  }

  if (normalizedAction === PROFILE_CARD_MUTATION_ACTIONS.CREATE) {
    if (count < FREE_INITIAL_PROFILE_CARD_COUNT) {
      return buildInitialProfileCardFreePolicy(count);
    }

    if (isFamilyOrAbove(user)) {
      return buildFamilyProfileCardBypassPolicy(entitlement, count);
    }

    const slot = canAddProfile(user, count);
    if (slot.allowed) {
      return buildProfileCardMutationPolicyResult({
        allowed: true,
        requiresPayment: true,
        costCoins: PROFILE_CARD_DELETE_COST_COINS,
        costKrw: PROFILE_CARD_DELETE_COST_KRW,
        monthlyStones: PROFILE_CARD_DELETE_COST_MONTHLY_STONES,
        reason: "PROFILE_CARD_CREATE_PAYMENT_REQUIRED",
        passType: entitlement?.isActive ? String(entitlement.passTier || entitlement.tier || "") : undefined,
        limit: slot.limit,
        currentProfileCardCount: count,
      });
    }

    return buildProfileCardMutationPolicyResult({
      allowed: false,
      requiresPayment: true,
      reason: "PROFILE_CARD_CREATE_PAYMENT_REQUIRED",
      passType: entitlement?.isActive ? String(entitlement.passTier || entitlement.tier || "") : undefined,
      limit: slot.limit,
      currentProfileCardCount: count,
      costCoins: PROFILE_CARD_DELETE_COST_COINS,
      costKrw: PROFILE_CARD_DELETE_COST_KRW,
      monthlyStones: PROFILE_CARD_DELETE_COST_MONTHLY_STONES,
    });
  }

  return buildProfileCardMutationPolicyResult({
    requiresPayment: false,
    reason: "INVALID_ACTION_TYPE",
    currentProfileCardCount: count,
  });
}
