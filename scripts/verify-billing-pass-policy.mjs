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

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const billingSource = readFileSync(resolve(root, "worker/routes/billing.js"), "utf8");
const paymentsSource = readFileSync(resolve(root, "worker/routes/payments.js"), "utf8");
const indexSource = readFileSync(resolve(root, "index.html"), "utf8");

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
      membershipCreditCost: coinCost,
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

function assertBefore(source, first, second, label) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.ok(firstIndex >= 0, `${label}: missing first marker`);
  assert.ok(secondIndex >= 0, `${label}: missing second marker`);
  assert.ok(firstIndex < secondIndex, `${label}: order`);
}

const bronze30 = decision({
  pass: activePass(PASS_TIERS.BRONZE),
  coinCost: 30,
  monthlyBalance: 100,
});
assert.equal(canUseByPass(activePass(PASS_TIERS.BRONZE), 30), true, "BRONZE covers 30 coins");
assertPassFree(bronze30, "BRONZE 30");
assertFinalPass(bronze30, "monthly", "BRONZE 30 requested monthly");
assertFinalPass(bronze30, "card", "BRONZE 30 requested card");

const bronze50 = decision({
  pass: activePass(PASS_TIERS.BRONZE),
  coinCost: 50,
  monthlyBalance: 100,
});
assertPaidFallback(bronze50, "BRONZE 50");

const silver50 = decision({
  pass: activePass(PASS_TIERS.SILVER),
  coinCost: 50,
  monthlyBalance: 100,
});
assertPassFree(silver50, "SILVER 50");
assertFinalPass(silver50, "monthly", "SILVER 50 requested monthly");

const gold100 = decision({
  pass: activePass(PASS_TIERS.GOLD),
  coinCost: 100,
  monthlyBalance: 200,
});
assertPassFree(gold100, "GOLD 100");
assertFinalPass(gold100, "card", "GOLD 100 requested card");

const gold200 = decision({
  pass: activePass(PASS_TIERS.GOLD),
  coinCost: 200,
  monthlyBalance: 300,
});
assertPaidFallback(gold200, "GOLD 200");

const expiredPass = activePass(PASS_TIERS.GOLD, pastDate());
const expiredGold50 = decision({
  pass: expiredPass,
  coinCost: 50,
  monthlyBalance: 100,
});
assert.equal(canUseByPass(expiredPass, 50), false, "expired pass must not cover");
assertPaidFallback(expiredGold50, "expired GOLD 50");

const noPassMonthly = decision({
  coinCost: 30,
  monthlyBalance: 30,
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
  "if (paymentDecision.canUseByPass)",
  "if (monthlyBalanceRequested)",
  "PASS is evaluated before monthly deduction",
);
assertContains(billingSource, 'accessMethod: "PASS"', "PASS access method response");
assertContains(billingSource, "charged: 0", "PASS charged zero response");
assertContains(billingSource, 'paymentMethod: "PASS"', "PASS usage log marker");
assertContains(billingSource, "recordPassAccessIfNeeded", "PASS usage evidence");
assertContains(billingSource, "consumeMembershipCreditIfAvailable", "monthly deduction path remains");
assertContains(billingSource, 'accessMethod: "MONTHLY"', "monthly access method remains");
assertContains(billingSource, 'charged: Number(membershipConsume.coinPrice || 0)', "monthly charged amount remains");
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

assertBefore(
  indexSource,
  'data-pass-state="covered"',
  'data-mode="direct"',
  "payment modal shows pass card before card payment",
);
assertBefore(
  indexSource,
  'data-mode="direct"',
  'data-mode="monthly"',
  "payment modal shows card before monthly",
);
assertContains(indexSource, "이용권으로 바로 이용하기", "covered pass CTA");
assertContains(indexSource, "현재 이용권 한도 초과", "over-limit pass card");
assertContains(indexSource, "달빛 이용권으로 더 편하게 이용하기", "empty pass card");
assertContains(indexSource, "차감 없음", "no deduction label");
assertContains(indexSource, 'border-color:rgba(180,83,9,.50)', "BRONZE style");
assertContains(indexSource, 'border-color:rgba(226,232,240,.50)', "SILVER style");
assertContains(indexSource, 'border-color:rgba(253,224,71,.60)', "GOLD style");
assertContains(indexSource, "min-height:118px", "mobile touch target height");
assertContains(indexSource, "linear-gradient(145deg,rgba(15,23,42,.88),rgba(2,6,23,.72))", "dark modal backdrop");
assertContains(indexSource, 'data-mode="cancel"', "cancel button");
assertContains(indexSource, "_cdResolvePaymentEligibilityForOptions", "common eligibility helper");
assertContains(indexSource, "/api/billing/unlock-status?", "server eligibility endpoint");
assertContains(indexSource, "PortOne V2 · KG이니시스", "card provider badge");

console.log("billing pass policy regression checks passed");
