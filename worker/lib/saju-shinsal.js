// 연애 상담용 신살(神煞) 판정 모듈.
//
// 명리 규칙은 발명하지 않는다 — 아래 정본 테이블을 그대로 이관했다.
//   - 도화/홍염/화개/역마/천을귀인/문창귀인/양인/괴강/백호/공망/귀문관살/원진:
//     app/saju/animal-destiny/engine/localSajuCalculator.ts
//     (getPeachBlossomBranch:3456, getHongyeomBranch:3464, getHwagaeBranch:3498,
//      getYeokmaBranch:3506, getCheoneulBranches:3514, getMunchangBranch:3530,
//      getGongMangBranches:1474, YANGIN_BRANCH_BY_STEM:1933, buildShinsalAnalysis:3612)
//   - 육합/삼합/충/형/파/해/원진 짝 테이블: app/saju/love-simulation/_engine/relations.ts:44-77
//
// 원본은 한글 간지(갑/자)로 되어 있고 worker 쪽 명식 정본(life-book-ai-saju)은 한자(甲/子)를
// 내보낸다. 그래서 테이블은 한자로 저장하고 STEM_KO/BRANCH_KO 라벨 맵을 함께 둔다
// (worker/lib/saju-gyeokguk.js:18 과 같은 관례). 입력은 두 표기를 모두 받아 정규화한다.
//
// 해설 문구(loveMeaning)는 이관 대상이 아니다 — 원본 SHINSAL_PROSE 는 진로/건강 톤이고
// CMS 키(saju-reading)에 묶여 있어 연애 맥락으로 새로 썼다.

