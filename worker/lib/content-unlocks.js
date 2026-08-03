import {
  CONTENT_ENTITLEMENT_SCOPES,
  CONTENT_ENTITLEMENT_SOURCES,
  CONTENT_ENTITLEMENT_STATUSES,
  ContentEntitlement,
  SAJU_LOCKED_CONTENT_KEYS,
  User,
} from "./models.js";
import { createHttpError } from "./http.js";
import { isUnlockPaidFeatureKey, normalizePaidFeatureKey } from "./paid-feature-registry.js";

// 계정 스코프(프로필 무관) 엔타이틀먼트의 profileId 자리표시자. 읽기 절(buildProfileScopeClause)과
// 쓰기 경로가 같은 값을 써야 하므로 정산 코드(payments.js)에서도 이 상수를 가져다 쓴다.
export const USER_SCOPE_PROFILE_ID = "__user__";

const SAJU_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY = Object.freeze({
  section_daewun: SAJU_LOCKED_CONTENT_KEYS.DAEUN_ANALYSIS,
  section_summary: SAJU_LOCKED_CONTENT_KEYS.FULL_READING,
  section_compat: SAJU_LOCKED_CONTENT_KEYS.COMPATIBILITY,
});

const SUKYO_YEARLY_FORTUNE_PRODUCT_KEY = "sukyo_yearly_fortune_unlock";

const ZIWEI_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY = Object.freeze({
  ziwei_decade_luck: "ziwei.decadeLuck",
  ziwei_love_deep: "ziwei.loveDeep",
  ziwei_twelve_palaces: "ziwei.twelvePalaces",
  ziwei_symbolic_layer: "ziwei.symbolicLayer",
  ziwei_life_yearly_flow: "ziwei.lifeYearlyFlow",
});

const PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY = Object.freeze({
  ...SAJU_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY,
  ...ZIWEI_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY,
  [SUKYO_YEARLY_FORTUNE_PRODUCT_KEY]: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
  "premium-fpti-report": "fpti.deepReport",
});

const PROFILE_UNLOCK_FEATURE_BY_CONTENT_KEY = Object.freeze(
  Object.fromEntries(
    Object.entries(PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY).map(([featureKey, contentKey]) => [contentKey, featureKey]),
  ),
);

function cleanKey(value, maxLen = 160) {
  return String(value || "").trim().slice(0, maxLen);
}

function uniqueKeys(values = []) {
  return Array.from(new Set(values.map((value) => cleanKey(value)).filter(Boolean)));
}

function invalidateAccessReadCaches(userId) {
  const normalizedUserId = cleanKey(userId, 120);
  if (!normalizedUserId) return;
  try { globalThis.__accessStateCache?.invalidateForUser?.(normalizedUserId); } catch {}
  try { globalThis.__paidAccessDecisionCache?.invalidateForUser?.(normalizedUserId); } catch {}
}

