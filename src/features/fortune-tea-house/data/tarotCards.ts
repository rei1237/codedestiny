export type TarotOrientation = "upright" | "reversed";

export type TarotMeaning = {
  keywords: string[];
  meaning: string;
};

export type TarotCounselProfile = {
  cardId: string;
  nameKr: string;
  nameEn: string;
  arcana: "major" | "minor";
  suit: "major" | "wands" | "cups" | "swords" | "pentacles";
  number: number;
  orientation: TarotOrientation;
  coreSymbol: string;
  uprightMeaning: string;
  reversedMeaning: string;
  loveMeaning: string;
  reunionMeaning: string;
  relationshipShadow: string;
  emotionalPattern: string;
  advice: string;
  avoidAction: string;
  timingNuance: string;
  yesNoNuance: string;
  yeoniMetaphor: string;
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
  return tarotDeckCards.find((card) => card.id === cardId);
}

type MinorSuit = "wands" | "cups" | "swords" | "pentacles";

const minorSuitMeta: Record<MinorSuit, {
  ko: string;
  en: string;
  core: string;
  upright: string;
  reversed: string;
  hints: string[];
}> = {
  wands: {
    ko: "완드",
    en: "Wands",
    core: "욕망, 추진력, 행동으로 옮기려는 불꽃",
    upright: "마음의 불씨가 행동으로 이어지고, 관계나 선택에 직접 움직임이 생기는 흐름입니다.",
    reversed: "열정은 있으나 방향이나 속도가 어긋나기 쉬워, 충동을 낮추고 목적을 다시 잡아야 합니다.",
    hints: ["행동", "열정", "추진", "시작"],
  },
  cups: {
    ko: "컵",
    en: "Cups",
    core: "감정, 애착, 친밀함, 마음이 오가는 물결",
    upright: "감정의 교류와 정서적 연결이 살아나며, 마음의 온도를 부드럽게 확인하는 흐름입니다.",
    reversed: "감정이 고이거나 넘쳐서 오해와 의존으로 흐를 수 있어, 마음의 물길을 정리해야 합니다.",
    hints: ["감정", "연애", "친밀감", "회복"],
  },
  swords: {
    ko: "검",
    en: "Swords",
    core: "생각, 말, 판단, 상처를 가르는 날카로운 공기",
    upright: "사실 확인과 솔직한 판단이 필요하며, 말과 생각이 관계의 방향을 크게 바꾸는 흐름입니다.",
    reversed: "생각이 과열되거나 말이 상처로 남기 쉬워, 결론보다 회복 가능한 표현을 먼저 골라야 합니다.",
    hints: ["생각", "대화", "갈등", "판단"],
  },
  pentacles: {
    ko: "펜타클",
    en: "Pentacles",
    core: "현실성, 시간, 안정, 손에 잡히는 조건",
    upright: "관계나 선택이 현실 조건 위에서 천천히 자리를 잡아가는 흐름입니다.",
    reversed: "현실의 부담, 시간 지연, 기대와 실제 조건의 차이를 점검해야 하는 흐름입니다.",
    hints: ["현실", "안정", "시간", "지속"],
  },
};

const minorRanks = [
  { number: 1, ko: "에이스", en: "Ace", core: "새 씨앗", upright: "시작의 가능성이 막 생기며 아직 작지만 분명한 신호가 올라옵니다.", reversed: "시작은 보이지만 마음이나 현실의 준비가 충분하지 않아 성급함을 조심해야 합니다." },
  { number: 2, ko: "2", en: "Two", core: "마주 봄과 균형", upright: "둘 사이의 균형, 교환, 첫 합의가 중요한 장면입니다.", reversed: "균형이 어긋나거나 서로 다른 속도가 드러나 조율이 필요합니다." },
  { number: 3, ko: "3", en: "Three", core: "확장과 드러남", upright: "감정이나 상황이 밖으로 드러나며 다음 단계로 번지는 장면입니다.", reversed: "드러난 일이 부담이나 오해로 번질 수 있어 정리가 필요합니다." },
  { number: 4, ko: "4", en: "Four", core: "안정과 정체", upright: "잠시 멈춰 안정과 기준을 다시 세우는 장면입니다.", reversed: "정체가 길어져 마음이 닫히거나 기회가 막히지 않게 환기가 필요합니다." },
  { number: 5, ko: "5", en: "Five", core: "갈등과 결핍", upright: "부딪힘과 결핍이 드러나며 무엇을 잃었는지 보게 됩니다.", reversed: "상처 이후 회복의 실마리가 보이지만 같은 갈등을 반복하지 않아야 합니다." },
  { number: 6, ko: "6", en: "Six", core: "회복과 주고받음", upright: "관계의 온기를 회복하거나 도움을 주고받는 흐름입니다.", reversed: "한쪽으로 기울어진 주고받음이 부담으로 남을 수 있습니다." },
  { number: 7, ko: "7", en: "Seven", core: "선택과 점검", upright: "여러 가능성 사이에서 신중한 판단과 점검이 필요합니다.", reversed: "망설임이 길어지거나 환상이 섞여 선택 기준이 흐려질 수 있습니다." },
  { number: 8, ko: "8", en: "Eight", core: "이동과 반복", upright: "익숙한 자리를 떠나거나 반복을 끊으려는 움직임이 생깁니다.", reversed: "떠나야 할지 남아야 할지 마음이 오래 머물러 결정이 지연됩니다." },
  { number: 9, ko: "9", en: "Nine", core: "축적과 내면", upright: "지금까지 쌓인 마음이나 성과를 혼자 점검하는 장면입니다.", reversed: "혼자 견디는 시간이 길어져 불안이나 고립이 커질 수 있습니다." },
  { number: 10, ko: "10", en: "Ten", core: "완성 직전의 무게", upright: "한 흐름이 끝에 닿으며 성취나 부담이 크게 느껴집니다.", reversed: "마무리를 미루거나 부담을 혼자 떠안지 않도록 덜어내야 합니다." },
  { number: 11, ko: "페이지", en: "Page", core: "서툰 신호", upright: "아직 서툴지만 새로운 메시지와 배움의 신호가 들어옵니다.", reversed: "미숙한 표현이나 불안정한 태도가 오해를 부를 수 있습니다." },
  { number: 12, ko: "나이트", en: "Knight", core: "움직이는 마음", upright: "상황이 움직이고 감정이나 행동이 방향을 잡기 시작합니다.", reversed: "속도와 목적이 어긋나면 충돌이나 공회전이 생길 수 있습니다." },
  { number: 13, ko: "퀸", en: "Queen", core: "성숙한 수용", upright: "마음을 품고 다루는 성숙한 태도가 흐름을 부드럽게 만듭니다.", reversed: "감정을 품는 힘이 과해져 의존이나 방어로 흐르지 않게 해야 합니다." },
  { number: 14, ko: "킹", en: "King", core: "책임 있는 통제", upright: "상황을 책임 있게 다루고 기준을 세우는 힘이 중요합니다.", reversed: "통제와 고집이 강해지면 관계나 선택의 숨통이 좁아질 수 있습니다." },
];

