import {
  CONTENT_ENTITLEMENT_SCOPES,
  CONTENT_ENTITLEMENT_SOURCES,
  CONTENT_ENTITLEMENT_STATUSES,
  ContentEntitlement,
  SAJU_LOCKED_CONTENT_KEYS,
  User,
} from "./models.js";
import { createHttpError } from "./http.js";
import {
  isBirthScopedUnlockFeatureKey,
  isPerUsePaidFeatureKey,
  isUnlockPaidFeatureKey,
  normalizePaidFeatureKey,
} from "./paid-feature-registry.js";
import {
  BIRTH_ENTITLEMENT_PROFILE_PREFIX,
  BIRTH_ENTITLEMENT_SCOPE,
  isBirthEntitlementProfileId,
  toBirthEntitlementProfileId,
} from "./birth-key.js";
import { resolveBirthUnlockIdentity, tryResolveBirthUnlockIdentity } from "./birth-scoped-unlock-identity.js";

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

function isDuplicateKeyError(error) {
  return Number(error?.code) === 11000;
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

// 🔴 계정 기반 키 전용이다. 출생 기반 키는 USER·"__user__"·PROFILE 행을 근거로 보지 않고
// birthScopeClause 만 쓴다(아래 출생 기반 해금 절 참고).
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

/* 계정 배열(User.unlockedFeatures/paidFeatures)·USER 행을 근거로 쓰면 안 되는 키인가.
   출생 기반 키는 전부 여기에 든다 — 그래서 access-state·paid-content-read-access 의 계정 경로가 자동으로 닫힌다. */
export function isProfileScopedContentUnlockFeatureKey(value) {
  const key = cleanKey(value);
  if (!key) return false;
  return Boolean(PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY[key]) || isBirthScopedUnlockFeatureKey(key);
}

// ── 출생 기반 해금(userId + birthKey + contentKey) ──
// 행은 scope "BIRTH", profileId "birth:<birthKey>" 로 저장된다. 신원은 서버의 ProfileCard 에서만 만든다
// (worker/lib/birth-scoped-unlock-identity.js). 합성 profileId 는 응답으로 내보내지 않는다.

export function isBirthScopedContentTarget({ featureKey = "", contentKey = "" } = {}) {
  return isBirthScopedUnlockFeatureKey(cleanKey(featureKey))
    || isBirthScopedUnlockFeatureKey(resolveUnlockedFeatureKeyFromContentKey(contentKey));
}

function birthKeyFromEntitlementProfileId(value) {
  const key = cleanKey(value, 100);
  return isBirthEntitlementProfileId(key) ? key.slice(BIRTH_ENTITLEMENT_PROFILE_PREFIX.length) : "";
}

function birthScopeClause(entitlementProfileId) {
  return { scope: BIRTH_ENTITLEMENT_SCOPE, profileId: entitlementProfileId };
}

// 조회용 신원. 못 만들면 null(= 잠금). 서버 내부 호출이 이미 합성 profileId 를 갖고 있으면 그대로 쓴다.
async function resolveBirthReadIdentity(target, input = {}) {
  if (input.birthIdentity?.entitlementProfileId) return input.birthIdentity;
  const internal = birthKeyFromEntitlementProfileId(target.profileId);
  if (internal) return { entitlementProfileId: target.profileId, birthKey: internal, profileId: "" };
  if (!target.userId || !target.profileId) return null;
  return tryResolveBirthUnlockIdentity({
    userId: target.userId,
    profileId: target.profileId,
    partnerProfileId: input.partnerProfileId,
    featureKey: target.featureKey,
  }, input.findProfileCard ? { findProfileCard: input.findProfileCard } : {});
}

// 쓰기용 신원. 실패하면 던진다(MISSING_PROFILE_ID / INVALID_PROFILE).
// birthKey 는 **서버가 계산해 저장한 스냅샷**(주문 pricingSnapshot 등)에서 온 값만 넘긴다.
async function resolveBirthWriteIdentity({
  userId,
  profileId,
  partnerProfileId = "",
  featureKey,
  birthKey = "",
  partnerBirthKey = "",
  purchaseProfileId = "",
  purchasePartnerProfileId = "",
  birthIdentity = null,
  findProfileCard = null,
}) {
  if (birthIdentity?.entitlementProfileId) return birthIdentity;
  const snapshotPid = toBirthEntitlementProfileId(cleanKey(birthKey, 64));
  const internalKey = birthKeyFromEntitlementProfileId(profileId);
  if (snapshotPid || internalKey) {
    const key = snapshotPid ? cleanKey(birthKey, 64) : internalKey;
    return {
      entitlementProfileId: toBirthEntitlementProfileId(key),
      birthKey: key,
      partnerBirthKey: cleanKey(partnerBirthKey, 64),
      profileId: cleanKey(purchaseProfileId || (internalKey ? "" : profileId), 80),
      partnerProfileId: cleanKey(purchasePartnerProfileId || partnerProfileId, 80),
    };
  }
  const requested = cleanKey(profileId, 100) === USER_SCOPE_PROFILE_ID ? "" : profileId;
  return resolveBirthUnlockIdentity(
    { userId, profileId: requested, partnerProfileId, featureKey },
    findProfileCard ? { findProfileCard } : {},
  );
}

// 이 행이 해금 근거가 될 수 있는가. 출생 기반 콘텐츠의 USER/PROFILE 행(전환 이전 기록)은 근거가 아니다.
function isBirthScopeEvidence(doc) {
  const featureKey = cleanKey(doc?.featureKey, 160) || resolveUnlockedFeatureKeyFromContentKey(doc?.contentKey || doc?.contentId);
  if (!isBirthScopedContentTarget({ featureKey, contentKey: doc?.contentKey || doc?.contentId })) return true;
  return doc?.scope === BIRTH_ENTITLEMENT_SCOPE;
}

function presentBirthDoc(doc, profileId = "") {
  if (!doc) return doc;
  return {
    ...doc,
    profileId: cleanKey(profileId, 100) || cleanKey(doc.purchaseProfileId, 100),
    birthEntitlementProfileId: doc.profileId,
  };
}

/**
 * 라우트 리더의 단일 진입점: 이 계정이 이 프로필(=그 출생 정보)로 이 콘텐츠를 영구 해금했는가.
 * 출생 기반 키는 BIRTH 행만, 계정 기반 키는 종전 판정(findActivePaidContentUnlock)을 쓴다.
 */
export async function hasPaidUnlockForProfile({ userId, profileId, partnerProfileId = "", featureKey, serviceKey = "", contentKey = "" } = {}) {
  const doc = await findActivePaidContentUnlock({ userId, profileId, partnerProfileId, featureKey, serviceKey, contentKey });
  return Boolean(doc);
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

/* featureKey → serviceKey 유도 정본. payments V2 지급(worker/payments/entitlements.js)도 이걸 쓴다 —
   예전엔 V2 만 serviceKey 를 featureKey 로 접어, 같은 상품이 쓰기 경로에 따라 서로 다른 키로 저장됐다. */
export function resolvePaidContentServiceKey(featureKey, fallback = "") {
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
  const normalizedFeatureKey = cleanKey(normalizePaidFeatureKey(rawFeatureKey) || rawFeatureKey || normalizedContentKey, 160);
  // 🔴 출생 기반 키는 요청의 scope(USER 등)를 무시한다. profileId 는 실제 프로필 id 로 남기고,
  // 신원(birthKey)은 비동기 리더/라이터가 ProfileCard 로 만든다.
  const birthScoped = isBirthScopedContentTarget({ featureKey: normalizedFeatureKey, contentKey: normalizedContentKey });
  const requiresProfile = birthScoped || Boolean(profileContentKey);
  const normalizedScope = birthScoped
    ? BIRTH_ENTITLEMENT_SCOPE
    : cleanKey(scope, 20)
      || (requiresProfile ? CONTENT_ENTITLEMENT_SCOPES.PROFILE : CONTENT_ENTITLEMENT_SCOPES.USER);
  const requestedProfileId = cleanKey(profileId, 100);
  const normalizedProfileId = birthScoped
    ? (requestedProfileId === USER_SCOPE_PROFILE_ID ? "" : requestedProfileId)
    : normalizedScope === CONTENT_ENTITLEMENT_SCOPES.USER
      ? USER_SCOPE_PROFILE_ID
      : requestedProfileId;

  return {
    userId: cleanKey(userId, 120),
    profileId: normalizedProfileId,
    serviceKey: resolvedServiceKey,
    contentKey: normalizedContentKey,
    scope: normalizedScope,
    requiresProfile,
    birthScoped,
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
    // 합성 신원("birth:…")은 내보내지 않는다 — 요청한 프로필(또는 구매 프로필)을 싣는다.
    profileId: isBirthEntitlementProfileId(document?.profileId)
      ? cleanKey(fallback?.profileId || document?.purchaseProfileId, 100)
      : cleanKey(document?.profileId || fallback?.profileId, 100),
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
  /* 🔴 회당 결제 키는 영구 해금 행을 가질 수 없다. 가지고 있다면 그건 단건 KRW 확정 경로가
     billingType 검사 없이 썼던 잔존분이다(PR #1137 이전). 그 행 하나로 coin-gate 가
     already_unlocked 를 돌려 **결제창이 아예 안 열린다**(billing.js resolvePaidContentAccess).
     형제 근거인 hasUserScopedPermanentUnlock 은 이미 같은 경계를 가지고 있었고, 이쪽만 빠져 있었다.
     호출부마다 감싸지 않고 공유 리더인 여기 한 곳에서 막는다(원칙 6). */
  if (isPerUsePaidFeatureKey(target.featureKey)) return null;

  if (target.birthScoped) {
    const identity = await resolveBirthReadIdentity(target, input);
    if (!identity) return null;
    const doc = await ContentEntitlement.findOne({
      userId: target.userId,
      serviceKey: target.serviceKey,
      ...buildContentKeyClause(target.contentKey),
      status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
      ...birthScopeClause(identity.entitlementProfileId),
      $and: [activeExpiryClause()],
    }).lean();
    return presentBirthDoc(doc, target.profileId);
  }

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

  if (target.birthScoped) {
    const identity = await resolveBirthReadIdentity(target, input);
    if (!identity) return null;
    const doc = await ContentEntitlement.findOne({
      userId: target.userId,
      serviceKey: { $in: serviceKeys },
      ...buildContentKeyClause(target.contentKey),
      status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
      ...birthScopeClause(identity.entitlementProfileId),
      $and: [activeExpiryClause()],
    }).lean();
    return presentBirthDoc(doc, target.profileId);
  }

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
  if (target.birthScoped) {
    // 소유 확인 + 서버 출생 정보로 신원을 만든다. 실패하면 MISSING_PROFILE_ID / INVALID_PROFILE 로 던진다.
    const identity = await resolveBirthWriteIdentity({ ...input, userId: target.userId, profileId: target.profileId, featureKey: target.featureKey });
    return upsertContentUnlock({
      ...input,
      userId: target.userId,
      profileId: identity.entitlementProfileId,
      serviceKey: target.serviceKey,
      contentKey: target.contentKey,
      featureKey: target.featureKey,
      scope: BIRTH_ENTITLEMENT_SCOPE,
      birthIdentity: identity,
      grantType: "permanent_unlock",
      evidenceId: input.evidenceId || input.paymentId || input.orderId || input.passId,
      grantedAt: input.grantedAt || input.unlockedAt,
      expiresAt: null,
    });
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

/* 마이그레이션이 병합한 BIRTH 행(source BACKFILL)은 여러 구매(mergedOrderIds)를 근거로 한다.
   환불된 주문 하나만 근거에서 빼고, 근거가 하나도 남지 않을 때만 회수한다 — 같은 출생 정보로 따로 산
   다른 구매까지 같이 잠그지 않기 위해서다. */
async function revokeBackfilledBirthUnlocks({ userId, paymentIds, status, now, session = null }) {
  const base = {
    userId,
    scope: BIRTH_ENTITLEMENT_SCOPE,
    source: CONTENT_ENTITLEMENT_SOURCES.BACKFILL,
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
  };
  // 이번 호출 표식 — 근거가 원래 없던 다른 행(mergedOrderIds: [])까지 잡지 않도록 방금 뺀 행으로만 좁힌다.
  const marker = `${now.getTime()}:${paymentIds[0] || ""}:${Math.random().toString(36).slice(2, 10)}`;
  const pull = ContentEntitlement.updateMany(
    { ...base, mergedOrderIds: { $in: paymentIds } },
    { $pull: { mergedOrderIds: { $in: paymentIds } }, $set: { updatedAt: now, birthBackfillRevokeMarker: marker } },
  );
  if (session) pull.session(session);
  const pulled = await pull;
  if (!Number(pulled?.matchedCount || pulled?.modifiedCount || 0)) return { modifiedCount: 0, matchedCount: 0 };
  const revoke = ContentEntitlement.updateMany(
    { ...base, birthBackfillRevokeMarker: marker, mergedOrderIds: { $size: 0 } },
    { $set: { status, expiresAt: now, updatedAt: now } },
  );
  if (session) revoke.session(session);
  const revoked = await revoke;
  return {
    modifiedCount: Number(revoked?.modifiedCount || 0),
    matchedCount: Number(pulled?.matchedCount || 0),
  };
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
  // 출생 기반 키: 내용 절은 **결제 시점의 birthKey 스냅샷**이 있을 때만 건다. 프로필의 현재 출생 정보로
  // 다시 계산하면 그 뒤에 출생 정보를 고친 경우 엉뚱한(따로 산) 출생 행을 회수한다. 없으면 주문 id 절만 쓴다.
  const birthSnapshotPid = target.birthScoped ? toBirthEntitlementProfileId(cleanKey(pricing.birthKey, 64)) : "";
  if (target.serviceKey && contentAliases.length && (!target.birthScoped || birthSnapshotPid)) {
    const contentClause = {
      serviceKey: target.serviceKey,
      contentKey: { $in: contentAliases },
    };
    if (birthSnapshotPid) {
      contentClause.profileId = birthSnapshotPid;
      contentClause.scope = BIRTH_ENTITLEMENT_SCOPE;
    } else if (target.profileId) {
      contentClause.profileId = target.profileId;
    }
    clauses.push(contentClause);
  }
  if (!clauses.length) return { ok: false, skipped: true, reason: "MISSING_UNLOCK_TARGET" };

  const status = Object.values(CONTENT_ENTITLEMENT_STATUSES).includes(revokedStatus)
    ? revokedStatus
    : CONTENT_ENTITLEMENT_STATUSES.REFUNDED;
  const now = new Date();
  const backfillResult = paymentIds.length
    ? await revokeBackfilledBirthUnlocks({ userId, paymentIds, status, now, session })
    : { modifiedCount: 0, matchedCount: 0 };
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

  const entitlementModifiedCount = Number(entitlementResult?.modifiedCount || 0) + Number(backfillResult.modifiedCount || 0);
  const entitlementMatchedCount = Number(entitlementResult?.matchedCount || entitlementResult?.n || 0) + Number(backfillResult.matchedCount || 0);
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

export async function hasUnlockedContent({ userId, profileId, partnerProfileId = "", serviceKey, contentKey }) {
  const normalized = {
    userId: cleanKey(userId, 120),
    profileId: cleanKey(profileId, 100),
    serviceKey: cleanKey(serviceKey, 80),
    contentKey: cleanKey(contentKey, 160),
  };
  if (!normalized.userId || !normalized.profileId || !normalized.serviceKey || !normalized.contentKey) return false;

  if (isBirthScopedContentTarget({ contentKey: normalized.contentKey })) {
    const doc = await findActivePaidContentUnlock({ ...normalized, partnerProfileId });
    return Boolean(doc?._id);
  }

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
  partnerProfileId = "",
  birthKey = "",
  partnerBirthKey = "",
  purchaseProfileId = "",
  purchasePartnerProfileId = "",
  birthIdentity = null,
  findProfileCard = null,
}) {
  // 🔴 출생 기반 키는 어떤 호출부에서 오든(USER/PROFILE 을 요구해도) BIRTH 행으로만 쓴다.
  // 프로필이 없거나 이 계정 소유가 아니면 MISSING_PROFILE_ID / INVALID_PROFILE 로 던진다.
  let birthFields = null;
  if (isBirthScopedContentTarget({ featureKey, contentKey })) {
    const identity = await resolveBirthWriteIdentity({
      userId,
      profileId,
      partnerProfileId,
      featureKey: cleanKey(featureKey, 160) || resolveUnlockedFeatureKeyFromContentKey(contentKey),
      birthKey,
      partnerBirthKey,
      purchaseProfileId,
      purchasePartnerProfileId,
      birthIdentity,
      findProfileCard,
    });
    profileId = identity.entitlementProfileId;
    scope = BIRTH_ENTITLEMENT_SCOPE;
    birthFields = {
      birthKey: identity.birthKey,
      ...(identity.partnerBirthKey ? { partnerBirthKey: identity.partnerBirthKey } : {}),
      ...(identity.profileId ? { purchaseProfileId: identity.profileId } : {}),
      ...(identity.partnerProfileId ? { purchasePartnerProfileId: identity.partnerProfileId } : {}),
    };
  }
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
          // 🔴 featureKey 만으로 매칭하면 안 된다. sukyo_yearly_fortune_unlock 처럼 featureKey 는 상수이고
          // contentKey 만 연도별로 다른 상품에서, 2027 구매가 기존 2026 행에 매칭돼 그 행의 contentKey 를
          // 덮어써 2026 해금이 사라진다. 별칭 치유(saju.fullReading ↔ section_summary)는 유지해야 하므로
          // 읽기 경로와 같은 buildContentKeyClause 로 별칭까지 포함해 고정한다.
          { featureKey: normalized.featureKey, ...buildContentKeyClause(normalized.contentKey) },
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

  const setFields = {
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
  };

  const query = ContentEntitlement.findOneAndUpdate(
    identity,
    {
      $set: setFields,
      $setOnInsert: {
        userId: normalized.userId,
        profileId: normalized.profileId,
        scope: normalized.scope,
        unlockedAt: effectiveUnlockedAt,
        createdAt: now,
        ...(birthFields || {}),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (session) query.session(session);

  let document;
  try {
    document = await query.lean();
  } catch (error) {
    // 동시 지급 경합: 우리가 읽은 뒤 다른 요청(PortOne 웹훅 vs 클라이언트 confirm)이 같은 행을 먼저 커밋했다.
    // 유니크 인덱스가 진 쪽을 E11000 으로 막지만 엔타이틀먼트는 이미 정확히 존재하므로, 결제 실패로
    // 표면화하면 payments.js 의 refundOrDefer 가 정상 결제를 취소하고 billing.js 가 코인을 되돌려준다.
    if (!isDuplicateKeyError(error)) throw error;
    // 🔴 트랜잭션 안에서는 11000 이 트랜잭션 자체를 abort 시켜 같은 세션으로는 재조회조차 불가능하다
    // (NoSuchTransaction 으로 바뀔 뿐이다). 그대로 올려 호출부가 되돌리게 한다.
    if (session) throw error;
    // 같은 identity 로 upsert 없이 한 번만 다시 쓴다. 필터가 1차와 동일하므로 1차가 고르지 않았을 행을
    // 고를 수 없다. 못 찾으면 이 필터가 애초에 소유하지 않는 행과의 진짜 데이터 충돌이므로 삼키지 않는다.
    document = await ContentEntitlement.findOneAndUpdate(identity, { $set: setFields }, { new: true }).lean();
    if (!document) throw error;
  }
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

  const birthIdentity = await resolveBirthReadIdentity(
    { userId: normalized.userId, profileId: normalized.profileId, featureKey: "" },
  );
  const scopeClause = buildProfileScopeClause(normalized.profileId);
  if (birthIdentity) scopeClause.$or.push(birthScopeClause(birthIdentity.entitlementProfileId));

  const docs = (await ContentEntitlement.find({
    userId: normalized.userId,
    serviceKey: normalized.serviceKey,
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    $and: [
      activeExpiryClause(),
      scopeClause,
    ],
  }).select("contentKey featureKey scope source grantType passId grantedAt unlockedAt expiresAt").lean())
    .filter((doc) => isBirthScopeEvidence(doc));

  return docs.map((doc) => ({
    ...doc,
    contentKey: canonicalizeContentKey(doc?.contentKey),
  }));
}

export async function getUnlockedContentSnapshot({
  userId,
  profileId = "",
  serviceKey = "",
  serviceKeys = [],
  includeAllProfiles = false,
  partnerProfileId = "",
} = {}) {
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
  const normalizedProfileId = cleanKey(profileId, 100);
  // 이 프로필의 출생 신원(본인, 그리고 상대가 주어지면 궁합). 프로필이 없거나 남의 것이면 출생 기반 해금은 0건이다.
  const birthPids = [];
  if (normalizedProfileId) {
    const main = await resolveBirthReadIdentity({ userId: normalizedUserId, profileId: normalizedProfileId, featureKey: "" });
    if (main) birthPids.push(main.entitlementProfileId);
    if (cleanKey(partnerProfileId, 100)) {
      const compat = await resolveBirthReadIdentity(
        { userId: normalizedUserId, profileId: normalizedProfileId, featureKey: "section_compat" },
        { partnerProfileId },
      );
      if (compat) birthPids.push(compat.entitlementProfileId);
    }
  }
  const accountScopeClause = buildAccountSnapshotScopeClause(profileId);
  for (const pid of birthPids) accountScopeClause.$or.push(birthScopeClause(pid));
  const query = {
    userId: normalizedUserId,
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    $and: includeAllProfiles
      ? [activeExpiryClause()]
      : [activeExpiryClause(), accountScopeClause],
  };
  if (normalizedServiceKeys.length === 1) {
    query.serviceKey = normalizedServiceKeys[0];
  } else if (normalizedServiceKeys.length > 1) {
    query.serviceKey = { $in: normalizedServiceKeys };
  }

  const birthPidSet = new Set(birthPids);
  const docs = (await ContentEntitlement.find(query)
    // passId 는 access-state 가 해금마다 근거를 싣는 데 쓴다(Phase 4 D6, worker/lib/access-state.js).
    .select("featureKey contentKey contentId serviceKey scope profileId source grantType passId grantedAt unlockedAt expiresAt updatedAt")
    .lean())
    // 출생 기반 콘텐츠는 이 프로필 출생 신원의 BIRTH 행만 남긴다. 합성 profileId 는 실제 프로필 id 로 바꿔 내보낸다.
    .filter((doc) => isBirthScopeEvidence(doc)
      && (doc?.scope !== BIRTH_ENTITLEMENT_SCOPE || birthPidSet.has(cleanKey(doc?.profileId, 100))))
    .map((doc) => (doc?.scope === BIRTH_ENTITLEMENT_SCOPE ? { ...doc, profileId: normalizedProfileId } : doc));
  const applicableDocs = includeAllProfiles
    ? docs.filter((doc) => doc?.scope === CONTENT_ENTITLEMENT_SCOPES.USER
      || cleanKey(doc?.profileId, 100) === USER_SCOPE_PROFILE_ID
      || (normalizedProfileId && cleanKey(doc?.profileId, 100) === normalizedProfileId))
    : docs;
  const contentKeys = [];
  const featureKeys = [];
  const unlockMap = Object.create(null);

  for (const doc of applicableDocs) {
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
    entitlementsByProfile: docs.reduce((result, doc) => {
      const key = doc?.scope === CONTENT_ENTITLEMENT_SCOPES.USER || cleanKey(doc?.profileId, 100) === USER_SCOPE_PROFILE_ID
        ? USER_SCOPE_PROFILE_ID
        : cleanKey(doc?.profileId, 100) || "unknown";
      if (!result[key]) result[key] = [];
      result[key].push({
        contentKey: canonicalizeContentKey(doc?.contentKey || doc?.contentId),
        featureKey: resolveUnlockedFeatureKeyFromContentKey(doc?.contentKey || doc?.contentId),
        serviceKey: cleanKey(doc?.serviceKey, 80),
        source: cleanKey(doc?.source, 40),
        expiresAt: normalizeDateOrNull(doc?.expiresAt)?.toISOString() || null,
      });
      return result;
    }, Object.create(null)),
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
