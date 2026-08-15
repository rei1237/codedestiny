/**
 * @jest-environment node
 */
// 오늘의 운세 상세 3종(사주·숙요·베다)의 순수 판정 모듈.
// 네트워크·DB·LLM 0. 고정 입력으로만 단언한다.
//
// 판창가(티티·요가·카라나)는 이 레포에 없던 계산이라 경계값을 못박는다.
// 나머지 둘은 기존 정본 함수의 결과를 읽어 쓰는 층이므로 "버려지던 값이 실제로 나오는가"를 본다.

const { Solar } = require("lunar-javascript");
const { calculateLifeBookAiSaju } = require("../../worker/lib/life-book-ai-saju.js");
const { judgeSajuDayFortune, scoreBranchForNatal } = require("../../worker/lib/saju-day-fortune.js");
const { buildSukuyoFromLunar } = require("../../worker/lib/sukuyo-premium.js");
const { judgeDayFortune } = require("../../worker/lib/sukuyo-relation-core.js");
const { buildTodaySajuDetail, buildTodaySajuPublic } = require("../../worker/lib/today-saju-detail.js");
const { buildTodaySukuyoDetail, buildTodaySukuyoPublic } = require("../../worker/lib/today-sukuyo-detail.js");
const { buildTodayVedicPublic, computePanchanga } = require("../../worker/lib/today-vedic-detail.js");

const NATAL = {
  birthDate: "1990-05-14",
  birthTime: "09:30",
  birthTimeUnknown: false,
  calendarType: "solar",
  gender: "female",
};
// 2026-08-15(토)은 신유(辛酉)일이다. 화면 회귀를 잡으려면 날짜가 아니라 간지로 고정해야 한다.
const TODAY_PILLAR = { stem: "辛", branch: "酉" };

function sectionByKey(sections, key) {
  return sections.find((section) => section.key === key) || null;
}

describe("today-saju-detail", () => {
  const natal = calculateLifeBookAiSaju(NATAL);
  const verdict = judgeSajuDayFortune(natal, TODAY_PILLAR);
  const detail = buildTodaySajuDetail({ verdict, natal });

  test("judgeSajuDayFortune 이 버리던 값이 섹션으로 나온다", () => {
    const keys = detail.sections.map((section) => section.key);
    expect(keys).toEqual(expect.arrayContaining(["pillar", "ten-god", "branch-relation", "hours", "remedy"]));
  });

  test("십성은 5계열이 아니라 10종으로 갈려 문장이 다르다", () => {
    const lines = sectionByKey(detail.sections, "ten-god").lines;
    expect(lines[0]).toContain(verdict.tenGod);
    // 비견/겁재가 같은 문장을 받던 것이 이번 작업의 출발점이다.
    const { TEN_GOD_LINE } = require("../../worker/lib/today-saju-detail.js");
    expect(TEN_GOD_LINE["비견"].good).not.toBe(TEN_GOD_LINE["겁재"].good);
    expect(TEN_GOD_LINE["식신"].bad).not.toBe(TEN_GOD_LINE["상관"].bad);
    expect(Object.keys(TEN_GOD_LINE)).toHaveLength(10);
  });

  test("내 일지와 오늘 지지의 관계를 실제로 판정한다(묘↔유 = 충)", () => {
    expect(natal.pillarDetails.day.earthlyBranch).toBe("卯");
    const items = sectionByKey(detail.sections, "branch-relation").items;
    expect(items.map((item) => item.label)).toContain("충");
  });

  test("오늘 지지에 걸리는 신살만 나온다", () => {
    const items = sectionByKey(detail.sections, "shinsal").items;
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.value).toContain("유");
      expect(item.note.length).toBeGreaterThan(5);
    }
  });

  test("시간대는 십이지시를 억부로 점수화해 좋은 때 2·주의 때 1을 낸다", () => {
    const items = sectionByKey(detail.sections, "hours").items;
    expect(items).toHaveLength(2);
    expect(items[0].value.split(" · ")).toHaveLength(2);
    expect(items[1].value).not.toBe(items[0].value);
  });

  test("scoreBranchForNatal 은 십성·계열·가중치를 함께 낸다", () => {
    const scored = scoreBranchForNatal({
      dayMaster: natal.dayMaster,
      branch: "子",
      strengthMode: verdict.strengthMode,
      lackingElement: verdict.lackingElement,
      excessElement: verdict.excessElement,
    });
    expect(scored.tenGod).toBeTruthy();
    expect(typeof scored.weight).toBe("number");
    expect(scoreBranchForNatal({ dayMaster: "X", branch: "子" })).toBeNull();
  });

  test("highlights 는 3개를 넘지 않는다(홈 카드 예산)", () => {
    expect(detail.highlights.length).toBeGreaterThan(0);
    expect(detail.highlights.length).toBeLessThanOrEqual(3);
  });

  test("공개 모드는 개인 값 없이 일진만으로 선다", () => {
    const publicCard = buildTodaySajuPublic(TODAY_PILLAR);
    expect(publicCard.anchor).toBe("오늘의 일진 · 신유일 (금)");
    expect(sectionByKey(publicCard.sections, "zodiac").items[0].value).toContain("띠");
    expect(publicCard.sections.some((section) => section.key === "shinsal")).toBe(false);
    expect(buildTodaySajuPublic({ stem: "X", branch: "酉" })).toBeNull();
  });
});

