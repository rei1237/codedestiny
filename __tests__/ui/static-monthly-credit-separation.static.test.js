/**
 * @jest-environment node
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const shellSource = fs.readFileSync(path.join(root, "index.html"), "utf8");

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  return startIndex >= 0 && endIndex > startIndex
    ? source.slice(startIndex, endIndex)
    : "";
}

test("static pass shop exposes only direct purchase while preserving monthly feature consumption", () => {
  const monthlyGateBlock = between(shellSource, "async function _cdRunMonthlyCreditGate", "function _cdFinalizeUnlockState");

  assert.match(monthlyGateBlock, /\/api\/billing\/coin-gate/);
  assert.match(monthlyGateBlock, /paymentMode:\s*['"]MOONLIGHT_STONE['"]/);
  assert.match(shellSource, /data-action="confirmGoldenCharge"/);
  assert.doesNotMatch(shellSource, /confirmGoldenMonthlyCredit/);
  assert.doesNotMatch(shellSource, /applyMembershipMonthlyCredit/);
  assert.doesNotMatch(shellSource, /paymentMethod:\s*['"]monthly_credit['"]/);
});
