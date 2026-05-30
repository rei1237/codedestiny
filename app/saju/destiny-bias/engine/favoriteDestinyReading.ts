import { parseBirthDate } from "./birthEnergy";

type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";
type YinYang = "yin" | "yang";

type BirthStatus = "complete" | "dateOnly" | "unknownTime";

export type FavoriteChemistryType =
  | "설렘폭발형"
  | "잔잔응원형"
  | "운명착붙형"
  | "티격태격중독형"
  | "천천히스며드는형"
  | "덕심폭주형"
  | "힐링보호형"
  | "성장파트너형"
  | "거리감있는신비형"
  | "현실안정형";

export type FavoriteDestinyScore = {
  total: number;
  emotion: number;
  excitement: number;
  stability: number;
  fanBias: number;
  longTerm: number;
  communication: number;
};

export type FavoriteDestinyImageCard = {
  favoriteName: string;
  chemistryScore: number;
  chemistryType: FavoriteChemistryType;
  shortMood: string;
  keywords: string[];
  oneLineLink: string;
  cardId: string;
  createdAt: string;
};

export type FavoriteDestinyTab =
  | "summary"
  | "chemistry"
  | "emotion"
  | "fanBias"
  | "stability"
  | "caution"
  | "advice";

export type FavoriteDestinyTabResult = {
  id: FavoriteDestinyTab;
  label: string;
  shortLabel: string;
  title: string;
  keywords: string[];
  sections: {
    title: string;
    usedSignals: string[];
    text: string;
    action?: string;
  }[];
};

export type FavoriteDestinyReading = {
  reportType: "FAVORITE_DESTINY";
  mode: "saju-local";
  generatedAt: string;
  user: {
    name?: string;
    birthDataStatus: BirthStatus;
  };
  favorite: {
    name: string;
    birthDataStatus: BirthStatus;
  };
  scores: FavoriteDestinyScore;
  chemistryType: FavoriteChemistryType;
  imageCard: FavoriteDestinyImageCard;
  sajuSignals: {
    dayMasterRelation?: string;
    dayBranchRelation?: string;
    fiveElementBalance?: string;
    tenGodRelation?: string;
    harmonySignals: string[];
    conflictSignals: string[];
    charmSignals: string[];
    longTermSignals: string[];
  };
  tabs: FavoriteDestinyTabResult[];
  summary: string;
  meta: {
    engineVersion: string;
    apiUsed: false;
    calculationBased: true;
  };
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};

type BasicChart = {
  dayStem: string;
  dayBranch: string;
  yearStem: string;
  yearBranch: string;
  dayElement: ElementKey;
  yinYang: YinYang;
  elementScores: Record<ElementKey, number>;
};

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

const STEM_META: Record<string, { ko: string; element: ElementKey; yinYang: YinYang }> = {
  甲: { ko: "갑", element: "wood", yinYang: "yang" },
  乙: { ko: "을", element: "wood", yinYang: "yin" },
  丙: { ko: "병", element: "fire", yinYang: "yang" },
  丁: { ko: "정", element: "fire", yinYang: "yin" },
  戊: { ko: "무", element: "earth", yinYang: "yang" },
  己: { ko: "기", element: "earth", yinYang: "yin" },
  庚: { ko: "경", element: "metal", yinYang: "yang" },
  辛: { ko: "신", element: "metal", yinYang: "yin" },
  壬: { ko: "임", element: "water", yinYang: "yang" },
  癸: { ko: "계", element: "water", yinYang: "yin" },
};

const BRANCH_META: Record<string, { ko: string; element: ElementKey }> = {
  子: { ko: "자", element: "water" },
  丑: { ko: "축", element: "earth" },
  寅: { ko: "인", element: "wood" },
  卯: { ko: "묘", element: "wood" },
  辰: { ko: "진", element: "earth" },
  巳: { ko: "사", element: "fire" },
  午: { ko: "오", element: "fire" },
  未: { ko: "미", element: "earth" },
  申: { ko: "신", element: "metal" },
  酉: { ko: "유", element: "metal" },
  戌: { ko: "술", element: "earth" },
  亥: { ko: "해", element: "water" },
};

const ELEMENT_LABEL: Record<ElementKey, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const GENERATE_TO: Record<ElementKey, ElementKey> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const CONTROL_TO: Record<ElementKey, ElementKey> = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
};

