import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const indexSource = readFileSync(resolve(root, "index.html"), "utf8");
const staticIndexSource = readFileSync(resolve(root, "public/static/index.html"), "utf8");
const billingClientSource = readFileSync(resolve(root, "app/_lib/billing-client.ts"), "utf8");
const paymentProcessingContextSource = readFileSync(resolve(root, "app/components/PaymentProcessingContext.tsx"), "utf8");
const loadingMessagesSource = readFileSync(resolve(root, "constants/loadingMessages.ts"), "utf8");
const billingRouteSource = readFileSync(resolve(root, "worker/routes/billing.js"), "utf8");
const paymentsRouteSource = readFileSync(resolve(root, "worker/routes/payments.js"), "utf8");
const tarotLoveSource = readFileSync(resolve(root, "js/tarot-love-experience.js"), "utf8");
const destinyProfileSource = readFileSync(resolve(root, "js/destiny-profile.js"), "utf8");
const fortuneTeaHouseSource = readFileSync(resolve(root, "src/features/fortune-tea-house/FortuneTeaHousePage.tsx"), "utf8");
const neoOperationRoomSource = readFileSync(resolve(root, "src/features/neo-war-room/NeoOperationRoomPage.tsx"), "utf8");
const reactGateFirstFeatureSources = [
  {
    label: "life-book-ai",
    source: readFileSync(resolve(root, "app/life-book-ai/LifeBookAiClient.tsx"), "utf8"),
    // ?좉????몄텧? app/life-book-ai/lifeBookApi.ts ??prepareLifeBook 濡???꼈??authFetch + ?쇱떆?μ븷 ?ъ떆??+ ??꾩븘??.
    // 怨꾩빟(寃뚯씠???ㅽ뵂 ???좉?????寃곗젣李?? 洹몃?濡쒕떎.
    api: "prepareLifeBook<PrepareResult>(",
    checkout: "runBillingCoinGate",
  },
  {
    label: "love-secret-ai",
    source: readFileSync(resolve(root, "app/love-secret-ai/LoveSecretAiClient.tsx"), "utf8"),
    api: 'postJson<EnsureAccessResult>("/api/love-secret-ai/prepare"',
    checkout: "runLoveSecretPaymentGate",
  },
  {
    label: "new-year-ai",
    source: readFileSync(resolve(root, "app/new-year-ai-consultation/NewYearAiClient.tsx"), "utf8"),
    api: 'postJson<EnsureAccessResult>("/api/new-year-ai/ensure-access"',
    checkout: "runBillingCoinGate",
  },
  {
    label: "astrology-ai",
    source: readFileSync(resolve(root, "app/astrology-ai/AstrologyAiClient.tsx"), "utf8"),
    api: "postJson<EnsureAccessResult>(API_ENDPOINTS.ensureAccess",
    checkout: "runBillingCoinGate",
  },
  {
    label: "ziwei-ai",
    source: readFileSync(resolve(root, "app/ziwei-ai/ZiweiAiClient.tsx"), "utf8"),
    api: 'postJson<ApiResult>("/api/ziwei-ai/prepare"',
    checkout: "runBillingCoinGate",
  },
  {
    label: "vedic-ai",
    source: readFileSync(resolve(root, "app/vedic-ai/VedicAiClient.tsx"), "utf8"),
    api: '"/api/vedic-ai/ensure-access"',
    checkout: "runBillingCoinGate",
  },
  {
    label: "sukuyo-compatibility-ai",
    source: readFileSync(resolve(root, "app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx"), "utf8"),
    api: '"/api/sukuyo-compatibility-ai/prepare"',
    checkout: "runBillingCoinGate",
  },
  {
    label: "karma-destiny-ai",
    source: readFileSync(resolve(root, "app/karma-destiny-ai/KarmaDestinyAiClient.tsx"), "utf8"),
    api: 'postJson<EnsureAccessResult>("/api/karma-destiny-ai/ensure-access"',
    checkout: "runCommonBillingGate",
  },
  {
    label: "master-love-codex",
    source: readFileSync(resolve(root, "src/features/master-love-codex/MasterLoveCodexPage.tsx"), "utf8"),
    api: '"/api/master-love-codex/ensure-access"',
    checkout: "runBillingCoinGate",
  },
];

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
assertContains(indexSource, "service.executePayment({", "global paid gate uses shared command single-flight");
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

assertBefore(indexSource, "var allowDirectCheckoutAccessBypass = opts.allowServerAccessBypass === true && opts.forceDirectPayment !== true;", "await _cdPortOneV2SdkPromise()", "direct checkout defines the access-bypass guard before PortOne SDK");
assertContains(indexSource, "if (!order.merchantUid && allowDirectCheckoutAccessBypass && _cdIsCheckoutAccessBypass", "direct checkout must not accept pass/access bypass unless explicitly allowed");
assertContains(indexSource, "provider: 'PORTONE_V2'", "PortOne provider in checkout payload");
assertContains(indexSource, "pg: 'KG_INICIS'", "KG Inicis pg in checkout payload");
assertContains(indexSource, "window.PortOne.requestPayment(requestData)", "PortOne V2 requestPayment call");
assertContains(indexSource, "storeId: storeId", "PortOne storeId request field");
assertContains(indexSource, "channelKey: channelKey", "PortOne channelKey request field");
assertContains(indexSource, "paymentId: order.merchantUid", "PortOne paymentId request field");

