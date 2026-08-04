/**
 * @jest-environment node
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const historyClient = fs.readFileSync(path.join(root, "app/points/history/PointHistoryClient.tsx"), "utf8");
const paymentsRoute = fs.readFileSync(path.join(root, "worker/routes/payments.js"), "utf8");
const authClient = fs.readFileSync(path.join(root, "app/_lib/auth-client.ts"), "utf8");

test("history list uses summary view and opens detail only after an order click", () => {
  assert.match(historyClient, /\/api\/payments\/me\?view=history/);
  assert.match(historyClient, /\/api\/payments\/orders\/\$\{encodeURIComponent\(order\.id\)\}/);
  assert.match(historyClient, /onClick=\{\(\) => \{ void loadOrderDetail\(p\); \}\}/);
  assert.match(historyClient, /OrderDetailModal/);
});

test("order detail route is user-scoped and the common GET client deduplicates it", () => {
  assert.match(paymentsRoute, /path === "\/me"/);
  assert.ok(paymentsRoute.includes('if (method === "GET" && /^\\/orders\\/[^/]+$/.test(path))'));
  assert.match(paymentsRoute, /userId: \{ \$in: \[userObjectId, normalizedUserId\] \}/);
  assert.match(authClient, /parsed\.pathname === "\/api\/payments\/orders"/);
  assert.match(authClient, /withCallerAbort\(pending, init\.signal \?\? undefined\)/);
});