const SIX_HARMONY = new Set(["자축", "인해", "묘술", "진유", "사신", "오미"]);
const BRANCH_CLASH = new Set(["자오", "축미", "인신", "묘유", "진술", "사해"]);
const BRANCH_HARM = new Set(["자미", "축오", "인사", "묘진", "신해", "유술"]);
const BRANCH_BREAK = new Set(["자유", "묘오", "진축", "미술", "인해", "사신"]);

const CHARM_BRANCH = new Set(["자", "오", "묘", "유"]);
const MYSTIC_BRANCH = new Set(["진", "술", "축", "미"]);
const LONG_TERM_BRANCH = new Set(["축", "진", "미", "술"]);

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function mod(v: number, by: number) {
  return ((v % by) + by) % by;
}

function toJdn(year: number, month: number, day: number) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;
}

function branchPair(a: string, b: string) {
  return `${a}${b}`;
}

function relationBetween(from: ElementKey, to: ElementKey) {
  if (from === to) return "same";
  if (GENERATE_TO[from] === to) return "generates";
  if (GENERATE_TO[to] === from) return "generated_by";
  if (CONTROL_TO[from] === to) return "controls";
  if (CONTROL_TO[to] === from) return "controlled_by";
  return "neutral";
}

function relationLabel(from: ElementKey, to: ElementKey) {
  const r = relationBetween(from, to);
  if (r === "same") return "같은 결 (비슷한 감정 템포)";
  if (r === "generates") return "상생 (서로 힘을 보태는 결)";
  if (r === "generated_by") return "보호형 상생 (상대가 내 리듬을 받쳐줌)";
  if (r === "controls") return "주도형 (내가 흐름을 이끄는 결)";
  if (r === "controlled_by") return "훈련형 (상대에게 맞추며 성장하는 결)";
  return "중립형";
}

function tenGodLabel(dayStem: string, targetStem: string) {
  const day = STEM_META[dayStem];
  const target = STEM_META[targetStem];
  if (!day || !target) return "비견";
  const samePolarity = day.yinYang === target.yinYang;
  const rel = relationBetween(day.element, target.element);
  if (rel === "same") return samePolarity ? "비견" : "겁재";
  if (rel === "generates") return samePolarity ? "식신" : "상관";
  if (rel === "controls") return samePolarity ? "편재" : "정재";
  if (rel === "controlled_by") return samePolarity ? "편관" : "정관";
  if (rel === "generated_by") return samePolarity ? "편인" : "정인";
  return "비견";
}

function parseBirthStatus(timeInput?: string): BirthStatus {
  const raw = String(timeInput || "").replace(/\D/g, "");
  if (!raw) return "unknownTime";
  if (raw.length >= 3) return "complete";
  return "dateOnly";
}

function buildChart(birthDate: string): BasicChart {
  const p = parseBirthDate(birthDate);
  const jdn = toJdn(p.year, p.month, p.day);
  const dayStem = STEMS[mod(jdn + 9, 10)];
  const dayBranch = BRANCHES[mod(jdn + 1, 12)];
  const y = p.month < 2 || (p.month === 2 && p.day < 4) ? p.year - 1 : p.year;
  const yearStem = STEMS[mod(y - 4, 10)];
  const yearBranch = BRANCHES[mod(y - 4, 12)];

  const dayElement = STEM_META[dayStem].element;
  const yearElement = STEM_META[yearStem].element;
  const dayBranchElement = BRANCH_META[dayBranch].element;
  const yearBranchElement = BRANCH_META[yearBranch].element;
  const elementScores: Record<ElementKey, number> = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };
  elementScores[dayElement] += 1.4;
  elementScores[yearElement] += 1.0;
  elementScores[dayBranchElement] += 0.9;
  elementScores[yearBranchElement] += 0.8;

  return {
    dayStem,
    dayBranch,
    yearStem,
    yearBranch,
    dayElement,
    yinYang: STEM_META[dayStem].yinYang,
    elementScores,
  };
}

export function sanitizeFavoriteDestinyText(text: string): string {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/문라이트\s*오라/gi, "잔잔한 공명")
    .replace(/청량\s*무드/gi, "맑은 템포")
    .replace(/플리\s*3곡\s*루프/gi, "짧은 루틴")
    .trim();
}

