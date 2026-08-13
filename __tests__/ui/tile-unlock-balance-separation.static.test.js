/**
 * @jest-environment node
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const shellSource = fs.readFileSync(path.resolve(__dirname, "../..", "index.html"), "utf8");
const accessStoreSource = fs.readFileSync(path.resolve(__dirname, "../..", "js/core/access-store.js"), "utf8");

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  return startIndex >= 0 && endIndex > startIndex
    ? source.slice(startIndex, endIndex)
    : "";
}

test("main unlock sync uses the entitlement-only endpoint", () => {
  const syncBlock = between(shellSource, "async function syncUnlocksFromServer", "function _cdUnsetUnlockKey");

  assert.match(syncBlock, /skipEntitlementSnapshot: true/);
  assert.doesNotMatch(syncBlock, /\/api\/billing\/balance/);
  assert.doesNotMatch(syncBlock, /syncGoldenMonthlyCreditsFromPaymentsMe/);
  assert.doesNotMatch(syncBlock, /syncBalanceFromServer/);
});

test("central access store requests one complete profile access snapshot", () => {
  const initialBootstrapBlock = between(shellSource, "function scheduleInitialUnlockSync", "loadBalance();");

  assert.match(accessStoreSource, /var DEFAULT_SERVICE_KEYS = \['saju', 'ziwei', 'ad_free'\]/);
  assert.match(accessStoreSource, /'\/api\/me\/access-state\?profileId=' \+ encodeURIComponent\(context\.profileId\)/);
  assert.doesNotMatch(accessStoreSource, /'&serviceKey='/);
  assert.doesNotMatch(accessStoreSource, /\/api\/access\/unlocks/);
  assert.doesNotMatch(accessStoreSource, /includeBackfill/);
  assert.doesNotMatch(shellSource, /\/api\/access\/unlocks\?/);
  assert.doesNotMatch(initialBootstrapBlock, /syncGoldenMonthlyCreditsFromPaymentsMe/);
  assert.doesNotMatch(initialBootstrapBlock, /syncBalanceFromServer/);
});
test("central unlock GET is single-flight, throttled, and has no automatic retry", () => {
  assert.match(accessStoreSource, /var requestKey = context\.key \+ \(opts\.includeGuardian === true \? '::include=guardian' : ''\)/);
  assert.match(accessStoreSource, /if \(inFlight\[requestKey\]\)/);
  assert.match(accessStoreSource, /return inFlight\[requestKey\]\.promise/);
  assert.match(accessStoreSource, /var REFRESH_THROTTLE_MS = 15 \* 1000/);
  assert.match(accessStoreSource, /var RETRY_DELAYS = \[\]/);
});

test("anonymous unlock bootstrap stays snapshot-only until a visible paid gate exists", () => {
  const visibilityBlock = between(shellSource, "function _cdIsVisibleSajuAccessGate", "async function _cdFetchSajuAccessUnlocks");
  const accessFetchBlock = between(shellSource, "async function _cdFetchSajuAccessUnlocks", "function _cdClearKnownUnlocks");
  const initialBootstrapBlock = between(shellSource, "function scheduleInitialUnlockSync", "// 관리자 모드:");
  const authChangedBlock = between(shellSource, "window.__cdUnlockAuthEvents.onAuthChanged", "window.addEventListener('cd:auth-changed'");

  assert.match(visibilityBlock, /_cdHasVisibleSajuAccessGate/);
  assert.match(visibilityBlock, /_cdApplySajuAccessStoreSnapshotOnly/);
  assert.match(accessFetchBlock, /_cdApplySajuAccessStoreSnapshotOnly\(profileId\)/);
  assert.match(accessFetchBlock, /NO_VISIBLE_ACCESS_GATE/);
  assert.match(initialBootstrapBlock, /_cdHasVisibleSajuAccessGate\(\)/);
  assert.match(initialBootstrapBlock, /visible-gate-initial-sync/);
  assert.match(authChangedBlock, /visible-gate-auth-change/);
});

/**
 * 🔴 '보이는 잠금 오버레이'만으로 게이트하면, 오버레이 없이 타일로 들어가는 기능은 해금 목록을
 * 영영 읽지 못해 **이미 산 콘텐츠에 결제창이 다시 뜬다**(2026-08-13). 로그인 사용자는 유휴 시간에
 * 프로필당 한 번 배경으로 읽는다. 상한이 사라지면 페이지 로드마다 access-state 를 때리게 되므로
 * 판정 함수의 순수성과 1회 표식을 함께 고정한다.
 */
