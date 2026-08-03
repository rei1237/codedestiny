import { connectDb, withMongoRetry } from "./db.js";
import { getBillingFeaturePricing } from "./billing-feature-registry.js";
import { isUnlockPaidFeatureKey, normalizePaidFeatureKey } from "./paid-feature-registry.js";
import { Payment, User } from "./models.js";
import { getUnlockedContentSnapshot } from "./content-unlocks.js";
import { PermissionService } from "./permission-service.js";
import { normalizeHoneyPassEntitlement } from "./profile-limits.js";
import { resolveFeatureAccessPolicy } from "./entitlement-policy.js";

const SINGLE_PAYMENT_STATUSES = Object.freeze(["paid", "success", "fulfilled"]);
const PASS_EXCLUDED_FEATURE_KEYS = new Set([
  "profile-card-manage",
  "profile_card_manage",
  "profile-card-add",
  "profile_card_add",
  "profile-card-edit",
  "profile_card_edit",
  "profile-card-delete",
  "profile_card_delete",
]);

function isProductionRuntime(env = {}) {
  return String(env?.NODE_ENV || "").trim().toLowerCase() === "production";
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeStatus(value) {
  return cleanText(value).toLowerCase();
}

function toValidDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function normalizeFeatureCandidates(featureKey) {
  const raw = cleanText(featureKey);
  const normalized = normalizePaidFeatureKey(raw) || raw;
  const variants = [raw, normalized]
    .flatMap((key) => [key, key.replace(/_/g, "-"), key.replace(/-/g, "_")])
    .filter(Boolean);
  return Array.from(new Set(variants));
}

function resolveCoinCost(pricing = {}) {
  const coinPrice = Number(pricing.coinPrice ?? pricing.cost ?? pricing.amountCoins ?? pricing.coinCost ?? 0);
  if (Number.isFinite(coinPrice) && coinPrice > 0) return Math.floor(coinPrice);
  const amountKRW = Number(pricing.amountKRW ?? pricing.amountKrw ?? pricing.krwAmount ?? pricing.paymentAmount ?? 0);
  if (Number.isFinite(amountKRW) && amountKRW > 0) return Math.ceil(amountKRW / 100);
  return 0;
}

function buildDecision(input = {}) {
  const decision = {
    allowed: Boolean(input.allowed),
    reason: cleanText(input.reason || (input.allowed ? "ALLOWED" : "PAYMENT_REQUIRED")),
    userId: cleanText(input.userId),
    featureKey: cleanText(input.featureKey),
    licenseType: cleanText(input.licenseType || "none"),
    licenseTier: cleanText(input.licenseTier || ""),
    subscriptionStatus: cleanText(input.subscriptionStatus || "none"),
    accessSource: cleanText(input.accessSource || ""),
    pricing: input.pricing || null,
    paymentRequired: input.allowed ? false : input.paymentRequired !== false,
    shouldOpenPayment: input.allowed ? false : input.shouldOpenPayment !== false,
    monthlySubscription: input.monthlySubscription || null,
    pass: input.pass || null,
  };
  return decision;
}

function logPaidAccessDecision(env, decision) {
  if (isProductionRuntime(env)) return;
  const payload = {
    userId: decision.userId,
    featureKey: decision.featureKey,
    allowed: decision.allowed,
    reason: decision.reason,
    licenseType: decision.licenseType,
    subscriptionStatus: decision.subscriptionStatus,
  };
  try {
    console.info("[paid-access-decision]", JSON.stringify(payload));
  } catch (e) {
    console.info("[paid-access-decision]", payload);
  }
}

function resolveMonthlySubscription(user = {}) {
  const monthly = user.monthlySubscription && typeof user.monthlySubscription === "object"
    ? user.monthlySubscription
    : {};
  const profileSubscription = user.profileSubscription && typeof user.profileSubscription === "object"
    ? user.profileSubscription
    : {};
  const status = normalizeStatus(
    monthly.status
      || monthly.subscriptionStatus
      || profileSubscription.monthlyStatus
      || "",
  );
  const expiresAt = toValidDate(monthly.expiresAt || monthly.currentPeriodEnd);
  const activeByStatus = ["active", "paid", "success", "subscribed", "current", "valid"].includes(status);
  const inactiveByStatus = ["expired", "inactive", "cancelled", "canceled", "failed", "refunded"].includes(status);
  const explicitActive = monthly.active === true || monthly.isActive === true || monthly.isSubscribed === true || activeByStatus;
  const dateActive = expiresAt ? expiresAt.getTime() > Date.now() : true;
  const isActive = !inactiveByStatus && explicitActive && dateActive;
  return {
    active: isActive,
    status: status || (isActive ? "active" : "none"),
    tier: cleanText(monthly.tier || monthly.plan || ""),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  };
}

function canUseMonthlyForFeature(featureKey) {
  return Boolean(cleanText(featureKey));
}

function isPassExcluded(featureCandidates = []) {
  return featureCandidates.some((key) => PASS_EXCLUDED_FEATURE_KEYS.has(cleanText(key)));
}

function resolveLicenseReason(tier) {
  const normalizedTier = cleanText(tier).toLowerCase();
  if (normalizedTier === "vvip") return "VVIP_LICENSE";
  if (normalizedTier === "premium") return "PREMIUM_LICENSE";
  if (normalizedTier === "standard") return "STANDARD_LICENSE";
  if (normalizedTier === "family") return "FAMILY_ALL_ACCESS";
  return "LICENSE_PASS";
}

function resolveDirectLicense(user = {}) {
  const licenses = user.licenses && typeof user.licenses === "object" ? user.licenses : {};
  const expiresAt = toValidDate(licenses.expiresAt || user.profileSubscription?.expiresAt);
  const status = normalizeStatus(licenses.status || user.profileSubscription?.status || "");
  const expiredByStatus = ["expired", "inactive", "cancelled", "canceled", "failed", "refunded"].includes(status);
  const expiredByDate = expiresAt ? expiresAt.getTime() <= Date.now() : false;
  if (expiredByStatus || expiredByDate) return { active: false, tier: "", count: 0 };

  for (const tier of ["vvip", "premium", "standard"]) {
    const count = Number(licenses[tier] || 0);
    if (Number.isFinite(count) && count > 0) {
      return { active: true, tier, count };
    }
  }
  return { active: false, tier: "", count: 0 };
}

// canAccessPaidFeature 결정을 짧게 메모이즈한다.
// ensure-access → consult POST → 매 폴링마다 같은 (user, feature) 판정을 위해 User.findById + Payment.exists
// 2회 Mongo 왕복을 반복하던 것(코인/월정석 결제자는 항상 PAYMENT_REQUIRED 후 evidence 조회)을 제거한다.
// billing.js의 결제-접근 결정 캐시와 같은 globalThis 객체(__paidAccessDecisionCache)를 공유하고,
// 키 첫 세그먼트를 userId로 두므로 payments.js/billing.js가 grant/consume/refund 시 호출하는
// invalidateForUser(userId)(prefix `${uid}|` 전체 삭제)가 이 항목도 함께 무효화한다 — 별도 무효화 배선이
// 필요 없고, 프로덕션에서 검증된 billing 캐시와 동일한 stale 프로파일(더 짧은 TTL)을 갖는다.
// billing 키(6세그먼트)와 세그먼트 수가 달라 절대 충돌하지 않는다.
const PAID_FEATURE_ACCESS_CACHE_TTL_MS = 3000;
const PAID_FEATURE_ACCESS_CACHE_MAX_ENTRIES = 2500;
const sharedPaidAccessDecisionCache = globalThis.__paidAccessDecisionCache
  || (globalThis.__paidAccessDecisionCache = { entries: new Map(), lastPruneAt: 0 });

function buildFeatureAccessCacheKey(userId, effectiveFeatureKey, coinCost) {
  return `${cleanText(userId)}|pfa:${cleanText(effectiveFeatureKey)}|${Math.max(0, Math.floor(Number(coinCost || 0)))}`;
}

function readFeatureAccessDecisionFromCache(cacheKey) {
  if (!cacheKey) return null;
  const entry = sharedPaidAccessDecisionCache.entries.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    sharedPaidAccessDecisionCache.entries.delete(cacheKey);
    return null;
  }
  return entry.decision || null;
}

