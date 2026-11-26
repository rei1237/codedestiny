// PRIV-016: 개발용 familyTest 부트스트랩과 API base 저장이 외부 입력으로 열리지 않게 한다.
//  - familyTest 는 http://localhost 개발 서버에서만 돈다. Capacitor 앱(WebView 가 https://localhost)에서는 꺼진다.
//  - familyTest 의 api 파라미터는 로컬 개발 호스트만 받는다.
//  - api-base-init 은 같은 출처·code-destiny.com(스테이징 포함)·로컬 개발 호스트만 API base 로 쓰고 저장한다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function createStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() { return map.size; },
    key: (i) => Array.from(map.keys())[i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

function runFamilyBootstrap(href, extraWindow = {}) {
  const html = read("index.html");
  const match = html.match(/function __cdBootstrapLocalFamilyProfile\(\) \{[\s\S]*?\n {10}\}\n/);
  assert.ok(match, "index.html 에서 __cdBootstrapLocalFamilyProfile 를 찾지 못했습니다");
  const url = new URL(href);
  const localStorage = createStorage();
  const window = { ...extraWindow };
  const sandbox = {
    window, localStorage, sessionStorage: createStorage(), document: { cookie: "", documentElement: { getAttribute: () => null } },
    location: { hostname: url.hostname, protocol: url.protocol, search: url.search, origin: url.origin },
    URL, URLSearchParams, btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    __cdClearLogoutInFlight() {}, __cdMarkVerifiedAuthUser() {},
  };
  vm.createContext(sandbox);
  vm.runInContext(`${match[0]}\n__cdBootstrapLocalFamilyProfile();`, sandbox);
  return localStorage;
}

test("familyTest: http://localhost 개발 서버에서는 동작한다(기존 개발 흐름 유지)", () => {
  const ls = runFamilyBootstrap("http://localhost:3000/ggulggul/?familyTest=family");
  assert.ok(ls.getItem("fortune_auth_token"));
  assert.equal(ls.getItem("fortune_api_base_url"), "http://localhost:4000");
});

test("familyTest: Capacitor 앱(https://localhost)에서는 아무것도 쓰지 않는다", () => {
  const withCapacitor = runFamilyBootstrap("http://localhost/?familyTest=family", { Capacitor: {} });
  assert.equal(withCapacitor.getItem("fortune_auth_token"), null);
  const httpsLocal = runFamilyBootstrap("https://localhost/?familyTest=family");
  assert.equal(httpsLocal.getItem("fortune_auth_token"), null);
  assert.equal(httpsLocal.getItem("fortune_api_base_url"), null);
});

test("familyTest: api 파라미터는 로컬 개발 호스트만 받는다", () => {
  const evil = runFamilyBootstrap("http://localhost:3000/?familyTest=family&api=https://evil.example");
  assert.equal(evil.getItem("fortune_api_base_url"), "http://localhost:4000");
  const local = runFamilyBootstrap("http://localhost:3000/?familyTest=family&api=http://127.0.0.1:8790");
  assert.equal(local.getItem("fortune_api_base_url"), "http://127.0.0.1:8790");
});

test("_cdBuildLocalFamilyTestPassAccess 도 같은 개발 전용 조건을 쓴다", () => {
  const html = read("index.html");
  const match = html.match(/function _cdBuildLocalFamilyTestPassAccess\([^)]*\) \{[\s\S]*?familyTest/);
  assert.ok(match);
  assert.match(match[0], /Capacitor/);
  assert.match(match[0], /protocol/);
});

function runApiBaseInit(origin, stored) {
  const url = new URL(origin);
  const localStorage = createStorage(stored ? { fortune_api_base_url: stored } : {});
  const window = {};
  const sandbox = {
    window, localStorage, URL,
    location: { hostname: url.hostname, origin: url.origin },
    document: { querySelector: () => null },
  };
  vm.createContext(sandbox);
  vm.runInContext(read("js/inline/api-base-init.js"), sandbox);
  return { base: window.CODE_DESTINY_API_BASE_URL, stored: localStorage.getItem("fortune_api_base_url") };
}

test("api-base-init: 허용 목록 밖 저장값은 버리고 같은 출처로 돌아간다", () => {
  assert.deepEqual(runApiBaseInit("https://code-destiny.com", "https://evil.example"), {
    base: "https://code-destiny.com",
    stored: "https://code-destiny.com",
  });
});

test("api-base-init: code-destiny.com·스테이징·로컬 개발 호스트 저장값은 유지한다", () => {
  assert.equal(runApiBaseInit("https://code-destiny.com", "https://staging.code-destiny.com").base, "https://staging.code-destiny.com");
  assert.equal(runApiBaseInit("https://staging.code-destiny.com", "https://code-destiny.com/").base, "https://code-destiny.com");
  assert.equal(runApiBaseInit("https://preview.example.pages.dev", "https://preview.example.pages.dev").base, "https://preview.example.pages.dev");
  assert.equal(runApiBaseInit("https://code-destiny.com", "http://localhost:4000").base, "http://localhost:4000");
  assert.equal(runApiBaseInit("https://code-destiny.com", "https://code-destiny.com.evil.example").base, "https://code-destiny.com");
});
