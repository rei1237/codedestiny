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

  test("신규 별칭 입력도 정규 reportType/featureType으로 정규화", () => {
    const { resolvePremiumTypePair } = __premiumReportTestUtils;

    expect(resolvePremiumTypePair("ziwei-deep-report", "").reportType).toBe("ziweiPremium");
    expect(resolvePremiumTypePair("saju-love-book", "").reportType).toBe("loveSecret");
    expect(resolvePremiumTypePair("western-astrology-premium", "").reportType).toBe("westernAstrologyPremium");
    expect(resolvePremiumTypePair("", "ziwei-life-book").featureType).toBe("jamidusu_premium");
    expect(resolvePremiumTypePair("sukyo-premium", "").reportType).toBe("sookyoPremium");
  });

  test("/api/premium-report/start 입력을 기존 Worker 파이프라인 입력으로 정규화", () => {
    const { normalizePremiumStartRequestBody, getPremiumRoutePriceMeta } = __premiumReportTestUtils;
    const normalized = normalizePremiumStartRequestBody({
      reportKind: "ziwei-premium",
      userInput: { year: 1992, month: 6, day: 15 },
    });

    expect(normalized.reportType).toBe("ziweiPremium");
    expect(normalized.featureType).toBe("jamidusu_premium");
    expect(normalized.requestBody.year).toBe(1992);

    const price = getPremiumRoutePriceMeta(normalized.reportType, normalized.requestBody);
    expect(price).toMatchObject({
      reportKind: "ziwei-premium",
      featureKey: "premium_pdf_ziwei",
      priceCoins: 590,
    });
  });

  test("Gemini timeout 계열 챕터 실패는 524 retryable 상태로 정규화", () => {
    const { normalizePremiumChapterFailureStatus } = __premiumReportTestUtils;
    expect(normalizePremiumChapterFailureStatus(500, "GEMINI_TIMEOUT", "응답 시간 초과")).toBe(524);
    expect(normalizePremiumChapterFailureStatus(500, "RATE_LIMIT", "quota exceeded")).toBe(429);
  });

  test("prepare 진단 스키마 헬퍼가 reportType별 필수 키를 제공", () => {
    const { getPremiumExpectedSchema } = __premiumReportTestUtils;
    const ziwei = getPremiumExpectedSchema("ziweiPremium");
    const sookyo = getPremiumExpectedSchema("sookyoPremium");
    const vedic = getPremiumExpectedSchema("vedicPremium");
    const astro = getPremiumExpectedSchema("westernAstrologyPremium");

    expect(Array.isArray(ziwei.requestKeys)).toBe(true);
    expect(ziwei.requestKeys).toContain("normalizedData");
    expect(ziwei.requiredNormalizedKeys).toContain("normalizedData.palaces");
    expect(ziwei.requiredNormalizedKeys).toContain("normalizedData.chart");

    expect(Array.isArray(sookyo.requestKeys)).toBe(true);
    expect(sookyo.requiredNormalizedKeys).toContain("normalizedData.宿曜");
    expect(sookyo.requiredNormalizedKeys).toContain("normalizedData.mansionAnalysis");

    expect(Array.isArray(vedic.requestKeys)).toBe(true);
    expect(vedic.requiredNormalizedKeys).toContain("normalizedData.chart");
    expect(vedic.requiredNormalizedKeys).toContain("normalizedData.dasha");

    expect(Array.isArray(astro.requestKeys)).toBe(true);
    expect(astro.requiredNormalizedKeys).toContain("normalizedData.natalChart");
    expect(astro.requiredNormalizedKeys).toContain("normalizedData.analysis");
  });

  test("정규화 데이터 요약 헬퍼가 ziwei 핵심 통계를 계산", () => {
    const { getPremiumNormalizedDataSummary } = __premiumReportTestUtils;
    const summary = getPremiumNormalizedDataSummary("ziweiPremium", {
      input: { year: 1991, month: 7, day: 11 },
      calculatedData: {
        chart: { mingGong: "명궁" },
        palaces: [
          { mainStars: [{ name: "자미" }] },
          { mainStars: [] },
        ],
      },
    });

    expect(summary.hasBirthInfo).toBe(true);
    expect(summary.hasZiweiChart).toBe(true);
    expect(summary.palaceCount).toBe(2);
    expect(summary.majorStarCount).toBe(1);
  });

  test("정규화 데이터 요약 헬퍼가 sookyo 핵심 통계를 계산", () => {
    const { getPremiumNormalizedDataSummary } = __premiumReportTestUtils;
    const summary = getPremiumNormalizedDataSummary("sookyoPremium", {
      input: { year: 1991, month: 7, day: 11 },
      calculatedData: {
        "宿曜": { birthMansion: "각" },
        compatibility: { relationType: "상생" },
      },
    });

    expect(summary.hasBirthInfo).toBe(true);
    expect(summary.hasSukuyo).toBe(true);
    expect(summary.hasCompatibility).toBe(true);
  });

  test("정규화 데이터 요약 헬퍼가 vedic 핵심 통계를 계산", () => {
    const { getPremiumNormalizedDataSummary } = __premiumReportTestUtils;
    const summary = getPremiumNormalizedDataSummary("vedicPremium", {
      input: { year: 1991, month: 7, day: 11 },
      calculatedData: {
        chart: {
          lagna: "Mithuna",
          planets: [{ name: "Sun" }, { name: "Moon" }],
          houses: [{ house: 1 }],
        },
      },
    });

    expect(summary.hasBirthInfo).toBe(true);
    expect(summary.hasVedicChart).toBe(true);
    expect(summary.planetCount).toBe(2);
    expect(summary.houseCount).toBe(1);
  });

  test("정규화 데이터 요약 헬퍼가 western astrology 핵심 통계를 계산", () => {
    const { getPremiumNormalizedDataSummary } = __premiumReportTestUtils;
    const summary = getPremiumNormalizedDataSummary("westernAstrologyPremium", {
      input: { year: 1991, month: 7, day: 11 },
      calculatedData: {
        natalChart: {
          sunSign: "Gemini",
          ascendant: "Gemini",
          planets: [{ name: "Sun" }, { name: "Moon" }, { name: "Saturn" }],
          houses: [{ house: 1 }, { house: 2 }],
          aspects: [{ type: "square" }],
        },
      },
    });

    expect(summary.hasBirthInfo).toBe(true);
    expect(summary.hasAstroChart).toBe(true);
    expect(summary.planetCount).toBe(3);
    expect(summary.houseCount).toBe(2);
    expect(summary.aspectCount).toBe(1);
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
