export type FptiAxisOption = {
  code: string;
  label: string;
  description: string;
};

export type FptiAxis = {
  code: string;
  label: string;
  description: string;
  example: string;
  sajuSense: string;
  options: [FptiAxisOption, FptiAxisOption];
};

export type FptiDictionaryItem = {
  code: string;
  legacyCode?: string;
  name: string;
  subtitle: string;
  summary: string;
  easyDescription: string;
  keywords: string[];
  elementTone: string[];
  strengths: string[];
  cautions: string[];
  relationshipStyle: string;
  workStyle: string;
  moneyStyle: string;
  growthAdvice: string;
  recommendedRoutine: string;
  compatibleCodes: string[];
  tags: string[];
};

export const FPTI_AXIS_GUIDE: FptiAxis[] = [
  {
    code: "energy",
    label: "에너지 방향",
    description: "A/S는 에너지가 어디에서 살아나는지를 봅니다.",
    example: "A는 사람과 사건 속에서 빠르게 반응하고, S는 혼자 정리하고 깊이 몰입할 때 힘이 강해집니다.",
    sajuSense: "비겁과 식상의 발산성, 인성과 관성의 응축성이 마음의 첫 움직임으로 드러납니다.",
    options: [
      {
        code: "A",
        label: "Active",
        description: "밖으로 움직이는 추진형. 사람, 사건, 기회 속에서 에너지가 살아납니다.",
      },
      {
        code: "S",
        label: "Silent",
        description: "안에서 깊어지는 응축형. 혼자 관찰하고 정리할 때 힘이 쌓입니다.",
      },
    ],
  },
  {
    code: "judgment",
    label: "판단 중심",
    description: "H/L은 무엇을 먼저 기준으로 삼아 판단하는지를 봅니다.",
    example: "H는 사람의 감정과 분위기를 먼저 읽고, L은 원리와 효율을 먼저 살핍니다.",
    sajuSense: "수용과 공감의 기운, 기준과 구조의 기운이 판단의 결을 만듭니다.",
    options: [
      {
        code: "H",
        label: "Heart",
        description: "마음, 관계, 분위기 중심. 공감과 돌봄, 분위기 조율에 강합니다.",
      },
      {
        code: "L",
        label: "Logic",
        description: "구조, 기준, 분석 중심. 전략과 판단, 문제 해결에 강합니다.",
      },
    ],
  },
  {
    code: "movement",
    label: "움직임 방식",
    description: "F/B는 변화에 어떻게 반응하고 일을 밀어가는지를 봅니다.",
    example: "F는 흐름과 가능성을 타고 움직이고, B는 방향을 잡으면 오래 축적합니다.",
    sajuSense: "목화의 확장성과 토금의 안정성이 실행 리듬을 다르게 비춥니다.",
    options: [
      {
        code: "F",
        label: "Flow",
        description: "유연, 창작, 변화 적응. 아이디어와 감각, 전환 능력이 좋습니다.",
      },
      {
        code: "B",
        label: "Build",
        description: "축적, 책임, 구조화. 관리와 리더십, 안정화에 강합니다.",
      },
    ],
  },
  {
    code: "response",
    label: "현실 대응",
    description: "V/R은 현실 앞에서 큰 그림과 실행 중 어디에 무게를 두는지를 봅니다.",
    example: "V는 아직 보이지 않는 가능성을 먼저 보고, R은 지금 가능한 방법을 찾습니다.",
    sajuSense: "미래를 여는 물의 상상력과 현실을 다지는 토금의 결이 대응 방식을 가릅니다.",
    options: [
      {
        code: "V",
        label: "Vision",
        description: "미래, 가능성, 큰 그림 중심. 기획과 상상력, 방향 설정에 강합니다.",
      },
      {
        code: "R",
        label: "Reality",
        description: "현실, 실행, 결과 중심. 실전 감각과 완성도, 성과화에 강합니다.",
      },
    ],
  },
];

export const FPTI_FILTERS = [
  "A",
  "S",
  "H",
  "L",
  "F",
  "B",
  "V",
  "R",
  "감성형",
  "논리형",
  "창작형",
  "실전형",
  "리더형",
  "관찰형",
] as const;

