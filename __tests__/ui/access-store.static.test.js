const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const storeSource = fs.readFileSync(path.join(root, "js/core/access-store.js"), "utf8");

function loadStore(fetchImpl) {
  const listeners = new Map();
  const storage = new Map();
  const sandbox = {
    console,
    Date,
    Promise,
    Object,
    Array,
    JSON,
    Math,
    String,
    Number,
    Boolean,
    Set,
    encodeURIComponent,
    URLSearchParams,
    AbortController,
    setTimeout: () => 1,
    clearTimeout: () => undefined,
    fetch: fetchImpl,
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    sessionStorage: {
      getItem: () => null,
    },
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name) => listeners.delete(name),
    dispatchEvent: () => true,
    CustomEvent: function CustomEvent(name, init) {
      this.type = name;
      this.detail = init && init.detail;
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(storeSource, sandbox, { filename: "access-store.js" });
  return sandbox.CodeDestinyAccessStore;
}

test("AccessStore deduplicates concurrent loads and exposes one shared snapshot", async () => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const store = loadStore(async () => {
    calls += 1;
    await gate;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        unlockedContentKeys: ["saju.fullReading"],
      }),
    };
  });

  const first = store.ensureLoaded({ userId: "user-1", profileId: "profile-1", authenticated: true });
  const second = store.ensureLoaded({ userId: "user-1", profileId: "profile-1", authenticated: true });
  assert.equal(calls, 1);
  release();
  await Promise.all([first, second]);
  assert.equal(store.isUnlocked("section_summary"), true);
  assert.equal(store.getSnapshot().status, "ready");
});

test("AccessStore keeps cached unlocks when revalidation returns 503 and applies optimistic unlocks", async () => {
  let calls = 0;
  const store = loadStore(async () => {
    calls += 1;
    if (calls === 1) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, unlockedFeatures: ["section_summary"] }),
      };
    }
    return { ok: false, status: 503, json: async () => ({ ok: false, retryable: true }) };
  });

  await store.ensureLoaded({ userId: "user-1", profileId: "profile-1", authenticated: true });
  store.applyPaymentPayload({ unlockedFeatures: ["section_compat"] }, { profileId: "profile-1" });
  assert.equal(store.isUnlocked("section_compat"), true);
  await store.revalidate({ userId: "user-1", profileId: "profile-1", authenticated: true });
  assert.equal(store.isUnlocked("section_summary"), true);
  assert.equal(store.getSnapshot().status, "degraded");
});

test("AccessStore deduplicates payment access decisions separately from persistent unlock loads", async () => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const store = loadStore(async () => {
    calls += 1;
    await gate;
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: { canAccess: true, accessDecision: { accessGranted: true } } }),
    };
  });
  const first = store.getAccessDecision({ userId: "user-1", featureKey: "premium-report" });
  const second = store.getAccessDecision({ userId: "user-1", featureKey: "premium-report" });
  assert.equal(calls, 1);
  release();
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(firstResult.ok, true);
  assert.equal(secondResult.ok, true);
});

test("React and static shell reference the same AccessStore and no component hook owns unlock fetches", () => {
  const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const layout = fs.readFileSync(path.join(root, "app/layout.js"), "utf8");
  const provider = fs.readFileSync(path.join(root, "app/providers/UnlockProvider.tsx"), "utf8");
  const hook = fs.readFileSync(path.join(root, "app/_lib/use-content-unlock.ts"), "utf8");
  assert.match(shell, /js\/core\/access-store\.js/);
  assert.match(shell, /mergeAccessStoreUnlocksIntoLegacyMap/);
  assert.match(layout, /UnlockProvider/);
  assert.match(provider, /useSyncExternalStore/);
  assert.match(hook, /useAccessStore/);
  assert.doesNotMatch(hook, /authFetch\(/);
});
