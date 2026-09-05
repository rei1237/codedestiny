/**
 * 자미두수 파생 사실 — 엔진이 이미 확정한 값에서 **결정론적으로만** 유도되는 것.
 *
 * 여기 있는 이유: 셸(js/saju-engine.js)·워커(worker/lib/ziwei-ai-chart.js)·앱
 * (app/_lib/ziwei-engine.ts) 세 엔진이 각각 명반을 만드는데, 프롬프트가 "근거로 삼으라"고
 * 지시하는 값 중 **어느 엔진도 내보내지 않는 것**이 있다 — 대한 12궁 재배치, 유년사화,
 * 생년사화와 대한사화가 같은 궁에서 겹치는지. 엔진은 읽기 전용이므로 엔진 출력만 읽어
 * 여기서 유도한다. 배치 위치가 `lib/` 인 이유는 lib/ziwei-minor-limit.js 머리말과 같다 —
 * 프론트는 `worker/` 를, 워커는 `app/` 을 import 할 수 없다.
 *
 * 🔴 여기서 성요 배치를 새로 계산하지 않는다. 어떤 별이 어느 궁에 앉았는지는 **언제나 인자로
 *    받는다.** 엔진과 다른 답을 낼 수 있는 계산을 이 파일에 두면 그 순간 명반이 두 벌이 된다.
 *
 * 🔴 표기 축을 섞지 않으려고 천간·지지는 문자가 아니라 **인덱스**(0~9 / 0~11)로만 다룬다
 *    — lib/ziwei-minor-limit.js 가 세운 규칙. 셸은 한자('甲','子'), 워커·앱은 한글('갑','자')
 *    를 쓴다. 반면 **별 이름은 세 엔진이 모두 한글('자미')** 이라 문자열 그대로 다룬다.
 *
 * 🔴 파생값을 명반 객체에 도로 집어넣지 말 것 — verify:ziwei-worker-chart-facts ⑤ 가 명반
 *    JSON 을 14,000자로 묶는다. worker/routes/ziwei-ai.js 가 명반을 JSON.stringify 로 실어
 *    섹션 그룹 6개 + meta 까지 **7회 반복 전송**하기 때문이다. 이 모듈의 반환값은 직렬화
 *    시점에 만들어 그 자리에서 문자열로 쓰고 버린다.
 *
 * 유파: 『자미두수전서』 통행본 = **삼합파(중주파)**. 결정적 분기점은 壬 화기=무곡 ·
 * 壬 화과=좌보 · 庚 = 陽祿·武權·陰科·同忌 이며, 흠천사화(비성파) 변형이 아니다.
 * 세 엔진의 사화표가 모두 이 표와 같다는 것은 verify:ziwei-derived-facts 가 대조한다.
 */

const STEM_COUNT = 10;
const BRANCH_COUNT = 12;

function mod(value, size) {
  return ((value % size) + size) % size;
}

/** 사화 네 자리의 이름. 배열 순서가 곧 슬롯 인덱스다(화록0 화권1 화과2 화기3). */
export const TRANSFORMATION_SLOTS = Object.freeze(["화록", "화권", "화과", "화기"]);

/**
 * 사화 4성 — 천간 인덱스(갑0 을1 병2 정3 무4 기5 경6 신7 임8 계9) 순.
 * 각 행은 [화록, 화권, 화과, 화기].
 *
 * 🔴 이 표는 정본이 아니라 **사본**이다. 정본은 각 엔진 안에 있고, 이 표가 그것과 한 글자라도
 * 어긋나면 파생값이 명반과 다른 소리를 하게 된다. verify:ziwei-derived-facts ① 이 워커 엔진의
 * FOUR_TRANSFORMATIONS 와 전수 대조하므로, 엔진이 바뀌면 이 파일이 먼저 실패한다.
 */
export const FOUR_TRANSFORMATION_STARS_BY_STEM = Object.freeze([
  Object.freeze(["염정", "파군", "무곡", "태양"]), // 갑
  Object.freeze(["천기", "천량", "자미", "태음"]), // 을
  Object.freeze(["천동", "천기", "문창", "염정"]), // 병
  Object.freeze(["태음", "천동", "천기", "거문"]), // 정
  Object.freeze(["탐랑", "태음", "우필", "천기"]), // 무
  Object.freeze(["무곡", "탐랑", "천량", "문곡"]), // 기
  Object.freeze(["태양", "무곡", "태음", "천동"]), // 경
  Object.freeze(["거문", "태양", "문곡", "문창"]), // 신
  Object.freeze(["천량", "자미", "좌보", "무곡"]), // 임
  Object.freeze(["파군", "거문", "태음", "탐랑"]), // 계
]);

/**
 * 오호둔(五虎遁) — 생년간으로 인궁(寅, 지지 인덱스 2)의 천간을 잡고 12지지를 순행으로 채운다.
 * 甲己→丙, 乙庚→戊, 丙辛→庚, 丁壬→壬, 戊癸→甲.
 *
 * 워커 엔진은 이미 궁간을 내보내지만(palaces[].stem) **앱 엔진은 내보내지 않는다.**
 * 궁간이 없으면 대한사화도 자화도 만들 수 없다 — 앱 표면이 그 두 근거를 못 쓰던 이유다.
 *
 * @param {number} yearStemIndex 생년 천간 인덱스 0~9
 * @returns {number[]} 지지 인덱스(자0 … 해11) 순으로 늘어놓은 궁간 천간 인덱스 12개
 */
