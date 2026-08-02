// 조후(調候)를 얹은 최종 용신 확정 — 클라이언트(무료 초안)와 워커(유료 프롬프트)가 같은 값을 쓰기 위한 공용 모듈.
//
// 왜 필요한가:
//   worker/lib/destiny-bias-engine.js 의 buildSajuProfile() 은 억부(신강/신약)만 본다
//   (buildUsefulGods → { yong, hee, gi, strength }). 조후 축이 없어서
//   worker/routes/naming-prompt.js 의 "용신 판단 근거" 블록에서 조후용신·억부기신 등 4줄이
//   "메인 사주 계산 기준 확인" 이라는 내부 문구로 새어나갔고, /naming-ai 무료 초안은 용신을 아예 못 봤다.
//
// 무엇을 하는가:
//   js/saju-engine.js(2.23MB 전역 스크립트, import 불가)에 있던 순수 함수 3개의 로직만 ESM 으로 이식했다.
//     - analyzeJohu(p)                      (js/saju-engine.js:3794) — 한난조습 판정
//     - _dfJohuUsefulSet(johu)              (js/saju-engine.js:2774) — 조후 → 용신/기신 집합
//     - applyRuntimeYongshinPolicy(...)     (js/saju-engine.js:2799) — 억부 + 조후 통합
//   그 파일을 참조하지는 않는다(브라우저 전역 스크립트라 import 자체가 불가능).
//
// 🔴 억부는 다시 계산하지 않는다 — buildSajuProfile 이 이미 낸 usefulGods 를 그대로 입력으로 받는다.
//    이 모듈이 더하는 것은 조후 축과 최종 통합뿐이다(중첩 계산 금지).

const ELEMENT_ORDER = Object.freeze(["wood", "fire", "earth", "metal", "water"]);

export const ELEMENT_LABELS_KO = Object.freeze({
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
});

// 상극(相剋)·상생(相生). worker/lib/saju-quantum-myeongri.js:37-51 과 같은 값이지만 그 파일은
// 이 두 표를 export 하지 않는다 — 작명 계열(이 모듈 + naming-sound-elements.js)은 여기를 단일 출처로 쓴다.
const CONTROL_TO = Object.freeze({
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
});

const GENERATE_TO = Object.freeze({
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
});

/** 월지 → 계절. js/saju-engine.js:3797 seasonMap 그대로. */
const SEASON_BY_BRANCH = Object.freeze({
  寅: "봄", 卯: "봄", 辰: "봄",
  巳: "여름", 午: "여름", 未: "여름",
  申: "가을", 酉: "가을", 戌: "가을",
  亥: "겨울", 子: "겨울", 丑: "겨울",
});

/** 지지 중 습토 / 조토. js/saju-engine.js:3809-3810 그대로. */
const MOIST_BRANCHES = Object.freeze(["辰", "丑"]);
const DRY_BRANCHES = Object.freeze(["戌", "未"]);

function uniqueElements(list) {
  const out = [];
  (Array.isArray(list) ? list : []).forEach((element) => {
    if (element && ELEMENT_ORDER.indexOf(element) >= 0 && out.indexOf(element) < 0) out.push(element);
  });
  return out;
}

/** buildSajuProfile 의 pillars 를 조후 계산이 쓰는 (원소, 지지) 목록으로 편다. */
function flattenPillarUnits(pillars, includeHour) {
  const keys = includeHour ? ["year", "month", "day", "hour"] : ["year", "month", "day"];
  const units = [];
  keys.forEach((key) => {
    const pillar = pillars?.[key];
    if (!pillar) return;
    units.push({ element: pillar.stemElement, branch: "" });
    units.push({ element: pillar.branchElement, branch: String(pillar.branch || "") });
  });
  return units;
}

/**
 * 한난조습(寒暖燥濕) 판정. js/saju-engine.js:3794 analyzeJohu 의 점수 규칙을 그대로 옮겼다
 * (계절 ±4/±2, 화 +1.5 / 수 -1.5 / 목 +0.5 / 금 -0.5, 습토·조토 카운트).
 * 화면용 문구(badgeCls/improve 등)는 이 모듈의 용도가 아니라 제외했다.
 */
export function analyzeJohu(pillars, includeHour = true) {
  const monthBranch = String(pillars?.month?.branch || "");
  const season = SEASON_BY_BRANCH[monthBranch] || "봄";
  let score = 0;
  if (season === "여름") score += 4;
  else if (season === "봄") score += 2;
  else if (season === "가을") score -= 2;
  else score -= 4;

  let moistCount = 0;
  let dryCount = 0;
  flattenPillarUnits(pillars, includeHour).forEach((unit) => {
    if (unit.element === "fire") { score += 1.5; dryCount += 1; }
    else if (unit.element === "water") { score -= 1.5; moistCount += 1; }
    else if (unit.element === "wood") { score += 0.5; moistCount += 1; }
    else if (unit.element === "metal") { score -= 0.5; dryCount += 1; }
    if (unit.branch && MOIST_BRANCHES.indexOf(unit.branch) >= 0) moistCount += 1;
    if (unit.branch && DRY_BRANCHES.indexOf(unit.branch) >= 0) dryCount += 1;
  });

  let type;
  let temperatureLabel;
  if (score >= 5) { type = "hot"; temperatureLabel = "매우 뜨거움 — 水·金 기운이 절실"; }
  else if (score >= 2) { type = "warm"; temperatureLabel = "따뜻한 편 — 水 기운으로 조절 권장"; }
  else if (score >= -2) { type = "neutral"; temperatureLabel = "한난이 균형 — 계절 흐름에 맞춰 조절"; }
  else if (score >= -5) { type = "cool"; temperatureLabel = "서늘한 편 — 火·木 기운으로 온기 보충"; }
  else { type = "cold"; temperatureLabel = "매우 차가움 — 火·木 기운이 절실"; }

  const diff = moistCount - dryCount;
  let moistType;
  let moistLabel;
  if (diff >= 3) { moistType = "wet"; moistLabel = "습함 — 火·土로 말려 주면 균형"; }
  else if (diff <= -3) { moistType = "dry"; moistLabel = "건조함 — 水·木으로 적셔 주면 균형"; }
  else { moistType = "balanced"; moistLabel = "조습은 균형"; }

  return { score, type, temperatureLabel, moistType, moistLabel, season, moistCount, dryCount };
}

