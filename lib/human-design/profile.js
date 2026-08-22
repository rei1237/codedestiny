/**
 * Profile 산출.
 *
 * 🔴 Profile 은 Type 이나 Authority 에서 역산하지 않는다. **Personality Sun 의 라인 +
 *    Design Sun 의 라인** 두 값에서 직접 나온다(요구사항 13).
 */

/** Incarnation Cross 의 각(angle) canonical identifier */
export const CROSS_ANGLE = Object.freeze({
  RIGHT: "CROSS_ANGLE_RIGHT",
  LEFT: "CROSS_ANGLE_LEFT",
  JUXTAPOSITION: "CROSS_ANGLE_JUXTAPOSITION",
});

/**
 * 기하학적으로 성립 가능한 12 프로파일과 그 각(angle).
 * 여기 없는 조합이 나오면 계산이 어디선가 틀린 것이다(경고로 노출한다).
 */
export const PROFILE_ANGLE_TABLE = Object.freeze({
  "1/3": CROSS_ANGLE.RIGHT,
  "1/4": CROSS_ANGLE.RIGHT,
  "2/4": CROSS_ANGLE.RIGHT,
  "2/5": CROSS_ANGLE.RIGHT,
  "3/5": CROSS_ANGLE.RIGHT,
  "3/6": CROSS_ANGLE.RIGHT,
  "4/6": CROSS_ANGLE.RIGHT,
  "4/1": CROSS_ANGLE.JUXTAPOSITION,
  "5/1": CROSS_ANGLE.LEFT,
  "5/2": CROSS_ANGLE.LEFT,
  "6/2": CROSS_ANGLE.LEFT,
  "6/3": CROSS_ANGLE.LEFT,
});

/** 성립 가능한 12 프로파일 문자열 */
export const CANONICAL_PROFILES = Object.freeze(Object.keys(PROFILE_ANGLE_TABLE));

/**
 * @param {number} personalitySunLine 1~6
 * @param {number} designSunLine 1~6
 * @returns {{profile:string, personalityLine:number, designLine:number, angle:(string|null), canonical:boolean}}
 */
export function calculateProfile(personalitySunLine, designSunLine) {
  const personalityLine = Number(personalitySunLine);
  const designLine = Number(designSunLine);
  for (const [label, value] of [["personalitySunLine", personalityLine], ["designSunLine", designLine]]) {
    if (!Number.isInteger(value) || value < 1 || value > 6) {
      throw new RangeError(`calculateProfile: ${label} 이 1~6 이 아니다 (${value})`);
    }
  }
  const profile = `${personalityLine}/${designLine}`;
  const angle = PROFILE_ANGLE_TABLE[profile] || null;
  return { profile, personalityLine, designLine, angle, canonical: angle !== null };
}
