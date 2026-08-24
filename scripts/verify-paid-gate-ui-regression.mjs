import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const indexSource = readFileSync(resolve(root, "index.html"), "utf8");
// 결제 선택창 CSS 규칙 정본(2026-08-21 부터 js/core/checkout-entry.js 의 PAYMENT_CHOICE_CSS_RULES) —
// pass-store/direct 카드의 CSS 선언 순서 검사는 이 파일을 봐야 한다.
const checkoutEntrySource = readFileSync(resolve(root, "js/core/checkout-entry.js"), "utf8");
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
    // 선검사 호출은 app/life-book-ai/lifeBookApi.ts 의 prepareLifeBook 로 옮겼다(authFetch + 일시장애 재시도 + 타임아웃).
    // 계약(게이트 오픈 → 선검사 → 결제창)은 그대로다.
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

assertBefore(checkoutEntrySource, 'data-mode="pass-store"', 'data-mode="direct"', "pass store option appears before direct card");
assertContains(indexSource, "extraDataAttrs: ' data-monthly-option'", "monthly payment option restored");
// 🔴 단건결제 2단계(결제수단 고르기). 실행 검증은 verify-checkout-pass-card 가 독립 정적 렌더러로
// 하지만, 셸·React 는 jsdom 으로 띄울 하네스가 없어 여기서 소스로 고정한다.
//   ① 2단계 패널은 공유 빌더에서 온다(사본 금지 — 승인 시 한 렌더러만 준비중으로 남는다).
//   ② 단건 클릭은 close() 가 아니라 enterMethodStep() 으로 간다.
//   ③ 고른 수단이 PortOne 요청의 payMethod 로 이어진다.
//   ④ 앱(Play Billing)에서는 KR PG 수단 목록을 만들지 않는다.
for (const [source, label, enterCall, appGate] of [
  [indexSource, "shell", "if (mode === 'direct' && enterMethodStep()) return;", "allowDirectChoice && !directUsesAppStore"],
  [billingClientSource, "react", 'if (mode === "direct" && enterMethodStep()) return;', "canShowDirect && !directUsesAppStore"],
  [destinyProfileSource, "standalone", "if (act === 'direct' && _dpEnterMethodStep()) return;", "!directUsesAppStore"],
]) {
  assertContains(source, "buildDirectPayMethodStepHtml", `${label}: payment method step comes from the shared builder`);
  assertContains(source, enterCall, `${label}: direct card opens the method step instead of closing the modal`);
  assertContains(source, appGate, `${label}: app runtime must not render the KR PG method list`);
  assertContains(source, 'data-choice-step="methods"', `${label}: method step is a hidden sibling, not a grid replacement`);
}
assertContains(indexSource, "payMethod: _cdResolveDirectPayMethod(config.payMethod)", "shell sends the chosen pay method to PortOne");
assertContains(destinyProfileSource, "payMethod: _dpResolveDirectPayMethod(config.payMethod)", "standalone sends the chosen pay method to PortOne");
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
assertContains(indexSource, "결제 검증에 실패했습니다.", "main shell payment verification failure message");
assertContains(indexSource, "honey-fortune-logo-payment-ux-v20260618", "honey fortune logo payment ux marker");
// 자산이 부팅 게이트와 같은 /icons/app-logo-512.webp 로 통합되면서(#200) 이 단언이 낡았고,
// 같은 잡의 앞 단계(verify:security-hardening)가 먼저 죽어 있어 실패가 드러나지 않았다.
// 가드의 의도는 "결제/이용권 대기 오버레이가 브랜드 로고를 쓴다"이므로 현재 정본 경로로 맞춘다.
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
// 🔴 결제 마스코트는 **메인 서비스 로고 + 경량 자산**이어야 한다. 예전에는 외부 호스트의 725KB PNG 를
// 직접 참조했고, CSS 가 [aria-hidden="false"] 로 게이트돼 오버레이를 여는 순간(=단건결제 클릭 직후)
// 처음 요청이 나가 checkout/PortOne SDK 와 대역폭을 다퉜다 → "네트워크 오류 + PG창 미노출".
// 동일 오리진 32KB 로고로 고정한다 — head 에 rel=preload fetchpriority=high 가 이미 있어
// 결제 클릭 시점에는 워엄 캐시이고, 클릭 임계경로에 추가 네트워크가 0 이다.
assertContains(indexSource, ".cd-paid-gate__sprite-frame{position:relative;width:100%;height:100%;background-image:url(\"/icons/app-logo-512.webp", "paid gate sprite uses the preloaded same-origin service logo");
assertNotContains(indexSource, "window.alert('단건 결제가 완료되어 열람되었습니다.');", "single payment success uses designed overlay instead of alert");
assertNotContains(indexSource, "window.alert(_cdIsMembershipFreePayload(result.payload) ? '이용권으로 열람되었습니다.' : '월정석 사용이 완료되었습니다.');", "unlock monthly/pass success uses designed overlay instead of alert");
assertNotContains(indexSource, "window.alert(_cdIsMembershipFreePayload(r.payload) ? '이용권으로 열람되었습니다.' : '월정석 사용이 완료되었습니다.');", "tile monthly/pass success uses designed overlay instead of alert");

