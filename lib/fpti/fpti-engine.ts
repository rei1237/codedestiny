import { axisMeaning, recommendedMatches, resolveFptiTypeCopy } from "./fpti-copy";
import type {
  FptiAnalysisResult,
  FptiAxisCodes,
  FptiResultQuality,
  FptiSourceData,
  FiveElementKey,
} from "./fpti-types";

const ELEMENT_LABEL: Record<FiveElementKey, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const SEASON_TO_ELEMENT: Record<string, FiveElementKey> = {
  spring: "wood",
  summer: "fire",
  autumn: "metal",
  winter: "water",
};

function normalizeElementToken(input: string): FiveElementKey | undefined {
  const value = String(input || "").trim().toLowerCase();
  if (!value) return undefined;

  if (["wood", "목", "갑", "을", "甲", "乙"].includes(value)) return "wood";
  if (["fire", "화", "병", "정", "丙", "丁"].includes(value)) return "fire";
  if (["earth", "토", "무", "기", "戊", "己"].includes(value)) return "earth";
  if (["metal", "금", "경", "신", "庚", "辛"].includes(value)) return "metal";
  if (["water", "수", "임", "계", "壬", "癸"].includes(value)) return "water";

  return undefined;
}

function normalizeList(input: string[] | undefined): FiveElementKey[] {
  const out = new Set<FiveElementKey>();
  for (const item of input || []) {
    const normalized = normalizeElementToken(item);
    if (normalized) out.add(normalized);
  }
  return [...out];
}

function sum(values: number[]) {
  return values.reduce((acc, cur) => acc + Number(cur || 0), 0);
}

function getFiveElementTotals(source: FptiSourceData) {
  return {
    wood: Math.max(0, Number(source.fiveElements.wood || 0)),
    fire: Math.max(0, Number(source.fiveElements.fire || 0)),
    earth: Math.max(0, Number(source.fiveElements.earth || 0)),
    metal: Math.max(0, Number(source.fiveElements.metal || 0)),
    water: Math.max(0, Number(source.fiveElements.water || 0)),
  };
}

function getTenGodTotals(source: FptiSourceData) {
  return {
    expression: Number(source.tenGods.sikSin || 0) + Number(source.tenGods.sangGwan || 0),
    officer: Number(source.tenGods.jeongGwan || 0) + Number(source.tenGods.pyeonGwan || 0),
    wealth: Number(source.tenGods.jeongJae || 0) + Number(source.tenGods.pyeonJae || 0),
    resource: Number(source.tenGods.jeongIn || 0) + Number(source.tenGods.pyeonIn || 0),
    peer: Number(source.tenGods.biGyeon || 0) + Number(source.tenGods.geopJae || 0),
  };
}

function toPercentages(source: FptiSourceData): Record<FiveElementKey, number> {
  const raw = getFiveElementTotals(source);
  const total = sum(Object.values(raw));

  if (total <= 0) {
    const fallback = {
      wood: 16,
      fire: 16,
      earth: 16,
      metal: 16,
      water: 16,
    } as Record<FiveElementKey, number>;
    fallback[source.dayMasterElement] = 36;
    return fallback;
  }

  return {
    wood: Math.round((raw.wood / total) * 1000) / 10,
    fire: Math.round((raw.fire / total) * 1000) / 10,
    earth: Math.round((raw.earth / total) * 1000) / 10,
    metal: Math.round((raw.metal / total) * 1000) / 10,
    water: Math.round((raw.water / total) * 1000) / 10,
  };
}

function sortEntriesByScore(entries: [string, number][], priority: string[]) {
  const order = new Map(priority.map((key, idx) => [key, idx]));
  return entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return (order.get(a[0]) ?? 999) - (order.get(b[0]) ?? 999);
  });
}

function topKeys<T extends Record<string, number>>(obj: T, count = 2, priority: string[] = []) {
  return sortEntriesByScore(Object.entries(obj), priority)
    .slice(0, count)
    .map(([key]) => key);
}

