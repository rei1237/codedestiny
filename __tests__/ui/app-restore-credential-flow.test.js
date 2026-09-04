/**
 * Zero-Tap Sign-In 호출부 — scripts/app-native-bridge.js 의 §3-b.
 *
 * 왜 소스 문자열 검사가 아니라 실행 검사인가:
 *   이 흐름이 틀리면 (a) 로그아웃했는데 다음 실행에 다시 로그인되거나 (b) 자격증명이 영영
 *   등록되지 않는데, 둘 다 실기기에서만 보이고 화면에는 아무 오류도 나지 않는다.
 *   grep 으로는 "clear 를 부른다"까지만 알 수 있고 "언제 부르는가"를 못 본다.
 *
 * 브릿지 전체는 Capacitor·document 의존이 많아 통째로 못 돌린다. 그래서 §3-b 구간만 잘라
 * vm 컨텍스트에서 돌리고 의존(nativeApi·postJson·storeAuthSession·trace)을 가짜로 넣는다.
 * 🔴 잘라내기가 실패하면 통과가 아니라 실패다(fail-closed) — 구간 주석이 바뀌면 즉시 알려준다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "scripts/app-native-bridge.js"), "utf8");

function extractRestoreSection() {
  const start = source.indexOf("  // --- 3-b) Zero-Tap Sign-In");
  assert.notEqual(start, -1, "§3-b 구간 시작 주석을 찾지 못했다 — 구간 이름이 바뀌었나?");
  const end = source.indexOf("  // --- 4) 안드로이드 하드웨어 백버튼", start);
  assert.notEqual(end, -1, "§3-b 구간의 끝(§4 주석)을 찾지 못했다");
  return source.slice(start, end);
}

const SECTION_SOURCE = extractRestoreSection();

function fakeLocalStorage(initial) {
  const store = new Map(Object.entries(initial || {}));
  return {
    store,
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
  };
}

/**
 * §3-b 를 가짜 앱 컨텍스트에서 설치한다.
 * plugin 이 null 이면 자격증명 플러그인이 없는 기기(웹·셸·구형)를 뜻한다.
 */
function installSection({ storage = {}, available = true, plugin = {}, responses = {} } = {}) {
  const localStorage = fakeLocalStorage(storage);
  const posts = [];
  const listeners = [];
  const sessions = [];
  const calls = [];

  const credentials = {
    async isAvailable() { calls.push("isAvailable"); return { ok: true, available }; },
    async create(input) { calls.push("create"); return plugin.create ? plugin.create(input) : { ok: false, code: "NATIVE_CREDENTIALS_UNAVAILABLE" }; },
    async restore(input) { calls.push("restore"); return plugin.restore ? plugin.restore(input) : { ok: false, code: "NoCredentialException" }; },
    async clear() { calls.push("clear"); return { ok: true }; },
  };

  const win = {
    localStorage,
    addEventListener: (type, handler) => { listeners.push({ type, handler }); },
  };

  const context = vm.createContext({
    window: win,
    console,
    nativeApi: { credentials },
    trace: () => {},
    storeAuthSession: (payload, src) => { sessions.push({ payload, source: src }); },
    async postJson(pathname, body) {
      posts.push({ path: pathname, body });
      const response = responses[pathname];
      if (typeof response === "function") return response(body);
      return response || { ok: false, status: 500, payload: {} };
    },
  });
  vm.runInContext(SECTION_SOURCE, context);

  const run = (expr) => vm.runInContext(expr, context);
  return { context, run, posts, listeners, sessions, calls, localStorage };
}

const CHALLENGE = "/api/auth/restore-credential/challenge";
const REGISTER = "/api/auth/restore-credential/register";
const ASSERT = "/api/auth/restore-credential/assert";
const MARKER = "cd:restore-credential-registered";

const okChallenge = { ok: true, status: 200, payload: { ok: true, requestJson: "{\"challenge\":\"Q0hBTA\"}" } };

test("A) 로그인 상태로 부팅하면 자격증명을 만들어 등록하고 표식을 세운다", async () => {
  const app = installSection({
    storage: { fortune_auth_token: "access-token" },
    plugin: { create: () => ({ ok: true, responseJson: "{\"id\":\"cred\"}", cloudBackup: true }) },
    responses: {
      [CHALLENGE]: okChallenge,
      [REGISTER]: { ok: true, status: 200, payload: { ok: true, credentialId: "cred" } },
    },
  });

  assert.equal(await app.run("runRestoreCredentialFlow()"), false);
  assert.deepEqual(app.posts.map((p) => p.path), [CHALLENGE, REGISTER]);
  assert.equal(app.posts[0].body.purpose, "create");
  assert.equal(app.posts[1].body.cloudBackup, true);
  assert.equal(app.localStorage.getItem(MARKER), "1");
  // 등록 경로는 세션을 건드리지 않는다 — 이미 로그인 상태다.
  assert.equal(app.sessions.length, 0);
});

