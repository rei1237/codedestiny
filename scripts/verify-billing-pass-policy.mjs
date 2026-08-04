import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { __billingTestUtils } from "../worker/routes/billing.js";
import {
  canUseByPass,
  HONEY_PASS_POLICY,
  normalizePassTier,
  PASS_LIMITS,
  PASS_LIMITS_KRW,
  PASS_TIERS,
} from "../worker/lib/profile-limits.js";
import { applyPdfPassDiscountToPricing } from "../worker/lib/pdf-pass-discount.js";
import {
  MUSIC_TRACK_UNLOCK_COIN_COST,
  MUSIC_TRACK_UNLOCK_PRICE_KRW,
} from "../lib/music-access-policy.js";
import {
  FEATURE_KEY_PRICE_TABLE,
  PAID_FEATURE_BILLING_TYPES,
  getPaidFeatureBillingType,
  listServerPricedFeatureKeys,
} from "../worker/lib/paid-feature-registry.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const billingSource = readFileSync(resolve(root, "worker/routes/billing.js"), "utf8");
const paymentsSource = readFileSync(resolve(root, "worker/routes/payments.js"), "utf8");
const fortuneSource = readFileSync(resolve(root, "worker/routes/fortune.js"), "utf8");
const indexSource = readFileSync(resolve(root, "index.html"), "utf8");
const destinyProfileSource = readFileSync(resolve(root, "js/destiny-profile.js"), "utf8");
const billingClientSource = readFileSync(resolve(root, "app/_lib/billing-client.ts"), "utf8");
const tarotPromptMakerSource = readFileSync(resolve(root, "app/tarot/prompt-maker/page.tsx"), "utf8");
const pointsSourcePath = existsSync(resolve(root, "app/points/PointsClient.tsx"))
  ? "app/points/PointsClient.tsx"
  : "app/points/page.tsx";
const pointsSource = readFileSync(resolve(root, pointsSourcePath), "utf8");
const statusCardSource = readFileSync(resolve(root, "app/points/SubscriptionStatusCard.tsx"), "utf8");
const headersSource = readFileSync(resolve(root, "_headers"), "utf8");

function futureDate(days = 30) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function pastDate(days = 1) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function activePass(passTier, expiresAt = futureDate()) {
  return {
    isActive: true,
    passTier,
    maxCoveredCoin: PASS_LIMITS[passTier],
    expiresAt,
  };
}

function decision({ pass = null, coinCost, monthlyBalance = 0 }) {
  return __billingTestUtils.buildPassPaymentDecision(
    pass || { isActive: false },
    {
      coinPrice: coinCost,
      cost: coinCost,
      membershipCreditCost: coinCost * 10,
      featureKey: `test-${coinCost}`,
    },
    { membershipCreditBalance: monthlyBalance },
  );
}

function assertPassFree(result, label) {
  assert.equal(result.canUseByPass, true, `${label}: canUseByPass`);
  assert.equal(result.canUseByMonthly, true, `${label}: raw monthly availability remains visible`);
  assert.equal(result.canUseByCard, true, `${label}: raw card availability remains visible`);
}

function assertPaidFallback(result, label) {
  assert.equal(result.canUseByPass, false, `${label}: pass must not cover`);
  assert.equal(result.canUseByMonthly, true, `${label}: monthly fallback`);
  assert.equal(result.canUseByCard, true, `${label}: card fallback`);
}

function finalAccess(result, requestedMode = "monthly") {
  if (requestedMode === "pass" && result.canUseByPass) {
    return {
      ok: true,
      accessMethod: "PASS",
      charged: 0,
      monthlyDeducted: false,
      cardCreated: false,
    };
  }
  if (requestedMode === "monthly" && result.canUseByMonthly) {
    return {
      ok: true,
      accessMethod: "MONTHLY",
      charged: result.coinCost,
      monthlyDeducted: true,
      cardCreated: false,
    };
  }
  if (requestedMode === "card" && result.canUseByCard) {
    return {
      ok: true,
      accessMethod: "CARD",
      charged: result.coinCost,
      monthlyDeducted: false,
      cardCreated: true,
    };
  }
  return {
    ok: false,
    accessMethod: "BLOCKED",
    charged: 0,
    monthlyDeducted: false,
    cardCreated: false,
  };
}

function assertFinalPass(result, requestedMode, label) {
  const access = finalAccess(result, requestedMode);
  assert.equal(access.ok, true, `${label}: access ok`);
  assert.equal(access.accessMethod, "PASS", `${label}: accessMethod`);
  assert.equal(access.charged, 0, `${label}: charged`);
  assert.equal(access.monthlyDeducted, false, `${label}: monthly deduction blocked`);
  assert.equal(access.cardCreated, false, `${label}: card creation blocked`);
}

function assertContains(source, marker, label) {
  assert.ok(source.includes(marker), label || marker);
}

function assertNotContains(source, marker, label) {
  assert.ok(!source.includes(marker), label || marker);
}

function assertBefore(source, first, second, label) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.ok(firstIndex >= 0, `${label}: missing first marker`);
  assert.ok(secondIndex >= 0, `${label}: missing second marker`);
  assert.ok(firstIndex < secondIndex, `${label}: order`);
}

const standard30 = decision({
  pass: activePass(PASS_TIERS.STANDARD),
  coinCost: 30,
  monthlyBalance: 300,
});
assert.equal(PASS_LIMITS_KRW[PASS_TIERS.STANDARD], 3000, "standard pass limit is 3,000 KRW");
assert.equal(PASS_LIMITS_KRW[PASS_TIERS.PREMIUM], 5000, "premium pass limit is 5,000 KRW");
assert.equal(PASS_LIMITS_KRW[PASS_TIERS.VVIP], 10000, "vvip pass limit is 10,000 KRW");
assert.equal(HONEY_PASS_POLICY.standard.maxProfiles, 3, "standard profile limit comes from shared policy");
assert.equal(HONEY_PASS_POLICY.premium.maxProfiles, 7, "premium profile limit comes from shared policy");
assert.equal(HONEY_PASS_POLICY.vvip.maxProfiles, 15, "vvip profile limit comes from shared policy");
assert.equal(HONEY_PASS_POLICY.family.maxProfiles, 0, "family profile limit remains unlimited");
assert.equal(canUseByPass(activePass(PASS_TIERS.STANDARD), 30), true, "standard covers 30 coins");
assert.equal(standard30.amountKRW, 3000, "standard 30 amountKRW");
assert.equal(standard30.passLimitKRW, 3000, "standard 30 passLimitKRW");
assertPassFree(standard30, "standard 30");
assertFinalPass(standard30, "pass", "standard 30 requested pass");

const standard50 = decision({
  pass: activePass(PASS_TIERS.STANDARD),
  coinCost: 50,
  monthlyBalance: 500,
});
assertPaidFallback(standard50, "standard 50");

const premium50 = decision({
  pass: activePass(PASS_TIERS.PREMIUM),
  coinCost: 50,
  monthlyBalance: 500,
});
assertPassFree(premium50, "premium 50");
assertFinalPass(premium50, "pass", "premium 50 requested pass");

const vvip100 = decision({
  pass: activePass(PASS_TIERS.VVIP),
  coinCost: 100,
  monthlyBalance: 1000,
});
assertPassFree(vvip100, "vvip 100");
assertFinalPass(vvip100, "pass", "vvip 100 requested pass");

const vvip200 = decision({
  pass: activePass(PASS_TIERS.VVIP),
  coinCost: 200,
  monthlyBalance: 2000,
});
assertPaidFallback(vvip200, "vvip 200");

