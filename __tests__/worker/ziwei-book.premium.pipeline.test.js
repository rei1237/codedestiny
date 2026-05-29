/**
 * @jest-environment node
 */

let utils;

function makeBasePalaces() {
  const palaceKeys = [
    "ming",
    "siblings",
    "spouse",
    "children",
    "wealth",
    "health",
    "travel",
    "friends",
    "career",
    "property",
    "fortune",
    "parents",
  ];
  return palaceKeys.map((key, idx) => ({
    key,
    nameKo: key,
    branch: ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"][idx],
    mainStars: [{ name: idx % 2 === 0 ? "자미" : "무곡", strengthName: idx % 2 === 0 ? "묘" : "득", strengthSymbol: idx % 2 === 0 ? "◎" : "O" }],
    auxStars: [{ name: "문창", strengthName: "리", strengthSymbol: "▲" }],
    maleficStars: [{ name: "경양", strengthName: "함", strengthSymbol: "X" }],
    transformations: [{ star: "자미", type: "화록" }],
  }));
}

beforeAll(async () => {
  const mod = await import("../../worker/routes/ziwei-book.js");
  utils = mod.__ziweiBookTestUtils;
});

describe("ziwei premium birth normalization", () => {
  test("07:00 입력을 birthHour=7로 정규화해야 한다", () => {
    const normalized = utils.normalizeInput({
      birthInput: {
        name: "테스터",
        gender: "male",
        calendarType: "solar",
        birthDate: "1991-02-20",
        birthTime: "07:00",
      },
    });

    expect(normalized.ok).toBe(true);
    expect(normalized.birthInput.birthYear).toBe(1991);
    expect(normalized.birthInput.birthMonth).toBe(2);
    expect(normalized.birthInput.birthDay).toBe(20);
    expect(normalized.birthInput.birthHour).toBe(7);
    expect(normalized.birthInput.birthMinute).toBe(0);
  });

  test("오전 7시, 인시, 07:00 파싱이 모두 동작해야 한다", () => {
    const am = utils.parseHourMinuteFromText("오전 7시");
    const branch = utils.parseHourMinuteFromText("인시");
    const hhmm = utils.parseHourMinuteFromText("07:00");

    expect(am).toMatchObject({ hour: 7, minute: 0 });
    expect(branch).toMatchObject({ hour: 3, minute: 0 });
    expect(hhmm).toMatchObject({ hour: 7, minute: 0 });
  });

  test("출생 시간이 없으면 결제 전 차단 가능한 에러 코드를 반환해야 한다", () => {
    const normalized = utils.normalizeInput({
      birthDate: "1991-02-20",
      year: 1991,
      month: 2,
      day: 20,
      time: "모름",
    });

    expect(normalized.ok).toBe(false);
    expect(normalized.code).toBe("BIRTH_TIME_REQUIRED");
  });
});

describe("ziwei premium local manuscript", () => {
  test("로컬 원고만으로 챕터 품질 기준을 만족해야 한다", () => {
    const profile = {
      name: "테스터",
      gender: "male",
      year: 1991,
      month: 2,
      day: 20,
      hour: 7,
      minute: 0,
      calendarType: "solar",
      birthplace: "대한민국",
    };

    const seed = utils.buildZiweiPdfSeed(profile, {
      chartMeta: {
        mingGong: "자",
        shenGong: "오",
      },
      palaces: makeBasePalaces(),
      transformations: [{ star: "자미", type: "화록" }],
      luck: {
        decadeLuck: [{ label: "31-40", current: true }],
        annual: [{ year: 2026, palace: "ming" }],
      },
    });

    const built = utils.buildLocalChapters(profile, seed, 2);
    const validation = utils.validateChapters(built.chapters);

    expect(built.chapters.length).toBe(utils.CHAPTER_BLUEPRINTS.length);
    expect(validation.ok).toBe(true);
    expect(validation.totalChars).toBeGreaterThanOrEqual(25000);
    expect(utils.computeDuplicateRate(built.chapters)).toBeLessThan(0.45);
  });
});
