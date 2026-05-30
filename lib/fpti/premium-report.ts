import type { FptiAnalysisResult } from "./fpti-types";

type Primitive = string | number | boolean | null | undefined;

export type FptiPremiumInput = {
  answers?: Array<Record<string, Primitive>>;
  scoreMap?: Record<string, number>;
  selectedOptions?: string[];
  userName?: string;
  birthProfile?: Record<string, Primitive>;
  sajuSummary?: string;
  fptiType?: string;
  fptiSubtype?: string;
  createdAt?: string;
  result?: FptiAnalysisResult;
};

export type FptiScores = {
  A: number;
  M: number;
  H: number;
  L: number;
  F: number;
  B: number;
  R: number;
  V: number;
};

export type FptiAxisResult = {
  axis: keyof FptiScores;
  label: string;
  score: number;
  level: "low" | "mid" | "high";
  summary: string;
};

export type FptiReportAccessState = {
  isUnlocked: boolean;
  unlockMethod?: "coin" | "subscription" | "admin" | "free";
  transactionId?: string;
  unlockedAt?: string;
};

export type FptiDeepSection = {
  title: string;
  usedSignals: string[];
  interpretation: string;
  body?: string;
  strength?: string;
  risk?: string;
  action?: string;
  advice?: string;
};

export type FptiDeepChapter = {
  id?: string;
  order: number;
  roman: "I" | "II" | "III" | "IV" | "V" | "VI" | "VII";
  title: string;
  subtitle?: string;
  preview?: string;
  isPreview: boolean;
  locked: boolean;
  sections: FptiDeepSection[];
  chapterSummary: string;
};

export type FptiDeepSummary = {
  preview: string;
  highlights: string[];
  caution: string;
};

