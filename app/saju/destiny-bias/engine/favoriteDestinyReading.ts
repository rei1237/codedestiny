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
  if (type === "설렘폭발형") return "끌림이 빠르게 점화되는 조합";
  if (type === "운명착붙형") return "낯설어도 금방 친밀해지는 조합";
  if (type === "티격태격중독형") return "긴장과 끌림이 함께 오는 조합";
  if (type === "덕심폭주형") return "자꾸 눈길이 가는 매력 집중 조합";
  if (type === "현실안정형") return "편안하게 오래 갈 수 있는 조합";
  if (type === "거리감있는신비형") return "가까운 듯 멀어 신비감이 도는 조합";
  if (type === "성장파트너형") return "서로를 자극해 성장하는 조합";
  if (type === "힐링보호형") return "감정 소모를 줄여주는 안정 조합";
  if (type === "천천히스며드는형") return "시간이 갈수록 깊어지는 조합";
  return "잔잔하게 마음이 붙는 조합";
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
    oneLineLink: `처음엔 ${scores.excitement >= scores.stability ? "설렘" : "안정"}이 먼저 오고, 볼수록 ${strongestAxis[0]} 축이 살아나는 케미`,
    cardId,
    createdAt: createdDate,
  });

  const branchRelationText = `${BRANCH_META[userChart.dayBranch].ko}-${BRANCH_META[favoriteChart.dayBranch].ko}`;

  const tabs: FavoriteDestinyTabResult[] = [
    {
      id: "summary",
      label: "요약",
      shortLabel: "요약",
      title: "이번 케미 요약",
      keywords,
      sections: [
        {
          title: "핵심 한눈 정리",
          usedSignals: [dayMasterRelation, branchRelationText],
          text: `이 조합은 ${chemistryType} 무드에 가깝고, 무대 궁합은 ${scores.total}점입니다. 지금은 ${strongestAxis[0]}(${strongestAxis[1]}점) 파트에서 응원봉이 가장 밝게 켜지고, ${weakestAxis[0]}(${weakestAxis[1]}점)은 앙코르 전에 맞춰두면 훨씬 완성도가 올라가요.`,
        },
      ],
    },
    {
      id: "chemistry",
      label: "케미",
      shortLabel: "케미",
      title: "왜 잘 맞는지",
      keywords,
      sections: [
        {
          title: "사주 케미 근거",
          usedSignals: [dayMasterRelation, `일지:${branchRelationText}`, fiveElementBalance, `십성:${tenGodRelation}`],
          text: `일간 합은 ${dayMasterRelation}, 일지 호흡은 ${branchRelationText}로 읽힙니다. 오행 축은 ${fiveElementBalance}라서 ${harmonySignals.length > 0 ? "첫 멘트부터 합창이 붙는" : "템포를 맞출수록 후렴이 살아나는"} 팬-아이돌 케미예요.`,
        },
      ],
    },
    {
      id: "emotion",
      label: "감정",
      shortLabel: "감정",
      title: "감정선 리딩",
      keywords,
      sections: [
        {
          title: "끌림과 오해 포인트",
          usedSignals: conflictSignals.length ? conflictSignals : ["완충 신호"],
          text: `감정선 ${scores.emotion}점, 설렘 ${scores.excitement}점입니다. ${conflictSignals.length ? "심장 박수는 빠른데 답장 박자가 어긋나면 살짝 삐끗할 수 있어요." : "한 번에 터지는 불꽃보다 잔광이 오래 남는 타입이라, 덕심이 안정적으로 누적됩니다."}`,
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
          text: `팬심 ${scores.fanBias}점입니다. ${charmSignals.length ? "도화/화개 매력 포인트가 살아 있어서, 직캠 한 번 보면 알고리즘이 아니라 심장이 먼저 재생 버튼을 눌러요." : "한방 임팩트보다 스며드는 매력형이라, 회차가 쌓일수록 최애 확신이 강해집니다."}`,
          action: "과몰입이 올라오면 '오늘 최애 포인트 1줄'만 남기고 10분 환기해 감정 체력을 지켜보세요.",
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
          text: `안정 ${scores.stability}점, 장기 ${scores.longTerm}점입니다. ${longTermSignals.length ? "정주행-휴식-재입장 루틴이 잘 맞아, 오래 덕질해도 번아웃이 적은 조합이에요." : "초반 텐션보다 리듬 있는 응원 루틴을 만들수록 관계 체감이 더 깊어집니다."}`,
          action: "응원 루틴을 주 2~3회 고정해두면 만족도와 지속력이 함께 올라가요.",
        },
      ],
    },
    {
      id: "caution",
      label: "주의",
      shortLabel: "주의",
      title: "조율 포인트",
      keywords,
      sections: [
        {
          title: "갈등 신호 해석",
          usedSignals: conflictSignals.length ? conflictSignals : ["갈등 과열 낮음"],
          text: `${conflictSignals.length ? "충/해/파 신호는 불화 선언이 아니라 템포 차이 알림이에요. 기대 속도만 맞추면 케미가 다시 안정권으로 돌아옵니다." : "큰 충돌은 약한 편이지만 혼자 추측해서 스토리를 쓰기 시작하면 피로가 쌓일 수 있어요."}`,
          action: "비교/소유욕 신호가 오면 바로 반응하지 말고, 한 템포 쉬고 사실부터 확인해 보세요.",
        },
      ],
    },
    {
      id: "advice",
      label: "조언",
      shortLabel: "조언",
      title: "오늘의 작은 행동",
      keywords,
      sections: [
        {
          title: "실전 행동 가이드",
          usedSignals: [dayMasterRelation, `소통:${scores.communication}`],
          text: `오늘은 감정 강도보다 소통 ${scores.communication}점 라인을 살리는 게 핵심입니다. 길게 불타기보다 짧고 선명한 응원 한 번이 이 조합의 체감 만족도를 가장 빠르게 올려줘요.`,
          action: "오늘의 미션: 최애에게 끌린 포인트를 한 문장으로 적고, 내일 다시 읽어 감정 리듬을 정돈해 보세요.",
        },
      ],
    },
  ];

  const summary = sanitizeFavoriteDestinyText(
    `이번 팬-아이돌 궁합은 ${chemistryType} 무드로 읽히며, 사주 기준 ${dayMasterRelation}과 ${branchRelationText} 신호가 핵심입니다. 설렘(${scores.excitement})과 안정(${scores.stability}) 밸런스를 맞추면 덕심 만족도가 가장 크게 올라갑니다.`
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
