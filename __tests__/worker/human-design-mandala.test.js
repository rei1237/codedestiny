/**
 * @jest-environment node
 */

// Rave Mandala 경계표 — 구조 불변식과 경계/wrap-around 처리.
//
// 🔴 여기서 보는 것은 "게이트 번호가 맞는가"(그건 fixture 대조 몫)가 아니라, **표 자체가
//    성립하는가**다: 64개가 빠짐없이 한 번씩, 합이 정확히 360°, 간극·중첩 0, 그리고
//    0°/360°/-0/359.999999° 같은 입력이 한 칸 어긋나지 않는가.

import {
  GATE_ARC_DEG,
  GATE_WHEEL_SEQUENCE,
  LINE_ARC_DEG,
  LINES_PER_GATE,
  WHEEL_ANCHOR_DEG,
  buildGateBoundaryTable,
  gateBoundary,
  gateLineFromLongitude,
  normalizeLongitude,
  oppositeGate,
  signedDegreeDelta,
} from "../../lib/human-design/mandala.js";

// HD 의 프로그래밍 파트너 32쌍. 휠에서 정확히 180° 반대인 게이트끼리 짝이 된다.
// 배열이나 앵커가 흔들리면 이 표가 가장 먼저 깨진다.
const PROGRAMMING_PARTNERS = [
  [1, 2], [3, 50], [4, 49], [5, 35], [6, 36], [7, 13], [8, 14], [9, 16],
  [10, 15], [11, 12], [17, 18], [19, 33], [20, 34], [21, 48], [22, 47], [23, 43],
  [24, 44], [25, 46], [26, 45], [27, 28], [29, 30], [31, 41], [32, 42], [37, 40],
  [38, 39], [51, 57], [52, 58], [53, 54], [55, 59], [56, 60], [61, 62], [63, 64],
];

describe("게이트 배열 구조", () => {
  test("64개이고 1~64 가 각 정확히 한 번씩 등장한다", () => {
    expect(GATE_WHEEL_SEQUENCE).toHaveLength(64);
    const sorted = [...GATE_WHEEL_SEQUENCE].sort((a, b) => a - b);
    expect(sorted).toEqual(Array.from({ length: 64 }, (_, index) => index + 1));
  });

  test("휠에서 180° 반대인 게이트가 HD 프로그래밍 파트너와 정확히 일치한다", () => {
    const actual = new Set();
    for (const gate of GATE_WHEEL_SEQUENCE) {
      const partner = oppositeGate(gate);
      actual.add([gate, partner].sort((a, b) => a - b).join("-"));
    }
    const expected = new Set(PROGRAMMING_PARTNERS.map(([a, b]) => `${a}-${b}`));
    expect(actual).toEqual(expected);
  });

  test("반대편의 반대편은 자기 자신이다", () => {
    for (const gate of GATE_WHEEL_SEQUENCE) {
      expect(oppositeGate(oppositeGate(gate))).toBe(gate);
    }
  });
});

describe("경계표", () => {
  const table = buildGateBoundaryTable();

  test("게이트 폭과 라인 폭이 정의대로다", () => {
    expect(GATE_ARC_DEG).toBeCloseTo(5.625, 12);
    expect(LINE_ARC_DEG).toBeCloseTo(0.9375, 12);
    expect(LINES_PER_GATE).toBe(6);
  });

  test("앵커에서 시작해 간극 없이 이어지고 한 바퀴에서 닫힌다", () => {
    expect(table[0].startDeg).toBeCloseTo(WHEEL_ANCHOR_DEG, 12);
    for (let index = 0; index < table.length; index += 1) {
      const row = table[index];
      const next = table[(index + 1) % table.length];
      expect(row.endDeg).toBeCloseTo(next.startDeg, 10);
    }
    expect(table[63].endDeg).toBeCloseTo(WHEEL_ANCHOR_DEG, 10);
  });

  test("각 게이트의 6 라인이 간극 없이 게이트를 채운다", () => {
    for (const row of table) {
      expect(row.lines).toHaveLength(6);
      expect(row.lines[0].startDeg).toBeCloseTo(row.startDeg, 12);
      for (let index = 0; index < row.lines.length; index += 1) {
        const line = row.lines[index];
        expect(line.line).toBe(index + 1);
        if (index > 0) expect(line.startDeg).toBeCloseTo(row.lines[index - 1].endDeg, 10);
      }
      expect(row.lines[5].endDeg).toBeCloseTo(row.endDeg, 10);
    }
  });

  test("64 게이트 × 6 라인 = 384 구간의 폭 합이 360° 다", () => {
    const total = table.length * LINES_PER_GATE * LINE_ARC_DEG;
    expect(total).toBeCloseTo(360, 10);
  });

  test("게이트 41 은 2°00'00\" 물병자리(302°)에서 시작한다 — Rave New Year 앵커", () => {
    expect(gateBoundary(41).startDeg).toBeCloseTo(302, 10);
  });
});

