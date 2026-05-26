/**
 * @jest-environment node
 */

let __astroTestUtils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __astroTestUtils = mod.__astroTestUtils;
});

describe("Western astrology premium PDF guardrails", () => {
  test("12챕터 고정 순서와 최소 섹션 계약을 유지한다", () => {
    const chapters = __astroTestUtils.ASTRO_WESTERN_PDF_CHAPTERS;
    expect(Array.isArray(chapters)).toBe(true);
    expect(chapters).toHaveLength(12);
    expect(chapters.map((row) => row.id)).toEqual([
      "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12",
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
});