assertBefore(indexSource, "_cdHasVerifiedServerAccess(confirmRes.payload", "return confirmRes.payload", "direct checkout verifies server before success return");
assertAllBefore(indexSource, "_cdHasVerifiedServerAccess", "sessionStorage.setItem('cd_pa_' + action, '1')", "local paid marker guarded by server access");
assertContains(indexSource, "paymentFailed", "payment failed state");
assertContains(indexSource, "寃곗젣 寃利앹뿉 ?ㅽ뙣?덉뒿?덈떎.", "main shell payment verification failure message");
assertContains(indexSource, "honey-fortune-logo-payment-ux-v20260618", "honey fortune logo payment ux marker");
// ?먯궛??遺??寃뚯씠?몄? 媛숈? /icons/app-logo-512.webp 濡??듯빀?섎㈃??#200) ???⑥뼵???≪븯怨?
// 媛숈? ?≪쓽 ???④퀎(verify:security-hardening)媛 癒쇱? 二쎌뼱 ?덉뼱 ?ㅽ뙣媛 ?쒕윭?섏? ?딆븯??
// 媛?쒖쓽 ?섎룄??"寃곗젣/?댁슜沅??湲??ㅻ쾭?덉씠媛 釉뚮옖??濡쒓퀬瑜??대떎"?대?濡??꾩옱 ?뺣낯 寃쎈줈濡?留욎텣??
assertContains(indexSource, 'background-image: url("/icons/app-logo-512.webp")', "payment/pass overlay uses brand logo asset");
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
// ?뵶 寃곗젣 留덉뒪肄뷀듃??**硫붿씤 ?쒕퉬??濡쒓퀬 + 寃쎈웾 ?먯궛**?댁뼱???쒕떎. ?덉쟾?먮뒗 ?몃? ?몄뒪?몄쓽 725KB PNG 瑜?
// 吏곸젒 李몄“?덇퀬, CSS 媛 [aria-hidden="false"] 濡?寃뚯씠?몃뤌 ?ㅻ쾭?덉씠瑜??щ뒗 ?쒓컙(=?④굔寃곗젣 ?대┃ 吏곹썑)
// 泥섏쓬 ?붿껌???섍? checkout/PortOne SDK ? ???룺???ㅽ돏????"?ㅽ듃?뚰겕 ?ㅻ쪟 + PG李?誘몃끂異?.
// ?숈씪 ?ㅻ━吏?32KB 濡쒓퀬濡?怨좎젙?쒕떎 ??head ??rel=preload fetchpriority=high 媛 ?대? ?덉뼱
// 寃곗젣 ?대┃ ?쒖젏?먮뒗 ?뚯뾼 罹먯떆?닿퀬, ?대┃ ?꾧퀎寃쎈줈??異붽? ?ㅽ듃?뚰겕媛 0 ?대떎.
assertContains(indexSource, ".cd-paid-gate__sprite-frame{position:relative;width:100%;height:100%;background-image:url(\"/icons/app-logo-512.webp", "paid gate sprite uses the preloaded same-origin service logo");
assertNotContains(indexSource, "window.alert('?④굔 寃곗젣媛 ?꾨즺?섏뼱 ?대엺?섏뿀?듬땲??');", "single payment success uses designed overlay instead of alert");
assertNotContains(indexSource, "window.alert(_cdIsMembershipFreePayload(result.payload) ? '?댁슜沅뚯쑝濡??대엺?섏뿀?듬땲??' : '?붿젙???ъ슜???꾨즺?섏뿀?듬땲??');", "unlock monthly/pass success uses designed overlay instead of alert");
assertNotContains(indexSource, "window.alert(_cdIsMembershipFreePayload(r.payload) ? '?댁슜沅뚯쑝濡??대엺?섏뿀?듬땲??' : '?붿젙???ъ슜???꾨즺?섏뿀?듬땲??');", "tile monthly/pass success uses designed overlay instead of alert");

