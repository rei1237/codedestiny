// 워커 `/api/human-design/chart` 응답의 계산 객체 형태.
// 정본은 lib/human-design/chart.js 의 assembleChart 반환값이다 — 필드를 늘릴 때 양쪽을 함께 본다.

export type HdLayer = "personality" | "design";

export type HdActivation = {
  planet: string;
  layer: HdLayer;
  longitude: number;
  gate: number;
  line: number;
  color: number | null;
  tone: number | null;
  base: number | null;
};

export type HdChannel = {
  channelId: string;
  gateA: number;
  gateB: number;
  centerA: string;
  centerB: string;
  /** 완성에 참여한 계층 구성 — 시각 구분에 쓴다. */
  composition: "PERSONALITY_ONLY" | "DESIGN_ONLY" | "MIXED";
  gateALayers: HdLayer[];
  gateBLayers: HdLayer[];
};

export type HdIncarnationCross = {
  crossId: string | null;
  angle: string | null;
  notation: string;
  gates: {
    personalitySun: number;
    personalityEarth: number;
    designSun: number;
    designEarth: number;
  };
};

export type HdChart = {
  calculationVersion: string;
  ephemerisVersion: string;
  mappingVersion: string;
  nodeMode: string;
  calculatedAt: string | null;
  birthInput: Record<string, unknown> | null;
  moments: {
    birthUtc?: string;
    designUtc?: string;
    solarArcDeg?: number;
    designSearch?: { iterationCount: number; converged: boolean; finalDiffDeg: number };
  } | null;
  activations: HdActivation[];
  layers: Record<HdLayer, HdActivation[]>;
  activeGates: number[];
  channels: HdChannel[];
  definedCenters: string[];
  undefinedCenters: string[];
  definitionComponents: string[][];
  definition: string;
  type: string;
  strategy: string;
  authority: string;
  signature: string;
  notSelfTheme: string;
  motorToThroat: boolean;
  profile: string;
  profileLines: { personality: number; design: number };
  incarnationCross: HdIncarnationCross;
  warnings: string[];
};

/** 서버가 실측한 파이프라인 단계 소요 시간. 가짜 진행률 대신 이걸 쓴다. */
export type HdPipelineStage = { stage: string; ms: number };

export type HdChartResponse = {
  ok: boolean;
  featureKey?: string;
  reused?: boolean;
  chart?: HdChart;
  pipeline?: HdPipelineStage[];
  reason?: string;
  message?: string;
};

/** AI 해석. 계산과 분리된 문서이므로 응답도 분리돼 있다. */
export type HdInterpretationSection = { key: string; title: string; body: string };

export type HdInterpretation = {
  sections: HdInterpretationSection[];
  summary: string;
};

export type HdInterpretationResponse = {
  ok: boolean;
  reused?: boolean;
  interpretation?: HdInterpretation;
  reason?: string;
  message?: string;
};

/** 상세 시트가 여는 대상. */
export type HdSelection =
  | { kind: "center"; center: string }
  | { kind: "gate"; gate: number }
  | { kind: "channel"; channelId: string }
  | { kind: "planet"; planet: string; layer: HdLayer }
  | null;
