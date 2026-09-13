const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const storeSource = fs.readFileSync(path.join(root, "js/core/access-store.js"), "utf8");

function loadStore(fetchImpl, { setTimeoutImpl = () => 1, authUser = null, BroadcastChannelImpl, storageMap } = {}) {
  const listeners = new Map();
  const storage = storageMap || new Map();
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
    __cdAuthUser: authUser,
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
  if (BroadcastChannelImpl) sandbox.BroadcastChannel = BroadcastChannelImpl;
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

test("AccessStore uses the auth-aware adapter and the complete access-state endpoint", async () => {
  let rawFetchCalls = 0;
  const adapterUrls = [];
  const store = loadStore(async () => {
    rawFetchCalls += 1;
    throw new Error("raw fetch must not be used");
  });
  store.setRequestAdapter(async (url) => {
    adapterUrls.push(String(url));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: {
          userId: "user-1",
          currentProfileId: "profile-1",
          unlockedFeatureIds: ["section_summary"],
          completeness: "full",
          authority: "server",
        },
      }),
    };
  });

  await store.ensureLoaded({ userId: "user-1", profileId: "profile-1", authenticated: true });
  assert.equal(rawFetchCalls, 0);
  assert.deepEqual(adapterUrls, ["/api/me/access-state?profileId=profile-1"]);
  assert.equal(store.isUnlocked("section_summary"), true);
});

test("AccessStore requests Guardian as an include variant and preserves the last good usage on partial degradation", async () => {
  const urls = [];
  const store = loadStore(async (url) => {
    urls.push(String(url));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: {
          userId: "user-1",
          currentProfileId: "profile-1",
          unlockedFeatureIds: ["section_summary"],
          completeness: "full",
          authority: "server",
          freeUsage: {
            guardian: { degraded: false, dailyFreeRemaining: 2, paidCreditsRemaining: 4, canGenerate: true },
          },
        },
      }),
    };
  });

  await store.ensureLoaded({ userId: "user-1", profileId: "profile-1", authenticated: true, includeGuardian: true });
  assert.deepEqual(urls, ["/api/me/access-state?profileId=profile-1&include=guardian"]);
  assert.equal(store.getSnapshot().freeUsage.guardian.dailyFreeRemaining, 2);

  store.applyAccessStateSnapshot({
    userId: "user-1",
    currentProfileId: "profile-1",
    unlockedFeatureIds: ["section_summary"],
    completeness: "full",
    authority: "server",
    freeUsage: { guardian: { degraded: true, code: "DB_QUERY_TIMEOUT" } },
  }, { profileId: "profile-1" });

  assert.equal(store.getSnapshot().freeUsage.guardian.dailyFreeRemaining, 2);
  assert.equal(store.getSnapshot().freeUsage.guardian.degraded, false);
});

test("permission and profile failures preserve login state and the last good unlock snapshot", async () => {
  let calls = 0;
  const store = loadStore(async () => {
    calls += 1;
    if (calls === 1) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            userId: "user-1",
            currentProfileId: "profile-1",
            unlockedFeatureIds: ["section_summary"],
            completeness: "full",
            authority: "server",
          },
        }),
      };
    }
    return {
      ok: false,
      status: 403,
      json: async () => ({ ok: false, code: "MISSING_PROFILE_ID" }),
    };
  });

  await store.ensureLoaded({ userId: "user-1", profileId: "profile-1", authenticated: true });
  const failed = await store.revalidate({ userId: "user-1", profileId: "profile-1", authenticated: true });
  assert.equal(failed.code, "PROFILE_REQUIRED");
  assert.equal(store.isUnlocked("section_summary"), true);
  assert.equal(store.getSnapshot().userId, "user-1");
  assert.equal(store.getSnapshot().status, "degraded");
});

