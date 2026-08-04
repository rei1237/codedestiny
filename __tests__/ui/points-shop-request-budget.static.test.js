/**
 * @jest-environment node
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const pointsSource = fs.readFileSync(path.join(root, "app/points/PointsClient.tsx"), "utf8");
const shellSource = fs.readFileSync(path.join(root, "index.html"), "utf8");

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  return startIndex >= 0 && endIndex > startIndex
    ? source.slice(startIndex, endIndex)
    : "";
}

test("points shop initial summary has a single in-flight payments/me request and one retry layer", () => {
  const fetchStateBlock = between(pointsSource, "const fetchMyPointState = useCallback", "const syncSubscriptionAppliedStage");

  assert.match(fetchStateBlock, /fetchMyPointStateInFlightRef\.current/);
  assert.match(fetchStateBlock, /\/api\/payments\/me/);
  assert.match(fetchStateBlock, /\/api\/payments\/me\?view=shop/);
  assert.match(fetchStateBlock, /maxAttempts:\s*1/);
  assert.doesNotMatch(fetchStateBlock, /\/api\/billing\/balance/);
  assert.doesNotMatch(fetchStateBlock, /\/api\/subscription\/status/);
});

test("points shop keeps a last confirmed monthly-stone snapshot display-only until the server confirms it", () => {
  const bootBlock = between(pointsSource, "const parsedUser = readSanitizedAuthUser()", "setIsBooting(false)");
  const fetchStateBlock = between(pointsSource, "const fetchMyPointState = useCallback", "const syncSubscriptionAppliedStage");

  assert.match(bootBlock, /resolveMonthlyStoneBalance\(parsedUser, parsedUser\.profileSubscription\)/);
  assert.match(bootBlock, /setMonthlyStoneUnverified\(true\)/);
  assert.match(fetchStateBlock, /persistSanitizedAuthUser/);
  assert.match(fetchStateBlock, /membershipCreditBalance: normalized\.monthlyStoneBalance/);
  assert.match(pointsSource, /isAuthUserCacheVerified\(parsedUser\)/);
  assert.match(pointsSource, /shop summary unavailable; keeping verified snapshot/);
});

test("points shop keeps monthly-credit purchase available when the shop summary fails", () => {
  const initialFailureBlock = between(pointsSource, "fetchMyPointState().then(() =>", "}, [fetchMyPointState, isBooting]);");
  const retryFailureBlock = between(pointsSource, "const retryPointState = () =>", "/* ── 메인 렌더");

  assert.match(initialFailureBlock, /setMonthlyStoneUnverified\(true\);\s*setPointStateStatus\("error"\)/);
  assert.match(retryFailureBlock, /setMonthlyStoneUnverified\(true\);\s*setPointStateStatus\("error"\)/);
  assert.match(pointsSource, /monthlyStoneUnverified \? "잔액 확인 중 · 서버에서 최종 확인"/);
});

test("subscription prepare does not auto retry with a new idempotency key", () => {
  const prepareBlock = between(pointsSource, "const requestSubscriptionPrepare = useCallback", "const startSubscriptionPrepare = useCallback");
  const subscribeBlock = between(pointsSource, "const handleSubscribe = async", "const handleSubscribeWithMonthlyCredit");

  assert.match(prepareBlock, /Idempotency-Key/);
  assert.doesNotMatch(prepareBlock, /runAccessCheckWithTransientRetry/);
  assert.doesNotMatch(subscribeBlock, /const retryAttempt = await startSubscriptionPrepare/);
});

test("subscription checkout keeps the shared payment wait UI visible across each paid phase", () => {
  const subscribeBlock = between(pointsSource, "const handleSubscribe = async", "const handleSubscribeWithMonthlyCredit");

  assert.doesNotMatch(subscribeBlock, /showPrepareOverlay/);
  assert.match(subscribeBlock, /setProcessingStage\("30일 이용권 결제 정보를 준비하고 있어요\.\\n중복 결제를 시도하지 말아 주세요\.", "checkout"\)/);
  assert.match(subscribeBlock, /결제 승인 내역을 안전하게 확인하고 있어요/);
  assert.match(pointsSource, /계정에 반영하고 있어요/);
  assert.match(pointsSource, /최신 월정석 잔량을 확인했어요/);
});

test("uncertain subscription confirmation stays locked and exposes a status check action", () => {
  assert.match(pointsSource, /결제 결과를 확인하는 데 시간이 걸리고 있어요/);
  assert.match(pointsSource, /label: "결제 상태 다시 확인"/);
  assert.match(pointsSource, /pendingSubscriptionConfirmRef\.current/);
  assert.match(pointsSource, /isUncertainSubscriptionConfirmError/);
});

test("single payment shows the shared wait UI before checkout and confirms after PG return", () => {
  const startPaymentBlock = between(pointsSource, "const startPayment = async", "const handleSubscribe = async");

  assert.match(startPaymentBlock, /단건 결제를 준비하고 있어요/);
  assert.match(startPaymentBlock, /"checkout"/);
  assert.match(startPaymentBlock, /singlePaymentPhonePrefetchRef\.current/);
  assert.match(startPaymentBlock, /closeProcessingOverlayBeforeExternalCheckout/);
  assert.match(startPaymentBlock, /confirmPendingSinglePayment/);
  assert.doesNotMatch(startPaymentBlock, /setProcessingStage\("결제가 완료됐어요/);
});

test("single payment keeps uncertain confirmation locked and supports same-tab recovery", () => {
  const successBlock = between(pointsSource, "const handleConfirmSuccess", "const requestCancelPayment");

  assert.match(pointsSource, /PENDING_SINGLE_PAYMENT_CONFIRM_KEY/);
  assert.match(pointsSource, /sessionStorage\.setItem/);
  assert.match(pointsSource, /isUncertainPaymentConfirmError/);
  assert.match(pointsSource, /singlePaymentStatusCheckHandlerRef\.current/);
  assert.match(pointsSource, /singlePaymentConfirmFlowRef/);
  assert.match(pointsSource, /20000/);
  assert.match(successBlock, /Promise\.allSettled/);
  assert.match(successBlock, /결제와 상품 반영은 완료됐어요/);
});

test("static shell does not call payments/me as a moonlight balance fallback", () => {
  const monthlySyncBlock = between(shellSource, "async function syncGoldenMonthlyCreditsFromPaymentsMe", "function ChargeModal");

  assert.match(monthlySyncBlock, /\/api\/billing\/balance\?moonlightStone=1/);
  assert.doesNotMatch(monthlySyncBlock, /\/api\/payments\/me\?moonlightStone=1/);
});
