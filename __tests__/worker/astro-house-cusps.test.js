/**
 * @jest-environment node
 */

let utils;

beforeAll(async () => {
  const mod = await import("../../worker/lib/swiss-ephemeris.js");
  utils = mod.__swissEphemerisTestUtils;
});

describe("Swiss 하우스 커스프 추출", () => {
  // swe_houses_ex 는 cusps[0] 을 비워 두고 1..12 에 실제 커스프를 담는다.
  // 앞칸을 세면 1하우스가 0° 가 되고 12하우스가 통째로 사라진다(2026-09-04 실측 회귀).
  test("13칸 응답에서는 앞의 빈 칸을 버리고 1..12 를 쓴다", () => {
    const raw = { cusps: [0, 185.83, 212.82, 243.48, 276.55, 309.49, 339.69, 5.83, 32.82, 63.48, 96.55, 129.49, 159.69] };
    const cusps = utils.extractHouseCusps(raw);
    expect(cusps).toHaveLength(12);
    expect(cusps[0]).toBeCloseTo(185.83, 6);
    expect(cusps[11]).toBeCloseTo(159.69, 6);
  });

  test("12칸만 오는 구현에서는 그대로 쓴다", () => {
    const raw = { cusps: Array.from({ length: 12 }, (_, idx) => idx * 30) };
    const cusps = utils.extractHouseCusps(raw);
    expect(cusps).toHaveLength(12);
    expect(cusps[0]).toBe(0);
    expect(cusps[11]).toBe(330);
  });
});