const family690 = decision({
  pass: activePass(PASS_TIERS.FAMILY),
  coinCost: 690,
  monthlyBalance: 0,
});
assert.equal(canUseByPass(activePass(PASS_TIERS.FAMILY), 690), true, "family covers every priced service");
assert.equal(canUseByPass(activePass(PASS_TIERS.FAMILY), 0), true, "family covers zero-priced resolved services");
assert.equal(normalizePassTier("family_1m"), PASS_TIERS.FAMILY, "family plan id normalizes to family pass");
assert.equal(normalizePassTier("honey_family"), PASS_TIERS.FAMILY, "honey family plan id normalizes to family pass");
assert.equal(family690.canUseByPass, true, "family 690: canUseByPass");
assert.equal(family690.canUseByMonthly, false, "family 690: monthly fallback is unnecessary without balance");
assertFinalPass(family690, "pass", "family 690 requested pass");

const familyStatusSnapshotPass = __billingTestUtils.buildMembershipPassFromStatusSnapshot({
  isActive: true,
  subscriptionTier: "family",
  subscriptionStatus: "active",
  freeLimit: 999999999,
  subscription: {
    membershipCreditBalance: 0,
  },
});
assert.equal(familyStatusSnapshotPass?.isActive, true, "family status snapshot restores active pass");
assert.equal(familyStatusSnapshotPass?.tier, "family", "family status snapshot tier");
assert.equal(familyStatusSnapshotPass?.freeLimit, 999999999, "family status snapshot free limit");
assert.equal(
  __billingTestUtils.buildPassPaymentDecision(
    familyStatusSnapshotPass?.entitlement,
    {
      coinPrice: 690,
      cost: 690,
      membershipCreditCost: 6900,
      featureKey: "family-status-snapshot-service",
    },
    familyStatusSnapshotPass?.profileSubscription,
  ).canUseByPass,
  true,
  "family status snapshot covers paid services",
);

for (const featureKey of listServerPricedFeatureKeys()) {
  const pricing = FEATURE_KEY_PRICE_TABLE[featureKey];
  if (!pricing) continue;
  const coinCost = Math.max(0, Math.floor(Number(pricing.coinPrice || pricing.cost || 0)));
  if (!(coinCost > 0)) continue;
  const billingType = getPaidFeatureBillingType(featureKey);
  const pricingInput = {
    ...pricing,
    featureKey,
    coinPrice: coinCost,
    cost: coinCost,
    membershipCreditCost: coinCost * 10,
  };
  const standardDecision = __billingTestUtils.buildPassPaymentDecision(activePass(PASS_TIERS.STANDARD), pricingInput, { membershipCreditBalance: coinCost * 10 });
  const premiumDecision = __billingTestUtils.buildPassPaymentDecision(activePass(PASS_TIERS.PREMIUM), pricingInput, { membershipCreditBalance: coinCost * 10 });
  const vvipDecision = __billingTestUtils.buildPassPaymentDecision(activePass(PASS_TIERS.VVIP), pricingInput, { membershipCreditBalance: coinCost * 10 });
  const familyDecision = __billingTestUtils.buildPassPaymentDecision(activePass(PASS_TIERS.FAMILY), pricingInput, { membershipCreditBalance: 0 });

  // 이용권 제외 기능(프로필 카드 추가/삭제 등)은 tier 한도와 무관하게 전 tier(family 포함) 미커버여야 한다.
  // 정본 판정(isPassExcludedPricing)을 그대로 써서 향후 추가되는 제외 기능도 자동으로 덮는다.
  // 과거엔 이 루프가 profile-card-manage에 대해 "premium/vvip는 한도 안이니 커버됨"을 단언해 버그를
  // 정상으로 고정했고, 같은 파일의 licenseTier!=="FAMILY"/profile_card_pass_excluded 단언과 모순이었다.
  if (__billingTestUtils.isPassExcludedPricing(pricingInput)) {
    for (const [label, decisionForTier] of [
      ["standard", standardDecision],
      ["premium", premiumDecision],
      ["vvip", vvipDecision],
      ["family", familyDecision],
    ]) {
      assert.equal(
        decisionForTier.canUseByPass,
        false,
        `${featureKey}: 이용권 제외 기능은 ${label} 이용권으로도 커버되면 안 된다`,
      );
      assert.deepEqual(
        decisionForTier.hiddenMethods,
        [],
        `${featureKey}: 이용권 제외 기능은 결제수단을 숨기면 안 된다(${label}) — 단건/월정석이 항상 보여야 한다`,
      );
      assert.equal(
        decisionForTier.decisionReason,
        "PASS_EXCLUDED_PAYMENT_REQUIRED",
        `${featureKey}: 이용권 제외 기능의 결정 사유는 PASS_EXCLUDED_PAYMENT_REQUIRED여야 한다(${label})`,
      );
    }
    continue;
  }

  assert.equal(familyDecision.canUseByPass, true, `${featureKey}: family must cover every paid service`);
  if (billingType === PAID_FEATURE_BILLING_TYPES.PDF) {
    assert.equal(standardDecision.canUseByPass, false, `${featureKey}: standard PDF remains product payment`);
    assert.equal(premiumDecision.canUseByPass, false, `${featureKey}: premium PDF remains product payment`);
    assert.equal(vvipDecision.canUseByPass, false, `${featureKey}: vvip PDF remains product payment`);
  } else {
    assert.equal(standardDecision.canUseByPass, coinCost <= PASS_LIMITS.standard, `${featureKey}: standard pass limit`);
    assert.equal(premiumDecision.canUseByPass, coinCost <= PASS_LIMITS.premium, `${featureKey}: premium pass limit`);
    assert.equal(vvipDecision.canUseByPass, coinCost <= PASS_LIMITS.vvip, `${featureKey}: vvip pass limit`);
  }
}

const unchangedPdf = applyPdfPassDiscountToPricing({
  featureKey: "ziwei-ai-consultation",
  billingType: "pdf",
  cost: 590,
  coinPrice: 590,
  amountKRW: 59000,
  cashPrice: 59000,
  membershipCreditCost: 5900,
}, activePass(PASS_TIERS.PREMIUM));
assert.equal(unchangedPdf.coinPrice, 590, "premium pass leaves PDF price unchanged");
assert.equal(unchangedPdf.passDiscount, undefined, "premium pass does not attach PDF pass discount");
const unchangedPdfDecision = decision({
  pass: activePass(PASS_TIERS.PREMIUM),
  coinCost: unchangedPdf.coinPrice,
  monthlyBalance: 5900,
});
assert.equal(unchangedPdfDecision.canUseByPass, false, "PDF over premium pass limit requires payment");

const smallPdfUnchanged = applyPdfPassDiscountToPricing({
  billingType: "pdf",
  cost: 50,
  coinPrice: 50,
  amountKRW: 5000,
  cashPrice: 5000,
  membershipCreditCost: 500,
}, activePass(PASS_TIERS.STANDARD));
const smallPdfDecision = __billingTestUtils.buildPassPaymentDecision(
  activePass(PASS_TIERS.STANDARD),
  smallPdfUnchanged,
  { membershipCreditBalance: 500 },
);
assert.equal(smallPdfUnchanged.coinPrice, 50, "standard pass leaves small PDF price unchanged");
assert.equal(smallPdfUnchanged.passDiscount, undefined, "standard pass does not attach small PDF pass discount");
assert.equal(smallPdfDecision.canUseByPass, false, "small PDF over standard pass limit requires payment");
assert.equal(smallPdfDecision.canUseByMonthly, true, "small PDF can still use internal entitlement fallback");

const premiumSmallPdfDecision = __billingTestUtils.buildPassPaymentDecision(
  activePass(PASS_TIERS.PREMIUM),
  smallPdfUnchanged,
  { membershipCreditBalance: 0 },
);
assert.equal(premiumSmallPdfDecision.canUseByPass, true, "small PDF within premium pass limit bypasses payment");
assert.equal(premiumSmallPdfDecision.decisionReason, "PASS_COVERED", "small PDF premium pass returns covered decision");

