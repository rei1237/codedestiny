import test from "node:test";
import assert from "node:assert/strict";
import {
  QUEST_ID_PREFIX,
  cheerLine,
  findQuestTodo,
  journeyStepsDone,
  monthCalendar,
  msUntilKstMidnight,
  pickHoneyUses,
  streakGaugeCount,
  streakRunReward,
} from "../../app/components/daily-card/daily-progress.mjs";

test("깨진 실천 기록은 무시하고 모양이 맞는 항목만 찾는다", () => {
  for (const day of [null, {}, { todos: "x" }, { todos: [null] }, { todos: [{ id: 123, text: "x" }] }, { todos: [{ id: `${QUEST_ID_PREFIX}a`, text: {} }] }]) {
    assert.equal(findQuestTodo(day), undefined);
  }
  const quest = { id: `${QUEST_ID_PREFIX}a`, text: "산책", done: false };
  assert.equal(findQuestTodo({ todos: [null, { id: "other", text: "y" }, quest] }), quest);
});

test("다음 KST 자정까지 남은 시간을 계산한다", () => {
  assert.equal(msUntilKstMidnight(Date.parse("2026-11-05T23:59:00+09:00")), 60_000);
  assert.equal(msUntilKstMidnight(Date.parse("2026-11-06T00:00:00+09:00")), 86_400_000);
});

test("연속 출석 게이지는 주기 안에서 채워지고, 주기를 채운 날은 출석했을 때만 가득 찬다", () => {
  assert.equal(streakGaugeCount(0, 5, false), 0);
  assert.equal(streakGaugeCount(4, 5, true), 4);
  assert.equal(streakGaugeCount(6, 5, true), 1);
  assert.equal(streakGaugeCount(5, 5, true), 5);
  assert.equal(streakGaugeCount(5, 5, false), 0);
  assert.equal(streakGaugeCount(3, 0, true), 0);
  assert.equal(streakGaugeCount(Number.NaN, 5, true), 0);
});

test("오늘 도장은 출석·실천·기록 중 끝낸 것만 센다", () => {
  assert.equal(journeyStepsDone({ attended: false, questDone: false, hasRecord: false }), 0);
  assert.equal(journeyStepsDone({ attended: true, questDone: false, hasRecord: true }), 2);
  assert.equal(journeyStepsDone({ attended: true, questDone: true, hasRecord: true }), 3);
  assert.equal(journeyStepsDone({}), 0);
});

test("달력은 그 달 날 수와 첫 요일을 지키고, 서버가 준 이번 달 출석만 도장으로 찍는다", () => {
  const calendar = monthCalendar("2026-11-07", [
    { day: "2026-11-01" }, { day: "2026-11-05", bonus: true }, { day: "2026-10-31" }, { day: "2026-11-99" }, null, { day: 5 },
  ]);
  assert.equal(calendar.cells.length, 30);
  assert.equal(calendar.leading, 0); // 2026-11-01은 일요일
  assert.deepEqual(calendar.cells.filter(cell => cell.stamped).map(cell => cell.day), [1, 5]);
  assert.deepEqual(calendar.cells.filter(cell => cell.bonus).map(cell => cell.day), [5]);
  assert.deepEqual(calendar.cells.filter(cell => cell.isToday).map(cell => cell.day), [7]);
  assert.equal(calendar.cells.filter(cell => cell.isFuture).length, 23);
  assert.equal(monthCalendar("2027-02-10", []).cells.length, 28);
  assert.equal(monthCalendar("2026-12-01", undefined).leading, 2);
});

test("날짜가 깨지면 달력을 그리지 않는다", () => {
  assert.equal(monthCalendar("", []), null);
  assert.equal(monthCalendar("2026-13-01", []), null);
});

test("영냥이 한마디는 같은 날 같은 상태면 같고, 말투를 지킨다", () => {
  assert.equal(cheerLine("2026-11-07", "ready"), cheerLine("2026-11-07", "ready"));
  for (const state of ["ready", "stamped", "done", "unknown"]) {
    for (let day = 1; day <= 7; day += 1) assert.ok(cheerLine(`2026-11-0${day}`, state).length > 0);
  }
  assert.ok(cheerLine("", "done").length > 0);
});

test("연속 출석 보상 합은 서버 규칙(하루 1방울 + 주기마다 보너스)만으로 계산하고, 규칙이 깨지면 숫자를 내지 않는다", () => {
  const rules = { attendanceEvery: 1, streakEvery: 5, streakBonus: 4 };
  assert.equal(streakRunReward(4, rules), 4);
  assert.equal(streakRunReward(5, rules), 9);
  assert.equal(streakRunReward(30, rules), 54);
  assert.equal(streakRunReward(30, { ...rules, attendanceEvery: 2 }), 39);
  for (const broken of [null, {}, { ...rules, streakEvery: 0 }, { ...rules, streakBonus: Number.NaN }]) assert.equal(streakRunReward(30, broken), null);
  assert.equal(streakRunReward(0, rules), null);
});

test("꿀방울 사용처는 카탈로그 순서대로 분야마다 하나씩, 깨진 항목 없이 최대 4개다", () => {
  const row = (productId, group, honeyCost = 30) => ({ productId, title: productId, group, honeyCost });
  const picked = pickHoneyUses([row("a", "점성술"), row("b", "점성술"), null, row("c", "자미두수", 0), row("d", "자미두수"), row("e", "숙요"), row("f", "베다"), row("g", "작명")]);
  assert.deepEqual(picked.map(item => item.productId), ["a", "d", "e", "f"]);
  assert.deepEqual(pickHoneyUses(undefined), []);
});
