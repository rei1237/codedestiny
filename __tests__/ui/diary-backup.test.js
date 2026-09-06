/**
 * 기록 내보내기·불러오기 증명 — **사용자의 기록을 잃을 수 있는 유일한 경로**를 지킨다.
 *
 * 이 테스트가 대체하는 것: "파일 하나 내보내서 다른 기기에서 불러와 본다"는 수동 왕복.
 * 손으로 한 번 해 보는 것으로는 「같은 날이 양쪽에 있을 때」·「파일이 깨졌을 때」·「모르는
 * 필드가 있을 때」가 매번 재현되지 않는다.
 *
 * 됐다의 기준 (하나라도 어긋나면 실패):
 *  - 내보낸 파일을 그대로 다시 불러오면 기록이 한 건도 늘지도 줄지도 않는다
 *  - 같은 날이 양쪽에 있으면 **기기 쪽이 이긴다** — 빈 날일 때만 백업이 채운다
 *  - 확장 기록은 파일의 `updatedAt` 이 더 새것일 때만 덮이고, 합친 뒤에도 그 시각이 유지된다
 *  - 방어 순서 6종이 각각 제 사유로 거절한다(크기·JSON·형식·버전·해시·빈 파일)
 *  - 모르는 최상위 키와 모르는 필드가 왕복에서 살아남는다
 *  - 미리보기에서 센 수치와 실제로 반영된 수치가 같다
 *  - 전체 삭제는 이 두 계약이 아는 키만 지운다
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const store = require("../../lib/diary/diary-store.js");
const ext = require("../../lib/diary/diary-ext-store.js");
const backup = require("../../lib/diary/diary-backup.js");

/** 가짜 localStorage — 훑기(`key`/`length`)까지 있어야 확장 샤드 스캔이 돈다. */
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

/** 저장소가 가득 찬 기기 — 읽기는 되고 쓰기만 던진다(부분 반영이 성공으로 세어지지 않는지 본다). */
function makeReadOnlyStorage(initial) {
  const inner = makeStorage(initial);
  return { ...inner, get length() { return inner.length; }, key: inner.key, setItem: () => { throw new Error("QuotaExceededError"); } };
}

const A = "2026-03-14";
const B = "2026-04-02";

/** 내용이 있는 v2 엔트리 하나. */
function entryWith(ymd, memo) {
  const entry = store.createDiaryEntry(ymd);
  entry.memoNote = memo;
  return entry;
}

/** 확장 하루치 하나. */
function extDay(text, updatedAt) {
  return { schedules: [], todos: [{ id: "t1", text, done: false, createdAt: 1 }], updatedAt };
}

/** 기록이 들어 있는 기기 하나를 만든다. */
function deviceWith(legacy, extDays) {
  const storage = makeStorage();
  store.writeDiaryStore(storage, legacy);
  if (extDays) ext.writeExtDays(storage, extDays);
  return storage;
}

test("내보낸 파일을 같은 기기에서 다시 불러오면 한 건도 바뀌지 않는다", async () => {
  const storage = deviceWith({ [A]: entryWith(A, "봄비") }, { [A]: extDay("장보기", "2026-03-14T01:00:00.000Z") });
  const before = storage.getItem(store.DIARY_STORAGE_KEY);

  const file = await backup.buildDiaryBackup(storage, "2026-03-14T09:00:00.000Z");
  const parsed = await backup.parseDiaryBackup(JSON.stringify(file));
  assert.equal(parsed.ok, true, `내가 만든 파일을 내가 거절했다 — 사유: ${parsed.reason}`);

  const applied = backup.applyDiaryBackup(storage, parsed.backup);
  assert.deepEqual(
    { ok: applied.ok, added: applied.added, overwritten: applied.overwritten, kept: applied.kept },
    /* 수치의 단위는 **날짜**다 — 같은 하루가 두 축(v2·확장)에 다 있어도 한 번만 센다. */
    { ok: true, added: 0, overwritten: 0, kept: 1 },
    "같은 기록을 다시 얹었는데 추가·덮어쓰기가 생겼다 — 자기 파일로 자기 기록을 덮고 있다",
  );
  assert.equal(storage.getItem(store.DIARY_STORAGE_KEY), before, "v2 키의 내용이 바뀌었다");
});

test("다른 기기의 새 날짜는 추가되고, 같은 날의 내 기록은 덮이지 않는다", async () => {
  const source = deviceWith({ [A]: entryWith(A, "저쪽 기록"), [B]: entryWith(B, "저쪽만 있는 날") });
  const file = await backup.buildDiaryBackup(source, "2026-04-02T09:00:00.000Z");

  const target = deviceWith({ [A]: entryWith(A, "이쪽 기록") });
  const applied = backup.applyDiaryBackup(target, file);

  assert.deepEqual(
    { added: applied.added, overwritten: applied.overwritten, kept: applied.kept },
    { added: 1, overwritten: 0, kept: 1 },
  );
  const after = store.readDiaryStore(target);
  assert.equal(after[A].memoNote, "이쪽 기록", "🔴 기기의 기록이 백업으로 덮였다 — 합치기에서 절대 일어나면 안 된다");
  assert.equal(after[B].memoNote, "저쪽만 있는 날", "없던 날이 들어오지 않았다");
});

