import type {
  AnimalDestinyData,
  AnimalId,
  AnimalTwelveProfile,
  TwelveStage,
  TwelveStageKey,
} from "@/app/saju/animal-destiny/lib/types";

export const STAGE_SEQUENCE: TwelveStageKey[] = [
  "jangsaeng",
  "mogyok",
  "gwandae",
  "geonrok",
  "jewang",
  "soe",
  "byeong",
  "sa",
  "myo",
  "jeol",
  "tae",
  "yang",
];

export const STAGE_KEY_TO_LABEL: Record<TwelveStageKey, TwelveStage> = {
  jangsaeng: "장생",
  mogyok: "목욕",
  gwandae: "관대",
  geonrok: "건록",
  jewang: "제왕",
  soe: "쇠",
  byeong: "병",
  sa: "사",
  myo: "묘",
  jeol: "절",
  tae: "태",
  yang: "양",
};

export const STAGE_KEY_TO_HANJA: Record<TwelveStageKey, string> = {
  jangsaeng: "長生",
  mogyok: "沐浴",
  gwandae: "冠帶",
  geonrok: "建祿",
  jewang: "帝旺",
  soe: "衰",
  byeong: "病",
  sa: "死",
  myo: "墓",
  jeol: "絶",
  tae: "胎",
  yang: "養",
};

export const STAGE_LABEL_TO_KEY: Record<TwelveStage, TwelveStageKey> = {
  장생: "jangsaeng",
  목욕: "mogyok",
  관대: "gwandae",
  건록: "geonrok",
  제왕: "jewang",
  쇠: "soe",
  병: "byeong",
  사: "sa",
  묘: "myo",
  절: "jeol",
  태: "tae",
  양: "yang",
};

export const STAGE_KEY_TO_ID: Record<TwelveStageKey, AnimalId> = {
  jangsaeng: "cheetah",
  mogyok: "monkey",
  gwandae: "black-panther",
  geonrok: "koala",
  jewang: "tiger",
  soe: "raccoon",
  byeong: "rhino",
  sa: "elephant",
  myo: "sheep",
  jeol: "pegasus",
  tae: "wolf",
  yang: "fawn",
};

export const animalCollection = Object.freeze([
  { name: "새싹 사슴", emoji: "🦌", energy: "장생" },
  { name: "달빛 고양이", emoji: "🐈", energy: "목욕" },
  { name: "리본 여우", emoji: "🦊", energy: "관대" },
  { name: "별빛 강아지", emoji: "🐶", energy: "건록" },
  { name: "태양 사자", emoji: "🦁", energy: "제왕" },
  { name: "현자 부엉이", emoji: "🦉", energy: "쇠" },
  { name: "구름 토끼", emoji: "🐰", energy: "병" },
  { name: "신비 나비", emoji: "🦋", energy: "사" },
  { name: "보물 햄스터", emoji: "🐹", energy: "묘" },
  { name: "밤하늘 흑고양이", emoji: "🐈‍⬛", energy: "절" },
  { name: "꿈알 병아리", emoji: "🐣", energy: "태" },
  { name: "꽃돼지", emoji: "🐷", energy: "양" },
] as const);

