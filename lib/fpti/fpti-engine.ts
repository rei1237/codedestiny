import { axisMeaning, recommendedMatches, resolveFptiTypeCopy } from "./fpti-copy";
import type { FptiAnalysisResult, FptiAxisCodes, FptiSourceData, FiveElementKey } from "./fpti-types";

const ELEMENT_LABEL: Record<FiveElementKey, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

function toPercentages(source: FptiSourceData): Record<FiveElementKey, number> {
  const total = Object.values(source.fiveElements).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  return {
    wood: Math.round((source.fiveElements.wood / total) * 1000) / 10,
    fire: Math.round((source.fiveElements.fire / total) * 1000) / 10,
    earth: Math.round((source.fiveElements.earth / total) * 1000) / 10,
    metal: Math.round((source.fiveElements.metal / total) * 1000) / 10,
    water: Math.round((source.fiveElements.water / total) * 1000) / 10,
  };
}

function topKeys<T extends Record<string, number>>(obj: T, count = 2) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => key);
}

function axisTemperament(source: FptiSourceData): FptiAxisCodes["temperament"] {
  const weighted = {
    wood: source.fiveElements.wood,
    fire: source.fiveElements.fire,
    earth: source.fiveElements.earth,
    metal: source.fiveElements.metal,
    water: source.fiveElements.water,
  };
  weighted[source.dayMasterElement] += 15;

  const best = topKeys(weighted, 1)[0] as FiveElementKey;
  if (best === "wood") return "W";
  if (best === "fire") return "F";
  if (best === "earth") return "E";
  if (best === "metal") return "M";
  return "A";
}

function axisBehavior(source: FptiSourceData) {
  const expression = source.tenGods.sikSin + source.tenGods.sangGwan;
  const officer = source.tenGods.jeongGwan + source.tenGods.pyeonGwan;
  const wealth = source.tenGods.jeongJae + source.tenGods.pyeonJae;
  const resource = source.tenGods.jeongIn + source.tenGods.pyeonIn;
  const peer = source.tenGods.biGyeon + source.tenGods.geopJae;

  const map = { C: expression, R: officer, W: wealth, S: resource, I: peer } as const;
  const behavior = topKeys(map as Record<string, number>, 1)[0] as FptiAxisCodes["behavior"];

  return {
    behavior,
    grouped: { expression, officer, wealth, resource, peer },
  };
}

function axisRelation(source: FptiSourceData, grouped: { expression: number; officer: number; wealth: number; resource: number; peer: number }) {
  const open = grouped.expression + grouped.wealth;
  const deep = grouped.resource + source.fiveElements.water;
  const loyal = grouped.officer + source.fiveElements.earth;
  const free = grouped.peer + source.tenGods.sangGwan;

  const relationScores = { O: open, D: deep, L: loyal, F: free };
  const relation = topKeys(relationScores, 1)[0] as FptiAxisCodes["relation"];

  const relationStyle = relation === "O"
    ? { key: "Open" as const, description: "새로운 관계를 빠르게 열고 공감 신호를 먼저 보냅니다." }
    : relation === "D"
      ? { key: "Deep" as const, description: "깊은 신뢰를 쌓은 뒤 오래 유지하는 몰입형입니다." }
      : relation === "L"
        ? { key: "Loyal" as const, description: "책임감 있는 약속과 일관성으로 신뢰를 만듭니다." }
        : { key: "Free" as const, description: "건강한 거리와 개별성을 유지할 때 가장 편안합니다." };

  return { relation, relationStyle };
}

function seasonBias(season: string) {
  const s = season.toLowerCase();
  if (s.includes("winter") || s.includes("겨울")) return { B: 0, G: 2, P: 0, H: 4, S: 2 };
  if (s.includes("spring") || s.includes("봄")) return { B: 1, G: 4, P: 1, H: 1, S: 1 };
  if (s.includes("summer") || s.includes("여름")) return { B: 2, G: 1, P: 2, H: 1, S: 3 };
  return { B: 2, G: 1, P: 3, H: 1, S: 1 };
}

function axisStrategy(source: FptiSourceData): FptiAxisCodes["strategy"] {
  const scores = { B: 18, G: 18, P: 18, H: 18, S: 18 };
  const useful = source.usefulGods || [];
  const favorable = source.favorableElements || [];
  const strength = Number(source.strengthScore || 55);
  const structure = String(source.structureType || "").toLowerCase();

  if (strength >= 66) {
    scores.P += 10;
    scores.S += 6;
  } else if (strength <= 44) {
    scores.H += 8;
    scores.B += 6;
  } else {
    scores.B += 8;
    scores.G += 4;
  }

  const addByElement = (element: string, weight: number) => {
    if (element === "wood") {
      scores.G += 2 * weight;
      scores.H += 1 * weight;
    } else if (element === "fire") {
      scores.S += 2 * weight;
      scores.P += 1 * weight;
    } else if (element === "earth") {
      scores.B += 2 * weight;
      scores.P += 1 * weight;
    } else if (element === "metal") {
      scores.P += 2 * weight;
      scores.B += 1 * weight;
    } else if (element === "water") {
      scores.H += 2 * weight;
      scores.G += 1 * weight;
    }
  };

  useful.forEach((item) => addByElement(item, 2));
  favorable.forEach((item) => addByElement(item, 1));

  const seasonal = seasonBias(source.season);
  scores.B += seasonal.B;
  scores.G += seasonal.G;
  scores.P += seasonal.P;
  scores.H += seasonal.H;
  scores.S += seasonal.S;

  if (structure.includes("관") || structure.includes("officer")) scores.P += 6;
  if (structure.includes("식") || structure.includes("상관") || structure.includes("creator")) scores.S += 6;
  if (structure.includes("인") || structure.includes("resource")) {
    scores.H += 4;
    scores.G += 3;
  }

  return topKeys(scores, 1)[0] as FptiAxisCodes["strategy"];
}

