export const PASS_TIERS = Object.freeze({
  STANDARD: "standard",
  PREMIUM: "premium",
  VVIP: "vvip",
  FAMILY: "family",
});

export const FAMILY_PASS_MAX_COVERED_COIN = 999999999;
export const KRW_PER_COIN = 100;

// ── Family 공정이용: 프리미엄 상담 포함 횟수 ──────────────────────────────
// Family 는 10,000원 이하 기능을 무제한 커버하고, 그 위(300코인=30,000원 이상)의
// 프리미엄 상담은 이용권 기간당 정해진 횟수만 포함한다. 초과분은 차단이 아니라
// 단건/월정석 결제로 넘긴다 — 막다른 길을 만들지 않는 것이 이 설계의 핵심이다.
//
// 카운터는 profileSubscription 안에 둔다. 이용권 판정이 이미 그 문서를 읽고,
// 소비 시 이미 findOneAndUpdate 를 돌리므로 왕복도 쓰기도 늘지 않는다.
export const FAMILY_PREMIUM_MIN_COIN_COST = 300;
export const FAMILY_PREMIUM_INCLUDED_USES = 10;

/**
 * 사이클 키 = 이용권 만료일. 이용권을 새로 사면 만료일이 바뀌어 키가 달라지고,
 * 카운터가 자동으로 0부터 다시 센다. 별도의 리셋 크론이 필요 없다.
 */
export function resolveFamilyPremiumCycleKey(entitlement) {
  const raw = entitlement?.expiresAt;
  if (!raw) return "";
  const expiresAt = new Date(raw);
  return Number.isFinite(expiresAt.getTime()) ? expiresAt.toISOString() : "";
}

/**
 * 이 요청이 Family 프리미엄 포함 횟수의 적용 대상인지, 남은 횟수가 얼마인지.
 *
 * 판정 단계(buildPassPaymentDecision)와 소비 단계(consumeTierPassIfAvailable)가
 * 같은 답을 내야 한다 — 판정이 "커버"라 해놓고 소비가 거부하면 결제수단이 전부
 * 숨겨진 막다른 길이 된다(billing.js 의 과거 사고 주석 참고). 그래서 두 곳이
 * 이 함수 하나를 공유한다.
 *
 * cycleKey 를 못 구하면(만료일 없음) 적용하지 않는다 — 셀 수 없는 상태에서
 * 막으면 정상 이용자를 가로막게 되므로 열어두는 쪽이 맞다.
 */
export function resolveFamilyPremiumQuota(profileSubscription, entitlement, coinCost) {
  const price = Number(coinCost || 0);
  const tier = normalizePassTier(entitlement?.passTier || entitlement?.tier);
  const cycleKey = resolveFamilyPremiumCycleKey(entitlement);
  const included = FAMILY_PREMIUM_INCLUDED_USES;
  const applies = tier === PASS_TIERS.FAMILY
    && Number.isFinite(price)
    && price >= FAMILY_PREMIUM_MIN_COIN_COST
    && Boolean(cycleKey);
  if (!applies) {
    return { applies: false, cycleKey, included, used: 0, remaining: included, exhausted: false };
  }
  const storedKey = String(profileSubscription?.premiumUseCycleKey || "");
  const used = storedKey === cycleKey
    ? Math.max(0, Math.floor(Number(profileSubscription?.premiumUseCount || 0)))
    : 0;
  const remaining = Math.max(0, included - used);
  return { applies: true, cycleKey, included, used, remaining, exhausted: remaining <= 0 };
}

export const PASS_LIMITS = Object.freeze({
  [PASS_TIERS.STANDARD]: 30,
  [PASS_TIERS.PREMIUM]: 50,
  [PASS_TIERS.VVIP]: 100,
  [PASS_TIERS.FAMILY]: FAMILY_PASS_MAX_COVERED_COIN,
});

export const PASS_LIMITS_KRW = Object.freeze({
  [PASS_TIERS.STANDARD]: PASS_LIMITS[PASS_TIERS.STANDARD] * KRW_PER_COIN,
  [PASS_TIERS.PREMIUM]: PASS_LIMITS[PASS_TIERS.PREMIUM] * KRW_PER_COIN,
  [PASS_TIERS.VVIP]: PASS_LIMITS[PASS_TIERS.VVIP] * KRW_PER_COIN,
  [PASS_TIERS.FAMILY]: PASS_LIMITS[PASS_TIERS.FAMILY] * KRW_PER_COIN,
});

export const PASS_TIER_UI = Object.freeze({
  [PASS_TIERS.STANDARD]: { tone: "standard", color: "warm_copper" },
  [PASS_TIERS.PREMIUM]: { tone: "premium", color: "cold_moonlight_silver" },
  [PASS_TIERS.VVIP]: { tone: "vvip", color: "golden_moonlight" },
  [PASS_TIERS.FAMILY]: { tone: "family", color: "code_destiny_family" },
});

const LEGACY_TIER_TO_PASS_TIER = Object.freeze({
  standard: PASS_TIERS.STANDARD,
  premium: PASS_TIERS.PREMIUM,
  vvip: PASS_TIERS.VVIP,
  family: PASS_TIERS.FAMILY,
});

