// PRIV-009: 로그아웃(clearClientAuthState)은 계정 프로필 카드 캐시(생년월일 포함)를 공용 기기에 남기지 않는다.
//  - 지운다: FORTUNE_APP_USER_PROFILES.* (계정 스코프·레거시 무스코프), code-destiny.activeProfile* (활성 카드 캐시).
//  - 남긴다: ::guest 스코프(계정 데이터가 아니고 서버 사본이 없다), 무관한 키.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");

function transpile(relativePath) {
  return ts.transpileModule(fs.readFileSync(path.join(root, relativePath), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: relativePath,
  }).outputText;
}

function createStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() { return map.size; },
    key: (i) => Array.from(map.keys())[i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
    keys: () => Array.from(map.keys()).sort(),
  };
}

function loadAuthClient(localStorage) {
  const sessionStorage = createStorage();
  const window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, location: { origin: "https://code-destiny.com" } };
  const sandbox = { window, localStorage, sessionStorage, document: { cookie: "" }, console, URL, Headers, setTimeout, clearTimeout };
  window.localStorage = localStorage;
  window.sessionStorage = sessionStorage;
  vm.createContext(sandbox);
  const stubs = {
    "./api-config": { getApiBaseUrl: () => "" },
    "./http-client": { fetchWithTimeout: async () => ({ ok: true, status: 200 }), toAbsoluteApiUrl: (p) => p },
    "./auth-storage": { persistSanitizedAuthUser: () => undefined },
    "@/js/core/pass-verdict.js": { KEY_PREFIX: "cd:pass-verdict:" },
    "@/js/core/app-context.js": {},
    "@/lib/i18n/ai-locale": { AI_LOCALE_HEADER: "x-ai-locale" },
    "@/lib/i18n/dictionary": { detectLocale: () => "ko" },
  };
  const loaded = { exports: {} };
  const factory = vm.runInContext(`(function (module, exports, require) {\n${transpile("app/_lib/auth-client.ts")}\n})`, sandbox, { filename: "auth-client.ts" });
  factory(loaded, loaded.exports, (request) => {
    const stub = stubs[request];
    assert.ok(stub, `대역이 없는 import 입니다: ${request}`);
    return { __esModule: true, default: stub, ...stub };
  });
  return loaded.exports;
}

test("clearClientAuthState 는 계정 프로필 캐시를 지우고 guest 스코프·무관 키는 남긴다", () => {
  const birth = JSON.stringify([{ profileId: "p1", birth: { year: 1990, month: 3, day: 15 } }]);
  const localStorage = createStorage({
    "fortune_auth_token": "t",
    "FORTUNE_APP_USER_PROFILES.list::user-1": birth,
    "FORTUNE_APP_USER_PROFILES.current::user-1": "p1",
    "FORTUNE_APP_USER_PROFILES.meta::user-1": "{}",
    "FORTUNE_APP_USER_PROFILES.list": birth,
    "FORTUNE_APP_USER_PROFILES.scope": "user-1",
    "code-destiny.activeProfileCache.v1::user-1": birth,
    "code-destiny.activeProfileId::user-1": "p1",
    "code-destiny.activeProfileCache.v1": birth,
    "FORTUNE_APP_USER_PROFILES.list::guest": "[]",
    "code-destiny.activeProfileId::guest": "",
    "cd:theme": "dark",
  });
  const { clearClientAuthState } = loadAuthClient(localStorage);
  clearClientAuthState();
  assert.deepEqual(localStorage.keys(), [
    "FORTUNE_APP_USER_PROFILES.list::guest",
    "cd:theme",
    "code-destiny.activeProfileId::guest",
  ]);
});

test("정적 셸 __cdClearClientAuthState 도 같은 프로필 캐시를 지운다", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const match = html.match(/function __cdClearClientAuthState\(\) \{[\s\S]*?\n\s*window\.__cdClearClientAuthState = __cdClearClientAuthState;/);
  assert.ok(match, "index.html 에서 __cdClearClientAuthState 를 찾지 못했습니다");
  const localStorage = createStorage({
    "fortune_auth_token": "t",
    "FORTUNE_APP_USER_PROFILES.list::user-1": "[1]",
    "FORTUNE_APP_USER_PROFILES.list": "[1]",
    "code-destiny.activeProfileCache.v1::user-1": "{}",
    "FORTUNE_APP_USER_PROFILES.list::guest": "[]",
    "cd:theme": "dark",
  });
  const window = {};
  const sandbox = { window, localStorage, sessionStorage: createStorage(), document: { cookie: "" }, __CD_AUTH_CACHE_VERIFIED_KEY: "cd-auth-verified" };
  vm.createContext(sandbox);
  vm.runInContext(match[0], sandbox);
  window.__cdClearClientAuthState();
  assert.deepEqual(localStorage.keys(), ["FORTUNE_APP_USER_PROFILES.list::guest", "cd:theme"]);
});