export function clampFavoriteCardText(card: FavoriteDestinyImageCard): FavoriteDestinyImageCard {
  const oneLine = sanitizeFavoriteDestinyText(card.oneLineLink).slice(0, 45);
  return {
    ...card,
    favoriteName: sanitizeFavoriteDestinyText(card.favoriteName).slice(0, 24),
    shortMood: sanitizeFavoriteDestinyText(card.shortMood).slice(0, 36),
    keywords: (Array.isArray(card.keywords) ? card.keywords : []).filter(Boolean).slice(0, 3).map((k) => sanitizeFavoriteDestinyText(String(k)).slice(0, 16)),
    oneLineLink: oneLine,
  };
}

function buildChemistryType(scores: FavoriteDestinyScore, signals: FavoriteDestinyReading["sajuSignals"]): FavoriteChemistryType {
  if (scores.excitement >= 78 && signals.conflictSignals.length > 0) return "설렘폭발형";
  if (scores.stability >= 78 && scores.longTerm >= 76) return "현실안정형";
  if (scores.fanBias >= 82 && signals.charmSignals.length > 1) return "덕심폭주형";
  if (signals.harmonySignals.length >= 2 && scores.emotion >= 72) return "운명착붙형";
  if (signals.conflictSignals.length >= 2 && scores.excitement >= 65) return "티격태격중독형";
  if (signals.longTermSignals.length >= 2) return "천천히스며드는형";
  if (scores.stability >= 70 && scores.communication >= 70) return "힐링보호형";
  if (scores.communication >= 74 && scores.emotion >= 66) return "성장파트너형";
  if (signals.charmSignals.some((s) => s.includes("화개") || s.includes("귀문"))) return "거리감있는신비형";
  return "잔잔응원형";
}

function shortTypeMood(type: FavoriteChemistryType) {
  if (type === "설렘폭발형") return "도파민 바로 점화되는 마라맛 케미";
  if (type === "운명착붙형") return "입덕 부정기 끝내는 순식간 착붙 케미";
  if (type === "티격태격중독형") return "티키타카 싸움도 도파민 되는 케미";
  if (type === "덕심폭주형") return "알고리즘보다 심장이 먼저 누르는 케미";
  if (type === "현실안정형") return "현생 멘탈 지켜주는 코어팬 케미";
  if (type === "거리감있는신비형") return "멀수록 더 궁금한 신비 텐션 케미";
  if (type === "성장파트너형") return "덕질이 곧 성장 서사가 되는 케미";
  if (type === "힐링보호형") return "지친 날도 멘탈 회복되는 힐링 케미";
  if (type === "천천히스며드는형") return "볼수록 깊게 스며드는 뚝배기 케미";
  return "잔잔한데 강하게 남는 코어팬 케미";
}

function elementPairMeme(userEl: ElementKey, favoriteEl: ElementKey) {
  const pair = `${userEl}-${favoriteEl}`;
  if (pair === "metal-earth" || pair === "earth-metal") return "흔들림 없는 단단함 + 스며드는 국밥 매력";
  if (pair === "water-wood" || pair === "wood-water") return "청량함 + 성장 서사로 개안되는 비타민 합";
  if (pair.includes("fire")) return "도파민 폭발하는 마라맛 텐션 합";
  if (pair.includes("wood")) return "천천히 스며들어 코어팬 만드는 잔향 합";
  if (pair.includes("water")) return "감정선 정리해 주는 힐링 파도 합";
  return "묵직하게 오래 가는 코어팬 합";
}

