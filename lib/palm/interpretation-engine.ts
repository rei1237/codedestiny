import type {
  CanonicalPalmReading,
  PalmAnalysisPurpose,
  PalmHandReading,
  PalmHandRole,
  PalmLineDepth,
  PalmLineLength,
  PalmLineCurvature,
  PalmHeadLineDirection,
  PalmHeadLifeRelation,
  PalmHeartEndingArea,
  PalmFateStrength,
  PalmFateStartArea,
  PalmFateEndArea,
  PalmMountFullness,
} from "@/types/palm-reading";

type CardKey =
  | "lifeLine"
  | "headLine"
  | "heartLine"
  | "fateLine"
  | "sunLine"
  | "moneyLine"
  | "marriageLine"
  | "mounts";

export type PalmInterpretationCard = {
  key: CardKey;
  title: string;
  oneLiner: string;
  details: string[];
  strengths: string[];
  cautions: string[];
  todayAdvice: string;
  sevenDayPractice: string;
  emphasisScore: number;
};

export type PalmInterpretationReport = {
  generatedAt: string;
  analysisPurpose: PalmAnalysisPurpose;
  tone: string;
  policy: {
    imageDirectVisionUsed: false;
    source: "canonicalPalmReading";
    forbiddenExpressionFiltered: boolean;
    forbiddenMatches: string[];
  };
  focusSummary: string;
  cards: PalmInterpretationCard[];
};

const FORBIDDEN_PHRASES: readonly string[] = [
  "수명이 짧다",
  "단명",
  "오래 못 산다",
  "병이 있다",
  "큰 병",
  "죽음이 보인다",
  "죽음",
  "사고가 난다",
  "이혼한다",
  "결혼을 몇 번 한다",
  "반드시 결혼한다",
  "반드시 부자가 된다",
  "투자 성공",
  "자녀 문제가 있다",
  "자녀 문제",
  "불임",
  "임신",
  "성적 능력",
  "의학적 진단",
];

const EMPHASIS_BY_PURPOSE: Record<PalmAnalysisPurpose, Partial<Record<CardKey, number>>> = {
  general: {},
  love: {
    heartLine: 3,
    marriageLine: 3,
    mounts: 2,
  },
  wealth: {
    moneyLine: 3,
    mounts: 2,
    fateLine: 2,
  },
  career: {
    fateLine: 3,
    sunLine: 2,
    headLine: 2,
  },
  personality: {
    headLine: 3,
    heartLine: 2,
    mounts: 2,
  },
  relationship: {
    heartLine: 3,
    marriageLine: 3,
    mounts: 2,
  },
};

const BASE_ORDER: CardKey[] = [
  "lifeLine",
  "headLine",
  "heartLine",
  "fateLine",
  "sunLine",
  "moneyLine",
  "marriageLine",
  "mounts",
];

type SideLabel = "left" | "right";

type SideReading = {
  side: SideLabel;
  role: PalmHandRole;
  reading: PalmHandReading;
};

function sideKo(side: SideLabel): string {
  return side === "left" ? "왼손" : "오른손";
}

function roleKo(role: PalmHandRole): string {
  if (role === "innate") return "선천적 결";
  if (role === "acquired") return "후천적 흐름";
  if (role === "mixed") return "선후천 혼합";
  return "판독 보류";
}

function collectSides(canonical: CanonicalPalmReading): SideReading[] {
  const list: SideReading[] = [];

  if (canonical.leftHandReading) {
    list.push({
      side: "left",
      role: canonical.handContext.leftHandRole,
      reading: canonical.leftHandReading,
    });
  }

  if (canonical.rightHandReading) {
    list.push({
      side: "right",
      role: canonical.handContext.rightHandRole,
      reading: canonical.rightHandReading,
    });
  }

  return list;
}

function uniqTop(list: string[], count: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= count) break;
  }
  return out;
}

function fallbackDetails(cardKey: CardKey, cardTitle: string): string[] {
  const cardHint: Record<CardKey, string> = {
    lifeLine: "생활 리듬과 회복 주기",
    headLine: "사고 기준과 집중 흐름",
    heartLine: "감정 표현과 애착 패턴",
    fateLine: "직업 방향과 목표 축",
    sunLine: "표현력과 존재감",
    moneyLine: "돈 관리 습관과 거래 감각",
    marriageLine: "깊은 관계의 약속 방식",
    mounts: "욕망·재능·추진력의 분포",
  };

  return [
    `${cardTitle}는 현재 canonical 데이터에서 확정 신호가 부족해 단정 대신 관찰 중심으로 해석합니다.`,
    `${cardTitle}의 미감지 항목은 부재가 아니라 아직 읽히지 않은 영역으로 취급합니다.`,
    `${cardTitle}는 사건 예언보다 ${cardHint[cardKey]}의 사용 습관을 비추는 지도에 가깝습니다.`,
    `${cardTitle} 정확도를 높이려면 오늘의 선택 장면을 짧게 기록해 맥락을 남겨 주세요.`,
    `${cardTitle} 관련 반응을 같은 시간대에 메모하면 다음 해석의 구체성이 높아집니다.`,
    `${cardTitle} 재촬영 시 손바닥 전체와 손가락 아래 라인을 밝게 담아 주세요.`,
  ];
}

