const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "worker/lib/db.js"), "utf8");

test("Mongo reset stays single-flight and defers disconnect until in-flight work settles", () => {
  assert.match(source, /let poolResetPromise = null/);
  assert.match(source, /if \(poolResetPromise\) return poolResetPromise/);
  assert.match(source, /if \(inFlightOps > 0\) \{\s*pendingPoolReset = true/s);
  assert.match(source, /pendingAttemptTasks\.size > 0/);
});
