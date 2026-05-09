/**
 * @jest-environment node
 */

let __premiumReportTestUtils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __premiumReportTestUtils = mod.__premiumReportTestUtils;
});

describe("Premium Report Feature Spec", () => {
  test("featureType -> legacy reportType 매핑", () => {
    const { resolvePremiumTypePair } = __premiumReportTestUtils;

    expect(resolvePremiumTypePair("", "saju_life_book").reportType).toBe("lifeBook");
    expect(resolvePremiumTypePair("", "saju_love_secret").reportType).toBe("loveSecret");
    expect(resolvePremiumTypePair("", "jamidusu_premium").reportType).toBe("ziweiPremium");
    expect(resolvePremiumTypePair("", "sookyo_premium").reportType).toBe("sookyoPremium");
    expect(resolvePremiumTypePair("", "vedic_premium").reportType).toBe("vedicPremium");
    expect(resolvePremiumTypePair("", "astrology_premium").reportType).toBe("westernAstrologyPremium");
  });

  test("legacy reportType 입력도 featureType으로 역정규화", () => {
    const { resolvePremiumTypePair } = __premiumReportTestUtils;
    const mapped = resolvePremiumTypePair("westernAstrologyPremium", "");
    expect(mapped.featureType).toBe("astrology_premium");
  });

  test("chapter 길이 검증: 최소 미달이면 CHAPTER_TOO_SHORT", () => {
    const { validateChapterLength } = __premiumReportTestUtils;
    const result = validateChapterLength({
      reportType: "lifeBook",
      featureType: "saju_life_book",
      mode: "default",
      chapterId: 1,
      text: "짧은 텍스트",
    });

    expect(result.ok).toBe(false);
    expect(result.warnings).toContain("CHAPTER_TOO_SHORT");
    expect(result.chapterMin).toBeGreaterThan(0);
  });

  test("전체 길이 검증: 최소치 충족 시 ok=true", () => {
    const { validateFullReportLength } = __premiumReportTestUtils;
    const chapterText = "가".repeat(7000);
    const result = validateFullReportLength({
      reportType: "lifeBook",
      featureType: "saju_life_book",
      mode: "default",
      chapterTextList: Array.from({ length: 13 }, () => chapterText),
    });

    expect(result.ok).toBe(true);
    expect(result.totalLength).toBeGreaterThanOrEqual(result.minTotalChars);
  });
});
