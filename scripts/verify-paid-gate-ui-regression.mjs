import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const indexSource = readFileSync(resolve(root, "index.html"), "utf8");
const staticIndexSource = readFileSync(resolve(root, "public/static/index.html"), "utf8");
const billingClientSource = readFileSync(resolve(root, "app/_lib/billing-client.ts"), "utf8");
const paymentProcessingContextSource = readFileSync(resolve(root, "app/components/PaymentProcessingContext.tsx"), "utf8");
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
assertContains(indexSource, "window.__cdDirectPaymentChoiceActive", "direct payment choice active modal lock");
assertContains(indexSource, "_cdHasActivePaidServiceSingleFlight('__cdPaidServiceGateInFlight'", "global paid gate duplicate lock");
assertContains(indexSource, "fallbackCoverage.source = 'cache_unverified';", "payment modal immediate cache fallback");
const perUseGateSource = section(indexSource, "function _cdRunPerUseCoinGate(", "window.__cdRunPerUseCoinGateFromTile", "per-use gate");
assertBefore(perUseGateSource, "_cdBeginPaidFeatureInFlight(action, paidGateFeatureKey", "await _cdChooseServicePaymentMode({", "paid gate opens before eligibility wait");

assertBefore(indexSource, 'data-mode="pass-store"', 'data-mode="direct"', "pass store option appears before direct card");
assertContains(indexSource, 'data-mode="monthly" data-monthly-option', "monthly payment option restored");
assertContains(indexSource, "var passMode = 'pass-store';", "pass store mode");
assertContains(indexSource, "var passDisabledClass = ' is-store';", "pass store visual state");
assertContains(indexSource, "direct-payment-pass-store-v20260607", "pass store modal marker");
assertContains(indexSource, "if (mode === 'pass-store' || mode === 'pass')", "pass store choice bypasses payment processing");
assertContains(indexSource, "window.location.assign('/points?source=direct-payment-pass-store');", "pass store redirect");
assertContains(indexSource, 'data-payment-status', "payment choice status state");
assertContains(indexSource, "var allowMonthlyChoice = paymentModeAllowed(['monthly', 'monthly_credit', 'moonlight_stone', 'membership_credit'])", "monthly option includes profile add/delete");

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
assertContains(indexSource, "honey-fortune-logo-payment-ux-v20260618", "honey fortune logo payment ux marker");
assertContains(indexSource, "/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp", "payment/pass overlay uses honey fortune logo");
assertContains(indexSource, "sajuLoaderHoneyLogoFloat", "payment/pass waiting logo float animation");
assertContains(indexSource, "HONEY FORTUNE PASS", "pass applied success copy");
assertContains(indexSource, "HONEY FORTUNE PAID", "payment complete success copy");
assertContains(indexSource, "saju-payment-copy-front-v20260619", "payment/pass waiting copy front marker");
const honeyOverlayTextCss = section(
  indexSource,
  '#sajuLoaderOverlay[data-marker~="honey-fortune-logo-payment-ux-v20260618"] .saju-loader-eyebrow,',
  '#sajuLoaderOverlay[data-mode=payment][data-marker~="honey-fortune-logo-payment-ux-v20260618"] .saju-loader-progress',
  "honey payment overlay text css"
);
assertContains(honeyOverlayTextCss, "position: relative !important", "payment/pass waiting copy is visible");
assertContains(honeyOverlayTextCss, "z-index: 4", "payment/pass waiting copy stays in front");
assertContains(honeyOverlayTextCss, "white-space: normal !important", "payment/pass waiting copy wraps");
assertContains(honeyOverlayTextCss, "overflow-wrap: break-word", "payment/pass waiting copy avoids overflow");
assertNotContains(honeyOverlayTextCss, "position: absolute !important", "payment/pass waiting copy must not be visually hidden");
assertNotContains(honeyOverlayTextCss, "clip: rect", "payment/pass waiting copy must not be clipped");
assertContains(indexSource, ".cd-paid-gate__sprite-frame{position:relative;width:100%;height:100%;background-image:url(\"/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp", "paid gate sprite uses honey fortune logo");
assertNotContains(indexSource, "window.alert('단건 결제가 완료되어 열람되었습니다.');", "single payment success uses designed overlay instead of alert");
assertNotContains(indexSource, "window.alert(_cdIsMembershipFreePayload(result.payload) ? '이용권으로 열람되었습니다.' : '월정석 결제가 완료되었습니다.');", "unlock monthly/pass success uses designed overlay instead of alert");
assertNotContains(indexSource, "window.alert(_cdIsMembershipFreePayload(r.payload) ? '이용권으로 열람되었습니다.' : '월정석 결제가 완료되었습니다.');", "tile monthly/pass success uses designed overlay instead of alert");