function writeFeatureAccessDecisionToCache(cacheKey, decision) {
  if (!cacheKey || !decision) return decision;
  const now = Date.now();
  if (sharedPaidAccessDecisionCache.lastPruneAt + 2000 < now) {
    sharedPaidAccessDecisionCache.lastPruneAt = now;
    for (const [key, entry] of sharedPaidAccessDecisionCache.entries.entries()) {
      if (!entry || entry.expiresAt <= now) sharedPaidAccessDecisionCache.entries.delete(key);
    }
  }
  if (sharedPaidAccessDecisionCache.entries.size > PAID_FEATURE_ACCESS_CACHE_MAX_ENTRIES) {
    const earliestKey = sharedPaidAccessDecisionCache.entries.keys().next().value;
    if (earliestKey) sharedPaidAccessDecisionCache.entries.delete(earliestKey);
  }
  sharedPaidAccessDecisionCache.entries.set(cacheKey, { decision, createdAt: now, expiresAt: now + PAID_FEATURE_ACCESS_CACHE_TTL_MS });
  return decision;
}

function buildFeatureSpec(featureKey, options = {}) {
  const requestedFeatureKey = cleanText(featureKey);
  const normalizedFeatureKey = normalizePaidFeatureKey(requestedFeatureKey) || requestedFeatureKey;
  const pricingResult = getBillingFeaturePricing({
    featureKey: requestedFeatureKey,
    reason: options.reason,
    categoryKey: options.categoryKey,
    subFeatureKey: options.subFeatureKey,
  });
  const pricing = pricingResult.ok ? pricingResult.pricing : null;
  const effectiveFeatureKey = cleanText(pricing?.featureKey || normalizedFeatureKey);
  return {
    requestedFeatureKey,
    normalizedFeatureKey,
    pricing,
    effectiveFeatureKey,
    featureCandidates: normalizeFeatureCandidates(effectiveFeatureKey),
    coinCost: resolveCoinCost(pricing || {}),
  };
}

