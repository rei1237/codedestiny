// 일간 10개 × 오늘 일진 → 명리 사실만 내는 순수 판정 레이어(I/O 비의존).
//
// 🔴 **명리 규칙을 여기서 새로 발명하지 않는다.** 십성·십이운성·신살·지지 짝 관계는 전부 기존
// 정본 함수가 판정하고, 이 파일은 그 값을 "일간 10개 × 오늘" 축으로 다시 세울 뿐이다.
//   십성/지장간   worker/lib/life-book-ai-saju.js  tenGodFor() · HIDDEN_STEMS
//   십이운성      worker/lib/saju-gyeokguk.js      getTwelveLifeStage()
//   신살/지지관계 worker/lib/saju-shinsal.js       getCheoneulBranches() 외
//
// 🔴 **생년이 없다.** 날짜와 일간 하나만으로 참인 것까지만 말한다 — 신강/신약과 용신은 원국
// 전체를 봐야 정해지므로 여기서 단정하지 않는다(today-saju-detail.js:373 이 이미 같은 선을 긋는다).
// 그래서 "오늘 나에게 오는 십성"과 "그 기운을 흘려보내는 다음 계열"까지만 낸다.
//
// 🔴 이 파일이 새로 갖는 규칙은 **억부(抑扶) 한 줄뿐**이다: 오늘 들어온 십성이 나를 돕는
// 쪽이면 뽑아 쓸 곳을, 빼거나 누르는 쪽이면 받쳐 줄 곳을 짚는다. 다섯 전이가 각각 비겁생식상·
// 인수용식상·식상생재·득비리재·살인상생으로 이름이 붙어 있는 교과서 배합이고, 임의로 고른 것이 아니다.
//
// 🔴 **여기에 "계열이 生하는 다음 계열"(비겁→식상→재성→관성→인성)을 쓰면 안 된다.** 그 축은
// 오늘 천간의 오행 하나로 접혀서 일간 10개가 전부 같은 글자를 받는다(2026-09-01 실측: 갑자일에
// 10개 일간 전부 병·정 / 사·오). 일간별로 갈리는 것은 아래 억부 축뿐이다.

import { HIDDEN_STEMS, STEM_ELEMENT, tenGodFor } from "./life-book-ai-saju.js";
import { getTwelveLifeStage } from "./saju-gyeokguk.js";
import {
  getCheoneulBranches,
  getHongyeomBranch,
  getMunchangBranch,
  getYanginBranch,
  toBranchKo,
  toStemKo,
} from "./saju-shinsal.js";

/** 일간 10개. 오행 짝(양간·음간)으로 묶은 순서 — 발행 체인의 답글 순서가 이 배열이다. */
export const DAY_STEM_GROUPS = Object.freeze([
  Object.freeze({ element: "목", hanja: "木", stems: Object.freeze(["甲", "乙"]) }),
  Object.freeze({ element: "화", hanja: "火", stems: Object.freeze(["丙", "丁"]) }),
  Object.freeze({ element: "토", hanja: "土", stems: Object.freeze(["戊", "己"]) }),
  Object.freeze({ element: "금", hanja: "金", stems: Object.freeze(["庚", "辛"]) }),
  Object.freeze({ element: "수", hanja: "水", stems: Object.freeze(["壬", "癸"]) }),
]);

/** 십성 10종 → 5계열. tenGodFor() 가 내는 한글 이름을 그대로 키로 쓴다. */
export const TEN_GOD_GROUP = Object.freeze({
  비견: "비겁", 겁재: "비겁",
  식신: "식상", 상관: "식상",
  편재: "재성", 정재: "재성",
  편관: "관성", 정관: "관성",
  편인: "인성", 정인: "인성",
});

/** 계열 → 그 계열에 속한 십성 2종. */
export const GROUP_TEN_GODS = Object.freeze({
  비겁: Object.freeze(["비견", "겁재"]),
  식상: Object.freeze(["식신", "상관"]),
  재성: Object.freeze(["편재", "정재"]),
  관성: Object.freeze(["편관", "정관"]),
  인성: Object.freeze(["편인", "정인"]),
});

/**
 * 억부 — 오늘 계열이 나에게 하는 일과, 그래서 있으면 좋은 계열.
 * 돕는 쪽(비겁·인성)이 오면 뽑아 쓸 곳(식상)을, 빼거나 누르는 쪽(식상·재성·관성)이 오면
 * 받쳐 줄 곳(재성·비겁·인성)을 짚는다.
 */
const SUPPORT_GROUP = Object.freeze({
  비겁: "식상", 인성: "식상", 식상: "재성", 재성: "비겁", 관성: "인성",
});

/**
 * 배합 5종의 이름과 한 줄. 키는 <오늘 계열>이다.
 * 🔴 이 표가 "어떤 십성이 있으면 좋다"의 근거 문장이다 — 결정론 폴백이 이 줄을 그대로 쓰고,
 * AI 문안은 이 줄을 사실로 받아 다시 쓴다.
 */
export const FLOW_LINE = Object.freeze({
  비겁: {
    name: "비겁생식상",
    role: "나를 돕는",
    line: "내 힘이 그대로 서는 날이라 두면 고집으로 굳습니다. 식신·상관 쪽으로 뽑아 써야 힘이 결과가 됩니다.",
  },
  인성: {
    name: "인수용식상",
    role: "나를 돕는",
    line: "받쳐 주는 기운이 들어와 생각이 깊어집니다. 식신·상관 쪽으로 내놓아야 배운 것이 형태로 남습니다.",
  },
  식상: {
    name: "식상생재",
    role: "나를 빼는",
    line: "표현과 아이디어가 앞서 나가는 날입니다. 편재·정재 쪽으로 이어 붙여야 말이 실물로 남습니다.",
  },
  재성: {
    name: "득비리재",
    role: "나를 소모시키는",
    line: "돈과 일이 벌어지는 날이라 혼자 감당하면 샙니다. 비견·겁재 쪽 힘을 빌려야 벌인 것이 손에 남습니다.",
  },
  관성: {
    name: "살인상생",
    role: "나를 누르는",
    line: "밖에서 누르는 힘이 오는 날입니다. 편인·정인 쪽으로 받아야 압박이 배움으로 바뀝니다.",
  },
});

