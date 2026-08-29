/**
 * 앱 전용 /api/* 리타게팅 — scripts/app-native-bridge.js 의 installAppApiRetarget.
 *
 * 왜 소스 문자열 검사가 아니라 실행 검사인가:
 *   이 래퍼가 틀리면 앱의 인증·이용권·결제 확인이 통째로 죽는데, 그 증상은 실기기에서만 보인다.
 *   grep 으로는 "헤더를 붙였다"까지만 알 수 있고 "어떤 요청에 붙였나"를 못 본다.
 *
 * 브릿지 전체는 Capacitor·document 의존이 많아 통째로 못 돌린다. 그래서 IIFE 한 블록만
 * 중괄호 수로 잘라 vm 컨텍스트에서 돌린다. 🔴 잘라내기가 실패하면 통과가 아니라 실패다
 * (fail-closed) — 블록 이름이 바뀌면 이 테스트가 즉시 알려준다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "scripts/app-native-bridge.js"), "utf8");

function extractRetargetIife() {
  const start = source.indexOf("(function installAppApiRetarget() {");
  assert.notEqual(start, -1, "installAppApiRetarget IIFE 를 찾지 못했다 — 블록 이름이 바뀌었나?");
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, source.indexOf(";", i) + 1);
    }
  }
  throw new Error("installAppApiRetarget IIFE 의 닫는 괄호를 찾지 못했다");
}

const RETARGET_SOURCE = extractRetargetIife();
const APP_ORIGIN = "https://localhost";
const API_ORIGIN = "https://code-destiny.com";

/** 앱 웹뷰를 흉내 낸 컨텍스트에서 리타게팅을 설치하고, 실제 나간 인자를 기록한다. */
function installInFakeApp({ apiBase = API_ORIGIN, origin = APP_ORIGIN } = {}) {
  const calls = [];
  const win = {
    CODE_DESTINY_API_BASE_URL: apiBase,
    location: { origin, href: `${origin}/index.html` },
    fetch(input, init) {
      calls.push({ input, init });
      return Promise.resolve({ ok: true });
    },
  };
  const context = vm.createContext({ window: win, Headers, Request, URL, console });
  vm.runInContext(RETARGET_SOURCE, context);
  return { win, calls };
}

/** init.headers 는 Headers 인스턴스로 넘어간다 — 비교하기 쉬운 평범한 객체로 편다. */
function headerMap(init) {
  const out = {};
  if (init && init.headers) new Headers(init.headers).forEach((value, key) => { out[key] = value; });
  return out;
}

test("상대 /api/* 는 앱 API 출처로 옮겨지고 런타임 헤더·자격증명이 붙는다", async () => {
  const { win, calls } = installInFakeApp();
  await win.fetch("/api/version");

  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, `${API_ORIGIN}/api/version`);
  assert.equal(headerMap(calls[0].init)["x-code-destiny-runtime"], "mobile-app");
  assert.equal(calls[0].init.credentials, "include");
});

test("쿼리스트링과 호출자 헤더·옵션을 보존한다", async () => {
  const { win, calls } = installInFakeApp();
  await win.fetch("/api/billing/balance?scope=pass", {
    method: "POST",
    body: "{}",
    headers: { "Content-Type": "application/json" },
  });

  assert.equal(calls[0].input, `${API_ORIGIN}/api/billing/balance?scope=pass`);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.body, "{}");
  const headers = headerMap(calls[0].init);
  assert.equal(headers["content-type"], "application/json");
  assert.equal(headers["x-code-destiny-runtime"], "mobile-app");
});

test("호출자가 정한 런타임 헤더·credentials 는 덮어쓰지 않는다", async () => {
  const { win, calls } = installInFakeApp();
  await win.fetch("/api/profile", {
    credentials: "omit",
    headers: { "X-Code-Destiny-Runtime": "diagnostic" },
  });

  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(headerMap(calls[0].init)["x-code-destiny-runtime"], "diagnostic");
});

test("이미 절대 URL 인 API 호출은 손대지 않는다 — 셸 인라인 런타임과 이중 적용되지 않는다", async () => {
  const { win, calls } = installInFakeApp();
  await win.fetch(`${API_ORIGIN}/api/auth/me`);

  assert.equal(calls[0].input, `${API_ORIGIN}/api/auth/me`);
  assert.equal(calls[0].init, undefined);
});

test("/api/ 밖의 동일출처 요청과 외부 자산은 그대로 나간다", async () => {
  const { win, calls } = installInFakeApp();
  await win.fetch("/js/app-payment-guard.js");
  await win.fetch("https://assets.code-destiny.com/music/intro.mp3");

  assert.deepEqual(calls.map((c) => c.input), [
    "/js/app-payment-guard.js",
    "https://assets.code-destiny.com/music/intro.mp3",
  ]);
});

test("Request 객체는 본문 스트림 때문에 옮기지 않고 원본 그대로 통과시킨다", async () => {
  const { win, calls } = installInFakeApp();
  const request = new Request(`${APP_ORIGIN}/api/version`);
  await win.fetch(request);

  assert.equal(calls[0].input, request);
});

test("API 베이스가 앱 출처와 같거나 비어 있으면 아무것도 바꾸지 않는다", async () => {
  const same = installInFakeApp({ apiBase: APP_ORIGIN });
  await same.win.fetch("/api/version");
  assert.equal(same.calls[0].input, "/api/version");

  const empty = installInFakeApp({ apiBase: "" });
  await empty.win.fetch("/api/version");
  assert.equal(empty.calls[0].input, "/api/version");
});

test("두 번 설치해도 래퍼는 하나뿐이다", async () => {
  const { win, calls } = installInFakeApp();
  const first = win.fetch;
  const context = vm.createContext({ window: win, Headers, Request, URL, console });
  vm.runInContext(RETARGET_SOURCE, context);

  assert.equal(win.fetch, first);
  await win.fetch("/api/version");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, `${API_ORIGIN}/api/version`);
});

test("리타게팅은 브릿지가 API 베이스를 읽는 다른 코드보다 먼저 설치된다", () => {
  // 부팅 인증 호출이 파싱 중에 나가므로 설치가 늦으면 그 요청만 죽은 출처로 샌다.
  const install = source.indexOf("(function installAppApiRetarget() {");
  const firstAwaitedFetch = source.indexOf("await fetch(apiBase() + path");
  assert.ok(install > 0 && firstAwaitedFetch > install, "리타게팅 설치가 브릿지의 API 호출보다 뒤에 있다");
});
