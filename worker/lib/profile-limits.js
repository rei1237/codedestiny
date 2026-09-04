export const PASS_TIERS = Object.freeze({
  STANDARD: "standard",
  PREMIUM: "premium",
  VVIP: "vvip",
  FAMILY: "family",
});

export const FAMILY_PASS_MAX_COVERED_COIN = 999999999;
export const KRW_PER_COIN = 100;

// ── 공정이용: 월 이용 한도 ────────────────────────────────────────────────
// 2026-08-24 정책은 규칙이 둘뿐이다: ①건당 적용 가격 범위(PASS_LIMITS) ②월 이용
// 한도(MONTHLY_PASS_LIMITS). 30일 사이클 동안 이용권으로 커버된 거래의 코인가
// 합계가 등급별 한도를 넘으면 그 사이클 안에서는 커버가 끊긴다. 초과분은 차단이
// 아니라 단건/월정석 결제로 넘긴다 — 막다른 길을 만들지 않는 것이 이 설계의 핵심이다.
// 그 위에 있던 세 번째 규칙('프리미엄 상담 포함 횟수')은 폐지됐다 — 아래 참고.
//
// 카운터는 profileSubscription 안에 둔다. 이용권 판정이 이미 그 문서를 읽고,
// 소비 시 이미 findOneAndUpdate 를 돌리므로 왕복도 쓰기도 늘지 않는다.

/* 포함횟수 판정의 기준가. 표(아래)가 비어 있어 지금은 어떤 등급도 이 값에 걸리지 않지만,
   상수 자체는 레거시 호출부와 js/core/pass-verdict.js 가 공유하므로 남긴다. */
export const PREMIUM_QUOTA_MIN_COIN_COST = 300;

/* 🔴 2026-08-24 폐지 — 비어 있는 것이 정책이다(지우지 말 것).
 * 새 정책은 "건당 적용 가격 범위 + 월 이용 한도" 2규칙뿐이고 '상담 포함 횟수'라는 재화가 없다.
 * 이 표가 비면 resolvePremiumQuota 는 항상 applies=false 를 돌려주므로
 *   ① VVIP 의 건당-상한 우회가 사라진다(= 20,000원 초과는 VVIP 미커버, 문구와 정확히 일치)
 *   ② family 의 '기간당 10회' 상한도 사라진다(family 는 건당 상한이 없고 월 한도만 적용)
 * 두 효과 모두 의도한 것이다. 등급을 다시 넣으면 가격 페이지 문구와 서버 판정이 어긋난다.
 * 함수 자체는 남긴다 — 레거시 billing.js·entitlement-policy.js·nakshatra-paid-access.js 가
 * 아직 호출하며, 빈 표를 받으면 전부 "혜택 없음"으로 조용히 올바르게 동작한다.
 * 가드: scripts/verify-billing-pass-policy.mjs(포함횟수 폐지 역단언) · verify-pass-tier-policy.mjs
 */
export const PREMIUM_QUOTA_INCLUDED_USES_BY_TIER = Object.freeze({});

/**
 * 사이클 키 = 이용권 만료일. 이용권을 새로 사면 만료일이 바뀌어 키가 달라지고,
 * 카운터가 자동으로 0부터 다시 센다. 별도의 리셋 크론이 필요 없다.
 * 상담 포함횟수(premiumUseCount)와 월 누적 한도(monthlySpendCoin) 두 카운터가
 * 이 사이클 키(premiumUseCycleKey)를 공유한다 — 리셋 트리거가 동일하기 때문이다.
 */
export function resolvePremiumQuotaCycleKey(entitlement) {
  const raw = entitlement?.expiresAt;
  if (!raw) return "";
  const expiresAt = new Date(raw);
  return Number.isFinite(expiresAt.getTime()) ? expiresAt.toISOString() : "";
}