function buildOneLineLink(params: {
  userElement: ElementKey;
  favoriteElement: ElementKey;
  relation: string;
  strongestAxisLabel: string;
  strongestAxisScore: number;
}) {
  const elementMeme = elementPairMeme(params.userElement, params.favoriteElement);
  if (params.relation.includes("보호형") || params.relation.includes("상생")) {
    return `현생 멱살 잡는 ${elementMeme} 케미`;
  }
  if (params.strongestAxisLabel === "설렘") {
    return `입덕 부정기 박살내는 ${elementMeme} 텐션`;
  }
  if (params.strongestAxisScore >= 78) {
    return `코어팬 확정! ${elementMeme} 시너지`; 
  }
  return `볼수록 스며드는 ${elementMeme} 궁합`;
}

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function countCoreSajuSignals(reading: FavoriteDestinyReading) {
  const baseSignals = [
    reading.sajuSignals.dayMasterRelation,
    reading.sajuSignals.dayBranchRelation,
    reading.sajuSignals.fiveElementBalance,
    reading.sajuSignals.tenGodRelation,
  ].filter((value) => Boolean(String(value || "").trim()));

  const dynamicSignals = [
    ...(Array.isArray(reading.sajuSignals.harmonySignals) ? reading.sajuSignals.harmonySignals : []),
    ...(Array.isArray(reading.sajuSignals.conflictSignals) ? reading.sajuSignals.conflictSignals : []),
    ...(Array.isArray(reading.sajuSignals.charmSignals) ? reading.sajuSignals.charmSignals : []),
    ...(Array.isArray(reading.sajuSignals.longTermSignals) ? reading.sajuSignals.longTermSignals : []),
  ].filter((value) => Boolean(String(value || "").trim()));

  const scoreSignals = Object.entries(reading.scores || {})
    .filter(([key, value]) => key !== "total" && Number.isFinite(value))
    .map(([key]) => `score:${key}`);

  return unique([...baseSignals, ...dynamicSignals, ...scoreSignals]).length;
}

