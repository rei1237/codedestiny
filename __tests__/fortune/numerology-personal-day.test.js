/**
 * @jest-environment node
 */
// lib/numerology/personal-day.mjs — /today 수비학 탭과 Threads 수비학 글이 공유하는 날짜 수 계약.

let calc;

beforeAll(async () => {
  calc = await import("../../lib/numerology/personal-day.mjs");
});

const SEP17 = { year: 2026, month: 9, day: 17 };

describe("수비학 날짜 수", () => {
  test("축약은 기존 사이트 정책과 같다 — 11·22·33 에서 멈추고 allowMaster=false 면 끝까지", () => {
    for (const [input, expected] of [[9, 9], [10, 1], [11, 11], [29, 11], [38, 11], [22, 22], [33, 33], [2026, 1], [0, 0]]) {
      expect(calc.reduceNumber(input)).toBe(expected);
    }
    expect(calc.reduceNumber(29, false)).toBe(2);
    expect(calc.reduceNumber(33, false)).toBe(6);
  });

  test("2026-09-17 Universal Day — 연도수 1, UM 10→1, UD 1+9+17=27→9", () => {
    expect(calc.calculateUniversalNumbers(SEP17)).toEqual({ universalYear: 1, universalMonth: 1, universalDay: 9 });
  });

  test("Personal Year·Month·Day 는 누적 합을 한 번에 축약한다", () => {
    // 3월 15일생: base 3+15+1=19 → PY 1, PM 19+9=28 → 1, PD 28+17=45 → 9
    expect(calc.calculatePersonalNumbers({ month: 3, day: 15 }, SEP17)).toMatchObject({ personalYear: 1, personalMonth: 1, personalDay: 9 });
    // 12월 25일생: base 38 → PY 11(마스터 보존), PM 47 → 11, PD 64 → 10 → 1
    expect(calc.calculatePersonalNumbers({ month: 12, day: 25 }, SEP17)).toMatchObject({ personalYear: 11, personalMonth: 11, personalDay: 1 });
  });

  test("형식이 틀리면 null, 2월 29일생은 평년에도 유효", () => {
    expect(calc.calculatePersonalNumbers({ month: 2, day: 30 }, SEP17)).toBeNull();
    expect(calc.calculatePersonalNumbers({ month: 13, day: 1 }, SEP17)).toBeNull();
    expect(calc.calculateUniversalNumbers({ year: 2026, month: 2, day: 29 })).toBeNull();
    expect(calc.calculatePersonalNumbers({ month: 2, day: 29 }, SEP17)).not.toBeNull();
  });
});
