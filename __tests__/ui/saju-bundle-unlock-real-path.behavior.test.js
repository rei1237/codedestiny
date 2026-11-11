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
  "function resolveTileLockReadKeys(rawKey) {",
  "function _cdServerAccessFeatureMatches(expectedFeature, actualFeature) {",
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
  ${grabObjectVar("TILE_LOCK_BUNDLE_READ_KEYS")}
  ${grabObjectVar("SAJU_ACCESS_CONTENT_KEY_BY_FEATURE_KEY")}
  function _cdNormalizeServerAccessFeatureKey(raw) { return String(raw || '').trim(); }
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
    serverMatches: _cdServerAccessFeatureMatches,
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
  assert.equal(requests[0].body.featureKey, "saju_natal_reading");
  assert.deepEqual(requests[0].body.birth, { year: 1990, month: 3, day: 14 });
  // Server access snapshots carry the bundle and its owned section grants separately.
  applyServerUnlocks(sandbox, "profile-1", [BUNDLE, "section_summary", "section_daewun"]);
  assert.equal(shell.isTileKeyUnlocked("section_summary"), true, "Verified owned light reading remains accessible");
  assert.equal(shell.isTileKeyUnlocked("section_daewun"), true, "Verified owned daewun remains accessible");
  assert.equal(requests[0].body.profileId, "profile-1");
});

test("C1: 다른 프로필의 묶음은 시간 미상 프로필에 붙지 않는다", () => {
  const { sandbox, shell } = boot({ stored: storedProfile(UNKNOWN_STORED), active: activeProfile(UNKNOWN_ACTIVE) });
  applyServerUnlocks(sandbox, "profile-2", [BUNDLE]);
  assert.equal(shell.isTileKeyUnlocked(BUNDLE), false);
});

const CLOSED_KEYS = ["tetogen_deep_report", "rpt_lottoCard", "fun.quantumLotto.ritualReport"];

test("I1: 개별 키를 실제 markUnlockKey 로 표시해도 묶음이 되지 않는다", () => {
  for (const key of CLOSED_KEYS) {
    // authoritative 스냅샷 전: 서버 답을 받기 전이라 메모리 표시만으로 판정하는 구간이다.
    const { shell, offer } = boot({ stored: storedProfile({ hour: 9, minute: 0 }), active: activeProfile({ hour: 9, minute: 0 }) });
    shell.markUnlockKey(shell.map(), key);
    assert.equal(shell.map()[key], true, key);
    assert.notEqual(shell.map()[BUNDLE], true, key + " 표시가 묶음까지 켰습니다");
    assert.equal(shell.isTileKeyUnlocked(key), true, key + " 는 자기 권리로 열려야 합니다");
    assert.equal(shell.isTileKeyUnlocked(BUNDLE), false, key + " 로 묶음이 열렸습니다");
    assert.equal(offer.isOpen(), false, key + " 구매자에게 묶음 안내가 사라집니다");
  }
});

test("I1: 묶음 보유자에게는 세 키가 읽기로 열리지만 기록은 묶음 키뿐이다", () => {
  const { sandbox, shell } = boot({ stored: storedProfile({ hour: 9, minute: 0 }), active: activeProfile({ hour: 9, minute: 0 }) });
  applyServerUnlocks(sandbox, "profile-1", [BUNDLE]);
  for (const key of CLOSED_KEYS) {
    assert.equal(shell.isTileKeyUnlocked(key), true, key);
    assert.notEqual(shell.map()[key], true, key + " 가 맵에 기록됐습니다");
  }
});

test("I1: 묶음 영수증은 판매 종료 키의 증거이지만 그 반대는 아니다", () => {
  const { shell } = boot({ stored: storedProfile({ hour: 9, minute: 0 }), active: activeProfile({ hour: 9, minute: 0 }) });
  for (const key of CLOSED_KEYS) {
    assert.equal(shell.serverMatches(key, BUNDLE), true, key);
    assert.equal(shell.serverMatches(BUNDLE, key), false, key);
  }
});

// ── I2: 테토·에겐 상세 게이트. 렌더 함수 원문을 jsdom 에서 돌린다. ──
const { JSDOM } = require("jsdom");

