/**
 * @jest-environment node
 */

let __vedicTestUtils;
let VEDIC_PDF_CHAPTERS;

function makeInput(overrides = {}) {
  return {
    name: "테스터",
    year: 1992,
    month: 6,
    day: 15,
    hour: 12,
    minute: 30,
    timezone: 9,
    timezoneName: "Asia/Seoul",
    lat: 37.5665,
    lon: 126.978,
    birthPlace: "서울",
    ...overrides,
  };
}

function makeBody(overrides = {}) {
  return {
    name: "테스터",
    gender: "F",
    birthPlace: "서울",
    timezoneName: "Asia/Seoul",
    ...overrides,
  };
}

function makePlanet(name, signName, signKo, degree, house, nakshatra, pada) {
  return {
    name,
    nameKo: name,
    signName,
    signKo,
    degree,
    house,
    nakshatra,
    nakshatraKo: nakshatra,
    nakshatraPada: pada,
    dignity: "Neutral",
    isRetrograde: false,
    isCombust: false,
  };
}

function makeChart() {
  return {
    source: "swiss-wasm-local",
    ayanamsa: 23.84,
    ayanamsaMode: "lahiri",
    lagna: { signName: "Aries", signKo: "양자리", degree: 10.2, house: 1, lord: "Mars" },
    moonNakshatra: {
      name: "Ashwini",
      ko: "아쉬위니",
      pada: 2,
      lord: "Ketu",
      degreeInNakshatra: 4.3,
      moonSign: "Aries",
      moonSignKo: "양자리",
    },
    planets: {
      Sun: makePlanet("Sun", "Gemini", "쌍둥이자리", 3.2, 3, "Mrigashira", 1),
      Moon: makePlanet("Moon", "Aries", "양자리", 12.4, 1, "Ashwini", 2),
      Mars: makePlanet("Mars", "Cancer", "게자리", 18.5, 4, "Pushya", 1),
      Mercury: makePlanet("Mercury", "Taurus", "황소자리", 25.0, 2, "Rohini", 4),
      Jupiter: makePlanet("Jupiter", "Virgo", "처녀자리", 9.1, 6, "Uttara Phalguni", 2),
      Venus: makePlanet("Venus", "Leo", "사자자리", 15.2, 5, "Purva Phalguni", 3),
      Saturn: makePlanet("Saturn", "Capricorn", "염소자리", 20.9, 10, "Shravana", 2),
      Rahu: makePlanet("Rahu", "Libra", "천칭자리", 6.4, 7, "Swati", 1),
      Ketu: makePlanet("Ketu", "Aries", "양자리", 6.4, 1, "Ashwini", 3),
    },
    vimshottariDasha: {
      current: { planet: "Moon", startDate: "2020-01-01", endDate: "2030-01-01" },
      antar: { planet: "Mars", startDate: "2025-01-01", endDate: "2026-01-01" },
    },
    atmakaraka: { name: "Saturn" },
    amatyakaraka: { name: "Mercury" },
    darakaraka: { name: "Moon" },
    d1: { lagnaSign: "Aries", lagnaDegree: 10.2 },
    d9: {
      Sun: { sign: 0, signName: "Aries", signKo: "양자리" },
      Moon: { sign: 1, signName: "Taurus", signKo: "황소자리" },
    },
    yogas: [{ name: "Dhana Yoga", nameKo: "다나 요가", description: "재물 요가" }],
    houses: {
      h1: { sign: "Aries", lord: "Mars" },
      h2: { sign: "Taurus", lord: "Venus" },
      h7: { sign: "Libra", lord: "Venus" },
      h10: { sign: "Capricorn", lord: "Saturn" },
    },
  };
}

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __vedicTestUtils = mod.__vedicTestUtils;
  ({ VEDIC_PDF_CHAPTERS } = await import("../../worker/lib/vedic-premium-chapters.js"));
});

