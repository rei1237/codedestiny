export const HONEY_PASS_POLICY = Object.freeze({
  none: {
    label: "이용권 없음",
    maxCoveredCoin: 0,
    maxProfiles: 1,
  },
  standard: {
    label: "스탠다드 달빛 이용권",
    maxCoveredCoin: 30,
    maxProfiles: 3,
  },
  premium: {
    label: "프리미엄 달빛 이용권",
    maxCoveredCoin: 50,
    maxProfiles: 7,
  },
  vvip: {
    label: "VVIP 달빛 이용권",
    maxCoveredCoin: 100,
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
  if (text === "vvip" || text.includes("vvip") || text.includes("꿀단지")) return "vvip";
  if (text === "premium" || text.includes("premium") || text.includes("프리미엄")) return "premium";
  if (text === "standard" || text.includes("standard") || text.includes("스탠다드")) return "standard";
  return "";
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
    || status === "success";
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
    const explicitInactive = isInactiveStatus(status) || source.isActive === false || source.isSubscribed === false;
    const explicitActive = source.isActive === true || source.isSubscribed === true || isActiveStatus(status);
    const dateActive = expiresAt ? expiresAt.getTime() > Date.now() : false;
    const isActive = !explicitInactive && (expiresAt ? dateActive : explicitActive);
    if (!isActive) continue;

    const candidate = {
      tier,
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
    label: HONEY_PASS_POLICY.none.label,
    isActive: false,
    maxCoveredCoin: 0,
    maxProfiles: 1,
    source: "none",
    expiresAt: null,
  };
}

export function canBypassCoinGate(entitlement, serviceCoinPrice) {
  const price = Number(serviceCoinPrice || 0);
  return Boolean(
    entitlement?.isActive === true
      && Number.isFinite(price)
      && price > 0
      && price <= Number(entitlement.maxCoveredCoin || 0),
  );
}