function bottomKeys<T extends Record<string, number>>(obj: T, count = 2) {
  return Object.entries(obj)
    .sort((a, b) => a[1] - b[1])
    .slice(0, count)
    .map(([key]) => key);
}

function detectQuality(source: FptiSourceData): FptiResultQuality {
  const fiveTotal = sum(Object.values(getFiveElementTotals(source)));
  const tenTotal = sum(Object.values(getTenGodTotals(source)));
  const hasCore = Boolean(source.dayMaster) && Boolean(source.monthBranch);

  if (!hasCore || (fiveTotal <= 0 && tenTotal <= 0)) {
    return "fallback";
  }

  const hasUseful = normalizeList(source.usefulGods).length > 0;
  const hasStrength = Number.isFinite(Number(source.strengthScore || 0)) && Number(source.strengthScore || 0) > 0;
  const hasHour = Boolean(source.pillars.hour);

  if (!hasUseful || !hasStrength || !hasHour) {
    return "partial";
  }

  return "full";
}

function seasonElement(season: string): FiveElementKey | undefined {
  const value = String(season || "").toLowerCase();
  if (value.includes("spring") || value.includes("봄")) return SEASON_TO_ELEMENT.spring;
  if (value.includes("summer") || value.includes("여름")) return SEASON_TO_ELEMENT.summer;
  if (value.includes("autumn") || value.includes("가을")) return SEASON_TO_ELEMENT.autumn;
  if (value.includes("winter") || value.includes("겨울")) return SEASON_TO_ELEMENT.winter;
  return undefined;
}

function axisTemperament(source: FptiSourceData, percentages: Record<FiveElementKey, number>): FptiAxisCodes["temperament"] {
  const scores = {
    wood: percentages.wood,
    fire: percentages.fire,
    earth: percentages.earth,
    metal: percentages.metal,
    water: percentages.water,
  };

  scores[source.dayMasterElement] += 11;
  const seasonal = seasonElement(source.season);
  if (seasonal) scores[seasonal] += 5;

  const best = topKeys(scores, 1, [source.dayMasterElement, seasonal || "water", "wood", "fire", "earth", "metal", "water"])[0] as FiveElementKey;
  if (best === "wood") return "W";
  if (best === "fire") return "F";
  if (best === "earth") return "E";
  if (best === "metal") return "M";
  return "A";
}

function axisBehavior(source: FptiSourceData, percentages: Record<FiveElementKey, number>) {
  const grouped = getTenGodTotals(source);

  const map = {
    C: grouped.expression + percentages.fire * 0.18 + percentages.wood * 0.1,
    R: grouped.officer + percentages.metal * 0.14 + percentages.earth * 0.08,
    W: grouped.wealth + percentages.earth * 0.15 + percentages.fire * 0.07,
    S: grouped.resource + percentages.water * 0.16 + percentages.metal * 0.06,
    I: grouped.peer + percentages.wood * 0.12 + percentages.water * 0.06,
  };

  const behavior = topKeys(map, 1, ["S", "R", "C", "W", "I"])[0] as FptiAxisCodes["behavior"];
  return { behavior, grouped };
}

function axisRelation(
  source: FptiSourceData,
  grouped: { expression: number; officer: number; wealth: number; resource: number; peer: number },
  percentages: Record<FiveElementKey, number>,
) {
  const open = grouped.expression + percentages.fire * 0.8 + grouped.wealth * 0.35;
  const deep = grouped.resource + percentages.water * 0.9 + (grouped.resource > grouped.officer ? 4 : 0);
  const loyal = grouped.officer + percentages.earth * 0.9 + percentages.metal * 0.4;
  const free = grouped.peer + Number(source.tenGods.sangGwan || 0) * 0.7 + percentages.wood * 0.3 + percentages.metal * 0.2;

  const relationScores = { O: open, D: deep, L: loyal, F: free };
  const relation = topKeys(relationScores, 1, ["D", "L", "O", "F"])[0] as FptiAxisCodes["relation"];

  const relationStyle = relation === "O"
    ? { key: "Open" as const, description: "새로운 관계를 빠르게 열고 공감 신호를 먼저 보냅니다." }
    : relation === "D"
      ? { key: "Deep" as const, description: "깊은 신뢰를 쌓은 뒤 오래 유지하는 몰입형입니다." }
      : relation === "L"
        ? { key: "Loyal" as const, description: "책임감 있는 약속과 일관성으로 신뢰를 만듭니다." }
        : { key: "Free" as const, description: "건강한 거리와 개별성을 유지할 때 가장 편안합니다." };

  return { relation, relationStyle, relationScores };
}

