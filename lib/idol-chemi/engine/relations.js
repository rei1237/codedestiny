// 간지(干支) 관계 판정 — app/saju/love-simulation/_engine/relations.ts 의 정본 테이블을
// 워커·Next 양쪽에서 import 할 수 있도록 .js 로 이관했다(발명 아님, 1:1 포팅).
// 패리티는 __tests__/worker/idol-chemi-engine.test.js 가 relations.ts 텍스트를 파싱해 가드한다.
//
// 정본 출처(relations.ts 머리말 그대로):
//   - 천간합/충·육합·삼합·지지충·상생극: worker/lib/saju-quantum-myeongri.js
//   - 파·해·형: js/saju-engine.js  - 원진·도화·홍염: app/saju/animal-destiny/engine/localSajuCalculator.ts
//   - 십신: worker/lib/saju-ai-prompt.js getTenGodFromDayMaster

export const STEMS = Object.freeze(["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]);
export const BRANCHES = Object.freeze(["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]);

export const STEM_ELEMENT = Object.freeze({
  갑: "wood", 을: "wood",
  병: "fire", 정: "fire",
  무: "earth", 기: "earth",
  경: "metal", 신: "metal",
  임: "water", 계: "water",
});

export const STEM_POLARITY = Object.freeze({
  갑: "yang", 병: "yang", 무: "yang", 경: "yang", 임: "yang",
  을: "yin", 정: "yin", 기: "yin", 신: "yin", 계: "yin",
});

export const BRANCH_ELEMENT = Object.freeze({
  자: "water", 축: "earth", 인: "wood", 묘: "wood", 진: "earth", 사: "fire",
  오: "fire", 미: "earth", 신: "metal", 유: "metal", 술: "earth", 해: "water",
});

export const ELEMENT_GENERATES = Object.freeze({
  wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood",
});
export const ELEMENT_CONTROLS = Object.freeze({
  wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood",
});
export const ELEMENT_KO = Object.freeze({
  wood: "목", fire: "화", earth: "토", metal: "금", water: "수",
});

const GAN_HE = [["갑", "기"], ["을", "경"], ["병", "신"], ["정", "임"], ["무", "계"]];
const GAN_CHUNG = [["갑", "경"], ["을", "신"], ["병", "임"], ["정", "계"]];
const ZHI_HE = [["자", "축"], ["인", "해"], ["묘", "술"], ["진", "유"], ["사", "신"], ["오", "미"]];
const SAMHAP = [
  ["신", "자", "진"],
  ["해", "묘", "미"],
  ["인", "오", "술"],
  ["사", "유", "축"],
];
const ZHI_CHUNG = [["자", "오"], ["축", "미"], ["인", "신"], ["묘", "유"], ["진", "술"], ["사", "해"]];
const ZHI_PA = [["자", "유"], ["축", "진"], ["인", "해"], ["묘", "오"], ["사", "신"], ["미", "술"]];
const ZHI_HAE = [["자", "미"], ["축", "오"], ["인", "사"], ["묘", "진"], ["신", "해"], ["유", "술"]];
const WONJIN = [["자", "미"], ["축", "오"], ["인", "유"], ["묘", "신"], ["진", "해"], ["사", "술"]];
const HYEONG_TRIADS = [["인", "사", "신"], ["축", "술", "미"]];
const HYEONG_PAIRS = [["자", "묘"]];

const DOHWA_BY_GROUP = Object.freeze({
  신자진: "유", 인오술: "묘", 사유축: "오", 해묘미: "자",
});
const HONGYEOM_BY_STEM = Object.freeze({
  갑: "오", 을: "오", 병: "인", 정: "미", 무: "진", 기: "진", 경: "술", 신: "유", 임: "자", 계: "신",
});

// 테스트용 노출(패리티 검증). 변경 금지.
export const RELATION_TABLES = Object.freeze({
  GAN_HE, GAN_CHUNG, ZHI_HE, SAMHAP, ZHI_CHUNG, ZHI_PA, ZHI_HAE, WONJIN, HYEONG_TRIADS, HYEONG_PAIRS,
  DOHWA_BY_GROUP, HONGYEOM_BY_STEM,
});

export function normalizeStem(value) {
  const s = String(value || "").trim().charAt(0);
  return STEMS.includes(s) ? s : "";
}
export function normalizeBranch(value) {
  const s = String(value || "").trim().charAt(0);
  return BRANCHES.includes(s) ? s : "";
}

function inPairList(list, a, b) {
  return list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
function sameSamhapGroup(a, b) {
  return SAMHAP.some((group) => group.includes(a) && group.includes(b) && a !== b);
}
function inTriad(triads, a, b) {
  return triads.some((group) => group.includes(a) && group.includes(b) && a !== b);
}

export function stemElement(stem) {
  return STEM_ELEMENT[normalizeStem(stem)] ?? null;
}
export function branchElement(branch) {
  return BRANCH_ELEMENT[normalizeBranch(branch)] ?? null;
}
export function stemPolarity(stem) {
  return STEM_POLARITY[normalizeStem(stem)] ?? null;
}
export function generates(from, to) {
  return ELEMENT_GENERATES[from] === to;
}
export function controls(from, to) {
  return ELEMENT_CONTROLS[from] === to;
}

/** 두 천간의 관계. 합·충 우선, 없으면 오행 관계. "hap"|"chung"|"same"|"generate"|"control"|"none" */
export function stemRelation(a, b) {
  const sa = normalizeStem(a);
  const sb = normalizeStem(b);
  if (!sa || !sb) return "none";
  if (inPairList(GAN_HE, sa, sb)) return "hap";
  if (inPairList(GAN_CHUNG, sa, sb)) return "chung";
  const ea = STEM_ELEMENT[sa];
  const eb = STEM_ELEMENT[sb];
  if (ea === eb) return "same";
  if (generates(ea, eb) || generates(eb, ea)) return "generate";
  if (controls(ea, eb) || controls(eb, ea)) return "control";
  return "none";
}

/** 두 지지의 관계(복수 가능): yukhap|samhap|chung|hyeong|pa|hae|wonjin */
export function branchRelations(a, b) {
  const ba = normalizeBranch(a);
  const bb = normalizeBranch(b);
  if (!ba || !bb) return [];
  const out = [];
  if (inPairList(ZHI_HE, ba, bb)) out.push("yukhap");
  if (sameSamhapGroup(ba, bb)) out.push("samhap");
  if (inPairList(ZHI_CHUNG, ba, bb)) out.push("chung");
  if (inTriad(HYEONG_TRIADS, ba, bb) || inPairList(HYEONG_PAIRS, ba, bb)) out.push("hyeong");
  if (inPairList(ZHI_PA, ba, bb)) out.push("pa");
  if (inPairList(ZHI_HAE, ba, bb)) out.push("hae");
  if (inPairList(WONJIN, ba, bb)) out.push("wonjin");
  return out;
}

/** 기준 지지의 삼합국에서 나오는 도화 지지. */
export function peachBlossomBranch(refBranch) {
  const b = normalizeBranch(refBranch);
  if (!b) return null;
  const group = SAMHAP.find((g) => g.includes(b));
  if (!group) return null;
  return DOHWA_BY_GROUP[group.join("")] ?? null;
}
/** 일간 기준 홍염 지지. */
export function hongyeomBranch(dayStem) {
  return HONGYEOM_BY_STEM[normalizeStem(dayStem)] ?? null;
}

const TEN_GODS_HARMONIOUS = new Set(["정관", "정재", "정인", "식신"]);
const TEN_GODS_FRICTIONAL = new Set(["편관", "상관"]);

export function tenGodTone(tenGod) {
  if (TEN_GODS_HARMONIOUS.has(tenGod)) return "harmonious";
  if (TEN_GODS_FRICTIONAL.has(tenGod)) return "frictional";
  return "neutral";
}

/** 십신: 일간이 대상 천간을 어떻게 보는가. */
export function tenGodFromDayMaster(dayStem, targetStem) {
  const day = normalizeStem(dayStem);
  const target = normalizeStem(targetStem);
  const dayElement = STEM_ELEMENT[day];
  const targetElement = STEM_ELEMENT[target];
  if (!day || !target || !dayElement || !targetElement) return "";
  const samePolarity = STEM_POLARITY[day] === STEM_POLARITY[target];
  if (dayElement === targetElement) return samePolarity ? "비견" : "겁재";
  if (ELEMENT_GENERATES[dayElement] === targetElement) return samePolarity ? "식신" : "상관";
  if (ELEMENT_GENERATES[targetElement] === dayElement) return samePolarity ? "편인" : "정인";
  if (ELEMENT_CONTROLS[dayElement] === targetElement) return samePolarity ? "편재" : "정재";
  if (ELEMENT_CONTROLS[targetElement] === dayElement) return samePolarity ? "편관" : "정관";
  return "";
}