/**
 * 이 요청이 프리미엄 상담 포함 횟수의 적용 대상인지, 남은 횟수가 얼마인지.
 * 등급별 포함 횟수는 PREMIUM_QUOTA_INCLUDED_USES_BY_TIER 를 따른다(Family 10회,
 * VVIP 3회 — 나머지 등급은 이 혜택 자체가 없음).
 *
 * 판정 단계(buildPassPaymentDecision)와 소비 단계(consumeTierPassIfAvailable)가
 * 같은 답을 내야 한다 — 판정이 "커버"라 해놓고 소비가 거부하면 결제수단이 전부
 * 숨겨진 막다른 길이 된다(billing.js 의 과거 사고 주석 참고). 그래서 두 곳이
 * 이 함수 하나를 공유한다.
 *
 * `eligible`(등급·가격만으로 판정, cycleKey 불필요)과 `applies`(eligible 이면서
 * cycleKey 까지 구해져 실제로 횟수를 셀 수 있는 상태)를 분리한다. 호출부가 canUseByPass
 * (건당 상한)와 OR 로 묶어 "포함횟수 대상이면 상한을 우회"할 때는 반드시 `eligible`을 써야
 * 한다 — `applies`를 쓰면 cycleKey 를 못 구했을 때(만료일 없음) 상한 우회 자체가 막혀버려서
 * "셀 수 없으면 막지 않는다"는 정책이 VVIP 처럼 상한이 있는 등급에서 정반대로 뒤집힌다
 * (family 는 상한이 없어 이 차이가 드러나지 않았다). 소진 여부 판정(`applies && exhausted`)은
 * 그대로 `applies`를 쓴다 — cycleKey 를 못 구한 상태에서 소진을 확정할 수는 없기 때문이다.
 */
export function resolvePremiumQuota(profileSubscription, entitlement, coinCost) {
  const price = Number(coinCost || 0);
  const tier = normalizePassTier(entitlement?.passTier || entitlement?.tier);
  const cycleKey = resolvePremiumQuotaCycleKey(entitlement);
  const included = PREMIUM_QUOTA_INCLUDED_USES_BY_TIER[tier] || 0;
  const eligible = included > 0 && Number.isFinite(price) && price >= PREMIUM_QUOTA_MIN_COIN_COST;
  const applies = eligible && Boolean(cycleKey);
  if (!applies) {
    return { applies: false, eligible, cycleKey, included, used: 0, remaining: included, exhausted: false };
  }
  const storedKey = String(profileSubscription?.premiumUseCycleKey || "");
  const used = storedKey === cycleKey
    ? Math.max(0, Math.floor(Number(profileSubscription?.premiumUseCount || 0)))
    : 0;
  const remaining = Math.max(0, included - used);
  return { applies: true, eligible, cycleKey, included, used, remaining, exhausted: remaining <= 0 };
}

// ── 건당 적용 가격 범위 (코인, 1코인=100원) ────────────────────────
// 2026-08-24 개정: 50 / 100 / 200 = 5,000원 / 10,000원 / 20,000원 (이전 30/50/100).
// 이 값이 정본이고 PASS_LIMITS_KRW·HONEY_PASS_POLICY.maxCoveredCoin 은 전부 파생이다.
// 같은 숫자의 하드코딩 사본이 3곳 더 있다 — 바꿀 때 함께 바꿔야 한다:
//   worker/lib/app-store-pricing.js  PASS_TIER_TABLE[].coinLimit  (verify:app-store-pricing 이 대조)
//   js/core/pass-verdict.js          PASS_LIMIT_BY_TIER           (클라 스냅샷 판정)
//   index.html                       goldenPackages[].freeLimit   (정적 셸 + public 미러)
// 전수 대조 가드: scripts/verify-pass-tier-policy.mjs
//
// family 는 건당 상한이 없다(사용자 확정 2026-08-24). 금액과 무관하게 커버하되
// 월 이용 한도(MONTHLY_PASS_LIMITS.family = 500,000원)는 동일하게 적용된다.
export const PASS_LIMITS = Object.freeze({
  [PASS_TIERS.STANDARD]: 50,   // 5,000원
  [PASS_TIERS.PREMIUM]: 100,   // 10,000원
  [PASS_TIERS.VVIP]: 200,      // 20,000원
  [PASS_TIERS.FAMILY]: FAMILY_PASS_MAX_COVERED_COIN,
});

export const PASS_LIMITS_KRW = Object.freeze({
  [PASS_TIERS.STANDARD]: PASS_LIMITS[PASS_TIERS.STANDARD] * KRW_PER_COIN,
  [PASS_TIERS.PREMIUM]: PASS_LIMITS[PASS_TIERS.PREMIUM] * KRW_PER_COIN,
  [PASS_TIERS.VVIP]: PASS_LIMITS[PASS_TIERS.VVIP] * KRW_PER_COIN,
  [PASS_TIERS.FAMILY]: PASS_LIMITS[PASS_TIERS.FAMILY] * KRW_PER_COIN,
});

