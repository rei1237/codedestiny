import { connectDb, mongoose } from "../lib/db.js";
import {
  User,
  PointHistory,
  HoneySubscription,
  HoneySubscriptionTransaction,
  MembershipContentAccessConsent,
} from "../lib/models.js";
import { getOptionalUserFromRequest, requireUserFromRequest } from "../lib/auth.js";
import {
  createHttpError,
  getRoutePath,
  handleRouteError,
  json,
  logApiCatchDiagnostic,
  methodNotAllowed,
  notFound,
  readJson,
} from "../lib/http.js";
import {
  COIN_GATE_PER_USE_REASON_COSTS,
  FEATURE_KEY_PRICE_TABLE,
  PIG_COIN_UNLOCK_PRODUCTS,
  UNLOCK_PRODUCT_BY_FEATURE_KEY,
  listPublicCoinPriceTable,
  listServerPricedFeatureKeys,
  normalizePaidFeatureKey,
  resolveFeatureReasonCost,
} from "../lib/paid-feature-registry.js";
import {
  HONEY_SUBSCRIPTION_PLANS,
  addDaysFromDate,
  getDefaultHoneyDurationDays,
  getHoneyPlan,
  honeyPlanIdToLegacyTier,
  isPaidHoneyPlan,
  legacyTierToHoneyPlanId,
  listPublicHoneySubscriptionPlans,
  normalizeHoneyPlanId,
  normalizeHoneyRenewalFailReason,
  normalizeHoneyStatus,
  resolveHoneyBenefits,
} from "../lib/honey-subscription.js";

const PIG_COIN_DEFAULT_UNLOCK_COST = 10;
const PIG_COIN_MAX_COST = 100000;

const PIG_COIN_PACKAGES = {
  sample: { name: "Sample Pack", coins: 30, bonus: 0 },
  luckyMeal: { name: "Lucky Meal", coins: 100, bonus: 15 },
  goldBarn: { name: "Gold Barn", coins: 300, bonus: 60 },
  goldVault: { name: "Gold Vault", coins: 700, bonus: 180 },
  emperorReserve: { name: "Emperor Reserve", coins: 1500, bonus: 500 },
};

function hasMongoBinding(env = {}) {
  return Boolean(String(env?.MONGO_URI || env?.MONGODB_URI || "").trim());
}

function buildStorageFailureResponse(env, error, fallbackCode = "DB_QUERY_FAILED") {
  const configMissing = !hasMongoBinding(env);
  const status = configMissing ? 500 : 503;
  const code = configMissing ? "SERVER_CONFIG_ERROR" : "SERVICE_UNAVAILABLE";
  const message = configMissing
    ? "서버 설정 또는 데이터 조회 중 오류가 발생했습니다."
    : "코인 저장소가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.";
  return json({
    ok: false,
    code,
    causeCode: fallbackCode,
    message,
    ...(configMissing ? { detail: String(error?.message || "") } : {}),
  }, { status });
}

function isTruthyFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isProductionRuntime(env) {
  const nodeEnv = String(env?.NODE_ENV || "").trim().toLowerCase();
  if (nodeEnv === "production") return true;

  const appEnv = String(env?.APP_ENV || env?.DEPLOY_ENV || env?.ENVIRONMENT || "").trim().toLowerCase();
  return appEnv === "prod" || appEnv === "production";
}

function isAdminPigCoinBypassEnabled(env) {
  return !isProductionRuntime(env) && isTruthyFlag(env?.ALLOW_ADMIN_PIG_COIN_BYPASS);
}

function isDynamicCostFallbackEnabled(env) {
  return !isProductionRuntime(env) && isTruthyFlag(env?.ALLOW_DYNAMIC_PIG_COIN_COST_FALLBACK);
}

function getForcePaidTestAccountEmails(env) {
  if (isProductionRuntime(env)) return new Set();

  const raw = String(env?.FORCE_PAID_TEST_ACCOUNT_EMAILS || "");
  const values = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return new Set(values);
}

function normalizeFeatureKey(rawKey) {
  return normalizePaidFeatureKey(rawKey);
}

function buildReasonPricingMap(pricingEntries) {
  const table = Object.create(null);

  for (let i = 0; i < pricingEntries.length; i += 1) {
    const item = pricingEntries[i] || null;
    const reason = String(item?.reason || "").trim();
    const cost = Number(item?.cost);
    if (!reason || !Number.isFinite(cost) || cost <= 0) continue;

    // Keep the first mapping for stable behavior when legacy keys share the same reason.
    if (!table[reason]) table[reason] = { ...item, reason, cost };
  }

  return Object.freeze(table);
}

const FEATURE_REASON_PRICING_MAP = buildReasonPricingMap(
  Object.entries(FEATURE_KEY_PRICE_TABLE).map(([mappedFeatureKey, spec]) => ({
    featureKey: mappedFeatureKey,
    reason: spec?.reason,
    cost: spec?.cost,
  })),
);

const UNLOCK_REASON_PRICING_MAP = buildReasonPricingMap(
  Object.values(UNLOCK_PRODUCT_BY_FEATURE_KEY).map((spec) => ({
    featureKey: spec?.featureKey,
    reason: spec?.reason,
    cost: spec?.cost,
  })),
);

function resolveServerCoinPricing({ env, productSpec, requestedCost, featureKey, reason }) {
  if (productSpec) {
    return {
      ok: true,
      cost: Number(productSpec.cost),
      reason: String(productSpec.reason || reason || "Paid feature unlock"),
      featureKey: normalizeFeatureKey(productSpec.featureKey || featureKey),
      pricingSource: "product-id",
    };
  }

  const key = normalizeFeatureKey(featureKey);
  const reasonText = String(reason || "").trim();
  const requestCost = Number(requestedCost);

  if (key === "coin-gate-per-use") {
    const serverCost = Number(COIN_GATE_PER_USE_REASON_COSTS[reasonText]);
    if (Number.isFinite(serverCost) && serverCost > 0) {
      return {
        ok: true,
        cost: serverCost,
        reason: reasonText,
        featureKey: "coin-gate-per-use",
        pricingSource: "coin-gate-reason",
      };
    }

    const featureReasonPricing = FEATURE_REASON_PRICING_MAP[reasonText] || null;
    if (featureReasonPricing) {
      return {
        ok: true,
        cost: Number(featureReasonPricing.cost),
        reason: String(featureReasonPricing.reason || reasonText),
        featureKey: String(featureReasonPricing.featureKey || key),
        pricingSource: "feature-reason-fallback",
      };
    }

    const unlockReasonPricing = UNLOCK_REASON_PRICING_MAP[reasonText] || null;
    if (unlockReasonPricing) {
      return {
        ok: true,
        cost: Number(unlockReasonPricing.cost),
        reason: String(unlockReasonPricing.reason || reasonText),
        featureKey: String(unlockReasonPricing.featureKey || key),
        pricingSource: "unlock-reason-fallback",
      };
    }

    if (isDynamicCostFallbackEnabled(env) && Number.isFinite(requestCost) && requestCost > 0) {
      return {
        ok: true,
        cost: requestCost,
        reason: reasonText || "Coin gate per-use",
        featureKey: key,
        pricingSource: "dynamic-fallback",
      };
    }

    return {
      ok: false,
      status: 403,
      code: "SERVER_PRICE_REQUIRED",
      message: "coin-gate-per-use 기능의 서버 가격표가 누락되었습니다.",
    };
  }

  const featureReasonCost = resolveFeatureReasonCost(key, reasonText);
  if (Number.isFinite(featureReasonCost) && featureReasonCost > 0) {
    return {
      ok: true,
      cost: featureReasonCost,
      reason: reasonText,
      featureKey: key,
      pricingSource: "feature-reason",
    };
  }

  const featurePrice = FEATURE_KEY_PRICE_TABLE[key] || null;
  if (featurePrice) {
    return {
      ok: true,
      cost: Number(featurePrice.cost),
      reason: String(featurePrice.reason || reasonText || "Paid feature unlock"),
      featureKey: key,
      pricingSource: "feature-key",
    };
  }

  const unlockSpec = UNLOCK_PRODUCT_BY_FEATURE_KEY[key] || null;
  if (unlockSpec) {
    return {
      ok: true,
      cost: Number(unlockSpec.cost),
      reason: String(unlockSpec.reason || reasonText || "Paid feature unlock"),
      featureKey: key,
      pricingSource: "unlock-feature",
    };
  }

  if (reasonText) {
    const coinGateReasonCost = Number(COIN_GATE_PER_USE_REASON_COSTS[reasonText]);
    if (Number.isFinite(coinGateReasonCost) && coinGateReasonCost > 0) {
      return {
        ok: true,
        cost: coinGateReasonCost,
        reason: reasonText,
        featureKey: "coin-gate-per-use",
        pricingSource: "coin-gate-reason-fallback",
      };
    }

    const featureReasonPricing = FEATURE_REASON_PRICING_MAP[reasonText] || null;
    if (featureReasonPricing) {
      return {
        ok: true,
        cost: Number(featureReasonPricing.cost),
        reason: reasonText,
        featureKey: String(featureReasonPricing.featureKey || key),
        pricingSource: "feature-reason-fallback",
      };
    }

    const unlockReasonPricing = UNLOCK_REASON_PRICING_MAP[reasonText] || null;
    if (unlockReasonPricing) {
      return {
        ok: true,
        cost: Number(unlockReasonPricing.cost),
        reason: reasonText,
        featureKey: String(unlockReasonPricing.featureKey || key),
        pricingSource: "unlock-reason-fallback",
      };
    }
  }

  if (isDynamicCostFallbackEnabled(env) && Number.isFinite(requestCost) && requestCost > 0) {
    return {
      ok: true,
      cost: requestCost,
      reason: reasonText || "Paid feature unlock",
      featureKey: key,
      pricingSource: "dynamic-fallback",
    };
  }

  return {
    ok: false,
    status: 400,
    code: "UNKNOWN_FEATURE_KEY",
    message: "결제 상품 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    availableFeatureKeys: listServerPricedFeatureKeys(),
  };
}

function resolveUnlockProductSpec(productId) {
  const id = String(productId || "").trim().toLowerCase();
  if (!id) return null;
  return PIG_COIN_UNLOCK_PRODUCTS[id] || null;
}

const PROFILE_SUB_PLANS = Object.freeze({
  standard: {
    name: HONEY_SUBSCRIPTION_PLANS.honey_standard.name,
    coins: HONEY_SUBSCRIPTION_PLANS.honey_standard.priceCoins,
    profileLimit: HONEY_SUBSCRIPTION_PLANS.honey_standard.profileLimit,
    durationDays: HONEY_SUBSCRIPTION_PLANS.honey_standard.durationDays,
    lowWarnAt: HONEY_SUBSCRIPTION_PLANS.honey_standard.freeServiceThresholdCoins,
    planId: "honey_standard",
  },
  premium: {
    name: HONEY_SUBSCRIPTION_PLANS.honey_premium.name,
    coins: HONEY_SUBSCRIPTION_PLANS.honey_premium.priceCoins,
    profileLimit: HONEY_SUBSCRIPTION_PLANS.honey_premium.profileLimit,
    durationDays: HONEY_SUBSCRIPTION_PLANS.honey_premium.durationDays,
    lowWarnAt: HONEY_SUBSCRIPTION_PLANS.honey_premium.freeServiceThresholdCoins,
    planId: "honey_premium",
  },
  vvip: {
    name: HONEY_SUBSCRIPTION_PLANS.honey_vvip.name,
    coins: HONEY_SUBSCRIPTION_PLANS.honey_vvip.priceCoins,
    profileLimit: HONEY_SUBSCRIPTION_PLANS.honey_vvip.profileLimit,
    durationDays: HONEY_SUBSCRIPTION_PLANS.honey_vvip.durationDays,
    lowWarnAt: HONEY_SUBSCRIPTION_PLANS.honey_vvip.freeServiceThresholdCoins,
    planId: "honey_vvip",
  },
});

const VALID_SUB_TIERS = new Set(Object.keys(PROFILE_SUB_PLANS));

const SHARE_REWARD_AMOUNT = 10;
const SHARE_REWARD_DAILY_LIMIT = 3;
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const PERSISTENT_UNLOCK_ALIAS_MAP = Object.freeze({
  "olympus-profile-fc": ["olympus-fc"],
  "olympus-fc": ["olympus-profile-fc"],
  "flower-fc": ["flower-destiny", "flower-astro", "flower-ziwei", "flower-sukuyo"],
  "flower-destiny": ["flower-fc"],
  "flower-astro": ["flower-fc"],
  "flower-ziwei": ["flower-fc"],
  "flower-sukuyo": ["flower-fc"],
  allPaidSaju: [
    "rpgCharacter",
    "travelDestiny",
    "healthReport",
    "sajuDiary",
    "secretHouseEpisodes",
    "rpt_skillTreeCard",
    "rpt_energyCoordCard",
    "rpt_healthReportCard",
    "rpt_luckSyncDiaryEntryCard",
    "rpt_secretHouseEntryCard",
  ],
  rpgCharacter: ["rpt_skillTreeCard"],
  travelDestiny: ["rpt_energyCoordCard"],
  healthReport: ["rpt_healthReportCard"],
  sajuDiary: ["rpt_luckSyncDiaryEntryCard"],
  secretHouseEpisodes: ["rpt_secretHouseEntryCard"],
});
const PERSISTENT_UNLOCK_KEY_SET = new Set([
  "flower-fc",
  "flower-destiny",
  "flower-astro",
  "flower-ziwei",
  "flower-sukuyo",
  "olympus-fc",
  "olympus-profile-fc",
  "section_daewun",
  "section_summary",
  "section_compat",
  "allPaidSaju",
  "rpgCharacter",
  "travelDestiny",
  "healthReport",
  "sajuDiary",
  "secretHouseEpisodes",
  "premiumDivinationPack",
  "rpt_specialCharmCard",
  "rpt_quantumCard",
  "rpt_healthReportCard",
  "rpt_skillTreeCard",
  "rpt_energyCoordCard",
  "rpt_villainCard",
  "rpt_luckSyncDiaryEntryCard",
  "rpt_secretHouseEntryCard",
  "animal-destiny-unlock",
  "premium-sibyl-dominator",
  "premium-ziwei",
  "premium-astrology",
  "premium-sukuyo",
  "premium-veda",
  "premium-naming",
]);

