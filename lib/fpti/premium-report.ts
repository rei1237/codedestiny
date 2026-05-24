import type { FptiAnalysisResult } from "./fpti-types";

type Primitive = string | number | boolean | null | undefined;

type DimensionScores = {
  energy: number;
  judgment: number;
  execution: number;
  vision: number;
};

export type FptiPremiumInput = {
  answers?: Array<Record<string, Primitive>>;
  scoreMap?: Record<string, number>;
  selectedOptions?: string[];
  userName?: string;
  birthProfile?: Record<string, Primitive>;
  sajuSummary?: string;
  fptiType?: string;
  fptiSubtype?: string;
  dimensionScores?: Partial<DimensionScores>;
  createdAt?: string;
  result?: FptiAnalysisResult;
};

export type FptiPremiumChapter = {
  id: string;
  title: string;
  content: string;
};

export type FptiPremiumReport = {
  typeCode: string;
  typeName: string;
  subtitle: string;
  summary: string;
  dimensionScores: DimensionScores;
  dominantTraits: string[];
  hiddenTraits: string[];
  relationshipPattern: string;
  careerPattern: string;
  wealthPattern: string;
  stressPattern: string;
  growthPattern: string;
  chapters: FptiPremiumChapter[];
};

const CHAPTER_MIN = 2500;
const FORBIDDEN_MARKERS = [
  "placeholder",
  "mock",
  "fallback",
  "undefined",
  "null",
  "nan",
  "quota",
  "generativelanguage",
  "gemini",
  "openai",
  "generatecontent",
  "api error",
  "llm",
];

const CHAPTER_SPECS = [
  { id: "overview", title: "I. FPTI 유형 총론 - 내 운명 성향의 핵심 구조" },
  { id: "inner", title: "II. 내면 성격과 감정 패턴" },
  { id: "relationship", title: "III. 관계와 연애 패턴" },
  { id: "career", title: "IV. 일과 재능의 사용 방식" },
  { id: "wealth", title: "V. 돈과 현실 감각" },
  { id: "stress", title: "VI. 스트레스와 그림자 성향" },
  { id: "growth", title: "VII. 성장 전략과 실행 로드맵" },
] as const;

type ChapterId = (typeof CHAPTER_SPECS)[number]["id"];