function tetogenGate({ unlockedKeys = [] } = {}) {
  const source = read("js/entertain-engine.js");
  const dom = new JSDOM('<!doctype html><body><div id="root"><div data-tetogen-deep-shell><button data-tetogen-unlock="1"></button><small data-tetogen-status></small></div></div></body>', { runScripts: "outside-only", url: "https://code-destiny.com/" });
  const w = dom.window;
  const unlocked = new Set(unlockedKeys);
  const finalized = [];
  const opened = [];
  w.isTileKeyUnlocked = (key) => unlocked.has(key);
  w._cdFinalizeUnlockState = (key) => finalized.push(key);
  w.CdSajuBundleOffer = { isOpen: () => unlocked.has(BUNDLE), open: (o) => opened.push(o.source) };
  const slices = [
    "function isTetogenDeepReportUnlocked() {",
    "function markTetogenDeepReportUnlocked(payload) {",
    "function onTetogenUnlocksChanged() {",
    "function bindTetogenDeepReportGate(root, vibe, p, power, hapData) {",
  ].map((header) => grabFunction(source, header)).join("\n");
  w.eval(`
    var w = window;
    var TETOGEN_DEEP_REPORT_FEATURE_KEY = 'tetogen_deep_report';
    var _tetogenPendingReveal = null;
    var _tetogenUnlockListenerBound = false;
    function buildTetogenDeepReportBody() { return '<div data-tetogen-premium-report></div>'; }
    function _scheduleReveal() {}
    function _entertainText(key) { return key; }
    ${slices.replace("import('./core/oracle/crafted-details.mjs')", "Promise.resolve({ mountOracleCraftedDetails: function () {} })")}
    window.__bind = function () { bindTetogenDeepReportGate(document.getElementById('root'), {}, {}, {}, {}); };
  `);
  return {
    w,
    unlocked,
    finalized,
    opened,
    flag: () => w.localStorage.getItem("cd_tetogen_deep_report_unlocked"),
    isOpenInShell: () => w.document.querySelector("[data-tetogen-deep-shell]").classList.contains("is-unlocked"),
    bind: () => w.__bind(),
    emit: (type) => w.dispatchEvent(new w.Event(type)),
  };
}

test("I2: 묶음으로 연 열람은 기기 플래그와 계정 키 기록을 남기지 않는다", () => {
  const gate = tetogenGate({ unlockedKeys: [BUNDLE] });
  gate.bind();
  assert.equal(gate.isOpenInShell(), true);
  assert.equal(gate.flag(), null);
  assert.deepEqual(gate.finalized, []);
});

test("I2: 자기 키로 연 사람은 전과 같이 기록된다", () => {
  const gate = tetogenGate({ unlockedKeys: ["tetogen_deep_report"] });
  gate.bind();
  assert.equal(gate.isOpenInShell(), true);
  assert.equal(gate.flag(), "1");
  assert.deepEqual(gate.finalized, ["tetogen_deep_report"]);
});

test("I2: 해금 이벤트 두 종류 모두 새로고침 없이 열고 다시 그려도 리스너가 쌓이지 않는다", () => {
  for (const type of ["cd:unlocks-changed", "cd:tile-locks-updated"]) {
    const gate = tetogenGate();
    const added = [];
    const original = gate.w.addEventListener.bind(gate.w);
    gate.w.addEventListener = (name, listener) => { added.push(name); original(name, listener); };
    gate.bind();
    gate.bind();
    gate.bind();
    assert.deepEqual(added.filter((name) => name.startsWith("cd:")).sort(), ["cd:tile-locks-updated", "cd:unlocks-changed"], "셸을 그릴 때마다 리스너가 늘어납니다");
    assert.equal(gate.isOpenInShell(), false);
    gate.unlocked.add(BUNDLE);
    gate.emit(type);
    assert.equal(gate.isOpenInShell(), true, type);
    assert.equal(gate.flag(), null, "묶음으로 열렸으니 기록하지 않습니다");
  }
});

