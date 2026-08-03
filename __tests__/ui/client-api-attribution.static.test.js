const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("client API trace sources remain wired without external calls", () => {
  const worker = read("worker/index.js");
  const sources = [
    "static:index-session-cache",
    "app:user-session-cache",
    "app:auth-store",
    "app:billing-client",
    "app:points",
    "app:points-history",
    "app:me",
    "legacy:destiny-profile",
    "feature:coin-gate",
  ];

  assert.match(worker, /WORKER_CLIENT_API_TRACE/);
  assert.match(worker, /client-api-trace/);
  for (const source of sources) assert.match(worker, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(read("index.html"), /headersFrom\(netInput, netInit\)/);
  assert.match(read("index.html"), /static:index-session-cache/);
  assert.match(read("app/_lib/auth-client.ts"), /response\.status === 401/);
  assert.doesNotMatch(read("app/_lib/billing-client.ts"), /COIN_GATE_TRANSIENT_MAX_RETRIES/);
  assert.match(read("app/_lib/billing-client.ts"), /paymentService\.executePayment/);
  assert.match(read("app/points/history/PointHistoryClient.tsx"), /paymentsMeInFlightRef/);
  assert.match(read("js/destiny-profile.js"), /legacy:destiny-profile/);
});
