// 사주 일진 길흉 — 순수 판정 레이어(I/O 비의존).
//
// 숙요는 judgeDayFortune(sukuyo-relation-core.js), 베다는 judgeTaraBala(nakshatra-codex.js)로
// 이미 그날의 길흉이 나오는데 사주만 없었다. 홈 "오늘의 운세" 3종이 같은 어휘로 길흉을
// 말하려면 사주에도 같은 모양의 판정이 필요하다. 그래서 티어 명칭은 숙요 정본
// (DAY_TIER_LABEL)을 그대로 가져다 쓴다 — 세 점술이 각자 다른 등급 이름을 쓰면 안 된다.
//
// 판정 규칙은 새로 지어내지 않고 명식 정본(calculateLifeBookAiSaju)이 이미 내는 값만 조합한다:
//   일간(dayMaster) · 오행 분포(fiveElements) · 신강약(strength) · 일지(pillarDetails.day)
// 그 위에 오늘 일진(천간/지지)을 얹어 십성을 뽑고, 신강약에 따라 반대로 읽는다.
//   신강 → 덜어내는 십성(식상·재성·관성)이 길, 채우는 십성(비겁·인성)이 흉
//   신약 → 채우는 십성(인성·비겁)이 길, 덜어내는 십성(식상·재성·관성)이 흉
//   중화 → 부족한 오행이 오면 길, 과다한 오행이 오면 흉
// 이것이 용신을 잡는 가장 기본형(억부용신)이며, 정본이 usefulGod/unfavorableGod를 뽑을 때
// 쓰는 축(최소 오행 보완 / 최대 오행 억제)과 같은 기준이다.

import {
  BRANCH_CLASH_PAIRS,
  BRANCH_COMBINATION_PAIRS,
  BRANCH_ELEMENT,
  HIDDEN_STEMS,
  STEM_ELEMENT,
  tenGodFor,
} from "./life-book-ai-saju.js";
import { toKrBranch, toKrStem } from "./saju-snapshot-from-birth.js";
import { DAY_TIER_LABEL } from "./sukuyo-relation-core.js";

// 십성 10종 → 5계열. 신강약 판정은 계열 단위로 움직인다.
const TEN_GOD_GROUP = {
  비견: "비겁", 겁재: "비겁",
  식신: "식상", 상관: "식상",
  편재: "재성", 정재: "재성",
  편관: "관성", 정관: "관성",
  편인: "인성", 정인: "인성",
};

// 계열별 가중치. 신강/신약은 부호가 뒤집힌다(억부).
const GROUP_WEIGHT = {
  strong: { 식상: 20, 재성: 22, 관성: 14, 비겁: -20, 인성: -16 },
  weak: { 인성: 22, 비겁: 18, 식상: -14, 재성: -18, 관성: -22 },
};

const GROUP_MEANING = {
  비겁: "나와 같은 힘이 서는",
  식상: "표현하고 내보내는",
  재성: "쥐고 다루는",
  관성: "책임과 규율이 서는",
  인성: "배우고 기대는",
};

// 계열 × 길흉 방향의 조언. 같은 십성도 신강·신약에 따라 반대로 읽히므로
// "도움이 되는 날"과 "새는 날"의 문장을 따로 둔다.
const GROUP_ADVICE = {
  비겁: {
    good: "내 힘으로 밀어붙일 수 있는 날입니다. 남의 속도에 맞추지 말고 내 리듬대로 하나를 끝내세요.",
    bad: "고집과 경쟁심이 앞서기 쉬운 날입니다. 내 몫을 지키려다 사람을 밀어내지 않도록 한 걸음 물러서세요.",
  },
  식상: {
    good: "말과 표현이 잘 통하는 날입니다. 미뤄 둔 제안·발표·연락을 오늘 꺼내면 반응이 옵니다.",
    bad: "기운이 밖으로 새기 쉬운 날입니다. 말은 줄이고, 벌이기보다 이미 시작한 것을 여미세요.",
  },
  재성: {
    good: "손에 잡히는 결과를 만들기 좋은 날입니다. 돈·일정·거래처럼 실물이 오가는 일에 힘이 실립니다.",
    bad: "욕심이 앞서 지출과 일이 함께 커지는 날입니다. 큰 결제와 새 약속은 하루 재워 두세요.",
  },
  관성: {
    good: "규율이 나를 세워 주는 날입니다. 맡은 자리를 정확히 지키면 인정과 신뢰가 따라옵니다.",
    bad: "밖에서 오는 압박이 무겁게 느껴지는 날입니다. 정면 돌파보다 기한과 경계를 다시 정리하세요.",
  },
  인성: {
    good: "누군가의 도움과 배움이 들어오는 날입니다. 혼자 끙끙대지 말고 먼저 물어보세요.",
    bad: "생각만 많아지고 실행이 늦어지는 날입니다. 더 알아보기보다 오늘 할 수 있는 한 가지를 하세요.",
  },
};

