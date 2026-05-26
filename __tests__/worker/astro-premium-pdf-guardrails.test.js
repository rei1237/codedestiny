/**
 * @jest-environment node
 */

let __astroTestUtils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __astroTestUtils = mod.__astroTestUtils;
});

describe("Western astrology premium PDF guardrails", () => {
  test("10챕터 고정 순서와 섹션 계약을 유지한다", () => {
    const chapters = __astroTestUtils.ASTRO_WESTERN_PDF_CHAPTERS;
    expect(Array.isArray(chapters)).toBe(true);
    expect(chapters).toHaveLength(10);
    expect(chapters.map((row) => row.id)).toEqual([
      "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10",
    ]);
    chapters.forEach((chapter) => {
      expect(Array.isArray(chapter.sections)).toBe(true);
      expect(chapter.sections.length).toBeGreaterThanOrEqual(5);
      chapter.sections.forEach((section) => {
        expect(typeof section.title).toBe("string");
        expect(section.title.length).toBeGreaterThan(2);
        expect(typeof section.dataBinding).toBe("object");
      });
    });
  });

  test("15도 고정 mock chart를 거부한다", () => {
    const chart = {
      ascendant: { degree: 15, signKo: "사자자리" },
      midheaven: { degree: 15, signKo: "전갈자리" },
      planets: {
        Sun: { degree: 15, signKo: "양자리", house: 1 },
        Moon: { degree: 15, signKo: "황소자리", house: 2 },
        Mercury: { degree: 15, signKo: "쌍둥이자리", house: 3 },
        Venus: { degree: 15, signKo: "게자리", house: 4 },
        Mars: { degree: 15, signKo: "사자자리", house: 5 },
        Jupiter: { degree: 15, signKo: "처녀자리", house: 6 },
        Saturn: { degree: 15, signKo: "천칭자리", house: 7 },
      },
    };

    expect(() => __astroTestUtils.assertNotMockAstroChart(chart)).toThrow("ASTRO_MOCK_CHART_DETECTED");
  });

  test("금지 문구/테이블/페이지 깨짐 텍스트는 섹션 검증에서 탈락한다", () => {
    const badText = [
      "### 1. 사용 데이터 요약표",
      "| 항목 | 값 |",
      "|---|---|",
      "본문 길이 1200",
      "Page 0 / 0",
    ].join("\n");

    expect(__astroTestUtils.validateAstroSectionText(badText, 100)).toBe(false);
    expect(__astroTestUtils.hasBrokenPageCounter("Code Destiny Premium Report Page 0 / 0")).toBe(true);
  });

  test("사용자용 텍스트 정제 시 내부 메타와 테이블을 제거한다", () => {
    const raw = [
      "리포트 ID: astro_123",
      "완료 챕터: 12/12",
      "### 1. 사용 데이터 요약표",
      "| 항목 | 값 |",
      "| ASC | 사자자리 15.0° |",
      "이 문장은 유지됩니다.",
    ].join("\n");

    const sanitized = __astroTestUtils.sanitizeAstroUserFacingText(raw);
    expect(sanitized.includes("리포트 ID")).toBe(false);
    expect(sanitized.includes("사용 데이터 요약표")).toBe(false);
    expect(sanitized.includes("| 항목 | 값 |")).toBe(false);
    expect(sanitized.includes("이 문장은 유지됩니다.")).toBe(true);
  });

  test("챕터 섹션은 설정된 카테고리 순서로 정규화되어야 한다", () => {
    const canonical = {
      user: { name: "테스터" },
      planets: [],
      houses: [],
      aspects: [],
      angles: {},
      validation: { missingFields: [] },
    };
    const chapterMeta = { key: "C1", title: "CH.1 코어 성향 프로파일" };
    const llmText = [
      "### 4. 1-4. 가장 강하게 작동하는 행성 신호",
      "강한 에너지 본문입니다.",
      "",
      "### 1. 1-1. 태양·달·상승궁으로 보는 핵심 자아",
      "ASC/MC 핵심 본문입니다.",
      "",
      "### 5. 1-5. 이번 차트의 핵심 키워드",
      "반복 패턴 본문입니다.",
    ].join("\n");

    const normalized = __astroTestUtils.materializeAstroSectionBlocks(llmText, canonical, chapterMeta);
    expect(Array.isArray(normalized.sections)).toBe(true);
    expect(normalized.sections).toHaveLength(5);
    expect(normalized.sections[0].title).toBe("1-1. 태양·달·상승궁으로 보는 핵심 자아");
    expect(normalized.sections[3].title).toBe("1-4. 가장 강하게 작동하는 행성 신호");
    expect(String(normalized.markdown)).toContain("### 1. 1-1. 태양·달·상승궁으로 보는 핵심 자아");
    expect(String(normalized.markdown)).toContain("### 4. 1-4. 가장 강하게 작동하는 행성 신호");
  });

  test("섹션 본문이 너무 짧으면 자동 보강 없이 원문이 유지된다", () => {
    const canonical = {
      user: { name: "테스터" },
      planets: [],
      houses: [],
      aspects: [],
      angles: {},
      validation: { missingFields: [] },
    };
    const chapterMeta = { key: "C1", title: "CH.1 코어 성향 프로파일" };
    const llmText = [
      "### 1. 1-1. 태양·달·상승궁으로 보는 핵심 자아",
      "짧은 본문",
      "",
      "### 2. 1-2. 차트 전체에서 가장 강한 원소와 양식",
      "짧은 본문",
      "",
      "### 3. 1-3. 인생에서 반복되는 핵심 패턴",
      "짧은 본문",
      "",
      "### 4. 1-4. 가장 강하게 작동하는 행성 신호",
      "짧은 본문",
      "",
      "### 5. 1-5. 이번 차트의 핵심 키워드",
      "짧은 본문",
    ].join("\n");

    const normalized = __astroTestUtils.materializeAstroSectionBlocks(llmText, canonical, chapterMeta);
    expect(normalized.sections).toHaveLength(5);
    expect(typeof normalized.sections[0].body).toBe("string");
    expect(normalized.sections[0].body.length).toBeGreaterThan(0);
    expect(normalized.sections.every((section) => section.body.length > 0)).toBe(true);
  });
});