assertContains(billingClientSource, "hasVerifiedBillingAccess", "React billing access guard");
assertBefore(billingClientSource, "if (!hasVerifiedBillingAccess(parsed.data", "markPaidAttemptPaymentSucceeded()", "React billing verifies before success");
assertContains(billingClientSource, "SERVER_ACCESS_GRANT_MISSING", "React server grant missing error");
assertContains(billingClientSource, "?쒕쾭 沅뚰븳 寃利앹뿉 ?ㅽ뙣?덉뒿?덈떎", "React server verification failure message");
assertContains(billingClientSource, "billingCoinGateInFlight", "React in-flight duplicate guard");
assertContains(billingClientSource, "export function beginPaidFeatureGateCheck", "React paid feature gate check helper");
assertContains(billingClientSource, 'status: "checkingEntitlement"', "React paid feature gate starts from entitlement check");
assertContains(billingClientSource, "export function completePaidFeatureGateCheck", "React paid feature gate complete helper");
assertContains(billingClientSource, "export function failPaidFeatureGateCheck", "React paid feature gate failure helper");
assertContains(billingClientSource, 'status: cancelled ? "cancelled" : "error"', "React paid feature gate cancellation status");
assertContains(billingClientSource, 'status: runtimeCode === "PAYMENT_CANCELLED" ? "cancelled" : "paymentFailed"', "React runtime cancellation is not payment failure");
assertContains(billingClientSource, "const BILLING_FETCH_CHECKOUT_TIMEOUT_MS = 40000;", "React checkout timeout is long enough for PG setup");
assertContains(billingClientSource, "const BILLING_FETCH_CONFIRM_TIMEOUT_MS = 60000;", "React confirm timeout is long enough for payment verification");
assertContains(billingClientSource, 'normalizedPath.startsWith("/api/billing/coin-gate")) return BILLING_FETCH_CONFIRM_TIMEOUT_MS;', "React coin gate uses confirm timeout");
assertContains(billingClientSource, 'normalizedPath.startsWith("/api/billing/confirm")) return BILLING_FETCH_CONFIRM_TIMEOUT_MS;', "React billing confirm uses confirm timeout");
assertNotContains(billingClientSource, "BILLING_FETCH_MUTATION_TIMEOUT_MS", "React payment verification must not use shared 14s mutation timeout");
assertContains(billingClientSource, 'PAID_SERVICE_RUNTIME_SRC = "/js/destiny-profile.js?v=build-0e80aaf07557"', "React paid runtime cache key includes the final pass verification fix");
assertNotContains(billingClientSource, "build-20260622-inicis-phone", "React paid runtime must not load stale Inicis phone runtime");
assertContains(billingClientSource, "function isMonthlyCreditAccessType", "React billing has monthly-credit access resolver");
assertContains(billingClientSource, "function resolveAppliedBillingPayment", "React billing resolves applied payment method from server response");
assertContains(billingClientSource, "const monthlyApplied = candidates.some(isMonthlyCreditAccessType);", "React monthly-credit success is resolved before pass success");
assertContains(billingClientSource, "resolveAppliedBillingPayment(runtimeData, requestedMode, passFirstEligible", "React coin-gate success uses applied payment resolver");
// ?댁슜沅??뺤씤???ㅽ뙣/吏?곗쑝濡?二쎌뼱??寃곗젣李??④굔+?붿젙?????대젮???쒕떎 ???대갚 ???肄붾뱶 蹂닿컯 ?뚭? 諛⑹?.
const reactPaymentFallbackSource = section(
  billingClientSource,
  "function shouldOpenRuntimePaymentFallback(",
  "function shouldRedirectToLoginAfterBilling(",
  "React runtime payment fallback",
);
assertContains(reactPaymentFallbackSource, 'normalizedCode === "PASS_STATUS_TEMPORARILY_UNAVAILABLE"', "React payment fallback opens on temporary pass-status 503");
assertContains(reactPaymentFallbackSource, 'normalizedCode === "BILLING_REQUEST_TIMEOUT"', "React payment fallback opens on client abort timeout 503");
// ?쒕쾭 degraded ?쒕㈃??680114ad)濡??덈줈 ?대젮?ㅻ뒗 ?몄쬆/?ㅻ깄??503??dead-end ???寃곗젣李쎌쓣 ?댁뼱???쒕떎.
assertContains(reactPaymentFallbackSource, 'normalizedCode === "AUTH_STATUS_TEMPORARILY_UNAVAILABLE"', "React payment fallback opens on temporary auth-status 503");
assertContains(reactPaymentFallbackSource, 'normalizedCode === "BALANCE_SNAPSHOT_UNAVAILABLE"', "React payment fallback opens on degraded balance snapshot 503");
assertContains(reactPaymentFallbackSource, 'normalizedCode === "AUTH_DB_UNAVAILABLE"', "React payment fallback opens on degraded auth-db 503");
// degraded-503? 寃곗젣李쎌쓣 ?닿린 ?꾩뿉 癒쇱? ?ъ떆?꾪빐 ?댁슜沅?蹂댁쑀?먯쓽 臾대즺 ?듦낵瑜??대┛???ъ떆???곗꽑).
assertNotContains(billingClientSource, "isRetryableBillingInfraDegraded(parsed.status, parsed.error?.code)", "React payment POST is not automatically retried");