// ── 이용권은 30일짜리다: tier × 만료 매트릭스 ──────────────────────────────
// 기존엔 vvip 하나만 만료 테스트가 있었다. family(₩300,000 무제한 등급)가 30일에 멈춘다는 걸
// 고정하는 단언이 어디에도 없었으므로 4개 tier 전부 덮는다.
for (const tier of [PASS_TIERS.STANDARD, PASS_TIERS.PREMIUM, PASS_TIERS.VVIP, PASS_TIERS.FAMILY]) {
  const withinLimit = tier === PASS_TIERS.FAMILY ? 690 : PASS_LIMITS[tier];
  assert.equal(
    canUseByPass(activePass(tier, futureDate()), withinLimit),
    true,
    `${tier}: 유효한 이용권은 한도 이하를 커버해야 한다(경계 포함)`,
  );
  assert.equal(
    canUseByPass(activePass(tier, pastDate()), withinLimit),
    false,
    `${tier}: 만료된 이용권은 한도 이하라도 커버하면 안 된다(30일 정책)`,
  );
  const expiredDecision = decision({ pass: activePass(tier, pastDate()), coinCost: withinLimit });
  assert.equal(expiredDecision.canUseByPass, false, `${tier}: 만료 후 결제창도 이용권 무료를 제시하면 안 된다`);
  assert.equal(expiredDecision.hasActivePass, false, `${tier}: 만료 후 hasActivePass=false`);
}

// ── expiresAt 부재 = "무기한 유효"가 아니라 "활성 근거 없음" ────────────────
// billing.js의 프로필 폴백이 정본(profile-limits.js normalizeHoneyPassEntitlement)보다 느슨해서
// tier만 적힌 문서가 영구 무료 이용권이 되던 홀. 두 리졸버가 같은 답을 내는지 대조한다.
for (const tier of [PASS_TIERS.STANDARD, PASS_TIERS.PREMIUM, PASS_TIERS.VVIP, PASS_TIERS.FAMILY]) {
  const noExpiryDecision = __billingTestUtils.buildPassPaymentDecision(
    { isActive: false },
    { featureKey: "tarot-love-relationship", coinPrice: 50 },
    { tier },
  );
  assert.equal(
    noExpiryDecision.hasActivePass,
    false,
    `${tier}: 만료일 없는 이용권 문서를 활성으로 인정하면 영구 무료가 된다`,
  );
  assert.equal(
    noExpiryDecision.canUseByPass,
    false,
    `${tier}: 만료일 없는 이용권 문서로 무료 통과시키면 안 된다`,
  );
}

// ── pass 제외: 프로필 카드 추가/삭제 (D유형) ────────────────────────────────
// 정책: 건당 5,000원 단건결제 또는 월정석 500으로만 결제 가능하며, 이용권으로는 어떤 등급도 결제 불가.
// (family 무료는 '이용권으로 결제'가 아니라 '가격이 0원'인 정책 바이패스이며 worker/routes/profile.js가
//  판정한다 — coin-gate 이용권 경로와 무관하다.) docs/payment-policy-content-access.md D유형 참고.
for (const tier of [PASS_TIERS.STANDARD, PASS_TIERS.PREMIUM, PASS_TIERS.VVIP, PASS_TIERS.FAMILY]) {
  const profileCardDecision = __billingTestUtils.buildPassPaymentDecision(
    activePass(tier),
    { featureKey: "profile-card-manage", coinPrice: 50, cost: 50, membershipCreditCost: 500 },
    { tier, passTier: tier, expiresAt: futureDate(), isActive: true, membershipCreditBalance: 500 },
  );
  assert.equal(
    profileCardDecision.canUseByPass,
    false,
    `${tier}: 프로필 카드 추가/삭제는 이용권으로 결제할 수 없다(단건/월정석만)`,
  );
  assert.deepEqual(
    profileCardDecision.hiddenMethods,
    [],
    `${tier}: 프로필 카드 결제창은 결제수단을 숨기면 안 된다 — 숨기면 결제할 방법이 없는 막다른 길이 된다`,
  );
  assert.deepEqual(
    profileCardDecision.equalPriorityMethods,
    ["DIRECT_KRW", "MOONLIGHT_STONE"],
    `${tier}: 프로필 카드는 단건 결제와 월정석이 동등 노출되어야 한다`,
  );
}

// ── pass 커버: 음악 트랙 ────────────────────────────────────────────────────
// 키가 동적(music-track-<hash>)이라 아래 전기능 루프(listServerPricedFeatureKeys)가 절대 못 본다.
// 정책(2026-07): 이용권 보유자는 전 등급에서 전곡 재생이 무료로 열린다(곡당 코인가 < 최저 한도 30코인).
// 다운로드만 이용권 대상이 아니며, 그 판정은 결제 결정이 아니라 worker/routes/music.js가 licenseType으로 한다.
// 가격은 리터럴로 적지 말고 정본에서 읽는다 — 예전 픽스처는 3코인을 손으로 박아 두어, 실제 가격을
// 올려도 가드가 옛 값만 계속 검사했다.
assert.equal(
  MUSIC_TRACK_UNLOCK_PRICE_KRW,
  MUSIC_TRACK_UNLOCK_COIN_COST * 100,
  "음악 트랙 원화가는 코인가 × KRW_PER_COIN(100)과 일치해야 한다",
);
// 🔴 KG이니시스 일반 카드결제는 1,000원 미만을 거부한다. 그 미만이면 PortOne requestPayment 가
// PG창을 띄우기도 전에 실패해 사용자에게는 "결제창이 안 뜬다"로 보인다(2026-07 실사고).
assert.ok(
  MUSIC_TRACK_UNLOCK_PRICE_KRW >= 1000,
  `음악 트랙 단건 결제금액은 이니시스 최소 결제금액(1,000원) 이상이어야 한다 — 현재 ${MUSIC_TRACK_UNLOCK_PRICE_KRW}원`,
);

const musicPricingFixture = {
  featureKey: "music-track-abc123",
  coinPrice: MUSIC_TRACK_UNLOCK_COIN_COST,
  cost: MUSIC_TRACK_UNLOCK_COIN_COST,
};

for (const tier of [PASS_TIERS.STANDARD, PASS_TIERS.PREMIUM, PASS_TIERS.VVIP, PASS_TIERS.FAMILY]) {
  const musicPassDecision = __billingTestUtils.buildPassPaymentDecision(
    activePass(tier),
    { ...musicPricingFixture },
    { tier, passTier: tier, expiresAt: futureDate(), isActive: true },
  );
  assert.equal(
    musicPassDecision.canUseByPass,
    true,
    `${tier}: 음악 트랙은 이용권으로 전곡 커버되어야 한다`,
  );
}

// 이용권이 없으면 음악 트랙도 단건결제와 월정석이 동등 노출되어야 한다(한쪽만 노출 금지).
const musicNoPassDecision = __billingTestUtils.buildPassPaymentDecision(
  null,
  { ...musicPricingFixture, membershipCreditCost: MUSIC_TRACK_UNLOCK_COIN_COST * 10 },
  {},
  { monthlyBalance: MUSIC_TRACK_UNLOCK_COIN_COST * 10 },
);
assert.equal(
  musicNoPassDecision.canUseByPass,
  false,
  "이용권이 없으면 음악 트랙이 무료로 커버되면 안 된다",
);
assert.deepEqual(
  musicNoPassDecision.equalPriorityMethods,
  ["DIRECT_KRW", "MOONLIGHT_STONE"],
  "음악 트랙 결제창은 단건 결제와 월정석이 동등 노출되어야 한다",
);

const expiredPass = activePass(PASS_TIERS.VVIP, pastDate());
const expiredVvip50 = decision({
  pass: expiredPass,
  coinCost: 50,
  monthlyBalance: 500,
});
assert.equal(canUseByPass(expiredPass, 50), false, "expired pass must not cover");
assertPaidFallback(expiredVvip50, "expired vvip 50");

