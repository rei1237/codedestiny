/**
 * @jest-environment node
 */

let astro;

function makeInput(overrides = {}) {
  return {
    year: 1992,
    month: 6,
    day: 15,
    hour: 12,
    minute: 30,
    timezone: 9,
    lat: 37.5665,
    lon: 126.978,
    houseSystem: "placidus",
    zodiacType: "tropical",
    includeMinorAspects: true,
    ...overrides,
  };
}

function makeBody(overrides = {}) {
  return {
    name: "테스터",
    gender: "F",
    birthPlace: "서울",
    timezoneName: "Asia/Seoul",
    ...overrides,
  };
}

function makeCanonical(input = makeInput(), body = makeBody()) {
  const raw = astro.buildWesternChart(input);
  const chart = astro.buildWesternPremiumChart(raw, input, {
    houseSystem: input.houseSystem,
    zodiacType: input.zodiacType,
    includeMinorAspects: input.includeMinorAspects,
    strictHouseCusps: false,
  });
  return astro.buildCanonicalAstroChart(body, input, chart, "personal", null, null, null, null);
}

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  astro = mod.__astroTestUtils;
});

describe("Astro canonical pipeline regression", () => {
  test("1) 정상 차트는 canonical 12챕터/카테고리 구조를 생성해야 한다", () => {
    const canonical = makeCanonical();
    const normalized = astro.normalizeAstrologyPdfPayload(canonical);
    const chapters = astro.buildCanonicalAstroPdfChapters(normalized);

    expect(chapters).toHaveLength(12);
    expect(chapters.map((c) => c.id)).toEqual(["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12"]);
    expect(chapters.every((c) => Array.isArray(c.categories) && c.categories.length >= 5)).toBe(true);
  });

  test("2) 일부 데이터 누락 payload도 normalize 후 안전한 기본값을 가져야 한다", () => {
    const normalized = astro.normalizeAstrologyPdfPayload({
      profile: { name: "테스터", birth: { date: "1992-06-15" } },
      planets: [{ nameEn: "Sun", sign: "Gemini" }],
      houses: [{ house: 1 }],
      aspects: [],
      angles: {},
    });

    expect(normalized.user.birthDate).toBe("1992-06-15");
    expect(Array.isArray(normalized.chart.planets)).toBe(true);
    expect(normalized.chart.planets[0].sign).toBe("Gemini");
    expect(normalized.chart.houses[0].sign).toBe("미확인");
  });

  test("3) 카테고리 seed는 데이터 근거 문장을 포함해야 한다", () => {
    const canonical = makeCanonical();
    const normalized = astro.normalizeAstrologyPdfPayload(canonical);
    const chapters = astro.buildCanonicalAstroPdfChapters(normalized);
    const seed = astro.buildAstroCategorySeed(chapters[0].categories[0], normalized);

    expect(typeof seed).toBe("string");
    expect(seed.length).toBeGreaterThan(50);
    expect(seed.includes("근거")).toBe(true);
  });

  test("4) 저품질/반복 문장은 normalize 시 로컬 fallback으로 교체되어야 한다", () => {
    const canonical = makeCanonical();
    const normalized = astro.normalizeAstrologyPdfPayload(canonical);
    const repeated = "이번 주에는 추진할 것·보류할 것·점검할 것을 분리해 실행하세요.";
    const raw = `${repeated}\n${repeated}\n${repeated}`;
    const result = astro.normalizeAstroSectionResult({
      chapterId: "C1",
      categoryId: "c1_s1",
      categoryTitle: "ASC/MC/태양/달 핵심 구조",
      localSeedText: "핵심 근거를 기반으로 선택 패턴을 정리합니다.",
    }, raw, normalized);

    expect(astro.isLowQualityAstroSection(raw)).toBe(true);
    expect(result.source).toBe("local-fallback");
    expect(result.body.includes("실행 전략")).toBe(true);
  });

  test("5) normalize 결과는 챕터 미리보기 렌더 가능한 본문을 반환해야 한다", () => {
    const canonical = makeCanonical();
    const normalized = astro.normalizeAstrologyPdfPayload(canonical);
    const result = astro.normalizeAstroSectionResult({
      chapterId: "C1",
      categoryId: "c1_s2",
      categoryTitle: "차트 전체 기질",
      localSeedText: "원소와 양식 불균형을 현실 행동으로 연결합니다.",
    }, "", normalized);

    expect(typeof result.body).toBe("string");
    expect(result.body.trim().length).toBeGreaterThan(120);
    expect(result.title).toBe("차트 전체 기질");
  });
});
