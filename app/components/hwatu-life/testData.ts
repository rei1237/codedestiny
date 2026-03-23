export type TraitKey =
  | "leadership"
  | "opportunism"
  | "strategy"
  | "pragmatism"
  | "endurance"
  | "charisma"
  | "intuition"
  | "composure";

export type TraitScores = Record<TraitKey, number>;

export type LifeChoice = {
  key: "A" | "B" | "C";
  text: string;
  score: Partial<TraitScores>;
};

export type LifeQuestion = {
  id: string;
  title: string;
  sub: string;
  choices: LifeChoice[];
};

export type LifeArchetype = {
  id: string;
  name: string;
  cardTitle: string;
  tagline: string;
  quote: string;
  cardImage: string;
  comboLabel: string;
  traits: string[];
  profile: TraitScores;
};

export const TRAIT_KEYS: TraitKey[] = [
  "leadership",
  "opportunism",
  "strategy",
  "pragmatism",
  "endurance",
  "charisma",
  "intuition",
  "composure",
];

export const LIFE_ARCHETYPES: LifeArchetype[] = [
  {
    id: "samgwang",
    name: "삼광",
    cardTitle: "태생적 주인공",
    tagline: "어디서나 빛이 나는 판의 중심.",
    quote: "판이 조용하면 네가 불을 붙여라. 중심은 만들면 된다.",
    cardImage: "/sudda/hwatu/3_1.webp",
    comboLabel: "광 중심 조합",
    traits: ["리더십", "존재감", "추진력"],
    profile: { leadership: 5, opportunism: 3, strategy: 3, pragmatism: 2, endurance: 3, charisma: 5, intuition: 3, composure: 3 },
  },
  {
    id: "godori",
    name: "고도리",
    cardTitle: "기회 포착의 화신",
    tagline: "세 마리 새처럼 빠르게 기회를 낚는 승부사.",
    quote: "기회는 두 번 안 온다. 왔을 때 뜯어먹는 게 실력이다.",
    cardImage: "/sudda/hwatu/2_1.webp",
    comboLabel: "열끗 속공 조합",
    traits: ["민첩성", "결단력", "순발력"],
    profile: { leadership: 3, opportunism: 5, strategy: 2, pragmatism: 3, endurance: 2, charisma: 4, intuition: 4, composure: 2 },
  },
  {
    id: "cheongdan",
    name: "청단",
    cardTitle: "완벽주의 전략가",
    tagline: "줄을 세워야 직성이 풀리는 꼼꼼한 설계자.",
    quote: "운은 준비된 설계도 위에만 앉는다.",
    cardImage: "/sudda/hwatu/4_2.webp",
    comboLabel: "청단 정밀 조합",
    traits: ["계획성", "분석력", "정확성"],
    profile: { leadership: 3, opportunism: 2, strategy: 5, pragmatism: 4, endurance: 3, charisma: 2, intuition: 2, composure: 5 },
  },
  {
    id: "hongdan",
    name: "홍단",
    cardTitle: "감정 조율의 달인",
    tagline: "사람의 온도를 읽고 관계를 매만지는 협상가.",
    quote: "말 한 장이 패 열 장을 이길 때가 있다.",
    cardImage: "/sudda/hwatu/1_2.webp",
    comboLabel: "홍단 관계 조합",
    traits: ["관계력", "설득력", "표현력"],
    profile: { leadership: 3, opportunism: 3, strategy: 3, pragmatism: 2, endurance: 3, charisma: 5, intuition: 4, composure: 3 },
  },
  {
    id: "chodan",
    name: "초단",
    cardTitle: "정밀 컨트롤러",
    tagline: "루틴으로 승부를 만드는 관리형 플레이어.",
    quote: "큰 승부는 대충이 아니라 루틴에서 갈린다.",
    cardImage: "/sudda/hwatu/6_2.webp",
    comboLabel: "초단 루틴 조합",
    traits: ["체계성", "관리력", "성실함"],
    profile: { leadership: 2, opportunism: 2, strategy: 5, pragmatism: 4, endurance: 4, charisma: 2, intuition: 2, composure: 4 },
  },
  {
    id: "bipung",
    name: "비풍초똥팔삼",
    cardTitle: "쿨한 현실주의자",
    tagline: "버릴 줄 아는 미학을 가진 실속파.",
    quote: "모든 패를 들고 가려는 순간, 이미 진 거다.",
    cardImage: "/sudda/hwatu/12_3.webp",
    comboLabel: "실속 파투 조합",
    traits: ["효율성", "멘탈", "손절력"],
    profile: { leadership: 2, opportunism: 4, strategy: 3, pragmatism: 5, endurance: 4, charisma: 2, intuition: 3, composure: 4 },
  },
  {
    id: "ddonggwang",
    name: "똥광",
    cardTitle: "대기만성형 거물",
    tagline: "남들이 버린 곳에서 기적을 만드는 역전의 명수.",
    quote: "지금 지는 척하는 게, 마지막에 먹는 기술이다.",
    cardImage: "/sudda/hwatu/11_4.webp",
    comboLabel: "역전 내공 조합",
    traits: ["인내심", "복원력", "끈기"],
    profile: { leadership: 2, opportunism: 2, strategy: 3, pragmatism: 4, endurance: 5, charisma: 2, intuition: 3, composure: 5 },
  },
  {
    id: "bigwang",
    name: "비광",
    cardTitle: "폭풍 돌파형",
    tagline: "비바람 속에서도 길을 여는 하이리스크 플레이어.",
    quote: "비 오는 판일수록, 진짜 실력이 드러난다.",
    cardImage: "/sudda/hwatu/12_1.webp",
    comboLabel: "비광 반전 조합",
    traits: ["돌파력", "배짱", "반전력"],
    profile: { leadership: 4, opportunism: 3, strategy: 2, pragmatism: 2, endurance: 4, charisma: 4, intuition: 4, composure: 2 },
  },
];