describe("normalizeLongitude", () => {
  test.each([
    [0, 0],
    [-0, 0],
    [360, 0],
    [720, 0],
    [-360, 0],
    [359.999999, 359.999999],
    [-1, 359],
    [-0.0000001, 359.9999999],
    [123.456, 123.456],
  ])("%p → %p", (input, expected) => {
    expect(normalizeLongitude(input)).toBeCloseTo(expected, 9);
  });

  test("항상 [0, 360) 안에 있고 -0 를 만들지 않는다", () => {
    for (const input of [0, -0, 360, -360, 719.9999999, -719.9999999]) {
      const value = normalizeLongitude(input);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(360);
      expect(Object.is(value, -0)).toBe(false);
    }
  });

  test("유한하지 않은 값은 던진다", () => {
    for (const input of [NaN, Infinity, -Infinity, "abc", null, undefined]) {
      expect(() => normalizeLongitude(input)).toThrow(TypeError);
    }
  });
});

describe("signedDegreeDelta", () => {
  test.each([
    [0, 0],
    [1, 1],
    [-1, -1],
    [180, 180],
    [181, -179],
    [-180, 180],
    [359, -1],
    [361, 1],
  ])("%p → %p", (input, expected) => {
    expect(signedDegreeDelta(input)).toBeCloseTo(expected, 9);
  });
});

describe("gateLineFromLongitude", () => {
  test("모든 게이트 시작점은 그 게이트의 라인 1 이다", () => {
    for (const row of buildGateBoundaryTable()) {
      const result = gateLineFromLongitude(row.startDeg);
      expect(result.gate).toBe(row.gate);
      expect(result.line).toBe(1);
    }
  });

  test("게이트 종료점 직전은 그 게이트의 라인 6, 종료점은 다음 게이트의 라인 1 이다", () => {
    const table = buildGateBoundaryTable();
    for (let index = 0; index < table.length; index += 1) {
      const row = table[index];
      const next = table[(index + 1) % table.length];
      const justBefore = gateLineFromLongitude(row.endDeg - 1e-9);
      expect(justBefore.gate).toBe(row.gate);
      expect(justBefore.line).toBe(6);
      const atEnd = gateLineFromLongitude(row.endDeg);
      expect(atEnd.gate).toBe(next.gate);
      expect(atEnd.line).toBe(1);
    }
  });

  test("모든 라인 시작점이 해당 라인으로 조회된다", () => {
    for (const row of buildGateBoundaryTable()) {
      for (const line of row.lines) {
        const result = gateLineFromLongitude(line.startDeg);
        expect(result.gate).toBe(row.gate);
        expect(result.line).toBe(line.line);
      }
    }
  });

  test("0° · 360° · -0 · 359.999999° 가 모두 같은 칸으로 접힌다", () => {
    const zero = gateLineFromLongitude(0);
    expect(gateLineFromLongitude(360)).toEqual(zero);
    expect(gateLineFromLongitude(-0)).toEqual(zero);
    expect(gateLineFromLongitude(720)).toEqual(zero);
    // 359.999999° 는 0° 와 같은 게이트(앵커 358.25° 에서 시작하는 게이트 25) 안에 있다.
    expect(gateLineFromLongitude(359.999999).gate).toBe(zero.gate);
  });

  test("음수·초과 황경도 정규화 뒤 같은 결과를 준다", () => {
    // offsetInGateDeg 는 큰 값을 접으면서 마지막 자리에 부동소수 잡음이 남는다(1e-13 규모).
    // 판정에 쓰이는 것은 gate/line 이므로 그 둘만 본다.
    const cell = ({ gate, line }) => ({ gate, line });
    for (const base of [0, 37.5, 123.456, 271.875, 358.25]) {
      const expected = cell(gateLineFromLongitude(base));
      expect(cell(gateLineFromLongitude(base + 360))).toEqual(expected);
      expect(cell(gateLineFromLongitude(base - 360))).toEqual(expected);
      expect(cell(gateLineFromLongitude(base + 3600))).toEqual(expected);
    }
  });

  test("결과는 항상 게이트 1~64 · 라인 1~6 이다", () => {
    for (let step = 0; step < 3600; step += 1) {
      const { gate, line } = gateLineFromLongitude(step / 10);
      expect(gate).toBeGreaterThanOrEqual(1);
      expect(gate).toBeLessThanOrEqual(64);
      expect(line).toBeGreaterThanOrEqual(1);
      expect(line).toBeLessThanOrEqual(6);
    }
  });
});