function seasonBias(season: string) {
  const s = season.toLowerCase();
  if (s.includes("winter") || s.includes("겨울")) return { B: 2, G: 1, P: 0, H: 4, S: 1 };
  if (s.includes("spring") || s.includes("봄")) return { B: 1, G: 4, P: 1, H: 1, S: 2 };
  if (s.includes("summer") || s.includes("여름")) return { B: 1, G: 2, P: 2, H: 1, S: 4 };
  return { B: 2, G: 1, P: 4, H: 1, S: 1 };
}

function axisStrategy(
  source: FptiSourceData,
  grouped: { expression: number; officer: number; wealth: number; resource: number; peer: number },
  percentages: Record<FiveElementKey, number>,
  quality: FptiResultQuality,
) {
  const scores = { B: 20, G: 20, P: 20, H: 20, S: 20 };
  const useful = normalizeList(source.usefulGods);
  const favorable = normalizeList(source.favorableElements);
  const unfavorable = normalizeList(source.unfavorableElements);
  const strength = Number(source.strengthScore || 55);

  const sortedElements = Object.values(percentages).slice().sort((a, b) => b - a);
  const imbalance = sortedElements[0] - sortedElements[sortedElements.length - 1];

  if (imbalance >= 22) scores.B += 18;
  if (imbalance >= 14 && imbalance < 22) scores.B += 8;

  if (grouped.expression >= grouped.resource && grouped.expression >= grouped.officer) scores.S += 8;
  if (grouped.resource >= grouped.expression || strength <= 48) scores.H += 8;
  if (grouped.wealth + grouped.officer >= grouped.resource + grouped.peer) scores.P += 10;

  if (favorable.includes("wood") || favorable.includes("fire")) {
    scores.G += 6;
    scores.S += 3;
  }

  if (useful.includes("water") || useful.includes("metal")) scores.H += 4;
  if (useful.includes("earth") || useful.includes("metal")) scores.P += 4;
  if (useful.includes("wood")) scores.G += 4;
  if (useful.includes("fire")) scores.S += 4;

  if (unfavorable.includes("fire")) scores.S -= 3;
  if (unfavorable.includes("earth")) scores.P -= 2;

  const weakElements = bottomKeys(percentages, 2) as FiveElementKey[];
  if (weakElements.includes("wood") || weakElements.includes("fire")) scores.G += 3;
  if (weakElements.includes("water")) scores.H += 2;

  if (strength >= 70) {
    scores.P += 4;
    scores.S += 2;
  } else if (strength <= 44) {
    scores.H += 4;
    scores.B += 3;
  }

  if (quality !== "full") scores.B += 5;

  const seasonal = seasonBias(source.season);
  scores.B += seasonal.B;
  scores.G += seasonal.G;
  scores.P += seasonal.P;
  scores.H += seasonal.H;
  scores.S += seasonal.S;

  const strategy = topKeys(scores, 1, ["B", "H", "P", "G", "S"])[0] as FptiAxisCodes["strategy"];
  return { strategy, strategyScores: scores, imbalance };
}

