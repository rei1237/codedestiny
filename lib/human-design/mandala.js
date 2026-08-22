/**
 * Rave Mandala — 64 게이트의 황도 배열과 경계표.
 *
 * 🔴 게이트는 황경을 5.625 로 나눈 몫이 아니다. 황도에는 **고정된 게이트 배열**이 있고
 *    1→64 순서가 아니다. 그래서 이 모듈은 `GATE_WHEEL_SEQUENCE`(배열)와
 *    `WHEEL_ANCHOR_DEG`(휠의 절대 앵커) 두 상수로부터 **명시적 경계표**를 만들고,
 *    조회는 반드시 그 표를 통한다. `longitude / 5.625` 만으로 게이트를 정하는 코드는
 *    scripts/verify-human-design.mjs 가 실패시킨다.
 *
 * 배열의 자기정합 근거(테스트로 고정):
 *  - 1~64 가 각 정확히 1회 등장
 *  - 휠에서 정확히 180° 반대(index + 32)인 게이트 쌍 32개가 HD 의 프로그래밍 파트너와 일치
 *    (1/2, 3/50, 5/35, 6/36, 7/13, 8/14, 9/16, 10/15, 11/12, 17/18, 19/33, 20/34, 21/48,
 *     22/47, 23/43, 24/44, 25/46, 26/45, 27/28, 29/30, 31/41, 32/42, 37/40, 38/39, 4/49,
 *     51/57, 52/58, 53/54, 55/59, 56/60, 61/62, 63/64)
 *  - 앵커는 게이트 41 이 2°00'00" 물병자리(302°)에서 시작한다는 Rave New Year 기준과 일치
 *
 * 🔴 그럼에도 이 배열/앵커는 외부 계산기 대조(fixture) 전까지 MAPPING_VERSION 이
 *    "hd-mandala-draft" 다. version.js 참고.
 */

/** 게이트 1개의 폭(도). 360 / 64 */
export const GATE_ARC_DEG = 360 / 64;

/** 라인 1개의 폭(도). GATE_ARC_DEG / 6 */
export const LINE_ARC_DEG = GATE_ARC_DEG / 6;

/** 게이트당 라인 수 */
export const LINES_PER_GATE = 6;

/**
 * 황경이 증가하는 방향(황도 순행)으로 나열한 64 게이트.
 * index 0 의 게이트가 WHEEL_ANCHOR_DEG 에서 시작한다.
 */
export const GATE_WHEEL_SEQUENCE = Object.freeze([
  25, 17, 21, 51, 42, 3, 27, 24,
  2, 23, 8, 20, 16, 35, 45, 12,
  15, 52, 39, 53, 62, 56, 31, 33,
  7, 4, 29, 59, 40, 64, 47, 6,
  46, 18, 48, 57, 32, 50, 28, 44,
  1, 43, 14, 34, 9, 5, 26, 11,
  10, 58, 38, 54, 61, 60, 41, 19,
  13, 49, 30, 55, 37, 63, 22, 36,
]);

/**
 * GATE_WHEEL_SEQUENCE[0](게이트 25)의 시작 황경.
 * 358.25° = 물고기자리 28°15'00".
 */
export const WHEEL_ANCHOR_DEG = 358.25;

/**
 * 황경을 [0, 360) 로 정규화한다.
 *
 * 🔴 `-0`, `360`, `359.9999999999` 같은 값이 그대로 표 조회에 들어가면 게이트가 한 칸
 *    어긋난다. 모든 조회의 입구가 이 함수 하나여야 한다.
 *
 * @param {number} degrees
 * @returns {number} 0 이상 360 미만
 */
export function normalizeLongitude(degrees) {
  // 🔴 Number(null) === 0, Number("") === 0 이다. 느슨하게 받으면 빠진 황경이 조용히 0°
  //    (게이트 25 라인 2)가 되어 "그럴듯하지만 틀린 차트"가 나온다. 숫자만 받는다.
  if (typeof degrees !== "number" || !Number.isFinite(degrees)) {
    throw new TypeError(`normalizeLongitude: 유한한 숫자가 아니다 (${String(degrees)})`);
  }
  const value = degrees;
  const wrapped = value % 360;
  const positive = wrapped < 0 ? wrapped + 360 : wrapped;
  // -0 과 부동소수 오차로 360 에 닿는 경우를 0 으로 접는다.
  return positive >= 360 || Object.is(positive, -0) ? 0 : positive;
}

