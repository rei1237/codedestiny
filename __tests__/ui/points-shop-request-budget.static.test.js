/**
 * @jest-environment node
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const pointsSource = fs.readFileSync(path.join(root, "app/points/PointsClient.tsx"), "utf8");
const paymentsSource = fs.readFileSync(path.join(root, "worker/routes/payments.js"), "utf8");
const snapshotSource = fs.readFileSync(path.join(root, "app/_lib/moonlight-store-snapshot.ts"), "utf8");
const serviceReadSource = fs.readFileSync(path.join(root, "app/_lib/service-read-client.ts"), "utf8");
const shellSource = fs.readFileSync(path.join(root, "index.html"), "utf8");

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  return startIndex >= 0 && endIndex > startIndex
    ? source.slice(startIndex, endIndex)
    : "";
}

test("points shop initial summary has one snapshot request and one retry layer", () => {
  const fetchStateBlock = between(pointsSource, "const fetchMyPointState = useCallback", "const syncSubscriptionAppliedStage");

  assert.match(fetchStateBlock, /fetchMyPointStateInFlightRef\.current/);
  assert.match(fetchStateBlock, /fetchMoonlightStoreSnapshot/);
  assert.match(snapshotSource, /\/api\/payments\/me\?view=shop/);
  assert.match(fetchStateBlock, /maxAttempts:\s*1/);
  assert.doesNotMatch(fetchStateBlock, /\/api\/billing\/balance/);
  assert.doesNotMatch(fetchStateBlock, /\/api\/subscription\/status/);
});

test("points shop waits for confirmed auth before its initial summary request", () => {
  assert.match(pointsSource, /import \{ useAuthStore \} from "\.\.\/_lib\/auth-store"/);
  assert.match(pointsSource, /if \(isBooting \|\| !authState\.authReady \|\| !authState\.isAuthenticated \|\| !authStoreUserId\) return;/);
});

test("points shop uses one versioned snapshot owner with in-flight deduplication and bounded cache", () => {
  assert.match(pointsSource, /type MoonlightStoreSnapshot/);
  assert.match(snapshotSource, /MOONLIGHT_STORE_SNAPSHOT_SCHEMA_VERSION = 1/);
  assert.match(snapshotSource, /const inFlight = new Map/);
  assert.match(snapshotSource, /const cache = new Map/);
  assert.match(snapshotSource, /MOONLIGHT_STORE_SNAPSHOT_TTL_MS = 30_000/);
  assert.match(snapshotSource, /STORE_SNAPSHOT_CONTRACT_INVALID/);
  assert.match(snapshotSource, /STORE_SNAPSHOT_CIRCUIT_OPEN/);
  assert.match(snapshotSource, /SNAPSHOT_CIRCUIT_COOLDOWN_MS/);
});

test("read-only service calls open an endpoint cooldown after repeated transient failures", () => {
  assert.match(serviceReadSource, /const readCircuits = new Map/);
  assert.match(serviceReadSource, /READ_CIRCUIT_OPEN/);
  assert.match(serviceReadSource, /isRetryableReadStatus\(response\.status\)/);
  assert.doesNotMatch(serviceReadSource, /method: "POST"/);
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

test("points shop exposes direct-only pass purchase UI", () => {
  assert.doesNotMatch(pointsSource, /handleSubscribeWithMonthlyCredit/);
  assert.doesNotMatch(pointsSource, /paymentMethod:\s*["']monthly_credit["']/);
  assert.doesNotMatch(pointsSource, /<span[^>]*>보너스 월정석 사용<\/span>/);
  assert.match(pointsSource, /void handleSubscribe\(plan\);/);
  assert.match(pointsSource, /이용권은 원화 단건 결제로만 구매할 수 있습니다\./);
  assert.match(pointsSource, /월정석으로는 이용권을 구매할 수 없습니다\./);
});

test("pass purchase copy never advertises a monthly-credit purchase path", () => {
  const misleadingCopy = /PG 결제 또는 명확히 허용된 월정석/;

  assert.doesNotMatch(pointsSource, misleadingCopy);
  assert.doesNotMatch(paymentsSource, misleadingCopy);
  assert.match(pointsSource, /이용권은 원화 단건 결제로만 구매할 수 있습니다\./);
  assert.match(paymentsSource, /이용권은 원화 단건 결제로만 구매할 수 있습니다\./);
});

test("points shop keeps the direct purchase action available when the shop summary fails", () => {
  assert.match(pointsSource, /if \(hasVerifiedShopSnapshotRef\.current\)/);
  assert.match(pointsSource, /setMonthlyStoneUnverified\(true\);\s*setPointStateStatus\("error"\)/);
  assert.match(pointsSource, /setMonthlyStoneUnverified\(true\)/);
  assert.match(pointsSource, /월정석의 달빛이 잠시 흐려졌어요/);
});

test("points shop invalidates only after a mutation while ticket detail keeps abort support", () => {
  assert.match(pointsSource, /clearMoonlightStoreSnapshot\(authStoreUserId, apiBase\)/);
  assert.match(pointsSource, /fetchMyPointState\(\{ force: true \}\)/);
});

test("payment profile and prepare stay behind the actual KRW payment button", () => {
  const planSelectionEffect = between(pointsSource, "setIsSubscriptionRefundAgreed(false);", "}, [pendingSubscriptionPaymentPlan?.id]);");
  assert.doesNotMatch(planSelectionEffect, /getSavedPaymentPhoneNumber/);
  assert.doesNotMatch(planSelectionEffect, /startSubscriptionPrepare/);
  assert.doesNotMatch(planSelectionEffect, /fetchPortOnePaymentConfigCached/);
  // 3번째 인자 null = 프리페치 없음(이 테스트가 지키는 성질). 그 뒤 인자는 열어 둔다 —
  // serverConfirmedNoPhone 단축이 4번째로 붙었고, 인자 추가로 깨질 단언이 아니다.
  assert.match(pointsSource, /ensurePaymentPhoneNumber\(apiBase, authUser, null[,)]/);
});

test("subscription prepare does not auto retry with a new idempotency key", () => {
  const prepareBlock = between(pointsSource, "const requestSubscriptionPrepare = useCallback", "const startSubscriptionPrepare = useCallback");
  const subscribeBlock = between(pointsSource, "const handleSubscribe = async", "const handleSubscriptionCancel");

  assert.match(prepareBlock, /Idempotency-Key/);
  assert.doesNotMatch(prepareBlock, /runAccessCheckWithTransientRetry/);
  assert.doesNotMatch(subscribeBlock, /const retryAttempt = await startSubscriptionPrepare/);
});

test("subscription checkout keeps the shared payment wait UI visible across each paid phase", () => {
  const subscribeBlock = between(pointsSource, "const handleSubscribe = async", "const handleSubscriptionCancel");

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

// 폐지된 상점 포인트충전 결제창(startPayment + 결제수단 모달)을 지키던 테스트는 그 코드와 함께
// 제거했다. 모달을 여는 setIsMethodModalOpen(true) 가 어디에도 없어 진입 자체가 불가능했다.
// 아래 테스트가 검사하는 확인·복구 배관은 남아 있으므로 그대로 둔다.

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
