import { ProfileCard, User } from "./models.js";
import { normalizeHoneyPassEntitlement, PROFILE_LIMIT_BY_TIER } from "./profile-limits.js";

export const PROFILE_CARD_EDIT_DELETE_COST_COINS = 50;
export const PROFILE_CARD_EDIT_DELETE_COST_KRW = 5000;

export const PROFILE_CARD_MUTATION_ACTIONS = Object.freeze({
  EDIT: "edit",
  DELETE: "delete",
});

const VALID_PROFILE_CARD_MUTATION_ACTIONS = new Set(Object.values(PROFILE_CARD_MUTATION_ACTIONS));

function normalizeProfileCardMutationAction(actionType) {
  return String(actionType || "").trim().toLowerCase();
}

function normalizeProfileCardId(profileCardId) {
  return String(profileCardId || "").trim().slice(0, 80).replace(/\s+/g, "_");
}

function buildProfileCardMutationPolicyResult(overrides = {}) {
  return {
    allowed: false,
    requiresPayment: true,
    costCoins: PROFILE_CARD_EDIT_DELETE_COST_COINS,
    costKrw: PROFILE_CARD_EDIT_DELETE_COST_KRW,
    reason: "PAYMENT_REQUIRED",
    passType: undefined,
    limit: undefined,
    currentProfileCardCount: undefined,
    ...overrides,
  };
}

function isActiveVvipEntitlement(entitlement) {
  return Boolean(entitlement?.isActive === true && String(entitlement?.tier || "").toLowerCase() === "vvip");
}

function resolveVvipProfileCardLimit(entitlement) {
  const entitlementLimit = Number(entitlement?.maxProfiles || 0);
  if (isActiveVvipEntitlement(entitlement) && Number.isInteger(entitlementLimit) && entitlementLimit > 0) return entitlementLimit;
  return Number(PROFILE_LIMIT_BY_TIER.vvip || 0);
}

function isStoredVvipToken(value) {
  const text = String(value || "").trim().toLowerCase();
  return Boolean(text && (
    text === "vvip"
    || text === "honey_vvip"
    || text === "gold"
    || text.includes("vvip")
    || text.includes("꿀단지")
  ));
}

function hasStoredVvipTier(user = {}) {
  const sources = [
    user?.profileSubscription,
    user?.subscription,
    user?.membership,
    user?.pass,
    user?.entitlement,
    user,
  ].filter((source) => source && typeof source === "object");

  return sources.some((source) => [
    source.tier,
    source.plan,
    source.planId,
    source.productId,
    source.subscriptionTier,
    source.membershipTier,
    source.passTier,
    source.label,
  ].some(isStoredVvipToken));
}

/**
 * 프로필 카드 수정/삭제 정책만 판정한다.
 * 실제 결제 생성, 코인 차감, 카드 수정/삭제 실행은 API 레이어에서 이 결과를 기준으로 별도 처리한다.
 */
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
    User.findById(normalizedUserId)
      .select("profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
      .lean(),
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

  if (!profileCard) {
    return buildProfileCardMutationPolicyResult({
      requiresPayment: false,
      reason: "PROFILE_CARD_NOT_FOUND_OR_NOT_OWNED",
      currentProfileCardCount,
    });
  }

  const entitlement = normalizeHoneyPassEntitlement(user);
  const vvipLimit = resolveVvipProfileCardLimit(entitlement);
  const isActiveVvip = isActiveVvipEntitlement(entitlement);
  const wasVvipTier = isActiveVvip || hasStoredVvipTier(user);
  const isVvipFreeAllowed = isActiveVvip
    && Number.isInteger(vvipLimit)
    && vvipLimit > 0
    && currentProfileCardCount <= vvipLimit;

  if (isVvipFreeAllowed) {
    return buildProfileCardMutationPolicyResult({
      allowed: true,
      requiresPayment: false,
      costCoins: 0,
      costKrw: 0,
      reason: "VVIP_PROFILE_LIMIT_INCLUDED",
      passType: String(entitlement.passTier || entitlement.tier || "vvip"),
      limit: vvipLimit,
      currentProfileCardCount,
    });
  }

  if (paymentSettled) {
    return buildProfileCardMutationPolicyResult({
      allowed: true,
      requiresPayment: false,
      reason: "PAID_PROFILE_CARD_MUTATION",
      passType: entitlement?.isActive ? String(entitlement.passTier || entitlement.tier || "") : undefined,
      limit: isActiveVvip ? vvipLimit : undefined,
      currentProfileCardCount,
    });
  }

  const paymentRequiredReason = isActiveVvip && currentProfileCardCount > vvipLimit
    ? "VVIP_PROFILE_LIMIT_EXCEEDED_PAYMENT_REQUIRED"
    : wasVvipTier && !isActiveVvip
      ? "VVIP_EXPIRED_PAYMENT_REQUIRED"
      : normalizedActionType === PROFILE_CARD_MUTATION_ACTIONS.DELETE
        ? "PROFILE_CARD_DELETE_PAYMENT_REQUIRED"
        : "PROFILE_CARD_EDIT_PAYMENT_REQUIRED";

  return buildProfileCardMutationPolicyResult({
    allowed: false,
    requiresPayment: true,
    reason: paymentRequiredReason,
    passType: entitlement?.isActive ? String(entitlement.passTier || entitlement.tier || "") : (wasVvipTier ? "vvip" : undefined),
    limit: wasVvipTier ? vvipLimit : undefined,
    currentProfileCardCount,
  });
}