describe("today-sukuyo-detail", () => {
  function lunarOf(y, m, d) {
    const lunar = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar();
    const raw = Number(lunar.getMonth());
    return { month: Math.abs(raw), day: Number(lunar.getDay()), isLeap: raw < 0 };
  }
  const todayLunar = lunarOf(2026, 8, 15);
  const natalLunar = lunarOf(1990, 5, 14);
  const todayMansion = buildSukuyoFromLunar(todayLunar.month, todayLunar.day, { isLeapMonth: todayLunar.isLeap });
  const natalMansion = buildSukuyoFromLunar(natalLunar.month, natalLunar.day, { isLeapMonth: natalLunar.isLeap });
  const verdict = judgeDayFortune(natalMansion.index, todayMansion.index);
  const detail = buildTodaySukuyoDetail({ verdict, todayMansion, natalMansion });

  test("수(宿)의 속성과 격각 역할이 함께 나온다", () => {
    const keys = detail.sections.map((section) => section.key);
    expect(keys).toEqual(expect.arrayContaining(["mansion", "relation", "mansion-mood", "mansion-traits", "advice"]));
  });

  test("격각 관계·역할·거리·등급을 모두 노출한다(지금까지는 headline 한 줄뿐이었다)", () => {
    const labels = sectionByKey(detail.sections, "relation").items.map((item) => item.label);
    expect(labels).toEqual(["격각 관계", "오늘이 나에게 갖는 자리", "본명수에서의 거리", "오늘의 등급"]);
  });

  test("MANSION_DAY_ADVICE 의 본명수별 조언이 조언 섹션에 실린다", () => {
    expect(sectionByKey(detail.sections, "advice").lines[0]).toBe(verdict.advice);
  });

  test("공개 모드는 본명수 없이 오늘 수만으로 선다", () => {
    const publicCard = buildTodaySukuyoPublic(todayMansion);
    expect(publicCard.anchor).toContain(todayMansion.nameKo);
    expect(publicCard.sections.some((section) => section.key === "relation")).toBe(false);
    expect(buildTodaySukuyoPublic(null)).toBeNull();
  });

  test("27수 전부가 사신·오행 문장을 갖는다(표에 구멍이 없다)", () => {
    const { GUARDIAN_LINE, MANSION_ELEMENT_ACTION } = require("../../worker/lib/today-sukuyo-detail.js");
    for (let index = 0; index < 27; index += 1) {
      const mansion = buildSukuyoFromLunar(1, 1, {}) && require("../../worker/lib/sukuyo-premium.js").getSukuyoByIndex(index);
      expect(GUARDIAN_LINE[mansion.category]).toBeTruthy();
      expect(MANSION_ELEMENT_ACTION[mansion.element]).toBeTruthy();
    }
  });
});

