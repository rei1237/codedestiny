const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "app/_lib/paid-attempt-session.ts"), "utf8");

test("paid-attempt restore logs only when a URL or storage signal exists", () => {
  assert.match(source, /const restoreSignaled = Boolean\(getPaidAttemptIdFromUrl\(\) \|\| hasStoredPaidAttemptRestoreSignal\(\)\);/);
  assert.match(source, /if \(restoreSignaled\) \{\s*logPaidAttemptEvent\("PaidAttempt\.RestoreFailed"/s);
  assert.match(source, /function hasStoredPaidAttemptRestoreSignal\(\)/);
});
