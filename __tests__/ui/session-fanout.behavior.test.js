// 세션 팬아웃 단일화 **실행** 검증 (2026-08-21).
//
// 🔴 왜 정적 단언으로는 부족한가: verify-entry-fanout.mjs 는 "합류 코드가 소스에 있다"까지만 안다.
// 조건 하나가 뒤집혀 늘 거짓이 되어도 문자열은 그대로 남는다. 실제로 이 레포에서 그런 일이 있었다
// (pass-wait-overlay.behavior.test.js 머리주석). 그래서 여기서는 셸의 세션 캐시 블록을 **원문 그대로
// 잘라 실행**하고, 동시 요청이 정말 한 발로 합쳐지는지·시계가 정말 공유되는지 본다.
//
// 🔴 mock 을 즉시 resolve 하면 안 된다. 지연이 0이면 첫 요청이 끝난 뒤에 두 번째가 시작돼
//    in-flight 합류 경로를 아예 밟지 않고, 그래도 "1회"가 나와 단언이 공허해진다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const shellSource = fs.readFileSync(path.join(root, "index.html"), "utf8");

const BLOCK_ID = 'id="cd-user-access-session-cache-v20260703"';

/** 셸의 세션 캐시 <script> 블록 본문을 원문 그대로 꺼낸다. */
function grabSessionCacheScript() {
  const idAt = shellSource.indexOf(BLOCK_ID);
  assert.ok(idAt >= 0, `세션 캐시 스크립트 블록을 찾지 못했다 (${BLOCK_ID})`);
  const open = shellSource.indexOf(">", idAt) + 1;
  const close = shellSource.indexOf("</script>", open);
  assert.ok(close > open, "세션 캐시 스크립트의 닫는 태그를 찾지 못했다.");
  return shellSource.slice(open, close);
}

/**
 * 최소 window 하네스에서 블록을 실행한다.
 * nativeFetch 는 지연 응답을 주는 mock 이고, 호출 횟수를 센다.
 */
function installSessionCache({ status = 200, body = '{"ok":true}' } = {}) {
  const calls = [];
  let resolveGate = null;
  const gate = new Promise((resolve) => { resolveGate = resolve; });

  // 🔴 fetchWithCache 는 전역 `location` 을 직접 읽는다(new URL(..., location.href) ·
  //    url.origin !== location.origin). 이게 없으면 첫 줄에서 throw 하고 nativeFetch 로
  //    빠져나가 캐시·in-flight 경로를 아예 밟지 않는다 — 그러고도 '통과'하는 공허한 테스트가 된다.
  const location = { origin: "https://code-destiny.com", href: "https://code-destiny.com/", hostname: "code-destiny.com", search: "" };
  const storage = () => ({
    _v: Object.create(null),
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._v, k) ? this._v[k] : null; },
    setItem(k, v) { this._v[k] = String(v); },
    removeItem(k) { delete this._v[k]; },
  });
  const localStorage = storage();
  const sessionStorage = storage();
  // /api/auth/me 는 클라이언트 인증 흔적이 없으면 네트워크 없이 합성 게스트 응답으로 끝난다.
  // 로그인 사용자를 재현해야 캐시·합류 경로가 살아난다.
  localStorage.setItem("fortune_auth_token", "test-token");

  const win = {
    location,
    localStorage,
    sessionStorage,
    dispatchEvent() { return true; },
    addEventListener() {},
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    Headers,
    Request,
    Response,
    URL,
    fetch(input, init) {
      calls.push({ input: String(input), init });
      // 지연이 있어야 두 번째 호출이 in-flight 를 실제로 만난다.
      return gate.then(() => new Response(body, { status, headers: { "content-type": "application/json" } }));
    },
  };
  win.window = win;

  const context = vm.createContext({
    window: win,
    document: { cookie: "" },
    location,
    localStorage,
    sessionStorage,
    Headers,
    Request,
    Response,
    URL,
    setTimeout,
    clearTimeout,
    Date,
    JSON,
    Promise,
    Object,
    Array,
    Number,
    String,
    Boolean,
    Math,
    console,
    Error,
  });

  // hasClientAuthHint() 는 js/core/auth-hint.js(window.__cdAuthHint)에 위임한다. 실브라우저에서는
  // <script> 태그가 이 인라인 블록보다 먼저 그 전역을 심어 두지만, 이 하네스는 셸을 vm 으로 발췌
  // 실행할 뿐이라 같은 컨텍스트에서 그 모듈도 함께 실행해 win.__cdAuthHint 로 이어 붙여야 한다
  // (안 그러면 로그인 흔적이 있어도 힌트가 항상 false 로 떨어져 합류 경로 자체를 못 밟는다).
  const authHintSource = fs.readFileSync(path.join(root, "js/core/auth-hint.js"), "utf8");
  vm.runInContext(authHintSource, context, { filename: "js/core/auth-hint.js" });
  win.__cdAuthHint = context.__cdAuthHint;

  vm.runInContext(grabSessionCacheScript(), context, { filename: "index.html#cd-user-access-session-cache" });
  assert.equal(win.__cdUserAccessSessionCacheInstalled, true, "세션 캐시 블록이 설치되지 않았다.");

  return { win, calls, release: () => resolveGate() };
}