// 사용자 문서 1개 + 구매 키 집합만으로 판정한다(추가 왕복 없음).
// 단건 경로와 배치 경로가 이 함수 하나를 공유해 판정이 갈라지지 않게 한다.
function resolveDecisionFromUserDoc(userId, user, spec, hasPurchase) {
  const { pricing, effectiveFeatureKey, featureCandidates, coinCost } = spec;

  if (hasPurchase) {
    return buildDecision({
      allowed: true,
      reason: "ALREADY_PURCHASED",
      userId,
      featureKey: effectiveFeatureKey,
      licenseType: "single_purchase",
      accessSource: "paidFeatures",
      pricing,
    });
  }

  const pass = normalizeHoneyPassEntitlement(user || {});
  const passExcluded = isPassExcluded(featureCandidates);
  const directLicense = resolveDirectLicense(user || {});
  if (!passExcluded && directLicense.active) {
    return buildDecision({
      allowed: true,
      reason: resolveLicenseReason(directLicense.tier),
      userId,
      featureKey: effectiveFeatureKey,
      licenseType: "license",
      licenseTier: directLicense.tier,
      accessSource: "licenses",
      pricing,
      pass,
    });
  }

  const featureAccess = resolveFeatureAccessPolicy({
    user: user || {},
    pricing: pricing || {},
    coinCost,
    passExcluded,
  });
  if (featureAccess.allowed) {
    return buildDecision({
      allowed: true,
      reason: resolveLicenseReason(featureAccess.tier || pass.passTier || pass.tier),
      userId,
      featureKey: effectiveFeatureKey,
      licenseType: featureAccess.accessType || "license_pass",
      licenseTier: featureAccess.tier || pass.passTier || pass.tier || "",
      accessSource: featureAccess.accessMethod === "FAMILY" ? "family_access" : "license_pass",
      pricing,
      pass: featureAccess.entitlement || pass,
    });
  }

  const monthlySubscription = resolveMonthlySubscription(user);
  if (monthlySubscription.active && canUseMonthlyForFeature(effectiveFeatureKey)) {
    return buildDecision({
      allowed: true,
      reason: "MONTHLY_SUBSCRIPTION",
      userId,
      featureKey: effectiveFeatureKey,
      licenseType: "monthly_subscription",
      subscriptionStatus: monthlySubscription.status,
      accessSource: "monthlySubscription",
      pricing,
      monthlySubscription,
      pass,
    });
  }

  return buildDecision({
    allowed: false,
    reason: passExcluded && (pass.isActive || directLicense.active) ? "PASS_EXCLUDED_PAYMENT_REQUIRED" : "PAYMENT_REQUIRED",
    userId,
    featureKey: effectiveFeatureKey,
    licenseType: directLicense.active ? "license" : (pass.isActive ? "license_pass" : "none"),
    licenseTier: directLicense.tier || pass.passTier || pass.tier || "",
    subscriptionStatus: monthlySubscription.status,
    accessSource: "none",
    pricing,
    monthlySubscription,
    pass,
  });
}

