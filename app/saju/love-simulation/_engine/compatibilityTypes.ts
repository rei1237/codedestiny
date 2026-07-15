// Layer 1 (결정론 명리 엔진) 타입 정의.
// 궁합 결과는 두 사람의 사주만으로 결정된다 — 선택지/stats/난수는 이 레이어에 존재하지 않는다.

/** localSajuCalculator(yongshinAnalysis)와 동일한 영문 오행 표기. */
export type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";

/** 궁합을 하나의 숫자로 뭉개지 않는 5개 독립 차원. conflict는 높을수록 마찰이 큰 역방향 차원. */
export type CompatDimensionKey = "attraction" | "stability" | "communication" | "conflict" | "longevity";

export interface NormalizedPillar {
  ganji: string;
  stem: string;
  branch: string;
}

/** 한 사람의 명식을 결정론적으로 정규화한 입력. calculateLocalSaju 산출물에서만 추출한다. */
export interface NormalizedSaju {
  pillars: {
    year: NormalizedPillar | null;
    month: NormalizedPillar | null;
    day: NormalizedPillar;
    hour: NormalizedPillar | null;
  };
  dayStem: string;
  dayBranch: string;
  yearBranch: string | null;
  yinYang: "yin" | "yang";
  elementCounts: Record<ElementKey, number>;
  /** 원국에서 두드러진 상위 오행(최대 2). */
  strongElements: ElementKey[];
  /** natalAnalysis.yongshinAnalysis.coreYongshin */
  coreYongshin: ElementKey | null;
  /** natalAnalysis.yongshinAnalysis.gisin */
  gisin: ElementKey[];
  dayMasterStrength: string | null;
  timeUnknown: boolean;
}

/** 각 명리 지표: 원점수(방향 포함) + 가중치 + 근거 문자열(설명가능성 필수). */
export interface CompatIndicator {
  key: string;
  label: string;
  /** -100..100. + 우호, - 마찰. 방향과 강도를 담는다. */
  rawScore: number;
  weight: number;
  weighted: number;
  evidence: string;
  dimensions: CompatDimensionKey[];
  confidence: "high" | "medium" | "low";
}

export interface CompatDimension {
  key: CompatDimensionKey;
  label: string;
  score: number; // 0..100
  band: "strong" | "balanced" | "watch";
  drivers: string[];
}

/** 결정론 엔진의 최종 산출물. 동일 두 사주 → 항상 동일 프로필. */
export interface CompatibilityProfile {
  engineVersion: string;
  weightsVersion: string;
  /** 정규화 입력의 결정론적 해시 = 재현성 검증 키. */
  inputHash: string;
  indicators: CompatIndicator[];
  dimensions: Record<CompatDimensionKey, CompatDimension>;
  score: number; // 0..100 종합
  grade: string;
  coreVerdict: string;
  /** 상충 지표(예: 일간 합 vs 지지 충) 종합 설명. */
  synthesisNotes: string[];
  /** 미확인/추정 항목 고지(예: 출생시 미상 → 시주 제외). */
  dataGaps: string[];
}

export const DIMENSION_LABELS: Record<CompatDimensionKey, string> = {
  attraction: "끌림",
  stability: "안정성",
  communication: "소통",
  conflict: "갈등 양상",
  longevity: "장기 지속성",
};

export const DIMENSION_KEYS: CompatDimensionKey[] = ["attraction", "stability", "communication", "conflict", "longevity"];
