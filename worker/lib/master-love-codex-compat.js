/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  마스터 인연의 서 · 궁합  (MASTER_LOVE_CODEX_COMPAT)  —  궁합 계산 어댑터
 * ───────────────────────────────────────────────────────────────────────────
 *  사주 엔진(life-book-ai-saju.js)과 자미두수 엔진(ziwei-ai-chart.js)의 **출력값만**
 *  읽어 두 사람의 궁합 축을 산출하는 read-only 래퍼다. 엔진 코드는 건드리지 않으며
 *  궁합 로직을 엔진 내부에 넣지도 않는다.
 *
 *  결정론 계약 (3계층 분리)
 *   - Truth       : 4개 차트(명식×2, 명반×2) — 이 모듈 밖에서 계산되어 주입된다
 *   - Mapping     : 이 모듈. 순수 함수. Math.random / Date.now / new Date() 사용 금지
 *   - Presentation: LLM 산문 + 리더 UI. 결과값에 역영향 없음
 *  같은 (본인, 상대) 입력이면 signature 를 포함한 전체 반환값이 항상 동일하다.
 *
 *  간지 표기는 사주 엔진과 같은 한자(甲/子)를 쓰고, 오행·십성·궁 이름은 한국어를 쓴다.
 *
 *  ▶ 접근 키워드: `MASTER_LOVE_CODEX_COMPAT`, `buildMasterLoveCodexCompatibility`
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { canonicalStringify, hashSignature } from "./island/island-weights.js";

export const MASTER_LOVE_CODEX_COMPAT_VERSION = "mlc-compat-v1";

// ─── 간지 상수 (사주 엔진과 동일 표기, 이 모듈 전용 사본) ────────────────────

const STEM_ELEMENT = {
  甲: "목", 乙: "목", 丙: "화", 丁: "화", 戊: "토",
  己: "토", 庚: "금", 辛: "금", 壬: "수", 癸: "수",
};
const STEM_POLARITY = {
  甲: "yang", 丙: "yang", 戊: "yang", 庚: "yang", 壬: "yang",
  乙: "yin", 丁: "yin", 己: "yin", 辛: "yin", 癸: "yin",
};
const BRANCH_ELEMENT = {
  子: "수", 丑: "토", 寅: "목", 卯: "목", 辰: "토", 巳: "화",
  午: "화", 未: "토", 申: "금", 酉: "금", 戌: "토", 亥: "수",
};
const ELEMENTS = ["목", "화", "토", "금", "수"];
const PRODUCES = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CONTROLS = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

/** 천간합(化) — 짝을 이루면 서로의 성질을 묶는다 */
const STEM_COMBINATIONS = [["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"]];
/** 천간충 — 방향이 정면으로 부딪친다 */
const STEM_CLASHES = [["甲", "庚"], ["乙", "辛"], ["丙", "壬"], ["丁", "癸"]];

/** 지지육합 */
const BRANCH_COMBINATIONS = [["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"]];
/** 지지삼합 (쌍으로 걸리면 반합) */
const BRANCH_TRIADS = [
  { branches: ["寅", "午", "戌"], element: "화" },
  { branches: ["亥", "卯", "未"], element: "목" },
  { branches: ["巳", "酉", "丑"], element: "금" },
  { branches: ["申", "子", "辰"], element: "수" },
];
/** 지지충 */
const BRANCH_CLASHES = [["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"]];
/** 지지파 */
const BRANCH_BREAKS = [["子", "酉"], ["丑", "辰"], ["寅", "亥"], ["卯", "午"], ["巳", "申"], ["未", "戌"]];
/** 지지해 */
const BRANCH_HARMS = [["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"]];
/** 지지형 — 삼형·상형·자형에서 쌍으로 성립하는 것만 */
const BRANCH_PUNISHMENTS = [
  ["子", "卯"],
  ["寅", "巳"], ["巳", "申"], ["寅", "申"],
  ["丑", "戌"], ["戌", "未"], ["丑", "未"],
  ["辰", "辰"], ["午", "午"], ["酉", "酉"], ["亥", "亥"],
];