export function palaceStemIndexes(yearStemIndex) {
  const stemStart = [2, 4, 6, 8, 0][mod(yearStemIndex, 5)];
  return Array.from({ length: BRANCH_COUNT }, (_, branchIndex) =>
    mod(stemStart + mod(branchIndex - 2, BRANCH_COUNT), STEM_COUNT));
}

/** 세차 천간 인덱스. 서기 4년이 갑자년이다. */
export function yearStemIndex(year) {
  return mod(Number(year) - 4, STEM_COUNT);
}

/** 세차 지지 인덱스. 유년(流年)이 앉는 궁을 이 지지로 찾는다. */
export function yearBranchIndex(year) {
  return mod(Number(year) - 4, BRANCH_COUNT);
}

/**
 * 사화 비성(飛星) 착지 — 그 천간이 만드는 사화 4성이 **각각 어느 궁에 앉았는지**.
 *
 * 생년간을 넣으면 생년사화, 대한 명궁의 궁간을 넣으면 대한사화, 유년 천간을 넣으면 유년사화다.
 * 셋은 계산이 같고 넣는 천간만 다르다.
 *
 * @param {number} stemIndex 천간 인덱스 0~9
 * @param {Array<{name: string, stars: string[]}>} palaces 궁 이름과 그 궁이 품은 별 이름 전부
 * @returns {Array<{slot: string, slotIndex: number, star: string, palaceName: string}>}
 *   명반에 없는 별(그 별을 안 쓰는 엔진·입력)은 착지 궁을 못 찾으므로 **결과에서 빠진다.**
 *   🔴 못 찾은 자리를 빈 문자열로 채워 내보내지 않는다 — 프롬프트가 그것을 근거로 읽는다.
 */
export function sihuaLandings(stemIndex, palaces) {
  const stars = FOUR_TRANSFORMATION_STARS_BY_STEM[mod(stemIndex, STEM_COUNT)] || [];
  const rows = Array.isArray(palaces) ? palaces : [];
  const landings = [];
  for (let slotIndex = 0; slotIndex < stars.length; slotIndex += 1) {
    const star = stars[slotIndex];
    const host = rows.find((palace) => (palace?.stars || []).includes(star));
    if (!host?.name) continue;
    landings.push({ slot: TRANSFORMATION_SLOTS[slotIndex], slotIndex, star, palaceName: host.name });
  }
  return landings;
}

/**
 * 생년사화와 대한사화가 **같은 궁에서 겹치는 자리**.
 *
 * 🔴 여기서 길흉을 판정하지 않는다. "생년 화록이 앉은 궁에 대한 화기가 들어왔다"까지가
 * 사실이고, 그것을 무엇이라 부르는지(록충기·록위록…)와 어떻게 읽는지는 유파가 갈리는
 * 해석이라 프롬프트 층의 몫이다. 데이터 층이 이름을 붙이면 그 이름이 곧 단정이 된다.
 *
 * @returns {Array<{palaceName: string, natalSlot: string, decadeSlot: string, sameStar: boolean}>}
 */
export function sihuaOverlaps(natalLandings, decadeLandings) {
  const overlaps = [];
  for (const natal of natalLandings || []) {
    for (const decade of decadeLandings || []) {
      if (natal.palaceName !== decade.palaceName) continue;
      overlaps.push({
        palaceName: natal.palaceName,
        natalSlot: natal.slot,
        decadeSlot: decade.slot,
        sameStar: natal.star === decade.star,
      });
    }
  }
  return overlaps;
}

/**
 * 대한 12궁 재배치 — 그 대한 동안 12궁이 어느 자리로 옮겨 앉는지(대한명궁·대한부부궁…).
 *
 * 🔴 이 값은 세 엔진 어디에도 없고 **외부 대조본도 없다.** 그래서 방향 규칙을 이 파일이
 * 정하지 않는다 — 엔진이 본명 12궁을 깔아 놓은 배열을 **통째로 회전**시킬 뿐이라, 어느
 * 방향으로 궁 이름이 도는지는 언제나 그 엔진의 본명 배치와 같다. 회전이므로 12궁 이름이
 * 하나도 빠지거나 겹치지 않는 것이 구조적으로 보장되고, 대한명궁이 본명 명궁과 같은 자리에
 * 오는 대한에서는 결과가 본명 배열과 **완전히 같아진다**(verify ④ 가 이것을 단언한다).
 *
 * 🔴 대한의 순행·역행(applyMajorLuck 의 direction)과 섞지 말 것. 그것은 *다음* 대한이 어느
 * 궁으로 가는지를 정할 뿐이고, 여기서 쓰는 것은 한 대한 *안에서* 12궁이 늘어서는 순서다.
 *
 * @param {string[]} natalPalaceNamesByBranch 지지 인덱스 순으로 늘어놓은 본명 12궁 이름
 * @param {number} natalLifeBranchIndex 본명 명궁의 지지 인덱스
 * @param {number} decadeBranchIndex 그 대한이 앉은 궁의 지지 인덱스
 * @returns {string[]} 지지 인덱스 순으로 늘어놓은 대한 12궁 이름. 입력이 12칸이 아니면 빈 배열.
 */
export function decadePalaceNames(natalPalaceNamesByBranch, natalLifeBranchIndex, decadeBranchIndex) {
  const names = Array.isArray(natalPalaceNamesByBranch) ? natalPalaceNamesByBranch : [];
  if (names.length !== BRANCH_COUNT) return [];
  const shift = mod(Number(decadeBranchIndex) - Number(natalLifeBranchIndex), BRANCH_COUNT);
  return Array.from({ length: BRANCH_COUNT }, (_, index) => names[mod(index - shift, BRANCH_COUNT)]);
}