assertContains(billingClientSource, "hasVerifiedBillingAccess", "React billing access guard");
assertBefore(billingClientSource, "if (!hasVerifiedBillingAccess(parsed.data", "markPaidAttemptPaymentSucceeded()", "React billing verifies before success");
assertContains(billingClientSource, "SERVER_ACCESS_GRANT_MISSING", "React server grant missing error");
assertContains(billingClientSource, "서버 권한 검증에 실패했습니다", "React server verification failure message");
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
// 🔴 이 키는 손으로 유지된다 — sync:public 은 셸(index.html)과 js/core/* 의 ?v= 만 갱신하고
// 이 상수와 독립 정적 페이지 21개는 건드리지 않는다. 그래서 2026-08-12 기준으로 같은 파일에
// 키가 3종(build-a300cf84f0f5 · build-4b96ba87f36f · 셸 키)으로 갈라져 있었고, destiny-profile.js
// 를 고쳐도 그 참조들은 엣지 캐시(/*.js max-age 7일)의 옛 파일을 계속 받았다.
// 지금은 셋을 셸 키로 통일했다. destiny-profile.js 를 고치면 이 값도 함께 올려야 한다.
assertContains(billingClientSource, 'PAID_SERVICE_RUNTIME_SRC = "/js/destiny-profile.js?v=build-2c15a024dace"', "React paid runtime cache key carries the moonstone 409 same-requestId retry");
assertNotContains(billingClientSource, "build-20260622-inicis-phone", "React paid runtime must not load stale Inicis phone runtime");
assertContains(billingClientSource, "function isMonthlyCreditAccessType", "React billing has monthly-credit access resolver");
assertContains(billingClientSource, "function resolveAppliedBillingPayment", "React billing resolves applied payment method from server response");
assertContains(billingClientSource, "const monthlyApplied = candidates.some(isMonthlyCreditAccessType);", "React monthly-credit success is resolved before pass success");
assertContains(billingClientSource, "resolveAppliedBillingPayment(runtimeData, requestedMode, passFirstEligible", "React coin-gate success uses applied payment resolver");
// 이용권 확인이 실패/지연으로 죽어도 결제창(단건+월정석)이 열려야 한다 — 폴백 대상 코드 보강 회귀 방지.
const reactPaymentFallbackSource = section(
  billingClientSource,
  "function shouldOpenRuntimePaymentFallback(",
  "function shouldRedirectToLoginAfterBilling(",
  "React runtime payment fallback",
);
assertContains(reactPaymentFallbackSource, 'normalizedCode === "PASS_STATUS_TEMPORARILY_UNAVAILABLE"', "React payment fallback opens on temporary pass-status 503");
assertContains(reactPaymentFallbackSource, 'normalizedCode === "BILLING_REQUEST_TIMEOUT"', "React payment fallback opens on client abort timeout 503");
// 서버 degraded 표면화(680114ad)로 새로 내려오는 인증/스냅샷 503도 dead-end 대신 결제창을 열어야 한다.
assertContains(reactPaymentFallbackSource, 'normalizedCode === "AUTH_STATUS_TEMPORARILY_UNAVAILABLE"', "React payment fallback opens on temporary auth-status 503");
assertContains(reactPaymentFallbackSource, 'normalizedCode === "BALANCE_SNAPSHOT_UNAVAILABLE"', "React payment fallback opens on degraded balance snapshot 503");
assertContains(reactPaymentFallbackSource, 'normalizedCode === "AUTH_DB_UNAVAILABLE"', "React payment fallback opens on degraded auth-db 503");
// degraded-503은 결제창을 열기 전에 먼저 재시도해 이용권 보유자의 무료 통과를 살린다(재시도-우선).
assertNotContains(billingClientSource, "isRetryableBillingInfraDegraded(parsed.status, parsed.error?.code)", "React payment POST is not automatically retried");

