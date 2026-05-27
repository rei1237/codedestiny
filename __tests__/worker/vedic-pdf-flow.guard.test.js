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

  test("validateVedicPdfPayload: 누락/forbidden key를 lenient 모드로 보고해야 한다", () => {
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
    const noLagnaResult = __vedicTestUtils.validateVedicPdfPayload(noLagna);
    expect(noLagnaResult.ok).toBe(true);
    expect(noLagnaResult.lenient).toBe(true);
    expect(noLagnaResult.missingFields.some((f) => String(f).includes("vedic.lagna"))).toBe(true);

    const noPlanets = JSON.parse(JSON.stringify(validPayload));
    noPlanets.vedic.planets = [];
    const noPlanetsResult = __vedicTestUtils.validateVedicPdfPayload(noPlanets);
    expect(noPlanetsResult.ok).toBe(true);
    expect(noPlanetsResult.missingFields.some((f) => String(f).includes("vedic.planets"))).toBe(true);

    const noSourceData = JSON.parse(JSON.stringify(validPayload));
    noSourceData.chapters[0].categories[0].sourceData = {};
    const noSourceResult = __vedicTestUtils.validateVedicPdfPayload(noSourceData);
    expect(noSourceResult.ok).toBe(true);
    expect(noSourceResult.missingFields.some((f) => String(f).includes("sourceData"))).toBe(true);

    const withPartner = JSON.parse(JSON.stringify(validPayload));
    withPartner.partner = { name: "x" };
    const forbidden = __vedicTestUtils.validateVedicPdfPayload(withPartner);
    expect(forbidden.ok).toBe(true);
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
    expect(manifest.length).toBe(12);

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

    expect(payload.chapters).toHaveLength(12);
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
    const dashaSection = payload.chapters[10].categories.find((c) => c.id === "V11_S1");

    expect(lagnaSection?.sourceData?.lagna?.signName || lagnaSection?.sourceData?.lagna?.signKo).toBeTruthy();
    expect(lagnaSection?.sourceData?.lagna?.lord).toBeTruthy();
    expect(nakshatraSection?.sourceData?.nakshatras?.Moon?.name || nakshatraSection?.sourceData?.nakshatras?.Moon?.ko).toBeTruthy();
    expect(atmakarakaSection?.sourceData?.karakas?.atmakaraka?.name).toBeTruthy();
    expect(dashaSection?.sourceData?.dasha?.current?.planet).toBeTruthy();
    expect(dashaSection?.sourceData?.dasha?.antar?.planet).toBeTruthy();
  });

  test("Chapter 11/12는 Ch.10과 중복되지 않고 고유 id/title을 유지해야 한다", () => {
    const manifest = __vedicTestUtils.buildVedicPdfChapterManifest("personal");
    expect(() => __vedicTestUtils.validateCanonicalVedicChapters(manifest)).not.toThrow();

    const ch10 = manifest.find((ch) => ch.id === "V10");
    const ch11 = manifest.find((ch) => ch.id === "V11");
    const ch12 = manifest.find((ch) => ch.id === "V12");

    expect(ch10?.title).toContain("Ch.10");
    expect(ch11?.title).toContain("Ch.11");
    expect(ch12?.title).toContain("Ch.12");
    expect(ch11?.title).not.toBe(ch10?.title);
    expect(ch12?.title).not.toBe(ch10?.title);
  });

  test("카테고리 localSeedText는 챕터별 컨텍스트를 유지해야 한다", () => {
    const canonical = __vedicTestUtils.buildCanonicalVedicChart(makeBody(), makeInput(), makeChart(), "personal", null, null);
    const chapterPlan = __vedicTestUtils.buildVedicChapterPlan(canonical, "personal");
    const payload = __vedicTestUtils.buildVedicPdfPayload({
      input: makeInput(),
      canonicalVedicChart: canonical,
      reportType: "personal",
      chapterPlan,
    });

    const careerSeed = payload.chapters.find((ch) => ch.id === "V7")?.categories?.[0]?.localSeedText || "";
    const moneySeed = payload.chapters.find((ch) => ch.id === "V8")?.categories?.[0]?.localSeedText || "";
    const loveSeed = payload.chapters.find((ch) => ch.id === "V9")?.categories?.[0]?.localSeedText || "";
    const dashaSeed = payload.chapters.find((ch) => ch.id === "V11")?.categories?.[0]?.localSeedText || "";

    expect(careerSeed).toContain("커리어/사회적 역할");
    expect(moneySeed).toContain("재물/수익 구조");
    expect(loveSeed).toContain("사랑/관계");
    expect(dashaSeed).toContain("다샤");
  });

  test("저품질 문장 검출기는 반복 금지 문구를 차단해야 한다", () => {
    expect(__vedicTestUtils.isLowQualityVedicSection("라시와 하우스를 분리해 보는 것입니다. 실행 단계에서는 10하우스 중심으로.", { chapterId: "V7" })).toBe(true);
    expect(__vedicTestUtils.isLowQualityVedicSection("재정 측면에서는 2하우스 구조를 기준으로 운의 상승 구간을 실제 성과로 연결합니다.", { chapterId: "V8" })).toBe(true);
    const goodText = [
      "현재 마하다샤와 안타르다샤의 결합은 선택 속도보다 선택 품질을 우선하라는 신호로 읽힙니다.",
      "이번 분기에는 이미 강점이 검증된 영역을 중심으로 책임 범위를 좁히는 전략이 유효합니다.",
      "관계와 업무에서 동시에 소진이 올라오는 구간이므로 일정의 밀도를 낮추고 회복 시간을 고정해야 합니다.",
      "재정 판단은 단기 수익보다 변동성 관리 기준을 먼저 세워 손실 구간을 줄이는 것이 중요합니다.",
      "다음 다샤 전환 전에는 핵심 루틴을 표준화해 운의 진폭이 커져도 실행 안정성을 유지해야 합니다.",
      "핵심 과제를 한 줄 문장으로 고정하고 주간 리뷰에서 중단/유지/확장 결정을 분리해 운용하세요.",
      "라그나 축에서 반복적으로 강조되는 판단 기준은 자신의 에너지가 가장 오래 유지되는 시간대에 주요 결정을 배치하는 것입니다.",
      "달의 정서 리듬을 고려하면 피로 누적 직후에 관계 문제를 해결하려 하기보다 회복 이후 대화 순서를 재설계하는 편이 손실을 줄입니다.",
      "목표를 세울 때는 성취 지표와 회복 지표를 동시에 기록해 성과만 높고 지속 가능성이 낮은 패턴을 초기에 차단해야 합니다.",
      "현 시기에는 확장보다 정합성이 중요한 구간이므로 이미 시작한 프로젝트의 마감 품질을 높이는 선택이 장기 운을 안정화합니다.",
      "리스크 관리에서는 사람, 시간, 자원 세 축의 병목을 분리해 점검하면 불필요한 감정 비용을 크게 줄일 수 있습니다.",
      "종합하면 이번 다샤의 핵심은 강한 추진력을 억제하는 것이 아니라 재현 가능한 루틴으로 번역해 손실 없는 성장 경로를 확보하는 데 있습니다.",
    ].join(" ");
    expect(__vedicTestUtils.isLowQualityVedicSection(goodText, { chapterId: "V11" })).toBe(false);
  });
});