function buildMinorArcanaCards() {
  return (Object.entries(minorSuitMeta) as Array<[MinorSuit, typeof minorSuitMeta[MinorSuit]]>).flatMap(([suit, meta]) =>
    minorRanks.map((rank) => ({
      id: `minor_${suit}_${String(rank.number).padStart(2, "0")}`,
      number: rank.number,
      nameEn: `${rank.en} of ${meta.en}`,
      nameKo: `${meta.ko} ${rank.ko}`,
      upright: {
        keywords: [meta.ko, rank.core, "현실 점검", "관계 흐름"],
        meaning: `${meta.upright} ${rank.upright}`,
      },
      reversed: {
        keywords: [meta.ko, rank.core, "속도 조절", "패턴 정리"],
        meaning: `${meta.reversed} ${rank.reversed}`,
      },
      topicHints: meta.hints,
    })),
  );
}

export const minorArcanaCards: TeaHouseTarotCard[] = buildMinorArcanaCards();

export const tarotDeckCards: TeaHouseTarotCard[] = [...majorArcanaCards, ...minorArcanaCards];

const tarotCounselProfiles: Record<string, Omit<TarotCounselProfile, "cardId" | "nameKr" | "nameEn" | "arcana" | "suit" | "number" | "orientation" | "uprightMeaning" | "reversedMeaning">> = {
  major_00_fool: {
    coreSymbol: "문턱 앞에 선 첫 걸음, 아직 이름 붙지 않은 가능성",
    loveMeaning: "연애에서는 순수한 끌림과 새로운 시작의 설렘을 비추지만, 아직 관계의 책임과 약속은 충분히 검증되지 않았습니다.",
    reunionMeaning: "재회에서는 다시 시작할 틈은 있으나 예전 문제를 덮은 채 뛰어들면 같은 실수가 반복될 수 있습니다.",
    relationshipShadow: "가벼운 마음이 상대에게는 불안정함으로 보일 수 있습니다.",
    emotionalPattern: "두려움보다 기대가 앞서고, 확인보다 상상으로 먼저 뛰어가는 흐름입니다.",
    advice: "움직이되, 한 번에 관계의 이름을 정하려 하지 말고 상대가 받아들일 수 있는 작은 신호부터 확인하세요.",
    avoidAction: "즉흥적인 고백, 밤늦은 충동 연락, 책임 없는 약속을 피하세요.",
    timingNuance: "빠르게 열릴 수 있지만 오래 가려면 첫 속도를 낮춰야 합니다.",
    yesNoNuance: "가능성은 열려 있으나 조건 확인이 먼저입니다.",
    yeoniMetaphor: "찻잔 가장자리에서 작은 발자국이 반짝이는 카드예요.",
  },
  major_01_magician: {
    coreSymbol: "말과 의지가 현실을 움직이기 시작하는 손",
    loveMeaning: "연애에서는 표현력과 매력이 살아나지만, 말이 너무 능숙하면 진심보다 설득으로 보일 수 있습니다.",
    reunionMeaning: "재회에서는 연락을 열 수 있는 카드지만, 감정 호소보다 정리된 한 문장이 더 힘을 냅니다.",
    relationshipShadow: "상대를 움직이려는 의도가 강해지면 신뢰가 얇아집니다.",
    emotionalPattern: "답을 기다리기보다 내가 상황을 바꾸고 싶어지는 흐름입니다.",
    advice: "보낼 말이 있다면 짧고 분명하게, 원하는 결론보다 확인하고 싶은 사실 하나만 남기세요.",
    avoidAction: "과장된 약속, 상대 반응을 유도하는 말, 여러 메시지를 이어 보내는 행동을 피하세요.",
    timingNuance: "준비된 말이 있을 때 움직이면 좋고, 감정이 뜨거울 때는 하루 늦추는 편이 낫습니다.",
    yesNoNuance: "실행 가능성은 있으나 말의 진정성이 관건입니다.",
    yeoniMetaphor: "연이가 찻숟가락으로 향을 한 방향으로 모으는 장면처럼 보여요.",
  },
  major_02_high_priestess: {
    coreSymbol: "말해지지 않은 마음과 침묵 속의 직감",
    loveMeaning: "연애에서는 속마음과 미묘한 신호가 중요하지만, 확인되지 않은 추측을 사실처럼 믿으면 흔들립니다.",
    reunionMeaning: "재회에서는 지금 당장 밀어붙이기보다 침묵의 이유와 실제 거리감을 읽어야 합니다.",
    relationshipShadow: "묻지 못한 말이 쌓이면 오해가 자기 안에서 커질 수 있습니다.",
    emotionalPattern: "감이 강하게 올라오지만 그 감이 불안과 섞여 있습니다.",
    advice: "상대의 침묵을 해석하기 전에 실제로 확인된 말과 행동만 따로 적어보세요.",
    avoidAction: "떠보기, SNS 단서 해석, 상대 마음 단정을 피하세요.",
    timingNuance: "지금은 즉시 행동보다 관찰과 정리가 힘을 갖는 시간입니다.",
    yesNoNuance: "아직 답이 숨겨져 있어 판단 유보에 가깝습니다.",
    yeoniMetaphor: "찻잔 밑바닥에 달빛이 조용히 가라앉아 있는 카드예요.",
  },
  major_03_empress: {
    coreSymbol: "돌봄, 애정, 관계를 자라게 하는 온기",
    loveMeaning: "연애에서는 다정함과 매력이 살아나지만, 돌봄이 과해지면 상대의 몫까지 떠안을 수 있습니다.",
    reunionMeaning: "재회에서는 부드러운 회복 가능성이 있으나, 상처를 사랑만으로 덮으려 하면 다시 지칩니다.",
    relationshipShadow: "주는 마음이 커질수록 받지 못한 마음도 크게 느껴집니다.",
    emotionalPattern: "상대를 이해하고 싶지만 동시에 인정받고 싶은 욕구가 강합니다.",
    advice: "따뜻함은 남기되, 내가 먼저 소진되는 방식의 배려는 멈추세요.",
    avoidAction: "상대의 무응답까지 이해하려 애쓰며 계속 챙기는 행동을 피하세요.",
    timingNuance: "관계가 자라려면 시간이 필요하고, 즉시 결론보다 분위기 회복이 먼저입니다.",
    yesNoNuance: "회복 가능성은 있으나 상호성이 확인되어야 합니다.",
    yeoniMetaphor: "연꽃잎 위에 따뜻한 꿀 한 방울이 맺힌 카드예요.",
  },
  major_04_emperor: {
    coreSymbol: "경계, 책임, 흔들리는 감정을 세우는 기둥",
    loveMeaning: "연애에서는 안정과 책임을 묻지만, 기준이 너무 딱딱하면 마음의 숨구멍이 막힙니다.",
    reunionMeaning: "재회에서는 감정보다 새 규칙과 약속이 있어야 가능성이 열립니다.",
    relationshipShadow: "통제하려는 태도와 자존심 싸움이 관계를 차갑게 만들 수 있습니다.",
    emotionalPattern: "흔들리는 마음을 감추려고 더 단단한 척하는 흐름입니다.",
    advice: "관계를 다시 보려면 감정 표현보다 지킬 수 있는 기준 하나를 먼저 세우세요.",
    avoidAction: "상대에게 결론을 요구하거나, 옳고 그름으로 몰아붙이는 말을 피하세요.",
    timingNuance: "감정이 식은 뒤 현실 조건을 확인할 때 움직이는 편이 좋습니다.",
    yesNoNuance: "조건이 정리되면 가능, 기준이 없으면 어렵습니다.",
    yeoniMetaphor: "찻집 문 앞에 작은 표지판을 세우는 카드예요.",
  },
  major_05_hierophant: {
    coreSymbol: "관계가 기대는 신뢰, 규칙, 오래된 약속",
    loveMeaning: "연애에서는 진지한 관계와 신뢰를 말하지만, 남들의 기준을 그대로 가져오면 답답해질 수 있습니다.",
    reunionMeaning: "재회에서는 둘만의 약속과 관계 정의가 새로 세워질 때 가능성이 생깁니다.",
    relationshipShadow: "주변 시선, 관습, 책임감 때문에 마음이 늦어질 수 있습니다.",
    emotionalPattern: "혼자 결정하기보다 맞는 답을 찾고 싶어지는 흐름입니다.",
    advice: "믿을 수 있는 조언은 참고하되, 두 사람의 실제 약속으로 번역하세요.",
    avoidAction: "친구 말이나 통념을 근거로 상대를 판단하는 행동을 피하세요.",
    timingNuance: "서두른 고백보다 신뢰를 쌓는 반복 행동이 유리합니다.",
    yesNoNuance: "진지한 의지가 확인되면 긍정적입니다.",
    yeoniMetaphor: "찻잔 옆에 오래된 상담 노트가 펼쳐지는 카드예요.",
  },
  major_06_lovers: {
    coreSymbol: "끌림과 선택이 같은 자리에서 마주 서는 순간",
    loveMeaning: "연애에서는 강한 호감과 상호 선택의 가능성을 비추지만, 설렘만으로 관계가 완성되지는 않습니다.",
    reunionMeaning: "재회에서는 두 사람이 같은 선택을 다시 할 의지가 있을 때만 문이 열립니다.",
    relationshipShadow: "마음은 끌리는데 가치관이나 현실 조건이 엇갈릴 수 있습니다.",
    emotionalPattern: "기대가 올라오며 상대 반응 하나에 마음이 크게 흔들립니다.",
    advice: "상대의 선택권을 남겨 둔 채, 내가 원하는 관계의 형태를 부드럽게 확인하세요.",
    avoidAction: "호감 확인을 강요하거나 질투를 시험하는 행동을 피하세요.",
    timingNuance: "서로의 호흡이 맞으면 빠르게 가까워지지만, 한쪽만 뜨거우면 균형이 깨집니다.",
    yesNoNuance: "서로 선택할 여지가 있을 때 긍정적입니다.",
    yeoniMetaphor: "두 찻잔의 향이 한 번 겹쳤다가 다시 각자의 온도를 찾는 카드예요.",
  },
  major_07_chariot: {
    coreSymbol: "방향을 잡고 앞으로 나아가는 의지",
    loveMeaning: "연애에서는 적극성이 관계를 움직이지만, 속도가 상대보다 빠르면 압박으로 느껴질 수 있습니다.",
    reunionMeaning: "재회에서는 먼저 움직일 수 있으나, 목표가 재회 자체인지 건강한 재시작인지 구분해야 합니다.",
    relationshipShadow: "이기고 싶은 마음이 이해하고 싶은 마음을 앞지를 수 있습니다.",
    emotionalPattern: "멈춰 있으면 불안해져 행동으로 답을 얻고 싶어집니다.",
    advice: "움직일 거라면 목적을 하나로 줄이고, 상대가 멈추라는 신호를 보이면 즉시 속도를 낮추세요.",
    avoidAction: "연속 연락, 갑작스러운 방문, 답을 몰아붙이는 행동을 피하세요.",
    timingNuance: "방향이 명확할 때 빠르게 열리고, 방향이 흐리면 충돌합니다.",
    yesNoNuance: "준비된 행동이면 가능, 조급함이면 위험합니다.",
    yeoniMetaphor: "찻잔 위 작은 마차가 달리기 전에 고삐를 다시 잡는 카드예요.",
  },
  major_08_strength: {
    coreSymbol: "강한 감정을 부드럽게 다루는 인내와 용기",
    loveMeaning: "연애에서는 다정한 인내와 회복력을 비추며, 상대를 이기기보다 관계의 긴장을 낮추는 힘이 중요합니다.",
    reunionMeaning: "재회에서는 가능성을 억지로 당기기보다 상대의 경계와 내 감정의 속도를 함께 존중할 때 열립니다.",
    relationshipShadow: "버티는 마음이 길어지면 혼자만 애쓰는 관계가 될 수 있습니다.",
    emotionalPattern: "좋아하는 마음을 참아내며 품위를 지키려 하지만 속으로는 답답함이 쌓입니다.",
    advice: "연락보다 먼저 감정의 톤을 낮추고, 상대가 부담 없이 반응할 수 있는 여지를 남기세요.",
    avoidAction: "참다가 한 번에 터뜨리는 장문 메시지와 서운함 폭발을 피하세요.",
    timingNuance: "천천히 안정될 때 강하고, 급히 밀면 힘이 약해집니다.",
    yesNoNuance: "부드러운 접근이라면 가능성이 남아 있습니다.",
    yeoniMetaphor: "꽃돼지가 킁 하고 향을 맡은 뒤, 찻잔을 두 손으로 꼭 잡아 주는 카드예요.",
  },
  major_09_hermit: {
    coreSymbol: "거리 속에서 진짜 마음을 찾는 등불",
    loveMeaning: "연애에서는 잠시 물러나야 보이는 진심이 있고, 혼자 있는 시간이 관계를 더 선명하게 만듭니다.",
    reunionMeaning: "재회에서는 즉각 연락보다 각자 생각할 공간이 필요합니다.",
    relationshipShadow: "거리두기가 회복이 아니라 회피나 고립으로 굳어질 수 있습니다.",
    emotionalPattern: "겉으로는 괜찮은 척하지만 마음속에서는 계속 같은 장면을 분석합니다.",
    advice: "상대에게 묻기 전에 내가 정말 확인하고 싶은 한 가지를 찾으세요.",
    avoidAction: "혼자 결론을 내리고 상대의 마음까지 단정하는 일을 피하세요.",
    timingNuance: "느린 카드입니다. 며칠의 침묵이 오히려 판단을 맑게 할 수 있습니다.",
    yesNoNuance: "지금은 보류, 성찰 뒤 재확인입니다.",
    yeoniMetaphor: "찻집 불이 하나만 남고, 그 빛이 마음 깊은 곳을 비추는 카드예요.",
  },
  major_10_wheel_of_fortune: {
    coreSymbol: "흐름이 바뀌는 계기와 타이밍",
    loveMeaning: "연애에서는 뜻밖의 연락이나 분위기 변화가 생길 수 있지만, 흐름을 붙잡으려 하면 어긋납니다.",
    reunionMeaning: "재회에서는 타이밍이 중요하며, 예전 패턴을 알아차릴 때 새 흐름이 열립니다.",
    relationshipShadow: "운의 변화에 기대어 내 책임을 미루면 같은 반복으로 돌아갈 수 있습니다.",
    emotionalPattern: "작은 계기 하나에 희망과 불안이 크게 오르내립니다.",
    advice: "우연이 오면 붙잡되, 오지 않는 흐름을 억지로 만들지는 마세요.",
    avoidAction: "상대 반응을 운명 신호로 과대해석하는 행동을 피하세요.",
    timingNuance: "타이밍 카드입니다. 지금보다 곧 바뀌는 흐름을 봐야 합니다.",
    yesNoNuance: "조건부 가능성이며 흐름을 읽어야 합니다.",
    yeoniMetaphor: "찻잔 속 달빛이 한 바퀴 돌아 다른 무늬를 만드는 카드예요.",
  },
  major_11_justice: {
    coreSymbol: "감정과 사실을 같은 저울에 올리는 판단",
    loveMeaning: "연애에서는 서로의 책임과 공정함을 묻고, 감정만으로 덮은 문제를 다시 보게 합니다.",
    reunionMeaning: "재회에서는 사과, 책임 인정, 실제 변화가 있어야 가능합니다.",
    relationshipShadow: "억울함과 계산이 커지면 대화가 재판처럼 변합니다.",
    emotionalPattern: "내가 받은 상처와 상대의 책임을 정확히 확인하고 싶어집니다.",
    advice: "연락 전 사실, 감정, 요청을 나누어 적고 한 가지 요청만 남기세요.",
    avoidAction: "잘잘못을 따지는 장문과 과거 증거를 한꺼번에 꺼내는 행동을 피하세요.",
    timingNuance: "감정이 가라앉은 뒤 말할수록 유리합니다.",
    yesNoNuance: "공정한 조건이 있을 때만 가능합니다.",
    yeoniMetaphor: "찻잔 옆 작은 저울이 달빛 아래 흔들림을 멈추는 카드예요.",
  },
  major_12_hanged_man: {
    coreSymbol: "멈춤 속에서 관점을 바꾸는 시간",
    loveMeaning: "연애에서는 기다림과 관점 전환이 필요하지만, 일방적 희생은 사랑이 아닙니다.",
    reunionMeaning: "재회에서는 지금 당장 움직일수록 꼬일 수 있어, 멈춤이 관계를 덜 다치게 합니다.",
    relationshipShadow: "기다림을 사랑의 증거로 삼으며 스스로를 묶을 수 있습니다.",
    emotionalPattern: "상대의 반응을 기다리느라 내 하루가 멈춘 듯 느껴집니다.",
    advice: "기다림의 기한을 정하고, 그 사이 내 생활의 리듬을 회복하세요.",
    avoidAction: "답 없는 기다림을 무기한 연장하거나 희생을 보상받으려는 말을 피하세요.",
    timingNuance: "느리고 보류가 강합니다. 서두를수록 답이 흐려집니다.",
    yesNoNuance: "지금은 아니며 관점 전환 뒤 다시 보아야 합니다.",
    yeoniMetaphor: "찻잎이 가라앉을 때까지 손대지 않는 카드예요.",
  },
  major_13_death: {
    coreSymbol: "끝나야 할 국면이 아직 끝나지 못한 문턱",
    loveMeaning: "연애에서는 예전 관계의 형태가 이미 변했고, 마음이 그 변화를 받아들이는 과정에 들어섰음을 비춥니다.",
    reunionMeaning: "재회 불가를 뜻하지는 않지만, 과거 방식 그대로 돌아가는 재회는 어렵습니다. 가능성이 있다면 새 규칙과 새 거리감으로 다시 시작해야 합니다.",
    relationshipShadow: "미련, 두려움, 정리 지연 때문에 익숙한 고통에 머무를 수 있습니다.",
    emotionalPattern: "끝났다고 말해도 마음은 문 앞에서 돌아서지 못하고 같은 장면을 되감습니다.",
    advice: "결론을 강요하지 말고, 연락한다면 감정 호소가 아닌 짧고 정리된 한 문장만 남기세요.",
    avoidAction: "장문 연락, 답 요구, 마지막 확인이라는 이름의 반복 연락, 상대의 침묵을 시험하는 행동을 피하세요.",
    timingNuance: "지금은 복원보다 정리와 변형의 시간입니다. 반응이 없다면 다시 밀지 말고 간격을 두어야 합니다.",
    yesNoNuance: "예전 모습으로는 닫히고, 새 기준이 생기면 아주 조심스럽게 열립니다.",
    yeoniMetaphor: "달빛 연꽃차 위에서 시든 꽃잎이 가라앉고 새 향이 천천히 올라오는 카드예요.",
  },
  major_14_temperance: {
    coreSymbol: "서로 다른 온도를 섞어 맞추는 조율",
    loveMeaning: "연애에서는 속도 조절과 회복이 핵심이며, 급한 결론보다 대화의 온도를 낮추는 일이 중요합니다.",
    reunionMeaning: "재회에서는 천천히 신뢰를 복구할 때 가능성이 열립니다.",
    relationshipShadow: "한쪽이 너무 맞춰 주면 조율이 아니라 소진이 됩니다.",
    emotionalPattern: "상처를 키우고 싶지 않아 조심하지만 속으로는 빨리 안정되고 싶습니다.",
    advice: "한 번에 해결하지 말고, 서로가 지킬 수 있는 작은 약속부터 맞추세요.",
    avoidAction: "급한 화해 요구와 감정의 온도가 높은 대화를 피하세요.",
    timingNuance: "느리지만 회복력이 있습니다. 며칠 단위로 보아야 합니다.",
    yesNoNuance: "천천히 조율하면 긍정적입니다.",
    yeoniMetaphor: "두 찻물을 한 방울씩 섞어 같은 온도를 찾는 카드예요.",
  },
  major_15_devil: {
    coreSymbol: "강한 끌림 뒤에 숨어 있는 묶임과 반복",
    loveMeaning: "연애에서는 끌림이 강하지만 관계가 건강한지, 집착과 욕망이 섞였는지 봐야 합니다.",
    reunionMeaning: "재회에서는 보고 싶은 마음과 같은 상처로 돌아가려는 습관을 구분해야 합니다.",
    relationshipShadow: "확인 강박, 질투, 소유욕, 끊지 못하는 반복이 관계를 묶습니다.",
    emotionalPattern: "상대가 나를 흔드는 힘이 커질수록 스스로의 기준이 약해집니다.",
    advice: "연락 전 이 행동이 사랑인지 불안을 낮추려는 확인인지 먼저 구분하세요.",
    avoidAction: "SNS 감시, 반복 결제식 확인, 상대 생활을 통제하려는 행동을 피하세요.",
    timingNuance: "즉시 움직이면 중독적 패턴이 강해질 수 있습니다.",
    yesNoNuance: "가능성보다 위험 신호 점검이 먼저입니다.",
    yeoniMetaphor: "달콤한 향 아래 끈적한 찻물이 남아 있는 카드예요.",
  },
  major_16_tower: {
    coreSymbol: "낡은 구조가 흔들리며 진실이 드러나는 순간",
    loveMeaning: "연애에서는 충격적 사실이나 갑작스러운 거리감이 드러날 수 있지만, 숨은 균열을 보게 하는 카드입니다.",
    reunionMeaning: "재회에서는 예전 구조가 무너진 이유를 인정하지 않으면 다시 세우기 어렵습니다.",
    relationshipShadow: "위기를 피하려고 덮어 둔 말이 더 크게 터질 수 있습니다.",
    emotionalPattern: "불안을 참다 갑작스럽게 폭발하거나 최악을 상상합니다.",
    advice: "급히 수습하려 하기보다 지금 드러난 사실을 먼저 받아들이세요.",
    avoidAction: "감정 폭발, 최후통첩, 상대를 몰아세우는 연락을 피하세요.",
    timingNuance: "급변의 카드라 당장 행동보다 안전한 거리 확보가 먼저입니다.",
    yesNoNuance: "현재 방식은 어렵고 구조 재정비가 필요합니다.",
    yeoniMetaphor: "찻잔이 흔들려 넘친 뒤에야 금 간 자리가 보이는 카드예요.",
  },
  major_17_star: {
    coreSymbol: "멀리서 천천히 회복을 비추는 희망",
    loveMeaning: "연애에서는 다정한 회복과 신뢰의 불씨를 비추지만, 당장 잡히는 확답은 약할 수 있습니다.",
    reunionMeaning: "재회에서는 긴 호흡으로 회복할 여지가 있으나 조급함이 희망을 흐립니다.",
    relationshipShadow: "이상화가 커지면 현실의 거리감을 못 볼 수 있습니다.",
    emotionalPattern: "상처가 있어도 좋은 가능성을 놓고 싶지 않은 마음입니다.",
    advice: "상대에게 기대를 전부 걸기보다 내 회복을 먼저 안정시키세요.",
    avoidAction: "희망적인 신호만 골라 보는 행동을 피하세요.",
    timingNuance: "느리지만 부드럽게 회복되는 흐름입니다.",
    yesNoNuance: "장기적으로는 열려 있으나 즉답은 약합니다.",
    yeoniMetaphor: "찻잔 속 별가루가 아주 천천히 가라앉는 카드예요.",
  },
  major_18_moon: {
    coreSymbol: "불확실한 감정의 안개와 무의식의 물결",
    loveMeaning: "연애에서는 마음의 안개가 짙어 상대의 신호를 그대로 보기 어렵습니다.",
    reunionMeaning: "재회에서는 가능성과 불안을 구분해야 하며, 확인되지 않은 상상으로 연락하면 위험합니다.",
    relationshipShadow: "불안, 의심, 환상, 밤에 커지는 생각이 관계 판단을 흐립니다.",
    emotionalPattern: "사실보다 감정의 파도가 먼저 올라와 결론을 재촉합니다.",
    advice: "오늘은 결론보다 근거를 모으세요. 낮에 다시 읽어도 같은 말만 남기세요.",
    avoidAction: "새벽 연락, 떠보기, 상대 마음을 단정하는 말을 피하세요.",
    timingNuance: "안개가 걷힌 뒤 움직여야 합니다.",
    yesNoNuance: "지금은 불확실하며 확인이 필요합니다.",
    yeoniMetaphor: "찻잔 위 달빛이 예쁘지만 바닥은 아직 흐린 카드예요.",
  },
  major_19_sun: {
    coreSymbol: "숨은 마음이 밝게 드러나는 따뜻한 확신",
    loveMeaning: "연애에서는 호감, 기쁨, 관계 회복의 밝은 신호를 비춥니다.",
    reunionMeaning: "재회에서는 솔직하고 밝은 대화가 가능성을 열 수 있습니다.",
    relationshipShadow: "좋은 분위기에 취해 현실 문제를 작게 볼 수 있습니다.",
    emotionalPattern: "기대가 선명해지고 마음이 앞으로 나아가고 싶어집니다.",
    advice: "밝고 짧은 표현은 좋지만, 관계의 무게까지 한 번에 올리지 마세요.",
    avoidAction: "좋은 신호 하나로 재회를 확정하거나 상대 부담을 키우는 말을 피하세요.",
    timingNuance: "가볍고 밝은 접촉에는 유리합니다.",
    yesNoNuance: "상대의 반응도 밝다면 긍정적입니다.",
    yeoniMetaphor: "찻잔 위 햇살이 작은 설탕처럼 녹는 카드예요.",
  },
  major_20_judgement: {
    coreSymbol: "과거를 다시 부르는 소리와 새 판단",
    loveMeaning: "연애에서는 지나간 선택을 다시 평가하고, 서로에게 남은 미해결 감정을 보게 합니다.",
    reunionMeaning: "재회에서는 강한 재검토 카드지만, 사과와 변화 없는 귀환은 오래가지 않습니다.",
    relationshipShadow: "자책, 미련, 과거 미화가 현재 판단을 붙잡을 수 있습니다.",
    emotionalPattern: "다시 한 번 기회가 있지 않을까 하는 마음이 크게 울립니다.",
    advice: "과거를 반복하지 않을 기준을 먼저 적고, 그 기준을 지킬 수 있을 때만 움직이세요.",
    avoidAction: "그때 왜 그랬냐는 심문, 자책을 유도하는 말, 과거 회상만 길게 보내는 행동을 피하세요.",
    timingNuance: "과거가 다시 올라오는 시기이며, 결정은 신중해야 합니다.",
    yesNoNuance: "재평가의 문은 열리지만 변화가 조건입니다.",
    yeoniMetaphor: "찻잔 안에서 오래된 종소리가 한 번 울리는 카드예요.",
  },
  major_21_world: {
    coreSymbol: "한 장이 끝나고 다음 문이 열리는 완성",
    loveMeaning: "연애에서는 관계가 한 단계 결론에 닿았고, 이어 갈지 마무리할지 더 성숙한 선택을 요구합니다.",
    reunionMeaning: "재회에서는 예전 장을 마무리한 뒤에야 다음 장이 가능합니다.",
    relationshipShadow: "끝난 장을 인정하지 않으면 같은 마지막을 반복합니다.",
    emotionalPattern: "마무리와 새 시작 사이에서 마음이 오래 뒤돌아봅니다.",
    advice: "이 관계에서 배운 것과 더 반복하지 않을 것을 분명히 정리하세요.",
    avoidAction: "미완의 감정 때문에 이미 끝난 약속을 되살리려는 행동을 피하세요.",
    timingNuance: "완성과 정리의 카드입니다. 새 장은 마무리 뒤에 열립니다.",
    yesNoNuance: "마무리가 끝나면 다음 가능성이 열립니다.",
    yeoniMetaphor: "찻잔의 마지막 향을 비우고 새 잔을 데우는 카드예요.",
  },
  minor_cups_02: {
    coreSymbol: "두 개의 컵이 같은 높이에서 마주 놓이는 상호 호감과 교환",
    loveMeaning: "연애에서는 마음이 한쪽으로만 흐르지 않고 서로를 향해 열릴 수 있는 장면을 비춥니다. 다만 호감이 있어도 관계의 이름은 천천히 확인해야 합니다.",
    reunionMeaning: "재회에서는 서로 대화할 의지가 남아 있을 때 가능성이 열립니다. 사과와 경청이 같은 높이로 놓여야 합니다.",
    relationshipShadow: "상호성에 대한 기대가 커질수록 작은 반응 하나를 확답처럼 해석할 수 있습니다.",
    emotionalPattern: "기대가 부드럽게 올라오지만, 상대도 같은 온도인지 확인하고 싶은 마음이 함께 흔들립니다.",
    advice: "상대가 부담 없이 반응할 수 있는 짧은 안부나 대화 가능 여부부터 확인하세요.",
    avoidAction: "호감 확인을 몰아붙이거나 관계 이름을 바로 정하려는 행동을 피하세요.",
    timingNuance: "부드럽게 열리는 타이밍이지만 상호 반응을 확인하며 천천히 가야 합니다.",
    yesNoNuance: "서로의 반응이 실제로 오갈 때 긍정적입니다.",
    yeoniMetaphor: "두 찻잔의 향이 서로를 향해 살짝 기울어지는 카드예요.",
  },
  minor_wands_03: {
    coreSymbol: "이미 켜 둔 불빛을 뒤로하고 더 먼 항로를 살피는 확장과 관망",
    loveMeaning: "연애에서는 호감이 한 자리에서만 맴돌지 않고 다음 만남, 다음 약속, 관계의 폭을 넓히려는 흐름을 비춥니다. 다만 상대의 속도와 현실 일정이 함께 맞아야 합니다.",
    reunionMeaning: "재회에서는 예전 자리로 돌아가는 카드라기보다, 서로가 달라진 조건을 확인한 뒤 새 방식으로 다시 볼 수 있는지 살피는 카드입니다.",
    relationshipShadow: "가능성을 크게 보느라 아직 확인되지 않은 거리, 비용, 책임, 상대의 준비도를 작게 볼 수 있습니다.",
    emotionalPattern: "마음은 이미 앞으로 나가고 싶어 하지만, 실제로는 한 번 더 자료를 모으고 반응을 확인해야 안정됩니다.",
    advice: "확장이나 고백을 한 번에 크게 열지 말고, 작게 제안한 뒤 돌아오는 반응과 실행 가능성을 먼저 보세요.",
    avoidAction: "준비되지 않은 약속, 근거 없는 낙관, 상대나 시장의 반응을 확인하지 않은 채 큰 결정을 밀어붙이는 행동을 피하세요.",
    timingNuance: "바로 폭발하는 운보다 멀리 보고 길을 트는 운입니다. 며칠에서 몇 주간의 반응 확인 뒤 방향이 선명해집니다.",
    yesNoNuance: "조건부로 긍정적입니다. 검증된 근거와 작게 시작할 범위가 있을 때 확장운이 열립니다.",
    yeoniMetaphor: "별가루 홍차 위로 먼 항구의 불빛이 반짝이며 길을 가리키는 카드예요.",
  },
  minor_pentacles_04: {
    coreSymbol: "쥐고 있던 동전의 압력이 손바닥에 남는 통제와 해방",
    loveMeaning: "연애에서는 안정감을 지키려는 마음이 강하지만, 너무 꽉 붙잡으면 상대도 나도 숨 쉴 자리가 줄어듭니다.",
    reunionMeaning: "재회에서는 붙잡는 힘이 강할수록 관계가 더 굳을 수 있습니다. 가능성이 열리려면 감정과 조건을 통제하려는 손부터 조금 풀어야 합니다.",
    relationshipShadow: "잃을까 봐 움켜쥐거나, 반대로 불안이 커져 충동적으로 소비하고 확인하려는 흐름이 생길 수 있습니다.",
    emotionalPattern: "안정을 확인하고 싶은 마음이 강해서 작은 손실도 크게 느껴지고, 숫자와 반응을 반복해서 확인하게 됩니다.",
    advice: "이번 달은 더 벌 방법보다 새는 돈, 새는 감정, 새는 에너지를 먼저 분리하세요. 고정비와 충동 지출을 나누면 불안의 크기가 줄어듭니다.",
    avoidAction: "불안해서 하는 투자, 한 번에 만회하려는 결제, 상대나 돈을 붙잡으려고 압박하는 행동을 피하세요.",
    timingNuance: "단번에 풀리는 운보다 2주에서 한 달 사이에 지출 구조를 정리하며 안정감이 돌아오는 흐름입니다.",
    yesNoNuance: "대박보다는 방어와 재정비에 긍정적입니다. 손을 푸는 만큼 돈의 흐름도 다시 보입니다.",
    yeoniMetaphor: "황금 계피차의 따뜻한 향이 굳은 손끝을 천천히 풀어 주는 카드예요.",
  },
  minor_swords_03: {
    coreSymbol: "말과 기억이 마음을 찌른 뒤 남은 회복의 자리",
    loveMeaning: "연애에서는 상처, 실망, 아픈 말이 관계의 중심에 놓였음을 비춥니다. 감정 회복 없이 바로 가까워지면 같은 상처가 다시 열릴 수 있습니다.",
    reunionMeaning: "재회에서는 아직 아픈 지점이 남아 있어, 먼저 회복과 책임 인정이 필요합니다. 빠른 연락보다 상처를 덜 자극하는 거리가 중요합니다.",
    relationshipShadow: "상대의 말이나 침묵을 계속 되새기며 스스로를 더 아프게 만들 수 있습니다.",
    emotionalPattern: "아직 괜찮지 않은 마음이 있는데도 답을 받아내면 나아질 것처럼 느끼는 흐름입니다.",
    advice: "연락보다 먼저 상처의 핵심 문장을 짧게 정리하고, 지금 대화가 회복인지 재상처인지 구분하세요.",
    avoidAction: "아픈 말을 다시 꺼내 상대를 찌르거나, 자책을 유도하는 연락을 피하세요.",
    timingNuance: "즉시 재회보다 회복 시간이 먼저입니다. 며칠의 간격이 상처를 덜 벌립니다.",
    yesNoNuance: "지금은 조심스럽고 회복 조건이 필요합니다.",
    yeoniMetaphor: "찻잔에 떨어진 빗방울이 아직 잔물결을 만들고 있는 카드예요.",
  },
  minor_swords_09: {
    coreSymbol: "긴 밤의 악몽에서 완전히 벗어나진 않았지만 눈을 뜨기 시작하는 새벽",
    loveMeaning: "연애에서는 상대의 반응보다 내 안의 자책과 불안이 더 크게 울리는 장면을 비춥니다. 지금은 사랑의 결론보다 마음의 회복 속도를 먼저 봐야 합니다.",
    reunionMeaning: "재회에서는 불안이 줄어들기 전까지 연락이 회복이 아니라 확인 강박이 될 수 있습니다. 가능성은 마음이 잠을 되찾을 때 더 차분하게 판단됩니다.",
    relationshipShadow: "혼자 모든 책임을 짊어지고, 밤마다 같은 장면을 되감으며 스스로를 더 아프게 만들 수 있습니다.",
    emotionalPattern: "걱정은 아직 남아 있지만, 문제를 말로 꺼내고 도움을 받으면 악몽의 힘이 조금씩 약해지는 흐름입니다.",
    advice: "오늘은 큰 결론보다 수면, 식사, 짧은 산책, 한 사람에게 털어놓기처럼 몸을 먼저 안정시키는 행동이 필요합니다.",
    avoidAction: "새벽 장문 연락, SNS 반복 확인, 혼자 버티기, 위험한 충동을 숨기고 괜찮은 척하는 행동을 피하세요.",
    timingNuance: "회복은 갑자기 밝아지기보다 7일 단위의 작은 루틴으로 돌아옵니다. 잠을 되찾는 만큼 판단도 선명해집니다.",
    yesNoNuance: "지금은 큰 결정에 대한 예스보다 회복 쪽으로 기우는 예스입니다. 마음이 진정된 뒤 다시 물어야 답이 맑아집니다.",
    yeoniMetaphor: "백련 치유차의 김이 새벽 불안을 얇게 걷어 내는 카드예요.",
  },
  minor_cups_08: {
    coreSymbol: "정이 남아도 더는 채워지지 않는 잔을 두고 돌아서는 걸음",
    loveMeaning: "연애에서는 마음이 완전히 식었다기보다, 계속 머물러도 채워지지 않는 지점을 알아차리는 카드입니다.",
    reunionMeaning: "재회에서는 미련과 회복 가능성을 냉정히 나누어야 합니다. 상대가 같은 자리로 돌아오지 않는다면 정리의 걸음이 더 안전할 수 있습니다.",
    relationshipShadow: "외로움 때문에 다시 돌아가고 싶지만, 돌아가도 같은 빈 잔을 마주할 수 있습니다.",
    emotionalPattern: "마음 한쪽은 돌아보고 싶고, 다른 한쪽은 이미 지쳐서 떠날 준비를 합니다.",
    advice: "연락하기 전, 이 관계가 다시 채워질 조건이 실제로 있는지 세 가지로 적어보세요.",
    avoidAction: "외로움이 올라온 밤에 다시 붙잡는 연락을 보내는 행동을 피하세요.",
    timingNuance: "정리와 거리두기의 타이밍이 강합니다. 답을 재촉할수록 마음이 더 비워질 수 있습니다.",
    yesNoNuance: "예전 방식의 재회는 약하고, 정리 뒤 새 기준이 생길 때만 다시 볼 수 있습니다.",
    yeoniMetaphor: "반쯤 식은 찻잔을 두고 달빛 쪽으로 걸어 나가는 카드예요.",
  },
};

