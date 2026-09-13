// 권한 판정 writer 4개가 **같은 사용자·같은 기능**에 서로 다른 답을 내는 조합을 실행으로 고정한다.
// (구조 부채 원장 TOP 4 — docs/refactor/structural-issues-top20.md)
//
// 대상 writer:
//   W1 js/core/access-store.js            — 셸·React 공용 classic script. isUnlocked() 가 셸의 답이다.
//   W2 js/core/pass-verdict.js            — 이용권 커버 판정(resolveVerdict). 결제창 직행 여부를 가른다.
//   W3 app/_lib/optimistic-unlock-ledger.ts — React 전용 원장. use-content-unlock.ts:66 이 W1 과 **OR** 로 합류시킨다.
//   W4 app/_lib/user-session-cache.ts     — window.fetch 몽키패치. W1 이 서버에 닿는지 자체를 좌우한다.
//
// 🔴 이 파일은 "옳은 동작"이 아니라 **수렴 전의 실측**을 고정한다. 네 writer 를 한 서버 정본으로
//    모으면 아래 단언들은 깨진다 — 그때가 수렴이 끝난 시점이고, 그 커밋에서 이 파일을 뒤집는다.
//    반대로 아무도 손대지 않았는데 깨진다면 누군가 TTL·회수 경로를 조용히 바꾼 것이다.
//
// 🔴 정적 grep 으로는 못 잡는다 — "TTL 상수가 몇 개인지"가 아니라 "같은 질문에 답이 갈리는지"가
//    쟁점이라, 네 writer 를 **같은 localStorage·같은 시계**를 쓰는 한 샌드박스에 올려 실행한다.
//    TS 두 개는 scripts/lib/load-ts-module.mjs 와 같은 방식(ts.transpileModule)으로 원문을 변환해 싣는다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function transpile(relativePath) {
  return ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: relativePath,
  }).outputText;
}

