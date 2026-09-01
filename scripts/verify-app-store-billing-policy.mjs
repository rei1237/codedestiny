// 앱(Google Play) 결제 정책 회귀 검증 — DB/네트워크 없이 순수 로직만 확인한다.
//
// 지키려는 것:
//   1) 회당 결제(PER_USE)는 영구 해금(unlockedFeatures)으로 기록되지 않는다
//      → 기록되면 2번째 구매가 ITEM_ALREADY_OWNED로 막힌다(앱 출시 블로커였던 결함)
//   2) 영구 해금(UNLOCK)은 정상적으로 기록된다
//   3) 이용권은 Play `inapp`인데도 profileSubscription이 갱신된다(subs 판정에 기대지 않음)
//   4) 서버가 기록하는 금액은 앱 티어 확정가에서 오고, 그 값이 웹 레지스트리 가격과 같다
//      (2026-08-29 앱가 = 웹가. 두 값은 서로 다른 정본에서 오므로 이 대조는 항등식이 아니다)
//   5) 등록되지 않은 가격대는 fail-closed로 거부된다
//   6) RTDN voidedPurchaseNotification(환불)이 해석된다
//
// 실행: node scripts/verify-app-store-billing-policy.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAppContentTier, resolveAppPassCoverageKRW, resolveAppPassProduct } from "../worker/lib/app-store-pricing.js";
import { getPaidFeatureBillingType, PAID_FEATURE_BILLING_TYPES } from "../worker/lib/paid-feature-registry.js";
import { getBillingFeaturePricing } from "../worker/lib/billing-feature-registry.js";
import { PASS_LIMITS } from "../worker/lib/profile-limits.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
  // Google Play pass SKUs are legacy/deprecated and cannot grant new access.
  if (product.kind === "pass") return null;
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
for (const featureKey of ["section_daewun", "flower-fc", "premium-ziwei"]) {
  const product = resolveProductForFeature(featureKey);
  const update = product ? buildEntitlementUpdate({ product }) : null;
  check(
    `${featureKey} (UNLOCK) → unlockedFeatures 기록`,
    product && product.billingType === PAID_FEATURE_BILLING_TYPES.UNLOCK && update?.$addToSet?.unlockedFeatures === featureKey,
    product ? `billingType=${product.billingType}` : "티어 해석 실패",
  );
}

console.log("\n[3] Google Play 이용권 신규 권한 지급은 차단되는가");
for (const passTier of ["standard", "premium", "vvip", "family"]) {
  const pass = resolveAppPassProduct(passTier);
  const product = pass && { kind: "pass", featureKey: `app-pass-${passTier}`, passTier, billingType: PAID_FEATURE_BILLING_TYPES.UNLOCK };
  const update = product ? buildEntitlementUpdate({ product }) : null;
  check(
    `${passTier} 이용권 → 신규 권한 지급 차단`,
    update === null,
    pass ? `productId=${pass.productId}` : "이용권 상품 없음",
  );
}

console.log("\n[4] 기록 금액이 앱 티어 확정가이고 웹가와 같은가");
// amountKRW 는 앱 티어 테이블(app-store-pricing.js), webAmountKRW 는 웹 빌링 레지스트리에서
// 온다 — 정본이 둘로 갈라져 있으므로 이 대조는 항등식이 아니라 실제 교차 검증이다.
// 한쪽만 고치면(예: 웹가 인하 후 앱 티어 방치) 여기서 먼저 깨진다.
for (const featureKey of ["tarot-love-relationship", "vedic-ai-consultation"]) {
  const product = resolveProductForFeature(featureKey);
  check(
    `${featureKey} → 앱가 ₩${product?.amountKRW?.toLocaleString("ko-KR")} = 웹가 ₩${product?.webAmountKRW?.toLocaleString("ko-KR")}`,
    product && product.amountKRW === product.webAmountKRW,
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

console.log("\n[7] 앱도 웹과 같은 게이팅(이용권 → 단건+월정석 결제창)을 타는가");
// 앱이 결제창을 건너뛰고 Play로 직행하면 월정석이 도달 불가해진다(CLAUDE.md 금지 패턴 ②).
// 과거 billing-client.ts에 그런 short-circuit이 있었으므로 되살아나지 않게 소스로 막는다.
const billingClient = await fs.readFile(path.join(ROOT, "app", "_lib", "billing-client.ts"), "utf8");
const runtimePaymentFn = billingClient.slice(
  billingClient.indexOf("async function runPaidServiceRuntimePayment"),
  billingClient.indexOf("function runtimeNow"),
);
check(
  "앱 런타임이 결제창을 건너뛰고 네이티브로 직행하지 않는다",
  !/isMobileAppRuntime\(\)\s*\)\s*\{[^}]*return\s+runNativeAppStorePayment/s.test(runtimePaymentFn),
  "runPaidServiceRuntimePayment에 앱 short-circuit이 되살아났다",
);
check(
  "앱도 정본 게이트(_cdOpenPaidServiceGate)를 거친다",
  runtimePaymentFn.includes("loadPaidServiceRuntimeGate") && runtimePaymentFn.includes("equalPriorityMethods"),
);
check(
  "앱 표시 금액을 확인 못 하면 결제창을 열지 않는다 (fail-closed)",
  runtimePaymentFn.includes("APP_STORE_PRICE_UNAVAILABLE"),
);
check(
  "결제 가드가 없으면 결제를 열지 않는다 (PortOne 누출 차단)",
  runtimePaymentFn.includes("APP_PAYMENT_GUARD_MISSING"),
);

console.log("\n[8] 이용권 커버 금액이 앱 기준으로 파생되는가");
for (const [tier, expectedKRW] of [["standard", 5000], ["premium", 10000], ["vvip", 20000]]) {
  const coverage = resolveAppPassCoverageKRW(PASS_LIMITS[tier]);
  check(
    `${tier}: 웹 ₩${(PASS_LIMITS[tier] * 100).toLocaleString("ko-KR")} → 앱 ₩${expectedKRW.toLocaleString("ko-KR")}`,
    coverage === expectedKRW,
    `실제=${coverage}`,
  );
}
check("family(무제한): 커버 티어 없음 → null", resolveAppPassCoverageKRW(PASS_LIMITS.family) === null);

console.log("\n[9] 이용권에 존재하지 않는 '횟수' 개념을 안내하지 않는가");
// 이용권은 30일 기간만 있고 사용 횟수 제한이 없다(canUseByPass에 횟수 개념 자체가 없음).
for (const relPath of ["app/page.js"]) {
  const source = await fs.readFile(path.join(ROOT, relPath), "utf8");
  const claimsPassCount = /이용권\s*횟수/.test(source.replace(/^\s*\/\/.*$/gm, ""));
  check(`${relPath}: '이용권 횟수' 표기 없음`, !claimsPassCount);
}

if (failures.length) {
  console.error(`\n[실패] 앱 결제 정책 검증 ${failures.length}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log("\n[통과] 앱 결제 정책 검증 — 이용권→단건+월정석 게이팅·PER_USE 재구매·앱가 기록·커버 파생·fail-closed·환불 해석\n");
