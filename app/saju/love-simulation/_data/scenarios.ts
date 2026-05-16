import { Choice } from "../_types";

export interface Scenario {
  id: string;
  type: string;
  backgroundEmoji: string;
  situationDescription: string;
  narrative?: string;
  npcDialogue: (name: string) => string;
  choices: ChoiceWithReaction[];
}

export interface ChoiceWithReaction extends Choice {
  id: string;
  element: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  reaction: (name: string) => string;
}

export const SCENARIO_DB: Scenario[] = [
  {
    id: "movie",
    type: "영화관",
    backgroundEmoji: "🎬🍿",
    situationDescription: "엔딩 크레딧이 올라가고, 극장 안 불이 켜진다. 그가 당신을 보며 팝콘을 내려놓는다.",
    npcDialogue: (name) => `"오늘 영화 진짜 재밌지 않았어? 특히 마지막 장면— ${name}는 어떻게 봤어?"`,
    choices: [
      {
        id: "c1",
        text: "너무 감동적이었어. 여운이 오래 남을 것 같아.",
        element: "수",
        risk: "LOW",
        affinityDelta: 8,
        reaction: (name) => `"그치? ${name}도 나랑 비슷하게 느꼈네. 우리 취향 좀 통하는 것 같아."`,
      },
      {
        id: "c2",
        text: "좋았는데. 근데 너 긴장했지? 팝콘 엄청 빨리 먹던데.",
        element: "화",
        risk: "MEDIUM",
        affinityDelta: 4,
        reaction: (name) => `"…눈치챘어? 재밌는 게 나오면 그렇게 돼. ${name} 관찰력 좋네."`,
      },
      {
        id: "c3",
        text: "솔직히 좀 지루했어. 평점 과대평가인 것 같아.",
        element: "금",
        risk: "HIGH",
        affinityDelta: -1,
        reaction: (name) => `"아… 그렇구나. 나는 괜찮았는데— 취향이 다를 수 있지 뭐."`,
      },
    ],
  },
  {
    id: "drive",
    type: "드라이브",
    backgroundEmoji: "🌊🚗",
    situationDescription: "야간 드라이브, 차창 밖으로 도심 불빛이 흐른다. 라디오에서 모르는 노래가 잔잔하게 흘러나온다.",
    npcDialogue: (name) => `"어디 가고 싶어? 그냥 달려도 되고— ${name}가 정해줘."`,
    choices: [
      {
        id: "c1",
        text: "바다 쪽으로 가자. 이 시간에 보는 바다 좋아해.",
        element: "수",
        risk: "LOW",
        affinityDelta: 8,
        reaction: (name) => `"나도. 이렇게 딱 맞는 대답이 오면 좀 설레잖아. ${name} 잘 알겠다 이제."`,
      },
      {
        id: "c2",
        text: "(라디오 볼륨 올리며) 이 노래 좋다. 알아?",
        element: "화",
        risk: "MEDIUM",
        affinityDelta: 5,
        reaction: (name) => `"처음 들었는데 좋네. 앞으로도 ${name}가 추천해줘."`,
      },
      {
        id: "c3",
        text: "어디 가도 상관없어. 피곤하면 그냥 집에 가도 돼.",
        element: "토",
        risk: "HIGH",
        affinityDelta: -4,
        reaction: (name) => `"…아, 피곤해? 그럼 내릴게. (잠시 침묵)"`,
      },
    ],
  },
  {
    id: "exhibition",
    type: "전시회",
    backgroundEmoji: "🖼️🎨",
    situationDescription: "조용한 갤러리. 그가 한 작품 앞에 오래 서있다. 다가가자 눈빛이 달라진 걸 느낀다.",
    npcDialogue: (name) => `"이거 보면 뭔가 느껴지지 않아? 나는 이 작품이 왜인지 계속 당기는데— ${name}는 어때?"`,
    choices: [
      {
        id: "c1",
        text: "뭔가 외로운 것 같은데, 동시에 자유로워 보여.",
        element: "수",
        risk: "LOW",
        affinityDelta: 9,
        reaction: (name) => `"…어, 맞아. 나도 그렇게 봤어. ${name}, 나랑 같은 걸 느끼는 사람이구나."`,
      },
      {
        id: "c2",
        text: "솔직히 잘 모르겠어. 설명해줘.",
        element: "목",
        risk: "MEDIUM",
        affinityDelta: 3,
        reaction: (name) => `"하하, 솔직하다. 나도 정답은 모르는데— 같이 생각해보자."`,
      },
      {
        id: "c3",
        text: "(작품 옆 안내판 보며) 가격이 얼마야? 비싸겠다.",
        element: "금",
        risk: "HIGH",
        affinityDelta: -3,
        reaction: (name) => `"가격? …그 얘기가 나올 줄은 몰랐어. 뭐, 그렇게 볼 수도 있지."`,
      },
    ],
  },
  {
    id: "rain",
    type: "갑작스러운 비",
    backgroundEmoji: "🌧️☂️",
    situationDescription: "예고 없이 쏟아지는 빗속, 작은 우산 하나. 어깨가 맞닿을 것 같은 거리에 두 사람이 선다.",
    npcDialogue: (name) => `"어… 우산이 하나밖에 없네. (잠시 망설이다 우산을 ${name} 쪽으로 더 기울이며) 이쪽이 더 맞아?"`,
    choices: [
      {
        id: "c1",
        text: "(살짝 어깨를 붙이며) 같이 쓰면 되잖아. 이 정도면 충분해.",
        element: "수",
        risk: "LOW",
        affinityDelta: 10,
        reaction: (name) => `"…(말없이 우산을 더 기울이며) 그래, 충분해. 오히려 좋다."`,
      },
      {
        id: "c2",
        text: "나는 좀 젖어도 돼. 네가 더 써.",
        element: "목",
        risk: "LOW",
        affinityDelta: 8,
        reaction: (name) => `"그런 말 왜 해. (단호하게 같이 들어오라는 듯 당기며) 같이 써."`,
      },
      {
        id: "c3",
        text: "(떨어져 서며) 어, 나 이쪽이 더 편해. 금방 카페 나오잖아.",
        element: "금",
        risk: "HIGH",
        affinityDelta: -2,
        reaction: (name) => `"…그래, 카페 가자. (조금 멀어진 거리를 느끼며)"`,
      },
    ],
  },
  {
    id: "gift",
    type: "기념일 깜짝 이벤트",
    backgroundEmoji: "🎁🌹",
    situationDescription: "기대하지 않았던 순간, 상대방이 작은 선물 박스를 내밀며 조심스럽게 웃는다.",
    npcDialogue: (name) => `"사실 오늘… (선물을 내밀며) 준비했어. 별거 아닌데 ${name}한테 주고 싶었어."`,
    choices: [
      {
        id: "c1",
        text: "(천천히 열어보며) 어떻게 알았어? 내가 좋아하는 거잖아.",
        element: "수",
        risk: "LOW",
        affinityDelta: 12,
        reaction: (name) => `"(환하게 웃으며) 기억해뒀어. ${name} 말 다 듣거든."`,
      },
      {
        id: "c2",
        text: "나도 뭔가 주고 싶었는데, 이렇게 먼저 줘버리면 어떡해.",
        element: "목",
        risk: "LOW",
        affinityDelta: 9,
        reaction: (name) => `"다음엔 ${name}이 줘. 그걸로 충분해."`,
      },
      {
        id: "c3",
        text: "(포장 보며 장난치듯) 폭탄 아니지? 열어봐도 돼?",
        element: "화",
        risk: "MEDIUM",
        affinityDelta: 6,
        reaction: (name) => `"ㅋㅋ 터진다, 진짜로. 빨리 열어봐."`,
      },
    ],
  },
  {
    id: "bill",
    type: "계산서 배틀",
    backgroundEmoji: "💳🍽️",
    situationDescription: "맛있는 식사가 끝나고 계산서가 테이블 위에 놓였다. 상대방이 카드를 꺼내려 한다.",
    npcDialogue: (name) => `"(카드를 꺼내며) 오늘은 내가 낼게. ${name}이 골라준 식당이니까."`,
    choices: [
      {
        id: "c1",
        text: "(상대방 카드를 살짝 막으며) 이번엔 내가 낼게. 다음에 네가 내.",
        element: "화",
        risk: "LOW",
        affinityDelta: 9,
        reaction: (name) => `"(잠시 눈싸움하다 웃으며) …그래, 다음엔 내가 낸다. 꼭."`,
      },
      {
        id: "c2",
        text: "반반으로 하자. 그게 제일 편하잖아.",
        element: "금",
        risk: "MEDIUM",
        affinityDelta: 3,
        reaction: (name) => `"현실적이다 ㅋㅋ. 뭐, 그러자. 근데 다음엔 내가 낼게."`,
      },
      {
        id: "c3",
        text: "(먼저 자리에서 일어나 계산대로 가며) 먼저 계산할게!",
        element: "목",
        risk: "LOW",
        affinityDelta: 8,
        reaction: (name) => `"어! 야— (쫓아오며) 진짜 빠르다. 고마워, 다음엔 꼭."`,
      },
    ],
  },
  {
    id: "flirt",
    type: "방해자의 등장",
    backgroundEmoji: "🚶‍♂️💔",
    situationDescription: "모든 것이 완벽한 데이트 중, 갑자기 낯선 사람이 다가와 상대방에게 번호를 요청한다.",
    npcDialogue: (name) => `"(당황한 눈빛으로 ${name}을 바라보며) 어떡하지…?"`,
    choices: [
      {
        id: "c1",
        text: "(자연스럽게 상대방 곁에 서며) 죄송한데, 우리 데이트 중이에요.",
        element: "금",
        risk: "LOW",
        affinityDelta: 11,
        reaction: (name) => `"(낯선 사람이 떠난 뒤 웃으며) 고마워. 그 말 해줄 것 같았어— ${name} 믿음직해."`,
      },
      {
        id: "c2",
        text: "(손을 살짝 잡으며) 우리 가자.",
        element: "화",
        risk: "LOW",
        affinityDelta: 12,
        reaction: (name) => `"(잠깐 굳다가 미소 지으며) …그래. 어디 가?"`,
      },
      {
        id: "c3",
        text: "(상대방에게 소곤소곤) 네가 알아서 해도 돼. 나 괜찮아.",
        element: "수",
        risk: "MEDIUM",
        affinityDelta: -1,
        reaction: (name) => `"…괜찮은 거야? 솔직히 조금은 아쉬웠는데. (작게 웃으며) 그냥 봐주는 건가."`,
      },
    ],
  },
  {
    id: "ex",
    type: "과거의 그림자",
    backgroundEmoji: "😬👤",
    situationDescription: "당신과의 산책 도중, 상대방이 갑자기 굳는다. 시선을 따라가 보니 낯선 사람—아마도 전 연인인 것 같다.",
    npcDialogue: (name) => `"(작은 목소리로) 어…저기 잠깐. 미안, ${name} 잠깐 기다려줄 수 있어?"`,
    choices: [
      {
        id: "c1",
        text: "(부드럽게) 괜찮아. 나 여기 있을게.",
        element: "토",
        risk: "LOW",
        affinityDelta: 8,
        reaction: (name) => `"(잠깐 대화 후 돌아오며) 고마워. 기다려줘서. 뭔가 ${name}이 있어서 더 편하게 말할 수 있었어."`,
      },
      {
        id: "c2",
        text: "(아무 말 없이 자연스럽게 옆에 서 있는다)",
        element: "수",
        risk: "LOW",
        affinityDelta: 9,
        reaction: (name) => `"(짧게 눈을 맞추며) 아무것도 묻지 않아줘서 고마워. 이야기하고 싶을 때 할게."`,
      },
      {
        id: "c3",
        text: "괜찮아? 얼굴이 좀 굳었는데. 걱정되네.",
        element: "목",
        risk: "LOW",
        affinityDelta: 7,
        reaction: (name) => `"(고마운 듯 작게 웃으며) 응, 괜찮아. 그냥 잠깐 이상했어. ${name} 덕분에 괜찮아졌어."`,
      },
    ],
  },
];