test("셸이 만들어 둔 빈 엔트리는 백업이 채운다", async () => {
  const source = deviceWith({ [A]: entryWith(A, "복원할 기록") });
  const file = await backup.buildDiaryBackup(source, "2026-03-14T09:00:00.000Z");

  /* 셸 모달은 그날을 열기만 해도 빈 엔트리를 만들어 저장한다 — 그 하루가 복원에서 빠지면 안 된다. */
  const target = deviceWith({ [A]: store.createDiaryEntry(A) });
  const applied = backup.applyDiaryBackup(target, file);

  assert.equal(applied.overwritten, 1, "빈 엔트리를 「내용 있음」으로 읽어 복원을 건너뛰었다");
  assert.equal(store.readDiaryStore(target)[A].memoNote, "복원할 기록");
});

test("날짜 필드만 있는 엔트리도 빈 날로 본다", async () => {
  const source = deviceWith({ [A]: entryWith(A, "복원할 기록") });
  const file = await backup.buildDiaryBackup(source, "2026-03-14T09:00:00.000Z");

  /* `ensureDiaryEntryShape` 가 채우지 않는 자리(lotto·feedback·nightLog·moodEmoji)가 있어서,
     없는 필드를 값으로 세면 이 하루만 조용히 복원에서 빠진다. */
  const target = deviceWith({ [A]: { date: A } });
  assert.equal(backup.applyDiaryBackup(target, file).overwritten, 1);
});

test("확장 기록은 파일 쪽이 더 새것일 때만 덮이고, 그 시각이 유지된다", async () => {
  const newer = "2026-03-14T12:00:00.000Z";
  const older = "2026-03-14T01:00:00.000Z";
  const source = deviceWith({}, { [A]: extDay("새 할 일", newer), [B]: extDay("오래된 할 일", older) });
  const file = await backup.buildDiaryBackup(source, "2026-03-15T09:00:00.000Z");

  const target = deviceWith({}, { [A]: extDay("내 할 일", older), [B]: extDay("내 할 일", newer) });
  const applied = backup.applyDiaryBackup(target, file);

  assert.deepEqual({ added: applied.added, overwritten: applied.overwritten, kept: applied.kept }, { added: 0, overwritten: 1, kept: 1 });

  const after = ext.readAllExtDays(target);
  assert.equal(after[A].todos[0].text, "새 할 일", "더 새 기록이 반영되지 않았다");
  assert.equal(after[B].todos[0].text, "내 할 일", "🔴 오래된 백업이 새 기록을 덮었다");
  assert.equal(
    after[A].updatedAt,
    newer,
    "🔴 합치면서 `updatedAt` 을 지금 시각으로 덮었다 — 다음 불러오기의 신구 판정이 무너진다",
  );
});

test("방어 순서 6종이 각각 제 사유로 거절한다", async () => {
  const storage = deviceWith({ [A]: entryWith(A, "기록") });
  const file = await backup.buildDiaryBackup(storage, "2026-03-14T09:00:00.000Z");

  const tooLarge = "a".repeat(backup.DIARY_BACKUP_MAX_CHARS + 1);
  assert.equal((await backup.parseDiaryBackup(tooLarge)).reason, "too-large");
  assert.equal((await backup.parseDiaryBackup("{ 이건 JSON 이 아니다")).reason, "not-json");
  assert.equal((await backup.parseDiaryBackup(JSON.stringify({ hello: 1 }))).reason, "not-backup");
  assert.equal(
    (await backup.parseDiaryBackup(JSON.stringify({ ...file, formatVersion: backup.DIARY_BACKUP_FORMAT_VERSION + 1 }))).reason,
    "newer-version",
    "모르는 규칙으로 만들어진 파일을 병합하려 했다",
  );

  const tampered = JSON.parse(JSON.stringify(file));
  tampered.payload.legacy.diary[A].memoNote = "옮기다 깨진 값";
  assert.equal((await backup.parseDiaryBackup(JSON.stringify(tampered))).reason, "integrity");

  const emptied = { ...file, payload: { legacy: { diary: {} }, ext: { days: {} } }, integrity: null };
  assert.equal((await backup.parseDiaryBackup(JSON.stringify(emptied))).reason, "empty");
});