const noPassMonthly = decision({
  coinCost: 30,
  monthlyBalance: 300,
});
assert.equal(noPassMonthly.canUseByPass, false, "no pass monthly regression: pass unavailable");
assert.equal(noPassMonthly.canUseByMonthly, true, "no pass monthly regression: monthly usable");
assert.equal(noPassMonthly.canUseByCard, true, "no pass monthly regression: card still usable");
assert.equal(noPassMonthly.recommendedMethod, "PAYMENT_CHOICE", "no pass monthly regression: no single paid method is preferred");
assert.deepEqual(noPassMonthly.recommendedMethods, ["DIRECT_KRW", "MOONLIGHT_STONE"], "no pass monthly regression: card and monthly are equal paid choices");
assert.deepEqual(noPassMonthly.equalPriorityMethods, ["DIRECT_KRW", "MOONLIGHT_STONE"], "no pass monthly regression: card and monthly keep equal priority");
assert.equal(noPassMonthly.paymentPriority, "USER_CHOICE_EQUAL", "no pass monthly regression: user choice remains equal priority");
assert.deepEqual(finalAccess(noPassMonthly, "monthly"), {
  ok: true,
  accessMethod: "MONTHLY",
  charged: 30,
  monthlyDeducted: true,
  cardCreated: false,
}, "no pass monthly regression: final monthly charge");

const noPassCard = decision({
  coinCost: 30,
  monthlyBalance: 0,
});
assert.equal(noPassCard.canUseByPass, false, "no pass card regression: pass unavailable");
assert.equal(noPassCard.canUseByMonthly, false, "no pass card regression: monthly insufficient");
assert.equal(noPassCard.canUseByCard, true, "no pass card regression: card usable");
assert.equal(noPassCard.recommendedMethod, "PAYMENT_CHOICE", "no pass card regression: paid choice shell remains neutral");
assert.deepEqual(noPassCard.recommendedMethods, ["DIRECT_KRW", "MOONLIGHT_STONE"], "no pass card regression: card and monthly stay equal paid choices even when monthly balance is short");
assert.deepEqual(noPassCard.equalPriorityMethods, ["DIRECT_KRW", "MOONLIGHT_STONE"], "no pass card regression: monthly stays visible (disabled via canUseByMonthly=false) instead of being removed from the choice list");
assert.deepEqual(finalAccess(noPassCard, "card"), {
  ok: true,
  accessMethod: "CARD",
  charged: 30,
  monthlyDeducted: false,
  cardCreated: true,
}, "no pass card regression: final card creation");

assertBefore(
  billingSource,
  "if (!directPaymentRequested && !monthlyBalanceRequested && paymentDecision.canUseByPass && !passBlockedByAccessDecision)",
  "if (monthlyBalanceRequested)",
  "PASS is evaluated before monthly deduction only outside monthly mode",
);
assertContains(billingSource, 'accessMethod: "PASS"', "PASS access method response");
assertContains(billingSource, "charged: 0", "PASS charged zero response");
assertContains(billingSource, 'paymentMethod: "PASS"', "PASS usage log marker");
assertContains(billingSource, "recordPassAccessIfNeeded", "PASS usage evidence");
assertContains(billingSource, "PASS_ACCESS_GRANTED", "30-day tier pass grants access without service-use deduction");
assertNotContains(billingSource, "PASS_DEDUCT_SUCCESS", "30-day tier pass does not use service-use deduction logs");
assertNotContains(billingSource, "PASS_DEDUCT_DUPLICATE_RETURNED", "30-day tier pass duplicate path does not use deduction logs");
assertNotContains(billingSource, "pass_used_up", "tier pass is not blocked by service-use counters");
assertNotContains(billingSource, `"profileSubscription.${["pass", "Remaining", "Uses"].join("")}"`, "tier pass updates do not store service-use counters");
assertContains(billingSource, 'status: "license_passed"', "server returns license_passed access gate result");
assertContains(billingSource, '"family_all_access" : "license_coin_limit"', "family all-access gate reason");
assertContains(billingSource, "featureKey === PROFILE_CARD_MANAGE_FEATURE_KEY && licenseTier !== \"FAMILY\"", "profile card actions emit license pass UI only for FAMILY tier");
assertContains(billingSource, "profile_card_pass_excluded", "non-FAMILY pass cannot bypass profile card actions");
// 재유입 방지: 프로필 카드를 이용권 제외에서 다시 빼는 featureKey 예외 분기가 되살아나면 즉시 실패시킨다.
// 이 우회가 premium/vvip에게 PASS_COVERED + 결제수단 전부 숨김 → 소비 단계 거부(막다른 길)의 원인이었다.
assertNotContains(billingSource, "isPassExcludedPricing(pricing) && !isProfileCardManage", "profile card pass exclusion must not be re-suppressed (buildPassPaymentDecision)");
assertNotContains(billingSource, "isPassExcludedPricing(pricing) && pricingFeatureKey !== PROFILE_CARD_MANAGE_FEATURE_KEY", "profile card pass exclusion must not be re-suppressed (coin-gate)");
assertNotContains(billingSource, "policy?.allowed === true && actionType === PROFILE_CARD_MUTATION_ACTIONS.CREATE", "profile card create does not bypass payment for non-FAMILY pass tiers");
assertNotContains(billingSource, "if (!singleOrMonthlyOnly)", "monthly choice must not block PASS coverage");
assertContains(billingSource, "consumeMembershipCreditIfAvailable", "monthly deduction path remains");
assertContains(billingSource, 'accessMethod: "MONTHLY"', "monthly access method remains");
assertContains(billingSource, 'charged: Number(membershipConsume.coinPrice || 0)', "monthly charged amount remains");
assertContains(billingSource, "source: CONTENT_ENTITLEMENT_SOURCES.MONTHLY", "monthly unlock is not recorded as pass");
assertContains(billingSource, "paymentId: membershipConsume.transactionId || requestId", "monthly unlock keeps transaction evidence");
assertContains(billingSource, "accessSource: resolvedAccessSource", "billing responses return explicit access source");
assertContains(billingSource, 'resolvedAccessSource === "single_payment" ? "single_payment"', "single payment response intent remains explicit");
assertContains(billingSource, 'resolvedAccessSource === "monthly_subscription" ? "monthly_subscription"', "monthly response intent remains explicit");
assertContains(billingSource, 'paymentType: resolvedPaymentIntentType', "payment verify response includes explicit payment type");
const checkoutSource = billingSource.slice(
  billingSource.indexOf("async function handleCheckout("),
  billingSource.indexOf("function logCheckoutElapsed("),
);
const confirmSource = billingSource.slice(
  billingSource.indexOf("async function handleConfirm("),
  billingSource.indexOf("async function runServiceExecutionAction("),
);
assertNotContains(checkoutSource, "grantPassFreeAccessBeforeCardIfAvailable", "DIRECT_KRW prepare performs zero pass lookups");
assertNotContains(checkoutSource, "buildDiscountedPdfPaymentDelegation", "DIRECT_KRW prepare does not query a pass for PDF pricing");
assertNotContains(confirmSource, "grantPassFreeAccessBeforeCardIfAvailable", "DIRECT_KRW confirm performs zero pass lookups");
assertNotContains(confirmSource, "buildDiscountedPdfPaymentDelegation", "DIRECT_KRW confirm does not query a pass for PDF pricing");
assertContains(billingSource, '"/api/payments/prepare"', "single card prepare path remains");
assertContains(billingSource, '"/api/payments/confirm"', "single card confirm path remains");
assertContains(checkoutSource, "preverifiedAuth: checkoutAuthCheck.auth", "checkout delegates its verified auth without a second User lookup");
assertContains(confirmSource, "preverifiedAuth: confirmAuthCheck.auth", "confirm delegates its verified auth without a second User lookup");
assertContains(paymentsSource, "const auth = delegatedAuth?.userId", "payments accepts only an internally delegated verified auth object");

