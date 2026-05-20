import type { FptiAxisCodes } from "./fpti-types";

type TypeCopy = {
  code: string;
  name: string;
  oneLiner: string;
  summary: string;
  keywords: string[];
};

const CURATED_TYPE_MAP: Record<string, Omit<TypeCopy, "code">> = {
  "A-S-D-H": {
    name: "심해의 예언자",
    oneLiner: "깊은 통찰과 직관으로 보이지 않는 가능성을 읽어내는 타입",
    summary: "생각의 깊이와 감정의 결을 오래 관찰한 뒤, 가장 정확한 방향을 제시하는 전략형 성향입니다.",
    keywords: ["직관적", "통찰력", "독립적", "이상주의", "창의적"],
  },
  "A-S-D-B": {
    name: "달빛의 분석가",
    oneLiner: "조용히 패턴을 읽고 균형점을 찾아내는 타입",
    summary: "감정과 정보의 흐름을 섬세하게 정리해 혼란한 상황에서도 기준을 만드는 성향입니다.",
    keywords: ["분석력", "균형감", "신중함", "관찰력", "정리력"],
  },
  "A-C-O-S": {
    name: "별빛 스토리텔러",
    oneLiner: "감각적인 언어로 사람의 마음을 움직이는 타입",
    summary: "통찰에서 끝나지 않고 메시지를 표현으로 연결해 공감과 확산을 동시에 만드는 성향입니다.",
    keywords: ["표현력", "감성", "콘텐츠", "확산력", "공감력"],
  },
  "F-C-O-S": {
    name: "태양의 크리에이터",
    oneLiner: "에너지를 아이디어와 실행으로 빠르게 바꾸는 타입",
    summary: "강한 추진력과 표현력이 결합되어 시작을 두려워하지 않고 결과물을 만들어내는 성향입니다.",
    keywords: ["추진력", "창작력", "활동성", "리더십", "임팩트"],
  },
  "F-W-O-P": {
    name: "무대 위의 승부사",
    oneLiner: "기회를 실전 성과로 연결하는 타입",
    summary: "현실 감각과 승부 근성이 강해 중요한 순간에 주도권을 잡는 성향입니다.",
    keywords: ["성과지향", "결단력", "현실감", "속도감", "주도성"],
  },
  "E-R-L-B": {
    name: "신뢰의 설계자",
    oneLiner: "안정적 구조와 책임감으로 관계를 지켜내는 타입",
    summary: "한 번 세운 기준을 꾸준히 지키며 팀과 관계를 장기적으로 안정시키는 성향입니다.",
    keywords: ["책임감", "신뢰", "안정성", "원칙", "지속성"],
  },
  "E-W-L-P": {
    name: "현실의 관리자",
    oneLiner: "계획을 실제 결과로 완성하는 타입",
    summary: "운영 감각이 뛰어나 복잡한 자원을 정리하고 실질적 성과를 쌓는 성향입니다.",
    keywords: ["운영력", "실무형", "재무감각", "안정지향", "관리력"],
  },
  "M-R-L-P": {
    name: "차가운 전략가",
    oneLiner: "정확한 판단과 원칙으로 승률을 끌어올리는 타입",
    summary: "감정 소모를 줄이고 논리와 구조로 문제를 해결하는 고정밀 사고 성향입니다.",
    keywords: ["판단력", "전략", "정밀함", "원칙", "집중력"],
  },
  "M-S-D-B": {
    name: "고요한 판단자",
    oneLiner: "깊은 관찰과 냉정한 분석으로 본질을 짚는 타입",
    summary: "급하게 결론 내리기보다 충분한 근거를 확보한 뒤 정확히 움직이는 성향입니다.",
    keywords: ["관찰력", "냉정함", "사려", "근거중심", "신중함"],
  },
  "W-C-O-G": {
    name: "숲의 개척자",
    oneLiner: "새로운 기회를 빠르게 넓혀가는 성장형 타입",
    summary: "확장 에너지가 강해 낯선 영역에서도 실험과 도전을 통해 길을 만드는 성향입니다.",
    keywords: ["성장", "개척", "도전", "실험", "유연성"],
  },
  "W-I-F-G": {
    name: "자유로운 성장가",
    oneLiner: "자기 방식으로 영역을 확장하는 독립형 타입",
    summary: "타인의 기준보다 자기 감각을 따를 때 퍼포먼스가 올라가는 성향입니다.",
    keywords: ["독립성", "자율성", "창발성", "확장성", "실행력"],
  },
  "A-I-D-H": {
    name: "고독한 탐구자",
    oneLiner: "혼자 깊게 파고들며 정답을 찾아내는 타입",
    summary: "고요한 환경에서 집중력이 극대화되며, 내면 정리를 통해 큰 도약을 준비하는 성향입니다.",
    keywords: ["탐구", "몰입", "내면성", "집중력", "회복력"],
  },
};

