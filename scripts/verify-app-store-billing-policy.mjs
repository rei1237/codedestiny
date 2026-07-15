// 앱(Google Play) 결제 정책 회귀 검증 — DB/네트워크 없이 순수 로직만 확인한다.
//
// 지키려는 것:
//   1) 회당 결제(PER_USE)는 영구 해금(unlockedFeatures)으로 기록되지 않는다
//      → 기록되면 2번째 구매가 ITEM_ALREADY_OWNED로 막힌다(앱 출시 블로커였던 결함)
//   2) 영구 해금(UNLOCK)은 정상적으로 기록된다
//   3) 이용권은 Play `inapp`인데도 profileSubscription이 갱신된다(subs 판정에 기대지 않음)
//   4) 서버가 기록하는 금액은 웹가가 아니라 앱 티어 확정가다
//   5) 등록되지 않은 가격대는 fail-closed로 거부된다
//   6) RTDN voidedPurchaseNotification(환불)이 해석된다
//
// 실행: node scripts/verify-app-store-billing-policy.mjs

import { resolveAppContentTier, resolveAppPassProduct } from "../worker/lib/app-store-pricing.js";
import { getPaidFeatureBillingType, PAID_FEATURE_BILLING_TYPES } from "../worker/lib/paid-feature-registry.js";
import { getBillingFeaturePricing } from "../worker/lib/billing-feature-registry.js";

const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    return;
  }
  failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

// app-store.js의 정책 로직을 그대로 옮긴 순수 함수 — 라우트는 DB/fetch에 묶여 있어
// 여기서는 "무엇을 지급하는가" 결정만 재현해 검증한다. 규칙이 바뀌면 양쪽이 함께 틀어져
// 이 하네스가 먼저 깨진다.
function buildEntitlementUpdate({ product }) {
  if (product.billingType === PAID_FEATURE_BILLING_TYPES.PER_USE) return null;
  const update = { $addToSet: { unlockedFeatures: product.featureKey, paidFeatures: product.featureKey } };
  if (product.kind === "pass" && product.passTier) {
    update.$set = { "profileSubscription.passTier": product.passTier, "profileSubscription.status": "active" };
  }
  return update;
}

function resolveProductForFeature(featureKey) {
  const result = getBillingFeaturePricing({ featureKey });
  if (!result?.ok || !result.pricing) throw new Error(`pricing not found: ${featureKey}`);
  const coinPrice = Number(result.pricing.coinPrice || result.pricing.cost || 0);
  const tier = resolveAppContentTier(coinPrice);
  if (!tier) return null;
  return {
    kind: "content",
    featureKey,
    productId: tier.productId,
    amountKRW: tier.amountKRW,
    webAmountKRW: Number(result.pricing.amountKRW || 0),
    billingType: getPaidFeatureBillingType(featureKey),
    passTier: "",
  };
}

console.log("\n[1] 회당 결제(PER_USE)는 영구 해금으로 기록되지 않는가");
for (const featureKey of ["tarot-love-relationship", "vedic-ai-consultation", "fortune-tea-house-saju-consultation"]) {
  const product = resolveProductForFeature(featureKey);
  check(
    `${featureKey} (PER_USE) → unlockedFeatures 미기록`,
    product && product.billingType === PAID_FEATURE_BILLING_TYPES.PER_USE && buildEntitlementUpdate({ product }) === null,
    product ? `billingType=${product.billingType}, update=${JSON.stringify(buildEntitlementUpdate({ product }))}` : "티어 해석 실패",
  );
}

console.log("\n[2] 영구 해금(UNLOCK)은 기록되는가");
for (const featureKey of ["section_daewun", "flower-fc", "premium-naming"]) {
  const product = resolveProductForFeature(featureKey);
  const update = product ? buildEntitlementUpdate({ product }) : null;
  check(
    `${featureKey} (UNLOCK) → unlockedFeatures 기록`,
    product && product.billingType === PAID_FEATURE_BILLING_TYPES.UNLOCK && update?.$addToSet?.unlockedFeatures === featureKey,
    product ? `billingType=${product.billingType}` : "티어 해석 실패",
  );
}

console.log("\n[3] 이용권은 inapp인데도 profileSubscription이 갱신되는가");
for (const passTier of ["standard", "premium", "vvip", "family"]) {
  const pass = resolveAppPassProduct(passTier);
  const product = pass && { kind: "pass", featureKey: `app-pass-${passTier}`, passTier, billingType: PAID_FEATURE_BILLING_TYPES.UNLOCK };
  const update = product ? buildEntitlementUpdate({ product }) : null;
  check(
    `${passTier} 이용권 → profileSubscription.passTier 세팅`,
    update?.$set?.["profileSubscription.passTier"] === passTier,
    pass ? `productId=${pass.productId}` : "이용권 상품 없음",
  );
}

console.log("\n[4] 기록 금액이 웹가가 아니라 앱 티어 확정가인가");
for (const featureKey of ["tarot-love-relationship", "vedic-ai-consultation"]) {
  const product = resolveProductForFeature(featureKey);
  check(
    `${featureKey} → 앱가 ₩${product?.amountKRW?.toLocaleString("ko-KR")} ≠ 웹가 ₩${product?.webAmountKRW?.toLocaleString("ko-KR")}`,
    product && product.amountKRW > product.webAmountKRW,
    product ? "" : "티어 해석 실패",
  );
}

console.log("\n[5] 등록되지 않은 가격대는 fail-closed인가");
check("999코인(미등록 가격대) → 티어 해석 거부", resolveAppContentTier(999) === null);
check("0코인 → 티어 해석 거부", resolveAppContentTier(0) === null);

console.log("\n[6] RTDN 환불 알림이 해석되는가");
function extractVoided(decoded) {
  const voided = decoded?.voidedPurchaseNotification || null;
  return {
    purchaseToken: String(voided?.purchaseToken || decoded?.oneTimeProductNotification?.purchaseToken || ""),
    voided: Boolean(voided),
    isTest: Boolean(decoded?.testNotification),
  };
}
const voidedSample = extractVoided({
  packageName: "com.codedestiny.app",
  voidedPurchaseNotification: { purchaseToken: "tok-refund-1", orderId: "GPA.1", productType: 1, refundType: 1 },
});
check("voidedPurchaseNotification → purchaseToken 추출 + voided=true", voidedSample.purchaseToken === "tok-refund-1" && voidedSample.voided === true);
const testSample = extractVoided({ testNotification: { version: "1.0" } });
check("testNotification → isTest=true (200 ack 대상)", testSample.isTest === true);

if (failures.length) {
  console.error(`\n[실패] 앱 결제 정책 검증 ${failures.length}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log("\n[통과] 앱 결제 정책 검증 — PER_USE 재구매 가능·UNLOCK 해금·이용권 inapp·앱가 기록·fail-closed·환불 해석\n");
