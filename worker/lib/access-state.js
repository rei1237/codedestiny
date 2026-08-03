import { ensureLotsForBalance, resolveNextExpiry } from "./monthly-credit-lots.js";

const ACCESS_STATE_TTL_MS = 60000;
const ACCESS_STATE_STALE_TTL_MS = 30 * 60 * 1000;
const ACCESS_STATE_MAX_ENTRIES = 2500;
const ACCESS_STATE_POLICY_VERSION = "access-state-snapshot-v1";

const cache = globalThis.__codeDestinyAccessStateCache || (globalThis.__codeDestinyAccessStateCache = {
  entries: new Map(),
  inFlight: new Map(),
});

function normalizeUserId(userId) {
  return String(userId || "").trim();
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

export function buildAccessState({ userId, user, profileCount = 0, source = "db", checkedAt = new Date().toISOString() }) {
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
  const unlockedFeatureIds = normalizeStringArray(user?.unlockedFeatures);
  const monthlyBalance = buildMonthlyBalance(entitlement, fetchedMs);
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
    purchasePolicyVersion: ACCESS_STATE_POLICY_VERSION,
    entitlementVersion: String(entitlement?.version || entitlement?.policyVersion || user?.updatedAt || checkedAt),
    fetchedAt: checkedAt,
    expiresAt,
    staleUntil,
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
    profileCount: Math.max(0, Math.floor(Number(profileCount || 0))),
    maxProfileCount,
    currentProfileId: String(user?.destinyProfilesCurrentId || ""),
    unlockedFeatureIds,
    unlockedFeatures: unlockedFeatureIds,
    unlockMap: Object.fromEntries(unlockedFeatureIds.map((key) => [key, true])),
    monthlyBalance,
    entitlementSnapshot,
    featureAccessSummary: { unlockedFeatureIds },
    monthlyBalanceSummary: monthlyBalance,
    serverTime: checkedAt,
    versions: {
      entitlementVersion: entitlementSnapshot.entitlementVersion,
      policyVersion: ACCESS_STATE_POLICY_VERSION,
    },
    source,
    checkedAt,
    fetchedAt: checkedAt,
    expiresAt,
    staleUntil,
  };
}

export function readAccessStateCache(userId, { allowStale = false } = {}) {
  const key = normalizeUserId(userId);
  if (!key) return null;
  const entry = cache.entries.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (entry.expiresAt > now) return { ...entry.value, source: "cache" };
  if (allowStale && entry.staleUntil > now) return { ...entry.value, source: "stale-cache" };
  if (entry.staleUntil <= now) cache.entries.delete(key);
  return null;
}

export function writeAccessStateCache(userId, value) {
  const key = normalizeUserId(userId);
  if (!key || !value) return value;
  const now = Date.now();
  prune(now);
  cache.entries.set(key, {
    value: { ...value, source: "db" },
    expiresAt: now + ACCESS_STATE_TTL_MS,
    staleUntil: now + ACCESS_STATE_STALE_TTL_MS,
  });
  return value;
}

export function readAccessStateInFlight(userId) {
  return cache.inFlight.get(normalizeUserId(userId)) || null;
}

export function writeAccessStateInFlight(userId, promise) {
  const key = normalizeUserId(userId);
  if (!key || !promise) return promise;
  cache.inFlight.set(key, promise);
  return promise;
}

export function clearAccessStateInFlight(userId, promise) {
  const key = normalizeUserId(userId);
  if (cache.inFlight.get(key) === promise) cache.inFlight.delete(key);
}

export function invalidateAccessStateCacheForUser(userId) {
  const key = normalizeUserId(userId);
  if (!key) return false;
  return cache.entries.delete(key);
}

globalThis.__accessStateCache = {
  invalidateForUser: invalidateAccessStateCacheForUser,
};

export const ACCESS_STATE_USER_PROJECTION = Object.freeze({
  points: 1,
  unlockedFeatures: 1,
  paidFeatures: 1,
  destinyProfilesCurrentId: 1,
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