const PILLAR_LABELS = { yearPillar: "년주", monthPillar: "월주", dayPillar: "일주", hourPillar: "시주" };
const PILLAR_KEYS = ["yearPillar", "monthPillar", "dayPillar", "hourPillar"];

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}
function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(num(value, min))));
}
function pairMatches(table, a, b) {
  return table.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
function pillarStem(pillar) {
  return clean(pillar).charAt(0);
}
function pillarBranch(pillar) {
  return clean(pillar).charAt(1);
}

/**
 * 엔진의 usefulGod / unfavorableGod 은 "화 기운을 보완 축으로 봅니다." 형태의 문장이다.
 * 문장 맨 앞의 오행 한 글자만 뽑는다(형식이 바뀌면 빈 문자열 → 축이 조용히 빠진다).
 */
function leadingElement(sentence) {
  const first = clean(sentence).charAt(0);
  return ELEMENTS.includes(first) ? first : "";
}

/** 오행 분포에서 최다·최소 오행 (동점은 목화토금수 고정 순서로 끊어 결정론 보장) */
function elementExtremes(distribution) {
  const counts = ELEMENTS.map((element) => ({ element, count: num(asObject(distribution)[element]) }));
  let dominant = counts[0];
  let deficient = counts[0];
  for (const entry of counts) {
    if (entry.count > dominant.count) dominant = entry;
    if (entry.count < deficient.count) deficient = entry;
  }
  return {
    dominant: dominant.element,
    dominantCount: dominant.count,
    deficient: deficient.element,
    deficientCount: deficient.count,
    counts: Object.fromEntries(counts.map(({ element, count }) => [element, count])),
  };
}

/** 일간(기준) 대비 다른 천간이 무슨 십성이 되는가 */
function tenGodOf(baseStem, otherStem) {
  const baseElement = STEM_ELEMENT[baseStem];
  const otherElement = STEM_ELEMENT[otherStem];
  if (!baseElement || !otherElement) return "";
  const samePolarity = STEM_POLARITY[baseStem] === STEM_POLARITY[otherStem];
  if (otherElement === baseElement) return samePolarity ? "비견" : "겁재";
  if (PRODUCES[baseElement] === otherElement) return samePolarity ? "식신" : "상관";
  if (CONTROLS[baseElement] === otherElement) return samePolarity ? "편재" : "정재";
  if (CONTROLS[otherElement] === baseElement) return samePolarity ? "편관" : "정관";
  if (PRODUCES[otherElement] === baseElement) return samePolarity ? "편인" : "정인";
  return "";
}

/** 두 오행의 관계를 방향까지 담아 판정 */
function elementRelation(fromElement, toElement) {
  if (!fromElement || !toElement) return { kind: "", label: "" };
  if (fromElement === toElement) return { kind: "same", label: "비화(比和) — 같은 오행" };
  if (PRODUCES[fromElement] === toElement) return { kind: "produces", label: `상생 — ${fromElement}이 ${toElement}를 살린다` };
  if (PRODUCES[toElement] === fromElement) return { kind: "produced", label: `상생 — ${toElement}가 ${fromElement}을 살린다` };
  if (CONTROLS[fromElement] === toElement) return { kind: "controls", label: `상극 — ${fromElement}이 ${toElement}를 누른다` };
  if (CONTROLS[toElement] === fromElement) return { kind: "controlled", label: `상극 — ${toElement}가 ${fromElement}을 누른다` };
  return { kind: "", label: "" };
}

// ─── 사주 궁합 축 ────────────────────────────────────────────────────────────

/** 1) 일간의 관계 — 오행 상생상극 + 천간합·충 */
function buildDayStemRelation(selfSaju, partnerSaju) {
  const selfStem = clean(selfSaju.dayMaster).charAt(0);
  const partnerStem = clean(partnerSaju.dayMaster).charAt(0);
  const selfElement = STEM_ELEMENT[selfStem] || "";
  const partnerElement = STEM_ELEMENT[partnerStem] || "";
  const relation = elementRelation(selfElement, partnerElement);

  return {
    selfStem,
    partnerStem,
    selfElement,
    partnerElement,
    samePolarity: Boolean(selfStem && partnerStem && STEM_POLARITY[selfStem] === STEM_POLARITY[partnerStem]),
    relationKind: relation.kind,
    relationLabel: relation.label,
    stemCombination: pairMatches(STEM_COMBINATIONS, selfStem, partnerStem),
    stemClash: pairMatches(STEM_CLASHES, selfStem, partnerStem),
    partnerAsMyTenGod: tenGodOf(selfStem, partnerStem),
    meAsPartnerTenGod: tenGodOf(partnerStem, selfStem),
  };
}

/** 2) 오행 균형 — 상대가 내 결핍을 덮는가, 합치면 무엇이 과해지는가 */
function buildElementBalance(selfSaju, partnerSaju) {
  const self = elementExtremes(selfSaju.fiveElements);
  const partner = elementExtremes(partnerSaju.fiveElements);
  const merged = Object.fromEntries(ELEMENTS.map((element) => [element, self.counts[element] + partner.counts[element]]));
  const mergedTotal = ELEMENTS.reduce((sum, element) => sum + merged[element], 0);
  const evenShare = mergedTotal / ELEMENTS.length;

  // 내가 부족한 오행(전체 대비 하위)을 상대가 2 이상 가지고 있으면 "덮어 준다"고 본다.
  const covers = (source, target) => ELEMENTS
    .filter((element) => target.counts[element] <= 1 && source.counts[element] >= 2)
    .map((element) => ({ element, from: source.counts[element], to: target.counts[element] }));

  return {
    selfCounts: self.counts,
    partnerCounts: partner.counts,
    mergedCounts: merged,
    selfDominant: self.dominant,
    selfDeficient: self.deficient,
    partnerDominant: partner.dominant,
    partnerDeficient: partner.deficient,
    partnerCoversMyGap: covers(partner, self),
    iCoverPartnerGap: covers(self, partner),
    // 합쳤을 때 균등분보다 1.8배 이상 몰리는 오행 = 둘이 함께 있으면 과해지는 결
    overloadedTogether: ELEMENTS.filter((element) => evenShare > 0 && merged[element] >= evenShare * 1.8),
    // 둘 다 비어 있는 오행 = 관계가 함께 약한 영역
    sharedGap: ELEMENTS.filter((element) => merged[element] === 0),
  };
}

/** 3) 십성 상호작용 — 상대가 내 명식에서 어떤 역할로 앉는가 (양방향) */
function buildTenGodInteraction(selfSaju, partnerSaju) {
  const selfStem = clean(selfSaju.dayMaster).charAt(0);
  const partnerStem = clean(partnerSaju.dayMaster).charAt(0);

  // 상대의 네 기둥 천간이 내 일간 기준 무슨 십성인지 (관성·재성이 몰리는지 본다)
  const roleFromPillars = (baseStem, otherSaju) => PILLAR_KEYS
    .map((key) => ({ key, label: PILLAR_LABELS[key], pillar: clean(otherSaju[key]) }))
    .filter((entry) => entry.pillar)
    .map((entry) => ({ ...entry, tenGod: tenGodOf(baseStem, pillarStem(entry.pillar)) }))
    .filter((entry) => entry.tenGod);

  const partnerPillarsToMe = roleFromPillars(selfStem, partnerSaju);
  const myPillarsToPartner = roleFromPillars(partnerStem, selfSaju);
  const tally = (entries) => entries.reduce((acc, entry) => {
    acc[entry.tenGod] = (acc[entry.tenGod] || 0) + 1;
    return acc;
  }, {});

  return {
    partnerAsMyTenGod: tenGodOf(selfStem, partnerStem),
    meAsPartnerTenGod: tenGodOf(partnerStem, selfStem),
    partnerPillarsToMe,
    myPillarsToPartner,
    partnerRoleTally: tally(partnerPillarsToMe),
    myRoleTally: tally(myPillarsToPartner),
    selfNatalTenGods: asObject(selfSaju.tenGods),
    partnerNatalTenGods: asObject(partnerSaju.tenGods),
  };
}

/** 4) 용신 보완 — 상대가 내 보완 축을 공급하는가 / 내 과다 축을 키우는가 (양방향) */
function buildYongshinSupport(selfSaju, partnerSaju) {
  const self = elementExtremes(selfSaju.fiveElements);
  const partner = elementExtremes(partnerSaju.fiveElements);
  const selfUseful = leadingElement(selfSaju.usefulGod);
  const selfUnfavorable = leadingElement(selfSaju.unfavorableGod);
  const partnerUseful = leadingElement(partnerSaju.usefulGod);
  const partnerUnfavorable = leadingElement(partnerSaju.unfavorableGod);

  const side = (useful, unfavorable, other) => ({
    usefulElement: useful,
    unfavorableElement: unfavorable,
    // 상대가 내 보완 오행을 2 이상 갖고 있으면 공급자로 본다
    supplied: Boolean(useful) && num(other.counts[useful]) >= 2,
    suppliedCount: useful ? num(other.counts[useful]) : 0,
    // 상대의 최다 오행이 내 과다 축과 같으면 그 결을 더 키운다
    amplified: Boolean(unfavorable) && other.dominant === unfavorable,
  });

  return {
    self: side(selfUseful, selfUnfavorable, partner),
    partner: side(partnerUseful, partnerUnfavorable, self),
    selfStrength: clean(selfSaju.strength),
    partnerStrength: clean(partnerSaju.strength),
    mutual: Boolean(selfUseful) && Boolean(partnerUseful)
      && num(partner.counts[selfUseful]) >= 2 && num(self.counts[partnerUseful]) >= 2,
  };
}

/** 5) 지지 교차 — 네 기둥 × 네 기둥의 합충형파해 */
function buildBranchRelations(selfSaju, partnerSaju) {
  const sides = (saju) => PILLAR_KEYS
    .map((key) => ({ key, label: PILLAR_LABELS[key], pillar: clean(saju[key]), branch: pillarBranch(saju[key]) }))
    .filter((entry) => entry.branch && BRANCH_ELEMENT[entry.branch]);

  const selfPillars = sides(selfSaju);
  const partnerPillars = sides(partnerSaju);
  const relations = [];

  for (const mine of selfPillars) {
    for (const theirs of partnerPillars) {
      const types = [];
      if (pairMatches(BRANCH_COMBINATIONS, mine.branch, theirs.branch)) types.push({ type: "육합", polarity: "support" });
      for (const triad of BRANCH_TRIADS) {
        if (mine.branch !== theirs.branch && triad.branches.includes(mine.branch) && triad.branches.includes(theirs.branch)) {
          types.push({ type: "반합", polarity: "support", element: triad.element });
        }
      }
      if (pairMatches(BRANCH_CLASHES, mine.branch, theirs.branch)) types.push({ type: "충", polarity: "tension" });
      if (pairMatches(BRANCH_PUNISHMENTS, mine.branch, theirs.branch)) types.push({ type: "형", polarity: "tension" });
      if (pairMatches(BRANCH_BREAKS, mine.branch, theirs.branch)) types.push({ type: "파", polarity: "tension" });
      if (pairMatches(BRANCH_HARMS, mine.branch, theirs.branch)) types.push({ type: "해", polarity: "tension" });
      for (const entry of types) {
        relations.push({
          selfPillar: mine.label,
          selfBranch: mine.branch,
          partnerPillar: theirs.label,
          partnerBranch: theirs.branch,
          ...entry,
        });
      }
    }
  }

  const supportCount = relations.filter((item) => item.polarity === "support").length;
  const tensionCount = relations.filter((item) => item.polarity === "tension").length;
  // 일주끼리 부딪치면 생활 리듬에, 년주끼리면 배경·집안 결에 걸린다 — 무게가 다르다
  const dayAxis = relations.filter((item) => item.selfPillar === "일주" && item.partnerPillar === "일주");

  return { relations, supportCount, tensionCount, dayAxis };
}

/** 사주 궁합 4축 점수 — 위 판정에서만 나온 결정론 값 */
function buildSajuAxisScores({ dayStemRelation, elementBalance, tenGodInteraction, yongshinSupport, branchRelations }) {
  const relationBonus = {
    produces: 12, produced: 12, same: 4, controls: -6, controlled: -6, "": 0,
  }[dayStemRelation.relationKind] || 0;

  const attraction = clamp(
    38
    + relationBonus
    + (dayStemRelation.stemCombination ? 14 : 0)
    + (dayStemRelation.stemClash ? -12 : 0)
    + (dayStemRelation.samePolarity ? -3 : 5)
    + Math.min(12, branchRelations.supportCount * 3)
    + Math.min(8, elementBalance.partnerCoversMyGap.length * 4),
  );

  const stability = clamp(
    54
    + Math.min(18, branchRelations.supportCount * 4)
    - Math.min(24, branchRelations.tensionCount * 4)
    - (branchRelations.dayAxis.some((item) => item.polarity === "tension") ? 8 : 0)
    - Math.min(9, elementBalance.overloadedTogether.length * 4)
    + (yongshinSupport.mutual ? 8 : 0),
  );

  // 식상(표현)·인성(수용)이 오가면 말이 통하고, 관성만 몰리면 긴장이 앞선다
  const flowRoles = ["식신", "상관", "정인", "편인"];
  const pressureRoles = ["편관", "정관"];
  const roleCount = (tally, roles) => roles.reduce((sum, role) => sum + num(tally[role]), 0);
  const communication = clamp(
    44
    + roleCount(tenGodInteraction.partnerRoleTally, flowRoles) * 4
    + roleCount(tenGodInteraction.myRoleTally, flowRoles) * 3
    - roleCount(tenGodInteraction.partnerRoleTally, pressureRoles) * 3
    + Math.min(8, branchRelations.supportCount * 2)
    - Math.min(10, branchRelations.tensionCount * 2),
  );

  const endurance = clamp(
    42
    + (yongshinSupport.self.supplied ? 9 : 0)
    + (yongshinSupport.partner.supplied ? 8 : 0)
    - (yongshinSupport.self.amplified ? 9 : 0)
    - (yongshinSupport.partner.amplified ? 7 : 0)
    - Math.min(14, elementBalance.sharedGap.length * 5)
    + Math.min(10, branchRelations.supportCount * 2),
  );

  return { attraction, stability, communication, endurance };
}

// ─── 자미두수 궁합 축 ────────────────────────────────────────────────────────

function palaceByName(chart, name) {
  return asArray(chart.palaces).find((palace) => clean(palace?.name) === name) || null;
}
function palaceByBranchIndex(chart, branchIndex) {
  if (!Number.isFinite(num(branchIndex, NaN))) return null;
  return asArray(chart.palaces).find((palace) => num(palace?.branchIndex, -1) === num(branchIndex)) || null;
}
function starsOf(palace) {
  const p = asObject(palace);
  return {
    mainStars: asArray(p.mainStars).map((star) => clean(star)).filter(Boolean),
    assistantStars: asArray(p.assistantStars).map((star) => clean(star)).filter(Boolean),
    maleficStars: asArray(p.maleficStars).map((star) => clean(star)).filter(Boolean),
    transformations: asArray(p.transformations).map((item) => clean(item)).filter(Boolean),
    brightness: asObject(p.brightness),
    earthlyBranch: clean(p.earthlyBranch),
    branchIndex: num(p.branchIndex, -1),
  };
}
/** 어떤 성요가 앉은 궁을 찾는다(주성·보성·살성 전체 탐색) */
function palaceHoldingStar(chart, starName) {
  const target = clean(starName);
  if (!target) return null;
  return asArray(chart.palaces).find((palace) => {
    const p = asObject(palace);
    return asArray(p.mainStars).includes(target)
      || asArray(p.assistantStars).includes(target)
      || asArray(p.maleficStars).includes(target);
  }) || null;
}

/** 6) 명반 상호 배치 — 상대의 명궁·신궁 지지가 내 명반의 어느 궁에 떨어지는가 */
function buildPalaceOverlay(selfZiwei, partnerZiwei) {
  const overlay = (fromChart, ontoChart, palaceName) => {
    const source = palaceByName(fromChart, palaceName);
    if (!source) return null;
    const landing = palaceByBranchIndex(ontoChart, source.branchIndex);
    if (!landing) return null;
    const landingStars = starsOf(landing);
    return {
      sourcePalace: palaceName,
      sourceBranch: clean(source.earthlyBranch),
      landsOn: clean(landing.name),
      landingMainStars: landingStars.mainStars,
      landingMaleficStars: landingStars.maleficStars,
      landingTransformations: landingStars.transformations,
    };
  };

  return {
    // 상대의 명궁이 내 명반에서 앉는 자리 — 상대가 내 삶의 어느 영역으로 들어오는가
    partnerMingOntoMe: overlay(partnerZiwei, selfZiwei, "명궁"),
    // 내 명궁이 상대 명반에서 앉는 자리
    myMingOntoPartner: overlay(selfZiwei, partnerZiwei, "명궁"),
    partnerSpouseOntoMe: overlay(partnerZiwei, selfZiwei, "부부궁"),
    mySpouseOntoPartner: overlay(selfZiwei, partnerZiwei, "부부궁"),
    selfBureau: asObject(selfZiwei.bureau),
    partnerBureau: asObject(partnerZiwei.bureau),
  };
}

/** 7) 부처궁 교차 비교 + 반향(서로의 부처궁이 상대 명궁 주성을 실제로 부르고 있는가) */
function buildSpouseCross(selfZiwei, partnerZiwei) {
  const selfSpouse = starsOf(palaceByName(selfZiwei, "부부궁"));
  const partnerSpouse = starsOf(palaceByName(partnerZiwei, "부부궁"));
  const selfMing = starsOf(palaceByName(selfZiwei, "명궁"));
  const partnerMing = starsOf(palaceByName(partnerZiwei, "명궁"));

  const intersect = (a, b) => a.filter((star) => b.includes(star));

  return {
    selfSpouse,
    partnerSpouse,
    // 내가 그리는 배우자상(내 부부궁 주성)이 상대의 실제 결(상대 명궁 주성)과 겹치는가
    myIdealMatchesPartner: intersect(selfSpouse.mainStars, partnerMing.mainStars),
    partnerIdealMatchesMe: intersect(partnerSpouse.mainStars, selfMing.mainStars),
    // 두 부처궁이 같은 별을 공유하면 관계를 보는 눈이 닮아 있다
    sharedSpouseStars: intersect(selfSpouse.mainStars, partnerSpouse.mainStars),
    bothSpouseEmpty: selfSpouse.mainStars.length === 0 && partnerSpouse.mainStars.length === 0,
    selfSpouseMalefic: selfSpouse.maleficStars,
    partnerSpouseMalefic: partnerSpouse.maleficStars,
  };
}

/** 8) 살성이 상대의 어느 궁에 앉는가 (양방향) */
function buildMaleficImpact(selfZiwei, partnerZiwei) {
  const landings = (fromChart, ontoChart) => asArray(fromChart.palaces)
    .flatMap((palace) => {
      const p = starsOf(palace);
      if (!p.maleficStars.length) return [];
      const landing = palaceByBranchIndex(ontoChart, p.branchIndex);
      if (!landing) return [];
      return [{
        fromPalace: clean(asObject(palace).name),
        stars: p.maleficStars,
        landsOn: clean(landing.name),
        branch: p.earthlyBranch,
      }];
    });

  const mine = landings(selfZiwei, partnerZiwei);
  const theirs = landings(partnerZiwei, selfZiwei);
  const sensitive = ["명궁", "부부궁", "질액궁", "복덕궁"];

  return {
    myMaleficOntoPartner: mine,
    partnerMaleficOntoMe: theirs,
    myHitsOnSensitive: mine.filter((item) => sensitive.includes(item.landsOn)),
    partnerHitsOnSensitive: theirs.filter((item) => sensitive.includes(item.landsOn)),
  };
}

/** 9) 사화 교환 — 화록·화권·화과·화기가 상대 명반의 어느 궁으로 떨어지는가 */
function buildSihuaExchange(selfZiwei, partnerZiwei) {
  const LABELS = { huaLu: "화록", huaQuan: "화권", huaKe: "화과", huaJi: "화기" };
  const exchange = (fromChart, ontoChart) => Object.entries(LABELS)
    .map(([key, label]) => {
      const star = clean(asObject(fromChart.fourTransformations)[key]);
      if (!star) return null;
      const holder = palaceHoldingStar(fromChart, star);
      if (!holder) return { transform: label, star, holderPalace: "", landsOn: "" };
      const landing = palaceByBranchIndex(ontoChart, num(asObject(holder).branchIndex, -1));
      return {
        transform: label,
        star,
        holderPalace: clean(asObject(holder).name),
        landsOn: landing ? clean(landing.name) : "",
      };
    })
    .filter(Boolean);

  const mine = exchange(selfZiwei, partnerZiwei);
  const theirs = exchange(partnerZiwei, selfZiwei);
  const isGift = (item) => item.transform !== "화기";

  return {
    myTransformsOntoPartner: mine,
    partnerTransformsOntoMe: theirs,
    giftsToPartner: mine.filter(isGift).filter((item) => item.landsOn),
    giftsToMe: theirs.filter(isGift).filter((item) => item.landsOn),
    myHuaJiOntoPartner: mine.find((item) => item.transform === "화기" && item.landsOn) || null,
    partnerHuaJiOntoMe: theirs.find((item) => item.transform === "화기" && item.landsOn) || null,
  };
}

/** 자미두수 궁합 3축 점수 */
function buildZiweiAxisScores({ palaceOverlay, spouseCross, maleficImpact, sihuaExchange }) {
  // 상대 명궁이 내 부부궁·복덕궁에 앉으면 관계 자리로 바로 들어오고, 질액·노복궁에 앉으면
  // 관계가 아닌 자리에서 마주친다. 양쪽 방향을 함께 주어야 축이 50 아래로도 내려간다.
  const warmLanding = ["부부궁", "복덕궁", "명궁", "재백궁"];
  const coldLanding = ["질액궁", "노복궁", "부모궁", "형제궁"];
  const landingShift = (overlay) => {
    if (!overlay) return 0;
    if (warmLanding.includes(overlay.landsOn)) return 11;
    if (coldLanding.includes(overlay.landsOn)) return -9;
    return 0;
  };

  const resonance = clamp(
    46
    + landingShift(palaceOverlay.partnerMingOntoMe)
    + landingShift(palaceOverlay.myMingOntoPartner)
    + landingShift(palaceOverlay.partnerSpouseOntoMe)
    + spouseCross.myIdealMatchesPartner.length * 8
    + spouseCross.partnerIdealMatchesMe.length * 8
    + spouseCross.sharedSpouseStars.length * 5
    - (spouseCross.bothSpouseEmpty ? 8 : 0),
  );

  // 살성은 6성이 12궁에 흩어져 민감궁(4궁) 적중이 흔하고, 사화 중 3종은 대개 어딘가에 떨어진다.
  // 가중치를 크게 잡으면 거의 모든 짝이 "마찰 높음/성장 높음"으로 쏠려 교차검증이 판별력을 잃는다.
  // 기대값이 45~55 근처에 오도록 base 와 계수를 낮춘다.
  const friction = clamp(
    16
    + Math.min(20, maleficImpact.myHitsOnSensitive.length * 6)
    + Math.min(20, maleficImpact.partnerHitsOnSensitive.length * 6)
    + (sihuaExchange.myHuaJiOntoPartner ? 8 : 0)
    + (sihuaExchange.partnerHuaJiOntoMe ? 8 : 0)
    + spouseCross.selfSpouseMalefic.length * 3
    + spouseCross.partnerSpouseMalefic.length * 3,
  );

  // 화록·화권·화과가 상대의 관계·현실 자리에 떨어질 때 특히 서로를 키운다 —
  // 사화가 어디로 가는지는 짝마다 크게 달라서 이 축의 분산을 만든다.
  const nourishing = ["부부궁", "재백궁", "관록궁", "복덕궁", "명궁"];
  const targeted = (gifts) => gifts.filter((item) => nourishing.includes(item.landsOn)).length;

  const growth = clamp(
    26
    + sihuaExchange.giftsToPartner.length * 4
    + sihuaExchange.giftsToMe.length * 4
    + targeted(sihuaExchange.giftsToPartner) * 5
    + targeted(sihuaExchange.giftsToMe) * 5
    + spouseCross.sharedSpouseStars.length * 4
    - Math.min(14, maleficImpact.myHitsOnSensitive.length * 5),
  );

  return { resonance, friction, growth };
}

// ─── 두 체계 교차 (합치점 / 차이점 병기) ─────────────────────────────────────

const CROSS_THEMES = [
  { theme: "끌림의 세기", sajuKey: "attraction", ziweiKey: "resonance", invertZiwei: false },
  { theme: "관계의 안정", sajuKey: "stability", ziweiKey: "friction", invertZiwei: true },
  { theme: "함께 자라는 힘", sajuKey: "endurance", ziweiKey: "growth", invertZiwei: false },
];

function band(score) {
  if (score >= 62) return "high";
  if (score <= 43) return "low";
  return "mid";
}

/**
 * 한쪽 체계로 다른 쪽을 덮지 않는다. 같은 방향이면 합치점, 반대 방향이면 차이점으로
 * 두 읽기를 나란히 남긴다(나크샤트라 결정판과 같은 처리).
 */
function buildCross(sajuAxis, ziweiAxis) {
  const convergence = [];
  const divergence = [];

  for (const { theme, sajuKey, ziweiKey, invertZiwei } of CROSS_THEMES) {
    const sajuScore = num(sajuAxis[sajuKey]);
    const rawZiwei = num(ziweiAxis[ziweiKey]);
    const ziweiScore = invertZiwei ? 100 - rawZiwei : rawZiwei;
    const sajuBand = band(sajuScore);
    const ziweiBand = band(ziweiScore);
    const entry = {
      theme,
      sajuAxis: sajuKey,
      sajuScore,
      sajuBand,
      ziweiAxis: ziweiKey,
      ziweiScore,
      ziweiBand,
      ziweiInverted: invertZiwei,
    };
    if (sajuBand === ziweiBand) convergence.push(entry);
    else if ((sajuBand === "high" && ziweiBand === "low") || (sajuBand === "low" && ziweiBand === "high")) divergence.push(entry);
    else convergence.push({ ...entry, weak: true });
  }

  return { convergence, divergence };
}

// ─── 진입점 ──────────────────────────────────────────────────────────────────

/**
 * 두 사람의 명식·명반 계산 결과만 받아 궁합을 산출한다. 순수 함수.
 *
 * @param {object} params
 * @param {object} params.selfSaju      calculateLifeBookAiSaju(본인)
 * @param {object} params.selfZiwei     calculateZiweiAiChart(본인)
 * @param {object} params.partnerSaju   calculateLifeBookAiSaju(상대)
 * @param {object} params.partnerZiwei  calculateZiweiAiChart(상대)
 * @returns {object} 궁합 판정 결과 (signature 포함, 동일 입력 → 동일 출력)
 */
/**
 * 두 사람의 사주 명식만으로 궁합 축을 산출한다. 순수 함수.
 *
 * buildMasterLoveCodexCompatibility 의 사주 절반을 그대로 떼어낸 것이며,
 * 자미두수 없이 사주만 쓰는 라우트(연애 비책 AI)가 재사용한다.
 * 🔴 반환 객체의 키 순서는 buildMasterLoveCodexCompatibility 의 `saju` 와 동일해야 한다
 *    — hashSignature 가 키 순서에 민감해 verify:master-love-codex-compat 이 이를 검사한다.
 *
 * @param {object} params
 * @param {object} params.selfSaju     calculateLifeBookAiSaju(본인)
 * @param {object} params.partnerSaju  calculateLifeBookAiSaju(상대)
 */
export function buildSajuLoveCompatibility({ selfSaju, partnerSaju } = {}) {
  const sSaju = asObject(selfSaju);
  const pSaju = asObject(partnerSaju);

  if (!clean(sSaju.dayMaster) || !clean(pSaju.dayMaster)) {
    const error = new Error("missing day master for compatibility");
    error.code = "CALCULATION_FAILED";
    throw error;
  }

  const dayStemRelation = buildDayStemRelation(sSaju, pSaju);
  const elementBalance = buildElementBalance(sSaju, pSaju);
  const tenGodInteraction = buildTenGodInteraction(sSaju, pSaju);
  const yongshinSupport = buildYongshinSupport(sSaju, pSaju);
  const branchRelations = buildBranchRelations(sSaju, pSaju);
  const axisScores = buildSajuAxisScores({
    dayStemRelation, elementBalance, tenGodInteraction, yongshinSupport, branchRelations,
  });

  return { dayStemRelation, elementBalance, tenGodInteraction, yongshinSupport, branchRelations, axisScores };
}

/**
 * 두 사람의 자미두수 명반만으로 궁합 축을 산출한다. 순수 함수.
 *
 * buildMasterLoveCodexCompatibility 의 자미두수 절반을 그대로 떼어낸 것이며,
 * 사주 없이 명반만 쓰는 라우트(네오 작전실 궁합 모드)가 재사용한다.
 * 🔴 반환 객체의 키 순서는 buildMasterLoveCodexCompatibility 의 `ziwei` 와 동일해야 한다
 *    — hashSignature 가 키 순서에 민감해 verify:master-love-codex-compat 이 이를 검사한다.
 *    (사주 절반의 buildSajuLoveCompatibility 가 지는 것과 같은 제약이다.)
 *
 * @param {object} params
 * @param {object} params.selfZiwei     calculateZiweiAiChart(본인)
 * @param {object} params.partnerZiwei  calculateZiweiAiChart(상대)
 */
export function buildZiweiLoveCompatibility({ selfZiwei, partnerZiwei } = {}) {
  const sZiwei = asObject(selfZiwei);
  const pZiwei = asObject(partnerZiwei);

  const palaceOverlay = buildPalaceOverlay(sZiwei, pZiwei);
  const spouseCross = buildSpouseCross(sZiwei, pZiwei);
  const maleficImpact = buildMaleficImpact(sZiwei, pZiwei);
  const sihuaExchange = buildSihuaExchange(sZiwei, pZiwei);
  const axisScores = buildZiweiAxisScores({ palaceOverlay, spouseCross, maleficImpact, sihuaExchange });

  return { palaceOverlay, spouseCross, maleficImpact, sihuaExchange, axisScores };
}

export function buildMasterLoveCodexCompatibility({ selfSaju, selfZiwei, partnerSaju, partnerZiwei } = {}) {
  const sSaju = asObject(selfSaju);
  const pSaju = asObject(partnerSaju);
  const sZiwei = asObject(selfZiwei);
  const pZiwei = asObject(partnerZiwei);

  const saju = buildSajuLoveCompatibility({ selfSaju, partnerSaju });
  const sajuAxisScores = saju.axisScores;

  const ziwei = buildZiweiLoveCompatibility({ selfZiwei, partnerZiwei });
  const ziweiAxisScores = ziwei.axisScores;

  const cross = buildCross(sajuAxisScores, ziweiAxisScores);

  const uncertainty = [];
  if (asObject(sSaju.calculationMeta).timeUnknown) uncertainty.push("self_birth_time_unknown");
  if (asObject(pSaju.calculationMeta).timeUnknown) uncertainty.push("partner_birth_time_unknown");
  if (asObject(sZiwei.uncertainty).birthTimeUnknown) uncertainty.push("self_ziwei_noon_basis");
  if (asObject(pZiwei.uncertainty).birthTimeUnknown) uncertainty.push("partner_ziwei_noon_basis");

  return {
    version: MASTER_LOVE_CODEX_COMPAT_VERSION,
    signature: hashSignature({ v: MASTER_LOVE_CODEX_COMPAT_VERSION, saju, ziwei, cross, uncertainty }),
    saju,
    ziwei,
    cross,
    uncertainty,
  };
}

/** 결정론 검증 스크립트용 — 같은 입력이면 같은 문자열이 나와야 한다 */
export function serializeCompatibility(compatibility) {
  return canonicalStringify(compatibility);
}
