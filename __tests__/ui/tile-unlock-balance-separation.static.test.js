/**
 * @jest-environment node
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const shellSource = fs.readFileSync(path.resolve(__dirname, "../..", "index.html"), "utf8");

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

test("main unlock bootstrap requests both profile services in one access request", () => {
  const accessFetchBlock = between(shellSource, "async function _cdFetchSajuAccessUnlocks", "function _cdClearKnownUnlocks");
  const initialBootstrapBlock = between(shellSource, "function scheduleInitialUnlockSync", "loadBalance();");

  assert.match(accessFetchBlock, /params\.set\('serviceKey', serviceKeys\.join\(','\)\)/);
  assert.doesNotMatch(accessFetchBlock, /includeBackfill/);
  assert.doesNotMatch(initialBootstrapBlock, /syncGoldenMonthlyCreditsFromPaymentsMe/);
  assert.doesNotMatch(initialBootstrapBlock, /syncBalanceFromServer/);
});
test("main unlock GET is deduped and cooled down by the shared API guard", () => {
  const dedupeBlock = between(shellSource, "function shouldDedupeApiGet", "function getApiCooldownKey");
  const cooldownBlock = between(shellSource, "function shouldApplyApiCooldown", "function readApiCooldown");
  const cacheBlock = between(shellSource, "function getApiResultCacheTtl", "function cloneApiResult");
  const retryBlock = between(shellSource, "async function _cdFetchAccessUnlocksWithRetry", "var serviceKeys = _cdCollectSajuAccessServiceKeys");

  assert.match(dedupeBlock, /\/api\/access\/unlocks/);
  assert.match(cooldownBlock, /\/api\/access\/unlocks/);
  assert.match(cacheBlock, /\/api\/access\/unlocks/);
  assert.doesNotMatch(retryBlock, /SAJU_UNLOCK_CONFIRM_DELAYS_MS/);
  assert.doesNotMatch(retryBlock, /1500|3000/);
});

test("main unlock bootstrap does not fetch unlocks until a visible paid gate exists", () => {
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

test("paid pass snapshot remains optimistic while direct checkout still requires a PG order", () => {
  const paidAccessBlock = between(shellSource, "async function _cdResolvePaidContentAccess", "function syncAuthUserPoints");
  const passModalBlock = between(shellSource, "async function refreshDirectEntitlementStatus", "function openPassStoreAfterCheck");
  const directCheckoutBlock = between(shellSource, "async function _cdRunDirectKrwCheckout", "var _cdRunDirectKrwCheckoutCore");
  const precheckCacheBlock = between(shellSource, "function _cdIsCacheablePaidPrecheckResult", "var _cdResolvePaidContentAccessCore");

  assert.match(paidAccessBlock, /_cdCoverageFromSubscriptionSnapshot\(coinCost,\s*\{\s*allowStaleNone:\s*true\s*\}\)/);
  assert.match(paidAccessBlock, /return _cdBuildOptimisticPassAccess/);
  assert.match(passModalBlock, /allowSnapshotFastPath:\s*true/);
  assert.match(precheckCacheBlock, /status === 'pass_applied'/);
  assert.match(directCheckoutBlock, /var allowDirectCheckoutAccessBypass = opts\.allowServerAccessBypass === true && opts\.forceDirectPayment !== true/);
  assert.match(directCheckoutBlock, /!order\.merchantUid && allowDirectCheckoutAccessBypass && _cdIsCheckoutAccessBypass/);
});
