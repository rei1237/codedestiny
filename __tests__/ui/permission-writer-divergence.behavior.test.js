// 권한 판정 writer 4개가 **같은 사용자·같은 기능**에 서로 다른 답을 내는 조합을 실행으로 고정한다.
// (구조 부채 원장 TOP 4 — docs/refactor/structural-issues-top20.md)
//
// 대상 writer:
//   W1 js/core/access-store.js            — 셸·React 공용 classic script. isUnlocked() 가 셸의 답이다.
//   W2 js/core/pass-verdict.js            — 이용권 커버 판정(resolveVerdict). 결제창 직행 여부를 가른다.
//   W3 app/_lib/optimistic-unlock-ledger.ts — React 전용 원장. use-content-unlock.ts 의
//      resolveUnlockedMap 이 W1 과 합류시킨다(Phase 4 D3 이후: 권위 스냅샷 전의 낙관만 기여).
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
    react: { useCallback: (fn) => fn, useMemo: (fn) => fn(), useEffect: () => undefined, useSyncExternalStore: () => null },
    // use-content-unlock 은 훅 밖의 순수 함수(resolveUnlockedMap)로 합류를 계산한다. 프로바이더는
    // 그 순수 함수에 관여하지 않으므로 모듈 로드만 되게 대역을 세운다.
    "@/app/providers/UnlockProvider": { useAccessStore: () => null, useAccessStoreSnapshot: () => null },
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
  // W1 × W3 의 합류 지점 자체를 싣는다 — 원장이 "무엇을 들고 있는가"가 아니라 React 화면이
  // "무슨 답을 받는가"가 쟁점이기 때문이다. 원장은 위에서 만든 인스턴스를 그대로 준다.
  stubs["@/app/_lib/optimistic-unlock-ledger"] = ledger;
  stubs["@/app/_lib/love-code-entitlement"] = loadTs("app/_lib/love-code-entitlement.ts");
  const contentUnlock = loadTs("app/_lib/use-content-unlock.ts");
  const store = sandbox.CodeDestinyAccessStore;

  return {
    storage,
    serverHits,
    store, // W1
    verdict: sandbox.__cdPassVerdict, // W2
    ledger, // W3
    sessionCache, // W4
    /** React 화면이 실제로 받는 답(use-content-unlock.ts 의 W1 × W3 합류). */
    reactAnswer: (featureKey) => contentUnlock.resolveUnlockedMap(store.getSnapshot(), [featureKey])[featureKey] === true,
    advance: (ms) => { now += ms; },
  };
}

/**
 * /api/me/access-state 응답 정본 모양. authoritative(full+server)여야 회수까지 반영된다.
 * grants 는 Phase 4 D6 의 해금 근거(worker/lib/access-state.js buildUnlockGrants)다 — 넘기지
 * 않으면 근거 없는 옛 서버 응답이고, 그때는 아무 해금도 빠지지 않아야 한다(fail-open).
 */
