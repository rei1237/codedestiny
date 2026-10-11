import { ProfileCard, User } from "./models.js";

// 2026-10-11 정책 변경: 프로필 카드 추가·수정·삭제는 이용권 등급과 무관하게 모두 무료이고 개수 상한도 없다.
// 해금이 출생정보(birth) 단위로 묶여 있어 카드를 고치거나 새로 만들어도 기존 구매를 우회할 수 없기 때문이다
// (worker/lib/birth-scoped-unlock-identity.js). 이 모듈은 소유·존재 검증만 하고 결제를 요구하지 않는다.
//
// 아래 가격 상수는 정책 변경 전에 이미 만들어진 주문·월정석 차감 증빙을 대조하는 용도로만 남긴다
// (worker/lib/profile-moonstone-mutation.js, worker/routes/payments.js). 신규 결제 가격으로 쓰지 말 것.
// 2026-10-10 가격: 1,000원(10코인 · 월정석 100개). 상수 이름은 역사적으로 DELETE 지만 3동작 공통이었다.
export const PROFILE_CARD_DELETE_COST_COINS = 10;
export const PROFILE_CARD_DELETE_COST_KRW = 1000;
export const PROFILE_CARD_DELETE_COST_MONTHLY_STONES = PROFILE_CARD_DELETE_COST_COINS * 10;
// 2026-10-10 인하 전 가격.
export const LEGACY_PROFILE_CARD_COSTS = Object.freeze({ coins: 50, krw: 5000, monthlyStones: 500 });
export const PROFILE_CARD_ACCEPTED_MONTHLY_STONE_COSTS = Object.freeze([
  PROFILE_CARD_DELETE_COST_MONTHLY_STONES,
  LEGACY_PROFILE_CARD_COSTS.monthlyStones,
]);

export const PROFILE_CARD_MUTATION_ACTIONS = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
});

export const PROFILE_CARD_PAID_ACTIONS = Object.freeze({
  UPDATE: "profile_card_update",
  DELETE: "profile_card_delete",
  ADD_EXTRA: "profile_card_add_extra",
});

const VALID_PROFILE_CARD_MUTATION_ACTIONS = new Set([
  PROFILE_CARD_MUTATION_ACTIONS.CREATE,
  PROFILE_CARD_MUTATION_ACTIONS.UPDATE,
  PROFILE_CARD_MUTATION_ACTIONS.DELETE,
]);

function normalizeProfileCardMutationAction(actionType) {
  const text = String(actionType || "").trim().toLowerCase();
  if (text === PROFILE_CARD_PAID_ACTIONS.UPDATE || text === "profile_card_edit" || text === "edit" || text === "update") {
    return PROFILE_CARD_MUTATION_ACTIONS.UPDATE;
  }
  if (text === PROFILE_CARD_PAID_ACTIONS.DELETE) return PROFILE_CARD_MUTATION_ACTIONS.DELETE;
  if (text === PROFILE_CARD_PAID_ACTIONS.ADD_EXTRA) return PROFILE_CARD_MUTATION_ACTIONS.CREATE;
  return text;
}

function normalizeProfileCardId(profileCardId) {
  return String(profileCardId || "").trim().slice(0, 80).replace(/\s+/g, "_");
}

function buildProfileCardMutationPolicyResult(overrides = {}) {
  return {
    allowed: false,
    requiresPayment: false,
    costCoins: 0,
    costKrw: 0,
    monthlyStones: 0,
    reason: "INVALID_ACTION_TYPE",
    passType: undefined,
    limit: undefined,
    currentProfileCardCount: undefined,
    ...overrides,
  };
}

function buildFreeProfileCardMutationPolicy(currentProfileCardCount) {
  return buildProfileCardMutationPolicyResult({
    allowed: true,
    reason: "PROFILE_CARD_MUTATION_FREE",
    limit: 0,
    currentProfileCardCount,
  });
}

// 개수 상한이 없으므로 항상 허용한다. limit 0 은 무제한이라는 뜻이다.
export function canAddProfile() {
  return { allowed: true, reason: "PROFILE_LIMIT_AVAILABLE", limit: 0 };
}

export function getProfileDeletePrice() {
  return 0;
}

export async function getProfileCardMutationPolicy(userId, profileCardId, actionType) {
  const normalizedUserId = String(userId || "").trim();
  const normalizedProfileCardId = normalizeProfileCardId(profileCardId);
  const normalizedActionType = normalizeProfileCardMutationAction(actionType);

  if (!normalizedUserId) {
    return buildProfileCardMutationPolicyResult({ reason: "AUTH_REQUIRED" });
  }

  if (!VALID_PROFILE_CARD_MUTATION_ACTIONS.has(normalizedActionType)) {
    return buildProfileCardMutationPolicyResult({ reason: "INVALID_ACTION_TYPE" });
  }

  if (!normalizedProfileCardId) {
    return buildProfileCardMutationPolicyResult({ reason: "PROFILE_CARD_ID_REQUIRED" });
  }

  const [user, profileCard, currentProfileCardCount] = await Promise.all([
    User.findById(normalizedUserId).select("_id").lean(),
    ProfileCard.findOne({ userId: normalizedUserId, profileId: normalizedProfileCardId }).lean(),
    ProfileCard.countDocuments({ userId: normalizedUserId }),
  ]);

  if (!user) {
    return buildProfileCardMutationPolicyResult({ reason: "USER_NOT_FOUND", currentProfileCardCount });
  }

  if (normalizedActionType === PROFILE_CARD_MUTATION_ACTIONS.CREATE && profileCard) {
    return buildProfileCardMutationPolicyResult({ reason: "PROFILE_CARD_ALREADY_EXISTS", currentProfileCardCount });
  }

  if (normalizedActionType !== PROFILE_CARD_MUTATION_ACTIONS.CREATE && !profileCard) {
    return buildProfileCardMutationPolicyResult({ reason: "PROFILE_CARD_NOT_FOUND_OR_NOT_OWNED", currentProfileCardCount });
  }

  return buildFreeProfileCardMutationPolicy(currentProfileCardCount);
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
    return buildProfileCardMutationPolicyResult({ reason: "AUTH_REQUIRED", currentProfileCardCount: count });
  }

  if (normalizedAction === "profile_card_view" || normalizedAction === "view") {
    return buildProfileCardMutationPolicyResult({
      allowed: true,
      reason: "PROFILE_CARD_VIEW_FREE",
      currentProfileCardCount: count,
    });
  }

  if (!VALID_PROFILE_CARD_MUTATION_ACTIONS.has(normalizedAction)) {
    return buildProfileCardMutationPolicyResult({ reason: "INVALID_ACTION_TYPE", currentProfileCardCount: count });
  }

  if (normalizedAction !== PROFILE_CARD_MUTATION_ACTIONS.CREATE && !normalizedTargetProfileId) {
    return buildProfileCardMutationPolicyResult({ reason: "PROFILE_CARD_ID_REQUIRED", currentProfileCardCount: count });
  }

  const user = await User.findById(normalizedUserId).select("_id").lean();
  if (!user) {
    return buildProfileCardMutationPolicyResult({ reason: "USER_NOT_FOUND", currentProfileCardCount: count });
  }

  return buildFreeProfileCardMutationPolicy(count);
}