/** 일간 기준 신살 4종 — 오늘 지지가 그 자리에 해당할 때만 붙는다. 생년이 없어도 판정된다. */
function stemShinsal(dayStem, todayBranch) {
  const hits = [];
  if (getCheoneulBranches(dayStem).includes(todayBranch)) hits.push("천을귀인");
  if (getMunchangBranch(dayStem) === todayBranch) hits.push("문창귀인");
  if (getHongyeomBranch(dayStem) === todayBranch) hits.push("홍염");
  if (getYanginBranch(dayStem) === todayBranch) hits.push("양인");
  return hits;
}

/** 일간 D 가 볼 때 계열 G 에 해당하는 천간들. 언제나 2개다(양간·음간). */
function stemsForGroup(dayStem, group) {
  return Object.keys(STEM_ELEMENT).filter((stem) => TEN_GOD_GROUP[tenGodFor(dayStem, stem)] === group);
}

/**
 * 일간 D 가 볼 때 계열 G 에 해당하는 지지들.
 * 🔴 **본기(지장간 첫 글자)로만 판정한다** — 중기·여기까지 세면 한 지지가 두세 계열에 걸쳐
 * "좋은 글자"가 12개 중 8개가 되어 말이 안 된다. 본기는 그 지지의 대표 오행이다.
 */
function branchesForGroup(dayStem, group) {
  return Object.keys(HIDDEN_STEMS).filter((branch) => {
    const main = HIDDEN_STEMS[branch][0];
    return TEN_GOD_GROUP[tenGodFor(dayStem, main)] === group;
  });
}

/**
 * 일간 하나의 오늘 판정.
 *
 * @param {string} dayStem 일간 한자(甲~癸)
 * @param {{stem: string, branch: string}} today 오늘 일진 한자
 * @returns {object|null} 판정 사실 묶음. 입력이 표에 없으면 null.
 */
export function buildStemGuidance(dayStem, today) {
  const stem = String(today?.stem || "").trim();
  const branch = String(today?.branch || "").trim();
  if (!STEM_ELEMENT[dayStem] || !STEM_ELEMENT[stem] || !HIDDEN_STEMS[branch]) return null;

  const tenGod = tenGodFor(dayStem, stem);
  const branchTenGods = HIDDEN_STEMS[branch].map((hidden) => tenGodFor(dayStem, hidden)).filter(Boolean);
  const group = TEN_GOD_GROUP[tenGod];
  if (!group) return null;

  const flowGroup = SUPPORT_GROUP[group];

  return {
    stem: dayStem,
    stemKo: toStemKo(dayStem),
    element: STEM_ELEMENT[dayStem],
    // 오늘 천간이 나에게 무엇인가 — 하루의 표면 기운.
    tenGod,
    tenGodGroup: group,
    // 오늘 지지 지장간이 나에게 무엇인가 — 본기가 첫 항목이다.
    branchTenGods,
    branchMainTenGod: branchTenGods[0] || "",
    // 일간 vs 오늘 지지. 내 기운이 오늘 어느 자리에 서는가.
    twelveStage: getTwelveLifeStage(dayStem, branch),
    shinsal: stemShinsal(dayStem, branch),
    // 오늘 기운이 나에게 하는 일 · 그래서 있으면 좋은 계열 = "오늘 있으면 좋은 십성".
    role: FLOW_LINE[group].role,
    flowGroup,
    flowTenGods: GROUP_TEN_GODS[flowGroup],
    flowName: FLOW_LINE[group].name,
    flowLine: FLOW_LINE[group].line,
    // 그 계열을 실어 나르는 글자 = "오늘 있으면 좋은 글자".
    goodStems: stemsForGroup(dayStem, flowGroup),
    goodBranches: branchesForGroup(dayStem, flowGroup),
  };
}

/**
 * 좋은 글자를 사람이 읽는 형태로. 예: `병(丙)·정(丁)/사(巳)·오(午)`
 * @param {number} [branchLimit] 지지를 몇 개까지 적을지. 토(土)는 진·술·축·미 넷이라 제한이 필요하다.
 */
export function formatGoodLetters(guidance, branchLimit = 0) {
  const stems = guidance.goodStems.map((s) => `${toStemKo(s)}(${s})`).join("·");
  const shown = branchLimit > 0 ? guidance.goodBranches.slice(0, branchLimit) : guidance.goodBranches;
  const branches = shown.map((b) => `${toBranchKo(b)}(${b})`).join("·");
  return branches ? `${stems}/${branches}` : stems;
}

/**
 * 오늘의 일간 10개 판정 전부. 오행 짝(DAY_STEM_GROUPS) 순서를 유지한다.
 * @returns {Array<{element: string, hanja: string, rows: object[]}>} 5묶음 × 2일간
 */
export function buildAllStemGuidance(today) {
  const groups = [];
  for (const group of DAY_STEM_GROUPS) {
    const rows = group.stems.map((stem) => buildStemGuidance(stem, today)).filter(Boolean);
    if (rows.length !== group.stems.length) return [];
    groups.push({ element: group.element, hanja: group.hanja, rows });
  }
  return groups;
}
