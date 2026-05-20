import type { FptiAxisCodes } from "./fpti-types";

type TypeCopy = {
  code: string;
  name: string;
  oneLiner: string;
  summary: string;
  keywords: string[];
};

export type FptiCatalogItem = Pick<TypeCopy, "code" | "name" | "oneLiner">;

const TYPE_MAP: Record<string, Omit<TypeCopy, "code">> = {
  AHFV: {
    name: "별빛 감응 창작자",
    oneLiner: "감정과 영감을 빠르게 포착해 사람의 마음을 움직이는 타입",
    summary: "관계 감수성과 창작 에너지가 강해 새로운 가능성을 먼저 발견하고 연결합니다.",
    keywords: ["공감", "감각", "창작", "직관", "확장"],
  },
  AHFR: {
    name: "현실 감각형 분위기 메이커",
    oneLiner: "사람의 분위기를 읽고 현실적인 해결책으로 연결하는 타입",
    summary: "공감력과 생활 감각이 균형을 이루어 관계를 부드럽게 조율합니다.",
    keywords: ["소통", "현실감", "조율", "유연성", "실행"],
  },
  AHBV: {
    name: "사람을 이끄는 감성 리더",
    oneLiner: "따뜻한 감정 리더십으로 팀과 관계를 정렬하는 타입",
    summary: "공감 기반 판단과 구조화 능력이 결합되어 사람을 모으고 방향을 잡습니다.",
    keywords: ["리더십", "공감", "책임", "신뢰", "비전"],
  },
  AHBR: {
    name: "따뜻한 실전 조율자",
    oneLiner: "관계를 지키면서도 현실 결과를 만들어내는 타입",
    summary: "사람을 배려하되 실행 기준이 분명해 갈등을 줄이고 결과를 확보합니다.",
    keywords: ["관계", "안정", "실행", "중재", "현실"],
  },
  ALFV: {
    name: "자유로운 전략 개척자",
    oneLiner: "논리와 확장성을 결합해 새 길을 만드는 타입",
    summary: "빠른 실험과 판단 전환에 강해 불확실한 환경에서도 기회를 찾습니다.",
    keywords: ["전략", "개척", "민첩", "도전", "기회"],
  },
  ALFR: {
    name: "현실 돌파형 승부사",
    oneLiner: "냉정한 판단으로 성과를 빠르게 끌어내는 타입",
    summary: "실전 감각과 결단력이 높아 짧은 시간에 성과를 만드는 데 강합니다.",
    keywords: ["돌파", "결단", "성과", "실전", "집중"],
  },
  ALBV: {
    name: "비전을 설계하는 리더",
    oneLiner: "큰 그림을 구조화해 장기 전략으로 만드는 타입",
    summary: "원칙 중심 판단과 확장 비전이 결합되어 시스템 구축 능력이 뛰어납니다.",
    keywords: ["설계", "리더", "원칙", "장기전략", "비전"],
  },
  ALBR: {
    name: "질서를 세우는 현실 전략가",
    oneLiner: "현실 문제를 구조로 해결해 안정적 성과를 만드는 타입",
    summary: "판단 기준이 명확하고 책임 실행력이 높아 조직 운영에 강합니다.",
    keywords: ["구조", "질서", "현실", "성과", "관리"],
  },
  MHFV: {
    name: "고요한 영감 치유자",
    oneLiner: "깊은 내면 관찰로 사람을 회복시키는 타입",
    summary: "내면 축적형 에너지와 공감 직관이 강해 관계 회복과 정서 안정에 강점이 있습니다.",
    keywords: ["치유", "영감", "내면", "회복", "직관"],
  },
  MHFR: {
    name: "섬세한 생활 안정가",
    oneLiner: "감정선을 세심하게 읽어 생활 리듬을 안정시키는 타입",
    summary: "사소한 변화도 민감하게 포착해 관계와 일상의 균형을 잘 맞춥니다.",
    keywords: ["안정", "배려", "세심함", "생활", "조화"],
  },
  MHBV: {
    name: "내면 깊은 관계 설계자",
    oneLiner: "깊은 신뢰를 바탕으로 오래 가는 관계를 설계하는 타입",
    summary: "관계를 천천히 구축하지만 한 번 연결되면 매우 단단한 구조를 만듭니다.",
    keywords: ["신뢰", "관계", "깊이", "안정", "지속"],
  },
  MHBR: {
    name: "조용한 책임형 보호자",
    oneLiner: "겉으로 조용하지만 끝까지 책임지는 타입",
    summary: "과장 없는 실행과 배려 기반 운영으로 주변을 안정시키는 힘이 큽니다.",
    keywords: ["보호", "책임", "성실", "안정", "헌신"],
  },
  MLFV: {
    name: "은둔형 사색 창작자",
    oneLiner: "혼자 깊이 파고들어 독창성을 만드는 타입",
    summary: "내면 축적형 사고와 자유 탐색 성향이 강해 독창적 결과물을 만들어냅니다.",
    keywords: ["사색", "독창성", "자율", "탐구", "집중"],
  },
  MLFR: {
    name: "실속형 분석가",
    oneLiner: "냉정한 분석으로 손실을 줄이고 효율을 높이는 타입",
    summary: "현실 기준과 정밀 판단이 강해 리스크 관리와 최적화에 강점이 있습니다.",
    keywords: ["분석", "효율", "실속", "리스크관리", "정밀"],
  },
  MLBV: {
    name: "철학적 구조 설계자",
    oneLiner: "의미와 원칙을 구조화해 시스템으로 만드는 타입",
    summary: "깊은 사고와 체계화 능력으로 장기적 철학과 실행을 연결합니다.",
    keywords: ["철학", "구조", "체계", "원칙", "장기"],
  },
  MLBR: {
    name: "침착한 시스템 관리자",
    oneLiner: "감정에 흔들리지 않고 시스템을 안정적으로 운영하는 타입",
    summary: "정교한 운영 감각과 책임 실행력으로 큰 변동성 속에서도 안정성을 만듭니다.",
    keywords: ["시스템", "관리", "안정", "책임", "운영"],
  },
};