// 🔴 결제창은 **열릴 때** 월정석 잔량을 조회하지 않는다(2026-08-12). 그 왕복(/api/billing/balance, 22초
// 예산·재시도 없음)이 간헐 503·"잔량 확인 중" 고착의 원인이었고, 월정석을 고르면 서버 coin-gate 가 같은
// 1왕복 안에서 확인+차감하므로 열 때의 표시용 조회는 순수 부가 비용이었다. 세 렌더러 모두 **열 때는**
// 호출부가 넘긴 잔량만 쓴다(사용자가 누르는 온디맨드 확인은 아래 2026-08-13 절 참고) —
// 그래서 '조회 실패를 잔량 부족으로 오인'하는 경로 자체가 없어졌고, 남은 계약은 하나다:
// **확인된 잔량이 필요분보다 적을 때만 비활성**(402 후 재노출 경로가 lot 정본 잔량을 실어 보낸다).
assertContains(
  billingClientSource,
  "const monthlyCanUse = monthlyCost > 0 && (!hasProvidedMonthlyBalance || monthlyBalance >= monthlyCost);",
  "React moonlight stays enabled while the balance is unconfirmed",
);
assertContains(billingClientSource, "const snapshotMonthlyBalance = hasCallerMonthlyBalance ? 0 : readSubscriptionSnapshotMonthlyBalance();", "React payment choice seeds the moonlight balance from the local subscription snapshot");
assertContains(
  indexSource,
  "var canUseMonthly = allowMonthlyChoice && requiredMonthlyCredits > 0 && (!monthlyBalanceFresh || monthlyBalance >= requiredMonthlyCredits);",
  "shell moonlight stays enabled while the balance is unconfirmed",
);
assertContains(
  destinyProfileSource,
  "var monthlyInsufficient = monthlyBalanceFresh && Math.floor(providedMonthlyBalance) < monthlyStones;",
  "standalone moonlight disable is decided by confirmed shortage only",
);
// 🔴 2026-08-13 개정: 잔량 표시는 **사용자가 누르는 온디맨드**로만 돌아왔다. 위의 "열 때 조회 금지"는
// 그대로다 — 아래 세 단언이 그 경계를 지킨다.
//   1) 잔여바 자동 조회 시절의 마커는 계속 금지(특히 data-mode="monthly-refresh" — 세 렌더러가 [data-mode]
//      를 "고르면 모달을 닫는" 노드로 일괄 처리하므로, 확인 버튼에 그 값을 주면 누를 때 결제창이 닫힌다).
//   2) 각 렌더러의 잔량 조회 호출은 **파일 전체에서 정확히 1개**여야 한다(결제창 안에 두 번째 경로 금지).
//   3) 그 호출은 [보유 월정석 확인] 버튼 마크업보다 **뒤**에 온다 = 열림 경로가 아니라 핸들러 안이다.
//      마크업은 모달 HTML 을 만드는 시점, 핸들러는 그 뒤에 바인딩되므로 이 순서가 깨지면 자동 조회다.
const ON_DEMAND_BALANCE_CHECKS = [
  ["React", billingClientSource, "moonlightStoneOnly: true"],
  ["shell", indexSource, "reason: 'payment-modal-balance-check'"],
  ["standalone", destinyProfileSource, "_dpFetchMoonlightStoneBalance({ fresh: wasShown })"],
];
for (const [label, source, fetchMarker] of ON_DEMAND_BALANCE_CHECKS) {
  assertNotContains(source, 'data-mode="monthly-refresh"', `${label} payment choice must not render a balance refresh button`);
  assertNotContains(source, "cd-direct-payment-moonbal-current", `${label} payment choice must not render the old auto-query balance bar`);
  assertContains(source, "data-monthly-balance-check", `${label} payment choice renders the on-demand moonstone balance button`);
  assertContains(source, "data-monthly-balance-text", `${label} payment choice renders the on-demand moonstone balance output`);
  const fetchHits = source.split(fetchMarker).length - 1;
  assert.equal(fetchHits, 1, `${label} payment choice must fetch the moonstone balance from exactly one place (found ${fetchHits}): ${fetchMarker}`);
  assert.ok(
    source.indexOf(fetchMarker) > source.indexOf("data-monthly-balance-check"),
    `${label} payment choice must fetch the moonstone balance only behind the check button, never while opening`,
  );
}
assertNotContains(indexSource, "reason: 'payment-modal-refresh'", "shell payment choice must not restore the old auto balance refresh");