// 일지 관계 보정 — 오늘 일지가 내 일지를 충하면 흔들리고, 합하면 순해진다.
const CLASH_SET = new Set(BRANCH_CLASH_PAIRS.map(([a, b]) => `${a}${b}`).concat(BRANCH_CLASH_PAIRS.map(([a, b]) => `${b}${a}`)));
const COMBINATION_SET = new Set(BRANCH_COMBINATION_PAIRS.map(([a, b]) => `${a}${b}`).concat(BRANCH_COMBINATION_PAIRS.map(([a, b]) => `${b}${a}`)));

function normalizeStrength(strengthText) {
  const text = String(strengthText || "");
  if (text.includes("강한")) return "strong";
  if (text.includes("약한")) return "weak";
  return "balanced";
}

function extremeElements(fiveElements) {
  const entries = Object.entries(fiveElements || {})
    .map(([key, value]) => [key, Number(value) || 0])
    .sort((a, b) => a[1] - b[1]);
  if (!entries.length) return { lacking: "", excess: "" };
  return { lacking: entries[0][0], excess: entries[entries.length - 1][0] };
}

// 신강/신약이면 계열 가중치, 중화면 오행 과부족으로 점수를 낸다.
function weigh(mode, group, element, extremes) {
  if (mode === "strong" || mode === "weak") return GROUP_WEIGHT[mode][group] || 0;
  if (element && element === extremes.lacking) return 18;
  if (element && element === extremes.excess) return -16;
  return 5;
}

/**
 * 지지 하나가 이 명식에 갖는 기여도(억부 기준). 십이지시 시간대 점수(today-saju-detail.js)가 쓴다.
 * 억부 규칙을 두 벌로 만들지 않으려고 여기서 내보낸다 — judgeSajuDayFortune 과 같은 weigh() 를 탄다.
 *
 * @returns {{tenGod:string, group:string, element:string, weight:number}|null}
 */
export function scoreBranchForNatal({ dayMaster, branch, strengthMode, lackingElement, excessElement }) {
  const day = String(dayMaster || "").trim();
  const zhi = String(branch || "").trim();
  if (!STEM_ELEMENT[day] || !BRANCH_ELEMENT[zhi]) return null;
  const mainStem = (HIDDEN_STEMS[zhi] || [])[0] || "";
  const tenGod = mainStem ? tenGodFor(day, mainStem) : "";
  const group = TEN_GOD_GROUP[tenGod] || "비겁";
  const element = BRANCH_ELEMENT[zhi];
  const extremes = { lacking: lackingElement || "", excess: excessElement || "" };
  return { tenGod, group, element, weight: weigh(strengthMode, group, element, extremes) };
}

function tierFromScore(score) {
  if (score >= 82) return "great-auspicious";
  if (score >= 66) return "auspicious";
  if (score >= 44) return "caution";
  return "great-caution";
}

/**
 * 오늘의 일진이 이 명식에 갖는 길흉.
 *
 * @param {object} natal calculateLifeBookAiSaju() 결과
 * @param {{stem:string, branch:string}} today 오늘 일주(한자 천간/지지)
 * @returns {object|null} 판정 불가(일간·일진 결손)면 null
 */
