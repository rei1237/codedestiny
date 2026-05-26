/**
 * @jest-environment node
 */

let __premiumReportTestUtils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __premiumReportTestUtils = mod.__premiumReportTestUtils;
});

describe("Premium report engine adapters", () => {
  test("westernAstrologyPremium maps engine planets array and mc angle into required PDF paths", () => {
    const { buildCanonicalJsonForReport } = __premiumReportTestUtils;
    const built = buildCanonicalJsonForReport(
      "westernAstrologyPremium",
      {
        canonicalAstroChart: {
          profile: { birth: { date: "1992-06-15", time: "12:30", locationName: "Seoul" } },
          calculationMeta: { houseSystem: "Placidus", zodiac: "tropical", engine: "Swiss Ephemeris" },
          angles: {
            ascendant: { sign: "Gemini", degree: 12.3 },
            mc: { sign: "Aquarius", degree: 18.2 },
          },
          planets: [
            { nameEn: "Sun", sign: "Gemini", house: 1 },
            { nameEn: "Moon", sign: "Virgo", house: 4 },
            { nameEn: "Venus", sign: "Cancer", house: 2 },
            { nameEn: "Mars", sign: "Leo", house: 3 },
            { nameEn: "Saturn", sign: "Aquarius", house: 10 },
            { nameEn: "Jupiter", sign: "Libra", house: 5 },
          ],
          houses: [{ house: 1, sign: "Gemini" }, { house: 10, sign: "Aquarius" }],
          aspects: [{ planetA: "Sun", planetB: "Moon", type: "square", orb: 2.1 }],
          chartBalance: { elements: { air: 4 }, modalities: { mutable: 3 } },
          forecast: { annual: [{ year: 2026, note: "career focus" }] },
        },
      },
      {},
      { userId: "507f1f77bcf86cd799439011" },
      {
        reportId: "r2-array-astro",
        inputHash: "h2-array-astro",
        calculationVersion: "v1",
        createdAt: new Date().toISOString(),
        sourceMap: { usedBaseAnalysis: false, usedSavedAnalysis: false, usedRecalculation: true, usedExternalApi: true, sourceNames: ["swissAstroEngine"] },
      }
    );

    expect(built.validation.canGeneratePdf).toBe(true);
    expect(built.canonicalJson.calculatedData.angles.midheaven.sign).toBe("Aquarius");
    expect(built.canonicalJson.calculatedData.planets.sun.sign).toBe("Gemini");
    expect(built.canonicalJson.calculatedData.elementBalance.air).toBe(4);
    expect(built.canonicalJson.calculatedData.timingData.annual[0].year).toBe(2026);
  });

  test("vedicPremium maps engine moonNakshatra, dasha, and divisionalCharts into required PDF paths", () => {
    const { buildCanonicalJsonForReport } = __premiumReportTestUtils;
    const built = buildCanonicalJsonForReport(
      "vedicPremium",
      {
        canonicalVedicChart: {
          profile: { birth: { date: "1992-06-15", time: "12:30", locationName: "Seoul" } },
          calculationMeta: { zodiac: "sidereal", ayanamsaMode: "Lahiri", engine: "Swiss Ephemeris" },
          lagna: { signName: "Mithuna", signKo: "쌍둥이" },
          houses: { h1: { sign: "Mithuna" }, h10: { sign: "Meena" } },
          planets: {
            Sun: { sign: "Mithuna", house: 1 },
            Moon: { sign: "Kanya", house: 4 },
            Rahu: { sign: "Makara", house: 8 },
            Ketu: { sign: "Karka", house: 2 },
          },
          moonNakshatra: { name: "Hasta", pada: 2 },
          dasha: {
            current: { lord: "Sun", start: "2024-01-01" },
            antar: { lord: "Moon" },
            upcoming: [{ lord: "Mars" }],
          },
          divisionalCharts: {
            d9: { h1: { sign: "Tula" } },
            d10: { h10: { sign: "Simha" } },
          },
          navamsaChart: {
            houses: { h1: { sign: "Tula" } },
          },
          karakas: {
            atmakaraka: { planet: "Sun" },
            amatyakaraka: { planet: "Mercury" },
            darakaraka: { planet: "Venus" },
          },
          yogas: [{ name: "Raja Yoga" }],
        },
      },
      {},
      { userId: "507f1f77bcf86cd799439011" },
      {
        reportId: "r2-engine-vedic",
        inputHash: "h2-engine-vedic",
        calculationVersion: "v1",
        createdAt: new Date().toISOString(),
        sourceMap: { usedBaseAnalysis: false, usedSavedAnalysis: false, usedRecalculation: true, usedExternalApi: true, sourceNames: ["swissVedicEngine"] },
      }
    );

    expect(built.validation.canGeneratePdf).toBe(true);
    expect(built.canonicalJson.calculatedData.lagna.sign).toBe("Mithuna");
    expect(built.canonicalJson.calculatedData.nakshatras.moonNakshatra.name).toBe("Hasta");
    expect(built.canonicalJson.calculatedData.dashas.vimshottari.currentMahaDasha.lord).toBe("Sun");
  });

  test("sookyoPremium uses the 8/10 chapter premium spec", () => {
    const { getPremiumRequiredChapters } = __premiumReportTestUtils;
    expect(getPremiumRequiredChapters("sookyoPremium", "personal")).toBe(8);
    expect(getPremiumRequiredChapters("sookyoPremium", "compatibility")).toBe(10);
  });
});