test("A) 이미 등록한 기기는 challenge 조차 요청하지 않는다", async () => {
  const app = installSection({
    storage: { fortune_auth_token: "access-token", [MARKER]: "1" },
    responses: { [CHALLENGE]: okChallenge },
  });

  await app.run("runRestoreCredentialFlow()");
  assert.deepEqual(app.posts, []);
});

test("자격증명을 지원하지 않는 기기에서는 네트워크가 한 번도 나가지 않는다", async () => {
  const app = installSection({ available: false, responses: { [CHALLENGE]: okChallenge } });

  assert.equal(await app.run("runRestoreCredentialFlow()"), false);
  assert.deepEqual(app.posts, []);
  assert.deepEqual(app.calls, ["isAvailable"]);
});

test("B) 토큰이 하나도 없는 콜드 스타트는 자격증명으로 세션을 되살린다", async () => {
  const app = installSection({
    plugin: { restore: () => ({ ok: true, responseJson: "{\"id\":\"cred\"}" }) },
    responses: {
      [CHALLENGE]: okChallenge,
      [ASSERT]: { ok: true, status: 200, payload: { ok: true, accessToken: "restored-access", refreshToken: "restored-refresh", user: { id: "u1" } } },
    },
  });

  assert.equal(await app.run("runRestoreCredentialFlow()"), true);
  assert.deepEqual(app.posts.map((p) => p.path), [CHALLENGE, ASSERT]);
  assert.equal(app.posts[0].body.purpose, "assert");
  assert.equal(app.sessions.length, 1);
  assert.equal(app.sessions[0].payload.accessToken, "restored-access");
  assert.equal(app.sessions[0].source, "restore-credential");
  assert.equal(app.localStorage.getItem(MARKER), "1");
});

test("B) 자격증명이 없는 기기(NoCredentialException)는 조용히 끝난다", async () => {
  const app = installSection({ responses: { [CHALLENGE]: okChallenge, [ASSERT]: okChallenge } });

  assert.equal(await app.run("runRestoreCredentialFlow()"), false);
  assert.deepEqual(app.posts.map((p) => p.path), [CHALLENGE]);
  assert.equal(app.sessions.length, 0);
});

test("B) 서버가 assert 를 거부하면 세션을 저장하지 않는다", async () => {
  const app = installSection({
    plugin: { restore: () => ({ ok: true, responseJson: "{\"id\":\"cred\"}" }) },
    responses: {
      [CHALLENGE]: okChallenge,
      [ASSERT]: { ok: false, status: 401, payload: { ok: false, code: "RESTORE_FAILED" } },
    },
  });

  assert.equal(await app.run("runRestoreCredentialFlow()"), false);
  assert.equal(app.sessions.length, 0);
  assert.equal(app.localStorage.getItem(MARKER), null);
});

test("리프레시 토큰만 남은 세션은 복원 대상이 아니다 — 평소 갱신 경로가 산다", async () => {
  const app = installSection({
    storage: { fortune_auth_refresh_token: "refresh-token" },
    plugin: { restore: () => ({ ok: true, responseJson: "{}" }) },
    responses: { [CHALLENGE]: okChallenge },
  });

  assert.equal(await app.run("runRestoreCredentialFlow()"), false);
  assert.deepEqual(app.posts, []);
});

test("C) 로그아웃하면 자격증명과 표식을 지우고, 다른 인증 이벤트에는 반응하지 않는다", async () => {
  const app = installSection({ storage: { [MARKER]: "1" } });
  app.run("installLogoutCredentialClear()");

  const entry = app.listeners.find((l) => l.type === "cd:auth-changed");
  assert.ok(entry, "cd:auth-changed 리스너가 등록되지 않았다");

  entry.handler({ detail: { source: "membership-cache", event: "subscription" } });
  entry.handler({ detail: { source: "mobile-app-oauth", event: "login" } });
  assert.deepEqual(app.calls, []);
  assert.equal(app.localStorage.getItem(MARKER), "1");

  entry.handler({ detail: { source: "auth-client", event: "logout" } });
  assert.deepEqual(app.calls, ["clear"]);
  // 표식이 남으면 다음 부팅에서 재등록을 건너뛰어, 로그인해도 자격증명이 다시 만들어지지 않는다.
  assert.equal(app.localStorage.getItem(MARKER), null);
});