// 인증 예열이 무한 대기하면 게이트가 '이용권 확인 중'에서 고착한다 — 상한 회귀 방지.
//
// 🔴 2026-08 계약 변경: 예전에는 여기서 Promise.race 를 **금지**했다(뒤늦은 인증 응답이 결제
// 상태를 덮어쓸까 봐). 그 금지는 "useCoinGate 의 AUTH_REQUIRED 검사가 먼저 끊어 주므로 이
// await 에 도달하지 않는다"는 전제 위에 있었는데, 그 검사가 **느린 인증을 미인증으로 오인**해
// 로그인한 사용자를 막고 있어 "모름이면 서버로 통과"로 고쳤다. 그래서 이 await 가 실제로
// 도달 가능해졌고, refreshAuth 는 /me → /refresh → /me 3연쇄에 요청당 22초라 상한이 없으면
// 결제창이 1분 가까이 안 뜬다.
// 금지를 푼 근거: refreshAuth 는 결제 상태를 쓰지 않고 auth-store 상태만 바꾸며(실패 시
// temporarilyOffline, 리다이렉트 없음), silent:true 는 로딩 스피너만 억제하고, auth-store 에서
// single-flight 라 새 요청을 만들지 않고 합류한다. 게다가 useCoinGate 는 같은 흐름 한 단계 위에서
// 이미 같은 race 를 쓰고 있었다. 이제 상한의 **존재**를 강제한다.
const reactAuthPrewarmSource = section(
  billingClientSource,
  "게이트 진입 전 인증을 예열한다.",
  "const activeAttempt = beginPaidAttempt(",
  "React billing auth pre-warm",
);
assertContains(reactAuthPrewarmSource, "Promise.race([", "React billing auth pre-warm is bounded");
assertContains(
  reactAuthPrewarmSource,
  "BILLING_AUTH_PREHEAT_BUDGET_MS",
  "React billing auth pre-warm uses the shared preheat budget constant",
);
assertContains(reactAuthPrewarmSource, "refreshAuth({ force: true, silent: true })", "React billing auth pre-warm still refreshes");
assertContains(billingClientSource, "paymentService.executePayment", "React paid commands use the shared Payment Service");
assertContains(indexSource, "CodeDestinyPaymentService", "static shell paid commands use the shared Payment Service");
assertContains(destinyProfileSource, "CodeDestinyPaymentService", "standalone paid commands use the shared Payment Service");

// openPaidFeatureGate + runBillingCoinGate 패턴 기능도 공통 게이트를 거쳐야 한다(직접 PortOne/points 직행 금지).
const gateRunBillingFeatureSources = [
  { label: "destiny-meeting-place", source: readFileSync(resolve(root, "app/saju/destiny-meeting-place/components/DestinyMeetingPlacePage.tsx"), "utf8") },
  { label: "palm-reading", source: readFileSync(resolve(root, "app/palm-reading/PalmDestinyMain.tsx"), "utf8") },
];
// destiny-bias(최애운명)는 2026-08-21부로 전면 무료 전환되어 공용 코인 게이트를 거치지 않는다.
// DestinyBiasClient.tsx 는 이제 openPaidFeatureGate/runBillingCoinGate 를 호출하지 않는다(의도된 변경).
for (const feature of gateRunBillingFeatureSources) {
  const commonGateMarker = feature.source.includes("runPaidAccessGate") ? "runPaidAccessGate" : "runBillingCoinGate";
  assertContains(feature.source, "openPaidFeatureGate", `${feature.label} opens paid gate overlay`);
  assertContains(feature.source, commonGateMarker, `${feature.label} routes through common billing gate`);
  assertBefore(feature.source, "openPaidFeatureGate(", `${commonGateMarker}(`, `${feature.label} opens gate before billing`);
  assertNotContains(feature.source, "window.PortOne.requestPayment", `${feature.label} must not run custom PortOne checkout`);
  assertNotContains(feature.source, 'fetch("/api/billing/coin-gate"', `${feature.label} must not bypass common coin-gate`);
  assertNotContains(feature.source, "/points?source=", `${feature.label} must not jump straight to charge page`);
}