export function buildFavoriteDestinyFromSaju(
  userChartInput: { name: string; birthDate: string; birthTimeInput?: string },
  favoriteChartInput: { name: string; birthDate: string; birthTimeInput?: string },
  options?: { generatedAt?: string; cardId?: string }
): FavoriteDestinyReading {
  const userChart = buildChart(userChartInput.birthDate);
  const favoriteChart = buildChart(favoriteChartInput.birthDate);

  const dayMasterRelation = relationLabel(userChart.dayElement, favoriteChart.dayElement);
  const dayBranchPair = branchPair(userChart.dayBranch, favoriteChart.dayBranch);
  const reverseDayBranchPair = branchPair(favoriteChart.dayBranch, userChart.dayBranch);

  const harmonySignals: string[] = [];
  const conflictSignals: string[] = [];
  const charmSignals: string[] = [];
  const longTermSignals: string[] = [];

  if (SIX_HARMONY.has(dayBranchPair) || SIX_HARMONY.has(reverseDayBranchPair)) {
    harmonySignals.push("일지 육합 신호 (같이 있을 때 편안함)");
  }
  if (BRANCH_CLASH.has(dayBranchPair) || BRANCH_CLASH.has(reverseDayBranchPair)) {
    conflictSignals.push("일지 충 신호 (설렘과 긴장 동시 상승)");
  }
  if (BRANCH_HARM.has(dayBranchPair) || BRANCH_HARM.has(reverseDayBranchPair)) {
    conflictSignals.push("일지 해 신호 (오해가 쌓이기 쉬움)");
  }
  if (BRANCH_BREAK.has(dayBranchPair) || BRANCH_BREAK.has(reverseDayBranchPair)) {
    conflictSignals.push("일지 파 신호 (기대치 차이 주의)");
  }

  if (CHARM_BRANCH.has(favoriteChart.dayBranch)) {
    charmSignals.push("도화 성향 (자꾸 눈길이 가는 매력)");
  }
  if (MYSTIC_BRANCH.has(favoriteChart.dayBranch)) {
    charmSignals.push("화개 성향 (가까운 듯 멀어 신비한 매력)");
  }
  if (MYSTIC_BRANCH.has(userChart.dayBranch) && MYSTIC_BRANCH.has(favoriteChart.dayBranch)) {
    charmSignals.push("귀문 계열 거리감 (해석 과열 주의)");
  }

  if (LONG_TERM_BRANCH.has(userChart.dayBranch) || LONG_TERM_BRANCH.has(favoriteChart.dayBranch)) {
    longTermSignals.push("토 기운 축 (루틴형 장기 응원 적합)");
  }

  const tenGodRelation = tenGodLabel(userChart.dayStem, favoriteChart.dayStem);
  const fiveElementBalance = `${ELEMENT_LABEL[userChart.dayElement]}-${ELEMENT_LABEL[favoriteChart.dayElement]} 중심`;

  const elementGap = Math.abs((userChart.elementScores[userChart.dayElement] || 0) - (favoriteChart.elementScores[favoriteChart.dayElement] || 0));

  let emotion = 52;
  let excitement = 50;
  let stability = 52;
  let fanBias = 53;
  let longTerm = 51;
  let communication = 52;

  if (dayMasterRelation.includes("상생")) {
    emotion += 10;
    stability += 8;
    communication += 6;
  }
  if (dayMasterRelation.includes("같은 결")) {
    emotion += 8;
    communication += 4;
  }
  if (dayMasterRelation.includes("훈련형")) {
    emotion += 3;
    longTerm += 5;
    communication -= 4;
  }

  excitement += conflictSignals.length * 9;
  stability -= conflictSignals.length * 7;
  communication -= conflictSignals.length * 5;

  stability += harmonySignals.length * 8;
  longTerm += harmonySignals.length * 7;

  fanBias += charmSignals.length * 8;
  excitement += charmSignals.length * 5;
  longTerm += longTermSignals.length * 8;
  stability += longTermSignals.length * 6;

  if (tenGodRelation === "정인" || tenGodRelation === "편인") {
    stability += 6;
    communication += 4;
  } else if (tenGodRelation === "식신" || tenGodRelation === "상관") {
    excitement += 5;
    communication += 3;
  } else if (tenGodRelation === "편관" || tenGodRelation === "정관") {
    longTerm += 4;
    stability += 3;
  }

  if (elementGap >= 0.9) {
    stability -= 4;
    communication -= 3;
  } else {
    stability += 4;
  }

  const scores: FavoriteDestinyScore = {
    emotion: clamp(emotion, 30, 96),
    excitement: clamp(excitement, 28, 98),
    stability: clamp(stability, 24, 95),
    fanBias: clamp(fanBias, 26, 98),
    longTerm: clamp(longTerm, 30, 96),
    communication: clamp(communication, 28, 96),
    total: 0,
  };

  scores.total = clamp(
    scores.emotion * 0.2 + scores.excitement * 0.16 + scores.stability * 0.2 + scores.fanBias * 0.16 + scores.longTerm * 0.16 + scores.communication * 0.12,
    20,
    99
  );

  const chemistryType = buildChemistryType(scores, {
    dayMasterRelation,
    dayBranchRelation: `${BRANCH_META[userChart.dayBranch].ko}-${BRANCH_META[favoriteChart.dayBranch].ko}`,
    fiveElementBalance,
    tenGodRelation,
    harmonySignals,
    conflictSignals,
    charmSignals,
    longTermSignals,
  });

  const keywords = unique([
    harmonySignals.length > 0 ? "합의흐름" : "감정리듬",
    conflictSignals.length > 0 ? "텐션주의" : "안정호흡",
    charmSignals.length > 0 ? "매력흡입" : "응원지속",
    longTermSignals.length > 0 ? "장기응원" : "관계조율",
  ]).slice(0, 3);

  const strongestAxis = (
    Object.entries({
      감정: scores.emotion,
      설렘: scores.excitement,
      안정: scores.stability,
      팬심: scores.fanBias,
      장기: scores.longTerm,
      소통: scores.communication,
    }) as Array<[string, number]>
  ).sort((a, b) => b[1] - a[1])[0];

  const weakestAxis = (
    Object.entries({
      감정: scores.emotion,
      설렘: scores.excitement,
      안정: scores.stability,
      팬심: scores.fanBias,
      장기: scores.longTerm,
      소통: scores.communication,
    }) as Array<[string, number]>
  ).sort((a, b) => a[1] - b[1])[0];

  const generatedAt = options?.generatedAt || new Date().toISOString();
  const createdDate = generatedAt.slice(0, 10);
  const cardId = options?.cardId || `FD-${generatedAt.replace(/\D/g, "").slice(0, 12)}`;

  const imageCard = clampFavoriteCardText({
    favoriteName: favoriteChartInput.name,
    chemistryScore: scores.total,
    chemistryType,
    shortMood: shortTypeMood(chemistryType),
    keywords,
    oneLineLink: buildOneLineLink({
      userElement: userChart.dayElement,
      favoriteElement: favoriteChart.dayElement,
      relation: dayMasterRelation,
      strongestAxisLabel: strongestAxis[0],
      strongestAxisScore: strongestAxis[1],
    }),
    cardId,
    createdAt: createdDate,
  });

  const branchRelationText = `${BRANCH_META[userChart.dayBranch].ko}-${BRANCH_META[favoriteChart.dayBranch].ko}`;

  const tabs: FavoriteDestinyTabResult[] = [
    {
      id: "summary",
      label: "요약",
      shortLabel: "요약",
      title: "운명 스테이지 요약",
      keywords,
      sections: [
        {
          title: "핵심 케미",
          usedSignals: [dayMasterRelation, branchRelationText],
          text: `${ELEMENT_LABEL[userChart.dayElement]}-${ELEMENT_LABEL[favoriteChart.dayElement]} 축은 ${elementPairMeme(userChart.dayElement, favoriteChart.dayElement)}으로 읽혀요. 지금 조합은 ${chemistryType}이고 궁합은 ${scores.total}점. 첫인상 한방보다 볼수록 스며들어 코어팬 모드가 켜지는 타입입니다.`,
        },
      ],
    },
    {
      id: "chemistry",
      label: "케미",
      shortLabel: "케미",
      title: "사주 케미 해설",
      keywords,
      sections: [
        {
          title: "사주 케미 근거",
          usedSignals: [dayMasterRelation, `일지:${branchRelationText}`, fiveElementBalance, `십성:${tenGodRelation}`],
          text: `일간은 ${dayMasterRelation}, 일지는 ${branchRelationText}, 오행은 ${fiveElementBalance} 결입니다. ${harmonySignals.length > 0 ? "초반부터 합이 잘 맞는 라이브형" : "처음엔 낯가리다 후반에 폭발하는 역주행형"}이라 입덕 포인트가 뒤로 갈수록 커져요.`,
        },
      ],
    },
    {
      id: "emotion",
      label: "감정",
      shortLabel: "감정",
      title: "강하게 끌리는 포인트",
      keywords,
      sections: [
        {
          title: "감정선 & 덕심 분석",
          usedSignals: conflictSignals.length ? conflictSignals : ["완충 신호"],
          text: `감정 ${scores.emotion}점, 설렘 ${scores.excitement}점이라 덕통사고와 안정 코어팬 지수가 동시에 들어와요. ${conflictSignals.length ? "치명적인 텐션 때문에 뇌피셜이 과열되기 쉬운 조합" : "잔광이 길게 남아 현생 중에도 계속 생각나는 조합"}이라 시간과 애정이 자연스럽게 몰립니다.`,
        },
      ],
    },
    {
      id: "fanBias",
      label: "팬심",
      shortLabel: "팬심",
      title: "팬심 몰입도",
      keywords,
      sections: [
        {
          title: "덕심 포인트",
          usedSignals: charmSignals.length ? charmSignals : ["기본 매력 신호"],
          text: `팬심 ${scores.fanBias}점. ${charmSignals.length ? "도화/화개 포인트가 살아 있어서 직캠 1개만 봐도 도파민이 바로 치솟는 타입" : "자극보다 여운으로 스며드는 타입이라 N회차 후 코어팬 확정"}입니다.`,
          action: "오늘 덕질 로그에 최애 레전드 순간 1개만 저장하고, 내일 다시 보면 입덕 포인트가 더 선명해져요 📌",
        },
      ],
    },
    {
      id: "stability",
      label: "안정",
      shortLabel: "안정",
      title: "오래가는 힘",
      keywords,
      sections: [
        {
          title: "장기 지속력",
          usedSignals: longTermSignals.length ? longTermSignals : ["루틴 보완 필요"],
          text: `안정 ${scores.stability}점은 꾸준한 코어팬 지수, 장기 ${scores.longTerm}점은 덕질 지속력입니다. ${longTermSignals.length ? "현생-덕질 밸런스를 잘 타서 길게 달릴수록 더 맛이 나는 궁합" : "단기 과열보다 일정한 루틴이 붙을 때 진가가 터지는 궁합"}이에요.`,
          action: "주 2~3회 '짧고 굵게' 덕질 타임을 잡으면 만족도랑 지속력이 같이 올라갑니다 🔥",
        },
      ],
    },
    {
      id: "caution",
      label: "주의",
      shortLabel: "주의",
      title: "조심해야 할 감정 패턴",
      keywords,
      sections: [
        {
          title: "과몰입 주의보",
          usedSignals: conflictSignals.length ? conflictSignals : ["갈등 과열 낮음"],
          text: `${conflictSignals.length ? "🚨 텐션 과열 구간! ${branchRelationText} 신호가 강하게 들어오면 혼자 떡밥 세계관 확장하다 멘탈이 털릴 수 있어요." : "🚨 큰 충돌은 약하지만, 입덕 부정기 모드에서 혼자 상상 서사를 과하게 돌리면 에너지가 훅 빠질 수 있어요."}`,
          action: "떡밥 없는 날엔 과감히 현생 1퀘스트 클리어하고 돌아오면 케미 밸런스가 다시 살아납니다 🎯",
        },
      ],
    },
    {
      id: "advice",
      label: "조언",
      shortLabel: "조언",
      title: "✨ 오늘의 덕질/관계 조언",
      keywords,
      sections: [
        {
          title: "실행 포인트",
          usedSignals: [dayMasterRelation, `소통:${scores.communication}`],
          text: `오늘의 승부수는 소통 ${scores.communication}점 라인을 살리는 것. 길게 앓기보다 한 번 제대로 도파민 채우는 덕질이 이 조합에 더 잘 맞아요.`,
          action: "오늘의 미션: 최애 레전드 직캠 1개만 보고 깔끔하게 종료! 굵고 짧은 덕질이 오늘 운을 최상으로 끌어올립니다 🚀",
        },
      ],
    },
  ];

  const summary = sanitizeFavoriteDestinyText(
    `이번 팬-아이돌 궁합은 ${chemistryType} 무드로 읽히며, 사주 기준 ${dayMasterRelation}과 ${branchRelationText} 신호가 핵심입니다. 설렘(${scores.excitement})과 코어팬 안정(${scores.stability}) 밸런스를 잡으면 덕질 만족도가 크게 올라갑니다.`
  );

  return {
    reportType: "FAVORITE_DESTINY",
    mode: "saju-local",
    generatedAt,
    user: {
      name: userChartInput.name,
      birthDataStatus: parseBirthStatus(userChartInput.birthTimeInput),
    },
    favorite: {
      name: favoriteChartInput.name,
      birthDataStatus: parseBirthStatus(favoriteChartInput.birthTimeInput),
    },
    scores,
    chemistryType,
    imageCard,
    sajuSignals: {
      dayMasterRelation,
      dayBranchRelation: branchRelationText,
      fiveElementBalance,
      tenGodRelation,
      harmonySignals,
      conflictSignals,
      charmSignals,
      longTermSignals,
    },
    tabs,
    summary,
    meta: {
      engineVersion: "favorite-destiny-v1",
      apiUsed: false,
      calculationBased: true,
    },
  };
}

