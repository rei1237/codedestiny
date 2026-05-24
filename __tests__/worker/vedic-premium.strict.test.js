/**
 * @jest-environment node
 *
 * 실행 예시:
 * npx jest __tests__/worker/vedic-premium.strict.test.js --testEnvironment node
 */

let __vedicTestUtils;
let buildCanonicalVedicChart;
let validateCanonicalVedicChartStrict;
let buildVedicChapterPlan;
let vedicMissingMarkers;
let hasBannedDeterministicExpression;
let hasForbiddenVedicPadding;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeBody(overrides = {}) {
  return {
    name: "베다테스터",
    gender: "F",
    birthPlace: "서울",
    timezoneName: "Asia/Seoul",
    ...overrides,
  };
}

function makeInput(overrides = {}) {
  return {
    name: "베다테스터",
    year: 1992,
    month: 6,
    day: 15,
    hour: 12,
    minute: 30,
    timezone: 9,
    lat: 37.5665,
    lon: 126.978,
    ayanamsa: "lahiri",
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
    isExalted: false,
    isDebilitated: false,
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
      current: { planet: "Moon", startDate: "2020-01-01", endDate: "2030-01-01", remainYears: 4.5 },
      antar: { planet: "Mars", startDate: "2025-01-01", endDate: "2026-01-01", remainYears: 0.8 },
      pratyantar: { planet: "Mercury", startDate: "2025-08-01", endDate: "2025-11-01", remainYears: 0.2 },
      upcoming: { planet: "Rahu", startDate: "2030-01-02", endDate: "2048-01-01", remainYears: 18 },
    },
    atmakaraka: { name: "Saturn" },
    amatyakaraka: { name: "Mercury" },
    darakaraka: { name: "Moon" },
    d1: { lagnaSign: "Aries", lagnaDegree: 10.2 },
    d9: {
      Sun: { sign: 0, signName: "Aries", signKo: "양자리" },
      Moon: { sign: 1, signName: "Taurus", signKo: "황소자리" },
      Mars: { sign: 2, signName: "Gemini", signKo: "쌍둥이자리" },
      Mercury: { sign: 3, signName: "Cancer", signKo: "게자리" },
      Jupiter: { sign: 4, signName: "Leo", signKo: "사자자리" },
      Venus: { sign: 5, signName: "Virgo", signKo: "처녀자리" },
      Saturn: { sign: 6, signName: "Libra", signKo: "천칭자리" },
    },
    d10: {
      Sun: { sign: 0, signName: "Aries", signKo: "양자리" },
      Moon: { sign: 1, signName: "Taurus", signKo: "황소자리" },
      Mars: { sign: 2, signName: "Gemini", signKo: "쌍둥이자리" },
      Mercury: { sign: 3, signName: "Cancer", signKo: "게자리" },
      Jupiter: { sign: 4, signName: "Leo", signKo: "사자자리" },
      Venus: { sign: 5, signName: "Virgo", signKo: "처녀자리" },
      Saturn: { sign: 6, signName: "Libra", signKo: "천칭자리" },
    },
    yogas: [
      { name: "Dhana Yoga", nameKo: "다나 요가", description: "재물 요가" },
      { name: "Raja Yoga", nameKo: "라자 요가", description: "권위 요가" },
    ],
    houses: {
      h2: { sign: "Taurus", lord: "Venus" },
      h7: { sign: "Libra", lord: "Venus" },
      h10: { sign: "Capricorn", lord: "Saturn" },
      h11: { sign: "Aquarius", lord: "Saturn" },
      h12: { sign: "Pisces", lord: "Jupiter" },
    },
    transits: {
      saturn: { sign: "Pisces" },
      jupiter: { sign: "Taurus" },
    },
  };
}

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __vedicTestUtils = mod.__vedicTestUtils;

  ({
    buildCanonicalVedicChart,
    validateCanonicalVedicChartStrict,
    buildVedicChapterPlan,
    vedicMissingMarkers,
    hasBannedDeterministicExpression,
    hasForbiddenVedicPadding,
  } = __vedicTestUtils);
});

describe("Vedic Premium Strict Tests", () => {
  test("A. canonical chart strict validation은 필수 데이터가 있으면 통과해야 한다", () => {
    const body = makeBody();
    const input = makeInput();
    const chart = makeChart();

    const canonical = buildCanonicalVedicChart(body, input, chart, "personal", null, null);
    const result = validateCanonicalVedicChartStrict(canonical, "personal");

    expect(result.isValid).toBe(true);
    expect(result.missingFields.length).toBe(0);
  });

  test("B. Moon Nakshatra 필드가 없으면 strict validation은 실패해야 한다", () => {
    const canonical = buildCanonicalVedicChart(makeBody(), makeInput(), makeChart(), "personal", null, null);
    const broken = clone(canonical);
    broken.moonNakshatra.name = null;
    broken.moonNakshatra.moonSign = null;
    if (broken.planets && broken.planets.Moon) broken.planets.Moon.signName = null;

    const result = validateCanonicalVedicChartStrict(broken, "personal");
    expect(result.isValid).toBe(false);
    expect(result.missingFields.some((f) => f.includes("moonNakshatra"))).toBe(true);
  });

  test("C. personal 리포트는 12챕터 플랜으로 생성되어야 한다", () => {
    const canonical = buildCanonicalVedicChart(makeBody(), makeInput(), makeChart(), "personal", null, null);
    const plan = buildVedicChapterPlan(canonical, "personal");

      expect(plan).toHaveLength(12);
    const chapter8 = plan.find((p) => p.num === 8);
    expect(chapter8.available).toBe(true);
    expect(chapter8.reasons.length).toBe(0);
  });

  test("D. personal 모드는 mode 값과 무관하게 12챕터 플랜을 유지해야 한다", () => {
    const canonical = buildCanonicalVedicChart(makeBody({ mode: "compatibility" }), makeInput(), makeChart(), "personal", null, null);
    const plan = buildVedicChapterPlan(canonical, "compatibility");
    const chapter10 = plan.find((p) => p.num === 10);

    expect(plan).toHaveLength(12);
    expect(chapter10.available).toBe(true);
    expect(chapter10.reasons.length).toBe(0);
  });

  test("E. 금지 패딩/단정 표현 탐지가 동작해야 한다", () => {
    expect(hasForbiddenVedicPadding("### 실행 보강 메모\n데이터 부족 문구")).toBe(true);
    expect(hasBannedDeterministicExpression("반드시 이혼합니다.")).toBe(true);
  });

  test("F. 개인 모드 필수 마커 누락을 탐지해야 한다", () => {
    const personalChapter11Text = "## 챕터 11\n### 1. 현재 다샤의 기본 의미\n### 2. 가까운 시기의 변화 흐름\n### 3. 기회가 열리는 조건";

    const missingPersonal = vedicMissingMarkers(personalChapter11Text, 11, "personal");

    expect(missingPersonal.some((m) => m.includes("다샤를 현실 전략으로 쓰는 법"))).toBe(true);
  });
});