const reactWaitKindSource = section(billingClientSource, "function resolvePaymentWaitKind(", "function formatLoadingMessage", "React payment wait kind");
assertBefore(reactWaitKindSource, 'if (mode === "MOONLIGHT_STONE"', 'if (mode === "MEMBERSHIP_PASS"', "React wait kind checks monthly before pass");
assertContains(reactWaitKindSource, "membership_credit", "React wait kind treats membership_credit as monthly");
assertNotContains(reactWaitKindSource, "이용권으로|membership", "React pass wait kind must not use broad membership regex");

const reactBillingOverlayOwnershipSource = section(billingClientSource, "function paymentLoadingOwnsPaidFeatureStatus(", "function resolvePaymentWaitKind", "React billing overlay ownership");
assertNotContains(reactBillingOverlayOwnershipSource, '"checkingEntitlement"', "React billing entitlement check must stay in paid gate UI");
assertNotContains(reactBillingOverlayOwnershipSource, '"hasEntitlement"', "React billing pass success must stay in paid gate UI");
assertNotContains(reactBillingOverlayOwnershipSource, '"paymentSuccess"', "React billing payment success must stay in paid gate UI");
assertNotContains(reactBillingOverlayOwnershipSource, '"paymentWindowOpen"', "React billing must not keep overlay during external PG window");
const reactBillingGateEmitSource = section(billingClientSource, "function emitPaidFeatureGate(", "function resolvePaidFeatureInFlightKey", "React billing paid gate emit");
assertBefore(reactBillingGateEmitSource, 'if (action !== "close" && isExternalPaymentWindowStatus(status))', 'if (action !== "close" && paymentLoadingOwnsPaidFeatureStatus(status))', "React billing closes overlays before PG window owns focus");
assertContains(reactBillingGateEmitSource, "emitPaymentLoadingState(false);", "React billing closes payment overlay for PG window");
const reactProviderOverlayOwnershipSource = section(paymentProcessingContextSource, "function paymentLoadingOwnsPaidFeatureStatus(", "function resolvePaidFeatureStatusOverlay", "React provider overlay ownership");
assertNotContains(reactProviderOverlayOwnershipSource, '"checkingEntitlement"', "React provider entitlement check must stay in paid gate UI");
assertNotContains(reactProviderOverlayOwnershipSource, '"hasEntitlement"', "React provider pass success must stay in paid gate UI");
assertNotContains(reactProviderOverlayOwnershipSource, '"paymentSuccess"', "React provider payment success must stay in paid gate UI");
assertNotContains(reactProviderOverlayOwnershipSource, '"paymentWindowOpen"', "React provider must not keep overlay during external PG window");
assertContains(paymentProcessingContextSource, "function isMonthlyPaidFeatureDetail", "React provider has monthly paid-feature resolver");
assertContains(paymentProcessingContextSource, "<PaidFeatureGateProvider>", "React app connects paid gate provider globally");
assertContains(paymentProcessingContextSource, 'checkingEntitlement: { label: "확인 중", title: "이용권 확인"', "React paid gate checking entitlement copy");
assertContains(paymentProcessingContextSource, 'cancelled: { label: "취소됨", title: "결제 선택 취소"', "React paid gate cancelled copy");
assertNotContains(paymentProcessingContextSource, 'document.body.style.overflow = "hidden"', "React paid gate must not lock mobile body scroll");
const reactProviderStatusOverlaySource = section(paymentProcessingContextSource, "function resolvePaidFeatureStatusOverlay(", "function nowForPaidGate", "React provider paid status overlay");
assertBefore(reactProviderStatusOverlaySource, "isMonthlyPaidFeatureDetail(resolvedDetail)", "isPassPaidFeatureDetail(resolvedDetail)", "React provider resolves monthly success before pass success");
assertContains(reactProviderStatusOverlaySource, 'return { message: "월정석이 깃들고 있어요", mode: "payment-complete" };', "React provider monthly success copy");
assertContains(loadingMessagesSource, 'title: "연이의 월정석 · 깃들고 있어요"', "React payment loading monthly success title");
assertNotContains(loadingMessagesSource, 'title: "이용권이 활성화되고 있어요"', "React payment loading must not show pass copy for monthly success");
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

