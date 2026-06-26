import { axisMeaning, recommendedMatches, resolveFptiTypeCopy } from "./fpti-copy";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
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

const FPTI_ENGINE_TEXT_TRANSLATIONS = {
  ko: {
    relationStyle: {
      Open: "감정 교류를 빠르게 열고 분위기를 먼저 따뜻하게 만듭니다.",
      Deep: "서두르지 않고 깊은 신뢰를 쌓아 오래 가는 관계를 지향합니다.",
      Loyal: "약속과 책임을 중심으로 관계를 안정적으로 지켜냅니다.",
      Free: "건강한 거리와 자율성을 유지할 때 관계 만족도가 높아집니다.",
    },
  },
  en: {
    relationStyle: {
      Open: "You open emotional exchange quickly and warm the atmosphere first.",
      Deep: "You prefer relationships that grow slowly through deep trust.",
      Loyal: "You keep relationships steady through promises, responsibility, and care.",
      Free: "Relationship satisfaction rises when healthy distance and autonomy are respected.",
    },
  },
  ja: {
    relationStyle: {
      Open: "感情の交流を早く開き、まず空気を温かく整えるタイプです。",
      Deep: "急がず深い信頼を積み重ね、長く続く関係を大切にします。",
      Loyal: "約束と責任を軸に、関係を安定して守る傾向があります。",
      Free: "健やかな距離感と自律性を保つほど、関係の満足度が高まります。",
    },
  },
} as const;

function getFptiEngineCopy(locale: LoadingLocale = getCurrentLoadingLocale()) {
  return FPTI_ENGINE_TEXT_TRANSLATIONS[locale as "ko" | "en" | "ja"] || FPTI_ENGINE_TEXT_TRANSLATIONS.ko;
}

const YANG_STEMS = new Set(["갑", "병", "무", "경", "임", "甲", "丙", "戊", "庚", "壬"]);
const YIN_STEMS = new Set(["을", "정", "기", "신", "계", "乙", "丁", "己", "辛", "癸"]);

type TenGodKey = "비견" | "겁재" | "식신" | "상관" | "정재" | "편재" | "정관" | "편관" | "정인" | "편인";

const TEN_GOD_MEANINGS: Record<TenGodKey, { personality: string; career: string; caution: string }> = {
  비견: { personality: "자기 기준과 주도성이 강하고, 내 결정에 대한 신뢰가 분명합니다.", career: "독립 실행, 동료와의 대등한 협업, 자기 주도 프로젝트에 강합니다.", caution: "너무 자기 방식만 고집하면 유연성이 떨어질 수 있습니다." },
  겁재: { personality: "경쟁심과 반응 속도가 살아 있어 상황 대응이 빠릅니다.", career: "빠른 현장 대응, 실전 협상, 위기 돌파형 업무에 강합니다.", caution: "경쟁 의식이 과해지면 소모전으로 번질 수 있습니다." },
  식신: { personality: "꾸준함과 생활 감각이 좋아 감정 기복을 완만하게 만듭니다.", career: "콘텐츠 생산, 서비스 품질, 안정적 결과물 축적에 강합니다.", caution: "편안함이 늘어나면 속도가 느려질 수 있습니다." },
  상관: { personality: "표현력과 문제 제기 능력이 강해 틀린 것을 잘 못 넘깁니다.", career: "기획, 발표, 개선 제안, 혁신형 직무에서 존재감이 큽니다.", caution: "말이 앞서면 관계 마찰이 생기기 쉽습니다." },
  정재: { personality: "현실 감각과 관리 본능이 강해 안전한 선택을 선호합니다.", career: "예산 관리, 정산, 운영, 안정 수익 구조 설계에 강합니다.", caution: "너무 보수적으로만 가면 기회를 늦출 수 있습니다." },
  편재: { personality: "기회 포착과 유연한 자원 활용이 빠릅니다.", career: "영업, 프로젝트 확장, 부업, 수익 다각화에서 강점이 큽니다.", caution: "너무 넓게 벌리면 집중이 흐트러질 수 있습니다." },
  정관: { personality: "책임감과 기준 준수가 분명해 신뢰를 주는 타입입니다.", career: "조직 운영, 관리직, 규정 기반 직무, 품질 통제에 강합니다.", caution: "기준이 너무 엄격해지면 스스로도 피곤해질 수 있습니다." },
  편관: { personality: "압박을 받는 상황에서 오히려 추진력이 살아납니다.", career: "리스크 대응, 위기 관리, 구조 개편, 결단이 필요한 자리에서 강합니다.", caution: "긴장 상태가 오래가면 소진이 빠릅니다." },
  정인: { personality: "내면 정리와 학습, 회복력이 강해 생각의 깊이가 있습니다.", career: "연구, 기획 보조, 분석, 자격 기반 전문성 축적에 강합니다.", caution: "혼자만 정리하다 보면 실행이 늦어질 수 있습니다." },
  편인: { personality: "감각적 통찰과 비정형 이해가 빠릅니다.", career: "창의 기획, 특수 분야 탐구, 틈새 전략, 대안 설계에 강합니다.", caution: "너무 안으로만 파고들면 외부 실행이 늦어질 수 있습니다." },
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

  if (!hasCore || (fiveTotal <= 0 && tenTotal <= 0)) return "fallback";

  const hasUseful = normalizeList(source.usefulGods).length > 0;
  const hasStrength = Number.isFinite(Number(source.strengthScore || 0)) && Number(source.strengthScore || 0) > 0;
  const hasHour = Boolean(source.pillars.hour);

  if (!hasUseful || !hasStrength || !hasHour) return "partial";
  return "full";
}

