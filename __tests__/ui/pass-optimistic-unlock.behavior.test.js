// 이용권 낙관 해금이 authoritative 병합을 견디는지 **실행**으로 확인한다 (2026-09-03 실사고 재현).
//
// 사고: 사주 분석 화면에서 이용권 보유자가 유료 섹션을 열면
// "이용권 접근 권한 저장을 확인하지 못했습니다" 가 뜨고, 그 뒤 단건도 월정석도 고를 수 없었다.
// 근본 원인은 문구도 게이트도 아니라 **저장 판정**이다:
//   _cdFinalizeUnlockState 가 unlockedFeatureMap 에 키를 찍어도, 바로 다음 isTileKeyUnlocked 가
//   첫 줄에서 mergeAccessStoreUnlocksIntoLegacyMap 을 부르고, authoritative(ready+full+server)
//   스냅샷이면 **맵 전체를 지운 뒤** access store 가 아는 것만 되살린다. 확정 결제는
//   _cdApplyVerifiedUnlockPayload → reducePaymentSuccess 로 store 에 찍히지만,
//   _cdBuildOptimisticPassAccess 는 서버 확정 근거(evidenceId/accessGrant)를 일부러 비우므로
//   이용권 낙관만 그 경로가 통째로 no-op 이었다.
//
// 🔴 정적 grep 으로는 못 잡는다 — 셸에 markOptimisticallyUnlocked 호출이 "있는지"가 아니라,
//    authoritative 병합을 통과하고도 살아남는지가 계약이다. 그래서 access-store.js 원본과
//    셸 함수 원문을 같은 샌드박스에서 **실행**한다.
//
// 🔴 짝 단언이 핵심이다(1-A2). 낙관 해금을 살려 두는 대신 durable 저장소(cd_tile_locks_*)로
//    새면 안 된다 — 그 저장소에는 제거 경로가 없어서 한 번 새면 월 한도 402 가 와도 회수할 수
//    없는 영구 무료 해금이 된다. 반대로 **실제 결제 낙관은 그대로 저장돼야** 한다. 두 방향을
//    함께 단언하지 않으면 가드가 결제 경로를 조용히 깨뜨린다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const shellSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const storeSource = fs.readFileSync(path.join(root, "js/core/access-store.js"), "utf8");

const PROFILE_STORAGE_KEY = "cd_tile_locks_user-1_profile-1";
const ACCOUNT_STORAGE_KEY = "cd_tile_locks_user-1";

/** 따옴표·이스케이프를 건너뛰며 `{` 에서 짝이 맞는 `}` 까지 잘라 온다. */
function sliceBraceBlock(from) {
  const open = shellSource.indexOf("{", from);
  assert.ok(open >= 0, `여는 중괄호를 못 찾았습니다: ${from}`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = open; i < shellSource.length; i += 1) {
    const ch = shellSource[i];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") { depth -= 1; if (depth === 0) return i; }
  }
  throw new Error("중괄호 짝을 못 맞췄습니다");
}

/** 셸 원문에서 함수 선언 하나를 그대로 떼어 온다. 못 찾으면 통과가 아니라 실패다(fail-closed). */
function grabFunction(header) {
  const start = shellSource.indexOf(header);
  assert.ok(start >= 0, `셸에서 못 찾았습니다 — 리팩터로 이름이 바뀌었다면 이 테스트를 함께 갱신하세요: ${header}`);
  // 매개변수 목록의 괄호를 먼저 건너뛴 뒤 본문 중괄호를 센다.
  let paren = 0;
  let i = start;
  for (; i < shellSource.length; i += 1) {
    const ch = shellSource[i];
    if (ch === "(") paren += 1;
    else if (ch === ")") { paren -= 1; if (paren === 0) { i += 1; break; } }
  }
  return shellSource.slice(start, sliceBraceBlock(i) + 1);
}

/** `var NAME = { ... };` 형태의 상수 표를 원문 그대로 떼어 온다. */
function grabObjectVar(name) {
  const start = shellSource.indexOf(`var ${name} = {`);
  assert.ok(start >= 0, `셸에서 못 찾았습니다: var ${name}`);
  return `${shellSource.slice(start, sliceBraceBlock(start) + 1)};`;
}

const SHELL_FUNCTIONS = [
  "function resolveTileLockAliasKeys(rawKey) {",
  "function markUnlockKey(unlockMap, rawKey) {",
  "function isSajuAccessFeatureKey(rawKey) {",
  "function isSajuSectionUnlockedForRender(rawKey) {",
  "function mergeAccessStoreUnlocksIntoLegacyMap() {",
  "function isTileKeyUnlocked(rawKey) {",
  "function syncUnlockedFeatureMapGlobal(options) {",
  "function readTileLockMapFromStorage(storageKey) {",
  "function _cdRevocablePassUnlockKeySet() {",
  "function writeTileLockMapToStorage(storageKey, map) {",
  "function saveTileLocks() {",
  "function loadTileLocks() {",
  "function _cdFinalizeUnlockState(featureKey, payload) {",
];

