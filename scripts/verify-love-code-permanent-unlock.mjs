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

check("registry canonicalizes every legacy Love Code key", () => {
  assert.equal(registry.LOVE_CODE_FEATURE_KEY, "love-code");
  assert.equal(registry.LOVE_CODE_PRODUCT_ID, "unlock.love-code");
  for (const legacyKey of registry.LEGACY_LOVE_CODE_FEATURE_KEYS) {
    assert.equal(registry.normalizePaidFeatureKey(legacyKey), registry.LOVE_CODE_FEATURE_KEY);
  }
  const product = catalog.resolveProduct({ featureKey: "loveSimulation" });
  assert.deepEqual(
    { productId: product.productId, featureKey: product.featureKey, billingType: product.billingType, priceKRW: product.priceKRW },
    { productId: "unlock.love-code", featureKey: "love-code", billingType: "unlock", priceKRW: 10000 },
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

check("React entry holds payment CTA until server revalidation and mobile resume carries the canonical key", () => {
  const engine = read("app/saju/love-simulation/_components/LoveSimulationEngine.tsx");
  assert.match(engine, /useCanUseFeature\(LOVE_CODE_FEATURE_KEY\)/);
  assert.match(engine, /featureKey: LOVE_CODE_FEATURE_KEY/);
  assert.match(engine, /refreshPaidFeatureEntitlements\("app:love-code-payment-success"\)/);
  assert.match(engine, /refreshPaidFeatureEntitlements\("app:love-code-mobile-resume"\)/);
  assert.match(engine, /legacyKinds: LEGACY_LOVE_CODE_RESUME_KINDS/);
  assert.match(engine, /러브 코드 이용권을 확인하고 있어요/);
  assert.match(engine, /러브 코드 잠금 해제됨/);
  assert.match(engine, /러브 코드 잠금 해제 \(10,000원\)/);
});

for (const { name, fn } of checks) {
  await fn();
  console.log(`PASS ${name}`);
}
console.log(`LOVE_CODE_PERMANENT_UNLOCK_CHECKS ${checks.length}`);
