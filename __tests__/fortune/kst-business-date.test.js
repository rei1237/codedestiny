/**
 * 운세 업무 날짜는 **Asia/Seoul 달력 날짜**여야 한다 — 러너의 OS 타임존이 아니라.
 *
 * 왜 이 테스트가 있는가: 발행 워크플로는 15:10 UTC 에 도는데, GitHub 러너의 시계는 UTC 다.
 * `new Date().toISOString().slice(0,10)` 처럼 UTC 날짜를 그대로 쓰면 그 순간의 답이
 * 2026-08-18 이 되어, KST 로는 이미 08-19 인데 08-18 자 운세를 만들게 된다. 증상은
 * "정확히 하루씩 밀린 today/tomorrow" 이고 배포는 초록불이라 눈에 띄지 않는다.
 *
 * 아래는 전부 순수 함수 검사다 — 네트워크·시계 조작 없이 기준 시각을 주입해서 잰다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const modulePath = new URL("../../scripts/lib/fortune-date.mjs", `file://${__filename.replace(/\\/g, "/")}`).href;

let kstYmdToday;
let kstYmdNextDay;
let kstYmdTomorrow;

test.before(async () => {
  ({ kstYmdToday, kstYmdNextDay, kstYmdTomorrow } = await import(modulePath));
});

/** KST 벽시계를 그 순간의 UTC 인스턴트로 옮긴다(KST 는 DST 가 없어 항상 -9h). */
function kstWallClock(iso) {
  return new Date(`${iso}+09:00`);
}

test("KST 자정 경계에서 업무 날짜가 정확히 넘어간다", () => {
  const cases = [
    ["2026-08-18T23:59:59", "2026-08-18", "2026-08-19"],
    ["2026-08-19T00:00:00", "2026-08-19", "2026-08-20"],
    ["2026-08-19T08:00:00", "2026-08-19", "2026-08-20"],
    ["2026-08-19T23:59:59", "2026-08-19", "2026-08-20"],
    ["2026-08-20T00:00:01", "2026-08-20", "2026-08-21"],
  ];
  for (const [wall, today, tomorrow] of cases) {
    const now = kstWallClock(wall);
    assert.equal(kstYmdToday(now), today, `${wall} KST 의 today`);
    assert.equal(kstYmdTomorrow(now), tomorrow, `${wall} KST 의 tomorrow`);
  }
});

/**
 * 이 케이스가 회귀의 핵심이다. cron 은 "10 15 * * *" (15:10 UTC) 이고, 그 인스턴트의
 * UTC 날짜와 KST 날짜는 **서로 다르다**. UTC 날짜를 쓰면 여기서 하루가 밀린다.
 */
test("발행 cron 이 도는 15:10 UTC 는 KST 로 이미 다음 날이다", () => {
  const cronInstant = new Date("2026-08-18T15:10:00Z");
  assert.equal(cronInstant.toISOString().slice(0, 10), "2026-08-18", "UTC 날짜는 08-18 이지만");
  assert.equal(kstYmdToday(cronInstant), "2026-08-19", "업무 날짜는 KST 08-19 여야 한다");
  assert.equal(kstYmdTomorrow(cronInstant), "2026-08-20");
});

test("UTC 와 KST 의 날짜가 갈리는 구간 전체에서 KST 를 따른다", () => {
  // 15:00Z 부터 자정까지는 KST 로 다음 날이다.
  assert.equal(kstYmdToday(new Date("2026-08-19T14:59:59Z")), "2026-08-19");
  assert.equal(kstYmdToday(new Date("2026-08-19T15:00:00Z")), "2026-08-20");
  assert.equal(kstYmdToday(new Date("2026-08-19T23:59:59Z")), "2026-08-20");
  assert.equal(kstYmdToday(new Date("2026-08-20T00:00:00Z")), "2026-08-20");
});

test("kstYmdNextDay 는 달·해·윤년 경계를 넘긴다", () => {
  assert.equal(kstYmdNextDay("2026-08-31"), "2026-09-01");
  assert.equal(kstYmdNextDay("2026-12-31"), "2027-01-01");
  assert.equal(kstYmdNextDay("2028-02-28"), "2028-02-29"); // 2028 은 윤년
  assert.equal(kstYmdNextDay("2027-02-28"), "2027-03-01"); // 2027 은 평년
});

test("kstYmdNextDay 는 형식이 어긋나면 조용히 넘기지 않고 던진다", () => {
  for (const bad of ["2026-8-1", "20260819", "", "오늘"]) {
    assert.throws(() => kstYmdNextDay(bad), /YYYY-MM-DD/, `거부해야 한다: ${JSON.stringify(bad)}`);
  }
});

/**
 * 하루치 발행은 하나의 기준 날짜에서 오늘·내일을 도출해야 한다. 두 값을 각각 시계에서
 * 읽으면 자정 경계에서 today=D / tomorrow=D+2 가 나온다 — 그 계약을 여기서 고정한다.
 */
test("오늘과 내일은 항상 하루 차이다(자정 직전 인스턴트 포함)", () => {
  const justBeforeMidnight = kstWallClock("2026-08-19T23:59:59.999");
  const runDate = kstYmdToday(justBeforeMidnight);
  assert.equal(kstYmdNextDay(runDate), kstYmdTomorrow(justBeforeMidnight));
});
