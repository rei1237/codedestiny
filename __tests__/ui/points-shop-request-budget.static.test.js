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

test("static shell does not call payments/me as a moonlight balance fallback", () => {
  const monthlySyncBlock = between(shellSource, "async function syncGoldenMonthlyCreditsFromPaymentsMe", "function ChargeModal");

  assert.match(monthlySyncBlock, /\/api\/billing\/balance\?moonlightStone=1/);
  assert.doesNotMatch(monthlySyncBlock, /\/api\/payments\/me\?moonlightStone=1/);
});