const KEYWORD_BY_AXIS = {
  temperament: {
    W: "성장지향",
    F: "표현력",
    E: "안정감",
    M: "판단력",
    A: "통찰력",
  },
  behavior: {
    C: "창작형",
    R: "책임형",
    W: "현실형",
    S: "탐구형",
    I: "독립형",
  },
  relation: {
    O: "개방적",
    D: "심층관계",
    L: "신뢰중심",
    F: "자유지향",
  },
  strategy: {
    B: "균형회복",
    G: "성장확장",
    P: "성과집중",
    H: "내면치유",
    S: "표현발산",
  },
} as const;

const TITLE_BY_TEMPERAMENT = {
  W: "성장의",
  F: "불꽃의",
  E: "대지의",
  M: "정밀한",
  A: "깊은",
} as const;

const TITLE_BY_BEHAVIOR = {
  C: "크리에이터",
  R: "책임가",
  W: "실행가",
  S: "해석가",
  I: "개척가",
} as const;

const AXIS_LABELS = {
  temperament: {
    W: "Wood · 성장형: 확장과 시도를 통해 기회를 키웁니다.",
    F: "Fire · 표현형: 에너지를 표현과 실행으로 빠르게 전환합니다.",
    E: "Earth · 안정형: 중심을 잡고 관계와 일의 균형을 맞춥니다.",
    M: "Metal · 원칙형: 구조화와 판단을 통해 정확도를 높입니다.",
    A: "Water · 지성형: 관찰과 통찰로 깊은 방향을 읽어냅니다.",
  },
  behavior: {
    C: "Creator · 창작형: 식신/상관 기반으로 표현과 제작이 빠릅니다.",
    R: "Ruler · 책임형: 정관/편관 중심으로 역할 수행력이 높습니다.",
    W: "Wealth · 현실형: 정재/편재 중심으로 실전 감각이 뛰어납니다.",
    S: "Scholar · 통찰형: 정인/편인 중심으로 학습과 해석에 강합니다.",
    I: "Independent · 독립형: 비견/겁재 기반으로 자기주도성이 강합니다.",
  },
  relation: {
    O: "Open · 개방형: 빠르게 교류를 넓히고 공감 반응이 빠릅니다.",
    D: "Deep · 심층형: 마음을 천천히 열지만 깊고 오래 연결됩니다.",
    L: "Loyal · 신뢰형: 책임과 일관성을 통해 안정적 관계를 만듭니다.",
    F: "Free · 자유형: 건강한 거리와 자율을 유지할 때 강해집니다.",
  },
  strategy: {
    B: "Balance · 균형 회복형",
    G: "Growth · 성장 확장형",
    P: "Power · 현실 성취형",
    H: "Healing · 내면 치유형",
    S: "Spark · 표현 발산형",
  },
} as const;

const MATCHING = {
  Open: ["W-C-O-B", "F-R-O-G", "W-I-F-S"],
  Deep: ["A-S-D-H", "A-I-D-G", "F-I-D-S"],
  Loyal: ["E-R-D-B", "E-W-L-P", "M-R-L-H"],
  Free: ["M-C-F-P", "W-I-F-S", "A-W-O-H"],
};

function fallbackName(axis: FptiAxisCodes): TypeCopy {
  const code = `${axis.temperament}-${axis.behavior}-${axis.relation}-${axis.strategy}`;
  return {
    code,
    name: `${TITLE_BY_TEMPERAMENT[axis.temperament]} ${TITLE_BY_BEHAVIOR[axis.behavior]}`,
    oneLiner: "타고난 감각과 행동 패턴이 조화롭게 결합된 맞춤형 성향",
    summary: "사주 원국의 축별 흐름을 조합한 결과로, 강점 축과 보완 축을 함께 쓰면 운의 효율이 높아집니다.",
    keywords: [
      KEYWORD_BY_AXIS.temperament[axis.temperament],
      KEYWORD_BY_AXIS.behavior[axis.behavior],
      KEYWORD_BY_AXIS.relation[axis.relation],
      KEYWORD_BY_AXIS.strategy[axis.strategy],
      "사주기반",
    ],
  };
}

export function resolveFptiTypeCopy(axis: FptiAxisCodes): TypeCopy {
  const code = `${axis.temperament}-${axis.behavior}-${axis.relation}-${axis.strategy}`;
  const curated = CURATED_TYPE_MAP[code];
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
    temperament: AXIS_LABELS.temperament[axis.temperament],
    behavior: AXIS_LABELS.behavior[axis.behavior],
    relation: AXIS_LABELS.relation[axis.relation],
    strategy: AXIS_LABELS.strategy[axis.strategy],
  };
}

export function recommendedMatches(relationStyle: "Open" | "Deep" | "Loyal" | "Free") {
  const goodMatch = MATCHING[relationStyle] || [];
  const cautionMatch = Object.keys(MATCHING)
    .filter((key) => key !== relationStyle)
    .flatMap((key) => MATCHING[key as keyof typeof MATCHING])
    .slice(0, 3);

  return {
    goodMatch,
    cautionMatch,
  };
}