function reliability(source: FptiSourceData) {
  const hasHour = Boolean(source.pillars.hour);
  const usefulCount = (source.usefulGods || []).length;
  const penalty = !hasHour ? 12 : 0;
  const bonus = usefulCount >= 2 ? 4 : 0;
  const confidence = Math.max(62, Math.min(96, 84 - penalty + bonus));

  return {
    confidence,
    message: hasHour
      ? "태어난 시간이 반영되어 정밀 분석 정확도가 높습니다."
      : "태어난 시간을 모르는 상태라 시주 기반 미세 해석은 보수적으로 반영했습니다.",
    fallbackUsed: !hasHour,
  };
}

export function analyzeFpti(source: FptiSourceData): FptiAnalysisResult {
  const temperament = axisTemperament(source);
  const behaviorResult = axisBehavior(source);
  const relationResult = axisRelation(source, behaviorResult.grouped);
  const strategy = axisStrategy(source);

  const axis: FptiAxisCodes = {
    temperament,
    behavior: behaviorResult.behavior,
    relation: relationResult.relation,
    strategy,
  };

  const copy = resolveFptiTypeCopy(axis);
  const meanings = axisMeaning(axis);
  const matches = recommendedMatches(relationResult.relationStyle.key);
  const reliabilityInfo = reliability(source);
  const percentages = toPercentages(source);

  const strongElements = topKeys(source.fiveElements, 2).map((key) => ELEMENT_LABEL[key as FiveElementKey] || key);
  const strongTenGods = topKeys(
    {
      비견: source.tenGods.biGyeon,
      겁재: source.tenGods.geopJae,
      식신: source.tenGods.sikSin,
      상관: source.tenGods.sangGwan,
      정재: source.tenGods.jeongJae,
      편재: source.tenGods.pyeonJae,
      정관: source.tenGods.jeongGwan,
      편관: source.tenGods.pyeonGwan,
      정인: source.tenGods.jeongIn,
      편인: source.tenGods.pyeonIn,
    },
    3,
  );

  const strategyGuide =
    strategy === "B"
      ? "균형 전략: 한 번에 크게 움직이기보다 주간 리듬을 고정하세요."
      : strategy === "G"
        ? "성장 전략: 새로운 사람/기회를 매주 1개씩 확장하세요."
        : strategy === "P"
          ? "파워 전략: 우선순위 1개에 집중해 확실한 결과를 만드세요."
          : strategy === "H"
            ? "조화 전략: 갈등보다 합의 구조를 먼저 설계하세요."
            : "스피드 전략: 완벽보다 빠른 프로토타입을 선택하세요.";

  return {
    code: copy.code,
    typeName: copy.name,
    oneLiner: copy.oneLiner,
    summary: copy.summary,
    confidence: reliabilityInfo.confidence,
    reliabilityMessage: reliabilityInfo.message,
    fallbackUsed: reliabilityInfo.fallbackUsed,
    axis,
    axisMeanings: meanings,
    source,
    percentageElements: percentages,
    tenGodGroupScores: behaviorResult.grouped,
    strengths: [
      `${strongElements.join("/")} 에너지 활용이 좋습니다.`,
      `${strongTenGods[0] || "비견"} 기반의 고유 강점이 분명합니다.`,
      strategyGuide,
    ],
    weaknesses: [
      "강한 축으로 쏠릴 때 반대 성향과 충돌할 수 있습니다.",
      "피로 누적 시 관계/성과의 편차가 커질 수 있습니다.",
      "월별 운세 변화에 따라 전략을 재보정할 필요가 있습니다.",
    ],
    relationStyle: relationResult.relationStyle,
    growthTips: [
      "강점 축 1개 + 보완 축 1개를 함께 쓰는 루틴을 만드세요.",
      "한 달에 한 번 결과를 다시 측정해 전략 코드를 비교하세요.",
      "시간 미입력 상태면 중요한 결정 전 시주 포함 재분석을 권장합니다.",
    ],
    careerTips: [
      "업무에서는 타입의 행동축을 기본 작업 방식으로 쓰세요.",
      "협업 상대가 다른 관계축이라면 의사소통 템포를 맞추는 것이 우선입니다.",
      "성과 목표를 주간 단위 숫자로 바꾸면 집중력이 올라갑니다.",
    ],
    loveTips: [
      "관계축에 맞는 감정표현 방식을 선택하면 마찰이 줄어듭니다.",
      "용신/희신 오행 활동(색, 장소, 루틴)을 데이트에 반영해 보세요.",
      "강한 십성 1개가 과할 때는 반대 성향 질문을 추가하세요.",
    ],
    goodMatch: matches.goodMatch,
    cautionMatch: matches.cautionMatch,
    evidence: {
      dayMaster: `${source.dayMaster} (${ELEMENT_LABEL[source.dayMasterElement]})`,
      monthBranch: source.monthBranch,
      strongElements,
      strongTenGods,
      recommendedDirection: strategyGuide,
    },
  };
}