function isPersistentUnlockFeatureKey(rawKey) {
  const base = String(rawKey || "").trim();
  if (!base) return false;
  if (base === "pig-coin-unlock" || base === "coin-gate-per-use") return false;
  if (PERSISTENT_UNLOCK_KEY_SET.has(base)) return true;
  if (base.startsWith("section_")) return true;
  if (base.startsWith("flower-") || base.startsWith("olympus-")) return true;
  return false;
}

function resolvePersistentUnlockAliasKeys(rawKey) {
  const base = String(rawKey || "").trim();
  if (!base) return [];
  const map = Object.create(null);
  map[base] = true;
  const aliases = PERSISTENT_UNLOCK_ALIAS_MAP[base] || [];
  for (let i = 0; i < aliases.length; i += 1) {
    map[aliases[i]] = true;
  }
  return Object.keys(map);
}

function resolvePersistentUnlockKeys(rawKey) {
  if (!isPersistentUnlockFeatureKey(rawKey)) return [];
  const aliases = resolvePersistentUnlockAliasKeys(rawKey);
  const map = Object.create(null);
  for (let i = 0; i < aliases.length; i += 1) {
    if (isPersistentUnlockFeatureKey(aliases[i])) {
      map[aliases[i]] = true;
    }
  }
  return Object.keys(map);
}

function normalizePersistentUnlockKeys(values) {
  if (!Array.isArray(values)) return [];
  const map = Object.create(null);
  for (let i = 0; i < values.length; i += 1) {
    const aliases = resolvePersistentUnlockKeys(values[i]);
    for (let j = 0; j < aliases.length; j += 1) {
      map[aliases[j]] = true;
    }
  }
  return Object.keys(map);
}

function toUnlockMap(unlockedFeatures) {
  const map = Object.create(null);
  const keys = normalizePersistentUnlockKeys(unlockedFeatures);
  for (let i = 0; i < keys.length; i += 1) {
    map[keys[i]] = true;
  }
  return map;
}

function normalizeStringArray(values, maxLength = 200) {
  if (!Array.isArray(values)) return [];
  const out = [];
  for (let i = 0; i < values.length; i += 1) {
    const value = String(values[i] || "").trim();
    if (!value) continue;
    out.push(value);
    if (out.length >= maxLength) break;
  }
  return out;
}

function isRepairableConsumeArrayShapeError(error) {
  const message = String(error?.message || "");
  if (!message) return false;
  const hasArrayOp = /\$push|\$addToSet|must be an array|non-array field/i.test(message);
  if (!hasArrayOp) return false;
  return /recentConsumeRequestIds|unlockedFeatures/i.test(message);
}

async function resolvePersistedUnlockFeatures(userId, currentUnlocks) {
  const fromUser = normalizePersistentUnlockKeys(currentUnlocks);
  if (fromUser.length || !userId) return fromUser;

  let historyKeys = [];
  try {
    historyKeys = await PointHistory.distinct("featureKey", {
      userId,
      kind: "deduct",
      featureKey: { $in: Array.from(PERSISTENT_UNLOCK_KEY_SET) },
    });
  } catch (error) {
    console.error("[fortune:unlock-features] fallback to user unlock cache:", error?.message || error);
    return fromUser;
  }

  const inferred = normalizePersistentUnlockKeys(historyKeys);
  if (inferred.length) {
    await User.updateOne(
      { _id: userId },
      { $addToSet: { unlockedFeatures: { $each: inferred } } },
    ).catch(() => {});
  }
  return inferred;
}

function getFlowerAdminSecret(env) {
  return String(env?.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000");
}

function extractAdminTokenFromRequest(request) {
  const xat = String(request.headers.get("x-admin-token") || "").trim();
  if (FLOWER_ADMIN_TOKEN_RE.test(xat)) return xat;

  const auth = String(request.headers.get("authorization") || "");
  if (auth.startsWith("Bearer ")) {
    const bearer = auth.slice(7).trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(bearer)) return bearer;
  }

  const cookieHeader = String(request.headers.get("cookie") || "");
  const flowerMatch = cookieHeader.match(/(?:^|;\s*)flower_admin_token=([^;]+)/);
  if (flowerMatch) {
    try {
      const decoded = decodeURIComponent(flowerMatch[1]);
      if (FLOWER_ADMIN_TOKEN_RE.test(decoded)) return decoded;
    } catch (_) {
      if (FLOWER_ADMIN_TOKEN_RE.test(flowerMatch[1])) return flowerMatch[1];
    }
  }

  const legacyMatch = cookieHeader.match(/(?:^|;\s*)fortune_auth_token=([^;]+)/);
  if (legacyMatch) {
    try {
      const decoded = decodeURIComponent(legacyMatch[1]);
      if (FLOWER_ADMIN_TOKEN_RE.test(decoded)) return decoded;
    } catch (_) {
      if (FLOWER_ADMIN_TOKEN_RE.test(legacyMatch[1])) return legacyMatch[1];
    }
  }

  return "";
}

function _b64uToJson(payloadB64) {
  const base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (base64.length % 4)) % 4;
  const withPad = base64 + "=".repeat(padLen);
  return JSON.parse(atob(withPad));
}

async function hmacSha256Hex(data, secret) {
  const subtle = globalThis?.crypto?.subtle;
  if (!subtle) return "";
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyFlowerAdminToken(token, env) {
  try {
    if (!FLOWER_ADMIN_TOKEN_RE.test(String(token || ""))) return false;
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx < 1) return false;

    const payloadB64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const expected = await hmacSha256Hex(payloadB64, getFlowerAdminSecret(env));
    if (!expected || expected.length !== sig.length) return false;

    let diff = 0;
    for (let i = 0; i < expected.length; i += 1) {
      diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    }
    if (diff !== 0) return false;

    const payload = _b64uToJson(payloadB64);
    const exp = Number(payload?.exp || 0);
    const now = Math.floor(Date.now() / 1000);
    return payload?.v === 1 && Number.isFinite(exp) && now <= exp;
  } catch (_) {
    return false;
  }
}

async function resolvePigCoinConsumeAuth(request, env) {
  let auth = null;
  try {
    auth = await requireUserFromRequest(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      auth = null;
    } else {
      throw error;
    }
  }

  const adminToken = extractAdminTokenFromRequest(request);
  const adminMode = (adminToken && isAdminPigCoinBypassEnabled(env))
    ? await verifyFlowerAdminToken(adminToken, env)
    : false;

  if (!auth && !adminMode) {
    throw createHttpError(401, "로그인이 필요합니다.", { code: "UNAUTHORIZED" });
  }

  return { auth, adminMode };
}

function userPayload(auth, points, unlockedFeatures) {
  const authUserId = String(auth?.userId || "").trim();
  const payload = {
    id: authUserId,
    points: Number(points || 0),
  };
  const normalizedUnlocks = normalizePersistentUnlockKeys(unlockedFeatures);
  if (normalizedUnlocks.length) payload.unlockedFeatures = normalizedUnlocks;
  return payload;
}

function normalizeSubscriptionTier(value) {
  const planId = normalizeHoneyPlanId(value);
  if (!planId || planId === "free") return null;
  const legacyTier = honeyPlanIdToLegacyTier(planId);
  return VALID_SUB_TIERS.has(legacyTier) ? legacyTier : null;
}

function getPlanPolicy(tier) {
  const plan = PROFILE_SUB_PLANS[tier] || null;
  if (!plan) {
    return {
      tier: "free",
      freeLimit: 0,
      profileLimit: 1,
      recommendedCoins: 0,
    };
  }

  return {
    tier,
    freeLimit: Number(plan.lowWarnAt || 0),
    profileLimit: Number(plan.profileLimit || 1),
    recommendedCoins: Number(plan.coins || 0),
  };
}

function toObjectId(value) {
  const normalized = String(value || "").trim();
  if (!mongoose.Types.ObjectId.isValid(normalized)) return null;
  return new mongoose.Types.ObjectId(normalized);
}

function buildHoneyFreeSnapshot(userId, now = new Date(), status = "none") {
  const freePlan = getHoneyPlan("free");
  return {
    userId: toObjectId(userId),
    planId: "free",
    status: normalizeHoneyStatus(status),
    startedAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    autoRenewEnabled: false,
    cancelAtPeriodEnd: false,
    priceCoins: Number(freePlan.priceCoins || 0),
    profileLimit: Number(freePlan.profileLimit || 1),
    freeServiceThresholdCoins: Number(freePlan.freeServiceThresholdCoins || 0),
    lastRenewedAt: null,
    lastRenewalFailedAt: null,
    renewalFailReason: "",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeHoneySnapshot(rawSnapshot, userId, now = new Date()) {
  if (!rawSnapshot || typeof rawSnapshot !== "object") {
    return buildHoneyFreeSnapshot(userId, now, "none");
  }

  const planId = normalizeHoneyPlanId(rawSnapshot.planId || rawSnapshot.tier) || "free";
  const plan = getHoneyPlan(planId);
  const status = normalizeHoneyStatus(rawSnapshot.status || (planId === "free" ? "none" : "active"));

  const startedAt = toValidDate(rawSnapshot.startedAt);
  const currentPeriodStart = toValidDate(rawSnapshot.currentPeriodStart || rawSnapshot.startedAt);
  const currentPeriodEnd = toValidDate(rawSnapshot.currentPeriodEnd || rawSnapshot.expiresAt);
  const autoRenewEnabled = Boolean(rawSnapshot.autoRenewEnabled);
  const cancelAtPeriodEnd = Boolean(rawSnapshot.cancelAtPeriodEnd);

  return {
    ...rawSnapshot,
    userId: toObjectId(rawSnapshot.userId || userId),
    planId,
    status,
    startedAt,
    currentPeriodStart,
    currentPeriodEnd,
    autoRenewEnabled: plan.autoRenewSupported ? autoRenewEnabled : false,
    cancelAtPeriodEnd,
    priceCoins: Number.isFinite(Number(rawSnapshot.priceCoins))
      ? Number(rawSnapshot.priceCoins)
      : Number(plan.priceCoins || 0),
    profileLimit: Number.isFinite(Number(rawSnapshot.profileLimit)) && Number(rawSnapshot.profileLimit) > 0
      ? Number(rawSnapshot.profileLimit)
      : Number(plan.profileLimit || 1),
    freeServiceThresholdCoins: Number.isFinite(Number(rawSnapshot.freeServiceThresholdCoins))
      ? Number(rawSnapshot.freeServiceThresholdCoins)
      : Number(plan.freeServiceThresholdCoins || 0),
    lastRenewedAt: toValidDate(rawSnapshot.lastRenewedAt),
    lastRenewalFailedAt: toValidDate(rawSnapshot.lastRenewalFailedAt),
    renewalFailReason: normalizeHoneyRenewalFailReason(rawSnapshot.renewalFailReason) || "",
    createdAt: toValidDate(rawSnapshot.createdAt) || now,
    updatedAt: toValidDate(rawSnapshot.updatedAt) || now,
  };
}

async function ensureHoneySubscriptionSnapshot(userId, user, now = new Date()) {
  const normalizedUserId = String(userId || "").trim();
  const objectId = toObjectId(normalizedUserId);
  if (!objectId) return buildHoneyFreeSnapshot(normalizedUserId, now, "none");

  let snapshot = await HoneySubscription.findOne({ userId: objectId }).lean();
  if (snapshot) {
    const normalizedSnapshot = normalizeHoneySnapshot(snapshot, normalizedUserId, now);
    const patch = {};
    const plan = getHoneyPlan(normalizedSnapshot.planId);
    if (normalizedSnapshot.priceCoins !== Number(plan.priceCoins || 0)) {
      patch.priceCoins = Number(plan.priceCoins || 0);
    }
    if (normalizedSnapshot.profileLimit !== Number(plan.profileLimit || 1)) {
      patch.profileLimit = Number(plan.profileLimit || 1);
    }
    if (normalizedSnapshot.freeServiceThresholdCoins !== Number(plan.freeServiceThresholdCoins || 0)) {
      patch.freeServiceThresholdCoins = Number(plan.freeServiceThresholdCoins || 0);
    }
    if (!plan.autoRenewSupported && normalizedSnapshot.autoRenewEnabled) {
      patch.autoRenewEnabled = false;
    }
    if (Object.keys(patch).length > 0) {
      snapshot = await HoneySubscription.findByIdAndUpdate(
        normalizedSnapshot._id,
        { $set: patch },
        { new: true },
      ).lean();
    }
    return normalizeHoneySnapshot(snapshot || normalizedSnapshot, normalizedUserId, now);
  }

  const legacyTier = normalizeSubscriptionTier(user?.profileSubscription?.tier);
  const seededPlanId = legacyTier ? (PROFILE_SUB_PLANS[legacyTier]?.planId || "free") : "free";
  const seededPlan = getHoneyPlan(seededPlanId);
  const seededEnd = toValidDate(user?.profileSubscription?.currentPeriodEnd || user?.profileSubscription?.expiresAt);
  const seededStart = toValidDate(user?.profileSubscription?.currentPeriodStart || user?.profileSubscription?.startedAt);
  const seededIsActive = Boolean(seededPlanId !== "free" && seededEnd && seededEnd.getTime() > now.getTime());
  const seededStatus = seededIsActive ? "active" : (seededPlanId === "free" ? "none" : "expired");

  const createPayload = {
    userId: objectId,
    planId: seededIsActive ? seededPlanId : "free",
    status: seededStatus,
    startedAt: seededIsActive ? (seededStart || now) : null,
    currentPeriodStart: seededIsActive ? (seededStart || now) : null,
    currentPeriodEnd: seededIsActive ? seededEnd : null,
    autoRenewEnabled: seededIsActive
      ? Boolean(user?.profileSubscription?.autoRenewEnabled ?? !Boolean(user?.profileSubscription?.cancelAtPeriodEnd))
      : false,
    cancelAtPeriodEnd: seededIsActive ? Boolean(user?.profileSubscription?.cancelAtPeriodEnd) : false,
    priceCoins: seededIsActive ? Number(seededPlan.priceCoins || 0) : 0,
    profileLimit: seededIsActive ? Number(seededPlan.profileLimit || 1) : 1,
    freeServiceThresholdCoins: seededIsActive ? Number(seededPlan.freeServiceThresholdCoins || 0) : 0,
    lastRenewedAt: null,
    lastRenewalFailedAt: null,
    renewalFailReason: "",
  };

  try {
    snapshot = (await HoneySubscription.create(createPayload)).toObject();
  } catch (_) {
    snapshot = await HoneySubscription.findOne({ userId: objectId }).lean();
  }

  return normalizeHoneySnapshot(snapshot, normalizedUserId, now);
}

async function syncHoneySubscriptionToUserMirror(userId, snapshot, userProjection) {
  const planId = normalizeHoneyPlanId(snapshot?.planId) || "free";
  const paidPlan = getHoneyPlan(planId);
  const tier = planId === "free" ? "free" : honeyPlanIdToLegacyTier(planId);
  const status = normalizeHoneyStatus(snapshot?.status || (planId === "free" ? "none" : "active"));
  const expiresAt = toValidDate(snapshot?.currentPeriodEnd);
  const isActive = Boolean(planId !== "free" && status === "active" && expiresAt && expiresAt.getTime() > Date.now());
  const profileLimit = isActive ? Number(paidPlan.profileLimit || 1) : 1;
  const freeThreshold = isActive ? Number(paidPlan.freeServiceThresholdCoins || 0) : 0;
  const priceCoins = isActive ? Number(paidPlan.priceCoins || 0) : 0;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        "profileSubscription.tier": isActive ? tier : "free",
        "profileSubscription.planId": isActive ? planId : "free",
        "profileSubscription.status": isActive ? "active" : status,
        "profileSubscription.source": "coin",
        "profileSubscription.startedAt": isActive ? toValidDate(snapshot?.startedAt || snapshot?.currentPeriodStart) : null,
        "profileSubscription.expiresAt": isActive ? expiresAt : null,
        "profileSubscription.currentPeriodStart": isActive ? toValidDate(snapshot?.currentPeriodStart || snapshot?.startedAt) : null,
        "profileSubscription.currentPeriodEnd": isActive ? expiresAt : null,
        "profileSubscription.autoRenewEnabled": Boolean(isActive && snapshot?.autoRenewEnabled),
        "profileSubscription.cancelAtPeriodEnd": Boolean(isActive && snapshot?.cancelAtPeriodEnd),
        "profileSubscription.priceCoins": priceCoins,
        "profileSubscription.profileLimit": profileLimit,
        "profileSubscription.freeServiceThresholdCoins": freeThreshold,
        "profileSubscription.lastRenewedAt": toValidDate(snapshot?.lastRenewedAt),
        "profileSubscription.lastRenewalFailedAt": toValidDate(snapshot?.lastRenewalFailedAt),
        "profileSubscription.renewalFailReason": String(snapshot?.renewalFailReason || "").trim(),
      },
    },
    {
      new: true,
      projection: userProjection || {
        points: 1,
        profileSubscription: 1,
        unlockedFeatures: 1,
        recentConsumeRequestIds: 1,
      },
    },
  ).lean();

  return updatedUser;
}

