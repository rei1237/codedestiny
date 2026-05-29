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
  function buildLongText(title, chapterTitle) {
    const sentence = `${chapterTitle}의 ${title}에서는 명궁, 신궁, 12궁의 흐름과 주성·보조성·사화 신호를 연결해 현실 전략으로 풀어냅니다. `;
    return sentence.repeat(22);
  }

  test("ZiweiPdfSeed는 계산 JSON 중심 구조를 가져야 한다", () => {
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

    expect(seed.ziweiPdfSeed).toBeTruthy();
    expect(seed.ziweiPdfSeed.input.birthDate).toBe("1991-02-20");
    expect(seed.ziweiPdfSeed.chartMeta.mingGong).toBeTruthy();
    expect(Array.isArray(seed.ziweiPdfSeed.palaceMap)).toBe(true);
    expect(seed.ziweiPdfSeed.palaceMap.length).toBeGreaterThanOrEqual(12);
    expect(Array.isArray(seed.ziweiPdfSeed.derivedSignals.personalitySignals)).toBe(true);
    expect(Array.isArray(seed.ziweiPdfSeed.cautionFlags)).toBe(true);
    expect(Array.isArray(seed.ziweiPdfSeed.strengths)).toBe(true);
  });

  test("LLM 해석 품질 검증은 13챕터/5섹션 구조를 통과시켜야 한다", () => {
    const chapters = utils.CHAPTER_BLUEPRINTS.map((blueprint, chapterIndex) => ({
      id: blueprint.id,
      roman: blueprint.roman,
      title: blueprint.title,
      categories: blueprint.categories.map((categoryTitle, categoryIndex) => ({
        id: `${blueprint.id}-${String(categoryIndex + 1).padStart(2, "0")}`,
        title: categoryTitle,
        finalText: buildLongText(categoryTitle, blueprint.title),
      })),
      source: "llm-original",
    }));

    // Chapter 13 키워드 요건(3년/5년/10년) 보강
    chapters[12].categories[3].finalText += " 앞으로 3년·5년·10년 전략을 분리해 실행 우선순위를 제시합니다.";

    const quality = utils.validateZiweiPdfLLMInterpretationQuality({
      chapters,
      expectedChapters: utils.CHAPTER_BLUEPRINTS,
      seed: { ziweiPdfSeed: { chartMeta: { mingGong: "자", shenGong: "오" } } },
    });

    expect(quality.ok).toBe(true);
    expect(quality.totalChars).toBeGreaterThanOrEqual(39000);
  });
});