function fallbackCard(key: CardKey, title: string, purpose: PalmAnalysisPurpose, emphasisScore: number): PalmInterpretationCard {
  const purposeMessage: Record<PalmAnalysisPurpose, string> = {
    general: "전체 흐름에서는 관찰 데이터 축적이 우선입니다.",
    love: "연애 주제에서는 감정 반응 일지를 짧게 남겨 주세요.",
    wealth: "재물 주제에서는 지출 결정을 내린 직후 이유를 기록해 주세요.",
    career: "직업 주제에서는 집중이 잘 되는 시간대를 먼저 고정해 주세요.",
    personality: "성향 주제에서는 선택 직전 망설임 포인트를 관찰해 주세요.",
    relationship: "관계 주제에서는 거리 조절이 어색했던 장면을 기록해 주세요.",
  };

  return {
    key,
    title,
    oneLiner: "아직 단정할 단계는 아니며, 생활 패턴 기록이 먼저 필요한 카드입니다.",
    details: fallbackDetails(key, title),
    strengths: [
      `${title}에서 미확정 상태를 인정하고 조심스럽게 읽어내는 기준이 유지됩니다.`,
      `${title}를 단정 대신 습관 조율 관점으로 해석할 수 있는 여지가 큽니다.`,
      `${title}는 재촬영과 기록을 통해 정확도를 끌어올릴 여지가 충분합니다.`,
    ],
    cautions: [
      `${title}의 빈 값을 결과 부재로 오해하지 마세요.`,
      `${title}는 한 번의 촬영 결과로 성향을 고정하지 마세요.`,
      `${title}에서 기대감으로 과잉 해석을 덧붙이지 마세요.`,
    ],
    todayAdvice: purposeMessage[purpose],
    sevenDayPractice: "7일 동안 같은 시간에 손바닥 사진 1장과 컨디션 메모 1줄을 남겨 패턴을 모아 보세요.",
    emphasisScore,
  };
}

function mapLifeLength(v: PalmLineLength): string {
  if (v === "long") return "리듬을 길게 가져가며 꾸준히 누적하는 성향";
  if (v === "medium") return "속도와 지속을 균형 있게 조절하는 성향";
  if (v === "short") return "짧은 주기로 집중과 회복을 전환하는 성향";
  return "길이 신호가 아직 확정되지 않은 상태";
}

function mapLifeDepth(v: PalmLineDepth): string {
  if (v === "deep") return "에너지를 한 번에 깊게 쓰는 편";
  if (v === "medium") return "체력 배분이 비교적 안정적인 편";
  if (v === "faint") return "컨디션 기복을 세심하게 관리해야 하는 편";
  return "깊이 판단이 보류된 상태";
}

function mapLifeCurvature(v: PalmLineCurvature): string {
  if (v === "wide") return "외부 활동과 사람의 기운에서 회복 탄력을 얻는 경향";
  if (v === "normal") return "일상 루틴 안에서 회복 리듬을 만드는 경향";
  if (v === "narrow") return "에너지 사용 범위를 좁혀 효율을 높이는 경향";
  return "곡률 데이터가 미확정인 상태";
}

function mapHeadDirection(v: PalmHeadLineDirection): string {
  if (v === "straight") return "현실 판단과 구조화가 강한 사고 흐름";
  if (v === "curved") return "맥락과 정서를 함께 읽는 유연한 사고 흐름";
  if (v === "downward") return "상상력과 내면 통찰이 깊은 사고 흐름";
  return "사고 방향 신호가 아직 확정되지 않음";
}

function mapHeadRelation(v: PalmHeadLifeRelation): string {
  if (v === "joined") return "시작 전에 안전성과 타이밍을 먼저 점검하는 타입";
  if (v === "separated") return "독립적으로 결단을 내리고 바로 실행하는 타입";
  return "시작 관계 데이터가 아직 불충분한 상태";
}

function mapHeartEnding(v: PalmHeartEndingArea): string {
  if (v === "underIndex") return "관계에서 이상과 존중의 기준을 높게 두는 경향";
  if (v === "underMiddle") return "현실적인 호흡과 책임을 중시하는 경향";
  if (v === "between") return "이상과 현실의 균형을 잡으려는 경향";
  return "감정선 종점 판단이 유보된 상태";
}

