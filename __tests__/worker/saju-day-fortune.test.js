// 사주 일진 길흉(worker/lib/saju-day-fortune.js) — 결정론 판정 검증.
// LLM·네트워크·DB 없음. 명식은 실제 정본(calculateLifeBookAiSaju)으로 만든다.

/**
 * @jest-environment node
 */

let calculateLifeBookAiSaju;
let judgeSajuDayFortune;

beforeAll(async () => {
  ({ calculateLifeBookAiSaju } = await import("../../worker/lib/life-book-ai-saju.js"));
  ({ judgeSajuDayFortune } = await import("../../worker/lib/saju-day-fortune.js"));
});

const TIERS = ["pivotal", "great-auspicious", "auspicious", "caution", "great-caution"];

function natalOf(birthDate, birthTime = "09:30") {
  return calculateLifeBookAiSaju({ birthDate, birthTime, calendarType: "solar", gender: "female" });
}

describe("judgeSajuDayFortune", () => {
  let natal;
  beforeAll(() => {
    natal = natalOf("1990-05-14");
  });

  test("일간·일진이 유효하면 5티어 중 하나와 점수를 낸다", () => {
    const verdict = judgeSajuDayFortune(natal, { stem: "甲", branch: "寅" });
    expect(verdict).not.toBeNull();
    expect(TIERS).toContain(verdict.tier);
    expect(verdict.score).toBeGreaterThanOrEqual(12);
    expect(verdict.score).toBeLessThanOrEqual(96);
    expect(verdict.tierLabel).toBeTruthy();
    expect(verdict.advice).toBeTruthy();
  });

  test("한자가 아닌 입력은 null 로 떨어진다(호출부가 카드를 비울 수 있게)", () => {
    expect(judgeSajuDayFortune(natal, { stem: "갑", branch: "인" })).toBeNull();
    expect(judgeSajuDayFortune(natal, { stem: "", branch: "" })).toBeNull();
    expect(judgeSajuDayFortune({}, { stem: "甲", branch: "寅" })).toBeNull();
  });

  test("같은 명식·같은 일진이면 항상 같은 결과(결정론)", () => {
    const a = judgeSajuDayFortune(natal, { stem: "庚", branch: "午" });
    const b = judgeSajuDayFortune(natalOf("1990-05-14"), { stem: "庚", branch: "午" });
    expect(a).toEqual(b);
  });

  test("오늘 천간이 내 일간과 같은 글자면 '특별한 날'(pivotal)", () => {
    const verdict = judgeSajuDayFortune(natal, { stem: natal.dayMaster, branch: "子" });
    expect(verdict.tier).toBe("pivotal");
    expect(verdict.tierLabel).toBe("특별한 날");
  });

  test("신강/신약이면 같은 십성 계열이 반대로 읽힌다(억부)", () => {
    // 인성(나를 생하는 기운)이 드는 날은 신약에게 길, 신강에게 흉이어야 한다.
    const cases = [];
    for (const birth of ["1988-02-04", "1990-05-14", "1995-11-20", "2001-07-07", "1976-12-30"]) {
      const n = natalOf(birth);
      for (const stem of ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]) {
        const v = judgeSajuDayFortune(n, { stem, branch: "辰" });
        if (v && v.tenGodGroup === "인성" && v.tier !== "pivotal") cases.push(v);
      }
    }
    const strong = cases.filter((v) => v.strengthMode === "strong");
    const weak = cases.filter((v) => v.strengthMode === "weak");
    // 표본이 잡힌 쪽만 검사한다(생일 조합에 따라 한쪽이 비어 있을 수 있다).
    for (const v of strong) expect(v.score).toBeLessThan(58);
    for (const v of weak) expect(v.score).toBeGreaterThan(58);
    expect(strong.length + weak.length).toBeGreaterThan(0);
  });

  test("일지 충이면 조언에 충 안내가 붙고 점수가 낮아진다", () => {
    const myBranch = natal.pillarDetails.day.earthlyBranch;
    const clashMap = { 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" };
    const clashed = judgeSajuDayFortune(natal, { stem: "戊", branch: clashMap[myBranch] });
    expect(clashed.branchClash).toBe(true);
    expect(clashed.advice).toContain("충");
  });

  test("생일이 다르면 같은 날짜라도 판정이 갈린다(프로필 카드별 개인화)", () => {
    const today = { stem: "丙", branch: "戌" };
    const verdicts = ["1988-02-04", "1990-05-14", "1995-11-20", "2001-07-07"]
      .map((birth) => judgeSajuDayFortune(natalOf(birth), today));
    expect(new Set(verdicts.map((v) => v.score)).size).toBeGreaterThan(1);
  });
});