const BASE = {
  jangsaeng: {
    animalName: "새싹 사슴",
    title: "별빛 숲의 첫 숨결",
    subtitle: "시작의 기운을 품고 천천히 크게 자라는 타입",
    keywords: ["시작", "순수함", "성장", "보호받는 복", "새로운 기회"],
    symbolItems: ["별씨앗", "새싹뿔", "크림 구름", "숲 연꽃"],
    colors: { primary: "#9bd8b0", secondary: "#fff3b3", accent: "#d4a84f", background: "#f7fff3" },
    energyScores: { charm: 80, drive: 72, recovery: 87, money: 68, love: 82, intuition: 78 },
    strengths: ["새로운 환경 적응", "긍정 에너지", "사람을 안심시키는 분위기"],
    weaknesses: ["초반 의욕 과속", "중간 루틴 이탈", "낯선 비판에 흔들림"],
    attractionPoint: "순수하지만 단단한 눈빛",
    weakPoint: "성급한 확신",
    workStyle: "작은 성공을 연속으로 쌓아 성장하는 방식",
    goodFields: ["교육", "브랜드 신사업", "상담", "콘텐츠 기획"],
    avoidFields: ["성과 압박만 있는 조직", "피드백이 모욕적으로 전달되는 환경"],
    moneyFlow: "새 프로젝트, 소개, 추천에서 운이 붙는 편",
    spendingPattern: "기분이 좋아질 때 선물형 소비가 늘어남",
    bestFit: "따뜻하지만 계획적인 사람",
  },
  mogyok: {
    animalName: "달빛 고양이",
    title: "연꽃 물결의 매혹",
    subtitle: "감정의 흐름을 읽고 분위기를 바꾸는 감성 리더",
    keywords: ["매력", "감성", "변화", "예술성", "분위기 감지"],
    symbolItems: ["달 조각", "연꽃 물방울", "비단 꼬리", "별무늬 카드"],
    colors: { primary: "#c6a8ff", secondary: "#ffd4ec", accent: "#f4cb6a", background: "#fff4ff" },
    energyScores: { charm: 93, drive: 69, recovery: 74, money: 71, love: 91, intuition: 90 },
    strengths: ["감정 공명", "미적 감각", "분위기 연출"],
    weaknesses: ["감정 기복", "과몰입", "상대 반응에 과민"],
    attractionPoint: "달빛처럼 부드러운 매력",
    weakPoint: "마음 확인을 반복하는 패턴",
    workStyle: "창의와 피드백을 빠르게 순환시키는 방식",
    goodFields: ["디자인", "브랜딩", "콘텐츠", "심리케어"],
    avoidFields: ["감정 표현이 금지된 문화", "기계적 루틴만 요구하는 업무"],
    moneyFlow: "관계 기반 협업과 감각형 프로젝트에서 수익화",
    spendingPattern: "미감 소비, 감성 소비가 큼",
    bestFit: "다정하면서도 경계가 건강한 사람",
  },
  gwandae: {
    animalName: "리본 여우",
    title: "무대 위 성장의 관대",
    subtitle: "나를 표현하며 사회적 존재감을 키우는 타입",
    keywords: ["성장", "자존감", "꾸밈", "사회성", "무대 체질"],
    symbolItems: ["금실 리본", "여우 가면", "초승 랜턴", "복주머니"],
    colors: { primary: "#ffb296", secondary: "#e8c8ff", accent: "#e2ab3d", background: "#fff8f4" },
    energyScores: { charm: 88, drive: 82, recovery: 71, money: 76, love: 84, intuition: 74 },
    strengths: ["사회적 센스", "성장 욕구", "자기 연출력"],
    weaknesses: ["평판 의식 과다", "비교 스트레스", "완벽한 이미지 집착"],
    attractionPoint: "사람을 무대로 초대하는 밝은 기운",
    weakPoint: "상대의 인정에 기대는 순간",
    workStyle: "실행과 피드백을 통해 빠르게 업그레이드",
    goodFields: ["PR", "마케팅", "커뮤니티", "교육/강연"],
    avoidFields: ["고립형 작업만 반복", "성과 공유가 차단된 환경"],
    moneyFlow: "평판과 네트워크가 확장될수록 수입이 늘어남",
    spendingPattern: "자기관리, 이미지 투자 비중이 큼",
    bestFit: "응원과 현실 조언을 같이 주는 사람",
  },
  geonrok: {
    animalName: "별빛 강아지",
    title: "자수성가의 별, 신뢰를 쌓아올리는 건록(建祿)",
    subtitle: "스스로의 힘으로 관록을 얻고 재물을 쌓는 가장 안정적이고 독립적인 에너지",
    keywords: ["성실함", "실력", "책임감", "안정", "신뢰"],
    symbolItems: ["수호 목걸이", "별발자국", "청금 망토", "행운종"],
    colors: { primary: "#5269b8", secondary: "#fff4d8", accent: "#d19a35", background: "#f6f8ff" },
    energyScores: { charm: 74, drive: 88, recovery: 80, money: 86, love: 72, intuition: 70 },
    strengths: ["지속 실행", "신뢰 확보", "실무 완성도"],
    weaknesses: ["변화 저항", "과책임", "감정 표현의 절약"],
    attractionPoint: "말보다 행동으로 보여주는 든든함",
    weakPoint: "모든 짐을 혼자 지려는 습관",
    workStyle: "명확한 기준과 루틴으로 성과를 누적",
    goodFields: ["개발", "운영", "재무", "프로젝트 매니지먼트"],
    avoidFields: ["우선순위가 수시로 바뀌는 조직", "책임 기준이 불분명한 팀"],
    moneyFlow: "장기 프로젝트와 신뢰 기반 계약에서 안정적",
    spendingPattern: "필요 기반 소비, 불필요 지출 억제",
    bestFit: "성실함을 존중하는 파트너",
  },
  jewang: {
    animalName: "태양 사자",
    title: "당당한 제왕의 중심",
    subtitle: "주도성과 카리스마로 판을 만드는 태양형 리더",
    keywords: ["카리스마", "주도성", "왕성한 에너지", "확장", "결단"],
    symbolItems: ["태양 왕관", "금빛 망토", "황금 사자문", "별가루"],
    colors: { primary: "#f0b23f", secondary: "#ffdfa8", accent: "#e05c37", background: "#fff9ee" },
    energyScores: { charm: 90, drive: 95, recovery: 69, money: 84, love: 81, intuition: 72 },
    strengths: ["강한 추진", "리더십", "결정력"],
    weaknesses: ["통제 욕구", "휴식 부족", "고집"],
    attractionPoint: "밝고 강한 존재감",
    weakPoint: "혼자 버티는 리더 모드",
    workStyle: "목표 중심의 고속 의사결정",
    goodFields: ["사업개발", "리더 포지션", "브랜드 디렉팅", "전략"],
    avoidFields: ["권한이 없는 리더 역할", "책임만 크고 자원은 없는 환경"],
    moneyFlow: "큰 규모 의사결정에서 수익이 커짐",
    spendingPattern: "성과 보상형 소비",
    bestFit: "솔직하게 피드백해 주는 성숙한 파트너",
  },
  soe: {
    animalName: "현자 부엉이",
    title: "경험을 빛으로 바꾸는 쇠",
    subtitle: "정리와 판단으로 복잡한 흐름을 안정시키는 타입",
    keywords: ["성숙", "정리", "판단력", "경험", "내실"],
    symbolItems: ["별자리 서책", "청동 안경", "은빛 깃털", "고요한 랜턴"],
    colors: { primary: "#6f5d89", secondary: "#efe3d2", accent: "#b48a52", background: "#f9f7ff" },
    energyScores: { charm: 71, drive: 70, recovery: 86, money: 82, love: 67, intuition: 88 },
    strengths: ["판단의 정확도", "정리 능력", "노하우 축적"],
    weaknesses: ["지나친 신중함", "낙관 부족", "감정 표현 감소"],
    attractionPoint: "신뢰를 주는 깊이 있는 태도",
    weakPoint: "가능성보다 위험을 먼저 보는 습관",
    workStyle: "리스크를 먼저 구조화한 뒤 실행",
    goodFields: ["데이터 분석", "재무/법무", "품질관리", "코칭"],
    avoidFields: ["근거 없는 낙관만 강요되는 조직", "단기성과만 추적하는 문화"],
    moneyFlow: "관리형 수익, 장기 안정형 포트폴리오",
    spendingPattern: "효율 중심 지출",
    bestFit: "정서 표현을 먼저 열어 주는 사람",
  },
  byeong: {
    animalName: "구름 토끼",
    title: "회복의 병 기운",
    subtitle: "섬세한 감정 안테나로 사람을 돌보고 회복시키는 타입",
    keywords: ["예민함", "회복", "섬세함", "돌봄", "감정 감지"],
    symbolItems: ["구름 이불", "은방울", "별물방울", "달편지"],
    colors: { primary: "#f3c7d8", secondary: "#cde8ff", accent: "#d8a64d", background: "#fff8fc" },
    energyScores: { charm: 79, drive: 61, recovery: 92, money: 66, love: 86, intuition: 91 },
    strengths: ["공감력", "회복 설계", "세밀한 감각"],
    weaknesses: ["에너지 소진", "감정 과부하", "불안 루프"],
    attractionPoint: "다정하고 포근한 돌봄",
    weakPoint: "상대 감정을 전부 떠안는 태도",
    workStyle: "사람 중심으로 리듬을 조율하며 성과를 낸다",
    goodFields: ["상담", "케어 서비스", "UX 리서치", "콘텐츠 큐레이션"],
    avoidFields: ["감정노동 과부하", "휴식 없이 교대되는 환경"],
    moneyFlow: "신뢰받는 돌봄/디테일 능력에서 발생",
    spendingPattern: "감정 보상 소비 주의",
    bestFit: "감정을 존중하고 회복 시간을 보장해 주는 사람",
  },
  sa: {
    animalName: "신비 나비",
    title: "변신의 사 기운",
    subtitle: "내려놓음과 전환으로 새로운 세계를 여는 직감형",
    keywords: ["변신", "직감", "내려놓음", "영감", "전환"],
    symbolItems: ["영혼 날개", "자정 별가루", "은빛 부적", "비밀문"],
    colors: { primary: "#8f76d9", secondary: "#d9efff", accent: "#c6cad6", background: "#f8f7ff" },
    energyScores: { charm: 84, drive: 66, recovery: 78, money: 65, love: 75, intuition: 95 },
    strengths: ["변화 감지", "직감적 선택", "새로운 관점"],
    weaknesses: ["정착 지연", "일관성 흔들림", "과감한 단절"],
    attractionPoint: "신비로운 감정선과 영감",
    weakPoint: "정서적 거리두기의 급격함",
    workStyle: "전환 시점에서 방향을 재정렬하는 방식",
    goodFields: ["콘셉트 개발", "아트", "브랜드 리빌드", "전환기 프로젝트"],
    avoidFields: ["반복만 강요되는 환경", "창의성이 억압되는 문화"],
    moneyFlow: "리브랜딩/재해석 역량에서 수익화",
    spendingPattern: "감정 전환기 충동 소비 주의",
    bestFit: "자유를 존중하면서도 약속은 지키는 사람",
  },
  myo: {
    animalName: "보물 햄스터",
    title: "축적의 묘 기운",
    subtitle: "작은 자원을 모아 큰 안정으로 바꾸는 실속형",
    keywords: ["저장", "내면", "비밀", "집중력", "관리"],
    symbolItems: ["복주머니", "비밀 금고", "미니 별화폐", "집중 초롱"],
    colors: { primary: "#cfb18f", secondary: "#eadbff", accent: "#d7a53e", background: "#fffaf2" },
    energyScores: { charm: 72, drive: 74, recovery: 83, money: 93, love: 70, intuition: 76 },
    strengths: ["자원 관리", "축적 감각", "집중력"],
    weaknesses: ["지나친 보수성", "기회 지연", "감정 표현 최소화"],
    attractionPoint: "살림과 미래를 챙기는 안정감",
    weakPoint: "마음도 저축하려는 태도",
    workStyle: "장기 목표를 분해해 꾸준히 달성",
    goodFields: ["재무", "구매", "운영", "자산관리"],
    avoidFields: ["리스크가 과도한 투기형 조직", "계획 없는 즉흥 환경"],
    moneyFlow: "축적형 시스템을 만들 때 강력",
    spendingPattern: "필요성 검증 후 구매",
    bestFit: "안정과 성장의 균형을 이해하는 사람",
  },
  jeol: {
    animalName: "밤하늘 흑고양이",
    title: "리셋의 절 기운",
    subtitle: "끊고 다시 시작하는 용기로 판을 바꾸는 타입",
    keywords: ["리셋", "독립", "전환", "새 가능성", "경계"],
    symbolItems: ["초승달 망토", "별자리 고리", "검은 장갑", "금빛 눈동자"],
    colors: { primary: "#2a2741", secondary: "#8c7ed3", accent: "#d8b55a", background: "#f5f3ff" },
    energyScores: { charm: 87, drive: 77, recovery: 74, money: 71, love: 68, intuition: 89 },
    strengths: ["결단적 리셋", "독립성", "경계 설정"],
    weaknesses: ["차단이 빠름", "고립 루프", "감정 냉각"],
    attractionPoint: "미스터리와 자립의 아우라",
    weakPoint: "도움 요청의 지연",
    workStyle: "불필요를 걷어내고 핵심만 남기는 방식",
    goodFields: ["전략 리빌드", "브랜드 개편", "문제 해결", "보안/리스크 관리"],
    avoidFields: ["경계 없는 업무", "감정 착취형 조직"],
    moneyFlow: "구조조정, 비용절감, 리빌드 프로젝트에서 강함",
    spendingPattern: "스트레스성 단절 소비 주의",
    bestFit: "경계를 존중하고 신뢰를 천천히 쌓는 사람",
  },
  tae: {
    animalName: "꿈알 병아리",
    title: "가능성의 태 기운",
    subtitle: "아직 보이지 않는 미래를 먼저 품는 상상형",
    keywords: ["가능성", "상상", "준비", "미래", "실험"],
    symbolItems: ["별알", "민트 깃털", "꿈지도", "새벽 램프"],
    colors: { primary: "#fbe98d", secondary: "#c8f2d3", accent: "#e1b74c", background: "#fffef2" },
    energyScores: { charm: 85, drive: 70, recovery: 81, money: 69, love: 83, intuition: 88 },
    strengths: ["상상력", "학습 민첩성", "미래 설계"],
    weaknesses: ["시작 대비 완주 약함", "선택 피로", "현실 타임라인 지연"],
    attractionPoint: "맑은 호기심과 설레는 비전",
    weakPoint: "계획만 늘어나는 패턴",
    workStyle: "탐색-실험-검증 사이클로 성장",
    goodFields: ["기획", "R&D", "교육", "프로토타입 개발"],
    avoidFields: ["실험이 금지된 조직", "장기 비전이 없는 업무"],
    moneyFlow: "새로운 아이디어를 서비스로 전환할 때 발생",
    spendingPattern: "학습/경험형 소비가 큼",
    bestFit: "아이디어를 현실화하도록 도와주는 사람",
  },
  yang: {
    animalName: "꽃돼지",
    title: "복을 키우는 양 기운",
    subtitle: "보호와 애정, 현실 감각을 함께 키우는 Code:Destiny 마스코트",
    keywords: ["보호", "복", "사랑스러움", "안정 성장", "행운"],
    symbolItems: ["연꽃", "복주머니", "금빛 구름", "행운 랜턴"],
    colors: { primary: "#ffb9c8", secondary: "#ffe7cf", accent: "#d9a23f", background: "#fff8f5" },
    energyScores: { charm: 94, drive: 76, recovery: 88, money: 80, love: 95, intuition: 82 },
    strengths: ["사람을 편안하게 만드는 힘", "복을 모으는 관계 운", "현실적인 따뜻함"],
    weaknesses: ["거절 어려움", "과배려", "결정 지연"],
    attractionPoint: "포근하고 사랑스러운 보호 에너지",
    weakPoint: "모두를 만족시키려는 습관",
    workStyle: "사람과 시스템의 균형을 맞추며 성장",
    goodFields: ["서비스 운영", "브랜드 커뮤니티", "교육/상담", "라이프스타일 비즈니스"],
    avoidFields: ["갈등을 조장하는 문화", "관계 파괴형 경쟁 구조"],
    moneyFlow: "신뢰 기반 반복 수익 모델에서 강함",
    spendingPattern: "사람을 위한 지출이 늘어남",
    bestFit: "다정함을 당연하게 소비하지 않는 사람",
  },
} as const;

