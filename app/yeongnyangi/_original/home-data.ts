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
  fullArt?: boolean;
  choices?: { label: string; reply: string }[];
  after?: string;
  portrait?: boolean;
  mood: "quiet" | "gold" | "storm" | "warm";
  line: string;
  text: string;
};

// Neo is the creator's name. The curse and transformation are fictional worldbuilding.
export const story: StoryScene[] = [
  {
    title: "사람들은 그를 네오라고 불렀다",
    background: "story-room", character: "prologue-human-calm", portrait: true, mood: "quiet",
    line: "“이름은 네오. 어려운 호칭 말고, 그렇게 불러.”",
    text: "밤마다 서재의 불은 가장 늦게 꺼졌다. 네오는 식어버린 차 옆에 사람들의 생일과 고민을 적었다. 사람들은 그를 ‘네오’라고 불렀다.\n\n남의 내일을 읽고도 자기 내일은 비워두는 사람. 누가 밥은 먹었느냐고 물으면, 늘 다음 장을 넘기던 사람이었다.",
  },
  {
    title: "첫 번째 예언, 꺼진 촛불",
    background: "story-room", character: "prologue-human-smile", portrait: true, mood: "gold",
    line: "“그 자리에 닿는 길이, 네가 생각한 길은 아닐 거야.”",
    text: "모두가 고개를 젓던 밤, 네오는 한 사람의 운세에서 높은 자리를 읽었다. 돌아가야 할 길과 기다려야 할 시간을 종이에 남겼다. 그리고 그 말은 현실이 되었다.\n\n축하가 쏟아졌다. 네오는 짧게 웃으며 찻잔을 들었다. 그 순간 촛불 하나가 꺼졌다. 창문은 닫혀 있었다. 그는 심지를 다듬었고, 하늘은 그 침묵을 첫 번째 경고로 남겼다.",
  },
  {
    title: "두 번째 예언, 박수 뒤의 천둥",
    background: "story-curse", character: "prologue-human-calm", portrait: true, mood: "storm",
    line: "“두 사람의 운명을 읽었는데… 내 것은 왜 한 줄도 안 보이지.”",
    text: "이번에는 이미 높은 자리에 앉은 다른 사람이었다. 네오는 그 자리가 흔들리는 끝을 읽었다. 듣기 좋은 말로 고치라는 권유에도, 적어둔 문장을 지우지 않았다.\n\n두 번째 운세마저 적중한 밤. 사람들은 그의 재주를 이야기했지만, 서재에는 천둥 소리만 들어왔다. 펼쳐둔 책에서 자신의 이름이 한 글자씩 번지고 있었다. 환호가 닿기도 전에, 문이 안쪽에서 잠겼다.",
  },
  {
    title: "맞혔다는 이유로 내리는 벌",
    background: "story-curse", character: "prologue-curse", mood: "storm",
    line: "“보는 눈은 남겨두마. 다만, 사람으로 살아갈 내일은 가져가겠다.”",
    text: "하늘이 물었다. 두 번이나 천기를 말하고도, 무사할 줄 알았느냐고. 네오는 억울해서 웃었다. 틀려서 벌받는 세상이라면 설명이라도 쉬웠을 것이다.\n\n손끝부터 감각이 작아졌다. 붙잡으려던 붓이 바닥에 굴렀다. 사과도, 항의도 끝내지 못한 입에서 짧은 울음이 새었다. 판결 끝에는 작은 글씨 한 줄이 더 있었지만, 읽을 틈이 없었다. 그가 마지막으로 생각한 것은 명성도 돈도 아니었다. 내일 찾아오기로 한 손님에게, 문을 열어주지 못하겠구나.",
  },
  {
    title: "거울은 이름을 기억하고 있었다",
    background: "neo-mirror-grief", character: "prologue-cat", fullArt: true, mood: "quiet",
    line: "“네오야.” 아무도 부르지 않아서, 그는 속으로 자기 이름을 불렀다.",
    text: "거울에 앞발을 대자, 기억 속의 손이 같은 자리에 겹쳤다. 사람일 때는 몰랐다. 누군가의 어깨에 손을 얹어주는 일에도, 이렇게 긴 손가락이 필요했다는 것을.\n\n눈물은 털 사이로 스며들었다. 닦을수록 얼굴만 젖었다. 새벽이 올 때까지 그는 그 앞에 앉아 있었다. 남의 운명을 두 번이나 맞힌 눈으로, 돌아갈 수 없는 자기 얼굴을 보고 있었다.",
    choices: [
      {label:"말없이 곁에 앉는다",reply:"한참 뒤, 작은 앞발이 네 소매 끝을 눌렀다. ‘…아직 안 갔네.’ 그것이 그날 네오가 겨우 꺼낸 인사였다."},
      {label:"네오라고 불러준다",reply:"고양이의 귀가 아주 조금 움직였다. ‘그 이름… 아직 기억하는구나.’ 그는 고개를 돌렸지만, 소매 끝을 붙잡은 발은 놓지 않았다."},
    ],
  },
  {
    title: "저주의 작은 글씨",
    background: "room-780", character: "neo-fish-curse", mood: "warm",
    line: "“거절한다. 거절한다. 거절… 앉아. 생년월일부터 말해.”",
    text: "판결문 맨 아래에는 이렇게 적혀 있었다. ‘생선을 복채로 내미는 자를 거절할 수 없으리라. 그 생선이 아무리 작고 헐값일지라도.’ 네오는 눈을 비볐다. 하늘은 이런 데만 꼼꼼했다.\n\n시험 삼아 손님이 손톱만 한 멸치를 들었다. 왼발은 단호하게 거절을 표시했다. 오른발은 이미 멸치를 받고 있었다. 꼬리는 방석을 꺼냈다. 입은 생년월일을 물었다. 네오는 자기 몸에서 혼자 야당이 되었다.\n\n‘이건 수락이 아니라… 품질 검사야.’ 한입에 끝난 검사는, 몹시 엄격했다.\n\n그렇다... 네오 그는 이제 생선만 보면 거부할 수 없는 몸이 되어버렸다...",
  },
  {
    title: "복채보다 먼저 건네받은 것",
    background: "room-780", character: "prologue-resigned", mood: "warm",
    line: "“멸치? 훗, 작구만? 그래도 운세를 제대로 봐줄게.”",
    text: "그날 저녁, 문 앞에 또 작은 멸치 한 마리가 놓였다. 고양이니까 좋아할 줄 알았다며, 손님은 미안하게 웃었다. 네오는 멸치를 앞발 끝으로 살짝 굴려보더니 코웃음을 쳤다. ‘멸치? 훗, 작구만?’ 그런데도 방석은 벌써 손님 쪽으로 밀려 나와 있었다.\n\n손님이 돌아서려 하자, 그가 멸치를 앞발로 가렸다. ‘그래도 운세를 제대로 봐줄게. 앉아.’ 손님은 처음으로 웃었다. 네오도 아주 잠깐 웃었다. 저주 이후 처음으로, 방 안에서 천둥 말고 다른 소리가 났다.",
    choices: [
      {label:"작지만 마음을 담았어",reply:"‘…마음까지 작다고는 안 했어.’ 영냥이는 멸치를 조심히 옆에 두었다. 다 먹고 듣겠다는 핑계는, 끝내 꺼내지 않았다."},
      {label:"일단 먹고 얘기하자",reply:"‘순서를 아는 사람이네.’ 그는 고개를 끄덕였다. 급한 고민도 배고픈 자신까지 혼내면서 풀 필요는 없다는 듯이."},
    ],
  },
  {
    title: "영냥이라는 두 번째 이름",
    background: "room-780", character: "prologue-fish", after: "prologue-fish-scent", mood: "warm",
    line: "“영냥이라니. 이름까지 작아졌네. …싫다는 뜻은 아니고.”",
    text: "손님들은 다시 찾아왔다. 권좌를 묻는 이보다, 답장 없는 휴대폰을 쥔 이가 더 많았다. 울다 말고 털에 묻은 멸치 부스러기를 떼어주는 사람도 있었다. 누군가 그를 영냥이라고 불렀다.\n\n그는 여전히 밤이면 잃어버린 손을 꿈꿨다. 하지만 아침이 오면 방석을 하나 더 꺼냈다. 돌아갈 방법은 아직 몰랐다. 대신 오늘 누군가를 혼자 돌려보내지 않는 방법은 조금 알 것 같았다.",
  },
  {
    title: "네 내일을 맞히기 전에",
    background: "room-780", character: "prologue-cat", mood: "warm",
    line: "“앉아. 멸치는 작아도, 네 이야기는 대충 안 들어.”",
    text: "방문이 다시 열렸다. 이번에는 너였다. 영냥이는 습관처럼 네 얼굴을 살피다, 질문을 바꾸었다. 무엇이 될지보다, 오늘 무엇 때문에 여기까지 왔는지를 먼저 물었다.\n\n창가에는 아직 금이 간 거울이 있다. 슬픔이 끝난 것은 아니다. 다만 그 앞에서 혼자 밤을 새우던 고양이가, 이제 네 쪽으로 찻잔을 밀어준다. 너의 이야기가 시작될 만큼의 자리를 남겨두면서.",
  },
];