// ── 월 누적 한도(신규) ────────────────────────────────────────────────────
// 건당 상한(PASS_LIMITS)과는 별개의 AND 게이트. 30일 사이클 동안 이용권으로
// 커버된 거래의 코인가 합계가 이 값을 넘으면, 건당 상한을 통과하는 건이라도
// 그 사이클 안에서는 이용권으로 커버되지 않는다. coin 단위(1코인=100원).
export const MONTHLY_PASS_LIMITS = Object.freeze({
  [PASS_TIERS.STANDARD]: 300,   // 30,000원
  [PASS_TIERS.PREMIUM]: 1000,   // 100,000원
  [PASS_TIERS.VVIP]: 2000,      // 200,000원
  [PASS_TIERS.FAMILY]: 5000,    // 500,000원
});

export const MONTHLY_PASS_LIMITS_KRW = Object.freeze({
  [PASS_TIERS.STANDARD]: MONTHLY_PASS_LIMITS[PASS_TIERS.STANDARD] * KRW_PER_COIN,
  [PASS_TIERS.PREMIUM]: MONTHLY_PASS_LIMITS[PASS_TIERS.PREMIUM] * KRW_PER_COIN,
  [PASS_TIERS.VVIP]: MONTHLY_PASS_LIMITS[PASS_TIERS.VVIP] * KRW_PER_COIN,
  [PASS_TIERS.FAMILY]: MONTHLY_PASS_LIMITS[PASS_TIERS.FAMILY] * KRW_PER_COIN,
});

/**
 * 이 요청이 월 누적 한도 안에 드는지, 남은 한도가 얼마인지.
 * 사이클 키는 resolvePremiumQuota 와 공유(premiumUseCycleKey) — 리셋 트리거가
 * 같기 때문에 별도 필드를 두지 않는다. cycleKey 를 못 구하면(만료일 없음)
 * 적용하지 않는다(셀 수 없는 상태는 막지 않는다).
 */
export function resolveMonthlySpendQuota(profileSubscription, entitlement, coinCost) {
  const price = Math.max(0, Math.floor(Number(coinCost || 0)));
  const tier = normalizePassTier(entitlement?.passTier || entitlement?.tier);
  const cycleKey = resolvePremiumQuotaCycleKey(entitlement);
  const limitCoin = tier ? Number(MONTHLY_PASS_LIMITS[tier] || 0) : 0;
  const applies = Boolean(tier) && limitCoin > 0 && Boolean(cycleKey);
  if (!applies) {
    return { applies: false, cycleKey, limitCoin, usedCoin: 0, remainingCoin: limitCoin, exceeded: false };
  }
  const storedKey = String(profileSubscription?.premiumUseCycleKey || "");
  const usedCoin = storedKey === cycleKey
    ? Math.max(0, Math.floor(Number(profileSubscription?.monthlySpendCoin || 0)))
    : 0;
  const remainingCoin = Math.max(0, limitCoin - usedCoin);
  const exceeded = price > 0 && (usedCoin + price) > limitCoin;
  return { applies: true, cycleKey, limitCoin, usedCoin, remainingCoin, exceeded };
}

// ── 월 한도 소진 = 이용권 종료 ────────────────────────────────────────────
// 사이클 키가 이용권 자신의 만료일이라, 30일 안에서 월 한도가 리셋되는 일은
// 구조적으로 없다(resolvePremiumQuotaCycleKey). 즉 한도를 다 쓰면 남은 기간은
// 금전적 가치가 0이다. 그래서 2026-09-04 정책은 "소진되면 그 자리에서 종료"다:
// 잔여 기간은 소멸하고, 다시 사면 그날부터 30일이 새로 시작한다(사용자 확정).
//
// 소진 판정은 "잔여가 0"이 아니라 **"잔여로 열 수 있는 게 하나도 없다"**이다.
// 잔여 2,000원처럼 어떤 상품도 못 여는 잔돈을 남겨 두면, 사용자에게는 이용권이
// 살아 있는데 무엇을 눌러도 결제창이 뜨는 상태가 된다.
//
// 🔴 최저가는 worker/lib/paid-feature-registry.js 의 최저 cost 파생값이다.
// 여기서 registry 를 import 하지 않는 이유: 이 파일은 클라이언트 판정기
// (js/core/pass-verdict.js)가 숫자를 미러링하는 정본이고, 이 레포의 크로스파일
// 숫자 합의 방식은 "미러 상수 + 가드 단언"이다. verify:pass-tier-policy 가
// registry 를 전수로 읽어 이 값과 대조하므로, 더 싼 상품이 생기면 즉시 실패한다.
export const MIN_PASS_COVERABLE_COIN = 30; // 3,000원