test("모르는 최상위 키와 모르는 필드가 살아남는다", async () => {
  const storage = deviceWith({ [A]: { ...entryWith(A, "기록"), 미래필드: "뒤 PR 이 더할 값" } });
  const file = await backup.buildDiaryBackup(storage, "2026-03-14T09:00:00.000Z");
  /* 뒤 버전이 최상위에 칸을 더해도 거절 사유가 아니고, 그 칸을 떨어뜨리지도 않는다. */
  file.futureSection = { note: "모르는 칸" };
  file.integrity = null;

  const parsed = await backup.parseDiaryBackup(JSON.stringify(file));
  assert.equal(parsed.ok, true, `모르는 최상위 키 때문에 거절했다 — 사유: ${parsed.reason}`);
  assert.deepEqual(parsed.backup.futureSection, { note: "모르는 칸" });

  const target = makeStorage();
  backup.applyDiaryBackup(target, parsed.backup);
  assert.equal(
    store.readDiaryStore(target)[A]["미래필드"],
    "뒤 PR 이 더할 값",
    "🔴 이 코드가 모르는 필드를 떨어뜨렸다 — 그것이 곧 기록 손실이다",
  );
});

test("날짜 형식이 아닌 키는 걸러 내고 그 수를 알린다", async () => {
  const storage = deviceWith({ [A]: entryWith(A, "기록") });
  const file = await backup.buildDiaryBackup(storage, "2026-03-14T09:00:00.000Z");
  file.payload.legacy.diary["2026-02-31"] = entryWith("2026-02-31", "없는 날");
  file.payload.legacy.diary["lastSeen"] = { note: "날짜가 아닌 키" };
  file.integrity = null;

  const parsed = await backup.parseDiaryBackup(JSON.stringify(file));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.dropped, 2, "걸러 낸 수를 세지 않으면 화면이 조용히 버리게 된다");
  assert.deepEqual(Object.keys(parsed.backup.payload.legacy.diary), [A]);
});

test("미리보기에서 센 수치와 실제로 반영된 수치가 같다", async () => {
  const source = deviceWith({ [A]: entryWith(A, "저쪽"), [B]: entryWith(B, "저쪽만") }, { [B]: extDay("할 일", "2026-04-02T01:00:00.000Z") });
  const file = await backup.buildDiaryBackup(source, "2026-04-02T09:00:00.000Z");

  const target = deviceWith({ [A]: entryWith(A, "이쪽") });
  const plan = backup.planDiaryBackupMerge(target, file);
  const applied = backup.applyDiaryBackup(target, file);

  assert.deepEqual(
    plan.counts,
    { added: applied.added, overwritten: applied.overwritten, kept: applied.kept },
    "🔴 미리보기와 반영이 다른 숫자를 냈다 — 화면에 보여 준 수치가 보증이 아니게 된다",
  );
  assert.equal(plan.counts.added, 1, "같은 날짜가 두 축에 걸쳐도 한 번만 센다");
});

test("저장에 실패하면 성공으로 돌려주지 않는다", async () => {
  const source = deviceWith({ [B]: entryWith(B, "저쪽만") });
  const file = await backup.buildDiaryBackup(source, "2026-04-02T09:00:00.000Z");

  const target = makeReadOnlyStorage();
  assert.equal(backup.applyDiaryBackup(target, file).ok, false);
});

test("전체 삭제는 이 두 계약이 아는 키만 지운다", () => {
  const storage = deviceWith({ [A]: entryWith(A, "기록") }, { [A]: extDay("할 일", "2026-03-14T01:00:00.000Z") });
  ext.writeLastBackupAt(storage, "2026-03-14T09:00:00.000Z");
  storage.setItem("cd.diary.other.v1", "다른 기능의 키");
  storage.setItem("luck_sync_profile", "프로필");

  const result = backup.clearDiaryData(storage);

  assert.equal(result.ok, true);
  assert.equal(result.removedShards, 1);
  assert.deepEqual(store.readDiaryStore(storage), {});
  assert.deepEqual(ext.readAllExtDays(storage), {});
  assert.equal(ext.readLastBackupAt(storage), "");
  assert.deepEqual(
    [...storage.raw.keys()].sort(),
    ["cd.diary.other.v1", "luck_sync_profile"],
    "🔴 다이어리 밖의 키를 지웠다 — 삭제 범위가 두 계약을 넘어섰다",
  );
});

test("기록 수 세기는 한 곳이고 두 계약을 합쳐 센다", () => {
  const storage = deviceWith({ [A]: entryWith(A, "기록") }, { [A]: extDay("할 일", "x"), [B]: extDay("할 일", "x") });
  assert.deepEqual(backup.summarizeDiaryData(storage), { days: 2, extDays: 2, items: 2 });
  assert.deepEqual(
    backup.countDiaryData(store.readDiaryStore(storage), ext.readAllExtDays(storage)),
    backup.summarizeDiaryData(storage),
    "화면이 쓰는 세기와 파일이 쓰는 세기가 갈렸다",
  );
});