function getDayMasterPolarity(dayMaster: string) {
  const stem = String(dayMaster || "").trim().charAt(0);
  if (YANG_STEMS.has(stem)) return "yang" as const;
  if (YIN_STEMS.has(stem)) return "yin" as const;
  return "neutral" as const;
}

function normalizePair(leftRaw: number, rightRaw: number) {
  const left = Math.max(0.01, Number(leftRaw || 0));
  const right = Math.max(0.01, Number(rightRaw || 0));
  const total = left + right;
  const leftPct = Math.round((left / total) * 1000) / 10;
  const rightPct = Math.round((right / total) * 1000) / 10;
  return { leftPct, rightPct };
}

function computeAxis(
  source: FptiSourceData,
  grouped: { expression: number; officer: number; wealth: number; resource: number; peer: number },
  percentages: Record<FiveElementKey, number>,
): { axis: FptiAxisCodes; axisScores: FptiAnalysisResult["axisScores"] } {
  const polarity = getDayMasterPolarity(source.dayMaster);

  const aRaw = grouped.peer * 1.1 + grouped.expression * 1.15 + percentages.wood * 0.32 + percentages.fire * 0.28 + (polarity === "yang" ? 8 : 0);
  const mRaw = grouped.resource * 1.15 + grouped.officer * 1.05 + percentages.water * 0.34 + percentages.metal * 0.28 + (polarity === "yin" ? 8 : 0);

  const hRaw = grouped.expression * 0.95 + grouped.resource * 1.05 + percentages.water * 0.35 + percentages.wood * 0.25 + percentages.fire * 0.2;
  const lRaw = grouped.officer * 1.02 + grouped.wealth * 1.0 + percentages.metal * 0.34 + percentages.earth * 0.36;

  const fRaw = grouped.expression * 1.1 + grouped.peer * 1.0 + percentages.wood * 0.3 + percentages.fire * 0.22;
  const bRaw = grouped.officer * 1.08 + grouped.wealth * 1.0 + percentages.earth * 0.36 + percentages.metal * 0.24;

  const rRaw = grouped.wealth * 1.05 + grouped.officer * 0.95 + percentages.earth * 0.3 + percentages.metal * 0.3;
  const vRaw = grouped.resource * 1.0 + grouped.expression * 0.95 + percentages.water * 0.31 + percentages.fire * 0.29;

  const energy = normalizePair(aRaw, mRaw);
  const judgment = normalizePair(hRaw, lRaw);
  const execution = normalizePair(fRaw, bRaw);
  const vision = normalizePair(rRaw, vRaw);

  return {
    axis: {
      energy: energy.leftPct >= energy.rightPct ? "A" : "M",
      judgment: judgment.leftPct >= judgment.rightPct ? "H" : "L",
      execution: execution.leftPct >= execution.rightPct ? "F" : "B",
      vision: vision.leftPct >= vision.rightPct ? "R" : "V",
    },
    axisScores: {
      A: energy.leftPct,
      M: energy.rightPct,
      H: judgment.leftPct,
      L: judgment.rightPct,
      F: execution.leftPct,
      B: execution.rightPct,
      R: vision.leftPct,
      V: vision.rightPct,
    },
  };
}

