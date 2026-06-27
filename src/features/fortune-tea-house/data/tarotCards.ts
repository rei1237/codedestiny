export type TarotOrientation = "upright" | "reversed";

export type TarotMeaning = {
  keywords: string[];
  meaning: string;
};

export type TeaHouseTarotCard = {
  id: string;
  number: number;
  nameEn: string;
  nameKo: string;
  upright: TarotMeaning;
  reversed: TarotMeaning;
  topicHints: string[];
};

export const majorArcanaCards: TeaHouseTarotCard[] = [
  {
    id: "major_00_fool",
    number: 0,
    nameEn: "The Fool",
    nameKo: "바보",
    upright: {
      keywords: ["새 출발", "순수함", "모험", "가능성"],
      meaning: "아직 모든 답이 정해지지 않았고, 마음이 새로운 길 앞에서 가볍게 숨을 고르는 흐름입니다.",
    },
    reversed: {
      keywords: ["성급함", "준비 부족", "현실 점검", "불안정"],
      meaning: "시작의 기운은 있으나 마음이 앞서갈 수 있어, 작은 확인과 현실적인 준비가 필요합니다.",
    },
    topicHints: ["시작", "선택", "관계의 첫걸음", "이직"],
  },
  {
    id: "major_01_magician",
    number: 1,
    nameEn: "The Magician",
    nameKo: "마법사",
    upright: {
      keywords: ["의지", "실행력", "재능", "표현"],
      meaning: "이미 손안에 있는 자원과 말의 힘이 깨어나며, 생각을 현실로 옮길 수 있는 때입니다.",
    },
    reversed: {
      keywords: ["흩어진 의지", "과장", "기회 낭비", "불신"],
      meaning: "능력은 있지만 방향이 흩어지기 쉬워, 말과 행동의 결을 맞추는 일이 먼저입니다.",
    },
    topicHints: ["고백", "설득", "일의 시작", "능력 발휘"],
  },
  {
    id: "major_02_high_priestess",
    number: 2,
    nameEn: "The High Priestess",
    nameKo: "여사제",
    upright: {
      keywords: ["직감", "비밀", "침묵", "내면"],
      meaning: "겉으로 드러난 말보다 조용한 직감과 아직 밝혀지지 않은 마음의 층이 중요하게 떠오릅니다.",
    },
    reversed: {
      keywords: ["혼란", "억눌린 감정", "비밀 노출", "불신"],
      meaning: "느낌은 강하지만 확인되지 않은 추측이 섞일 수 있으니, 마음의 소리와 사실을 나누어 볼 필요가 있습니다.",
    },
    topicHints: ["속마음", "기다림", "비밀 관계", "직감"],
  },
  {
    id: "major_03_empress",
    number: 3,
    nameEn: "The Empress",
    nameKo: "여황제",
    upright: {
      keywords: ["풍요", "애정", "돌봄", "성장"],
      meaning: "따뜻한 정성과 관계를 키우는 힘이 살아나며, 마음이 조금씩 안정과 풍요를 회복합니다.",
    },
    reversed: {
      keywords: ["과한 기대", "의존", "감정 과잉", "정체"],
      meaning: "돌보고 싶은 마음이 커질수록 스스로를 잊기 쉬워, 애정의 균형을 다시 잡아야 합니다.",
    },
    topicHints: ["연애", "회복", "가족", "창작"],
  },
  {
    id: "major_04_emperor",
    number: 4,
    nameEn: "The Emperor",
    nameKo: "황제",
    upright: {
      keywords: ["질서", "책임", "안정", "기준"],
      meaning: "감정이 흔들릴수록 분명한 기준과 책임 있는 선택이 상황을 안정시키는 흐름입니다.",
    },
    reversed: {
      keywords: ["경직", "통제", "압박", "고집"],
      meaning: "강하게 붙잡는 마음이 오히려 숨통을 좁힐 수 있어, 기준은 세우되 여지를 남겨야 합니다.",
    },
    topicHints: ["직장", "관계의 기준", "책임", "장기 계획"],
  },
  {
    id: "major_05_hierophant",
    number: 5,
    nameEn: "The Hierophant",
    nameKo: "교황",
    upright: {
      keywords: ["조언", "전통", "신뢰", "가르침"],
      meaning: "혼자 판단하기보다 믿을 만한 조언과 오래된 기준이 길을 정리해 주는 때입니다.",
    },
    reversed: {
      keywords: ["낡은 규칙", "시선 의식", "답답함", "독자성"],
      meaning: "남들이 옳다고 하는 틀 안에 마음을 억지로 맞추면, 본심이 더 멀어질 수 있습니다.",
    },
    topicHints: ["상담", "결혼", "규칙", "스승"],
  },
  {
    id: "major_06_lovers",
    number: 6,
    nameEn: "The Lovers",
    nameKo: "연인",
    upright: {
      keywords: ["끌림", "선택", "조화", "관계"],
      meaning: "마음이 끌리는 방향과 실제 선택이 만나는 지점에서 중요한 관계의 결이 드러납니다.",
    },
    reversed: {
      keywords: ["엇갈림", "우유부단", "불균형", "가치 충돌"],
      meaning: "좋아하는 마음만으로는 해결되지 않는 차이가 있어, 서로의 기준을 더 솔직히 보아야 합니다.",
    },
    topicHints: ["연애", "고백", "관계 선택", "협업"],
  },
  {
    id: "major_07_chariot",
    number: 7,
    nameEn: "The Chariot",
    nameKo: "전차",
    upright: {
      keywords: ["전진", "의지", "승부", "돌파"],
      meaning: "망설임을 오래 두기보다 방향을 정하고 움직일 때 상황이 빠르게 열리는 흐름입니다.",
    },
    reversed: {
      keywords: ["무리한 추진", "방향 상실", "충돌", "조급함"],
      meaning: "속도를 내고 싶은 마음이 커도 방향이 흐리면 부딪힘이 생기니, 먼저 핸들을 바로잡아야 합니다.",
    },
    topicHints: ["승부", "이동", "시험", "목표"],
  },
  {
    id: "major_08_strength",
    number: 8,
    nameEn: "Strength",
    nameKo: "힘",
    upright: {
      keywords: ["인내", "용기", "부드러운 힘", "회복"],
      meaning: "강하게 밀어붙이기보다 부드럽게 버티는 힘이 마음과 상황을 함께 안정시킵니다.",
    },
    reversed: {
      keywords: ["자신감 저하", "불안", "감정 소모", "회피"],
      meaning: "버티느라 지친 마음이 먼저 보이니, 스스로를 다그치기보다 힘을 회복할 시간이 필요합니다.",
    },
    topicHints: ["회복", "자존감", "관계 인내", "스트레스"],
  },
  {
    id: "major_09_hermit",
    number: 9,
    nameEn: "The Hermit",
    nameKo: "은둔자",
    upright: {
      keywords: ["성찰", "거리두기", "지혜", "내면 탐색"],
      meaning: "잠시 한 걸음 물러나 조용히 바라볼 때, 마음속에서 오래 기다린 답이 모습을 드러냅니다.",
    },
    reversed: {
      keywords: ["고립", "외로움", "과한 분석", "닫힌 마음"],
      meaning: "혼자 생각하는 시간이 깊어질수록 고립으로 흐를 수 있어, 믿을 만한 연결을 조금 열어야 합니다.",
    },
    topicHints: ["거리두기", "진로", "혼자만의 시간", "재정비"],
  },
  {
    id: "major_10_wheel_of_fortune",
    number: 10,
    nameEn: "Wheel of Fortune",
    nameKo: "운명의 수레바퀴",
    upright: {
      keywords: ["전환점", "기회", "흐름", "변화"],
      meaning: "멈춰 있던 흐름이 움직이며, 예상하지 못한 계기가 운명의 방향을 살짝 틀어 줍니다.",
    },
    reversed: {
      keywords: ["흐름 지연", "반복", "타이밍 엇갈림", "수용"],
      meaning: "변화는 다가오고 있지만 아직 타이밍이 무르익지 않아, 반복되는 패턴을 먼저 읽어야 합니다.",
    },
    topicHints: ["운의 변화", "재회", "기회", "타이밍"],
  },
  {
    id: "major_11_justice",
    number: 11,
    nameEn: "Justice",
    nameKo: "정의",
    upright: {
      keywords: ["균형", "공정함", "판단", "책임"],
      meaning: "감정과 사실을 같은 저울에 올려놓을 때, 지금 필요한 선택의 기준이 선명해집니다.",
    },
    reversed: {
      keywords: ["불균형", "억울함", "편향", "회피한 책임"],
      meaning: "어느 한쪽으로 마음이 기울어져 판단이 흐릴 수 있으니, 사실을 차분히 다시 정리해야 합니다.",
    },
    topicHints: ["결정", "계약", "관계 정리", "공정성"],
  },
  {
    id: "major_12_hanged_man",
    number: 12,
    nameEn: "The Hanged Man",
    nameKo: "매달린 사람",
    upright: {
      keywords: ["멈춤", "관점 전환", "기다림", "내려놓음"],
      meaning: "지금의 지연은 벌이 아니라 시야를 바꾸라는 신호이며, 내려놓을수록 길이 보입니다.",
    },
    reversed: {
      keywords: ["헛된 희생", "고집", "정체", "답답함"],
      meaning: "기다림이 의미 있는 성찰이 아니라 소모로 흐르고 있다면, 붙잡은 이유를 다시 물어야 합니다.",
    },
    topicHints: ["기다림", "관계 정체", "시점 변경", "희생"],
  },
  {
    id: "major_13_death",
    number: 13,
    nameEn: "Death",
    nameKo: "죽음",
    upright: {
      keywords: ["마침", "변화", "재생", "정리"],
      meaning: "끝나는 흐름이 두려워 보여도, 낡은 껍질을 벗은 뒤 새 질서가 열리는 전환입니다.",
    },
    reversed: {
      keywords: ["미련", "변화 저항", "지연된 정리", "붙잡음"],
      meaning: "이미 변해야 할 것을 마음이 붙잡고 있어, 정리를 미룰수록 아픔이 길어질 수 있습니다.",
    },
    topicHints: ["이별", "전환", "새 시작 전 정리", "습관 변화"],
  },
  {
    id: "major_14_temperance",
    number: 14,
    nameEn: "Temperance",
    nameKo: "절제",
    upright: {
      keywords: ["조율", "균형", "치유", "천천히 흐름"],
      meaning: "서두르지 않는 조율이 가장 큰 힘이 되며, 마음과 현실이 천천히 같은 온도를 찾습니다.",
    },
    reversed: {
      keywords: ["불균형", "조급함", "과잉", "어긋난 리듬"],
      meaning: "마음의 온도가 너무 높거나 낮아져 있어, 속도를 낮추고 리듬을 다시 맞추어야 합니다.",
    },
    topicHints: ["화해", "회복", "생활 균형", "장기 관계"],
  },
  {
    id: "major_15_devil",
    number: 15,
    nameEn: "The Devil",
    nameKo: "악마",
    upright: {
      keywords: ["집착", "유혹", "속박", "욕망"],
      meaning: "강하게 끌리는 마음 뒤에 묶임과 반복되는 습관이 숨어 있어, 무엇이 나를 붙드는지 보아야 합니다.",
    },
    reversed: {
      keywords: ["해방", "패턴 인식", "관계 정리", "회복 의지"],
      meaning: "묶여 있던 패턴을 알아차리며 조금씩 벗어날 수 있는 힘이 생깁니다.",
    },
    topicHints: ["집착", "중독적 관계", "유혹", "경계선"],
  },
  {
    id: "major_16_tower",
    number: 16,
    nameEn: "The Tower",
    nameKo: "탑",
    upright: {
      keywords: ["급변", "충격", "무너짐", "진실"],
      meaning: "흔들림은 크지만 감춰졌던 진실이 드러나며, 더 이상 낡은 구조 위에 설 수 없음을 알립니다.",
    },
    reversed: {
      keywords: ["위기 회피", "내부 균열", "늦어진 변화", "불안"],
      meaning: "큰 변화를 피하려 해도 안쪽 균열은 이미 보이니, 작은 정비부터 시작해야 합니다.",
    },
    topicHints: ["돌발 상황", "관계 균열", "직장 변화", "진실 확인"],
  },
  {
    id: "major_17_star",
    number: 17,
    nameEn: "The Star",
    nameKo: "별",
    upright: {
      keywords: ["희망", "치유", "영감", "긴 호흡"],
      meaning: "당장 손에 잡히는 답보다 멀리서 비추는 희망이 중요하며, 마음이 천천히 회복됩니다.",
    },
    reversed: {
      keywords: ["실망", "희망 약화", "불신", "회복 지연"],
      meaning: "기대가 꺾여 마음이 어두워졌지만, 작은 회복의 불씨를 다시 살릴 수 있습니다.",
    },
    topicHints: ["희망", "회복", "꿈", "장거리 관계"],
  },
  {
    id: "major_18_moon",
    number: 18,
    nameEn: "The Moon",
    nameKo: "달",
    upright: {
      keywords: ["불확실성", "무의식", "환상", "감정의 물결"],
      meaning: "분명히 보이지 않는 마음의 안개가 짙어져 있어, 서둘러 결론 내리기보다 감정의 물결을 읽어야 합니다.",
    },
    reversed: {
      keywords: ["안개 걷힘", "불안의 정체", "진실 접근", "감정 정리"],
      meaning: "흐릿했던 감정의 원인이 조금씩 드러나며, 착각과 직감을 구분할 수 있는 때입니다.",
    },
    topicHints: ["불안", "속마음", "꿈", "혼란"],
  },
  {
    id: "major_19_sun",
    number: 19,
    nameEn: "The Sun",
    nameKo: "태양",
    upright: {
      keywords: ["기쁨", "명확함", "성공", "회복"],
      meaning: "숨겨졌던 마음이 밝게 드러나고, 관계와 상황에 따뜻한 확신이 비칩니다.",
    },
    reversed: {
      keywords: ["지연된 기쁨", "자신감 흔들림", "기대 조정", "작은 회복"],
      meaning: "밝은 흐름은 있으나 완전히 드러나기 전이라, 기대를 조정하며 작은 성취를 쌓아야 합니다.",
    },
    topicHints: ["성공", "화해", "기쁨", "긍정적 결과"],
  },
  {
    id: "major_20_judgement",
    number: 20,
    nameEn: "Judgement",
    nameKo: "심판",
    upright: {
      keywords: ["깨달음", "부름", "재평가", "결단"],
      meaning: "마음 깊은 곳의 부름이 다시 들리며, 지나온 일을 새 기준으로 바라보게 됩니다.",
    },
    reversed: {
      keywords: ["자책", "결단 지연", "부름 회피", "미해결"],
      meaning: "이미 알고 있는 결정을 미루고 있을 수 있어, 자책보다 현실적인 한 걸음이 필요합니다.",
    },
    topicHints: ["재회", "진로 결단", "과거 정리", "새 판단"],
  },
  {
    id: "major_21_world",
    number: 21,
    nameEn: "The World",
    nameKo: "세계",
    upright: {
      keywords: ["완성", "통합", "성취", "다음 장"],
      meaning: "하나의 흐름이 완성되고, 지금까지의 경험이 다음 문을 여는 힘으로 통합됩니다.",
    },
    reversed: {
      keywords: ["마무리 지연", "미완성", "반복되는 마지막", "정리 필요"],
      meaning: "거의 끝에 와 있지만 작은 미완이 남아 있어, 마지막 정리를 해야 다음 장이 열립니다.",
    },
    topicHints: ["완성", "졸업", "관계 결론", "장기 목표"],
  },
];

export function getTarotCardById(cardId: string) {
  return majorArcanaCards.find((card) => card.id === cardId);
}

export function hashTeaHouseSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function drawMajorArcana(seed: string) {
  return majorArcanaCards[hashTeaHouseSeed(seed) % majorArcanaCards.length];
}

export function drawTarotOrientation(seed: string): TarotOrientation {
  return hashTeaHouseSeed(`${seed}:orientation`) % 2 === 0 ? "upright" : "reversed";
}