// ?뵶 ?붾웾 '議고쉶 ?ㅽ뙣'瑜?'?붾웾 遺議?怨?媛숈씠 臾띠뼱 ?붿젙??踰꾪듉??鍮꾪솢?깊븯硫? ?ъ“?뚭? 怨꾩냽 ?ㅽ뙣????
// ?붿젙?앹씠 ?곴뎄 ?뚯깋????寃곗젣 ?먯껜媛 遺덇??ν빐吏꾨떎(2026-08 /naming-ai ?ш퀬: ?뚮떦寃곗젣??eligibility
// ?뺣났??嫄대꼫?곗뼱 寃곗젣李쎌씠 ??긽 '?뺤씤 ?꾩슂'濡??대━誘濡? ?먮룞 ?ъ“??1?뚯쓽 ?ㅽ뙣媛 怨?寃곗젣 遺덇????.
// 寃곗젣 ???щ끂異?寃쎈줈?먮뒗 verify-static-paid-gate-failsafe.mjs 媛 ?대? 媛숈? 怨꾩빟??媛뺤젣?쒕떎 ??
// ?ш린?쒕뒗 '?붾웾 議고쉶' 寃쎈줈?????3?뚮뜑??紐⑤몢瑜?媛뺤젣?쒕떎. ?뺤씤???붾웾???꾩슂遺꾨낫???곸쓣 ?뚮쭔 鍮꾪솢??
const reactMoonlightApplySource = section(
  billingClientSource,
  "const applyMoonlightBalance = (rawBalance: number | null",
  "const refreshMonthlyBalance = async (",
  "React moonlight balance apply",
);
assertContains(reactMoonlightApplySource, "const insufficient = known && balance < monthlyCost;", "React moonlight disable is decided by confirmed shortage only");
assertContains(reactMoonlightApplySource, 'const canUse = monthlyCost > 0 && state !== "signed-out" && !insufficient;', "React moonlight stays enabled while the balance is unconfirmed");
assertNotContains(reactMoonlightApplySource, "const canUse = known && monthlyCost > 0 && balance >= monthlyCost;", "React moonlight must not treat a failed lookup as insufficient");
assertContains(reactMoonlightApplySource, "lastKnownMonthlyBalance", "React moonlight keeps the last confirmed balance across a failed refresh");
assertContains(billingClientSource, "const snapshotMonthlyBalance = hasCallerMonthlyBalance ? 0 : readSubscriptionSnapshotMonthlyBalance();", "React payment choice seeds the moonlight balance from the local subscription snapshot");

