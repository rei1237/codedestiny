export type TeaHouseCup = {
  id: string;
  name: string;
  topic: string;
  description: string;
  sajuLens: string;
  tarotLens: string;
  reading: string;
  selectionComment: string;
  accent: "pink" | "purple" | "gold" | "blue" | "rose" | "cream";
};

export const teaHouseCups: TeaHouseCup[] = [
  {
    id: "lotus-moon",
    name: "달빛 연꽃차",
    topic: "연애 · 재회",
    description: "감정, 상대 마음, 관계 흐름 중심",
    sajuLens: "관계 패턴, 감정 표현, 인연의 반복 흐름",
    tarotLens: "상대 마음, 현재 거리감, 다시 피어날 가능성",
    reading: "달빛 연꽃차는 오래 머문 감정과 다시 피어나는 인연을 비추며, 아직 끝나지 않은 마음의 결을 찻잔 위에 조용히 띄웁니다.",
    selectionComment: "이 잔은 마음이 아직 놓지 못한 관계의 결을 사주와 타로 양쪽에서 살피게 해요.",
    accent: "pink",
  },
  {
    id: "honey-peach",
    name: "꿀복숭아차",
    topic: "썸 · 인연",
    description: "설렘, 가능성, 호감도 중심",
    sajuLens: "끌림의 방식, 호감 표현, 인연이 열리는 반복 신호",
    tarotLens: "상대의 반응, 관계가 가까워지는 속도, 마음의 가능성",
    reading: "꿀복숭아차는 설렘과 가능성을 읽으며, 아직 이름 붙이지 못한 마음이 어느 방향으로 향하는지 달콤한 향으로 알려줍니다.",
    selectionComment: "이 잔은 아직 이름 붙지 않은 마음이 어디로 향하는지 부드럽게 비춰줘요.",
    accent: "rose",
  },
  {
    id: "star-black-tea",
    name: "별가루 홍차",
    topic: "진로 · 사업",
    description: "방향성, 기회, 선택 중심",
    sajuLens: "일의 방향성, 강한 기운, 반복되는 선택 패턴",
    tarotLens: "지금 움직일 때인지, 기다릴 때인지, 선택의 상징",
    reading: "별가루 홍차는 진로와 선택의 방향을 보여 주며, 막막한 길 위에서 지금 바라볼 수 있는 별 하나를 선명하게 드러냅니다.",
    selectionComment: "이 잔은 일과 선택 앞에서 사주의 기본 기질과 카드의 타이밍을 함께 열어줘요.",
    accent: "purple",
  },
  {
    id: "gold-cinnamon",
    name: "황금 계피차",
    topic: "금전운",
    description: "돈, 수입, 지출, 사업운 중심",
    sajuLens: "재물 운용 습관, 현실 감각, 돈을 대하는 반복 흐름",
    tarotLens: "현재 기회, 지출의 신호, 붙잡을 수 있는 현실 상징",
    reading: "황금 계피차는 돈의 흐름과 현실적인 기회를 비추며, 따뜻한 금빛 속에서 오늘 붙잡을 수 있는 가능성을 가려냅니다.",
    selectionComment: "이 잔은 돈의 흐름을 막연한 기대보다 현실적인 한 걸음으로 정리해줘요.",
    accent: "gold",
  },
  {
    id: "white-lotus-healing",
    name: "백련 치유차",
    topic: "마음 회복",
    description: "위로, 불안, 자존감 중심",
    sajuLens: "지친 기질의 회복점, 마음이 반복해서 약해지는 자리",
    tarotLens: "지금 필요한 위로, 불안의 상징, 회복으로 향하는 방향",
    reading: "백련 치유차는 지친 마음을 다독이며, 스스로를 향한 차가운 말을 조금 더 부드러운 숨으로 바꾸게 돕습니다.",
    selectionComment: "이 잔은 오늘 마음을 세게 몰아붙이기보다, 다시 숨 쉴 자리를 먼저 찾아줘요.",
    accent: "cream",
  },
  {
    id: "black-moon-brown-rice",
    name: "흑월 현미차",
    topic: "이별 · 위기",
    description: "정리, 결단, 냉정한 판단 중심",
    sajuLens: "결단의 패턴, 관계의 압박, 지켜야 할 기준",
    tarotLens: "끝내야 할 것, 기다릴 수 있는 것, 위기 속 선택의 상징",
    reading: "흑월 현미차는 끝내야 할 것과 지켜야 할 것을 구분하며, 고요한 밤의 향으로 마음의 기준을 다시 세워 줍니다.",
    selectionComment: "이 잔은 붙잡을 마음과 내려놓을 마음을 같은 찻잔 위에서 차분히 나눠줘요.",
    accent: "blue",
  },
];

export function getTeaHouseCupById(cupId: string) {
  return teaHouseCups.find((cup) => cup.id === cupId);
}
