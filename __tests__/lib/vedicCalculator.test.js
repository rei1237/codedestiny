/**
 * @jest-environment node
 *
 * 무료 베다 라우트(/api/vedic-reading)가 쓰는 저정밀 계산기 검증.
 * 라후/케투는 "평균 노드(mean node)" 근사이며 진노드(true node)와는 수 도 차이가 날 수 있다.
 */

let vedic;

beforeAll(async () => {
  vedic = await import("../../lib/vedicCalculator.js");
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

describe("vedicCalculator: 라후/케투/하우스", () => {
  test("케투는 항상 라후와 정확히 180° 차이", () => {
    const inputs = [
      BASE_INPUT,
      { ...BASE_INPUT, year: 2000, month: 1, day: 1, hour: 12, minute: 0, tzOffset: 0 },
      { ...BASE_INPUT, year: 1975, month: 11, day: 3, hour: 23, minute: 15 },
    ];
    inputs.forEach((input) => {
      const chart = vedic.calculateVedicChart(input);
      const diff = ((chart.ketu.degree - chart.rahu.degree) % 360 + 360) % 360;
      expect(Math.abs(diff - 180)).toBeLessThan(0.05);
      // 라후·케투 라시는 서로 다르다(정확히 6궁 반대편).
      expect(chart.ketu.rashi.en).not.toBe(chart.rahu.rashi.en);
    });
  });

  test("하우스는 1~12 정수, 라후·케투는 6하우스 차이", () => {
    const chart = vedic.calculateVedicChart(BASE_INPUT);
    [chart.sun.house, chart.moon.house, chart.rahu.house, chart.ketu.house].forEach((h) => {
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(1);
      expect(h).toBeLessThanOrEqual(12);
    });
    const expectedKetuHouse = ((chart.rahu.house - 1 + 6) % 12) + 1;
    expect(chart.ketu.house).toBe(expectedKetuHouse);
  });

  test("라그나 라시에 있는 천체는 1하우스로 나온다", () => {
    const chart = vedic.calculateVedicChart(BASE_INPUT);
    // 라그나 자신을 기준으로 한 하우스는 정의상 1.
    const bodies = [chart.sun, chart.moon, chart.rahu, chart.ketu];
    bodies.forEach((body) => {
      const sameSignAsLagna = body.rashi.en === chart.lagna.rashi.en;
      if (sameSignAsLagna) expect(body.house).toBe(1);
    });
  });

  test("라후 평균 노드가 J2000 부근에서 통상 범위 안", () => {
    // 2000-01-01 12:00 UT → 트로피컬 평균 노드 ≈ 125.04°, 라히리 아야남샤(≈23.85°) 적용 후 시데리얼 ≈ 101.2°
    const chart = vedic.calculateVedicChart({
      ...BASE_INPUT,
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      tzOffset: 0,
    });
    expect(chart.rahu.degree).toBeGreaterThan(99);
    expect(chart.rahu.degree).toBeLessThan(103);
  });

  test("기존 필드(lagna/sun/moon/dasha)는 그대로 유지된다(하위호환)", () => {
    const chart = vedic.calculateVedicChart(BASE_INPUT);
    expect(chart.lagna?.rashi?.name).toBeTruthy();
    expect(chart.sun?.nakshatra?.name).toBeTruthy();
    expect(chart.moon?.nakshatra?.name).toBeTruthy();
    expect(chart.dasha?.currentLord).toBeTruthy();
    expect(Array.isArray(chart.dasha?.sequence)).toBe(true);
  });
});
