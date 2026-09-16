import { domainRegistry } from "./domain-registry";

export const services = [
  {
    id: "saju",
    name: domainRegistry.saju.label,
    subtitle: "타고난 나를 만나는 시간",
    description: domainRegistry.saju.shortDescription,
    image: "saju",
    theme: "운명의 바탕",
    details: [
      "타고난 기질과 오행의 균형",
      "관계와 일에서 반복되는 패턴",
      "나에게 맞는 선택의 방향",
    ],
  },
  {
    id: "tarot",
    name: "타로",
    subtitle: "마음이 망설이는 순간",
    description: "카드의 상징을 따라 지금의 감정과 선택지를 돌아보는 이야기.",
    image: "tarot",
    theme: "마음의 목소리",
    details: [
      "지금 마음이 향하는 곳",
      "관계 속 감정과 거리",
      "내가 선택할 수 있는 다음 행동",
    ],
  },
  {
    id: "ziwei",
    name: domainRegistry.ziwei.label,
    subtitle: "별에 담긴 인생의 지도",
    description: domainRegistry.ziwei.shortDescription,
    image: "ziwei",
    theme: "인생의 지도",
    details: [
      "명반으로 살펴보는 나의 성향",
      "삶의 영역별 강점과 과제",
      "변화 앞에서 참고할 방향",
    ],
  },
  {
    id: "astrology",
    name: domainRegistry.astrology.label,
    subtitle: "나를 비추는 별의 언어",
    description: domainRegistry.astrology.shortDescription,
    image: "astrology",
    theme: "별의 언어",
    details: [
      "태양과 달로 읽는 나의 모습",
      "관계에서 드러나는 성향",
      "행성의 움직임으로 살펴보는 흐름",
    ],
  },
  {
    id: "vedic",
    name: domainRegistry.vedic.label,
    subtitle: "오래된 지혜가 건네는 길",
    description: domainRegistry.vedic.shortDescription,
    image: "vedic",
    theme: "오래된 지혜",
    details: [
      "라그나: 삶을 마주하는 태도",
      "라시: 마음의 바탕",
      "나크샤트라: 달이 머무는 별자리",
    ],
  },
  {
    id: "sukuyo",
    name: domainRegistry.sukuyo.label,
    subtitle: "너와 나, 그 사이의 인연",
    description: domainRegistry.sukuyo.shortDescription,
    image: "sukuyo",
    theme: "인연의 결",
    details: [
      "나의 숙이 보여주는 기질",
      "두 사람 사이의 관계 유형",
      "서로의 차이를 이해하는 방법",
    ],
  },
] as const;
export const concerns = [
  {
    id: "love",
    label: "연애",
    icon: "heart",
    ids: ["tarot", "sukuyo"],
    line: "마음이 가는 사람이 있어? 감정과 두 사람의 간격부터 살펴봐.",
  },
  {
    id: "money",
    label: "돈",
    icon: "wallet",
    ids: ["saju", "ziwei"],
    line: "돈 얘기가 궁금하지? 네가 가진 강점부터 차근차근 정리해 봐.",
  },
  {
    id: "marriage",
    label: "결혼",
    icon: "rings",
    ids: ["sukuyo", "saju"],
    line: "오래 함께할 사람이라면, 닮은 점보다 다른 점도 알아두는 게 좋지.",
  },
  {
    id: "work",
    label: "직업",
    icon: "briefcase",
    ids: ["saju", "astrology"],
    line: "남들이 좋다는 일 말고, 네 힘이 자연스럽게 쓰이는 일을 찾아봐.",
  },
  {
    id: "exam",
    label: "시험",
    icon: "book",
    ids: ["saju", "tarot"],
    line: "결과가 걱정돼? 오늘 집중할 수 있는 한 가지부터 정해 봐.",
  },
  {
    id: "someone",
    label: "그 사람",
    icon: "eyes",
    ids: ["tarot", "sukuyo"],
    line: "상대의 마음을 단정할 수는 없어. 지금 보이는 관계의 흐름을 살펴보자.",
  },
  {
    id: "year",
    label: "올해 운세",
    icon: "sparkles",
    ids: ["ziwei", "astrology"],
    line: "아직 남은 이야기가 있잖아. 앞으로의 방향을 천천히 짚어보자.",
  },
] as const;
export const recommendations = [
  {
    title: "마음이 닿는 순간",
    category: "연애운",
    image: "recommend-love",
    target: "tarot",
    topic: "love",
  },
  {
    title: "나의 재물 흐름",
    category: "재물운",
    image: "recommend-wealth",
    target: "saju",
    topic: "money",
  },
  {
    title: "올해, 남은 이야기",
    category: "올해 운세",
    image: "recommend-year",
    target: "ziwei",
    topic: "year",
  },
  {
    title: "낯익은 인연의 비밀",
    category: "인연 이야기",
    image: "recommend-past",
    target: "sukuyo",
    topic: "relationship",
  },
] as const;
export const dailyMessages = [
  {
    title: "조금 느려도, 네 속도로.",
    text: "남의 속도에 맞추느라 네 리듬을 잃지는 마. 오늘은 미뤄둔 작은 일 하나만 끝내봐. 그것도 충분히 앞으로 간 거니까.",
    action: "오늘 끝낼 수 있는 작은 일 하나 적기",
  },
  {
    title: "마음을 읽기 전에, 말을 걸어봐.",
    text: "혼자 추측하다 보면 생각이 끝없이 길어지지. 궁금한 게 있다면 부담 없는 안부부터 건네봐. 답을 재촉하지 않는 것도 다정함이야.",
    action: "고마웠던 사람에게 짧게 안부 전하기",
  },
  {
    title: "다 챙기지 않아도 괜찮아.",
    text: "누군가를 배려하는 건 좋은데, 네 몫의 휴식까지 내주지는 마. 잠깐 창밖을 보고 어깨도 좀 펴. …걱정돼서 하는 말은 아니고.",
    action: "하던 일을 잠시 내려놓고 쉬기",
  },
  {
    title: "잘하는 건, 생각보다 가까이 있어.",
    text: "새로운 걸 찾기 전에 네가 꾸준히 해온 일을 돌아봐. 너무 익숙해서 알아채지 못했을 뿐, 그 안에 쓸 만한 강점이 있을 거야.",
    action: "최근에 잘해낸 일 세 가지 적기",
  },
];
export type StoryScene = {
  title: string;
  background: string;
  character: string;
  after?: string;
  portrait?: boolean;
  mood: "quiet" | "gold" | "storm" | "warm";
  line: string;
  text: string;
};

