/**
 * 9 센터와 게이트→센터 귀속표.
 *
 * 🔴 사람이 읽는 문구(센터 이름의 한국어/영어 설명, 테마 서술)는 여기 두지 않는다.
 *    워커 번들에 서술 텍스트를 싣지 않기 위한 규칙이며, 표시 문구는 app/human-design/_copy 소관이다.
 */

/** 센터 canonical identifier */
export const CENTER = Object.freeze({
  HEAD: "HEAD",
  AJNA: "AJNA",
  THROAT: "THROAT",
  G: "G",
  HEART: "HEART",
  SOLAR_PLEXUS: "SOLAR_PLEXUS",
  SACRAL: "SACRAL",
  SPLEEN: "SPLEEN",
  ROOT: "ROOT",
});

/** 바디그래프 위→아래 표시 순서 */
export const CENTER_ORDER = Object.freeze([
  CENTER.HEAD,
  CENTER.AJNA,
  CENTER.THROAT,
  CENTER.G,
  CENTER.HEART,
  CENTER.SOLAR_PLEXUS,
  CENTER.SACRAL,
  CENTER.SPLEEN,
  CENTER.ROOT,
]);

/**
 * 모터 센터. 타입 판정(모터→목 연결)에 쓴다.
 * 🔴 Sacral 도 모터다 — Generator/Manifesting Generator 분기에서 별도로 다룰 뿐 목록에서 빼지 않는다.
 */
export const MOTOR_CENTERS = Object.freeze([
  CENTER.SACRAL,
  CENTER.HEART,
  CENTER.SOLAR_PLEXUS,
  CENTER.ROOT,
]);

/**
 * 인식(awareness) 센터. 권위 판정 문서화를 위한 참고 상수.
 */
export const AWARENESS_CENTERS = Object.freeze([
  CENTER.AJNA,
  CENTER.SPLEEN,
  CENTER.SOLAR_PLEXUS,
]);

const RAW_CENTER_GATES = Object.freeze({
  [CENTER.HEAD]: [61, 63, 64],
  [CENTER.AJNA]: [4, 11, 17, 24, 43, 47],
  [CENTER.THROAT]: [8, 12, 16, 20, 23, 31, 33, 35, 45, 56, 62],
  [CENTER.G]: [1, 2, 7, 10, 13, 15, 25, 46],
  [CENTER.HEART]: [21, 26, 40, 51],
  [CENTER.SOLAR_PLEXUS]: [6, 22, 30, 36, 37, 49, 55],
  [CENTER.SACRAL]: [3, 5, 9, 14, 27, 29, 34, 42, 59],
  [CENTER.SPLEEN]: [18, 28, 32, 44, 48, 50, 57],
  [CENTER.ROOT]: [19, 38, 39, 41, 52, 53, 54, 58, 60],
});

/** 센터 → 그 센터가 소유한 게이트 목록 */
export const CENTER_GATES = Object.freeze(
  Object.fromEntries(Object.entries(RAW_CENTER_GATES).map(([center, gates]) => [center, Object.freeze([...gates])])),
);

function buildGateToCenter() {
  const map = new Map();
  for (const [center, gates] of Object.entries(RAW_CENTER_GATES)) {
    for (const gate of gates) {
      if (map.has(gate)) {
        throw new Error(`게이트 ${gate} 가 센터 ${map.get(gate)} 와 ${center} 양쪽에 등록됐다.`);
      }
      map.set(gate, center);
    }
  }
  return map;
}

const GATE_TO_CENTER_MAP = buildGateToCenter();

/**
 * 게이트가 속한 센터.
 * @param {number} gate 1~64
 * @returns {string} CENTER 값
 */
export function centerOfGate(gate) {
  const center = GATE_TO_CENTER_MAP.get(Number(gate));
  if (!center) throw new RangeError(`centerOfGate: 알 수 없는 게이트 (${gate})`);
  return center;
}

/** 게이트→센터 전체 매핑(읽기 전용 복사본) */
export function gateToCenterEntries() {
  return Object.freeze([...GATE_TO_CENTER_MAP.entries()].map(([gate, center]) => Object.freeze({ gate, center })));
}