describe("Vedic PDF payload/category guards", () => {
  test("개인 payload는 solo 모드 + lagna/planets를 포함하고 forbidden key가 없어야 한다", () => {
    const canonical = __vedicTestUtils.buildCanonicalVedicChart(makeBody(), makeInput(), makeChart(), "personal", null, null);
    const chapterPlan = __vedicTestUtils.buildVedicChapterPlan(canonical, "personal");
    const payload = __vedicTestUtils.buildVedicPdfPayload({
      input: makeInput(),
      canonicalVedicChart: canonical,
      reportType: "personal",
      chapterPlan,
    });

    expect(payload.mode).toBe("solo");
    expect(payload.vedic?.lagna?.signName || payload.vedic?.lagna?.sign).toBeTruthy();
    expect(Array.isArray(payload.vedic?.planets)).toBe(true);
    expect(payload.vedic.planets.length).toBeGreaterThan(0);

    const text = JSON.stringify(payload).toLowerCase();
    expect(text.includes("\"compatibility\"")).toBe(false);
    expect(text.includes("\"partner\"")).toBe(false);
    expect(text.includes("\"synastry\"")).toBe(false);
  });

  test("validateVedicPdfPayload: lagna/planets/sourceData 누락 또는 forbidden key가 있으면 실패한다", () => {
    const canonical = __vedicTestUtils.buildCanonicalVedicChart(makeBody(), makeInput(), makeChart(), "personal", null, null);
    const chapterPlan = __vedicTestUtils.buildVedicChapterPlan(canonical, "personal");
    const validPayload = __vedicTestUtils.buildVedicPdfPayload({
      input: makeInput(),
      canonicalVedicChart: canonical,
      reportType: "personal",
      chapterPlan,
    });

    const noLagna = JSON.parse(JSON.stringify(validPayload));
    noLagna.vedic.lagna = null;
    expect(__vedicTestUtils.validateVedicPdfPayload(noLagna).ok).toBe(false);

    const noPlanets = JSON.parse(JSON.stringify(validPayload));
    noPlanets.vedic.planets = [];
    expect(__vedicTestUtils.validateVedicPdfPayload(noPlanets).ok).toBe(false);

    const noSourceData = JSON.parse(JSON.stringify(validPayload));
    noSourceData.chapters[0].categories[0].sourceData = {};
    expect(__vedicTestUtils.validateVedicPdfPayload(noSourceData).ok).toBe(false);

    const withPartner = JSON.parse(JSON.stringify(validPayload));
    withPartner.partner = { name: "x" };
    const forbidden = __vedicTestUtils.validateVedicPdfPayload(withPartner);
    expect(forbidden.ok).toBe(false);
    expect(forbidden.forbiddenKeys.length).toBeGreaterThan(0);
  });

  test("assertNoVedicPdfFallbackText: 금지 문구는 차단하고 정상 상담문은 통과한다", () => {
    expect(() => __vedicTestUtils.assertNoVedicPdfFallbackText("이 섹션은 기본 골격입니다.")).toThrow();
    expect(() => __vedicTestUtils.assertNoVedicPdfFallbackText("자동 복구 생성 안내 문구")).toThrow();
    expect(() => __vedicTestUtils.assertNoVedicPdfFallbackText("서버 응답이 불안정하여 다시 시도")).toThrow();
    expect(() => __vedicTestUtils.assertNoVedicPdfFallbackText("compatibility mode text")).toThrow();

    expect(() => __vedicTestUtils.assertNoVedicPdfFallbackText("라그나와 달의 배치를 근거로 이번 달 감정 리듬과 실행 우선순위를 조정하는 전략을 제시합니다.")).not.toThrow();
  });

  test("dry-run: chapter/category sourceData가 생성되고 금지어 없이 category source를 구성한다", () => {
    const canonical = __vedicTestUtils.buildCanonicalVedicChart(makeBody(), makeInput(), makeChart(), "personal", null, null);
    const manifest = __vedicTestUtils.buildVedicPdfChapterManifest("personal");

    expect(Array.isArray(manifest)).toBe(true);
    expect(manifest.length).toBe(10);

    const first = manifest[0];
    expect(Array.isArray(first.categories)).toBe(true);
    expect(first.categories.length).toBeGreaterThan(0);

    const sourceData = __vedicTestUtils.buildVedicPdfCategorySourceData(canonical, first.categories[0]);
    const sourceText = JSON.stringify(sourceData).toLowerCase();
    expect(sourceText.includes("compatibility")).toBe(false);
    expect(sourceText.includes("partner")).toBe(false);
  });

  test("manifest의 chapters/sections 개수는 챕터 정의와 정확히 일치해야 한다", () => {
    const canonical = __vedicTestUtils.buildCanonicalVedicChart(makeBody(), makeInput(), makeChart(), "personal", null, null);
    const chapterPlan = __vedicTestUtils.buildVedicChapterPlan(canonical, "personal");
    const payload = __vedicTestUtils.buildVedicPdfPayload({
      input: makeInput(),
      canonicalVedicChart: canonical,
      reportType: "personal",
      chapterPlan,
    });

    expect(payload.chapters).toHaveLength(10);
    payload.chapters.forEach((chapter, index) => {
      const cfg = VEDIC_PDF_CHAPTERS[index];
      expect(cfg).toBeTruthy();
      expect(chapter.id).toBe(cfg.id);
      expect(Array.isArray(chapter.categories)).toBe(true);
      expect(chapter.categories.length).toBe(cfg.sections.length);
    });
  });

  test("라그나/나크샤트라/아트마카라카/다샤 소스 신호가 payload에 포함되어야 한다", () => {
    const canonical = __vedicTestUtils.buildCanonicalVedicChart(makeBody(), makeInput(), makeChart(), "personal", null, null);
    const chapterPlan = __vedicTestUtils.buildVedicChapterPlan(canonical, "personal");
    const payload = __vedicTestUtils.buildVedicPdfPayload({
      input: makeInput(),
      canonicalVedicChart: canonical,
      reportType: "personal",
      chapterPlan,
    });

    const lagnaSection = payload.chapters[1].categories.find((c) => c.id === "V2_S1");
    const nakshatraSection = payload.chapters[2].categories.find((c) => c.id === "V3_S2");
    const atmakarakaSection = payload.chapters[3].categories.find((c) => c.id === "V4_S1");
    const dashaSection = payload.chapters[8].categories.find((c) => c.id === "V9_S1");

    expect(lagnaSection?.sourceData?.lagna?.signName || lagnaSection?.sourceData?.lagna?.signKo).toBeTruthy();
    expect(lagnaSection?.sourceData?.lagna?.lord).toBeTruthy();
    expect(nakshatraSection?.sourceData?.nakshatras?.Moon?.name || nakshatraSection?.sourceData?.nakshatras?.Moon?.ko).toBeTruthy();
    expect(atmakarakaSection?.sourceData?.karakas?.atmakaraka?.name).toBeTruthy();
    expect(dashaSection?.sourceData?.dasha?.current?.planet).toBeTruthy();
    expect(dashaSection?.sourceData?.dasha?.antar?.planet).toBeTruthy();
  });
});
