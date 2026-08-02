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
  assert.match(accessFetchBlock, /params\.set\('includeBackfill', '1'\)/);
  assert.doesNotMatch(initialBootstrapBlock, /syncGoldenMonthlyCreditsFromPaymentsMe/);
  assert.doesNotMatch(initialBootstrapBlock, /syncBalanceFromServer/);
});