function reliability(source: FptiSourceData, quality: FptiResultQuality) {
  const hasHour = Boolean(source.pillars.hour);
  const base = quality === "full" ? 90 : quality === "partial" ? 81 : 72;
  const hourPenalty = hasHour ? 0 : 7;
  const usefulBonus = normalizeList(source.usefulGods).length >= 2 ? 3 : 0;
  const confidence = Math.max(58, Math.min(97, base - hourPenalty + usefulBonus));

  const message =
    quality === "full"
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

function tenGodNarrative(source: FptiSourceData, strongTenGods: string[]) {
  const rank = strongTenGods.slice(0, 3) as TenGodKey[];
  const primary = rank[0] || "정인";
  const secondary = rank[1] || primary;
  const tertiary = rank[2] || secondary;

  const primaryMeaning = TEN_GOD_MEANINGS[primary] || TEN_GOD_MEANINGS.정인;
  const secondaryMeaning = TEN_GOD_MEANINGS[secondary] || TEN_GOD_MEANINGS.정관;
  const tertiaryMeaning = TEN_GOD_MEANINGS[tertiary] || TEN_GOD_MEANINGS.식신;

  const personality = `${primary}·${secondary} 축이 성격의 중심입니다. ${primaryMeaning.personality} ${secondaryMeaning.personality}`;
  const career = `${tertiary}까지 함께 보면 진로 성향이 더 선명합니다. ${primaryMeaning.career} ${secondaryMeaning.career} ${tertiaryMeaning.career}`;
  const caution = `${primaryMeaning.caution} ${secondaryMeaning.caution} ${tertiaryMeaning.caution}`;

  return { personality, career, caution, primary, secondary, tertiary };
}

function resolveRelationStyle(axis: FptiAxisCodes) {
  const copy = getFptiEngineCopy();
  if (axis.judgment === "H" && axis.execution === "F") {
    return { key: "Open" as const, description: copy.relationStyle.Open };
  }
  if (axis.energy === "M" && axis.judgment === "H" && axis.vision === "V") {
    return { key: "Deep" as const, description: copy.relationStyle.Deep };
  }
  if (axis.execution === "B" && axis.judgment === "L") {
    return { key: "Loyal" as const, description: copy.relationStyle.Loyal };
  }
  return { key: "Free" as const, description: copy.relationStyle.Free };
}

function buildStrategyGuide(axis: FptiAxisCodes) {
  if (axis.execution === "B" && axis.vision === "R") {
    return "오늘의 성장 조언: 핵심 목표 1개를 정하고 체크리스트 3개만 완료해 실전 성과를 쌓으세요.";
  }
  if (axis.execution === "F" && axis.vision === "V") {
    return "오늘의 성장 조언: 떠오른 아이디어를 15분 안에 메모하고, 1개를 바로 작은 실험으로 연결하세요.";
  }
  if (axis.judgment === "H") {
    return "오늘의 성장 조언: 감정 반응을 먼저 기록한 뒤 행동을 결정하면 관계와 성과를 함께 지킬 수 있습니다.";
  }
  return "오늘의 성장 조언: 기준을 문장으로 먼저 적고 실행하면 흔들림 없이 속도를 낼 수 있습니다.";
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
  const hook = `${params.typeName} 타입은 ${params.oneLiner} 흐름이 분명합니다.`;
  const basis = `월지 ${params.monthBranch}, 강한 오행 ${params.strongElements.join("/")}, 우세 십성 ${params.strongTenGods.join("/")} 조합을 기반으로 계산되었습니다.`;
  const balance = `강점은 ${params.strongElements[0]} 기운의 지속력이며, 보완 포인트는 ${params.weakElements.join("/")} 기운을 생활 루틴에서 채우는 것입니다. 관계에서는 ${params.relationDescription}`;
  const strategy = `${params.strategyGuide} 루틴으로 반복하면 강점의 밀도가 안정적으로 올라갑니다.`;
  return { hook, basis, balance, strategy };
}

export function analyzeFpti(source: FptiSourceData): FptiAnalysisResult {
  const quality = detectQuality(source);
  const percentages = toPercentages(source);
  const grouped = getTenGodTotals(source);

  const axisResult = computeAxis(source, grouped, percentages);
  const axis = axisResult.axis;
  const copy = resolveFptiTypeCopy(axis);
  const meanings = axisMeaning(axis);
  const matches = recommendedMatches(copy.code);
  const relationStyle = resolveRelationStyle(axis);
  const reliabilityInfo = reliability(source, quality);

  const strongElements = topKeys(percentages, 2, [source.dayMasterElement, "water", "wood", "fire", "earth", "metal"])
    .map((key) => ELEMENT_LABEL[key as FiveElementKey] || key);
  const weakElements = bottomKeys(percentages, 2).map((key) => ELEMENT_LABEL[key as FiveElementKey] || key);
  const strongTenGods = tenGodRanking(source);
  const strategyGuide = buildStrategyGuide(axis);
  const tenGodView = tenGodNarrative(source, strongTenGods);

  const narrative = paragraphNarrative({
    typeName: copy.name,
    oneLiner: copy.oneLiner,
    strongElements,
    weakElements,
    strongTenGods,
    monthBranch: source.monthBranch,
    strategyGuide,
    relationDescription: relationStyle.description,
  });

  const elementSummary = `강한 오행은 ${strongElements.join("/")}이며, 약한 오행은 ${weakElements.join("/")}입니다. 십성으로 보면 ${tenGodView.primary}/${tenGodView.secondary}/${tenGodView.tertiary} 흐름이 성격과 선택 기준을 잡습니다.`;
  const behaviorSummary =
    axis.energy === "A"
      ? `에너지를 밖으로 발산할수록 동력이 살아나는 유형입니다. 특히 ${tenGodView.primary}와 ${tenGodView.secondary}가 강하면 자기 기준과 반응 속도가 더 분명해집니다.`
      : `내면에서 에너지를 축적할수록 집중력과 완성도가 높아지는 유형입니다. 특히 ${tenGodView.primary}와 ${tenGodView.secondary}가 강하면 정리·학습·회복의 질이 올라갑니다.`;
  const relationshipSummary = `관계 흐름은 ${relationStyle.key} 성향이 우세합니다. ${relationStyle.description} 십성 기준으로는 ${tenGodView.primary}/${tenGodView.secondary}의 작동 방식이 거리감과 신뢰 형성을 좌우합니다.`;
  const strategySummary =
    axis.execution === "F"
      ? `실행은 유연 탐색형이 적합합니다. 다만 ${tenGodView.primary}와 ${tenGodView.secondary}가 강한 경우, 즉흥성보다 기준을 한 줄로 고정하는 쪽이 더 잘 맞습니다.`
      : `실행은 질서 구축형이 적합합니다. ${tenGodView.primary}와 ${tenGodView.secondary}의 힘을 살려 일정, 규칙, 책임을 먼저 묶으면 성과가 안정됩니다.`;

  const loveSummary =
    axis.judgment === "H"
      ? `연애에서는 감정의 안전감과 공감의 빈도가 관계 만족도를 크게 좌우합니다. 특히 ${tenGodView.primary}가 정인/식신 계열이면 따뜻한 돌봄이, 상관/편인 계열이면 감각적 교류가 중요해집니다.`
      : `연애에서는 명확한 기준과 약속이 신뢰를 빠르게 안정시킵니다. 특히 정관/편관 계열이 강하면 관계의 룰과 책임 분담이 만족도를 좌우합니다.`;

  const careerMoneySummary =
    axis.vision === "R"
      ? `일/재능과 돈 흐름은 현실 지표 관리와 우선순위 실행에서 상승폭이 큽니다. 정재/편재가 강하면 돈은 "얼마나 벌까"보다 "어떤 구조로 굴릴까"에서 차이가 납니다.`
      : `일/재능과 돈 흐름은 의미 중심 프로젝트를 선택할 때 장기 성장 탄력이 커집니다. 정인/편인이 강하면 전문성 축적과 기획력이 진로의 핵심 자산이 됩니다.`;

  const calculationNotes = [
    `1축 에너지(A/M): 비겁+식상 vs 인성+관성, 일간(${source.dayMaster}) 음양 보정`,
    "2축 판단(H/L): 감응 공감 점수 vs 구조 논리 점수 비교",
    "3축 실행(F/B): 유연 탐색 점수 vs 질서 구축 점수 비교",
    "4축 전망(R/V): 현실 성과 점수 vs 비전 직관 점수 비교",
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
    axisScores: axisResult.axisScores,
    source,
    percentageElements: percentages,
    tenGodGroupScores: grouped,
    strengths: [
      `${strongElements.join("/")} 기운이 살아 있어 핵심 상황에서 몰입과 추진력이 올라갑니다.`,
      `${tenGodView.primary}와 ${tenGodView.secondary}가 강해 성격의 핵심 방향이 분명합니다.`,
      `${tenGodView.primary}는 ${TEN_GOD_MEANINGS[tenGodView.primary as TenGodKey]?.personality || "문제 해결 중심"} ${TEN_GOD_MEANINGS[tenGodView.primary as TenGodKey]?.career || "진로 판단에도 일관성이 생깁니다."}`,
    ],
    weaknesses: [
      `${weakElements.join("/")} 기운이 약해질 때 판단이 한쪽으로 쏠릴 수 있습니다.`,
      `${tenGodView.caution}`,
      "과열 시점에는 관계 템포와 실행 템포가 어긋날 수 있습니다. 장기 목표는 월 단위 점검 루틴으로 재보정하는 것이 안전합니다.",
    ],
    relationStyle,
    essenceNarrative: narrative,
    elementSummary,
    behaviorSummary,
    relationshipSummary,
    strategySummary,
    loveSummary,
    careerMoneySummary,
    growthTips: [
      `${strategyGuide} 특히 ${tenGodView.primary}/${tenGodView.secondary}가 강한 날은 기준 문장을 먼저 써두면 흔들림이 줄어듭니다.`,
      `강한 오행 1개와 약한 오행 1개를 같이 보완하는 주간 루틴을 만드세요. 동시에 ${tenGodView.primary}의 장점은 살리고, ${tenGodView.secondary}와 ${tenGodView.tertiary}가 과열될 때는 속도를 줄이세요.`,
      `감정/에너지 기복이 큰 날은 중요한 결정을 하루 미루고 재확인하세요. ${tenGodView.secondary}가 강한 사람일수록 기준 없는 즉흥 판단을 경계해야 합니다.`,
    ],
    careerTips: [
      `실행축에 맞는 업무 방식(탐색형/구축형)을 명확히 분리하세요. ${tenGodView.primary}가 정인/정관 계열이면 정리·관리·검증형, 편재/편관 계열이면 확장·돌파·조율형이 더 잘 맞습니다.`,
      `판단축이 다른 동료와는 의사결정 기준을 먼저 합의하세요. ${tenGodView.secondary}가 상관/편인이면 제안과 질문이 많아질 수 있으니, 회의 전 핵심 질문을 3개로 줄이세요.`,
      `성과 목표를 주간 숫자로 설정하고 월간 단위로만 전략을 조정하세요. ${tenGodView.tertiary}가 식신/정재라면 반복성과 안정 수익을, 비견/겁재라면 독립 프로젝트와 실행 속도를 함께 보세요.`,
    ],
    loveTips: [
      "관계 속도와 표현 빈도를 합의하면 마찰이 크게 줄어듭니다.",
      `희신 오행 활동(색, 공간, 시간대)을 데이트 루틴에 넣어 보세요. ${tenGodView.primary}가 정인/식신이면 편안한 시간, 정관/편관이면 명확한 약속이 특히 중요합니다.`,
      `강한 십성이 과하게 작동하는 시기에는 반대 성향 질문을 의식적으로 추가하세요. ${tenGodView.secondary}가 상관/편재라면 "지금 이 선택의 책임은 누구에게 있는가"를 먼저 물어보는 것이 좋습니다.`,
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
