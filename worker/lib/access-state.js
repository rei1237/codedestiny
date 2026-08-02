const ACCESS_STATE_TTL_MS = 5000;
const ACCESS_STATE_STALE_TTL_MS = 60000;
const ACCESS_STATE_MAX_ENTRIES = 2500;

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

  return {
    userId: normalizeUserId(userId),
    hasActivePass,
    passType: hasActivePass ? tier : undefined,
    activeUntil: normalizeIsoDate(activeUntil),
    coinBalance: Math.max(0, Math.floor(Number(user?.points || 0))),
    profileCount: Math.max(0, Math.floor(Number(profileCount || 0))),
    maxProfileCount,
    source,
    checkedAt,
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
  cache.entries.delete(key);
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
