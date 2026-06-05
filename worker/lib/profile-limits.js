export const PASS_TIERS = Object.freeze({
  STANDARD: "standard",
  PREMIUM: "premium",
  VVIP: "vvip",
});

export const PASS_LIMITS = Object.freeze({
  [PASS_TIERS.STANDARD]: 30,
  [PASS_TIERS.PREMIUM]: 50,
  [PASS_TIERS.VVIP]: 100,
});

export const PASS_TIER_UI = Object.freeze({
  [PASS_TIERS.STANDARD]: { tone: "standard", color: "warm_copper" },
  [PASS_TIERS.PREMIUM]: { tone: "premium", color: "cold_moonlight_silver" },
  [PASS_TIERS.VVIP]: { tone: "vvip", color: "golden_moonlight" },
});

const LEGACY_TIER_TO_PASS_TIER = Object.freeze({
  standard: PASS_TIERS.STANDARD,
  premium: PASS_TIERS.PREMIUM,
  vvip: PASS_TIERS.VVIP,
});

const PASS_TIER_TO_LEGACY_TIER = Object.freeze({
  standard: "standard",
  premium: "premium",
  vvip: "vvip",
  bronze: "standard",
  silver: "premium",
  gold: "vvip",
});

export const HONEY_PASS_POLICY = Object.freeze({
  none: {
    label: "이용권 없음",
    maxCoveredCoin: 0,
    maxProfiles: 1,
  },
  standard: {
    passTier: PASS_TIERS.STANDARD,
    label: "스탠다드",
    maxCoveredCoin: PASS_LIMITS.standard,
    maxProfiles: 3,
  },
  premium: {
    passTier: PASS_TIERS.PREMIUM,
    label: "프리미엄",
    maxCoveredCoin: PASS_LIMITS.premium,
    maxProfiles: 7,
  },
  vvip: {
    passTier: PASS_TIERS.VVIP,
    label: "VVIP",
    maxCoveredCoin: PASS_LIMITS.vvip,
    maxProfiles: 15,
  },
});

export const PROFILE_LIMIT_BY_TIER = Object.freeze({
  standard: HONEY_PASS_POLICY.standard.maxProfiles,
  premium: HONEY_PASS_POLICY.premium.maxProfiles,
  vvip: HONEY_PASS_POLICY.vvip.maxProfiles,
});

export const HONEY_PASS_FREE_LIMIT_BY_TIER = Object.freeze({
  standard: HONEY_PASS_POLICY.standard.maxCoveredCoin,
  premium: HONEY_PASS_POLICY.premium.maxCoveredCoin,
  vvip: HONEY_PASS_POLICY.vvip.maxCoveredCoin,
});

function toText(value) {
  return String(value || "").trim();
}

function tierFromValue(value) {
  const text = toText(value).toLowerCase();
  if (!text || text === "free" || text === "none") return "";
  if (PASS_TIER_TO_LEGACY_TIER[text]) return PASS_TIER_TO_LEGACY_TIER[text];
  if (text === "vvip" || text.includes("vvip") || text.includes("꿀단지")) return "vvip";
  if (text.includes("\uBE0C\uC774\uBE0C\uC774\uC544\uC774\uD53C") || text.includes("\uACE8\uB4DC")) return "vvip";
  if (text === "premium" || text.includes("premium") || text.includes("프리미엄")) return "premium";
  if (text.includes("\uD504\uB9AC\uBBF8\uC5C4") || text.includes("\uC2E4\uBC84")) return "premium";
  if (text === "standard" || text.includes("standard") || text.includes("스탠다드")) return "standard";
  if (text.includes("\uC2A4\uD0E0\uB2E4\uB4DC") || text.includes("\uBE0C\uB860\uC988")) return "standard";
  return "";
}

export function normalizePassTier(value) {
  const text = toText(value).toLowerCase();
  if (PASS_LIMITS[text]) return text;
  const legacyTier = tierFromValue(value);
  return LEGACY_TIER_TO_PASS_TIER[legacyTier] || null;
}

function normalizeStatus(value) {
  return toText(value).toLowerCase();
}

function isInactiveStatus(value) {
  const status = normalizeStatus(value);
  return status === "expired"
    || status === "canceled"
    || status === "cancelled"
    || status === "inactive"
    || status === "failed"
    || status === "paused"
    || status === "refunded";
}

function isActiveStatus(value) {
  const status = normalizeStatus(value);
  return status === "active"
    || status === "paid"
    || status === "current"
    || status === "subscribed"
    || status === "trialing"
    || status === "success"
    || status === "registered"
    || status === "registering"
    || status === "pending"
    || status === "processing"
    || status === "enrolled"
    || status === "enabled"
    || status === "valid"
    || status === "ok"
    || status === "complete"
    || status === "completed"
    || status === "confirmed"
    || status === "approved"
    || status === "\uB4F1\uB85D\uC911"
    || status === "\uC774\uC6A9\uC911"
    || status === "\uC720\uD6A8"
    || status === "\uC644\uB8CC";
}

function readDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function resolveTier(source = {}) {
  return tierFromValue(source.tier)
    || tierFromValue(source.plan)
    || tierFromValue(source.planId)
    || tierFromValue(source.productId)
    || tierFromValue(source.subscriptionTier)
    || tierFromValue(source.membershipTier)
    || tierFromValue(source.passTier)
    || tierFromValue(source.label)
    || "";
}

function resolveSourceName(source = {}, fallback = "none") {
  const rawSource = toText(source.source).toLowerCase();
  if (rawSource === "card" || rawSource === "subscription" || rawSource === "legacy_subscription") return "legacy_subscription";
  if (rawSource === "membership") return "membership";
  if (rawSource === "pass" || rawSource === "current_pass" || rawSource === "coin") return "current_pass";
  return fallback;
}

export function normalizeHoneyPassEntitlement(userOrSubscription = {}) {
  const user = userOrSubscription || {};
  const sources = [];

  if (user.profileSubscription && typeof user.profileSubscription === "object") {
    sources.push({ value: user.profileSubscription, source: resolveSourceName(user.profileSubscription, "current_pass") });
  }
  if (user.subscription && typeof user.subscription === "object") {
    sources.push({ value: user.subscription, source: "legacy_subscription" });
  }
  if (user.membership && typeof user.membership === "object") {
    sources.push({ value: user.membership, source: "membership" });
  }
  if (user.pass && typeof user.pass === "object") {
    sources.push({ value: user.pass, source: "current_pass" });
  }
  if (user.entitlement && typeof user.entitlement === "object") {
    sources.push({ value: user.entitlement, source: "current_pass" });
  }

  sources.push({ value: user, source: "legacy_subscription" });

  let best = null;
  for (const entry of sources) {
    const source = entry.value || {};
    const tier = resolveTier(source);
    if (!tier || !HONEY_PASS_POLICY[tier]) continue;

    const expiresAt = readDate(source.expiresAt || source.currentPeriodEnd || source.endsAt || source.endAt || source.validUntil);
    const status = source.status || source.subscriptionStatus || source.membershipStatus || source.lastBillingStatus;
    const activeByStatus = isActiveStatus(status);
    const explicitInactive = isInactiveStatus(status)
      || (source.isActive === false && !activeByStatus)
      || (source.isSubscribed === false && !activeByStatus);
    const explicitActive = source.isActive === true
      || source.isSubscribed === true
      || source.active === true
      || source.enabled === true
      || source.valid === true
      || source.isValid === true
      || source.registered === true
      || activeByStatus;
    const dateActive = expiresAt ? expiresAt.getTime() > Date.now() : false;
    const isActive = !explicitInactive && (expiresAt ? dateActive : explicitActive);
    if (!isActive) continue;

    const candidate = {
      tier,
      passTier: HONEY_PASS_POLICY[tier].passTier,
      passLabel: HONEY_PASS_POLICY[tier].label,
      passColorTone: PASS_TIER_UI[HONEY_PASS_POLICY[tier].passTier] || null,
      label: HONEY_PASS_POLICY[tier].label,
      isActive: true,
      maxCoveredCoin: HONEY_PASS_POLICY[tier].maxCoveredCoin,
      maxProfiles: HONEY_PASS_POLICY[tier].maxProfiles,
      source: entry.source,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    };

    if (!best || candidate.maxCoveredCoin > best.maxCoveredCoin) best = candidate;
  }

  return best || {
    tier: "none",
    passTier: null,
    passLabel: HONEY_PASS_POLICY.none.label,
    passColorTone: null,
    label: HONEY_PASS_POLICY.none.label,
    isActive: false,
    maxCoveredCoin: 0,
    maxProfiles: 1,
    source: "none",
    expiresAt: null,
  };
}

export function canBypassCoinGate(entitlement, serviceCoinPrice) {
  return canUseByPass(entitlement, serviceCoinPrice);
}

export function canUseByPass(activePass, coinCost) {
  const price = Number(coinCost || 0);
  const expiresAt = activePass?.expiresAt ? new Date(activePass.expiresAt) : null;
  if (!activePass || activePass.isActive !== true) return false;
  if (expiresAt && Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) return false;
  const passTier = normalizePassTier(activePass.passTier || activePass.tier);
  const limit = PASS_LIMITS[passTier] || Number(activePass.maxCoveredCoin || 0);
  return Boolean(
    Number.isFinite(price)
      && price > 0
      && price <= Number(limit || 0),
  );
}