async function createHoneySubscriptionTransaction(payload) {
  const idempotencyKey = String(payload?.idempotencyKey || "").trim().slice(0, 120);
  const txPayload = {
    userId: payload.userId,
    subscriptionId: payload.subscriptionId,
    planId: normalizeHoneyPlanId(payload.planId) || "free",
    type: String(payload.type || "SUBSCRIBE").trim().toUpperCase(),
    amountCoins: Number(payload.amountCoins || 0),
    status: String(payload.status || "SUCCESS").trim().toUpperCase(),
    periodStart: toValidDate(payload.periodStart),
    periodEnd: toValidDate(payload.periodEnd),
    idempotencyKey,
    reason: String(payload.reason || "").trim().slice(0, 300),
  };

  if (idempotencyKey) {
    const existing = await HoneySubscriptionTransaction.findOne({
      userId: txPayload.userId,
      type: txPayload.type,
      idempotencyKey,
    }).lean();
    if (existing) return existing;
  }

  return HoneySubscriptionTransaction.create(txPayload);
}

function resolveHoneyLegacyTier(snapshot, now = new Date()) {
  const planId = normalizeHoneyPlanId(snapshot?.planId) || "free";
  if (planId === "free") return null;

  const status = normalizeHoneyStatus(snapshot?.status);
  const currentPeriodEnd = toValidDate(snapshot?.currentPeriodEnd);
  const active = Boolean(status === "active" && currentPeriodEnd && currentPeriodEnd.getTime() > now.getTime());
  if (!active) return null;
  return honeyPlanIdToLegacyTier(planId);
}

async function moveHoneySubscriptionToFreePlan({
  userId,
  snapshot,
  now,
  status,
  renewalFailReason,
  transactionType,
  transactionStatus,
  transactionReason,
  userProjection,
}) {
  const nextStatus = normalizeHoneyStatus(status || "expired");
  const failReason = normalizeHoneyRenewalFailReason(renewalFailReason) || "";

  const updated = await HoneySubscription.findByIdAndUpdate(
    snapshot._id,
    {
      $set: {
        planId: "free",
        status: nextStatus,
        startedAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        autoRenewEnabled: false,
        cancelAtPeriodEnd: false,
        priceCoins: 0,
        profileLimit: 1,
        freeServiceThresholdCoins: 0,
        lastRenewalFailedAt: failReason ? now : null,
        renewalFailReason: failReason,
      },
    },
    { new: true },
  ).lean();

  await createHoneySubscriptionTransaction({
    userId,
    subscriptionId: snapshot._id,
    planId: snapshot.planId,
    type: transactionType || (failReason ? "RENEWAL_FAILED" : "EXPIRE"),
    amountCoins: 0,
    status: transactionStatus || (failReason ? "FAILED" : "SUCCESS"),
    periodStart: snapshot.currentPeriodStart,
    periodEnd: snapshot.currentPeriodEnd,
    reason: transactionReason || (failReason ? "자동 갱신 실패 후 무료 플랜 전환" : "구독 만료 후 무료 플랜 전환"),
  }).catch(() => null);

  const mirroredUser = await syncHoneySubscriptionToUserMirror(userId, updated, userProjection);
  return {
    snapshot: normalizeHoneySnapshot(updated, userId, now),
    user: mirroredUser,
    autoRenewed: false,
  };
}

async function processHoneyRenewalForSnapshot({ userId, user, snapshot, now, userProjection }) {
  const planId = normalizeHoneyPlanId(snapshot?.planId) || "free";
  const currentPeriodEnd = toValidDate(snapshot?.currentPeriodEnd);
  const status = normalizeHoneyStatus(snapshot?.status || "none");

  if (planId === "free") {
    const mirroredUser = await syncHoneySubscriptionToUserMirror(userId, snapshot, userProjection);
    return {
      snapshot: normalizeHoneySnapshot(snapshot, userId, now),
      user: mirroredUser || user,
      autoRenewed: false,
    };
  }

  const plan = getHoneyPlan(planId);
  if (status !== "active" || !currentPeriodEnd) {
    const resetSnapshot = await HoneySubscription.findByIdAndUpdate(
      snapshot._id,
      {
        $set: {
          status: "expired",
          autoRenewEnabled: false,
          cancelAtPeriodEnd: false,
        },
      },
      { new: true },
    ).lean();
    return moveHoneySubscriptionToFreePlan({
      userId,
      snapshot: normalizeHoneySnapshot(resetSnapshot || snapshot, userId, now),
      now,
      status: "expired",
      transactionType: "EXPIRE",
      transactionStatus: "SUCCESS",
      transactionReason: "구독 상태 비정상으로 무료 플랜 복구",
      userProjection,
    });
  }

  if (currentPeriodEnd.getTime() > now.getTime()) {
    const stable = await HoneySubscription.findByIdAndUpdate(
      snapshot._id,
      {
        $set: {
          status: "active",
          priceCoins: Number(plan.priceCoins || 0),
          profileLimit: Number(plan.profileLimit || 1),
          freeServiceThresholdCoins: Number(plan.freeServiceThresholdCoins || 0),
        },
      },
      { new: true },
    ).lean();

    const normalizedStable = normalizeHoneySnapshot(stable || snapshot, userId, now);
    const mirroredUser = await syncHoneySubscriptionToUserMirror(userId, normalizedStable, userProjection);
    return {
      snapshot: normalizedStable,
      user: mirroredUser || user,
      autoRenewed: false,
    };
  }

  if (!plan.autoRenewSupported || !snapshot.autoRenewEnabled || snapshot.cancelAtPeriodEnd) {
    return moveHoneySubscriptionToFreePlan({
      userId,
      snapshot,
      now,
      status: "expired",
      transactionType: "EXPIRE",
      transactionStatus: "SUCCESS",
      transactionReason: "자동 갱신 해제 상태에서 만료",
      userProjection,
    });
  }

  const priceCoins = Number(plan.priceCoins || 0);
  const idempotencyKey = `honey-renew:${String(snapshot._id)}:${currentPeriodEnd.toISOString()}`;
  const existingRenew = await HoneySubscriptionTransaction.findOne({
    userId: toObjectId(userId),
    subscriptionId: snapshot._id,
    type: "RENEW",
    idempotencyKey,
    status: "SUCCESS",
  }).lean();

  if (existingRenew) {
    const latestSnapshot = await HoneySubscription.findById(snapshot._id).lean();
    const normalizedLatest = normalizeHoneySnapshot(latestSnapshot || snapshot, userId, now);
    const mirroredUser = await syncHoneySubscriptionToUserMirror(userId, normalizedLatest, userProjection);
    return {
      snapshot: normalizedLatest,
      user: mirroredUser || user,
      autoRenewed: false,
    };
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, points: { $gte: priceCoins } },
    { $inc: { points: -priceCoins } },
    {
      new: true,
      projection: userProjection || {
        points: 1,
        profileSubscription: 1,
        unlockedFeatures: 1,
        recentConsumeRequestIds: 1,
      },
    },
  ).lean();

  if (!updatedUser) {
    return moveHoneySubscriptionToFreePlan({
      userId,
      snapshot,
      now,
      status: "renewal_failed",
      renewalFailReason: "INSUFFICIENT_COINS",
      transactionType: "RENEWAL_FAILED",
      transactionStatus: "FAILED",
      transactionReason: "자동 갱신 코인 부족",
      userProjection,
    });
  }

  const renewalBase = new Date(Math.max(currentPeriodEnd.getTime(), now.getTime()));
  const nextPeriodEnd = addDaysFromDate(renewalBase, Number(plan.durationDays || getDefaultHoneyDurationDays()));
  const nextPeriodStart = renewalBase;

  const renewedSnapshot = await HoneySubscription.findByIdAndUpdate(
    snapshot._id,
    {
      $set: {
        planId,
        status: "active",
        startedAt: toValidDate(snapshot.startedAt) || now,
        currentPeriodStart: nextPeriodStart,
        currentPeriodEnd: nextPeriodEnd,
        autoRenewEnabled: true,
        cancelAtPeriodEnd: false,
        priceCoins,
        profileLimit: Number(plan.profileLimit || 1),
        freeServiceThresholdCoins: Number(plan.freeServiceThresholdCoins || 0),
        lastRenewedAt: now,
        lastRenewalFailedAt: null,
        renewalFailReason: "",
      },
    },
    { new: true },
  ).lean();

  await PointHistory.create({
    userId,
    kind: "deduct",
    delta: -priceCoins,
    balanceAfter: Number(updatedUser.points || 0),
    reason: `${plan.name} subscription auto-renewal`,
    featureKey: "profile-subscription-auto-renew",
    metadata: { planId, expiresAt: nextPeriodEnd ? nextPeriodEnd.toISOString() : null, autoRenew: true },
  }).catch(() => {});

  await createHoneySubscriptionTransaction({
    userId,
    subscriptionId: snapshot._id,
    planId,
    type: "RENEW",
    amountCoins: priceCoins,
    status: "SUCCESS",
    periodStart: nextPeriodStart,
    periodEnd: nextPeriodEnd,
    idempotencyKey,
    reason: "코인 자동 갱신 성공",
  }).catch(() => null);

  const normalizedRenewed = normalizeHoneySnapshot(renewedSnapshot, userId, now);
  const mirroredUser = await syncHoneySubscriptionToUserMirror(userId, normalizedRenewed, userProjection);
  return {
    snapshot: normalizedRenewed,
    user: mirroredUser || updatedUser,
    autoRenewed: true,
  };
}

async function ensureActiveSubscriptionByAutoRenew(userId, user, projection) {
  const now = new Date();
  const snapshot = await ensureHoneySubscriptionSnapshot(userId, user, now);
  const runtime = await processHoneyRenewalForSnapshot({
    userId,
    user,
    snapshot,
    now,
    userProjection: projection,
  });

  const effectiveTier = resolveHoneyLegacyTier(runtime.snapshot, now);
  return {
    user: runtime.user || user,
    effectiveTier,
    autoRenewed: Boolean(runtime.autoRenewed),
    subscription: runtime.snapshot,
  };
}

async function handleCheck() {
  return json({
    message: "Fortune reading is currently free.",
    requiredPoints: 0,
    currentPoints: null,
    isFree: true,
  });
}

