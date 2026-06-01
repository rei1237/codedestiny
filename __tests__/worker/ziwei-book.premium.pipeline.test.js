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

  test("birthProfile의 birthDate/birthTime 별칭도 정규화해야 한다", () => {
    const normalized = utils.normalizeInput({
      birthProfile: {
        name: "테스터",
        gender: "F",
        birthDate: "1991.02.20",
        birthTime: "07:00",
        birth: {
          calType: "solar",
        },
      },
    });

    expect(normalized.ok).toBe(true);
    expect(normalized.birthInput.birthDate).toBe("1991-02-20");
    expect(normalized.birthInput.birthHour).toBe(7);
    expect(normalized.profile.birthIso).toBe("1991-02-20 07:00");
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
    const sentence = `${chapterTitle}의 ${title}에서는 명궁, 신궁, 12궁의 흐름과 주성·보조성·사화 신호를 연결해 현실 전략으로 풀어냅니다. 화록, 화권, 화과, 화기와 대운, 그리고 3년·5년·10년 계획까지 함께 반영해 읽습니다. `;
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
    expect(seed.ziweiPdfSeed.groundTruth).toBeTruthy();
    expect(seed.ziweiPdfSeed.groundTruth.palaces.length).toBeGreaterThanOrEqual(12);
    expect(seed.ziweiPdfSeed.groundTruth.starInventory.mainStars.length).toBeGreaterThan(0);
    expect(seed.ziweiPdfSeed.groundTruth.starInventory.assistantStars.length).toBeGreaterThan(0);
    expect(seed.ziweiPdfSeed.groundTruth.starInventory.maleficStars.length).toBeGreaterThan(0);
    expect(seed.ziweiPdfSeed.groundTruth.transformations.length).toBeGreaterThan(0);
    expect(Array.isArray(seed.ziweiPdfSeed.derivedSignals.personalitySignals)).toBe(true);
    expect(Array.isArray(seed.ziweiPdfSeed.cautionFlags)).toBe(true);
    expect(Array.isArray(seed.ziweiPdfSeed.strengths)).toBe(true);
  });

  test("Ziwei 로컬 챕터 가이드는 카테고리별 상담문을 충분 길이로 만들어야 한다", () => {
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

    const guide = utils.buildZiweiLocalChapterGuide({
      seed,
      blueprint: utils.CHAPTER_BLUEPRINTS[0],
      chapterIndex: 0,
      categoryIndex: 0,
      pass: 1,
      categoryTitle: utils.CHAPTER_BLUEPRINTS[0].categories[0],
    });

    expect(guide.title).toBe(utils.CHAPTER_BLUEPRINTS[0].categories[0]);
    expect(Array.isArray(guide.paragraphs)).toBe(true);
    expect(guide.paragraphs.length).toBe(4);
    expect(guide.body.length).toBeGreaterThanOrEqual(700);
    expect(guide.body).toContain("명궁");
    expect(guide.body).toContain("신궁");
  });

  test("로컬 상담문에는 개발/프롬프트 문구가 노출되면 안 된다", () => {
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

    const guide = utils.buildZiweiLocalChapterGuide({
      seed,
      blueprint: utils.CHAPTER_BLUEPRINTS[0],
      chapterIndex: 0,
      categoryIndex: 0,
      pass: 1,
      categoryTitle: utils.CHAPTER_BLUEPRINTS[0].categories[0],
    });

    const banned = [
      "기본 상담 어조",
      "기본 질문 패턴",
      "기본 톤 규칙",
      "프롬프트",
      "fallback",
      "skeleton",
      "JSON",
      "LLM",
      "작성됩니다",
      "데이터 근거 중심",
      "career 축",
    ];
    for (const token of banned) {
      expect(guide.body.includes(token)).toBe(false);
    }
  });

  test("로컬 챕터 품질 검증은 13챕터/5카테고리 구조를 통과시켜야 한다", () => {
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

    // Chapter 13 키워드 요건(1년/3년/10년) 보강
    chapters[12].categories[3].finalText += " 앞으로 1년·3년·10년 전략을 분리해 실행 우선순위를 제시합니다.";

    const quality = utils.validateZiweiPdfChapterQuality({
      chapters,
      expectedChapters: utils.CHAPTER_BLUEPRINTS,
      seed,
    });

    expect(quality.ok).toBe(true);
    expect(quality.totalChars).toBeGreaterThanOrEqual(42000);
    expect(utils.validateNoZiweiPdfRepetition(chapters).ok).toBe(true);
  });

  test("blueprint는 13챕터이며 각 챕터는 5개 카테고리를 가져야 한다", () => {
    expect(utils.CHAPTER_BLUEPRINTS.length).toBe(13);
    utils.CHAPTER_BLUEPRINTS.forEach((chapter) => {
      expect(Array.isArray(chapter.categories)).toBe(true);
      expect(chapter.categories.length).toBe(5);
    });
  });

  test("seed 정규화는 부처궁 오타를 부부궁으로 보정하고 12궁을 채워야 한다", () => {
    const profile = {
      name: "테스터",
      gender: "female",
      year: 1992,
      month: 1,
      day: 5,
      hour: 9,
      minute: 0,
      calendarType: "solar",
      birthplace: "대한민국",
    };

    const seed = utils.buildZiweiPdfSeed(profile, {
      chartMeta: { mingGong: "자", shenGong: "오" },
      palaces: [
        {
          key: "spouse",
          nameKo: "부처궁",
          branch: "자",
          mainStars: [{ name: "자미", strengthName: "묘", strengthSymbol: "◎" }],
          auxStars: [{ name: "문창", strengthName: "리", strengthSymbol: "▲" }],
          maleficStars: [{ name: "경양", strengthName: "함", strengthSymbol: "X" }],
        },
      ],
      transformations: [{ star: "자미", type: "화록" }],
    });

    const palaces = seed.ziweiPdfSeed.groundTruth.palaces;
    expect(Array.isArray(palaces)).toBe(true);
    expect(palaces.length).toBeGreaterThanOrEqual(12);
    expect(palaces.some((p) => p.nameKo === "부부궁")).toBe(true);
  });

  test("카테고리 본문이 700자 미만이면 품질 검증이 실패해야 한다", () => {
    const seed = utils.buildZiweiPdfSeed(
      {
        name: "테스터",
        gender: "male",
        year: 1991,
        month: 2,
        day: 20,
        hour: 7,
        minute: 0,
        calendarType: "solar",
        birthplace: "대한민국",
      },
      {
        chartMeta: { mingGong: "자", shenGong: "오" },
        palaces: makeBasePalaces(),
        transformations: [{ star: "자미", type: "화록" }],
      },
    );

    const shortText = "짧은 문장 ".repeat(40);
    const chapters = utils.CHAPTER_BLUEPRINTS.map((blueprint, chapterIndex) => ({
      id: blueprint.id,
      roman: blueprint.roman,
      title: blueprint.title,
      categories: blueprint.categories.map((categoryTitle, categoryIndex) => ({
        id: `${blueprint.id}-${String(categoryIndex + 1).padStart(2, "0")}`,
        title: categoryTitle,
        finalText: chapterIndex === 0 && categoryIndex === 0 ? shortText : buildLongText(categoryTitle, blueprint.title),
      })),
      source: "llm-original",
    }));

    const quality = utils.validateZiweiPdfChapterQuality({
      chapters,
      expectedChapters: utils.CHAPTER_BLUEPRINTS,
      seed,
    });
    expect(quality.ok).toBe(false);
    expect(Array.isArray(quality.errors)).toBe(true);
    expect(quality.errors.some((code) => String(code).includes("too_short"))).toBe(true);
  });
});
