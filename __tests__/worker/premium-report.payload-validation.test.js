/**
 * @jest-environment node
 */

let __premiumReportTestUtils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __premiumReportTestUtils = mod.__premiumReportTestUtils;
});

describe("Premium reportPayload severity validators", () => {
  test("lifeBook personal payload: 핵심 필드가 있으면 통과", () => {
    const { validateSajuReportPayload } = __premiumReportTestUtils;
    const result = validateSajuReportPayload("lifeBook", {
      calculatedData: {
        saju: { fourPillars: { year: "갑자" } },
        sajuCore: {
          pillars: { year: "갑자", month: "을축", day: "병인", hour: "정묘" },
          dayMaster: "병",
          monthCommand: "축",
          tenGodEvidence: [{ name: "비견", count: 2 }],
        },
        luckFlow: {
          daewoon: [{ startAge: 31, pillar: "기미" }],
          sewoon: [{ year: 2026, pillar: "병오" }],
        },
        integratedThemes: {
          coreIdentity: ["분석형"],
          lifeMission: ["장기 성장"],
        },
        timeline: { sajuDaewoon: [{ startAge: 31 }] },
      },
      input: { reportType: "personal" },
    });

    expect(result.ok).toBe(true);
    expect(result.missingFields).toEqual([]);
  });

  test("loveSecret compatibility payload: partner 데이터 누락은 recoverable", () => {
    const { validateSajuReportPayload } = __premiumReportTestUtils;
    const result = validateSajuReportPayload("loveSecret", {
      calculatedData: {
        self: {
          sajuChart: { dayMaster: "갑" },
          relationshipProfile: { attractionSignals: ["일지"] },
        },
        compatibility: { temperatureHumidityMatch: "보통" },
      },
      input: { reportType: "compatibility" },
    });

    expect(result.ok).toBe(true);
    expect(result.code).toBe("");
    expect(result.generationMode).toBe("fallback");
    expect(result.missingFields).toContain("calculatedData.partner.sajuChart");
    expect(result.recoverableMissing).toContain("calculatedData.partner.sajuChart");
  });

  test("sookyo compatibility payload: relationType/distance 누락은 recoverable", () => {
    const { validateSukyoReportPayload } = __premiumReportTestUtils;
    const result = validateSukyoReportPayload({
      calculatedData: {
        sukyoPdfContext: { userProfile: { solarBirthDate: "1992-06-15" } },
        nativeSook: { nameKo: "각", number: 1 },
        _compatibilityRequired: true,
        compatibility: { targetMansion: "저" },
      },
    });

    expect(result.ok).toBe(true);
    expect(result.code).toBe("");
    expect(result.generationMode).toBe("fallback");
    expect(result.missingFields).toContain("calculatedData.compatibility.relationType");
    expect(result.missingFields).toContain("calculatedData.compatibility.distance");
  });

  test("vedic compatibility payload: partner 핵심 입력 누락은 recoverable", () => {
    const { validateVedicReportPayload } = __premiumReportTestUtils;
    const result = validateVedicReportPayload({
      calculatedData: {
        lagna: { sign: "Mithuna" },
        nakshatras: { moonNakshatra: { name: "Hasta" } },
        dashas: { vimshottari: { currentMahaDasha: { lord: "Sun" } } },
        karakas: { atmakaraka: { planet: "Sun" } },
      },
      input: { reportType: "compatibility" },
    });

    expect(result.ok).toBe(true);
    expect(result.code).toBe("");
    expect(result.generationMode).toBe("fallback");
    expect(result.missingFields).toContain("input.partnerBirthDate|input.partnerYear.month.day");
    expect(result.missingFields).toContain("input.partnerBirthTime|input.partnerHour");
    expect(result.missingFields).toContain("input.partnerBirthPlace|input.partnerPlace");
  });

  test("astrology compatibility payload: relationshipData 누락은 recoverable", () => {
    const { validateAstrologyReportPayload } = __premiumReportTestUtils;
    const result = validateAstrologyReportPayload({
      calculatedData: {
        angles: {
          ascendant: { sign: "Gemini" },
          midheaven: { sign: "Aquarius" },
        },
        planets: {
          sun: { sign: "Gemini" },
          moon: { sign: "Virgo" },
        },
        houses: [{ house: 1 }],
        aspects: [{ type: "square" }],
      },
      input: { reportType: "compatibility" },
    });

    expect(result.ok).toBe(true);
    expect(result.code).toBe("");
    expect(result.generationMode).toBe("fallback");
    expect(result.missingFields).toContain("calculatedData.relationshipData");
  });

  test("ziwei payload: 핵심 궁/대운 누락은 recoverable", () => {
    const { validateZiweiReportPayload } = __premiumReportTestUtils;
    const result = validateZiweiReportPayload({
      calculatedData: {
        coreChart: { mingGong: "자", shenGong: "오" },
        palaces: {
          ming: { mainStars: ["자미"] },
          spouse: { mainStars: ["천상"] },
        },
        cycles: {
          daXian: [],
        },
      },
    });

    expect(result.ok).toBe(true);
    expect(result.code).toBe("");
    expect(result.generationMode).toBe("fallback");
    expect(result.missingFields).toContain("calculatedData.palaces.wealth");
    expect(result.missingFields).toContain("calculatedData.palaces.career");
    expect(result.missingFields).toContain("calculatedData.cycles.daXian");
  });
});