const shellMoonlightRefreshSource = section(
  indexSource,
  "async function refreshDirectMonthlyBalance(options)",
  "function close(mode)",
  "shell moonlight balance refresh",
);
assertContains(
  shellMoonlightRefreshSource,
  "canUseMonthly = allowMonthlyChoice && requiredMonthlyCredits > 0 && (!monthlyBalanceFresh || monthlyBalance >= requiredMonthlyCredits);",
  "shell moonlight stays enabled while the balance is unconfirmed",
);
assertNotContains(
  shellMoonlightRefre…1647 tokens truncated…vider payment success must stay in paid gate UI");
assertNotContains(reactProviderOverlayOwnershipSource, '"paymentWindowOpen"', "React provider must not keep overlay during external PG window");
assertContains(paymentProcessingContextSource, "function isMonthlyPaidFeatureDetail", "React provider has monthly paid-feature resolver");
assertContains(paymentProcessingContextSource, "<PaidFeatureGateProvider>", "React app connects paid gate provider globally");
assertContains(paymentProcessingContextSource, 'checkingEntitlement: { label: "?뺤씤 以?, title: "?댁슜沅??뺤씤"', "React paid gate checking entitlement copy");
assertContains(paymentProcessingContextSource, 'cancelled: { label: "痍⑥냼??, title: "寃곗젣 ?좏깮 痍⑥냼"', "React paid gate cancelled copy");
assertNotContains(paymentProcessingContextSource, 'document.body.style.overflow = "hidden"', "React paid gate must not lock mobile body scroll");
const reactProviderStatusOverlaySource = section(paymentProcessingContextSource, "function resolvePaidFeatureStatusOverlay(", "function nowForPaidGate", "React provider paid status overlay");
assertBefore(reactProviderStatusOverlaySource, "isMonthlyPaidFeatureDetail(resolvedDetail)", "isPassPaidFeatureDetail(resolvedDetail)", "React provider resolves monthly success before pass success");
assertContains(reactProviderStatusOverlaySource, 'return { message: "?붿젙?앹씠 源껊뱾怨??덉뼱??, mode: "payment-complete" };', "React provider monthly success copy");
assertContains(loadingMessagesSource, 'title: "?곗씠???붿젙??쨌 源껊뱾怨??덉뼱??', "React payment loading monthly success title");
assertNotContains(loadingMessagesSource, 'title: "?댁슜沅뚯씠 ?쒖꽦?붾릺怨??덉뼱??', "React payment loading must not show pass copy for monthly success");
const reactProviderOpenSource = section(paymentProcessingContextSource, "const open = useCallback", "const update = useCallback", "React provider open");
assertBefore(reactProviderOpenSource, "if (isExternalPaymentWindowStatus(status))", "if (paymentLoadingOwnsPaidFeatureStatus(status))", "React provider closes overlays before opening payment loading");
const reactProviderUpdateSource = section(paymentProcessingContextSource, "const update = useCallback", "const preload = useCallback", "React provider update");
assertBefore(reactProviderUpdateSource, "if (isExternalPaymentWindowStatus(requestedStatus))", "if (paymentLoadingOwnsPaidFeatureStatus(requestedStatus))", "React provider update closes overlays before payment loading");
const reactOverlayApplySource = section(paymentProcessingContextSource, "const applyReactPaymentOverlay = useCallback", "useEffect(() => {", "React payment overlay apply");
assertBefore(reactOverlayApplySource, "if (!previous.open) {", "stopProcessing();", "React provider closes directly-started payment overlay on global close");
assertContains(reactOverlayApplySource, "closeProcessingNow();", "React provider direct payment overlay close");

assertContains(billingRouteSource, "consumeTierPassIfAvailable", "tier pass consume path");
assertNotContains(billingRouteSource, ["consume", "Usage", "Pass", "If", "Available"].join(""), "removed usage pass consume path");
assertContains(billingRouteSource, 'accessMethod: "PASS"', "pass access method");
assertContains(billingRouteSource, "paymentCommand.method === PAYMENT_METHODS.MONTHLY", "monthly mode stays separate");
assertContains(indexSource, "paymentMode: 'DIRECT_KRW'", "direct mode stays separate");
assertContains(indexSource, "paymentMode: 'MOONLIGHT_STONE'", "post-modal monthly route remains explicit");
assertNotContains(indexSource, "perUseChoice === 'membership' ? 'MEMBERSHIP_PASS' : 'MOONLIGHT_STONE'", "post-modal per-use route cannot fall back to membership pass");
assertNotContains(indexSource, "paymentChoice === 'membership' ? 'MEMBERSHIP_PASS' : 'MOONLIGHT_STONE'", "post-modal unlock route cannot fall back to membership pass");
assertNotContains(indexSource, "tilePaymentChoice === 'membership' ? 'MEMBERSHIP_PASS' : 'MOONLIGHT_STONE'", "post-modal tile route cannot fall back to membership pass");
assertContains(billingRouteSource, '"/api/payments/prepare"', "direct payment prepare path");
assertContains(billingRouteSource, '"/api/payments/confirm"', "direct payment confirm path");
const directCheckoutSource = section(billingRouteSource, "async function handleCheckout(", "function logCheckoutElapsed(", "direct checkout adapter");
const directConfirmSource = section(billingRouteSource, "async function handleConfirm(", "async function runServiceExecutionAction(", "direct confirm adapter");
assertNotContains(directCheckoutSource, "getMembershipPassForBillingRequest", "card prepare performs zero pass lookups");
assertNotContains(directCheckoutSource, "grantPassFreeAccessBeforeCardIfAvailable", "card prepare cannot convert to pass access");
assertNotContains(directConfirmSource, "getMembershipPassForBillingRequest", "card confirm performs zero pass lookups");
assertNotContains(directConfirmSource, "grantPassFreeAccessBeforeCardIfAvailable", "card confirm cannot convert to pass access");

assertContains(indexSource, "passButtonHtml", "canonical payment modal pass store option");
assertContains(indexSource, "var allowPassChoice = opts.disablePassChoice !== true", "pass option is available by default unless explicitly disabled");
// ?뵶 寃곗젣李??덉뿉???댁슜沅뚯쓣 ?뺤씤?????덉뼱???쒕떎(2026-07 ?뺤콉 ?꾪솚).
// 吏꾩엯 ?좉??ъ쓽 ?쒕쾭 ?뺣났???놁븻 ???'?댁슜沅뚯쑝濡?援щℓ' 移대뱶媛 洹??먮━?먯꽌 ?쒕쾭??臾삳뒗?? ?덉쟾?먮뒗
// 諛섎?濡?"?댁슜沅뚯? 寃곗젣李쎌쓣 ?닿린 ?꾩뿉留??뺤씤?⑸땲???쇰뒗 留됰떎瑜??덈궡媛 ?덉뿀怨? 洹?臾멸뎄瑜??ш린??怨좎젙?섍퀬
// ?덉뿀????洹??곹깭濡??좉??щ? ?놁븷硫??ㅻ깄???녿뒗 ?댁슜沅?蹂댁쑀?먭? ?뺤씤??諛⑸쾿 ?먯껜瑜??껊뒗??
assertNotContains(indexSource, "?댁슜沅뚯? 寃곗젣李쎌쓣 ?닿린 ?꾩뿉留??뺤씤?⑸땲??", "in-modal pass verification must not be blocked again");
assertContains(indexSource, "var passReady = await refreshDirectEntitlementStatus();", "pass card verifies the entitlement in place");
assertBefore(
  indexSource,
  "var passReady = await refreshDirectEntitlementStatus();",
  "window.setTimeout(openPassStoreAfterCheck, 450);",
  "pass card must verify first and only then fall through to the store",
);
assertContains(indexSource, "window.location.assign('/points?source=direct-payment-pass-store');", "canonical pass choice opens pass store");
// ?뵶 ?깆뿉?쒕뒗 /points 濡??꾨줈洹몃옒留ㅽ떛 ?대룞?섎㈃ 404 ????踰덈뱾???녾퀬, 媛?쒕뒗 ?듭빱 ?대┃留?媛濡쒖콌??.
// 諛섎뱶??__cdOpenChargeModal(媛?쒓? /app/store/ 濡?怨좎젙) 遺꾧린瑜?癒쇱? ????쒕떎.
assertBefore(
  indexSource,
  "if (_cdShouldUseAppStoreEntry() && typeof window.__cdOpenChargeModal === 'function') {",
  "var passStoreUrl = _cdBuildPassStoreUrl(coinPrice, passCoverage, 'direct-payment-pass-store');",
  "app runtime must take the in-app store before any /points navigation",
);
assertNotContains(indexSource, "reason: 'pass_applied_in_modal'", "membership pass choice must grant instead of cancelling");
assertContains(destinyProfileSource, "if (choice === 'pass')", "destiny pass choice grant path");
assertContains(destinyProfileSource, "__cdRestoreCanonicalPaymentMode", "destiny fallback restores canonical selector");
assertContains(destinyProfileSource, "__cdSupportsPassChoice", "destiny fallback requires pass-capable selector");
// ?낅┰(?뺤쟻) ?대갚???뺣낯怨?媛숈? 3?듭뀡 寃곗젣李쎌씠?댁빞 ?쒕떎. ??2?듭뀡(?댁슜沅??곸젏 ?녿뒗) 紐⑤떖 遺??諛⑹???
// 蹂몄껜???꾨옒 canonical ?꾩엫 ?⑥뼵?ㅼ씠怨? ?ш린?쒕뒗 ??寃곗젣?섎떒??紐⑤몢 ?뚮뜑?섎뒗吏瑜?吏곸젒 ?뺤씤?쒕떎.
assertContains(destinyProfileSource, 'data-mode="pass-store"', "standalone chooser keeps pass store option");
assertContains(destinyProfileSource, 'data-mode="direct"', "standalone chooser keeps direct option");
assertContains(destinyProfileSource, 'data-mode="monthly" data-monthly-option', "standalone chooser keeps monthly option");
assertNotContains(destinyProfileSource, "openServicePaymentChoiceModal", "legacy destiny payment selector renderer removed");
assertContains(destinyProfileSource, "__cdChooseServicePaymentModeCanonical", "destiny fallback delegates to canonical pass selector");
assertContains(destinyProfileSource, "service.executePayment({", "destiny fallback uses shared command single-flight");
assertNotContains(destinyProfileSource, "opts.internalMainGate !== true && opts.__cdPaymentGateAuthorized !== true && typeof window.__cdApplyMembershipPassBeforePayment", "destiny no pre-modal pass bottleneck");
assertContains(destinyProfileSource, "_dpSetPaymentPending(false);\n      var rsp = await window.PortOne.requestPayment(requestData);", "destiny runtime hides payment overlay immediately before PG window");
// ?뺤쟻 ?대갚 ?ㅻ쾭?덉씠媛 寃곗젣?섎떒蹂??덈궡瑜??뚮뜑?섎뒗吏(?붿젙?씲룸떒嫄는룹셿猷??쒕ぉ ?꾪솚 + ?꾨즺 ?꾨젅?? ?뚭? 諛⑹?.
assertContains(destinyProfileSource, "function _dpResolveStandaloneOverlayCopy", "destiny fallback overlay copy is mode-aware");
assertContains(destinyProfileSource, "title: '?붿젙???ъ슜 以?", "destiny fallback monthly overlay title");
assertContains(destinyProfileSource, "title: '寃곗젣 吏꾪뻾 以?", "destiny fallback direct payment overlay title");
assertContains(destinyProfileSource, "title: '寃곗젣 ?꾨즺'", "destiny fallback payment-complete overlay title");
assertContains(destinyProfileSource, "if (choice === 'monthly') _dpShowPaymentCompleteOverlay(_dpText('monthlyAppliedOverlay'))", "destiny fallback shows monthly completion frame");
assertContains(destinyProfileSource, "_dpShowPaymentCompleteOverlay(_dpText('paymentCompleteOverlay'))", "destiny fallback shows direct completion frame");

assertContains(paymentsRouteSource, "fetchPortOnePayment", "server PortOne verification");
assertContains(paymentsRouteSource, "merchantUid", "merchantUid duplicate key");
assertContains(paymentsRouteSource, "idempotencyKey", "idempotency duplicate key");
assertContains(paymentsRouteSource, "idempotent: true", "idempotent success handling");
assertContains(paymentsRouteSource, "accessGrant", "server access grant response");

const legacyPigCoinConsumeFetch = 'fetch("/api/fortune/' + 'pig-coin/' + 'consume';
assertContains(tarotLoveSource, "window._cdOpenPaidServiceGate", "tarot love uses common paid service gate");
assertNotContains(tarotLoveSource, 'fetch("/api/billing/coin-gate"', "tarot love direct coin gate bypass removed");
assertNotContains(tarotLoveSource, legacyPigCoinConsumeFetch, "tarot love legacy consume bypass removed");
assertContains(billingClientSource, "hasVerifiedBillingAccess", "common paid gate keeps server access guard");

const fortuneTeaSubmitSource = section(
  fortuneTeaHouseSource,
  "async function submitQuestion(nextQuestionInput: FortuneTeaHouseQuestionInput)",
  "} catch (error) {",
  "fortune tea house submit flow"
);
assertBefore(fortuneTeaSubmitSource, "await beginFortuneTeaAccessGate", "postFortuneTeaConsultRequest(initialConsultBody", "fortune tea house opens paid gate before consult API");
assertContains(fortuneTeaSubmitSource, "accessGateStarted = true", "fortune tea house tracks paid gate state");
assertContains(fortuneTeaHouseSource, "await completeFortuneTeaAccessGate", "fortune tea house completes paid gate after access");
assertContains(fortuneTeaHouseSource, "await failFortuneTeaAccessGate", "fortune tea house shows paid gate failure");

const neoSubmitSource = section(
  neoOperationRoomSource,
  "async function handleSubmit(event: FormEvent<HTMLFormElement>)",
  "} catch (caught) {",
  "neo operation room submit flow"
);
assertBefore(neoSubmitSource, "beginPaidFeatureGateCheck({", "postJson<EnsureAccessResult>(API_ENDPOINTS.ensureAccess", "neo operation room opens paid gate before ensure-access API");
assertContains(neoSubmitSource, "completePaidFeatureGateCheck({", "neo operation room completes paid gate after access");
assertContains(neoOperationRoomSource, "failPaidFeatureGateCheck({", "neo operation room shows paid gate failure");

for (const feature of reactGateFirstFeatureSources) {
  assertContains(feature.source, "beginPaidFeatureGateCheck", `${feature.label} imports gate-first helper`);
  assertContains(feature.source, "completePaidFeatureGateCheck", `${feature.label} completes paid gate`);
  assertContains(feature.source, "failPaidFeatureGateCheck", `${feature.label} fails paid gate visibly`);
  assertBefore(feature.source, "beginPaidFeatureGateCheck({", feature.api, `${feature.label} opens paid gate before access API`);
  const gateFirstFlowSource = feature.source.slice(feature.source.indexOf("beginPaidFeatureGateCheck({"));
  assertBefore(gateFirstFlowSource, feature.api, feature.checkout, `${feature.label} checks entitlement before checkout gate`);
}

// oracle(吏?ㅻ㎤??쨌yoga-guru: ?쒕쾭媛 寃곗젣瑜?Gemini(callGeminiText) ?몄텧 ?댁쟾??寃利앺빐???쒕떎.
// ?대씪 ?고쉶濡?/api/oracle/geomancy쨌/api/yoga-guru瑜?吏곸젒 ?몄텧??臾대즺 LLM ?앹꽦?섎뒗 寃껋쓣 李⑤떒.
const oracleRouteSource = readFileSync(resolve(root, "worker/routes/oracle.js"), "utf8");
const yogaGuruRouteSource = readFileSync(resolve(root, "worker/routes/yoga-guru.js"), "utf8");
const accessControlSource = readFileSync(resolve(root, "worker/lib/access-control.js"), "utf8");
const geomancyClientSource = readFileSync(resolve(root, "public/geomancy-oracle-v4.html"), "utf8");
const yogaClientSource = readFileSync(resolve(root, "public/yoga-guru.html"), "utf8");
const oracleHandlerSource = oracleRouteSource.slice(oracleRouteSource.indexOf("export async function handleOracleRoutes"));
assertBefore(oracleHandlerSource, "requireAuth(request, env)", "buildGeomancyOracle(env, payload)", "oracle verifies auth before generating");
assertBefore(oracleHandlerSource, "requirePremiumReportAccess(", "buildGeomancyOracle(env, payload)", "oracle verifies payment before generating");
const yogaHandlerSource = yogaGuruRouteSource.slice(yogaGuruRouteSource.indexOf("async function handleGenerateYogaCourse"));
assertBefore(yogaHandlerSource, "requireAuth(request, env)", "callGeminiText", "yoga-guru verifies auth before Gemini");
assertBefore(yogaHandlerSource, "requirePremiumReportAccess(", "callGeminiText", "yoga-guru verifies payment before Gemini");
assertContains(accessControlSource, 'reportType === "geomancyOracle"', "access-control has geomancy payment rule");
assertContains(accessControlSource, 'reportType === "yogaGuruCourse"', "access-control has yoga payment rule");
// 諛곗뿴? 由ы룷?명??낆씠 ?섏뼱?????덉쑝誘濡?由ы꽣???꾩껜媛 ?꾨땲???꾩닔 ??ぉ ?ы븿 ?щ?濡?蹂몃떎.
const recentPaymentWindowList = accessControlSource.match(/\[[^\]]*\]\.includes\(normalizedReportType\)/)?.[0] || "";
for (const reportType of ["celestialHarmony", "geomancyOracle", "yogaGuruCourse"]) {
  assertContains(recentPaymentWindowList, `"${reportType}"`, `recent-payment-window fallback covers ${reportType}`);
}
assertContains(geomancyClientSource, "geomancyPayEvidence", "geomancy client forwards payment evidence");
assertContains(geomancyClientSource, "credentials:'include'", "geomancy client sends auth credentials");
assertContains(yogaClientSource, "yogaPayEvidence", "yoga client forwards payment evidence");
assertContains(yogaClientSource, "credentials: 'include'", "yoga client sends auth credentials");

