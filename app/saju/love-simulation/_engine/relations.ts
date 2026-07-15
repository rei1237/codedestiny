// 간지(干支) 관계 판정 — 명리 규칙은 기존 사주 기능의 정본 테이블을 그대로 이관한다(발명 아님).
// 정본 출처를 각 테이블에 명시했다. worker/lib(대형 모듈)·js/saju-engine.js(2.8만 줄 모놀리스)를
// 클라이언트 번들에 통째로 import하지 않으려, 작고 불변인 짝 테이블만 옮겨왔다.
//
// 정본:
//   - 천간합/충·육합·삼합·지지충·상생극: worker/lib/saju-quantum-myeongri.js (GAN_HE/GAN_CHUNG/ZHI_HE/SAMHAP/ZHI_CHUNG/GENERATE_TO/CONTROL_TO)
//   - 파(破)·해(害)·형(刑): js/saju-engine.js (paMap L28790 / haeMap L28791 / 형 triads L28823)
//   - 원진(怨嗔)·도화(桃花)·홍염(紅艶): app/saju/animal-destiny/engine/localSajuCalculator.ts (wonjinPairs L3616 / getPeachBlossomBranch L3469 / getHongyeomBranch L3477)
//   - 십신(十神): worker/lib/saju-ai-prompt.js getTenGodFromDayMaster (L461)

import type { ElementKey } from "./compatibilityTypes";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

const STEM_ELEMENT: Record<string, ElementKey> = {
  갑: "wood", 을: "wood",
  병: "fire", 정: "fire",
  무: "earth", 기: "earth",
  경: "metal", 신: "metal",
  임: "water", 계: "water",
};

// 양간=갑병무경임, 음간=을정기신계
const STEM_POLARITY: Record<string, "yang" | "yin"> = {
  갑: "yang", 병: "yang", 무: "yang", 경: "yang", 임: "yang",
  을: "yin", 정: "yin", 기: "yin", 신: "yin", 계: "yin",
};

// 지지 지장간 본기(本氣) 오행
const BRANCH_ELEMENT: Record<string, ElementKey> = {
  자: "water", 축: "earth", 인: "wood", 묘: "wood", 진: "earth", 사: "fire",
  오: "fire", 미: "earth", 신: "metal", 유: "metal", 술: "earth", 해: "water",
};

const ELEMENT_GENERATES: Record<ElementKey, ElementKey> = {
  wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood",
};
const ELEMENT_CONTROLS: Record<ElementKey, ElementKey> = {
  wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood",
};

export const ELEMENT_KO: Record<ElementKey, string> = {
  wood: "목", fire: "화", earth: "토", metal: "금", water: "수",
};

// 천간합(合): 갑기·을경·병신·정임·무계
const GAN_HE: Array<[string, string]> = [["갑", "기"], ["을", "경"], ["병", "신"], ["정", "임"], ["무", "계"]];
// 천간충(沖): 갑경·을신·병임·정계 (무·기는 중앙토라 충 없음)
const GAN_CHUNG: Array<[string, string]> = [["갑", "경"], ["을", "신"], ["병", "임"], ["정", "계"]];

// 지지 육합(六合): 자축·인해·묘술·진유·사신·오미
const ZHI_HE: Array<[string, string]> = [["자", "축"], ["인", "해"], ["묘", "술"], ["진", "유"], ["사", "신"], ["오", "미"]];
// 지지 삼합(三合) 국(局)
const SAMHAP: string[][] = [
  ["신", "자", "진"], // 水
  ["해", "묘", "미"], // 木
  ["인", "오", "술"], // 火
  ["사", "유", "축"], // 金
];
// 지지 충(沖): 자오·축미·인신·묘유·진술·사해
const ZHI_CHUNG: Array<[string, string]> = [["자", "오"], ["축", "미"], ["인", "신"], ["묘", "유"], ["진", "술"], ["사", "해"]];
// 지지 파(破)
const ZHI_PA: Array<[string, string]> = [["자", "유"], ["축", "진"], ["인", "해"], ["묘", "오"], ["사", "신"], ["미", "술"]];
// 지지 해(害)
const ZHI_HAE: Array<[string, string]> = [["자", "미"], ["축", "오"], ["인", "사"], ["묘", "진"], ["신", "해"], ["유", "술"]];
// 원진(怨嗔)
const WONJIN: Array<[string, string]> = [["자", "미"], ["축", "오"], ["인", "유"], ["묘", "신"], ["진", "해"], ["사", "술"]];
// 삼형(三刑) 및 상형(相刑): 인사신·축술미·자묘. (자형 진오유해는 동일 지지 반복이라 두 사람 사이 판정에서는 제외)
const HYEONG_TRIADS: string[][] = [["인", "사", "신"], ["축", "술", "미"]];
const HYEONG_PAIRS: Array<[string, string]> = [["자", "묘"]];

