#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const load = (file) => import(pathToFileURL(path.join(ROOT, file)).href);
const checks = [];
const check = (name, fn) => checks.push({ name, fn });

const registry = await load("worker/lib/paid-feature-registry.js");
const catalog = await load("worker/payments/catalog.js");

check("registry canonicalizes legacy Love Code keys and prices each use", () => {
  assert.equal(registry.LOVE_CODE_FEATURE_KEY, "love-code");
  assert.equal(registry.LOVE_CODE_PRODUCT_ID, "unlock.love-code");
  for (const legacyKey of registry.LEGACY_LOVE_CODE_FEATURE_KEYS) {
    assert.equal(registry.normalizePaidFeatureKey(legacyKey), registry.LOVE_CODE_FEATURE_KEY);
  }
  const product = catalog.resolveProduct({ featureKey: "loveSimulation" });
  assert.deepEqual(
    { productId: product.productId, featureKey: product.featureKey, billingType: product.billingType, priceKRW: product.priceKRW },
    { productId: "unlock.love-code", featureKey: "love-code", billingType: "per_use", priceKRW: 5000 },
  );
});

function bootAccessStore() {
  const console = new VirtualConsole();
  console.on("jsdomError", () => {});
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://code-destiny.com/", runScripts: "outside-only", virtualConsole: console,
  });
  const { window } = dom;
  window.__cdAuthUser = { id: "love-user" };
  window.__cdCurrentProfileId = "profile-1";
  window.eval(read("js/core/access-store.js"));
  return window;
}

check("AccessStore promotes local legacy cache and authoritative server snapshots to love-code", () => {
  const window = bootAccessStore();
  const store = window.CodeDestinyAccessStore;
  store.applyPaymentPayload({ unlockMap: { loveSimulation: true } }, { userId: "love-user", profileId: "profile-1" });
  assert.equal(store.isUnlocked("love-code"), true);
  store.applyAccessStateSnapshot({
    userId: "love-user", profileId: "profile-1", authority: "server", completeness: "full",
    unlockedFeatures: ["love-code"], unlockMap: { "love-code": true },
  }, { userId: "love-user", profileId: "profile-1" });
  assert.equal(store.isUnlocked("loveSimulation"), true);
  assert.equal(store.getSnapshot().persistentUnlocks["love-code"], true);
});

check("React free entry requires a fresh session and preserves guarded historical payment resume", () => {
  const engine = read("app/saju/love-simulation/_components/LoveSimulationEngine.tsx");
  const access = read("app/_lib/free-reading-access.ts");
  const guard = read("app/_lib/use-free-reading-guard.ts");
  const entry = engine.slice(engine.indexOf("const startWithCharacter ="), engine.indexOf("const startSimulationScene ="));
  assert.match(entry, /const request = beginFreeReading\(\)/);
  assert.match(entry, /await hasFreeReadingSession\(\)/);
  assert.match(entry, /if \(!request.valid\(\)\) return/);
  assert.match(entry, /if \(!signedIn\) \{ setMatchError\(copy.loginRequiredError\); return; \}/);
  assert.match(entry, /startSimulationScene\(id, mode\)/);
  assert.doesNotMatch(engine, /runPaidAccessGate\(|useCanUseFeature\(/);
  assert.match(access, /authFetch\('\/api\/auth\/me', \{ method: 'GET', cache: 'no-store' \}, \{ retryOn401: false, forceFresh: true \}\)/);
  assert.match(access, /data\?\.authenticated === true && Boolean\(data\?\.user\?\.id\)/);
  for (const event of ['cd:auth-changed', 'cd:profile-changed', 'popstate', 'storage']) assert.ok(guard.includes(event));
  assert.match(guard, /AUTH_SESSION_INVALIDATED_EVENT/);
  assert.match(guard, /state.current.mounted && state.current.revision === revision/);
  assert.match(engine, /usePaidResume\(LOVE_CODE_FEATURE_KEY/);
  assert.match(engine, /normalizeLoveCodeFeatureKey\(args.featureKey\) !== LOVE_CODE_FEATURE_KEY/);
  assert.match(engine, /refreshPaidFeatureEntitlements\("app:love-code-mobile-resume"\)/);
  assert.match(engine, /await refreshPaidFeatureEntitlements\("app:love-code-mobile-resume"\);\s*if \(!ticket.valid\(\)\) return false;/);
  assert.match(engine, /legacyKinds: LEGACY_LOVE_CODE_RESUME_KINDS/);
});

for (const { name, fn } of checks) {
  await fn();
  console.log(`PASS ${name}`);
}
console.log(`LOVE_CODE_PERMANENT_UNLOCK_CHECKS ${checks.length}`);
