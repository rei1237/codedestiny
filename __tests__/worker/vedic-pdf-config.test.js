/**
 * @jest-environment node
 */

describe("Vedic PDF chapter config", () => {
  let VEDIC_PDF_CHAPTERS;

  beforeAll(async () => {
    ({ VEDIC_PDF_CHAPTERS } = await import("../../worker/lib/vedic-premium-chapters.js"));
  });

  test("10챕터가 고정 순서로 존재해야 한다", () => {
    expect(Array.isArray(VEDIC_PDF_CHAPTERS)).toBe(true);
    expect(VEDIC_PDF_CHAPTERS).toHaveLength(10);
    const orders = VEDIC_PDF_CHAPTERS.map((ch) => Number(ch.order));
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("각 챕터는 지정된 최소 5개 이상의 섹션을 가져야 한다", () => {
    for (const chapter of VEDIC_PDF_CHAPTERS) {
      expect(Array.isArray(chapter.sections)).toBe(true);
      expect(chapter.sections.length).toBeGreaterThanOrEqual(5);
    }
  });

  test("다샤/아트마카라카 챕터의 바인딩이 분리되어야 한다", () => {
    const dasha = VEDIC_PDF_CHAPTERS.find((ch) => ch.id === "V9");
    const atmakaraka = VEDIC_PDF_CHAPTERS.find((ch) => ch.id === "V4");

    expect(dasha).toBeTruthy();
    expect(atmakaraka).toBeTruthy();

    const hasDashaBinding = dasha.sections.some((section) => section?.dataBinding?.dasha === true);
    const hasAtmakarakaBinding = atmakaraka.sections.some((section) => section?.dataBinding?.atmakaraka === true);

    expect(hasDashaBinding).toBe(true);
    expect(hasAtmakarakaBinding).toBe(true);
  });

  test("챕터별 세부 카테고리 개수는 스펙과 일치해야 한다", () => {
    const expectedCounts = {
      V1: 5,
      V2: 6,
      V3: 5,
      V4: 5,
      V5: 5,
      V6: 5,
      V7: 5,
      V8: 5,
      V9: 5,
      V10: 6,
    };

    for (const chapter of VEDIC_PDF_CHAPTERS) {
      expect(chapter.sections.length).toBe(expectedCounts[chapter.id]);
      for (const section of chapter.sections) {
        expect(Number(section.minChars || 0)).toBeGreaterThanOrEqual(800);
      }
    }
  });
});