function featureKeyVariants(value) {
  const raw = cleanKey(value);
  const normalized = normalizePaidFeatureKey(raw) || raw;
  return uniqueKeys([
    raw,
    normalized,
    raw.replace(/_/g, "-"),
    raw.replace(/-/g, "_"),
    normalized.replace(/_/g, "-"),
    normalized.replace(/-/g, "_"),
  ]);
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

function buildAccountSnapshotScopeClause(profileId) {
  const normalizedProfileId = cleanKey(profileId, 100);
  const scopeClauses = [
    { scope: CONTENT_ENTITLEMENT_SCOPES.USER },
    { profileId: USER_SCOPE_PROFILE_ID },
  ];
  if (normalizedProfileId) {
    scopeClauses.push({ scope: CONTENT_ENTITLEMENT_SCOPES.PROFILE, profileId: normalizedProfileId });
  }
  return { $or: scopeClauses };
}

function canonicalizeContentKey(value) {
  const key = cleanKey(value, 160);
  return PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY[key] || key;
}

export function resolveUnlockedFeatureKeyFromContentKey(value) {
  const key = canonicalizeContentKey(value);
  if (key === SUKYO_YEARLY_FORTUNE_PRODUCT_KEY || key.startsWith(`${SUKYO_YEARLY_FORTUNE_PRODUCT_KEY}:`)) {
    return SUKYO_YEARLY_FORTUNE_PRODUCT_KEY;
  }
  return PROFILE_UNLOCK_FEATURE_BY_CONTENT_KEY[key] || key;
}

export function isProfileScopedContentUnlockFeatureKey(value) {
  const key = cleanKey(value);
  if (!key) return false;
  return Boolean(PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY[key]);
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
  if (key === SUKYO_YEARLY_FORTUNE_PRODUCT_KEY || key.startsWith(`${SUKYO_YEARLY_FORTUNE_PRODUCT_KEY}:`)) return "sukuyo";
  if (ZIWEI_PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY[key]) return "ziwei";
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
  if (key.includes("sibyl") || key.includes("dominator")) return "saju";
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
  const normalizedContentKey = cleanKey(
    explicitContentKey
      || profileContentKey
      || normalizePaidFeatureKey(rawFeatureKey)
      || rawFeatureKey
      || productKey,
    160,
  );
  const resolvedServiceKey = cleanKey(serviceKey || resolvePaidContentServiceKey(rawFeatureKey || normalizedContentKey), 80);
  const requiresProfile = Boolean(profileContentKey);
  const normalizedScope = cleanKey(scope, 20)
    || (requiresProfile ? CONTENT_ENTITLEMENT_SCOPES.PROFILE : CONTENT_ENTITLEMENT_SCOPES.USER);
  const normalizedProfileId = normalizedScope === CONTENT_ENTITLEMENT_SCOPES.USER
    ? USER_SCOPE_PROFILE_ID
    : cleanKey(profileId, 100);
  const normalizedFeatureKey = cleanKey(normalizePaidFeatureKey(rawFeatureKey) || rawFeatureKey || normalizedContentKey, 160);

  return {
    userId: cleanKey(userId, 120),
    profileId: normalizedProfileId,
    serviceKey: resolvedServiceKey,
    contentKey: normalizedContentKey,
    scope: normalizedScope,
    requiresProfile,
    featureKey: normalizedFeatureKey,
  };
}

export function formatPermanentUnlockGrant(document = {}, fallback = {}) {
  if (String(document?.grantType || "").trim().toLowerCase() !== "permanent_unlock") return null;
  const featureKey = cleanKey(document?.featureKey || fallback?.featureKey, 160);
  if (!featureKey) return null;
  const grantedAt = normalizeDateOrNull(document?.grantedAt || document?.unlockedAt || fallback?.grantedAt) || new Date();
  return {
    id: cleanKey(document?._id || fallback?.id, 180),
    featureKey,
    profileId: cleanKey(document?.profileId || fallback?.profileId, 100),
    scope: cleanKey(document?.scope || fallback?.scope, 20) || CONTENT_ENTITLEMENT_SCOPES.USER,
    grantType: "permanent_unlock",
    status: String(document?.status || fallback?.status || CONTENT_ENTITLEMENT_STATUSES.ACTIVE).toLowerCase(),
    grantedAt: grantedAt.toISOString(),
    version: grantedAt.getTime(),
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

export async function findActivePaidContentUnlockByServiceKeys(input = {}) {
  const serviceKeys = uniqueKeys(input.serviceKeys || []);
  const target = resolvePaidContentUnlockTarget({ ...input, serviceKey: serviceKeys[0] || input.serviceKey });
  if (!target.userId || !serviceKeys.length || !target.contentKey) return null;
  if (target.requiresProfile && !target.profileId) return null;

  const profileScopeClause = target.profileId
    ? buildProfileScopeClause(target.profileId)
    : { scope: CONTENT_ENTITLEMENT_SCOPES.USER };
  return ContentEntitlement.findOne({
    userId: target.userId,
    serviceKey: { $in: serviceKeys },
    ...buildContentKeyClause(target.contentKey),
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    $and: [
      activeExpiryClause(),
      profileScopeClause,
    ],
  }).lean();
}

export async function upsertPaidContentUnlock(input = {}) {
  return grantPermanentUnlock(input);
}

export async function grantPermanentUnlock(input = {}) {
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
    featureKey: target.featureKey,
    scope: target.scope,
    grantType: "permanent_unlock",
    evidenceId: input.evidenceId || input.paymentId || input.orderId || input.passId,
    grantedAt: input.grantedAt || input.unlockedAt,
    expiresAt: null,
  });
}

export async function revokePaymentContentAccess({
  payment = {},
  revokedStatus = CONTENT_ENTITLEMENT_STATUSES.REFUNDED,
  reason = "",
  session = null,
} = {}) {
  const userId = cleanKey(payment?.userId, 120);
  if (!userId) return { ok: false, skipped: true, reason: "MISSING_USER_ID" };

  const pricing = payment?.pricingSnapshot && typeof payment.pricingSnapshot === "object"
    ? payment.pricingSnapshot
    : {};
  const target = resolvePaidContentUnlockTarget({
    userId,
    profileId: pricing.profileId || pricing.selectedProfileId || payment.profileId,
    serviceKey: pricing.serviceKey || pricing.serviceId || payment.productId,
    contentKey: pricing.contentKey || pricing.contentId || payment.contentKey || payment.featureKey,
    featureKey: payment.featureKey || pricing.featureKey || pricing.contentKey || pricing.contentId,
    productKey: payment.productId,
    scope: pricing.scope,
  });
  const paymentIds = uniqueKeys([
    payment._id,
    payment.id,
    payment.impUid,
    payment.merchantUid,
    payment.paymentId,
    payment.requestId,
    payment.orderId,
  ]);
  const contentAliases = uniqueKeys([
    target.contentKey,
    ...(target.contentKey ? resolveContentKeyAliases(target.contentKey) : []),
    pricing.contentId,
    pricing.contentKey,
    payment.featureKey,
  ]);
  const clauses = [];
  if (paymentIds.length) {
    clauses.push({ paymentId: { $in: paymentIds } }, { orderId: { $in: paymentIds } });
  }
  if (target.serviceKey && contentAliases.length) {
    const contentClause = {
      serviceKey: target.serviceKey,
      contentKey: { $in: contentAliases },
    };
    if (target.profileId) contentClause.profileId = target.profileId;
    clauses.push(contentClause);
  }
  if (!clauses.length) return { ok: false, skipped: true, reason: "MISSING_UNLOCK_TARGET" };

  const status = Object.values(CONTENT_ENTITLEMENT_STATUSES).includes(revokedStatus)
    ? revokedStatus
    : CONTENT_ENTITLEMENT_STATUSES.REFUNDED;
  const now = new Date();
  const update = ContentEntitlement.updateMany(
    {
      userId,
      source: CONTENT_ENTITLEMENT_SOURCES.PAYMENT,
      status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
      $or: clauses,
    },
    {
      $set: {
        status,
        expiresAt: now,
        updatedAt: now,
      },
    },
  );
  if (session) update.session(session);
  const entitlementResult = await update;

  const featureVariants = uniqueKeys([
    ...featureKeyVariants(payment.featureKey),
    ...featureKeyVariants(target.featureKey),
    ...featureKeyVariants(resolveUnlockedFeatureKeyFromContentKey(target.contentKey)),
  ]);
  let userResult = null;
  if (featureVariants.length) {
    const userUpdate = User.updateOne(
      { _id: userId },
      {
        $pull: {
          paidFeatures: { $in: featureVariants },
          unlockedFeatures: { $in: featureVariants },
        },
      },
    );
    if (session) userUpdate.session(session);
    userResult = await userUpdate;
  }

  const entitlementModifiedCount = Number(entitlementResult?.modifiedCount || 0);
  const entitlementMatchedCount = Number(entitlementResult?.matchedCount || entitlementResult?.n || 0);
  const userModifiedCount = Number(userResult?.modifiedCount || userResult?.nModified || 0);
  if (entitlementModifiedCount > 0 || userModifiedCount > 0) invalidateAccessReadCaches(userId);
  return {
    ok: true,
    unlockRevoked: entitlementModifiedCount > 0 || userModifiedCount > 0,
    entitlementMatchedCount,
    entitlementModifiedCount,
    userModifiedCount,
    status,
    reason: cleanKey(reason, 160),
    featureKeys: featureVariants,
  };
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
  featureKey = "",
  scope = CONTENT_ENTITLEMENT_SCOPES.PROFILE,
  status = CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
  source,
  orderId = "",
  paymentId = "",
  passId = "",
  grantType = "",
  evidenceId = "",
  coinAmount = 0,
  unlockedAt = null,
  grantedAt = null,
  expiresAt = null,
  session = null,
}) {
  const normalized = {
    userId: cleanKey(userId, 120),
    profileId: cleanKey(profileId, 100),
    serviceKey: cleanKey(serviceKey, 80),
    contentKey: cleanKey(contentKey, 160),
    featureKey: cleanKey(featureKey, 160),
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
  const effectiveGrantedAt = normalizeDateOrNull(grantedAt) || effectiveUnlockedAt;
  const effectiveExpiresAt = normalizeDateOrNull(expiresAt);

  const identity = normalized.featureKey
    ? {
        userId: normalized.userId,
        profileId: normalized.profileId,
        scope: normalized.scope,
        $or: [
          { featureKey: normalized.featureKey },
          { featureKey: "", serviceKey: normalized.serviceKey, contentKey: normalized.contentKey },
          { featureKey: { $exists: false }, serviceKey: normalized.serviceKey, contentKey: normalized.contentKey },
        ],
      }
    : {
        userId: normalized.userId,
        profileId: normalized.profileId,
        serviceKey: normalized.serviceKey,
        contentKey: normalized.contentKey,
        scope: normalized.scope,
      };

  const query = ContentEntitlement.findOneAndUpdate(
    identity,
    {
      $set: {
        serviceKey: normalized.serviceKey,
        contentKey: normalized.contentKey,
        featureKey: normalized.featureKey,
        status: normalized.status,
        source: normalized.source,
        grantType: cleanKey(grantType, 40),
        evidenceId: cleanKey(evidenceId, 180),
        orderId: cleanKey(orderId, 160),
        paymentId: cleanKey(paymentId, 160),
        passId: cleanKey(passId, 160),
        coinAmount: Math.max(0, Math.floor(Number(coinAmount || 0))),
        expiresAt: effectiveExpiresAt,
        grantedAt: effectiveGrantedAt,
        updatedAt: now,
      },
      $setOnInsert: {
        userId: normalized.userId,
        profileId: normalized.profileId,
        scope: normalized.scope,
        unlockedAt: effectiveUnlockedAt,
        createdAt: now,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (session) query.session(session);
  const document = await query.lean();
  invalidateAccessReadCaches(normalized.userId);
  return document;
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

export async function getUnlockedContentSnapshot({ userId, profileId = "", serviceKey = "", serviceKeys = [] } = {}) {
  const normalizedUserId = cleanKey(userId, 120);
  if (!normalizedUserId) {
    return {
      docs: [],
      contentKeys: [],
      featureKeys: [],
      unlockMap: {},
      profileScopedAuthoritative: false,
    };
  }

  const normalizedServiceKeys = Array.from(new Set([
    ...((Array.isArray(serviceKeys) ? serviceKeys : []).map((key) => cleanKey(key, 80))),
    cleanKey(serviceKey, 80),
  ].filter(Boolean)));
  const query = {
    userId: normalizedUserId,
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    $and: [
      activeExpiryClause(),
      buildAccountSnapshotScopeClause(profileId),
    ],
  };
  if (normalizedServiceKeys.length === 1) {
    query.serviceKey = normalizedServiceKeys[0];
  } else if (normalizedServiceKeys.length > 1) {
    query.serviceKey = { $in: normalizedServiceKeys };
  }

  const docs = await ContentEntitlement.find(query)
    .select("featureKey contentKey contentId serviceKey scope profileId source grantType grantedAt unlockedAt expiresAt")
    .lean();
  const contentKeys = [];
  const featureKeys = [];
  const unlockMap = Object.create(null);

  for (const doc of docs) {
    const contentKey = canonicalizeContentKey(doc?.contentKey || doc?.contentId);
    const featureKey = cleanKey(doc?.featureKey, 160) || resolveUnlockedFeatureKeyFromContentKey(contentKey);
    if (!isUnlockPaidFeatureKey(featureKey)) continue;
    if (contentKey) contentKeys.push(contentKey);
    if (featureKey) {
      featureKeys.push(featureKey);
      unlockMap[featureKey] = true;
    }
  }

  return {
    docs: docs.map((doc) => ({
      ...doc,
      contentKey: canonicalizeContentKey(doc?.contentKey || doc?.contentId),
    })),
    contentKeys: Array.from(new Set(contentKeys)),
    featureKeys: Array.from(new Set(featureKeys)),
    unlockMap,
    profileScopedAuthoritative: Boolean(cleanKey(profileId, 100)),
  };
}

export async function ensureContentAccessOrThrow({ userId, profileId, serviceKey, contentKey }) {
  const unlocked = await hasUnlockedContent({ userId, profileId, serviceKey, contentKey });
  if (!unlocked) {
    throw createHttpError(403, "Content unlock is required.", { code: "CONTENT_LOCKED" });
  }
  return true;
}