// 도화(桃花): 상대 지지가 기준 지지의 삼합국 목욕지에 해당하는가. 기준 삼합국 → 도화 지지
const DOHWA_BY_GROUP: Record<string, string> = {
  "신자진": "유", "인오술": "묘", "사유축": "오", "해묘미": "자",
};
// 홍염(紅艶): 일간 기준
const HONGYEOM_BY_STEM: Record<string, string> = {
  갑: "오", 을: "오", 병: "인", 정: "미", 무: "진", 기: "진", 경: "술", 신: "유", 임: "자", 계: "신",
};

function normalizeStem(value: string): string {
  const s = String(value || "").trim().charAt(0);
  return STEMS.includes(s) ? s : "";
}
function normalizeBranch(value: string): string {
  const s = String(value || "").trim().charAt(0);
  return BRANCHES.includes(s) ? s : "";
}

function inPairList(list: Array<[string, string]>, a: string, b: string): boolean {
  return list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
function sameSamhapGroup(a: string, b: string): boolean {
  return SAMHAP.some((group) => group.includes(a) && group.includes(b) && a !== b);
}
function inTriad(triads: string[][], a: string, b: string): boolean {
  return triads.some((group) => group.includes(a) && group.includes(b) && a !== b);
}

export function stemElement(stem: string): ElementKey | null {
  return STEM_ELEMENT[normalizeStem(stem)] ?? null;
}
export function branchElement(branch: string): ElementKey | null {
  return BRANCH_ELEMENT[normalizeBranch(branch)] ?? null;
}
export function stemPolarity(stem: string): "yin" | "yang" | null {
  return STEM_POLARITY[normalizeStem(stem)] ?? null;
}
export function generates(from: ElementKey, to: ElementKey): boolean {
  return ELEMENT_GENERATES[from] === to;
}
export function controls(from: ElementKey, to: ElementKey): boolean {
  return ELEMENT_CONTROLS[from] === to;
}

export type StemRelationType = "hap" | "chung" | "generate" | "control" | "same" | "none";

/** 두 일간(천간)의 관계. 합·충을 우선 판정하고, 없으면 오행 관계로 본다. */
export function stemRelation(a: string, b: string): StemRelationType {
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

export type BranchRelationType = "yukhap" | "samhap" | "chung" | "hyeong" | "pa" | "hae" | "wonjin";

/** 두 지지의 관계(복수 성립 가능). 예: 육합이면서 다른 관계가 없을 수도, 충+원진이 함께일 수도 있다. */
export function branchRelations(a: string, b: string): BranchRelationType[] {
  const ba = normalizeBranch(a);
  const bb = normalizeBranch(b);
  if (!ba || !bb) return [];
  const out: BranchRelationType[] = [];
  if (inPairList(ZHI_HE, ba, bb)) out.push("yukhap");
  if (sameSamhapGroup(ba, bb)) out.push("samhap");
  if (inPairList(ZHI_CHUNG, ba, bb)) out.push("chung");
  if (inTriad(HYEONG_TRIADS, ba, bb) || inPairList(HYEONG_PAIRS, ba, bb)) out.push("hyeong");
  if (inPairList(ZHI_PA, ba, bb)) out.push("pa");
  if (inPairList(ZHI_HAE, ba, bb)) out.push("hae");
  if (inPairList(WONJIN, ba, bb)) out.push("wonjin");
  return out;
}

/** 기준 지지(일지·연지)의 삼합국에서 도출되는 도화 지지. */
export function peachBlossomBranch(refBranch: string): string | null {
  const b = normalizeBranch(refBranch);
  if (!b) return null;
  const group = SAMHAP.find((g) => g.includes(b));
  if (!group) return null;
  return DOHWA_BY_GROUP[group.join("")] ?? null;
}
/** 일간 기준 홍염 지지. */
export function hongyeomBranch(dayStem: string): string | null {
  return HONGYEOM_BY_STEM[normalizeStem(dayStem)] ?? null;
}

const TEN_GODS_HARMONIOUS = new Set(["정관", "정재", "정인", "식신"]);
const TEN_GODS_FRICTIONAL = new Set(["편관", "상관"]);

export type TenGodTone = "harmonious" | "frictional" | "neutral";
export function tenGodTone(tenGod: string): TenGodTone {
  if (TEN_GODS_HARMONIOUS.has(tenGod)) return "harmonious";
  if (TEN_GODS_FRICTIONAL.has(tenGod)) return "frictional";
  return "neutral";
}

/** 십신: 일간(dayStem)이 대상 천간(targetStem)을 어떻게 보는가. 정본 로직 이관. */
export function tenGodFromDayMaster(dayStem: string, targetStem: string): string {
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
