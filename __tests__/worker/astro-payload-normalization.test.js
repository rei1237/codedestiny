/**
 * @jest-environment node
 */

let __astroTestUtils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __astroTestUtils = mod.__astroTestUtils;
});

describe("Astro payload normalization for strict PDF", () => {
  test("legacy reportPayload를 strict schema로 정규화한다", () => {
    const legacyPayload = {
      birth: {
        date: "1992-06-15",
        time: "12:30",
        timezone: "Asia/Seoul",
        locationName: "서울",
      },
      angles: {
        ascendant: { sign: "Gemini", signKo: "쌍둥이자리", degree: 14.2 },
        mc: { sign: "Aquarius", signKo: "물병자리", degree: 20.1 },
      },
      planets: [
        { nameEn: "Sun", sign: "Gemini", signKo: "쌍둥이자리", degree: 23.1, house: 10 },
        { nameEn: "Moon", sign: "Libra", signKo: "천칭자리", degree: 3.2, house: 2 },
        { nameEn: "Mercury", sign: "Cancer", signKo: "게자리", degree: 8.2, house: 11 },
        { nameEn: "Venus", sign: "Taurus", signKo: "황소자리", degree: 17.9, house: 9 },
        { nameEn: "Mars", sign: "Virgo", signKo: "처녀자리", degree: 2.3, house: 1 },
        { nameEn: "Jupiter", sign: "Leo", signKo: "사자자리", degree: 10.2, house: 12 },
        { nameEn: "Saturn", sign: "Aquarius", signKo: "물병자리", degree: 27.5, house: 8 },
      ],
      aspects: [{ p1: "Sun", p2: "Moon", type: "trine", orb: 1.8 }],
      houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, sign: "Aries" })),
      chapterInputs: [{ chapter: 1, chapterKey: "C1", title: "핵심 성향" }],
    };

    const strictPayload = __astroTestUtils.normalizeAstroPayloadForStrictValidation(legacyPayload);
    expect(strictPayload.mode).toBe("natal");
    expect(strictPayload.user.birthInfo.year).toBe(1992);
    expect(strictPayload.astro.planets.Sun).toBeTruthy();
    expect(strictPayload.astro.angles.ascendant).toBeTruthy();
    expect(Array.isArray(strictPayload.chapters)).toBe(true);
    expect(strictPayload.chapters.length).toBeGreaterThan(0);
  });

  test("buildAstroPdfSeed는 strictReportPayload를 포함한다", () => {
    const input = {
      year: 1992,
      month: 6,
      day: 15,
      hour: 12,
      minute: 30,
      timezone: 9,
      lat: 37.5665,
      lon: 126.978,
      houseSystem: "placidus",
      zodiacType: "tropical",
      includeMinorAspects: true,
    };
    const body = {
      name: "테스터",
      gender: "F",
      birthPlace: "서울",
      timezoneName: "Asia/Seoul",
    };

    const raw = __astroTestUtils.buildWesternChart(input);
    const chart = __astroTestUtils.buildWesternPremiumChart(raw, input, {
      houseSystem: input.houseSystem,
      zodiacType: input.zodiacType,
      includeMinorAspects: input.includeMinorAspects,
      strictHouseCusps: false,
    });

    const seed = __astroTestUtils.buildAstroPdfSeed(body, input, chart, "personal", null, null, null, null);
    expect(seed.strictReportPayload).toBeTruthy();

    const validation = __astroTestUtils.validateAstroPdfPayload(seed.reportPayload);
    expect(validation.ok).toBe(true);
  });
});
