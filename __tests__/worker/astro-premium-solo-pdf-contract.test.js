/**
 * @jest-environment node
 */

let astro;
let premium;

function buildInput(overrides = {}) {
  return {
    year: 1991,
    month: 2,
    day: 20,
    hour: 8,
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

function buildBody(overrides = {}) {
  return {
    name: "테스트 남성",
    gender: "male",
    birthDate: "1991-02-20",
    birthTime: "08:30",
    timezoneName: "Asia/Seoul",
    timezone: "Asia/Seoul",
    birthPlace: "Seoul, KR",
    lat: 37.5665,
    lon: 126.978,
    ...overrides,
  };
}

function makeCanonical(input = buildInput(), body = buildBody()) {
  const raw = astro.buildWesternChart(input);
  const chart = astro.buildWesternPremiumChart(raw, input, {
    houseSystem: input.houseSystem,
    zodiacType: input.zodiacType,
    includeMinorAspects: input.includeMinorAspects,
    strictHouseCusps: false,
  });
  return astro.buildCanonicalAstroChart(body, input, chart, "personal", null, null, null, null);
}

function buildSectionBodies(titles, bodyFactory) {
  return titles.map((title, idx) => ({
    title,
    body: bodyFactory(title, idx),
  }));
}

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  astro = mod.__astroTestUtils;
  premium = mod.__premiumReportTestUtils;
});