function mapFateStrength(v: PalmFateStrength): string {
  if (v === "strong") return "사회적 목표축이 또렷해 방향 유지력이 높은 편";
  if (v === "medium") return "상황에 맞춰 목표를 조정하며 전진하는 편";
  if (v === "weak") return "환경 변화에 따라 진로 축이 흔들리기 쉬운 편";
  if (v === "none") return "정해진 레일보다 스스로 길을 조합하는 편";
  return "운명선 강도 신호가 아직 확정되지 않음";
}

function mapFateStart(v: PalmFateStartArea): string {
  if (v === "wrist") return "초기부터 목표 의식이 비교적 빠르게 형성되는 흐름";
  if (v === "lifeLine") return "개인 경험과 생활 기반에서 진로 동기가 자라는 흐름";
  if (v === "moonMount") return "사람, 이동, 외부 자극이 진로 전환의 계기가 되는 흐름";
  if (v === "middlePalm") return "중반 이후 방향이 선명해지는 흐름";
  return "시작점 판단이 보류된 흐름";
}

function mapFateEnd(v: PalmFateEndArea): string {
  if (v === "saturnMount") return "책임과 전문성 축으로 수렴하는 흐름";
  if (v === "middlePalm") return "과정 중심의 다중 경로를 선호하는 흐름";
  return "종점 데이터가 아직 명확하지 않은 흐름";
}

function lineStrengthText(raw: string | null): string {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "강도 데이터가 아직 입력되지 않았습니다.";
  if (s.includes("strong") || s.includes("high")) return "강도가 비교적 뚜렷하게 읽힙니다.";
  if (s.includes("weak") || s.includes("low")) return "강도가 약하게 읽혀 보수적 해석이 필요합니다.";
  return `강도 표기는 ${raw}로 기록되어 있습니다.`;
}

function purposeEmphasis(key: CardKey, purpose: PalmAnalysisPurpose): number {
  return 1 + (EMPHASIS_BY_PURPOSE[purpose][key] || 0);
}

function purposeFocusSummary(purpose: PalmAnalysisPurpose): string {
  if (purpose === "love") return "이번 해석은 감정선, 금성구, 결혼선의 미세한 온도 차이를 중심으로 관계 리듬을 읽습니다.";
  if (purpose === "wealth") return "이번 해석은 재물선, 수성구, 운명선을 바탕으로 돈을 다루는 습관과 가치 창출 방식에 초점을 둡니다.";
  if (purpose === "career") return "이번 해석은 운명선, 태양선, 두뇌선을 중심으로 직업 방향과 사회적 목표의 결을 정리합니다.";
  if (purpose === "personality") return "이번 해석은 두뇌선, 감정선, 손형의 조합으로 사고와 감정의 기본 성향을 정교하게 살핍니다.";
  if (purpose === "relationship") return "이번 해석은 감정선, 결혼선, 양손 역할 비교를 중심으로 친밀감과 거리 조절의 패턴을 읽습니다.";
  return "이번 해석은 전체 손금 구조를 균형 있게 훑어 현재의 습관 지도를 제시합니다.";
}

function buildLifeLineCard(canonical: CanonicalPalmReading, purpose: PalmAnalysisPurpose): PalmInterpretationCard {
  const key: CardKey = "lifeLine";
  const emphasisScore = purposeEmphasis(key, purpose);
  const sides = collectSides(canonical);
  const entries = sides
    .map((s) => ({
      side: s.side,
      role: s.role,
      line: s.reading.majorLines.lifeLine,
    }))
    .filter((x) => x.line.detected);

  if (entries.length === 0) {
    return fallbackCard(key, "생명선", purpose, emphasisScore);
  }

  const details = entries.flatMap((item) => {
    const role = `${sideKo(item.side)}(${roleKo(item.role)})`;
    const line = item.line;
    return [
      `${role}의 생명선은 ${mapLifeLength(line.length)}으로 읽힙니다.`,
      `${role}에서는 ${mapLifeDepth(line.depth)} 경향이 나타납니다.`,
      `${role}의 곡선은 ${mapLifeCurvature(line.curvature)}을 시사합니다.`,
      `${role}에서 끊김 ${line.breaks}회, 가지선 ${line.branches}회가 기록되어 회복 전환 지점을 암시합니다.`,
      `요약 신호: ${line.summary || "현재는 구조 신호 위주로만 확인됩니다."}`,
      `생활 조율 제안: ${line.advice || "에너지 과속 구간을 줄이기 위해 수면-집중 리듬을 고정해 보세요."}`,
    ];
  });

  return {
    key,
    title: "생명선",
    oneLiner: "생명선은 수명 예측이 아니라 에너지 운용과 회복 리듬의 지도입니다.",
    details: uniqTop(details, 8),
    strengths: uniqTop([
      "생활 지속성을 스스로 조율하려는 의식이 살아 있습니다.",
      "회복 타이밍을 찾으면 컨디션 반등이 빠른 편입니다.",
      "자기관리 루틴을 붙일수록 에너지 누수가 줄어드는 타입입니다.",
    ], 3),
    cautions: uniqTop([
      "무리한 몰입 뒤 회복 시간을 건너뛰면 기복이 커질 수 있습니다.",
      "피로 신호를 늦게 인정하면 생활 리듬이 한 번에 흔들릴 수 있습니다.",
      "한 번에 모든 습관을 바꾸기보다 주간 단위 미세 조정이 적합합니다.",
    ], 3),
    todayAdvice: "오늘은 속도를 올리는 것보다 회복 구간을 먼저 달력에 고정해 보세요.",
    sevenDayPractice: "7일 동안 아침/저녁 에너지 점수를 10점 만점으로 기록하고, 점수 차이가 큰 날의 공통 원인을 찾아 1개만 수정하세요.",
    emphasisScore,
  };
}

