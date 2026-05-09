/**
 * @jest-environment node
 */

let __premiumReportTestUtils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __premiumReportTestUtils = mod.__premiumReportTestUtils;
});

describe("Premium Report Canonical Validation", () => {
  test("ziweiPremium: 필수 궁/핵심 필드 누락 시 canGeneratePdf=false", () => {
    const { buildCanonicalJsonForReport } = __premiumReportTestUtils;
    const built = buildCanonicalJsonForReport(
      "ziweiPremium",
      {
        canonicalZiweiChart: {
          profile: { birth: { solarDate: "1992-06-15" }, gender: "F" },
          chartMeta: { mingGong: "", shenGong: "" },
          palaces: [],
        },
      },
      {},
      { userId: "507f1f77bcf86cd799439011" },
      {
        reportId: "r1",
        inputHash: "h1",
        calculationVersion: "v1",
        createdAt: new Date().toISOString(),
        sourceMap: { usedBaseAnalysis: true, usedSavedAnalysis: false, usedRecalculation: false, usedExternalApi: false, sourceNames: ["baseAnalysis"] },
      }
    );

    expect(built.validation.canGeneratePdf).toBe(false);
    expect(Array.isArray(built.validation.requiredMissing)).toBe(true);
    expect(built.validation.requiredMissing.length).toBeGreaterThan(0);
  });

  test("westernAstrologyPremium: 필수 각/행성/하우스/aspect 존재 시 canGeneratePdf=true", () => {
    const { buildCanonicalJsonForReport } = __premiumReportTestUtils;
    const built = buildCanonicalJsonForReport(
      "westernAstrologyPremium",
      {
        canonicalAstroChart: {
          profile: {
            birth: {
              date: "1992-06-15",
              time: "12:30",
              place: "Seoul",
              latitude: 37.5665,
              longitude: 126.978,
              timezone: "Asia/Seoul",
            },
          },
          settings: {
            houseSystem: "Placidus",
            zodiac: "tropical",
          },
          angles: {
            ascendant: { sign: "Gemini", degree: 12.3 },
            midheaven: { sign: "Aquarius", degree: 18.2 },
            descendant: { sign: "Sagittarius", degree: 12.3 },
            imumCoeli: { sign: "Leo", degree: 18.2 },
          },
          planets: {
            sun: { sign: "Gemini", degree: 24.1, house: 1, retrograde: false },
            moon: { sign: "Virgo", degree: 2.2, house: 4, retrograde: false },
            venus: { sign: "Cancer", degree: 10.5, house: 2, retrograde: false },
            mars: { sign: "Leo", degree: 1.8, house: 3, retrograde: false },
            saturn: { sign: "Aquarius", degree: 4.4, house: 10, retrograde: true },
            jupiter: { sign: "Libra", degree: 19.1, house: 5, retrograde: false },
          },
          houses: [{ house: 1, sign: "Gemini", cuspDegree: 12.3, planets: ["sun"] }],
          aspects: [{ planetA: "sun", planetB: "moon", type: "square", orb: 2.1 }],
          relationshipData: { venus: {}, mars: {}, majorLoveAspects: [] },
          careerData: { tenthHouse: {}, saturn: {}, jupiter: {} },
        },
      },
      {},
      { userId: "507f1f77bcf86cd799439011" },
      {
        reportId: "r2",
        inputHash: "h2",
        calculationVersion: "v1",
        createdAt: new Date().toISOString(),
        sourceMap: { usedBaseAnalysis: true, usedSavedAnalysis: false, usedRecalculation: true, usedExternalApi: true, sourceNames: ["recalculationEngine"] },
      }
    );

    expect(built.validation.canGeneratePdf).toBe(true);
    expect(built.validation.requiredMissing.length).toBe(0);
  });

  test("lifeBook: saju만 있고 ziwei/western 둘 다 없으면 차단", () => {
    const { validateCanonicalJson } = __premiumReportTestUtils;
    const validation = validateCanonicalJson("lifeBook", {
      calculatedData: {
        saju: { dayMaster: "갑" },
        ziwei: {},
        westernAstrology: {},
        integratedThemes: {
          coreIdentity: ["독립성"],
          lifeMission: ["성장"],
        },
        timeline: { sajuDaewoon: [] },
      },
    });

    expect(validation.canGeneratePdf).toBe(false);
    expect(validation.requiredMissing).toContain("calculatedData.ziwei|calculatedData.westernAstrology");
  });

  test("westernAstrologyPremium: chapter별 multi-json pack 생성", () => {
    const { buildCanonicalJsonForReport, buildLlmPromptInput } = __premiumReportTestUtils;
    const built = buildCanonicalJsonForReport(
      "westernAstrologyPremium",
      {
        canonicalAstroChart: {
          profile: {
            birth: {
              date: "1992-06-15",
              time: "12:30",
              place: "Seoul",
              latitude: 37.5665,
              longitude: 126.978,
              timezone: "Asia/Seoul",
            },
          },
          settings: {
            houseSystem: "Placidus",
            zodiac: "tropical",
          },
          angles: {
            ascendant: { sign: "Gemini", degree: 12.3 },
            midheaven: { sign: "Aquarius", degree: 18.2 },
            descendant: { sign: "Sagittarius", degree: 12.3 },
            imumCoeli: { sign: "Leo", degree: 18.2 },
          },
          planets: {
            sun: { sign: "Gemini", degree: 24.1, house: 1, retrograde: false },
            moon: { sign: "Virgo", degree: 2.2, house: 4, retrograde: false },
            venus: { sign: "Cancer", degree: 10.5, house: 2, retrograde: false },
            mars: { sign: "Leo", degree: 1.8, house: 3, retrograde: false },
            saturn: { sign: "Aquarius", degree: 4.4, house: 10, retrograde: true },
            jupiter: { sign: "Libra", degree: 19.1, house: 5, retrograde: false },
          },
          houses: [{ house: 1, sign: "Gemini", cuspDegree: 12.3, planets: ["sun"] }],
          aspects: [{ planetA: "sun", planetB: "moon", type: "square", orb: 2.1 }],
          relationshipData: { venus: {}, mars: {}, majorLoveAspects: [] },
          careerData: { tenthHouse: {}, saturn: {}, jupiter: {} },
        },
      },
      {},
      { userId: "507f1f77bcf86cd799439011" },
      {
        reportId: "r3",
        inputHash: "h3",
        calculationVersion: "v1",
        createdAt: new Date().toISOString(),
        sourceMap: { usedBaseAnalysis: true, usedSavedAnalysis: false, usedRecalculation: true, usedExternalApi: true, sourceNames: ["recalculationEngine"] },
      }
    );

    const llmInput = buildLlmPromptInput("westernAstrologyPremium", 1, built.canonicalJson);
    expect(llmInput.doNotCalculate).toBe(true);
    expect(llmInput.chapterJsonPacks).toBeTruthy();
    expect(llmInput.chapterJsonPacks.chapterCore).toBeTruthy();
    expect(llmInput.chapterJsonPacks.signals).toBeTruthy();
    expect(llmInput.chapterJsonPacks.timing).toBeTruthy();
    expect(llmInput.chapterJsonPacks.actions).toBeTruthy();
  });
});
