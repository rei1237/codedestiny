import { ensureLotsForBalance, resolveNextExpiry } from "./monthly-credit-lots.js";
import {
  getUnlockedContentSnapshot,
  isProfileScopedContentUnlockFeatureKey,
} from "./content-unlocks.js";
import { isPerUsePaidFeatureKey, isUnlockPaidFeatureKey } from "./paid-feature-registry.js";
import { KRW_PER_COIN, MONTHLY_PASS_LIMITS, PASS_LIMITS, normalizePassTier } from "./profile-limits.js";
import {
  ACCESS_STATE_STALE_TTL_MS,
  ACCESS_STATE_TTL_MS,
  normalizeProfileId,
  normalizeUserId,
} from "./access-state-cache.js";

// TTL 캐시 저장소는 의존이 없어야 해서 ./access-state-cache.js 로 갈라져 있다(그 파일 머리말 참고).
// 기존 호출부가 전부 이 모듈에서 가져가고 있으므로 이름은 여기서 그대로 다시 내보낸다.
export {
  invalidateAccessStateCacheForUser,
  readAccessStateCache,
  writeAccessStateCache,
} from "./access-state-cache.js";

const ACCESS_STATE_GRACE_TTL_MS = 24 * 60 * 60 * 1000;
const ACCESS_STATE_POLICY_VERSION = "access-state-snapshot-v2";

function normalizeIsoDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function toNonNegativeInteger(value) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function normalizeStringArray(value) {
  const array = Array.isArray(value) ? value : [];
  return Array.from(new Set(array.map((item) => String(item || "").trim()).filter(Boolean)));
}

/**
 * 이번 이용권 사이클의 월 이용 한도 현황. **추가 왕복 0회** — 호출부가 이미 읽은
 * profileSubscription 안에 카운터(monthlySpendCoin)와 사이클 키가 함께 있다.
 *
 * 사이클 키 = 이용권 만료일(worker/lib/profile-limits.js resolvePremiumQuotaCycleKey).
 * 키가 다르면 이전 사이클의 누적치이므로 0 으로 본다 — 리셋 크론이 없는 이유가 이것이다.
 * 만료일이 없어 셀 수 없는 상태면 null 을 돌려준다(0 이 아니다: "한도를 다 썼다"와
 * "잴 수 없다"는 화면에서 완전히 다른 말이다).
 *
 * 🔴 계산은 서버에서만 한다. 클라이언트가 보낸 사용액을 신뢰하는 경로를 만들지 말 것.
 */
function buildPassUsage(profileSubscription = {}, rawTier = "") {
  const tier = normalizePassTier(rawTier);
  if (!tier) return null;
  const limitCoin = Math.max(0, Math.floor(Number(MONTHLY_PASS_LIMITS[tier] || 0)));
  if (!(limitCoin > 0)) return null;
  const cycleKey = String(profileSubscription?.expiresAt
    ? new Date(profileSubscription.expiresAt).toISOString()
    : "");
  if (!cycleKey || cycleKey === "Invalid Date") return null;
  const usedCoin = String(profileSubscription?.premiumUseCycleKey || "") === cycleKey
    ? Math.max(0, Math.floor(Number(profileSubscription?.monthlySpendCoin || 0)))
    : 0;
  const perItemCoin = Math.max(0, Math.floor(Number(PASS_LIMITS[tier] || 0)));
  return {
    tier,
    limitKRW: limitCoin * KRW_PER_COIN,
    usedKRW: Math.min(usedCoin, limitCoin) * KRW_PER_COIN,
    remainingKRW: Math.max(0, limitCoin - usedCoin) * KRW_PER_COIN,
    // null = 건당 상한 없음(family).
    perItemLimitKRW: perItemCoin >= 999999999 ? null : perItemCoin * KRW_PER_COIN,
    cycleEndsAt: cycleKey,
  };
}

function buildMonthlyBalance(profileSubscription = {}, nowMs = Date.now()) {
  const lotsState = ensureLotsForBalance(profileSubscription || {}, nowMs);
  return {
    remaining: toNonNegativeInteger(lotsState?.balance),
    resetAt: resolveNextExpiry(lotsState?.lots || profileSubscription?.membershipCreditLots || [], nowMs) || undefined,
  };
}