const USER_ID = "user-1";
const PROFILE_ID = "profile-1";
const FEATURE_KEY = "saju-deep";
const COIN_COST = 30; // standard 이용권 건당 상한 50 미만 — 등급 상한에 걸리지 않는 값
const T0 = Date.parse("2026-09-13T00:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;

/**
 * 네 writer 를 한 컨텍스트에 올린다. localStorage 는 호출부가 넘긴 Map 하나를 공유하므로
 * "브라우저를 닫았다 다시 연" 상황은 같은 Map 으로 boot 을 다시 부르면 된다.
 */
function boot({ storage = new Map(), startedAt = T0, respond, installFetchCache = false } = {}) {
  let now = startedAt;
  // TTL 이 쟁점이라 시계를 잡아야 한다. Date.parse·new Date(iso) 는 원본 그대로 살린다.
  const ClockDate = new Proxy(Date, {
    get: (target, prop, receiver) => (prop === "now" ? () => now : Reflect.get(target, prop, receiver)),
    construct: (target, args) => (args.length ? new target(...args) : new target(now)),
  });

  const listeners = new Map();
  const serverHits = [];
  const sandbox = {
    console, Promise, Object, Array, JSON, Math, String, Number, Boolean, Set, Map, Error, Symbol, Reflect,
    Date: ClockDate,
    encodeURIComponent, decodeURIComponent, URL, URLSearchParams, Headers, Request, Response,
    AbortController, TextEncoder, TextDecoder, structuredClone, queueMicrotask,
    setTimeout: () => 1,
    clearTimeout: () => undefined,
    location: { href: "https://example.test/app", origin: "https://example.test" },
    document: { cookie: "" },
    navigator: { userAgent: "node" },
    localStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
      key: (index) => Array.from(storage.keys())[index] ?? null,
      get length() { return storage.size; },
    },
    sessionStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
    addEventListener: (name, listener) => {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(listener);
    },
    removeEventListener: () => undefined,
    dispatchEvent: (event) => {
      (listeners.get(event && event.type) || []).forEach((listener) => listener(event));
      return true;
    },
    CustomEvent: class CustomEvent {
      constructor(type, init) { this.type = type; this.detail = init && init.detail; }
    },
    Event: class Event { constructor(type) { this.type = type; } },
  };
  // 실네트워크는 나가지 않는다. 서버 정본은 respond() 가 매 호출 시점에 만들어 준다.
  sandbox.fetch = async (input) => {
    serverHits.push(String(input && input.url ? input.url : input));
    return new Response(JSON.stringify(respond ? respond() : { ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);

  // pass-verdict 를 먼저 올린다 — access-store 의 syncPassVerdictSnapshot 이 이 전역을 찾는다.
  sandbox.module = { exports: {} };
  sandbox.exports = sandbox.module.exports;
  vm.runInContext(read("js/core/pass-verdict.js"), sandbox, { filename: "js/core/pass-verdict.js" });
  vm.runInContext(read("js/core/access-store.js"), sandbox, { filename: "js/core/access-store.js" });

  // TS 모듈 밖의 의존성만 대역으로 세운다. 판정 본체는 전부 원문 그대로다.
  const stubs = {
    react: { useCallback: (fn) => fn, useSyncExternalStore: () => null },
    "@/app/_lib/billing-client": {
      fetchBillingBalance: async () => ({}),
      seedMonthlyQuotaFromAccessState: () => undefined,
    },
    "@/app/_lib/auth-client": { authFetch: async (...args) => sandbox.fetch(...args) },
  };
  function loadTs(relativePath) {
    const loaded = { exports: {} };
    const factory = vm.runInContext(
      `(function (module, exports, require) {\n${transpile(relativePath)}\n})`,
      sandbox,
      { filename: relativePath },
    );
    factory(loaded, loaded.exports, (request) => {
      const stub = stubs[request];
      assert.ok(stub, `대역이 없는 import 입니다 — 대역 목록을 갱신하세요: ${request} (${relativePath})`);
      return stub;
    });
    return loaded.exports;
  }

  const ledger = loadTs("app/_lib/optimistic-unlock-ledger.ts");
  const sessionCache = loadTs("app/_lib/user-session-cache.ts");
  if (installFetchCache) sessionCache.installUserAccessFetchCache();

  return {
    storage,
    serverHits,
    store: sandbox.CodeDestinyAccessStore, // W1
    verdict: sandbox.__cdPassVerdict, // W2
    ledger, // W3
    sessionCache, // W4
    advance: (ms) => { now += ms; },
  };
}

/** /api/me/access-state 응답 정본 모양. authoritative(full+server)여야 회수까지 반영된다. */
function accessState({ unlocked, tier = "free", passExpiresAt = null, revoked = null, version = 1 }) {
  return {
    ok: true,
    userId: USER_ID,
    currentProfileId: PROFILE_ID,
    completeness: "full",
    authority: "server",
    version,
    unlockedFeatureIds: unlocked ? [FEATURE_KEY] : [],
    ...(revoked ? { revokedFeatureIds: revoked } : {}),
    entitlementSnapshot: {
      tier,
      completeness: "full",
      authority: "server",
      activePasses: passExpiresAt ? [{ expiresAt: passExpiresAt }] : [],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) W4 가 W1 의 강제 재검증을 삼킨다 — 같은 코드가 런타임에 따라 다른 답을 낸다.
//
// access-store 는 재검증을 `revalidate()`(내부 force)와 HTTP `cache:'no-store'` 로 표현한다.
// 그런데 user-session-cache 의 몽키패치가 뚫리는 조건은 오직 헤더 하나
// (user-session-cache.ts:87 CACHE_REFRESH_HEADER)이고, access-store 는 그 헤더를 싣지 않는다.
// 그래서 서버가 권한을 회수해도 React 는 accessState TTL 60초(user-session-cache.ts:256) 동안
// 옛 답을 그대로 받는다. 셸에는 몽키패치가 설치되지 않으므로(app/providers/UserSessionProvider.tsx)
// 같은 access-store.js 가 그 자리에서 회수를 반영한다.
// ─────────────────────────────────────────────────────────────────────────────
test("서버가 권한을 회수하면 셸은 즉시 잠그지만 React 는 60초 동안 열어 둔다 (W1 × W4)", async () => {
  async function runtime(installFetchCache) {
    let revoked = false;
    const runner = boot({
      installFetchCache,
      respond: () => (revoked
        ? accessState({ unlocked: false, revoked: [FEATURE_KEY], version: 2 })
        : accessState({ unlocked: true })),
    });
    await runner.store.ensureLoaded({ userId: USER_ID, profileId: PROFILE_ID, authenticated: true, force: true });
    assert.equal(runner.store.isUnlocked(FEATURE_KEY), true, "출발점은 열림이어야 합니다");

    revoked = true; // 서버 정본이 회수로 바뀐다(환불·권한 취소·월 한도 소진)
    runner.advance(5 * 1000);
    await runner.store.revalidate({ userId: USER_ID, profileId: PROFILE_ID, authenticated: true });
    const rightAfterRevoke = runner.store.isUnlocked(FEATURE_KEY);
    const hitsAfterRevoke = runner.serverHits.length;

    runner.advance(61 * 1000); // accessState 캐시 TTL 60초를 넘긴다
    await runner.store.revalidate({ userId: USER_ID, profileId: PROFILE_ID, authenticated: true });
    return { rightAfterRevoke, hitsAfterRevoke, afterTtl: runner.store.isUnlocked(FEATURE_KEY) };
  }

  const shell = await runtime(false);
  const react = await runtime(true);

  assert.equal(shell.rightAfterRevoke, false, "셸은 회수를 즉시 반영해야 합니다");
  assert.equal(shell.hitsAfterRevoke, 2, "셸의 revalidate 는 서버에 닿아야 합니다");

  // 🔴 재현된 엇갈림: 같은 사용자·같은 기능·같은 access-store.js·같은 revalidate() 호출인데 답이 다르다.
  assert.equal(react.rightAfterRevoke, true, "몽키패치가 강제 재검증을 삼키는 현상이 사라졌다면 수렴된 것입니다");
  assert.equal(react.hitsAfterRevoke, 1, "React 의 두 번째 revalidate 는 서버에 닿지 않는다(60초 캐시 히트)");

  // 짝 단언: 지연은 유한해야 한다. TTL 이 늘거나 무효화가 빠지면 여기서 문다.
  assert.equal(shell.afterTtl, false, "TTL 이 지난 뒤에는 셸이 잠겨 있어야 합니다");
  assert.equal(react.afterTtl, false, "TTL 이 지나도 회수되지 않으면 유료 콘텐츠가 무기한 샙니다");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) 낙관 해금 회수가 두 저장소 중 하나만 지운다.
//
// access-store.rollbackOptimisticUpdate(access-store.js:1179)는 state.optimistic 을 통째로 비우지만
// 원장(cd_verified_unlock_grants_v1)은 모른다. React 의 useContentUnlock(use-content-unlock.ts:66)은
// 두 곳을 **OR** 로 합치므로, 셸이 잠근 기능이 React 에서는 열린 채로 남는다.
// (키 단위 회수 forgetOptimisticUnlock 은 양쪽을 지운다 — 아래 짝 단언으로 함께 고정한다.)
// ─────────────────────────────────────────────────────────────────────────────
test("낙관 전면 롤백은 access-store 만 비우고 원장은 남긴다 (W1 × W3)", () => {
  const runner = boot({ respond: () => accessState({ unlocked: false }) });
  runner.store.applyAccessStateSnapshot(accessState({ unlocked: false }), { profileId: PROFILE_ID });

  // 결제 직후 React 경로가 하는 일 그대로(use-content-unlock.ts:81-82): 원장과 store 에 함께 찍는다.
  runner.ledger.recordOptimisticUnlock(FEATURE_KEY);
  runner.store.markOptimisticallyUnlocked(FEATURE_KEY, PROFILE_ID, { source: "content-unlock-hook" });
  assert.equal(runner.store.isUnlocked(FEATURE_KEY), true);
  assert.equal(runner.ledger.hasLedgerUnlock(FEATURE_KEY), true);

  runner.store.rollbackOptimisticUpdate("payment-failed");

  // 🔴 재현된 엇갈림: 셸은 잠김, 원장은 열림 → React 의 OR 합류는 열림이 된다.
  assert.equal(runner.store.isUnlocked(FEATURE_KEY), false, "셸의 답");
  assert.equal(runner.ledger.hasLedgerUnlock(FEATURE_KEY), true, "원장이 함께 지워졌다면 수렴된 것입니다");

  // 짝 단언: 키 단위 회수는 지금도 양쪽을 지운다. 이 경로까지 깨지면 402 회수가 통째로 무력해진다.
  runner.ledger.recordOptimisticUnlock(FEATURE_KEY);
  runner.store.markOptimisticallyUnlocked(FEATURE_KEY, PROFILE_ID, { source: "content-unlock-hook" });
  runner.ledger.forgetOptimisticUnlock(FEATURE_KEY);
  assert.equal(runner.ledger.hasLedgerUnlock(FEATURE_KEY), false, "월 한도 402 회수는 원장을 지워야 합니다");
  assert.equal(runner.store.isUnlocked(FEATURE_KEY), false, "월 한도 402 회수는 store 도 지워야 합니다");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3) 이용권이 끝난 사용자에게 한 화면이 세 가지 답을 갖는다.
//
// 이용권으로 열린 기능인지 단건 결제로 산 기능인지 구분하는 provenance 가 unlockedFeatureIds 에
// 없다. 그래서 이용권 만료 후에도 access-store 의 해금 목록은 그대로 남는다.
// 반대편 두 판정은 만료를 각자 두 겹으로 안다: getEffectiveTier(access-store.js:968-971)가 만료일을
// 직접 보고, pass-verdict 는 만료 스냅샷을 readSnapshot 에서 폐기하며(pass-verdict.js:186) 설령
// 남더라도 stale 판정이 coversNow 를 막는다(:503). 실측 변이 결과 세 경로가 모두 독립으로 문다.
// ─────────────────────────────────────────────────────────────────────────────
test("이용권 만료 직후 isUnlocked·getEffectiveTier·pass-verdict 가 서로 다른 답을 낸다 (W1 × W2)", () => {
  const passExpiresAt = new Date(T0 + 2 * HOUR_MS).toISOString();
  const payload = accessState({ unlocked: true, tier: "standard", passExpiresAt });
  const runner = boot({ respond: () => payload });

  runner.store.applyAccessStateSnapshot(payload, { profileId: PROFILE_ID });
  runner.verdict.storeStatus(USER_ID, {
    tier: "standard", isActive: true, expiresAt: passExpiresAt, completeness: "full", authority: "server",
  });

  const ask = () => ({
    unlocked: runner.store.isUnlocked(FEATURE_KEY),
    tier: runner.store.getEffectiveTier(),
    verdict: runner.verdict.resolveVerdict(runner.verdict.readSnapshot(USER_ID), COIN_COST),
  });

  const before = ask();
  assert.equal(before.unlocked, true);
  assert.equal(before.tier, "standard");
  assert.equal(before.verdict.coversNow, true, "이용권이 살아 있는 동안은 세 답이 일치합니다");

  runner.advance(3 * HOUR_MS); // 이용권 만료 1시간 후
  const after = ask();

  // 🔴 재현된 엇갈림: 같은 사용자·같은 기능·같은 순간에 세 답이 갈린다.
  assert.equal(after.unlocked, true, "해금 목록은 이용권 만료를 모른다");
  assert.equal(after.tier, "free", "등급 판정은 만료를 안다");
  assert.equal(after.verdict.coversNow, false, "이용권 커버 판정은 만료를 안다");

  // 짝 단언: 만료를 '미보유 확정'으로 오독하면 안 된다. 확정 거부는 서버만 내릴 수 있다.
  assert.equal(after.verdict.cannotCover, false, "만료는 서버 재확인 대상이지 결제창 직행 근거가 아닙니다");
});

// ─────────────────────────────────────────────────────────────────────────────
// 4) 같은 해금 하나에 붙은 수명이 writer 마다 다르다.
//
// 원장 주석(optimistic-unlock-ledger.ts:13)은 "서버 확정 엔트리는 72시간"이라고 적었지만,
// 실제 필터(:42)는 mode === "confirmed" 를 TTL 검사에서 통째로 빼므로 영구다.
// 같은 시각의 access-store 는 또 다른 규칙으로 답한다.
// ─────────────────────────────────────────────────────────────────────────────
test("같은 해금의 수명이 원장과 access-store 에서 다르다 (W1 × W3)", () => {
  const respond = () => accessState({ unlocked: true });

  // (가) 서버 확정 승격 없이 기록된 엔트리 — 원장 72시간, access-store 는 그보다 길다.
  const legacyStorage = new Map();
  const first = boot({ storage: legacyStorage, respond });
  first.store.applyAccessStateSnapshot(accessState({ unlocked: true }), { profileId: PROFILE_ID });
  first.ledger.recordVerifiedUnlock(FEATURE_KEY, {});
  assert.equal(first.ledger.hasLedgerUnlock(FEATURE_KEY), true);

  const later = boot({ storage: legacyStorage, startedAt: T0 + 73 * HOUR_MS, respond });
  later.store.ensureLoaded({ userId: USER_ID, profileId: PROFILE_ID, authenticated: true });
  assert.equal(later.ledger.hasLedgerUnlock(FEATURE_KEY), false, "원장은 72시간에 만료한다");
  assert.equal(later.store.isUnlocked(FEATURE_KEY), true, "access-store 는 같은 해금을 아직 열어 둔다");

  // (나) permanent_unlock 으로 확정된 엔트리 — 원장에서는 만료가 아예 없다(:42).
  const confirmedStorage = new Map();
  const confirmed = boot({ storage: confirmedStorage, respond });
  confirmed.ledger.recordVerifiedUnlock(FEATURE_KEY, {
    grantType: "permanent_unlock", status: "active", profileId: PROFILE_ID,
  });
  const muchLater = boot({ storage: confirmedStorage, startedAt: T0 + 365 * 24 * HOUR_MS, respond });
  assert.equal(
    muchLater.ledger.hasLedgerUnlock(FEATURE_KEY), true,
    "주석은 72시간이라고 적었지만 confirmed 는 TTL 검사를 건너뛴다 — 만료가 생겼다면 수렴된 것입니다",
  );
});
