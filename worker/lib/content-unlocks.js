import {
  CONTENT_ENTITLEMENT_SCOPES,
  CONTENT_ENTITLEMENT_SOURCES,
  CONTENT_ENTITLEMENT_STATUSES,
  ContentEntitlement,
  SAJU_LOCKED_CONTENT_KEYS,
} from "./models.js";
import { createHttpError } from "./http.js";
import { normalizePaidFeatureKey } from "./paid-feature-registry.js";

const USER_SCOPE_PROFILE_ID = "__user__";

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

function cleanKey(value, maxLen = 160) {
  return String(value || "").trim().slice(0, maxLen);
}

function normalizeDateOrNull(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function activeExpiryClause(now = new Date()) {
  return {
    $or: [
      { expiresAt: null },
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } },
    ],
  };
}

function buildProfileScopeClause(profileId) {
  return {
    $or: [
      { scope: CONTENT_ENTITLEMENT_SCOPES.PROFILE, profileId },
      { scope: CONTENT_ENTITLEMENT_SCOPES.USER },
      { profileId: USER_SCOPE_PROFILE_ID },
    ],
  };
}

function canonicalizeContentKey(value) {
  const key = cleanKey(value, 160);
  return PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY[key] || key;
}

function resolveContentKeyAliases(value) {
  const canonicalKey = canonicalizeContentKey(value);
  const aliases = new Set([canonicalKey]);
  const legacyFeatureKey = PROFILE_UNLOCK_FEATURE_BY_CONTENT_KEY[canonicalKey];
  if (legacyFeatureKey) aliases.add(legacyFeatureKey);
  return Array.from(aliases).filter(Boolean);
}

function buildContentKeyClause(contentKey) {
  const aliases = resolveContentKeyAliases(contentKey);
  return aliases.length > 1 ? { contentKey: { $in: aliases } } : { contentKey: aliases[0] || "" };
}

function resolvePaidContentServiceKey(featureKey, fallback = "") {
  const key = String(featureKey || "").trim().toLowerCase();
  if (key === "fun.quantumlotto.ritualreport") return "saju";
  if (key.startsWith("section_") || key.includes("saju") || key.includes("lifebook") || key.includes("love-secret")) return "saju";
  if (ZIWEI_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY[key] || PROFILE_UNLOCK_FEATURE_BY_CONTENT_KEY[key]) return "ziwei";
  if (key.includes("ziwei")) return "ziwei";
  if (key.includes("astrology") || key.includes("western")) return "western_astrology";
  if (key.includes("sukuyo") || key.includes("sukyo")) return "sukuyo";
  if (key.includes("vedic") || key.includes("veda")) return "vedic";
  if (key.includes("tarot")) return "tarot";
  if (key.includes("fpti")) return "fpti";
  if (key.includes("naming")) return "naming";
  if (key.includes("soul-origin") || key.includes("soul_origin")) return "soul_origin";
  if (key.includes("celestial")) return "celestial_harmony";
  if (key.includes("destiny-bias")) return "destiny_bias";
  if (key.includes("animal-destiny")) return "animal_destiny";
  return cleanKey(fallback || "paid_content", 80);
}

export function resolvePaidContentUnlockTarget({
  userId = "",
  profileId = "",
  serviceKey = "",
  contentKey = "",
  featureKey = "",
  productKey = "",
  scope = "",
} = {}) {
  const rawFeatureKey = cleanKey(featureKey || contentKey || productKey, 160);
  const profileContentKey = PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY[rawFeatureKey] || "";
  const explicitContentKey = canonicalizeContentKey(contentKey);
  const isLottoRitualReport = rawFeatureKey === "fun.quantumLotto.ritualReport";
  const normalizedContentKey = cleanKey(
    explicitContentKey
      || profileContentKey
      || normalizePaidFeatureKey(rawFeatureKey)
      || rawFeatureKey
      || productKey,
    160,
  );
  const resolvedServiceKey = cleanKey(serviceKey || resolvePaidContentServiceKey(rawFeatureKey || normalizedContentKey), 80);
  const requiresProfile = Boolean(profileContentKey) || isLottoRitualReport;
  const normalizedScope = cleanKey(scope, 20)
    || (requiresProfile || profileId ? CONTENT_ENTITLEMENT_SCOPES.PROFILE : CONTENT_ENTITLEMENT_SCOPES.USER);
  const normalizedProfileId = cleanKey(profileId || (normalizedScope === CONTENT_ENTITLEMENT_SCOPES.USER ? USER_SCOPE_PROFILE_ID : ""), 100);

  return {
    userId: cleanKey(userId, 120),
    profileId: normalizedProfileId,
    serviceKey: resolvedServiceKey,
    contentKey: normalizedContentKey,
    scope: normalizedScope,
    requiresProfile,
    featureKey: rawFeatureKey,
  };
}

export async function findActivePaidContentUnlock(input = {}) {
  const target = resolvePaidContentUnlockTarget(input);
  if (!target.userId || !target.serviceKey || !target.contentKey) return null;
  if (target.requiresProfile && !target.profileId) return null;

  const profileScopeClause = target.profileId
    ? buildProfileScopeClause(target.profileId)
    : { scope: CONTENT_ENTITLEMENT_SCOPES.USER };
  return ContentEntitlement.findOne({
    userId: target.userId,
    serviceKey: target.serviceKey,
    ...buildContentKeyClause(target.contentKey),
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    $and: [
      activeExpiryClause(),
      profileScopeClause,
    ],
  }).lean();
}