export const FPTI_UNKNOWN_CODE_MESSAGE =
  "이 코드는 아직 도감에 등록되지 않았지만, 결과 리포트에서는 현재 계산된 사주 흐름을 기준으로 해석이 제공됩니다.";

export function normalizeFptiDictionaryCode(code: string | undefined | null) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return "";
  if (normalized.length === 4 && normalized.startsWith("M")) {
    return `S${normalized.slice(1)}`;
  }
  return normalized;
}

export function toLegacyFptiCode(code: string) {
  const normalized = String(code || "").trim().toUpperCase();
  if (normalized.length === 4 && normalized.startsWith("S")) {
    return `M${normalized.slice(1)}`;
  }
  return normalized;
}

export const FPTI_DICTIONARY: FptiDictionaryItem[] = [
  {
    code: "AHFV",
    name: "별빛 감응 창작자",
    subtitle: "감정과 영감을 빠르게 포착해 사람의 마음을 움직이는 타입",
    summary: "마음의 온도와 순간의 영감을 민감하게 읽고, 그것을 말, 글, 이미지, 분위기로 바꾸는 사람입니다.",
    easyDescription: "AHFV는 사람의 표정, 말투, 공기 변화를 빠르게 느낍니다. 현실적인 계산보다 먼저 '이 느낌은 뭔가 있다'는 감각이 움직이며, 새로운 가능성을 아름답게 표현할 때 빛납니다.",
    keywords: ["감성", "창작", "영감"],
    elementTone: ["木", "火"],
    strengths: ["공감이 빠르다", "아이디어 전환이 좋다", "사람의 마음을 움직이는 표현력이 있다"],
    cautions: ["기분에 따라 집중력이 흔들릴 수 있다", "현실 마감과 정리 루틴이 약해질 수 있다", "상대의 감정을 너무 많이 흡수할 수 있다"],
    relationshipStyle: "상대의 작은 변화도 잘 알아차리는 다정한 타입입니다. 다만 혼자 추측하기보다 직접 확인하는 습관이 필요합니다.",
    workStyle: "콘텐츠, 디자인, 상담, 브랜딩, 음악, 글쓰기처럼 감각을 결과물로 바꾸는 일에 강합니다.",
    moneyStyle: "좋아하는 것에 감정적으로 지출할 수 있어 예산을 미리 정해두면 좋습니다.",
    growthAdvice: "영감이 왔을 때 바로 기록하고, 작은 결과물로 완성하는 습관을 들이세요.",
    recommendedRoutine: "하루 10분 감정 노트와 아이디어 메모",
    compatibleCodes: ["AHBR", "SLBR", "ALBR"],
    tags: ["감성형", "창작형", "비전형"],
  },
  {
    code: "AHFR",
    name: "현실 감각형 분위기 메이커",
    subtitle: "사람의 분위기를 읽고 현실적인 해결책으로 연결하는 타입",
    summary: "따뜻한 감각으로 주변 분위기를 살피고, 지금 필요한 행동을 빠르게 찾아내는 사람입니다.",
    easyDescription: "AHFR은 감정만 느끼는 데서 끝나지 않고, 분위기를 좋게 만들기 위해 바로 움직입니다. 사람 사이의 어색함을 풀고 현실적인 도움을 주는 데 강합니다.",
    keywords: ["분위기", "실행", "공감"],
    elementTone: ["火", "土"],
    strengths: ["현장 감각이 좋다", "사람을 편하게 만든다", "위기 상황에서 빠르게 돕는다"],
    cautions: ["남을 챙기느라 자기 리듬을 잃을 수 있다", "즉흥적으로 해결하다 장기 계획이 약해질 수 있다", "거절을 어려워할 수 있다"],
    relationshipStyle: "상대에게 필요한 것을 먼저 알아차리는 타입입니다. 하지만 돌봄이 의무가 되지 않도록 경계가 필요합니다.",
    workStyle: "서비스, 상담, 운영, 커뮤니티, 교육, 고객 응대, 이벤트 기획에 잘 맞습니다.",
    moneyStyle: "주변 사람이나 분위기 때문에 충동 지출이 생길 수 있습니다.",
    growthAdvice: "도움을 주기 전에 내 에너지 잔량을 먼저 확인하세요.",
    recommendedRoutine: "주간 일정표에 '나를 위한 시간'을 먼저 고정",
    compatibleCodes: ["ALFV", "SHBR", "SLFR"],
    tags: ["감성형", "실전형", "관계형"],
  },
  {
    code: "AHBV",
    name: "사람을 이끄는 감성 리더",
    subtitle: "따뜻한 감정 리더십으로 팀과 관계를 정렬하는 타입",
    summary: "사람의 마음을 모으고, 하나의 방향으로 움직이게 만드는 따뜻한 리더형입니다.",
    easyDescription: "AHBV는 단순히 앞장서는 사람이 아니라, 사람들이 왜 움직여야 하는지 감정적으로 납득시키는 힘이 있습니다. 비전과 관계를 함께 잡을 때 강해집니다.",
    keywords: ["리더십", "비전", "관계"],
    elementTone: ["木", "火", "土"],
    strengths: ["사람을 설득하는 힘이 있다", "팀 분위기를 만든다", "큰 방향을 따뜻하게 제시한다"],
    cautions: ["책임을 혼자 떠안을 수 있다", "인정 욕구가 커지면 지칠 수 있다", "감정적 부담을 리더십으로 포장할 수 있다"],
    relationshipStyle: "상대를 성장시키고 싶어 하는 타입입니다. 다만 조언이 간섭으로 느껴지지 않게 조절해야 합니다.",
    workStyle: "팀 리딩, 교육, 브랜드 운영, 커뮤니티 리더, 상담형 비즈니스에 강합니다.",
    moneyStyle: "사람과 프로젝트를 키우는 데 투자하는 성향이 있습니다. 회수 계획을 함께 세워야 합니다.",
    growthAdvice: "모든 사람을 책임지려 하지 말고, 역할을 나누는 법을 배우세요.",
    recommendedRoutine: "주 1회 목표, 역할, 감정 상태를 함께 점검",
    compatibleCodes: ["SLBR", "ALBR", "SHFR"],
    tags: ["감성형", "리더형", "비전형"],
  },
  {
    code: "AHBR",
    name: "따뜻한 실전 조율자",
    subtitle: "관계를 지키면서도 현실 결과를 만들어내는 타입",
    summary: "사람의 마음을 해치지 않으면서도 필요한 결과를 차분히 완성하는 조율형입니다.",
    easyDescription: "AHBR은 감정과 현실 사이의 균형을 잘 잡습니다. 갈등이 있을 때 누구 편을 들기보다, 모두가 받아들일 수 있는 실제 해결책을 찾습니다.",
    keywords: ["조율", "책임", "현실"],
    elementTone: ["土", "金"],
    strengths: ["갈등 중재에 강하다", "책임감이 있다", "현실적인 마무리가 좋다"],
    cautions: ["속마음을 늦게 드러낼 수 있다", "모두를 배려하다 결정이 늦어질 수 있다", "자기 희생이 누적될 수 있다"],
    relationshipStyle: "오래 가는 관계를 중요하게 생각합니다. 표현을 아끼지 않을수록 관계가 더 안정됩니다.",
    workStyle: "운영, 관리, 상담, 인사, 프로젝트 매니징, 고객 성공 관리에 적합합니다.",
    moneyStyle: "안정적인 지출 관리에 강하지만, 자신을 위한 투자를 미룰 수 있습니다.",
    growthAdvice: "조율만 하지 말고 내 기준도 명확히 말하세요.",
    recommendedRoutine: "중요한 결정 전 '내가 원하는 것' 3줄 쓰기",
    compatibleCodes: ["AHFV", "SLFV", "ALFR"],
    tags: ["감성형", "실전형", "조율형"],
  },
  {
    code: "ALFV",
    name: "자유로운 전략 개척자",
    subtitle: "논리와 확장성을 결합해 새 길을 만드는 타입",
    summary: "새로운 가능성을 논리적으로 탐색하고, 남들이 보지 못한 길을 설계하는 개척형입니다.",
    easyDescription: "ALFV는 감으로만 움직이지 않습니다. 아이디어가 떠오르면 구조를 분석하고, 어디까지 확장할 수 있는지 계산합니다. 자유롭지만 머릿속에는 나름의 전략 지도가 있습니다.",
    keywords: ["전략", "개척", "확장"],
    elementTone: ["木", "金", "水"],
    strengths: ["새로운 구조를 잘 만든다", "문제 해결 관점이 넓다", "변화에 빠르게 적응한다"],
    cautions: ["완성보다 구상에 머물 수 있다", "사람 감정을 놓칠 수 있다", "너무 많은 가능성을 동시에 열 수 있다"],
    relationshipStyle: "상대에게 자유와 성장을 주는 타입입니다. 다만 감정 표현을 너무 생략하지 않도록 주의해야 합니다.",
    workStyle: "기획, 창업, 제품 설계, 전략, 개발, 연구, 콘텐츠 시스템화에 강합니다.",
    moneyStyle: "미래 가능성에 투자하는 성향이 있어 리스크 기준이 필요합니다.",
    growthAdvice: "아이디어를 1개로 좁히고, 끝까지 완성하는 훈련이 필요합니다.",
    recommendedRoutine: "아이디어 목록 중 이번 주 실행 1개만 선택",
    compatibleCodes: ["AHFR", "SHBR", "SLBR"],
    tags: ["논리형", "창작형", "비전형"],
  },
  {
    code: "ALFR",
    name: "현실 돌파형 승부사",
    subtitle: "냉정한 판단으로 성과를 빠르게 끌어내는 타입",
    summary: "상황을 빠르게 읽고, 가장 효율적인 방법으로 결과를 만드는 실전형입니다.",
    easyDescription: "ALFR은 감정보다 문제의 핵심을 먼저 봅니다. 복잡한 상황에서도 '그래서 지금 뭘 해야 하지?'를 빠르게 찾고 움직입니다.",
    keywords: ["성과", "판단", "돌파"],
    elementTone: ["金", "火"],
    strengths: ["결단이 빠르다", "성과 감각이 좋다", "위기 대응력이 있다"],
    cautions: ["차갑게 보일 수 있다", "과정의 감정을 놓칠 수 있다", "쉬는 법을 잊을 수 있다"],
    relationshipStyle: "문제가 생기면 해결책부터 제시합니다. 상대가 먼저 공감을 원하는 상황도 있다는 점을 기억하면 좋습니다.",
    workStyle: "영업, 사업, 위기관리, 전략 실행, 퍼포먼스 마케팅, 경쟁이 있는 분야에 강합니다.",
    moneyStyle: "성과 중심으로 돈을 바라봅니다. 단기 수익과 장기 안정의 균형이 필요합니다.",
    growthAdvice: "속도는 강점이지만, 중요한 관계에서는 한 박자 늦게 반응하세요.",
    recommendedRoutine: "결정 전 '사람, 돈, 시간' 체크리스트 확인",
    compatibleCodes: ["AHBR", "SHFV", "SLBV"],
    tags: ["논리형", "실전형", "돌파형"],
  },
  {
    code: "ALBV",
    name: "비전을 설계하는 리더",
    subtitle: "비전과 구조를 함께 세우는 장기 전략가 타입",
    summary: "큰 목표를 보고, 그 목표가 실제로 굴러가도록 구조를 만드는 리더형입니다.",
    easyDescription: "ALBV는 단순히 꿈을 말하는 사람이 아닙니다. 비전을 현실화하려면 어떤 시스템, 사람, 순서가 필요한지 계산합니다.",
    keywords: ["시스템", "비전", "리더"],
    elementTone: ["木", "土", "金"],
    strengths: ["장기 설계가 강하다", "조직 구조를 잘 본다", "목표를 체계화한다"],
    cautions: ["기준이 높아 주변이 부담을 느낄 수 있다", "유연성이 부족해질 수 있다", "혼자 통제하려 할 수 있다"],
    relationshipStyle: "상대와 함께 성장하는 관계를 원합니다. 하지만 상대를 프로젝트처럼 관리하지 않도록 주의해야 합니다.",
    workStyle: "대표, PM, 전략기획, 조직관리, 교육 시스템, 플랫폼 비즈니스에 적합합니다.",
    moneyStyle: "장기 투자와 자산 구조화에 관심이 많습니다. 단기 현금 흐름도 함께 관리해야 합니다.",
    growthAdvice: "완벽한 시스템보다 작게 굴러가는 시스템을 먼저 만드세요.",
    recommendedRoutine: "월 1회 장기 목표를 작은 실행 단위로 쪼개기",
    compatibleCodes: ["AHBV", "SHFR", "SLFR"],
    tags: ["논리형", "리더형", "비전형"],
  },
  {
    code: "ALBR",
    name: "질서를 세우는 현실 전략가",
    subtitle: "기준과 책임감으로 일을 끝까지 완성하는 타입",
    summary: "흐트러진 것을 정리하고, 기준에 맞게 완성도를 끌어올리는 관리자형입니다.",
    easyDescription: "ALBR은 감각보다 기준을 믿습니다. 일이 애매하게 흘러갈 때 구조를 세우고, 결과물이 제대로 완성되도록 끝까지 점검합니다.",
    keywords: ["완성", "관리", "기준"],
    elementTone: ["金", "土"],
    strengths: ["완성도가 높다", "책임감이 강하다", "문제의 빈틈을 잘 찾는다"],
    cautions: ["자기 기준이 너무 엄격할 수 있다", "감정 표현이 부족해 보일 수 있다", "실패를 오래 곱씹을 수 있다"],
    relationshipStyle: "말보다 행동으로 신뢰를 보여주는 타입입니다. 다정한 표현을 조금 더 의식하면 관계가 부드러워집니다.",
    workStyle: "품질관리, 재무, 법무, 운영, 개발, 시스템 관리, 전문직에 강합니다.",
    moneyStyle: "절약과 관리에 강하며 안정성을 중시합니다. 가끔은 성장 투자를 허용해도 좋습니다.",
    growthAdvice: "완벽하지 않아도 공개하고 개선하는 흐름을 만들어보세요.",
    recommendedRoutine: "완료 기준을 80점과 100점으로 나눠 관리",
    compatibleCodes: ["AHFV", "AHBV", "SHBR"],
    tags: ["논리형", "실전형", "관리형"],
  },
  {
    code: "SHFV",
    legacyCode: "MHFV",
    name: "고요한 영감 치유자",
    subtitle: "깊은 감정과 상상력을 조용히 길어 올리는 타입",
    summary: "겉으로는 차분하지만 내면에는 섬세한 감정과 풍부한 상상력이 흐르는 사람입니다.",
    easyDescription: "SHFV는 시끄러운 곳보다 조용한 공간에서 감각이 살아납니다. 혼자 느끼고 정리한 감정을 작품, 글, 음악, 이미지로 표현할 때 빛납니다.",
    keywords: ["내면", "예술", "감수성"],
    elementTone: ["水", "木"],
    strengths: ["감정의 깊이가 있다", "섬세한 표현력이 있다", "혼자 몰입하는 힘이 강하다"],
    cautions: ["감정을 속으로만 쌓을 수 있다", "현실 실행이 늦어질 수 있다", "상처를 오래 기억할 수 있다"],
    relationshipStyle: "깊고 진심 어린 관계를 원합니다. 다만 마음을 숨기기보다 조금씩 표현하는 연습이 필요합니다.",
    workStyle: "예술, 글쓰기, 음악, 상담, 연구, 감성 콘텐츠, 힐링 서비스에 잘 맞습니다.",
    moneyStyle: "감정 상태에 따라 소비가 달라질 수 있어 고정 예산이 도움이 됩니다.",
    growthAdvice: "내면의 감각을 밖으로 꺼내는 작은 발표 경험을 늘리세요.",
    recommendedRoutine: "매일 한 문장 감정 기록 후 주 1회 콘텐츠화",
    compatibleCodes: ["ALFR", "AHBR", "SLBR"],
    tags: ["감성형", "창작형", "관찰형"],
  },
  {
    code: "SHFR",
    legacyCode: "MHFR",
    name: "섬세한 생활 안정가",
    subtitle: "조용히 살피고 필요한 도움을 현실적으로 건네는 타입",
    summary: "큰 말 없이 주변을 관찰하고, 필요한 순간에 실질적인 도움을 주는 사람입니다.",
    easyDescription: "SHFR은 앞에 나서기보다 뒤에서 흐름을 봅니다. 누가 힘든지, 무엇이 필요한지 조용히 알아차리고 현실적인 방식으로 챙깁니다.",
    keywords: ["돌봄", "관찰", "현실감"],
    elementTone: ["水", "土"],
    strengths: ["섬세하게 챙긴다", "현실적인 도움을 준다", "상대의 불편함을 빨리 알아차린다"],
    cautions: ["자신의 욕구를 뒤로 미룰 수 있다", "티 나지 않는 희생이 쌓일 수 있다", "표현 부족으로 오해받을 수 있다"],
    relationshipStyle: "꾸준히 곁을 지키는 타입입니다. 원하는 것을 말로 표현하면 관계가 더 안정됩니다.",
    workStyle: "상담 보조, 케어 서비스, 운영지원, 교육 보조, 정리와 관리 업무에 강합니다.",
    moneyStyle: "큰 모험보다 생활 안정과 필요 지출을 중시합니다.",
    growthAdvice: "도움의 기준을 정하고, 무리한 부탁에는 부드럽게 선을 그으세요.",
    recommendedRoutine: "하루 끝에 '오늘 내가 나를 챙긴 일' 기록",
    compatibleCodes: ["AHBV", "ALBV", "SLFV"],
    tags: ["감성형", "실전형", "관찰형"],
  },
  {
    code: "SHBV",
    legacyCode: "MHBV",
    name: "내면 깊은 관계 설계자",
    subtitle: "관계를 오래 지키고 사람의 성장을 믿어주는 타입",
    summary: "한 번 마음을 준 사람과 세계를 오래 지키는 보호자형입니다.",
    easyDescription: "SHBV는 쉽게 마음을 열지는 않지만, 신뢰가 생기면 깊고 오래 갑니다. 사람의 가능성을 믿고 조용히 응원하는 힘이 있습니다.",
    keywords: ["신뢰", "보호", "성장"],
    elementTone: ["水", "木", "土"],
    strengths: ["충성심이 있다", "관계를 오래 지킨다", "상대의 잠재력을 믿어준다"],
    cautions: ["놓아야 할 관계도 오래 붙잡을 수 있다", "변화를 두려워할 수 있다", "자신의 기대를 말하지 않을 수 있다"],
    relationshipStyle: "깊고 안정적인 관계를 추구합니다. 하지만 침묵이 사랑의 전부는 아니라는 점을 기억해야 합니다.",
    workStyle: "교육, 상담, 장기 고객 관리, 브랜드 커뮤니티, 사람을 키우는 일에 잘 맞습니다.",
    moneyStyle: "가족, 관계, 장기 안정에 돈을 쓰는 경향이 있습니다.",
    growthAdvice: "지키는 힘에 더해, 필요한 때에는 변화시키는 용기도 가져보세요.",
    recommendedRoutine: "월 1회 관계와 목표를 정리하며 유지할 것과 놓을 것 구분",
    compatibleCodes: ["ALBR", "AHFR", "SLBV"],
    tags: ["감성형", "리더형", "관찰형"],
  },
  {
    code: "SHBR",
    legacyCode: "MHBR",
    name: "조용한 책임형 보호자",
    subtitle: "조용한 책임감으로 관계와 현실을 안정시키는 타입",
    summary: "크게 드러나지 않아도 필요한 일을 꾸준히 해내며 주변을 안정시키는 사람입니다.",
    easyDescription: "SHBR은 말보다 행동이 강합니다. 감정적으로 요란하지 않아도, 곁에 있으면 믿음이 생기는 타입입니다.",
    keywords: ["책임", "안정", "신뢰"],
    elementTone: ["土", "水", "金"],
    strengths: ["꾸준하다", "신뢰를 준다", "현실을 안정시키는 힘이 있다"],
    cautions: ["속마음을 너무 숨길 수 있다", "변화에 늦게 반응할 수 있다", "혼자 부담을 떠안을 수 있다"],
    relationshipStyle: "오래 곁을 지키는 방식으로 사랑을 표현합니다. 말로 확인해주는 습관이 관계를 더 따뜻하게 만듭니다.",
    workStyle: "운영, 회계, 관리, 지원, 장기 프로젝트, 안정적인 전문 업무에 강합니다.",
    moneyStyle: "안정적인 저축과 관리에 강합니다. 다만 지나친 불안으로 기회를 놓치지 않도록 해야 합니다.",
    growthAdvice: "내가 감당할 수 있는 책임과 아닌 책임을 구분하세요.",
    recommendedRoutine: "주 1회 해야 할 일과 내려놓을 일을 분리",
    compatibleCodes: ["AHFR", "ALFV", "ALBR"],
    tags: ["감성형", "실전형", "관리형"],
  },
  {
    code: "SLFV",
    legacyCode: "MLFV",
    name: "은둔형 사색 창작자",
    subtitle: "혼자 깊이 생각하며 새로운 가능성을 설계하는 타입",
    summary: "조용한 관찰 속에서 복잡한 흐름을 읽고, 남다른 아이디어 구조를 만드는 사람입니다.",
    easyDescription: "SLFV는 많은 말보다 깊은 생각이 먼저입니다. 혼자 있는 시간에 아이디어가 자라고, 남들이 지나치는 패턴을 발견합니다.",
    keywords: ["통찰", "설계", "가능성"],
    elementTone: ["水", "木", "金"],
    strengths: ["패턴을 잘 본다", "독창적인 아이디어가 있다", "혼자 깊게 몰입한다"],
    cautions: ["생각이 많아 실행이 늦어질 수 있다", "현실 소통이 부족할 수 있다", "아이디어를 숨기다 기회를 놓칠 수 있다"],
    relationshipStyle: "지적인 연결과 깊은 대화를 중요하게 여깁니다. 감정 표현도 관계의 중요한 언어임을 기억하세요.",
    workStyle: "연구, 기획, 개발, 세계관 설계, 데이터 분석, 전략 콘텐츠에 강합니다.",
    moneyStyle: "미래 가능성에는 관심이 많지만 실제 수익화 단계가 늦어질 수 있습니다.",
    growthAdvice: "완벽한 구상보다 작은 실험을 먼저 공개하세요.",
    recommendedRoutine: "아이디어를 7일 안에 작은 프로토타입으로 만들기",
    compatibleCodes: ["AHBR", "SHFR", "ALBV"],
    tags: ["논리형", "창작형", "관찰형"],
  },
  {
    code: "SLFR",
    legacyCode: "MLFR",
    name: "실속형 분석가",
    subtitle: "상황을 차분히 분석하고 현실적인 답을 찾는 타입",
    summary: "소란 속에서도 핵심을 분리해내고, 실제로 가능한 방법을 찾아내는 분석형입니다.",
    easyDescription: "SLFR은 빠르게 나서지는 않지만, 한 번 판단하면 정확합니다. 감정보다 사실과 흐름을 보며 현실적인 해결책을 제시합니다.",
    keywords: ["분석", "실무", "정확성"],
    elementTone: ["金", "水"],
    strengths: ["판단이 침착하다", "실무 정확도가 높다", "문제 원인을 잘 찾는다"],
    cautions: ["소극적으로 보일 수 있다", "감정 표현이 건조할 수 있다", "위험을 너무 크게 볼 수 있다"],
    relationshipStyle: "말은 적어도 행동으로 신뢰를 줍니다. 상대에게 따뜻한 반응을 보여주는 연습이 좋습니다.",
    workStyle: "분석, 운영, 개발, 회계, 리서치, 문서화, 품질관리 업무에 강합니다.",
    moneyStyle: "무리한 투자보다 안정적 관리와 검증된 선택을 선호합니다.",
    growthAdvice: "정확함에 속도를 조금 더하면 성과가 크게 커집니다.",
    recommendedRoutine: "결정 시간을 정해두고 과도한 재검토 줄이기",
    compatibleCodes: ["AHFR", "ALBV", "SHBV"],
    tags: ["논리형", "실전형", "분석형"],
  },
  {
    code: "SLBV",
    legacyCode: "MLBV",
    name: "철학적 구조 설계자",
    subtitle: "조용히 큰 그림을 세우고 장기 구조를 설계하는 타입",
    summary: "겉으로 드러나기보다 뒤에서 큰 방향과 시스템을 설계하는 장기 전략가입니다.",
    easyDescription: "SLBV는 지금 당장의 반응보다 앞으로의 흐름을 봅니다. 조용히 관찰하며 시간이 지나도 무너지지 않는 구조를 만들고 싶어 합니다.",
    keywords: ["장기전략", "구조", "비전"],
    elementTone: ["水", "木", "土", "金"],
    strengths: ["큰 그림을 본다", "장기 설계가 뛰어나다", "복잡한 구조를 정리한다"],
    cautions: ["생각을 공유하지 않아 고립될 수 있다", "완성 전까지 시작을 미룰 수 있다", "현실 반응 속도가 늦을 수 있다"],
    relationshipStyle: "깊이 신뢰할 수 있는 사람과 오래 가는 관계를 원합니다. 계획과 감정을 함께 공유하면 좋습니다.",
    workStyle: "전략기획, 연구, 시스템 설계, 장기 프로젝트, 콘텐츠 아키텍처, 사업 구조 설계에 강합니다.",
    moneyStyle: "장기 자산과 구조적 안정에 관심이 많습니다. 단기 현금 흐름도 함께 봐야 합니다.",
    growthAdvice: "머릿속 설계를 사람들과 공유 가능한 언어로 바꾸세요.",
    recommendedRoutine: "월간 로드맵을 3단계로 시각화",
    compatibleCodes: ["ALFR", "SHBV", "AHBV"],
    tags: ["논리형", "리더형", "관찰형"],
  },
  {
    code: "SLBR",
    legacyCode: "MLBR",
    name: "침착한 시스템 관리자",
    subtitle: "깊은 집중력과 기준으로 결과물을 완성하는 타입",
    summary: "느리더라도 단단하게, 조용하지만 높은 완성도로 결과를 만드는 장인형입니다.",
    easyDescription: "SLBR은 화려하게 시작하기보다 끝까지 남아 완성하는 힘이 강합니다. 기준이 분명하고, 시간이 지날수록 실력이 쌓이는 타입입니다.",
    keywords: ["완성", "집중", "장인"],
    elementTone: ["土", "金", "水"],
    strengths: ["집중력이 깊다", "완성도가 높다", "꾸준히 실력을 축적한다"],
    cautions: ["시작이 늦을 수 있다", "자기 비판이 강할 수 있다", "변화보다 익숙한 방식을 고집할 수 있다"],
    relationshipStyle: "쉽게 가까워지지는 않지만 한 번 신뢰하면 오래 갑니다. 표현을 조금 더 자주 하면 관계가 따뜻해집니다.",
    workStyle: "전문직, 개발, 제작, 연구, 회계, 문서, 품질관리, 장기 숙련 분야에 강합니다.",
    moneyStyle: "낭비가 적고 안정적인 축적에 강합니다. 자기 성장 비용은 아끼지 않는 것이 좋습니다.",
    growthAdvice: "완성도를 유지하되, 세상에 보여주는 속도를 조금 높이세요.",
    recommendedRoutine: "작업물을 70% 단계에서 한 번 공유하고 피드백 받기",
    compatibleCodes: ["AHFV", "ALFV", "AHBV"],
    tags: ["논리형", "실전형", "장인형"],
  },
];

export function findFptiDictionaryItem(code: string | undefined | null) {
  const dictionaryCode = normalizeFptiDictionaryCode(code);
  return FPTI_DICTIONARY.find((item) => item.code === dictionaryCode);
}