function paragraphsForPersonality(stageKey: TwelveStageKey, animalName: string, strengths: readonly string[], weaknesses: readonly string[]) {
  const stageLabel = STAGE_KEY_TO_LABEL[stageKey];
  return [
    `${stageLabel}의 흐름은 한 시점의 성격 고정값이 아니라, 에너지가 어떻게 자라고 소모되는지 보여주는 움직이는 지도입니다. ${animalName} 타입은 그 지도에서 자신만의 템포를 만들 때 가장 큰 장점을 드러냅니다.`,
    `당신의 기본 기질은 ${strengths[0]}과 ${strengths[1]}이 결합된 형태로 나타나기 쉽습니다. 그래서 사람들은 당신을 처음 만났을 때 '편안한데 인상 깊다' 혹은 '부드럽지만 기준이 있다'고 느낄 가능성이 큽니다.`,
    `삶의 반복 패턴은 대개 '도움이 되는 역할을 맡는다 -> 책임이 커진다 -> 감정 에너지를 다시 정리한다'의 사이클로 흐릅니다. 이 흐름을 이해하면 불필요한 자책이 줄고, 성장 속도는 더 안정됩니다.`,
    `스트레스를 받을 때는 ${weaknesses[0]}과 ${weaknesses[1]}이 강화될 수 있습니다. 이때는 성격을 고치려 하기보다, 리듬을 회복할 수 있는 루틴을 먼저 만드는 것이 훨씬 실전적입니다.`,
    `혼자 있을 때의 당신은 겉으로 보이는 모습보다 훨씬 섬세하고 계산적입니다. 그래서 조용히 계획을 세우는 시간은 단순 휴식이 아니라, 다음 도약을 위한 운의 충전 구간에 가깝습니다.`,
    `주변 사람이 느끼는 첫인상과 진짜 내면 사이에는 온도 차가 있을 수 있습니다. 그 간격을 줄이는 가장 좋은 방법은 감정을 설명하는 짧은 문장을 갖는 것입니다.`,
    `결국 ${animalName} 타입의 핵심은 '나를 지키면서도 세상과 연결되는 방식'을 찾는 데 있습니다. 그 방식이 정리되는 순간, 같은 재능도 훨씬 큰 결과로 이어집니다.`,
  ];
}

