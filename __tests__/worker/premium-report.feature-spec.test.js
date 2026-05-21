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
    expect(resolvePremiumTypePair("", "saju_new_year_pdf").reportType).toBe("sajuNewYear");
  });

  test("legacy reportType 입력도 featureType으로 역정규화", () => {
    const { resolvePremiumTypePair } = __premiumReportTestUtils;
    const mapped = resolvePremiumTypePair("westernAstrologyPremium", "");
    expect(mapped.featureType).toBe("astrology_premium");

    const newYearMapped = resolvePremiumTypePair("sajuNewYear", "");
    expect(newYearMapped.featureType).toBe("saju_new_year_pdf");
  });

  test("신규 별칭 입력도 정규 reportType/featureType으로 정규화", () => {
    const { resolvePremiumTypePair } = __premiumReportTestUtils;

    expect(resolvePremiumTypePair("ziwei-deep-report", "").reportType).toBe("ziweiPremium");
    expect(resolvePremiumTypePair("saju-love-book", "").reportType).toBe("loveSecret");
    expect(resolvePremiumTypePair("western-astrology-premium", "").reportType).toBe("westernAstrologyPremium");
    expect(resolvePremiumTypePair("", "ziwei-life-book").featureType).toBe("jamidusu_premium");
    expect(resolvePremiumTypePair("sukuyo-premium", "").reportType).toBe("sookyoPremium");
  });

  test("loveSecret는 현재 premium spec 기준으로 13챕터를 사용한다", () => {
    const { getPremiumRequiredChapters } = __premiumReportTestUtils;

    expect(getPremiumRequiredChapters("loveSecret", "solo")).toBe(13);
    expect(getPremiumRequiredChapters("loveSecret", "compatibility")).toBe(13);
  });

  test("sajuNewYear는 premium spec 기준으로 10챕터를 사용한다", () => {
    const { getPremiumRequiredChapters } = __premiumReportTestUtils;

    expect(getPremiumRequiredChapters("sajuNewYear", "default")).toBe(10);
  });

  test("westernAstrologyPremium은 개인 12챕터 / 궁합 10챕터를 사용한다", () => {
    const { getPremiumRequiredChapters } = __premiumReportTestUtils;

    expect(getPremiumRequiredChapters("westernAstrologyPremium", "personal")).toBe(12);
    expect(getPremiumRequiredChapters("westernAstrologyPremium", "compatibility")).toBe(10);
  });

  test("prepare 진단 스키마 헬퍼가 reportType별 필수 키를 제공", () => {
    const { getPremiumExpectedSchema } = __premiumReportTestUtils;
    const ziwei = getPremiumExpectedSchema("ziweiPremium");
    const sookyo = getPremiumExpectedSchema("sookyoPremium");
    const vedic = getPremiumExpectedSchema("vedicPremium");
    const astro = getPremiumExpectedSchema("westernAstrologyPremium");
    const sajuNewYear = getPremiumExpectedSchema("sajuNewYear");

    expect(Array.isArray(ziwei.requestKeys)).toBe(true);
    expect(ziwei.requestKeys).toContain("normalizedData");
    expect(ziwei.requiredNormalizedKeys).toContain("normalizedData.ziwei.chart.mingGong");
    expect(ziwei.requiredNormalizedKeys).toContain("normalizedData.ziwei.palaces");

    expect(Array.isArray(sookyo.requestKeys)).toBe(true);
    expect(sookyo.requiredNormalizedKeys).toContain("normalizedData.sukuyo.birthStar");
    expect(sookyo.requiredNormalizedKeys).toContain("normalizedData.sukuyo.interpretation");

    expect(Array.isArray(vedic.requestKeys)).toBe(true);
    expect(vedic.requiredNormalizedKeys).toContain("normalizedData.vedic.chart.lagna");
    expect(vedic.requiredNormalizedKeys).toContain("normalizedData.vedic.planets");

    expect(Array.isArray(astro.requestKeys)).toBe(true);
    expect(astro.requiredNormalizedKeys).toContain("normalizedData.westernAstrology.chart.sunSign");
    expect(astro.requiredNormalizedKeys).toContain("normalizedData.westernAstrology.aspects");

    expect(Array.isArray(sajuNewYear.requestKeys)).toBe(true);
    expect(sajuNewYear.requiredNormalizedKeys).toContain("normalizedData.saju.pillars");
    expect(sajuNewYear.requiredNormalizedKeys).toContain("normalizedData.saju.interpretation.yearly");
  });

  test("정규화 데이터 요약 헬퍼가 sajuNewYear 챕터 요구 스키마를 제공", () => {
    const { getPremiumNormalizedDataSummary } = __premiumReportTestUtils;
    const summary = getPremiumNormalizedDataSummary("sajuNewYear", {
      input: { year: 1991, month: 7, day: 11 },
      calculatedData: {},
    });

    expect(summary.ch1.chapterTitle).toBe("연간 파동 총론 - 올해의 기본 기조");
    expect(summary.ch10.chapterTitle).toBe("최종 실행 로드맵 - 연말 회수 전략");
    expect(summary.ch9.requiredPaths).toContain("calculatedData.monthlyLuck");
  });

  test("정규화 데이터 요약 헬퍼가 ziwei 핵심 통계를 계산", () => {
    const { getPremiumNormalizedDataSummary } = __premiumReportTestUtils;
    const summary = getPremiumNormalizedDataSummary("ziweiPremium", {
      input: { year: 1991, month: 7, day: 11 },
      calculatedData: {
        chartMeta: { mingGong: "명궁" },
        palaces: {
          ming: { mainStars: [{ name: "자미" }] },
          spouse: { mainStars: [] },
        },
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
        nativeSook: { nameKo: "각" },
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
        lagna: { name: "Mithuna" },
        planets: { sun: {}, moon: {} },
        houses: [{ house: 1 }],
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
        angles: { ascendant: { sign: "Gemini" } },
        planets: { sun: {}, moon: {}, saturn: {} },
        houses: [{ house: 1 }, { house: 2 }],
        aspects: [{ type: "square" }],
      },
    });

    expect(summary.hasBirthInfo).toBe(true);
    expect(summary.hasAstroChart).toBe(true);
    expect(summary.planetCount).toBe(3);
    expect(summary.houseCount).toBe(2);
    expect(summary.aspectCount).toBe(1);
  });

  test("normalizePremiumRequestBodyForPipeline는 주요 PDF 타입에 strict 기본값을 적용한다", () => {
    const { normalizePremiumRequestBodyForPipeline } = __premiumReportTestUtils;
    const reportTypes = [
      "ziweiPremium",
      "sookyoPremium",
      "westernAstrologyPremium",
      "vedicPremium",
      "lifeBook",
      "loveSecret",
      "sajuNewYear",
    ];

    for (const reportType of reportTypes) {
      const normalized = normalizePremiumRequestBodyForPipeline(reportType, { year: 1991, month: 7, day: 11 });
      expect(normalized._premiumStrictPayload).toBe(true);
      expect(normalized._premiumStrictValidation).toBe(true);
    }
  });

  test("normalizePremiumRequestBodyForPipeline는 profile/birthData 기반 입력을 profileId+birthDate+birthTime으로 정규화한다", () => {
    const { normalizePremiumRequestBodyForPipeline } = __premiumReportTestUtils;
    const reportTypes = ["sookyoPremium", "westernAstrologyPremium", "vedicPremium"];

    for (const reportType of reportTypes) {
      const normalized = normalizePremiumRequestBodyForPipeline(reportType, {
        profile: {
          profileId: "profile-42",
          name: "테스터",
          gender: "F",
          birthDate: "1992-06-15",
          birthTime: "12:30",
          calendarType: "solar",
          timezone: "Asia/Seoul",
        },
        birthData: {
          year: 1992,
          month: 6,
          day: 15,
          hour: 12,
          minute: 30,
          timezone: "Asia/Seoul",
        },
      });

      expect(normalized.profileId).toBe("profile-42");
      expect(normalized.birthDate).toBe("1992-06-15");
      expect(normalized.birthTime).toBe("12:30");
      expect(normalized.birthData.profileId).toBe("profile-42");
      expect(normalized.birthData.birthDate).toBe("1992-06-15");
      expect(normalized.birthData.birthTime).toBe("12:30");
      expect(normalized.profile.profileId).toBe("profile-42");
      expect(normalized.profile.birthDate).toBe("1992-06-15");
      expect(normalized.profile.birthTime).toBe("12:30");
    }
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
