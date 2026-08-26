/**
 * 소한(小限) 상수와 계산 — 셸 엔진(js/saju-engine.js)과 워커 엔진(worker/lib/ziwei-ai-chart.js)이
 * 함께 쓰는 정본.
 *
 * 여기 있는 이유: 프론트는 `worker/` 를 import 할 수 없고 워커는 `app/` 을 import 할 수 없다.
 * 그래서 양쪽이 함께 import 할 수 있는 `lib/` 에 둔다 — `lib/payment/pass-pricing.js` ·
 * `lib/music-access-policy.js` 가 쓰는 것과 같은 방식이다.
 *
 * 🔴 정적 셸 js/saju-engine.js 는 브라우저 클래식 전역 스크립트라 import 가 불가능하다.
 * 그쪽은 리터럴을 그대로 두고, scripts/verify-ziwei-worker-chart-facts.mjs 가 이 모듈과 대조한다.
 *
 * 🔴 표기 축을 섞지 않으려고 지지·천간을 **문자가 아니라 인덱스(0~11 / 0~9)** 로만 다룬다.
 * 셸은 한자('子'), 워커는 한글('자') 를 쓰는데 두 배열의 순서는 같다(자=0=子).
 * 문자로 키를 잡으면 바로 그 지점에서 두 엔진이 갈라진다.
 */

/**
 * 소한 시작궁 — 생년지의 삼합국으로 정한다.
 * 寅午戌→辰, 申子辰→戌, 巳酉丑→未, 亥卯未→丑.
 * 인덱스: 子0 丑1 寅2 卯3 辰4 巳5 午6 未7 申8 酉9 戌10 亥11
 */
export const MINOR_LIMIT_START_BRANCH_BY_YEAR_BRANCH = Object.freeze([
  10, // 子 → 戌
  7,  // 丑 → 未
  4,  // 寅 → 辰
  1,  // 卯 → 丑
  10, // 辰 → 戌
  7,  // 巳 → 未
  4,  // 午 → 辰
  1,  // 未 → 丑
  10, // 申 → 戌
  7,  // 酉 → 未
  4,  // 戌 → 辰
  1,  // 亥 → 丑
]);

/** 셸과 같은 상한(1세~100세). */
export const MINOR_LIMIT_MAX_AGE = 100;

function mod(value, size) {
  return ((value % size) + size) % size;
}

/** 서기 연도 → 세차 천간 인덱스(甲=0). */
export function stemIndexOfYear(year) {
  return mod(year - 4, 10);
}

/** 서기 연도 → 세차 지지 인덱스(子=0). */
export function branchIndexOfYear(year) {
  return mod(year - 4, 12);
}

/**
 * 나이를 세는 기준 연도.
 *
 * 🔴 양력 생년이 아니라 **세차(歲次) 연도**다. 1월 1일생처럼 입춘 전에 태어나면 세차가 전년도라,
 * 양력 연도로 세면 평생 한 살씩 어긋난다. 생년 근처(±1년)에서 세차 간지가 일치하는 해를 되찾는다.
 */
export function resolveSexagenaryBaseYear(solarBirthYear, yearStemIndex, yearBranchIndex) {
  for (let candidate = solarBirthYear - 1; candidate <= solarBirthYear + 1; candidate += 1) {
    if (stemIndexOfYear(candidate) === yearStemIndex && branchIndexOfYear(candidate) === yearBranchIndex) {
      return candidate;
    }
  }
  return solarBirthYear;
}

/**
 * 소한 배치.
 *
 * 1세를 시작궁에 두고 한 해에 한 궁씩 옮긴다.
 * 🔴 방향은 남명 순행 · 여명 역행이다 — 대한(음양남녀)의 방향과 규칙이 다르니 재사용하지 말 것.
 *
 * 반환값은 표기 없는 인덱스뿐이다. 궁 이름·간지 문자열은 각 엔진이 자기 표기로 만든다.
 * @returns {{age:number, year:number, stemIndex:number, branchIndex:number, palaceBranchIndex:number}[]}
 */
export function buildMinorLimitEntries({
  yearStemIndex,
  yearBranchIndex,
  solarBirthYear,
  isMale,
  maxAge = MINOR_LIMIT_MAX_AGE,
}) {
  const startBranchIndex = MINOR_LIMIT_START_BRANCH_BY_YEAR_BRANCH[mod(yearBranchIndex, 12)];
  if (!Number.isInteger(startBranchIndex)) return [];
  const baseYear = resolveSexagenaryBaseYear(solarBirthYear, yearStemIndex, yearBranchIndex);
  const direction = isMale ? 1 : -1;
  const entries = [];
  for (let age = 1; age <= maxAge; age += 1) {
    const year = baseYear + age - 1;
    entries.push({
      age,
      year,
      stemIndex: stemIndexOfYear(year),
      branchIndex: branchIndexOfYear(year),
      palaceBranchIndex: mod(startBranchIndex + (age - 1) * direction, 12),
    });
  }
  return entries;
}

/** 소한 자체의 요약(시작궁·방향·기준연도). 셸의 soHan 객체와 같은 정보다. */
export function describeMinorLimit({ yearStemIndex, yearBranchIndex, solarBirthYear, isMale }) {
  const startBranchIndex = MINOR_LIMIT_START_BRANCH_BY_YEAR_BRANCH[mod(yearBranchIndex, 12)];
  if (!Number.isInteger(startBranchIndex)) return null;
  return {
    startBranchIndex,
    direction: isMale ? 1 : -1,
    baseYear: resolveSexagenaryBaseYear(solarBirthYear, yearStemIndex, yearBranchIndex),
    solarBirthYear,
  };
}