/** 조후 → 용신/기신 집합. js/saju-engine.js:2774 _dfJohuUsefulSet 그대로. */
export function johuUsefulSet(johu) {
  const useful = [];
  const caution = [];
  const type = johu?.type;
  const moistType = johu?.moistType;
  if (type === "hot" || type === "warm") {
    useful.push("water", "metal");
    caution.push("fire", "wood");
  } else if (type === "cold" || type === "cool") {
    useful.push("fire", "wood");
    caution.push("water", "metal");
  }
  if (moistType === "dry") {
    useful.push("water", "wood");
    caution.push("fire");
  } else if (moistType === "wet") {
    useful.push("fire", "earth");
    caution.push("water");
  }
  return { useful: uniqueElements(useful), caution: uniqueElements(caution) };
}

/**
 * buildSajuProfile() 결과 하나로 작명에 필요한 오행 축을 전부 확정한다.
 *
 * @param {object} profile worker/lib/destiny-bias-engine.js 의 buildSajuProfile() 반환값
 * @returns {{
 *   eokbuYongshin: string[], heesin: string[], eokbuKijishin: string[],
 *   johuYongshin: string[], johuKijishin: string[],
 *   finalYongshin: string[], finalKijishin: string[],
 *   lacking: string[], excessive: string[],
 *   nameElements: string[], avoidElements: string[],
 *   strength: string, johu: object, jongSignal: string,
 * }}
 */
export function resolveNamingYongshin(profile) {
  const pillars = profile?.pillars || {};
  const includeHour = profile?.calendar?.includeHour !== false;
  const useful = profile?.usefulGods || {};
  const fiveElements = profile?.fiveElements || {};
  const percentages = fiveElements.percentages || {};

  const johu = analyzeJohu(pillars, includeHour);
  const johuSet = johuUsefulSet(johu);

  // 억부는 buildUsefulGods 결과를 그대로 쓴다(yong 은 스칼라, hee·gi 는 배열).
  const eokbuYongshin = uniqueElements([useful.yong]);
  const heesin = uniqueElements(useful.hee);
  const eokbuKijishin = uniqueElements(useful.gi);

  const finalYongshin = johuSet.useful.length
    ? uniqueElements(johuSet.useful.concat(eokbuYongshin))
    : eokbuYongshin.slice();
  // 억부와 조후가 같은 오행을 두고 반대로 판단하는 경우가 있다. 그대로 두면 프롬프트에
  // "이 오행을 담아라 / 피해라"가 동시에 나가 LLM 이 모순된 지시를 받는다 — 용신 쪽을 남긴다.
  const finalKijishin = uniqueElements(johuSet.caution.concat(eokbuKijishin))
    .filter((element) => finalYongshin.indexOf(element) < 0);

  const lacking = uniqueElements(fiveElements.lacking);
  // buildElementScores 는 excessive 키를 만들지 않는다(naming-prompt.js 가 읽던 undefined 의 원인).
  // 5행 균등이 20%이므로 30% 이상을 과다로 본다. 하나도 없으면 최다 오행 하나를 쓴다.
  const excessive = uniqueElements(
    ELEMENT_ORDER.filter((element) => Number(percentages[element] || 0) >= 30),
  );
  if (!excessive.length && fiveElements.strongest) excessive.push(fiveElements.strongest);

  // 이름에 담을 오행: 최종 용신 우선, 그다음 부족 오행 중 기신이 아닌 것.
  const nameElements = uniqueElements(
    finalYongshin.concat(lacking.filter((element) => finalKijishin.indexOf(element) < 0)),
  );
  const avoidElements = uniqueElements(
    finalKijishin.concat(excessive.filter((element) => finalYongshin.indexOf(element) < 0)),
  );

  // 종격 판정기는 이 모듈에 없다(destiny-bias-engine 에도 없음). 치우침 신호만 정직하게 알린다.
  const topPercent = Math.max(...ELEMENT_ORDER.map((element) => Number(percentages[element] || 0)));
  const jongSignal = topPercent >= 50
    ? `한 오행이 ${topPercent}% 로 치우쳐 종격·가종격 가능성을 함께 검토해야 합니다`
    : "종격 특이 신호 없음";

  return {
    eokbuYongshin,
    heesin,
    eokbuKijishin,
    johuYongshin: johuSet.useful,
    johuKijishin: johuSet.caution,
    finalYongshin,
    finalKijishin,
    lacking,
    excessive,
    nameElements,
    avoidElements,
    strength: String(useful.strength || "balanced"),
    johu,
    jongSignal,
  };
}

/** 오행 키 배열 → "금(金) · 수(水)" 표기. 비면 fallback 문구. */
export function labelElements(list, fallback = "판단 보류") {
  const labels = uniqueElements(list).map((element) => ELEMENT_LABELS_KO[element] || element);
  return labels.length ? labels.join(" · ") : fallback;
}

export { CONTROL_TO, GENERATE_TO, ELEMENT_ORDER };
