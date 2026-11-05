import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { LIGHT_FORTUNE_FEATURE_KEYS } from "../../worker/lib/light-fortune-catalog.js";
import { PAID_FEATURE_KEY_ALIASES } from "../../worker/lib/paid-feature-registry.js";

const require = createRequire(import.meta.url);
const verdictApi = require("../../js/core/pass-verdict.js");
const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

const LIGHT_KEY = LIGHT_FORTUNE_FEATURE_KEYS[0];
const LLM_KEY = "tarot-love-relationship";
const exhausted = {
  state: "active", tier: "standard", stale: false,
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  monthlySpendRemainingCoin: 0,
};

test("exhausted snapshot covers a light key", () => {
  const verdict = verdictApi.resolveVerdict(exhausted, 50, LIGHT_KEY);
  assert.equal(verdict.coversNow, true);
  assert.equal(verdict.cannotCover, false);
});

test("exhausted snapshot does not cover an LLM key", () => {
  const verdict = verdictApi.resolveVerdict(exhausted, 50, LLM_KEY);
  assert.equal(verdict.coversNow, false);
  assert.equal(verdict.reason, verdictApi.REASON_MONTHLY_LIMIT);
});

test("no featureKey keeps the old answer", () => {
  assert.equal(verdictApi.resolveVerdict(exhausted, 50).reason, verdictApi.REASON_MONTHLY_LIMIT);
});

test("per-use cap still applies to light on the snapshot", () => {
  const verdict = verdictApi.resolveVerdict({ ...exhausted, monthlySpendRemainingCoin: 300 }, 51, LIGHT_KEY);
  assert.equal(verdict.cannotCover, true);
  assert.equal(verdict.reason, verdictApi.REASON_PASS_LIMIT);
});

test("coverageFromSnapshot passes featureKey", () => {
  assert.equal(verdictApi.coverageFromSnapshot(exhausted, 50, "", LIGHT_KEY).canUseByPass, true);
  assert.equal(verdictApi.coverageFromSnapshot(exhausted, 50, "", LLM_KEY).canUseByPass, false);
});

test("mirror equals the server list", () => {
  assert.deepEqual([...verdictApi.LIGHT_FORTUNE_FEATURE_KEYS].sort(), [...LIGHT_FORTUNE_FEATURE_KEYS].sort());
});

test("a light alias on the wire is also light", () => {
  const aliases = Object.entries(PAID_FEATURE_KEY_ALIASES).filter(([, key]) => LIGHT_FORTUNE_FEATURE_KEYS.includes(key));
  assert.ok(aliases.length > 0);
  for (const [alias] of aliases) {
    assert.equal(verdictApi.resolveVerdict(exhausted, 50, alias).coversNow, true, alias);
  }
});

test("resolveSnapshotPassVerdict passes featureKey", () => {
  const source = read("app/_lib/billing-client.ts");
  assert.match(source, /passVerdict\.resolveVerdict\(snapshot, knownCoinCost, toText\(input\.featureKey \|\| input\.subFeatureKey\)\)/);
  assert.match(source, /passVerdict\.resolveVerdict\(snapshot, coinCost, input\.featureKey\)/);
});

test("shell entry fast path passes featureKey", () => {
  assert.match(read("index.html"), /_cdCoverageFromSubscriptionSnapshot\(coinCost, \{ allowStaleNone: true, featureKey: featureKey \|\| item\.featureKey \}\)/);
});

function loadCertainMiss(snapshot) {
  const source = read("js/destiny-profile.js");
  const start = source.indexOf("function _dpResolveCertainPassMiss(");
  const end = source.indexOf("function _dpReadActiveMembershipCoverage(", start);
  const context = {
    _dpHasSessionHint: () => true,
    _dpReadSubscriptionSnapshot: () => snapshot,
    _dpRevalidateSubscriptionSnapshot: () => {},
    _dpPassVerdict: () => verdictApi,
  };
  vm.runInNewContext(source.slice(start, end), context);
  return context._dpResolveCertainPassMiss;
}

test("destiny-profile certain-miss returns no miss for a light key", () => {
  const certainMiss = loadCertainMiss(exhausted);
  assert.equal(certainMiss(50, LIGHT_KEY), "");
  assert.equal(certainMiss(50, LLM_KEY), verdictApi.REASON_MONTHLY_LIMIT);
  const source = read("js/destiny-profile.js");
  assert.match(source, /_dpResolveCertainPassMiss\(coinPrice, _dpReceiptFeatureKey\)/);
  assert.match(source, /_dpReadActiveMembershipCoverage\(coinPrice, _dpReceiptFeatureKey\)/);
});

test("destiny-profile asks the server when an exhausted pass has no key", () => {
  assert.equal(loadCertainMiss(exhausted)(50), "");
  const { monthlySpendRemainingCoin, ...withBudget } = exhausted;
  assert.equal(loadCertainMiss(withBudget)(51), verdictApi.REASON_PASS_LIMIT);
});