/**
 * 이 등급의 월 한도가 소진됐는가(= 잔여로 열 수 있는 유료 항목이 없는가).
 * 판정과 소비 양쪽이 같은 답을 내야 하므로 여기 하나만 쓴다.
 */
export function isPassBudgetExhausted(tier, usedCoin) {
  const normalizedTier = normalizePassTier(tier);
  const budgetCoin = normalizedTier ? Math.max(0, Math.floor(Number(MONTHLY_PASS_LIMITS[normalizedTier] || 0))) : 0;
  if (budgetCoin <= 0) return false; // 한도를 못 세는 상태는 종료시키지 않는다.
  const used = Math.max(0, Math.floor(Number(usedCoin || 0)));
  const perItemLimit = Math.max(0, Math.floor(Number(PASS_LIMITS[normalizedTier] || 0)));
  // 건당 상한이 최저가보다 낮은 등급이 생기면 그 등급은 애초에 최저가 상품도 못 연다.
  const threshold = Math.max(1, Math.min(MIN_PASS_COVERABLE_COIN, perItemLimit || MIN_PASS_COVERABLE_COIN));
  return budgetCoin - used < threshold;
}

/**
 * 조기 종료가 profileSubscription 에 적는 필드 집합($set 의 값 부분).
 * 🔴 등급 강등 필드는 환불 회수(passes.js revokePassGrantForOrder)와 **같은 집합**이다 —
 * 두 벌로 갈리면 한쪽만 고쳐 "만료됐는데 등급이 남은" 문서가 생긴다.
 * 만료일을 now 로 당기는 것이 핵심이다: 활성 판정이 전부 expiresAt 을 보므로
 * (아래 resolveHoneyPassEntitlement · canUseByPass · evaluatePassCoverage) 새 분기를
 * 만들지 않고도 하위 판정 전부가 자동으로 뒤집힌다.
 */
export function buildPassTerminationFields({ now = new Date(), previousExpiresAt = null } = {}) {
  const previous = previousExpiresAt ? new Date(previousExpiresAt) : null;
  return {
    expiresAt: now,
    tier: "free",
    passTier: "",
    passLimit: 0,
    maxCoveredCoin: 0,
    freeLimit: 0,
    passExhaustedAt: now,
    // CS·환불 문의 때 "왜 30일 전에 끝났나"를 설명하는 유일한 증거다.
    passExhaustedFromExpiresAt: previous && Number.isFinite(previous.getTime()) ? previous : null,
    updatedAt: now,
  };
}

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
    monthlyCoveredCoin: 0,
    maxProfiles: 1,
  },
  standard: {
    passTier: PASS_TIERS.STANDARD,
    label: "스탠다드",
    maxCoveredCoin: PASS_LIMITS.standard,
    monthlyCoveredCoin: MONTHLY_PASS_LIMITS.standard,
    maxProfiles: 3,
  },
  premium: {
    passTier: PASS_TIERS.PREMIUM,
    label: "프리미엄",
    maxCoveredCoin: PASS_LIMITS.premium,
    monthlyCoveredCoin: MONTHLY_PASS_LIMITS.premium,
    maxProfiles: 7,
  },
  vvip: {
    passTier: PASS_TIERS.VVIP,
    label: "VVIP",
    maxCoveredCoin: PASS_LIMITS.vvip,
    monthlyCoveredCoin: MONTHLY_PASS_LIMITS.vvip,
    maxProfiles: 15,
  },
  family: {
    passTier: PASS_TIERS.FAMILY,
    label: "Code Destiny Family",
    maxCoveredCoin: PASS_LIMITS.family,
    monthlyCoveredCoin: MONTHLY_PASS_LIMITS.family,
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