assertContains(indexSource, "dataMode: passMode,", "canonical payment modal pass store option");
assertContains(indexSource, "var allowPassChoice = opts.disablePassChoice !== true", "pass option is available by default unless explicitly disabled");
// 🔴 결제창 안에서 이용권을 확인할 수 있어야 한다(2026-07 정책 전환).
// 진입 선검사의 서버 왕복을 없앤 대신 '이용권으로 구매' 카드가 그 자리에서 서버에 묻는다. 예전에는
// 반대로 "이용권은 결제창을 열기 전에만 확인됩니다"라는 막다른 안내가 있었고, 그 문구를 여기서 고정하고
// 있었다 — 그 상태로 선검사를 없애면 스냅샷 없는 이용권 보유자가 확인할 방법 자체를 잃는다.
assertNotContains(indexSource, "이용권은 결제창을 열기 전에만 확인됩니다.", "in-modal pass verification must not be blocked again");
assertContains(indexSource, "var passReady = await refreshDirectEntitlementStatus();", "pass card verifies the entitlement in place");
assertBefore(
  indexSource,
  "var passReady = await refreshDirectEntitlementStatus();",
  "window.setTimeout(openPassStoreAfterCheck, 450);",
  "pass card must verify first and only then fall through to the store",
);
assertContains(indexSource, "window.location.assign('/points?source=direct-payment-pass-store');", "canonical pass choice opens pass store");
// 🔴 앱에서는 /points 로 프로그래매틱 이동하면 404 다(앱 번들에 없고, 가드는 앵커 클릭만 가로챈다).
// 반드시 __cdOpenChargeModal(가드가 /app/store/ 로 고정) 분기를 먼저 타야 한다.
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
// 독립(정적) 폴백도 정본과 같은 3옵션 결제창이어야 한다. 옛 2옵션(이용권 상점 없는) 모달 부활 방지의
// 본체는 아래 canonical 위임 단언들이고, 여기서는 세 결제수단이 모두 렌더되는지를 직접 확인한다.
assertContains(destinyProfileSource, "dataMode: 'pass-store'", "standalone chooser keeps pass store option");
assertContains(destinyProfileSource, "dataMode: 'direct'", "standalone chooser keeps direct option");
assertContains(destinyProfileSource, "extraDataAttrs: ' data-monthly-option'", "standalone chooser keeps monthly option");
assertNotContains(destinyProfileSource, "openServicePaymentChoiceModal", "legacy destiny payment selector renderer removed");
assertContains(destinyProfileSource, "__cdChooseServicePaymentModeCanonical", "destiny fallback delegates to canonical pass selector");
assertContains(destinyProfileSource, "service.executePayment({", "destiny fallback uses shared command single-flight");
assertNotContains(destinyProfileSource, "opts.internalMainGate !== true && opts.__cdPaymentGateAuthorized !== true && typeof window.__cdApplyMembershipPassBeforePayment", "destiny no pre-modal pass bottleneck");
assertContains(destinyProfileSource, "_dpSetPaymentPending(false);\n      var rsp = await window.PortOne.requestPayment(requestData);", "destiny runtime hides payment overlay immediately before PG window");
// 정적 폴백 오버레이가 결제수단별 안내를 렌더하는지(월정석·단건·완료 제목 전환 + 완료 프레임) 회귀 방지.
assertContains(destinyProfileSource, "function _dpResolveStandaloneOverlayCopy", "destiny fallback overlay copy is mode-aware");
assertContains(destinyProfileSource, "title: '월정석 사용 중'", "destiny fallback monthly overlay title");
assertContains(destinyProfileSource, "title: '결제 진행 중'", "destiny fallback direct payment overlay title");
assertContains(destinyProfileSource, "title: '결제 완료'", "destiny fallback payment-complete overlay title");
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

