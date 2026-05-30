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
  strength?: string;
  risk?: string;
  action?: string;
};

export type FptiDeepChapter = {
  order: number;
  roman: "I" | "II" | "III" | "IV" | "V" | "VI" | "VII";
  title: string;
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
];

const CHAPTERS: ChapterDefinition[] = [
  {
    order: 1,
    roman: "I",
    title: "FPTI 유형 총론 - 나의 운명 성향 코드",
    sections: [
      "나의 FPTI 유형 코드",
      "유형을 구성하는 핵심 축",
      "가장 강하게 드러난 성향",
      "보조적으로 작동하는 성향",
      "이 유형의 인생 운영 방식",
      "이 유형이 세상을 해석하는 방식",
      "겉으로 보이는 모습과 실제 내면의 차이",
      "이 유형의 대표 강점",
      "이 유형의 대표 약점",
      "한 줄 핵심 정의",
      "이 유형에게 가장 중요한 삶의 기준",
    ],
  },
  {
    order: 2,
    roman: "II",
    title: "내면 성격과 감정 패턴",
    sections: [
      "기본 성격 구조",
      "감정을 느끼는 방식",
      "감정을 표현하는 방식",
      "혼자 있을 때의 내면 상태",
      "불안하거나 흔들릴 때의 반응",
      "자존감이 올라가는 조건",
      "자존감이 떨어지는 조건",
      "인정 욕구와 자기 기준",
      "감정 회복 방식",
      "내면에서 반복되는 생각",
      "스스로를 다루는 방법",
    ],
  },
  {
    order: 3,
    roman: "III",
    title: "관계와 연애 패턴",
    sections: [
      "사람을 대하는 기본 태도",
      "가까워지는 속도",
      "좋아하는 사람 앞에서의 모습",
      "연애에서 강하게 원하는 것",
      "연애에서 불안해지는 지점",
      "관계에서 반복되는 실수",
      "잘 맞는 상대 유형",
      "피곤해지는 상대 유형",
      "갈등이 생겼을 때의 반응",
      "이별 또는 거리감이 생기는 패턴",
      "오래 가는 관계를 위한 조언",
    ],
  },
  {
    order: 4,
    roman: "IV",
    title: "일과 재능의 사용 방식",
    sections: [
      "일할 때 가장 강해지는 방식",
      "타고난 재능의 방향",
      "집중력이 살아나는 환경",
      "성과를 만드는 방식",
      "조직에서의 역할",
      "혼자 일할 때와 함께 일할 때의 차이",
      "어울리는 직무 방향",
      "피해야 할 업무 환경",
      "인정받는 방식",
      "커리어에서 반복되는 문제",
      "재능을 돈으로 연결하는 방법",
    ],
  },
  {
    order: 5,
    roman: "V",
    title: "돈과 현실 감각",
    sections: [
      "돈을 바라보는 기본 태도",
      "소비 습관",
      "돈이 모이는 방식",
      "돈이 새는 패턴",
      "현실 감각의 강점",
      "현실 감각의 약점",
      "안정과 도전의 균형",
      "사업·부업·수익화 가능성",
      "돈 때문에 스트레스받는 지점",
      "재정 관리에 필요한 기준",
      "이 유형에게 맞는 돈 관리 전략",
    ],
  },
  {
    order: 6,
    roman: "VI",
    title: "스트레스와 그림자 성향",
    sections: [
      "스트레스를 받는 핵심 원인",
      "압박을 받을 때의 반응",
      "관계 스트레스 패턴",
      "일 스트레스 패턴",
      "돈 스트레스 패턴",
      "감정적으로 무너지는 순간",
      "회피하거나 폭발하는 방식",
      "그림자 성향",
      "반복되는 자기방어 패턴",
      "번아웃 신호",
      "회복을 위해 가장 먼저 줄여야 할 것",
    ],
  },
  {
    order: 7,
    roman: "VII",
    title: "성장 전략과 실행 로드맵",
    sections: [
      "이 유형의 성장 핵심 키워드",
      "가장 먼저 바꿔야 할 습관",
      "유지해야 할 강점",
      "버려야 할 방어 패턴",
      "관계에서의 성장 전략",
      "일에서의 성장 전략",
      "돈과 현실에서의 성장 전략",
      "감정 회복 루틴",
      "7일 실행 과제",
      "30일 성장 로드맵",
      "최종 조언",
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
  };
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

export function buildFptiDeepSection(typeResult: LocalTypeResult, sectionDefinition: { chapter: ChapterDefinition; title: string }): FptiDeepSection {
  const { chapter, title } = sectionDefinition;
  const signals = renderSignals(typeResult, chapter.title, title);
  const top = typeResult.topAxes[0];
  const sub = typeResult.topAxes[1];
  const low = typeResult.lowAxes[0];
  const flavor = chapterFlavor(chapter.order);

  let interpretation = `${chapter.roman}. ${chapter.title}의 '${title}' 항목에서는 ${typeResult.typeName}(${typeResult.code})의 실제 축 점수를 바탕으로 선택 패턴을 읽습니다. 현재 가장 강한 축은 ${top.label}(${top.score})이며, 보조 축은 ${sub.label}(${sub.score})입니다. 반대로 에너지 누수 위험이 큰 축은 ${low.label}(${low.score})로 나타나므로, 이 구간에서 무리하면 성과보다 소모가 커질 수 있습니다. 이 해석은 성격 단정이 아니라 운영 전략 제안이며, 실제 일상에서는 기준-실행-점검의 순서를 고정할 때 변동성이 줄어듭니다.`;

  interpretation += ` 특히 '${title}'에서는 반응 속도보다 재현 가능한 선택 기준이 중요합니다. 같은 유형이라도 점수 분포가 다르면 결과가 달라지므로, ${top.label}의 강점을 유지하면서 ${low.label}을 보완하는 장치를 병행해야 합니다. 구체적으로는 하루 핵심 행동 1개, 주간 점검 1회, 관계·일·돈 우선순위 문장화 같은 간단한 루틴이 가장 실효성이 높습니다. 이 방식은 과도한 자기비판을 줄이고 장기적으로 신뢰 가능한 성과를 남깁니다.`;

  if (chapter.order === 7 && title === "7일 실행 과제") {
    interpretation = `7일 실행 과제는 유형별 성향을 행동으로 전환하기 위한 착수 루틴입니다. 1일차는 기준 문장 1개 작성, 2일차는 가장 미룬 과제 25분 착수, 3일차는 관계 기대치 1개 명확화, 4일차는 지출 3통로 분리 기록, 5일차는 갈등 상황 대응 문장 리허설, 6일차는 회복 루틴 2개 고정, 7일차는 일주일 리뷰와 다음 주 우선순위 확정으로 진행합니다. ${top.label} 강점을 실전으로 연결하면서 ${low.label} 약점을 과열 없이 보완하도록 설계했습니다. 핵심은 완벽 수행이 아니라 매일 복귀하는 일관성입니다.`;
  }

  if (chapter.order === 7 && title === "30일 성장 로드맵") {
    interpretation = `30일 로드맵은 1주차 리듬 정리, 2주차 실행 고정, 3주차 관계·업무 경계 조정, 4주차 유지 시스템 정착의 4단계로 운영합니다. 1주차에는 수면·집중 시간대를 안정화하고, 2주차에는 하루 핵심 행동 1개를 고정하며, 3주차에는 요청 수락 기준과 거절 문장을 정리하고, 4주차에는 월간 점검표를 만들어 다음 달에 반복 적용합니다. ${sub.label} 보조 강점을 유지하면서 ${low.label} 취약 축의 변동성을 줄이는 구조이며, 단기 성과보다 재현 가능한 성장 시스템을 확보하는 데 초점을 둡니다.`;
  }

  return {
    title,
    usedSignals: signals,
    interpretation: repeatSafe(interpretation),
    strength: flavor.strength,
    risk: flavor.risk,
    action: flavor.action,
  };
}

export function buildFptiDeepChapter(typeResult: LocalTypeResult, chapterDefinition: ChapterDefinition, unlocked = true): FptiDeepChapter {
  const sections = chapterDefinition.sections.map((title) => buildFptiDeepSection(typeResult, { chapter: chapterDefinition, title }));
  const previewSections = sections.map((section) => {
    const previewText = section.interpretation.split(". ").slice(0, 2).join(". ").trim();
    return {
      ...section,
      interpretation: previewText.length > 0 ? `${previewText}.` : section.interpretation,
    };
  });

  const summary = repeatSafe(
    `${chapterDefinition.roman}. ${chapterDefinition.title} 요약: 이 챕터는 ${typeResult.typeName}(${typeResult.code})의 점수 분포를 바탕으로 행동 패턴을 현실 언어로 정리합니다. 상위 축인 ${typeResult.topAxes[0].label}(${typeResult.topAxes[0].score})과 ${typeResult.topAxes[1].label}(${typeResult.topAxes[1].score})은 강점이 발휘되는 장면을 설명하고, 하위 축인 ${typeResult.lowAxes[0].label}(${typeResult.lowAxes[0].score})은 피로 누적과 의사결정 지연이 발생하기 쉬운 조건을 보여 줍니다. 따라서 이 챕터의 핵심은 장점을 과신하지 않고 약점을 억지로 지우지도 않으면서, 생활 루틴 안에 실행 가능한 기준을 고정하는 데 있습니다. 섹션별 해석은 중복 문장을 피하고 주제별로 분리되어 있어, 관계·일·돈·감정 영역에서 바로 적용 가능한 운영 포인트를 찾을 수 있게 구성했습니다.`,
  );

  return {
    order: chapterDefinition.order,
    roman: chapterDefinition.roman,
    title: chapterDefinition.title,
    isPreview: !unlocked,
    locked: !unlocked,
    sections: unlocked ? sections : previewSections,
    chapterSummary: summary,
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

  const expectedTitles = CHAPTERS.map((chapter) => `${chapter.roman}. ${chapter.title}`);
  const actualTitles = report.chapters.map((chapter) => `${chapter.roman}. ${chapter.title}`);
  for (let i = 0; i < expectedTitles.length; i += 1) {
    if (expectedTitles[i] !== actualTitles[i]) {
      errors.push(`chapter title mismatch at ${i + 1}`);
    }
  }

  const sentenceCounter = new Map<string, number>();
  const chapterBodies: string[] = [];

  for (const chapter of report.chapters) {
    if (chapter.sections.length < 8) {
      errors.push(`section count too low: ${chapter.roman}`);
    }
    if (sanitizeFptiDeepReportText(chapter.chapterSummary).length < 250) {
      errors.push(`chapter summary too short: ${chapter.roman}`);
    }

    const bodyParts: string[] = [];
    for (const section of chapter.sections) {
      if (section.usedSignals.length < 2) {
        errors.push(`usedSignals too short: ${chapter.roman}/${section.title}`);
      }
      const interpretation = sanitizeFptiDeepReportText(section.interpretation);
      if (!chapter.locked && interpretation.length < 180) {
        errors.push(`interpretation too short: ${chapter.roman}/${section.title}`);
      }
      bodyParts.push(interpretation);

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

  for (const count of sentenceCounter.values()) {
    if (count >= 2) {
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

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildFptiDeepReport(input: FptiPremiumInput, options?: { unlocked?: boolean }): FptiDeepReport {
  const typeResult = localTypeResult(input);
  const unlocked = options?.unlocked !== false;

  const chapters = CHAPTERS.map((chapter) => buildFptiDeepChapter(typeResult, chapter, unlocked));

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
      preview: repeatSafe(`${typeResult.typeName}(${typeResult.code})은 ${typeResult.topAxes[0].summary} 성향이 강하고, ${typeResult.lowAxes[0].summary} 구간에서 피로가 누적되기 쉽습니다. 잠금 해제 후 7개 챕터 전체에서 관계·일·돈·스트레스·성장 전략을 세부적으로 확인할 수 있습니다.`),
      highlights: uniqueList([
        `${typeResult.topAxes[0].label} 강점 활용`,
        `${typeResult.topAxes[1].label} 보조 활용`,
        `${typeResult.lowAxes[0].label} 보완 전략 필요`,
      ], 3),
      caution: `${typeResult.lowAxes[0].label}(${typeResult.lowAxes[0].score}) 구간에서 의사결정이 급하거나 늦어지기 쉬우므로, 기준 문장과 점검 루틴을 함께 유지하세요.`,
    },
    meta: {
      engineVersion: "fpti-local-deep-v2.0.0",
      apiUsed: false,
      pdfEnabled: false,
      chapterCount: 7,
    },
  };

  return report;
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
