// 삼재: 띠(년지)의 삼합 그룹마다 정해진 세 해.
// 申子辰 띠는 寅卯辰 해, 亥卯未 띠는 巳午未 해, 寅午戌 띠는 申酉戌 해, 巳酉丑 띠는 亥子丑 해(들·눌·날 순).
// lib/fortune/new-year-sign.ts samjaeFor 와 같은 결과를 낸다(대조: __tests__/saju/remedy-samjae.test.mjs).
// 순수 함수이며 던지지 않는다. 읽을 수 없는 입력은 null.

const BRANCH_HANJA = [...'子丑寅卯辰巳午未申酉戌亥'];
const BRANCH_HANGUL = [...'자축인묘진사오미신유술해'];

export const SAMJAE_GROUPS = Object.freeze([
  Object.freeze({ members: Object.freeze([8, 0, 4]), start: 2 }),
  Object.freeze({ members: Object.freeze([11, 3, 7]), start: 5 }),
  Object.freeze({ members: Object.freeze([2, 6, 10]), start: 8 }),
  Object.freeze({ members: Object.freeze([5, 9, 1]), start: 11 }),
]);
export const SAMJAE_STAGES = Object.freeze(['들삼재', '눌삼재', '날삼재']);

/** 그해 세운 지지 번호(子=0). */
export const yearBranchIndex = (year) => ((((Math.trunc(year) - 4) % 12) + 12) % 12);

/** 지지 번호(0~11)·한자·한글을 번호로. 읽을 수 없으면 -1. */
export function toBranchIndex(value) {
  if (Number.isInteger(value)) return value >= 0 && value < 12 ? value : -1;
  const text = String(value ?? '').trim();
  if (text.length !== 1) return -1;
  const hanja = BRANCH_HANJA.indexOf(text);
  return hanja >= 0 ? hanja : BRANCH_HANGUL.indexOf(text);
}

/**
 * 띠 지지가 year 에 삼재인지.
 * @returns {{stage:string|null, offset:number|null, years:{year:number,stage:string}[], nextStartYear:number|null, label:string}|null}
 */
export function samjaeStatus(branch, year) {
  const index = toBranchIndex(branch);
  if (index < 0 || !Number.isFinite(Number(year))) return null;
  const y = Math.trunc(Number(year));
  const group = SAMJAE_GROUPS.find((g) => g.members.includes(index));
  if (!group) return null;
  const branchIndex = yearBranchIndex(y);
  const offset = (branchIndex - group.start + 12) % 12;
  if (offset <= 2) {
    const first = y - offset;
    const stage = SAMJAE_STAGES[offset];
    return {
      stage,
      offset,
      years: SAMJAE_STAGES.map((name, i) => ({ year: first + i, stage: name })),
      nextStartYear: null,
      label: `${stage}(삼재 ${offset + 1}년 차)`,
    };
  }
  const next = y + ((group.start - branchIndex + 12) % 12);
  const label = next === y + 1 ? `삼재 아님 · ${next}년 들삼재 직전 해` : `삼재 아님 · 다음 삼재 ${next}~${next + 2}년`;
  return {
    stage: null,
    offset: null,
    years: SAMJAE_STAGES.map((name, i) => ({ year: next + i, stage: name })),
    nextStartYear: next,
    label,
  };
}
