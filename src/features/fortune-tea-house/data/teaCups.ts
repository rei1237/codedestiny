export type TeaHouseCup = {
  id: string;
  name: string;
  topic: string;
  description: string;
  sajuLens: string;
  tarotLens: string;
  reading: string;
  selectionComment: string;
  eyebrow: string;
  ritualTitle: string;
  summonLine: string;
  yeoniSelectLine: string;
  questionGuideLine: string;
  questionPlaceholder: string;
  loadingLine: string;
  loadingBars: Array<{
    label: string;
    value: number;
  }>;
  resultPrelude: string;
  tarotRevealTitle: string;
  tarotBeforeLine: string;
  visualMotif: string;
  particleTone: "pink" | "purple" | "gold" | "blue" | "rose" | "cream";
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
    eyebrow: "아직 닫히지 않은 마음의 가장자리",
    ritualTitle: "달빛 연꽃차가 조용히 피어납니다",
    summonLine: "찻잔 가장자리에 오래 머문 이름 하나가 떠오릅니다.",
    yeoniSelectLine: "이 잔은 아직 끝났다고 말하지 못한 마음을 비춰요. 재회인지, 정리인지, 먼저 마음의 결을 살펴볼게요.",
    questionGuideLine: "그 사람과의 관계에서 지금 가장 알고 싶은 장면을 적어주세요. 기다려도 되는지, 먼저 움직여도 되는지, 마음의 방향을 함께 볼게요.",
    questionPlaceholder: "예: 그 사람을 더 기다려도 괜찮을까요?",
    loadingLine: "연꽃잎이 지난 말들과 아직 남은 감정을 천천히 건져 올리고 있어요.",
    loadingBars: [
      { label: "지난 말들과 아직 남은 감정을 달빛 위에 띄우고 있어요.", value: 34 },
      { label: "상대 마음의 거리감을 연꽃잎 사이에서 비추는 중이에요.", value: 56 },
      { label: "재회 가능성과 지금 다치지 않는 한 걸음을 나누고 있어요.", value: 78 },
      { label: "연이가 가장 부드러운 다음 말을 고르고 있어요.", value: 94 },
    ],
    resultPrelude: "달빛 연꽃차는 미련과 가능성 사이에서 가장 다치지 않는 다음 걸음을 보여줍니다.",
    tarotRevealTitle: "재회의 마음 위로 카드가 떠올랐어요",
    tarotBeforeLine: "카드는 아직 답을 명령하지 않아요. 먼저 이 마음이 다시 피어날 자리인지, 조용히 접어야 할 자리인지 달빛 위에 비춰볼게요.",
    visualMotif: "lotus, moon, pink mist",
    particleTone: "pink",
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
    eyebrow: "아직 이름 붙지 않은 설렘",
    ritualTitle: "꿀복숭아차가 달콤하게 데워집니다",
    summonLine: "찻잔 위로 복숭아빛 온기가 올라오고, 작은 설렘이 반짝입니다.",
    yeoniSelectLine: "이 잔은 시작되기 전의 마음을 잘 읽어요. 상대의 호감, 거리감, 다가갈 타이밍을 부드럽게 볼게요.",
    questionGuideLine: "그 사람의 반응, 연락, 분위기 중 가장 궁금한 장면을 적어주세요.",
    questionPlaceholder: "예: 이 사람이 저에게 호감이 있는 걸까요?",
    loadingLine: "복숭아빛 향이 말하지 못한 호감과 작은 신호들을 모으고 있어요.",
    loadingBars: [
      { label: "복숭아빛 향이 작은 반응들을 모으고 있어요.", value: 32 },
      { label: "상대의 호감과 아직 조심스러운 거리감을 나누고 있어요.", value: 54 },
      { label: "다가가도 좋은 속도와 멈춰야 할 순간을 살피는 중이에요.", value: 76 },
      { label: "연이가 설렘을 서두르지 않는 말로 다듬고 있어요.", value: 93 },
    ],
    resultPrelude: "꿀복숭아차는 가능성을 키울 수 있는 거리와 속도를 보여줍니다.",
    tarotRevealTitle: "설렘의 향 위로 카드가 떠올랐어요",
    tarotBeforeLine: "이 카드는 시작되기 전 마음의 온도를 비춰요. 호감의 신호인지, 잠시 더 익어야 할 타이밍인지 함께 볼게요.",
    visualMotif: "peach, honey, soft heart",
    particleTone: "rose",
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
    eyebrow: "막막한 길 위에 뜬 작은 별",
    ritualTitle: "별가루 홍차가 길의 방향을 비춥니다",
    summonLine: "찻잔 속 어두운 홍차 위로 작은 별들이 떠오릅니다.",
    yeoniSelectLine: "이 잔은 선택의 방향을 묻는 손님에게 잘 반응해요. 지금 움직일지, 기다릴지, 어떤 길을 볼지 함께 읽어볼게요.",
    questionGuideLine: "직장, 사업, 이직, 창작, 진로 중 지금 가장 막막한 선택을 적어주세요.",
    questionPlaceholder: "예: 지금 이직이나 사업 방향을 바꿔도 괜찮을까요?",
    loadingLine: "별가루가 선택지 위에 내려앉으며 지금 가장 밝은 길을 찾고 있어요.",
    loadingBars: [
      { label: "별가루가 선택지마다 다른 빛을 내려놓고 있어요.", value: 35 },
      { label: "움직일 길과 더 준비해야 할 길을 나누고 있어요.", value: 58 },
      { label: "일의 기질과 카드의 타이밍을 맞춰보는 중이에요.", value: 80 },
      { label: "연이가 지금 가장 밝은 방향을 한 문장으로 정리하고 있어요.", value: 95 },
    ],
    resultPrelude: "별가루 홍차는 지금의 선택이 어디로 이어질지 차분히 보여줍니다.",
    tarotRevealTitle: "선택의 길 위로 카드가 떠올랐어요",
    tarotBeforeLine: "카드는 어느 길이 손님의 속도와 맞는지 먼저 보여줘요. 조급함이 아니라 방향을 함께 볼게요.",
    visualMotif: "stars, black tea, compass",
    particleTone: "purple",
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
    eyebrow: "현실의 온기를 되찾는 금빛 향",
    ritualTitle: "황금 계피차가 돈의 흐름을 데웁니다",
    summonLine: "찻잔 속 금빛 소용돌이가 수입과 지출의 길을 그립니다.",
    yeoniSelectLine: "이 잔은 막연한 기대보다 현실적인 돈의 흐름을 보여줘요. 기회와 지출, 붙잡을 수 있는 타이밍을 함께 볼게요.",
    questionGuideLine: "수입, 지출, 사업, 투자, 결제, 계약 등 지금 가장 궁금한 금전 문제를 적어주세요.",
    questionPlaceholder: "예: 지금 수입 흐름이 나아질 가능성이 있을까요?",
    loadingLine: "계피 향이 흩어진 돈의 흐름을 다시 한 줄로 모으고 있어요.",
    loadingBars: [
      { label: "계피 향이 수입과 지출의 흐름을 모으고 있어요.", value: 33 },
      { label: "현실적인 기회와 조심해야 할 지출 신호를 나누고 있어요.", value: 57 },
      { label: "돈의 흐름이 막히는 지점과 열리는 지점을 확인하고 있어요.", value: 82 },
      { label: "연이가 붙잡을 수 있는 작은 기회를 고르고 있어요.", value: 95 },
    ],
    resultPrelude: "황금 계피차는 지금 붙잡을 수 있는 현실적인 기회를 보여줍니다.",
    tarotRevealTitle: "돈의 흐름 위로 카드가 떠올랐어요",
    tarotBeforeLine: "이 카드는 막연한 행운보다 실제 흐름을 먼저 비춰요. 들어오는 것과 새는 것을 함께 살펴볼게요.",
    visualMotif: "gold, cinnamon, coin light",
    particleTone: "gold",
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
    eyebrow: "스스로에게 돌아오는 조용한 숨",
    ritualTitle: "백련 치유차가 마음을 가라앉힙니다",
    summonLine: "흰 연꽃 향이 마음의 깊은 곳까지 천천히 내려앉습니다.",
    yeoniSelectLine: "이 잔은 답보다 회복이 먼저 필요한 밤에 반응해요. 불안, 자존감, 지친 마음을 부드럽게 볼게요.",
    questionGuideLine: "요즘 가장 무너지는 감정이나, 스스로에게 가장 차갑게 굴었던 순간을 적어주세요.",
    questionPlaceholder: "예: 요즘 마음이 너무 지치는데 어떻게 회복하면 좋을까요?",
    loadingLine: "백련 향이 지친 마음의 결을 하나씩 풀어주고 있어요.",
    loadingBars: [
      { label: "백련 향이 지친 마음의 결을 풀어주고 있어요.", value: 31 },
      { label: "지금 가장 먼저 회복해야 할 감정을 찾고 있어요.", value: 55 },
      { label: "스스로를 덜 다치게 하는 말을 고르고 있어요.", value: 79 },
      { label: "연이가 오늘 숨 쉴 수 있는 작은 자리를 마련하고 있어요.", value: 94 },
    ],
    resultPrelude: "백련 치유차는 나를 덜 미워하는 방향으로 다음 한 걸음을 비춥니다.",
    tarotRevealTitle: "회복의 숨결 위로 카드가 떠올랐어요",
    tarotBeforeLine: "카드는 오늘 이겨내야 할 답보다 먼저 돌봐야 할 마음을 보여줘요. 천천히 열어볼게요.",
    visualMotif: "white lotus, warm mist, healing",
    particleTone: "cream",
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
    eyebrow: "끝내야 할 것과 지켜야 할 것 사이",
    ritualTitle: "흑월 현미차가 고요하게 흔들립니다",
    summonLine: "짙은 찻물 위로 검은 달이 떠오르고, 마음의 기준선이 드러납니다.",
    yeoniSelectLine: "이 잔은 감정보다 기준이 필요한 순간에 반응해요. 붙잡을 것과 내려놓을 것을 차분히 나눠볼게요.",
    questionGuideLine: "이별, 거리두기, 손절, 위기, 결단 중 지금 가장 두려운 선택을 적어주세요.",
    questionPlaceholder: "예: 이 관계를 정리해야 할까요, 조금 더 지켜봐야 할까요?",
    loadingLine: "검은 달빛이 감정의 소음과 현실의 신호를 조용히 분리하고 있어요.",
    loadingBars: [
      { label: "검은 달빛이 감정의 소음과 현실의 신호를 분리하고 있어요.", value: 36 },
      { label: "끝내야 할 것과 아직 지켜도 되는 것을 나누고 있어요.", value: 60 },
      { label: "결단의 기준이 상처를 키우지 않는 방향인지 살피고 있어요.", value: 83 },
      { label: "연이가 손님의 마음을 가장 덜 다치게 할 문장을 고르고 있어요.", value: 96 },
    ],
    resultPrelude: "흑월 현미차는 상처를 키우지 않는 결단의 기준을 보여줍니다.",
    tarotRevealTitle: "결단의 밤 위로 카드가 떠올랐어요",
    tarotBeforeLine: "카드는 차갑게 끊어내라고 말하지 않아요. 다만 어떤 기준이 손님을 지키는지 조용히 드러낼 거예요.",
    visualMotif: "black moon, brown rice tea, quiet shadow",
    particleTone: "blue",
    accent: "blue",
  },
];

export function getTeaHouseCupById(cupId: string) {
  return teaHouseCups.find((cup) => cup.id === cupId);
}
