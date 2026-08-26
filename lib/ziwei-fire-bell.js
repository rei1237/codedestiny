/**
 * 화성(火星)·영성(鈴星) 기점 — 셸 엔진(js/saju-engine.js)·워커 엔진(worker/lib/ziwei-ai-chart.js)·
 * 앱 엔진(app/_lib/ziwei-engine.ts)이 함께 쓰는 정본.
 *
 * 여기 있는 이유는 lib/ziwei-minor-limit.js 머리말과 같다 — 프론트는 `worker/` 를,
 * 워커는 `app/` 을 import 할 수 없으므로 양쪽이 함께 import 할 수 있는 `lib/` 에 둔다.
 *
 * 🔴 표기 축을 섞지 않으려고 지지를 **문자가 아니라 인덱스(0~11)** 로만 다룬다.
 * 셸은 한자('寅'), 워커는 한글('인'), 앱은 한글('인') 을 쓰는데 세 배열의 순서는 같다.
 *
 * 🔴 정적 셸 js/saju-engine.js 는 브라우저 클래식 전역 스크립트라 import 가 불가능하다.
 * 그쪽은 리터럴(hlStart)을 그대로 두고, scripts/verify-ziwei-star-parity.mjs 가 이 표와 대조한다.
 *
 * ── 왜 만들었나 (2026-08-27) ────────────────────────────────────────────────
 * 워커는 영성 기점 표를 갖지 않고 화성 기점에서 `- hourIndex` 로 역행시켰다.
 * 그러면 `2 × hourIndex ≡ 0 (mod 12)` 인 자시(hourIndex 0)·오시(hourIndex 6) 출생에서
 * 화성과 영성이 **같은 궁에 겹친다** — 전체 출생 시각의 1/6 이다.
 * 실측(2026-08-27): 1991-09-02 11:45 와 2000-01-01 12:00 이 둘 다 화성·영성 모두 卯 였다.
 */

/**
 * 생년지 인덱스(子0 丑1 寅2 卯3 辰4 巳5 午6 未7 申8 酉9 戌10 亥11)
 * → [화성 기점 지지 인덱스, 영성 기점 지지 인덱스].
 *
 * 삼합국별 고전 규칙:
 *   寅午戌 → 화성 丑(1), 영성 卯(3)
 *   申子辰 → 화성 寅(2), 영성 戌(10)
 *   巳酉丑 → 화성 卯(3), 영성 戌(10)
 *   亥卯未 → 화성 酉(9), 영성 戌(10)
 * 두 별 모두 기점에서 시지만큼 **순행**한다.
 */
export const FIRE_BELL_START_BY_YEAR_BRANCH = Object.freeze([
  Object.freeze([2, 10]),  // 子 → 申子辰
  Object.freeze([3, 10]),  // 丑 → 巳酉丑
  Object.freeze([1, 3]),   // 寅 → 寅午戌
  Object.freeze([9, 10]),  // 卯 → 亥卯未
  Object.freeze([2, 10]),  // 辰 → 申子辰
  Object.freeze([3, 10]),  // 巳 → 巳酉丑
  Object.freeze([1, 3]),   // 午 → 寅午戌
  Object.freeze([9, 10]),  // 未 → 亥卯未
  Object.freeze([2, 10]),  // 申 → 申子辰
  Object.freeze([3, 10]),  // 酉 → 巳酉丑
  Object.freeze([1, 3]),   // 戌 → 寅午戌
  Object.freeze([9, 10]),  // 亥 → 亥卯未
]);

function mod12(value) {
  return ((value % 12) + 12) % 12;
}

/**
 * 화성·영성 배치.
 * @param {{ yearBranchIndex: number, hourIndex: number }} params
 * @returns {{ fireBranchIndex: number, bellBranchIndex: number }}
 */
export function placeFireAndBell({ yearBranchIndex, hourIndex }) {
  const [fireStart, bellStart] = FIRE_BELL_START_BY_YEAR_BRANCH[mod12(yearBranchIndex)];
  return {
    fireBranchIndex: mod12(fireStart + hourIndex),
    bellBranchIndex: mod12(bellStart + hourIndex),
  };
}
