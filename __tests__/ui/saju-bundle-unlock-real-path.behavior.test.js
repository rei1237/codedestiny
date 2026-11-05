// 사주 영구 묶음의 해금 판정을 원문 함수로 실행한다.
//
// 🔴 정규식이나 isTileKeyUnlocked 대역으로는 못 잡는 사고들이다.
//   C1: 시간 미상 프로필은 저장값 hour:null, 활성값 hour:12 라 같은 출생으로 못 알아봐서
//       결제해도 본문을 못 보고 결과 화면에서 살 수도 없었다.
// index.html 의 함수 원문, access-store.js, birth-scope-unlocks.js, bundle-offer.js, section-client.js 를
// 같은 샌드박스에서 돌린다. Swiss Ephemeris 나 엔진 계산은 불러오지 않는다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const shellSource = read("index.html");
const storeSource = read("js/core/access-store.js");
const birthScopeSource = read("js/core/birth-scope-unlocks.js");
const offerSource = read("js/core/saju/bundle-offer.js");
const sectionClientSource = read("js/core/saju/section-client.js");

const BUNDLE = "saju_lifetime_bundle";

function closingBrace(source, from) {
  const open = source.indexOf("{", from);
  assert.ok(open >= 0, `여는 중괄호를 못 찾았습니다: ${from}`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) { if (ch === "\n") lineComment = false; continue; }
    if (blockComment) { if (ch === "*" && next === "/") { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && next === "/") { lineComment = true; continue; }
    if (ch === "/" && next === "*") { blockComment = true; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") { depth -= 1; if (depth === 0) return i; }
  }
  throw new Error("중괄호 짝을 못 맞췄습니다");
}

function grabFunction(source, header) {
  const start = source.indexOf(header);
  assert.ok(start >= 0, `원문에서 못 찾았습니다. 이름이 바뀌었다면 이 테스트를 함께 고치세요: ${header}`);
  return source.slice(start, closingBrace(source, start + header.length - 1) + 1);
}

function grabObjectVar(name) {
  const start = shellSource.indexOf(`var ${name} = {`);
  assert.ok(start >= 0, `셸에서 못 찾았습니다: var ${name}`);
  return `${shellSource.slice(start, closingBrace(shellSource, start) + 1)};`;
}

const SHELL_FUNCTIONS = [
  "function _cdResolveCurrentProfileIdForAccess() {",
  "function _cdIsBirthScopedTileKey(rawKey) {",
  "function _cdIsLegacyAccountTileKey(key) {",
  "function _cdStripBirthScopedTileKeys(mapObj) {",
  "function _cdBirthScopeCurrentProfileId() {",
  "function _cdEnsureBirthUnlockScope() {",
  "function resolveTileLockAliasKeys(rawKey) {",
  "function markUnlockKey(unlockMap, rawKey) {",
  "function isSajuAccessFeatureKey(rawKey) {",
  "function isSajuSectionUnlockedForRender(rawKey) {",
  "function mergeAccessStoreUnlocksIntoLegacyMap() {",
  "function isTileKeyUnlocked(rawKey) {",
];

const SHELL_HARNESS = `
  var unlockedFeatureMap = Object.create(null);
  var _cdBirthUnlockScopeProfileId = '';
  ${grabObjectVar("_CD_BIRTH_SCOPED_TILE_ALIAS_KEYS")}
  ${grabObjectVar("TILE_LOCK_ALIAS_MAP")}
  ${grabObjectVar("SAJU_ACCESS_CONTENT_KEY_BY_FEATURE_KEY")}
  function hasAuthToken() { return true; }
  function isAdminUser() { return false; }
  function _cdMergeVerifiedUnlockGrants(map) { return map || Object.create(null); }
  function _cdHasVerifiedServerAccess() { return false; }
  function syncUnlockedFeatureMapGlobal() {}
  ${SHELL_FUNCTIONS.map((header) => grabFunction(shellSource, header)).join("\n")}
  window.cdBirthScopeCurrentProfileId = _cdBirthScopeCurrentProfileId;
  window.isTileKeyUnlocked = isTileKeyUnlocked;
  window.__shell = {
    resolve: _cdResolveCurrentProfileIdForAccess,
    isTileKeyUnlocked: isTileKeyUnlocked,
    markUnlockKey: markUnlockKey,
    map: function () { return unlockedFeatureMap; },
  };
`;

function fakeElement(tag) {
  return {
    tagName: tag,
    style: {},
    hidden: false,
    innerHTML: "",
    attrs: {},
    children: [],
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return this.attrs[name]; },
    removeAttribute(name) { delete this.attrs[name]; },
    addEventListener() {},
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    contains() { return false; },
  };
}

