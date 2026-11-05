import test from "node:test";
import assert from "node:assert/strict";
import {
  FOREST_PIECES,
  dailyLine,
  forestZoneForLevel,
  journeyStepsDone,
  litLanternCount,
  weekForestMap,
} from "../../app/components/forest/forest-progress.mjs";

test("등불은 연속 출석 주기 안에서 켜진다", () => {
  assert.equal(litLanternCount(0, 5, false), 0);
  assert.equal(litLanternCount(4, 5, true), 4);
  assert.equal(litLanternCount(6, 5, true), 1);
});
test("주기를 채운 날에는 오늘 출석했을 때만 모두 켜진 채로 남는다", () => {
  assert.equal(litLanternCount(5, 5, true), 5);
  assert.equal(litLanternCount(10, 5, true), 5);
  assert.equal(litLanternCount(5, 5, false), 0);
});
test("서버 값이 비정상이면 등불 수는 0이다", () => {
  assert.equal(litLanternCount(3, 0, true), 0);
  assert.equal(litLanternCount(Number.NaN, 5, true), 0);
  assert.equal(litLanternCount(undefined, undefined, true), 0);
});

test("오늘 걸음 수는 완료한 걸음만 센다", () => {
  assert.equal(journeyStepsDone({ attended: false, questDone: false, hasRecord: false }), 0);
  assert.equal(journeyStepsDone({ attended: true, questDone: false, hasRecord: true }), 2);
  assert.equal(journeyStepsDone({ attended: true, questDone: true, hasRecord: true }), 3);
  assert.equal(journeyStepsDone({}), 0);
});

const noEntry = () => null;
const questDay = (done) => ({ todos: [{ id: "home-quest:a", text: "산책", done }] });

test("숲 지도는 월요일부터 7칸이고 오늘을 표시한다", () => {
  const map = weekForestMap("2026-11-05", noEntry, {});
  assert.equal(map.length, 7);
  assert.equal(map[0].ymd, "2026-11-02");
  assert.equal(map[6].ymd, "2026-11-08");
  assert.deepEqual(map.filter(day => day.isToday).map(day => day.ymd), ["2026-11-05"]);
  assert.deepEqual(map.map(day => day.piece.id), FOREST_PIECES.map(piece => piece.id));
});
test("일요일은 그 주의 마지막 칸이고 월말·연말을 넘어도 이어진다", () => {
  assert.equal(weekForestMap("2026-11-08", noEntry, {})[6].isToday, true);
  const yearEnd = weekForestMap("2027-01-01", noEntry, {});
  assert.equal(yearEnd[0].ymd, "2026-12-28");
  assert.equal(yearEnd[6].ymd, "2027-01-03");
});
test("실천 완료와 기록이 모두 있어야 조각이 채워진다", () => {
  const entries = { "2026-11-02": { practiceNote: "좋았다" }, "2026-11-03": { nightLog: "조용했다" }, "2026-11-04": { practiceNote: "   " } };
  const ext = { "2026-11-02": questDay(true), "2026-11-03": questDay(false), "2026-11-04": questDay(true), "2026-11-05": questDay(true) };
  const map = weekForestMap("2026-11-05", ymd => entries[ymd] || null, ext);
  assert.deepEqual(map.slice(0, 4).map(day => day.filled), [true, false, false, false]);
});
test("퀘스트가 아닌 할 일은 실천으로 치지 않는다", () => {
  const map = weekForestMap("2026-11-02", () => ({ practiceNote: "메모" }), { "2026-11-02": { todos: [{ id: "x", text: "장보기", done: true }] } });
  assert.equal(map[0].filled, false);
});
test("저장소가 비거나 깨져도 예외 없이 빈 지도를 그린다", () => {
  assert.equal(weekForestMap("2026-11-05", noEntry, null).every(day => !day.filled), true);
  assert.equal(weekForestMap("2026-11-05", () => "깨짐", { "2026-11-05": "깨짐" }).every(day => !day.filled), true);
  assert.equal(weekForestMap("2026-11-05", () => { throw new Error("읽기 실패"); }, { "2026-11-05": { todos: "깨짐" } }).every(day => !day.filled), true);
  assert.deepEqual(weekForestMap("", noEntry, {}), []);
  assert.deepEqual(weekForestMap("2026-13-99", noEntry, {}), []);
});

test("숲 구역 이름은 레벨이 오를수록 깊어지고 비정상 레벨은 입구다", () => {
  assert.equal(forestZoneForLevel(1), "안개 입구");
  assert.equal(forestZoneForLevel(5), "이끼 오솔길");
  assert.equal(forestZoneForLevel(99), "고목의 품");
  assert.equal(forestZoneForLevel(-3), "안개 입구");
  assert.equal(forestZoneForLevel(Number.NaN), "안개 입구");
});

test("대사는 같은 날 같은 걸음이면 같고 말투 규칙을 지킨다", () => {
  assert.deepEqual(dailyLine("2026-11-05", "gate"), dailyLine("2026-11-05", "gate"));
  for (const step of ["gate", "lantern", "path", "spring", "done"]) {
    for (let day = 1; day <= 7; day += 1) {
      const line = dailyLine(`2026-11-0${day}`, step);
      assert.ok(line.yeoni.length > 0 && line.yeongnyangi.length > 0);
      assert.doesNotMatch(line.yeoni, /냥/);
      assert.ok(line.yeongnyangi.length <= 14, line.yeongnyangi);
    }
  }
});
test("날짜가 비어도 대사를 돌려준다", () => {
  assert.ok(dailyLine("", "done").yeoni.length > 0);
});