export function judgeSajuDayFortune(natal, today) {
  const dayMaster = String(natal?.dayMaster || "").trim();
  const todayStem = String(today?.stem || "").trim();
  const todayBranch = String(today?.branch || "").trim();
  if (!STEM_ELEMENT[dayMaster] || !STEM_ELEMENT[todayStem] || !BRANCH_ELEMENT[todayBranch]) return null;

  const mode = normalizeStrength(natal?.strength);
  const extremes = extremeElements(natal?.fiveElements);

  const stemTenGod = tenGodFor(dayMaster, todayStem);
  const stemGroup = TEN_GOD_GROUP[stemTenGod] || "비겁";
  const stemElement = STEM_ELEMENT[todayStem];

  // 지지는 지장간 본기로 십성을 잡는다(정본이 명식을 셀 때 쓰는 것과 같은 표).
  const branchMainStem = (HIDDEN_STEMS[todayBranch] || [])[0] || "";
  const branchTenGod = branchMainStem ? tenGodFor(dayMaster, branchMainStem) : "";
  const branchGroup = TEN_GOD_GROUP[branchTenGod] || stemGroup;
  const branchElement = BRANCH_ELEMENT[todayBranch];

  const myBranch = String(natal?.pillarDetails?.day?.earthlyBranch || "").trim();
  const pairKey = `${myBranch}${todayBranch}`;
  const clashed = Boolean(myBranch) && CLASH_SET.has(pairKey);
  const combined = Boolean(myBranch) && COMBINATION_SET.has(pairKey);

  // 천간은 그날의 표면, 지지는 바닥 — 지지 가중치를 절반으로 둔다.
  const raw = 58
    + weigh(mode, stemGroup, stemElement, extremes)
    + weigh(mode, branchGroup, branchElement, extremes) * 0.5
    + (clashed ? -10 : 0)
    + (combined ? 6 : 0);
  const score = Math.max(12, Math.min(96, Math.round(raw)));

  // 오늘 천간이 내 일간과 같은 글자면 나와 완전히 같은 결 — 힘이 실리는 만큼 과욕도 함께 온다.
  const tier = todayStem === dayMaster ? "pivotal" : tierFromScore(score);
  const favourable = tier === "great-auspicious" || tier === "auspicious";

  let advice;
  if (tier === "pivotal") {
    advice = "일간과 같은 천간이 드는 날이라 추진력이 크게 실립니다. 다만 밀어붙인 만큼 그대로 돌아오니 오늘은 한 가지에만 힘을 모으세요.";
  } else {
    advice = GROUP_ADVICE[stemGroup][favourable ? "good" : "bad"];
    if (clashed) advice += " 오늘 일지가 내 일지를 충하니 이동·약속 변경이 잦을 수 있습니다.";
  }

  const ganjiKo = `${toKrStem(todayStem)}${toKrBranch(todayBranch)}`;

  return {
    dayGanji: `${todayStem}${todayBranch}`,
    dayGanjiKo: ganjiKo,
    dayMaster,
    dayMasterKo: toKrStem(dayMaster),
    dayElement: stemElement,
    tenGod: stemTenGod,
    tenGodGroup: stemGroup,
    branchTenGod,
    strengthMode: mode,
    lackingElement: extremes.lacking,
    excessElement: extremes.excess,
    branchClash: clashed,
    branchCombination: combined,
    tier,
    tierLabel: DAY_TIER_LABEL[tier],
    score,
    anchor: `오늘의 일진 · ${ganjiKo}일 (${stemElement})`,
    // 숙요 judgeDayFortune 의 headline 과 같은 꼴로 맞춘다("…의 결 — 등급 (오늘은 …)").
    headline: `${stemTenGod}의 결 — ${DAY_TIER_LABEL[tier]} (오늘은 ${GROUP_MEANING[stemGroup]} 자리)`,
    advice,
  };
}
