/**
 * Incarnation Cross 산출.
 *
 * 네 활성만 쓴다(요구사항 15):
 *   Personality Sun · Personality Earth · Design Sun · Design Earth
 *
 * 각(angle)은 Profile 에서 나온다 — Right Angle / Juxtaposition / Left Angle.
 *
 * 🔴 크로스 **이름**(예: "Right Angle Cross of the Sphinx")은 192개나 되는 서술 데이터라
 *    워커 번들에 싣지 않는다. 엔진은 결정론적 `crossId` 만 만들고, 이름은 표시 계층이
 *    이 id 로 조회한다.
 */

import { CROSS_ANGLE } from "./profile.js";

const ANGLE_PREFIX = Object.freeze({
  [CROSS_ANGLE.RIGHT]: "RAX",
  [CROSS_ANGLE.LEFT]: "LAX",
  [CROSS_ANGLE.JUXTAPOSITION]: "JXP",
});

/**
 * @param {object} input
 * @param {number} input.personalitySunGate
 * @param {number} input.personalityEarthGate
 * @param {number} input.designSunGate
 * @param {number} input.designEarthGate
 * @param {string|null} input.angle CROSS_ANGLE 값 (Profile 에서 온다)
 * @returns {{crossId:(string|null), angle:(string|null), gates:{personalitySun:number,personalityEarth:number,designSun:number,designEarth:number}, notation:string}}
 */
export function calculateIncarnationCross(input) {
  const gates = {
    personalitySun: Number(input.personalitySunGate),
    personalityEarth: Number(input.personalityEarthGate),
    designSun: Number(input.designSunGate),
    designEarth: Number(input.designEarthGate),
  };
  for (const [label, gate] of Object.entries(gates)) {
    if (!Number.isInteger(gate) || gate < 1 || gate > 64) {
      throw new RangeError(`calculateIncarnationCross: ${label} 이 1~64 게이트가 아니다 (${gate})`);
    }
  }

  // HD 표기 관례: (의식 태양/의식 지구 | 무의식 태양/무의식 지구)
  const notation = `${gates.personalitySun}/${gates.personalityEarth} | ${gates.designSun}/${gates.designEarth}`;
  const prefix = input.angle ? ANGLE_PREFIX[input.angle] : null;
  const crossId = prefix
    ? `${prefix}-${gates.personalitySun}.${gates.personalityEarth}-${gates.designSun}.${gates.designEarth}`
    : null;

  return { crossId, angle: input.angle || null, gates, notation };
}
