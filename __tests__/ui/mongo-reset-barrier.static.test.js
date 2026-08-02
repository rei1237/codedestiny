const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "worker/lib/db.js"), "utf8");

test("Mongo reset stays single-flight, protects concurrent work, and recovers a lone timeout", () => {
  assert.match(source, /let poolResetPromise = null/);
  assert.match(source, /if \(poolResetPromise\) return poolResetPromise/);
  assert.match(
    source,
    /if \(inFlightOps > 1 && !forceReset\) \{\s*pendingPoolReset = true;\s*\} else \{[\s\S]*?await resetMongooseConnection\(\);/,
  );
  assert.match(source, /pendingAttemptTasks\.size > 0/);
});
