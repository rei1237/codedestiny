/**
 * 다이어리 저장 계약 왕복 증명 — 셸 모달과 `/diary` 가 **같은 기록 하나**를 쓰는지 확인한다.
 *
 * 이 테스트가 대체하는 것: PR-E 의 수동 왕복 시나리오
 * (`/diary` 저장 → 셸 모달에서 확인 → 모달에서 저장 → `/diary` 에서 확인).
 * 사람이 두 화면을 번갈아 열어 눈으로 보던 것을, 셸 원본 저장 함수를 **실제로 실행**해
 * 가짜 `localStorage` 위에서 왕복시키는 것으로 바꾼다. 셸의 저장 코드는 4,798줄 IIFE 라
 * 밖에서 부를 수 없으므로, 중괄호 균형 슬라이서(`scripts/lib/js-source-slice.mjs`)로
 * 함수 본문을 잘라 `new Function` 샌드박스에서 돌린다 — 이름 grep 이나 문자열 비교가 아니다.
 *
 * 됐다의 기준 (하나라도 어긋나면 실패):
 *  - 저장 키가 양쪽에서 같은 문자열이다
 *  - 빈 엔트리 골격이 필드 하나까지 전건 일치한다(필드 수가 40 미만이면 공회전으로 보고 실패)
 *  - 셸→앱·앱→셸 양방향에서 상대가 쓴 값이 한 필드도 사라지지 않는다
 *  - 서로 모르는 필드(상대가 나중에 추가할 것)도 살아남는다
 *  - `app/diary/**` 에서 저장소를 만지는 파일은 전수 발견되어 계약 모듈을 거치지 않으면 실패한다
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { sliceFunction, stripComments } = require("../../scripts/lib/js-source-slice.mjs");
const store = require("../../lib/diary/diary-store.js");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const DIARY_SRC = read("js/luck-sync-diary.js");

/** 마커가 정확히 한 번만 나오는지까지 확인하고 자른다 — 사본이 하나 더 생기면 여기서 걸린다. */
function sliceOnce(source, marker, label) {
  const occurrences = source.split(marker).length - 1;
  assert.equal(occurrences, 1, `${label}: 시작 마커가 ${occurrences}번 나온다 (1번이어야 한다) — ${marker.trim()}`);
  return sliceFunction(source, marker, label);
}

/** `var LS_KEY = '...'` 는 중괄호가 없어 중괄호 슬라이서로 못 자른다. */
function sliceLsKey() {
  const matched = /var LS_KEY = '[^']*';/.exec(DIARY_SRC);
  assert.ok(matched, "luck-sync-diary: var LS_KEY 선언을 못 찾았다");
  return matched[0];
}

const SHELL_PARTS = [
  "function _pad2(",
  "function _formatDateKeyParts(",
  "function _getSeoulDateParts(",
  "function ensureEntryShape(",
  "function loadDiary(",
  "function saveDiary(",
  "function getTodayKey(",
  "function getTodayEntry(",
];

/**
 * 셸의 저장 함수들을 실제로 실행할 수 있는 샌드박스.
 * `localStorage` 와 토스트만 주입한다 — 저장 경로가 모달 DOM 에 기대는 것은 그 둘뿐이다.
 */
function buildShellSandbox(localStorage) {
  const parts = SHELL_PARTS.map((marker) => sliceOnce(DIARY_SRC, marker, "luck-sync-diary"));
  const body = [sliceLsKey(), ...parts].join(";\n");
  const toasts = [];
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    "localStorage",
    "showDiaryToast",
    `${body};\nreturn {
       LS_KEY: LS_KEY,
       loadDiary: loadDiary,
       saveDiary: saveDiary,
       getTodayKey: getTodayKey,
       getTodayEntry: getTodayEntry,
       ensureEntryShape: ensureEntryShape,
     };`,
  );
  const shell = factory(localStorage, (message) => toasts.push(message));
  shell.toasts = toasts;
  return shell;
}

/** 브라우저 `localStorage` 의 최소 흉내 — 값은 문자열로만 보관한다. */
function makeStorage(initial) {
  const map = new Map(initial ? Object.entries(initial) : []);
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    raw: map,
  };
}

/** 저장소가 가득 찬 기기 — `setItem` 이 던진다. */
function makeFullStorage() {
  return {
    getItem: () => null,
    setItem: () => { throw new Error("QuotaExceededError"); },
    removeItem: () => {},
  };
}