test("a final 401 is classified as authentication failure without erasing the last good snapshot", async () => {
  let calls = 0;
  const store = loadStore(async () => {
    calls += 1;
    if (calls === 1) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            userId: "user-1",
            currentProfileId: "profile-1",
            unlockedFeatureIds: ["section_summary"],
            completeness: "full",
            authority: "server",
          },
        }),
      };
    }
    return { ok: false, status: 401, json: async () => ({ ok: false, code: "AUTH_REQUIRED" }) };
  });

  await store.ensureLoaded({ userId: "user-1", profileId: "profile-1", authenticated: true });
  const failed = await store.revalidate({ userId: "user-1", profileId: "profile-1", authenticated: true });
  assert.equal(failed.code, "AUTH_REQUIRED");
  assert.equal(store.isUnlocked("section_summary"), true);
  assert.equal(store.getSnapshot().status, "degraded");
});

// 🔴 Phase 4 커밋 5(D2)에서 이 테스트의 단언 하나를 **뒤집었다**(지우지 않았다).
// 예전에는 권위 스냅샷이 덧쓰기라, 두 번째 완전 스냅샷이 section_summary 를 빼고 와도
// 그 키가 confirmedUnlocks 에 영원히 남았다. 서버는 회수를 별도 신호로 보내지 않으므로
// (revokedFeatureIds 는 워커에 생산자가 없다) 그 덧쓰기는 회수를 영구히 무효로 만들었다.
// 이제 권위 스냅샷은 치환이다. 치환을 덧쓰기로 되돌리면 :269 가 곧바로 실패한다.
test("an authoritative snapshot replaces the confirmed set and ignores unsupported revoke hints", () => {
  const store = loadStore(async () => ({ ok: false, status: 503, json: async () => ({ ok: false }) }));
  store.applyAccessStateSnapshot({
    userId: "user-1",
    currentProfileId: "profile-1",
    unlockedFeatureIds: ["section_summary"],
    completeness: "full",
    authority: "server",
  }, { userId: "user-1", profileId: "profile-1" });
  const first = store.getSnapshot();
  assert.equal(first, store.getSnapshot());

  store.applyAccessStateSnapshot({
    userId: "user-1",
    currentProfileId: "profile-1",
    unlockedFeatureIds: ["section_compat"],
    completeness: "full",
    authority: "server",
  }, { userId: "user-1", profileId: "profile-1" });
  // 🔴 수렴 단언(뒤집기 전: true). 두 번째 권위 스냅샷이 section_summary 를 빼고 왔다 —
  // 서버가 낼 수 있는 유일한 회수 신호가 이것이다. 실패하면 D2 치환이 덧쓰기로 되돌아간 것이다.
  assert.equal(store.isUnlocked("section_summary"), false);
  assert.equal(store.isUnlocked("section_compat"), true);
  // 치환 결과는 서버 집합과 **정확히** 같아야 한다. 더 비우면(빈 맵) persistentUnlocks 가
  // 가려 주어 isUnlocked 로는 안 보이므로, 확정 집합 자체를 본다.
  assert.deepEqual(Object.keys(store.getSnapshot().confirmedUnlocks).sort(), ["section_compat"]);
  assert.notEqual(first, store.getSnapshot());

  // Unsupported hints must not split the confirmed and persistent sets.
  store.applyAccessStateSnapshot({
    userId: "user-1",
    currentProfileId: "profile-1",
    unlockedFeatureIds: ["section_compat"],
    revokedFeatureIds: ["section_compat"],
    version: "v2",
    completeness: "full",
    authority: "server",
  }, { userId: "user-1", profileId: "profile-1" });
  assert.equal(store.isUnlocked("section_summary"), false);
  assert.equal(store.isUnlocked("section_compat"), true);
  assert.deepEqual(Object.keys(store.getSnapshot().confirmedUnlocks), ["section_compat"]);
});

