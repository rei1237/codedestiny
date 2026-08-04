import { ensureLotsForBalance, resolveNextExpiry } from "./monthly-credit-lots.js";
import {
  getUnlockedContentSnapshot,
  isProfileScopedContentUnlockFeatureKey,
} from "./content-unlocks.js";
import { isUnlockPaidFeatureKey } from "./paid-feature-registry.js";

const ACCESS_STATE_TTL_MS = 60000;
const ACCESS_STATE_STALE_TTL_MS = 30 * 60 * 1000;
const ACCESS_STATE_GRACE_TTL_MS = 24 * 60 * 60 * 1000;
const ACCESS_STATE_MAX_ENTRIES = 2500;
const ACCESS_STATE_POLICY_VERSION = "access-state-snapshot-v2";

const cache = globalThis.__codeDestinyAccessStateCache || (globalThis.__codeDestinyAccessStateCache = {
  entries: new Map(),
  inFlight: new Map(),
  currentProfileByUser: new Map(),
});
if (!cache.currentProfileByUser) cache.currentProfileByUser = new Map();

function normalizeUserId(userId) {
  return String(userId || "").trim();
}

function normalizeProfileId(profileId) {
  return String(profileId || "").trim().slice(0, 100);
}

function accessStateCacheKey(userId, profileId = "") {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedProfileId = normalizeProfileId(profileId);
  return normalizedProfileId ? `${normalizedUserId}::${normalizedProfileId}` : normalizedUserId;
}

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

function buildMonthlyBalance(profileSubscription = {}, nowMs = Date.now()) {
  const lotsState = ensureLotsForBalance(profileSubscription || {}, nowMs);
  return {
    remaining: toNonNegativeInteger(lotsState?.balance),
    resetAt: resolveNextExpiry(lotsState?.lots || profileSubscription?.membershipCreditLots || [], nowMs) || undefined,
  };
}

function prune(now = Date.now()) {
  for (const [key, entry] of cache.entries) {
    if (!entry || entry.staleUntil <= now) cache.entries.delete(key);
  }
  while (cache.entries.size > ACCESS_STATE_MAX_ENTRIES) {
    const oldest = cache.entries.keys().next().value;
    if (!oldest) break;
    cache.entries.delete(oldest);
  }
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
        ...(Array.isArray(user?.unlockedFeatures) ? user.unlockedFeatures : []),
        ...(Array.isArray(user?.paidFeatures) ? user.paidFeatures : []),
        ...(Array.isArray(contentState?.featureKeys) ? contentState.featureKeys : []),
      ]
      : resolvedUnlockedFeatureIds,
  );
  const normalizedContentKeys = normalizeStringArray([
    ...unlockedContentKeys,
    ...(Array.isArray(contentState?.contentKeys) ? contentState.contentKeys : []),
  ]);
  const ownedProductIds = normalizeStringArray([
    ...(Array.isArray(user?.paidFeatures) ? user.paidFeatures : []),
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

export function readAccessStateCache(userId, { profileId = "", allowStale = false } = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const fallbackProfileId = profileId || cache.currentProfileByUser.get(normalizedUserId) || "";
  const key = accessStateCacheKey(normalizedUserId, fallbackProfileId);
  if (!key) return null;
  const entry = cache.entries.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (entry.expiresAt > now) return { ...entry.value, source: "cache" };
  if (allowStale && entry.staleUntil > now) return { ...entry.value, source: "stale-cache" };
  if (entry.staleUntil <= now) cache.entries.delete(key);
  return null;
}

export function writeAccessStateCache(userId, value, { profileId = "" } = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedProfileId = normalizeProfileId(profileId || value?.currentProfileId || value?.profileId);
  const key = accessStateCacheKey(normalizedUserId, normalizedProfileId);
  if (!key || !value) return value;
  const now = Date.now();
  prune(now);
  cache.entries.set(key, {
    value: { ...value, source: "db" },
    expiresAt: now + ACCESS_STATE_TTL_MS,
    staleUntil: now + ACCESS_STATE_STALE_TTL_MS,
  });
  if (normalizedProfileId) cache.currentProfileByUser.set(normalizedUserId, normalizedProfileId);
  return value;
}

export function readAccessStateInFlight(userId, { profileId = "" } = {}) {
  return cache.inFlight.get(accessStateCacheKey(userId, profileId)) || null;
}

export function writeAccessStateInFlight(userId, promise, { profileId = "" } = {}) {
  const key = accessStateCacheKey(userId, profileId);
  if (!key || !promise) return promise;
  cache.inFlight.set(key, promise);
  return promise;
}

export function clearAccessStateInFlight(userId, promise, { profileId = "" } = {}) {
  const key = accessStateCacheKey(userId, profileId);
  if (cache.inFlight.get(key) === promise) cache.inFlight.delete(key);
}

export function invalidateAccessStateCacheForUser(userId) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return false;
  let deleted = false;
  for (const key of cache.entries.keys()) {
    if (key === normalizedUserId || key.startsWith(`${normalizedUserId}::`)) {
      deleted = cache.entries.delete(key) || deleted;
    }
  }
  for (const key of cache.inFlight.keys()) {
    if (key === normalizedUserId || key.startsWith(`${normalizedUserId}::`)) cache.inFlight.delete(key);
  }
  cache.currentProfileByUser.delete(normalizedUserId);
  const legacyUnlockCache = globalThis.__codeDestinyAccessUnlocksCache;
  const legacyPrefix = `${normalizedUserId}::`;
  for (const key of legacyUnlockCache?.entries?.keys?.() || []) {
    if (key.startsWith(legacyPrefix)) legacyUnlockCache.entries.delete(key);
  }
  for (const key of legacyUnlockCache?.inFlight?.keys?.() || []) {
    if (key.startsWith(legacyPrefix)) legacyUnlockCache.inFlight.delete(key);
  }
  return deleted;
}

globalThis.__accessStateCache = {
  invalidateForUser: invalidateAccessStateCacheForUser,
};

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
