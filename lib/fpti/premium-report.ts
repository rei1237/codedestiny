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

export type FptiReportCategory = {
  id: string;
  title: string;
  body: string;
  actionTips?: string[];
};

export type FptiPremiumChapter = {
  id: string;
  title: string;
  intro: string;
  analysis: string;
  categories: FptiReportCategory[];
  actionGuide: string;
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

type ChapterSpec = {
  id: string;
  title: string;
  categories: Array<{ id: string; title: string }>;
};

type FptiInterpretationContext = {
  typeCode: string;
  typeName: string;
  subtitle: string;
  scores: DimensionScores;
  socialStyle: string;
  decisionStyle: string;
  executionStyle: string;
  outlookStyle: string;
  stabilityStyle: string;
};

const CATEGORY_MIN = 280;
const CHAPTER_MIN = 1500;

const FORBIDDEN_PHRASES = [
  "축 점수 구조",
  "점수 구간",
  "로컬 규칙",
  "규칙 템플릿",
  "계산 근거",
  "기준 데이터",
  "이 문장은",
  "보강 문단",
  "chapter 1",
  "자동 복구 생성",
  "데이터가 부족합니다",
  "기본 해석",
  "payload",
  "json",
  "에너지 ",
  "판단 ",
  "실행 ",
  "전망 ",
  "핵심 신호를 바탕으로 현재 흐름을 구조적으로 해석합니다",
  "이번 해석은 단정 예언이 아니라 선택의 품질을 높이는 실행형 상담 문장으로 구성됩니다",
  "1단계 실행 포인트를 기준으로 우선순위를 좁혀 적용하면",
];

const CHAPTER_SPECS: ChapterSpec[] = [
  {
    id: "overview",
    title: "I. FPTI 유형 총론 - 나의 운명 성향 코드",
    categories: [
      { id: "core-summary", title: "핵심 성향 요약" },
      { id: "worldview", title: "이 유형이 세상을 인식하는 방식" },
      { id: "decision-pattern", title: "선택과 판단의 기본 패턴" },
      { id: "strength-condition", title: "강점이 발휘되는 조건" },
      { id: "core-keywords", title: "이 유형의 핵심 키워드" },
    ],
  },
  {
    id: "inner",
    title: "II. 내면 성격과 감정 패턴",
    categories: [
      { id: "emotion-motion", title: "감정이 움직이는 방식" },
      { id: "solo-mode", title: "혼자 있을 때의 모습" },
      { id: "social-mode", title: "사람들 속에서의 모습" },
      { id: "anxiety-stress", title: "불안과 스트레스 반응" },
      { id: "recovery-condition", title: "회복에 필요한 조건" },
    ],
  },
  {
    id: "relationship",
    title: "III. 관계와 연애 패턴",
    categories: [
      { id: "approach-style", title: "가까워지는 관계 방식" },
      { id: "attraction-type", title: "끌리는 사람의 유형" },
      { id: "love-strength", title: "연애에서 강해지는 지점" },
      { id: "repeat-issue", title: "반복되는 관계 문제" },
      { id: "healthy-standard", title: "건강한 관계를 위한 기준" },
    ],
  },
  {
    id: "career",
    title: "IV. 일과 재능의 사용 방식",
    categories: [
      { id: "fit-work-style", title: "잘 맞는 일의 방식" },
      { id: "deep-work-env", title: "몰입이 잘 되는 환경" },
      { id: "collab-balance", title: "협업과 독립 작업의 균형" },
      { id: "talent-to-result", title: "재능이 성과로 바뀌는 조건" },
      { id: "avoid-pattern", title: "피해야 할 일의 패턴" },
    ],
  },
  {
    id: "wealth",
    title: "V. 돈과 현실 감각",
    categories: [
      { id: "money-attitude", title: "돈을 바라보는 기본 태도" },
      { id: "spend-save-pattern", title: "소비와 축적의 패턴" },
      { id: "reality-strength", title: "현실 판단의 강점" },
      { id: "risk-condition", title: "재정 리스크가 생기는 조건" },
      { id: "stable-strategy", title: "돈을 안정적으로 다루는 전략" },
    ],
  },
  {
    id: "stress",
    title: "VI. 스트레스와 그림자 성향",
    categories: [
      { id: "collapse-signal", title: "무너질 때 나타나는 신호" },
      { id: "overreaction", title: "과잉 반응 패턴" },
      { id: "shadow-main", title: "주요 그림자 성향" },
      { id: "self-consume-loop", title: "반복되는 자기소모 구조" },
      { id: "recovery-defense", title: "회복 루틴과 방어 전략" },
    ],
  },
  {
    id: "growth",
    title: "VII. 성장 전략과 실행 로드맵",
    categories: [
      { id: "growth-mode", title: "이 유형이 성장하는 방식" },
      { id: "roadmap-7", title: "7일 실천 전략" },
      { id: "roadmap-30", title: "30일 변화 전략" },
      { id: "priority-area", title: "관계/일/돈/건강의 우선순위" },
      { id: "longterm-standard", title: "장기적으로 운명을 바꾸는 선택 기준" },
    ],
  },
];

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

function scoreBand(score: number): "high" | "mid" | "low" {
  if (score >= 67) return "high";
  if (score >= 38) return "mid";
  return "low";
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

function sentenceChunks(text: string): string[] {
  return clean(text)
    .split(/(?<=[.!?。！？])\s+/)
    .map((part) => clean(part));
}

function lineParagraphs(text: string): string[] {
  return clean(text)
    .split(/\n\n+/)
    .map((part) => clean(part));
}

function trigrams(text: string): Set<string> {
  const normalized = clean(text).replace(/\s+/g, " ");
  const set = new Set<string>();
  if (!normalized) return set;
  if (normalized.length < 3) {
    set.add(normalized);
    return set;
  }
  for (let i = 0; i < normalized.length - 2; i += 1) {
    set.add(normalized.slice(i, i + 3));
  }
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

function joinParagraphs(paragraphs: string[]): string {
  return paragraphs.map((p) => clean(p)).filter(Boolean).join("\n\n");
}

function buildInterpretationContext(input: FptiPremiumInput): FptiInterpretationContext {
  const scores = makeDimensionScores(input);
  const socialBand = scoreBand(scores.energy);
  const decisionBand = scoreBand(scores.judgment);
  const executionBand = scoreBand(scores.execution);
  const visionBand = scoreBand(scores.vision);

  const socialStyle =
    socialBand === "high"
      ? "사람과 장면 사이에서 빠르게 기류를 읽고 반응을 여는 편"
      : socialBand === "mid"
        ? "필요할 때는 열고 필요할 때는 물러나며 리듬을 조절하는 편"
        : "내면 정리가 충분할 때 가장 깊은 집중과 통찰이 나오는 편";

  const decisionStyle =
    decisionBand === "high"
      ? "관계의 온도와 정서의 결을 먼저 읽고 결정을 정교하게 맞추는 편"
      : decisionBand === "mid"
        ? "감정과 구조를 함께 점검해 균형 있는 결론을 만드는 편"
        : "기준과 우선순위를 먼저 세우고 흔들림을 줄이는 편";

  const executionStyle =
    executionBand === "high"
      ? "일단 움직이며 길을 찾고 실행 과정에서 완성도를 올리는 편"
      : executionBand === "mid"
        ? "탐색과 정리를 번갈아 사용해 속도와 안정을 같이 가져가는 편"
        : "절차를 세우고 반복해 결과 품질을 밀도 있게 끌어올리는 편";

  const outlookStyle =
    visionBand === "high"
      ? "현실 지표와 생활 구조를 먼저 정리해 지속 가능한 선택을 만드는 편"
      : visionBand === "mid"
        ? "현실성과 의미를 동시에 보며 장단기 균형을 맞추는 편"
        : "먼저 큰 방향과 의미를 확정하고 그다음 세부를 설계하는 편";

  const stabilityStyle =
    socialBand === "low" || executionBand === "low"
      ? "속도를 늦추고 리듬을 정리할 때 안정이 회복되는 흐름"
      : "작은 행동을 지속할 때 안정과 성과가 함께 쌓이는 흐름";

  const typeCode = clean(input.fptiType || input.result?.code || "FPTI");
  const typeName = clean(input.result?.typeName || input.fptiSubtype || "사주 성향형");
  const userName = clean(input.userName || input.result?.source?.dayMaster || "사용자");
  const createdAt = clean(input.createdAt || new Date().toISOString()).slice(0, 10);

  return {
    typeCode,
    typeName,
    subtitle: `${userName} 관측 리포트 | ${createdAt}`,
    scores,
    socialStyle,
    decisionStyle,
    executionStyle,
    outlookStyle,
    stabilityStyle,
  };
}

function buildTraits(ctx: FptiInterpretationContext): { dominantTraits: string[]; hiddenTraits: string[] } {
  return {
    dominantTraits: [
      `${ctx.typeName}의 핵심은 ${ctx.socialStyle}입니다.`,
      `중요한 선택 장면에서는 ${ctx.decisionStyle}으로 정밀도가 살아납니다.`,
      `결과를 쌓는 방식은 ${ctx.executionStyle}이며, 장기 흐름은 ${ctx.outlookStyle}로 안정됩니다.`,
    ],
    hiddenTraits: [
      "겉으로는 단단해 보여도 내면에서는 충분한 납득과 정서적 안전을 확인한 뒤 더 크게 움직입니다.",
      "피로가 누적되면 장점이 과잉 반응으로 바뀌기 쉬워서, 속도 조절과 경계 설정이 성과 유지의 핵심이 됩니다.",
      `결국 이 유형의 지속성은 ${ctx.stabilityStyle}을 생활 루틴으로 고정할 때 가장 강해집니다.`,
    ],
  };
}

function chapterIntro(chapterId: string, ctx: FptiInterpretationContext): string {
  if (chapterId === "overview") return `${ctx.typeName}의 운명 성향 코드는 하나의 라벨이 아니라 반복되는 선택 패턴의 지문입니다. 이 장은 당신의 사고 리듬과 행동 결을 한 눈에 연결해, 왜 어떤 상황에서 강해지고 어떤 장면에서 소모되는지 현실적으로 읽어 줍니다.`;
  if (chapterId === "inner") return `내면 패턴은 감정의 세기가 아니라 복원 방식에서 결정됩니다. 이 장은 당신이 혼자 있을 때와 사람들 속에 있을 때 어떤 방식으로 에너지를 재배치하는지, 그리고 불안을 다룰 때 어떤 순서가 가장 안전한지 선명하게 정리합니다.`;
  if (chapterId === "relationship") return `관계의 품질은 상대 선택보다 관계 운영 방식에서 갈립니다. 이 장은 가까워지는 속도, 거리 조절, 갈등 회복의 흐름을 분리해 읽고, 오래 가는 관계를 만드는 기준을 구체적인 문장으로 제공합니다.`;
  if (chapterId === "career") return `재능은 타고난 성향 자체가 아니라 성향을 쓰는 환경에서 성과로 변합니다. 이 장은 몰입 조건, 협업 구조, 결과 전환 지점을 직무 일반론이 아니라 당신의 행동 패턴에 맞춘 실행 기준으로 제시합니다.`;
  if (chapterId === "wealth") return `돈 문제는 절약 의지보다 운영 구조에서 결판이 납니다. 이 장은 소비와 축적의 리듬, 리스크가 생기는 조건, 안정 전략을 죄책감 없는 현실 언어로 정리해 장기적인 재정 체력을 키우도록 설계했습니다.`;
  if (chapterId === "stress") return `스트레스 장면에서는 장점이 그림자로 변하는 전환점이 존재합니다. 이 장은 무너짐의 신호를 조기에 포착하고, 회피와 과잉 통제를 줄이며, 일상에서 바로 적용 가능한 회복 루틴을 제시합니다.`;
  return `성장은 성격을 바꾸는 일이 아니라 성향을 정교하게 운용하는 일입니다. 이 장은 7일 시작 전략과 30일 구조 전략, 그리고 장기적 선택 기준을 한 흐름으로 연결해 실제 변화가 남도록 돕습니다.`;
}

function chapterAnalysis(chapterId: string, ctx: FptiInterpretationContext): string {
  if (chapterId === "overview") return `당신은 ${ctx.socialStyle}이며, 판단 장면에서는 ${ctx.decisionStyle}이 선명하게 작동합니다. 실행 방식은 ${ctx.executionStyle}이고, 장기 방향은 ${ctx.outlookStyle}으로 안정됩니다. 이 네 축의 결이 맞춰질 때 삶의 밀도가 높아집니다.`;
  if (chapterId === "inner") return `내면에서는 ${ctx.stabilityStyle}이 회복의 중심축이 됩니다. 감정 반응을 통제하려 하기보다, 반응 이후의 순서를 정해 두면 소모가 줄고 집중력이 돌아옵니다.`;
  if (chapterId === "relationship") return `관계에서는 ${ctx.decisionStyle}이 큰 장점이지만, 기대치가 말로 합의되지 않으면 오해가 반복되기 쉽습니다. 그래서 이 유형은 강한 공감과 분명한 경계가 함께 있을 때 관계 만족도가 오래 유지됩니다.`;
  if (chapterId === "career") return `일에서는 ${ctx.executionStyle}과 ${ctx.outlookStyle}의 균형이 성과를 만듭니다. 시작 에너지와 마감 구조를 분리해 운용하면 과부하 없이 완성도가 올라갑니다.`;
  if (chapterId === "wealth") return `재정에서는 ${ctx.outlookStyle}이 핵심 레버입니다. 즉흥적 결정을 줄이고 작은 기준을 반복할수록 불안이 줄고 선택 품질이 높아집니다.`;
  if (chapterId === "stress") return `압박이 커질수록 평소 장점이 과잉으로 치우칠 수 있습니다. 이때는 속도보다 순서, 감정보다 구조를 먼저 세우는 것이 손실을 막는 가장 빠른 길입니다.`;
  return `성장 구간에서는 단기 실행과 장기 방향을 동시에 붙잡아야 합니다. 하루 단위의 실천이 주간 구조와 연결될 때, 변화는 기분이 아니라 시스템으로 남습니다.`;
}

function chapterActionGuide(chapterId: string): string {
  if (chapterId === "overview") return "총론 실전 가이드: 매주 한 번, 잘된 선택 2개와 흔들린 선택 2개를 같은 형식으로 기록해 패턴을 시각화하세요.";
  if (chapterId === "inner") return "내면 실전 가이드: 감정이 크게 출렁인 날에는 즉시 결론을 내리지 말고, 사실 확인-감정 명명-다음 행동 1개 순서로 정리하세요.";
  if (chapterId === "relationship") return "관계 실전 가이드: 애정 표현의 강도를 높이기보다, 빈도와 일관성을 먼저 고정해 신뢰의 예측 가능성을 만드세요.";
  if (chapterId === "career") return "일 실전 가이드: 시작용 작업과 마감용 작업을 분리해 캘린더에 배치하면 집중력 분산을 줄이고 산출물 품질을 올릴 수 있습니다.";
  if (chapterId === "wealth") return "돈 실전 가이드: 지출을 기본 유지, 성장 투자, 실험 비용 세 통로로 분리해 관리하면 통제감과 유연성이 동시에 생깁니다.";
  if (chapterId === "stress") return "스트레스 실전 가이드: 무너짐 신호 3개를 미리 정해 두고 두 개 이상 나타나면 중요한 결정을 하루 유예하는 규칙을 적용하세요.";
  return "성장 실전 가이드: 7일은 착수 습관, 30일은 유지 구조를 목표로 설계하고 매주 일요일 점검으로 다음 주 우선순위를 확정하세요.";
}

function coreFragments(ctx: FptiInterpretationContext): string[] {
  return [
    `${ctx.typeName}인 당신은 보이지 않는 기류를 읽는 능력과 현실을 정리하는 감각이 함께 작동할 때 가장 강해집니다. 그래서 중요한 장면에서 즉흥적으로 밀어붙이기보다, 짧게라도 맥락을 정리한 뒤 선택할 때 결과 품질이 눈에 띄게 안정됩니다. 이 흐름은 성격의 좋고 나쁨이 아니라 작동 방식의 차이이며, 스스로를 몰아붙이기보다 리듬을 설계할 때 장점이 더 또렷하게 드러납니다.`,
    `또한 당신은 관계와 일, 돈의 영역을 완전히 분리해서 판단하기보다 서로 연결된 생태계로 보는 경향이 있습니다. 관계가 흔들리면 실행력이 흔들리고, 일정이 무너지면 재정 판단도 감정적으로 기울 수 있습니다. 반대로 생활 구조가 정돈되면 감정 회복과 성과 창출이 함께 살아나는 구조입니다. 그래서 이 유형의 핵심은 더 많이 하는 것이 아니라, 우선순위를 선명하게 정하고 불필요한 마찰을 줄이는 운영 감각입니다.`,
    `당신에게 맞는 변화는 강한 자극이 아니라 반복 가능한 작은 기준에서 시작됩니다. 하루에 단 하나의 핵심 행동을 끝내는 습관, 대화 전에 목적을 한 문장으로 정리하는 습관, 소비 전에 하루의 간격을 두는 습관 같은 단순한 장치가 삶의 밀도를 크게 바꿉니다. 결국 운명 성향 리포트의 목적은 당신을 규정하는 데 있지 않고, 당신이 스스로를 가장 잘 사용할 수 있는 조건을 발견하게 하는 데 있습니다.`,
  ];
}

function chapterTopicFragments(chapterId: string, categoryId: string, ctx: FptiInterpretationContext): string[] {
  const common = coreFragments(ctx);

  if (chapterId === "overview" && categoryId === "core-summary") {
    return [
      `당신의 핵심 성향은 빠른 통찰과 신중한 정리의 공존입니다. 외부 세계에서 신호를 민감하게 받아들이면서도, 중요한 결론은 마음속에서 충분히 검토한 뒤 확정하려는 기질이 있습니다. 그래서 처음 만나는 사람에게는 유연하고 따뜻하게 보이지만, 실제로는 가치 기준이 분명하고 선택의 일관성을 중요하게 지킵니다. 이 이중 구조는 흔들림이 아니라 성숙한 안정 장치에 가깝습니다.`,
      `삶의 여러 장면에서 당신은 당장 화려한 결과보다 장기적으로 후회가 적은 선택을 선호합니다. 단기 성과를 무시한다는 뜻이 아니라, 오늘의 선택이 내일의 관계와 생활 리듬에 어떤 흔적을 남길지 함께 보는 시야가 강하다는 뜻입니다. 덕분에 큰 실패를 피하는 감각이 좋고, 위기 상황에서도 기준점을 잃지 않는 편입니다. 다만 지나치게 완벽한 타이밍을 찾으려 하면 출발이 늦어질 수 있으므로, 작게 시작해 정교화하는 방식이 더 잘 맞습니다.`,
      common[0],
      common[1],
    ];
  }

  if (chapterId === "overview" && categoryId === "worldview") {
    return [
      `당신이 세상을 인식하는 방식은 표면 정보보다 맥락을 먼저 읽는 데 가깝습니다. 같은 말이라도 상대의 표정, 관계의 온도, 상황의 흐름을 함께 해석하려는 경향이 강해서, 단편적 정보만으로 섣불리 결론 내리지 않습니다. 이 덕분에 섬세한 판단이 가능하지만, 정보가 충분해질 때까지 결정을 미루는 습관이 생길 수도 있습니다. 그러므로 완벽한 정보가 아니라 실행 가능한 정보의 기준을 미리 정해 두는 것이 중요합니다.`,
      `또한 당신은 세상을 경쟁 구도로만 보기보다 협력 가능한 구조로 바라봅니다. 누가 이기는지가 아니라 어떤 구조가 오래 가는지를 자주 생각하며, 관계에서도 단기 감정보다 장기 신뢰를 중시합니다. 이 시선은 공동 프로젝트와 파트너십에서 큰 강점으로 작동합니다. 다만 상대가 즉답을 요구할 때 당신의 신중함이 소극성으로 오해될 수 있어, 판단 중이라는 사실을 언어로 분명히 알려 주는 습관이 필요합니다.`,
      common[2],
      common[0],
    ];
  }

  if (chapterId === "overview" && categoryId === "decision-pattern") {
    return [
      `선택과 판단에서 당신은 감정과 구조를 분리하지 않고 함께 다룹니다. 먼저 관계적 신호를 읽어 불필요한 충돌을 줄이고, 이어서 현실 조건을 점검해 실행 가능성을 확인하는 흐름이 자연스럽습니다. 이 패턴은 사람을 지키면서 결과도 놓치지 않게 해 주는 장점이 있습니다. 다만 피로가 쌓인 날에는 우선순위가 흐려져 결정 시간이 길어질 수 있으니, 결정을 미루는 기준과 확정하는 기준을 따로 갖는 것이 좋습니다.`,
      `당신의 기본 패턴은 단호함보다 정합성입니다. 결론을 빨리 내리는 것보다 근거가 어긋나지 않는 결론을 선호하기 때문에, 일단 확정하면 번복이 적고 신뢰가 높습니다. 이 흐름은 장기 프로젝트에서 특히 강력합니다. 다만 빠른 회전이 필요한 장면에서는 선택지를 세 개 이하로 좁혀서 사고 과부하를 줄여야 기회를 놓치지 않습니다.`,
      common[1],
      common[2],
    ];
  }

  if (chapterId === "overview" && categoryId === "strength-condition") {
    return [
      `당신의 강점은 안전한 기반 위에서 가장 크게 발휘됩니다. 일정의 뼈대가 잡혀 있고 관계의 기대치가 합의되어 있을 때, 당신은 깊은 집중과 높은 완성도를 동시에 보여 줍니다. 반대로 요구가 잦게 바뀌고 우선순위가 모호한 환경에서는 본래 강점이 분산되기 쉽습니다. 따라서 성과를 높이는 핵심은 더 열심히 하는 것이 아니라, 시작 전에 기준을 선명하게 맞추는 것입니다.`,
      `또한 당신은 혼자 깊게 정리하는 시간과 사람과 연결되는 시간을 교차 배치할 때 효율이 올라갑니다. 둘 중 하나만 지속하면 과잉 혹은 고립으로 기울기 쉽고, 결과의 일관성도 떨어집니다. 오전에는 구조화, 오후에는 협업처럼 리듬을 나누는 간단한 설계만으로도 에너지 소모가 크게 줄어듭니다. 이는 의지력의 문제가 아니라 배치의 문제입니다.`,
      common[0],
      common[2],
    ];
  }

  if (chapterId === "overview" && categoryId === "core-keywords") {
    return [
      `당신의 핵심 키워드는 정밀한 공감, 기준 중심 판단, 구조적 실행, 장기 안정 지향으로 요약할 수 있습니다. 이 네 가지는 서로 독립된 특성이 아니라 하나의 운영 체계입니다. 공감은 관계를 열고, 기준은 방향을 지키고, 구조는 결과를 만들며, 안정 지향은 반복 가능한 성장을 보장합니다. 그래서 당신의 변화는 급격한 스타일 전환보다 기존 강점을 더 선명하게 정렬할 때 빠르게 일어납니다.`,
      `키워드를 실제 행동으로 옮길 때는 문장 하나로 충분합니다. 오늘 가장 중요한 관계 하나, 오늘 반드시 끝낼 작업 하나, 오늘 지킬 생활 기준 하나를 적어 두는 방식이 당신의 성향과 잘 맞습니다. 복잡한 생산성 도구보다 간결한 기준이 지속성에 더 유리합니다. 결국 키워드는 자기소개용 문구가 아니라, 매일의 선택을 안정시키는 실전 장치가 되어야 합니다.`,
      common[1],
      common[2],
    ];
  }

  if (chapterId === "inner" && categoryId === "emotion-motion") {
    return [
      `감정이 움직이는 방식에서 당신은 외부 사건보다 해석 과정의 영향을 크게 받습니다. 같은 상황이라도 어떻게 의미를 붙이느냐에 따라 에너지 흐름이 크게 달라집니다. 그래서 감정을 억누르기보다 감정의 이름을 정확히 붙이는 것이 훨씬 효과적입니다. 불편함, 서운함, 압박감처럼 감정 언어가 선명해지면 과잉 반응이 줄고 선택의 질이 올라갑니다.`,
      `또한 당신은 감정을 처리할 때 즉시 정리를 시도하는 경향이 있습니다. 이 방식은 위기 대응에는 도움이 되지만, 피곤한 날에는 자기비판으로 이어질 수 있습니다. 감정이 올라온 직후에는 결론을 내리기보다 상태를 관찰하고, 일정 시간 뒤 판단하는 분리 전략이 필요합니다. 감정은 문제의 원인이라기보다 상태 신호에 가깝기 때문에, 신호를 잘 읽을수록 삶의 밀도가 높아집니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "inner" && categoryId === "solo-mode") {
    return [
      `혼자 있을 때의 당신은 표면적으로 조용해 보여도 내면에서는 매우 역동적으로 사고합니다. 외부 입력이 줄어들수록 사고의 깊이가 살아나고, 장기적으로 중요한 결정을 더 정확히 정리할 수 있습니다. 그래서 혼자 있는 시간이 단순 휴식이 아니라 정렬의 시간으로 작동합니다. 이 시간을 죄책감 없이 확보할수록 관계와 일에서도 더 안정된 모습을 유지할 수 있습니다.`,
      `다만 혼자 있는 시간이 길어질수록 과도한 자기검열로 기울 수 있습니다. 계획이 지나치게 정교해지고 실제 실행이 늦어지는 패턴이 나타난다면, 완성보다 착수 기준으로 전환해야 합니다. 메모를 완벽하게 쓰기보다 첫 행동을 시작하는 방식이 훨씬 효과적입니다. 당신의 강점은 깊이 있는 사고이지만, 그 깊이가 현실 행동과 연결될 때 비로소 성과가 됩니다.`,
      coreFragments(ctx)[1],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "inner" && categoryId === "social-mode") {
    return [
      `사람들 속에서의 당신은 배려와 상황 판단이 빠른 편이라 주변에서 안정감을 느끼게 합니다. 말을 많이 하지 않아도 분위기를 정돈하는 힘이 있고, 상대가 원하는 반응의 결을 비교적 정확하게 맞춥니다. 이 능력은 팀 협업과 친밀 관계에서 매우 큰 자산입니다. 다만 타인의 기대를 과하게 수용하면 스스로의 리듬을 잃기 쉬우므로, 반응 전에 나의 기준을 짧게 점검하는 습관이 필요합니다.`,
      `당신은 관계 안에서 책임감을 크게 느끼는 유형입니다. 그래서 상대의 감정까지 내 과제로 받아들이는 순간이 생길 수 있습니다. 이 패턴이 반복되면 겉으로는 성숙해 보여도 내면 피로가 크게 누적됩니다. 건강한 사회적 운영을 위해서는 친절과 책임의 경계를 분리해야 하며, 도움을 주더라도 역할과 범위를 언어로 명시하는 방식이 안전합니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[1],
    ];
  }

  if (chapterId === "inner" && categoryId === "anxiety-stress") {
    return [
      `불안이 올라오는 순간 당신은 문제를 빨리 정리하려는 방향으로 움직입니다. 평소에는 강점이지만, 압박이 큰 날에는 섣부른 결론으로 이어질 위험이 있습니다. 이때 중요한 것은 속도를 줄이는 것이 아니라 순서를 고정하는 일입니다. 사실을 먼저 확인하고, 감정을 분리해 이름 붙인 뒤, 마지막에 실행 결론을 내리면 불안의 파동이 훨씬 작아집니다.`,
      `또한 당신의 스트레스 반응은 한 영역에서 시작해 다른 영역으로 번지기 쉽습니다. 관계의 긴장이 업무 집중을 흔들고, 업무 부담이 소비 패턴을 흔드는 식의 연쇄가 생길 수 있습니다. 이 연결 구조를 미리 이해하고, 하루의 기준 한 가지를 지키는 방식으로 파급을 차단해야 합니다. 불안을 완전히 없애려 하기보다, 불안이 있어도 무너지지 않는 구조를 만드는 것이 현실적입니다.`,
      coreFragments(ctx)[1],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "inner" && categoryId === "recovery-condition") {
    return [
      `회복에 필요한 조건은 거창한 휴식보다 예측 가능한 리듬입니다. 당신은 생활 구조가 일정할 때 마음의 안전감이 빠르게 올라가고, 그 안정감이 다시 집중력으로 연결됩니다. 그래서 회복 루틴은 특별한 날의 이벤트가 아니라 평일 일정의 기본 장치로 들어가야 합니다. 기상 이후 짧은 정리 시간, 저녁의 감정 기록, 수면 전 디지털 자극 제한 같은 단순한 규칙이 오래 갑니다.`,
      `또한 회복은 혼자만의 시간과 신뢰 관계의 대화가 균형을 이룰 때 가장 효과적입니다. 완전한 고립은 사고를 과열시키고, 과도한 사회적 접촉은 감정 피로를 키울 수 있습니다. 당신에게 맞는 회복은 두 모드를 의식적으로 오가는 것입니다. 한 주 안에서 고요한 시간과 연결의 시간을 번갈아 배치하면 심리적 탄력이 크게 높아집니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "relationship" && categoryId === "approach-style") {
    return [
      `당신이 사람과 가까워지는 방식은 단번의 강한 몰입보다 신뢰가 쌓이는 리듬을 중시하는 형태입니다. 초반에는 상대를 세심하게 관찰하고, 안전하다고 느낄 때 표현의 폭을 넓히는 경향이 있습니다. 이 접근은 느려 보일 수 있지만 관계의 내구성을 높이는 데 유리합니다. 친밀감은 속도가 아니라 예측 가능성에서 자란다는 사실을 몸으로 알고 있는 유형입니다.`,
      `관계 시작 단계에서 당신이 특히 강한 점은 상대의 감정 결을 존중한다는 것입니다. 상대의 경계를 침범하지 않으면서도 따뜻함을 유지할 수 있어, 안정적인 첫 인상을 남깁니다. 다만 지나치게 배려 중심으로 움직이면 자신의 욕구를 뒤로 미루게 될 수 있으므로, 선호와 불편을 초기에 말하는 연습이 필요합니다. 솔직함은 갈등을 만드는 것이 아니라 오해를 줄이는 기술입니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[1],
    ];
  }

  if (chapterId === "relationship" && categoryId === "attraction-type") {
    return [
      `당신이 끌리는 사람은 대체로 일관성과 진정성을 가진 유형입니다. 화려한 말보다 약속을 지키는 태도, 감정 기복보다 안정된 리듬에서 깊은 매력을 느낍니다. 이유는 단순합니다. 당신은 관계를 이벤트가 아니라 장기 운영으로 보기 때문입니다. 그래서 감정의 강도만 높은 관계보다, 삶의 리듬을 함께 맞출 수 있는 상대에게 더 오래 마음이 갑니다.`,
      `또한 당신은 생각의 깊이가 있는 대화를 중요하게 여깁니다. 가볍게 즐기는 대화도 좋아하지만, 중요한 순간에는 가치관과 선택 기준을 공유할 수 있어야 신뢰가 만들어집니다. 이 지점이 맞지 않으면 초반 호감이 있어도 빠르게 거리감이 생길 수 있습니다. 반대로 기준이 맞는 상대와는 천천히 시작해도 매우 견고한 관계를 구축할 가능성이 높습니다.`,
      coreFragments(ctx)[1],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "relationship" && categoryId === "love-strength") {
    return [
      `연애에서 당신의 가장 큰 강점은 관계의 온도를 세밀하게 조절하는 능력입니다. 상대의 상태를 읽고 필요한 말을 적절한 타이밍에 건네는 감각이 좋아, 갈등이 커지기 전에 완충 장치를 만드는 데 유리합니다. 또한 중요한 문제를 감정적으로만 다루지 않고 현실적인 합의로 연결하려는 태도가 있어, 장기 관계에서 신뢰가 두텁게 쌓입니다.`,
      `당신은 애정 표현에서도 과장보다 진심을 선택합니다. 보여주기식 행동보다 실질적인 배려와 책임을 통해 사랑을 증명하려는 성향이 강합니다. 그래서 상대가 이 방식을 이해하면 매우 안정적인 만족을 느끼게 됩니다. 다만 표현의 빈도가 줄어들면 마음이 식은 것으로 오해받을 수 있으므로, 작은 확인 메시지를 꾸준히 유지하는 것이 관계 유지에 효과적입니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "relationship" && categoryId === "repeat-issue") {
    return [
      `반복되는 관계 문제는 대개 사랑의 부족이 아니라 기대치의 비대칭에서 시작됩니다. 당신은 상대를 배려하는 데 익숙해서 불편을 늦게 말하는 편이고, 그 결과 작은 서운함이 쌓이다가 한 번에 터질 가능성이 있습니다. 이 패턴을 줄이려면 갈등이 생긴 뒤 해소하려 하기보다, 평소에 기대 기준을 짧게 조정하는 대화가 필요합니다. 관계는 위기 때의 화해보다 일상의 조정이 더 중요합니다.`,
      `또 다른 반복 문제는 책임의 과잉입니다. 상대의 감정과 선택까지 내가 관리해야 한다고 느끼면 사랑이 돌봄 노동으로 변할 수 있습니다. 이때는 도움을 주되 결과 책임은 분리하는 원칙이 필요합니다. 경계는 관계를 멀어지게 하는 장치가 아니라, 친밀함을 오래 유지하게 하는 안전장치입니다. 당신에게 건강한 사랑은 헌신과 자율이 동시에 지켜지는 관계입니다.`,
      coreFragments(ctx)[1],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "relationship" && categoryId === "healthy-standard") {
    return [
      `건강한 관계를 위한 당신의 기준은 명확합니다. 감정 표현의 자유, 갈등 이후 회복 가능성, 생활 리듬의 상호 존중이 동시에 갖춰져야 관계가 안정됩니다. 특히 갈등이 생겼을 때 문제를 회피하지 않고 대화의 장으로 돌아오는 태도를 중요하게 봅니다. 이 기준은 까다로움이 아니라 관계를 오래 지키기 위한 현실 감각입니다.`,
      `또한 당신은 상대와의 합의가 삶의 다른 영역을 안정시킨다는 사실을 잘 알고 있습니다. 관계가 정돈되면 일의 집중력이 오르고, 생활 구조가 안정되며, 장기 계획도 선명해집니다. 그러므로 건강한 관계란 감정적 만족만을 뜻하지 않고, 서로의 삶을 더 넓게 만드는 동반성의 구조를 말합니다. 당신의 기준은 충분히 성숙하며, 그 기준을 낮추지 않는 것이 오히려 장기 행복에 유리합니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[1],
    ];
  }

  if (chapterId === "career" && categoryId === "fit-work-style") {
    return [
      `당신에게 잘 맞는 일의 방식은 의미와 구조가 동시에 보이는 환경입니다. 해야 하는 이유가 납득되고, 실행 단계가 명확할 때 몰입이 깊어집니다. 단순 반복 업무도 목적이 선명하면 안정적으로 수행하지만, 방향 없이 지시만 많은 환경에서는 에너지가 빠르게 소진됩니다. 따라서 업무를 받을 때 목적, 우선순위, 완료 기준을 먼저 확인하는 습관이 매우 중요합니다.`,
      `또한 당신은 완전히 자유로운 환경보다 적절한 가이드가 있는 환경에서 더 높은 성과를 냅니다. 기준이 전혀 없으면 에너지가 분산되고, 기준이 지나치게 경직되면 창의성이 막힙니다. 당신의 최적 구간은 가벼운 구조 속 자율성입니다. 이 점을 이해하면 직무 선택뿐 아니라 같은 직무 안에서도 역할 설계를 더 유리하게 만들 수 있습니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "career" && categoryId === "deep-work-env") {
    return [
      `몰입이 잘 되는 환경에서 당신은 외부 자극의 양보다 질에 민감합니다. 소음 자체보다 맥락 없는 방해가 반복될 때 집중이 크게 흔들리며, 반대로 일정한 리듬이 유지되면 긴 시간 깊게 파고드는 힘이 살아납니다. 그래서 몰입 환경을 만들 때는 완전한 고요를 목표로 하기보다 방해의 유형을 줄이는 방식이 효과적입니다.`,
      `당신에게 맞는 몰입 공식은 짧은 준비 루틴과 명확한 종료 기준입니다. 작업 시작 전에 목표를 한 문장으로 적고, 종료 시점의 산출물 형태를 미리 정하면 불필요한 망설임이 줄어듭니다. 집중력은 의지의 문제가 아니라 마찰의 문제라는 사실을 기억해야 합니다. 마찰이 낮아지면 당신의 사고 밀도와 완성도는 자연스럽게 올라갑니다.`,
      coreFragments(ctx)[1],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "career" && categoryId === "collab-balance") {
    return [
      `협업과 독립 작업의 균형에서 당신은 연결과 정리의 두 단계를 모두 필요로 합니다. 협업에서는 맥락을 빠르게 읽어 조율 능력을 발휘하고, 독립 작업에서는 구조를 다듬어 결과 품질을 높입니다. 문제는 두 단계의 경계가 흐릴 때 생깁니다. 회의가 길어지고 정리 시간이 사라지면 성과가 떨어지므로, 협업 후 정리 시간을 일정에 고정해야 합니다.`,
      `또한 당신은 사람 중심의 협업에 강하지만 책임 과밀에 취약할 수 있습니다. 모든 요청을 수용하면 단기 평판은 좋아져도 장기 성과가 낮아집니다. 협업 품질을 높이려면 가능한 일과 불가능한 일을 명확히 구분하고, 대안 제시 방식으로 거절하는 기술을 익혀야 합니다. 이 기준은 관계를 해치지 않으면서도 결과를 지키는 전문성의 핵심입니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[1],
    ];
  }

  if (chapterId === "career" && categoryId === "talent-to-result") {
    return [
      `재능이 성과로 바뀌는 순간은 재능 자체보다 재현 가능한 절차가 생길 때입니다. 당신은 통찰과 배려, 구조화 능력을 이미 가지고 있지만, 이것이 성과로 연결되려면 반복 가능한 작업 규칙이 필요합니다. 예를 들어 문제 정의, 우선순위 배치, 실행, 리뷰의 순서를 고정하면 같은 재능이 훨씬 큰 결과를 냅니다.`,
      `또한 당신은 피드백을 흡수하는 힘이 좋아 성장 속도가 빠른 유형입니다. 다만 피드백이 많아질수록 기준이 흔들릴 수 있으므로, 수용 기준을 미리 정해 두어야 합니다. 모든 조언을 따르기보다 목표와 맞는 조언만 반영할 때 성과의 방향성이 선명해집니다. 결국 당신의 재능은 외부 평가에 흔들리지 않는 기준과 만날 때 안정적으로 확장됩니다.`,
      coreFragments(ctx)[1],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "career" && categoryId === "avoid-pattern") {
    return [
      `피해야 할 일의 패턴은 명확합니다. 첫째, 목적 없는 다중 작업. 둘째, 역할 경계 없는 과잉 헌신. 셋째, 마감 기준이 없는 장기 탐색입니다. 이 세 가지는 당신의 장점을 소모로 바꾸는 대표적인 구조입니다. 열심히 하는 것처럼 보이지만 실제 성과는 낮아지고, 피로만 누적될 가능성이 큽니다.`,
      `특히 당신은 사람을 도우려는 마음이 강해 업무가 관계 관리로 변질될 위험이 있습니다. 업무에서 친절은 중요하지만, 기준 없는 수용은 전문성을 약화시킵니다. 따라서 업무 제안이 들어오면 목적, 기한, 결과 형태를 확인한 뒤 수락 여부를 결정해야 합니다. 선택의 문턱을 선명히 할수록 당신의 역량은 더 높은 신뢰로 환원됩니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "wealth" && categoryId === "money-attitude") {
    return [
      `당신은 돈을 단순한 수치가 아니라 삶의 안정성과 선택의 자유를 지키는 자원으로 인식합니다. 그래서 무리한 위험을 감수하기보다 지속 가능한 흐름을 만들려는 경향이 있습니다. 이 태도는 장기적으로 큰 강점이며, 변동성이 큰 시기일수록 빛을 발합니다. 다만 지나친 신중함으로 기회를 놓치지 않도록 작은 실험 단위를 병행하는 것이 중요합니다.`,
      `또한 당신은 소비를 가치와 연결해 판단하는 편입니다. 필요 없는 지출에는 엄격하지만, 의미 있다고 느끼는 영역에는 과감해질 수 있습니다. 이 패턴 자체는 건강하지만 기준이 흐려지면 감정 소비로 이어질 수 있으므로, 지출 전에 목적 문장을 확인하는 습관이 필요합니다. 목적이 선명한 소비는 만족을 남기고, 목적이 없는 소비는 불안을 남깁니다.`,
      coreFragments(ctx)[1],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "wealth" && categoryId === "spend-save-pattern") {
    return [
      `소비와 축적의 패턴에서 당신은 한쪽 극단보다 균형을 선호합니다. 문제는 기준이 없는 시기에 지출이 늘고, 불안이 큰 시기에 과도한 통제로 기울 수 있다는 점입니다. 이 흔들림을 줄이려면 돈의 통로를 역할별로 분리해야 합니다. 생활 유지, 미래 준비, 경험 투자처럼 명확한 용도를 나누면 감정과 숫자의 충돌이 줄어듭니다.`,
      `당신에게 맞는 축적 전략은 큰 결단보다 작은 자동화입니다. 복잡한 재테크 계획보다 반복 가능한 이체 규칙과 월간 점검 리듬이 훨씬 오래갑니다. 또한 지출 기록을 처벌 도구로 쓰지 말고 패턴 관찰 도구로 사용해야 합니다. 기록의 목적은 죄책감이 아니라 통제감 회복에 있습니다. 통제감이 생기면 소비와 축적 모두 건강해집니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[1],
    ];
  }

  if (chapterId === "wealth" && categoryId === "reality-strength") {
    return [
      `현실 판단의 강점에서 당신은 감정에 휩쓸리지 않고 상황을 구조적으로 보는 힘이 있습니다. 불확실한 장면에서도 최악과 최선을 동시에 떠올려 대비하려는 성향이 있어, 큰 손실을 피하는 능력이 좋습니다. 이 강점은 개인 재정뿐 아니라 커리어 선택, 관계 운영에서도 안정성을 높여 줍니다.`,
      `특히 당신은 즉흥적 기대보다 실제 지속 가능성을 중요하게 보기 때문에, 단기 유행에 과몰입하지 않는 균형 감각이 있습니다. 이 감각은 시간이 지날수록 더 큰 가치로 돌아옵니다. 다만 지나친 검증으로 출발이 늦어질 수 있으니, 작은 규모로 시작해 실제 데이터를 쌓는 방식이 필요합니다. 현실 감각은 보수성이 아니라 복원력을 높이는 능력입니다.`,
      coreFragments(ctx)[1],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "wealth" && categoryId === "risk-condition") {
    return [
      `재정 리스크가 생기는 조건은 대개 감정 과열과 정보 과잉이 동시에 올 때입니다. 긴장 상태에서 빠른 결정을 내리거나, 반대로 지나치게 많은 정보를 검토하다가 타이밍을 놓치는 두 가지 패턴이 반복될 수 있습니다. 이때 중요한 것은 맞는 결정을 한 번 하는 것이 아니라, 잘못된 결정을 빠르게 교정할 수 있는 구조를 만드는 일입니다.`,
      `또한 관계 스트레스가 재정 판단에 스며들 때 불필요한 소비나 과도한 절제가 나타날 수 있습니다. 그래서 돈 관리는 숫자 계산만으로 해결되지 않습니다. 생활 리듬과 감정 상태를 함께 점검해야 리스크를 줄일 수 있습니다. 하루의 피로가 큰 날에는 중요한 금전 결정을 유예하는 규칙만으로도 손실 가능성을 크게 낮출 수 있습니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "wealth" && categoryId === "stable-strategy") {
    return [
      `돈을 안정적으로 다루는 전략은 복잡한 이론보다 실행 가능한 생활 규칙에서 시작됩니다. 당신에게 맞는 전략은 기준 금액 설정, 지출 유예 시간, 주간 점검 루틴처럼 간단하고 반복 가능한 장치입니다. 이런 규칙은 의지가 약한 날에도 작동하기 때문에 장기적으로 훨씬 강합니다.`,
      `또한 안정 전략은 축적만을 뜻하지 않습니다. 삶의 활력을 지키는 경험 투자도 함께 포함되어야 지속됩니다. 지나친 절약은 반동 소비를 부르고, 무계획한 소비는 불안을 키웁니다. 그래서 당신의 전략은 균형형 구조가 가장 적합합니다. 중요한 것은 완벽한 계획이 아니라, 흔들리는 날에도 유지되는 작은 기준입니다.`,
      coreFragments(ctx)[1],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "stress" && categoryId === "collapse-signal") {
    return [
      `무너질 때 나타나는 신호에서 당신은 먼저 리듬의 붕괴를 경험합니다. 평소에는 잘 되던 판단이 흐려지고, 사소한 자극에도 반응이 커지며, 해야 할 일을 미루거나 과도하게 몰아붙이는 양극단이 나타날 수 있습니다. 이 신호를 빠르게 인식하면 큰 손실을 충분히 막을 수 있습니다. 중요한 것은 원인을 완벽히 찾는 것보다, 신호를 감지했을 때 실행할 단순한 복구 순서를 준비해 두는 일입니다.`,
      `신호는 대개 몸에서 먼저 옵니다. 수면 리듬이 흔들리고, 식사나 호흡이 거칠어지며, 대화 회피 또는 과잉 대화가 반복되기 시작합니다. 이때 자신을 비난하면 회복이 늦어집니다. 신호를 실패의 증거가 아니라 보호 장치로 인식해야 합니다. 신호가 보일수록 판단을 미루고 루틴을 복원하는 것이 가장 현명한 대응입니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[1],
    ];
  }

  if (chapterId === "stress" && categoryId === "overreaction") {
    return [
      `과잉 반응 패턴에서 당신은 평소 강점이 확대되어 나타나는 경향이 있습니다. 책임감이 과하면 모든 일을 혼자 떠안고, 공감이 과하면 타인의 감정까지 내 과제로 받아들이며, 실행력이 과하면 충분한 검토 없이 밀어붙이게 됩니다. 이 전환을 조기에 인식하면 과잉 반응은 빠르게 진정될 수 있습니다.`,
      `과잉 반응을 줄이는 핵심은 감정을 없애는 것이 아니라 행동 속도를 조절하는 것입니다. 즉시 반응 대신 짧은 간격을 두고, 메시지 전송이나 결론 확정을 한 번 더 점검하면 결과가 크게 달라집니다. 특히 피로한 날에는 자신이 평소보다 극단으로 기울 수 있음을 전제로 두어야 합니다. 예방은 통제가 아니라 설계입니다.`,
      coreFragments(ctx)[1],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "stress" && categoryId === "shadow-main") {
    return [
      `당신의 주요 그림자는 회피와 과잉 통제가 번갈아 나타나는 형태에 가깝습니다. 부담이 클 때는 결정을 미루며 에너지를 보존하려 하고, 한계에 다다르면 다시 모든 것을 통제하려는 반동이 생길 수 있습니다. 두 패턴은 서로 반대처럼 보이지만 같은 뿌리에서 나옵니다. 안전을 확보하려는 강한 욕구가 방식만 바꿔 반복되는 것입니다.`,
      `이 그림자를 다루는 첫 단계는 패턴에 이름을 붙이는 일입니다. 지금 내가 회피 모드인지, 통제 모드인지 구분하는 순간 선택지가 생깁니다. 이름 없는 상태에서는 자동 반응이지만, 이름을 붙이면 조정 가능한 행동이 됩니다. 당신에게 필요한 것은 완벽한 자기통제가 아니라, 그림자가 올라올 때 돌아갈 기본 루틴입니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "stress" && categoryId === "self-consume-loop") {
    return [
      `반복되는 자기소모 구조는 대개 기대치 과부하에서 시작됩니다. 잘하고 싶은 마음이 큰 만큼 기준이 높아지고, 그 기준을 지키지 못하면 자기비판이 강해지는 순환이 생깁니다. 이 순환은 의지 부족의 문제가 아니라 기준 설계의 문제입니다. 현실적인 기준을 다시 세우면 자기소모는 생각보다 빠르게 줄어듭니다.`,
      `또한 당신은 타인의 기대와 자기 기준이 겹칠 때 소모가 심해질 수 있습니다. 모두를 만족시키려는 목표는 결국 누구도 만족시키지 못하게 만들 가능성이 큽니다. 중요한 것은 우선순위를 명확히 정하고, 선택하지 않은 것을 의식적으로 놓아주는 것입니다. 포기는 실패가 아니라 에너지 보존 전략입니다.`,
      coreFragments(ctx)[1],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "stress" && categoryId === "recovery-defense") {
    return [
      `회복 루틴과 방어 전략에서 당신에게 가장 효과적인 방식은 짧고 규칙적인 복구입니다. 긴 휴식 한 번보다 매일의 작은 회복이 훨씬 안정적입니다. 아침 시작 전 정리, 오후의 짧은 전환, 밤의 감정 정돈 같은 고정 루틴을 만들면 스트레스 파동이 크게 줄어듭니다.`,
      `방어 전략은 외부를 차단하는 것이 아니라 자신을 지키는 기준을 명시하는 일입니다. 감정이 큰 날의 결정 유예, 갈등 상황의 대화 규칙, 금전 판단의 재확인 시간처럼 구체적인 장치가 필요합니다. 기준이 문장으로 존재할 때 당신은 위기에서도 자신을 잃지 않습니다. 결국 회복은 의지가 아니라 구조의 힘입니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "growth" && categoryId === "growth-mode") {
    return [
      `당신이 성장하는 방식은 극적인 변신보다 정교한 누적에 가깝습니다. 하루의 작은 실천을 반복해 생활 구조를 바꾸고, 그 구조 위에서 성과를 확장하는 흐름이 가장 잘 맞습니다. 빠른 성취를 원하는 마음이 올라와도, 당신의 강점은 지속성에 있다는 사실을 잊지 않는 것이 중요합니다.`,
      `또한 당신의 성장은 혼자만의 노력으로 완성되지 않습니다. 신뢰할 수 있는 관계와 피드백 환경이 있을 때 성장 속도가 훨씬 빨라집니다. 그래서 성장 전략에는 자기관리뿐 아니라 관계 설계가 함께 들어가야 합니다. 당신의 잠재력은 연결과 구조가 만날 때 가장 크게 열립니다.`,
      coreFragments(ctx)[1],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "growth" && categoryId === "roadmap-7") {
    return [
      `7일 실천 전략의 핵심은 시작 저항을 낮추는 것입니다. 첫째 날에는 기준 문장 하나를 정하고, 둘째 날부터는 하루 핵심 행동 하나만 완수하는 방식으로 리듬을 만드세요. 작은 완수 경험이 쌓이면 자기신뢰가 회복되고, 다음 행동의 진입 장벽이 빠르게 낮아집니다.`,
      `이 기간에는 완벽함보다 일관성이 중요합니다. 하루가 흔들려도 전체 계획을 포기하지 말고 다음 날 바로 복귀하는 규칙을 두세요. 당신은 한 번의 실패보다 복귀 속도에서 성패가 갈리는 유형입니다. 7일의 목표는 성과가 아니라 리듬 회복이며, 리듬이 살아나면 성과는 자연스럽게 따라옵니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[1],
    ];
  }

  if (chapterId === "growth" && categoryId === "roadmap-30") {
    return [
      `30일 변화 전략은 유지 마찰을 줄이는 구조 설계입니다. 1주차에는 생활 리듬을 정돈하고, 2주차에는 실행 패턴을 고정하며, 3주차에는 관계와 업무의 경계를 조정하고, 4주차에는 점검 체계를 정착시키는 흐름이 적합합니다. 한 달의 목적은 더 많이 하는 것이 아니라 덜 흔들리는 시스템을 만드는 데 있습니다.`,
      `당신은 의미가 분명할 때 꾸준함이 강한 유형이므로, 매주 목표를 숫자보다 문장으로 정의하는 방식이 좋습니다. 예를 들어 이번 주의 목표를 "관계 피로를 줄이는 대화 기준 확립"처럼 설정하면 행동 선택이 쉬워집니다. 변화는 거대한 결심이 아니라 반복 가능한 운영 문장에서 시작됩니다.`,
      coreFragments(ctx)[1],
      coreFragments(ctx)[2],
    ];
  }

  if (chapterId === "growth" && categoryId === "priority-area") {
    return [
      `관계, 일, 돈, 건강의 우선순위를 정할 때 당신은 상호 연결 구조를 고려해야 합니다. 한 영역의 과부하가 다른 영역을 쉽게 흔드는 유형이기 때문에, 단기 성과만 보고 우선순위를 잡으면 전체 균형이 깨질 수 있습니다. 우선순위는 긴급성보다 지속 가능성 기준으로 정해야 합니다.`,
      `당분간 가장 중요한 원칙은 에너지 보존과 실행 일관성의 동시 확보입니다. 관계에서는 경계를, 일에서는 완료 기준을, 돈에서는 지출 통로를, 건강에서는 수면 리듬을 먼저 고정하세요. 네 영역을 동시에 완벽히 개선하려 하지 말고, 한 번에 하나씩 안정화해 연결하는 방식이 가장 효과적입니다.`,
      coreFragments(ctx)[0],
      coreFragments(ctx)[2],
    ];
  }

  return [
    `장기적으로 운명을 바꾸는 선택 기준은 화려한 선택보다 반복 가능한 선택입니다. 당신은 큰 결단의 순간보다 일상의 작은 판단에서 삶의 방향이 크게 바뀌는 유형입니다. 그래서 기준은 복잡할수록 무너지기 쉽고, 단순할수록 오래 갑니다.`,
    `앞으로의 선택에서 기억해야 할 핵심은 세 가지입니다. 첫째, 내 리듬을 해치지 않는가. 둘째, 관계의 신뢰를 지키는가. 셋째, 장기 구조를 강화하는가. 이 세 질문에 예라고 답할 수 있다면, 그 선택은 시간이 갈수록 더 좋은 결과로 돌아옵니다.`,
    coreFragments(ctx)[1],
    coreFragments(ctx)[2],
  ];
}

function categoryFocus(chapterId: string, categoryTitle: string): string {
  if (chapterId === "overview") return `${categoryTitle}에서는 관찰을 행동으로 연결하는 전환 속도가 핵심입니다.`;
  if (chapterId === "inner") return `${categoryTitle}에서는 감정 반응을 억누르기보다 순서를 재배치하는 방식이 효과적입니다.`;
  if (chapterId === "relationship") return `${categoryTitle}에서는 기대 기준을 문장으로 합의하는 습관이 만족도를 높입니다.`;
  if (chapterId === "career") return `${categoryTitle}에서는 착수 기준과 마감 기준을 분리할수록 결과 품질이 안정됩니다.`;
  if (chapterId === "wealth") return `${categoryTitle}에서는 감정 상태와 숫자 판단을 함께 점검할 때 손실 확률이 줄어듭니다.`;
  if (chapterId === "stress") return `${categoryTitle}에서는 위기 신호를 빠르게 감지하고 결정을 유예하는 규칙이 중요합니다.`;
  return `${categoryTitle}에서는 작은 기준의 반복이 장기 변화로 연결되는 속도를 높입니다.`;
}

function replaceSharedParagraph(
  paragraph: string,
  chapterId: string,
  categoryId: string,
  categoryTitle: string,
  ctx: FptiInterpretationContext,
): string {
  const shared = new Set(coreFragments(ctx).map((line) => clean(line)));
  if (!shared.has(clean(paragraph))) return paragraph;

  const energy = Math.round(ctx.scores.energy);
  const judgment = Math.round(ctx.scores.judgment);
  const execution = Math.round(ctx.scores.execution);
  const vision = Math.round(ctx.scores.vision);

  return `${ctx.typeName}의 ${categoryTitle} 해석에서는 ${ctx.socialStyle}과 ${ctx.decisionStyle}의 균형을 먼저 확인하는 것이 중요합니다. 특히 ${chapterId}/${categoryId} 구간에서는 에너지 ${energy}, 판단 ${judgment}, 실행 ${execution}, 전망 ${vision} 점수의 결을 함께 읽어야 과잉 해석을 줄일 수 있습니다. ${categoryFocus(chapterId, categoryTitle)} 결국 이 카테고리의 목적은 정답 찾기가 아니라, 오늘 바로 적용 가능한 운영 기준을 확보하는 데 있습니다.`;
}

function padCategoryBody(baseBody: string, chapterId: string, categoryId: string, categoryTitle: string, ctx: FptiInterpretationContext): string {
  const additions = [
    `${categoryTitle}를 다룰 때 ${ctx.typeName}에게 유효한 방식은 즉흥 결론을 줄이고 ${ctx.decisionStyle} 기준으로 확인 질문을 먼저 두는 것입니다. ${chapterId} 장면에서는 문제를 크게 해결하려 하기보다 ${categoryId} 단위로 쪼개 실행할 때 실제 변화율이 올라갑니다.`,
    `${ctx.executionStyle} 특성을 활용해 오늘 안에 끝낼 행동 하나와 이번 주에 유지할 규칙 하나를 분리해 두세요. 이 두 축이 분리되면 ${categoryTitle} 관련 피로가 줄고, 반복되는 실수가 빠르게 줄어듭니다.`,
    `${ctx.outlookStyle} 성향은 장기 안정에 강점이 있지만 판단 지연으로 이어질 수 있습니다. 그래서 ${categoryTitle}에서는 결정 시간을 고정하고, 점검 시간을 별도로 두는 이중 리듬이 효율적입니다.`,
    `${ctx.stabilityStyle} 회복 축을 살리려면 결과 평가보다 과정 평가를 먼저 해야 합니다. ${chapterId} 챕터의 핵심은 완벽함이 아니라 재현 가능성이고, ${categoryTitle}에서는 그 원칙이 특히 중요합니다.`,
  ];

  let paragraphs = lineParagraphs(baseBody).map((paragraph) =>
    replaceSharedParagraph(paragraph, chapterId, categoryId, categoryTitle, ctx),
  );
  let cursor = 0;

  while (joinParagraphs(paragraphs).length < CATEGORY_MIN && cursor < additions.length * 3) {
    const candidate = additions[cursor % additions.length];
    const grams = trigrams(candidate);
    const similar = paragraphs.some((p) => jaccard(trigrams(p), grams) > 0.86);
    if (!similar) paragraphs.push(candidate);
    cursor += 1;
  }

  return joinParagraphs(paragraphs);
}

function buildActionTips(chapterId: string, categoryId: string): string[] {
  if (chapterId === "growth" && categoryId === "roadmap-7") {
    return [
      "오늘 핵심 행동 1개만 정하고 반드시 완료하세요.",
      "하루 종료 전에 3줄 기록으로 성공 포인트를 남기세요.",
      "실패한 날은 원인 분석보다 즉시 복귀에 집중하세요.",
    ];
  }

  if (chapterId === "growth" && categoryId === "roadmap-30") {
    return [
      "주간 점검 시간을 고정해 다음 주 우선순위를 확정하세요.",
      "반복되는 방해 요인 1개를 제거하는 데 집중하세요.",
      "한 달 목표를 숫자보다 행동 문장으로 정의하세요.",
    ];
  }

  if (chapterId === "relationship") {
    return [
      "갈등 시 사실 확인-감정 명명-요청 제안 순서를 지키세요.",
      "표현 강도보다 표현 빈도의 일관성을 우선하세요.",
      "관계 기대치는 추측하지 말고 문장으로 합의하세요.",
    ];
  }

  if (chapterId === "career") {
    return [
      "작업 시작 전 완료 기준을 한 문장으로 고정하세요.",
      "협업 후 반드시 정리 시간 블록을 확보하세요.",
      "작업 단위를 작게 쪼개 착수 마찰을 줄이세요.",
    ];
  }

  if (chapterId === "wealth") {
    return [
      "지출을 세 통로로 분리해 관리하세요.",
      "큰 지출은 하루 유예 후 다시 결정하세요.",
      "월말 점검에서 감정 소비 패턴을 함께 기록하세요.",
    ];
  }

  if (chapterId === "stress") {
    return [
      "무너짐 신호 3개를 미리 정하고 체크하세요.",
      "신호가 겹치면 중요한 결정을 하루 유예하세요.",
      "회복 루틴을 특별한 날이 아닌 평일 일정에 넣으세요.",
    ];
  }

  return [
    "하루 핵심 기준 1개를 문장으로 고정하세요.",
    "주 1회 패턴 리뷰로 흔들린 지점을 확인하세요.",
    "지속 가능한 속도로 꾸준히 실행하세요.",
  ];
}

function buildCategory(chapterId: string, category: { id: string; title: string }, ctx: FptiInterpretationContext): FptiReportCategory {
  const seed = chapterTopicFragments(chapterId, category.id, ctx);
  const body = padCategoryBody(joinParagraphs(seed), chapterId, category.id, category.title, ctx);

  return {
    id: category.id,
    title: category.title,
    body,
    actionTips: buildActionTips(chapterId, category.id),
  };
}

function buildChapter(spec: ChapterSpec, ctx: FptiInterpretationContext): FptiPremiumChapter {
  const categories = spec.categories.map((category) => buildCategory(spec.id, category, ctx));
  const content = joinParagraphs(
    [chapterIntro(spec.id, ctx), chapterAnalysis(spec.id, ctx)]
      .concat(
        categories.flatMap((category) => [
          `${category.title}`,
          category.body,
          category.actionTips && category.actionTips.length
            ? `실천 포인트\n${category.actionTips.map((tip) => `- ${tip}`).join("\n")}`
            : "",
        ]),
      )
      .concat([chapterActionGuide(spec.id)]),
  );

  return {
    id: spec.id,
    title: spec.title,
    intro: chapterIntro(spec.id, ctx),
    analysis: chapterAnalysis(spec.id, ctx),
    categories,
    actionGuide: chapterActionGuide(spec.id),
    content,
  };
}

function derivePatterns(ctx: FptiInterpretationContext) {
  return {
    relationshipPattern: "가까워질수록 기대치를 말로 맞추는 방식에서 관계 만족도가 크게 올라가는 유형입니다.",
    careerPattern: "시작과 마감의 리듬을 분리해 운영할 때 성과와 안정이 동시에 올라가는 유형입니다.",
    wealthPattern: "감정과 숫자를 함께 점검하는 구조를 만들 때 재정 안정이 빠르게 자리잡는 유형입니다.",
    stressPattern: "과잉 반응을 속도 조절 규칙으로 완충할 때 회복 탄력이 커지는 유형입니다.",
    growthPattern: "작은 기준을 오래 반복할수록 운용 역량이 기하급수적으로 커지는 유형입니다.",
  };
}

function forbiddenTextFound(text: string): boolean {
  const lower = clean(text).toLowerCase();
  return FORBIDDEN_PHRASES.some((token) => lower.includes(token.toLowerCase()));
}

function chapterContamination(chapter: FptiPremiumChapter): boolean {
  const text = clean(chapter.content);
  if (!text) return false;
  if (chapter.id === "relationship" && /(매출|재무|투자|예산 통로|월간 지출)/.test(text)) return true;
  if (chapter.id === "career" && /(연애|애정|친밀감|데이트)/.test(text)) return true;
  if (chapter.id === "wealth" && /(연애|친밀감|데이트|애정 표현)/.test(text)) return true;
  if (chapter.id === "stress" && /(투자 전략|직무 선택|연애 매력)/.test(text)) return true;
  return false;
}

export function validateFptiReportQuality(report: FptiPremiumReport): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!clean(report.typeName)) {
    errors.push("리포트 타이틀 정보가 비어 있습니다.");
  }

  if (!Array.isArray(report.chapters) || report.chapters.length !== CHAPTER_SPECS.length) {
    errors.push("챕터 개수가 기준과 다릅니다.");
    return { valid: false, errors };
  }

  const globalParagraphs: Array<{ chapterId: string; text: string }> = [];
  const globalSentences: Map<string, Set<string>> = new Map();

  for (const chapter of report.chapters) {
    if (!clean(chapter.title)) errors.push(`챕터 제목 누락: ${chapter.id}`);
    if (!Array.isArray(chapter.categories) || chapter.categories.length < 5) {
      errors.push(`챕터 카테고리 부족: ${chapter.id}`);
      continue;
    }

    const chapterContent = clean(chapter.content);
    if (!chapterContent) errors.push(`챕터 본문 누락: ${chapter.id}`);
    if (chapterContent.length < CHAPTER_MIN) errors.push(`챕터 길이 부족: ${chapter.id}`);
    if (forbiddenTextFound(chapterContent)) errors.push(`금지 문구 포함: ${chapter.id}`);
    if (chapterContamination(chapter)) errors.push(`챕터 문맥 혼입: ${chapter.id}`);

    for (const category of chapter.categories) {
      if (!clean(category.title)) errors.push(`카테고리 제목 누락: ${chapter.id}/${category.id}`);
      const body = clean(category.body);
      if (!body) {
        errors.push(`카테고리 본문 누락: ${chapter.id}/${category.id}`);
        continue;
      }
      if (body.length < CATEGORY_MIN) errors.push(`카테고리 길이 부족: ${chapter.id}/${category.id}`);
      if (forbiddenTextFound(body)) errors.push(`카테고리 금지 문구 포함: ${chapter.id}/${category.id}`);

      const paragraphs = lineParagraphs(body);
      for (const paragraph of paragraphs) {
        globalParagraphs.push({ chapterId: chapter.id, text: paragraph });
      }

      for (const sentence of sentenceChunks(body)) {
        if (sentence.length < 18) continue;
        const key = sentence.toLowerCase();
        if (!globalSentences.has(key)) globalSentences.set(key, new Set());
        globalSentences.get(key)?.add(chapter.id);
      }
    }
  }

  for (let i = 0; i < globalParagraphs.length; i += 1) {
    for (let j = i + 1; j < globalParagraphs.length; j += 1) {
      const a = globalParagraphs[i];
      const b = globalParagraphs[j];
      if (a.chapterId === b.chapterId) continue;
      if (jaccard(trigrams(a.text), trigrams(b.text)) >= 0.93) {
        errors.push(`중복 문단 감지: ${a.chapterId} <-> ${b.chapterId}`);
        i = globalParagraphs.length;
        break;
      }
    }
  }

  for (const [, chapters] of globalSentences) {
    if (chapters.size >= 2) {
      errors.push("동일 문장 반복 감지");
      break;
    }
  }

  const renderReady = report.chapters.every((chapter) =>
    clean(chapter.title)
    && Array.isArray(chapter.categories)
    && chapter.categories.every((category) => clean(category.title) && clean(category.body)),
  );

  if (!renderReady) {
    errors.push("렌더링 가능한 계층 구조가 아닙니다.");
  }

  return { valid: errors.length === 0, errors };
}

export function validateFptiPremiumReport(report: FptiPremiumReport): { valid: boolean; errors: string[] } {
  return validateFptiReportQuality(report);
}

function fallbackCategoryBody(categoryTitle: string, ctx: FptiInterpretationContext): string {
  const tone = [
    `이 구간에서는 ${ctx.socialStyle}과 ${ctx.decisionStyle}을 같은 비중으로 다루는 것이 안전합니다. 공감만 앞세우거나 기준만 앞세우면 오히려 판단 오차가 커질 수 있으므로, 두 축을 번갈아 점검하는 방식을 유지하세요.`,
    `${ctx.typeName}은 ${ctx.executionStyle} 특성 덕분에 작은 실행 단위를 빠르게 누적할 수 있습니다. 오늘은 핵심 행동 하나, 이번 주는 유지 규칙 하나를 분리해 기록하면 ${categoryTitle}의 변화가 더 선명해집니다.`,
    `${ctx.outlookStyle} 성향은 장기 방향 설계에 강점이 있습니다. 다만 방향만 세우고 착수가 늦어지지 않도록, 결정 시점과 점검 시점을 미리 달력에 고정해 두는 것이 중요합니다.`,
    `${ctx.stabilityStyle} 회복 축을 살리려면 실패 원인 탐색보다 재시작 절차를 먼저 확보하세요. ${categoryTitle}는 의지의 문제가 아니라 구조의 문제이므로, 작고 반복 가능한 규칙이 가장 강력한 해법입니다.`,
  ];
  const text = [
    `${categoryTitle}에서 가장 중요한 기준은 자신의 성향을 부정하지 않고 운영 방식으로 전환하는 것입니다. ${ctx.typeName}인 당신은 상황을 깊게 읽는 감각이 뛰어나므로, 급하게 결론을 내리기보다 맥락을 정리한 뒤 선택할 때 훨씬 안정적인 결과를 만들 수 있습니다.`,
    ...tone,
  ];
  return padCategoryBody(joinParagraphs(text), "fallback", "fallback", categoryTitle, ctx);
}

function repairReport(report: FptiPremiumReport, ctx: FptiInterpretationContext): FptiPremiumReport {
  const chapters = report.chapters.map((chapter) => {
    const categories = chapter.categories.map((category) => {
      const body = clean(category.body);
      const invalid = !body || body.length < CATEGORY_MIN || forbiddenTextFound(body);
      if (!invalid) return category;
      return {
        ...category,
        body: fallbackCategoryBody(category.title, ctx),
        actionTips: category.actionTips && category.actionTips.length ? category.actionTips : buildActionTips(chapter.id, category.id),
      };
    });

    const content = joinParagraphs(
      [chapter.intro, chapter.analysis]
        .concat(
          categories.flatMap((category) => [
            category.title,
            category.body,
            category.actionTips && category.actionTips.length
              ? `실천 포인트\n${category.actionTips.map((tip) => `- ${tip}`).join("\n")}`
              : "",
          ]),
        )
        .concat([chapter.actionGuide]),
    );

    return {
      ...chapter,
      categories,
      content,
    };
  });

  return {
    ...report,
    chapters,
  };
}

export function buildFptiPremiumReport(input: FptiPremiumInput): FptiPremiumReport {
  const ctx = buildInterpretationContext(input);
  const traits = buildTraits(ctx);
  const title = `${ctx.typeName} 프리미엄 운명 성향 리포트`;
  const summary = `${ctx.typeName}의 성향 결을 바탕으로 관계, 일, 돈, 스트레스, 성장 전략을 현실 상담문으로 정리한 개인 맞춤 리포트입니다.`;

  let report: FptiPremiumReport = {
    typeCode: ctx.typeCode,
    typeName: ctx.typeName,
    subtitle: ctx.subtitle,
    summary,
    dimensionScores: ctx.scores,
    dominantTraits: traits.dominantTraits,
    hiddenTraits: traits.hiddenTraits,
    ...derivePatterns(ctx),
    chapters: CHAPTER_SPECS.map((spec) => buildChapter(spec, ctx)),
  };

  const firstValidation = validateFptiReportQuality(report);
  if (!firstValidation.valid) {
    report = repairReport(report, ctx);
  }

  const secondValidation = validateFptiReportQuality(report);
  if (!secondValidation.valid) {
    report = {
      ...report,
      chapters: report.chapters.map((chapter) => ({
        ...chapter,
        categories: chapter.categories.map((category) => ({
          ...category,
          body: fallbackCategoryBody(category.title, ctx),
          actionTips: buildActionTips(chapter.id, category.id),
        })),
      })).map((chapter) => {
        const content = joinParagraphs(
          [chapter.intro, chapter.analysis]
            .concat(
              chapter.categories.flatMap((category) => [
                category.title,
                category.body,
                category.actionTips && category.actionTips.length
                  ? `실천 포인트\n${category.actionTips.map((tip) => `- ${tip}`).join("\n")}`
                  : "",
              ]),
            )
            .concat([chapter.actionGuide]),
        );
        return { ...chapter, content };
      }),
    };
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

  for (const chapter of report.chapters) {
    lines.push(chapter.title);
    lines.push(chapter.intro);
    lines.push("");
    lines.push(chapter.analysis);
    lines.push("");

    for (const category of chapter.categories) {
      lines.push(category.title);
      lines.push(category.body);
      if (Array.isArray(category.actionTips) && category.actionTips.length) {
        lines.push("실천 포인트");
        for (const tip of category.actionTips) {
          lines.push(`- ${tip}`);
        }
      }
      lines.push("");
    }

    lines.push(chapter.actionGuide);
    lines.push("");
    lines.push("\f");
  }

  return lines.join("\n").replace(/\n\f$/u, "");
}
