const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const storeSource = fs.readFileSync(path.join(root, "js/core/access-store.js"), "utf8");

function loadStore(fetchImpl, { setTimeoutImpl = () => 1 } = {}) {
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
    setTimeout: setTimeoutImpl,
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
  sandbox.CodeDestinyAccessStore.__testListeners = listeners;
  return sandbox.CodeDestinyAccessStore;
}

test("AccessStore deduplicates concurrent loads and exposes one shared snapshot", async () => {
  let calls = 0;
  const urls = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const store = loadStore(async (url) => {
    calls += 1;
    urls.push(String(url));
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
  assert.equal(urls[0].includes("includeBackfill=1"), false);
  assert.equal(store.isUnlocked("section_summary"), true);
  assert.equal(store.getSnapshot().status, "ready");
});

test("AccessStore accepts auth bootstrap entitlement snapshots without fetching unlocks", () => {
  let calls = 0;
  const store = loadStore(async () => {
    calls += 1;
    return { ok: false, status: 503, json: async () => ({ ok: false }) };
  });

  const applied = store.applyAccessStateSnapshot({
    userId: "user-1",
    currentProfileId: "profile-1",
    unlockedFeatureIds: ["fpti-premium-report"],
    monthlyBalance: { remaining: 120, resetAt: "2030-01-01T00:00:00.000Z" },
    entitlementSnapshot: {
      userId: "user-1",
      tier: "premium",
      unlockedFeatureIds: ["fpti-premium-report"],
      monthlyBalance: { remaining: 120 },
      source: "server",
    },
  }, { profileId: "profile-1" });

  assert.equal(applied, true);
  assert.equal(calls, 0);
  assert.equal(store.canAccessFeature("fpti-premium-report"), true);
  assert.equal(store.getEffectiveTier(), "premium");
  assert.equal(store.getMonthlyBalance().remaining, 120);
  assert.equal(store.canPurchaseProduct("pass-premium").requiresServerVerification, true);
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

test("AccessStore requests one read-only unlock snapshot without an automatic 503 retry", async () => {
  const requests = [];
  const timers = [];
  const store = loadStore(async (url) => {
    requests.push(url);
    return { ok: false, status: 503, json: async () => ({ ok: false, retryable: true }) };
  }, {
    setTimeoutImpl: (callback) => {
      timers.push(callback);
      return timers.length;
    },
  });

  await store.ensureLoaded({ userId: "user-1", profileId: "profile-1", authenticated: true });

  assert.equal(requests.length, 1);
  assert.equal(timers.length, 0);
  assert.doesNotMatch(requests[0], /includeBackfill|backfill/);
  assert.match(storeSource, /var RETRY_DELAYS = \[\];/);
});

test("auth and profile events invalidate without fetching until an explicit load", async () => {
  let calls = 0;
  const store = loadStore(async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => ({ ok: true, unlockedFeatures: [] }) };
  });

  store.__testListeners.get("cd:auth-changed")({ detail: { type: "login", userId: "user-1", profileId: "profile-1" } });
  store.__testListeners.get("cd:profile-changed")({ detail: { userId: "user-1", profileId: "profile-1" } });
  assert.equal(calls, 0);

  await store.ensureLoaded({ userId: "user-1", profileId: "profile-1", authenticated: true });
  assert.equal(calls, 1);
});

test("partial or degraded snapshots cannot downgrade an active pass", () => {
  const store = loadStore(async () => ({ ok: false, status: 503, json: async () => ({ ok: false }) }));
  const active = store.applyAccessStateSnapshot({
    userId: "user-1",
    completeness: "full",
    authority: "server",
    entitlementSnapshot: { userId: "user-1", tier: "premium", completeness: "full", authority: "server" },
  }, { userId: "user-1", profileId: "profile-1" });
  const degraded = store.applyAccessStateSnapshot({
    userId: "user-1",
    degraded: true,
    completeness: "partial",
    authority: "cache",
    entitlementSnapshot: { userId: "user-1", tier: "free", completeness: "partial", authority: "cache" },
  }, { userId: "user-1", profileId: "profile-1" });

  assert.equal(active, true);
  assert.equal(degraded, true);
  assert.equal(store.getEffectiveTier(), "premium");
  assert.equal(store.getSnapshot().status, "degraded");
});

test("a snapshot for another user is rejected", () => {
  const store = loadStore(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
  const applied = store.applyAccessStateSnapshot({
    userId: "user-2",
    completeness: "full",
    authority: "server",
    entitlementSnapshot: { userId: "user-2", tier: "premium" },
  }, { userId: "user-1", profileId: "profile-1" });

  assert.equal(applied, false);
  assert.equal(store.getSnapshot().userId, "");
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

test("billing eligibility keeps the one-request unlock-status fallback while AccessStore initializes", () => {
  const billingClient = fs.readFileSync(path.join(root, "app/_lib/billing-client.ts"), "utf8");
  assert.match(billingClient, /app:billing-client-access-store-fallback/);
  assert.match(billingClient, /\/api\/billing\/unlock-status/);
});

test("global tile-lock and Adsense consumers never trigger unlock network reads", () => {
  const runtime = fs.readFileSync(path.join(root, "js/core/index-inline-runtime.js"), "utf8");
  const adsense = fs.readFileSync(path.join(root, "app/components/DeferredAdsense.tsx"), "utf8");
  const tileSyncStart = runtime.indexOf("function __cdSyncTileLocksFromServer()");
  const tileSyncEnd = runtime.indexOf("function __cdScheduleTileLockServerSync()", tileSyncStart);
  const tileSync = runtime.slice(tileSyncStart, tileSyncEnd);

  assert.match(tileSync, /accessStore\.getSnapshot\(\)/);
  assert.doesNotMatch(tileSync, /ensureLoaded\(/);
  assert.doesNotMatch(adsense, /ensureLoaded\(/);
  assert.match(adsense, /accessStore\.getSnapshot/);
  assert.match(adsense, /accessStore\?\.subscribe/);
});