const YMD = "2026-03-14";

test("저장 키가 셸과 `/diary` 에서 같은 문자열이다", () => {
  const shell = buildShellSandbox(makeStorage());
  assert.equal(
    store.DIARY_STORAGE_KEY,
    shell.LS_KEY,
    "저장 키가 갈렸다 — 두 표면의 기록이 분리된다. `lib/diary/diary-store.js` 를 셸에 맞춘다",
  );
});

test("빈 엔트리 골격이 셸과 전건 일치한다", () => {
  const storage = makeStorage();
  const shell = buildShellSandbox(storage);

  const shellDiary = {};
  const shellEntry = shell.getTodayEntry(shellDiary);
  const todayKey = shell.getTodayKey();
  const appEntry = store.createDiaryEntry(todayKey);

  // 공회전 방지: 빈 객체끼리 비교하고 통과했다고 하면 안 된다.
  const fieldCount = Object.keys(shellEntry).length;
  assert.ok(fieldCount >= 40, `셸 엔트리 필드가 ${fieldCount}개뿐이다 — 슬라이스가 잘못됐다`);

  assert.deepEqual(
    appEntry,
    shellEntry,
    "빈 엔트리 골격이 다르다 — 한쪽이 채운 기본값을 다른 쪽이 덮어쓴다",
  );
  assert.equal(shellEntry.date, todayKey);
  assert.match(todayKey, store.DIARY_DATE_KEY_PATTERN);
});

test("셸이 저장한 기록을 `/diary` 가 한 필드도 잃지 않고 읽는다", () => {
  const storage = makeStorage();
  const shell = buildShellSandbox(storage);

  const diary = shell.loadDiary();
  const entry = shell.getTodayEntry(diary);
  entry.nightLog = "셸에서 쓴 회고";
  entry.moodEmoji = "🙂";
  entry.challenges = ["c1", "c3"];
  entry.meditationLogs = [{ type: "sats", ts: 1, trackId: "t1" }];
  assert.equal(shell.saveDiary(diary), true);

  const appStore = store.readDiaryStore(storage);
  assert.deepEqual(appStore, diary, "셸이 저장한 것과 `/diary` 가 읽은 것이 다르다");

  const appEntry = store.getDiaryEntry(appStore, entry.date);
  assert.deepEqual(appEntry, entry, "`/diary` 가 읽으면서 셸의 값을 바꿨다");
});

test("`/diary` 가 저장한 기록을 셸이 읽어도 기본값을 다시 채우지 않는다", () => {
  const storage = makeStorage();
  const shell = buildShellSandbox(storage);

  const appStore = store.readDiaryStore(storage);
  const appEntry = store.getDiaryEntry(appStore, YMD);
  appEntry.reviewNote = "앱에서 쓴 회고";
  appEntry.reviewRate = 4;
  assert.equal(store.writeDiaryStore(storage, appStore), true);

  const shellDiary = shell.loadDiary();
  const before = JSON.parse(JSON.stringify(shellDiary[YMD]));
  assert.ok(before, "셸이 `/diary` 가 저장한 날짜를 못 찾았다 — 날짜 키 형식이 갈렸다");

  shell.ensureEntryShape(shellDiary[YMD]);
  assert.deepEqual(
    shellDiary[YMD],
    before,
    "셸이 `/diary` 의 엔트리에 기본값을 덧칠했다 — 앱의 엔트리 골격에 빠진 필드가 있다",
  );
  assert.equal(shellDiary[YMD].reviewNote, "앱에서 쓴 회고");
  assert.equal(shellDiary[YMD].reviewRate, 4);
});

test("서로 모르는 필드도 왕복에서 살아남는다", () => {
  const storage = makeStorage();
  const shell = buildShellSandbox(storage);

  // 셸이 나중에 추가할 필드가 이미 기기에 들어 있는 상황.
  const seeded = { [YMD]: { date: YMD, futureShellField: "미래값" } };
  storage.setItem(store.DIARY_STORAGE_KEY, JSON.stringify(seeded));

  const appStore = store.readDiaryStore(storage);
  const appEntry = store.getDiaryEntry(appStore, YMD);
  assert.equal(appEntry.futureShellField, "미래값", "`/diary` 가 모르는 필드를 떨어뜨렸다");
  appEntry.memoNote = "앱 메모";
  store.writeDiaryStore(storage, appStore);

  const shellDiary = shell.loadDiary();
  const shellEntry = shell.getTodayEntry(shellDiary); // 오늘 엔트리 생성이 남의 날짜를 건드리지 않는다
  assert.equal(shellDiary[YMD].futureShellField, "미래값");
  assert.equal(shellDiary[YMD].memoNote, "앱 메모");
  assert.notEqual(shellEntry.date, undefined);
});

