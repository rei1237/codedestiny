/**
 * @jest-environment node
 *
 * 무료 베다 라우트(/api/vedic-reading)가 저정밀 자체 수식(vedicCalculator.js) 대신 실제 Swiss
 * Ephemeris 브릿지(worker/lib/swiss-ephemeris.js)를 쓰도록 갈아끼운 어댑터(lib/vedicSwissChart.js)
 * 검증. getSwissVedicPlanets는 .se1 에페메리스 파일을 항상 HTTP로 가져오므로(Node에서도 파일시스템이
 * 아니라 origin 기반 fetch) 여기서는 그 결과를 mock해 라시/낙샤트라/바바/다샤 파생·필드 매핑 로직만
 * 검증한다 — 이 어댑터에서 새로 작성한 부분이 정확히 그 매핑 로직이다.
 */

const mockSwiss = {
  planets: { Sun: 0, Moon: 200, Mercury: 0, Venus: 0, Mars: 0, Jupiter: 0, Saturn: 0, Rahu: 90, Ketu: 270 },
  retrograde: {},
  ayanamsa: 24.13,
  ascendantSidereal: 0,
  source: "mock",
  engineQuality: "swiss",
  fallbackUsed: false,
};

let computeVedicChartSwiss;
let getSwissVedicPlanetsMock;

beforeAll(async () => {
  getSwissVedicPlanetsMock = jest.fn(async () => mockSwiss);
  jest.unstable_mockModule("../../worker/lib/swiss-ephemeris.js", () => ({
    getSwissVedicPlanets: getSwissVedicPlanetsMock,
  }));
  ({ computeVedicChartSwiss } = await import("../../lib/vedicSwissChart.js"));
});

const BASE_INPUT = {
  year: 1991,
  month: 2,
  day: 20,
  hour: 8,
  minute: 34,
  tzOffset: 9,
  latitude: 37.5665,
  longitude: 126.978,
};

describe("vedicSwissChart: Swiss 기반 어댑터", () => {
  test("라시/하우스가 라그나(0°=메샤) 기준으로 정확히 파생된다", async () => {
    const chart = await computeVedicChartSwiss(BASE_INPUT);

    expect(chart.lagna.rashi.en).toBe("Aries");
    expect(chart.lagna.rashiIndex).toBe(0);

    expect(chart.sun.rashi.en).toBe("Aries");
    expect(chart.sun.house).toBe(1);

    expect(chart.moon.rashi.en).toBe("Libra");
    expect(chart.moon.house).toBe(7);

    expect(chart.rahu.rashi.en).toBe("Cancer");
    expect(chart.rahu.house).toBe(4);

    expect(chart.ketu.rashi.en).toBe("Capricorn");
    expect(chart.ketu.house).toBe(10);
  });

  test("케투는 항상 라후와 정확히 180° 차이, 하우스는 6칸 차이", async () => {
    const chart = await computeVedicChartSwiss(BASE_INPUT);
    const diff = ((chart.ketu.degree - chart.rahu.degree) % 360 + 360) % 360;
    expect(diff).toBe(180);
    expect(chart.ketu.house).toBe(((chart.rahu.house - 1 + 6) % 12) + 1);
  });

  test("나크샤트라/파다가 정확한 경계 계산으로 파생된다", async () => {
    const chart = await computeVedicChartSwiss(BASE_INPUT);

    // Sun=0° → Ashwini(index0) pada1, 지배성 케투
    expect(chart.sun.nakshatra.name).toBe("아슈위니");
    expect(chart.sun.nakshatra.lord).toBe("케투");
    expect(chart.sun.nakshatra.pada).toBe(1);
    expect(chart.sun.nakshatra.symbol).toBeTruthy();

    // Moon=200° = 정확히 15번째 나크샤트라(Vishakha) 시작 → pada1, 지배성 목성
    expect(chart.moon.nakshatra.name).toBe("비샤카");
    expect(chart.moon.nakshatra.lord).toBe("목성");
    expect(chart.moon.nakshatra.pada).toBe(1);
  });

  test("빔쇼타리 다샤 9구간 합은 120년이고 목성부터 시작한다(달=200°→비샤카, 로드 목성, 오프셋 0)", async () => {
    const chart = await computeVedicChartSwiss(BASE_INPUT);

    expect(chart.dasha.sequence).toHaveLength(9);
    expect(chart.dasha.sequence[0].lord).toBe("목성");
    expect(chart.dasha.sequence[0].years).toBeCloseTo(16, 1);
    expect(chart.dasha.sequence.map((p) => p.lord)).toEqual([
      "목성", "토성", "수성", "케투", "금성", "태양", "달", "화성", "라후",
    ]);
    const total = chart.dasha.sequence.reduce((sum, p) => sum + p.years, 0);
    expect(Math.round(total * 10) / 10).toBe(120);
    expect(chart.dasha.sequence[0].startYear).toBe(1991);
    chart.dasha.sequence.forEach((p) => {
      expect(p.endYear).toBeGreaterThanOrEqual(p.startYear);
    });
    expect(chart.dasha.currentLord).toBeTruthy();
    expect(typeof chart.dasha.remaining).toBe("number");
  });

  test("기존 calculateVedicChart()와 동일한 필드 모양을 유지한다(소비자 하위호환)", async () => {
    const chart = await computeVedicChartSwiss(BASE_INPUT);
    expect(chart.lagna?.rashi?.name).toBeTruthy();
    expect(chart.lagna?.rashi?.en).toBeTruthy();
    expect(chart.lagna?.rashi?.element).toBeTruthy();
    expect(chart.lagna?.rashi?.quality).toBeTruthy();
    expect(typeof chart.lagna?.degree).toBe("number");
    expect(chart.sun?.nakshatra?.name).toBeTruthy();
    expect(chart.moon?.nakshatra?.name).toBeTruthy();
    expect(chart.dasha?.currentLord).toBeTruthy();
    expect(Array.isArray(chart.dasha?.sequence)).toBe(true);
    expect(chart.ayanamsha).toBe(24.13);
  });

  test("위도·경도 범위를 벗어나면 기존과 같은 에러 코드로 실패한다(Swiss 호출 전에 걸러짐)", async () => {
    getSwissVedicPlanetsMock.mockClear();
    await expect(computeVedicChartSwiss({ ...BASE_INPUT, latitude: 95 }))
      .rejects.toThrow("LATITUDE_OUT_OF_RANGE");
    await expect(computeVedicChartSwiss({ ...BASE_INPUT, longitude: 200 }))
      .rejects.toThrow("LONGITUDE_OUT_OF_RANGE");
    expect(getSwissVedicPlanetsMock).not.toHaveBeenCalled();
  });
});