// ── I3: 예전 회당 로또 구매자의 저장 리포트. 원문 함수를 jsdom 에서 돌린다. ──
function lottoSurface({ lottoOpen = false, resolved = "profile-1", currentProfileId = "profile-1", reports = [] } = {}) {
  const source = read("js/saju-engine-tarot-sukuyo-quantum.js");
  const dom = new JSDOM('<!doctype html><body><div id="sajuBundleOffer"><section data-cd-bundle-inline="1"></section></div></body>', { runScripts: "outside-only", url: "https://code-destiny.com/" });
  const w = dom.window;
  const slices = [
    "function lottoUserId(){",
    "function lottoProfileId(){",
    "function lottoSavedReportsKey(){",
    "function lottoLoadSavedReports(){",
    "function lottoFindSavedReport(weekKey){",
    "function lottoViewableSavedReports(){",
    "function renderLottoRitualReport(state){",
  ].map((header) => grabFunction(source, header)).join("\n");
  const start = source.indexOf("window.cdRenderLottoSavedReports=function(){");
  assert.ok(start >= 0, "저장 리포트 렌더러를 못 찾았습니다");
  const savedRenderer = source.slice(start, closingBrace(source, start) + 2);
  w.__state = { lottoOpen };
  w.CdSajuBundleOffer = { isLottoOpen: () => w.__state.lottoOpen };
  w.DestinyProfileManager = { storage: { current: () => (currentProfileId ? { id: currentProfileId } : null) } };
  w.__resolved = resolved;
  w.eval(`
    function lottoEsc(v) { return String(v == null ? '' : v); }
    function lottoReadAuthUser() { return { id: 'user-1' }; }
    function lottoWeekKey() { return '2026-W45'; }
    function lottoElementText(v) { return String(v || ''); }
    function buildLottoRitualReport() { throw new Error('저장 리포트를 다시 계산하면 안 됩니다'); }
    function _sajuQuantumText(key) { return key; }
    function _cdResolveCurrentProfileIdForAccess() { return window.__resolved; }
    ${slices}
    ${savedRenderer}
    window.__lottoKey = lottoSavedReportsKey;
  `);
  w.localStorage.setItem(w.__lottoKey(), JSON.stringify(reports));
  return { w, render: () => w.cdRenderLottoSavedReports(), box: () => w.document.querySelector("[data-cd-lotto-saved]") };
}

const SAVED_REPORT = {
  id: "lotto-ritual-1",
  weekKey: "2026-W40",
  unlockState: true,
  freeGames: [],
  report: {
    title: "저장해 둔 달빛 리포트",
    moneyCondition: { title: "t", body: "b", points: ["p"] },
    ritualCard: { luckyColor: "c", cleanup: "c", avoid: "a", limit: "l", action: "a" },
    numberInsights: [{ number: 7, element: "수", meaning: "m", action: "a" }],
    reflectionQuestions: ["q"],
    shareCard: { title: "s", luckyElement: "수", luckyNumbers: [7] },
  },
};

test("I3: 잠겨 있어도 그 사용자·프로필의 저장 리포트를 다시 열 수 있다", () => {
  const surface = lottoSurface({ reports: [SAVED_REPORT] });
  assert.equal(surface.render(), true);
  surface.box().querySelector("[data-cd-lotto-saved-open]").click();
  const area = surface.w.document.getElementById("lottoRitualReportArea");
  assert.equal(area.hidden, false);
  assert.match(area.innerHTML, /저장해 둔 달빛 리포트/);
  // 해금 이벤트로 다시 그려도 읽던 리포트가 접히지 않는다.
  surface.render();
  assert.match(surface.w.document.getElementById("lottoRitualReportArea").innerHTML, /저장해 둔 달빛 리포트/);
});

test("I3: 저장 리포트가 없거나, 직접 입력 중이거나, 로또가 열려 있으면 나오지 않는다", () => {
  assert.equal(lottoSurface({ reports: [] }).render(), false);
  assert.equal(lottoSurface({ reports: [{ ...SAVED_REPORT, unlockState: false }] }).render(), false, "구매 표시 없는 기록");
  assert.equal(lottoSurface({ reports: [SAVED_REPORT], resolved: "" }).render(), false, "직접 입력");
  const opened = lottoSurface({ reports: [SAVED_REPORT], lottoOpen: true });
  assert.equal(opened.render(), false, "열린 로또는 카드 본체가 보여 줍니다");
  assert.equal(opened.box(), null);
});

test("I3: 다른 프로필의 저장 리포트는 보이지 않는다", () => {
  const surface = lottoSurface({ reports: [SAVED_REPORT] });
  surface.w.__resolved = "profile-2";
  assert.equal(surface.render(), false);
});