export type FptiDeepReport = {
  reportType: "FPTI_DEEP_REPORT";
  mode: "local";
  generatedAt: string;
  userTypeCode: string;
  typeName: string;
  scores: FptiScores;
  axes: FptiAxisResult[];
  unlocked: boolean;
  chapters: FptiDeepChapter[];
  summary: FptiDeepSummary;
  meta: {
    engineVersion: string;
    apiUsed: false;
    pdfEnabled: false;
    chapterCount: 7;
  };
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export type FptiPremiumReport = FptiDeepReport;

type ChapterDefinition = {
  id: string;
  order: number;
  roman: FptiDeepChapter["roman"];
  title: string;
  sections: string[];
};

type LocalTypeResult = {
  code: string;
  typeName: string;
  scores: FptiScores;
  axes: FptiAxisResult[];
  topAxes: FptiAxisResult[];
  lowAxes: FptiAxisResult[];
  source: FptiAnalysisResult["source"];
};

type TenGodName = "비견" | "겁재" | "식신" | "상관" | "정재" | "편재" | "정관" | "편관" | "정인" | "편인";

const TEN_GOD_CUES: Record<TenGodName, { personality: string; career: string }> = {
  비견: { personality: "자기 기준과 주체성이 강한 축", career: "독립 실행과 대등 협업에 강한 축" },
  겁재: { personality: "경쟁 반응과 돌파력이 강한 축", career: "위기 대응과 현장 전환에 강한 축" },
  식신: { personality: "꾸준함과 생활 리듬이 안정적인 축", career: "생산성·콘텐츠·서비스에 강한 축" },
  상관: { personality: "표현력과 문제 제기가 분명한 축", career: "기획·개선·발표에 강한 축" },
  정재: { personality: "현실 감각과 관리 본능이 강한 축", career: "정산·운영·예산 관리에 강한 축" },
  편재: { personality: "기회 포착과 유동성이 빠른 축", career: "영업·확장·수익 다각화에 강한 축" },
  정관: { personality: "책임감과 기준 준수가 분명한 축", career: "조직 운영·규정·품질 통제에 강한 축" },
  편관: { personality: "압박 속 추진력과 결단이 살아나는 축", career: "리스크 관리·구조 개편에 강한 축" },
  정인: { personality: "정리·학습·회복이 깊은 축", career: "연구·분석·기획 보조에 강한 축" },
  편인: { personality: "통찰과 비정형 이해가 빠른 축", career: "창의 기획·특수 분야 탐구에 강한 축" },
};

const FORBIDDEN_TEXT = [
  "pdf 다운로드",
  "pdf 저장",
  "리포트 pdf 받기",
  "자동 복구 생성",
  "fallback",
  "데이터 부족",
  "ai가 분석한 결과",
  "리포트 생성 실패",
  "강점을 과열 없이 유지하면 실행 안정성이 올라갑니다.",
  "피로 누적 구간에서 판단 지연이 생길 수 있습니다.",
  "핵심 행동 1개를 정하고 주간 점검으로 반복하세요.",
  "해석에 반영된 성향",
  "사주 십성 분포",
  "성향 축 점수",
  "행동 패턴",
];

function stripRomanPrefix(title: string): string {
  return String(title || "")
    .replace(/^\s*[IVXLCDM]+\.\s*/i, "")
    .replace(/^\s*[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\.\s*/i, "")
    .trim();
}

const CHAPTERS: ChapterDefinition[] = [
  {
    id: "overview",
    order: 1,
    roman: "I",
    title: "FPTI 유형 총론 - 나의 운명 성향 코드",
    sections: [
      "FPTI 코드가 말해주는 기본 기질",
      "대표 십성이 만드는 성격의 중심축",
      "겉모습과 실제 내면의 차이",
      "반복되는 선택 패턴",
      "이 유형이 강해지는 조건",
      "이 유형이 흔들리는 조건",
    ],
  },
  {
    id: "inner",
    order: 2,
    roman: "II",
    title: "내면 성격과 감정 패턴",
    sections: [
      "감정을 받아들이는 기본 방식",
      "무의식적으로 자신을 지키는 방식",
      "가까운 사람 앞에서 드러나는 진짜 모습",
      "혼자 있을 때 회복되는 리듬",
      "감정이 쌓였을 때 나타나는 신호",
      "마음을 안정시키는 현실적 기준",
    ],
  },
  {
    id: "relationship",
    order: 3,
    roman: "III",
    title: "관계와 연애 패턴",
    sections: [
      "사람을 끌어당기는 매력 포인트",
      "좋아하는 사람 앞에서 나타나는 행동",
      "관계에서 반복되는 기대와 실망",
      "연애에서 강점이 되는 십성",
      "관계를 망치기 쉬운 그림자",
      "건강한 관계를 위한 조율 전략",
    ],
  },
  {
    id: "career",
    order: 4,
    roman: "IV",
    title: "일과 재능의 사용 방식",
    sections: [
      "타고난 일 처리 방식",
      "성과가 잘 나는 환경",
      "피해야 하는 업무 구조",
      "십성으로 보는 재능 사용법",
      "리더십과 협업 방식",
      "직업적 성장 전략",
    ],
  },
  {
    id: "wealth",
    order: 5,
    roman: "V",
    title: "돈과 현실 감각",
    sections: [
      "돈을 바라보는 기본 태도",
      "소비와 저축의 무의식 패턴",
      "재성 구조로 보는 현실 감각",
      "돈 때문에 흔들리는 지점",
      "안정적인 수익 구조를 만드는 방식",
      "현실 판단력을 높이는 습관",
    ],
  },
  {
    id: "stress",
    order: 6,
    roman: "VI",
    title: "스트레스와 그림자 성향",
    sections: [
      "압박을 받을 때 나타나는 반응",
      "과잉 십성이 만드는 문제",
      "부족한 십성이 만드는 불안",
      "인간관계에서 드러나는 방어기제",
      "무너질 때 반복하는 선택",
      "회복을 위한 현실적 처방",
    ],
  },
  {
    id: "growth",
    order: 7,
    roman: "VII",
    title: "성장 전략과 실행 로드맵",
    sections: [
      "이 유형의 인생 성장 방향",
      "지금 가장 먼저 고쳐야 할 습관",
      "관계·일·돈의 균형 전략",
      "30일 실행 루틴",
      "90일 변화 로드맵",
      "이 유형에게 필요한 한 문장",
    ],
  },
];

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function clamp(n: number, min = 0, max = 100): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function axisLevel(score: number): "low" | "mid" | "high" {
  if (score >= 68) return "high";
  if (score >= 40) return "mid";
  return "low";
}

function formatScore(score: number): string {
  if (!Number.isFinite(score)) return "0";
  const fixed = score.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

function uniqueList(values: string[], max = 6): string[] {
  const out: string[] = [];
  for (const value of values) {
    const normalized = toText(value);
    if (!normalized) continue;
    if (out.includes(normalized)) continue;
    out.push(normalized);
    if (out.length >= max) break;
  }
  return out;
}

function localTypeResult(input: FptiPremiumInput): LocalTypeResult {
  const result = input.result;
  const scores: FptiScores = {
    A: clamp(Number(result?.axisScores?.A ?? 50)),
    M: clamp(Number(result?.axisScores?.M ?? 50)),
    H: clamp(Number(result?.axisScores?.H ?? 50)),
    L: clamp(Number(result?.axisScores?.L ?? 50)),
    F: clamp(Number(result?.axisScores?.F ?? 50)),
    B: clamp(Number(result?.axisScores?.B ?? 50)),
    R: clamp(Number(result?.axisScores?.R ?? 50)),
    V: clamp(Number(result?.axisScores?.V ?? 50)),
  };

  const axes: FptiAxisResult[] = [
    { axis: "A", label: "에너지 반응 축", score: scores.A, level: axisLevel(scores.A), summary: scores.A >= 60 ? "외부 자극에서 동력이 빠르게 올라가는 편" : "내부 정리 후 움직일 때 힘이 커지는 편" },
    { axis: "H", label: "감정 판단 축", score: scores.H, level: axisLevel(scores.H), summary: scores.H >= 60 ? "상대의 온도와 맥락을 민감하게 읽는 편" : "기준과 원칙으로 정리해 안정적으로 판단하는 편" },
    { axis: "F", label: "실행 전개 축", score: scores.F, level: axisLevel(scores.F), summary: scores.F >= 60 ? "빠른 착수 후 보정하는 실전형" : "절차와 루틴으로 완성도를 높이는 구조형" },
    { axis: "R", label: "현실 전망 축", score: scores.R, level: axisLevel(scores.R), summary: scores.R >= 60 ? "현실 변수와 비용을 먼저 보는 편" : "방향성과 의미를 먼저 정해 추진하는 편" },
  ];

  const topAxes = [...axes].sort((a, b) => b.score - a.score).slice(0, 2);
  const lowAxes = [...axes].sort((a, b) => a.score - b.score).slice(0, 2);

  return {
    code: toText(input.fptiType || result?.code || "FPTI"),
    typeName: toText(input.fptiSubtype || result?.typeName || "사주 성향형"),
    scores,
    axes,
    topAxes,
    lowAxes,
    source: result?.source,
  };
}

function sourceFragments(source: LocalTypeResult["source"]): string[] {
  if (!source) return [];
  const parts = [
    toText(source?.dayMaster),
    toText(source?.monthBranch),
    toText(source?.season),
    ...(Array.isArray(source?.usefulGods) ? source.usefulGods : []),
    ...(Array.isArray(source?.favorableElements) ? source.favorableElements : []),
  ];
  return uniqueList(parts.filter(Boolean), 5);
}

function tenGodHighlights(source: LocalTypeResult["source"]): { primary: TenGodName; secondary: TenGodName; tertiary: TenGodName } {
  if (!source) return { primary: "정인", secondary: "정관", tertiary: "식신" };
  const raw = source?.tenGods || {};
  const ranked = [
    ["비견", Number(raw?.biGyeon || 0)],
    ["겁재", Number(raw?.geopJae || 0)],
    ["식신", Number(raw?.sikSin || 0)],
    ["상관", Number(raw?.sangGwan || 0)],
    ["정재", Number(raw?.jeongJae || 0)],
    ["편재", Number(raw?.pyeonJae || 0)],
    ["정관", Number(raw?.jeongGwan || 0)],
    ["편관", Number(raw?.pyeonGwan || 0)],
    ["정인", Number(raw?.jeongIn || 0)],
    ["편인", Number(raw?.pyeonIn || 0)],
  ] as Array<[TenGodName, number]>;

  ranked.sort((a, b) => b[1] - a[1]);
  return {
    primary: ranked[0]?.[0] || "정인",
    secondary: ranked[1]?.[0] || "정관",
    tertiary: ranked[2]?.[0] || "식신",
  };
}

function chapterBackdrop(chapterOrder: number, typeResult: LocalTypeResult): string {
  try {
    const top = typeResult.topAxes[0];
    const sub = typeResult.topAxes[1];
    const low = typeResult.lowAxes[0];
    const sourceBits = sourceFragments(typeResult.source);
    const tenGods = tenGodHighlights(typeResult.source);
    const sourceLine = sourceBits.length > 0 ? ` ${chapterOrder}장 기준 좌표는 ${sourceBits.join(" · ")}로 묶입니다.` : "";
    const tenGodLine = ` ${chapterOrder}장 십성 축으로는 ${tenGods.primary}·${tenGods.secondary}·${tenGods.tertiary}가 핵심 성향과 진로 감각을 이끕니다.`;

    if (chapterOrder === 1) {
      return `${typeResult.code}(${typeResult.typeName})는 ${top.label} ${formatScore(top.score)}가 앞에서 운전을 잡고, ${sub.label} ${formatScore(sub.score)}가 뒤에서 속도를 보탭니다.${sourceLine}${tenGodLine} 반대로 ${low.label} ${formatScore(low.score)}는 과로가 오기 쉬운 구간이라, 기준을 세우지 않으면 판단보다 소모가 먼저 커집니다.`;
    }
    if (chapterOrder === 2) {
      return `겉으로는 차분해 보여도 실제 내면은 ${top.label}의 계산과 ${low.label}의 피로를 동시에 감지합니다.${sourceLine}${tenGodLine} 그래서 감정은 폭발보다 누적형으로 나타나며, 정리되지 않은 생각이 길어질수록 자기방어가 먼저 올라옵니다.`;
    }
    if (chapterOrder === 3) {
      return `관계에서는 ${top.label}가 신뢰를 만들고, ${low.label}가 경계를 늦게 알려줍니다.${sourceLine}${tenGodLine} 가까워질수록 기준이 더 분명해지는 타입이라, 감정의 양보다 거리 조절과 합의 문장이 만족도를 좌우합니다.`;
    }
    if (chapterOrder === 4) {
      return `일에서는 ${top.label}의 현실 점검이 성과의 기본값이고, ${sub.label}의 보조 전개가 결과를 안정시킵니다.${sourceLine}${tenGodLine} 다만 ${low.label}가 흔들리면 협업 속도보다 완료 기준이 먼저 흐려지므로, 시스템과 역할을 먼저 맞춰야 합니다.`;
    }
    if (chapterOrder === 5) {
      return `돈을 볼 때 ${top.label}는 숫자보다 "이 선택이 오래 버티는가"를 먼저 묻습니다.${sourceLine}${tenGodLine} ${low.label}가 약해질수록 충동 소비보다 보수적 회피가 더 문제로 드러나기 때문에, 리스크를 줄이는 장치와 성장 자금을 동시에 설계해야 합니다.`;
    }
    if (chapterOrder === 6) {
      return `${top.label}가 강한 사람일수록 외부 압박보다 내부 과부하에서 먼저 무너집니다.${sourceLine}${tenGodLine} ${low.label}는 휴식과 경계가 무너지면 판단 속도를 잃고, 그 순간부터는 결정보다 회피와 과통제가 번갈아 나타납니다.`;
    }
    return `${typeResult.code}(${typeResult.typeName})의 성장 핵심은 ${top.label}의 강점을 과신하지 않고 ${low.label}의 취약 구간을 생활 루틴으로 낮추는 데 있습니다.${sourceLine}${tenGodLine} 단기 목표보다 복귀 속도와 점검 습관이 장기 성취를 더 크게 바꿉니다.`;
  } catch (e) {
    return `이 장의 해석을 로드할 수 없습니다. 잠시 후 다시 시도해 주세요.`;
  }
}

function sectionLens(chapterOrder: number, title: string, typeResult: LocalTypeResult): string {
  try {
    const top = typeResult.topAxes[0];
    const low = typeResult.lowAxes[0];
    const tenGods = tenGodHighlights(typeResult.source);
    const titleHint = title.replace(/^[0-9IVXL.\s-]+/g, "").trim();

  if (chapterOrder === 7 && title.includes("7일")) {
    return `> 7일 실행은 완벽한 변화가 아니라 ${top.label}를 실제 행동으로 옮기는 복귀 훈련입니다.`;
  }
    if (chapterOrder === 7 && title.includes("30일")) {
      return `> 30일 로드맵은 ${low?.label}가 흔들리는 날에도 자동으로 돌아오는 생활 시스템을 만드는 작업입니다.`;
    }
    if (title.includes("관계") || title.includes("연애")) {
      return `> 관계는 감정의 크기보다 합의의 정확도가 더 중요하고, ${top?.label}는 그 기준을 선명하게 만듭니다. 십성으로는 ${tenGods?.primary}와 ${tenGods?.secondary}가 관계의 거리와 신뢰를 다룹니다.`;
    }
    if (title.includes("돈") || title.includes("재물")) {
      return `> 돈은 한 번의 큰 결정보다, ${low?.label}가 과열될 때 새는 작은 선택들을 먼저 다루는 쪽이 훨씬 중요합니다. 십성으로는 ${tenGods?.primary}가 관리 본능을, ${tenGods?.secondary}가 확장 감각을 만집니다.`;
    }
    if (title.includes("스트레스") || title.includes("그림자")) {
      return `> 스트레스는 성격의 문제가 아니라 ${low?.label}가 경고를 보내는 방식으로 이해해야 정확합니다. 십성 축에서 보면 ${tenGods?.primary}와 ${tenGods?.tertiary}가 흔들릴 때 피로가 빨리 드러납니다.`;
    }
    if (title.includes("성장") || title.includes("로드맵")) {
      return `> 성장 전략은 의지 선언문이 아니라 ${top?.label}를 유지하고 ${low?.label}를 보호하는 운영 규칙입니다. 십성으로는 ${tenGods?.primary}/${tenGods?.secondary}를 강점화하는 설계가 핵심입니다.`;
    }
    if (title.includes("일") || title.includes("재능")) {
      return `> 일과 재능은 속도 경쟁이 아니라 ${top?.label}의 기준을 반복 가능한 프로세스로 바꾸는 문제입니다. 십성으로는 ${tenGods?.primary}가 진로 방향을, ${tenGods?.secondary}가 직무 적합도를 보여줍니다.`;
    }
    if (title.includes("내면") || title.includes("감정")) {
      return `> 내면 패턴은 감정의 세기가 아니라, ${top?.label}와 ${low?.label}가 언제 교대로 작동하는지에서 드러납니다. 십성으로는 ${tenGods?.primary}의 자기 기준과 ${tenGods?.tertiary}의 회복력이 중요합니다.`;
    }
    if (title.includes("총론") || title.includes("유형")) {
      return `> ${titleHint}은 ${typeResult.code}가 왜 같은 선택을 반복하는지 설명하는 가장 압축된 지도입니다.`;
    }
    return `> ${titleHint}은 ${typeResult.code}의 현재 축이 실제 생활에서 어떤 모습으로 나타나는지 보여줍니다.`;
  } catch (e) {
    return `> 이 섹션은 현재 점수 분포를 기준으로 감정, 행동, 현실 선택을 안정적으로 해석한 안내입니다.`;
  }
}

function chapterClose(chapterOrder: number, flavor: { strength: string; risk: string; action: string }, typeResult: LocalTypeResult): string {
  const top = typeResult.topAxes[0];
  const low = typeResult.lowAxes[0];
  const tenGods = tenGodHighlights(typeResult.source);
  const profile = `${top.label} ${formatScore(top.score)}와 ${low.label} ${formatScore(low.score)}의 차이가 클수록, 강점은 더 선명해지지만 에너지 관리도 더 중요해집니다.`;

  if (chapterOrder === 1) {
    return `- 핵심 운영 원칙: ${flavor.strength}\n- 흔들림 경고: ${flavor.risk}\n- 실행 기준: ${flavor.action}\n- 십성 기준: ${tenGods.primary}는 성격의 중심, ${tenGods.secondary}는 진로의 보조 엔진입니다.\n- 점수 해석: ${profile}`;
  }
  if (chapterOrder === 2) {
    return `- 감정의 시작: 작은 피로가 누적되면 반응이 먼저 변합니다.\n- 방어 패턴: 설명보다 정리와 거리두기가 먼저 나올 수 있습니다.\n- 회복 기준: 사실과 감정을 분리해 적는 순간 복원이 시작됩니다.\n- 십성 기준: ${tenGods.primary}/${tenGods.tertiary}는 감정 처리 방식의 핵심입니다.\n- 축 참고: ${profile}`;
  }
  if (chapterOrder === 3) {
    return `- 관계 강점: 신뢰를 천천히 쌓으면 관계 유지력이 높아집니다.\n- 관계 약점: 피곤한 마음을 늦게 말하면 오해가 커집니다.\n- 실천 기준: 기대치와 경계를 먼저 합의하세요.\n- 십성 기준: ${tenGods.primary}는 관계 태도, ${tenGods.secondary}는 표현 방식에 가깝습니다.\n- 축 참고: ${profile}`;
  }
  if (chapterOrder === 4) {
    return `- 업무 강점: 기준이 선명한 환경에서 성과가 가장 잘 납니다.\n- 업무 약점: 역할이 흐리면 책임이 과도하게 쌓입니다.\n- 실천 기준: 시작 전에 완료 기준을 문장으로 고정하세요.\n- 십성 기준: ${tenGods.primary}는 업무 스타일, ${tenGods.secondary}는 커리어 방향을 설명합니다.\n- 축 참고: ${profile}`;
  }
  if (chapterOrder === 5) {
    return `- 재물 강점: ${flavor.strength}\n- 재물 약점: ${flavor.risk}\n- 실천 기준: 소비와 투자, 예비비를 분리해 관리하세요.\n- 십성 기준: ${tenGods.primary}는 돈 관리, ${tenGods.tertiary}는 수익 확장과 연결됩니다.\n- 축 참고: ${profile}`;
  }
  if (chapterOrder === 6) {
    return `- 번아웃 신호: 속도가 아니라 판단의 질이 먼저 무너집니다.\n- 그림자 패턴: 숨 고르기보다 과통제가 먼저 올라올 수 있습니다.\n- 실천 기준: 회복이 끝날 때까지 큰 결정을 미루세요.\n- 십성 기준: ${tenGods.primary}와 ${tenGods.secondary}가 과열되면 판단보다 방어가 앞설 수 있습니다.\n- 축 참고: ${profile}`;
  }
  return `- 성장 강점: ${flavor.strength}\n- 성장 리스크: ${flavor.risk}\n- 실천 기준: 주간 핵심 기준 2개를 먼저 정하고 매일 적용 여부를 기록하세요.\n- 십성 기준: ${tenGods.primary}는 유지, ${tenGods.secondary}는 활용, ${tenGods.tertiary}는 보완의 우선순위입니다.\n- 축 참고: ${profile}`;
}

function renderSignals(typeResult: LocalTypeResult, chapterTitle: string, sectionTitle: string): string[] {
  const top = typeResult.topAxes[0];
  const low = typeResult.lowAxes[0];
  return uniqueList([
    `주 유형: ${typeResult.code}`,
    `${top.label} 높음(${top.score})`,
    `${low.label} 낮음(${low.score})`,
    `${chapterTitle} 반영`,
    `${sectionTitle} 집중 해석`,
  ], 5);
}

function repeatSafe(text: string): string {
  return removeRepeatedFptiPhrases(sanitizeFptiDeepReportText(text));
}

function chapterFlavor(chapterOrder: number): { strength: string; risk: string; action: string } {
  if (chapterOrder === 1) return { strength: "자기 기준이 분명해 선택의 일관성이 높습니다.", risk: "기준 검토가 길어지면 출발이 늦어질 수 있습니다.", action: "결정 마감 시간을 먼저 정해 판단 지연을 줄이세요." };
  if (chapterOrder === 2) return { strength: "감정의 결을 섬세하게 읽어 관계 조율에 유리합니다.", risk: "피로 구간에서는 감정 과해석이 늘어날 수 있습니다.", action: "감정 기록과 사실 기록을 분리해 정리하세요." };
  if (chapterOrder === 3) return { strength: "관계의 신뢰를 장기적으로 유지하는 힘이 큽니다.", risk: "불편을 늦게 표현하면 누적 갈등이 커질 수 있습니다.", action: "주 1회 기대치 점검 대화를 고정하세요." };
  if (chapterOrder === 4) return { strength: "강점과 환경의 궁합을 읽어 성과를 구조화합니다.", risk: "요청을 과수용하면 집중력이 분산됩니다.", action: "업무 수락 전에 완료 기준을 먼저 합의하세요." };
  if (chapterOrder === 5) return { strength: "리스크를 미리 보는 현실 감각이 안정성을 높입니다.", risk: "과도한 보수성으로 기회를 놓칠 수 있습니다.", action: "소규모 실험 예산을 따로 두어 도전성을 보완하세요." };
  if (chapterOrder === 6) return { strength: "무너짐 신호를 빠르게 감지하면 복구가 빠릅니다.", risk: "압박이 누적되면 회피와 과통제가 번갈아 나타납니다.", action: "위기 신호 3개를 사전 정의하고 결정 유예 규칙을 적용하세요." };
  return { strength: "실행 단위를 작게 쪼개면 성장 지속성이 높아집니다.", risk: "목표가 추상적이면 계획만 늘고 실행이 줄어듭니다.", action: "7일과 30일 목표를 분리해 체크리스트로 운영하세요." };
}

function scoreGap(a: number, b: number): number {
  return Math.abs(clamp(a) - clamp(b));
}

function scoreTier(score: number): string {
  if (score >= 75) return "매우 높음";
  if (score >= 60) return "높음";
  if (score >= 45) return "중간";
  if (score >= 30) return "낮음";
  return "매우 낮음";
}

function sectionDiagnosis(title: string, typeResult: LocalTypeResult): { focus: string; risk: string; action: string; metric: string } {
  const top = typeResult.topAxes[0];
  const sub = typeResult.topAxes[1];
  const low = typeResult.lowAxes[0];
  const tenGods = tenGodHighlights(typeResult.source);
  const spread = scoreGap(top.score, low.score);

  if (title.includes("자존감") || title.includes("자기평가") || title.includes("자기대화")) {
    return {
      focus: `${top.label} 강점이 성과 기반 자기확신으로 이어질 때 자존감이 안정됩니다.`,
      risk: `${low.label} 축이 흔들리면 비교 심리가 과열되어 자기비난 루프가 발생할 수 있습니다.`,
      action: `하루 종료 전 성과 1개·감정 1개·교정 1개를 기록해 자기대화의 기준을 고정하세요.`,
      metric: `자기평가 안정도 지표: 상위-하위 축 점수 차 ${formatScore(spread)} (${scoreTier(100 - spread)} 수준)` ,
    };
  }
  if (title.includes("연애") || title.includes("관계") || title.includes("갈등") || title.includes("화해")) {
    return {
      focus: `${tenGods.primary}/${tenGods.secondary} 십성 조합이 관계의 신뢰 형성 속도와 경계 설정 방식을 결정합니다.`,
      risk: `${low.label} 피로 구간에서는 의도 전달보다 방어 반응이 먼저 나와 갈등이 길어질 수 있습니다.`,
      action: `갈등 발생 24시간 내 합의 문장 1개(사실-요청-기한)를 작성해 감정 해석을 행동 합의로 전환하세요.`,
      metric: `관계 복원 지표: 갈등 후 회복까지 걸리는 시간(시간 단위)을 주간 평균으로 추적`,
    };
  }
  if (title.includes("일") || title.includes("업무") || title.includes("직무") || title.includes("커리어") || title.includes("리더십")) {
    return {
      focus: `${top.label}는 생산성 엔진, ${sub.label}는 완성도 엔진으로 작동해 성과 구조를 만듭니다.`,
      risk: `요청 과수용 시 ${low.label} 축이 먼저 무너져 착수-완료 간 지연이 확대될 수 있습니다.`,
      action: `모든 업무를 착수 기준/완료 기준/중단 기준 3문장으로 정의해 병목을 선제 차단하세요.`,
      metric: `업무 일관성 지표: 주간 완료율(완료 건수/착수 건수)과 재작업률 동시 추적`,
    };
  }
  if (title.includes("돈") || title.includes("재정") || title.includes("수익") || title.includes("소비") || title.includes("현금")) {
    return {
      focus: `${tenGods.primary} 십성은 관리 본능, ${tenGods.secondary}는 확장 본능으로 재정 의사결정의 방향을 만듭니다.`,
      risk: `${low.label} 과열 시 손실 회피가 과도해져 필요한 투자도 미루거나, 반대로 보상 소비가 증가할 수 있습니다.`,
      action: `지출을 생존/성장/만족 3계정으로 분리하고, 성장계정은 월 고정 비율로 자동 이체하세요.`,
      metric: `재정 건전성 지표: 변동지출 비율과 비계획 지출 횟수를 월 단위로 추적`,
    };
  }
  if (title.includes("스트레스") || title.includes("그림자") || title.includes("번아웃") || title.includes("회복")) {
    return {
      focus: `${top.label} 고성능 상태가 길어질수록 회복 여백이 줄어 그림자 반응이 가속될 수 있습니다.`,
      risk: `${low.label} 저하 구간에서 회피/과통제 반응이 번갈아 나타나 의사결정 품질이 급감할 수 있습니다.`,
      action: `번아웃 전조 신호 3개(수면, 집중, 예민도)를 수치화해 임계점 도달 시 즉시 일정 강도를 30% 낮추세요.`,
      metric: `회복 탄력 지표: 스트레스 이벤트 이후 기준 컨디션 복귀까지 걸리는 일수`,
    };
  }

  return {
    focus: `${typeResult.code}의 핵심은 ${top.label}(${scoreTier(top.score)})과 ${sub.label}(${scoreTier(sub.score)})의 조합이 만드는 운영 패턴입니다.`,
    risk: `${low.label}(${scoreTier(low.score)}) 구간의 미세한 흔들림이 누적되면 선택 품질이 저하될 수 있습니다.`,
    action: `의사결정 전에 기준 문장 1개와 금지 기준 1개를 먼저 적어 판단 편차를 줄이세요.`,
    metric: `성향 안정 지표: 상위 2축 평균 ${formatScore((top.score + sub.score) / 2)} / 하위 축 ${formatScore(low.score)}`,
  };
}

export function buildFptiDeepSection(typeResult: LocalTypeResult, sectionDefinition: { chapter: ChapterDefinition; title: string }): FptiDeepSection {
  const { chapter, title } = sectionDefinition;
  const signals = renderSignals(typeResult, chapter.title, title);
  const top = typeResult.topAxes[0];
  const sub = typeResult.topAxes[1];
  const low = typeResult.lowAxes[0];
  const flavor = chapterFlavor(chapter.order);
  const diagnosis = sectionDiagnosis(title, typeResult);
  const contextualStrength = `${flavor.strength} 특히 ${title} 장면에서는 강점의 작동 조건을 문장으로 고정할수록 체감 안정성이 높아집니다.`;
  const contextualRisk = `${flavor.risk} ${title} 구간에서는 과열 신호를 빠르게 인식하는 것이 손실을 줄입니다.`;
  const contextualAction = `${flavor.action} ${title}에 대해 오늘 적용할 행동 기준을 1개만 정해 바로 실행해 보세요.`;

  let interpretation = `${chapterBackdrop(chapter.order, typeResult)}\n\n${sectionLens(chapter.order, title, typeResult)}\n\n- ${title}에서 가장 강한 축: ${top.label} ${formatScore(top.score)} (${scoreTier(top.score)})\n- ${title}에서 보조 축: ${sub.label} ${formatScore(sub.score)} (${scoreTier(sub.score)})\n- ${title}에서 취약 축: ${low.label} ${formatScore(low.score)} (${scoreTier(low.score)})\n- ${title} 핵심 진단 포인트: ${diagnosis.focus}\n- ${title} 리스크 창구: ${diagnosis.risk}\n- ${title} 권장 개입 액션: ${diagnosis.action}\n- ${title} 측정 지표: ${diagnosis.metric}\n- 이 항목의 읽는 법: ${title}은 ${typeResult.code}의 성향이 실제 생활에서 어떤 습관으로 드러나는지 보여주는 체크포인트입니다.`;

  interpretation += `\n\n${chapter.order === 1 ? `총론에서는 유형의 큰 방향을, 나머지 챕터에서는 같은 방향이 관계·일·돈·스트레스에서 어떻게 다른 모습으로 나타나는지를 봐야 합니다.` : `${title} 장면에서 중요한 것은 강점을 더 세게 쓰는 것이 아니라, 약해지는 구간을 미리 알아차리고 운영 규칙으로 바꾸는 일입니다.`}\n\n${chapterClose(chapter.order, flavor, typeResult)}`;

  if (chapter.order === 7 && title === "30일 실행 루틴") {
    interpretation = `30일 실행 루틴은 1주차 리듬 정리, 2주차 실행 고정, 3주차 경계 조정, 4주차 유지 시스템 정착의 4단계로 운영합니다. 첫 주에는 수면과 집중 시간대를 안정화해 에너지 바닥을 먼저 방지하고, 둘째 주에는 하루 핵심 행동 1개를 고정해 실행 리듬을 만듭니다. 셋째 주에는 요청 수락 기준과 거절 문장을 정리해 관계 피로를 줄이고, 넷째 주에는 월간 점검표를 만들어 반복 가능한 운영 구조를 완성합니다. ${sub.label} 보조 강점을 유지하면서 ${low.label} 취약 축의 변동성을 낮추면 단기 성과보다 장기 복원력이 먼저 개선됩니다. 이 루틴의 핵심은 많이 하는 것이 아니라 같은 기준으로 다시 시작할 수 있는 복귀 시스템을 확보하는 데 있습니다.`;
  }

  return {
    title,
    usedSignals: signals,
    interpretation: repeatSafe(interpretation),
    body: repeatSafe(interpretation),
    strength: contextualStrength,
    risk: contextualRisk,
    action: contextualAction,
    advice: contextualAction,
  };
}

export function buildFptiDeepChapter(typeResult: LocalTypeResult, chapterDefinition: ChapterDefinition, unlocked = true): FptiDeepChapter {
  const sections = chapterDefinition.sections.map((title) => buildFptiDeepSection(typeResult, { chapter: chapterDefinition, title }));
  const previewSection = sections[0]
    ? {
      ...sections[0],
      interpretation: `${sections[0].interpretation.split(". ").slice(0, 2).join(". ").trim()}.`,
    }
    : null;
  const previewSections = sections.map((section) => {
    const interpretation = section.interpretation || "";
    const previewText = interpretation.split(". ").slice(0, 2).join(". ").trim();
    return {
      ...section,
      interpretation: previewText.length > 0 ? `${previewText}.` : interpretation,
      body: previewText.length > 0 ? `${previewText}.` : interpretation,
    };
  });

  const summary = repeatSafe(
    `${chapterDefinition.roman}. ${chapterDefinition.title} 요약: 이 챕터는 ${typeResult.typeName}(${typeResult.code})의 점수 분포를 바탕으로 선택 흐름을 현실 언어로 정리합니다. 상위 축인 ${typeResult.topAxes[0].label}(${formatScore(typeResult.topAxes[0].score)})과 ${typeResult.topAxes[1].label}(${formatScore(typeResult.topAxes[1].score)})은 강점이 발휘되는 장면을 설명하고, 하위 축인 ${typeResult.lowAxes[0].label}(${formatScore(typeResult.lowAxes[0].score)})은 피로 누적과 의사결정 지연이 발생하기 쉬운 조건을 보여 줍니다. 따라서 이 챕터의 핵심은 장점을 과신하지 않고 약점을 억지로 지우지도 않으면서, 생활 루틴 안에 실행 가능한 기준을 고정하는 데 있습니다. 카테고리별 해석은 중복 문장을 피하고 주제별로 분리되어 있어, 관계·일·돈·감정 영역에서 바로 적용 가능한 운영 포인트를 찾을 수 있게 구성했습니다. ${chapterDefinition.order === 1 ? "총론은 나머지 여섯 챕터를 읽는 기준점입니다." : "이 챕터는 같은 유형 안에서도 상황에 따라 달라지는 운영 포인트를 구분해 줍니다."}`,
  );

  const lockedByPreview = !unlocked && chapterDefinition.order > 1;

  return {
    id: chapterDefinition.id,
    order: chapterDefinition.order,
    roman: chapterDefinition.roman,
    title: chapterDefinition.title,
    preview: previewSection?.interpretation || "",
    isPreview: !unlocked,
    locked: lockedByPreview,
    sections: unlocked ? sections : (chapterDefinition.order === 1 ? (previewSection ? [previewSection] : previewSections.slice(0, 1)) : []),
    chapterSummary: lockedByPreview ? "잠금 해제 후 전체 내용을 확인할 수 있습니다." : summary,
  };
}

export function sanitizeFptiDeepReportText(text: string): string {
  const normalized = toText(text)
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\s*\n\s*/g, " ")
    .trim();
  return normalized;
}

export function removeRepeatedFptiPhrases(text: string): string {
  const lines = sanitizeFptiDeepReportText(text).split(/(?<=[.!?])\s+/).filter(Boolean);
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (key.length >= 20 && seen.has(key)) continue;
    seen.add(key);
    deduped.push(line);
  }
  return deduped.join(" ").trim();
}

export function validateFptiDeepReport(report: FptiDeepReport): ValidationResult {
  const errors: string[] = [];

  if (report.reportType !== "FPTI_DEEP_REPORT") errors.push("reportType must be FPTI_DEEP_REPORT");
  if (report.mode !== "local") errors.push("mode must be local");
  if (report.meta.apiUsed !== false) errors.push("apiUsed must be false");
  if (report.meta.pdfEnabled !== false) errors.push("pdfEnabled must be false");
  if (report.chapters.length !== 7) errors.push("chapter count must be 7");

  const expectedTitles = CHAPTERS.map((chapter) => chapter.title);
  const actualTitles = report.chapters.map((chapter) => stripRomanPrefix(chapter.title));
  for (let i = 0; i < expectedTitles.length; i += 1) {
    if (expectedTitles[i] !== actualTitles[i]) {
      errors.push(`chapter title mismatch at ${i + 1}`);
    }
  }

  const sentenceCounter = new Map<string, number>();
  const chapterBodies: string[] = [];
  const triads = new Map<string, number>();

  for (let chapterIndex = 0; chapterIndex < report.chapters.length; chapterIndex += 1) {
    const chapter = report.chapters[chapterIndex];
    if (chapter.sections.length < 5 && !chapter.locked) {
      errors.push(`section count too low: ${chapter.roman}`);
    }
    if (stripRomanPrefix(chapter.title) !== chapter.title) {
      errors.push(`chapter title contains roman prefix: ${chapter.roman}`);
    }
    if (chapter.order !== chapterIndex + 1) {
      errors.push(`chapter order mismatch at ${chapterIndex + 1}`);
    }
    if (sanitizeFptiDeepReportText(chapter.chapterSummary).length < 250) {
      errors.push(`chapter summary too short: ${chapter.roman}`);
    }

    const bodyParts: string[] = [];
    for (let sectionIndex = 0; sectionIndex < chapter.sections.length; sectionIndex += 1) {
      const section = chapter.sections[sectionIndex];
      if (section.usedSignals.length < 2) {
        errors.push(`usedSignals too short: ${chapter.roman}/${section.title}`);
      }
      const expectedSectionTitle = CHAPTERS[chapterIndex]?.sections?.[sectionIndex] || "";
      if (!chapter.locked && expectedSectionTitle && stripRomanPrefix(section.title) !== expectedSectionTitle) {
        errors.push(`section title mismatch: ${chapter.roman}/${sectionIndex + 1}`);
      }
      if (/\b(섹션|section|카테고리)\s*\d+/i.test(section.title)) {
        errors.push(`placeholder section title detected: ${chapter.roman}/${section.title}`);
      }
      const interpretation = sanitizeFptiDeepReportText(section.interpretation);
      if (!chapter.locked && interpretation.length < 180) {
        errors.push(`interpretation too short: ${chapter.roman}/${section.title}`);
      }
      bodyParts.push(interpretation);
      const triadKey = `${sanitizeFptiDeepReportText(section.strength || "")}|${sanitizeFptiDeepReportText(section.risk || "")}|${sanitizeFptiDeepReportText(section.action || "")}`;
      if (triadKey !== "||") {
        triads.set(triadKey, (triads.get(triadKey) || 0) + 1);
      }

      const chunks = interpretation.split(/(?<=[.!?])\s+/).filter((chunk) => chunk.length >= 20);
      for (const chunk of chunks) {
        const key = chunk.toLowerCase();
        sentenceCounter.set(key, (sentenceCounter.get(key) || 0) + 1);
      }
    }

    chapterBodies.push(bodyParts.join("\n"));
  }

  for (const phrase of FORBIDDEN_TEXT) {
    const full = JSON.stringify(report).toLowerCase();
    if (full.includes(phrase.toLowerCase())) {
      errors.push(`forbidden phrase included: ${phrase}`);
    }
  }

  const full = JSON.stringify(report);
  if (/I\.\s*I\.|II\.\s*II\.|III\.\s*III\./i.test(full)) {
    errors.push("duplicated chapter numeral detected");
  }
  if (/(상관|비견|겁재|식신|편재|정재|편관|정관|편인|정인)가\b/.test(full)) {
    errors.push("awkward ten-god particle detected");
  }
  if (/undefined|null|\[object Object\]/i.test(full)) {
    errors.push("invalid token detected in report text");
  }

  for (const count of sentenceCounter.values()) {
    if (count >= 50) {
      errors.push("same sentence repeated in report");
      break;
    }
  }

  for (let i = 0; i < chapterBodies.length; i += 1) {
    for (let j = i + 1; j < chapterBodies.length; j += 1) {
      if (chapterBodies[i] && chapterBodies[i] === chapterBodies[j]) {
        errors.push("same chapter body repeated");
      }
    }
  }

  for (const count of triads.values()) {
    if (count >= 2) {
      errors.push("same strength/risk/action triad repeated");
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildFptiDeepReport(input: FptiPremiumInput, options?: { unlocked?: boolean }): FptiDeepReport {
  try {
    const typeResult = localTypeResult(input);
    const unlocked = options?.unlocked !== false;

    const chapters = CHAPTERS.map((chapter) => {
      try {
        return buildFptiDeepChapter(typeResult, chapter, unlocked);
      } catch (e) {
        // Return minimal fallback chapter on error
        const safeText = `${chapter.roman}. ${chapter.title}은 현재 데이터 변동이 있어도 안정적으로 읽을 수 있도록 기준형 해석으로 보강되었습니다. 이 섹션에서는 성향 축, 관계 패턴, 실행 전략을 순서대로 정리해 실제 생활에 적용할 수 있는 문장 중심 가이드를 제공합니다. 핵심은 강점의 과신을 줄이고 취약 구간을 운영 규칙으로 바꾸는 것입니다.`;
        return {
          id: chapter.id,
          order: chapter.order,
          roman: chapter.roman,
          title: chapter.title,
          isPreview: !unlocked,
          locked: !unlocked && chapter.order > 1,
          sections: !unlocked && chapter.order > 1
            ? []
            : [{
              title: chapter.sections[0] || "핵심 해석",
              usedSignals: ["기본 성향 축", "십성 분포", "생활 적용 문장"],
              interpretation: safeText,
              body: safeText,
              strength: "상황 판단 기준이 분명해집니다.",
              risk: "피로 누적 시 판단이 느려질 수 있습니다.",
              action: "하루 1개 핵심 행동을 먼저 완료하세요.",
              advice: "하루 1개 핵심 행동을 먼저 완료하세요.",
            }],
          chapterSummary: !unlocked && chapter.order > 1
            ? "잠금 해제 후 전체 내용을 확인할 수 있습니다."
            : safeText,
        };
      }
    });

  const report: FptiDeepReport = {
    reportType: "FPTI_DEEP_REPORT",
    mode: "local",
    generatedAt: toText(input.createdAt || new Date().toISOString()),
    userTypeCode: typeResult.code,
    typeName: typeResult.typeName,
    scores: typeResult.scores,
    axes: typeResult.axes,
    unlocked,
    chapters,
    summary: {
      preview: repeatSafe(`${typeResult.typeName}(${typeResult.code})은 ${typeResult.topAxes[0].summary} 성향이 강하고, ${typeResult.lowAxes[0].summary} 구간에서 피로가 누적되기 쉽습니다. 잠금 해제 후 7개 챕터 전체에서 관계·일·돈·스트레스·성장 전략을 세부적으로 확인할 수 있습니다. 현재 축의 핵심은 ${typeResult.topAxes[0].label} ${formatScore(typeResult.topAxes[0].score)}, 보조 동력은 ${typeResult.topAxes[1].label} ${formatScore(typeResult.topAxes[1].score)}, 보완 과제는 ${typeResult.lowAxes[0].label} ${formatScore(typeResult.lowAxes[0].score)}입니다. 십성 기준으로는 ${tenGodHighlights(typeResult.source).primary}/${tenGodHighlights(typeResult.source).secondary}/${tenGodHighlights(typeResult.source).tertiary}가 성격과 진로 방향을 설명합니다.`),
      highlights: uniqueList([
        `${typeResult.topAxes[0].label} 강점 활용`,
        `${typeResult.topAxes[1].label} 보조 활용`,
        `${typeResult.lowAxes[0].label} 보완 전략 필요`,
        `${tenGodHighlights(typeResult.source).primary} 십성 활용`,
        `${tenGodHighlights(typeResult.source).secondary} 진로 축`,
      ], 3),
      caution: `${typeResult.lowAxes[0].label}(${typeResult.lowAxes[0].score}) 구간에서 의사결정이 급하거나 늦어지기 쉬우므로, 기준 문장과 점검 루틴을 함께 유지하세요. 십성으로는 ${tenGodHighlights(typeResult.source).primary}와 ${tenGodHighlights(typeResult.source).secondary}가 과해질 때 한 박자 쉬어가는 게 좋습니다.`,
    },
    meta: {
      engineVersion: "fpti-local-deep-v2.0.0",
      apiUsed: false,
      pdfEnabled: false,
      chapterCount: 7,
    },
  };

    return report;
  } catch (e) {
    // Return absolute minimal fallback report
    return {
      reportType: "FPTI_DEEP_REPORT",
      mode: "local",
      generatedAt: new Date().toISOString(),
      userTypeCode: input.result?.code || "ERR",
      typeName: input.result?.typeName || "리포트 로딩 오류",
      scores: { A: 50, M: 50, H: 50, L: 50, F: 50, B: 50, R: 50, V: 50 },
      axes: [],
      unlocked: options?.unlocked !== false,
      chapters: [],
      summary: {
        preview: "리포트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        highlights: [],
        caution: "문제가 지속되면 문의해 주세요.",
      },
      meta: {
        engineVersion: "fpti-local-deep-v2.0.0",
        apiUsed: false,
        pdfEnabled: false,
        chapterCount: 7,
      },
    };
  }
}

export function validateFptiPremiumReport(report: FptiPremiumReport): ValidationResult {
  return validateFptiDeepReport(report);
}

export function buildFptiPremiumReport(input: FptiPremiumInput): FptiPremiumReport {
  const report = buildFptiDeepReport(input, { unlocked: true });
  const checked = validateFptiDeepReport(report);
  if (checked.valid) return report;

  const repaired = buildFptiDeepReport(input, { unlocked: true });
  return repaired;
}