function buildHeadLineCard(canonical: CanonicalPalmReading, purpose: PalmAnalysisPurpose): PalmInterpretationCard {
  const key: CardKey = "headLine";
  const emphasisScore = purposeEmphasis(key, purpose);
  const sides = collectSides(canonical);
  const entries = sides
    .map((s) => ({
      side: s.side,
      role: s.role,
      line: s.reading.majorLines.headLine,
    }))
    .filter((x) => x.line.detected);

  if (entries.length === 0) {
    return fallbackCard(key, "두뇌선", purpose, emphasisScore);
  }

  const details = entries.flatMap((item) => {
    const role = `${sideKo(item.side)}(${roleKo(item.role)})`;
    const line = item.line;
    return [
      `${role}의 두뇌선은 ${mapHeadDirection(line.direction)}으로 읽힙니다.`,
      `${role}에서는 ${mapHeadRelation(line.startRelationWithLifeLine)} 특징이 보입니다.`,
      `${role}의 길이는 ${line.length}로 기록되어 집중 지속 방식의 힌트를 줍니다.`,
      `${role}에서 끊김 ${line.breaks}회, 가지선 ${line.branches}회는 판단 전환의 빈도를 보여줍니다.`,
      `사고 요약: ${line.summary || "현재는 구조 데이터 중심으로 판단합니다."}`,
      `집중 조율 제안: ${line.advice || "중요 결정은 메모-검토-실행의 3단계를 고정하세요."}`,
    ];
  });

  return {
    key,
    title: "두뇌선",
    oneLiner: "두뇌선은 운명 단정이 아니라 사고방식과 판단 습관의 결을 보여줍니다.",
    details: uniqTop(details, 8),
    strengths: [
      "판단 기준을 문장으로 정리하면 실행력이 빠르게 올라갑니다.",
      "집중 구간과 확산 구간을 나눌 때 생산성이 안정됩니다.",
      "현실성과 상상력의 비율을 스스로 조절할 여지가 큽니다.",
    ],
    cautions: [
      "정보 과다 구간에서 결정을 미루는 습관이 생길 수 있습니다.",
      "감정이 높은 날에는 판단 기준이 흔들릴 수 있습니다.",
      "완벽한 답을 기다리면 시작 시점을 놓치기 쉽습니다.",
    ],
    todayAdvice: "오늘 결정 1건은 기준 3개만 적고 20분 안에 결론을 내려 보세요.",
    sevenDayPractice: "7일 동안 하루 한 번, 가장 오래 망설인 결정을 기록하고 망설임의 원인을 한 단어로 요약해 보세요.",
    emphasisScore,
  };
}

function buildHeartLineCard(canonical: CanonicalPalmReading, purpose: PalmAnalysisPurpose): PalmInterpretationCard {
  const key: CardKey = "heartLine";
  const emphasisScore = purposeEmphasis(key, purpose);
  const sides = collectSides(canonical);
  const entries = sides
    .map((s) => ({
      side: s.side,
      role: s.role,
      line: s.reading.majorLines.heartLine,
    }))
    .filter((x) => x.line.detected);

  if (entries.length === 0) {
    return fallbackCard(key, "감정선", purpose, emphasisScore);
  }

  const details = entries.flatMap((item) => {
    const role = `${sideKo(item.side)}(${roleKo(item.role)})`;
    const line = item.line;
    return [
      `${role}의 감정선은 ${mapHeartEnding(line.endingArea)}을 보여줍니다.`,
      `${role}의 곡률(${line.curvature})은 감정 표현의 온도를 조절하는 방식을 시사합니다.`,
      `${role}의 길이(${line.length})는 애착 형성 속도와 관계 기대치를 읽는 단서가 됩니다.`,
      `${role}에서 끊김 ${line.breaks}회, 가지선 ${line.branches}회는 상처받는 지점과 회복 경로를 알려줍니다.`,
      `관계 요약: ${line.summary || "현재는 기본 감정 구조만 확인됩니다."}`,
      `감정 조율 제안: ${line.advice || "서운함은 하루를 넘기기 전에 짧은 문장으로 공유하세요."}`,
    ];
  });

  return {
    key,
    title: "감정선",
    oneLiner: "감정선은 사랑의 결과를 단정하지 않고, 마음을 주고받는 방식의 결을 설명합니다.",
    details: uniqTop(details, 8),
    strengths: [
      "관계에서 중요한 가치와 기대를 비교적 명확히 인식합니다.",
      "정서적 교감이 맞을 때 신뢰를 깊게 키우는 힘이 있습니다.",
      "표현 방식을 조절하면 관계 만족도가 빠르게 개선됩니다.",
    ],
    cautions: [
      "기대치를 설명하지 않으면 오해가 반복될 수 있습니다.",
      "상처를 참고 쌓아두면 갑작스러운 거리 두기로 이어질 수 있습니다.",
      "상대의 말투를 의도 전체로 확대 해석하지 않도록 주의하세요.",
    ],
    todayAdvice: "오늘은 마음속 기대 1가지를 요청 문장으로 바꿔 전달해 보세요.",
    sevenDayPractice: "7일 동안 관계 대화 후 감정 온도(차분/보통/뜨거움)를 기록하고, 온도가 높았던 날의 공통 표현을 찾아 줄여 보세요.",
    emphasisScore,
  };
}