assertContains(billingClientSource, "hasVerifiedBillingAccess", "React billing access guard");
assertBefore(billingClientSource, "if (!hasVerifiedBillingAccess(parsed.data", "markPaidAttemptPaymentSucceeded()", "React billing verifies before success");
assertContains(billingClientSource, "SERVER_ACCESS_GRANT_MISSING", "React server grant missing error");
assertContains(billingClientSource, "서버 권한 검증에 실패했습니다", "React server verification failure message");
assertContains(billingClientSource, "billingCoinGateInFlight", "React in-flight duplicate guard");
assertContains(billingClientSource, "const BILLING_FETCH_CHECKOUT_TIMEOUT_MS = 30000;", "React checkout timeout is long enough for PG setup");
assertContains(billingClientSource, "const BILLING_FETCH_CONFIRM_TIMEOUT_MS = 45000;", "React confirm timeout is long enough for payment verification");
assertContains(billingClientSource, 'normalizedPath.startsWith("/api/billing/coin-gate")) return BILLING_FETCH_CONFIRM_TIMEOUT_MS;', "React coin gate uses confirm timeout");
assertContains(billingClientSource, 'normalizedPath.startsWith("/api/billing/confirm")) return BILLING_FETCH_CONFIRM_TIMEOUT_MS;', "React billing confirm uses confirm timeout");
assertNotContains(billingClientSource, "BILLING_FETCH_MUTATION_TIMEOUT_MS", "React payment verification must not use shared 14s mutation timeout");
assertContains(billingClientSource, "function isMonthlyCreditAccessType", "React billing has monthly-credit access resolver");
assertContains(billingClientSource, "function resolveAppliedBillingPayment", "React billing resolves applied payment method from server response");
assertContains(billingClientSource, "const monthlyApplied = candidates.some(isMonthlyCreditAccessType);", "React monthly-credit success is resolved before pass success");
assertContains(billingClientSource, "resolveAppliedBillingPayment(runtimeData, requestedMode, passFirstEligible", "React coin-gate success uses applied payment resolver");
const reactWaitKindSource = section(billingClientSource, "function resolvePaymentWaitKind(", "function formatLoadingMessage", "React payment wait kind");
assertBefore(reactWaitKindSource, 'if (mode === "MOONLIGHT_STONE"', 'if (mode === "MEMBERSHIP_PASS"', "React wait kind checks monthly before pass");
assertContains(reactWaitKindSource, "membership_credit", "React wait kind treats membership_credit as monthly");
assertNotContains(reactWaitKindSource, "이용권으로|membership", "React pass wait kind must not use broad membership regex");

const reactBillingOverlayOwnershipSource = section(billingClientSource, "function paymentLoadingOwnsPaidFeatureStatus(", "function resolvePaymentWaitKind", "React billing overlay ownership");
assertNotContains(reactBillingOverlayOwnershipSource, '"paymentWindowOpen"', "React billing must not keep overlay during external PG window");
const reactBillingGateEmitSource = section(billingClientSource, "function emitPaidFeatureGate(", "function resolvePaidFeatureInFlightKey", "React billing paid gate emit");
assertBefore(reactBillingGateEmitSource, 'if (action !== "close" && isExternalPaymentWindowStatus(status))', 'if (action !== "close" && paymentLoadingOwnsPaidFeatureStatus(status))', "React billing closes overlays before PG window owns focus");
assertContains(reactBillingGateEmitSource, "emitPaymentLoadingState(false);", "React billing closes payment overlay for PG window");
const reactProviderOverlayOwnershipSource = section(paymentProcessingContextSource, "function paymentLoadingOwnsPaidFeatureStatus(", "function resolvePaidFeatureStatusOverlay", "React provider overlay ownership");
assertNotContains(reactProviderOverlayOwnershipSource, '"paymentWindowOpen"', "React provider must not keep overlay during external PG window");
const reactProviderOpenSource = section(paymentProcessingContextSource, "const open = useCallback", "const update = useCallback", "React provider open");
assertBefore(reactProviderOpenSource, "if (isExternalPaymentWindowStatus(status))", "if (paymentLoadingOwnsPaidFeatureStatus(status))", "React provider closes overlays before opening payment loading");
const reactProviderUpdateSource = section(paymentProcessingContextSource, "const update = useCallback", "const preload = useCallback", "React provider update");
assertBefore(reactProviderUpdateSource, "if (isExternalPaymentWindowStatus(requestedStatus))", "if (paymentLoadingOwnsPaidFeatureStatus(requestedStatus))", "React provider update closes overlays before payment loading");
const reactOverlayApplySource = section(paymentProcessingContextSource, "const applyReactPaymentOverlay = useCallback", "useEffect(() => {", "React payment overlay apply");
assertBefore(reactOverlayApplySource, "if (!previous.open) {", "stopProcessing();", "React provider closes directly-started payment overlay on global close");
assertContains(reactOverlayApplySource, "closeProcessingNow();", "React provider direct payment overlay close");