// 결제수단 선택은 명시적이다. DIRECT_KRW는 PortOne으로, MEMBERSHIP_PASS만 이용권 적용으로 간다.
assertContains(
  billingSource,
  "if (!shouldApplyMembershipPassBeforeCard(body)) return null;",
  "only an explicit membership-pass choice may apply a pass before card checkout",
);
// 이미 PG 결제가 끝나 검증 페이로드가 실린 confirm 요청은 그대로 검증·기록한다.
assertContains(billingSource, "const shouldLoadMembershipPass = shouldVerifyMembershipPass(paymentCommand.method);", "payment method is resolved before pass lookup");
assertContains(paymentsSource, "fetchPortOnePayment", "PortOne verification remains");
assertContains(paymentsSource, "PortOne V2 KG Inicis", "KG Inicis public config remains");
assertContains(paymentsSource, 'accessMethod: "CARD"', "card access method remains");
assertContains(paymentsSource, "SUBSCRIPTION_MONTHLY_CREDIT_UNSUPPORTED", "subscription pass monthly credit purchase is explicitly rejected");
assertNotContains(paymentsSource, "handleSubscriptionMonthlyCreditConfirm", "subscription pass monthly credit confirm path removed");
assertNotContains(pointsSource, "handleSubscribeWithMonthlyCredit", "subscription pass monthly credit UI handler removed");
assertNotContains(pointsSource, 'paymentMethod: "monthly_credit"', "subscription pass UI does not submit monthly-credit purchases");
assertContains(pointsSource, "이용권은 원화 단건 결제로만 구매할 수 있습니다.", "subscription pass UI states direct-only purchase");
assertNotContains(pointsSource, '<span className="block text-sm font-black">보너스 월정석 사용</span>', "subscription pass UI does not offer monthly-credit purchase");
const handleSubscribeStart = pointsSource.indexOf("const handleSubscribe = async (plan: SubscriptionPlan) => {");
const subscriptionCancelStart = pointsSource.indexOf("const handleSubscriptionCancel = async", handleSubscribeStart);
assert.ok(handleSubscribeStart >= 0 && subscriptionCancelStart > handleSubscribeStart, "points page subscription handlers found");
const cardSubscriptionSource = pointsSource.slice(handleSubscribeStart, subscriptionCancelStart);
assertContains(cardSubscriptionSource, 'setProcessingStage("30일 이용권 결제 정보를 준비하고 있어요.\\n중복 결제를 시도하지 말아 주세요.", "checkout")', "card subscription prepare uses checkout wait UI");
assertNotContains(cardSubscriptionSource, 'setProcessingStage("월정석 정보를 확인하는 중이에요", "monthly")', "card subscription checkout must not use monthly wait UI");
// 🔴 오버레이 정리는 **await 하지 않는다**. 예전에는 이 함수가 rAF 를 await 해서 PG 창을 여는 직전에
// 한 프레임을 더 먹었다 — 쓸모없는 지연이고, 사용자 제스처와 requestPayment 사이가 벌어져 모바일에서
// 결제창이 차단될 위험까지 만든다. 정리 → 곧바로 requestPayment 순서만 고정한다.
assertNotContains(cardSubscriptionSource, "await closeProcessingOverlayBeforeExternalCheckout();", "overlay cleanup must not be awaited before opening the PG window");
assertBefore(cardSubscriptionSource, "closeProcessingOverlayBeforeExternalCheckout();", "const rsp = await window.PortOne.requestPayment(requestData);", "subscription PG opens right after the React overlay is cleared");
assertBefore(cardSubscriptionSource, "const rsp = await window.PortOne.requestPayment(requestData);", "setProcessingStage(\"결제 승인 내역을 안전하게 확인하고 있어요.", "subscription confirm wait starts only after PG response");
assertContains(pointsSource, "PDF 서비스와 일반 유료 서비스 조건은 상품별 안내에서 확인할 수 있습니다.", "standard pass paid-service policy UI");
assertContains(pointsSource, "subscriptions?: Record<string, unknown>[]", "points page reads payments/me subscriptions");
assertContains(pointsSource, "normalizeSubscriptionStatusFromPayload", "points page normalizes subscription payloads");
assertContains(pointsSource, "mergeSubscriptionState", "points page merges server subscription state");
assertContains(pointsSource, "<SubscriptionStatusCard subscription={subscription} />", "points page renders status card without monthly balance copy");
const legacyPdfDiscountCopy = [
  "PDF 생성 시 3,000원 ",
  "자동 ",
  "할인",
].join("");
assertNotContains(pointsSource, legacyPdfDiscountCopy, "standard pass legacy pricing UI removed");
assertContains(pointsSource, "프로필 추가·수정·삭제 무료, 제한 없음", "family profile unlimited UI");
assertContains(pointsSource, "formatSubscriptionPlanPolicy", "subscription pass policy formatter");
assertContains(statusCardSource, "Family 이용권으로 모든 서비스가 무료 처리됩니다.", "family status card policy");
assertContains(statusCardSource, "한도 초과 서비스와 PDF는 상품별 원화 단건 결제로 이용할 수 있습니다.", "non-family paid service/PDF status policy");
assertNotContains(paymentsSource, '"profileSubscription.membershipCreditBalance": 0,\n        "profileSubscription.membershipCreditGranted": 0,\n        "profileSubscription.membershipCreditUsed": 0,', "card pass confirm must preserve monthly credit ledger");