const AXIS_TEXT = {
  energy: {
    high: "에너지를 바깥으로 발산할수록 판단이 빨라지고 추진 리듬이 살아나는 편입니다.",
    balanced: "상황에 따라 바깥 행동과 내면 정리를 균형 있게 오가며 컨디션을 조절합니다.",
    low: "외부 자극보다 내면 정리 시간에서 에너지를 회복하며 장기 집중력이 강해집니다.",
  },
  judgment: {
    high: "사람의 의도와 분위기를 빠르게 읽어 공감 기반의 결정을 내리는 능력이 강합니다.",
    balanced: "감정 신호와 논리 근거를 함께 점검해 실수 가능성을 줄이는 선택을 선호합니다.",
    low: "원칙, 구조, 우선순위를 먼저 세운 뒤 감정을 배치해 결정 정확도를 확보합니다.",
  },
  execution: {
    high: "초기 탐색을 넓게 가져가며 실행 중에 방법을 조정하는 유연 전개형에 가깝습니다.",
    balanced: "탐색과 구조화를 적절히 섞어 속도와 완성도를 동시에 관리합니다.",
    low: "정해진 절차를 만들고 반복 숙련으로 완성도를 끌어올리는 구축형 실행이 강점입니다.",
  },
  vision: {
    high: "현실 지표, 자원, 일정, 리스크를 먼저 계산해 결과를 안정적으로 쌓는 경향이 강합니다.",
    balanced: "현실성과 의미를 함께 보며 단기 성과와 장기 방향을 동시에 조율합니다.",
    low: "숫자보다 방향성과 의미를 먼저 잡고, 이후 구체화하는 비전 선도형 사고가 두드러집니다.",
  },
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function scoreBand(score: number): "veryHigh" | "high" | "balanced" | "low" | "veryLow" {
  if (score >= 85) return "veryHigh";
  if (score >= 70) return "high";
  if (score >= 45) return "balanced";
  if (score >= 30) return "low";
  return "veryLow";
}

function makeDimensionScores(input: FptiPremiumInput): DimensionScores {
  const fromInput = input.dimensionScores || {};
  const fromResult = input.result?.axisScores;

  const energy = clamp(
    toNumber(fromInput.energy, NaN)
      || toNumber(fromResult?.A, NaN)
      || toNumber(input.scoreMap?.energy, NaN)
      || 50,
  );

  const judgment = clamp(
    toNumber(fromInput.judgment, NaN)
      || toNumber(fromResult?.H, NaN)
      || toNumber(input.scoreMap?.judgment, NaN)
      || 50,
  );

  const execution = clamp(
    toNumber(fromInput.execution, NaN)
      || toNumber(fromResult?.F, NaN)
      || toNumber(input.scoreMap?.execution, NaN)
      || 50,
  );

  const vision = clamp(
    toNumber(fromInput.vision, NaN)
      || toNumber(fromResult?.R, NaN)
      || toNumber(input.scoreMap?.vision, NaN)
      || 50,
  );

  return { energy, judgment, execution, vision };
}

function dominantAxis(scores: DimensionScores) {
  const pairs: Array<[keyof DimensionScores, number]> = Object.entries(scores) as Array<[keyof DimensionScores, number]>;
  return pairs.sort((a, b) => b[1] - a[1]).map(([key]) => key);
}

function axisComment(key: keyof DimensionScores, score: number): string {
  const band = scoreBand(score);
  if (band === "veryHigh" || band === "high") return AXIS_TEXT[key].high;
  if (band === "balanced") return AXIS_TEXT[key].balanced;
  return AXIS_TEXT[key].low;
}

function buildTraits(scores: DimensionScores): { dominantTraits: string[]; hiddenTraits: string[] } {
  const order = dominantAxis(scores);
  const dominantTraits = [
    `${order[0]} 축이 현재 선택과 행동 리듬을 가장 강하게 주도합니다.`,
    `${order[1]} 축이 2차 의사결정 기준으로 작동하며 안정성을 보강합니다.`,
    `결정 직전에는 ${order[0]} 관점이 먼저 떠오르고, 검토 단계에서 ${order[1]} 관점이 정밀도를 높입니다.`,
  ];

  const hiddenTraits = [
    `${order[3]} 축은 평상시에는 조용하지만 압박 상황에서 보완 카드로 나타납니다.`,
    `${order[2]} 축은 피로가 누적될 때 약해지기 쉬워 의식적 루틴 설계가 필요합니다.`,
    "겉으로 보이는 패턴과 다르게, 내면에서는 안정과 확신을 확보한 뒤 움직이려는 경향이 공존합니다.",
  ];

  return { dominantTraits, hiddenTraits };
}

function joinParagraphs(paragraphs: string[]): string {
  return paragraphs.map((p) => p.trim()).filter(Boolean).join("\n\n");
}

function trigrams(text: string): Set<string> {
  const normalized = text.replace(/\s+/g, " ").trim();
  const out = new Set<string>();
  if (normalized.length < 3) {
    if (normalized) out.add(normalized);
    return out;
  }
  for (let i = 0; i < normalized.length - 2; i += 1) {
    out.add(normalized.slice(i, i + 3));
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const item of a) if (b.has(item)) inter += 1;
  const union = a.size + b.size - inter;
  if (!union) return 0;
  return inter / union;
}

export function dedupeParagraphs(paragraphs: string[]): string[] {
  const accepted: string[] = [];
  const gramCache: Array<Set<string>> = [];
  const headingSeen = new Set<string>();
  const actionSeen = new Set<string>();

  for (const raw of paragraphs) {
    const p = clean(raw);
    if (!p) continue;

    const heading = p.match(/^([IVX]+\.|\d+\.|[가-힣A-Za-z ]{2,40}:)/)?.[1]?.toLowerCase() || "";
    if (heading) {
      if (headingSeen.has(heading)) continue;
      headingSeen.add(heading);
    }

    const actionKey = p
      .replace(/\s+/g, " ")
      .replace(/[0-9]+일|[0-9]+주차/g, "")
      .slice(0, 120)
      .toLowerCase();

    if (actionKey.includes("실행") || actionKey.includes("루틴") || actionKey.includes("전략")) {
      if (actionSeen.has(actionKey)) continue;
      actionSeen.add(actionKey);
    }

    const grams = trigrams(p);
    const isTooSimilar = gramCache.some((g) => jaccard(g, grams) >= 0.8);
    if (isTooSimilar) continue;

    accepted.push(p);
    gramCache.push(grams);
  }

  return accepted;
}

function chapterCoreParagraphs(chapterId: ChapterId, report: Omit<FptiPremiumReport, "chapters">): string[] {
  const name = clean(report.typeName || "분석 대상");
  const code = clean(report.typeCode || "FPTI");
  const s = report.dimensionScores;
  const created = clean(report.subtitle);

  const base = [
    `${name}(${code}) 유형의 핵심 흐름은 점수 구조에서 분명하게 확인됩니다. 에너지 ${s.energy}점, 판단 ${s.judgment}점, 실행 ${s.execution}점, 전망 ${s.vision}점의 조합은 단순한 성격 표기가 아니라 실제 선택 장면에서 우선순위를 어떻게 세우는지 보여주는 근거입니다. ${axisComment("energy", s.energy)} ${axisComment("judgment", s.judgment)} ${axisComment("execution", s.execution)} ${axisComment("vision", s.vision)} 이 네 축이 서로 맞물리며 오늘의 행동 품질과 관계 온도를 동시에 결정합니다.`,
    `이 리포트는 ${created} 기준 데이터로 조립되었고, 결과 문장은 사전에 정의된 규칙 템플릿과 점수 구간 매핑으로만 구성됩니다. 따라서 본문은 감정적 과장이나 단발성 표현보다 반복 가능한 행동 구조를 우선합니다. 읽는 동안 중요한 포인트는 "내가 왜 이런 선택을 반복하는지", "언제 강점이 성과로 전환되는지", "어떤 조건에서 소모가 커지는지"입니다. 이 세 질문을 축 기준으로 보면 현재 패턴의 원인과 개선 경로가 동시에 보입니다.`,
  ];

  if (chapterId === "overview") {
    return [
      ...base,
      `총론에서 가장 먼저 확인할 부분은 주도 축과 보조 축의 결합입니다. 주도 축은 현재의 즉시 반응을 만들고, 보조 축은 반응의 방향을 교정합니다. 예를 들어 에너지 축이 높고 판단 축이 균형 구간이라면 빠른 반응성과 점검 능력이 함께 작동해 실행력이 높아집니다. 반대로 실행 축은 높지만 전망 축이 낮은 구간이면 초기 추진은 강해도 장기 지표 정리가 늦어질 수 있습니다. 이런 조합 해석은 "성격 진단"이 아니라 "운영 전략"에 가깝고, 실제로 일정 설계, 의사결정 타이밍, 협업 구조에서 즉시 적용할 수 있습니다.`,
      `또한 총론은 강점만 강조하지 않습니다. 같은 강점도 맥락이 바뀌면 부담으로 돌아올 수 있기 때문입니다. 빠른 공감은 관계를 열어 주지만 경계가 흐려지면 과잉 책임으로 이어질 수 있고, 강한 구조 판단은 품질을 올리지만 불확실성 단계에서는 탐색을 늦출 수 있습니다. 그러므로 총론의 목적은 "나는 이런 사람"이라는 고정 라벨이 아니라 "나는 어떤 조건에서 가장 잘 작동하고 어떤 조건에서 흔들리는가"를 명확히 하는 데 있습니다.`,
    ];
  }

  if (chapterId === "inner") {
    return [
      ...base,
      `내면 패턴을 읽을 때는 감정의 강도보다 회복 방식이 더 중요합니다. 감정 반응이 빠른 사람도 회복 루틴이 안정적이면 오히려 장기 성과가 높고, 겉으로 차분해 보여도 회복 루틴이 없으면 피로가 누적됩니다. 현재 점수 구조에서는 "자극-해석-반응" 사이의 간격을 의식적으로 설계하는 것이 핵심입니다. 즉시 반응 대신 10분 기록, 1회 심호흡, 우선순위 3개 재정렬 같은 짧은 개입만으로도 감정 소모를 크게 줄일 수 있습니다.`,
      `혼자 있을 때와 사람 사이에 있을 때의 차이도 분명합니다. 혼자 있을 때는 사고 깊이가 올라가고, 사람 속에서는 판단 속도가 올라갑니다. 이 차이를 모르면 자기 비난으로 이어지기 쉽습니다. "왜 혼자서는 잘되는데 같이 있으면 흔들릴까" 혹은 "왜 혼자일 때는 느린데 회의에서는 빠를까" 같은 의문은 결함이 아니라 컨텍스트 전환의 자연스러운 결과입니다. 따라서 회복 전략은 고립이나 과몰입 중 하나를 택하는 방식이 아니라, 두 모드를 의도적으로 오가는 스케줄링이 되어야 합니다.`,
    ];
  }

  if (chapterId === "relationship") {
    return [
      ...base,
      `관계와 연애에서는 끌림의 기준과 유지의 기준이 다르게 작동합니다. 처음에는 대화 리듬, 분위기 안정감, 가치관의 결이 강하게 보이지만, 유지 단계에서는 갈등 처리 방식과 경계 합의가 훨씬 중요해집니다. 현재 구조는 초기 연결이 빠른 편이지만 장기 만족을 위해서는 "표현 빈도", "거리 조절", "결정 책임"을 명시적으로 합의하는 편이 안전합니다. 합의가 없으면 기대치 불일치가 반복되고, 합의가 있으면 같은 차이가 오히려 관계의 개성으로 전환됩니다.`,
      `반복되는 문제는 보통 내용이 아니라 처리 순서에서 생깁니다. 감정이 올라온 직후 결론부터 내리면 상대는 통제받는 느낌을 받고, 사실 확인 없이 공감만 하면 실제 문제는 남습니다. 이 유형에 맞는 기본 순서는 "사실 확인 -> 감정 명명 -> 요청 제안 -> 재확인"입니다. 특히 애정 표현은 강도보다 빈도와 일관성이 중요합니다. 큰 이벤트보다 작은 신호를 꾸준히 유지하면 신뢰가 누적되고, 갈등 이후 회복 속도도 빨라집니다.`,
    ];
  }

  if (chapterId === "career") {
    return [
      ...base,
      `일과 재능 영역에서는 "무엇을 잘하느냐"보다 "어떤 방식에서 성과가 나는가"가 본질입니다. 같은 업무라도 탐색형 접근이 맞는 시기가 있고 구축형 접근이 맞는 시기가 다릅니다. 현재 점수 조합은 초반 설계와 후반 마감의 리듬을 분리할 때 성과가 높습니다. 예를 들어 월요일은 탐색/정리, 화수는 실행/협업, 목금은 검토/완성으로 루틴을 고정하면 에너지 낭비를 크게 줄일 수 있습니다.`,
      `협업과 독립의 균형도 중요합니다. 협업에서는 의사결정 기준을 먼저 공유하고, 독립 작업에서는 산출물 포맷을 먼저 정의해야 충돌이 줄어듭니다. 특히 집중력이 떨어지는 구간은 의지 부족이 아니라 작업 단위가 너무 크기 때문인 경우가 많습니다. 작업 단위를 25분 단위로 쪼개고 완료 기준을 문장으로 적으면 실행 저항이 낮아집니다. 재능은 타고난 성향이 아니라 반복 가능한 환경 설계에서 체감됩니다.`,
    ];
  }

  if (chapterId === "wealth") {
    return [
      ...base,
      `돈과 현실 감각은 성격보다 시스템의 문제에 가깝습니다. 현재 구조에서 중요한 것은 수입 확대 이전에 지출 흐름을 시각화하는 것입니다. 소비는 감정 조절, 보상, 불안 완화와 연결되어 있기 때문에 숫자만으로 통제하려 하면 오래가기 어렵습니다. 따라서 예산은 금지 목록이 아니라 "기본 유지", "성장 투자", "실험 비용"의 세 통로로 나누어야 합니다. 이 방식은 죄책감 없는 소비와 계획된 축적을 동시에 가능하게 합니다.`,
      `리스크 관리는 보수성의 문제가 아니라 복구 속도의 문제입니다. 손실을 완전히 피하는 전략보다 손실이 발생해도 빠르게 복귀할 수 있는 구조가 장기적으로 유리합니다. 예를 들어 월간 고정 지출 상한, 단일 투자 비중 상한, 충동 구매 대기 시간 24시간 같은 규칙은 단순하지만 효과가 큽니다. 현실 감각이 높은 유형일수록 완벽한 타이밍을 기다리다 기회를 놓치기 쉬우므로, 작은 실험을 반복해 데이터로 판단하는 습관이 필요합니다.`,
    ];
  }

  if (chapterId === "stress") {
    return [
      ...base,
      `스트레스 국면에서는 평소 장점이 그림자로 뒤집히는 순간을 먼저 포착해야 합니다. 책임감은 과잉 책임으로, 공감 능력은 감정 과부하로, 실행력은 조급한 결론으로 변할 수 있습니다. 이 전환 신호를 조기에 감지하면 큰 붕괴를 막을 수 있습니다. 신호 예시는 수면 리듬 붕괴, 대화 회피, 반복 확인, 사소한 자극 과민 반응입니다. 신호가 2개 이상 겹치면 즉시 속도를 늦추고 "결정 유예" 규칙을 적용해야 합니다.`,
      `주의해야 할 선택은 대부분 피로 상태에서 발생합니다. 피로 상태에서의 결정은 단기 해소를 우선하고 장기 비용을 과소평가합니다. 따라서 위기 대응은 의지 싸움이 아니라 자동 규칙이어야 합니다. 예를 들어 중요한 메시지는 30분 후 재검토, 금전 결정은 다음 날 오전 재확인, 관계 갈등은 기록 후 대화 예약 같은 규칙을 고정하면 후회 비용이 크게 줄어듭니다. 회복 루틴은 특별한 날이 아니라 평일 구조 속에 들어가야 지속됩니다.`,
    ];
  }

  return [
    ...base,
    `성장 전략은 강점 강화와 약점 보완을 동시에 설계해야 효과가 납니다. 강점만 밀면 편향이 커지고, 약점만 보완하면 동력이 사라집니다. 현재 조합에서는 "강점 1개를 매일 사용"하고 "약점 1개를 주간 단위로 교정"하는 이중 구조가 적합합니다. 즉 하루는 실행 감각을 살리고, 주간에는 방향을 교정하는 방식입니다. 이 구조를 유지하면 성과의 일관성과 심리적 안정이 함께 올라갑니다.`,
    `7일 계획은 행동 착수와 리듬 회복에 초점을 두고, 30일 계획은 시스템 고정과 재발 방지에 초점을 둬야 합니다. 7일 동안은 기록, 정리, 실행 단계를 단순화해 성공 경험을 빠르게 확보하고, 30일 동안은 예산, 일정, 관계, 회복 루틴을 하나의 캘린더로 통합합니다. 장기 기준은 "내가 흔들릴 때도 지킬 수 있는 규칙인가"입니다. 지키기 어려운 거대한 목표보다, 반복 가능한 작은 기준이 운명의 방향을 바꿉니다.`,
  ];
}

function chapterExpansionBank(chapterId: ChapterId, report: Omit<FptiPremiumReport, "chapters">): string[] {
  const s = report.dimensionScores;
  const user = clean(report.subtitle.split("|")[0]);
  const prefix = `${user} 관점에서`; 

  const routines = [
    `${prefix} 하루 시작 15분은 감정 상태를 숫자로 기록하고, 당일 최우선 과제 1개를 문장으로 선언하세요. 선언된 문장이 있으면 실행 저항이 줄고 완료율이 올라갑니다.`,
    `회의나 대화 전에는 기대 결과를 1문장으로 정리하고, 종료 후 실제 결과를 1문장으로 비교하세요. 이 반복은 판단 정확도를 높이고 불필요한 자기 소모를 줄입니다.`,
    `주 1회는 "중단할 행동 2개"를 고르는 시간을 확보하세요. 성장은 추가보다 제거에서 더 빠르게 일어나는 경우가 많습니다.`,
    `관계 피로가 올라올 때는 즉시 거리를 끊기보다, 대화 빈도와 시간을 조정해 리듬을 회복하세요. 조절 가능한 경계는 단절보다 지속 가능성이 높습니다.`,
    `재정 스트레스가 느껴지는 날에는 소비 결정을 미루고 기록만 남기세요. 기록은 통제감을 회복시키고 충동 결정을 줄입니다.`,
    `실행력이 떨어지는 날은 목표를 줄이지 말고 단위를 줄이세요. 5분 착수 규칙은 심리적 저항을 낮추는 가장 단순한 장치입니다.`,
    `성과가 좋아지는 구간에서도 점검 루틴을 유지해야 합니다. 상승기에는 리스크가 과소평가되기 쉬워 작은 규칙이 안전장치가 됩니다.`,
    `자기비판이 길어질 때는 평가 언어를 관찰 언어로 바꾸세요. "왜 못했지" 대신 "어디에서 멈췄지"를 쓰면 수정 가능성이 커집니다.`,
  ];

  const scoreDetail = [
    `에너지 ${s.energy}점 구간은 외부 자극과 내면 회복의 균형 조절이 핵심입니다. 일정에 회복 슬롯이 없으면 후반 집중력이 급격히 떨어질 수 있습니다.`,
    `판단 ${s.judgment}점 구간은 공감과 논리의 교차점에서 품질이 결정됩니다. 감정 신호와 데이터 근거를 함께 적는 습관이 필요합니다.`,
    `실행 ${s.execution}점 구간은 시작 속도와 마감 완성도의 균형이 과제입니다. 시작 단계의 유연성과 마감 단계의 구조화를 분리해 설계하세요.`,
    `전망 ${s.vision}점 구간은 단기 성과와 장기 의미를 동시에 관리해야 안정적입니다. 월간 리뷰에서 두 지표를 함께 확인하세요.`,
  ];

  const chapterFocus: Record<ChapterId, string[]> = {
    overview: [
      "총론에서는 축 해석을 고정 라벨로 쓰지 말고 상황별 운영 원칙으로 전환하는 것이 핵심입니다.",
      "유형 설명을 읽을 때 가장 중요한 질문은 \"내가 반복적으로 강해지는 조건은 무엇인가\"입니다.",
      "주도 축은 행동의 방향을, 보조 축은 행동의 품질을 결정하므로 두 축을 분리해 관찰해야 합니다.",
    ],
    inner: [
      "감정 회복은 휴식의 양보다 전환 의식의 유무에 더 크게 영향을 받습니다.",
      "불안이 커질수록 결론을 급히 내리려는 경향이 생기므로 결론 이전 점검 문장을 준비해야 합니다.",
      "혼자 있을 때의 강점과 사람 속에서의 강점을 각각 다른 자산으로 인정해야 자기효능감이 유지됩니다.",
    ],
    relationship: [
      "애정 표현의 핵심은 강도보다 예측 가능성입니다. 작은 표현을 일정하게 유지하는 편이 신뢰를 만듭니다.",
      "갈등 상황에서는 누가 맞는지보다 다음 행동 규칙을 합의하는 것이 관계 유지에 유리합니다.",
      "거리 조절은 냉담함이 아니라 관계 지속을 위한 기술입니다. 경계가 있어야 친밀도도 유지됩니다.",
    ],
    career: [
      "재능은 직무명이 아니라 문제 해결 방식에서 드러납니다. 자신에게 맞는 해결 패턴을 먼저 정의하세요.",
      "집중력이 낮은 날에도 유지 가능한 최소 작업 단위를 준비하면 성과 곡선이 안정됩니다.",
      "협업에서는 추상 목표보다 완료 정의를 먼저 맞추는 것이 충돌 비용을 줄입니다.",
    ],
    wealth: [
      "돈의 흐름은 의지보다 구조가 결정합니다. 자동화된 규칙을 먼저 설계해야 변동성이 줄어듭니다.",
      "저축과 투자는 상충 관계가 아니라 역할 분담 관계입니다. 목표를 분리하면 스트레스가 줄어듭니다.",
      "현실 전략은 큰 결단보다 작은 규칙의 반복에서 완성됩니다.",
    ],
    stress: [
      "무너짐은 갑자기 오지 않고 전조 신호가 누적되어 나타납니다. 신호 목록을 눈에 보이게 두세요.",
      "회피, 집착, 과잉 책임, 충동성 중 자신에게 자주 나타나는 패턴을 하나씩 이름 붙여 관리하세요.",
      "스트레스 대응은 감정 통제보다 환경 정리가 먼저입니다. 환경이 바뀌면 반응도 바뀝니다.",
    ],
    growth: [
      "7일 계획은 시작 저항을 낮추는 설계, 30일 계획은 유지 마찰을 줄이는 설계로 나누어야 합니다.",
      "장기 기준은 화려함보다 일관성입니다. 지키기 쉬운 기준이 결국 성과를 남깁니다.",
      "성장 로드맵은 성향을 바꾸는 것이 아니라 성향을 잘 쓰는 방법을 배우는 과정입니다.",
    ],
  };

  return [...chapterFocus[chapterId], ...scoreDetail, ...routines];
}

export function expandFptiChapterLocally(
  chapter: FptiPremiumChapter,
  report: Omit<FptiPremiumReport, "chapters">,
): FptiPremiumChapter {
  const baseParagraphs = chapter.content
    .split(/\n\n+/)
    .map((p) => clean(p))
    .filter(Boolean);

  const bank = chapterExpansionBank(chapter.id as ChapterId, report);
  let paragraphs = dedupeParagraphs(baseParagraphs);
  let cursor = 0;

  while (joinParagraphs(paragraphs).length < CHAPTER_MIN) {
    const b = bank[cursor % bank.length];
    const variant = `${b} 이 문장은 ${chapter.title} 맥락에서 현재 점수 구조를 실제 행동으로 연결하기 위한 보강 문단이며, 다음 실행 시점과 점검 기준을 함께 제시해 읽는 사람이 곧바로 적용하도록 설계했습니다.`;
    paragraphs = dedupeParagraphs([...paragraphs, variant]);
    cursor += 1;

    if (cursor > 120) break;
  }

  return {
    ...chapter,
    content: joinParagraphs(paragraphs),
  };
}

export function validateFptiPremiumReport(report: FptiPremiumReport): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(report.chapters) || report.chapters.length === 0) {
    errors.push("chapters 배열이 비어 있습니다.");
    return { valid: false, errors };
  }

  const globalParagraphs: string[] = [];

  for (const chapter of report.chapters) {
    if (!clean(chapter.title)) errors.push(`제목 누락: ${chapter.id}`);
    const content = clean(chapter.content);
    if (!content) errors.push(`본문 누락: ${chapter.id}`);
    if (content.length < CHAPTER_MIN) errors.push(`본문 길이 부족(${CHAPTER_MIN} 미만): ${chapter.id}`);

    const lower = content.toLowerCase();
    for (const marker of FORBIDDEN_MARKERS) {
      if (lower.includes(marker)) {
        errors.push(`금지 마커 포함(${marker}): ${chapter.id}`);
      }
    }

    globalParagraphs.push(...content.split(/\n\n+/).map((p) => clean(p)).filter(Boolean));
  }

  const deduped = dedupeParagraphs(globalParagraphs);
  if (deduped.length !== globalParagraphs.length) {
    errors.push("중복 문단이 감지되었습니다.");
  }

  return { valid: errors.length === 0, errors };
}