// oracle(지오맨시)·yoga-guru: 서버가 결제를 Gemini(callGeminiText) 호출 이전에 검증해야 한다.
// 클라 우회로 /api/oracle/geomancy·/api/yoga-guru를 직접 호출해 무료 LLM 생성하는 것을 차단.
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
// 배열은 리포트타입이 늘어날 수 있으므로 리터럴 전체가 아니라 필수 항목 포함 여부로 본다.
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
  assertContains(source, ".cd-fortune-pick__grid{grid-template-columns:1fr", "mobile card layout fallback");
  assertContains(source, '<link rel="stylesheet" href="/styles/core-ui.css', "core CSS blocking stylesheet");
  // 🔴 fortune-ui 는 a8565083a(2026-08-15) 부터 두 갈래로 나간다 — 홈이 실제로 매칭하는 부분집합
  //    (fortune-ui-home.css, preload + rel 스왑)과 나머지 전체 시트(지연 로더). 예전 단언은
  //    `<link rel="stylesheet" href="/styles/fortune-ui.css` 였는데 그 문자열은 그 커밋 이후
  //    <noscript> 안에만 남아 **공허하게 통과**했다(원칙 10 — 대상이 없을 때 통과하는 가드는 가드가
  //    아니다). 실제로 그 사이 프로필 카드 규칙이 지연 시트에 남아 FOUC 가 났는데 이 가드는 초록이었다.
  //    이제 세 갈래를 각각 고정한다.
  assertContains(source, 'href="/styles/fortune-ui-home.css', "fortune critical subset stylesheet");
  assertContains(source, 'data-cd-noncritical-style-src="/styles/fortune-ui.css', "fortune full sheet still delivered");
  assertContains(source, '<noscript><link rel="stylesheet" href="/styles/fortune-ui.css', "fortune sheet noscript fallback");
}

// ── 🔴 대기 화면 정책: '진행 중' 전체화면은 이용권 확인에서만 ──────────────────────────────
// 주문 발급(/api/billing/checkout)을 전역 fetch 래퍼가 '결제 진행 중'으로 잡아 결제창을
// 덮지 않도록 두 성질을 실제 평가로 고정한다.
//   ⓐ 래퍼는 checkout/prepare 를 추적하지 않는다(문자열 핀이 아니라 함수를 실행해 확인).
//   ⓑ 대기/결과 오버레이 허용목록에서 진행 중 모드는 'pass' 하나뿐이다.
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
    `주문 발급은 대기 UI를 켜지 않아야 한다: ${path}`,
  );
}
// 승인 검증(confirm)은 결제창을 통과한 뒤라 그대로 추적한다 — 위 예외가 과하게 넓어지지 않게 고정.
assert.equal(shouldTrackPaymentRequest("/api/billing/confirm", "POST"), true, "승인 검증은 계속 추적한다");
assert.equal(shouldTrackPaymentRequest("/api/payments/confirm", "POST"), true, "승인 검증은 계속 추적한다");

const waitUiAllowLists = [
  { label: "shell", source: indexSource, name: "CD_WAIT_UI_ALLOWED_MODE_RE" },
  { label: "react", source: paymentProcessingContextSource, name: "REACT_WAIT_UI_ALLOWED_MODE_RE" },
  { label: "standalone", source: destinyProfileSource, name: "DP_WAIT_UI_ALLOWED_MODE_RE" },
];
for (const entry of waitUiAllowLists) {
  const literal = entry.source.match(new RegExp(`${entry.name}\\s*=\\s*(/[^\\n]+/)\\s*;`))?.[1];
  assert.ok(literal, `${entry.label}: ${entry.name} 정규식 리터럴을 찾지 못했다`);
  const allowed = new Function(`return ${literal};`)();
  for (const mode of ["pass", "monthly", "card", "pass-applied", "payment-complete", "payment-failed"]) {
    assert.ok(allowed.test(mode), `${entry.label}: ${mode} 는 표시되어야 한다`);
  }
  for (const mode of ["payment", "checkout", "confirm", "subscription"]) {
    assert.ok(!allowed.test(mode), `${entry.label}: ${mode} 대기 화면은 차단되어야 한다`);
  }
}
// 실패는 성공(payment-complete)과 다른 모드로 갈라야 한다 — 같은 모드면 '결제 완료' 제목 아래 실패가 뜬다.
assertContains(indexSource, "mode: 'payment-failed'", "failure overlay mode split");
assertNotContains(indexSource, "'결제 또는 이용권 확인에 실패했습니다.'), mode: 'confirm' }", "failure no longer shares confirm mode");
assert.ok(
  /document\.body\.appendChild\(modal\);[\s\S]{0,300}?_cdEndPreCheckoutWaitUiSuppression\(\);/.test(indexSource),
  "pre-checkout suppression ends after the modal is mounted",
);

console.log("[verify-paid-gate-ui-regression] PASS");