// 셸 원문 밖의 의존성만 대역으로 세운다. 판정 본체(위 목록)는 전부 원문 그대로다.
// _cdMergeVerifiedUnlockGrants(공용 원장)는 일부러 빈 대역이다 — 이 파일이 확인하려는 것은
// "access store 가 단일 소스로 동작하는가" 이므로 원장이 답을 덮어쓰면 측정이 흐려진다.
const SHELL_HARNESS = `
  var unlockedFeatureMap = Object.create(null);
  ${grabObjectVar("TILE_LOCK_ALIAS_MAP")}
  ${grabObjectVar("SAJU_ACCESS_CONTENT_KEY_BY_FEATURE_KEY")}
  function hasAuthToken() { return true; }
  function getTileLocksStorageKeys() { return ['${PROFILE_STORAGE_KEY}', '${ACCOUNT_STORAGE_KEY}']; }
  function isAdminUser() { return false; }
  function clearLegacyUnlockStorage() {}
  function _cdMergeVerifiedUnlockGrants(map) { return map || Object.create(null); }
  function _cdApplyVerifiedUnlockPayload() { return false; }
  function _cdHasVerifiedServerAccess() { return false; }
  function _cdRecordVerifiedUnlockGrant() {}
  function _cdRecordOptimisticUnlockGrant() {}
  function _cdResolveSajuVerifiedUnlockHoldProfileId() { return 'profile-1'; }
  ${SHELL_FUNCTIONS.map(grabFunction).join("\n")}
  window.addEventListener('cd:unlocks-changed', function() {
    syncUnlockedFeatureMapGlobal({ skipDispatch: true });
  });
  window.__shell = {
    isTileKeyUnlocked: isTileKeyUnlocked,
    saveTileLocks: saveTileLocks,
    loadTileLocks: loadTileLocks,
    finalizeUnlockState: _cdFinalizeUnlockState,
    revocableKeys: function() { return Object.keys(_cdRevocablePassUnlockKeySet()); }
  };
`;