for (const source of [indexSource, staticIndexSource]) {
  assertContains(source, 'id="cd-main-shell-critical-v20260604"', "critical CSS marker mirrored");
  assertContains(source, 'data-marker="moonstone-pass-ui-v20260605-starlight-cta"', "glass CSS marker mirrored");
  assertContains(source, ".moon-hero{grid-template-columns", "desktop critical layout");
  assertContains(source, "@media (max-width:860px)", "mobile critical layout");
  assertContains(source, ".moon-start-grid{grid-template-columns:1fr}", "mobile card layout fallback");
  assertContains(source, '<link rel="stylesheet" href="/styles/core-ui.css', "core CSS blocking stylesheet");
  assertContains(source, '<link rel="stylesheet" href="/styles/fortune-ui.css', "fortune CSS blocking stylesheet");
}

// ?? ?뵶 ?湲??붾㈃ ?뺤콉: '吏꾪뻾 以? ?꾩껜?붾㈃? ?댁슜沅??뺤씤?먯꽌留???????????????????????????????
// 二쇰Ц 諛쒓툒(/api/billing/checkout)???꾩뿭 fetch ?섑띁媛 '寃곗젣 吏꾪뻾 以??쇰줈 ?≪븘 寃곗젣李쎌쓣
// ??? ?딅룄濡????깆쭏???ㅼ젣 ?됯?濡?怨좎젙?쒕떎.
//   ???섑띁??checkout/prepare 瑜?異붿쟻?섏? ?딅뒗??臾몄옄??????꾨땲???⑥닔瑜??ㅽ뻾???뺤씤).
//   ???湲?寃곌낵 ?ㅻ쾭?덉씠 ?덉슜紐⑸줉?먯꽌 吏꾪뻾 以?紐⑤뱶??'pass' ?섎굹肉먯씠??
const indexRuntimeSource = readFileSync(resolve(root, "js/core/index-inline-runtime.js"), "utf8");
const shouldTrackSource = section(
  indexRuntimeSource,
  "function __cdShouldTrackPaymentRequest(",
  "function __cdResolvePaymentMeta(",
  "global payment fetch tracker",
);
const shouldTrackPaymentRequest = new Function(`${shouldTrackSource}; return __cdShouldTrackPaymentRequest;`)();
for (const path of ["/api/billing/checkout", "/api/payments/prepare"]) {
  assert.equal(
    shouldTrackPaymentRequest(path, "POST"),
    false,
    `二쇰Ц 諛쒓툒? ?湲?UI瑜?耳쒖? ?딆븘???쒕떎: ${path}`,
  );
}
// ?뱀씤 寃利?confirm)? 寃곗젣李쎌쓣 ?듦낵???ㅻ씪 洹몃?濡?異붿쟻?쒕떎 ?????덉쇅媛 怨쇳븯寃??볦뼱吏吏 ?딄쾶 怨좎젙.
assert.equal(shouldTrackPaymentRequest("/api/billing/confirm", "POST"), true, "?뱀씤 寃利앹? 怨꾩냽 異붿쟻?쒕떎");
assert.equal(shouldTrackPaymentRequest("/api/payments/confirm", "POST"), true, "?뱀씤 寃利앹? 怨꾩냽 異붿쟻?쒕떎");