assertContains(indexSource, 'class="cd-direct-payment-option" data-mode="direct"', "single payment CTA");
assertContains(indexSource, 'data-mode="monthly" data-monthly-option', "monthly payment CTA restored");
assertContains(indexSource, "var allowMonthlyChoice = paymentModeAllowed(['monthly', 'monthly_credit', 'moonlight_stone', 'membership_credit'])", "monthly payment includes profile add/delete");
assertContains(indexSource, "var allowPassChoice = opts.disablePassChoice !== true", "payment modal pass option is available by default unless explicitly disabled");
// 🔴 이용권 확인 지점이 진입 선검사에서 결제창으로 옮겨졌다(2026-07 정책 전환).
// 이 세 단언은 예전 정책("결제창을 열기 전에만 이용권을 확인한다")을 고정하고 있었다. 진입 선검사의
// 서버 왕복을 없앤 지금 그대로 두면, 스냅샷 없는 이용권 보유자가 이용권을 확인할 방법 자체가 없어진다.
// 이제 지켜야 할 성질은 반대다 — 결제창의 이용권 카드가 반드시 서버 검사를 수행할 것.
assertContains(indexSource, "var passMode = 'pass-store';", "payment modal keeps the canonical pass card mode (CSS/parity markers bind to it)");
assertContains(indexSource, "var passReady = await refreshDirectEntitlementStatus();", "payment modal verifies the entitlement when the pass card is chosen");
assertNotContains(indexSource, "이용권은 결제창을 열기 전에만 확인됩니다.", "in-modal pass verification must not be blocked again");
assertNotContains(indexSource, "paymentChoice === 'membership' ? 'MEMBERSHIP_PASS' : 'MOONLIGHT_STONE'", "unlock modal never routes monthly choice through membership pass");
assertNotContains(indexSource, "perUseChoice === 'membership' ? 'MEMBERSHIP_PASS' : 'MOONLIGHT_STONE'", "per-use modal never routes monthly choice through membership pass");
assertNotContains(indexSource, "tilePaymentChoice === 'membership' ? 'MEMBERSHIP_PASS' : 'MOONLIGHT_STONE'", "tile lock modal never routes monthly choice through membership pass");
assertContains(indexSource, "_cdPaidPrecheckCache", "paid feature precheck cache exists");
assertContains(indexSource, "_cdPaidPrecheckInFlight", "paid feature precheck in-flight dedupe exists");
assertContains(indexSource, "CD_PAID_PRECHECK_TTL_MS = 30000", "paid feature precheck cache TTL");
assertContains(indexSource, "MONTHLY_CREDIT_SYNC_FRESH_TTL_MS = 15000", "monthly credit sync fresh TTL");
assertContains(indexSource, "monthlyCreditSyncPromise", "monthly credit sync in-flight dedupe");
assertNotContains(indexSource, "retry=1&reason=", "monthly credit sync avoids third retry request");
assertNotContains(indexSource, "_cdCanUseMonthlyFromPrecheck", "monthly precheck must not bypass equal-priority payment choice");
// 이용권 확인 오버레이는 최소 노출 시간을 강제하지 않는다 — 서버가 답하는 즉시 진행한다.
// (과거 400ms 하한은 오버레이 깜빡임을 막으려던 것인데, 서버가 50ms에 답해도 그만큼 무조건 기다려
//  '이용권 확인이 느리다'는 체감의 최대 단일 원인이었다. 깜빡임이 문제가 되면 '닫기를 늦추는' 대신
//  '열기를 늦추는' 방식으로 고칠 것 — 그래야 빠른 응답엔 오버레이가 아예 안 뜨고 지연도 0이다.)
assertContains(indexSource, "CD_PASS_CHECK_MIN_OVERLAY_MS = 0", "membership pass check overlay must not impose an artificial minimum delay");
assertContains(indexSource, "_cdWaitForPaidPassCheckMinimum(passOverlayStartedAt)", "membership pass check waits before closing or switching result UI");
assertContains(indexSource, "closePassCheckOverlay", "membership pass check close path is centralized");
assertNotContains(indexSource, "function showChoiceWait", "payment choice does not open duplicate wait overlay before checkout handler");
assertNotContains(indexSource, "showChoiceWait(mode)", "payment choice click does not flash a duplicate wait overlay");
assertContains(indexSource, "window.__cdPortOneV2PreloadPromise", "payment choice modal preloads PortOne SDK for direct payment");
// 프리로드 재사용의 정본은 공용 진입점 하나다(_cdPortOneV2SdkPromise 가 __cdPortOneV2PreloadPromise 를
// 메모이즈한다). 예전 마커는 호출부에 흩어져 있던 promise 변수였다.
assertContains(indexSource, "await _cdPortOneV2SdkPromise()", "direct payment reuses preloaded PortOne SDK promise");
// 🔴 단건결제는 클릭부터 PG 결제창이 열리기까지 어떤 대기 UI도 띄우지 않는다(사용자 요구사항).
// 예전 규칙은 그 반대("PG 인증 중에도 대기 UI 유지")였는데, 실제로는 대기 오버레이만 보이고
// PG창은 안 뜨는 것으로 체감됐고 페인트 대기가 user-gesture 소멸 위험까지 만들었다.
// 대기 UI는 requestPayment 가 반환된 뒤 승인 확인 단계(paymentProcessing)에서만 띄운다 — 아래 597 라인.
assertNotContains(indexSource, "단건 결제 주문 정보를 확인하고 있습니다.", "direct checkout must not open a wait overlay before the PG window");
assertNotContains(indexSource, "status: 'paymentWindowOpen'", "single payment must not raise wait UI before/while opening the PG window");
assertNotContains(indexSource, "status: 'paymentPreparing'", "single payment must not raise a preparing overlay before the PG window");

// 🔴 [가장 중요] 전역 fetch 래퍼(installPaymentFetchOverlay)가 결제 API POST 마다 대기 오버레이를
// **자동으로** 켠다. 그래서 호출부의 명시적 오버레이를 모두 지워도(PR #119) 주문 발급 요청이
// '결제 상태 확인 중 / 단건으로 카드 결제를 준비 중이에요' 돼지 UI를 띄우고 결제수단 모달까지 덮었다.
// PG 결제창을 열기 **전** 단계(주문 발급)는 오버레이 meta 를 만들지 않아야 한다.
assertContains(
  indexSource,
  "if (path.indexOf('/api/billing/checkout') === 0 || path.indexOf('/api/payments/prepare') === 0) return null;",
  "order issuance (checkout/prepare) must not raise the automatic payment fetch overlay",
);
assertContains(
  indexSource,
  "if (bodyMode === 'DIRECT_KRW') return null;",
  "coin-gate DIRECT_KRW must not raise the automatic payment fetch overlay",
);
// 반대 방향 회귀(표시를 전부 없애 버리는 것)도 막는다 — 결제창을 통과한 뒤에는 화면이 비지 않아야 한다.
// 다만 2026-08 정책 전환으로 그 화면은 '결제 승인 확인 중'(mode 'confirm')이 아니라 '결제가 적용되었습니다'
// (mode 'payment-complete')다. 단건·월정석에는 진행 화면을 두지 않고 적용 알림만 남긴다.
assertContains(
  indexSource,
  "path.indexOf('/api/billing/confirm') === 0 || path.indexOf('/api/payments/confirm') === 0) return { type: 'payment', mode: 'payment-complete'",
  "payment confirmation must keep showing something (now the 'applied' frame, not a checking frame)",
);
assertContains(indexSource, "if (bodyMode === 'MEMBERSHIP_PASS') return { type: 'payment', mode: 'pass'", "membership pass check keeps its own wait overlay");
// checkout POST는 결제수단 모달에서 발급하지 않고 명시적인 단건 클릭에서만 한 번 실행한다.
// 🔴 이용권 선검사가 '미커버'로 결론난 뒤에 대기 화면을 한 번 더 띄우지 않는다. 예전에는 React
// 결제 클라이언트가 status:"loadingProducts" 를 셸 게이트로 보냈고, 셸 카피 해석기가 그것을
// access_check.single 로 매핑해 '결제 상태 확인 중 / 단건으로 카드 결제를 준비 중이에요' 화면을
// 띄웠다 — 이용권 확인 화면이 끝난 뒤 또 뜨던 그 화면이다. 미커버가 확정되면 할 일은 결제창을
// 여는 것뿐이므로 중간 대기 UI가 없어야 한다.
// (이용권 선검사 자체와 그 '이용권 확인 중' 화면은 유지된다 — 등급별 무료 통과가 거기 달려 있다.)
assertNotContains(billingClientSource, 'status: "loadingProducts"', "no extra wait overlay after the pass pre-check concludes not-covered");
// 🔴 정정(2026-07): 직전 배포에서 이 자리를 status:"readyToPay" 로 바꿨는데, readyToPay 는 대기
// 오버레이가 아니라 **게이트 패널**을 여는 상태다(셸/React 모두). 그래서 대기화면 하나가 '선택 대기 /
// 결제 상품 보기' 패널로 바뀌었고, 그 패널이 결제수단 모달과 휴대폰 번호 입력창 위에 남아 결제를
// 끝낼 수 없었다. 미커버가 확정되면 게이트를 **건드리지 않고**(emit 없음) 결제수단 모달을 열기 직전에
// 오히려 **닫아야** 한다. 커버된 경우(hasEntitlement)의 무료 통과 피드백은 그대로 남긴다.
assertNotContains(billingClientSource, 'status: "readyToPay"', "uncovered pass check must not open the gate panel before the payment choice");
assertContains(billingClientSource, 'emitPaidFeatureGate("close", {', "gate must be closed right before the payment-choice modal opens");
assertContains(billingClientSource, 'const eligibilityStatus: PaidFeatureGateRuntimeStatus = "hasEntitlement";', "covered pass check must still report the free pass-through");
assertContains(indexSource, "if (status === 'checkingEntitlement')", "pass pre-check keeps its own dedicated wait copy");
assertContains(billingClientSource, '_cdRunDirectKrwCheckout?: PaidServiceRuntimeGate;', "React explicit DIRECT_KRW must reach the direct checkout runtime");
assertContains(billingClientSource, 'const parsed: BillingResult<BillingCoinGateData> = explicitDirectMode', "React explicit DIRECT_KRW must skip the redundant coin-gate probe");
assertContains(billingClientSource, '(!explicitPaymentMode || explicitDirectMode)', "explicit DIRECT_KRW must be allowed through the payment runtime fallback");