function boot() {
  const storage = new Map();
  const listeners = new Map();
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
    Error,
    encodeURIComponent,
    URLSearchParams,
    AbortController,
    setTimeout: () => 1,
    clearTimeout: () => undefined,
    fetch: async () => ({ ok: false, status: 503, json: async () => ({ ok: false }) }),
    localStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    sessionStorage: { getItem: () => null },
    addEventListener: (name, listener) => {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(listener);
    },
    removeEventListener: () => undefined,
    dispatchEvent: (event) => {
      (listeners.get(event && event.type) || []).forEach((listener) => listener(event));
      return true;
    },
    CustomEvent: function CustomEvent(type, init) {
      this.type = type;
      this.detail = init && init.detail;
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(storeSource, sandbox, { filename: "access-store.js" });
  vm.runInNewContext(SHELL_HARNESS, sandbox, { filename: "index.html:shell-slice" });

  // 서버가 확정한 전량 스냅샷 = mergeAccessStoreUnlocksIntoLegacyMap 의 authoritative 분기.
  // 이 상태여야 "맵 전체 삭제 후 store 가 아는 것만 복구" 가 실제로 돌아 사고를 재현한다.
  const applied = sandbox.CodeDestinyAccessStore.applyAccessStateSnapshot({
    userId: "user-1",
    currentProfileId: "profile-1",
    completeness: "full",
    authority: "server",
    unlockedFeatureIds: [],
  }, { profileId: "profile-1" });
  assert.equal(applied, true, "authoritative 스냅샷 적용에 실패했습니다");
  assert.equal(sandbox.CodeDestinyAccessStore.getSnapshot().status, "ready");

  return { sandbox, storage, store: sandbox.CodeDestinyAccessStore, shell: sandbox.__shell };
}

function storedKeys(storage, storageKey) {
  const raw = storage.get(storageKey);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Object.keys(parsed).filter((key) => parsed[key] === true).sort();
}

test("이용권 낙관 해금이 authoritative 병합 뒤에도 살아남는다 (사고 본체)", () => {
  const { shell } = boot();
  assert.equal(shell.isTileKeyUnlocked("section_summary"), false, "출발점은 잠금이어야 합니다");

  const unlocked = shell.finalizeUnlockState("section_summary", { __cdOptimisticPass: true });

  assert.equal(unlocked, true, "_cdFinalizeUnlockState 가 해금을 확인하지 못했습니다 (사고 재현)");
  assert.equal(shell.isTileKeyUnlocked("section_summary"), true);
});

test("낙관 표식이 없으면 authoritative 병합이 그대로 지운다 (수정 전 동작)", () => {
  const { shell } = boot();

  // __cdOptimisticPass 가 없으면 store 기록 분기를 타지 않는다 — 이것이 수정 전 코드의 전부였고,
  // markUnlockKey 로 찍은 값이 isTileKeyUnlocked 첫 줄에서 곧바로 지워졌다.
  const unlocked = shell.finalizeUnlockState("section_summary", {});

  assert.equal(unlocked, false, "이 방향이 true 가 되면 사고 재현이 사라져 테스트가 무의미해집니다");
  assert.equal(shell.isTileKeyUnlocked("section_summary"), false);
});

test("이용권 낙관 해금은 durable 저장소(cd_tile_locks_*)로 새지 않는다", () => {
  const { shell, storage } = boot();

  shell.finalizeUnlockState("section_summary", { __cdOptimisticPass: true });

  assert.equal(shell.isTileKeyUnlocked("section_summary"), true, "화면은 열린 채여야 합니다");
  assert.deepEqual(storedKeys(storage, PROFILE_STORAGE_KEY), []);
  assert.deepEqual(storedKeys(storage, ACCOUNT_STORAGE_KEY), []);
});

test("별칭까지 함께 걸러진다", () => {
  const { shell, storage } = boot();

  shell.finalizeUnlockState("healthReport", { __cdOptimisticPass: true });

  assert.equal(shell.isTileKeyUnlocked("healthReport"), true);
  assert.equal(shell.isTileKeyUnlocked("rpt_healthReportCard"), true, "별칭도 함께 열려야 합니다");
  assert.deepEqual(storedKeys(storage, PROFILE_STORAGE_KEY), []);
  assert.deepEqual(storedKeys(storage, ACCOUNT_STORAGE_KEY), []);
});

test("🔴 짝: 실제 결제 낙관(PaymentSuccessEvent)은 durable 저장소에 그대로 남는다", () => {
  const { shell, store, storage } = boot();

  // reducePaymentSuccess 가 찍는 출처. 여기까지 걸러 버리면 결제 경로가 조용히 깨진다.
  store.markOptimisticallyUnlocked("section_summary", "profile-1", { source: "PaymentSuccessEvent" });
  shell.saveTileLocks();

  assert.deepEqual(shell.revocableKeys(), [], "결제 낙관은 회수 대상이 아니어야 합니다");
  assert.deepEqual(storedKeys(storage, PROFILE_STORAGE_KEY), ["section_summary"]);
  assert.deepEqual(storedKeys(storage, ACCOUNT_STORAGE_KEY), ["section_summary"]);
});

test("이미 저장소에 굳어 있던 키는 지우지 않는다", () => {
  const { shell, storage } = boot();
  // 과거에 실제로 결제해 저장된 해금. 낙관 필터가 이걸 지우면 복구 경로가 없다.
  storage.set(PROFILE_STORAGE_KEY, JSON.stringify({ section_summary: true }));
  storage.set(ACCOUNT_STORAGE_KEY, JSON.stringify({ section_summary: true }));

  shell.finalizeUnlockState("section_summary", { __cdOptimisticPass: true });

  assert.deepEqual(storedKeys(storage, PROFILE_STORAGE_KEY), ["section_summary"]);
  assert.deepEqual(storedKeys(storage, ACCOUNT_STORAGE_KEY), ["section_summary"]);
});

test("낙관 해금은 회수 가능하다 — 스토어에서 걷어내면 다시 잠긴다", () => {
  const { shell, store } = boot();
  shell.finalizeUnlockState("section_summary", { __cdOptimisticPass: true });
  assert.equal(shell.isTileKeyUnlocked("section_summary"), true);

  // 서버가 월 한도 402 로 되돌리는 상황. durable 저장소가 깨끗하기 때문에 이 회수가 성립한다.
  store.rollbackOptimisticUpdate("monthly-limit");
  shell.loadTileLocks();

  assert.equal(shell.isTileKeyUnlocked("section_summary"), false, "회수 후에도 열려 있으면 영구 무료 해금입니다");
});

test("새로고침(loadTileLocks)이 라이브와 같은 상태를 본다", () => {
  const { shell } = boot();
  shell.finalizeUnlockState("section_summary", { __cdOptimisticPass: true });
  const live = shell.isTileKeyUnlocked("section_summary");

  shell.loadTileLocks();

  assert.equal(shell.isTileKeyUnlocked("section_summary"), live, "라이브와 새로고침이 어긋나면 사용자가 버그로 인식합니다");
});