function buildFateLineCard(canonical: CanonicalPalmReading, purpose: PalmAnalysisPurpose): PalmInterpretationCard {
  const key: CardKey = "fateLine";
  const emphasisScore = purposeEmphasis(key, purpose);
  const sides = collectSides(canonical);
  const entries = sides
    .map((s) => ({
      side: s.side,
      role: s.role,
      line: s.reading.majorLines.fateLine,
    }))
    .filter((x) => x.line.detected);

  if (entries.length === 0) {
    return fallbackCard(key, "운명선", purpose, emphasisScore);
  }

  const details = entries.flatMap((item) => {
    const role = `${sideKo(item.side)}(${roleKo(item.role)})`;
    const line = item.line;
    return [
      `${role}의 운명선은 ${mapFateStrength(line.strength)}으로 읽힙니다.`,
      `${role}의 시작점은 ${mapFateStart(line.startArea)}을 보여줍니다.`,
      `${role}의 종점은 ${mapFateEnd(line.endArea)}을 암시합니다.`,
      `${role}에서 끊김 ${line.breaks}회는 진로 전환 구간의 횟수를 시사합니다.`,
      `방향 요약: ${line.summary || "현재는 목표 축의 구조만 확인됩니다."}`,
      `실행 제안: ${line.advice || "3개월 목표를 2주 단위 과제로 쪼개 진행률을 점검해 보세요."}`,
    ];
  });

  return {
    key,
    title: "운명선",
    oneLiner: "운명선은 직업 결과를 확정하는 선이 아니라, 자립성과 사회적 목표의 방향을 읽는 선입니다.",
    details: uniqTop(details, 8),
    strengths: [
      "사회적 역할을 스스로 설계하려는 의지가 살아 있습니다.",
      "목표를 문서화하면 집중력이 눈에 띄게 높아집니다.",
      "전환기에도 축을 다시 세우는 회복력이 있습니다.",
    ],
    cautions: [
      "외부 평가에만 맞추면 본래 강점이 희미해질 수 있습니다.",
      "목표가 크기만 하고 일정이 없으면 추진력이 분산됩니다.",
      "전환기의 불안을 과장 해석하지 않도록 주의하세요.",
    ],
    todayAdvice: "오늘은 현재 목표를 한 문장으로 다시 정의하고, 다음 행동 1개를 바로 예약하세요.",
    sevenDayPractice: "7일 동안 하루 마지막에 오늘의 일 중 사회적 가치가 있었던 행동 1개를 기록해 목표축을 강화하세요.",
    emphasisScore,
  };
}