// 접근 판정에 필요한 User 필드. 호출부가 인증 단계에서 같은 문서를 한 번에 읽어 오도록 밖으로 공개한다
// (worker/lib/auth.js 의 userProjection → auth.authUserDoc 경로). 여기 select 와 항상 같은 집합을 유지할 것.
export const PAID_FEATURE_ACCESS_USER_FIELDS = [
  "paidFeatures", "unlockedFeatures", "licenses", "profileSubscription", "monthlySubscription",
  "subscription", "membership", "membershipPass", "pass", "entitlement", "licensePass",
  "accessGateResult", "plan", "planId", "productId", "subscriptionTier", "membershipTier",
  "passTier", "status", "subscriptionStatus", "membershipStatus", "isActive", "isSubscribed", "expiresAt",
  "destinyProfilesCurrentId",
];

export const PAID_FEATURE_ACCESS_USER_PROJECTION = PAID_FEATURE_ACCESS_USER_FIELDS
  .reduce((projection, field) => Object.assign(projection, { [field]: 1 }), {});

// 미리 읽어 둔 User 문서를 신뢰해도 되는지 확인한다. 문서의 _id 가 판정 대상 userId 와 정확히
// 같을 때만 채택한다 — 다른 사용자의 문서로 이용권이 열리는 일이 구조적으로 불가능하도록.
function resolvePreloadedUserDoc(userDoc, normalizedUserId) {
  if (!userDoc || typeof userDoc !== "object") return null;
  const docId = cleanText(userDoc._id);
  if (!docId || !normalizedUserId || docId !== normalizedUserId) return null;
  return userDoc;
}