test("logged-in unlock bootstrap hydrates the owned-feature list once per profile", () => {
  const shouldFetchBlock = between(shellSource, "function _cdShouldFetchSajuAccessUnlocks", "function _cdApplySajuAccessStoreSnapshotOnly");
  const accessFetchBlock = between(shellSource, "async function _cdFetchSajuAccessUnlocks", "function _cdClearKnownUnlocks");
  const initialBootstrapBlock = between(shellSource, "function scheduleInitialUnlockSync", "// 관리자 모드:");
  const clearBlock = between(shellSource, "function _cdClearKnownUnlocks", "function _cdExtractServerAccessGrant");

  // 로그인 사용자는 오버레이가 없어도 배경 동기화를 예약한다.
  assert.match(initialBootstrapBlock, /authenticated-initial-hydrate/);
  assert.match(initialBootstrapBlock, /hasAuthToken\(\)/);
  // 비로그인은 그대로 조회하지 않는다.
  assert.match(shouldFetchBlock, /hasAuthToken\(\)/);
  // 프로필당 1회 상한.
  assert.match(shouldFetchBlock, /_cdSajuAccessUnlocksHydratedProfiles\[profileId\] !== true/);
  // 🔴 판정 함수는 순수해야 한다 — 표식을 세우면 같은 동기화의 두 번째 호출이 스스로 막힌다.
  assert.doesNotMatch(shouldFetchBlock, /_cdSajuAccessUnlocksHydratedProfiles\[profileId\]\s*=\s*true/);
  assert.match(accessFetchBlock, /_cdSajuAccessUnlocksHydratedProfiles\[profileId\] = true/);
  // 로그아웃·401 이면 표식도 함께 지운다(같은 탭 재로그인이 영영 안 읽는 것을 막는다).
  assert.match(clearBlock, /_cdSajuAccessUnlocksHydratedProfiles = Object\.create\(null\)/);
});

/**
 * 서버는 Mongo 가 흔들려도 200 으로 답하고 빈 해금 목록을 싣는다. 그것을 정본으로 채택하면
 * 이미 산 콘텐츠가 잠긴 것으로 바뀐다 — "모른다"와 "안 샀다"를 구분한다.
 */
test("degraded access payloads never replace the known unlock snapshot", () => {
  assert.match(accessStoreSource, /function payloadCarriesUnlockAuthority/);
  assert.match(accessStoreSource, /if \(payloadCarriesUnlockAuthority\(payload\)\) \{\s*\n\s*state\.persistentUnlocks = copyMap\(serverUnlocks\);/);
  assert.match(accessStoreSource, /unlocksAuthority/);
  assert.match(accessStoreSource, /completeness/);
});

test("paid pass snapshot remains optimistic while direct checkout still requires a PG order", () => {
  const paidAccessBlock = between(shellSource, "async function _cdResolvePaidContentAccess", "function syncAuthUserPoints");
  const passModalBlock = between(shellSource, "async function refreshDirectEntitlementStatus", "function openPassStoreAfterCheck");
  const directCheckoutBlock = between(shellSource, "async function _cdRunDirectKrwCheckout", "var _cdRunDirectKrwCheckoutCore");
  const precheckCacheBlock = between(shellSource, "function _cdIsCacheablePaidPrecheckResult", "var _cdResolvePaidContentAccessCore");

  assert.match(paidAccessBlock, /_cdCoverageFromSubscriptionSnapshot\(coinCost,\s*\{\s*allowStaleNone:\s*true\s*\}\)/);
  assert.match(paidAccessBlock, /return _cdBuildOptimisticPassAccess/);
  assert.match(passModalBlock, /allowSnapshotFastPath:\s*false/);
  assert.doesNotMatch(passModalBlock, /allowSnapshotFastPath:\s*true/);
  assert.match(precheckCacheBlock, /status === 'pass_applied'/);
  assert.match(directCheckoutBlock, /var allowDirectCheckoutAccessBypass = opts\.allowServerAccessBypass === true && opts\.forceDirectPayment !== true/);
  assert.match(directCheckoutBlock, /!order\.merchantUid && allowDirectCheckoutAccessBypass && _cdIsCheckoutAccessBypass/);
});