function buildSunLineCard(canonical: CanonicalPalmReading, purpose: PalmAnalysisPurpose): PalmInterpretationCard {
  const key: CardKey = "sunLine";
  const emphasisScore = purposeEmphasis(key, purpose);
  const sides = collectSides(canonical);
  const entries = sides
    .map((s) => ({
      side: s.side,
      role: s.role,
      line: s.reading.minorLines.sunLine,
    }))
    .filter((x) => x.line.detected);

  if (entries.length === 0) {
    return fallbackCard(key, "태양선", purpose, emphasisScore);
  }

  const details = entries.flatMap((item) => {
    const role = `${sideKo(item.side)}(${roleKo(item.role)})`;
    return [
      `${role}의 태양선은 표현력과 존재감의 사용 습관을 보여줍니다.`,
      `${role}에서 ${lineStrengthText(item.line.strength)} 신호가 관찰됩니다.`,
      `${role} 요약: ${item.line.summary || "표현 채널이 점진적으로 열리는 흐름입니다."}`,
      "태양선은 인기의 절대치보다, 자신을 어떤 문장과 작품으로 남기는지에 더 민감합니다.",
      "작은 완성물을 자주 공개할수록 브랜딩 일관성이 선명해집니다.",
      "평가를 피하려는 마음보다 전달하고 싶은 핵심 1개를 먼저 세우는 것이 유리합니다.",
    ];
  });

  return {
    key,
    title: "태양선",
    oneLiner: "태양선은 명성의 약속이 아니라, 표현력과 창작 에너지를 세상에 비추는 방식입니다.",
    details: uniqTop(details, 8),
    strengths: [
      "자기 메시지를 정리하면 존재감이 자연스럽게 커집니다.",
      "완성도와 진정성의 균형 감각을 키울 여지가 큽니다.",
      "작은 성과를 누적해 신뢰를 만드는 타입입니다.",
    ],
    cautions: [
      "평가 불안을 이유로 공개를 미루면 흐름이 끊길 수 있습니다.",
      "브랜딩 방향이 자주 바뀌면 에너지가 분산됩니다.",
      "한 번의 반응으로 자기 가치를 급히 재단하지 마세요.",
    ],
    todayAdvice: "오늘은 나를 설명하는 키워드 3개를 적고, 그중 1개만 콘텐츠에 반영해 보세요.",
    sevenDayPractice: "7일 동안 매일 10분씩 결과물을 공개 가능한 형태로 정리해, 주말에 1개를 실제로 공유해 보세요.",
    emphasisScore,
  };
}

function buildMoneyLineCard(canonical: CanonicalPalmReading, purpose: PalmAnalysisPurpose): PalmInterpretationCard {
  const key: CardKey = "moneyLine";
  const emphasisScore = purposeEmphasis(key, purpose);
  const sides = collectSides(canonical);
  const entries = sides
    .map((s) => ({
      side: s.side,
      role: s.role,
      line: s.reading.minorLines.moneyLine,
    }))
    .filter((x) => x.line.detected);

  if (entries.length === 0) {
    return fallbackCard(key, "재물선", purpose, emphasisScore);
  }

  const details = entries.flatMap((item) => {
    const role = `${sideKo(item.side)}(${roleKo(item.role)})`;
    return [
      `${role}의 재물선은 돈의 결과를 단정하기보다 자원 운용 습관을 보여줍니다.`,
      `${role}에서 ${lineStrengthText(item.line.strength)}로 기록되었습니다.`,
      `${role} 요약: ${item.line.summary || "가치 창출과 지출 판단의 균형이 핵심입니다."}`,
      "재물선은 큰 행운보다 작은 거래 감각과 반복 가능한 수익 구조를 중시합니다.",
      "지출 기준이 명확할수록 불필요한 소모가 줄고, 투자 판단의 일관성이 생깁니다.",
      "가치가 높은 일에 시간을 먼저 배치하면 수익 체감이 서서히 상승합니다.",
    ];
  });

  return {
    key,
    title: "재물선",
    oneLiner: "재물선은 부의 확정 선언이 아니라, 돈을 다루는 습관과 가치 창출 방식의 지도입니다.",
    details: uniqTop(details, 8),
    strengths: [
      "돈의 흐름을 관찰하고 기준을 세울 잠재력이 있습니다.",
      "거래에서 중요한 우선순위를 학습하는 속도가 빠른 편입니다.",
      "생활비와 성장비를 분리하면 재정 안정감이 커질 수 있습니다.",
    ],
    cautions: [
      "기분에 따른 즉흥 결제는 후회 비용을 키울 수 있습니다.",
      "짧은 성과에만 집착하면 장기 가치가 약해질 수 있습니다.",
      "불안할수록 숫자를 회피하지 말고 더 자주 확인하세요.",
    ],
    todayAdvice: "오늘 결제 1건은 금액보다 목적 문장을 먼저 적고 실행하세요.",
    sevenDayPractice: "7일 동안 지출을 필요/성장/위안 3분류로 기록하고, 위안 지출 중 1개를 더 건강한 대안으로 바꿔 보세요.",
    emphasisScore,
  };
}