function derivePatterns(report: Omit<FptiPremiumReport, "chapters">) {
  const s = report.dimensionScores;
  return {
    relationshipPattern:
      s.judgment >= 70
        ? "공감과 정서 교류가 관계 중심을 형성하며, 표현 빈도와 안정감이 만족도를 크게 좌우합니다."
        : "원칙과 합의를 기반으로 관계를 운영하며, 경계와 약속이 신뢰 형성의 핵심입니다.",
    careerPattern:
      s.execution >= 70
        ? "초기 탐색과 빠른 실행이 강점이며, 주기적 구조화로 완성도를 끌어올릴 때 성과가 커집니다."
        : "절차 설계와 반복 최적화가 강점이며, 체계적인 품질 관리에서 경쟁력이 두드러집니다.",
    wealthPattern:
      s.vision >= 70
        ? "현실 지표 중심의 자원 관리에 강하며, 리스크 한도를 설정하면 안정적으로 확장됩니다."
        : "의미와 방향성을 기반으로 자원을 배분하며, 목표 가시화를 통해 지속성이 높아집니다.",
    stressPattern:
      s.energy >= 70
        ? "외부 과부하가 누적되면 과열 반응이 먼저 나타나므로 속도 조절 규칙이 필요합니다."
        : "내부 소모가 누적되면 회피 경향이 먼저 나타나므로 루틴 기반 재가동이 중요합니다.",
    growthPattern:
      "강점 활용과 약점 보완을 동시에 설계하는 이중 루틴이 가장 빠른 성장 곡선을 만듭니다.",
  };
}

