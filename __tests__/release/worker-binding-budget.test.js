const test = require("node:test");
const assert = require("node:assert/strict");
const load = () => import("../../scripts/lib/worker-binding-budget.mjs");
const { readFileSync } = require("node:fs");

const config = (count) => '[vars]\n' + Array.from({ length: count }, (_, i) => `VAR_${i} = "1"`).join('\n');
const secrets = Array.from({ length: 69 }, (_, i) => ({ name: `SECRET_${i}`, type: "secret_text" }));

test("tracked production vars preserve headroom against the observed secret inventory", async () => {
  const { assertWorkerBindingBudget } = await load();
  assert.ok(assertWorkerBindingBudget(readFileSync("worker/wrangler.toml", "utf8"), secrets).remaining >= 2);
  const auth = readFileSync("worker/routes/auth.js", "utf8");
  assert.match(auth, /getEnv\(env, "AUTH_OPERATION_TIMEOUT_MS", "12000"\)/);
  const celestial = readFileSync("worker/lib/celestial-report-delivery.js", "utf8");
  assert.match(celestial, /\["CELESTIAL_HARMONY_GEMINI_MODEL", "GEMINI_MODEL", "PREMIUM_GEMINI_MODEL"\]/);
});

test("retained secrets and injected COMMIT_SHA leave two deployment slots", async () => {
  const { assertWorkerBindingBudget } = await load();
  assert.deepEqual(assertWorkerBindingBudget(config(56), secrets), { total: 126, remaining: 2 });
  for (const count of [57, 58, 59]) assert.throws(() => assertWorkerBindingBudget(config(count), secrets), /keep at least 2/);
  assert.throws(() => assertWorkerBindingBudget(config(56), [...secrets, { name: "NEW_SECRET" }]), /keep at least 2/);
});

test("missing inventory fails closed and replacement keys count once", async () => {
  const { assertWorkerBindingBudget } = await load();
  for (const inventory of [null, {}, [{}]]) assert.throws(() => assertWorkerBindingBudget(config(1), inventory), /inventory/);
  assert.deepEqual(assertWorkerBindingBudget('[vars]\nCOMMIT_SHA = "old"', [{ name: "COMMIT_SHA" }]), { total: 1, remaining: 127 });
});