// 여러 featureKey를 Mongo 왕복 2회(User 1 + Payment 1)로 판정한다.
// 음악실처럼 곡 하나하나가 별도 featureKey인 화면이 곡 수 × 2회 직렬 왕복을 만들던 것을 없앤다.
// 판정 규칙·캐시·재시도는 단건 경로와 완전히 동일하다(withMongoRetry를 중첩하지 않는다).
// options.userDoc: 인증 단계에서 이미 읽은 User 문서. 주어지면 아래 User 조회를 건너뛴다(없으면 종전대로 조회).
export async function canAccessPaidFeaturesBatch(userId, featureKeys, options = {}) {
  const env = options.env || {};
  const normalizedUserId = cleanText(userId);
  const specs = [];
  const seenRequestedKeys = new Set();
  for (const key of Array.isArray(featureKeys) ? featureKeys : []) {
    const spec = buildFeatureSpec(key, options);
    if (!spec.requestedFeatureKey || seenRequestedKeys.has(spec.requestedFeatureKey)) continue;
    seenRequestedKeys.add(spec.requestedFeatureKey);
    specs.push(spec);
  }

  const decisions = {};
  if (!specs.length) return decisions;

  if (!normalizedUserId) {
    for (const spec of specs) {
      const decision = buildDecision({
        allowed: false,
        reason: "LOGIN_REQUIRED",
        featureKey: spec.normalizedFeatureKey,
        paymentRequired: false,
        shouldOpenPayment: false,
      });
      logPaidAccessDecision(env, decision);
      decisions[spec.requestedFeatureKey] = decision;
    }
    return decisions;
  }

  const pendingSpecs = [];
  for (const spec of specs) {
    spec.cacheKey = buildFeatureAccessCacheKey(normalizedUserId, spec.effectiveFeatureKey, spec.coinCost);
    const cached = readFeatureAccessDecisionFromCache(spec.cacheKey);
    if (cached) {
      decisions[spec.requestedFeatureKey] = cached;
      continue;
    }
    pendingSpecs.push(spec);
  }
  if (!pendingSpecs.length) return decisions;

  await connectDb(env);

  // READ 전용 — 풀 초기화(MongoPoolClearedError) 버스트에서 이용권 판정이 500/오탐(결제창)으로 새지 않게 재시도.
  // 인증 단계가 같은 문서를 이미 읽어 넘겨줬으면 그걸 쓴다(선검사 1회당 User 조회 2~3회 → 1회).
  const preloadedUser = resolvePreloadedUserDoc(options.userDoc, normalizedUserId);
  const user = preloadedUser || await withMongoRetry(env, () => User.findById(normalizedUserId)
    .select(PAID_FEATURE_ACCESS_USER_FIELDS.join(" "))
    .lean());

  if (!user?._id) {
    for (const spec of pendingSpecs) {
      const decision = buildDecision({
        allowed: false,
        reason: "LOGIN_REQUIRED",
        userId: normalizedUserId,
        featureKey: spec.effectiveFeatureKey,
        paymentRequired: false,
        shouldOpenPayment: false,
        pricing: spec.pricing,
      });
      logPaidAccessDecision(env, decision);
      writeFeatureAccessDecisionToCache(spec.cacheKey, decision);
      decisions[spec.requestedFeatureKey] = decision;
    }
    return decisions;
  }

  const grantedKeySet = new Set([
    ...(Array.isArray(user.paidFeatures) ? user.paidFeatures : []),
    ...(Array.isArray(user.unlockedFeatures) ? user.unlockedFeatures : []),
  ].map((key) => cleanText(key)).filter(Boolean));

  const needsUnlockSnapshot = pendingSpecs.some((spec) => isUnlockPaidFeatureKey(spec.effectiveFeatureKey)
    && !spec.featureCandidates.some((key) => grantedKeySet.has(key)));
  if (needsUnlockSnapshot) {
    const unlockSnapshot = await getUnlockedContentSnapshot({
      userId: normalizedUserId,
      profileId: cleanText(options.profileId || user.destinyProfilesCurrentId),
    });
    for (const key of Array.isArray(unlockSnapshot?.featureKeys) ? unlockSnapshot.featureKeys : []) {
      if (key) grantedKeySet.add(cleanText(key));
    }
  }

  // 기존 Payment 기록은 ContentEntitlement와 User 호환 기록에 없는 경우만 읽는다.
  const lookupCandidates = new Set();
  for (const spec of pendingSpecs) {
    if (spec.featureCandidates.some((key) => grantedKeySet.has(key))) continue;
    for (const key of spec.featureCandidates) lookupCandidates.add(key);
  }

  if (lookupCandidates.size) {
    // READ 전용 — 위 User 조회와 같은 사유로 재시도한다.
    const payments = await withMongoRetry(env, () => Payment.find({
      userId: normalizedUserId,
      featureKey: { $in: Array.from(lookupCandidates) },
      paymentType: "digital_content",
      accessType: "single_purchase",
      status: { $in: SINGLE_PAYMENT_STATUSES },
    }).select("featureKey").lean());
    for (const payment of Array.isArray(payments) ? payments : []) {
      const key = cleanText(payment?.featureKey);
      if (key) grantedKeySet.add(key);
    }
  }

  for (const spec of pendingSpecs) {
    const permission = PermissionService.canUse(spec.effectiveFeatureKey, {
      unlockMap: Object.fromEntries(Array.from(grantedKeySet).map((key) => [key, true])),
    });
    const hasPurchase = permission.reason === "permanent_unlock"
      || spec.featureCandidates.some((key) => grantedKeySet.has(key));
    const decision = resolveDecisionFromUserDoc(normalizedUserId, user, spec, hasPurchase);
    logPaidAccessDecision(env, decision);
    writeFeatureAccessDecisionToCache(spec.cacheKey, decision);
    decisions[spec.requestedFeatureKey] = decision;
  }
  return decisions;
}

export async function canAccessPaidFeature(userId, featureKey, options = {}) {
  const requestedFeatureKey = cleanText(featureKey);
  const decisions = await canAccessPaidFeaturesBatch(userId, [requestedFeatureKey], options);
  const decision = decisions[requestedFeatureKey];
  if (decision) return decision;

  // featureKey가 비어 있는 호출(배치가 스펙을 만들지 못함) — 종전과 동일하게 로그인 필요로 응답한다.
  const fallback = buildDecision({
    allowed: false,
    reason: cleanText(userId) ? "PAYMENT_REQUIRED" : "LOGIN_REQUIRED",
    userId,
    featureKey: requestedFeatureKey,
    paymentRequired: false,
    shouldOpenPayment: false,
  });
  logPaidAccessDecision(options.env || {}, fallback);
  return fallback;
}

export const __paidFeatureAccessTestUtils = {
  PASS_EXCLUDED_FEATURE_KEYS,
  buildDecision,
  canUseMonthlyForFeature,
  resolveMonthlySubscription,
};