describe("today-vedic-detail — 판창가", () => {
  test("티티는 (달−해)/12 로 1~30, 파크샤 경계가 맞다", () => {
    expect(computePanchanga({ sunLon: 0, moonLon: 0, weekday: 0 }).tithi).toMatchObject({ number: 1, name: "프라티파다" });
    expect(computePanchanga({ sunLon: 0, moonLon: 179.9, weekday: 0 }).tithi).toMatchObject({ number: 15, name: "푸르니마(보름)" });
    expect(computePanchanga({ sunLon: 0, moonLon: 180, weekday: 0 }).tithi).toMatchObject({ number: 16, inPaksha: 1, name: "프라티파다" });
    expect(computePanchanga({ sunLon: 0, moonLon: 359.9, weekday: 0 }).tithi).toMatchObject({ number: 30, name: "아마바스야(그믐)" });
    expect(computePanchanga({ sunLon: 0, moonLon: 100, weekday: 0 }).tithi.paksha).toContain("슈클라");
    expect(computePanchanga({ sunLon: 0, moonLon: 300, weekday: 0 }).tithi.paksha).toContain("크리슈나");
  });

  test("카라나는 60개 중 첫 1개와 마지막 3개가 고정 카라나다", () => {
    const at = (elongation) => computePanchanga({ sunLon: 0, moonLon: elongation, weekday: 0 }).karana;
    expect(at(0)).toMatchObject({ number: 1, name: "킴스투그나" });
    expect(at(6)).toMatchObject({ number: 2, name: "바바" });
    expect(at(48)).toMatchObject({ number: 9, name: "바바" }); // 7종이 8회 순환한다
    expect(at(6 * 57)).toMatchObject({ number: 58, name: "샤쿠니" });
    expect(at(6 * 58)).toMatchObject({ number: 59, name: "차투슈파다" });
    expect(at(6 * 59)).toMatchObject({ number: 60, name: "나가" });
  });

  test("요가는 (해+달)/13°20' 로 1~27이며 아야남사를 더하지 않는다(니라야나 기준)", () => {
    expect(computePanchanga({ sunLon: 0, moonLon: 0, weekday: 0 }).yoga).toMatchObject({ number: 1, name: "비슈캄바" });
    expect(computePanchanga({ sunLon: 10, moonLon: 10, weekday: 0 }).yoga.number).toBe(2);
    expect(computePanchanga({ sunLon: 180, moonLon: 179.9, weekday: 0 }).yoga.number).toBe(27);
    expect(computePanchanga({ sunLon: 180, moonLon: 180, weekday: 0 }).yoga.number).toBe(1); // 360 → 0 으로 감김
  });

  test("라후 칼람은 요일마다 다르고 수요일은 아비지트를 쓰지 않는다", () => {
    const slots = [0, 1, 2, 3, 4, 5, 6].map((weekday) => computePanchanga({ sunLon: 0, moonLon: 30, weekday }).rahuKalam);
    expect(new Set(slots).size).toBe(7);
    expect(computePanchanga({ sunLon: 0, moonLon: 30, weekday: 3 }).abhijit).toBe("");
    expect(computePanchanga({ sunLon: 0, moonLon: 30, weekday: 4 }).abhijit).toBe("11:36~12:24");
  });

  test("황경이 유효하지 않으면 null — 지어내지 않는다", () => {
    expect(computePanchanga({ sunLon: NaN, moonLon: 30, weekday: 0 })).toBeNull();
    expect(computePanchanga({ sunLon: 0, moonLon: undefined, weekday: 0 })).toBeNull();
  });

  test("공개 카드는 판창가 다섯 요소를 모두 항목으로 낸다", () => {
    const panchanga = computePanchanga({ sunLon: 118.4, moonLon: 262.7, weekday: 6 });
    const card = buildTodayVedicPublic({ panchanga, moonLon: 262.7 });
    const labels = sectionByKey(card.sections, "panchanga").items.map((item) => item.label);
    expect(labels).toEqual(["바라(요일)", "티티(음력 일)", "나크샤트라(달자리)", "요가", "카라나"]);
    expect(sectionByKey(card.sections, "muhurta")).toBeTruthy();
    // 다샤는 유료(unlock.nakshatra_dasha_map)다 — 무료 일일 화면에 새어 나오면 안 된다.
    expect(JSON.stringify(card)).not.toMatch(/다샤|안타르|마하다샤/);
  });
});