assertContains(billingRouteSource, "consumeUsagePassIfAvailable", "pass consume path");
assertContains(billingRouteSource, 'accessMethod: "PASS"', "pass access method");
assertContains(billingRouteSource, 'requestedPaymentMode === "monthly_credit"', "monthly mode stays separate");
assertContains(indexSource, "paymentMode: 'DIRECT_KRW'", "direct mode stays separate");
assertContains(indexSource, "paymentMode: 'MOONLIGHT_STONE'", "post-modal monthly route remains explicit");
assertNotContains(indexSource, "perUseChoice === 'membership' ? 'MEMBERSHIP_PASS' : 'MOONLIGHT_STONE'", "post-modal per-use route cannot fall back to membership pass");
assertNotContains(indexSource, "paymentChoice === 'membership' ? 'MEMBERSHIP_PASS' : 'MOONLIGHT_STONE'", "post-modal unlock route cannot fall back to membership pass");
assertNotContains(indexSource, "tilePaymentChoice === 'membership' ? 'MEMBERSHIP_PASS' : 'MOONLIGHT_STONE'", "post-modal tile route cannot fall back to membership pass");
assertContains(billingRouteSource, '"/api/payments/prepare"', "direct payment prepare path");
assertContains(billingRouteSource, '"/api/payments/confirm"', "direct payment confirm path");
assertBefore(billingRouteSource, "const passAccess = await grantPassFreeAccessBeforeCardIfAvailable", '"/api/payments/prepare"', "pass checked before card prepare");
assertBefore(billingRouteSource, "const passAccess = await grantPassFreeAccessBeforeCardIfAvailable", '"/api/payments/confirm"', "pass checked before card confirm");

assertContains(indexSource, "passButtonHtml", "canonical payment modal pass store option");
assertContains(indexSource, "var allowPassChoice = opts.disablePassChoice !== true", "pass option is available by default unless explicitly disabled");
assertContains(indexSource, "passChoiceMessage = '이용권은 결제창을 열기 전에만 확인됩니다.", "post-modal pass choice is blocked");
assertContains(indexSource, "window.location.assign('/points?source=direct-payment-pass-store');", "canonical pass choice opens pass store");
assertNotContains(indexSource, "reason: 'pass_applied_in_modal'", "membership pass choice must grant instead of cancelling");
assertContains(destinyProfileSource, "if (choice === 'pass')", "destiny pass choice grant path");
assertContains(destinyProfileSource, "__cdRestoreCanonicalPaymentMode", "destiny fallback restores canonical selector");
assertContains(destinyProfileSource, "__cdSupportsPassChoice", "destiny fallback requires pass-capable selector");
assertNotContains(destinyProfileSource, "달빛 결제 방식 선택", "legacy two-option moon payment modal removed");
assertNotContains(destinyProfileSource, "openServicePaymentChoiceModal", "legacy destiny payment selector renderer removed");
assertContains(destinyProfileSource, "__cdChooseServicePaymentModeCanonical", "destiny fallback delegates to canonical pass selector");
assertContains(destinyProfileSource, "_dpHasActivePaidServiceSingleFlight('__cdPaidServiceGateInFlight'", "destiny fallback global paid gate duplicate lock");
assertNotContains(destinyProfileSource, "opts.internalMainGate !== true && opts.__cdPaymentGateAuthorized !== true && typeof window.__cdApplyMembershipPassBeforePayment", "destiny no pre-modal pass bottleneck");

assertContains(paymentsRouteSource, "fetchPortOnePayment", "server PortOne verification");
assertContains(paymentsRouteSource, "merchantUid", "merchantUid duplicate key");
assertContains(paymentsRouteSource, "idempotencyKey", "idempotency duplicate key");
assertContains(paymentsRouteSource, "idempotent: true", "idempotent success handling");
assertContains(paymentsRouteSource, "accessGrant", "server access grant response");

const legacyPigCoinConsumeFetch = 'fetch("/api/fortune/' + 'pig-coin/' + 'consume';
assertContains(tarotLoveSource, 'fetch("/api/billing/coin-gate"', "tarot love uses worker billing coin gate");
assertNotContains(tarotLoveSource, legacyPigCoinConsumeFetch, "tarot love legacy consume bypass removed");
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