export function validateFavoriteDestinyReading(reading: FavoriteDestinyReading): ValidationResult {
  const errors: string[] = [];

  const invalidScore = Object.entries(reading.scores || {}).find(([, value]) => !Number.isFinite(value));
  if (invalidScore) {
    errors.push(`점수 계산값이 유효하지 않습니다: ${invalidScore[0]}`);
  }

  if ((reading.imageCard.oneLineLink || "").length > 45) {
    errors.push("이미지 카드 oneLineLink가 45자를 초과했습니다.");
  }
  if ((reading.imageCard.keywords || []).length > 3) {
    errors.push("이미지 카드 keywords가 3개를 초과했습니다.");
  }

  if (countCoreSajuSignals(reading) < 5) {
    errors.push("사주 계산 신호가 5개 미만입니다.");
  }

  const badTab = reading.tabs.find((tab) => (tab.shortLabel || "").length < 2 || (tab.shortLabel || "").length > 4);
  if (badTab) {
    errors.push(`탭 shortLabel 길이 오류: ${badTab.id}`);
  }

  const dupCheck = new Map<string, number>();
  for (const tab of reading.tabs) {
    for (const section of tab.sections) {
      const t = sanitizeFavoriteDestinyText(section.text);
      if (t.length >= 20) {
        const key = t.slice(0, 20);
        dupCheck.set(key, (dupCheck.get(key) || 0) + 1);
      }
    }
  }
  if (Array.from(dupCheck.values()).some((count) => count >= 2)) {
    errors.push("20자 이상 유사 문장이 중복되었습니다.");
  }

  const allTexts = [reading.summary, ...reading.tabs.flatMap((tab) => tab.sections.map((section) => section.text))].join(" ");
  if (/문라이트\s*오라|청량\s*무드/i.test(allTexts)) {
    errors.push("감성 문구 치우침(문라이트 오라/청량 무드)이 남아 있습니다.");
  }

  if (reading.favorite.birthDataStatus !== "complete" && /시주|시지|시간축 단정/.test(allTexts)) {
    errors.push("시간 미상인데 시주 단정 해석이 포함되어 있습니다.");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