export async function upsertPaidContentUnlock(input = {}) {
  const target = resolvePaidContentUnlockTarget(input);
  if (!target.userId || !target.serviceKey || !target.contentKey) {
    throw createHttpError(400, "Unlock target is required.", { code: "INVALID_UNLOCK_TARGET" });
  }
  if (target.requiresProfile && !target.profileId) {
    throw createHttpError(400, "Profile id is required for profile-scoped unlock entitlement.", { code: "MISSING_PROFILE_ID" });
  }
  return upsertContentUnlock({
    ...input,
    userId: target.userId,
    profileId: target.profileId || USER_SCOPE_PROFILE_ID,
    serviceKey: target.serviceKey,
    contentKey: target.contentKey,
    scope: target.scope,
  });
}

export async function hasUnlockedContent({ userId, profileId, serviceKey, contentKey }) {
  const normalized = {
    userId: cleanKey(userId, 120),
    profileId: cleanKey(profileId, 100),
    serviceKey: cleanKey(serviceKey, 80),
    contentKey: cleanKey(contentKey, 160),
  };
  if (!normalized.userId || !normalized.profileId || !normalized.serviceKey || !normalized.contentKey) return false;

  const doc = await ContentEntitlement.findOne({
    userId: normalized.userId,
    serviceKey: normalized.serviceKey,
    ...buildContentKeyClause(normalized.contentKey),
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    $and: [
      activeExpiryClause(),
      buildProfileScopeClause(normalized.profileId),
    ],
  }).select("_id").lean();

  return Boolean(doc?._id);
}

export async function upsertContentUnlock({
  userId,
  profileId,
  serviceKey,
  contentKey,
  scope = CONTENT_ENTITLEMENT_SCOPES.PROFILE,
  status = CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
  source,
  orderId = "",
  paymentId = "",
  passId = "",
  coinAmount = 0,
  unlockedAt = null,
  expiresAt = null,
}) {
  const normalized = {
    userId: cleanKey(userId, 120),
    profileId: cleanKey(profileId, 100),
    serviceKey: cleanKey(serviceKey, 80),
    contentKey: cleanKey(contentKey, 160),
    scope: cleanKey(scope, 20) || CONTENT_ENTITLEMENT_SCOPES.PROFILE,
    status: cleanKey(status, 20) || CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    source: cleanKey(source, 20),
  };

  if (!normalized.userId || !normalized.profileId || !normalized.serviceKey || !normalized.contentKey) {
    throw createHttpError(400, "Unlock target is required.", { code: "INVALID_UNLOCK_TARGET" });
  }
  if (!Object.values(CONTENT_ENTITLEMENT_SOURCES).includes(normalized.source)) {
    throw createHttpError(400, "Unlock source is invalid.", { code: "INVALID_UNLOCK_SOURCE" });
  }

  const now = new Date();
  const effectiveUnlockedAt = normalizeDateOrNull(unlockedAt) || now;
  const effectiveExpiresAt = normalizeDateOrNull(expiresAt);

  return ContentEntitlement.findOneAndUpdate(
    {
      userId: normalized.userId,
      profileId: normalized.profileId,
      serviceKey: normalized.serviceKey,
      contentKey: normalized.contentKey,
      scope: normalized.scope,
    },
    {
      $set: {
        status: normalized.status,
        source: normalized.source,
        orderId: cleanKey(orderId, 160),
        paymentId: cleanKey(paymentId, 160),
        passId: cleanKey(passId, 160),
        coinAmount: Math.max(0, Math.floor(Number(coinAmount || 0))),
        expiresAt: effectiveExpiresAt,
        updatedAt: now,
      },
      $setOnInsert: {
        userId: normalized.userId,
        profileId: normalized.profileId,
        serviceKey: normalized.serviceKey,
        contentKey: normalized.contentKey,
        scope: normalized.scope,
        unlockedAt: effectiveUnlockedAt,
        createdAt: now,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
}

export async function getUnlockedContentKeys({ userId, profileId, serviceKey }) {
  const normalized = {
    userId: cleanKey(userId, 120),
    profileId: cleanKey(profileId, 100),
    serviceKey: cleanKey(serviceKey, 80),
  };
  if (!normalized.userId || !normalized.profileId || !normalized.serviceKey) return [];

  const docs = await ContentEntitlement.find({
    userId: normalized.userId,
    serviceKey: normalized.serviceKey,
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    $and: [
      activeExpiryClause(),
      buildProfileScopeClause(normalized.profileId),
    ],
  }).select("contentKey source unlockedAt expiresAt").lean();

  return docs.map((doc) => ({
    ...doc,
    contentKey: canonicalizeContentKey(doc?.contentKey),
  }));
}

export async function ensureContentAccessOrThrow({ userId, profileId, serviceKey, contentKey }) {
  const unlocked = await hasUnlockedContent({ userId, profileId, serviceKey, contentKey });
  if (!unlocked) {
    throw createHttpError(403, "Content unlock is required.", { code: "CONTENT_LOCKED" });
  }
  return true;
}