// 🔴 D2 치환의 fail-closed 짝. 치환은 권위 페이로드에만 걸린다 — degraded·부분 응답은 완전
// 집합이 아니므로 치환하면 산 것을 지운다(원칙 10). 조건을 떼면 이 테스트가 문다.
test("a degraded snapshot never replaces the confirmed set", () => {
  const store = loadStore(async () => ({ ok: false, status: 503, json: async () => ({ ok: false }) }));
  store.applyAccessStateSnapshot({
    userId: "user-1",
    currentProfileId: "profile-1",
    unlockedFeatureIds: ["section_summary"],
    completeness: "full",
    authority: "server",
  }, { userId: "user-1", profileId: "profile-1" });
  assert.equal(store.isUnlocked("section_summary"), true);

  store.applyAccessStateSnapshot({
    userId: "user-1",
    currentProfileId: "profile-1",
    unlockedFeatureIds: [],
    degraded: true,
    completeness: "partial",
    authority: "server",
  }, { userId: "user-1", profileId: "profile-1" });
  assert.equal(store.isUnlocked("section_summary"), true, "degraded 응답이 확정 해금을 지우면 유료 콘텐츠가 장애 때마다 잠긴다");
  assert.equal(store.getSnapshot().confirmedUnlocks.section_summary, true);
});

test("verified payment grants persist without TTL and survive logout and reload", async () => {
  const sharedStorage = new Map();
  const noFetch = async () => ({ ok: false, status: 503, json: async () => ({ ok: false }) });
  const first = loadStore(noFetch, { storageMap: sharedStorage, authUser: { id: "user-1" } });
  first.applyAccessStateSnapshot({
    userId: "user-1",
    profileId: "profile-1",
    unlockedFeatureIds: [],
    completeness: "full",
    authority: "server",
  }, { userId: "user-1", profileId: "profile-1" });
  first.applyPaymentPayload({
    unlockGrant: {
      id: "grant-1",
      featureKey: "section_summary",
      profileId: "profile-1",
      scope: "PROFILE",
      grantType: "permanent_unlock",
      status: "active",
      grantedAt: "2026-01-01T00:00:00.000Z",
      version: 1,
    },
  }, { profileId: "profile-1" });
  assert.equal(first.getSnapshot().confirmedUnlocks.section_summary, true);
  first.__testListeners.get("cd:auth-changed")({ detail: { type: "logout", loggedIn: false } });

  const cacheKey = Array.from(sharedStorage.keys()).find((key) => key.includes("cd_access_store_v4::user-1::profile-1"));
  const cached = JSON.parse(sharedStorage.get(cacheKey));
  cached.savedAt = 1;
  sharedStorage.set(cacheKey, JSON.stringify(cached));

  const second = loadStore(noFetch, { storageMap: sharedStorage, authUser: { id: "user-1" } });
  await second.ensureLoaded({ userId: "user-1", profileId: "profile-1", authenticated: true });
  assert.equal(second.isUnlocked("section_summary"), true);
  assert.equal(second.getSnapshot().confirmedUnlocks.section_summary, true);
});

test("a real destinyProfileChanged event switches context and loads one complete snapshot", async () => {
  const urls = [];
  const store = loadStore(async (url) => {
    urls.push(String(url));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: {
          userId: "user-1",
          currentProfileId: "profile-2",
          unlockedFeatureIds: ["section_compat"],
          completeness: "full",
          authority: "server",
        },
      }),
    };
  }, { authUser: { id: "user-1" } });

  store.__testListeners.get("destinyProfileChanged")({ detail: { id: "profile-2" } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(urls, ["/api/me/access-state?profileId=profile-2"]);
  assert.equal(store.getSnapshot().profileId, "profile-2");
  assert.equal(store.isUnlocked("section_compat"), true);
});