test("수동 시나리오 그대로 — 앱 저장 → 셸 확인 → 셸 저장 → 앱 확인", () => {
  const storage = makeStorage();
  const shell = buildShellSandbox(storage);

  // ① `/diary` 에서 저장
  const s1 = store.readDiaryStore(storage);
  store.getDiaryEntry(s1, YMD).reviewNote = "앱이 쓴 회고";
  store.writeDiaryStore(storage, s1);

  // ② 셸 모달에서 확인
  const d1 = shell.loadDiary();
  assert.equal(d1[YMD].reviewNote, "앱이 쓴 회고", "셸이 `/diary` 의 기록을 못 봤다");

  // ③ 셸 모달에서 저장
  d1[YMD].nightLog = "셸이 쓴 야간 로그";
  d1[YMD].challenges = ["c2"];
  assert.equal(shell.saveDiary(d1), true);

  // ④ `/diary` 에서 확인 — 양쪽이 쓴 값이 둘 다 살아 있다
  const s2 = store.readDiaryStore(storage);
  const final = store.getDiaryEntry(s2, YMD);
  assert.equal(final.reviewNote, "앱이 쓴 회고", "셸 저장이 `/diary` 의 기록을 지웠다");
  assert.equal(final.nightLog, "셸이 쓴 야간 로그", "`/diary` 가 셸의 기록을 못 봤다");
  assert.deepEqual(final.challenges, ["c2"]);
  assert.equal(Object.keys(s2).length, 1, "왕복 중에 날짜 키가 하나 더 생겼다");
});

test("저장소가 가득 차면 양쪽 다 조용히 false 를 돌려준다", () => {
  const full = makeFullStorage();
  const shell = buildShellSandbox(full);

  assert.equal(shell.saveDiary({}), false);
  assert.equal(store.writeDiaryStore(full, {}), false);
  assert.equal(shell.toasts.length, 1, "셸은 토스트로 알린다 — 그 경로가 사라지면 안 된다");
  // 깨진 JSON 도 양쪽 다 빈 저장소로 떨어진다.
  const broken = makeStorage({ [store.DIARY_STORAGE_KEY]: "{not json" });
  assert.deepEqual(store.readDiaryStore(broken), {});
  assert.deepEqual(buildShellSandbox(broken).loadDiary(), {});
});

/* ─── 계약 우회 방지 (fail-closed) ──────────────────────────────
 * 위 왕복은 `lib/diary/diary-store.js` 를 증명한다. `/diary` 가 그 모듈을 안 쓰고
 * 제 손으로 localStorage 를 만지면 이 증명이 통째로 무의미해지므로, 저장소를 만지는
 * 파일을 **소스에서 전수 발견해** 계약을 거치지 않으면 실패시킨다. */
test("`app/diary/**` 에서 저장소를 만지는 파일은 전부 계약 모듈을 거친다", () => {
  const dir = path.join(root, "app/diary");
  const files = fs
    .readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((rel) => /\.(ts|tsx|js|jsx)$/.test(rel));
  assert.ok(files.length > 0, "app/diary 에서 소스 파일을 하나도 못 찾았다 — 경로가 바뀌었다");

  const offenders = [];
  for (const rel of files) {
    const source = stripComments(fs.readFileSync(path.join(dir, rel), "utf8"));
    const touchesStorage = /\b(localStorage|sessionStorage)\b/.test(source);
    const hardcodesKey = source.includes(store.DIARY_STORAGE_KEY);
    if (!touchesStorage && !hardcodesKey) continue;
    if (!/from\s+["'][^"']*lib\/diary\/diary-store(\.js)?["']/.test(source)) {
      offenders.push(`app/diary/${rel.replace(/\\/g, "/")}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "저장소를 직접 만지는데 `lib/diary/diary-store.js` 를 안 쓴다 — 왕복 증명 밖으로 나갔다",
  );
});