export const LIFE_QUESTIONS: LifeQuestion[] = [
  {
    id: "q1",
    title: "판돈이 두 배로 뛰었다. 네 첫 선택은?",
    sub: "돈 앞에서 네 자세를 본다.",
    choices: [
      { key: "A", text: "묻고 더블로 간다.", score: { leadership: 2, opportunism: 1, charisma: 1 } },
      { key: "B", text: "상대 표정을 보고 한 박자 늦게 들어간다.", score: { strategy: 2, composure: 2 } },
      { key: "C", text: "손절선부터 긋고 리스크를 자른다.", score: { pragmatism: 2, endurance: 1, composure: 1 } },
    ],
  },
  {
    id: "q2",
    title: "사랑이 꼬였다. 너의 한 수는?",
    sub: "감정전에서의 승부법.",
    choices: [
      { key: "A", text: "오늘 바로 직구를 던진다.", score: { charisma: 2, leadership: 1, intuition: 1 } },
      { key: "B", text: "말의 순서를 다시 짜고 들어간다.", score: { strategy: 2, composure: 1, pragmatism: 1 } },
      { key: "C", text: "잠깐 물러서서 흐름을 기다린다.", score: { endurance: 2, composure: 2 } },
    ],
  },
  {
    id: "q3",
    title: "팀 판이 흔들린다. 네 포지션은?",
    sub: "위기 순간의 역할 선택.",
    choices: [
      { key: "A", text: "내가 앞에서 책임지고 판을 다시 세운다.", score: { leadership: 2, endurance: 1, charisma: 1 } },
      { key: "B", text: "원인을 분해하고 구조부터 고친다.", score: { strategy: 2, composure: 2 } },
      { key: "C", text: "살릴 라인만 추려 빠르게 복구한다.", score: { pragmatism: 2, opportunism: 1, endurance: 1 } },
    ],
  },
  {
    id: "q4",
    title: "갑자기 빈자리가 생겼다. 승진 기회다.",
    sub: "기회 앞에서의 본능.",
    choices: [
      { key: "A", text: "내 이름부터 올린다.", score: { leadership: 2, opportunism: 2 } },
      { key: "B", text: "요건과 리스크를 계산한다.", score: { strategy: 2, composure: 1, pragmatism: 1 } },
      { key: "C", text: "때를 본다. 지금은 실속이 우선.", score: { pragmatism: 2, endurance: 1, intuition: 1 } },
    ],
  },
  {
    id: "q5",
    title: "지인이 무리한 투자 제안을 한다.",
    sub: "신뢰와 계산의 경계.",
    choices: [
      { key: "A", text: "소액으로 먼저 찍어본다.", score: { opportunism: 2, intuition: 1, pragmatism: 1 } },
      { key: "B", text: "근거 없으면 안 간다. 숫자부터 본다.", score: { strategy: 2, pragmatism: 2 } },
      { key: "C", text: "관계는 지키되 돈은 지킨다. 거절.", score: { composure: 2, endurance: 1, pragmatism: 1 } },
    ],
  },
  {
    id: "q6",
    title: "중요 발표 직전 돌발 변수가 생겼다.",
    sub: "순간 대응 감각 체크.",
    choices: [
      { key: "A", text: "즉석에서 흐름을 재구성한다.", score: { charisma: 2, leadership: 1, intuition: 1 } },
      { key: "B", text: "핵심 3개만 남겨 안정적으로 간다.", score: { strategy: 1, pragmatism: 2, composure: 1 } },
      { key: "C", text: "속도를 늦추고 실수 없이 버틴다.", score: { endurance: 2, composure: 2 } },
    ],
  },
  {
    id: "q7",
    title: "네가 믿는 진짜 승부는?",
    sub: "마지막. 본능대로 고른다.",
    choices: [
      { key: "A", text: "시선을 내 쪽으로 끌어오는 순간.", score: { charisma: 2, leadership: 1, opportunism: 1 } },
      { key: "B", text: "설계가 완벽하게 맞아떨어지는 순간.", score: { strategy: 2, composure: 1, endurance: 1 } },
      { key: "C", text: "끝까지 살아남아 뒤집는 한 방.", score: { endurance: 2, intuition: 1, pragmatism: 1 } },
    ],
  },
];
