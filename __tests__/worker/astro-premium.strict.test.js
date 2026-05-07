/**
 * @jest-environment node
 *
 * 실행 예시:
 * npx jest __tests__/worker/astro-premium.strict.test.js --testEnvironment node
 */

let __astroTestUtils;

let buildWesternChart;
let buildWesternPremiumChart;
let buildBasicAstroSummaryFromChart;
let buildCanonicalAstroChart;
let validateCanonicalAstroChartStrict;
let buildAstroChapterPlan;
let buildAstroChapterPrompt;
let hasForbiddenAstroPadding;
let detectRepeatedLongSentences;
let hasAstroDataEvidence;
let hasBrokenPageCounter;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeInput(overrides = {}) {
  return {
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

function makeChart(input = makeInput()) {
  const raw = buildWesternChart(input);
  return buildWesternPremiumChart(raw, input, {
    houseSystem: input.houseSystem,
    zodiacType: input.zodiacType,
    includeMinorAspects: input.includeMinorAspects,
    strictHouseCusps: false,
  });
}

function makeCanonical(input = makeInput(), body = makeBody()) {
  const chart = makeChart(input);
  return buildCanonicalAstroChart(body, input, chart, "personal", null, null, null, null);
}

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __astroTestUtils = mod.__astroTestUtils;

  ({
    buildWesternChart,
    buildWesternPremiumChart,
    buildBasicAstroSummaryFromChart,
    buildCanonicalAstroChart,
    validateCanonicalAstroChartStrict,
    buildAstroChapterPlan,
    buildAstroChapterPrompt,
    hasForbiddenAstroPadding,
    detectRepeatedLongSentences,
    hasAstroDataEvidence,
    hasBrokenPageCounter,
  } = __astroTestUtils);
});

describe("Astro Premium Strict Tests (A~J)", () => {
  test("A. 기본 차트 Sun/Moon/ASC/MC와 canonical JSON 값이 일치해야 한다", () => {
    const input = makeInput();
    const body = makeBody();
    const chart = makeChart(input);
    const canonical = buildCanonicalAstroChart(body, input, chart, "personal", null, null, null, null);

    const summary = buildBasicAstroSummaryFromChart(chart);
    const sun = canonical.planets.find((p) => p.nameEn === "Sun");
    const moon = canonical.planets.find((p) => p.nameEn === "Moon");

    expect(canonical.angles.ascendant.sign).toBe(summary.ascendant.sign);
    expect(canonical.angles.mc.sign).toBe(summary.mc.sign);
    expect(sun.sign).toBe(summary.sun.sign);
    expect(moon.sign).toBe(summary.moon.sign);
    expect(Number(sun.house)).toBe(Number(summary.sun.house));
    expect(Number(moon.house)).toBe(Number(summary.moon.house));
  });

  test("B. houses 배열이 12개가 아니면 strict validation은 실패해야 한다", () => {
    const canonical = makeCanonical();
    const broken = clone(canonical);
    broken.houses = broken.houses.slice(0, 11);

    const result = validateCanonicalAstroChartStrict(broken);
    expect(result.isValid).toBe(false);
    expect(result.missingFields.some((f) => f.includes("houses.length=12"))).toBe(true);
  });

  test("C. 각 planet에 sign/degree/house가 없으면 strict validation은 실패해야 한다", () => {
    const canonical = makeCanonical();
    const broken = clone(canonical);
    const sun = broken.planets.find((p) => p.nameEn === "Sun");
    sun.sign = null;
    sun.degree = null;
    sun.house = null;

    const result = validateCanonicalAstroChartStrict(broken);
    expect(result.isValid).toBe(false);
    expect(result.missingFields.some((f) => f.includes("planets.Sun.sign"))).toBe(true);
    expect(result.missingFields.some((f) => f.includes("planets.Sun.degree"))).toBe(true);
    expect(result.missingFields.some((f) => f.includes("planets.Sun.house"))).toBe(true);
  });

  test("D. relationship.hasPartner=false이면 Synastry/Composite 챕터가 생성되지 않아야 한다", () => {
    const canonical = makeCanonical();
    canonical.relationship.hasPartner = false;
    canonical.relationship.partnerNatal = null;
    canonical.relationship.synastry = null;
    canonical.relationship.composite = null;

    const plan = buildAstroChapterPlan(canonical);
    const planText = plan.map((p) => `${p.key}:${p.title}`).join("\n");
    expect(planText.includes("Synastry")).toBe(false);
    expect(planText.includes("Composite")).toBe(false);
    expect(plan.some((p) => String(p.key).startsWith("R"))).toBe(false);
  });

  test("E. forecast 데이터가 없으면 Forecast 챕터(C12)가 생성되지 않아야 한다", () => {
    const canonical = makeCanonical();
    canonical.forecast.transits = null;
    canonical.forecast.secondaryProgressions = null;
    canonical.forecast.solarReturn = null;

    const revalidated = validateCanonicalAstroChartStrict(canonical);
    canonical.validation.hasForecast = revalidated.hasForecast;

    const plan = buildAstroChapterPlan(canonical);
    expect(plan.some((p) => p.key === "C12")).toBe(false);
  });

  test("F. 실행 보강 메모 패딩 문구는 탐지되어야 한다", () => {
    const text = "### 실행 보강 메모 1\n이번 주에는 큰 결정보다 작은 루틴 고정을 우선하세요.";
    expect(hasForbiddenAstroPadding(text)).toBe(true);
  });

  test("G. 동일 문장 30자 이상 2회 반복은 탐지되어야 한다", () => {
    const repeated = "태양과 달의 긴장각을 다룰 때는 행동 루틴을 정밀하게 분리해 감정 과속을 낮추는 것이 핵심입니다";
    const text = `${repeated}.\n다른 문장입니다.\n${repeated}.`;
    const hits = detectRepeatedLongSentences(text, 30);
    expect(hits.length).toBeGreaterThan(0);
  });

  test("H. 본문에 실제 행성/하우스/어스펙트 근거가 포함되는지 검사할 수 있어야 한다", () => {
    const good = "태양은 사자자리 12.3도 5하우스에 있고, 달은 전갈자리 2.1도 8하우스입니다. Sun square Moon orb 1.8로 감정과 의지의 긴장을 만듭니다.";
    const bad = "당신은 특별하고 직관이 뛰어납니다. 오늘은 휴식을 취하세요.";

    expect(hasAstroDataEvidence(good)).toBe(true);
    expect(hasAstroDataEvidence(bad)).toBe(false);
  });

  test("I. Page 0 of 0 문자열은 실패 신호로 탐지되어야 한다", () => {
    expect(hasBrokenPageCounter("Page 0 of 0")).toBe(true);
    expect(hasBrokenPageCounter("3 / 15")).toBe(false);
  });

  test("J. 사용자 A/B 차트 차이에 따라 생성 프롬프트가 달라져야 한다", () => {
    const inputA = makeInput({ year: 1992, month: 6, day: 15, hour: 12, minute: 30 });
    const inputB = makeInput({ year: 1988, month: 12, day: 3, hour: 22, minute: 10 });

    const canonicalA = makeCanonical(inputA, makeBody({ name: "A" }));
    const canonicalB = makeCanonical(inputB, makeBody({ name: "B" }));

    const planA = buildAstroChapterPlan(canonicalA);
    const planB = buildAstroChapterPlan(canonicalB);

    const promptA = buildAstroChapterPrompt(planA[0], canonicalA, []);
    const promptB = buildAstroChapterPrompt(planB[0], canonicalB, []);

    expect(promptA).not.toEqual(promptB);
  });
});