async function handleConsume(auth) {
  const user = await User.findById(auth.userId).select("points").lean();
  if (!user) return json({ message: "User not found." }, { status: 404 });

  return json({
    message: "Fortune reading is currently free. No coins were deducted.",
    requiredPoints: 0,
    isFree: true,
    user: userPayload(auth, user.points),
  });
}

async function handleBalance(auth) {
  const user = await User.findById(auth.userId).select("points unlockedFeatures").lean();
  if (!user) {
    return json({
      ok: true,
      authenticated: true,
      balance: 0,
      walletCreated: false,
      message: "Coin balance initialized with safe default.",
      user: userPayload(auth, 0, []),
      unlockedFeatures: [],
      unlockMap: {},
    });
  }

  let unlockedFeatures = normalizePersistentUnlockKeys(user.unlockedFeatures);
  try {
    unlockedFeatures = await resolvePersistedUnlockFeatures(auth.userId, user.unlockedFeatures);
  } catch (error) {
    console.error("[fortune:handleBalance] unlock feature lookup degraded:", error?.message || error);
  }
  const points = Number(user.points || 0);

  return json({
    ok: true,
    authenticated: true,
    balance: points,
    walletCreated: true,
    message: "Coin balance loaded.",
    user: userPayload(auth, points, unlockedFeatures),
    unlockedFeatures,
    unlockMap: toUnlockMap(unlockedFeatures),
  });
}

function handleGuestBalance() {
  return json({
    ok: false,
    authenticated: false,
    code: "AUTH_REQUIRED",
    message: "로그인이 필요합니다.",
  }, { status: 401 });
}

async function handleChargeSimulate(request, env, auth) {
  if (String(env.PIG_COIN_PAYMENT_API_READY || "") !== "true") {
    return json({
      message: "Coin charge simulation is disabled because the payment API is not ready.",
      code: "PIG_COIN_CHARGE_DISABLED",
    }, { status: 503 });
  }

  const body = await readJson(request);
  const packageId = String(body?.packageId || "").trim();
  const pkg = PIG_COIN_PACKAGES[packageId];
  if (!pkg) return json({ message: "Unsupported charge package." }, { status: 400 });

  const delta = Number(pkg.coins || 0) + Number(pkg.bonus || 0);
  if (!Number.isFinite(delta) || delta <= 0) {
    return json({ message: "Invalid charge amount." }, { status: 400 });
  }

  const updatedUser = await User.findByIdAndUpdate(
    auth.userId,
    { $inc: { points: delta } },
    { new: true, projection: { points: 1 } },
  ).lean();

  if (!updatedUser) return json({ message: "User not found." }, { status: 404 });

  await PointHistory.create({
    userId: auth.userId,
    kind: "charge",
    delta,
    balanceAfter: Number(updatedUser.points || 0),
    reason: "Coin charge simulation",
    featureKey: "pig-coin-charge",
    metadata: {
      source: "fortune.pig-coin.charge-simulate",
      packageId,
      packageName: pkg.name,
      baseCoins: Number(pkg.coins || 0),
      bonusCoins: Number(pkg.bonus || 0),
    },
  });

  return json({
    message: `${delta.toLocaleString("ko-KR")} coins charged.`,
    package: {
      id: packageId,
      name: pkg.name,
      coins: Number(pkg.coins || 0),
      bonus: Number(pkg.bonus || 0),
    },
    user: userPayload(auth, updatedUser.points),
  });
}

function normalizeIdempotencyKey(request, body) {
  return String(
    body?.requestId
      || body?.idempotencyKey
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key")
      || "",
  ).trim().slice(0, 120);
}

async function handlePigCoinPrices() {
  return json({
    ok: true,
    code: "OK",
    message: "서버 코인 가격표를 조회했습니다.",
    prices: listPublicCoinPriceTable(),
    updatedAt: new Date().toISOString(),
  });
}