function paragraphsForLove(stageKey: TwelveStageKey, animalName: string, attractionPoint: string, weakPoint: string) {
  const stageLabel = STAGE_KEY_TO_LABEL[stageKey];
  return [
    `${animalName} 타입의 연애는 ${stageLabel} 기운의 영향을 받아 감정의 온도와 타이밍이 중요하게 작동합니다. 누군가를 좋아하게 되면 관계의 방향을 빨리 읽고 싶어 하는 편입니다.`,
    `당신의 강한 매력 포인트는 ${attractionPoint}입니다. 특히 상대가 지쳐 있을수록 당신의 공감 방식이 관계의 안정 장치처럼 작동할 수 있습니다.`,
    `끌리는 상대는 보통 말의 결이 따뜻하고, 약속을 지키며, 감정 표현을 회피하지 않는 사람입니다. 반대로 애매함이 길어지면 관계 피로가 빠르게 올라갈 수 있습니다.`,
    `연애에서 반복되는 실수는 ${weakPoint}으로 요약됩니다. 이를 줄이려면 감정 확인 질문과 관계 경계 설정을 동시에 훈련하는 것이 좋습니다.`,
    `오래 가는 관계를 위해서는 '문제를 늦게 크게 다루기'보다 '작게 자주 정리하기'가 유효합니다. 하루를 마무리할 때 5분만 서로의 감정을 점검해도 큰 차이를 만듭니다.`,
  ];
}