function reliability(source: FptiSourceData, quality: FptiResultQuality) {
  const hasHour = Boolean(source.pillars.hour);
  const base = quality === "full" ? 90 : quality === "partial" ? 80 : 70;
  const hourPenalty = hasHour ? 0 : 8;
  const usefulBonus = normalizeList(source.usefulGods).length >= 2 ? 3 : 0;
  const confidence = Math.max(58, Math.min(97, base - hourPenalty + usefulBonus));

  const message = quality === "full"
    ? "태어난 시간과 핵심 사주 데이터가 충분해 정밀 분석 정확도가 높습니다."
    : quality === "partial"
      ? "일부 입력값이 보정되어 부분 정밀 분석으로 계산했습니다."
      : "핵심 일부 데이터가 부족해 기본 패턴 중심으로 분석했습니다.";

  return {
    confidence,
    message,
    fallbackUsed: quality !== "full",
  };
}

function buildStrategyGuide(strategy: FptiAxisCodes["strategy"]) {
  if (strategy === "B") return "균형 전략: 핵심 루틴 2개를 고정해 오행 편중을 천천히 완화하세요.";
  if (strategy === "G") return "성장 전략: 새로운 역할과 학습 주제를 주 1회 확장하세요.";
  if (strategy === "P") return "성과 전략: 우선순위 1개를 정해 집중 실행 후 수치로 점검하세요.";
  if (strategy === "H") return "치유 전략: 과열 구간을 줄이고 회복 리듬을 먼저 확보하세요.";
  return "발산 전략: 아이디어를 빠르게 공개하고 피드백으로 수정 주기를 짧게 가져가세요.";
}

function strategyLabel(strategy: FptiAxisCodes["strategy"]) {
  if (strategy === "B") return "균형 회복형";
  if (strategy === "G") return "성장 확장형";
  if (strategy === "P") return "현실 성취형";
  if (strategy === "H") return "내면 치유형";
  return "표현 발산형";
}

function behaviorLabel(behavior: FptiAxisCodes["behavior"]) {
  if (behavior === "C") return "창작형";
  if (behavior === "R") return "책임형";
  if (behavior === "W") return "현실형";
  if (behavior === "S") return "통찰형";
  return "독립형";
}

function fallbackNotice(quality: FptiResultQuality) {
  if (quality === "full") return undefined;
  if (quality === "partial") return "입력 정보가 일부 보정되어 결과 신뢰도가 조금 낮아질 수 있어요.";
  return "사주 핵심 정보가 부족해 기본 패턴 중심으로 계산된 결과입니다. 출생시간을 포함해 다시 분석하면 정확도가 올라갑니다.";
}

function tenGodRanking(source: FptiSourceData) {
  return topKeys(
    {
      비견: Number(source.tenGods.biGyeon || 0),
      겁재: Number(source.tenGods.geopJae || 0),
      식신: Number(source.tenGods.sikSin || 0),
      상관: Number(source.tenGods.sangGwan || 0),
      정재: Number(source.tenGods.jeongJae || 0),
      편재: Number(source.tenGods.pyeonJae || 0),
      정관: Number(source.tenGods.jeongGwan || 0),
      편관: Number(source.tenGods.pyeonGwan || 0),
      정인: Number(source.tenGods.jeongIn || 0),
      편인: Number(source.tenGods.pyeonIn || 0),
    },
    3,
    ["정인", "편인", "정관", "편관", "식신", "상관", "정재", "편재", "비견", "겁재"],
  );
}

function paragraphNarrative(params: {
  typeName: string;
  oneLiner: string;
  strongElements: string[];
  weakElements: string[];
  strongTenGods: string[];
  monthBranch: string;
  strategyGuide: string;
  relationDescription: string;
}) {
  const hook = `${params.typeName} 타입은 ${params.oneLiner} 성향이 분명하게 드러납니다.`;
  const basis = `이 결과는 월지 ${params.monthBranch}, 강한 오행 ${params.strongElements.join("/")}, 우세 십성 ${params.strongTenGods.join("/")}의 조합을 바탕으로 계산되었습니다.`;
  const balance = `강점은 ${params.strongElements[0]} 기운의 추진/집중력이며, 보완 포인트는 ${params.weakElements.join("/")} 기운을 의식적으로 채우는 것입니다. 관계에서는 ${params.relationDescription}`;
  const strategy = `${params.strategyGuide} 생활 루틴에 맞게 작게 반복하면 성향의 강점이 안정적으로 확장됩니다.`;

  return { hook, basis, balance, strategy };
}