function buildMarriageLineCard(canonical: CanonicalPalmReading, purpose: PalmAnalysisPurpose): PalmInterpretationCard {
  const key: CardKey = "marriageLine";
  const emphasisScore = purposeEmphasis(key, purpose);
  const sides = collectSides(canonical);
  const entries = sides
    .map((s) => ({
      side: s.side,
      role: s.role,
      line: s.reading.minorLines.marriageLine,
    }))
    .filter((x) => x.line.detected);

  if (entries.length === 0) {
    return fallbackCard(key, "결혼선", purpose, emphasisScore);
  }

  const details = entries.flatMap((item) => {
    const role = `${sideKo(item.side)}(${roleKo(item.role)})`;
    return [
      `${role}의 결혼선은 관계의 횟수를 말하지 않고, 깊은 약속을 다루는 방식을 보여줍니다.`,
      `${role}에서 ${lineStrengthText(item.line.strength)} 신호가 기록되었습니다.`,
      `${role} 요약: ${item.line.summary || "안정감과 책임의 균형을 찾는 흐름입니다."}`,
      "이 선은 어떤 관계가 오래 가는지를 묻기보다, 어떤 약속 구조에서 마음이 편안해지는지를 묻습니다.",
      "정서적 안정은 감정 표현 빈도보다 기대치 합의의 선명도에서 커집니다.",
      "관계의 질은 속도보다 신뢰 규칙을 함께 설계하는 능력에서 길러집니다.",
    ];
  });

  return {
    key,
    title: "결혼선",
    oneLiner: "결혼선은 횟수 예언이 아니라, 깊은 관계에서 원하는 안정감과 약속의 방식을 읽는 선입니다.",
    details: uniqTop(details, 8),
    strengths: [
      "관계의 약속 기준을 점검하는 성숙한 감각이 있습니다.",
      "신뢰가 형성되면 안정감을 오래 유지할 잠재력이 있습니다.",
      "관계 규칙을 언어화하면 갈등 복구 속도가 빨라집니다.",
    ],
    cautions: [
      "기대치가 말해지지 않으면 서운함이 누적될 수 있습니다.",
      "침묵을 배려로 오해하면 거리감이 커질 수 있습니다.",
      "불안을 확인 없는 추측으로 채우지 않도록 주의하세요.",
    ],
    todayAdvice: "오늘은 관계에서 꼭 지키고 싶은 약속 1개를 부드럽게 공유해 보세요.",
    sevenDayPractice: "7일 동안 관계에서 편안했던 순간과 불편했던 순간을 각각 1개씩 기록해, 주말에 공통 조건을 정리하세요.",
    emphasisScore,
  };
}

function mountText(v: PalmMountFullness): string {
  if (v === "strong") return "강하게 활성";
  if (v === "medium") return "균형 있게 활성";
  if (v === "weak") return "보완이 필요한 상태";
  return "판독 보류 상태";
}

function buildMountsCard(canonical: CanonicalPalmReading, purpose: PalmAnalysisPurpose): PalmInterpretationCard {
  const key: CardKey = "mounts";
  const emphasisScore = purposeEmphasis(key, purpose);
  const sides = collectSides(canonical);

  if (sides.length === 0) {
    return fallbackCard(key, "손바닥 구丘", purpose, emphasisScore);
  }

  const details: string[] = [];

  for (const item of sides) {
    const role = `${sideKo(item.side)}(${roleKo(item.role)})`;
    const m = item.reading.mounts;
    details.push(
      `${role} 기준 금성구는 ${mountText(m.venus.fullness)}으로 욕망과 애착의 온도를 보여줍니다.`,
      `${role} 기준 수성구는 ${mountText(m.mercury.fullness)}으로 거래 감각과 소통 민첩성을 시사합니다.`,
      `${role} 기준 태양구는 ${mountText(m.sun.fullness)}으로 표현력과 존재감의 사용 방식이 드러납니다.`,
      `${role} 기준 화성구는 ${mountText(m.mars.fullness)}으로 추진력과 갈등 대응 탄성이 읽힙니다.`,
      `${role} 기준 월구는 ${mountText(m.moon.fullness)}으로 상상력과 감정 파동의 깊이를 비춥니다.`,
      `${role} 요약: ${m.venus.summary || "욕망 에너지의 기본 결을 관찰 중입니다."} / ${m.mercury.summary || "소통-거래 리듬을 관찰 중입니다."}`,
    );
  }

  if (purpose === "personality") {
    details.push("성향 해석에서는 손형과 구丘의 조합을 함께 보며, 생각-감정-행동의 기본 템포를 맞춥니다.");
  }

  if (purpose === "relationship") {
    details.push("관계 해석에서는 금성구와 월구의 균형을 중심으로 친밀감과 거리 조절의 리듬을 읽습니다.");
  }

  if (purpose === "wealth") {
    details.push("재물 해석에서는 수성구와 태양구를 함께 보며, 가치 전달과 거래 설계의 습관을 정리합니다.");
  }

  return {
    key,
    title: "손바닥 구丘",
    oneLiner: "구丘는 욕망, 재능, 감정, 추진력, 상상력, 표현력이 어디서 강해지는지 보여주는 에너지 지도입니다.",
    details: uniqTop(details, 8),
    strengths: [
      "강한 영역을 의식하면 재능 사용의 효율이 높아집니다.",
      "약한 영역을 루틴으로 보완하면 균형이 빨리 회복됩니다.",
      "목적별로 에너지 분배를 설계할 수 있는 여지가 큽니다.",
    ],
    cautions: [
      "강한 영역만 과사용하면 관계와 일상 균형이 무너질 수 있습니다.",
      "약한 영역을 결점으로 단정하면 성장 동력이 줄어듭니다.",
      "기분에 따라 에너지 배분이 흔들리는 패턴을 방치하지 마세요.",
    ],
    todayAdvice: "오늘은 가장 강한 구丘 1개와 보완이 필요한 구丘 1개를 골라 행동 한 가지씩 연결해 보세요.",
    sevenDayPractice: "7일 동안 금성구(관계), 수성구(돈/소통), 화성구(추진) 기준으로 하루 행동을 1개씩 체크해 에너지 편중을 조정하세요.",
    emphasisScore,
  };
}

