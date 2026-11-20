import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const api = require("../../js/core/pass-verdict.js");

const future = new Date(Date.now() + 86_400_000).toISOString();
const small = {
  state: "active", tier: "standard", passPolicyVersion: "flower-20261104", stale: false,
  expiresAt: future, monthlySpendRemainingCoin: 150,
};

test("small pass shows the current 20,000원 total, not the legacy 30,000원", () => {
  assert.equal(api.displayMonthlyLimit(small), 200);
  assert.equal(api.monthlyLimitForTier("standard"), 300, "legacy gate table is unchanged");
});

test("server accumulated limit (same-tier repurchase) wins over the policy table", () => {
  assert.equal(api.displayMonthlyLimit({ ...small, monthlyLimitCoin: 400, monthlySpendRemainingCoin: 350 }), 400);
});

test("denominator never drops below the remaining amount", () => {
  assert.equal(api.displayMonthlyLimit({ ...small, monthlySpendRemainingCoin: 250 }), 250);
});

test("inactive snapshot shows nothing", () => {
  assert.equal(api.displayMonthlyLimit({ state: "none", tier: "free" }), 0);
});

test("shortfall reasons: per-use cap, exhausted, limit short, unknown", () => {
  assert.equal(api.passShortfallReason(small, 100), "per_use_cap");
  assert.equal(api.passShortfallReason({ ...small, monthlySpendRemainingCoin: 49 }, 50), "exhausted");
  assert.equal(api.passShortfallReason({ ...small, tier: "vvip", monthlySpendRemainingCoin: 100 }, 300), "limit_short");
  assert.equal(api.passShortfallReason({ ...small, monthlySpendRemainingCoin: null }, 50), "");
  assert.equal(api.passShortfallReason(small, 50), "");
});

test("snapshot keeps the server limit from access-state passUsage.limitKRW", () => {
  const snap = api.buildSnapshotFromStatus("u1", {
    isActive: true, tier: "standard", expiresAt: future, passPolicyVersion: "flower-20261104",
    entitlementSnapshot: { passUsage: { limitKRW: 40000, remainingKRW: 35000 } },
  });
  assert.equal(snap.monthlyLimitCoin, 400);
  assert.equal(snap.monthlySpendRemainingCoin, 350);
});

test("snapshot reads monthlyPassLimit from the membership pass envelope", () => {
  const snap = api.buildSnapshotFromStatus("u1", {
    isActive: true, tier: "vvip", expiresAt: future, passPolicyVersion: "flower-20261104",
    membershipPass: { monthlyPassLimit: 2400, monthlySpendRemaining: 2000 },
  });
  assert.equal(snap.monthlyLimitCoin, 2400);
});
