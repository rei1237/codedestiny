/**
 * @jest-environment node
 */

let __premiumReportTestUtils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __premiumReportTestUtils = mod.__premiumReportTestUtils;
});

describe("Premium Report Canonical Validation", () => {
  test("ziweiPremium: 필수 궁/핵심 필드 누락 시 fallback 생성 가능", () => {
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

    expect(built.validation.canGeneratePdf).toBe(true);
    expect(built.validation.generationMode).toBe("fallback");
    expect(Array.isArray(built.validation.requiredMissing)).toBe(true);
    expect(built.validation.requiredMissing.length).toBeGreaterThan(0);
    expect(typeof built.canonicalJson.completenessScore).toBe("number");
    expect(built.canonicalJson.completenessScore).toBeGreaterThanOrEqual(85);
    expect(Array.isArray(built.canonicalJson.blockingReasons)).toBe(true);
    expect(built.canonicalJson.blockingReasons.length).toBe(0);
    expect(built.canonicalJson.dataMarkers.requiredTotal).toBeGreaterThan(0);
  });

  test("ziweiPremium: adapter가 palace branch/mainStars를 배열 구조로 정확히 매핑", () => {
    const { buildCanonicalJsonForReport } = __premiumReportTestUtils;
    const built = buildCanonicalJsonForReport(
      "ziweiPremium",
      {
        canonicalZiweiChart: {
          profile: {
            name: "테스트",
            gender: "F",
            birth: { solarDate: "1992-06-15", time: "12:30", lunarDate: "1992-05-15" },
          },
          chartMeta: { mingGong: "子", shenGong: "丑", lifeMasterStar: "천기", bodyMasterStar: "천량" },
          palaces: [
            {
              key: "ming",
              palaceNameKo: "명궁",
              branch: "子",
              mainStars: [{ nameKo: "자미", brightness: "득", symbol: "O" }],
              minorStars: [{ nameKo: "천월", brightness: "평", symbol: "△" }],
              auxStars: [{ nameKo: "좌보", brightness: "묘", symbol: "◎" }],
            },
          ],
          fourTransformations: { huaLu: "화록: 무곡", huaQuan: "화권: 천상", huaKe: "화과: 문창", huaJi: "화기: 거문", byStem: "갑" },
          luck: { decadePeriods: [{ range: "31-40" }], annual: { year: 2026, ganji: "병오" } },
        },
      },
      {},
      { userId: "507f1f77bcf86cd799439011" },
      {
        reportId: "r1-1",
        inputHash: "h1-1",
        calculationVersion: "v1",
        createdAt: new Date().toISOString(),
        sourceMap: { usedBaseAnalysis: true, usedSavedAnalysis: false, usedRecalculation: false, usedExternalApi: false, sourceNames: ["baseAnalysis"] },
      }
    );

    const ziwei = built.canonicalJson.calculatedData;
    expect(Array.isArray(ziwei.palaces)).toBe(true);
    expect(ziwei.palaces.length).toBeGreaterThan(0);
    expect(ziwei.palaces[0].palaceName).toBe("명궁");
    expect(ziwei.palaces[0].branch).toBe("子");
    expect(Array.isArray(ziwei.palaces[0].mainStars)).toBe(true);
    expect(ziwei.palaces[0].mainStars.length).toBeGreaterThan(0);
    expect(ziwei.palaces[0].mainStars[0].name).toBe("자미");
    expect(["◎", "O", "▲", "△", "X"]).toContain(ziwei.palaces[0].mainStars[0].strengthSymbol);
    expect(ziwei.chart.mingGong).toBe("子");
    expect(ziwei.chart.shenGong).toBe("丑");
  });

  test("sookyoPremium: adapter가 27숙 엔진 결과를 Sukyo normalizedData로 정확히 매핑", () => {
    const { buildCanonicalJsonForReport } = __premiumReportTestUtils;
    const built = buildCanonicalJsonForReport(
      "sookyoPremium",
      {
        canonicalSukuyoNatal: {
          personA: {
            birth: { solarDate: "1992-06-15", lunarDate: "1992-05-15", time: "12:30" },
            sukuyo: { nameKo: "각", index: 1, group: "동방칠수", guardianDeity: "청룡" },
            profile: {
              name: "테스트",
              archetype: "탐구형",
              emotionalPattern: "감정 관찰형",
              relationshipPattern: "점진적 신뢰 구축형",
              careerPattern: "분석 중심 실행형",
              strengths: ["집중력"],
              weaknesses: ["과도한 신중함"],
            },
          },
          personB: {
            profile: { name: "상대" },
            sukuyo: { nameKo: "저" },
          },
          compatibility: {
            relationType: "상생",
            distance: 3,
            summary: "상호 보완적 관계",
          },
          cycleData: {
            daily: [{ date: "2026-05-14", score: 71 }],
            monthly: [{ month: 5, score: 74 }],
            yearly: [{ year: 2026, score: 77 }],
          },
        },
      },
      {},
      { userId: "507f1f77bcf86cd799439011" },
      {
        reportId: "r1-2",
        inputHash: "h1-2",
        calculationVersion: "v1",
        createdAt: new Date().toISOString(),
        sourceMap: { usedBaseAnalysis: true, usedSavedAnalysis: false, usedRecalculation: false, usedExternalApi: false, sourceNames: ["sukuyoEngine"] },
      }
    );

    const sookyo = built.canonicalJson.calculatedData;
    expect(sookyo.profile.birthDate).toBe("1992-06-15");
    expect(sookyo["宿曜"].birthMansion).toBe("각");
    expect(sookyo["宿曜"].birthMansionIndex).toBe(1);
    expect(sookyo["宿曜"].mansionGroup).toBe("동방칠수");
    expect(sookyo.compatibility.relationType).toBe("상생");
    expect(Array.isArray(sookyo.fortuneCycles.daily)).toBe(true);
    expect(Array.isArray(sookyo.fortuneCycles.monthly)).toBe(true);
    expect(Array.isArray(sookyo.fortuneCycles.yearly)).toBe(true);
    expect(built.validation.canGeneratePdf).toBe(true);
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
    expect(built.canonicalJson.completenessScore).toBeGreaterThanOrEqual(85);
    expect(Array.isArray(built.canonicalJson.blockingReasons)).toBe(true);
    expect(built.canonicalJson.blockingReasons.length).toBe(0);
    expect(built.canonicalJson.dataMarkers.requiredSatisfiedCount).toBe(
      built.canonicalJson.dataMarkers.requiredTotal
    );
    expect(built.canonicalJson.calculatedData.profile.birthDate).toBe("1992-06-15");
    expect(built.canonicalJson.calculatedData.natalChart.sunSign).toBe("Gemini");
    expect(built.canonicalJson.calculatedData.natalChart.moonSign).toBe("Virgo");
    expect(built.canonicalJson.calculatedData.natalChart.ascendant).toBe("Gemini");
    expect(Array.isArray(built.canonicalJson.calculatedData.natalChart.planets)).toBe(true);
    expect(Array.isArray(built.canonicalJson.calculatedData.natalChart.houses)).toBe(true);
    expect(Array.isArray(built.canonicalJson.calculatedData.natalChart.aspects)).toBe(true);
  });

  test("vedicPremium: adapter가 라그나/행성/하우스/다샤를 v2 구조로 매핑", () => {
    const { buildCanonicalJsonForReport } = __premiumReportTestUtils;
    const built = buildCanonicalJsonForReport(
      "vedicPremium",
      {
        canonicalVedicChart: {
          profile: {
            name: "테스트",
            gender: "F",
            birth: {
              date: "1992-06-15",
              time: "12:30",
              place: "Seoul",
            },
          },
          lagna: { name: "Mithuna" },
          planets: {
            sun: { sign: "Gemini", degree: 24.1, house: 1 },
            moon: { sign: "Virgo", degree: 2.2, house: 4 },
            rahu: { sign: "Capricorn", house: 8 },
            ketu: { sign: "Cancer", house: 2 },
          },
          houses: [
            { house: 1, sign: "Gemini", cuspDegree: 12.3, planets: ["sun"] },
          ],
          nakshatras: { moonNakshatra: { name: "Hasta" } },
          karakas: { atmakaraka: { planet: "Sun" } },
          dashas: {
            vimshottari: {
              currentDasha: { mahadasha: "Sun", antardasha: "Moon" },
              timeline: [{ mahadasha: "Sun", antardasha: "Moon" }],
            },
          },
          relationshipData: { summary: "관계 조율형" },
          careerData: { summary: "분석·전략형 커리어" },
          yogas: [{ name: "Raja Yoga" }],
        },
      },
      {},
      { userId: "507f1f77bcf86cd799439011" },
      {
        reportId: "r2-vedic",
        inputHash: "h2-vedic",
        calculationVersion: "v1",
        createdAt: new Date().toISOString(),
        sourceMap: { usedBaseAnalysis: true, usedSavedAnalysis: false, usedRecalculation: true, usedExternalApi: true, sourceNames: ["recalculationEngine"] },
      }
    );

    expect(built.validation.canGeneratePdf).toBe(true);
    expect(built.canonicalJson.calculatedData.profile.birthDate).toBe("1992-06-15");
    expect(built.canonicalJson.calculatedData.chart.lagna).toBe("Mithuna");
    expect(Array.isArray(built.canonicalJson.calculatedData.chart.planets)).toBe(true);
    expect(Array.isArray(built.canonicalJson.calculatedData.chart.houses)).toBe(true);
    expect(Array.isArray(built.canonicalJson.calculatedData.dasha.timeline)).toBe(true);
  });

  test("lifeBook: 핵심 사주 normalizedData 필수 필드 누락 시 차단", () => {
    const { validateCanonicalJson } = __premiumReportTestUtils;
    const validation = validateCanonicalJson("lifeBook", {
      calculatedData: {
        profile: {
          birthDate: "1992-06-15",
          calendarType: "solar",
        },
        chart: {
          yearPillar: { ganji: "" },
          monthPillar: { ganji: "" },
          dayPillar: { ganji: "" },
          dayMaster: "",
        },
        elements: { scores: { wood: 0 } },
        usefulGods: { analysisBasis: "" },
        luckCycles: { daewoon: [] },
      },
    });

    expect(validation.canGeneratePdf).toBe(true);
    expect(validation.generationMode).toBe("fallback");
    expect(validation.requiredMissing).toContain("calculatedData.chart.dayMaster");
  });

  test("loveSecret: 연애 normalizedData 핵심 필드 누락 시 fallback 생성 가능", () => {
    const { validateCanonicalJson } = __premiumReportTestUtils;
    const validation = validateCanonicalJson("loveSecret", {
      calculatedData: {
        profile: {
          birthDate: "1992-06-15",
          calendarType: "solar",
        },
        chart: {
          dayMaster: "",
          spousePalace: "",
          tenGods: {},
          relationshipStars: [],
        },
        lovePattern: {
          attractionStyle: "",
        },
        datingAdvice: {
          communicationAdvice: [],
        },
        luckCycles: {
          loveDaewoon: [],
        },
      },
    });

    expect(validation.canGeneratePdf).toBe(true);
    expect(validation.generationMode).toBe("fallback");
    expect(validation.requiredMissing).toContain("calculatedData.chart.dayMaster");
    expect(validation.requiredMissing).toContain("calculatedData.chart.spousePalace");
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
