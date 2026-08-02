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
  const initialBootstrapBlock = between(shellSource, "function scheduleInitialUnlockSync", "// 관리자 모드:");

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