test("BroadcastChannel propagates an optimistic payment unlock to another tab", async () => {
  const channels = [];
  class FakeBroadcastChannel {
    constructor() {
      this.onmessage = null;
      channels.push(this);
    }
    postMessage(data) {
      channels.forEach((channel) => {
        if (channel !== this && typeof channel.onmessage === "function") channel.onmessage({ data });
      });
    }
  }
  const sharedStorage = new Map();
  const noFetch = async () => ({ ok: false, status: 503, json: async () => ({ ok: false }) });
  const firstTab = loadStore(noFetch, { BroadcastChannelImpl: FakeBroadcastChannel, storageMap: sharedStorage });
  const secondTab = loadStore(noFetch, { BroadcastChannelImpl: FakeBroadcastChannel, storageMap: sharedStorage });

  secondTab.applyAccessStateSnapshot({
    userId: "user-1",
    currentProfileId: "profile-1",
    unlockedFeatureIds: [],
    completeness: "full",
    authority: "server",
  }, { userId: "user-1", profileId: "profile-1" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  firstTab.applyAccessStateSnapshot({
    userId: "user-1",
    currentProfileId: "profile-1",
    unlockedFeatureIds: [],
    completeness: "full",
    authority: "server",
  }, { userId: "user-1", profileId: "profile-1" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  firstTab.markOptimisticallyUnlocked("section_summary", "profile-1", { source: "payment" });

  assert.equal(secondTab.isUnlocked("section_summary"), true);
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

// 🔴 Phase 4 D1 — 권위 스냅샷의 판정 집합 정본은 unlockedFeatureIds 와
// entitlementSnapshot.unlockedFeatureIds 둘뿐이다. 나머지 배열·맵을 합집합한 채로 두면 D2 의
// 집합 치환이 무효가 된다(서버가 뺀 키가 다른 배열에 남아 회수가 반영되지 않는다).
// 비권위 스냅샷은 종전대로 전부 읽는다 — 모를 때 알던 것을 지우지 않는다.
test("an authoritative snapshot reads unlock keys only from the canonical fields", () => {
  const store = loadStore(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
  store.applyAccessStateSnapshot({
    userId: "user-1",
    completeness: "full",
    authority: "server",
    unlockedFeatureIds: ["section_daewun"],
    // 정본이 아닌 출처들. 권위 페이로드에서는 읽지 않는다.
    unlockedFeatures: ["ziwei_decade_luck"],
    unlockedContentKeys: ["ziwei.loveDeep"],
    unlockMap: { ziwei_twelve_palaces: true },
    entitlementSnapshot: { userId: "user-1", tier: "free", completeness: "full", authority: "server" },
  }, { userId: "user-1", profileId: "profile-1" });

  assert.equal(store.isUnlocked("section_daewun"), true, "정본 필드의 키는 열려야 합니다");
  assert.equal(store.isUnlocked("ziwei_decade_luck"), false, "unlockedFeatures 는 권위 경로의 정본이 아닙니다");
  assert.equal(store.isUnlocked("ziwei_love_deep"), false, "unlockedContentKeys 는 권위 경로의 정본이 아닙니다");
  assert.equal(store.isUnlocked("ziwei_twelve_palaces"), false, "unlockMap 은 권위 경로의 정본이 아닙니다");
});

test("a degraded snapshot still reads every unlock source", () => {
  const store = loadStore(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
  store.applyAccessStateSnapshot({
    userId: "user-1",
    degraded: true,
    completeness: "partial",
    authority: "cache",
    unlockedFeatures: ["ziwei_decade_luck"],
    unlockMap: { ziwei_twelve_palaces: true },
    entitlementSnapshot: { userId: "user-1", tier: "free", completeness: "partial", authority: "cache" },
  }, { userId: "user-1", profileId: "profile-1" });

  assert.equal(store.isUnlocked("ziwei_decade_luck"), true, "비권위 스냅샷에서는 보강 출처를 계속 읽어야 합니다");
  assert.equal(store.isUnlocked("ziwei_twelve_palaces"), true, "비권위 스냅샷에서는 맵 출처도 계속 읽어야 합니다");
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

test("an already purchased feature uses the complete snapshot without an unlock-status request", async () => {
  let calls = 0;
  const store = loadStore(async () => {
    calls += 1;
    return { ok: false, status: 500, json: async () => ({ ok: false }) };
  });
  store.applyAccessStateSnapshot({
    userId: "user-1",
    currentProfileId: "profile-1",
    unlockedFeatureIds: ["sibyl-premium"],
    completeness: "full",
    authority: "server",
  }, { userId: "user-1", profileId: "profile-1" });

  const result = await store.getAccessDecision({
    userId: "user-1",
    profileId: "profile-1",
    featureKey: "sibyl-premium",
  });
  assert.equal(result.ok, true);
  assert.equal(result.source, "access-snapshot");
  assert.equal(result.payload.data.accessDecision.accessGranted, true);
  assert.equal(calls, 0);
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
