import type { FptiAxisCodes } from "./fpti-types";

type TypeCopy = {
  code: string;
  name: string;
  oneLiner: string;
  summary: string;
};

const TYPE_PRESETS: TypeCopy[] = [
  { code: "W-C-O-B", name: "새싹 창조형", oneLiner: "새로운 판을 가장 빨리 열어젖히는 개척자", summary: "목의 확장성과 창조 행동이 결합되어 시작점에서 큰 힘을 냅니다." },
  { code: "W-S-F-G", name: "아이디어 파도형", oneLiner: "영감과 직관으로 흐름을 타는 표현가", summary: "목과 상관 계열이 강해 즉흥성과 창의적인 전환이 뛰어납니다." },
  { code: "F-C-O-S", name: "불꽃 리더형", oneLiner: "열정으로 팀 온도를 끌어올리는 추진자", summary: "화가 중심축이라 존재감이 강하고, 전면 돌파형 리더십이 나타납니다." },
  { code: "F-W-L-P", name: "카리스마 실행형", oneLiner: "규율과 임팩트를 동시에 잡는 성과형", summary: "화와 관성 결합으로 목표 달성 집념이 높고 책임감이 강합니다." },
  { code: "E-R-D-B", name: "대지 안정형", oneLiner: "흔들리지 않는 중심으로 팀을 지탱하는 수호자", summary: "토의 안정성과 현실감각이 뛰어나 장기전에서 강점을 보입니다." },
  { code: "E-W-L-P", name: "전략 설계형", oneLiner: "구조를 짜고 결과를 관리하는 운영가", summary: "토 기반 구조화 능력과 관성의 조합으로 실무 완성도가 높습니다." },
  { code: "M-W-D-P", name: "정밀 분석형", oneLiner: "핵심을 분해해 최적해를 찾는 문제 해결사", summary: "금의 정밀함과 관성/재성 흐름이 강해 판단 정확도가 높습니다." },
  { code: "M-R-L-H", name: "룰 메이커형", oneLiner: "원칙과 기준으로 신뢰를 만드는 관리자", summary: "금 중심의 질서화 에너지로 시스템 구축 능력이 돋보입니다." },
  { code: "A-S-D-H", name: "통찰 탐구형", oneLiner: "깊게 읽고 오래 축적하는 지적 전략가", summary: "수 중심의 인성 성향이 강해 분석, 연구, 기획형 재능이 큽니다." },
  { code: "A-I-D-G", name: "감성 중재형", oneLiner: "관계를 부드럽게 잇는 공감 큐레이터", summary: "수의 유연성과 내면 탐구가 결합되어 심리적 조율에 강합니다." },
  { code: "W-I-F-S", name: "모험 실험형", oneLiner: "새로운 시도를 놀이처럼 확장하는 탐험가", summary: "목의 확장성과 독립 성향이 만나 다변화 실험에 강합니다." },
  { code: "F-R-O-G", name: "무드 크리에이터형", oneLiner: "분위기를 만들고 사람을 모으는 촉진자", summary: "화 중심 공명력으로 커뮤니티, 콘텐츠, 브랜딩 영역에 강합니다." },
  { code: "E-I-L-B", name: "신뢰 버퍼형", oneLiner: "팀의 충격을 흡수하며 균형을 지키는 조정자", summary: "토+비겁 성향으로 장기적 관계 유지와 갈등 완충이 뛰어납니다." },
  { code: "M-C-F-P", name: "전술 지휘형", oneLiner: "빠른 판단으로 승부를 만드는 전장형 리더", summary: "금+식상 조합으로 의사결정 속도와 실행력이 높습니다." },
  { code: "A-W-O-H", name: "직관 기획형", oneLiner: "큰 그림을 읽고 조용히 판을 설계하는 전략가", summary: "수와 관성의 균형으로 장기 프로젝트 설계에 강합니다." },
  { code: "F-I-D-S", name: "감정 연출형", oneLiner: "표현력으로 공감 장면을 만드는 스토리텔러", summary: "화와 인성 흐름이 조화를 이루어 콘텐츠 설계와 전달력이 좋습니다." },
];

const AXIS_LABELS = {
  temperament: {
    W: "Wood: 성장과 확장 중심",
    F: "Fire: 열정과 추진 중심",
    E: "Earth: 안정과 조율 중심",
    M: "Metal: 분석과 원칙 중심",
    A: "Aqua: 통찰과 유연 중심",
  },
  behavior: {
    C: "Creator: 식신/상관 기반 창조 행동",
    R: "Ruler: 관성 중심의 책임 행동",
    W: "Wealth-Driver: 재성 중심의 성과 행동",
    S: "Scholar: 인성 중심의 학습 행동",
    I: "Independent: 비겁 중심의 자율 행동",
  },
  relation: {
    O: "Open: 가벼운 교류와 확장형",
    D: "Deep: 깊은 유대와 몰입형",
    L: "Loyal: 안정과 헌신 중심",
    F: "Free: 거리와 자유를 존중",
  },
  strategy: {
    B: "Balanced: 균형형",
    G: "Growth: 성장형",
    P: "Power: 목표집중형",
    H: "Harmony: 조화형",
    S: "Speed: 속도형",
  },
} as const;

const MATCHING = {
  Open: ["W-C-O-B", "F-R-O-G", "W-I-F-S"],
  Deep: ["A-S-D-H", "A-I-D-G", "F-I-D-S"],
  Loyal: ["E-R-D-B", "E-W-L-P", "M-R-L-H"],
  Free: ["M-C-F-P", "W-I-F-S", "A-W-O-H"],
};

function fallbackName(axis: FptiAxisCodes): TypeCopy {
  return {
    code: `${axis.temperament}-${axis.behavior}-${axis.relation}-${axis.strategy}`,
    name: `${axis.temperament}${axis.behavior}${axis.relation}${axis.strategy} 복합형`,
    oneLiner: "네 가지 축이 균형적으로 나타나는 하이브리드 타입",
    summary: "오행, 십성, 관계패턴, 운세전략이 특정 한쪽으로 과도하게 쏠리지 않은 조합입니다.",
  };
}

export function resolveFptiTypeCopy(axis: FptiAxisCodes): TypeCopy {
  const code = `${axis.temperament}-${axis.behavior}-${axis.relation}-${axis.strategy}`;
  return TYPE_PRESETS.find((item) => item.code === code) || fallbackName(axis);
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