function createProfile(stageKey: TwelveStageKey): AnimalTwelveProfile {
  const base = BASE[stageKey];
  const isGeonrokDog = stageKey === "geonrok";
  const personalitySummary = isGeonrokDog
    ? "당신의 운명 동물은 별빛 강아지입니다. 명리학에서 건록(建祿)은 스스로의 힘으로 관록을 얻고 재물을 쌓는 가장 안정적이고 독립적인 에너지입니다."
    : `${base.animalName} 타입은 ${base.keywords.slice(0, 2).join("과 ")}의 힘이 동시에 작동하는 구조입니다.`;
  const personalityParagraphs = isGeonrokDog
    ? [
        "건록(建祿)의 기운을 타고난 '별빛 강아지' 타입은 땅에 단단히 뿌리를 내린 거목처럼 흔들림 없는 줏대와 책임감으로 자신만의 세계를 구축하는 사주입니다. 겉으로는 온화하고 사람과 잘 융화되는 듯 보이나, 내면에는 칼날 같은 자기 객관화와 타협하지 않는 프로페셔널한 실력이 자리 잡고 있습니다.",
        "이 사주는 요행을 바라지 않습니다. 자신이 쏟은 땀방울만큼만 거두려 하는 정직함이 오히려 가장 큰 무기가 됩니다. '도움이 되는 역할을 맡는다 -> 완벽하게 책임진다 -> 조직과 타인의 절대적 신뢰를 얻는다'의 패턴이 평생의 운을 관통합니다.",
        "다만, 완벽주의적 성향 탓에 모든 짐을 홀로 짊어지려는 과책임(過責任)의 늪에 빠지기 쉬우니, 때로는 타인에게 기대는 법을 배우는 것이 운의 숨통을 틔우는 개운법(開運法)이 됩니다.",
      ]
    : paragraphsForPersonality(stageKey, base.animalName, base.strengths, base.weaknesses);

  return {
    stageKey,
    stageLabel: STAGE_KEY_TO_LABEL[stageKey],
    animalName: base.animalName,
    title: base.title,
    subtitle: base.subtitle,
    keywords: [...base.keywords],
    colors: { ...base.colors },
    symbolItems: [...base.symbolItems],
    energyScores: { ...base.energyScores },
    personality: {
      summary: personalitySummary,
      strengths: [...base.strengths],
      weaknesses: [...base.weaknesses],
      hiddenPattern: `겉으로는 차분해 보여도 내면에서는 '더 나은 선택'을 계속 계산하는 패턴이 있습니다.`,
      advice: `성과를 내는 힘은 이미 충분하니, 감정 회복 루틴과 경계 설정을 함께 운영해 보세요.`,
      paragraphs: personalityParagraphs,
    },
    love: {
      style: `${base.animalName}형 연애는 진심이 빠르게 드러나는 편입니다.`,
      attractionPoint: base.attractionPoint,
      weakPoint: base.weakPoint,
      advice: `호감의 속도와 관계의 안정 속도를 분리하면 사랑이 더 오래갑니다.`,
      paragraphs: paragraphsForLove(stageKey, base.animalName, base.attractionPoint, base.weakPoint),
    },
    relationship: {
      friends: `친구 관계에서는 ${base.strengths[0]} 덕분에 자연스럽게 신뢰를 얻습니다.`,
      work: `${base.workStyle}이 업무 관계에서 강점으로 작동합니다.`,
      family: `가족에게는 표현보다 행동으로 애정을 보이는 편입니다.`,
      caution: `지나친 책임 떠안기를 줄이고 도움 요청을 습관화하세요.`,
      bestFit: base.bestFit,
    },
    career: {
      workStyle: base.workStyle,
      goodFields: [...base.goodFields],
      avoidFields: [...base.avoidFields],
      growthAdvice: `핵심 과업 1개를 끝까지 완주하는 루틴을 유지하면 성과가 안정적으로 커집니다.`,
      moneyBoostCondition: base.moneyFlow,
    },
    money: {
      moneyFlow: base.moneyFlow,
      spendingPattern: base.spendingPattern,
      savingAdvice: `주간 예산을 고정하고 즉흥 지출은 24시간 보류 규칙을 적용해 보세요.`,
      habitTip: `돈의 흐름을 감정 상태와 함께 기록하면 누수 원인이 더 선명해집니다.`,
    },
    daily: {
      message: `${base.animalName}의 오늘 운세: 감정의 리듬을 먼저 맞추면 일이 더 부드럽게 풀립니다.`,
      luckyAction: `${base.symbolItems[0]} 모티브를 떠올리며 오늘의 핵심 할 일 1개를 먼저 끝내기`,
      caution: `${base.weaknesses[0]}이 강해지는 순간에는 속도를 10% 늦추기`,
      luckyColor: base.colors.primary,
      luckyItem: base.symbolItems[1],
    },
  };
}

