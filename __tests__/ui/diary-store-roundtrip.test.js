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
 *  - 앱의 쓰기 함수(`updateDiaryEntry`)가 낡은 스냅샷을 들고 저장해도 남의 값을 덮지 않는다
 *  - 확장 키(`cd.diary.ext.v1.day.*`) 쓰기가 셸의 v2 키를 한 번도 건드리지 않는다
 *  - `app/diary/**` 에서 저장소를 만지는 파일은 전수 발견되어 계약 모듈을 거치지 않으면 실패한다
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { sliceFunction, stripComments } = require("../../scripts/lib/js-source-slice.mjs");
const store = require("../../lib/diary/diary-store.js");
const ext = require("../../lib/diary/diary-ext-store.js");

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

/**
 * 브라우저 `localStorage` 의 최소 흉내 — 값은 문자열로만 보관한다.
 * 🔴 `length`/`key(i)` 도 흉내낸다 — 확장 계약이 월 샤드를 그 둘로 훑어 찾기 때문이다.
 */
function makeStorage(initial) {
  const map = new Map(initial ? Object.entries(initial) : []);
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    get length() { return map.size; },
    key: (index) => [...map.keys()][index] ?? null,
    raw: map,
  };
}

/** 저장소가 가득 찬 기기 — `setItem` 이 던진다. */
function makeFullStorage() {
  return {
    getItem: () => null,
    setItem: () => { throw new Error("QuotaExceededError"); },
    removeItem: () => {},
    length: 0,
    key: () => null,
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

/* ─── 앱 쓰기 경로 (`updateDiaryEntry`) ──────────────────────────────
 * PR-E 부터 저장소에 쓰는 곳이 둘이다(셸 모달 · `/diary`). 앱의 유일한 쓰기 함수가
 * **저장 직전에 다시 읽어** 한 날짜만 병합하는지가 기록 유실의 갈림길이라 따로 증명한다. */

test("앱이 화면에 들고 있던 낡은 스냅샷으로 저장해도 셸이 그사이 쓴 값이 살아남는다", () => {
  const storage = makeStorage();
  const shell = buildShellSandbox(storage);

  // ① 화면이 저장소를 한 번 읽어 스냅샷을 들고 있다.
  const stale = store.readDiaryStore(storage);
  store.getDiaryEntry(stale, YMD).moodEmoji = "😊";
  store.writeDiaryStore(storage, stale);

  // ② 그사이 셸 모달이 같은 날에 다른 필드를 저장한다(앱 스냅샷은 이것을 모른다).
  const shellDiary = shell.loadDiary();
  shellDiary[YMD].nightLog = "모달이 그사이 쓴 회고";
  assert.equal(shell.saveDiary(shellDiary), true);

  // ③ 앱이 낡은 스냅샷을 손에 쥔 채 한 줄을 저장한다.
  const saved = store.updateDiaryEntry(storage, YMD, (entry) => {
    entry.practiceNote = "앱이 나중에 쓴 한 줄";
  });
  assert.ok(saved, "`updateDiaryEntry` 가 저장에 실패했다");

  const after = store.readDiaryStore(storage)[YMD];
  assert.equal(after.nightLog, "모달이 그사이 쓴 회고", "앱 저장이 모달이 쓴 값을 덮어썼다");
  assert.equal(after.moodEmoji, "😊", "앱 저장이 앞서 쓴 제 값을 잃었다");
  assert.equal(after.practiceNote, "앱이 나중에 쓴 한 줄");
  assert.deepEqual(saved[YMD], after, "돌려준 저장소가 실제로 저장된 것과 다르다");
});

test("`updateDiaryEntry` 는 고른 날짜 하나만 바꾼다", () => {
  const other = "2026-03-15";
  const storage = makeStorage();
  const seed = store.readDiaryStore(storage);
  store.getDiaryEntry(seed, other).memoNote = "다른 날 메모";
  store.writeDiaryStore(storage, seed);

  store.updateDiaryEntry(storage, YMD, (entry) => {
    entry.memoNote = "고른 날 메모";
  });

  const after = store.readDiaryStore(storage);
  assert.equal(after[other].memoNote, "다른 날 메모", "다른 날짜의 기록이 바뀌었다");
  assert.equal(after[YMD].memoNote, "고른 날 메모");
  assert.deepEqual(Object.keys(after).sort(), [YMD, other]);
});

test("저장소가 가득 차면 `updateDiaryEntry` 가 null 을 돌려준다", () => {
  const saved = store.updateDiaryEntry(makeFullStorage(), YMD, (entry) => {
    entry.memoNote = "저장되지 않는다";
  });
  assert.equal(saved, null, "저장 실패를 성공처럼 돌려주면 화면이 안 쓴 것을 썼다고 보여 준다");
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

/* ─── 확장 키 (`cd.diary.ext.v1.day.*`) ──────────────────────────────
 * PR-F 가 여는 `/diary` 전용 저장 자리다. 셸 모달은 이 키를 모르므로, **v2 를 한 번도 건드리지
 * 않는다**가 이 축의 안전 조건이다 — 확장 필드가 v2 로 새면 셸이 모르는 값을 안고 다닌다. */

test("확장 기록을 써도 셸의 v2 키는 한 글자도 바뀌지 않는다", () => {
  const storage = makeStorage();
  const shell = buildShellSandbox(storage);

  const diary = shell.loadDiary();
  shell.getTodayEntry(diary).nightLog = "셸이 쓴 회고";
  assert.equal(shell.saveDiary(diary), true);
  const v2Before = storage.getItem(store.DIARY_STORAGE_KEY);

  const days = ext.updateExtDay(storage, YMD, (day) => {
    day.schedules.push({ id: "s1", at: "14:00", text: "치과 예약" });
    day.todos.push({ id: "t1", text: "장보기", done: false });
  });

  assert.ok(days, "`updateExtDay` 가 저장에 실패했다");
  assert.equal(
    storage.getItem(store.DIARY_STORAGE_KEY),
    v2Before,
    "확장 쓰기가 v2 키를 건드렸다 — 셸 모달이 모르는 필드를 안고 다니게 된다",
  );
  assert.equal(days[YMD].schedules[0].text, "치과 예약");
  assert.equal(days[YMD].todos[0].text, "장보기");
  assert.match(days[YMD].updatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(shell.loadDiary(), diary, "셸이 읽는 기록이 확장 쓰기로 달라졌다");
});

test("확장 쓰기는 그 달 샤드 하나만 바꾼다", () => {
  const storage = makeStorage();
  const otherMonth = "2026-04-02";

  ext.updateExtDay(storage, otherMonth, (day) => { day.todos.push({ id: "t0", text: "다음 달 할 일" }); });
  const otherKey = ext.diaryExtMonthKey(otherMonth);
  const otherBefore = storage.getItem(otherKey);

  const days = ext.updateExtDay(storage, YMD, (day) => { day.todos.push({ id: "t1", text: "이 달 할 일" }); });

  assert.equal(storage.getItem(otherKey), otherBefore, "다른 달 샤드가 함께 다시 쓰였다");
  assert.deepEqual(Object.keys(days).sort(), [YMD, otherMonth]);
  assert.equal(days[otherMonth].todos[0].text, "다음 달 할 일", "샤드를 편 맵에서 다른 달이 사라졌다");
});

test("확장 기록에서 모르는 필드도 살아남는다", () => {
  const storage = makeStorage();
  const monthKey = ext.diaryExtMonthKey(YMD);
  storage.setItem(monthKey, JSON.stringify({ [YMD]: { futureField: "미래값", todos: [{ id: "t1", text: "먼저 있던 것" }] } }));

  const days = ext.updateExtDay(storage, YMD, (day) => {
    day.schedules.push({ id: "s1", at: "09:00", text: "회의" });
  });

  assert.equal(days[YMD].futureField, "미래값", "뒤 PR 이 더할 필드를 이번 쓰기가 떨어뜨렸다");
  assert.equal(days[YMD].todos[0].text, "먼저 있던 것", "다른 칸의 항목이 사라졌다");
  assert.equal(days[YMD].schedules[0].text, "회의");
});

test("낡은 확장 스냅샷을 들고 저장해도 그사이 다른 탭이 쓴 값이 살아남는다", () => {
  const storage = makeStorage();

  // ① 화면이 확장 스냅샷을 한 번 읽어 들고 있다.
  const stale = ext.readAllExtDays(storage);
  assert.deepEqual(stale, {});

  // ② 그사이 다른 탭이 같은 날에 일정을 저장한다.
  ext.updateExtDay(storage, YMD, (day) => { day.schedules.push({ id: "s1", at: "10:00", text: "다른 탭이 쓴 일정" }); });

  // ③ 낡은 스냅샷을 쥔 화면이 할 일을 저장한다.
  const days = ext.updateExtDay(storage, YMD, (day) => { day.todos.push({ id: "t1", text: "나중에 쓴 할 일" }); });

  assert.equal(days[YMD].schedules[0].text, "다른 탭이 쓴 일정", "나중 저장이 그사이 쓴 일정을 덮었다");
  assert.equal(days[YMD].todos[0].text, "나중에 쓴 할 일");
});

test("태그도 같은 확장 샤드로 왕복하고 v2 를 건드리지 않는다", () => {
  const storage = makeStorage();
  const shell = buildShellSandbox(storage);

  const diary = shell.loadDiary();
  shell.getTodayEntry(diary).nightLog = "셸이 쓴 회고";
  assert.equal(shell.saveDiary(diary), true);
  const v2Before = storage.getItem(store.DIARY_STORAGE_KEY);

  // PR-G 의 태그는 `day.tags` 문자열 배열이다 — 새 키를 만들지 않는다.
  const days = ext.updateExtDay(storage, YMD, (day) => {
    day.tags = ["운동", "회고"];
  });

  assert.ok(days, "`updateExtDay` 가 태그 저장에 실패했다");
  assert.deepEqual(days[YMD].tags, ["운동", "회고"]);
  assert.equal(
    storage.getItem(store.DIARY_STORAGE_KEY),
    v2Before,
    "태그 쓰기가 v2 키를 건드렸다 — 셸 모달이 모르는 필드를 안고 다니게 된다",
  );
  assert.deepEqual(ext.readAllExtDays(storage)[YMD].tags, ["운동", "회고"], "태그가 다시 읽히지 않는다");
});

test("태그 쓰기가 같은 날의 일정·할 일을 지우지 않는다", () => {
  const storage = makeStorage();

  ext.updateExtDay(storage, YMD, (day) => {
    day.schedules.push({ id: "s1", at: "10:00", text: "회의" });
    day.todos.push({ id: "t1", text: "장보기", done: false });
    day.tags = ["일"];
  });

  // 태그만 고치는 쓰기(`addTag`/`removeTag` 가 하는 것과 같은 모양).
  const days = ext.updateExtDay(storage, YMD, (day) => {
    day.tags = [...(day.tags || []), "집"];
  });

  assert.deepEqual(days[YMD].tags, ["일", "집"]);
  assert.equal(days[YMD].schedules[0].text, "회의", "태그 쓰기가 일정을 지웠다");
  assert.equal(days[YMD].todos[0].text, "장보기", "태그 쓰기가 할 일을 지웠다");

  const removed = ext.updateExtDay(storage, YMD, (day) => {
    day.tags = (day.tags || []).filter((tag) => tag !== "일");
  });
  assert.deepEqual(removed[YMD].tags, ["집"]);
  assert.equal(removed[YMD].schedules.length, 1, "태그를 지우면서 일정이 함께 사라졌다");
});

test("확장 쓰기도 실패를 성공처럼 돌려주지 않는다", () => {
  const full = ext.updateExtDay(makeFullStorage(), YMD, (day) => { day.todos.push({ id: "t1", text: "저장되지 않는다" }); });
  assert.equal(full, null, "저장 실패를 성공처럼 돌려주면 화면이 안 쓴 것을 썼다고 보여 준다");

  const badDate = ext.updateExtDay(makeStorage(), "2026-3-14", () => {});
  assert.equal(badDate, null, "날짜 형식이 아닌 키로 샤드를 만들면 어느 달에도 안 잡힌다");

  // 깨진 샤드는 v2 와 같이 조용히 빈 객체로 떨어진다.
  const broken = makeStorage({ [ext.diaryExtMonthKey(YMD)]: "{not json" });
  assert.deepEqual(ext.readAllExtDays(broken), {});
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
  const keyCopiers = [];
  for (const rel of files) {
    const source = stripComments(fs.readFileSync(path.join(dir, rel), "utf8"));
    // 🔴 확장 키 앞자리를 화면 코드에 복사하면, 계약 모듈을 거치더라도 키 조립이 두 곳이 된다.
    if (source.includes(ext.DIARY_EXT_DAY_KEY_PREFIX)) {
      keyCopiers.push(`app/diary/${rel.replace(/\\/g, "/")}`);
    }
    const touchesStorage = /\b(localStorage|sessionStorage)\b/.test(source);
    const hardcodesKey = source.includes(store.DIARY_STORAGE_KEY);
    if (!touchesStorage && !hardcodesKey) continue;
    if (!/from\s+["'][^"']*lib\/diary\/diary-(ext-)?store(\.js)?["']/.test(source)) {
      offenders.push(`app/diary/${rel.replace(/\\/g, "/")}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "저장소를 직접 만지는데 `lib/diary/diary-store.js`·`diary-ext-store.js` 를 안 쓴다 — 왕복 증명 밖으로 나갔다",
  );
  assert.deepEqual(
    keyCopiers,
    [],
    "확장 저장 키를 화면 코드에 복사했다 — 키 조립은 `lib/diary/diary-ext-store.js` 한 곳이다",
  );
});