function buildChapter(chapterId: ChapterId, report: Omit<FptiPremiumReport, "chapters">): FptiPremiumChapter {
  const spec = CHAPTER_SPECS.find((s) => s.id === chapterId)!;
  const core = chapterCoreParagraphs(chapterId, report);
  const expanded = expandFptiChapterLocally(
    {
      id: chapterId,
      title: spec.title,
      content: joinParagraphs(dedupeParagraphs(core)),
    },
    report,
  );
  return expanded;
}

export function buildFptiPremiumReport(input: FptiPremiumInput): FptiPremiumReport {
  const typeCode = clean(input.fptiType || input.result?.code || "FPTI");
  const typeName = clean(input.result?.typeName || "사주 성향형");
  const userName = clean(input.userName || input.result?.source?.dayMaster || "사용자");
  const createdAt = clean(input.createdAt || new Date().toISOString());
  const scores = makeDimensionScores(input);
  const traits = buildTraits(scores);

  const subtitle = `${userName} 분석 | ${createdAt.slice(0, 10)}`;
  const summary = `${typeName}(${typeCode})의 축 점수 구조를 기반으로 관계, 일, 돈, 스트레스, 성장 전략을 로컬 규칙으로 심층 해석한 리포트입니다.`;

  const base: Omit<FptiPremiumReport, "chapters"> = {
    typeCode,
    typeName,
    subtitle,
    summary,
    dimensionScores: scores,
    dominantTraits: traits.dominantTraits,
    hiddenTraits: traits.hiddenTraits,
    ...derivePatterns({
      typeCode,
      typeName,
      subtitle,
      summary,
      dimensionScores: scores,
      dominantTraits: traits.dominantTraits,
      hiddenTraits: traits.hiddenTraits,
      relationshipPattern: "",
      careerPattern: "",
      wealthPattern: "",
      stressPattern: "",
      growthPattern: "",
    }),
  };

  let chapters = CHAPTER_SPECS.map((spec) => buildChapter(spec.id, base));

  const allParagraphs = dedupeParagraphs(
    chapters.flatMap((c) => c.content.split(/\n\n+/).map((p) => clean(p)).filter(Boolean)),
  );

  const chapterRebuilt: FptiPremiumChapter[] = [];
  let idx = 0;
  for (const chapter of chapters) {
    const chunkSize = Math.max(6, Math.floor(allParagraphs.length / CHAPTER_SPECS.length));
    const chunk = allParagraphs.slice(idx, idx + chunkSize);
    idx += chunkSize;
    const merged = dedupeParagraphs([...chapter.content.split(/\n\n+/), ...chunk]);
    chapterRebuilt.push(expandFptiChapterLocally({ ...chapter, content: joinParagraphs(merged) }, base));
  }

  chapters = chapterRebuilt.map((c) => ({ ...c, content: joinParagraphs(dedupeParagraphs(c.content.split(/\n\n+/))) }));

  const report: FptiPremiumReport = {
    ...base,
    chapters,
  };

  const validation = validateFptiPremiumReport(report);
  if (!validation.valid) {
    const repaired = {
      ...report,
      chapters: report.chapters.map((chapter) => expandFptiChapterLocally(chapter, base)),
    };
    return repaired;
  }

  return report;
}

export function buildFptiPremiumPdfText(report: FptiPremiumReport): string {
  const lines: string[] = [];
  lines.push(`${report.typeName} (${report.typeCode})`);
  lines.push(report.subtitle);
  lines.push("");
  lines.push(report.summary);
  lines.push("");
  lines.push(`에너지 ${report.dimensionScores.energy} | 판단 ${report.dimensionScores.judgment} | 실행 ${report.dimensionScores.execution} | 전망 ${report.dimensionScores.vision}`);
  lines.push("");

  for (const chapter of report.chapters) {
    lines.push(chapter.title);
    lines.push(chapter.content);
    lines.push("");
  }

  return lines.join("\n");
}