export function getTarotCounselProfile(card: TeaHouseTarotCard, orientation: TarotOrientation): TarotCounselProfile {
  const suit = card.id.includes("_cups_")
    ? "cups"
    : card.id.includes("_swords_")
      ? "swords"
      : card.id.includes("_wands_")
        ? "wands"
        : card.id.includes("_pentacles_")
          ? "pentacles"
          : "major";
  const profile = tarotCounselProfiles[card.id];
  const suitMeta = suit === "major" ? undefined : minorSuitMeta[suit];
  return {
    cardId: card.id,
    nameKr: card.nameKo,
    nameEn: card.nameEn,
    arcana: suit === "major" ? "major" : "minor",
    suit,
    number: card.number,
    orientation,
    uprightMeaning: card.upright.meaning,
    reversedMeaning: card.reversed.meaning,
    coreSymbol: profile?.coreSymbol || `${card.nameKo} 카드가 비추는 ${suitMeta?.core || "핵심 상징"}`,
    loveMeaning: profile?.loveMeaning || `${card.nameKo}은 연애에서 ${suitMeta?.core || card.upright.keywords.slice(0, 2).join(", ")}의 흐름을 비춥니다.`,
    reunionMeaning: profile?.reunionMeaning || `${card.nameKo}은 재회에서 예전 패턴을 확인하고 새 기준을 세울 때 의미가 깊어집니다.`,
    relationshipShadow: profile?.relationshipShadow || "확인되지 않은 감정을 사실처럼 붙잡으면 관계의 그림자가 짙어집니다.",
    emotionalPattern: profile?.emotionalPattern || "기대와 불안이 번갈아 올라오며 마음의 속도가 흔들립니다.",
    advice: profile?.advice || "카드의 상징을 현실 행동 하나로 줄이고, 상대의 경계를 존중하는 방식으로 움직이세요.",
    avoidAction: profile?.avoidAction || "답을 재촉하거나 감정을 증명하려는 행동은 피하세요.",
    timingNuance: profile?.timingNuance || "카드의 흐름이 무르익을 시간을 두고 판단해야 합니다.",
    yesNoNuance: profile?.yesNoNuance || "단정 대신 조건부 가능성으로 읽어야 합니다.",
    yeoniMetaphor: profile?.yeoniMetaphor || "찻잔 위에 카드의 향이 조용히 번지는 장면이에요.",
  };
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