/**
 * (-180, 180] 범위의 부호 있는 각도 차. 88° 역탐색의 수렴 판정에 쓴다.
 *
 * @param {number} degrees
 * @returns {number}
 */
export function signedDegreeDelta(degrees) {
  if (typeof degrees !== "number" || !Number.isFinite(degrees)) {
    throw new TypeError(`signedDegreeDelta: 유한한 숫자가 아니다 (${String(degrees)})`);
  }
  let delta = degrees % 360;
  if (delta > 180) delta -= 360;
  if (delta <= -180) delta += 360;
  return delta;
}

function buildTable() {
  const rows = GATE_WHEEL_SEQUENCE.map((gate, index) => {
    const startDeg = normalizeLongitude(WHEEL_ANCHOR_DEG + (index * GATE_ARC_DEG));
    const lines = [];
    for (let line = 1; line <= LINES_PER_GATE; line += 1) {
      lines.push(Object.freeze({
        line,
        startDeg: normalizeLongitude(startDeg + ((line - 1) * LINE_ARC_DEG)),
        endDeg: normalizeLongitude(startDeg + (line * LINE_ARC_DEG)),
      }));
    }
    return Object.freeze({
      gate,
      index,
      startDeg,
      endDeg: normalizeLongitude(startDeg + GATE_ARC_DEG),
      lines: Object.freeze(lines),
    });
  });
  return Object.freeze(rows);
}

const GATE_BOUNDARY_TABLE = buildTable();

const GATE_ROW_BY_GATE = Object.freeze(new Map(GATE_BOUNDARY_TABLE.map((row) => [row.gate, row])));

/**
 * 휠 순서(index 0 = 앵커)대로 정렬된 게이트 경계표를 돌려준다.
 * @returns {ReadonlyArray<{gate:number,index:number,startDeg:number,endDeg:number,lines:ReadonlyArray<{line:number,startDeg:number,endDeg:number}>}>}
 */
export function buildGateBoundaryTable() {
  return GATE_BOUNDARY_TABLE;
}

/**
 * 게이트 번호로 경계 행을 찾는다.
 * @param {number} gate 1~64
 */
export function gateBoundary(gate) {
  const row = GATE_ROW_BY_GATE.get(Number(gate));
  if (!row) throw new RangeError(`gateBoundary: 알 수 없는 게이트 (${gate})`);
  return row;
}

/**
 * 황경 → { gate, line }.
 *
 * 경계 지점은 **시작 포함 / 끝 제외**다(startDeg <= x < endDeg). 그래야 인접 게이트가
 * 같은 도수를 두 번 주장하지 않는다.
 *
 * @param {number} longitude 황경(도). 임의 실수 허용 — 내부에서 정규화한다.
 * @returns {{gate:number, line:number, gateIndex:number, offsetInGateDeg:number}}
 */
export function gateLineFromLongitude(longitude) {
  const lon = normalizeLongitude(longitude);
  // 앵커 기준 오프셋으로 옮긴 뒤 index 를 얻는다. 표를 선형 탐색하지 않는 이유는
  // 부동소수 비교가 경계에서 흔들리기 때문이며, 결과는 표의 정의와 동치다.
  const fromAnchor = normalizeLongitude(lon - WHEEL_ANCHOR_DEG);
  let gateIndex = Math.floor(fromAnchor / GATE_ARC_DEG);
  if (gateIndex > 63) gateIndex = 63;
  if (gateIndex < 0) gateIndex = 0;

  const row = GATE_BOUNDARY_TABLE[gateIndex];
  const offsetInGateDeg = fromAnchor - (gateIndex * GATE_ARC_DEG);
  let line = Math.floor(offsetInGateDeg / LINE_ARC_DEG) + 1;
  if (line > LINES_PER_GATE) line = LINES_PER_GATE;
  if (line < 1) line = 1;

  return { gate: row.gate, line, gateIndex, offsetInGateDeg };
}

/**
 * 휠에서 정확히 180° 반대편 게이트(프로그래밍 파트너).
 * @param {number} gate
 * @returns {number}
 */
export function oppositeGate(gate) {
  const row = gateBoundary(gate);
  return GATE_WHEEL_SEQUENCE[(row.index + 32) % 64];
}