/* 정책이 실제로 발급하는 등급 이름. bronze/silver/gold 는 여기 있었지만 발급하는 코드가
   남아 있지 않아 뺐다 — 자유 문자열(planId·productId·label)이 이 표를 타고 등급으로
   승격되므로, 안 쓰는 이름을 남겨 두는 건 비용이 아니라 오분류 위험이다. */
const PASS_TIER_TO_LEGACY_TIER = Object.freeze({
  standard: "standard",
  premium: "premium",
  vvip: "vvip",
  family: "family",
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
  family: {
    passTier: PASS_TIERS.FAMILY,
    label: "Code Destiny Family",
    maxCoveredCoin: PASS_LIMITS.family,
    maxProfiles: 0,
  },
});

export const PROFILE_LIMIT_BY_TIER = Object.freeze({
  standard: HONEY_PASS_POLICY.standard.maxProfiles,
  premium: HONEY_PASS_POLICY.premium.maxProfiles,
  vvip: HONEY_PASS_POLICY.vvip.maxProfiles,
  family: HONEY_PASS_POLICY.family.maxProfiles,
});

export const HONEY_PASS_FREE_LIMIT_BY_TIER = Object.freeze({
  standard: HONEY_PASS_POLICY.standard.maxCoveredCoin,
  premium: HONEY_PASS_POLICY.premium.maxCoveredCoin,
  vvip: HONEY_PASS_POLICY.vvip.maxCoveredCoin,
  family: HONEY_PASS_POLICY.family.maxCoveredCoin,
});

function toText(value) {
  return String(value || "").trim();
}

function firstFiniteNonNegativeNumber(values = []) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return Math.floor(number);
  }
  return null;
}

