/**
 * @jest-environment node
 */

let buildLifeBookInputData;
let buildSajuLifeBookPdfPayload;
let validateSajuLifeBookPdfPayload;
let buildSajuLifeBookChapterManifest;
let validateLifeBookChapter;
let generateLifeBookPdf;
let LIFE_BOOK_CHAPTERS;

function makeCanonicalChart() {
  return {
    profile: {
      name: "테스트 남성",
      gender: "male",
      birth: {
        solarDate: "1991-02-20",
        time: "08:30",
        timezone: "Asia/Seoul",
        calendarType: "solar",
      },
    },
    fourPillars: {
      year: { stem: "辛", branch: "未", ganji: "辛未", hiddenStems: ["己", "丁", "乙"] },
      month: { stem: "庚", branch: "寅", ganji: "庚寅", hiddenStems: ["甲", "丙", "戊"] },
      day: { stem: "甲", branch: "辰", ganji: "甲辰", hiddenStems: ["戊", "乙", "癸"] },
      hour: { stem: "戊", branch: "辰", ganji: "戊辰", hiddenStems: ["戊", "乙", "癸"] },
    },
    dayMaster: { stem: "甲", strength: "중강" },
    fiveElements: { wood: 32, fire: 11, earth: 28, metal: 17, water: 12 },
    tenGods: { distribution: { 편재: 28, 비견: 22, 정인: 18, 상관: 5, 정관: 7 } },
    usefulGods: {
      yongsin: { element: "화" },
      huisin: { element: "수" },
      gisin: { element: "토" },
    },
    geokguk: { name: "재성격", reason: "재성과 비겁의 균형" },
    twelveStages: { yearStage: "묘", monthStage: "건록", dayMasterStage: "쇠", hourStage: "쇠" },
    luckCycles: {
      currentDaewoon: { pillar: "병술", ageStart: 31, ageEnd: 40 },
      daewoon: [
        { ageStart: 31, ageEnd: 40, pillar: "병술" },
        { ageStart: 41, ageEnd: 50, pillar: "정해" },
      ],
    },
    annualLuck: { year: 2026, ganji: "병오" },
  };
}

function makeBody() {
  return {
    mode: "solo",
    reportType: "saju-life-book",
    name: "테스트 남성",
    gender: "male",
    birthDate: "1991-02-20",
    birthTime: "08:30",
    timezone: "Asia/Seoul",
    calendarType: "solar",
    canonicalSajuChart: makeCanonicalChart(),
  };
}

beforeAll(async () => {
  ({ buildLifeBookInputData } = await import("../../worker/lib/saju/life-book/buildLifeBookInputData.js"));
  ({
    buildSajuLifeBookPdfPayload,
    validateSajuLifeBookPdfPayload,
    buildSajuLifeBookChapterManifest,
  } = await import("../../worker/lib/saju/life-book/lifeBookPdfContract.js"));
  ({ validateLifeBookChapter } = await import("../../worker/lib/saju/life-book/validateLifeBookChapter.js"));
  ({ generateLifeBookPdf } = await import("../../worker/lib/saju/life-book/generateLifeBookPdf.js"));
  ({ LIFE_BOOK_CHAPTERS } = await import("../../worker/lib/saju/life-book/chapterConfig.js"));
});

describe("Saju LifeBook pipeline", () => {
  test("개인 입력값만으로 로컬 사주 엔진 결과 정규화가 가능하다", () => {
    const body = makeBody();
    const input = { year: 1991, month: 2, day: 20, hour: 8, minute: 30, gender: "male" };
    const normalized = buildLifeBookInputData(body, input);

    expect(normalized.userProfile.birthDate).toBe("1991-02-20");
    expect(normalized.sajuChart.dayPillar).toContain("甲");
    expect(normalized.sajuChart.dayMaster).toContain("甲");
    expect(normalized.dataQuality.missingCore).toHaveLength(0);
  });

  test("챕터 매니페스트는 반드시 12챕터이며 각 챕터는 6개 섹션을 가진다", () => {
    const normalized = buildLifeBookInputData(makeBody(), { year: 1991, month: 2, day: 20, hour: 8, minute: 30 });
    const payload = buildSajuLifeBookPdfPayload(normalized, LIFE_BOOK_CHAPTERS);

    expect(payload.chapters).toHaveLength(12);
    payload.chapters.forEach((chapter) => {
      expect(Array.isArray(chapter.categories)).toBe(true);
      expect(chapter.categories.length).toBe(6);
      chapter.categories.forEach((category) => {
        expect(Array.isArray(category.availableSignals)).toBe(true);
        expect(Array.isArray(category.missingSignals)).toBe(true);
      });
    });
  });

  test("payload 검증은 12챕터가 아니면 실패한다", () => {
    const normalized = buildLifeBookInputData(makeBody(), { year: 1991, month: 2, day: 20, hour: 8, minute: 30 });
    const payload = buildSajuLifeBookPdfPayload(normalized, []);
    const result = validateSajuLifeBookPdfPayload({ ...payload, chapters: [{ id: "x" }] });

    expect(result.ok).toBe(false);
    expect(result.missing).toContain("chapters.length(12)");
  });

  test("챕터 품질 검증은 금지 문구와 임시 제목을 차단한다", () => {
    const chapterConfig = {
      id: "chapter-01",
      roman: "I",
      title: "Ch.1 사주 원국 총론",
      subtitle: "",
      minLength: 100,
      requiredCoverage: ["1-1. 사주 전체의 첫인상"],
      focusAreas: ["사주"],
    };

    const bad = validateLifeBookChapter({
      contentMarkdown: "### 1-1. 사주 전체의 첫인상\nChapter 1\nInternal server error\n자동 복구 생성",
      summary: "요약",
      practicalAdvice: ["a", "b", "c"],
      chapterJson: { sections: [{ title: "1-1. 사주 전체의 첫인상", body: "짧음" }] },
    }, chapterConfig, []);

    expect(bad.ok).toBe(false);
    expect(bad.errors).toContain("BANNED_EXPRESSION_FOUND");
  });

  test("LLM 실패 시 PDF 렌더링 대신 retryable 실패를 반환한다", async () => {
    const body = makeBody();
    const normalizedInput = { year: 1991, month: 2, day: 20, hour: 8, minute: 30 };

    const result = await generateLifeBookPdf({
      env: { PREMIUM_PDF_API_PAUSE: "true" },
      body,
      normalizedInput,
      reportId: "test-lifebook-failure",
      strictMode: true,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("SAJU_LIFE_BOOK_LLM_GENERATION_FAILED");
    expect(result.retryable).toBe(true);
    expect(Array.isArray(result.failedSections)).toBe(true);
  });

  test("핵심 계산 데이터 누락 시 즉시 실패하고 retryable=true를 반환한다", async () => {
    const body = {
      mode: "solo",
      reportType: "saju-life-book",
      name: "테스트 남성",
      gender: "male",
      birthDate: "1991-02-20",
      birthTime: "08:30",
      timezone: "Asia/Seoul",
      calendarType: "solar",
      canonicalSajuChart: {
        profile: { name: "테스트 남성", gender: "male", birth: { solarDate: "1991-02-20" } },
      },
    };

    const result = await generateLifeBookPdf({
      env: {},
      body,
      normalizedInput: { year: 1991, month: 2, day: 20, hour: 8, minute: 30 },
      reportId: "test-lifebook-missing-core",
      strictMode: true,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("SAJU_LIFE_BOOK_CORE_SIGNAL_MISSING");
    expect(result.retryable).toBe(true);
  });
});