function boot({ stored, active, resultVisible = true }) {
  const listeners = new Map();
  const elements = new Map();
  const body = fakeElement("body");
  const head = fakeElement("head");
  const documentStub = {
    body,
    head,
    getElementById(id) {
      if (id === "resultPage") return resultVisible ? { id, style: { display: "block" } } : null;
      return elements.get(id) || null;
    },
    createElement: fakeElement,
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const requests = [];
  const sandbox = {
    console, Date, Promise, Object, Array, JSON, Math, String, Number, Boolean, Set, Error, isFinite,
    encodeURIComponent, URLSearchParams, AbortController,
    setTimeout: () => 1,
    clearTimeout: () => undefined,
    fetch: async () => ({ ok: false, status: 503, json: async () => ({ ok: false }) }),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(listener);
    },
    removeEventListener() {},
    dispatchEvent(event) {
      (listeners.get(event && event.type) || []).forEach((listener) => listener(event));
      return true;
    },
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
    document: documentStub,
    getComputedStyle: (el) => ({ display: el.style.display }),
    showToast() {},
    __cdCurrentDestinyProfile: stored,
    __cdActiveBirthProfile: active,
    __cdSajuSectionInput: { birth: { year: 1990, month: 3, day: 14 }, gender: "F", name: "테스트", place: {} },
    _cdNatalReadingStub() {},
    _cdAIPromptRequestJson(url, options) {
      requests.push({ url, body: JSON.parse(options.body) });
      return Promise.resolve({ ok: false, status: 402, payload: {} });
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(birthScopeSource, sandbox, { filename: "birth-scope-unlocks.js" });
  vm.runInNewContext(storeSource, sandbox, { filename: "access-store.js" });
  vm.runInNewContext(SHELL_HARNESS, sandbox, { filename: "index.html:shell-slice" });
  vm.runInNewContext(offerSource, sandbox, { filename: "bundle-offer.js" });
  vm.runInNewContext(sectionClientSource, sandbox, { filename: "section-client.js" });
  return { sandbox, shell: sandbox.__shell, requests, body, offer: sandbox.CdSajuBundleOffer };
}

function applyServerUnlocks(sandbox, profileId, unlockedFeatureIds) {
  const applied = sandbox.CodeDestinyAccessStore.applyAccessStateSnapshot({
    userId: "user-1",
    currentProfileId: profileId,
    completeness: "full",
    authority: "server",
    unlockedFeatureIds,
  }, { profileId });
  assert.equal(applied, true, "authoritative 스냅샷 적용에 실패했습니다");
}

const BASE = { year: 1990, month: 3, day: 14, calType: "solar" };
const storedProfile = (birth) => ({ id: "profile-1", profileId: "profile-1", gender: "F", birth: { ...BASE, ...birth } });
const activeProfile = (birth) => ({ name: "나", gender: "F", birth: { ...BASE, ...birth } });

const UNKNOWN_STORED = { hour: null, minute: null, timeUnknown: true };
const UNKNOWN_ACTIVE = { hour: 12, minute: 0, timeUnknown: true };

test("C1: 시간 미상 저장 프로필과 엔진의 정오 가정은 같은 출생이다", () => {
  const { shell } = boot({ stored: storedProfile(UNKNOWN_STORED), active: activeProfile(UNKNOWN_ACTIVE) });
  assert.equal(shell.resolve(), "profile-1");
});

test("C1: timeUnknown 표시가 없는 옛 저장 프로필(hour:null)도 시간 미상으로 본다", () => {
  const { shell } = boot({ stored: storedProfile({ hour: null, minute: null }), active: activeProfile(UNKNOWN_ACTIVE) });
  assert.equal(shell.resolve(), "profile-1");
});

test("C1: 시간을 아는데 분이 비어 있는 저장 프로필은 0분과 같다", () => {
  const { shell } = boot({
    stored: storedProfile({ hour: 14, minute: null, timeUnknown: false }),
    active: activeProfile({ hour: 14, minute: 0, timeUnknown: false }),
  });
  assert.equal(shell.resolve(), "profile-1");
});

test("C1: 시간 미상과 실제로 입력한 시각은 다른 출생이다(직접 입력 잠금 유지)", () => {
  for (const birth of [{ hour: 12, minute: 0, timeUnknown: false }, { hour: 9, minute: 30, timeUnknown: false }]) {
    const { shell } = boot({ stored: storedProfile(UNKNOWN_STORED), active: activeProfile(birth) });
    assert.equal(shell.resolve(), "", `시간 미상 저장 vs ${birth.hour}시 입력`);
  }
  const { shell } = boot({
    stored: storedProfile({ hour: 14, minute: 30, timeUnknown: false }),
    active: activeProfile(UNKNOWN_ACTIVE),
  });
  assert.equal(shell.resolve(), "", "14시 저장 vs 시간 미상 입력");
});

test("C1: 시간 미상끼리여도 날짜·분·성별이 다르면 다른 출생이다", () => {
  const otherDay = boot({ stored: storedProfile(UNKNOWN_STORED), active: { ...activeProfile(UNKNOWN_ACTIVE), birth: { ...BASE, ...UNKNOWN_ACTIVE, day: 15 } } });
  assert.equal(otherDay.shell.resolve(), "");
  const otherGender = boot({ stored: storedProfile(UNKNOWN_STORED), active: { ...activeProfile(UNKNOWN_ACTIVE), gender: "M" } });
  assert.equal(otherGender.shell.resolve(), "");
  const otherMinute = boot({
    stored: storedProfile({ hour: 14, minute: 10, timeUnknown: false }),
    active: activeProfile({ hour: 14, minute: 20, timeUnknown: false }),
  });
  assert.equal(otherMinute.shell.resolve(), "");
});

test("C1: 시간 미상 프로필은 구매 안내가 결제로 이어지고, 보유 후 본문을 그 프로필로 요청한다", async () => {
  const { sandbox, shell, requests, body, offer } = boot({ stored: storedProfile(UNKNOWN_STORED), active: activeProfile(UNKNOWN_ACTIVE) });

  // 구매 전: 프로필 저장 안내가 아니라 결제 버튼이 나온다.
  applyServerUnlocks(sandbox, "profile-1", []);
  assert.equal(offer.isOpen(), false, "구매 전에는 묶음이 닫혀 있어야 합니다");
  offer.open({ source: "inline" });
  const overlay = body.children.find((el) => el.id === "cdBundleOffer" || el.innerHTML.includes("cd-bundle-offer__panel"));
  assert.ok(overlay, "묶음 안내가 열리지 않았습니다");
  assert.match(overlay.innerHTML, /cd-bundle-offer__pay/, "결제 버튼이 나와야 합니다");
  assert.doesNotMatch(overlay.innerHTML, /data-cd-bundle-save-profile/, "저장 프로필이 있는데 프로필 저장을 다시 요구합니다");

  // 보유 후: 잠금이 열리고 본문 요청에 저장 프로필 id 가 실린다.
  applyServerUnlocks(sandbox, "profile-1", [BUNDLE]);
  assert.equal(shell.isTileKeyUnlocked(BUNDLE), true, "보유한 묶음이 열리지 않습니다");
  assert.equal(offer.isOpen(), true);
  sandbox.CdSajuSectionClient.loadNatalReading({});
  assert.equal(requests.length, 1, "본문 요청이 나가지 않았습니다");
  assert.equal(requests[0].body.featureKey, BUNDLE);
  assert.equal(requests[0].body.profileId, "profile-1");
});

test("C1: 다른 프로필의 묶음은 시간 미상 프로필에 붙지 않는다", () => {
  const { sandbox, shell } = boot({ stored: storedProfile(UNKNOWN_STORED), active: activeProfile(UNKNOWN_ACTIVE) });
  applyServerUnlocks(sandbox, "profile-2", [BUNDLE]);
  assert.equal(shell.isTileKeyUnlocked(BUNDLE), false);
});