describe("Astro solo PDF contract", () => {
  test("1) 개인 모드 입력만으로 점성술 엔진 계산이 동작해야 한다", () => {
    const input = buildInput();
    const raw = astro.buildWesternChart(input);
    const chart = astro.buildWesternPremiumChart(raw, input, {
      houseSystem: "placidus",
      zodiacType: "tropical",
      includeMinorAspects: true,
      strictHouseCusps: false,
    });

    expect(chart).toBeTruthy();
    expect(chart.planets?.Sun).toBeTruthy();
    expect(Array.isArray(chart.houses)).toBe(true);
    expect(Array.isArray(chart.aspects)).toBe(true);
  });

  test("2) 기본 분석 선행 없이 seed 생성이 가능해야 한다", () => {
    const input = buildInput();
    const body = buildBody();
    const raw = astro.buildWesternChart(input);
    const chart = astro.buildWesternPremiumChart(raw, input, {
      houseSystem: "placidus",
      zodiacType: "tropical",
      includeMinorAspects: true,
      strictHouseCusps: false,
    });

    const seed = astro.buildAstroPdfSeed(body, input, chart, "personal", null, null, null, null);
    expect(seed).toBeTruthy();
    expect(seed.reportPayload).toBeTruthy();
    expect(Array.isArray(seed.reportPayload.chapterInputs)).toBe(true);
  });

  test("3) chapters.length는 10이어야 한다", () => {
    const canonical = makeCanonical();
    const plan = astro.buildAstroChapterPlan(canonical, "personal");
    expect(plan).toHaveLength(10);
  });

  test("4) 각 chapter의 section 수는 계약과 일치해야 한다", () => {
    const chapterSpec = astro.ASTRO_WESTERN_PDF_CHAPTERS;
    const expected = [5, 5, 5, 5, 5, 5, 5, 5, 5, 6];
    expect(chapterSpec).toHaveLength(10);
    expect(chapterSpec.map((c) => c.sections.length)).toEqual(expected);
  });

  test("5) section content가 비어있지 않으면 블록으로 유지되어야 한다", () => {
    const canonical = makeCanonical();
    const chapterMeta = { key: "C1", title: "Ch.1" };
    const text = [
      "### 1. 1-1. 태양·달·상승궁으로 보는 핵심 자아",
      "태양과 달, 상승궁의 핵심 구조를 중심으로 정리한 충분한 본문입니다.",
      "",
      "### 2. 1-2. 차트 전체에서 가장 강한 원소와 양식",
      "원소와 양식 균형을 설명하는 충분한 본문입니다.",
      "",
      "### 3. 1-3. 인생에서 반복되는 핵심 패턴",
      "반복 패턴을 설명하는 충분한 본문입니다.",
      "",
      "### 4. 1-4. 가장 강하게 작동하는 행성 신호",
      "행성 신호를 설명하는 충분한 본문입니다.",
      "",
      "### 5. 1-5. 이번 차트의 핵심 키워드",
      "핵심 키워드를 설명하는 충분한 본문입니다.",
    ].join("\n");

    const blocks = astro.materializeAstroSectionBlocks(text, canonical, chapterMeta);
    expect(blocks.sections).toHaveLength(5);
    expect(blocks.sections.every((s) => String(s.body || "").trim().length > 0)).toBe(true);
  });

  test("6) 태양 섹션은 태양 별자리/하우스 반영이 없으면 실패해야 한다", () => {
    const canonical = makeCanonical();
    const chapterMeta = { key: "C2", title: "Ch.2" };
    const cfg = astro.ASTRO_WESTERN_PDF_CHAPTERS.find((c) => c.id === "C2");
    const badSections = buildSectionBodies(cfg.sections.map((s) => s.title), () => "일반적인 운세 문장만 반복합니다.".repeat(80));
    const result = astro.validateAstroGeneratedSectionsForChapter(badSections, chapterMeta, canonical);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => String(f.reason).includes("SUN"))).toBe(true);
  });

  test("7) 달 섹션은 달 별자리/하우스 반영이 없으면 실패해야 한다", () => {
    const canonical = makeCanonical();
    const chapterMeta = { key: "C3", title: "Ch.3" };
    const cfg = astro.ASTRO_WESTERN_PDF_CHAPTERS.find((c) => c.id === "C3");
    const badSections = buildSectionBodies(cfg.sections.map((s) => s.title), () => "감정에 대한 일반론만 작성합니다.".repeat(80));
    const result = astro.validateAstroGeneratedSectionsForChapter(badSections, chapterMeta, canonical);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => String(f.reason).includes("MOON"))).toBe(true);
  });

  test("8) 상승궁 섹션은 ASC/1하우스 반영이 없으면 실패해야 한다", () => {
    const canonical = makeCanonical();
    const chapterMeta = { key: "C4", title: "Ch.4" };
    const cfg = astro.ASTRO_WESTERN_PDF_CHAPTERS.find((c) => c.id === "C4");
    const badSections = buildSectionBodies(cfg.sections.map((s) => s.title), () => "외향성에 대한 포괄적 설명만 작성합니다.".repeat(80));
    const result = astro.validateAstroGeneratedSectionsForChapter(badSections, chapterMeta, canonical);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => String(f.reason).includes("ASC"))).toBe(true);
  });

  test("9) 커리어 섹션은 MC/10하우스 반영이 없으면 실패해야 한다", () => {
    const canonical = makeCanonical();
    const chapterMeta = { key: "C6", title: "Ch.6" };
    const cfg = astro.ASTRO_WESTERN_PDF_CHAPTERS.find((c) => c.id === "C6");
    const badSections = buildSectionBodies(cfg.sections.map((s) => s.title), () => "직업 일반론만 작성합니다.".repeat(80));
    const result = astro.validateAstroGeneratedSectionsForChapter(badSections, chapterMeta, canonical);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => String(f.reason).includes("MC"))).toBe(true);
  });

  test("10) 관계 섹션은 금성/5하우스/7하우스 신호가 없으면 실패해야 한다", () => {
    const canonical = makeCanonical();
    const chapterMeta = { key: "C7", title: "Ch.7" };
    const cfg = astro.ASTRO_WESTERN_PDF_CHAPTERS.find((c) => c.id === "C7");
    const badSections = buildSectionBodies(cfg.sections.map((s) => s.title), () => "사랑은 소통이 중요하다는 문장만 반복합니다.".repeat(80));
    const result = astro.validateAstroGeneratedSectionsForChapter(badSections, chapterMeta, canonical);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => String(f.reason).includes("RELATION"))).toBe(true);
  });

  test("11) 금지 문구 자동 복구 생성은 섹션 검증에서 실패해야 한다", () => {
    const bad = "자동 복구 생성 문구가 포함된 본문입니다.".repeat(80);
    expect(astro.validateAstroSectionText(bad, 800)).toBe(false);
  });

  test("12) 임시 제목 Chapter 1 문구는 허용되지 않아야 한다", () => {
    const bad = "Chapter 1 이라는 임시 제목이 들어간 본문입니다.".repeat(80);
    expect(astro.validateAstroSectionText(bad, 800)).toBe(false);
  });

  test("13) Internal server error 노출 문구는 허용되지 않아야 한다", () => {
    const bad = "Internal server error 문구가 사용자 본문에 노출됩니다.".repeat(80);
    expect(astro.validateAstroSectionText(bad, 800)).toBe(false);
  });

  test("14) 점성술 payload는 chapterInputs.length=10 계약을 만족해야 한다", () => {
    const input = buildInput();
    const body = buildBody();
    const raw = astro.buildWesternChart(input);
    const chart = astro.buildWesternPremiumChart(raw, input, {
      houseSystem: "placidus",
      zodiacType: "tropical",
      includeMinorAspects: true,
      strictHouseCusps: false,
    });
    const seed = astro.buildAstroPdfSeed(body, input, chart, "personal", null, null, null, null);
    const validated = astro.validateAstroPdfPayload(seed.reportPayload);
    expect(validated.ok).toBe(true);

    const broken = JSON.parse(JSON.stringify(seed.reportPayload));
    broken.chapterInputs = broken.chapterInputs.slice(0, 8);
    const invalid = astro.validateAstroPdfPayload(broken);
    expect(invalid.missingFields).toContain("chapterInputs.length=10");
  });

  test("15) reportType 스펙 chapterCount도 10과 일치해야 한다", () => {
    expect(premium.getPremiumRequiredChapters("westernAstrologyPremium", "personal")).toBe(10);
  });

  test("16) 금지된 raw/payload 노출은 탐지되어야 한다", () => {
    const exposed = "payload: { reportType: westernAstrologyPremium } fallback schema debug";
    expect(astro.hasForbiddenAstroRawDataExposure(exposed, "personal")).toBe(true);
  });

  test("17) 기본 길이/반복 검증은 저품질 본문을 거부해야 한다", () => {
    const repeated = "태양과 달의 긴장각을 다룰 때는 행동 루틴을 정밀하게 분리해 감정 과속을 낮추는 것이 핵심입니다";
    const duplicated = `${repeated}.\n${repeated}.\n${repeated}.`;
    expect(astro.validateAstroSectionText(duplicated, 800)).toBe(false);
  });
});