assertNotContains(indexSource, "_cdStartDirectCheckoutPrefetch", "the payment-choice modal must not pre-issue a checkout order");
assertNotContains(indexSource, "__cdDirectCheckoutPrefetch", "the static shell must not retain checkout POST prefetch state");
assertNotContains(destinyProfileSource, "_dpStartDirectCheckoutPrefetch", "the React bridge must not pre-issue a checkout order");
assertNotContains(destinyProfileSource, "__cdDirectCheckoutPrefetch", "the React bridge must not retain checkout POST prefetch state");
assert.equal((indexSource.match(/fetchJsonWithAuth\('\/api\/billing\/checkout'/g) || []).length, 1, "the static shell owns exactly one checkout POST call site");
assert.equal((destinyProfileSource.match(/_dpPaymentFetchJson\('\/api\/billing\/checkout'/g) || []).length, 1, "the React bridge owns exactly one checkout POST call site");
const staticDirectCheckoutSource = indexSource.slice(indexSource.indexOf("async function _cdRunDirectKrwCheckout("), indexSource.indexOf("async function _cdRunMonthlyCreditGate(", indexSource.indexOf("async function _cdRunDirectKrwCheckout(")));
const bridgeDirectCheckoutSource = destinyProfileSource.slice(destinyProfileSource.indexOf("window._cdRunDirectKrwCheckout = async function("), destinyProfileSource.indexOf("window._cdRunDirectKrwCheckout = _dpRunDirectKrwCheckoutGuarded;", destinyProfileSource.indexOf("window._cdRunDirectKrwCheckout = async function(")));
assertNotContains(staticDirectCheckoutSource, "ApplyMembershipPassBeforePayment", "static DIRECT_KRW must not switch to pass access");
assertNotContains(bridgeDirectCheckoutSource, "ApplyMembershipPassBeforePayment", "React DIRECT_KRW must not switch to pass access");

// 🔴 게이트 재제안 루프(_cdGateAttempt, 최대 4회)가 같은 requestId 를 Idempotency-Key 로 재사용하면
// 서버가 같은 주문(merchantUid)을 멱등 반환하고, PortOne 이 **paymentId 중복**을 결제창 렌더 전에
// 거절한다 → "첫 실패 후에는 몇 번 눌러도 결제창이 안 뜬다". 시도별 키 파생을 고정한다.
assertContains(indexSource, "var _cdAttemptIdempotencyKey = requestId + ':a' + _cdGateAttempt;", "each payment attempt must derive its own Idempotency-Key (duplicate paymentId = PG window never opens)");
assertContains(indexSource, "idempotencyKey: _cdAttemptIdempotencyKey", "the per-attempt key must reach the explicit direct checkout call");
assertContains(indexSource, "checkoutPayload.idempotencyKey || opts.idempotencyKey || checkoutPayload.requestId", "the payload builder must prefer the per-attempt key over the loop-stable requestId");
// 중복 코드로 거절되면 새 키로 1회 재시도해 사용자가 고착되지 않게 한다.
assertContains(indexSource, "_cdIsPortOneDuplicatePaymentCode", "duplicate paymentId rejection must be detected and retried once with a fresh key");
assertContains(indexSource, "__cdDuplicatePaymentRetry", "the duplicate-paymentId retry must be bounded to a single attempt");
// 503 폭풍에서 주문 발급 POST 가 브레이크 없이 재발사되지 않게 한다(쿨다운은 원래 GET 전용이었다).
assertContains(indexSource, "normalizedMethod === 'POST' && String(pathname || '').indexOf('/api/billing/checkout') === 0) return true", "checkout POST needs a 503 breaker (cooldown used to be GET-only)");
assertContains(indexSource, "if (normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD') return false;", "automatic network retries must be limited to read requests");
assertContains(indexSource, "if (response.status === 401 && (normalizedMethod === 'GET' || normalizedMethod === 'HEAD'))", "401 refresh replay must not repeat payment POST requests");
assertContains(destinyProfileSource, "retryTransient: requestMethod === 'GET' && opts.retryTransient === true", "React payment POST requests must not opt into transient retries");
// 진단 로그는 콘솔에서 'Object' 로 접히면 쓸모가 없다 — 한 줄 문자열이어야 한다.
assertContains(indexSource, "'[direct-checkout] PortOne requestPayment failed'\n            + ' code='", "PortOne failure must be logged as one flat line (an object collapses to 'Object' in the console)");
// PG 호출 직전에는 아무것도 끼우지 않는다(한 프레임이라도 끼면 user-gesture 소멸에 가까워진다).
// verify-paid-gate-ui 가 js/destiny-profile.js 에 대해 같은 성질을 고정한다.
// 주의: _cdWaitForPaymentOverlayPaint 자체는 이용권 선검사 경로에서 정당하게 쓰이므로 전역 금지가 아니다.
// 🔴 try/finally 로 감싸는 것은 "끼우는 것"이 아니다 — PG 호출 자체는 여전히 핸드오프 직후 첫 문장이고,
// finally 는 결제창이 닫힌 **뒤** 실행된다(오버레이 해제·억제 해제를 성공·실패·취소 한 곳에서 처리).
assertContains(
  indexSource,
  "window.__cdSuppressPaymentUnloadBlock = true;\n    var rsp;\n    try {\n      rsp = await window.PortOne.requestPayment(requestData);",
  "nothing may sit between the direct-checkout handoff and PortOne requestPayment",
);
assertContains(indexSource, "status: 'paymentProcessing'", "payment wait UI remains during server confirmation");
assertContains(indexSource, "updateSharedPaidGate('paymentProcessing', '월정석 이벤트 재화 사용 권한을 확인하고 있습니다.'", "monthly event currency wait UI starts from the actual monthly charge request");
assertContains(indexSource, "__cdMonthlyCreditGateInFlight", "monthly payment request has single-flight guard");
assertContains(indexSource, "단건 결제가 완료되어 열람되었습니다.", "single payment success copy");
assertContains(indexSource, "월정석 사용이 완료되었습니다.", "monthly event currency success copy");
assertContains(indexSource, "월정석 이벤트 재화로 열람되었습니다.", "monthly event currency access success copy");
assertContains(indexSource, "월정석은 이벤트성 선불 재화입니다.", "monthly event currency disclaimer copy");
assertContains(indexSource, "FAMILY 이용권이 적용되었습니다.", "static family license pass success copy");
assertContains(indexSource, "membership-honey-kkulkkul.webp", "static license pass reuses honey pig asset");
assertNotContains(indexSource, "forceDeduct: false", "static membership pass probe no longer sends the deprecated coin flag");
assertNotContains(indexSource, "forceDeduct: true", "static paid flows never enable the deprecated coin flag");
assertContains(indexSource, "opts.__cdPaymentGateAuthorized !== true", "static paid service gate checks pass before payment choice");
assertContains(indexSource, "forceRefreshMembershipCoverage: true", "static payment choice pass probe refreshes pass coverage");
assertContains(indexSource, "requireServerPassCheck: true", "static paid services verify pass coverage with server before payment choice");
assertNotContains(indexSource, "fastPassOnly: true", "static paid services must not rely on cache-only pass checks");
assertContains(indexSource, "_cdShouldForceFreshPaidPassCheck(content, cached.result)", "paid precheck cache bypasses stale payment-required pass results");
assertContains(indexSource, "_cdShouldForceFreshPaidPassCheck(content, result)", "paid precheck does not store stale pass payment-required results");
assertContains(indexSource, "_subTier === 'family' ? 999999999", "main shell family policy pass limit");
assertContains(indexSource, "Code Destiny Family 30일", "main shell family payment modal copy");
assertContains(indexSource, "월정석 이벤트 재화 기준", "main shell monthly event currency basis copy");
assertContains(indexSource, "directPaymentBasisLabel", "payment modal displays original value basis");
assertContains(indexSource, "membershipCoverage: (passFirstAccess && passFirstAccess.membershipCoverage)", "pass-first coverage feeds payment modal");
assertContains(indexSource, "passButtonHtml", "pass retry/store card remains in the payment modal");
assertContains(indexSource, "monthlyBalance >= requiredMonthlyCredits", "simple frontend monthly balance check");
assertContains(paymentsSource, "profileLimit: HONEY_PASS_POLICY.standard.maxProfiles", "subscription plan uses shared standard profile policy");
assertContains(paymentsSource, "profileLimit: HONEY_PASS_POLICY.premium.maxProfiles", "subscription plan uses shared premium profile policy");
assertContains(paymentsSource, "profileLimit: HONEY_PASS_POLICY.vvip.maxProfiles", "subscription plan uses shared vvip profile policy");
assertNotContains(paymentsSource, ["pass", "Total", "Uses:"].join(""), "subscription plans do not store service-use counts");
assertNotContains(paymentsSource, ["pass", "Remaining", "Uses"].join(""), "subscription writes do not store remaining service-use counts");
assertNotContains(paymentsSource, ["pass", "Used", "Count"].join(""), "subscription writes do not store service-use counts");
assertContains(paymentsSource, "maxCoveredCoin: HONEY_PASS_POLICY.vvip.maxCoveredCoin", "subscription plan uses shared vvip coin policy");
assertContains(indexSource, "cd-direct-payment-dialog", "legacy direct payment dialog");
assertContains(indexSource, "width:min(520px,100%)", "legacy modal width");
assertContains(indexSource, "min-height:auto", "legacy option height");
assertNotContains(indexSource, 'data-mode="membership"', "payment modal avoids legacy membership mode");
assertNotContains(indexSource, "membershipButtonHtml", "payment modal avoids legacy membership variable");
assertNotContains(indexSource, "_cdResolvePaymentEligibilityForOptions", "payment modal avoids server eligibility helper");
assertContains(indexSource, 'data-mode="cancel"', "cancel button");
assertContains(indexSource, "PortOne V2", "card provider badge");
assertNotContains(indexSource, "getSubscriptionMonthlyCreditCost", "main pass shop does not calculate a monthly-credit pass price");
assertNotContains(indexSource, "buildMembershipMonthlyCreditRequestId", "main pass shop does not build a monthly-credit pass request");
assertNotContains(indexSource, "applyMembershipMonthlyCredit", "main pass shop does not apply a pass from monthly credits");
assertNotContains(indexSource, "confirmGoldenMonthlyCredit", "main pass shop does not render a monthly-credit pass action");
assertNotContains(indexSource, "paymentMethod: 'monthly_credit'", "main pass shop does not submit a monthly-credit pass payment");
// 이용권 구매는 이용권 선검사 대상이 아니므로 상점 모달에 단건결제와 월정석이 항상 함께 떠야 한다.
// 2026-06-16 대량 UI 싱크 커밋이 월정석 버튼 렌더 줄만 지워, 핸들러가 살아있는 채로 도달 불가가 된 적이 있다.
for (const shellPath of [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
]) {
  const shellSource = readFileSync(resolve(root, shellPath), "utf8");
  assertContains(
    shellSource,
    'data-action="confirmGoldenCharge"',
    `${shellPath}: pass shop renders the direct KRW purchase button`,
  );
  assertNotContains(
    shellSource,
    'data-action="confirmGoldenMonthlyCredit"',
    `${shellPath}: pass shop does not render the moonlight-stone purchase button`,
  );
}
// 이용권 결제 진입 경로(/points)의 회귀: 직접 원화 단건 결제만 노출한다.
assertContains(pointsSource, '"Idempotency-Key": idempotencyKey', "points pass prepare sends a stable idempotency key");
assertContains(pointsSource, "startSubscriptionPrepare", "points pass prepare is prefetched when the payment-method modal opens");
assertContains(pointsSource, "runAccessCheckWithTransientRetry", "points payment entry buffers transient 503s");
assertContains(pointsSource, "void handleSubscribe(plan);", "points pass modal keeps the direct payment action");
assertNotContains(pointsSource, "monthlyStoneBalance >= pendingSubscriptionMonthlyCreditCost", "points pass modal has no monthly-credit purchase eligibility gate");

assertContains(fortuneSource, "resolveCanonicalEntitlement", "subscription status uses canonical pass entitlement");
assertContains(fortuneSource, "subscription: 1", "subscription status reads legacy subscription field");
assertContains(fortuneSource, "membership: 1", "subscription status reads legacy membership field");
assertContains(fortuneSource, "pass: 1", "subscription status reads legacy pass field");
assertContains(fortuneSource, "entitlement: 1", "subscription status reads legacy entitlement field");
assertContains(fortuneSource, "membershipCreditBalance", "subscription status returns monthly credit balance");
assertNotContains(billingSource, ["usage", "pass"].join("_"), "billing route does not expose removed usage pass access");
assertContains(billingSource, "buildPassTierMatchValues", "billing pass consume accepts normalized plan/tier aliases");
assertContains(billingSource, "\"profileSubscription.planId\": { $in: tierMatchValues }", "billing pass consume checks profile subscription plan id aliases");
assertContains(billingSource, "transactionType: usage.tier === \"family\" ? \"family_pass\" : \"membership_pass\"", "family pass consume preserves family access type");
assertContains(billingClientSource, "buildLicensePassOverlayMessage", "React billing client builds license pass overlay copy");
assertContains(billingClientSource, 'snapshot.state !== "none" || !hasServerLookupKey', "React billing client does not let inactive snapshots skip server pass checks");
assertContains(billingClientSource, "snapshotPassServerCheckFirst", "React billing client sends active pass snapshots directly to server pass check");
assertContains(billingClientSource, "eligibilityResult = explicitPaymentMode || snapshotPassServerCheckFirst", "React billing client skips duplicate eligibility lookup before server pass check");
assertContains(billingClientSource, "passFirstEligible = explicitPassMode || snapshotPassServerCheckFirst", "React billing client prioritizes pass before payment processing");
assertContains(billingClientSource, "shouldOpenRuntimePaymentFallback", "React billing client opens the unified payment gate after pass-first payment-required responses");
assertContains(billingClientSource, "coin-gate-runtime-fallback", "React payment fallback normalizes runtime payment success");
assertNotContains(tarotPromptMakerSource, "forceDeduct: !Boolean(billingSnapshot?.canAccess)", "tarot prompt maker must not block payment fallback with stale billing snapshot");
assertContains(billingClientSource, "console.log(\"[이용권 체크]\"", "React paid gate logs pass/payment decision while debugging");
assertContains(indexSource, "console.log('[이용권 체크]'", "static paid gate logs pass/payment decision while debugging");
assertContains(billingClientSource, "runtimeData.freeBySubscription === true", "React billing client treats server pass responses as entitlement success");
assertNotContains(billingClientSource, ["pass", "Total", "Uses"].join(""), "React billing client does not restore service-use counters from pass payloads");
assertNotContains(billingClientSource, ["pass", "Remaining", "Uses"].join(""), "React billing client does not restore remaining service-use counters from pass payloads");
assertContains(billingClientSource, "FAMILY 이용권이 적용되었습니다.", "React family license pass success copy");
assertContains(billingClientSource, "deniedStatuses.has(status)", "runtime gate rejects failure statuses");
assertContains(billingClientSource, "isPositiveObject(payload.consume)", "runtime gate validates consume object");
assertNotContains(billingClientSource, "|| Boolean(payload.consume)", "runtime gate must not accept consume object alone");
assertContains(headersSource, "https://pagead2.googlesyndication.com", "AdSense script domain allowed by CSP");

console.log("billing pass policy regression checks passed");