// Fictional prologue: no real presidents, events or commercial accuracy claims.
export const story: StoryScene[] = [
  {
    title: "하늘을 읽는 사람",
    background: "story-room", character: "prologue-human-calm", portrait: true, mood: "quiet",
    line: "“운명이 어려운 게 아니야. 읽을 줄 아는 사람이 드문 거지.”",
    text: "사람들은 그를 영묘진인이라 불렀다. 달빛 아래 책장을 펼치면, 남들에게는 뒤엉킨 우연이 그에게는 한 줄의 문장처럼 읽혔다. 닫힌 서재의 문을 두드리는 이들 중에는, 한 나라를 손에 쥐고 싶은 사람도 있었다.",
  },
  {
    title: "첫 번째 대통령",
    background: "story-room", character: "prologue-human-smile", portrait: true, mood: "gold",
    line: "“그 자리에 앉게 될 거야. 네가 생각한 것보다 오래 기다린 뒤에.”",
    text: "아직 아무도 승리를 믿지 않던 사람에게, 그는 대통령이 될 운명을 일러주었다. 계절이 바뀌고 마침내 예언이 이루어지자, 사람들은 그의 이름을 낮은 목소리로 주고받았다. 그날 밤, 서재의 촛불 하나가 바람도 없이 꺼졌다.",
  },
  {
    title: "두 번째 대통령",
    background: "story-curse", character: "prologue-human-calm", portrait: true, mood: "storm",
    line: "“둘 다 맞았는데. 그게 문제였나?”",
    text: "이번에는 권좌에 앉아 있던 다른 대통령이었다. 영묘진인이 말한 대로 그가 자리에서 내려오던 밤, 하늘에는 별 하나 보이지 않았다. 두 사람의 운명을 맞혔다는 환호가 서재에 닿기도 전에, 천둥이 먼저 문을 두드렸다.",
  },
  {
    title: "하늘의 판결",
    background: "story-curse", character: "prologue-curse", mood: "storm",
    line: "“보는 눈은 남겨두겠다. 그 눈으로 누리던 것은 가져가마.”",
    text: "하늘은 틀린 말을 벌한 것이 아니었다. 두 번이나 제 비밀을 세상에 흘린 입을 벌한 것이었다. 운명을 읽는 재주는 그대로 두되, 그 재주로 쌓은 위세와 부는 다시 누리지 못하리라는 판결이 떨어졌다.",
  },
  {
    title: "내 손 어디 갔어",
    background: "story-mirror", character: "prologue-changing", after: "prologue-changed", mood: "storm",
    line: "“잠깐. 설명은 듣고 바꿔야 할 거 아니야.”",
    text: "책을 붙잡던 손가락이 오므라들고, 귓가로 낯선 털이 솟았다. 항의하려던 목소리는 짧은 울음으로 새어 나왔다. 갈라진 거울 속에는, 자기보다 훨씬 억울한 얼굴을 한 작은 고양이가 서 있었다.",
  },
  {
    title: "항의는 받지 않습니다",
    background: "story-mirror", character: "prologue-protest", after: "prologue-resigned", mood: "quiet",
    line: "“세상에서 제일 잘 보는데, 복채가 이게 뭐야.”",
    text: "앞발을 치켜들고 따져도 하늘은 잠잠했다. 세상에서 가장 운세를 잘 보는 자가, 가장 헐값에 운세를 봐야 하는 고양이가 된 것이다. 남의 앞날은 훤히 보이는데, 제 저녁밥만은 도무지 해결되지 않았다.",
  },
  {
    title: "고등어라는 약점",
    background: "room-780", character: "prologue-fish", after: "prologue-fish-scent", mood: "warm",
    line: "“돈 때문은 아니야. …그 생선, 어디서 샀어?”",
    text: "그때, 문틈으로 고등어 냄새가 들어왔다. 이 정도 복채로는 어림없다던 앞발이, 어느새 생선을 제 쪽으로 끌어당겼다. 하늘도 꺾지 못한 자존심에 생각보다 작고 맛있는 약점이 생긴 셈이었다.",
  },
  {
    title: "오늘은 네 차례",
    background: "room-780", character: "prologue-cat", mood: "warm",
    line: "“앉아. 네 얘기는 아직 안 끝났잖아.”",
    text: "그렇게 달빛 아래 작은 점술방이 열렸다. 이제 영냥이가 들여다보는 것은 권좌보다, 답장 하나에 잠 못 이루고 내일을 걱정하는 사람들의 밤이다. 상담이 끝나도 힘없이 일어서는 손님에게는, 꼭 한마디를 더 보태곤 한다.",
  },
];