function snapshotFingerprint(values = []) {
  const text = values.map((value) => String(value || "")).sort().join("|");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function buildAccessState({
  userId,
  user,
  profileId = "",
  unlockedFeatureIds: resolvedUnlockedFeatureIds = null,
  unlockedContentKeys = [],
  profileScopedAuthoritative = false,
  profileCount = null,
  contentSnapshot = null,
  source = "db",
  checkedAt = new Date().toISOString(),
}) {
  const entitlement = user?.profileSubscription && typeof user.profileSubscription === "object"
    ? user.profileSubscription
    : {};
  const active = user?.activeEntitlement && typeof user.activeEntitlement === "object"
    ? user.activeEntitlement
    : entitlement;
  const tier = String(active?.tier || active?.passTier || entitlement?.tier || "free").trim().toLowerCase();
  const hasActivePass = Boolean(active?.isActive) && tier !== "free" && tier !== "none";
  const activeUntil = active?.expiresAt || entitlement?.expiresAt || null;
  const maxProfileCount = Number.isFinite(Number(active?.profileLimit))
    ? Math.max(0, Math.floor(Number(active.profileLimit)))
    : 1;
  const checkedMs = Date.parse(checkedAt);
  const fetchedMs = Number.isFinite(checkedMs) ? checkedMs : Date.now();
  const expiresAt = new Date(fetchedMs + ACCESS_STATE_TTL_MS).toISOString();
  const staleUntil = new Date(fetchedMs + ACCESS_STATE_STALE_TTL_MS).toISOString();
  const activeUntilMs = Date.parse(String(activeUntil || ""));
  const graceLimitMs = fetchedMs + ACCESS_STATE_GRACE_TTL_MS;
  const graceUntilMs = hasActivePass && Number.isFinite(activeUntilMs)
    ? Math.min(graceLimitMs, activeUntilMs)
    : graceLimitMs;
  const graceUntil = new Date(graceUntilMs).toISOString();
  const contentState = contentSnapshot && typeof contentSnapshot === "object" ? contentSnapshot : {};
  const currentProfileId = normalizeProfileId(profileId || user?.destinyProfilesCurrentId);
  const unlockedFeatureIds = normalizeStringArray(
    resolvedUnlockedFeatureIds === null
      ? [
        // 🔴 회당 결제 키를 해금 맵으로 내보내지 않는다 — 클라이언트가 그 맵을 보고
        // 결제창 없이 already_unlocked 로 통과시킨다. 아래 본 경로(accountFeatureIds)는 이미
        // 걸러 내는데 이 폴백만 빠져 있었다. contentState.featureKeys 는 getUnlockedContentSnapshot
        // 이 이미 걸러서 준다.
        ...(Array.isArray(user?.unlockedFeatures) ? user.unlockedFeatures : []).filter((key) => !isPerUsePaidFeatureKey(key)),
        ...(Array.isArray(user?.paidFeatures) ? user.paidFeatures : []).filter((key) => !isPerUsePaidFeatureKey(key)),
        ...(Array.isArray(contentState?.featureKeys) ? contentState.featureKeys : []),
      ]
      : resolvedUnlockedFeatureIds,
  );
  const normalizedContentKeys = normalizeStringArray([
    ...unlockedContentKeys,
    ...(Array.isArray(contentState?.contentKeys) ? contentState.contentKeys : []),
  ]);
  const ownedProductIds = normalizeStringArray([
    // 같은 이유로 회당 결제 키는 '보유 상품'이 아니다 — 그 결제는 1회 소비로 끝난 거래다.
    ...(Array.isArray(user?.paidFeatures) ? user.paidFeatures : []).filter((key) => !isPerUsePaidFeatureKey(key)),
    ...(Array.isArray(contentState?.featureKeys) ? contentState.featureKeys : []),
  ]);
  const profileEntitlements = contentState?.entitlementsByProfile && typeof contentState.entitlementsByProfile === "object"
    ? contentState.entitlementsByProfile
    : {};
  const unlockMap = {
    ...Object.fromEntries(unlockedFeatureIds.map((key) => [key, true])),
    ...(contentState?.unlockMap && typeof contentState.unlockMap === "object" ? contentState.unlockMap : {}),
  };
  const lockMap = Object.fromEntries(unlockedFeatureIds.map((key) => [key, false]));
  const monthlyBalance = buildMonthlyBalance(entitlement, fetchedMs);
  const passUsage = buildPassUsage(entitlement, hasActivePass ? tier : "");
  const entitlementVersion = [
    entitlement?.entitlementVersion
      || entitlement?.version
      || entitlement?.policyVersion
      || entitlement?.updatedAt
      || user?.updatedAt
      || checkedAt,
    currentProfileId || "no-profile",
    snapshotFingerprint([
      ...unlockedFeatureIds,
      ...normalizedContentKeys,
      contentState?.entitlementVersion,
      ...(Array.isArray(contentState?.docs)
        ? contentState.docs.map((doc) => doc?.updatedAt || doc?.unlockedAt || doc?.expiresAt)
        : []),
    ]),
  ].join(":");
  const activePasses = hasActivePass ? [{
    id: String(active?._id || active?.id || active?.passId || tier),
    type: tier,
    productScope: Array.isArray(active?.productScope) ? normalizeStringArray(active.productScope) : undefined,
    expiresAt: normalizeIsoDate(activeUntil),
    remainingUses: active?.remainingUses !== undefined ? toNonNegativeInteger(active.remainingUses) : undefined,
  }] : [];
  const entitlementSnapshot = {
    userId: normalizeUserId(userId),
    tier: hasActivePass ? tier : "free",
    activePasses,
    passUsage,
    unlockedFeatureIds,
    monthlyBalance,
    profileEntitlements,
    ownedProductIds,
    unlockMap,
    lockMap,
    purchasePolicyVersion: ACCESS_STATE_POLICY_VERSION,
    entitlementVersion: String(entitlementVersion),
    fetchedAt: checkedAt,
    expiresAt,
    staleUntil,
    graceUntil,
    completeness: "full",
    completenessDetails: {
      account: "full",
      profile: currentProfileId ? "full" : "not_requested",
      pass: "full",
      monthlyCredits: "full",
    },
    authority: "server",
    source,
  };

  return {
    userId: normalizeUserId(userId),
    hasActivePass,
    passType: hasActivePass ? tier : undefined,
    activeUntil: normalizeIsoDate(activeUntil),
    coinBalance: Math.max(0, Math.floor(Number(user?.points || 0))),
    monthlyStoneBalance: monthlyBalance.remaining,
    membershipCreditBalance: monthlyBalance.remaining,
    profileCount: profileCount === null || profileCount === undefined
      ? null
      : Math.max(0, Math.floor(Number(profileCount || 0))),
    profileCountDeferred: profileCount === null || profileCount === undefined,
    hasProfile: Boolean(currentProfileId) || Number(profileCount || 0) > 0,
    maxProfileCount,
    currentProfileId,
    profileId: currentProfileId,
    unlockedFeatureIds,
    unlockedFeatures: unlockedFeatureIds,
    unlockMap,
    lockMap,
    profileEntitlements,
    ownedProductIds,
    productOwnership: { ownedProductIds, source: "server" },
    monthlyBalance,
    entitlementSnapshot,
    featureAccessSummary: { unlockedFeatureIds, unlockMap, lockMap, profileEntitlements },
    permissions: {
      unlockedFeatures: unlockMap,
    },
    unlockedContentKeys: normalizedContentKeys,
    profileScopedAuthoritative: profileScopedAuthoritative === true,
    monthlyBalanceSummary: monthlyBalance,
    serverTime: checkedAt,
    versions: {
      entitlementVersion: entitlementSnapshot.entitlementVersion,
      accessStateVersion: entitlementSnapshot.entitlementVersion,
      policyVersion: ACCESS_STATE_POLICY_VERSION,
    },
    account: {
      termsVersion: String(user?.legalConsents?.termsVersion || ""),
      privacyVersion: String(user?.legalConsents?.privacyVersion || ""),
    },
    version: entitlementSnapshot.entitlementVersion,
    source,
    checkedAt,
    fetchedAt: checkedAt,
    expiresAt,
    staleUntil,
    graceUntil,
    completeness: "full",
    completenessDetails: entitlementSnapshot.completenessDetails,
    authority: "server",
    adminStaleGraceAllowed: false,
  };
}

export function attachGuardianUsageToAccessState(state, usage = {}) {
  const guardianUsageVersion = `guardian:${snapshotFingerprint([
    usage.isLoggedIn,
    usage.guestFreeLimit,
    usage.guestFreeUsed,
    usage.guestFreeRemaining,
    usage.dailyFreeLimit,
    usage.dailyFreeUsed,
    usage.dailyFreeRemaining,
    usage.paidCreditsRemaining,
    usage.canGenerate,
    usage.generationSource,
    usage.nextAction,
  ])}`;
  const entitlementVersion = String(state?.versions?.entitlementVersion || state?.version || "unknown");
  return {
    ...state,
    freeUsage: {
      ...(state?.freeUsage && typeof state.freeUsage === "object" ? state.freeUsage : {}),
      guardian: { ...usage, degraded: false, version: guardianUsageVersion },
    },
    versions: {
      ...(state?.versions || {}),
      guardianUsageVersion,
      accessStateVersion: `${entitlementVersion}:${guardianUsageVersion}`,
    },
  };
}

export function attachDegradedGuardianUsageToAccessState(state, code = "INTERNAL_DEPENDENCY_ERROR") {
  const entitlementVersion = String(state?.versions?.entitlementVersion || state?.version || "unknown");
  return {
    ...state,
    freeUsage: {
      ...(state?.freeUsage && typeof state.freeUsage === "object" ? state.freeUsage : {}),
      guardian: {
        degraded: true,
        code: String(code || "INTERNAL_DEPENDENCY_ERROR"),
        checkedAt: new Date().toISOString(),
      },
    },
    versions: {
      ...(state?.versions || {}),
      guardianUsageVersion: "guardian:degraded",
      accessStateVersion: `${entitlementVersion}:guardian:degraded`,
    },
  };
}

export async function resolveCompleteAccessState({
  userId,
  user,
  profileId = "",
  profileCount = null,
  source = "db",
  checkedAt = new Date().toISOString(),
} = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const currentProfileId = normalizeProfileId(profileId || user?.destinyProfilesCurrentId);
  const accountFeatureIds = normalizeStringArray([
    ...(Array.isArray(user?.unlockedFeatures) ? user.unlockedFeatures : []),
    ...(Array.isArray(user?.paidFeatures) ? user.paidFeatures : []),
  ]).filter((key) => isUnlockPaidFeatureKey(key) && !isProfileScopedContentUnlockFeatureKey(key));

  const contentSnapshot = await getUnlockedContentSnapshot({
    userId: normalizedUserId,
    profileId: currentProfileId,
  });
  const unlockedFeatureIds = normalizeStringArray([
    ...accountFeatureIds,
    ...(Array.isArray(contentSnapshot?.featureKeys) ? contentSnapshot.featureKeys : []),
  ]);

  return buildAccessState({
    userId: normalizedUserId,
    user,
    profileId: currentProfileId,
    unlockedFeatureIds,
    unlockedContentKeys: contentSnapshot?.contentKeys || [],
    contentSnapshot,
    profileScopedAuthoritative: currentProfileId
      ? contentSnapshot?.profileScopedAuthoritative === true
      : false,
    profileCount,
    source,
    checkedAt,
  });
}

export const ACCESS_STATE_USER_PROJECTION = Object.freeze({
  updatedAt: 1,
  points: 1,
  unlockedFeatures: 1,
  paidFeatures: 1,
  destinyProfilesCurrentId: 1,
  legalConsents: 1,
  profileSubscription: 1,
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
});