export const FPTI_CURATED_TYPES: ReadonlyArray<FptiCatalogItem> = Object.freeze(
  Object.entries(TYPE_MAP).map(([code, value]) => ({
    code,
    name: value.name,
    oneLiner: value.oneLiner,
  })),
);

const AXIS_LABELS = {
  energy: {
    A: "A 외향 발산형: 밖으로 표현하고 움직일 때 에너지가 상승합니다.",
    M: "M 내면 축적형: 혼자 정리하고 깊이 몰입할 때 에너지가 회복됩니다.",
  },
  judgment: {
    H: "H 감응 공감형: 감정과 관계 흐름을 먼저 읽고 판단합니다.",
    L: "L 구조 판단형: 원칙, 논리, 기준을 먼저 세우고 판단합니다.",
  },
  execution: {
    F: "F 자유 탐색형: 가능성을 열어두고 유연하게 움직입니다.",
    B: "B 질서 구축형: 계획과 책임을 통해 안정적으로 실행합니다.",
  },
  vision: {
    R: "R 현실 감각형: 성과, 돈, 생활 기반의 현실 효율을 중시합니다.",
    V: "V 비전 직관형: 의미, 가능성, 상징, 큰 그림을 중시합니다.",
  },
} as const;

function fallbackName(axis: FptiAxisCodes): TypeCopy {
  const code = `${axis.energy}${axis.judgment}${axis.execution}${axis.vision}`;
  const energyWord = axis.energy === "A" ? "발산" : "축적";
  const judgmentWord = axis.judgment === "H" ? "공감" : "구조";
  return {
    code,
    name: `${energyWord} ${judgmentWord} 타입`,
    oneLiner: "사주 에너지 구조를 기반으로 계산된 맞춤형 성향",
    summary: "강점 에너지를 키우고 약점 에너지를 보완하면 삶의 효율이 크게 올라갑니다.",
    keywords: [
      axis.energy === "A" ? "외향" : "내향",
      axis.judgment === "H" ? "공감" : "구조",
      axis.execution === "F" ? "탐색" : "구축",
      axis.vision === "R" ? "현실" : "비전",
      "사주기반",
    ],
  };
}

export function resolveFptiTypeCopy(axis: FptiAxisCodes): TypeCopy {
  const code = `${axis.energy}${axis.judgment}${axis.execution}${axis.vision}`;
  const curated = TYPE_MAP[code];
  if (curated) {
    return {
      code,
      ...curated,
    };
  }
  return fallbackName(axis);
}

export function axisMeaning(axis: FptiAxisCodes) {
  return {
    energy: AXIS_LABELS.energy[axis.energy],
    judgment: AXIS_LABELS.judgment[axis.judgment],
    execution: AXIS_LABELS.execution[axis.execution],
    vision: AXIS_LABELS.vision[axis.vision],
  };
}

const MATCHING_TABLE: Record<string, string[]> = {
  AHFV: ["MHFV", "AHBV", "ALFV"],
  AHFR: ["MHFR", "AHBR", "ALFR"],
  AHBV: ["MHBV", "AHFV", "ALBV"],
  AHBR: ["MHBR", "AHFR", "ALBR"],
  ALFV: ["MLFV", "AHFV", "ALBV"],
  ALFR: ["MLFR", "AHFR", "ALBR"],
  ALBV: ["MLBV", "AHBV", "ALFV"],
  ALBR: ["MLBR", "AHBR", "ALFR"],
  MHFV: ["AHFV", "MHBV", "MLFV"],
  MHFR: ["AHFR", "MHBR", "MLFR"],
  MHBV: ["AHBV", "MHFV", "MLBV"],
  MHBR: ["AHBR", "MHFR", "MLBR"],
  MLFV: ["ALFV", "MHFV", "MLBV"],
  MLFR: ["ALFR", "MHFR", "MLBR"],
  MLBV: ["ALBV", "MHBV", "MLFV"],
  MLBR: ["ALBR", "MHBR", "MLFR"],
};

export function recommendedMatches(code: string) {
  const normalized = String(code || "").trim().toUpperCase();
  const goodMatch = MATCHING_TABLE[normalized] || [];

  const cautionMatch = Object.keys(TYPE_MAP)
    .filter((item) => !goodMatch.includes(item) && item !== normalized)
    .slice(0, 4);

  return {
    goodMatch,
    cautionMatch,
  };
}