const STEMS = Object.freeze(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const BRANCHES = Object.freeze(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);

const STEM_KO = Object.freeze({
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
  己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
});
const BRANCH_KO = Object.freeze({
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
});
const STEM_BY_KO = Object.freeze(Object.fromEntries(Object.entries(STEM_KO).map(([h, k]) => [k, h])));
const BRANCH_BY_KO = Object.freeze(Object.fromEntries(Object.entries(BRANCH_KO).map(([h, k]) => [k, h])));

const STEM_ELEMENT = Object.freeze({
  甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth",
  己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water",
});
const BRANCH_ELEMENT = Object.freeze({
  子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire",
  午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water",
});
const STEM_POLARITY = Object.freeze({
  甲: "yang", 乙: "yin", 丙: "yang", 丁: "yin", 戊: "yang",
  己: "yin", 庚: "yang", 辛: "yin", 壬: "yang", 癸: "yin",
});

export const ELEMENT_KO = Object.freeze({ wood: "목", fire: "화", earth: "토", metal: "금", water: "수" });
const ELEMENT_BY_KO = Object.freeze({ 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" });
const ELEMENT_GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const ELEMENT_CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });

// ── 짝 관계 테이블 (relations.ts:52-77 이관) ────────────────────────────────
const ZHI_HE = Object.freeze([["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"]]);
const SAMHAP = Object.freeze([["申", "子", "辰"], ["亥", "卯", "未"], ["寅", "午", "戌"], ["巳", "酉", "丑"]]);
const ZHI_CHUNG = Object.freeze([["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"]]);
const ZHI_PA = Object.freeze([["子", "酉"], ["丑", "辰"], ["寅", "亥"], ["卯", "午"], ["巳", "申"], ["未", "戌"]]);
const ZHI_HAE = Object.freeze([["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"]]);
const WONJIN = Object.freeze([["子", "未"], ["丑", "午"], ["寅", "酉"], ["卯", "申"], ["辰", "亥"], ["巳", "戌"]]);
// 귀문관살은 원진과 다른 집합이다(자유·인미 자리가 다르다). localSajuCalculator.ts:3627 원본.
const GWIMUN = Object.freeze([["子", "酉"], ["丑", "午"], ["寅", "未"], ["卯", "申"], ["辰", "亥"], ["巳", "戌"]]);
const HYEONG_TRIADS = Object.freeze([["寅", "巳", "申"], ["丑", "戌", "未"]]);
const HYEONG_PAIRS = Object.freeze([["子", "卯"]]);
const SELF_HYEONG = Object.freeze(["辰", "午", "酉", "亥"]);

const GAN_HE = Object.freeze([["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"]]);
const GAN_CHUNG = Object.freeze([["甲", "庚"], ["乙", "辛"], ["丙", "壬"], ["丁", "癸"]]);

// ── 신살 조견표 ────────────────────────────────────────────────────────────
const HONGYEOM_BY_STEM = Object.freeze({
  甲: "午", 乙: "午", 丙: "寅", 丁: "未", 戊: "辰",
  己: "辰", 庚: "戌", 辛: "酉", 壬: "子", 癸: "申",
});
const CHEONEUL_BY_STEM = Object.freeze({
  甲: ["丑", "未"], 乙: ["子", "申"], 丙: ["亥", "酉"], 丁: ["亥", "酉"], 戊: ["丑", "未"],
  己: ["子", "申"], 庚: ["丑", "未"], 辛: ["寅", "午"], 壬: ["卯", "巳"], 癸: ["卯", "巳"],
});
const MUNCHANG_BY_STEM = Object.freeze({
  甲: "巳", 乙: "午", 丙: "申", 丁: "酉", 戊: "申",
  己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "卯",
});
// 양인은 양간에만 성립한다.
const YANGIN_BY_STEM = Object.freeze({ 甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子" });
const GOEGANG_GANJI = Object.freeze(["庚辰", "庚戌", "壬辰", "戊戌"]);
const BAEKHO_GANJI = Object.freeze(["甲辰", "乙未", "丙戌", "丁丑", "戊辰", "壬戌", "癸丑"]);
// 순(旬) 시작 지지 → 공망 지지 2개.
const GONGMANG_BY_XUN_START = Object.freeze({
  子: ["戌", "亥"], 戌: ["申", "酉"], 申: ["午", "未"],
  午: ["辰", "巳"], 辰: ["寅", "卯"], 寅: ["子", "丑"],
});

const POSITION_LABEL = Object.freeze({ year: "년주", month: "월주", day: "일주", hour: "시주" });
const BRANCH_POSITION_LABEL = Object.freeze({ year: "년지", month: "월지", day: "일지", hour: "시지" });
// 연애에서 각 자리가 갖는 무게. 일지=배우자궁, 월지=월령이라 가장 무겁다.
const POSITION_WEIGHT = Object.freeze({ day: 40, month: 30, year: 20, hour: 20, luck: 15 });

// ── 정규화 ────────────────────────────────────────────────────────────────
export function normalizeStemChar(value) {
  const text = String(value == null ? "" : value).trim();
  if (!text) return "";
  for (const stem of STEMS) if (text.includes(stem)) return stem;
  for (const [ko, hanja] of Object.entries(STEM_BY_KO)) if (text.includes(ko)) return hanja;
  return "";
}

export function normalizeBranchChar(value) {
  const text = String(value == null ? "" : value).trim();
  if (!text) return "";
  for (const branch of BRANCHES) if (text.includes(branch)) return branch;
  for (const [ko, hanja] of Object.entries(BRANCH_BY_KO)) if (text.includes(ko)) return hanja;
  return "";
}

export function normalizeElementKey(value) {
  const text = String(value == null ? "" : value).trim().toLowerCase();
  if (!text) return "";
  if (ELEMENT_KO[text]) return text;
  for (const [ko, key] of Object.entries(ELEMENT_BY_KO)) if (text.includes(ko)) return key;
  for (const key of ["wood", "fire", "earth", "metal", "water"]) if (text.includes(key)) return key;
  return "";
}

export function toStemKo(stem) {
  return STEM_KO[normalizeStemChar(stem)] || "";
}

export function toBranchKo(branch) {
  return BRANCH_KO[normalizeBranchChar(branch)] || "";
}

export function stemElementKey(stem) {
  return STEM_ELEMENT[normalizeStemChar(stem)] || "";
}

export function branchElementKey(branch) {
  return BRANCH_ELEMENT[normalizeBranchChar(branch)] || "";
}

export function stemPolarity(stem) {
  return STEM_POLARITY[normalizeStemChar(stem)] || "";
}

function branchIndex(branch) {
  return BRANCHES.indexOf(normalizeBranchChar(branch));
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

// ── 신살 지지 산출 ─────────────────────────────────────────────────────────
/** 삼합국 목욕지 = 도화. 기준 지지(일지 또는 연지)에서 도출한다. */
export function getPeachBlossomBranch(referenceBranch) {
  const index = branchIndex(referenceBranch);
  if (index < 0) return "";
  if ([8, 0, 4].includes(index)) return BRANCHES[9];
  if ([2, 6, 10].includes(index)) return BRANCHES[3];
  if ([5, 9, 1].includes(index)) return BRANCHES[6];
  return BRANCHES[0];
}

/** 일간 기준 홍염 지지. */
export function getHongyeomBranch(dayStem) {
  return HONGYEOM_BY_STEM[normalizeStemChar(dayStem)] || "";
}

/** 삼합국 묘지 = 화개. */
export function getHwagaeBranch(referenceBranch) {
  const index = branchIndex(referenceBranch);
  if (index < 0) return "";
  if ([8, 0, 4].includes(index)) return BRANCHES[4];
  if ([2, 6, 10].includes(index)) return BRANCHES[10];
  if ([5, 9, 1].includes(index)) return BRANCHES[1];
  return BRANCHES[7];
}

/** 삼합국 생지의 충 = 역마. */
export function getYeokmaBranch(referenceBranch) {
  const index = branchIndex(referenceBranch);
  if (index < 0) return "";
  if ([8, 0, 4].includes(index)) return BRANCHES[2];
  if ([2, 6, 10].includes(index)) return BRANCHES[8];
  if ([5, 9, 1].includes(index)) return BRANCHES[11];
  return BRANCHES[5];
}

/** 일간 기준 천을귀인 지지 2개. */
export function getCheoneulBranches(dayStem) {
  return CHEONEUL_BY_STEM[normalizeStemChar(dayStem)] || [];
}

/** 일간 기준 문창귀인 지지. */
export function getMunchangBranch(dayStem) {
  return MUNCHANG_BY_STEM[normalizeStemChar(dayStem)] || "";
}

/** 일간 기준 양인 지지(양간만 성립). */
export function getYanginBranch(dayStem) {
  return YANGIN_BY_STEM[normalizeStemChar(dayStem)] || "";
}

/**
 * 일주 기준 공망 지지 2개.
 * dayPillar: "甲子" 문자열 또는 { stem, branch }.
 */
export function getGongmangBranches(dayPillar) {
  const source = typeof dayPillar === "string" ? { stem: dayPillar, branch: dayPillar } : (dayPillar || {});
  const stem = normalizeStemChar(source.stem ?? source.heavenlyStem);
  const branch = normalizeBranchChar(source.branch ?? source.earthlyBranch);
  const stemIndex = STEMS.indexOf(stem);
  const branchIdx = BRANCHES.indexOf(branch);
  if (stemIndex < 0 || branchIdx < 0) return [];
  let sexagenaryIndex = -1;
  for (let i = 0; i < 60; i += 1) {
    if (i % 10 === stemIndex && i % 12 === branchIdx) {
      sexagenaryIndex = i;
      break;
    }
  }
  if (sexagenaryIndex < 0) return [];
  const xunStartBranch = BRANCHES[(Math.floor(sexagenaryIndex / 10) * 10) % 12];
  return GONGMANG_BY_XUN_START[xunStartBranch] || [];
}

// ── 짝 관계 ───────────────────────────────────────────────────────────────
/**
 * 두 지지의 관계(복수 성립 가능).
 * -> ("육합"|"삼합"|"충"|"형"|"자형"|"파"|"해"|"원진"|"귀문")[]
 */
export function getBranchPairRelations(a, b) {
  const first = normalizeBranchChar(a);
  const second = normalizeBranchChar(b);
  if (!first || !second) return [];
  const out = [];
  if (inPairList(ZHI_HE, first, second)) out.push("육합");
  if (sameSamhapGroup(first, second)) out.push("삼합");
  if (inPairList(ZHI_CHUNG, first, second)) out.push("충");
  if (inTriad(HYEONG_TRIADS, first, second) || inPairList(HYEONG_PAIRS, first, second)) out.push("형");
  if (first === second && SELF_HYEONG.includes(first)) out.push("자형");
  if (inPairList(ZHI_PA, first, second)) out.push("파");
  if (inPairList(ZHI_HAE, first, second)) out.push("해");
  if (inPairList(WONJIN, first, second)) out.push("원진");
  if (inPairList(GWIMUN, first, second)) out.push("귀문");
  return out;
}

/** 두 천간의 관계. 합·충 우선, 없으면 오행 관계. */
export function getStemPairRelation(a, b) {
  const first = normalizeStemChar(a);
  const second = normalizeStemChar(b);
  if (!first || !second) return "";
  if (inPairList(GAN_HE, first, second)) return "합";
  if (inPairList(GAN_CHUNG, first, second)) return "충";
  const ea = STEM_ELEMENT[first];
  const eb = STEM_ELEMENT[second];
  if (ea === eb) return "동";
  if (ELEMENT_GENERATES[ea] === eb || ELEMENT_GENERATES[eb] === ea) return "생";
  if (ELEMENT_CONTROLS[ea] === eb || ELEMENT_CONTROLS[eb] === ea) return "극";
  return "";
}

// ── 신살 정의 (연애 해설) ──────────────────────────────────────────────────
const LOVE_STAR_META = Object.freeze({
  도화살: {
    category: "매력·끌림",
    key: "dohwa",
    loveMeaning: "사람의 시선을 먼저 끌어당기는 결. 먼저 다가오는 사람이 많은 대신 관심과 애정을 구분하는 눈이 필요하다.",
  },
  홍염살: {
    category: "매력·분위기",
    key: "hongyeom",
    loveMeaning: "말과 몸짓에 은근한 색이 배는 결. 의도하지 않아도 여지로 읽히기 쉬워 관계의 경계를 스스로 그어야 한다.",
  },
  화개살: {
    category: "고독·내면",
    key: "hwagae",
    loveMeaning: "혼자 있는 시간에서 회복하는 결. 사랑에서도 거리를 두는 구간이 필요하고, 그 침묵이 상대에게는 식은 것으로 읽히기 쉽다.",
  },
  역마살: {
    category: "이동·거리",
    key: "yeokma",
    loveMeaning: "관계가 한자리에 오래 머물지 않는 결. 원거리·잦은 이동·바쁜 시기가 인연의 형태를 자주 바꾼다.",
  },
  천을귀인: {
    category: "귀인·보호",
    key: "cheoneul",
    loveMeaning: "결정적인 순간에 사람이 붙어 주는 결. 소개·중재·재회의 다리가 사람을 통해 놓인다.",
  },
  문창귀인: {
    category: "표현·문장",
    key: "munchang",
    loveMeaning: "말보다 글로 마음이 더 정확히 전달되는 결. 문자·편지·기록이 관계를 여는 열쇠가 된다.",
  },
  괴강살: {
    category: "결단·주도",
    key: "goegang",
    loveMeaning: "관계에서 주도권을 쥐려는 강한 결. 결정이 빠른 만큼 상대에게는 통보처럼 느껴질 수 있다.",
  },
  백호살: {
    category: "격동·전환",
    key: "baekho",
    loveMeaning: "관계의 온도가 급하게 오르내리는 결. 감정이 격해질 때 되돌리기 어려운 말이 나오기 쉽다.",
  },
  양인살: {
    category: "자존·직진",
    key: "yangin",
    loveMeaning: "자존을 건드리면 칼처럼 서는 결. 애정 표현이 직설적이라 세밀한 배려로 균형을 잡아야 한다.",
  },
  공망: {
    category: "공백·지연",
    key: "gongmang",
    loveMeaning: "해당 자리의 인연이 비거나 늦게 채워지는 신호. 기대와 현실 사이의 간격을 미리 계산하고 움직이는 편이 낫다.",
  },
  귀문관살: {
    category: "예민·집착",
    key: "gwimun",
    loveMeaning: "상대의 미세한 변화까지 읽어 내는 결. 통찰이 되기도 하지만 확인 욕구로 번지면 관계를 조인다.",
  },
  원진살: {
    category: "미움·엇갈림",
    key: "wonjin",
    loveMeaning: "이유 없이 거슬리는 감정이 쌓이는 결. 사건보다 태도와 말투에서 서운함이 축적된다.",
  },
});

function buildAstroRows(pillars, luckRows) {
  const rows = [];
  ["year", "month", "day", "hour"].forEach((position) => {
    const pillar = pillars?.[position];
    if (!pillar) return;
    const stem = normalizeStemChar(pillar.stem ?? pillar.heavenlyStem ?? pillar.gan ?? pillar);
    const branch = normalizeBranchChar(pillar.branch ?? pillar.earthlyBranch ?? pillar.zhi ?? pillar);
    if (!stem && !branch) return;
    rows.push({
      source: "원국",
      position,
      label: POSITION_LABEL[position],
      branchLabel: BRANCH_POSITION_LABEL[position],
      weightKey: position,
      stem,
      branch,
      ganji: stem && branch ? `${stem}${branch}` : "",
    });
  });
  (Array.isArray(luckRows) ? luckRows : []).forEach((row, index) => {
    const stem = normalizeStemChar(row?.stem ?? row?.gan ?? row?.ganji ?? row?.pillar);
    const branch = normalizeBranchChar(row?.branch ?? row?.zhi ?? row?.ganji ?? row?.pillar);
    if (!stem && !branch) return;
    rows.push({
      source: "운",
      position: `luck-${index}`,
      label: String(row?.label || (row?.scope === "sewoon" ? "세운" : "대운")),
      branchLabel: String(row?.label || (row?.scope === "sewoon" ? "세운" : "대운")),
      weightKey: "luck",
      stem,
      branch,
      ganji: stem && branch ? `${stem}${branch}` : "",
    });
  });
  return rows;
}

function resolveState(elements, usefulSet, unfavorableSet) {
  if (elements.some((element) => usefulSet.has(element))) return "용신 연결";
  if (elements.some((element) => unfavorableSet.has(element))) return "기신 연결";
  return "중립 보조";
}

function describeHit(hit) {
  const branchKo = BRANCH_KO[hit.branch];
  const label = hit.branchLabel || hit.label;
  if (hit.matchedBy === "ganji") return `${label} ${hit.ganji}`;
  if (hit.matchedBy === "stem") return `${label} ${hit.stem}(${STEM_KO[hit.stem] || ""})`;
  return `${label} ${hit.branch}(${branchKo || ""})`;
}

function collectSingleStar(name, definition, rows, usefulSet, unfavorableSet) {
  const branches = (definition.branches || []).filter(Boolean);
  const stems = (definition.stems || []).filter(Boolean);
  const ganjiList = (definition.ganji || []).filter(Boolean);
  const hits = [];
  rows.forEach((row) => {
    if (ganjiList.length && row.ganji && ganjiList.includes(row.ganji)) {
      hits.push({ ...row, matchedBy: "ganji" });
      return;
    }
    if (branches.length && row.branch && branches.includes(row.branch)) {
      hits.push({ ...row, matchedBy: "branch" });
      return;
    }
    if (stems.length && row.stem && stems.includes(row.stem)) {
      hits.push({ ...row, matchedBy: "stem" });
    }
  });
  const elements = hits
    .map((hit) => (hit.matchedBy === "stem" ? STEM_ELEMENT[hit.stem] : BRANCH_ELEMENT[hit.branch]))
    .filter(Boolean);
  const meta = LOVE_STAR_META[name];
  const targets = [
    ...branches.map((branch) => `${branch}(${BRANCH_KO[branch] || ""})`),
    ...stems.map((stem) => `${stem}(${STEM_KO[stem] || ""})`),
    ...ganjiList,
  ];
  return {
    name,
    key: meta.key,
    category: meta.category,
    kind: "single",
    targets,
    hits: hits.map((hit) => ({
      source: hit.source,
      position: hit.position,
      label: describeHit(hit),
      branch: hit.branch,
      stem: hit.stem,
      ganji: hit.ganji,
      weightKey: hit.weightKey,
    })),
    present: hits.length > 0,
    state: hits.length ? resolveState(elements, usefulSet, unfavorableSet) : "미성립",
    loveMeaning: meta.loveMeaning,
  };
}

function collectPairStar(name, relationName, rows, usefulSet, unfavorableSet) {
  const hits = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const left = rows[i];
      const right = rows[j];
      if (!left.branch || !right.branch) continue;
      if (!getBranchPairRelations(left.branch, right.branch).includes(relationName)) continue;
      hits.push({
        source: left.source === "원국" && right.source === "원국" ? "원국" : "운",
        position: `${left.position}-${right.position}`,
        label: `${left.branchLabel} ${left.branch}(${BRANCH_KO[left.branch]}) ↔ ${right.branchLabel} ${right.branch}(${BRANCH_KO[right.branch]})`,
        branch: left.branch,
        stem: "",
        ganji: "",
        weightKey: left.weightKey === "luck" || right.weightKey === "luck" ? "luck" : "day",
      });
    }
  }
  const elements = hits.map((hit) => BRANCH_ELEMENT[hit.branch]).filter(Boolean);
  const meta = LOVE_STAR_META[name];
  return {
    name,
    key: meta.key,
    category: meta.category,
    kind: "pair",
    targets: [],
    hits,
    present: hits.length > 0,
    state: hits.length ? resolveState(elements, usefulSet, unfavorableSet) : "미성립",
    loveMeaning: meta.loveMeaning,
  };
}

function intensityFromHits(hits) {
  const total = (Array.isArray(hits) ? hits : [])
    .reduce((sum, hit) => sum + (POSITION_WEIGHT[hit.weightKey] || POSITION_WEIGHT.luck), 0);
  return Math.max(0, Math.min(100, Math.round(total)));
}

/**
 * 연애 상담용 신살 묶음.
 *
 * pillars: { year|month|day|hour: { stem, branch } }  (한자/한글 모두 허용)
 * luckRows: [{ scope: "daewoon"|"sewoon", label, stem, branch }]
 * usefulElements / unfavorableElements: 오행 키 또는 한글("목"…) 배열
 */
export function buildLoveShinsal({
  pillars = {},
  dayStem = "",
  luckRows = [],
  usefulElements = [],
  unfavorableElements = [],
} = {}) {
  const rows = buildAstroRows(pillars, luckRows);
  const day = normalizeStemChar(dayStem) || normalizeStemChar(pillars?.day?.stem ?? pillars?.day?.heavenlyStem);
  const dayBranch = normalizeBranchChar(pillars?.day?.branch ?? pillars?.day?.earthlyBranch);
  const yearBranch = normalizeBranchChar(pillars?.year?.branch ?? pillars?.year?.earthlyBranch);
  const usefulSet = new Set((Array.isArray(usefulElements) ? usefulElements : []).map(normalizeElementKey).filter(Boolean));
  const unfavorableSet = new Set((Array.isArray(unfavorableElements) ? unfavorableElements : []).map(normalizeElementKey).filter(Boolean));

  const uniqueBranches = (list) => Array.from(new Set(list.filter(Boolean)));
  const definitions = [
    ["도화살", { branches: uniqueBranches([getPeachBlossomBranch(dayBranch), getPeachBlossomBranch(yearBranch)]) }],
    ["홍염살", { branches: uniqueBranches([getHongyeomBranch(day)]) }],
    ["화개살", { branches: uniqueBranches([getHwagaeBranch(dayBranch), getHwagaeBranch(yearBranch)]) }],
    ["역마살", { branches: uniqueBranches([getYeokmaBranch(dayBranch), getYeokmaBranch(yearBranch)]) }],
    ["천을귀인", { branches: getCheoneulBranches(day) }],
    ["문창귀인", { branches: uniqueBranches([getMunchangBranch(day)]) }],
    ["양인살", { branches: uniqueBranches([getYanginBranch(day)]) }],
    ["괴강살", { ganji: GOEGANG_GANJI }],
    ["백호살", { ganji: BAEKHO_GANJI }],
    ["공망", { branches: getGongmangBranches(pillars?.day || {}) }],
  ];

  const stars = definitions.map(([name, definition]) => collectSingleStar(name, definition, rows, usefulSet, unfavorableSet));
  stars.push(collectPairStar("귀문관살", "귀문", rows, usefulSet, unfavorableSet));
  stars.push(collectPairStar("원진살", "원진", rows, usefulSet, unfavorableSet));

  const byName = Object.fromEntries(stars.map((star) => [star.name, star]));
  const intensity = Object.fromEntries(stars.map((star) => [star.key, intensityFromHits(star.hits)]));

  const summaryLines = stars
    .filter((star) => star.present)
    .map((star) => {
      const where = star.hits.map((hit) => hit.label).slice(0, 3).join(" · ");
      return `${star.name}: ${where} — ${star.state}`;
    });

  return { stars, byName, intensity, summaryLines };
}

/**
 * buildLoveSecretReference 가 받는 specialStars 형태로 환산한다.
 * tao/yeokma/hwa 는 0~100 백분율, gwimun 은 성립 여부.
 */
export function scoreShinsalIntensity(starsOrResult) {
  const intensity = starsOrResult?.intensity
    ? starsOrResult.intensity
    : Object.fromEntries((Array.isArray(starsOrResult) ? starsOrResult : []).map((star) => [star.key, intensityFromHits(star.hits)]));
  const byName = starsOrResult?.byName || {};
  // 도화와 홍염은 같은 "끌림" 축이라 합산하되 상한을 넘지 않게 묶는다.
  const tao = Math.min(100, (Number(intensity.dohwa) || 0) + Math.round((Number(intensity.hongyeom) || 0) * 0.6));
  return {
    tao,
    yeokma: Number(intensity.yeokma) || 0,
    hwa: Number(intensity.hwagae) || 0,
    gwimun: Boolean(byName?.귀문관살?.present),
  };
}