export const ANIMAL_TWELVE_PROFILES: Record<TwelveStageKey, AnimalTwelveProfile> = STAGE_SEQUENCE.reduce((acc, stageKey) => {
  acc[stageKey] = createProfile(stageKey);
  return acc;
}, {} as Record<TwelveStageKey, AnimalTwelveProfile>);

function relationByOffset(stageKey: TwelveStageKey, offset: number): TwelveStageKey {
  const index = STAGE_SEQUENCE.indexOf(stageKey);
  return STAGE_SEQUENCE[(index + offset + STAGE_SEQUENCE.length) % STAGE_SEQUENCE.length];
}

function toLegacyAnimalData(stageKey: TwelveStageKey): AnimalDestinyData {
  const profile = ANIMAL_TWELVE_PROFILES[stageKey];
  const id = STAGE_KEY_TO_ID[stageKey];
  const best = relationByOffset(stageKey, 1);
  const good = relationByOffset(stageKey, 2);
  const challenging = relationByOffset(stageKey, 5);
  const worst = relationByOffset(stageKey, 6);

  const mkComp = (targetKey: TwelveStageKey, score: number, reason: string) => ({
    animal_id: STAGE_KEY_TO_ID[targetKey],
    reason,
    compatibility_score: score,
    clash_point: "감정 온도와 의사결정 속도 조율이 필요합니다.",
    conversation_style: "감정 확인 후 일정/역할을 합의하는 대화가 잘 맞습니다.",
    romance_score: Math.min(99, score + 3),
    friend_score: Math.min(99, score + 1),
    work_score: Math.max(40, score - 2),
    maintenance_tip: "좋은 흐름일수록 정기 점검 대화를 유지해 주세요.",
  });

  return {
    id,
    stageKey: profile.stageKey,
    stageLabel: profile.stageLabel,
    animalName: profile.animalName,
    titleLine: profile.title,
    subtitleLine: profile.subtitle,
    keywords: profile.keywords,
    palette: profile.colors,
    symbolItems: profile.symbolItems,
    energyScores: profile.energyScores,
    profile,
    saju_stage: profile.stageLabel,
    stage_hanja: STAGE_KEY_TO_HANJA[stageKey],
    animal_ko: profile.animalName,
    animal_en: profile.title,
    title: profile.title,
    short_copy: profile.subtitle,
    description: profile.personality.paragraphs.slice(0, 3),
    personality: {
      summary: profile.personality.summary,
      strengths: profile.personality.strengths,
      weaknesses: profile.personality.weaknesses,
      hidden_side: profile.personality.hiddenPattern,
      stress_behavior: profile.personality.paragraphs[3] || profile.personality.hiddenPattern,
      growth_direction: profile.personality.advice,
    },
    love: {
      style: profile.love.style,
      attraction_point: profile.love.attractionPoint,
      weakness_in_love: profile.love.weakPoint,
      best_date_mood: "달빛 산책 후 따뜻한 대화",
      advice: profile.love.advice,
      approach_style: profile.love.paragraphs[0] || profile.love.style,
      attractive_type: profile.relationship.bestFit,
      recurring_pattern: profile.love.weakPoint,
      breakup_recovery: "충분한 감정 정리 후 관계를 복기하는 편입니다.",
      long_term_tip: profile.love.advice,
    },
    career: {
      talent: profile.career.workStyle,
      recommended_fields: profile.career.goodFields,
      work_style: profile.career.workStyle,
      money_style: profile.money.moneyFlow,
      advice: profile.career.growthAdvice,
      good_work_method: profile.career.workStyle,
      bad_work_environment: profile.career.avoidFields.join(", "),
      earning_method: profile.career.moneyBoostCondition,
      aptitude_check: profile.career.goodFields.slice(0, 2).join(", "),
    },
    wealth: {
      spending_style: profile.money.spendingPattern,
      saving_style: profile.money.savingAdvice,
      impulse_buy_risk: "감정 기복이 큰 날에 즉흥 결제가 늘어날 수 있습니다.",
      investment_sense: "정보를 수집한 뒤 천천히 결정할 때 강합니다.",
      monetization_strategy: profile.money.moneyFlow,
    },
    human_relations: {
      friend_relations: profile.relationship.friends,
      family_relations: profile.relationship.family,
      social_relations: profile.relationship.work,
      first_impression: profile.title,
      connection_traits: profile.relationship.bestFit,
    },
    today: {
      caution: profile.daily.caution,
      action: profile.daily.luckyAction,
      lucky_behavior: profile.daily.luckyAction,
      emotion_management: profile.personality.hiddenPattern,
      support_message: profile.daily.message,
    },
    luck_essentials: {
      food: "따뜻한 허브티",
      item: profile.daily.luckyItem,
      color: profile.daily.luckyColor,
      place: "별빛이 보이는 산책길",
    },
    compatibility: {
      best: mkComp(best, 92, `${ANIMAL_TWELVE_PROFILES[best].animalName}와는 감정 박자가 빠르게 맞습니다.`),
      good: mkComp(good, 84, `${ANIMAL_TWELVE_PROFILES[good].animalName}와는 역할 분담 시 시너지가 큽니다.`),
      challenging: mkComp(challenging, 61, `${ANIMAL_TWELVE_PROFILES[challenging].animalName}와는 페이스 차이를 조율해야 합니다.`),
      worst: mkComp(worst, 48, `${ANIMAL_TWELVE_PROFILES[worst].animalName}와는 경계와 약속 합의가 먼저 필요합니다.`),
    },
    game_stats: {
      power: profile.energyScores.drive,
      charm: profile.energyScores.charm,
      logic: Math.round((profile.energyScores.money + profile.energyScores.intuition) / 2),
      luck: Math.round((profile.energyScores.recovery + profile.energyScores.intuition) / 2),
      social: Math.round((profile.energyScores.love + profile.energyScores.charm) / 2),
    },
    tamagotchi: {
      favorite_food: "달빛 푸딩",
      growth_message: `${profile.animalName}의 리듬을 지키면 오늘 운이 더 선명해집니다.`,
      care_tip: profile.daily.luckyAction,
      mood_when_happy: "눈동자 주변에 별가루가 반짝입니다.",
      mood_when_tired: "꼬리와 어깨가 조금 내려가며 휴식 신호를 보냅니다.",
    },
    share_card: {
      badge: profile.title,
      headline: `${profile.animalName} 운명 카드`,
      quote: profile.daily.message,
      hashtags: ["#십이운성동물점", `#${profile.animalName.replace(/\s+/g, "")}`, "#CodeDestiny"],
    },
    compatibilityStory: {
      bestMatchStage: STAGE_KEY_TO_LABEL[best],
      cautionMatchStage: STAGE_KEY_TO_LABEL[worst],
      narrative: `${profile.stageLabel}의 당신은 ${STAGE_KEY_TO_LABEL[best]} 기운과 만나면 따뜻한 확장, ${STAGE_KEY_TO_LABEL[worst]} 기운과 만나면 경계 조율이 중요합니다.`,
    },
  };
}

export const ANIMAL_DESTINY_DATA: Record<AnimalId, AnimalDestinyData> = STAGE_SEQUENCE.reduce((acc, stageKey) => {
  const id = STAGE_KEY_TO_ID[stageKey];
  acc[id] = toLegacyAnimalData(stageKey);
  return acc;
}, {} as Record<AnimalId, AnimalDestinyData>);

export const ANIMAL_DESTINY_LIST: AnimalDestinyData[] = STAGE_SEQUENCE.map((stageKey) => ANIMAL_DESTINY_DATA[STAGE_KEY_TO_ID[stageKey]]);

export function getProfileByStageKey(stageKey: TwelveStageKey) {
  return ANIMAL_TWELVE_PROFILES[stageKey] || null;
}

export function getProfileByStageLabel(stageLabel: TwelveStage | null | undefined) {
  if (!stageLabel) return null;
  const key = STAGE_LABEL_TO_KEY[stageLabel];
  return key ? ANIMAL_TWELVE_PROFILES[key] : null;
}
