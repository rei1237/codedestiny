import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const indexSource = readFileSync(resolve(root, "index.html"), "utf8");
const staticIndexSource = readFileSync(resolve(root, "public/static/index.html"), "utf8");
const billingClientSource = readFileSync(resolve(root, "app/_lib/billing-client.ts"), "utf8");
const billingRouteSource = readFileSync(resolve(root, "worker/routes/billing.js"), "utf8");
const paymentsRouteSource = readFileSync(resolve(root, "worker/routes/payments.js"), "utf8");
const tarotLoveSource = readFileSync(resolve(root, "js/tarot-love-experience.js"), "utf8");
const destinyProfileSource = readFileSync(resolve(root, "js/destiny-profile.js"), "utf8");

function assertContains(source, marker, label = marker) {
  assert.ok(source.includes(marker), `${label}: missing marker`);
}

function assertNotContains(source, marker, label = marker) {
  assert.ok(!source.includes(marker), `${label}: unexpected marker`);
}

function assertBefore(source, first, second, label) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.ok(firstIndex >= 0, `${label}: missing first marker`);
  assert.ok(secondIndex >= 0, `${label}: missing second marker`);
  assert.ok(firstIndex < secondIndex, `${label}: order mismatch`);
}

function assertAllBefore(source, beforeMarker, afterMarker, label) {
  let searchFrom = 0;
  let count = 0;
  while (true) {
    const afterIndex = source.indexOf(afterMarker, searchFrom);
    if (afterIndex < 0) break;
    const beforeIndex = source.lastIndexOf(beforeMarker, afterIndex);
    assert.ok(beforeIndex >= 0, `${label}: missing guard before occurrence ${count + 1}`);
    count += 1;
    searchFrom = afterIndex + afterMarker.length;
  }
  assert.ok(count > 0, `${label}: no guarded occurrence found`);
}

