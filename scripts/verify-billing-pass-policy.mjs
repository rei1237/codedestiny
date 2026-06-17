import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { __billingTestUtils } from "../worker/routes/billing.js";
import {
  canUseByPass,
  PASS_LIMITS,
  PASS_LIMITS_KRW,
  PASS_TIERS,
} from "../worker/lib/profile-limits.js";
import { applyPdfPassDiscountToPricing } from "../worker/lib/pdf-pass-discount.js";
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
const billingClientSource = readFileSync(resolve(root, "app/_lib/billing-client.ts"), "utf8");
const pointsSource = readFileSync(resolve(root, "app/points/page.tsx"), "utf8");
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
  if (result.canUseByPass) {
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
assert.equal(canUseByPass(activePass(PASS_TIERS.STANDARD), 30), true, "standard covers 30 coins");
assert.equal(standard30.amountKRW, 3000, "standard 30 amountKRW");
assert.equal(standard30.passLimitKRW, 3000, "standard 30 passLimitKRW");
assertPassFree(standard30, "standard 30");
assertFinalPass(standard30, "monthly", "standard 30 requested monthly");
assertFinalPass(standard30, "card", "standard 30 requested card");

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
assertFinalPass(premium50, "monthly", "premium 50 requested monthly");

const vvip100 = decision({
  pass: activePass(PASS_TIERS.VVIP),
  coinCost: 100,
  monthlyBalance: 1000,
});
assertPassFree(vvip100, "vvip 100");
assertFinalPass(vvip100, "card", "vvip 100 requested card");

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
assert.equal(family690.canUseByPass, true, "family 690: canUseByPass");
assert.equal(family690.canUseByMonthly, false, "family 690: monthly fallback is unnecessary without balance");
assertFinalPass(family690, "card", "family 690 requested card");

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
  featureKey: "premium_pdf_ziwei",
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
  featureKey: "premium_pdf_saju_love_secret",
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
assert.deepEqual(finalAccess(noPassCard, "card"), {
  ok: true,
  accessMethod: "CARD",
  charged: 30,
  monthlyDeducted: false,
  cardCreated: true,
}, "no pass card regression: final card creation");

assertBefore(
  billingSource,
  "if (!directPaymentRequested && paymentDecision.canUseByPass && !passBlockedByAccessDecision)",
  "if (monthlyBalanceRequested)",
  "PASS is evaluated before monthly deduction",
);
assertContains(billingSource, 'accessMethod: "PASS"', "PASS access method response");
assertContains(billingSource, "charged: 0", "PASS charged zero response");
assertContains(billingSource, 'paymentMethod: "PASS"', "PASS usage log marker");
assertContains(billingSource, "recordPassAccessIfNeeded", "PASS usage evidence");
assertContains(billingSource, 'status: "license_passed"', "server returns license_passed access gate result");
assertContains(billingSource, '"family_all_access" : "license_coin_limit"', "family all-access gate reason");
assertContains(billingSource, "featureKey === PROFILE_CARD_MANAGE_FEATURE_KEY && licenseTier !== \"FAMILY\"", "profile card actions emit license pass UI result only for family");
assertNotContains(billingSource, "if (!singleOrMonthlyOnly)", "monthly choice must not block PASS coverage");
assertContains(billingSource, "consumeMembershipCreditIfAvailable", "monthly deduction path remains");
assertContains(billingSource, 'accessMethod: "MONTHLY"', "monthly access method remains");
assertContains(billingSource, 'charged: Number(membershipConsume.coinPrice || 0)', "monthly charged amount remains");
assertContains(billingSource, "source: CONTENT_ENTITLEMENT_SOURCES.COIN", "monthly unlock is not recorded as pass");
assertContains(billingSource, "paymentId: membershipConsume.transactionId || requestId", "monthly unlock keeps transaction evidence");
assertBefore(
  billingSource,
  "const passAccess = await grantPassFreeAccessBeforeCardIfAvailable(request, env, body);",
  'const targetPath = isSubscription ? "/api/payments/subscription/prepare" : "/api/payments/prepare";',
  "PASS is checked before card checkout prepare",
);
assertBefore(
  billingSource,
  "const passAccess = await grantPassFreeAccessBeforeCardIfAvailable(request, env, body);",
  'const targetPath = isSubscription ? "/api/payments/subscription/confirm" : "/api/payments/confirm";',
  "PASS is checked before card confirm",
);
assertContains(billingSource, 'if (passAccess) return passAccess;', "card request stops when PASS is available");
assertContains(billingSource, '"/api/payments/prepare"', "single card prepare path remains");
assertContains(billingSource, '"/api/payments/confirm"', "single card confirm path remains");
assertContains(paymentsSource, "fetchPortOnePayment", "PortOne verification remains");
assertContains(paymentsSource, "PortOne V2 KG Inicis", "KG Inicis public config remains");
assertContains(paymentsSource, 'accessMethod: "CARD"', "card access method remains");
assertContains(paymentsSource, "handleSubscriptionMonthlyCreditConfirm", "subscription pass monthly credit confirm path");
assertContains(paymentsSource, 'paymentMethodHint === "monthly_credit"', "subscription pass monthly credit routing");
assertContains(paymentsSource, 'type: "MONTHLY_CREDIT_SPEND"', "subscription pass monthly credit ledger");
assertNotContains(pointsSource, "onSubscribeWithMonthlyCredit", "subscription pass monthly credit UI handler removed");
assertContains(pointsSource, 'paymentMethod: "monthly_credit"', "subscription pass monthly credit request remains explicit");
assertContains(pointsSource, "PDF 서비스는 상품별 원화 단건 결제", "standard pass PDF single-payment UI");
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
assertContains(indexSource, "var allowMonthlyChoice = !isProfileDeletePayment", "monthly payment excludes profile deletion");
assertContains(indexSource, 'data-mode="pass"', "payment modal shows pass apply option");
assertContains(indexSource, "\\uC774\\uC6A9\\uAD8C \\uC801\\uC6A9", "payment modal pass apply label");
assertContains(indexSource, "FAMILY 이용권이 적용되었습니다.", "static family license pass success copy");
assertContains(indexSource, "membership-honey-kkulkkul.webp", "static license pass reuses honey pig asset");
assertContains(indexSource, "forceDeduct: false", "static membership pass probe never deducts coins");
assertContains(indexSource, "opts.__cdPaymentGateAuthorized !== true", "static paid service gate checks pass before payment choice");
assertContains(indexSource, "requireServerPassCheck: true", "static paid services verify pass coverage with server before payment choice");
assertNotContains(indexSource, "fastPassOnly: true", "static paid services must not rely on cache-only pass checks");
assertContains(indexSource, "_subTier === 'family' ? 999999999", "main shell family policy pass limit");
assertContains(indexSource, "Code Destiny Family 30일", "main shell family payment modal copy");
assertContains(indexSource, "\\uC0C1\\uD488\\uBCC4 \\uC6D0\\uD654 \\uB2E8\\uAC74 \\uACB0\\uC81C", "main shell PDF single-payment modal copy");
assertContains(indexSource, "directPaymentBasisLabel", "payment modal displays original value basis");
assertContains(indexSource, "membershipCoverage: (passFirstAccess && passFirstAccess.membershipCoverage)", "pass-first coverage feeds payment modal");
assertContains(indexSource, "passButtonHtml", "payment modal includes pass card HTML");
assertContains(indexSource, "monthlyBalance >= requiredMonthlyCredits", "simple frontend monthly balance check");
assertContains(indexSource, "cd-direct-payment-dialog", "legacy direct payment dialog");
assertContains(indexSource, "width:min(520px,100%)", "legacy modal width");
assertContains(indexSource, "min-height:auto", "legacy option height");
assertNotContains(indexSource, 'data-mode="membership"', "payment modal avoids legacy membership mode");
assertNotContains(indexSource, "membershipButtonHtml", "payment modal avoids legacy membership variable");
assertNotContains(indexSource, "_cdResolvePaymentEligibilityForOptions", "payment modal avoids server eligibility helper");
assertContains(indexSource, 'data-mode="cancel"', "cancel button");
assertContains(indexSource, "PortOne V2", "card provider badge");
assertContains(indexSource, "getSubscriptionMonthlyCreditCost", "main pass shop monthly credit cost");
assertContains(indexSource, "buildMembershipMonthlyCreditRequestId", "main pass shop monthly credit request id");
assertContains(indexSource, "/api/payments/subscription/confirm", "main pass shop monthly credit purchase API");
assertContains(indexSource, "paymentMethod: 'monthly_credit'", "main pass shop monthly credit payment method");
assertContains(fortuneSource, "normalizeHoneyPassEntitlement", "subscription status uses canonical pass entitlement");
assertContains(fortuneSource, "subscription: 1", "subscription status reads legacy subscription field");
assertContains(fortuneSource, "membership: 1", "subscription status reads legacy membership field");
assertContains(fortuneSource, "pass: 1", "subscription status reads legacy pass field");
assertContains(fortuneSource, "entitlement: 1", "subscription status reads legacy entitlement field");
assertContains(fortuneSource, "membershipCreditBalance", "subscription status returns monthly credit balance");
assertContains(billingSource, "const shouldAutoConsumeUsagePass = !membershipPassOnly", "usage pass auto consume is gated");
assertContains(billingSource, "&& !monthlyBalanceRequested", "usage pass auto consume skips monthly payment");
assertContains(billingSource, "&& !directPaymentRequested", "usage pass auto consume skips direct payment");
assertContains(billingSource, "&& !coinPaymentRequested", "usage pass auto consume skips coin payment");
assertContains(billingSource, "accessType: \"usage_pass\"", "usage pass responses carry explicit access type");
assertContains(billingSource, "freeBySubscription: false", "usage pass responses are not reported as subscription free");
assertContains(billingClientSource, "buildLicensePassOverlayMessage", "React billing client builds license pass overlay copy");
assertContains(billingClientSource, 'snapshot.state !== "none" || !hasServerLookupKey', "React billing client does not let inactive snapshots skip server pass checks");
assertContains(billingClientSource, "runtimeData.freeBySubscription === true", "React billing client treats server pass responses as entitlement success");
assertContains(billingClientSource, "FAMILY 이용권이 적용되었습니다.", "React family license pass success copy");
assertContains(billingClientSource, "deniedStatuses.has(status)", "runtime gate rejects failure statuses");
assertContains(billingClientSource, "isPositiveObject(payload.consume)", "runtime gate validates consume object");
assertNotContains(billingClientSource, "|| Boolean(payload.consume)", "runtime gate must not accept consume object alone");
assertContains(headersSource, "https://pagead2.googlesyndication.com", "AdSense script domain allowed by CSP");

console.log("billing pass policy regression checks passed");