const FORCE = { headers: { "x-code-destiny-cache-refresh": "1" } };

test("동시에 들어온 강제 새로고침 3발이 네트워크 요청 1발로 합쳐진다", async () => {
  const { win, calls, release } = installSessionCache();

  // 세 주인이 같은 순간 force 로 들어오는 상황. 예전에는 서로의 in-flight 를 지우고 각자 쐈다.
  const a = win.fetch("/api/auth/me", FORCE);
  const b = win.fetch("/api/auth/me", FORCE);
  const c = win.fetch("/api/auth/me", FORCE);

  release();
  const responses = await Promise.all([a, b, c]);

  assert.equal(calls.length, 1, `강제 요청 3발이 네트워크 ${calls.length}발이 됐다 — in-flight 합류가 죽었다.`);
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true }, "합류한 호출자가 본문을 못 읽는다 — clone 이 빠졌다.");
  }
});

test("강제 새로고침은 진행 중인 **비강제** 요청에는 합류하지 않는다", async () => {
  const { win, calls, release } = installSessionCache();

  // force 의 의미는 "캐시를 믿지 말고 서버에 다시 물어라" 다. 비강제 요청에 얹히면 그 의미가 깨진다.
  const plain = win.fetch("/api/auth/me", {});
  const forced = win.fetch("/api/auth/me", FORCE);

  release();
  await Promise.all([plain, forced]);

  assert.equal(calls.length, 2, "강제 요청이 비강제 in-flight 에 합류했다 — 신선한 답을 요구한 호출자가 옛 요청을 받는다.");
});

test("공유 세션 시계 — 한 주인이 확인하면 나머지 주인도 확인된 것으로 본다", () => {
  const { win } = installSessionCache();

  const headerProbe = { checkedAt: 0, pending: null };
  const coinGate = { checkedAt: 0, ok: false };
  const profileRuntime = { checkedAt: 0, signature: "" };
  for (const owner of [headerProbe, coinGate, profileRuntime]) win.__cdSessionSource.bind(owner);

  headerProbe.checkedAt = 1_700_000_000_000;
  assert.equal(coinGate.checkedAt, 1_700_000_000_000, "코인 게이트가 다른 시계를 본다 — 자기 쿨다운으로 또 물어본다.");
  assert.equal(profileRuntime.checkedAt, 1_700_000_000_000, "프로필 런타임이 다른 시계를 본다.");

  // auth 이벤트의 `checkedAt = 0` 리셋은 이제 세 주인 모두에게 한 번에 적용된다.
  coinGate.checkedAt = 0;
  assert.equal(headerProbe.checkedAt, 0);
  assert.equal(profileRuntime.checkedAt, 0);

  // 각 주인의 판정 필드는 공유되지 않는다 — 응답 해석은 원래 서로 다르고, 그게 옳다.
  coinGate.ok = true;
  assert.equal(headerProbe.ok, undefined, "판정 필드까지 공유되면 안 된다.");
});

test("시계를 묶어도 나머지 필드와 열거 가능성은 그대로다", () => {
  const { win } = installSessionCache();
  const owner = { checkedAt: 0, ok: false, verdict: "unknown", pending: null };
  win.__cdSessionSource.bind(owner);

  owner.checkedAt = 42;
  assert.deepEqual(
    Object.keys(owner).sort(),
    ["__cdClockBound", "checkedAt", "ok", "pending", "verdict"],
    "checkedAt 이 열거에서 빠지면 Object.assign/스프레드로 상태를 복사하는 코드가 조용히 값을 잃는다.",
  );
  assert.equal({ ...owner }.checkedAt, 42);

  // 두 번 묶어도 안전해야 한다(셸과 destiny-profile 이 각자 bind 를 부를 수 있다).
  win.__cdSessionSource.bind(owner);
  assert.equal(owner.checkedAt, 42);
});

test("invalidate 는 시계만 0 으로 되돌리고 사유를 남긴다", () => {
  const { win } = installSessionCache();
  const owner = { checkedAt: 0 };
  win.__cdSessionSource.bind(owner);

  owner.checkedAt = 999;
  win.__cdSessionSource.invalidate("auth-changed");
  assert.equal(owner.checkedAt, 0);
  assert.equal(win.__cdSessionClock.reason, "auth-changed");
  assert.equal(win.__cdSessionSource.peek(), 0);
});