function accessState({ unlocked, tier = "free", passExpiresAt = null, revoked = null, version = 1, grants = null }) {
  return {
    ok: true,
    userId: USER_ID,
    currentProfileId: PROFILE_ID,
    completeness: "full",
    authority: "server",
    version,
    unlockedFeatureIds: unlocked ? [FEATURE_KEY] : [],
    ...(grants ? { unlockedFeatureGrants: grants } : {}),
    ...(revoked ? { revokedFeatureIds: revoked } : {}),
    entitlementSnapshot: {
      tier,
      completeness: "full",
      authority: "server",
      activePasses: passExpiresAt ? [{ expiresAt: passExpiresAt }] : [],
      ...(grants ? { unlockedFeatureGrants: grants } : {}),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) W4 가 W1 의 강제 재검증을 삼켰다 — **Phase 4 커밋 3(D4)에서 수렴됨.**
//
// access-store 는 재검증을 `revalidate()`(내부 force)와 HTTP `cache:'no-store'` 로 표현한다.
// 그런데 user-session-cache 의 몽키패치가 뚫리는 조건은 오직 헤더 하나
// (user-session-cache.ts:89 CACHE_REFRESH_HEADER)인데, 예전 access-store 는 그 헤더를 싣지 않았다.
// 그래서 서버가 권한을 회수해도 React 는 accessState TTL 60초(user-session-cache.ts:256) 동안
// 옛 답을 그대로 받았고, 몽키패치를 안 태운 셸은 같은 access-store.js 로 그 자리에서 회수를 반영해
// **같은 코드가 런타임에 따라 다른 답**을 냈다.
//
// 🔴 단언은 지우지 않고 방향만 뒤집었다(Phase 4 커밋 3). access-store.js startFetch 가 force 일 때
// x-code-destiny-cache-refresh: 1 을 싣는 한 두 런타임의 답은 같다. 헤더를 다시 떼면 아래 두 줄이
// 곧바로 실패한다 — 수렴이 되돌아가는 것을 이 테스트가 다시 잡는다.
// ─────────────────────────────────────────────────────────────────────────────
test("서버가 권한을 회수하면 셸과 React 가 같은 순간에 잠근다 (W1 × W4)", async () => {
  async function runtime(installFetchCache) {
    let revoked = false;
    const runner = boot({
      installFetchCache,
      // 🔴 Phase 4 커밋 5(D2): 회수를 **집합에서 빼는 것만으로** 표현한다. 예전에는 여기서
      // revoked: [FEATURE_KEY] 를 함께 실어 줬지만 서버는 그 필드를 낸 적이 없다 —
      // revokedFeatureIds 는 워커 전체에 생산자가 0이고(전수 grep), 환불은 엔타이틀먼트를
      // status: REFUNDED 로 바꿔 조회(status: ACTIVE)에서 빠지게 할 뿐이다. 실제 서버가 내는
      // 모양으로 되돌렸으므로, 이제 아래 회수 단언들은 D2 의 권위 집합 치환을 요구한다.
      respond: () => (revoked
        ? accessState({ unlocked: false, version: 2 })
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

  // 🔴 수렴 단언(뒤집기 전: true / 1). 같은 사용자·같은 기능·같은 access-store.js·같은 revalidate()
  // 호출이면 런타임이 달라도 답이 같아야 한다. 헤더를 떼면 여기서 문다.
  assert.equal(react.rightAfterRevoke, false, "React 도 강제 재검증에서 회수를 즉시 반영해야 합니다 — 실패하면 startFetch 의 x-code-destiny-cache-refresh 가 빠진 것입니다");
  assert.equal(react.hitsAfterRevoke, 2, "React 의 두 번째 revalidate 도 서버에 닿아야 합니다(몽키패치 60초 캐시를 헤더로 뚫는다)");

  // 짝 단언: 지연은 유한해야 한다. TTL 이 늘거나 무효화가 빠지면 여기서 문다.
  assert.equal(shell.afterTtl, false, "TTL 이 지난 뒤에는 셸이 잠겨 있어야 합니다");
  assert.equal(react.afterTtl, false, "TTL 이 지나도 회수되지 않으면 유료 콘텐츠가 무기한 샙니다");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) 낙관 해금 회수가 두 저장소 중 하나만 지운다.
//
// access-store.rollbackOptimisticUpdate(access-store.js:1179)는 state.optimistic 을 통째로 비우지만
// 원장(cd_verified_unlock_grants_v1)은 모른다. 예전 React 의 useContentUnlock 은 두 곳을 **OR** 로
// 합쳤으므로, 셸이 잠근 기능이 React 에서는 열린 채로 남았다.
// (키 단위 회수 forgetOptimisticUnlock 은 양쪽을 지운다 — 아래 짝 단언으로 함께 고정한다.)
//
// 🔴 단언은 지우지 않고 방향만 뒤집었다(Phase 4 커밋 6, D3). 엇갈림을 대표하던 자리는 "원장에
// 엔트리가 남는가"였지만, D3 은 원장을 **지우지 않고** 입을 닫게 한다 — 쓰기 API 는 동결 파일이
// import 하므로 손대지 않는다. 그래서 같은 자리에서 이제 그 잔존이 실제로 낳던 답
// (use-content-unlock 의 합류)을 본다: 열림 → 잠김.
// ─────────────────────────────────────────────────────────────────────────────
test("낙관 전면 롤백 뒤 셸과 React 가 같은 답을 낸다 (W1 × W3)", () => {
  const runner = boot({ respond: () => accessState({ unlocked: false }) });
  runner.store.applyAccessStateSnapshot(accessState({ unlocked: false }), { profileId: PROFILE_ID });

  // 결제 직후 React 경로가 하는 일 그대로(use-content-unlock.ts:81-82): 원장과 store 에 함께 찍는다.
  runner.ledger.recordOptimisticUnlock(FEATURE_KEY);
  runner.store.markOptimisticallyUnlocked(FEATURE_KEY, PROFILE_ID, { source: "content-unlock-hook" });
  assert.equal(runner.store.isUnlocked(FEATURE_KEY), true);
  assert.equal(runner.ledger.hasLedgerUnlock(FEATURE_KEY), true);
  assert.equal(runner.reactAnswer(FEATURE_KEY), true, "결제 직후 낙관 창은 열려 있어야 합니다 — 원장을 좁히다 이 창까지 닫으면 산 사람이 잠깁니다");

  runner.store.rollbackOptimisticUpdate("payment-failed");

  assert.equal(runner.store.isUnlocked(FEATURE_KEY), false, "셸의 답");
  assert.equal(runner.ledger.hasLedgerUnlock(FEATURE_KEY), true, "원장 엔트리 자체는 남는다 — D3 은 쓰기 API 를 건드리지 않는다");

  // 🔴 수렴 단언(뒤집기 전: true). 원장이 남아 있어도 권위 스냅샷이 도착해 있으면 합류는 서버
  // 답만 따른다. use-content-unlock 의 게이트를 떼면 여기서 곧바로 문다.
  assert.equal(runner.reactAnswer(FEATURE_KEY), false, "셸이 잠근 기능이 React 에서 열려 있으면 결제 실패가 무료 열람이 됩니다");

  // 짝 단언: 키 단위 회수는 지금도 양쪽을 지운다. 이 경로까지 깨지면 402 회수가 통째로 무력해진다.
  runner.ledger.recordOptimisticUnlock(FEATURE_KEY);
  runner.store.markOptimisticallyUnlocked(FEATURE_KEY, PROFILE_ID, { source: "content-unlock-hook" });
  runner.ledger.forgetOptimisticUnlock(FEATURE_KEY);
  assert.equal(runner.ledger.hasLedgerUnlock(FEATURE_KEY), false, "월 한도 402 회수는 원장을 지워야 합니다");
  assert.equal(runner.store.isUnlocked(FEATURE_KEY), false, "월 한도 402 회수는 store 도 지워야 합니다");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2-b) degraded 200 은 원장의 입을 막지 않는다 (W1 × W3, D3 의 fail-open 짝).
//
// 결제 서버가 흔들리면 워커는 200 으로 답한다 — worker/routes/fortune.js:2556 buildDbFallbackBalance
// 는 userId 도 entitlementSnapshot 도 없이 unlocksAuthority: "none" 과 빈 목록을 싣는다.
// 그 봉투는 applyAccessStateSnapshot 에서 userId 가 없어 걸러지고 applyServerPayload 로 가는데
// (access-store.js:914-921), 거기서 status 를 **무조건** ready 로 올린다(:618).
// 그래서 D3 의 게이트가 status 만 봤다면 이 순간 원장이 잠긴다 — 방금 결제한 사람이 잠긴다는 뜻이다.
// 게이트가 completeness/authority 까지 보는 이유가 이것이고, 이 테스트가 그 이유를 문다.
// ─────────────────────────────────────────────────────────────────────────────
test("degraded 200 응답은 원장의 낙관 기여를 막지 않는다 (W1 × W3)", async () => {
  const runner = boot({
    respond: () => ({
      ok: true, authenticated: true, degraded: true, source: "auth_snapshot", code: "DB_FALLBACK",
      unlocksAuthority: "none", unlockedFeatures: [], unlockMap: {},
    }),
  });
  // 🔴 순서가 중요하다. access-store 의 LEGACY_LEDGER_KEY(:10)는 원장의 STORAGE_KEY 와 같은
  // cd_verified_unlock_grants_v1 이라, 캐시 미스 때 restoreCache 가 원장을 통째로
  // persistentUnlocks 로 올린다(:352-371). 먼저 찍으면 W1 이 답해 버려 W3 의 기여를 못 본다.
  // 그래서 응답이 먼저 닿고, 그 뒤 다른 탭(셸)에서 결제가 끝나 원장에 낙관이 찍힌 상황으로 둔다.
  await runner.store.ensureLoaded({ userId: USER_ID, profileId: PROFILE_ID, authenticated: true, force: true });
  runner.ledger.recordOptimisticUnlock(FEATURE_KEY);

  assert.equal(runner.store.getSnapshot().status, "ready", "degraded 봉투인데도 status 는 ready 다(access-store.js:618)");
  assert.equal(runner.store.isUnlocked(FEATURE_KEY), false, "store 는 이 해금을 아직 모른다");
  assert.equal(runner.reactAnswer(FEATURE_KEY), true, "권위 없는 200 을 근거로 원장을 잠그면 방금 결제한 사람이 잠깁니다");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3) 이용권이 끝난 사용자에게 한 화면이 세 가지 답을 갖는다.
//
// 이용권으로 열린 기능인지 단건 결제로 산 기능인지 구분하는 provenance 가 unlockedFeatureIds 에
// 없었다. 그래서 이용권 만료 후에도 access-store 의 해금 목록은 그대로 남는다.
// 반대편 두 판정은 만료를 각자 두 겹으로 안다: getEffectiveTier(access-store.js:968-971)가 만료일을
// 직접 보고, pass-verdict 는 만료 스냅샷을 readSnapshot 에서 폐기하며(pass-verdict.js:186) 설령
// 남더라도 stale 판정이 coversNow 를 막는다(:503). 실측 변이 결과 세 경로가 모두 독립으로 문다.
//
// 🔴 Phase 4 커밋 7(D6)에서 이 자리의 단언은 **방향이 갈라졌다.** 계획서는 "source:'PASS' 해금은
// 이용권이 끝나면 집합에서 빠진다"고 적었지만 실측은 반대다 — PASS 해금 생산자 4곳
// (worker/routes/billing.js:3671·3930·6714, worker/lib/access-control.js:79)은 expiresAt 을 주지
// 않는다. 이용권으로 **결제만 한** 영구 해금이라 이용권이 끝나도 남는 것이 옳다. 그래서:
//   · 근거에 만료가 없는 해금 → 이용권이 끝나도 열려 있다(아래 첫 단언, 뒤집지 않는다).
//   · 근거에 만료가 실린 해금 → 그 시각에 세 답이 함께 잠긴다(아래 둘째 시나리오, 새 단언).
// 만료를 지어내면 산 사람이 잠기고, 만료를 무시하면 캐시 창(GRACE_TTL_MS 24시간) 동안 끝난
// 해금이 계속 열린다. 두 단언이 그 두 방향을 각각 문다.
// ─────────────────────────────────────────────────────────────────────────────
test("이용권 만료 직후 isUnlocked·getEffectiveTier·pass-verdict 가 서로 다른 답을 낸다 (W1 × W2)", () => {
  const passExpiresAt = new Date(T0 + 2 * HOUR_MS).toISOString();
  // 이용권으로 결제한 영구 해금의 실제 모양 — source: PASS + passId 는 있고 expiresAt 은 없다.
  const payload = accessState({
    unlocked: true,
    tier: "standard",
    passExpiresAt,
    grants: [{
      featureKey: FEATURE_KEY,
      source: "PASS",
      grantType: "permanent_unlock",
      passId: "membership:standard:req-1",
      expiresAt: null,
      grantedAt: new Date(T0).toISOString(),
    }],
  });
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

  // 🔴 뒤집지 않는 단언(D6 이 근거로 못 박은 자리). 세 답이 갈리는 것이 여기서는 옳다 —
  // 이용권은 "지금 결제를 커버하는가"를 말하고, 해금은 "이미 산 것"을 말한다.
  assert.equal(after.unlocked, true, "이용권으로 산 영구 해금을 이용권 만료로 회수하면 산 콘텐츠가 사라집니다");
  assert.equal(after.tier, "free", "등급 판정은 만료를 안다");
  assert.equal(after.verdict.coversNow, false, "이용권 커버 판정은 만료를 안다");

  // 짝 단언: 만료를 '미보유 확정'으로 오독하면 안 된다. 확정 거부는 서버만 내릴 수 있다.
  assert.equal(after.verdict.cannotCover, false, "만료는 서버 재확인 대상이지 결제창 직행 근거가 아닙니다");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3-b) 만료가 실린 해금은 캐시 창 안에서도 제 시각에 잠긴다 (W1 × W2, D6 의 무는 쪽).
//
// ContentEntitlement 는 expiresAt 을 들 수 있고(worker/lib/content-unlocks.js:475·512), 조회는
// 아직 안 지난 것만 준다(activeExpiryClause :87-89). 그 만료가 payload 에서 지워지면
// 클라이언트는 캐시(GRACE_TTL_MS 24시간) 동안 끝난 해금을 계속 연다 — 서버는 이미 아는데
// 물어보기 전까지 모른다. D6 의 근거가 그 창을 닫는다.
//
// 🔴 새 단언이다(뒤집기 아님). 오늘 해금 생산자는 전부 expiresAt: null 을 주므로 이 경로는
// 지금 프로덕션 데이터에서는 비어 있다 — 그래서 **만료를 지어내는 구현**(예: 이용권 만료를
// 해금 만료로 읽기)과 **만료를 무시하는 구현**을 동시에 물도록 위 3)과 짝으로 둔다.
// ─────────────────────────────────────────────────────────────────────────────
test("만료가 실린 해금은 서버에 다시 묻지 않아도 그 시각에 잠긴다 (W1 × W2)", async () => {
  const unlockExpiresAt = new Date(T0 + 2 * HOUR_MS).toISOString();
  const runner = boot({
    respond: () => accessState({
      unlocked: true,
      grants: [{
        featureKey: FEATURE_KEY,
        source: "ADMIN",
        grantType: "timeboxed_unlock",
        passId: "",
        expiresAt: unlockExpiresAt,
        grantedAt: new Date(T0).toISOString(),
      }],
    }),
  });

  await runner.store.ensureLoaded({ userId: USER_ID, profileId: PROFILE_ID, authenticated: true, force: true });
  assert.equal(runner.store.isUnlocked(FEATURE_KEY), true, "만료 전에는 열려 있어야 합니다");
  assert.equal(runner.reactAnswer(FEATURE_KEY), true, "만료 전 React 도 같은 답이어야 합니다");

  runner.advance(3 * HOUR_MS); // 해금 만료 1시간 후 — 서버에는 다시 묻지 않는다

  assert.equal(runner.serverHits.length, 1, "이 구간에서 새 요청은 없어야 합니다 — 캐시만으로 판정합니다");
  assert.equal(runner.store.isUnlocked(FEATURE_KEY), false, "끝난 해금이 캐시 창 동안 열려 있으면 유료 콘텐츠가 샙니다");
  assert.equal(runner.reactAnswer(FEATURE_KEY), false, "같은 순간 React 가 다른 답을 내면 화면마다 권한이 갈립니다");

  // 짝 단언: 근거가 없는 응답(옛 서버·계정 배열 폴백)에서는 아무것도 빼지 않는다.
  const noGrants = boot({ respond: () => accessState({ unlocked: true }) });
  await noGrants.store.ensureLoaded({ userId: USER_ID, profileId: PROFILE_ID, authenticated: true, force: true });
  noGrants.advance(365 * 24 * HOUR_MS);
  assert.equal(noGrants.store.isUnlocked(FEATURE_KEY), true, "근거가 없다고 해금을 빼면 산 사람이 잠깁니다");
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
    "원장 엔트리 자체는 영구다 — confirmed 는 :42 에서 TTL 검사를 건너뛴다(D3 은 쓰기·저장을 안 바꾼다)",
  );

  // 🔴 수렴 단언(뒤집기 전: true). 1년 된 확정 엔트리가 React 의 답을 열어 주던 자리다.
  // D3 이후 원장은 **낙관 엔트리로만** 답에 기여하므로(readPendingOptimisticUnlockKeys),
  // 서버 스냅샷이 아직 없는 이 시점의 답은 잠김이다. 낙관 필터를 떼면 여기서 문다.
  assert.equal(
    muchLater.reactAnswer(FEATURE_KEY), false,
    "1년 전 원장 기록이 서버 확인 없이 콘텐츠를 열면 해금 수명이 writer 마다 갈립니다",
  );
});