function sanitizeForbiddenExpressionsInText(text: string, found: Set<string>): string {
  let out = text;
  for (const phrase of FORBIDDEN_PHRASES) {
    if (out.includes(phrase)) {
      found.add(phrase);
      out = out.split(phrase).join("단정할 수 없습니다");
    }
  }
  return out;
}

function sanitizeCard(card: PalmInterpretationCard, found: Set<string>): PalmInterpretationCard {
  return {
    ...card,
    oneLiner: sanitizeForbiddenExpressionsInText(card.oneLiner, found),
    details: card.details.map((x) => sanitizeForbiddenExpressionsInText(x, found)),
    strengths: card.strengths.map((x) => sanitizeForbiddenExpressionsInText(x, found)),
    cautions: card.cautions.map((x) => sanitizeForbiddenExpressionsInText(x, found)),
    todayAdvice: sanitizeForbiddenExpressionsInText(card.todayAdvice, found),
    sevenDayPractice: sanitizeForbiddenExpressionsInText(card.sevenDayPractice, found),
  };
}

function uniquifySentence(text: string, cardTitle: string, seen: Set<string>): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (!seen.has(trimmed)) {
    seen.add(trimmed);
    return trimmed;
  }

  const tagged = `${trimmed} (${cardTitle} 관점)`;
  if (!seen.has(tagged)) {
    seen.add(tagged);
    return tagged;
  }

  let index = 2;
  while (true) {
    const candidate = `${tagged} ${index}`;
    if (!seen.has(candidate)) {
      seen.add(candidate);
      return candidate;
    }
    index += 1;
  }
}

function enforceCardSentenceUniqueness(cards: PalmInterpretationCard[]): PalmInterpretationCard[] {
  const seen = new Set<string>();

  return cards.map((card) => ({
    ...card,
    oneLiner: uniquifySentence(card.oneLiner, card.title, seen),
    details: card.details.map((line) => uniquifySentence(line, card.title, seen)),
    strengths: card.strengths.map((line) => uniquifySentence(line, card.title, seen)),
    cautions: card.cautions.map((line) => uniquifySentence(line, card.title, seen)),
    todayAdvice: uniquifySentence(card.todayAdvice, card.title, seen),
    sevenDayPractice: uniquifySentence(card.sevenDayPractice, card.title, seen),
  }));
}

export function buildPalmInterpretationReport(canonical: CanonicalPalmReading): PalmInterpretationReport {
  const purpose = canonical.profile.analysisPurpose || "general";

  const unsorted: PalmInterpretationCard[] = [
    buildLifeLineCard(canonical, purpose),
    buildHeadLineCard(canonical, purpose),
    buildHeartLineCard(canonical, purpose),
    buildFateLineCard(canonical, purpose),
    buildSunLineCard(canonical, purpose),
    buildMoneyLineCard(canonical, purpose),
    buildMarriageLineCard(canonical, purpose),
    buildMountsCard(canonical, purpose),
  ];

  const orderIndex = new Map<CardKey, number>();
  BASE_ORDER.forEach((k, i) => orderIndex.set(k, i));

  const cards = unsorted.sort((a, b) => {
    if (b.emphasisScore !== a.emphasisScore) return b.emphasisScore - a.emphasisScore;
    return (orderIndex.get(a.key) || 0) - (orderIndex.get(b.key) || 0);
  });

  const forbiddenFound = new Set<string>();
  const sanitizedCards = cards.map((card) => sanitizeCard(card, forbiddenFound));
  const uniqueCards = enforceCardSentenceUniqueness(sanitizedCards);

  return {
    generatedAt: new Date().toISOString(),
    analysisPurpose: purpose,
    tone: "동양적, 따뜻함, 구체적, 신비롭지만 과장하지 않음, 성향과 습관의 지도",
    policy: {
      imageDirectVisionUsed: false,
      source: "canonicalPalmReading",
      forbiddenExpressionFiltered: true,
      forbiddenMatches: Array.from(forbiddenFound),
    },
    focusSummary: purposeFocusSummary(purpose),
    cards: uniqueCards,
  };
}