function tierFromValue(value) {
  const text = toText(value).toLowerCase();
  const compact = text.replace(/[\s_-]+/g, "");
  if (!text || text === "free" || text === "none") return "";
  if (PASS_TIER_TO_LEGACY_TIER[text]) return PASS_TIER_TO_LEGACY_TIER[text];
  if (compact === "codedestinyfamily" || compact === "honeyfamily" || /^family\d+m$/.test(compact)) return "family";
  if (compact === "familypass" || compact === "familyplan") return "family";
  if (text.includes("code destiny family") || text.includes("code-destiny-family")) return "family";
  if (compact === "honeyvvip" || /^vvip\d+m$/.test(compact)) return "vvip";
  if (text === "vvip" || text.includes("vvip")) return "vvip";
  if (compact === "honeypremium" || /^premium\d+m$/.test(compact)) return "premium";
  if (text === "premium" || text.includes("premium") || text.includes("프리미엄")) return "premium";
  if (compact === "honeystandard" || /^standard\d+m$/.test(compact)) return "standard";
  if (text === "standard" || compact === "basic" || text.includes("standard") || text.includes("스탠다드")) return "standard";
  /* 폐기 별칭(vipplus·꿀단지·브이브이아이피·골드·실버·브론즈)은 뺐다 — 발급하는 코드가 없는데,
     이 함수는 planId·productId·label 같은 자유 문자열을 등급으로 승격시키는 유일한 지점이라
     안 쓰는 이름이 남아 있으면 무관한 상품명이 등급을 훔칠 수 있다.
     한글은 HONEY_PASS_POLICY 가 지금도 내보내는 표시 라벨만 남긴다(스탠다드·프리미엄·VVIP·
     Code Destiny Family) — resolveTier 가 source.label 을 마지막 폴백으로 보므로 네 등급이
     같은 방식으로 해석되어야 한다. 고정 가드: __tests__/worker/profile-limits.tier-aliases.test.js */
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

export function isInactiveStatus(value) {
  const status = normalizeStatus(value);
  return status === "expired"
    || status === "canceled"
    || status === "cancelled"
    || status === "inactive"
    || status === "failed"
    || status === "paused"
    || status === "refunded";
}

export function isActiveStatus(value) {
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
  const pushSource = (value, source) => {
    if (value && typeof value === "object") {
      sources.push({ value, source: resolveSourceName(value, source) });
    }
  };

  pushSource(user.profileSubscription, "current_pass");
  pushSource(user.subscription, "legacy_subscription");
  pushSource(user.subscription?.subscription, "legacy_subscription");
  pushSource(user.membership, "membership");
  pushSource(user.membership?.subscription, "membership");
  pushSource(user.membershipPass, "current_pass");
  pushSource(user.pass, "current_pass");
  pushSource(user.entitlement, "current_pass");
  pushSource(user.licensePass, "current_pass");
  pushSource(user.accessGateResult, "current_pass");

  sources.push({ value: user, source: "legacy_subscription" });

  let best = null;
  for (const entry of sources) {
    const source = entry.value || {};
    const tier = resolveTier(source);
    if (!tier || !HONEY_PASS_POLICY[tier]) continue;

    const startedAt = readDate(source.startedAt || source.firstSubAt || source.currentPeriodStart || source.startsAt || source.startAt || source.validFrom);
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

    const policy = HONEY_PASS_POLICY[tier];

    const candidate = {
      tier,
      passTier: policy.passTier,
      passLabel: policy.label,
      passColorTone: PASS_TIER_UI[policy.passTier] || null,
      label: policy.label,
      isActive: true,
      maxCoveredCoin: policy.maxCoveredCoin,
      maxProfiles: policy.maxProfiles,
      profileLimit: policy.maxProfiles,
      source: entry.source,
      startedAt: startedAt ? startedAt.toISOString() : null,
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
    profileLimit: 1,
    source: "none",
    startedAt: null,
    expiresAt: null,
  };
}

export function resolveActivePassPolicy(userOrSubscription = {}) {
  return normalizeHoneyPassEntitlement(userOrSubscription);
}

export function resolveProfileLimitForClient(subscription, options = {}) {
  const tier = String(subscription?.tier || "").trim().toLowerCase();
  if (subscription?.isActive && tier === "family") return 0;
  const rawLimit = Number(subscription?.profileLimit);
  const allowZeroLimit = options?.allowZeroLimit === true;
  if (Number.isFinite(rawLimit) && (rawLimit > 0 || (allowZeroLimit && rawLimit >= 0))) {
    return Math.floor(rawLimit);
  }
  return 1;
}

export const PROFILE_POLICY_SNAPSHOT_TTL_MS = 10 * 60 * 1000;

export function buildProfilePolicySnapshot(userOrSubscription = {}, options = {}) {
  const fetchedAt = Number.isFinite(Number(options.fetchedAt))
    ? Math.floor(Number(options.fetchedAt))
    : Date.now();
  const ttlMs = Number.isFinite(Number(options.ttlMs)) && Number(options.ttlMs) > 0
    ? Math.floor(Number(options.ttlMs))
    : PROFILE_POLICY_SNAPSHOT_TTL_MS;
  const entitlement = normalizeHoneyPassEntitlement(userOrSubscription || {});
  const tier = entitlement?.isActive && entitlement?.tier && entitlement.tier !== "none"
    ? String(entitlement.tier || "free").toLowerCase()
    : "free";
  const isActive = tier !== "free";
  const maxProfileCount = isActive
    ? resolveProfileLimitForClient({
      tier,
      isActive: true,
      profileLimit: entitlement.maxProfiles,
    }, { allowZeroLimit: true })
    : 1;

  return {
    tier,
    isActive,
    profileLimit: maxProfileCount,
    maxProfileCount,
    unlimited: maxProfileCount === 0,
    expiresAt: isActive ? (entitlement.expiresAt || null) : null,
    fetchedAt,
    ttlMs,
    source: String(options.source || entitlement?.source || "server"),
  };
}

function sanitizeProfileId(value, maxLen = 80) {
  return String(value || "").trim().slice(0, maxLen).replace(/\s+/g, "_");
}

export function resolveCurrentProfileId(rawCurrentId, profiles, options = {}) {
  const currentId = sanitizeProfileId(rawCurrentId, options.maxProfileIdLength || 80);
  if (!currentId) return "";

  for (let i = 0; i < profiles.length; i += 1) {
    if (String(profiles[i]?.id || "") === currentId) return currentId;
  }

  return "";
}

export function resolveSingleProfileAccess(user, profiles, subscription, options = {}) {
  const profileLimit = resolveProfileLimitForClient(subscription, options);
  const isSingleMode = false;
  const savedCurrentId = resolveCurrentProfileId(user?.destinyProfilesCurrentId, profiles, options) || profiles[0]?.id || "";

  if (!isSingleMode) {
    return {
      profiles,
      currentId: savedCurrentId,
      profileAccess: {
        mode: "subscription",
        selectionRequired: false,
        locked: false,
        lockedProfileId: "",
        profileLimit,
      },
    };
  }

  if (profiles.length <= 1) {
    const onlyId = profiles[0]?.id || "";
    return {
      profiles,
      currentId: onlyId,
      profileAccess: {
        mode: "single",
        selectionRequired: false,
        locked: Boolean(onlyId),
        lockedProfileId: onlyId,
        profileLimit: 1,
      },
    };
  }

  const lockedId = resolveCurrentProfileId(user?.destinyProfilesLockedCurrentId, profiles, options);
  if (lockedId) {
    return {
      profiles: profiles.filter((profile) => String(profile?.id || "") === lockedId),
      currentId: lockedId,
      profileAccess: {
        mode: "single",
        selectionRequired: false,
        locked: true,
        lockedProfileId: lockedId,
        profileLimit: 1,
      },
    };
  }

  return {
    profiles,
    currentId: savedCurrentId,
    profileAccess: {
      mode: "single",
      selectionRequired: true,
      locked: false,
      lockedProfileId: "",
      profileLimit: 1,
    },
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
  if (passTier === PASS_TIERS.FAMILY) return Number.isFinite(price) && price >= 0;
  const limit = PASS_LIMITS[passTier] || Number(activePass.maxCoveredCoin || 0);
  return Boolean(
    Number.isFinite(price)
      && price > 0
      && price <= Number(limit || 0),
  );
}
