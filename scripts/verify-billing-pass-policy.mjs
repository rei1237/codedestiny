import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { __billingTestUtils } from "../worker/routes/billing.js";
import {
  canUseByPass,
  PASS_LIMITS,
  PASS_TIERS,
} from "../worker/lib/profile-limits.js";
import { applyPdfPassDiscountToPricing } from "../worker/lib/pdf-pass-discount.js";

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
assert.equal(canUseByPass(activePass(PASS_TIERS.STANDARD), 30), true, "standard covers 30 coins");
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

const discountedPdf = applyPdfPassDiscountToPricing({
  featureKey: "premium_pdf_ziwei",
  billingType: "pdf",
  cost: 590,
  coinPrice: 590,
  amountKRW: 59000,
  cashPrice: 59000,
  membershipCreditCost: 5900,
}, activePass(PASS_TIERS.PREMIUM));
assert.equal(discountedPdf.coinPrice, 540, "premium pass discounts PDF by 50 coins");
const discountedPdfDecision = decision({
  pass: activePass(PASS_TIERS.PREMIUM),
  coinCost: discountedPdf.coinPrice,
  monthlyBalance: 5400,
});
assert.equal(discountedPdfDecision.canUseByPass, false, "discounted PDF remainder must not be pass-covered again");

const smallPdfRemainder = applyPdfPassDiscountToPricing({
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
  smallPdfRemainder,
  { membershipCreditBalance: 200 },
);
assert.equal(smallPdfRemainder.coinPrice, 20, "standard pass discounts small PDF by 30 coins");
assert.equal(smallPdfDecision.canUseByPass, false, "small discounted PDF remainder still requires payment");
assert.equal(smallPdfDecision.canUseByMonthly, true, "small discounted PDF remainder can use monthly credit");

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
  "if (paymentDecision.canUseByPass && !passBlockedByAccessDecision)",
  "if (monthlyBalanceRequested)",
  "PASS is evaluated before monthly deduction",
);
assertContains(billingSource, 'accessMethod: "PASS"', "PASS access method response");
assertContains(billingSource, "charged: 0", "PASS charged zero response");
assertContains(billingSource, 'paymentMethod: "PASS"', "PASS usage log marker");
assertContains(billingSource, "recordPassAccessIfNeeded", "PASS usage evidence");
assertContains(billingSource, 'status: "license_passed"', "server returns license_passed access gate result");
assertContains(billingSource, '"family_all_access" : "license_coin_limit"', "family all-access gate reason");
assertContains(billingSource, "if (featureKey === PROFILE_CARD_MANAGE_FEATURE_KEY) return null;", "profile card actions do not emit license pass UI result");
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
assertContains(pointsSource, "onSubscribeWithMonthlyCredit", "subscription pass monthly credit UI handler");
assertContains(pointsSource, 'paymentMethod: "monthly_credit"', "subscription pass monthly credit request");
assertContains(pointsSource, "Moonlight Stone {monthlyCreditCost.toLocaleString", "subscription pass monthly credit CTA");
assertContains(pointsSource, "subscriptions?: Record<string, unknown>[]", "points page reads payments/me subscriptions");
assertContains(pointsSource, "normalizeSubscriptionStatusFromPayload", "points page normalizes subscription payloads");
assertContains(pointsSource, "mergeSubscriptionState", "points page merges server subscription state");
assertContains(pointsSource, "<SubscriptionStatusCard subscription={subscription} monthlyCredits={currentMonthlyCredits} />", "points page passes monthly credits to status card");
assertContains(pointsSource, "PDF 생성 시 30코인 자동 할인", "standard pass PDF discount UI");
assertContains(pointsSource, "프로필 추가·수정·삭제 무료, 제한 없음", "family profile unlimited UI");
assertContains(pointsSource, "formatSubscriptionPlanPolicy", "subscription pass policy formatter");
assertContains(statusCardSource, "Family 이용권으로 모든 서비스가 무료 처리됩니다.", "family status card policy");
assertContains(statusCardSource, "일반 한도 초과 서비스는 기존가 결제, PDF는 할인 후 잔액 결제됩니다.", "non-family paid service/PDF status policy");
assertNotContains(paymentsSource, '"profileSubscription.membershipCreditBalance": 0,\n        "profileSubscription.membershipCreditGranted": 0,\n        "profileSubscription.membershipCreditUsed": 0,', "card pass confirm must preserve monthly credit ledger");

assertBefore(
  indexSource,
  'data-mode="direct"',
  'data-mode="monthly"',
  "payment modal shows card before monthly",
);
assertContains(indexSource, 'class="cd-direct-payment-option" data-mode="direct"', "single payment CTA");
assertContains(indexSource, "var monthlyButtonHtml", "monthly payment CTA");
assertContains(indexSource, 'data-mode="monthly"', "monthly payment mode marker");
assertContains(indexSource, 'data-mode="pass"', "payment modal shows pass apply option");
assertContains(indexSource, "\\uC774\\uC6A9\\uAD8C \\uC801\\uC6A9", "payment modal pass apply label");
assertContains(indexSource, "FAMILY 꿀단지 혜택이 적용되었어요", "static family license pass success copy");
assertContains(indexSource, "membership-honey-kkulkkul.webp", "static license pass reuses honey pig asset");
assertContains(indexSource, "forceDeduct: false", "static membership pass probe never deducts coins");
assertContains(indexSource, "_subTier === 'family' ? 999999999", "main shell family policy pass limit");
assertContains(indexSource, "Code Destiny Family 30일", "main shell family payment modal copy");
assertContains(indexSource, "PDF \\uD560\\uC778 \\uC790\\uB3D9 \\uC801\\uC6A9", "main shell PDF discount modal copy");
assertContains(indexSource, "directCoinLabel", "payment modal displays discounted coin basis");
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
assertContains(billingClientSource, "buildLicensePassOverlayMessage", "React billing client builds license pass overlay copy");
assertContains(billingClientSource, "FAMILY 꿀단지 혜택이 적용되었어요", "React family license pass success copy");
assertContains(headersSource, "https://pagead2.googlesyndication.com", "AdSense script domain allowed by CSP");

console.log("billing pass policy regression checks passed");