const waitUiAllowLists = [
  { label: "shell", source: indexSource, name: "CD_WAIT_UI_ALLOWED_MODE_RE" },
  { label: "react", source: paymentProcessingContextSource, name: "REACT_WAIT_UI_ALLOWED_MODE_RE" },
  { label: "standalone", source: destinyProfileSource, name: "DP_WAIT_UI_ALLOWED_MODE_RE" },
];
for (const entry of waitUiAllowLists) {
  const literal = entry.source.match(new RegExp(`${entry.name}\\s*=\\s*(/[^\\n]+/)\\s*;`))?.[1];
  assert.ok(literal, `${entry.label}: ${entry.name} ?뺢퇋??由ы꽣?댁쓣 李얠? 紐삵뻽??);
  const allowed = new Function(`return ${literal};`)();
  for (const mode of ["pass", "monthly", "pass-applied", "payment-complete", "payment-failed"]) {
    assert.ok(allowed.test(mode), `${entry.label}: ${mode} ???쒖떆?섏뼱???쒕떎`);
  }
  for (const mode of ["payment", "checkout", "card", "confirm", "subscription"]) {
    assert.ok(!allowed.test(mode), `${entry.label}: ${mode} ?湲??붾㈃? 李⑤떒?섏뼱???쒕떎`);
  }
}
// ?ㅽ뙣???깃났(payment-complete)怨??ㅻⅨ 紐⑤뱶濡?媛덈씪???쒕떎 ??媛숈? 紐⑤뱶硫?'寃곗젣 ?꾨즺' ?쒕ぉ ?꾨옒 ?ㅽ뙣媛 ?щ떎.
assertContains(indexSource, "mode: 'payment-failed'", "failure overlay mode split");
assertNotContains(indexSource, "'寃곗젣 ?먮뒗 ?댁슜沅??뺤씤???ㅽ뙣?덉뒿?덈떎.'), mode: 'confirm' }", "failure no longer shares confirm mode");
assert.ok(
  /document\.body\.appendChild\(modal\);[\s\S]{0,300}?_cdEndPreCheckoutWaitUiSuppression\(\);/.test(indexSource),
  "pre-checkout suppression ends after the modal is mounted",
);

console.log("[verify-paid-gate-ui-regression] PASS");
