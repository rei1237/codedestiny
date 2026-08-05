­r‡^Ñf¥–Ø¦{OlyÊ'vÃ®¶›­import assert from "node:assert/strict";
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
    // ì„ ê²€ì‚¬ í˜¸ì¶œì€ app/life-book-ai/lifeBookApi.ts ì˜ prepareLifeBook ë¡œ ì˜®ê²¼ë‹¤(authFetch + ì¼ì‹œì¥ì•  ì¬ì‹œë„ + íƒ€ì„ì•„ì›ƒ).
    // ê³„ì•½(ê²Œì´íŠ¸ ì˜¤í”ˆ â†’ ì„ ê²€ì‚¬ â†’ ê²°ì œì°½)ì€ ê·¸ëŒ€ë¡œë‹¤.
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
assertContains(indexSource, "ê²°ì œ ê²€ì¦ì— ì‹¤íŒ¨í–ˆìŠµë‹ˆë‹¤.", "main shell payment verification failure message");
assertContains(indexSource, "honey-fortune-logo-payment-ux-v20260618", "honey fortune logo payment ux marker");
// ìì‚°ì´ ë¶€íŒ… ê²Œì´íŠ¸ì™€ ê°™ì€ /icons/app-logo-512.webp ë¡œ í†µí•©ë˜ë©´ì„œ(#200) ì´ ë‹¨ì–¸ì´ ë‚¡ì•˜ê³ ,
// ê°™ì€ ì¡ì˜ ì• ë‹¨ê³„(verify:security-hardening)ê°€ ë¨¼ì € ì£½ì–´ ìˆì–´ ì‹¤íŒ¨ê°€ ë“œëŸ¬ë‚˜ì§€ ì•Šì•˜ë‹¤.
// ê°€ë“œì˜ ì˜ë„ëŠ” "ê²°ì œ/ì´ìš©ê¶Œ ëŒ€ê¸° ì˜¤ë²„ë ˆì´ê°€ ë¸Œëœë“œ ë¡œê³ ë¥¼ ì“´ë‹¤"ì´ë¯€ë¡œ í˜„ì¬ ì •ë³¸ ê²½ë¡œë¡œ ë§ì¶˜ë‹¤.
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
// ğŸ”´ ê²°ì œ ë§ˆìŠ¤ì½”íŠ¸ëŠ” **ë©”ì¸ ì„œë¹„ìŠ¤ ë¡œê³  + ê²½ëŸ‰ ìì‚°**ì´ì–´ì•¼ í•œë‹¤. ì˜ˆì „ì—ëŠ” ì™¸ë¶€ í˜¸ìŠ¤íŠ¸ì˜ 725KB PNG ë¥¼
// ì§ì ‘ ì°¸ì¡°í–ˆê³ , CSS ê°€ [aria-hidden="false"] ë¡œ ê²Œì´íŠ¸ë¼ ì˜¤ë²„ë ˆì´ë¥¼ ì—¬ëŠ” ìˆœê°„(=ë‹¨ê±´ê²°ì œ í´ë¦­ ì§í›„)
// ì²˜ìŒ ìš”ì²­ì´ ë‚˜ê°€ checkout/PortOne SDK ì™€ ëŒ€ì—­í­ì„ ë‹¤í‰œë‹¤ â†’ "ë„¤íŠ¸ì›Œí¬ ì˜¤ë¥˜ + PGì°½ ë¯¸ë…¸ì¶œ".
// ë™ì¼ ì˜¤ë¦¬ì§„ 32KB ë¡œê³ ë¡œ ê³ ì •í•œë‹¤ â€” head ì— rel=preload fetchpriority=high ê°€ ì´ë¯¸ ìˆì–´
// ê²°ì œ í´ë¦­ ì‹œì ì—ëŠ” ì›Œì—„ ìºì‹œì´ê³ , í´ë¦­ ì„ê³„ê²½ë¡œì— ì¶”ê°€ ë„¤íŠ¸ì›Œí¬ê°€ 0 ì´ë‹¤.
assertContains(indexSource, ".cd-paid-gate__sprite-frame{position:relative;width:100%;height:100%;background-image:url(\"/icons/app-logo-512.webp", "paid gate sprite uses the preloaded same-origin service logo");
assertNotContains(indexSource, "window.alert('ë‹¨ê±´ ê²°ì œê°€ ì™„ë£Œë˜ì–´ ì—´ëŒë˜ì—ˆìŠµë‹ˆë‹¤.');", "single payment success uses designed overlay instead of alert");
assertNotContains(indexSource, "window.alert(_cdIsMembershipFreePayload(result.payload) ? 'ì´ìš©ê¶Œìœ¼ë¡œ ì—´ëŒë˜ì—ˆìŠµë‹ˆë‹¤.' : 'ì›”ì •ì„ ì‚¬ìš©ì´ ì™„ë£Œë˜ì—ˆìŠµë‹ˆë‹¤.');", "unlock monthly/pass success uses designed overlay instead of alert");
assertNotContains(indexSource, "window.alert(_cdIsMembershipFreePayload(r.payload) ? 'ì´ìš©ê¶Œìœ¼ë¡œ ì—´ëŒë˜ì—ˆìŠµë‹ˆë‹¤.' : 'ì›”ì •ì„ ì‚¬ìš©ì´ ì™„ë£Œë˜ì—ˆìŠµë‹ˆë‹¤.');", "tile monthly/pass success uses designed overlay instead of alert");

assertContains(billingClientSource, "hasVerifiedBillingAccess", "React billing access guard");
assertBefore(billingClientSource, "if (!hasVerifiedBillingAccess(parsed.data", "markPaidAttemptPaymentSucceeded()", "React billing verifies before success");
assertContains(billingClientSource, "SERVER_ACCESS_GRANT_MISSING", "React server grant missing error");
assertContains(billingClientSource, "ì„œë²„ ê¶Œí•œ ê²€ì¦ì— ì‹¤íŒ¨í–ˆìŠµë‹ˆë‹¤", "React server verification failure message");
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
assertContains(billingClientSource, 'PAID_SERVICE_RUNTIME_SRC = "/jç}»¶‰Ëkºwµç}ÕÉ”°€‰•Ñ5•µ‰•ÉÍ¡¥ÁA…ÍÍ½É	¥±±¥¹I•ÅÕ•ÍĞˆ°€‰…ÉÁÉ•Á…É”Á•É™½ÉµÌé•É¼Á…ÍÌ±½½­ÕÁÌˆ¤ì4)…ÍÍ•ÉÑ9½Ñ½¹Ñ…¥¹Ì¡‘¥É•Ñ¡•­½ÕÑM½ÕÉ”°€‰É…¹ÑA…ÍÍÉ•••ÍÍ	•™½É•…É‘%™Ù…¥±…‰±”ˆ°€‰…ÉÁÉ•Á…É”…¹¹½Ğ½¹Ù•ÉĞÑ¼Á…ÍÌ…•ÍÌˆ¤ì4)…ÍÍ•ÉÑ9½Ñ½¹Ñ…¥¹Ì¡‘¥É•Ñ½¹™¥ÉµM½ÕÉ”°€‰•Ñ5•µ‰•ÉÍ¡¥ÁA…ÍÍ½É	¥±±¥¹I•ÅÕ•ÍĞˆ°€‰…É½¹™¥É´Á•É™½ÉµÌé•É¼Á…ÍÌ±½½­ÕÁÌˆ¤ì4)…ÍÍ•ÉÑ9½Ñ½¹Ñ…¥¹Ì¡‘¥É•Ñ½¹™¥ÉµM½ÕÉ”°€‰É…¹ÑA…ÍÍÉ•••ÍÍ	•™½É•…É‘%™Ù…¥±…‰±”ˆ°€‰…É½¹™¥É´…¹¹½Ğ½¹Ù•ÉĞÑ¼Á…ÍÌ…•ÍÌˆ¤ì4(4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡¥¹‘•áM½ÕÉ”°€‰Á…ÍÍ	ÕÑÑ½¹!Ñµ°ˆ°€‰…¹½¹¥…°Á…åµ•¹Ğµ½‘…°Á…ÍÌÍÑ½É”½ÁÑ¥½¸ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡¥¹‘•áM½ÕÉ”°€‰Ù…È…±±½İA…ÍÍ¡½¥”€ô½ÁÑÌ¹‘¥Í…‰±•A…ÍÍ¡½¥”€„ôôÑÉÕ”ˆ°€‰Á…ÍÌ½ÁÑ¥½¸¥Ì…Ù…¥±…‰±”‰ä‘•™…Õ±ĞÕ¹±•ÍÌ•áÁ±¥¥Ñ±ä‘¥Í…‰±•ˆ¤ì4(¼¼ƒÂ~RĞƒªÊÃ²‚s²Âôƒ²V#²^C²pƒ²vÓ²j§ªÚ3²vƒ¶fW²vã¶V€ƒ²"`ƒ²z#²ZÓ²Vğƒ¶Vs®. ÈÀÈØ´ÀÜƒ²‚W²Æƒ²‚¶f`¤¸4(¼¼ƒ²²zƒ²ƒªÊ²
³²v`ƒ²s®Êƒ²fW®Î×²vƒ²^²Vƒ®2².€€Ÿ²vÓ²j§ªÚ3²ró®†pƒªÖ³®œƒ²æÓ®NsªÂ ƒªŞàƒ²zC®š³²^C²pƒ²s®Ê²^@ƒ®²ï®*S®.¸ƒ²b#²‚²^C®*P4(¼¼ƒ®Âc®2®†p€‹²vÓ²j§ªÚ3²v ƒªÊÃ²‚s²Â÷²vƒ²^ÓªâÀƒ²‚²^C®0ƒ¶fW²vã®B§®.#®.‹®vó®*Pƒ®'®.“®–àƒ²V#®
ÓªÂ ƒ²z#²^#ªÎ€°ƒªŞàƒ®²ãªÖ³®–ğƒ²^³ªâÃ²pƒªÎƒ²‚W¶VcªÎ€4(¼¼ƒ²z#²^#®.ƒŠPƒªŞàƒ²¶s®†pƒ²ƒªÊ²
³®–ğƒ²^²Vƒ®¦Ğƒ²*“®²Üƒ²^®*Pƒ²vÓ²j§ªÚ0ƒ®ÎÓ²rƒ²zCªÂ ƒ¶fW²vã¶V€ƒ®Â§®ÊTƒ²zC²ÊÓ®–ğƒ²z®*S®.¸4)…ÍÍ•ÉÑ9½Ñ½¹Ñ…¥¹Ì¡¥¹‘•áM½ÕÉ”°€‹²vÓ²j§ªÚ3²v ƒªÊÃ²‚s²Â÷²vƒ²^ÓªâÀƒ²‚²^C®0ƒ¶fW²vã®B§®.#®.¸ˆ°€‰¥¸µµ½‘…°Á…ÍÌÙ•É¥™¥…Ñ¥½¸µÕÍĞ¹½Ğ‰”‰±½­•……¥¸ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡¥¹‘•áM½ÕÉ”°€‰Ù…ÈÁ…ÍÍI•…‘ä€ô…İ…¥ĞÉ•™É•Í¡¥É•Ñ¹Ñ¥Ñ±•µ•¹ÑMÑ…ÑÕÌ ¤ìˆ°€‰Á…ÍÌ…ÉÙ•É¥™¥•ÌÑ¡”•¹Ñ¥Ñ±•µ•¹Ğ¥¸Á±…”ˆ¤ì4)…ÍÍ•ÉÑ	•™½É” 4(€¥¹‘•áM½ÕÉ”°4(€€‰Ù…ÈÁ…ÍÍI•…‘ä€ô…İ…¥ĞÉ•™É•Í¡¥É•Ñ¹Ñ¥Ñ±•µ•¹ÑMÑ…ÑÕÌ ¤ìˆ°4(€€‰İ¥¹‘½Ü¹Í•ÑQ¥µ•½ÕĞ¡½Á•¹A…ÍÍMÑ½É•™Ñ•É¡•¬°€ĞÔÀ¤ìˆ°4(€€‰Á…ÍÌ…ÉµÕÍĞÙ•É¥™ä™¥ÉÍĞ…¹½¹±äÑ¡•¸™…±°Ñ¡É½Õ Ñ¼Ñ¡”ÍÑ½É”ˆ°4(¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡¥¹‘•áM½ÕÉ”°€‰İ¥¹‘½Ü¹±½…Ñ¥½¸¹…ÍÍ¥¸ œ½Á½¥¹ÑÌıÍ½ÕÉ”õ‘¥É•ĞµÁ…åµ•¹ĞµÁ…ÍÌµÍÑ½É”œ¤ìˆ°€‰…¹½¹¥…°Á…ÍÌ¡½¥”½Á•¹ÌÁ…ÍÌÍÑ½É”ˆ¤ì4(¼¼ƒÂ~RĞƒ²VÇ²^C²s®*P€½Á½¥¹ÑÌƒ®†pƒ¶R®†sªŞã®zc®“¶.Äƒ²vÓ®>g¶Vc®¦Ğ€ĞÀĞƒ®.£²VÄƒ®Ê#®N“²^@ƒ²^ªÎ€°ƒªÂ®Ns®*Pƒ²V×²îƒ¶Ó®š·®0ƒªÂ®†s²Æ#®.¤¸4(¼¼ƒ®Âc®Ns².p}}‘=Á•¹¡…É•5½‘…°£ªÂ®NsªÂ €½…ÁÀ½ÍÑ½É”¼ƒ®†pƒªÎƒ²‚T¤ƒ®ÚªâÃ®–ğƒ®¢ó²‚ ƒ¶²Vğƒ¶Vs®.¸4)…ÍÍ•ÉÑ	•™½É” 4(€¥¹‘•áM½ÕÉ”°4(€€‰¥˜€¡}‘M¡½Õ±‘UÍ•ÁÁMÑ½É•¹ÑÉä ¤€˜˜ÑåÁ•½˜İ¥¹‘½Ü¹}}‘=Á•¹¡…É•5½‘…°€ôôô€™Õ¹Ñ¥½¸œ¤ìˆ°4(€€‰Ù…ÈÁ…ÍÍMÑ½É•UÉ°€ô}‘	Õ¥±‘A…ÍÍMÑ½É•UÉ°¡½¥¹AÉ¥”°Á…ÍÍ½Ù•É…”°€‘¥É•ĞµÁ…åµ•¹ĞµÁ…ÍÌµÍÑ½É”œ¤ìˆ°4(€€‰…ÁÀÉÕ¹Ñ¥µ”µÕÍĞÑ…­”Ñ¡”¥¸µ…ÁÀÍÑ½É”‰•™½É”…¹ä€½Á½¥¹ÑÌ¹…Ù¥…Ñ¥½¸ˆ°4(¤ì4)…ÍÍ•ÉÑ9½Ñ½¹Ñ…¥¹Ì¡¥¹‘•áM½ÕÉ”°€‰É•…Í½¸è€Á…ÍÍ}…ÁÁ±¥•‘}¥¹}µ½‘…°œˆ°€‰µ•µ‰•ÉÍ¡¥ÀÁ…ÍÌ¡½¥”µÕÍĞÉ…¹Ğ¥¹ÍÑ•…½˜…¹•±±¥¹œˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰¥˜€¡¡½¥”€ôôô€Á…ÍÌœ¤ˆ°€‰‘•ÍÑ¥¹äÁ…ÍÌ¡½¥”É…¹ĞÁ…Ñ ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰}}‘I•ÍÑ½É•…¹½¹¥…±A…åµ•¹Ñ5½‘”ˆ°€‰‘•ÍÑ¥¹ä™…±±‰…¬É•ÍÑ½É•Ì…¹½¹¥…°Í•±•Ñ½Èˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰}}‘MÕÁÁ½ÉÑÍA…ÍÍ¡½¥”ˆ°€‰‘•ÍÑ¥¹ä™…±±‰…¬É•ÅÕ¥É•ÌÁ…ÍÌµ…Á…‰±”Í•±•Ñ½Èˆ¤ì4(¼¼ƒ®>®šô£²‚W²‚¤ƒ¶>Ó®ÂÇ®>ƒ²‚W®ÎãªÎğƒªÂg²v €Ï²b×²`ƒªÊÃ²‚s²Â÷²vÓ²ZÓ²Vğƒ¶Vs®.¸ƒ²bl€Ë²b×²`£²vÓ²j§ªÚ0ƒ²²‚@ƒ²^®*P¤ƒ®ª£®.°ƒ®Ú¶fpƒ®Â§²²v`4(¼¼ƒ®Îã²ÊÓ®*Pƒ²V®z`…¹½¹¥…°ƒ²r²zƒ®.£²Zã®N“²vÓªÎ€°ƒ²^³ªâÃ²s®*Pƒ²àƒªÊÃ²‚s²"c®.£²vĞƒ®ª£®F@ƒ®‚3®6S®Bc®*S²®–ğƒ²²‚Dƒ¶fW²vã¶Vs®.¸4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‘…Ñ„µµ½‘”ô‰Á…ÍÌµÍÑ½É”ˆœ°€‰ÍÑ…¹‘…±½¹”¡½½Í•È­••ÁÌÁ…ÍÌÍÑ½É”½ÁÑ¥½¸ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‘…Ñ„µµ½‘”ô‰‘¥É•Ğˆœ°€‰ÍÑ…¹‘…±½¹”¡½½Í•È­••ÁÌ‘¥É•Ğ½ÁÑ¥½¸ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‘…Ñ„µµ½‘”ô‰µ½¹Ñ¡±äˆ‘…Ñ„µµ½¹Ñ¡±äµ½ÁÑ¥½¸œ°€‰ÍÑ…¹‘…±½¹”¡½½Í•È­••ÁÌµ½¹Ñ¡±ä½ÁÑ¥½¸ˆ¤ì4)…ÍÍ•ÉÑ9½Ñ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰½Á•¹M•ÉÙ¥•A…åµ•¹Ñ¡½¥•5½‘…°ˆ°€‰±•…ä‘•ÍÑ¥¹äÁ…åµ•¹ĞÍ•±•Ñ½ÈÉ•¹‘•É•ÈÉ•µ½Ù•ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰}}‘¡½½Í•M•ÉÙ¥•A…åµ•¹Ñ5½‘•…¹½¹¥…°ˆ°€‰‘•ÍÑ¥¹ä™…±±‰…¬‘•±•…Ñ•ÌÑ¼…¹½¹¥…°Á…ÍÌÍ•±•Ñ½Èˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰Í•ÉÙ¥”¹•á•ÕÑ•A…åµ•¹Ğ¡ìˆ°€‰‘•ÍÑ¥¹ä™…±±‰…¬ÕÍ•ÌÍ¡…É•½µµ…¹Í¥¹±”µ™±¥¡Ğˆ¤ì4)…ÍÍ•ÉÑ9½Ñ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰½ÁÑÌ¹¥¹Ñ•É¹…±5…¥¹…Ñ”€„ôôÑÉÕ”€˜˜½ÁÑÌ¹}}‘A…åµ•¹Ñ…Ñ•ÕÑ¡½É¥é•€„ôôÑÉÕ”€˜˜ÑåÁ•½˜İ¥¹‘½Ü¹}}‘ÁÁ±å5•µ‰•ÉÍ¡¥ÁA…ÍÍ	•™½É•A…åµ•¹Ğˆ°€‰‘•ÍÑ¥¹ä¹¼ÁÉ”µµ½‘…°Á…ÍÌ‰½ÑÑ±•¹•¬ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰}‘ÁM•ÑA…åµ•¹ÑA•¹‘¥¹œ¡™…±Í”¤íq¸€€€€€Ù…ÈÉÍÀ€ô…İ…¥Ğİ¥¹‘½Ü¹A½ÉÑ=¹”¹É•ÅÕ•ÍÑA…åµ•¹Ğ¡É•ÅÕ•ÍÑ…Ñ„¤ìˆ°€‰‘•ÍÑ¥¹äÉÕ¹Ñ¥µ”¡¥‘•ÌÁ…åµ•¹Ğ½Ù•É±…ä¥µµ•‘¥…Ñ•±ä‰•™½É”Aİ¥¹‘½Üˆ¤ì4(¼¼ƒ²‚W²‚ƒ¶>Ó®ÂÄƒ²b“®Ê®‚#²vÓªÂ ƒªÊÃ²‚s²"c®.£®Îƒ²V#®
Ó®–ğƒ®‚3®6S¶Vc®*S² £²nS²‚W²w
ß®.£ªÆÓ
ß²f®0ƒ²‚s®ª¤ƒ²‚¶f`€¬ƒ²f®0ƒ¶R®‚#²z¤ƒ¶j3ªŞ ƒ®Â§² ¸4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰™Õ¹Ñ¥½¸}‘ÁI•Í½±Ù•MÑ…¹‘…±½¹•=Ù•É±…å½Áäˆ°€‰‘•ÍÑ¥¹ä™…±±‰…¬½Ù•É±…ä½Áä¥Ìµ½‘”µ…İ…É”ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰Ñ¥Ñ±”è€Ÿ²nS²‚W²tƒ²
³²j¤ƒ²’Dœˆ°€‰‘•ÍÑ¥¹ä™…±±‰…¬µ½¹Ñ¡±ä½Ù•É±…äÑ¥Ñ±”ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰Ñ¥Ñ±”è€ŸªÊÃ²‚pƒ²¶Z$ƒ²’Dœˆ°€‰‘•ÍÑ¥¹ä™…±±‰…¬‘¥É•ĞÁ…åµ•¹Ğ½Ù•É±…äÑ¥Ñ±”ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰Ñ¥Ñ±”è€ŸªÊÃ²‚pƒ²f®0œˆ°€‰‘•ÍÑ¥¹ä™…±±‰…¬Á…åµ•¹Ğµ½µÁ±•Ñ”½Ù•É±…äÑ¥Ñ±”ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰¥˜€¡¡½¥”€ôôô€µ½¹Ñ¡±äœ¤}‘ÁM¡½İA…åµ•¹Ñ½µÁ±•Ñ•=Ù•É±…ä¡}‘ÁQ•áĞ µ½¹Ñ¡±åÁÁ±¥•‘=Ù•É±…äœ¤¤ˆ°€‰‘•ÍÑ¥¹ä™…±±‰…¬Í¡½İÌµ½¹Ñ¡±ä½µÁ±•Ñ¥½¸™É…µ”ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°€‰}‘ÁM¡½İA…åµ•¹Ñ½µÁ±•Ñ•=Ù•É±…ä¡}‘ÁQ•áĞ Á…åµ•¹Ñ½µÁ±•Ñ•=Ù•É±…äœ¤¤ˆ°€‰‘•ÍÑ¥¹ä™…±±‰…¬Í¡½İÌ‘¥É•Ğ½µÁ±•Ñ¥½¸™É…µ”ˆ¤ì4(4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡Á…åµ•¹ÑÍI½ÕÑ•M½ÕÉ”°€‰™•Ñ¡A½ÉÑ=¹•A…åµ•¹Ğˆ°€‰Í•ÉÙ•ÈA½ÉÑ=¹”Ù•É¥™¥…Ñ¥½¸ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡Á…åµ•¹ÑÍI½ÕÑ•M½ÕÉ”°€‰µ•É¡…¹ÑU¥ˆ°€‰µ•É¡…¹ÑU¥‘ÕÁ±¥…Ñ”­•äˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡Á…åµ•¹ÑÍI½ÕÑ•M½ÕÉ”°€‰¥‘•µÁ½Ñ•¹å-•äˆ°€‰¥‘•µÁ½Ñ•¹ä‘ÕÁ±¥…Ñ”­•äˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡Á…åµ•¹ÑÍI½ÕÑ•M½ÕÉ”°€‰¥‘•µÁ½Ñ•¹ĞèÑÉÕ”ˆ°€‰¥‘•µÁ½Ñ•¹ĞÍÕ•ÍÌ¡…¹‘±¥¹œˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡Á…åµ•¹ÑÍI½ÕÑ•M½ÕÉ”°€‰…•ÍÍÉ…¹Ğˆ°€‰Í•ÉÙ•È…•ÍÌÉ…¹ĞÉ•ÍÁ½¹Í”ˆ¤ì4(4)½¹ÍĞ±•…åA¥½¥¹½¹ÍÕµ••Ñ €ô€™•Ñ  ˆ½…Á¤½™½ÉÑÕ¹”¼œ€¬€Á¥œµ½¥¸¼œ€¬€½¹ÍÕµ”œì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡Ñ…É½Ñ1½Ù•M½ÕÉ”°€‰İ¥¹‘½Ü¹}‘=Á•¹A…¥‘M•ÉÙ¥•…Ñ”ˆ°€‰Ñ…É½Ğ±½Ù”ÕÍ•Ì½µµ½¸Á…¥Í•ÉÙ¥”…Ñ”ˆ¤ì4)…ÍÍ•ÉÑ9½Ñ½¹Ñ…¥¹Ì¡Ñ…É½Ñ1½Ù•M½ÕÉ”°€™•Ñ  ˆ½…Á¤½‰¥±±¥¹œ½½¥¸µ…Ñ”ˆœ°€‰Ñ…É½Ğ±½Ù”‘¥É•Ğ½¥¸…Ñ”‰åÁ…ÍÌÉ•µ½Ù•ˆ¤ì4)…ÍÍ•ÉÑ9½Ñ½¹Ñ…¥¹Ì¡Ñ…É½Ñ1½Ù•M½ÕÉ”°±•…åA¥½¥¹½¹ÍÕµ••Ñ °€‰Ñ…É½Ğ±½Ù”±•…ä½¹ÍÕµ”‰åÁ…ÍÌÉ•µ½Ù•ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡‰¥±±¥¹±¥•¹ÑM½ÕÉ”°€‰¡…ÍY•É¥™¥•‘	¥±±¥¹•ÍÌˆ°€‰½µµ½¸Á…¥…Ñ”­••ÁÌÍ•ÉÙ•È…•ÍÌÕ…Éˆ¤ì4(4)½¹ÍĞ™½ÉÑÕ¹•Q•…MÕ‰µ¥ÑM½ÕÉ”€ôÍ•Ñ¥½¸ 4(€™½ÉÑÕ¹•Q•…!½ÕÍ•M½ÕÉ”°4(€€‰…Íå¹Œ™Õ¹Ñ¥½¸ÍÕ‰µ¥ÑEÕ•ÍÑ¥½¸¡¹•áÑEÕ•ÍÑ¥½¹%¹ÁÕĞè½ÉÑÕ¹•Q•…!½ÕÍ•EÕ•ÍÑ¥½¹%¹ÁÕĞ¤ˆ°4(€€‰ô…Ñ €¡•ÉÉ½È¤ìˆ°4(€€‰™½ÉÑÕ¹”Ñ•„¡½ÕÍ”ÍÕ‰µ¥Ğ™±½Üˆ4(¤ì4)…ÍÍ•ÉÑ	•™½É”¡™½ÉÑÕ¹•Q•…MÕ‰µ¥ÑM½ÕÉ”°€‰…İ…¥Ğ‰•¥¹½ÉÑÕ¹•Q•…•ÍÍ…Ñ”ˆ°€‰Á½ÍÑ½ÉÑÕ¹•Q•…½¹ÍÕ±ÑI•ÅÕ•ÍĞ¡¥¹¥Ñ¥…±½¹ÍÕ±Ñ	½‘äˆ°€‰™½ÉÑÕ¹”Ñ•„¡½ÕÍ”½Á•¹ÌÁ…¥…Ñ”‰•™½É”½¹ÍÕ±ĞA$ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡™½ÉÑÕ¹•Q•…MÕ‰µ¥ÑM½ÕÉ”°€‰…•ÍÍ…Ñ•MÑ…ÉÑ•€ôÑÉÕ”ˆ°€‰™½ÉÑÕ¹”Ñ•„¡½ÕÍ”ÑÉ…­ÌÁ…¥…Ñ”ÍÑ…Ñ”ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡™½ÉÑÕ¹•Q•…!½ÕÍ•M½ÕÉ”°€‰…İ…¥Ğ½µÁ±•Ñ•½ÉÑÕ¹•Q•…•ÍÍ…Ñ”ˆ°€‰™½ÉÑÕ¹”Ñ•„¡½ÕÍ”½µÁ±•Ñ•ÌÁ…¥…Ñ”…™Ñ•È…•ÍÌˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡™½ÉÑÕ¹•Q•…!½ÕÍ•M½ÕÉ”°€‰…İ…¥Ğ™…¥±½ÉÑÕ¹•Q•…•ÍÍ…Ñ”ˆ°€‰™½ÉÑÕ¹”Ñ•„¡½ÕÍ”Í¡½İÌÁ…¥…Ñ”™…¥±ÕÉ”ˆ¤ì4(4)½¹ÍĞ¹•½MÕ‰µ¥ÑM½ÕÉ”€ôÍ•Ñ¥½¸ 4(€¹•½=Á•É…Ñ¥½¹I½½µM½ÕÉ”°4(€€‰…Íå¹Œ™Õ¹Ñ¥½¸¡…¹‘±•MÕ‰µ¥Ğ¡•Ù•¹Ğè½ÉµÙ•¹Ğñ!Q51½Éµ±•µ•¹Ğø¤ˆ°4(€€‰ô…Ñ €¡…Õ¡Ğ¤ìˆ°4(€€‰¹•¼½Á•É…Ñ¥½¸É½½´ÍÕ‰µ¥Ğ™±½Üˆ4(¤ì4)…ÍÍ•ÉÑ	•™½É”¡¹•½MÕ‰µ¥ÑM½ÕÉ”°€‰‰•¥¹A…¥‘•…ÑÕÉ•…Ñ•¡•¬¡ìˆ°€‰Á½ÍÑ)Í½¸ñ¹ÍÕÉ••ÍÍI•ÍÕ±Ğø¡A%}9A=%9QL¹•¹ÍÕÉ••ÍÌˆ°€‰¹•¼½Á•É…Ñ¥½¸É½½´½Á•¹ÌÁ…¥…Ñ”‰•™½É”•¹ÍÕÉ”µ…•ÍÌA$ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡¹•½MÕ‰µ¥ÑM½ÕÉ”°€‰½µÁ±•Ñ•A…¥‘•…ÑÕÉ•…Ñ•¡•¬¡ìˆ°€‰¹•¼½Á•É…Ñ¥½¸É½½´½µÁ±•Ñ•ÌÁ…¥…Ñ”…™Ñ•È…•ÍÌˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡¹•½=Á•É…Ñ¥½¹I½½µM½ÕÉ”°€‰™…¥±A…¥‘•…ÑÕÉ•…Ñ•¡•¬¡ìˆ°€‰¹•¼½Á•É…Ñ¥½¸É½½´Í¡½İÌÁ…¥…Ñ”™…¥±ÕÉ”ˆ¤ì4(4)™½È€¡½¹ÍĞ™•…ÑÕÉ”½˜É•…Ñ…Ñ•¥ÉÍÑ•…ÑÕÉ•M½ÕÉ•Ì¤ì4(€…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡™•…ÑÕÉ”¹Í½ÕÉ”°€‰‰•¥¹A…¥‘•…ÑÕÉ•…Ñ•¡•¬ˆ°€‘í™•…ÑÕÉ”¹±…‰•±ô¥µÁ½ÉÑÌ…Ñ”µ™¥ÉÍĞ¡•±Á•É€¤ì4(€…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡™•…ÑÕÉ”¹Í½ÕÉ”°€‰½µÁ±•Ñ•A…¥‘•…ÑÕÉ•…Ñ•¡•¬ˆ°€‘í™•…ÑÕÉ”¹±…‰•±ô½µÁ±•Ñ•ÌÁ…¥…Ñ•€¤ì4(€…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡™•…ÑÕÉ”¹Í½ÕÉ”°€‰™…¥±A…¥‘•…ÑÕÉ•…Ñ•¡•¬ˆ°€‘í™•…ÑÕÉ”¹±…‰•±ô™…¥±ÌÁ…¥…Ñ”Ù¥Í¥‰±å€¤ì4(€…ÍÍ•ÉÑ	•™½É”¡™•…ÑÕÉ”¹Í½ÕÉ”°€‰‰•¥¹A…¥‘•…ÑÕÉ•…Ñ•¡•¬¡ìˆ°™•…ÑÕÉ”¹…Á¤°€‘í™•…ÑÕÉ”¹±…‰•±ô½Á•¹ÌÁ…¥…Ñ”‰•™½É”…•ÍÌA%€¤ì4(€½¹ÍĞ…Ñ•¥ÉÍÑ±½İM½ÕÉ”€ô™•…ÑÕÉ”¹Í½ÕÉ”¹Í±¥”¡™•…ÑÕÉ”¹Í½ÕÉ”¹¥¹‘•á=˜ ‰‰•¥¹A…¥‘•…ÑÕÉ•…Ñ•¡•¬¡ìˆ¤¤ì4(€…ÍÍ•ÉÑ	•™½É”¡…Ñ•¥ÉÍÑ±½İM½ÕÉ”°™•…ÑÕÉ”¹…Á¤°™•…ÑÕÉ”¹¡•­½ÕĞ°€‘í™•…ÑÕÉ”¹±…‰•±ô¡•­Ì•¹Ñ¥Ñ±•µ•¹Ğ‰•™½É”¡•­½ÕĞ…Ñ•€¤ì4)ô4(4(¼¼½É…±”£²²b“®£².p§
İå½„µÕÉÔèƒ²s®ÊªÂ ƒªÊÃ²‚s®–ğ•µ¥¹¤¡…±±•µ¥¹¥Q•áĞ¤ƒ¶bã²Úpƒ²vÓ²‚²^@ƒªÊ²šw¶VÓ²Vğƒ¶Vs®.¸4(¼¼ƒ¶Ó®vğƒ²jÃ¶j3®†p€½…Á¤½½É…±”½•½µ…¹ç
Ü½…Á¤½å½„µÕÉ×®–ğƒ²²‚Dƒ¶bã²Ús¶VĞƒ®²Ó®0114ƒ²w²Ç¶Vc®*PƒªÊ²vƒ²Â£®. ¸4)½¹ÍĞ½É…±•I½ÕÑ•M½ÕÉ”€ôÉ•…‘¥±•Må¹Œ¡É•Í½±Ù”¡É½½Ğ°€‰İ½É­•È½É½ÕÑ•Ì½½É…±”¹©Ìˆ¤°€‰ÕÑ˜àˆ¤ì4)½¹ÍĞå½…ÕÉÕI½ÕÑ•M½ÕÉ”€ôÉ•…‘¥±•Må¹Œ¡É•Í½±Ù”¡É½½Ğ°€‰İ½É­•È½É½ÕÑ•Ì½å½„µÕÉÔ¹©Ìˆ¤°€‰ÕÑ˜àˆ¤ì4)½¹ÍĞ…•ÍÍ½¹ÑÉ½±M½ÕÉ”€ôÉ•…‘¥±•Må¹Œ¡É•Í½±Ù”¡É½½Ğ°€‰İ½É­•È½±¥ˆ½…•ÍÌµ½¹ÑÉ½°¹©Ìˆ¤°€‰ÕÑ˜àˆ¤ì4)½¹ÍĞ•½µ…¹å±¥•¹ÑM½ÕÉ”€ôÉ•…‘¥±•Må¹Œ¡É•Í½±Ù”¡É½½Ğ°€‰ÁÕ‰±¥Œ½•½µ…¹äµ½É…±”µØĞ¹¡Ñµ°ˆ¤°€‰ÕÑ˜àˆ¤ì4)½¹ÍĞå½…±¥•¹ÑM½ÕÉ”€ôÉ•…‘¥±•Må¹Œ¡É•Í½±Ù”¡É½½Ğ°€‰ÁÕ‰±¥Œ½å½„µÕÉÔ¹¡Ñµ°ˆ¤°€‰ÕÑ˜àˆ¤ì4)½¹ÍĞ½É…±•!…¹‘±•ÉM½ÕÉ”€ô½É…±•I½ÕÑ•M½ÕÉ”¹Í±¥”¡½É…±•I½ÕÑ•M½ÕÉ”¹¥¹‘•á=˜ ‰•áÁ½ÉĞ…Íå¹Œ™Õ¹Ñ¥½¸¡…¹‘±•=É…±•I½ÕÑ•Ìˆ¤¤ì4)…ÍÍ•ÉÑ	•™½É”¡½É…±•!…¹‘±•ÉM½ÕÉ”°€‰É•ÅÕ¥É•ÕÑ ¡É•ÅÕ•ÍĞ°•¹Ø¤ˆ°€‰‰Õ¥±‘•½µ…¹å=É…±”¡•¹Ø°Á…å±½…¤ˆ°€‰½É…±”Ù•É¥™¥•Ì…ÕÑ ‰•™½É”•¹•É…Ñ¥¹œˆ¤ì4)…ÍÍ•ÉÑ	•™½É”¡½É…±•!…¹‘±•ÉM½ÕÉ”°€‰É•ÅÕ¥É•AÉ•µ¥ÕµI•Á½ÉÑ•ÍÌ ˆ°€‰‰Õ¥±‘•½µ…¹å=É…±”¡•¹Ø°Á…å±½…¤ˆ°€‰½É…±”Ù•É¥™¥•ÌÁ…åµ•¹Ğ‰•™½É”•¹•É…Ñ¥¹œˆ¤ì4)½¹ÍĞå½…!…¹‘±•ÉM½ÕÉ”€ôå½…ÕÉÕI½ÕÑ•M½ÕÉ”¹Í±¥”¡å½…ÕÉÕI½ÕÑ•M½ÕÉ”¹¥¹‘•á=˜ ‰…Íå¹Œ™Õ¹Ñ¥½¸¡…¹‘±••¹•É…Ñ•e½…½ÕÉÍ”ˆ¤¤ì4)…ÍÍ•ÉÑ	•™½É”¡å½…!…¹‘±•ÉM½ÕÉ”°€‰É•ÅÕ¥É•ÕÑ ¡É•ÅÕ•ÍĞ°•¹Ø¤ˆ°€‰…±±•µ¥¹¥Q•áĞˆ°€‰å½„µÕÉÔÙ•É¥™¥•Ì…ÕÑ ‰•™½É”•µ¥¹¤ˆ¤ì4)…ÍÍ•ÉÑ	•™½É”¡å½…!…¹‘±•ÉM½ÕÉ”°€‰É•ÅÕ¥É•AÉ•µ¥ÕµI•Á½ÉÑ•ÍÌ ˆ°€‰…±±•µ¥¹¥Q•áĞˆ°€‰å½„µÕÉÔÙ•É¥™¥•ÌÁ…åµ•¹Ğ‰•™½É”•µ¥¹¤ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡…•ÍÍ½¹ÑÉ½±M½ÕÉ”°€É•Á½ÉÑQåÁ”€ôôô€‰•½µ…¹å=É…±”ˆœ°€‰…•ÍÌµ½¹ÑÉ½°¡…Ì•½µ…¹äÁ…åµ•¹ĞÉÕ±”ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡…•ÍÍ½¹ÑÉ½±M½ÕÉ”°€É•Á½ÉÑQåÁ”€ôôô€‰å½…ÕÉÕ½ÕÉÍ”ˆœ°€‰…•ÍÌµ½¹ÑÉ½°¡…Ìå½„Á…åµ•¹ĞÉÕ±”ˆ¤ì4(¼¼ƒ®ÂÃ²^Ó²v ƒ®š³¶>³¶*ã¶²z²vĞƒ®*c²ZÓ®
€ƒ²"`ƒ²z#²ró®¾®†pƒ®š³¶Ã®~Ğƒ²‚²ÊÓªÂ ƒ²V®.#®vğƒ¶V²"`ƒ¶V·®ª¤ƒ¶>³¶V ƒ²^³®Ú®†pƒ®Îã®.¸4)½¹ÍĞÉ••¹ÑA…åµ•¹Ñ]¥¹‘½İ1¥ÍĞ€ô…•ÍÍ½¹ÑÉ½±M½ÕÉ”¹µ…Ñ  ½qmmyqut©qup¹¥¹±Õ‘•Íp¡¹½Éµ…±¥é•‘I•Á½ÉÑQåÁ•p¤¼¤ü¹lÁtñğ€ˆˆì4)™½È€¡½¹ÍĞÉ•Á½ÉÑQåÁ”½˜l‰•±•ÍÑ¥…±!…Éµ½¹äˆ°€‰•½µ…¹å=É…±”ˆ°€‰å½…ÕÉÕ½ÕÉÍ”‰t¤ì4(€…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡É••¹ÑA…åµ•¹Ñ]¥¹‘½İ1¥ÍĞ°€ˆ‘íÉ•Á½ÉÑQåÁ•ô‰€°É••¹ĞµÁ…åµ•¹Ğµİ¥¹‘½Ü™…±±‰…¬½Ù•ÉÌ€‘íÉ•Á½ÉÑQåÁ•õ€¤ì4)ô4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡•½µ…¹å±¥•¹ÑM½ÕÉ”°€‰•½µ…¹åA…åÙ¥‘•¹”ˆ°€‰•½µ…¹ä±¥•¹Ğ™½Éİ…É‘ÌÁ…åµ•¹Ğ•Ù¥‘•¹”ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡•½µ…¹å±¥•¹ÑM½ÕÉ”°€‰É•‘•¹Ñ¥…±Ìè¥¹±Õ‘”œˆ°€‰•½µ…¹ä±¥•¹ĞÍ•¹‘Ì…ÕÑ É•‘•¹Ñ¥…±Ìˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡å½…±¥•¹ÑM½ÕÉ”°€‰å½…A…åÙ¥‘•¹”ˆ°€‰å½„±¥•¹Ğ™½Éİ…É‘ÌÁ…åµ•¹Ğ•Ù¥‘•¹”ˆ¤ì4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡å½…±¥•¹ÑM½ÕÉ”°€‰É•‘•¹Ñ¥…±Ìè€¥¹±Õ‘”œˆ°€‰å½„±¥•¹ĞÍ•¹‘Ì…ÕÑ É•‘•¹Ñ¥…±Ìˆ¤ì4(4)™½È€¡½¹ÍĞÍ½ÕÉ”½˜m¥¹‘•áM½ÕÉ”°ÍÑ…Ñ¥%¹‘•áM½ÕÉ•t¤ì4(€…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡Í½ÕÉ”°€¥ô‰µµ…¥¸µÍ¡•±°µÉ¥Ñ¥…°µØÈÀÈØÀØÀĞˆœ°€‰É¥Ñ¥…°MLµ…É­•Èµ¥ÉÉ½É•ˆ¤ì4(€…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡Í½ÕÉ”°€‘…Ñ„µµ…É­•Èô‰µ½½¹ÍÑ½¹”µÁ…ÍÌµÕ¤µØÈÀÈØÀØÀÔµÍÑ…É±¥¡ĞµÑ„ˆœ°€‰±…ÍÌMLµ…É­•Èµ¥ÉÉ½É•ˆ¤ì4(€…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡Í½ÕÉ”°€ˆ¹µ½½¸µ¡•É½íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹Ìˆ°€‰‘•Í­Ñ½ÀÉ¥Ñ¥…°±…å½ÕĞˆ¤ì4(€…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡Í½ÕÉ”°€‰µ•‘¥„€¡µ…àµİ¥‘Ñ èàØÁÁà¤ˆ°€‰µ½‰¥±”É¥Ñ¥…°±…å½ÕĞˆ¤ì4(€…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡Í½ÕÉ”°€ˆ¹µ½½¸µÍÑ…ÉĞµÉ¥‘íÉ¥µÑ•µÁ±…Ñ”µ½±Õµ¹ÌèÅ™Éôˆ°€‰µ½‰¥±”…É±…å½ÕĞ™…±±‰…¬ˆ¤ì4(€…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡Í½ÕÉ”°€œñ±¥¹¬É•°ô‰ÍÑå±•Í¡••Ğˆ¡É•˜ôˆ½ÍÑå±•Ì½½É”µÕ¤¹ÍÌœ°€‰½É”ML‰±½­¥¹œÍÑå±•Í¡••Ğˆ¤ì4(€…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡Í½ÕÉ”°€œñ±¥¹¬É•°ô‰ÍÑå±•Í¡••Ğˆ¡É•˜ôˆ½ÍÑå±•Ì½™½ÉÑÕ¹”µÕ¤¹ÍÌœ°€‰™½ÉÑÕ¹”ML‰±½­¥¹œÍÑå±•Í¡••Ğˆ¤ì4)ô4(4(¼¼ƒŠRŠR ƒÂ~RĞƒ®2ªâÀƒ¶fS®¦Ğƒ²‚W²Æè€Ÿ²¶Z$ƒ²’Dœƒ²‚²ÊÓ¶fS®¦Ó²v ƒ²vÓ²j§ªÚ0ƒ¶fW²vã²^C²s®0ƒŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠR 4(¼¼ƒ²ó®²àƒ®Âsªâ$ ½…Á¤½‰¥±±¥¹œ½¡•­½ÕĞ§²vƒ²‚²^´™•Ñ ƒ®zc¶6óªÂ €ŸªÊÃ²‚pƒ²¶Z$ƒ²’DŸ²ró®†pƒ²z‡²VƒªÊÃ²‚s²Â÷²v4(¼¼ƒ®6»² ƒ²V+®>®†tƒ®F@ƒ²Ç²#²vƒ².“²‚pƒ¶>'ªÂ®†pƒªÎƒ²‚W¶Vs®.¸4(¼¼€€ƒŠN@ƒ®zc¶6ó®*P¡•­½ÕĞ½ÁÉ•Á…É”ƒ®–ğƒ²ÚS²‚¶Vc² ƒ²V+®*S®.£®²ã²zC²^Ğƒ¶V²vĞƒ²V®.#®vğƒ¶V£²"c®–ğƒ².“¶Z'¶VĞƒ¶fW²và¤¸4(¼¼€€ƒŠNDƒ®2ªâÀ¿ªÊÃªÎğƒ²b“®Ê®‚#²vĞƒ¶^#²j§®ª§®†w²^C²pƒ²¶Z$ƒ²’Dƒ®ª£®Ns®*P€Á…ÍÌœƒ¶Vc®
c®şC²vÓ®.¸4)½¹ÍĞ¥¹‘•áIÕ¹Ñ¥µ•M½ÕÉ”€ôÉ•…‘¥±•Må¹Œ¡É•Í½±Ù”¡É½½Ğ°€‰©Ì½½É”½¥¹‘•àµ¥¹±¥¹”µÉÕ¹Ñ¥µ”¹©Ìˆ¤°€‰ÕÑ˜àˆ¤ì4)½¹ÍĞÍ¡½Õ±‘QÉ…­M½ÕÉ”€ôÍ•Ñ¥½¸ 4(€¥¹‘•áIÕ¹Ñ¥µ•M½ÕÉ”°4(€€‰™Õ¹Ñ¥½¸}}‘M¡½Õ±‘QÉ…­A…åµ•¹ÑI•ÅÕ•ÍĞ ˆ°4(€€‰™Õ¹Ñ¥½¸}}‘I•Í½±Ù•A…åµ•¹Ñ5•Ñ„ ˆ°4(€€‰±½‰…°Á…åµ•¹Ğ™•Ñ ÑÉ…­•Èˆ°4(¤ì4)½¹ÍĞÍ¡½Õ±‘QÉ…­A…åµ•¹ÑI•ÅÕ•ÍĞ€ô¹•ÜÕ¹Ñ¥½¸¡€‘íÍ¡½Õ±‘QÉ…­M½ÕÉ•ôìÉ•ÑÕÉ¸}}‘M¡½Õ±‘QÉ…­A…åµ•¹ÑI•ÅÕ•ÍĞí€¤ ¤ì4)™½È€¡½¹ÍĞÁ…Ñ ½˜lˆ½…Á¤½‰¥±±¥¹œ½¡•­½ÕĞˆ°€ˆ½…Á¤½Á…åµ•¹ÑÌ½ÁÉ•Á…É”‰t¤ì4(€…ÍÍ•ÉĞ¹•ÅÕ…° 4(€€€Í¡½Õ±‘QÉ…­A…åµ•¹ÑI•ÅÕ•ÍĞ¡Á…Ñ °€‰A=MPˆ¤°4(€€€™…±Í”°4(€€€ƒ²ó®²àƒ®Âsªâ'²v ƒ®2ªâÀU'®–ğƒ²òs² ƒ²V+²V²Vğƒ¶Vs®.è€‘íÁ…Ñ¡õ€°4(€€¤ì4)ô4(¼¼ƒ²*ç²vàƒªÊ²št¡½¹™¥É´§²v ƒªÊÃ²‚s²Â÷²vƒ¶×ªÎó¶Vpƒ®J“®vğƒªŞã®2®†pƒ²ÚS²‚¶Vs®.ƒŠPƒ²rƒ²b#²fãªÂ ƒªÎó¶VcªÊ0ƒ®O²ZÓ²² ƒ²V+ªÊ0ƒªÎƒ²‚T¸4)…ÍÍ•ÉĞ¹•ÅÕ…°¡Í¡½Õ±‘QÉ…­A…åµ•¹ÑI•ÅÕ•ÍĞ ˆ½…Á¤½‰¥±±¥¹œ½½¹™¥É´ˆ°€‰A=MPˆ¤°ÑÉÕ”°€‹²*ç²vàƒªÊ²šw²v ƒªÎ²4ƒ²ÚS²‚¶Vs®.ˆ¤ì4)…ÍÍ•ÉĞ¹•ÅÕ…°¡Í¡½Õ±‘QÉ…­A…åµ•¹ÑI•ÅÕ•ÍĞ ˆ½…Á¤½Á…åµ•¹ÑÌ½½¹™¥É´ˆ°€‰A=MPˆ¤°ÑÉÕ”°€‹²*ç²vàƒªÊ²šw²v ƒªÎ²4ƒ²ÚS²‚¶Vs®.ˆ¤ì4(4)½¹ÍĞİ…¥ÑU¥±±½İ1¥ÍÑÌ€ôl4(€ì±…‰•°è€‰Í¡•±°ˆ°Í½ÕÉ”è¥¹‘•áM½ÕÉ”°¹…µ”è€‰}]%Q}U%}11=]}5=}Iˆô°4(€ì±…‰•°è€‰É•…Ğˆ°Í½ÕÉ”èÁ…åµ•¹ÑAÉ½•ÍÍ¥¹½¹Ñ•áÑM½ÕÉ”°¹…µ”è€‰IQ}]%Q}U%}11=]}5=}Iˆô°4(€ì±…‰•°è€‰ÍÑ…¹‘…±½¹”ˆ°Í½ÕÉ”è‘•ÍÑ¥¹åAÉ½™¥±•M½ÕÉ”°¹…µ”è€‰A}]%Q}U%}11=]}5=}Iˆô°4)tì4)™½È€¡½¹ÍĞ•¹ÑÉä½˜İ…¥ÑU¥±±½İ1¥ÍÑÌ¤ì4(€½¹ÍĞ±¥Ñ•É…°€ô•¹ÑÉä¹Í½ÕÉ”¹µ…Ñ ¡¹•ÜI•áÀ¡€‘í•¹ÑÉä¹¹…µ•õqqÌ¨õqqÌ¨ ½myqq¹t¬¼¥qqÌ¨í€¤¤ü¹lÅtì4(€…ÍÍ•ÉĞ¹½¬¡±¥Ñ•É…°°€‘í•¹ÑÉä¹±…‰•±ôè€‘í•¹ÑÉä¹¹…µ•ôƒ²‚WªŞs².tƒ®š³¶Ã®~Ó²vƒ²Âû² ƒ®ªï¶Z#®.‘€¤ì4(€½¹ÍĞ…±±½İ•€ô¹•ÜÕ¹Ñ¥½¸¡É•ÑÕÉ¸€‘í±¥Ñ•É…±ôí€¤ ¤ì4(€™½È€¡½¹ÍĞµ½‘”½˜l‰Á…ÍÌˆ°€‰µ½¹Ñ¡±äˆ°€‰Á…ÍÌµ…ÁÁ±¥•ˆ°€‰Á…åµ•¹Ğµ½µÁ±•Ñ”ˆ°€‰Á…åµ•¹Ğµ™…¥±•‰t¤ì(€€€…ÍÍ•ÉĞ¹½¬¡…±±½İ•¹Ñ•ÍĞ¡µ½‘”¤°€‘í•¹ÑÉä¹±…‰•±ôè€‘íµ½‘•ôƒ®*Pƒ¶Fs².s®Bc²ZÓ²Vğƒ¶Vs®.‘€¤ì4(€ô4(€™½È€¡½¹ÍĞµ½‘”½˜l‰Á…åµ•¹Ğˆ°€‰¡•­½ÕĞˆ°€‰…Éˆ°€‰½¹™¥É´ˆ°€‰ÍÕ‰ÍÉ¥ÁÑ¥½¸‰t¤ì(€€€…ÍÍ•ÉĞ¹½¬ ……±±½İ•¹Ñ•ÍĞ¡µ½‘”¤°€‘í•¹ÑÉä¹±…‰•±ôè€‘íµ½‘•ôƒ®2ªâÀƒ¶fS®¦Ó²v ƒ²Â£®.£®Bc²ZÓ²Vğƒ¶Vs®.‘€¤ì4(€ô4)ô4(¼¼ƒ².“¶2£®*Pƒ²ÇªÎÔ¡Á…åµ•¹Ğµ½µÁ±•Ñ”§ªÎğƒ®.“®–àƒ®ª£®Ns®†pƒªÂ#®vó²Vğƒ¶Vs®.ƒŠPƒªÂg²v ƒ®ª£®Ns®¦Ğ€ŸªÊÃ²‚pƒ²f®0œƒ²‚s®ª¤ƒ²V®z`ƒ².“¶2£ªÂ ƒ®r³®.¸4)…ÍÍ•ÉÑ½¹Ñ…¥¹Ì¡¥¹‘•áM½ÕÉ”°€‰µ½‘”è€Á…åµ•¹Ğµ™…¥±•œˆ°€‰™…¥±ÕÉ”½Ù•É±…äµ½‘”ÍÁ±¥Ğˆ¤ì4)…ÍÍ•ÉÑ9½Ñ½¹Ñ…¥¹Ì¡¥¹‘•áM½ÕÉ”°€ˆŸªÊÃ²‚pƒ®bC®*Pƒ²vÓ²j§ªÚ0ƒ¶fW²vã²^@ƒ².“¶2£¶Z#²*×®.#®.¸œ¤°µ½‘”è€½¹™¥É´œôˆ°€‰™…¥±ÕÉ”¹¼±½¹•ÈÍ¡…É•Ì½¹™¥É´µ½‘”ˆ¤ì4)…ÍÍ•ÉĞ¹½¬ 4(€€½‘½Õµ•¹Ñp¹‰½‘åp¹…ÁÁ•¹‘¡¥±‘p¡µ½‘…±p¤ímqÍqMuìÀ°ÌÀÁôı}‘¹‘AÉ•¡•­½ÕÑ]…¥ÑU¥MÕÁÁÉ•ÍÍ¥½¹p¡p¤ì¼¹Ñ•ÍĞ¡¥¹‘•áM½ÕÉ”¤°4(€€‰ÁÉ”µ¡•­½ÕĞÍÕÁÁÉ•ÍÍ¥½¸•¹‘Ì…™Ñ•ÈÑ¡”µ½‘…°¥Ìµ½Õ¹Ñ•ˆ°4(¤ì4(4)½¹Í½±”¹±½œ ‰mÙ•É¥™äµÁ…¥µ…Ñ”µÕ¤µÉ•É•ÍÍ¥½¹tAMLˆ¤ì4(