async function handlePigCoinConsume(request, auth, options = {}) {
  const env = options?.env || {};
  const adminMode = Boolean(options?.adminMode);
  if (!auth && !adminMode) {
    return json({ message: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const authUserId = String(auth?.userId || "").trim();
  if (!adminMode && !/^[a-f0-9]{24}$/i.test(authUserId)) {
    return json({ message: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const body = await readJson(request);
  const productId = String(body?.productId || options?.productId || "").trim().toLowerCase();
  const productSpec = productId ? resolveUnlockProductSpec(productId) : null;
  if (productId && !productSpec) {
    return json({
      message: "Unsupported unlock product.",
      code: "INVALID_PRODUCT",
      productId,
    }, { status: 400 });
  }

  const requestedFeatureKey = String(productSpec?.featureKey || body?.featureKey || "pig-coin-unlock").trim().slice(0, 60);
  let featureKey = normalizeFeatureKey(requestedFeatureKey).slice(0, 60);
  const requestReason = String(productSpec?.reason || body?.reason || "Paid feature unlock").trim().slice(0, 120);
  const requestedCost = Number(productSpec ? productSpec.cost : body?.cost);
  const pricing = resolveServerCoinPricing({
    env,
    productSpec,
    requestedCost,
    featureKey,
    reason: requestReason,
  });

  if (!pricing.ok) {
    if (pricing.code === "UNKNOWN_FEATURE_KEY") {
      try {
        console.error("[fortune][pricing][unknown-feature]", JSON.stringify({
          featureKey,
          requestedFeatureKey: requestedFeatureKey !== featureKey ? requestedFeatureKey : undefined,
          requestReason,
          productId: productId || null,
          route: "/api/fortune/pig-coin/consume",
        }));
      } catch {
        console.error("[fortune][pricing][unknown-feature]", {
          featureKey,
          requestedFeatureKey: requestedFeatureKey !== featureKey ? requestedFeatureKey : undefined,
          requestReason,
          productId: productId || null,
        });
      }
    }

    const payload = {
      message: pricing.message || "서버 가격 검증에 실패했습니다.",
      code: pricing.code || "SERVER_PRICE_REQUIRED",
      productId: productId || null,
      featureKey,
      requestedFeatureKey: requestedFeatureKey !== featureKey ? requestedFeatureKey : undefined,
    };

    if (!isProductionRuntime(env) && pricing.code === "UNKNOWN_FEATURE_KEY") {
      payload.availableFeatureKeys = Array.isArray(pricing.availableFeatureKeys) ? pricing.availableFeatureKeys : [];
      payload.requestReason = requestReason;
    }

    return json({
      ...payload,
    }, { status: Number(pricing.status || 403) });
  }

  const pricingFeatureKey = normalizeFeatureKey(pricing.featureKey || featureKey).slice(0, 60);
  if (pricingFeatureKey) featureKey = pricingFeatureKey;

  const cost = Number.isFinite(Number(pricing.cost)) && Number(pricing.cost) > 0
    ? Math.floor(Number(pricing.cost))
    : PIG_COIN_DEFAULT_UNLOCK_COST;

  if (cost <= 0 || cost > PIG_COIN_MAX_COST) {
    return json({ message: "Invalid coin deduction amount.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const reason = String(pricing.reason || requestReason || "Paid feature unlock").trim().slice(0, 120);
  const categoryKey = String(body?.categoryKey || "").trim().slice(0, 60);
  const subFeatureKey = String(body?.subFeatureKey || "").trim().slice(0, 60);
  const payloadHash = String(body?.payloadHash || "").trim().slice(0, 120);
  const unlockKeysToPersist = resolvePersistentUnlockKeys(featureKey);
  const requestId = normalizeIdempotencyKey(request, body);
  const forceDeductRaw = productSpec ? productSpec.forceDeduct : body?.forceDeduct;
  const forceDeduct = forceDeductRaw === true || String(forceDeductRaw || "").toLowerCase() === "true";
  const forceDeductApplied = Boolean(forceDeduct && unlockKeysToPersist.length > 0);
  const authEmail = String(auth?.email || "").trim().toLowerCase();
  const forcePaidEmails = getForcePaidTestAccountEmails(env);
  const forcePaidMode = Boolean(authEmail && forcePaidEmails.has(authEmail));

  if (adminMode && !forcePaidMode) {
    const adminTestTier = normalizeSubscriptionTier(request.headers.get("x-admin-subscription-tier"));
    const policy = getPlanPolicy(adminTestTier);
    let currentPoints = null;
    let unlockedFeatures = [];
    if (auth?.userId) {
      const user = await User.findById(auth.userId).select("points unlockedFeatures").lean();
      if (user) {
        currentPoints = Number(user.points || 0);
        unlockedFeatures = await resolvePersistedUnlockFeatures(auth.userId, user.unlockedFeatures);
      }
    }

    return json({
      message: "Admin bypass enabled. No coins were deducted.",
      code: "ADMIN_BYPASS",
      featureKey,
      productId: productId || null,
      requiredCoins: cost,
      chargedCoins: 0,
      simulatedChargeCoins: 0,
      adminBypass: true,
      adminMode: true,
      simulated: true,
      adminTestTier: adminTestTier || null,
      freeLimit: policy.freeLimit,
      profileLimit: policy.profileLimit,
      recommendedCoins: policy.recommendedCoins,
      freeBySubscription: Boolean(adminTestTier && !forceDeductApplied && cost <= policy.freeLimit),
      forceDeductApplied,
      user: auth?.userId
        ? userPayload(auth, currentPoints == null ? 0 : currentPoints, unlockedFeatures)
        : { id: "admin", points: null },
      unlockedFeatures,
      unlockMap: toUnlockMap(unlockedFeatures),
    });
  }

  const user = await User.findById(auth.userId)
    .select("points profileSubscription unlockedFeatures recentConsumeRequestIds")
    .lean();

  if (!user) {
    return json({ message: "User not found.", code: "USER_NOT_FOUND" }, { status: 404 });
  }

  const renewState = await ensureActiveSubscriptionByAutoRenew(
    auth.userId,
    user,
    {
      points: 1,
      profileSubscription: 1,
      unlockedFeatures: 1,
      recentConsumeRequestIds: 1,
    },
  );
  const runtimeUser = renewState.user || user;
  const effectiveTier = renewState.effectiveTier;
  const policy = getPlanPolicy(effectiveTier);
  const isIncludedBySubscription = Boolean(!forceDeductApplied && effectiveTier && cost <= policy.freeLimit);

  if (isIncludedBySubscription) {
    return json({
      message: `${PROFILE_SUB_PLANS[effectiveTier]?.name || "구독"} 구독 중이라 코인이 차감되지 않는다. 별빛 혜택이 당신의 리딩을 지키고 있어요.`,
      code: "SUBSCRIPTION_INCLUDED",
      featureKey,
      productId: productId || null,
      requiredCoins: cost,
      chargedCoins: 0,
      freeBySubscription: true,
      forceDeductApplied,
      subscriptionTier: effectiveTier,
      freeLimit: policy.freeLimit,
      profileLimit: policy.profileLimit,
      recommendedCoins: policy.recommendedCoins,
      autoRenewed: Boolean(renewState.autoRenewed),
      user: userPayload(auth, Number(runtimeUser.points || 0), runtimeUser.unlockedFeatures),
      unlockedFeatures: normalizePersistentUnlockKeys(runtimeUser.unlockedFeatures),
      unlockMap: toUnlockMap(runtimeUser.unlockedFeatures),
    });
  }

  const updatePayload = {
    $inc: { points: -cost },
  };
  if (requestId) {
    updatePayload.$push = {
      recentConsumeRequestIds: {
        $each: [requestId],
        $slice: -200,
      },
    };
  }
  if (unlockKeysToPersist.length) {
    updatePayload.$addToSet = { unlockedFeatures: { $each: unlockKeysToPersist } };
  }

  const consumeFilter = {
    _id: auth.userId,
    points: { $gte: cost },
    ...(requestId ? { recentConsumeRequestIds: { $ne: requestId } } : {}),
  };
  const consumeOptions = { new: true, projection: { points: 1, unlockedFeatures: 1 } };

  let updatedUser = null;
  try {
    updatedUser = await User.findOneAndUpdate(
      consumeFilter,
      updatePayload,
      consumeOptions,
    ).lean();
  } catch (error) {
    if (!isRepairableConsumeArrayShapeError(error)) throw error;

    const repairSet = {};
    if (requestId) {
      repairSet.recentConsumeRequestIds = normalizeStringArray(runtimeUser?.recentConsumeRequestIds, 200);
    }
    if (unlockKeysToPersist.length) {
      repairSet.unlockedFeatures = normalizeStringArray(runtimeUser?.unlockedFeatures, 500);
    }
    if (Object.keys(repairSet).length) {
      await User.updateOne({ _id: auth.userId }, { $set: repairSet });
    }

    updatedUser = await User.findOneAndUpdate(
      consumeFilter,
      updatePayload,
      consumeOptions,
    ).lean();
  }

  if (!updatedUser) {
    if (requestId) {
      const replayUser = await User.findById(auth.userId)
        .select("points unlockedFeatures recentConsumeRequestIds")
        .lean();
      const replayIds = Array.isArray(replayUser?.recentConsumeRequestIds)
        ? replayUser.recentConsumeRequestIds.map((v) => String(v))
        : [];
      if (replayIds.includes(requestId)) {
        const replayUnlocks = normalizePersistentUnlockKeys(replayUser?.unlockedFeatures || []);
        return json({
          message: "Already processed request.",
          code: "IDEMPOTENT_REPLAY",
          featureKey,
          alreadyProcessed: true,
          idempotencyKey: requestId || null,
          productId: productId || null,
          requiredCoins: cost,
          chargedCoins: 0,
          freeBySubscription: false,
          forceDeductApplied,
          subscriptionTier: effectiveTier || "free",
          freeLimit: policy.freeLimit,
          profileLimit: policy.profileLimit,
          recommendedCoins: policy.recommendedCoins,
          user: userPayload(auth, Number(replayUser?.points || 0), replayUnlocks),
          unlockedFeatures: replayUnlocks,
          unlockMap: toUnlockMap(replayUnlocks),
        });
      }
    }
    return json({
      message: "Not enough coins.",
      requiredCoins: cost,
      code: "INSUFFICIENT_BALANCE",
      productId: productId || null,
    }, { status: 402 });
  }

  let history = null;
  let historyWriteFailed = false;
  try {
    history = await PointHistory.create({
      userId: auth.userId,
      kind: "deduct",
      delta: -cost,
      balanceAfter: Number(updatedUser.points || 0),
      reason,
      featureKey,
      metadata: {
        source: "fortune.pig-coin.consume",
        ...(requestId ? { requestId } : {}),
        ...(categoryKey ? { categoryKey } : {}),
        ...(subFeatureKey ? { subFeatureKey } : {}),
        ...(payloadHash ? { payloadHash } : {}),
        ...(requestedFeatureKey !== featureKey ? { requestedFeatureKey } : {}),
        subscriptionTierAtConsume: effectiveTier || "free",
      },
    });
  } catch (error) {
    historyWriteFailed = true;
    console.error("[fortune:pig-coin:consume] point-history write degraded:", error?.message || error);
  }

  const unlockedFeatures = normalizePersistentUnlockKeys(
    (updatedUser && updatedUser.unlockedFeatures) || unlockKeysToPersist,
  );

  return json({
    message: `${cost.toLocaleString("ko-KR")} coins deducted.`,
    code: "OK",
    featureKey,
    idempotencyKey: requestId || null,
    productId: productId || null,
    requiredCoins: cost,
    chargedCoins: cost,
    freeBySubscription: false,
    forceDeductApplied,
    subscriptionTier: effectiveTier || "free",
    freeLimit: policy.freeLimit,
    profileLimit: policy.profileLimit,
    recommendedCoins: policy.recommendedCoins,
    transactionId: String(history?._id || ""),
    historyWriteDegraded: historyWriteFailed,
    user: userPayload(auth, updatedUser.points, unlockedFeatures),
    unlockedFeatures,
    unlockMap: toUnlockMap(unlockedFeatures),
  });
}

async function handlePigCoinCharge(request, auth, options = {}) {
  const consumeResponse = await handlePigCoinConsume(request, auth, options);
  const payload = await consumeResponse.clone().json().catch(() => ({}));

  if (!consumeResponse.ok) {
    return consumeResponse;
  }

  const chargedCoins = Number(payload?.chargedCoins || 0);
  const balanceAfter = Number(payload?.user?.points ?? payload?.balance ?? 0);

  return json({
    ok: true,
    code: String(payload?.code || "OK"),
    message: String(payload?.message || "코인 차감이 완료되었습니다."),
    transactionId: String(payload?.transactionId || ""),
    featureKey: String(payload?.featureKey || payload?.requestedFeatureKey || ""),
    chargedCoins: Number.isFinite(chargedCoins) ? chargedCoins : 0,
    requiredCoins: Number(payload?.requiredCoins || chargedCoins || 0),
    freeBySubscription: Boolean(payload?.freeBySubscription),
    idempotencyKey: String(payload?.idempotencyKey || "") || null,
    balanceAfter: Number.isFinite(balanceAfter) ? balanceAfter : 0,
    user: payload?.user || null,
    unlockMap: payload?.unlockMap && typeof payload.unlockMap === "object" ? payload.unlockMap : {},
    unlockedFeatures: Array.isArray(payload?.unlockedFeatures) ? payload.unlockedFeatures : [],
    raw: payload,
  });
}

async function handlePigCoinUnlock(request, auth, options = {}) {
  const body = await readJson(request);
  const productId = String(body?.productId || "").trim().toLowerCase();
  if (!productId) {
    return json({ message: "productId is required.", code: "INVALID_PRODUCT" }, { status: 400 });
  }

  if (!resolveUnlockProductSpec(productId)) {
    return json({ message: "Unsupported unlock product.", code: "INVALID_PRODUCT", productId }, { status: 400 });
  }

  const delegatedBody = {
    productId,
    requestId: String(body?.requestId || "").trim().slice(0, 120),
  };
  const delegatedRequest = new Request(request.url, {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(delegatedBody),
  });

  return handlePigCoinConsume(delegatedRequest, auth, {
    ...options,
    productId,
    env: options?.env,
  });
}

function isObjectIdLike(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

function toValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoOrNull(value) {
  const date = toValidDate(value);
  return date ? date.toISOString() : null;
}

async function findUserByIdRaw(userId, projection = {}) {
  const normalizedId = String(userId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(normalizedId)) return null;

  return User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(normalizedId) },
    { projection },
  );
}

async function handlePigCoinRefund(request, auth) {
  const body = await readJson(request);
  const requestedCost = Number(body?.cost);
  const requestId = normalizeIdempotencyKey(request, body);
  const sourceTransactionId = String(body?.sourceTransactionId || body?.transactionId || "").trim();
  const featureKeyInput = String(body?.featureKey || "").trim();
  const shouldResolveFromSource = !Number.isFinite(requestedCost) || requestedCost <= 0 || !featureKeyInput;
  let resolvedCost = Number.isFinite(requestedCost) && requestedCost > 0
    ? Math.floor(requestedCost)
    : NaN;
  let resolvedFeatureKey = featureKeyInput || "";

  const reason = String(body?.reason || "Premium generation failed auto-refund").trim().slice(0, 120);
  const now = new Date();
  const recentWindow = new Date(now.getTime() - 1000 * 60 * 60 * 48);

  if (requestId) {
    const alreadyByRequest = await PointHistory.findOne({
      userId: auth.userId,
      kind: "refund",
      "metadata.requestId": requestId,
    }).lean();

    if (alreadyByRequest) {
      const user = await User.findById(auth.userId).select("points").lean();
      return json({
        message: "Refund already processed.",
        code: "REFUND_ALREADY_PROCESSED",
        alreadyRefunded: true,
        refundTransactionId: String(alreadyByRequest._id || ""),
        user: userPayload(auth, Number(user?.points || 0)),
      });
    }
  }

  const deductQuery = {
    userId: auth.userId,
    kind: "deduct",
    ...(Number.isFinite(resolvedCost) ? { delta: -resolvedCost } : {}),
    ...(resolvedFeatureKey ? { featureKey: resolvedFeatureKey } : {}),
    createdAt: { $gte: recentWindow },
  };

  if (isObjectIdLike(sourceTransactionId)) {
    deductQuery._id = sourceTransactionId;
  }

  let deducted = await PointHistory.findOne(deductQuery)
    .sort({ createdAt: -1 })
    .lean();

  if (!deducted && isObjectIdLike(sourceTransactionId)) {
    deducted = await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      _id: sourceTransactionId,
    }).lean();
  }

  if (!deducted) {
    if (isObjectIdLike(sourceTransactionId)) {
      const refundedBySource = await PointHistory.findOne({
        userId: auth.userId,
        kind: "refund",
        "metadata.refundForPointHistoryId": sourceTransactionId,
      }).lean();

      if (refundedBySource) {
        const user = await User.findById(auth.userId).select("points").lean();
        return json({
          message: "Refund already processed.",
          code: "REFUND_ALREADY_PROCESSED",
          alreadyRefunded: true,
          sourceTransactionId,
          refundTransactionId: String(refundedBySource._id || ""),
          user: userPayload(auth, Number(user?.points || 0)),
        });
      }
    }

    return json({
      message: "No refundable deduction found.",
      code: "NO_REFUNDABLE_DEDUCTION",
    }, { status: 409 });
  }

  if (shouldResolveFromSource) {
    const detectedCost = Math.abs(Number(deducted?.delta || 0));
    if (Number.isFinite(detectedCost) && detectedCost > 0) {
      resolvedCost = Math.floor(detectedCost);
    }
    resolvedFeatureKey = String(deducted?.featureKey || resolvedFeatureKey || "pig-coin-unlock").trim().slice(0, 60);
  }

  if (!Number.isFinite(resolvedCost) || resolvedCost <= 0 || resolvedCost > PIG_COIN_MAX_COST) {
    return json({ message: "Invalid coin refund amount.", code: "INVALID_REFUND_AMOUNT" }, { status: 400 });
  }

  const alreadyRefunded = await PointHistory.findOne({
    userId: auth.userId,
    kind: "refund",
    "metadata.refundForPointHistoryId": String(deducted._id),
  }).lean();

  if (alreadyRefunded) {
    const user = await User.findById(auth.userId).select("points").lean();
    return json({
      message: "Refund already processed.",
      code: "REFUND_ALREADY_PROCESSED",
      alreadyRefunded: true,
      refundTransactionId: String(alreadyRefunded._id || ""),
      user: userPayload(auth, Number(user?.points || 0)),
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    auth.userId,
    { $inc: { points: resolvedCost } },
    { new: true, projection: { points: 1 } },
  ).lean();

  if (!updatedUser) {
    return json({ message: "User not found." }, { status: 404 });
  }

  let refundHistory = null;
  let refundHistoryWriteFailed = false;
  try {
    refundHistory = await PointHistory.create({
      userId: auth.userId,
      kind: "refund",
      delta: resolvedCost,
      balanceAfter: Number(updatedUser.points || 0),
      reason,
      featureKey: resolvedFeatureKey,
      metadata: {
        source: "fortune.pig-coin.refund",
        requestId,
        refundForPointHistoryId: String(deducted._id),
        sourceTransactionId: String(deducted._id),
      },
    });
  } catch (error) {
    refundHistoryWriteFailed = true;
    console.error("[fortune:pig-coin:refund] point-history write degraded:", error?.message || error);
  }

  return json({
    message: `${resolvedCost.toLocaleString("ko-KR")} coins refunded.`,
    code: "OK",
    idempotencyKey: requestId || null,
    featureKey: resolvedFeatureKey,
    refundedCoins: resolvedCost,
    sourceTransactionId: String(deducted._id),
    refundTransactionId: String(refundHistory?._id || ""),
    historyWriteDegraded: refundHistoryWriteFailed,
    user: userPayload(auth, updatedUser.points),
  });
}

async function handleSubscriptionStatus(request, env, auth) {
  const user = await User.findById(auth.userId)
    .select("points profileSubscription has_started_paid_service first_service_access_date")
    .lean();

  if (!user) {
    return json({
      ok: true,
      authenticated: true,
      subscription: {
        planId: "free",
        planName: HONEY_SUBSCRIPTION_PLANS.free.name,
        status: "none",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        autoRenewEnabled: false,
        cancelAtPeriodEnd: false,
      },
      benefits: {
        isSubscriber: false,
        profileLimit: 1,
        freeServiceThresholdCoins: 0,
        sharedAcrossProfiles: false,
      },
      planId: "free",
      planName: HONEY_SUBSCRIPTION_PLANS.free.name,
      status: "none",
      isSubscribed: false,
      plan: "free",
      tier: "free",
      source: "coin",
      isActive: false,
      expiresAt: null,
      profileLimit: 1,
      points: 0,
      lowBalanceWarning: false,
      autoRenewed: false,
      autoRenewEnabled: false,
      cancelAtPeriodEnd: false,
      cancelRequestedAt: null,
      hasStartedPaidService: false,
      firstServiceAccessDate: null,
      adminMode: false,
      simulated: false,
      adminTestTier: null,
      freeLimit: 0,
      recommendedCoins: 0,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    });
  }

  const runtime = await ensureActiveSubscriptionByAutoRenew(
    auth.userId,
    user,
    {
      points: 1,
      profileSubscription: 1,
      has_started_paid_service: 1,
      first_service_access_date: 1,
    },
  );

  const runtimeUser = runtime.user || user;
  const points = Number(runtimeUser?.points || 0);
  const snapshot = normalizeHoneySnapshot(runtime.subscription, auth.userId, new Date());

  const adminToken = extractAdminTokenFromRequest(request);
  const adminMode = adminToken ? await verifyFlowerAdminToken(adminToken, env) : false;
  const adminTestTier = adminMode ? normalizeSubscriptionTier(request.headers.get("x-admin-subscription-tier")) : null;

  if (adminMode && adminTestTier) {
    const simulatedPlanId = PROFILE_SUB_PLANS[adminTestTier]?.planId || "free";
    const simulatedPlan = getHoneyPlan(simulatedPlanId);
    return json({
      ok: true,
      authenticated: true,
      subscription: {
        planId: simulatedPlanId,
        planName: simulatedPlan.name,
        status: "active",
        currentPeriodStart: toIsoOrNull(snapshot.currentPeriodStart),
        currentPeriodEnd: toIsoOrNull(snapshot.currentPeriodEnd),
        autoRenewEnabled: true,
        cancelAtPeriodEnd: false,
      },
      benefits: {
        isSubscriber: true,
        profileLimit: Number(simulatedPlan.profileLimit || 1),
        freeServiceThresholdCoins: Number(simulatedPlan.freeServiceThresholdCoins || 0),
        sharedAcrossProfiles: true,
      },
      planId: simulatedPlanId,
      planName: simulatedPlan.name,
      status: "active",
      isSubscribed: true,
      plan: adminTestTier,
      tier: adminTestTier,
      source: "coin",
      isActive: true,
      expiresAt: toIsoOrNull(snapshot.currentPeriodEnd),
      profileLimit: Number(simulatedPlan.profileLimit || 1),
      points,
      lowBalanceWarning: points <= Number(simulatedPlan.freeServiceThresholdCoins || 0),
      autoRenewed: false,
      autoRenewEnabled: true,
      cancelAtPeriodEnd: false,
      cancelRequestedAt: null,
      hasStartedPaidService: Boolean(runtimeUser.has_started_paid_service),
      firstServiceAccessDate: toIsoOrNull(runtimeUser.first_service_access_date),
      adminMode: true,
      simulated: true,
      adminTestTier,
      freeLimit: Number(simulatedPlan.freeServiceThresholdCoins || 0),
      recommendedCoins: Number(simulatedPlan.priceCoins || 0),
      currentPeriodStart: toIsoOrNull(snapshot.currentPeriodStart),
      currentPeriodEnd: toIsoOrNull(snapshot.currentPeriodEnd),
    });
  }

  const legacyTier = resolveHoneyLegacyTier(snapshot, new Date()) || "free";
  const activePlanId = legacyTier === "free" ? "free" : (PROFILE_SUB_PLANS[legacyTier]?.planId || "free");
  const activePlan = getHoneyPlan(activePlanId);
  const activeStatus = legacyTier === "free" ? normalizeHoneyStatus(snapshot.status || "none") : "active";
  const benefits = resolveHoneyBenefits(activePlanId, legacyTier !== "free");

  return json({
    ok: true,
    authenticated: true,
    subscription: {
      planId: activePlanId,
      planName: activePlan.name,
      status: activeStatus,
      currentPeriodStart: legacyTier === "free" ? null : toIsoOrNull(snapshot.currentPeriodStart),
      currentPeriodEnd: legacyTier === "free" ? null : toIsoOrNull(snapshot.currentPeriodEnd),
      autoRenewEnabled: Boolean(legacyTier !== "free" && snapshot.autoRenewEnabled),
      cancelAtPeriodEnd: Boolean(legacyTier !== "free" && snapshot.cancelAtPeriodEnd),
    },
    benefits,
    planId: activePlanId,
    planName: activePlan.name,
    status: activeStatus,
    isSubscribed: legacyTier !== "free",
    plan: legacyTier,
    tier: legacyTier,
    source: "coin",
    isActive: legacyTier !== "free",
    expiresAt: legacyTier === "free" ? null : toIsoOrNull(snapshot.currentPeriodEnd),
    profileLimit: Number(benefits.profileLimit || 1),
    points,
    lowBalanceWarning: Boolean(legacyTier !== "free" && points <= Number(benefits.freeServiceThresholdCoins || 0)),
    autoRenewed: Boolean(runtime.autoRenewed),
    autoRenewEnabled: Boolean(legacyTier !== "free" && snapshot.autoRenewEnabled),
    cancelAtPeriodEnd: Boolean(legacyTier !== "free" && snapshot.cancelAtPeriodEnd),
    cancelRequestedAt: null,
    hasStartedPaidService: Boolean(runtimeUser.has_started_paid_service),
    firstServiceAccessDate: toIsoOrNull(runtimeUser.first_service_access_date),
    adminMode,
    simulated: false,
    adminTestTier: null,
    freeLimit: Number(benefits.freeServiceThresholdCoins || 0),
    recommendedCoins: Number(activePlan.priceCoins || 0),
    currentPeriodStart: legacyTier === "free" ? null : toIsoOrNull(snapshot.currentPeriodStart),
    currentPeriodEnd: legacyTier === "free" ? null : toIsoOrNull(snapshot.currentPeriodEnd),
    renewalFailReason: String(snapshot.renewalFailReason || "") || null,
  });
}

function buildTokenFallbackSubscriptionStatus(auth) {
  const hintedTier = normalizeSubscriptionTier(auth?.subscriptionTier || auth?.profileSubscription?.tier || auth?.tier) || "free";
  const planId = hintedTier === "free" ? "free" : (PROFILE_SUB_PLANS[hintedTier]?.planId || "free");
  const plan = getHoneyPlan(planId);
  const isActive = hintedTier !== "free";
  const benefits = resolveHoneyBenefits(planId, isActive);
  const points = Number.isFinite(Number(auth?.points)) ? Number(auth.points) : 0;

  return {
    ok: true,
    authenticated: true,
    degraded: true,
    source: "token",
    code: "SUBSCRIPTION_STORAGE_UNAVAILABLE",
    message: "구독 정보를 임시 데이터로 표시합니다.",
    subscription: {
      planId,
      planName: plan.name,
      status: isActive ? "active" : "none",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      autoRenewEnabled: false,
      cancelAtPeriodEnd: false,
    },
    benefits,
    planId,
    planName: plan.name,
    status: isActive ? "active" : "none",
    isSubscribed: isActive,
    plan: hintedTier,
    tier: hintedTier,
    isActive,
    expiresAt: null,
    profileLimit: Number(benefits.profileLimit || 1),
    points,
    lowBalanceWarning: false,
    autoRenewed: false,
    autoRenewEnabled: false,
    cancelAtPeriodEnd: false,
    cancelRequestedAt: null,
    hasStartedPaidService: false,
    firstServiceAccessDate: null,
    adminMode: false,
    simulated: false,
    adminTestTier: null,
    freeLimit: Number(benefits.freeServiceThresholdCoins || 0),
    recommendedCoins: Number(plan.priceCoins || 0),
    currentPeriodStart: null,
    currentPeriodEnd: null,
    renewalFailReason: null,
  };
}

function handleGuestSubscriptionStatus() {
  return json({
    ok: false,
    authenticated: false,
    code: "AUTH_REQUIRED",
    message: "로그인이 필요합니다.",
  }, { status: 401 });
}

async function handleStartService(request, auth) {
  const body = await readJson(request);
  const action = String(body?.action || "membership-content").trim().slice(0, 80);
  const contentTitle = String(body?.contentTitle || "Membership content").trim().slice(0, 120);
  const policyVersion = String(body?.policyVersion || body?.legalVersion || "2026-05-honey-membership-v1").trim().slice(0, 40);
  const featureKey = String(body?.featureKey || action || "membership-content").trim().slice(0, 120);
  const profileId = String(body?.profileId || "").trim().slice(0, 120);
  const now = new Date();

  const user = await User.findById(auth.userId)
    .select("profileSubscription points has_started_paid_service first_service_access_date")
    .lean();

  if (!user) return json({ message: "User not found." }, { status: 404 });

  const runtime = await ensureActiveSubscriptionByAutoRenew(
    auth.userId,
    user,
    { points: 1, profileSubscription: 1, has_started_paid_service: 1, first_service_access_date: 1 },
  );
  const activeTier = runtime.effectiveTier;
  if (!activeTier) {
    return json({
      ok: false,
      code: "SUBSCRIPTION_REQUIRED",
      message: "멤버십 전용 콘텐츠는 구독 후 이용할 수 있습니다.",
    }, { status: 403 });
  }

  if (!featureKey) {
    return json({
      ok: false,
      code: "MEMBERSHIP_CONSENT_REQUIRED",
      message: "동의 기록 저장을 위해 featureKey가 필요합니다.",
    }, { status: 400 });
  }

  let consentRecord = null;
  try {
    consentRecord = await MembershipContentAccessConsent.create({
      userId: auth.userId,
      profileId,
      featureKey,
      policyVersion,
      agreedAt: now,
    });
  } catch (error) {
    console.error("[fortune:membership-consent] save failed:", error?.message || error);
    return json({
      ok: false,
      code: "MEMBERSHIP_CONSENT_SAVE_FAILED",
      message: "동의 기록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    }, { status: 500 });
  }

  const alreadyStarted = Boolean(user.has_started_paid_service);
  let startedAt = user.first_service_access_date ? new Date(user.first_service_access_date) : null;

  if (!alreadyStarted) {
    const updated = await User.findOneAndUpdate(
      { _id: auth.userId, has_started_paid_service: { $ne: true } },
      {
        $set: {
          has_started_paid_service: true,
          first_service_access_date: now,
        },
      },
      { new: true, projection: { points: 1, first_service_access_date: 1 } },
    ).lean();

    if (updated?.first_service_access_date) {
      startedAt = new Date(updated.first_service_access_date);
    }
  }

  await PointHistory.create({
    userId: auth.userId,
    kind: "adjust",
    delta: 0,
    balanceAfter: Number(user.points || 0),
    reason: "Membership content access acknowledged",
    featureKey: "profile-subscription-service-start",
    metadata: {
      action,
      contentTitle,
      policyVersion,
      featureKey,
      profileId,
      acknowledgedAt: now.toISOString(),
    },
  }).catch(() => {});

  return json({
    ok: true,
    started: true,
    alreadyStarted,
    consentId: String(consentRecord?._id || ""),
    consent: {
      userId: String(auth.userId || ""),
      profileId: profileId || null,
      featureKey,
      agreedAt: now.toISOString(),
      policyVersion,
    },
    hasStartedPaidService: true,
    firstServiceAccessDate: startedAt ? startedAt.toISOString() : now.toISOString(),
  });
}

async function handleSubscriptionPlans() {
  return json({
    ok: true,
    plans: listPublicHoneySubscriptionPlans(),
    updatedAt: new Date().toISOString(),
  });
}

async function handleSubscriptionMe(request, env, auth) {
  return handleSubscriptionStatus(request, env, auth);
}

async function handleSubscriptionSubscribe(request, auth) {
  const body = await readJson(request);
  const planId = normalizeHoneyPlanId(body?.planId || body?.tier);
  const idempotencyKey = normalizeIdempotencyKey(request, body);

  if (!planId || planId === "free" || !isPaidHoneyPlan(planId)) {
    return json({ ok: false, code: "SUBSCRIPTION_PLAN_NOT_FOUND", message: "지원하지 않는 구독 플랜입니다." }, { status: 400 });
  }

  if (idempotencyKey) {
    const existingTx = await HoneySubscriptionTransaction.findOne({
      userId: toObjectId(auth.userId),
      idempotencyKey,
      type: { $in: ["SUBSCRIBE", "EXTEND"] },
      status: "SUCCESS",
    }).lean();

    if (existingTx) {
      const user = await User.findById(auth.userId)
        .select("points profileSubscription has_started_paid_service first_service_access_date")
        .lean();
      const runtime = user
        ? await ensureActiveSubscriptionByAutoRenew(auth.userId, user, {
          points: 1,
          profileSubscription: 1,
          has_started_paid_service: 1,
          first_service_access_date: 1,
        })
        : null;
      const snapshot = runtime?.subscription || buildHoneyFreeSnapshot(auth.userId, new Date(), "none");
      const legacyTier = resolveHoneyLegacyTier(snapshot, new Date()) || "free";
      const activePlanId = legacyTier === "free" ? "free" : (PROFILE_SUB_PLANS[legacyTier]?.planId || "free");
      return json({
        ok: true,
        idempotent: true,
        subscription: {
          planId: activePlanId,
          tier: legacyTier,
          status: legacyTier === "free" ? normalizeHoneyStatus(snapshot?.status || "none") : "active",
          isActive: legacyTier !== "free",
          expiresAt: legacyTier === "free" ? null : toIsoOrNull(snapshot.currentPeriodEnd),
          currentPeriodEnd: legacyTier === "free" ? null : toIsoOrNull(snapshot.currentPeriodEnd),
          profileLimit: Number((legacyTier !== "free" ? getHoneyPlan(activePlanId).profileLimit : 1) || 1),
          cancelAtPeriodEnd: Boolean(legacyTier !== "free" && snapshot?.cancelAtPeriodEnd),
        },
        chargedCoins: Number(existingTx.amountCoins || 0),
        balanceAfter: Number(runtime?.user?.points || user?.points || 0),
      });
    }
  }

  const user = await User.findById(auth.userId)
    .select("points profileSubscription has_started_paid_service first_service_access_date")
    .lean();
  if (!user) return json({ ok: false, code: "USER_NOT_FOUND", message: "사용자를 찾을 수 없습니다." }, { status: 404 });

  const runtime = await ensureActiveSubscriptionByAutoRenew(auth.userId, user, {
    points: 1,
    profileSubscription: 1,
    has_started_paid_service: 1,
    first_service_access_date: 1,
  });
  const snapshot = normalizeHoneySnapshot(runtime.subscription, auth.userId, new Date());
  const plan = getHoneyPlan(planId);
  const chargedCoins = Number(plan.priceCoins || 0);

  const chargedUser = await User.findOneAndUpdate(
    {
      _id: auth.userId,
      points: { $gte: chargedCoins },
      ...(idempotencyKey ? { recentConsumeRequestIds: { $ne: idempotencyKey } } : {}),
    },
    {
      $inc: { points: -chargedCoins },
      ...(idempotencyKey
        ? {
          $push: {
            recentConsumeRequestIds: {
              $each: [idempotencyKey],
              $slice: -200,
            },
          },
        }
        : {}),
    },
    {
      new: true,
      projection: {
        points: 1,
        profileSubscription: 1,
        recentConsumeRequestIds: 1,
        has_started_paid_service: 1,
        first_service_access_date: 1,
      },
    },
  ).lean();

  if (!chargedUser) {
    if (idempotencyKey) {
      const replayUser = await User.findById(auth.userId)
        .select("points recentConsumeRequestIds")
        .lean();
      const replayIds = Array.isArray(replayUser?.recentConsumeRequestIds)
        ? replayUser.recentConsumeRequestIds.map((v) => String(v))
        : [];
      if (replayIds.includes(idempotencyKey)) {
        const replayRuntime = await ensureActiveSubscriptionByAutoRenew(
          auth.userId,
          replayUser,
          { points: 1, profileSubscription: 1 },
        );
        const replaySnapshot = replayRuntime?.subscription || snapshot;
        const replayTier = resolveHoneyLegacyTier(replaySnapshot, new Date()) || "free";
        const replayPlanId = replayTier === "free" ? "free" : (PROFILE_SUB_PLANS[replayTier]?.planId || "free");
        const replayPlan = getHoneyPlan(replayPlanId);
        return json({
          ok: true,
          idempotent: true,
          subscription: {
            planId: replayPlanId,
            tier: replayTier,
            status: replayTier === "free" ? normalizeHoneyStatus(replaySnapshot?.status || "none") : "active",
            isActive: replayTier !== "free",
            expiresAt: replayTier === "free" ? null : toIsoOrNull(replaySnapshot?.currentPeriodEnd),
            currentPeriodEnd: replayTier === "free" ? null : toIsoOrNull(replaySnapshot?.currentPeriodEnd),
            profileLimit: Number(replayPlan.profileLimit || 1),
            cancelAtPeriodEnd: Boolean(replaySnapshot?.cancelAtPeriodEnd),
          },
          chargedCoins,
          balanceAfter: Number(replayRuntime?.user?.points || replayUser?.points || 0),
        });
      }
    }
    return json({
      ok: false,
      code: "INSUFFICIENT_COINS_FOR_SUBSCRIPTION",
      requiredCoins: chargedCoins,
      currentCoins: Number(runtime?.user?.points || user?.points || 0),
      message: "코인이 부족합니다.",
    }, { status: 402 });
  }

  const now = new Date();
  const currentActiveTier = resolveHoneyLegacyTier(snapshot, now);
  const isSamePlanActive = Boolean(currentActiveTier && (PROFILE_SUB_PLANS[currentActiveTier]?.planId || "") === planId);
  const transactionType = isSamePlanActive ? "EXTEND" : "SUBSCRIBE";
  const periodBase = isSamePlanActive
    ? (toValidDate(snapshot.currentPeriodEnd) || now)
    : now;
  const nextPeriodEnd = addDaysFromDate(periodBase, Number(plan.durationDays || getDefaultHoneyDurationDays()));

  const updatedSnapshot = await HoneySubscription.findByIdAndUpdate(
    snapshot._id,
    {
      $set: {
        planId,
        status: "active",
        startedAt: isSamePlanActive ? (toValidDate(snapshot.startedAt) || now) : now,
        currentPeriodStart: isSamePlanActive ? (toValidDate(snapshot.currentPeriodStart) || now) : now,
        currentPeriodEnd: nextPeriodEnd,
        autoRenewEnabled: true,
        cancelAtPeriodEnd: false,
        priceCoins: chargedCoins,
        profileLimit: Number(plan.profileLimit || 1),
        freeServiceThresholdCoins: Number(plan.freeServiceThresholdCoins || 0),
        lastRenewedAt: transactionType === "EXTEND" ? now : null,
        lastRenewalFailedAt: null,
        renewalFailReason: "",
      },
    },
    { new: true },
  ).lean();

  await PointHistory.create({
    userId: auth.userId,
    kind: "deduct",
    delta: -chargedCoins,
    balanceAfter: Number(chargedUser.points || 0),
    reason: `${plan.name} subscription ${transactionType === "EXTEND" ? "extend" : "purchase"}`,
    featureKey: "profile-subscription",
    metadata: {
      planId,
      periodEnd: nextPeriodEnd ? nextPeriodEnd.toISOString() : null,
      idempotencyKey: idempotencyKey || null,
      transactionType,
    },
  }).catch(() => {});

  await createHoneySubscriptionTransaction({
    userId: auth.userId,
    subscriptionId: snapshot._id,
    planId,
    type: transactionType,
    amountCoins: chargedCoins,
    status: "SUCCESS",
    periodStart: updatedSnapshot?.currentPeriodStart,
    periodEnd: updatedSnapshot?.currentPeriodEnd,
    idempotencyKey,
    reason: transactionType === "EXTEND" ? "즉시 연장" : "구독 구매",
  }).catch(() => null);

  await syncHoneySubscriptionToUserMirror(auth.userId, updatedSnapshot, {
    points: 1,
    profileSubscription: 1,
    has_started_paid_service: 1,
    first_service_access_date: 1,
  });

  return json({
    ok: true,
    message: transactionType === "EXTEND"
      ? "구독 기간이 30일 연장되었습니다."
      : "구독이 시작되었습니다.",
    subscription: {
      planId,
      tier: honeyPlanIdToLegacyTier(planId),
      status: "active",
      isActive: true,
      expiresAt: toIsoOrNull(updatedSnapshot?.currentPeriodEnd),
      currentPeriodEnd: toIsoOrNull(updatedSnapshot?.currentPeriodEnd),
      profileLimit: Number(plan.profileLimit || 1),
      cancelAtPeriodEnd: false,
    },
    chargedCoins,
    balanceAfter: Number(chargedUser.points || 0),
  });
}

async function handleSubscriptionExtend(request, auth) {
  const body = await readJson(request);
  const idempotencyKey = normalizeIdempotencyKey(request, body);

  if (idempotencyKey) {
    const existingTx = await HoneySubscriptionTransaction.findOne({
      userId: toObjectId(auth.userId),
      idempotencyKey,
      type: "EXTEND",
      status: "SUCCESS",
    }).lean();
    if (existingTx) {
      const user = await User.findById(auth.userId)
        .select("points profileSubscription has_started_paid_service first_service_access_date")
        .lean();
      const runtime = user
        ? await ensureActiveSubscriptionByAutoRenew(auth.userId, user, {
          points: 1,
          profileSubscription: 1,
          has_started_paid_service: 1,
          first_service_access_date: 1,
        })
        : null;
      const snapshot = runtime?.subscription || buildHoneyFreeSnapshot(auth.userId, new Date(), "none");
      const legacyTier = resolveHoneyLegacyTier(snapshot, new Date()) || "free";
      const planId = legacyTier === "free" ? "free" : (PROFILE_SUB_PLANS[legacyTier]?.planId || "free");
      return json({
        ok: true,
        idempotent: true,
        subscription: {
          planId,
          tier: legacyTier,
          status: legacyTier === "free" ? normalizeHoneyStatus(snapshot?.status || "none") : "active",
          isActive: legacyTier !== "free",
          expiresAt: legacyTier === "free" ? null : toIsoOrNull(snapshot.currentPeriodEnd),
          currentPeriodEnd: legacyTier === "free" ? null : toIsoOrNull(snapshot.currentPeriodEnd),
          profileLimit: Number((legacyTier !== "free" ? getHoneyPlan(planId).profileLimit : 1) || 1),
          cancelAtPeriodEnd: Boolean(legacyTier !== "free" && snapshot?.cancelAtPeriodEnd),
        },
        chargedCoins: Number(existingTx.amountCoins || 0),
        balanceAfter: Number(runtime?.user?.points || user?.points || 0),
      });
    }
  }

  const user = await User.findById(auth.userId)
    .select("points profileSubscription has_started_paid_service first_service_access_date")
    .lean();
  if (!user) return json({ ok: false, code: "USER_NOT_FOUND", message: "사용자를 찾을 수 없습니다." }, { status: 404 });

  const runtime = await ensureActiveSubscriptionByAutoRenew(auth.userId, user, {
    points: 1,
    profileSubscription: 1,
    has_started_paid_service: 1,
    first_service_access_date: 1,
  });

  const snapshot = normalizeHoneySnapshot(runtime.subscription, auth.userId, new Date());
  const activeTier = resolveHoneyLegacyTier(snapshot, new Date());
  if (!activeTier) {
    return json({
      ok: false,
      code: "SUBSCRIPTION_EXPIRED",
      message: "활성 구독이 없습니다. 먼저 구독을 구매해 주세요.",
    }, { status: 409 });
  }

  const planId = PROFILE_SUB_PLANS[activeTier]?.planId || "free";
  const plan = getHoneyPlan(planId);
  const chargedCoins = Number(plan.priceCoins || 0);

  const chargedUser = await User.findOneAndUpdate(
    {
      _id: auth.userId,
      points: { $gte: chargedCoins },
      ...(idempotencyKey ? { recentConsumeRequestIds: { $ne: idempotencyKey } } : {}),
    },
    {
      $inc: { points: -chargedCoins },
      ...(idempotencyKey
        ? {
          $push: {
            recentConsumeRequestIds: {
              $each: [idempotencyKey],
              $slice: -200,
            },
          },
        }
        : {}),
    },
    {
      new: true,
      projection: {
        points: 1,
        profileSubscription: 1,
        recentConsumeRequestIds: 1,
        has_started_paid_service: 1,
        first_service_access_date: 1,
      },
    },
  ).lean();

  if (!chargedUser) {
    if (idempotencyKey) {
      const replayUser = await User.findById(auth.userId)
        .select("points recentConsumeRequestIds")
        .lean();
      const replayIds = Array.isArray(replayUser?.recentConsumeRequestIds)
        ? replayUser.recentConsumeRequestIds.map((v) => String(v))
        : [];
      if (replayIds.includes(idempotencyKey)) {
        const replayRuntime = await ensureActiveSubscriptionByAutoRenew(
          auth.userId,
          replayUser,
          { points: 1, profileSubscription: 1 },
        );
        const replaySnapshot = replayRuntime?.subscription || snapshot;
        const replayTier = resolveHoneyLegacyTier(replaySnapshot, new Date()) || "free";
        const replayPlanId = replayTier === "free" ? "free" : (PROFILE_SUB_PLANS[replayTier]?.planId || "free");
        const replayPlan = getHoneyPlan(replayPlanId);
        return json({
          ok: true,
          idempotent: true,
          subscription: {
            planId: replayPlanId,
            tier: replayTier,
            status: replayTier === "free" ? normalizeHoneyStatus(replaySnapshot?.status || "none") : "active",
            isActive: replayTier !== "free",
            expiresAt: replayTier === "free" ? null : toIsoOrNull(replaySnapshot?.currentPeriodEnd),
            currentPeriodEnd: replayTier === "free" ? null : toIsoOrNull(replaySnapshot?.currentPeriodEnd),
            profileLimit: Number(replayPlan.profileLimit || 1),
            cancelAtPeriodEnd: Boolean(replaySnapshot?.cancelAtPeriodEnd),
          },
          chargedCoins,
          balanceAfter: Number(replayRuntime?.user?.points || replayUser?.points || 0),
        });
      }
    }
    return json({
      ok: false,
      code: "INSUFFICIENT_COINS_FOR_SUBSCRIPTION",
      requiredCoins: chargedCoins,
      currentCoins: Number(runtime?.user?.points || user?.points || 0),
      message: "코인이 부족합니다.",
    }, { status: 402 });
  }

  const now = new Date();
  const baseDate = toValidDate(snapshot.currentPeriodEnd);
  const periodBase = baseDate && baseDate.getTime() > now.getTime() ? baseDate : now;
  const nextPeriodEnd = addDaysFromDate(periodBase, Number(plan.durationDays || getDefaultHoneyDurationDays()));

  const updatedSnapshot = await HoneySubscription.findByIdAndUpdate(
    snapshot._id,
    {
      $set: {
        planId,
        status: "active",
        startedAt: toValidDate(snapshot.startedAt) || now,
        currentPeriodStart: toValidDate(snapshot.currentPeriodStart) || now,
        currentPeriodEnd: nextPeriodEnd,
        autoRenewEnabled: true,
        cancelAtPeriodEnd: false,
        priceCoins: chargedCoins,
        profileLimit: Number(plan.profileLimit || 1),
        freeServiceThresholdCoins: Number(plan.freeServiceThresholdCoins || 0),
        lastRenewedAt: now,
        lastRenewalFailedAt: null,
        renewalFailReason: "",
      },
    },
    { new: true },
  ).lean();

  await PointHistory.create({
    userId: auth.userId,
    kind: "deduct",
    delta: -chargedCoins,
    balanceAfter: Number(chargedUser.points || 0),
    reason: `${plan.name} subscription extend`,
    featureKey: "profile-subscription-extend",
    metadata: {
      planId,
      periodEnd: nextPeriodEnd ? nextPeriodEnd.toISOString() : null,
      idempotencyKey: idempotencyKey || null,
      transactionType: "EXTEND",
    },
  }).catch(() => {});

  await createHoneySubscriptionTransaction({
    userId: auth.userId,
    subscriptionId: snapshot._id,
    planId,
    type: "EXTEND",
    amountCoins: chargedCoins,
    status: "SUCCESS",
    periodStart: updatedSnapshot?.currentPeriodStart,
    periodEnd: updatedSnapshot?.currentPeriodEnd,
    idempotencyKey,
    reason: "즉시 연장",
  }).catch(() => null);

  await syncHoneySubscriptionToUserMirror(auth.userId, updatedSnapshot, {
    points: 1,
    profileSubscription: 1,
    has_started_paid_service: 1,
    first_service_access_date: 1,
  });

  return json({
    ok: true,
    message: "구독 기간이 30일 연장되었습니다.",
    subscription: {
      planId,
      tier: honeyPlanIdToLegacyTier(planId),
      status: "active",
      isActive: true,
      expiresAt: toIsoOrNull(updatedSnapshot?.currentPeriodEnd),
      currentPeriodEnd: toIsoOrNull(updatedSnapshot?.currentPeriodEnd),
      profileLimit: Number(plan.profileLimit || 1),
      cancelAtPeriodEnd: false,
    },
    chargedCoins,
    balanceAfter: Number(chargedUser.points || 0),
  });
}

async function handleSubscriptionAutoRenew(request, auth) {
  const body = await readJson(request);
  const autoRenewEnabled = body?.autoRenewEnabled === true || String(body?.autoRenewEnabled || "").toLowerCase() === "true";

  const user = await User.findById(auth.userId)
    .select("points profileSubscription has_started_paid_service first_service_access_date")
    .lean();
  if (!user) return json({ ok: false, code: "USER_NOT_FOUND", message: "사용자를 찾을 수 없습니다." }, { status: 404 });

  const runtime = await ensureActiveSubscriptionByAutoRenew(auth.userId, user, {
    points: 1,
    profileSubscription: 1,
    has_started_paid_service: 1,
    first_service_access_date: 1,
  });
  const snapshot = normalizeHoneySnapshot(runtime.subscription, auth.userId, new Date());
  const activeTier = resolveHoneyLegacyTier(snapshot, new Date());

  if (!activeTier) {
    return json({
      ok: false,
      code: "SUBSCRIPTION_REQUIRED",
      message: "활성 구독에서만 자동 갱신을 설정할 수 있습니다.",
    }, { status: 409 });
  }

  const planId = PROFILE_SUB_PLANS[activeTier]?.planId || "free";
  const updatedSnapshot = await HoneySubscription.findByIdAndUpdate(
    snapshot._id,
    {
      $set: {
        autoRenewEnabled,
        cancelAtPeriodEnd: !autoRenewEnabled,
        status: "active",
      },
    },
    { new: true },
  ).lean();

  await syncHoneySubscriptionToUserMirror(auth.userId, updatedSnapshot, {
    points: 1,
    profileSubscription: 1,
    has_started_paid_service: 1,
    first_service_access_date: 1,
  });

  if (!autoRenewEnabled) {
    await createHoneySubscriptionTransaction({
      userId: auth.userId,
      subscriptionId: snapshot._id,
      planId,
      type: "CANCEL",
      amountCoins: 0,
      status: "SUCCESS",
      periodStart: updatedSnapshot?.currentPeriodStart,
      periodEnd: updatedSnapshot?.currentPeriodEnd,
      reason: "자동 갱신 해제",
    }).catch(() => null);
  }

  return json({
    ok: true,
    subscription: {
      planId,
      tier: honeyPlanIdToLegacyTier(planId),
      status: "active",
      isActive: true,
      expiresAt: toIsoOrNull(updatedSnapshot?.currentPeriodEnd),
      currentPeriodEnd: toIsoOrNull(updatedSnapshot?.currentPeriodEnd),
      profileLimit: Number(getHoneyPlan(planId).profileLimit || 1),
      autoRenewEnabled,
      cancelAtPeriodEnd: !autoRenewEnabled,
    },
    message: autoRenewEnabled
      ? "자동 갱신이 활성화되었습니다."
      : "자동 갱신이 해제되었습니다. 현재 기간 만료 후 무료 플랜으로 전환됩니다.",
  });
}

async function handleShareReward(request, auth) {
  const body = await readJson(request);
  const contentId = String(body?.contentId || "default")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40) || "default";

  const now = new Date();
  const kstMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0) - 9 * 3600 * 1000,
  );

  const todayCount = await PointHistory.countDocuments({
    userId: auth.userId,
    kind: "share_reward",
    createdAt: { $gte: kstMidnight },
  });

  if (todayCount >= SHARE_REWARD_DAILY_LIMIT) {
    return json({
      message: "Daily share reward limit reached.",
      code: "DAILY_LIMIT_EXCEEDED",
      usedToday: todayCount,
      limitPerDay: SHARE_REWARD_DAILY_LIMIT,
    }, { status: 429 });
  }

  const contentDup = await PointHistory.countDocuments({
    userId: auth.userId,
    kind: "share_reward",
    "metadata.contentId": contentId,
    createdAt: { $gte: kstMidnight },
  });

  if (contentDup > 0) {
    return json({
      message: "This content was already rewarded today.",
      code: "CONTENT_ALREADY_REWARDED",
      usedToday: todayCount,
      limitPerDay: SHARE_REWARD_DAILY_LIMIT,
    }, { status: 409 });
  }

  const updatedUser = await User.findByIdAndUpdate(
    auth.userId,
    { $inc: { points: SHARE_REWARD_AMOUNT } },
    { new: true, projection: { points: 1 } },
  ).lean();

  if (!updatedUser) return json({ message: "User not found." }, { status: 404 });

  await PointHistory.create({
    userId: auth.userId,
    kind: "share_reward",
    delta: SHARE_REWARD_AMOUNT,
    balanceAfter: Number(updatedUser.points || 0),
    reason: `Share reward for ${contentId}`,
    featureKey: "share-reward",
    metadata: {
      source: "fortune.pig-coin.share-reward",
      contentId,
    },
  });

  return json({
    message: `${SHARE_REWARD_AMOUNT} coins awarded for sharing.`,
    reward: SHARE_REWARD_AMOUNT,
    usedToday: todayCount + 1,
    limitPerDay: SHARE_REWARD_DAILY_LIMIT,
    user: userPayload(auth, updatedUser.points),
  });
}

async function handleSubscribe(request, auth) {
  return handleSubscriptionSubscribe(request, auth);
}

async function handleSubscriptionCancel(request, auth) {
  const body = await readJson(request);
  const resume = body?.resume === true || String(body?.resume || "").toLowerCase() === "true";

  const delegatedRequest = new Request(request.url, {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ autoRenewEnabled: resume }),
  });

  const response = await handleSubscriptionAutoRenew(delegatedRequest, auth);
  const payload = await response.clone().json().catch(() => null);
  if (!response.ok || !payload) return response;

  return json({
    ...payload,
    message: resume
      ? "Subscription cancellation has been reverted. Auto-renewal is active again."
      : "Subscription cancellation is scheduled. Benefits stay active until expiry.",
  });
}

function normalizeLegacyFortunePath(rawPath) {
  const path = String(rawPath || "").trim();
  if (!path) return path;

  // Legacy clients may still call /pig-coin-subscription/*.
  if (path.startsWith("/pig-coin-subscription/")) {
    return path.replace("/pig-coin-subscription/", "/pig-coin/profile-subscription/");
  }

  // Legacy variant used in older bundles.
  if (path.startsWith("/pig-coin/subscription/")) {
    return path.replace("/pig-coin/subscription/", "/pig-coin/profile-subscription/");
  }

  return path;
}

export async function handleFortuneRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = normalizeLegacyFortunePath(getRoutePath(request, "/api/fortune"));
  const trace = {
    route: "fortune",
    requestPath: new URL(request.url).pathname,
    method,
    authPresent: Boolean(request.headers.get("Authorization") || request.headers.get("Cookie")),
    authVerified: false,
    dbConnected: false,
    mongoQueryFailed: false,
    paymentProviderFailed: false,
  };

  try {
    if (method === "GET" && path === "/check") return await handleCheck();
    if (method === "GET" && path === "/pig-coin/prices") return await handlePigCoinPrices();
    if (method === "GET" && (path === "/pig-coin/profile-subscription/plans" || path === "/pig-coin/subscription/plans")) {
      return await handleSubscriptionPlans();
    }

    if (method === "GET" && (
      path === "/pig-coin/balance"
      || path === "/pig-coin/profile-subscription/status"
      || path === "/pig-coin/subscription/status"
      || path === "/pig-coin/profile-subscription/me"
      || path === "/pig-coin/subscription/me"
    )) {
      const auth = await getOptionalUserFromRequest(request, env);
      if (!auth) {
        if (path === "/pig-coin/balance") return handleGuestBalance();
        return handleGuestSubscriptionStatus();
      }

      trace.authVerified = true;
      trace.userIdExists = Boolean(String(auth?.userId || auth?.id || "").trim());
      trace.userId = String(auth?.userId || auth?.id || "").trim();
      trace.hasSession = true;
      trace.envBindingExists = hasMongoBinding(env);
      try {
        await connectDb(env);
      } catch (error) {
        logApiCatchDiagnostic({
          request,
          route: `/api/fortune${path}`,
          method,
          userId: auth?.userId || auth?.id,
          env,
          hasSession: true,
          envBindingExists: hasMongoBinding(env),
          error,
        });
        if (path !== "/pig-coin/balance") {
          return json(buildTokenFallbackSubscriptionStatus(auth));
        }
        return buildStorageFailureResponse(env, error, "DB_QUERY_FAILED");
      }
      trace.dbConnected = true;

      try {
        if (path === "/pig-coin/balance") return await handleBalance(auth);
        if (path === "/pig-coin/profile-subscription/me" || path === "/pig-coin/subscription/me") {
          return await handleSubscriptionMe(request, env, auth);
        }
        return await handleSubscriptionStatus(request, env, auth);
      } catch (error) {
        logApiCatchDiagnostic({
          request,
          route: `/api/fortune${path}`,
          method,
          userId: auth?.userId || auth?.id,
          env,
          hasSession: true,
          envBindingExists: hasMongoBinding(env),
          error,
        });
        if (path !== "/pig-coin/balance") {
          return json(buildTokenFallbackSubscriptionStatus(auth));
        }
        return buildStorageFailureResponse(env, error, "DB_QUERY_FAILED");
      }
    }

    if (method === "POST" && path === "/pig-coin/unlock") {
      const authCtx = await resolvePigCoinConsumeAuth(request, env);
      trace.authVerified = true;
      trace.userIdExists = Boolean(String(authCtx?.auth?.userId || authCtx?.auth?.id || "").trim());
      trace.userId = String(authCtx?.auth?.userId || authCtx?.auth?.id || "").trim();
      trace.hasSession = true;
      trace.envBindingExists = hasMongoBinding(env);
      await connectDb(env);
      trace.dbConnected = true;
      return await handlePigCoinUnlock(request, authCtx.auth, { adminMode: authCtx.adminMode, env });
    }

    if (method === "POST" && path === "/pig-coin/consume") {
      const authCtx = await resolvePigCoinConsumeAuth(request, env);
      trace.authVerified = true;
      trace.userIdExists = Boolean(String(authCtx?.auth?.userId || authCtx?.auth?.id || "").trim());
      trace.userId = String(authCtx?.auth?.userId || authCtx?.auth?.id || "").trim();
      trace.hasSession = true;
      trace.envBindingExists = hasMongoBinding(env);
      await connectDb(env);
      trace.dbConnected = true;
      return await handlePigCoinConsume(request, authCtx.auth, { adminMode: authCtx.adminMode, env });
    }

    if (method === "POST" && path === "/pig-coin/charge") {
      const authCtx = await resolvePigCoinConsumeAuth(request, env);
      trace.authVerified = true;
      trace.userIdExists = Boolean(String(authCtx?.auth?.userId || authCtx?.auth?.id || "").trim());
      trace.userId = String(authCtx?.auth?.userId || authCtx?.auth?.id || "").trim();
      trace.hasSession = true;
      trace.envBindingExists = hasMongoBinding(env);
      await connectDb(env);
      trace.dbConnected = true;
      return await handlePigCoinCharge(request, authCtx.auth, { adminMode: authCtx.adminMode, env });
    }

    const auth = await requireUserFromRequest(request, env);
    trace.authVerified = true;
    trace.userIdExists = Boolean(String(auth?.id || auth?.userId || "").trim());
    trace.userId = String(auth?.id || auth?.userId || "").trim();
    trace.hasSession = true;
    trace.envBindingExists = hasMongoBinding(env);

    await connectDb(env);
    trace.dbConnected = true;

    if (method === "POST" && path === "/pig-coin/refund") return await handlePigCoinRefund(request, auth);
    if (method === "POST" && path === "/consume") return await handleConsume(auth);
    if (method === "POST" && path === "/pig-coin/charge-simulate") return await handleChargeSimulate(request, env, auth);
    if (method === "POST" && (path === "/pig-coin/profile-subscription/start-service" || path === "/pig-coin/profile-subscription/consent")) return await handleStartService(request, auth);
    if (method === "POST" && path === "/pig-coin/share-reward") return await handleShareReward(request, auth);
    if (method === "POST" && path === "/pig-coin/profile-subscription/subscribe") return await handleSubscriptionSubscribe(request, auth);
    if (method === "POST" && path === "/pig-coin/profile-subscription/extend") return await handleSubscriptionExtend(request, auth);
    if (method === "POST" && path === "/pig-coin/profile-subscription/auto-renew") return await handleSubscriptionAutoRenew(request, auth);
    if (method === "POST" && path === "/pig-coin/profile-subscription/cancel") return await handleSubscriptionCancel(request, auth);

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    trace.mongoQueryFailed = /mongo|mongoose|cast to objectid|findbyid|findone|query/i.test(String(error?.message || ""));
    logApiCatchDiagnostic({
      request,
      route: `/api/fortune${path}`,
      method,
      userId: trace.userId || "",
      env,
      hasSession: trace.hasSession,
      envBindingExists: trace.envBindingExists,
      error,
    });
    return handleRouteError(error, { request, env, trace });
  }
}

export async function processHoneySubscriptionRenewals(env, options = {}) {
  const limit = Number.isFinite(Number(options?.limit)) ? Math.max(1, Number(options.limit)) : 300;
  await connectDb(env);

  const now = new Date();
  const dueSnapshots = await HoneySubscription.find({
    status: "active",
    planId: { $ne: "free" },
    currentPeriodEnd: { $ne: null, $lte: now },
  })
    .select("userId planId status startedAt currentPeriodStart currentPeriodEnd autoRenewEnabled cancelAtPeriodEnd priceCoins profileLimit freeServiceThresholdCoins lastRenewedAt lastRenewalFailedAt renewalFailReason")
    .sort({ currentPeriodEnd: 1 })
    .limit(limit)
    .lean();

  let processed = 0;
  let renewed = 0;
  let failed = 0;
  let expired = 0;

  for (let i = 0; i < dueSnapshots.length; i += 1) {
    const snapshot = dueSnapshots[i];
    const userId = String(snapshot?.userId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(userId)) continue;

    const user = await User.findById(userId)
      .select("points profileSubscription has_started_paid_service first_service_access_date")
      .lean();
    if (!user) continue;

    processed += 1;
    const runtime = await processHoneyRenewalForSnapshot({
      userId,
      user,
      snapshot: normalizeHoneySnapshot(snapshot, userId, now),
      now,
      userProjection: {
        points: 1,
        profileSubscription: 1,
        has_started_paid_service: 1,
        first_service_access_date: 1,
      },
    });

    const status = normalizeHoneyStatus(runtime?.snapshot?.status || "none");
    if (runtime?.autoRenewed) {
      renewed += 1;
    } else if (status === "renewal_failed") {
      failed += 1;
    } else if (status === "expired" || status === "none") {
      expired += 1;
    }
  }

  return {
    ok: true,
    processed,
    renewed,
    failed,
    expired,
    examined: dueSnapshots.length,
    runAt: now.toISOString(),
  };
}

export const __fortuneAccessTestUtils = {
  resolveServerCoinPricing,
  isAdminPigCoinBypassEnabled,
  getForcePaidTestAccountEmails,
  resolvePigCoinConsumeAuth,
};