function section(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: missing start marker`);
  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `${label}: missing end marker`);
  return source.slice(start, end);
}

assertContains(indexSource, "function _cdChooseServicePaymentMode(options)", "common payment mode selector");
assertContains(indexSource, "function _cdRunDirectKrwCheckout(options)", "common direct KRW checkout");
assertContains(indexSource, "window._cdChooseServicePaymentMode = _cdChooseServicePaymentMode", "payment selector exported");
assertContains(indexSource, "window.__cdChooseServicePaymentModeCanonical = _cdChooseServicePaymentMode", "canonical payment selector exported");
assertContains(indexSource, "window.__cdRestoreCanonicalPaymentMode", "canonical payment selector restore guard");
assertContains(indexSource, "window._cdRunDirectKrwCheckout = _cdRunDirectKrwCheckout", "direct checkout exported");
assertContains(indexSource, "window._cdHasVerifiedServerAccess = _cdHasVerifiedServerAccess", "server access guard exported");
assertContains(indexSource, "fallbackCoverage.source = 'cache_unverified';", "payment modal immediate cache fallback");
const perUseGateSource = section(indexSource, "function _cdRunPerUseCoinGate(", "window.__cdRunPerUseCoinGateFromTile", "per-use gate");
assertBefore(perUseGateSource, "_cdBeginPaidFeatureInFlight(action, paidGateFeatureKey", "await _cdChooseServicePaymentMode({", "paid gate opens before eligibility wait");

assertBefore(indexSource, 'data-mode="pass"', 'data-mode="direct"', "pass option appears before direct card");
assertBefore(indexSource, 'data-mode="direct"', 'data-mode="monthly"', "direct and monthly options both visible");
assertContains(indexSource, "var passDisabledAttr = passEligible ? '' : ' disabled aria-disabled=\"true\"';", "pass disabled state");
assertContains(indexSource, "var passBusy = false;", "pass lookup click lock");
assertContains(indexSource, 'data-payment-status', "payment choice status state");
assertContains(indexSource, "var monthlyButtonHtml = '<button type=\"button\" class=\"cd-direct-payment-option' + monthlyDisabledClass", "monthly option remains visible");

assertBefore(indexSource, "if (!order.merchantUid && _cdIsCheckoutAccessBypass", "await _cdLoadPortOneV2Sdk()", "pass access returns before PortOne SDK");
assertContains(indexSource, "provider: 'PORTONE_V2'", "PortOne provider in checkout payload");
assertContains(indexSource, "pg: 'KG_INICIS'", "KG Inicis pg in checkout payload");
assertContains(indexSource, "window.PortOne.requestPayment(requestData)", "PortOne V2 requestPayment call");
assertContains(indexSource, "storeId: storeId", "PortOne storeId request field");
assertContains(indexSource, "channelKey: channelKey", "PortOne channelKey request field");
assertContains(indexSource, "paymentId: order.merchantUid", "PortOne paymentId request field");

assertBefore(indexSource, "_cdHasVerifiedServerAccess(confirmRes.payload", "return confirmRes.payload", "direct checkout verifies server before success return");
assertAllBefore(indexSource, "_cdHasVerifiedServerAccess", "sessionStorage.setItem('cd_pa_' + action, '1')", "local paid marker guarded by server access");
assertContains(indexSource, "paymentFailed", "payment failed state");
assertContains(indexSource, "결제 검증에 실패했습니다.", "main shell payment verification failure message");

assertContains(billingClientSource, "hasVerifiedBillingAccess", "React billing access guard");
assertBefore(billingClientSource, "if (!hasVerifiedBillingAccess(parsed.data", "markPaidAttemptPaymentSucceeded()", "React billing verifies before success");
assertContains(billingClientSource, "SERVER_ACCESS_GRANT_MISSING", "React server grant missing error");
assertContains(billingClientSource, "서버 권한 검증에 실패했습니다", "React server verification failure message");
assertContains(billingClientSource, "billingCoinGateInFlight", "React in-flight duplicate guard");

assertContains(billingRouteSource, "consumeUsagePassIfAvailable", "pass consume path");
assertContains(billingRouteSource, 'accessMethod: "PASS"', "pass access method");
assertContains(billingRouteSource, 'requestedPaymentMode === "monthly_credit"', "monthly mode stays separate");
assertContains(indexSource, "paymentMode: 'DIRECT_KRW'", "direct mode stays separate");
assertContains(indexSource, "paymentMode: perUseChoice === 'membership' ? 'MEMBERSHIP_PASS' : 'MONTHLY_CREDIT'", "membership and monthly choices stay explicit");
assertContains(billingRouteSource, '"/api/payments/prepare"', "direct payment prepare path");
assertContains(billingRouteSource, '"/api/payments/confirm"', "direct payment confirm path");
assertBefore(billingRouteSource, "const passAccess = await grantPassFreeAccessBeforeCardIfAvailable", '"/api/payments/prepare"', "pass checked before card prepare");
assertBefore(billingRouteSource, "const passAccess = await grantPassFreeAccessBeforeCardIfAvailable", '"/api/payments/confirm"', "pass checked before card confirm");

assertContains(indexSource, "passButtonHtml", "canonical payment modal pass option");
assertContains(indexSource, "_cdResolvePassBeforePaymentChoice(Object.assign({}, opts, {", "canonical pass lookup on pass click");
assertContains(destinyProfileSource, "if (choice === 'pass')", "destiny pass choice grant path");
assertContains(destinyProfileSource, "__cdRestoreCanonicalPaymentMode", "destiny fallback restores canonical selector");
assertContains(destinyProfileSource, "__cdSupportsPassChoice", "destiny fallback requires pass-capable selector");
assertNotContains(destinyProfileSource, "달빛 결제 방식 선택", "legacy two-option moon payment modal removed");
assertNotContains(destinyProfileSource, "openServicePaymentChoiceModal", "legacy destiny payment selector renderer removed");
assertContains(destinyProfileSource, "__cdChooseServicePaymentModeCanonical", "destiny fallback delegates to canonical pass selector");
assertNotContains(destinyProfileSource, "opts.internalMainGate !== true && opts.__cdPaymentGateAuthorized !== true && typeof window.__cdApplyMembershipPassBeforePayment", "destiny no pre-modal pass bottleneck");

assertContains(paymentsRouteSource, "fetchPortOnePayment", "server PortOne verification");
assertContains(paymentsRouteSource, "merchantUid", "merchantUid duplicate key");
assertContains(paymentsRouteSource, "idempotencyKey", "idempotency duplicate key");
assertContains(paymentsRouteSource, "idempotent: true", "idempotent success handling");
assertContains(paymentsRouteSource, "accessGrant", "server access grant response");

assertContains(tarotLoveSource, 'fetch("/api/billing/coin-gate"', "tarot love uses worker billing coin gate");
assertNotContains(tarotLoveSource, 'fetch("/api/fortune/pig-coin/consume"', "tarot love legacy consume bypass removed");
assertContains(tarotLoveSource, "window._cdHasVerifiedServerAccess", "tarot love server access guard");

for (const source of [indexSource, staticIndexSource]) {
  assertContains(source, 'id="cd-main-shell-critical-v20260604"', "critical CSS marker mirrored");
  assertContains(source, 'data-marker="moonstone-pass-ui-v20260605-starlight-cta"', "glass CSS marker mirrored");
  assertContains(source, ".moon-hero{grid-template-columns", "desktop critical layout");
  assertContains(source, "@media (max-width:860px)", "mobile critical layout");
  assertContains(source, ".moon-start-grid{grid-template-columns:1fr}", "mobile card layout fallback");
  assertContains(source, '<link rel="stylesheet" href="/styles/core-ui.css', "core CSS blocking stylesheet");
  assertContains(source, '<link rel="stylesheet" href="/styles/fortune-ui.css', "fortune CSS blocking stylesheet");
}

console.log("[verify-paid-gate-ui-regression] PASS");