export function analyzeFpti(source: FptiSourceData): FptiAnalysisResult {
  const quality = detectQuality(source);
  const percentages = toPercentages(source);

  const temperament = axisTemperament(source, percentages);
  const behaviorResult = axisBehavior(source, percentages);
  const relationResult = axisRelation(source, behaviorResult.grouped, percentages);
  const strategyResult = axisStrategy(source, behaviorResult.grouped, percentages, quality);

  const axis: FptiAxisCodes = {
    temperament,
    behavior: behaviorResult.behavior,
    relation: relationResult.relation,
    strategy: strategyResult.strategy,
  };

  const copy = resolveFptiTypeCopy(axis);
  const meanings = axisMeaning(axis);
  const matches = recommendedMatches(relationResult.relationStyle.key);
  const reliabilityInfo = reliability(source, quality);

  const strongElements = topKeys(percentages, 2, [source.dayMasterElement, "water", "wood", "fire", "earth", "metal"])
    .map((key) => ELEMENT_LABEL[key as FiveElementKey] || key);
  const weakElements = bottomKeys(percentages, 2)
    .map((key) => ELEMENT_LABEL[key as FiveElementKey] || key);

  const strongTenGods = tenGodRanking(source);
  const strategyGuide = buildStrategyGuide(axis.strategy);

  const narrative = paragraphNarrative({
    typeName: copy.name,
    oneLiner: copy.oneLiner,
    strongElements,
    weakElements,
    strongTenGods,
    monthBranch: source.monthBranch,
    strategyGuide,
    relationDescription: relationResult.relationStyle.description,
  });

  const elementSummary = `강한 오행은 ${strongElements.join("/")}이며, 약한 오행은 ${weakElements.join("/")}입니다.`;
  const behaviorSummary = `${behaviorLabel(axis.behavior)} 성향이 두드러져 일 처리 방식에 일관된 패턴이 나타납니다.`;
  const relationshipSummary = `${relationResult.relationStyle.key} 관계축이 우세하여 ${relationResult.relationStyle.description}`;
  const strategySummary = `${strategyLabel(axis.strategy)} 전략이 적합합니다. ${strategyGuide}`;
  const loveSummary = axis.relation === "D"
    ? "연애에서는 감정의 깊이를 중시해 천천히 신뢰를 쌓는 방식이 잘 맞습니다."
    : axis.relation === "L"
      ? "연애에서는 약속과 일관성이 안정감을 만들며, 장기적 관계에서 강합니다."
      : axis.relation === "O"
        ? "연애에서는 대화와 경험 공유가 친밀도를 빠르게 올리는 핵심입니다."
        : "연애에서는 서로의 공간을 존중할 때 관계 만족도가 높아집니다.";

  const careerMoneySummary = axis.strategy === "P"
    ? "일과 재물운은 우선순위 집중과 KPI 관리에서 상승폭이 큽니다."
    : axis.strategy === "G"
      ? "일과 재물운은 새 프로젝트 확장과 네트워크 확장형 선택에서 유리합니다."
      : axis.strategy === "B"
        ? "일과 재물운은 리스크 분산과 루틴화로 변동성을 줄일 때 안정됩니다."
        : axis.strategy === "H"
          ? "일과 재물운은 회복 구간을 확보한 뒤 집중 구간을 짧게 반복할 때 좋아집니다."
          : "일과 재물운은 빠른 시도와 공개 피드백 루프를 통해 성장 속도를 높일 수 있습니다.";

  const calculationNotes = [
    `1축 기질: 오행 비율 + 일간(${ELEMENT_LABEL[source.dayMasterElement]}) 가중치 + 계절(${source.season}) 보정`,
    "2축 행동: 식상/관성/재성/인성/비겁 그룹 점수 비교",
    `3축 관계: O/D/L/F 점수 계산 (개방 ${Math.round(relationResult.relationScores.O)}, 심층 ${Math.round(relationResult.relationScores.D)}, 신뢰 ${Math.round(relationResult.relationScores.L)}, 자유 ${Math.round(relationResult.relationScores.F)})`,
    `4축 전략: 오행 분산도 ${Math.round(strategyResult.imbalance)} + 강약(${Math.round(Number(source.strengthScore || 55))}) + 용희신 반영`,
  ];

  if (quality !== "full") {
    calculationNotes.push("보정 계산: 일부 입력이 누락되어 보수적인 가중치가 자동 적용되었습니다.");
  }

  return {
    code: copy.code,
    typeName: copy.name,
    oneLiner: copy.oneLiner,
    summary: copy.summary,
    keywords: copy.keywords,
    quality,
    fallbackNotice: fallbackNotice(quality),
    confidence: reliabilityInfo.confidence,
    reliabilityMessage: reliabilityInfo.message,
    fallbackUsed: reliabilityInfo.fallbackUsed,
    axis,
    axisMeanings: meanings,
    source,
    percentageElements: percentages,
    tenGodGroupScores: behaviorResult.grouped,
    strengths: [
      `${strongElements.join("/")} 기운이 살아 있어 핵심 상황에서 집중력과 추진력이 올라갑니다.`,
      `${strongTenGods[0] || "정인"} 흐름이 강해 고유한 문제 해결 방식이 분명합니다.`,
      strategyGuide,
    ],
    weaknesses: [
      `${weakElements.join("/")} 기운이 약해질 때 판단이 한쪽으로 쏠릴 수 있습니다.`,
      "에너지가 과열되면 관계 템포와 실행 템포가 어긋날 수 있습니다.",
      "장기 목표는 월 단위 점검 루틴으로 재보정하는 것이 안전합니다.",
    ],
    relationStyle: relationResult.relationStyle,
    essenceNarrative: narrative,
    elementSummary,
    behaviorSummary,
    relationshipSummary,
    strategySummary,
    loveSummary,
    careerMoneySummary,
    growthTips: [
      "강점 오행 1개와 약한 오행 1개를 같이 보완하는 주간 루틴을 만드세요.",
      "감정/에너지 기복이 큰 날은 의사결정을 하루 미루고 재확인하세요.",
      "출생시간을 모르는 경우 중요한 결정 전 시주 포함 재분석을 권장합니다.",
    ],
    careerTips: [
      "행동축에 맞는 업무 방식(기획/실행/관리)을 분명히 나누면 성과가 좋아집니다.",
      "협업 상대의 관계축과 내 관계축이 다르면 의사소통 템포를 먼저 맞추세요.",
      "성과 목표를 주간 숫자로 설정하고 월간 단위로만 전략을 조정하세요.",
    ],
    loveTips: [
      "관계축에 맞는 감정표현 방식(빈도/깊이/거리)을 합의하면 마찰이 줄어듭니다.",
      "희신 오행 활동(색, 공간, 시간대)을 데이트 루틴에 넣어 보세요.",
      "강한 십성이 과하게 작동하는 시기에는 반대 성향 질문을 의식적으로 추가하세요.",
    ],
    goodMatch: matches.goodMatch,
    cautionMatch: matches.cautionMatch,
    evidence: {
      dayMaster: `${source.dayMaster} (${ELEMENT_LABEL[source.dayMasterElement]})`,
      monthBranch: source.monthBranch,
      strongElements,
      weakElements,
      strongTenGods,
      recommendedDirection: strategyGuide,
      calculationNotes,
    },
  };
}
