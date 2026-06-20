import { SUKUYO_MANSIONS } from "./sukuyo-premium.js";

const FORBIDDEN_REPORT_PHRASES = Object.freeze([
  "달빛을 한 번 짚으면",
  "숙요 신호가 현실의 말투와 선택으로 내려와요",
  "결을 함께 보아야 해요",
  "먼저 깨어나고",
  "마음의 신호와 현실 선택을 나란히 확인해야 해요",
  "조심할 신호를 숫자보다 반복되는 장면의 강도로 읽어야 해요",
  "A의",
  "B의",
  "충돌를",
  "흐름는",
  "생길어요",
  "것인지이에요",
  "실宿",
  "삼宿",
]);

const RELATION_PROFILES = Object.freeze({
  명: {
    coreMeaning: "서로를 거울처럼 비추는 관계라 닮은 점이 빠르게 드러납니다.",
    attractionPattern: "처음부터 익숙한 감각이 강하고, 말하지 않아도 통한다고 느끼기 쉽습니다.",
    emotionalPattern: "기쁨과 불안이 같은 방향으로 번져 공감도 빠르지만 예민함도 함께 커집니다.",
    communicationPattern: "설명을 길게 하지 않아도 알아듣는 장점이 있으나, 서운함까지 짐작으로 처리하기 쉽습니다.",
    conflictPattern: "같은 약점이 동시에 켜질 때 서로를 탓하기보다 자기 그림자를 상대에게서 보게 됩니다.",
    longTermPattern: "서로의 성장 속도를 존중하면 오래 안정되고, 비교가 시작되면 피로가 커집니다.",
    reunionPattern: "멀어져도 익숙함이 남아 다시 연락이 이어질 수 있습니다.",
    marriagePattern: "생활 습관이 비슷하면 강하지만, 닮은 고집이 부딪히면 조율이 필요합니다.",
    caution: "상대를 고치려 들기보다 내 반응을 먼저 다듬어야 합니다.",
    advice: "비슷한 점은 장점으로 살리고, 같은 약점은 역할을 나누어 관리하세요.",
    example: "예를 들어 둘 다 답장을 기다리며 불안해한다면, 누가 먼저 확인 문장을 보낼지 정하는 편이 좋습니다.",
  },
  업: {
    coreMeaning: "오래된 숙제처럼 다가와 마음을 쉽게 지나치기 어려운 관계입니다.",
    attractionPattern: "이유를 설명하기 어려운 친숙함과 책임감이 함께 생깁니다.",
    emotionalPattern: "감정이 깊어질수록 서로에게 배워야 할 과제가 분명해집니다.",
    communicationPattern: "감정만 말하면 반복되고, 무엇을 바꿀지 말할 때 길이 열립니다.",
    conflictPattern: "같은 장면이 다른 이름으로 반복되며 피로를 만들 수 있습니다.",
    longTermPattern: "과제를 회피하지 않으면 관계가 성숙해지고, 회피하면 무거워집니다.",
    reunionPattern: "미완의 마음 때문에 다시 이어질 가능성이 남습니다.",
    marriagePattern: "책임을 함께 질 수 있을 때 안정되지만, 희생만 커지면 어렵습니다.",
    caution: "운명감으로 현재의 상처를 덮지 않아야 합니다.",
    advice: "반복되는 문제 하나를 정해 이번에는 다른 선택을 남기세요.",
    example: "예를 들어 같은 말다툼이 반복된다면, 사과보다 재발 방지 문장을 먼저 합의해야 합니다.",
  },
  태: {
    coreMeaning: "상대에게서 돌봄과 응답의 과제를 받는 관계입니다.",
    attractionPattern: "자연스럽게 기대고 싶거나 챙기고 싶은 마음이 생깁니다.",
    emotionalPattern: "편안함이 생기지만 기대가 커질수록 부담도 함께 커질 수 있습니다.",
    communicationPattern: "감사와 부담을 함께 말해야 오해가 줄어듭니다.",
    conflictPattern: "한쪽이 계속 맞추는 구조가 되면 서운함이 쌓입니다.",
    longTermPattern: "주고받는 균형을 세우면 깊어지고, 역할이 굳으면 지칩니다.",
    reunionPattern: "미안함과 고마움이 남아 재접속의 여지가 생깁니다.",
    marriagePattern: "생활 책임을 공정하게 나누는 것이 핵심입니다.",
    caution: "돌봄이 의무가 되지 않게 해야 합니다.",
    advice: "받은 만큼 표현하고, 부담은 늦기 전에 말하세요.",
    example: "예를 들어 한 사람이 약속을 계속 조정한다면, 다음 약속은 다른 사람이 먼저 맞추는 식의 균형이 필요합니다.",
  },
  영: {
    coreMeaning: "상대의 기운을 북돋우고 관계에 온기를 더하는 흐름입니다.",
    attractionPattern: "함께 있으면 편안하고 좋은 쪽으로 나아가고 싶어집니다.",
    emotionalPattern: "다정함이 쌓일수록 신뢰가 생기지만, 갈등을 미루기 쉽습니다.",
    communicationPattern: "부드러운 말이 잘 통하나 핵심 불만은 늦게 나올 수 있습니다.",
    conflictPattern: "좋은 분위기를 지키려다 불편함을 덮으면 뒤늦게 터집니다.",
    longTermPattern: "정기적인 점검 대화가 있으면 오래 안정됩니다.",
    reunionPattern: "좋았던 기억이 남아 관계를 다시 열기 쉽습니다.",
    marriagePattern: "정서적 안정감이 강점이지만 현실 역할을 따로 합의해야 합니다.",
    caution: "편안함에 기대어 필요한 말을 미루지 않아야 합니다.",
    advice: "좋은 날에도 불편한 기준을 작게 확인하세요.",
    example: "예를 들어 데이트가 좋았던 날에도 다음 연락 기준을 짧게 정하면 안정감이 오래갑니다.",
  },
  친: {
    coreMeaning: "상대의 마음을 친숙하게 받아들이고 오래 머물게 하는 흐름입니다.",
    attractionPattern: "낯설지 않은 안도감이 먼저 생기며 관계가 천천히 깊어집니다.",
    emotionalPattern: "정서적 신뢰가 쌓일수록 마음이 편해집니다.",
    communicationPattern: "차분한 대화가 잘 맞지만 갑작스러운 요구에는 느릴 수 있습니다.",
    conflictPattern: "익숙함이 지나치면 관계가 정체될 수 있습니다.",
    longTermPattern: "생활 리듬을 함께 만들 때 장기 안정성이 높습니다.",
    reunionPattern: "안정감의 기억 때문에 다시 돌아보는 일이 생깁니다.",
    marriagePattern: "가정적 안정감은 좋지만 새로움을 의식적으로 넣어야 합니다.",
    caution: "편하다는 이유로 서로를 당연하게 여기면 안 됩니다.",
    advice: "고마움을 자주 말하고, 관계의 작은 흐름을 함께 만들어가세요.",
    example: "예를 들어 매번 같은 방식으로 만난다면 한 달에 한 번은 새로운 장소나 활동을 넣어보는 편이 좋습니다.",
  },
  우: {
    coreMeaning: "친구처럼 정서가 오가며 서로를 이해하려는 흐름입니다.",
    attractionPattern: "대화와 공감에서 끌림이 생기고 마음의 거리가 빠르게 줄어듭니다.",
    emotionalPattern: "섬세하게 반응하지만 작은 서운함도 오래 남을 수 있습니다.",
    communicationPattern: "자주 확인하면 안정되고, 침묵이 길어지면 추측이 커집니다.",
    conflictPattern: "사소한 말투 차이가 감정의 거리로 해석될 수 있습니다.",
    longTermPattern: "친구 같은 편안함을 애정 표현으로 이어가야 합니다.",
    reunionPattern: "대화가 다시 열리면 관계도 비교적 부드럽게 회복됩니다.",
    marriagePattern: "서로의 생활을 존중하면 좋지만 감정 확인을 소홀히 하면 멀어집니다.",
    caution: "배려가 쌓이다가 말하지 못한 피로가 되지 않게 해야 합니다.",
    advice: "짧고 자주 확인하는 대화가 관계의 숨을 살립니다.",
    example: "예를 들어 답장이 늦어질 때는 긴 설명보다 늦어질 것 같다는 한 문장이 더 큰 안정을 줍니다.",
  },
  쇠: {
    coreMeaning: "관계의 민감한 부분을 드러내며 서로의 피로도를 시험하는 흐름입니다.",
    attractionPattern: "처음에는 신경 쓰이고 궁금한 마음이 강하게 올라올 수 있습니다.",
    emotionalPattern: "서운함이 쌓이면 갑자기 멀어지는 식으로 나타날 수 있습니다.",
    communicationPattern: "직접 말하지 않으면 상대가 알아주기를 기다리게 됩니다.",
    conflictPattern: "작은 오해가 반복되면 애정이 아니라 피로로 느껴집니다.",
    longTermPattern: "휴식과 거리 조절을 잘하면 관계가 부드러워집니다.",
    reunionPattern: "상처를 인정하고 회복 방식을 바꾸면 다시 이어질 수 있습니다.",
    marriagePattern: "감정 노동이 한쪽에 몰리지 않게 역할을 나눠야 합니다.",
    caution: "서운함을 시험처럼 쌓아두지 않아야 합니다.",
    advice: "불편함은 작을 때 말하고, 쉬어갈 시간을 합의하세요.",
    example: "예를 들어 기분이 상한 날 바로 결론을 내리기보다, 오늘은 쉬고 내일 이야기하자고 정하는 편이 좋습니다.",
  },
  안: {
    coreMeaning: "상대의 마음을 흔들고 각성시키는 힘이 강한 흐름입니다.",
    attractionPattern: "강한 끌림이 생기며 상대가 특별하게 느껴집니다.",
    emotionalPattern: "감정이 빠르게 올라오고 확신과 불안이 함께 커집니다.",
    communicationPattern: "말을 바로 확인하지 않으면 오해가 커질 수 있습니다.",
    conflictPattern: "보호하려는 마음이 통제처럼 느껴질 수 있습니다.",
    longTermPattern: "경계와 회복 규칙이 있을 때 깊이가 살아납니다.",
    reunionPattern: "상처가 남아도 끌림이 쉽게 사라지지 않습니다.",
    marriagePattern: "생활 합의가 없으면 감정 기복이 크게 느껴집니다.",
    caution: "강한 마음을 관계의 결론으로 착각하지 않아야 합니다.",
    advice: "감정이 올라올 때는 바로 결론 내리지 말고 확인 문장을 먼저 두세요.",
    example: "예를 들어 답장이 늦어 불안해질 때, 왜 안 하냐고 묻기보다 지금 확인이 필요하다고 말하는 편이 좋습니다.",
  },
  괴: {
    coreMeaning: "상대의 자극을 깊게 받아 상처와 회복 과제를 크게 느끼는 흐름입니다.",
    attractionPattern: "마음이 강하게 흔들리며 관계의 의미를 깊게 생각하게 됩니다.",
    emotionalPattern: "받아들이는 폭이 크지만 그만큼 상처도 선명하게 남습니다.",
    communicationPattern: "의도를 묻지 않으면 영향만 남아 마음이 닫힐 수 있습니다.",
    conflictPattern: "방어가 빨라지고 거리두기가 갑작스럽게 나타날 수 있습니다.",
    longTermPattern: "상처를 말로 복구하는 습관이 있으면 관계가 성장합니다.",
    reunionPattern: "회복 문장이 분명할 때 다시 열릴 가능성이 있습니다.",
    marriagePattern: "반복 상처를 생활 규칙으로 줄여야 안정됩니다.",
    caution: "아픈 감정을 혼자 해석해 결론 내리지 않아야 합니다.",
    advice: "상처받은 지점과 원하는 행동을 분리해서 말하세요.",
    example: "예를 들어 상대 말투가 차갑게 느껴졌다면, 나를 싫어하냐고 묻기보다 그 말이 차갑게 닿았다고 설명해야 합니다.",
  },
  성: {
    coreMeaning: "현실적 성취와 관계의 방향을 함께 세우려는 흐름입니다.",
    attractionPattern: "상대의 능력, 태도, 책임감에서 호감이 생깁니다.",
    emotionalPattern: "감정보다 계획과 신뢰가 먼저 안정감을 줍니다.",
    communicationPattern: "구체적인 약속과 실행이 말보다 중요합니다.",
    conflictPattern: "평가받는 느낌이 들면 마음이 닫힐 수 있습니다.",
    longTermPattern: "목표와 생활 기준이 맞으면 오래 단단해집니다.",
    reunionPattern: "달라진 행동이 보일 때 재접속 가능성이 커집니다.",
    marriagePattern: "결혼에서는 돈, 역할, 책임의 합의가 핵심입니다.",
    caution: "관계를 성과처럼 관리하려 하면 따뜻함이 줄어듭니다.",
    advice: "계획을 말할 때 감정 확인도 함께 남기세요.",
    example: "예를 들어 미래 이야기를 할 때 예산과 일정만 정하지 말고 서로가 불안한 지점도 같이 말해야 합니다.",
  },
  위: {
    coreMeaning: "관계에 방향과 움직임을 만들며 서로를 밀어주는 흐름입니다.",
    attractionPattern: "상대가 내 삶에 새 길을 열어주는 느낌이 생깁니다.",
    emotionalPattern: "가만히 있을 때보다 함께 움직일 때 마음이 선명해집니다.",
    communicationPattern: "직접적이고 빠른 말이 잘 맞지만 섬세함은 부족할 수 있습니다.",
    conflictPattern: "속도가 맞지 않으면 한쪽은 압박을, 다른 한쪽은 답답함을 느낍니다.",
    longTermPattern: "각자의 목표를 존중할 때 함께 성장합니다.",
    reunionPattern: "다시 시작하려면 달라진 방향이 보여야 합니다.",
    marriagePattern: "생활 안에서도 각자의 활동성을 살려야 안정됩니다.",
    caution: "속도를 사랑의 크기로 착각하지 않아야 합니다.",
    advice: "움직이기 전에 상대가 따라올 시간을 남겨두세요.",
    example: "예를 들어 갑자기 여행이나 이사를 제안하기보다, 상대가 생각할 시간을 먼저 주는 편이 좋습니다.",
  },
});

const DISTANCE_PROFILES = Object.freeze({
  근거리: {
    coreMeaning: "마음이 빠르게 닿고 작은 신호도 크게 느껴지는 거리입니다.",
    emotionalSpeed: "가까워지는 속도가 빠른 만큼 기대도 빨리 커집니다.",
    intimacyPattern: "친밀감은 쉽게 열리지만 경계가 흐려질 수 있습니다.",
    riskPattern: "연락, 말투, 약속의 흔들림이 곧바로 감정 문제처럼 느껴질 수 있습니다.",
    longTermEffect: "초반의 속도를 관리하면 깊어지고, 방치하면 피로가 커집니다.",
    example: "예를 들어 하루 연락 공백도 크게 느껴질 수 있으니 짧은 신호가 중요합니다.",
    advice: "가까운 만큼 혼자 숨 쉬는 시간과 재접속 규칙을 정하세요.",
  },
  중거리: {
    coreMeaning: "처음보다 시간이 지나며 신뢰가 쌓이는 거리입니다.",
    emotionalSpeed: "마음이 아주 빠르지는 않아도 반복된 행동으로 깊어집니다.",
    intimacyPattern: "관찰과 확인을 거치며 안정적인 친밀감이 만들어집니다.",
    riskPattern: "확신이 늦게 생겨 중간중간 오해가 생길 수 있습니다.",
    longTermEffect: "꾸준한 태도가 있으면 쉽게 흔들리지 않는 관계가 됩니다.",
    example: "예를 들어 첫 만남보다 세 번째, 네 번째 만남에서 상대의 진심이 더 분명하게 보일 수 있습니다.",
    advice: "초반 판단을 서두르지 말고 일정 기간 태도를 지켜보세요.",
  },
  원거리: {
    coreMeaning: "인연감이 있어도 현실 간격과 해석 차이가 크게 작용하는 거리입니다.",
    emotionalSpeed: "가까워지는 속도는 느릴 수 있지만, 그리움이 깊이를 만듭니다.",
    intimacyPattern: "자주 보지 못해도 약속을 지키면 신뢰가 쌓입니다.",
    riskPattern: "공백이 길어질수록 추측과 불안이 커질 수 있습니다.",
    longTermEffect: "연락 방식과 만남 계획이 명확할 때 오래 갑니다.",
    example: "예를 들어 바쁜 시기에 연락이 줄어도 다음 만남 계획이 있으면 마음이 덜 흔들립니다.",
    advice: "감정만 믿지 말고 연락 주기와 만남 일정을 현실적으로 정하세요.",
  },
});

const CHAPTER_RULES = Object.freeze({
  1: {
    key: "chapter-01-overview",
    order: 1,
    title: "제 1장. 두 사람의 숙명적 궁합 요약",
    subtitle: "전체 궁합 요약",
    sections: [
      { id: "overall", title: "두 사람의 전체 인연 한 줄 해석", focus: "overall", exampleCategory: "firstMeeting" },
      { id: "attraction", title: "이 관계가 시작될 때의 끌림", focus: "attraction", exampleCategory: "firstSignal" },
      { id: "atmosphere", title: "함께 있을 때 만들어지는 분위기", focus: "atmosphere", exampleCategory: "dateMood" },
      { id: "strength", title: "이 관계의 핵심 장점", focus: "strength", exampleCategory: "support" },
      { id: "risk", title: "가장 조심해야 할 관계의 약점", focus: "risk", exampleCategory: "conflict" },
    ],
  },
  2: {
    key: "chapter-02-me-love",
    order: 2,
    title: "제 2장. 나의 본명숙과 사랑 방식",
    subtitle: "본인의 본명숙과 사랑 방식",
    sections: [
      { id: "self-temperament", title: "나의 본명숙이 가진 기본 성향", focus: "selfTemperament", subject: "self", exampleCategory: "selfTemperament" },
      { id: "self-love", title: "사랑할 때 드러나는 나의 감정 방식", focus: "selfLove", subject: "self", exampleCategory: "selfLove" },
      { id: "self-needs", title: "관계에서 내가 기대하는 것", focus: "selfNeeds", subject: "self", exampleCategory: "selfNeeds" },
      { id: "self-anxiety", title: "불안할 때 나타나는 나의 반응", focus: "selfAnxiety", subject: "self", exampleCategory: "selfAnxiety" },
      { id: "self-sustain", title: "내가 사랑을 오래 유지하는 방법", focus: "selfSustain", subject: "self", exampleCategory: "selfSustain" },
    ],
  },
  3: {
    key: "chapter-03-partner-love",
    order: 3,
    title: "제 3장. 상대의 본명숙과 사랑 방식",
    subtitle: "상대의 본명숙과 사랑 방식",
    sections: [
      { id: "partner-temperament", title: "상대의 본명숙이 가진 기본 성향", focus: "partnerTemperament", subject: "partner", exampleCategory: "partnerTemperament" },
      { id: "partner-love", title: "상대가 사랑을 느끼는 방식", focus: "partnerLove", subject: "partner", exampleCategory: "partnerLove" },
      { id: "partner-values", title: "상대가 관계에서 중요하게 여기는 것", focus: "partnerValues", subject: "partner", exampleCategory: "partnerValues" },
      { id: "partner-distance", title: "상대가 멀어질 때 보이는 신호", focus: "partnerDistance", subject: "partner", exampleCategory: "partnerDistance" },
      { id: "partner-understanding", title: "상대를 이해하기 위한 핵심 포인트", focus: "partnerUnderstanding", subject: "partner", exampleCategory: "partnerUnderstanding" },
    ],
  },
});

const PHRASE_VARIANTS = Object.freeze({
  opening: [
    "이 대목은 두 사람의 관계가 어떤 첫 인상으로 열리는지 짚어줍니다.",
    "여기서는 인연의 큰 흐름을 너무 빨리 단정하지 않고 차분히 살핍니다.",
    "이 자리에서는 끌림과 불안, 현실 가능성을 한꺼번에 놓고 봅니다.",
    "숙요점으로 보면 이 부분은 관계의 첫 문장을 정하는 문턱입니다.",
  ],
  midDistance: [
    "이 관계는 처음보다 시간이 지나며 진가가 드러나는 편입니다.",
    "초반의 강한 확신보다 반복된 행동을 통해 신뢰가 쌓이는 구조입니다.",
    "가까워지는 속도는 빠르지 않아도, 한 번 신뢰가 생기면 쉽게 흔들리지 않습니다.",
    "서로를 바로 판단하기보다 일정 기간 관찰하면서 마음이 깊어지는 흐름입니다.",
    "중거리에서는 첫인상보다 이후의 태도와 책임감이 더 중요하게 작용합니다.",
    "처음의 설렘이 크지 않아도 꾸준한 선택이 쌓이면 관계의 깊이가 늦게 피어납니다.",
  ],
  adviceLead: [
    "지금 필요한 조언은 거창한 결심보다 작은 약속을 분명히 하는 것입니다.",
    "이 흐름을 살리려면 마음의 크기보다 반복 행동을 먼저 보아야 합니다.",
    "관계를 안정시키는 열쇠는 감정 확인과 다음 행동을 함께 남기는 데 있습니다.",
    "좋은 인연으로 쓰려면 서로의 속도를 맞추는 문장이 필요합니다.",
    "두 사람에게 중요한 것은 감정을 증명하려 하기보다 안전하게 확인하는 습관입니다.",
    "고마움을 자주 말하고, 관계의 작은 흐름을 그냥 지나치지 않는 태도가 필요합니다.",
    "지금의 관계에서는 마음을 읽어주길 바라기보다 알아들을 수 있게 전하는 태도가 중요합니다.",
    "좋은 흐름을 오래 남기려면 감정 표현과 현실 약속이 같은 방향을 향해야 합니다.",
    "서로를 편하게 만들려면 기대를 숨기지 않고 작은 기준부터 맞춰가는 편이 좋습니다.",
    "관계가 깊어질수록 다정함뿐 아니라 회복 방식을 함께 정하는 지혜가 필요합니다.",
    "이 인연을 안정적으로 키우려면 서운함보다 먼저 원하는 장면을 말하는 연습이 필요합니다.",
    "마음이 흔들릴수록 상대를 시험하기보다 본인의 필요를 정직하게 꺼내야 합니다.",
    "상대를 더 잘 이해하려면 반응 하나보다 그 반응이 반복되는 맥락을 보아야 합니다.",
    "사랑을 지키려면 다가가는 힘과 기다리는 힘을 함께 길러야 합니다.",
    "불편한 장면이 생겼을 때 바로 판단하지 않고 확인하는 말부터 꺼내는 것이 좋습니다.",
    "관계의 온도를 살리려면 상대의 방식과 본인의 방식을 함께 존중해야 합니다.",
    "좋은 흐름은 감정의 크기보다 서로를 덜 불안하게 만드는 태도에서 자랍니다.",
  ],
});

const REALISTIC_EXAMPLES = Object.freeze({
  firstMeeting: "예를 들어 처음 만난 자리에서 대화가 갑자기 깊어지거나, 짧은 눈빛과 말투가 오래 기억에 남는 식으로 끌림이 시작될 수 있습니다.",
  firstSignal: "예를 들어 첫 연락에서 한 사람은 바로 약속을 잡고 싶어 하고, 다른 한 사람은 말투와 반응을 조금 더 살피며 마음을 열 수 있습니다.",
  dateMood: "예를 들어 함께 있을 때 한쪽은 조용한 안정감을 원하고, 다른 한쪽은 새로운 활동이나 빠른 반응에서 애정을 확인하려 할 수 있습니다.",
  support: "예를 들어 힘든 일이 생겼을 때 한 사람은 곁을 지키며 마음을 살피고, 다른 한 사람은 해결 방향을 열어주며 관계를 움직이게 할 수 있습니다.",
  conflict: "예를 들어 답장이 늦거나 약속이 바뀌는 작은 상황에서도 한쪽은 불안을 느끼고, 다른 한쪽은 압박을 느껴 말이 어긋날 수 있습니다.",
  selfTemperament: "예를 들어 마음이 움직였을 때 먼저 분위기를 살피는지, 아니면 약속과 다음 단계를 잡으며 마음을 표현하는지에서 본인의 숙 기질이 드러납니다.",
  selfLove: "예를 들어 좋아하는 마음이 커질수록 연락 빈도, 만남 제안, 말투의 온도가 달라지고 상대의 반응에 더 민감해질 수 있습니다.",
  selfNeeds: "예를 들어 아무리 끌려도 확인받지 못하면 마음이 닫히고, 작은 약속이 지켜질 때 비로소 깊게 기대려는 흐름이 생깁니다.",
  selfAnxiety: "예를 들어 상대가 잠시 조용해졌을 뿐인데 혼자 이유를 추측하거나, 반대로 아무렇지 않은 척 거리를 두는 반응이 나올 수 있습니다.",
  selfSustain: "예를 들어 오래 만날수록 특별한 이벤트보다 같은 시간에 연락하기, 약속을 지키기, 서운함을 늦기 전에 말하기가 관계를 살립니다.",
  partnerTemperament: "예를 들어 상대가 처음부터 마음을 모두 열지 않아도, 반복해서 같은 자리에 머물고 약속을 지키는 모습에서 진심이 드러날 수 있습니다.",
  partnerLove: "예를 들어 상대는 말로 뜨겁게 표현하기보다 시간을 내주거나 작은 일을 기억해주는 방식으로 애정을 보여줄 수 있습니다.",
  partnerValues: "예를 들어 상대가 중요하게 여기는 기준은 연락 횟수보다 약속의 안정감, 말투의 존중, 관계를 대하는 태도에서 드러날 수 있습니다.",
  partnerDistance: "예를 들어 상대가 갑자기 차가워진 것처럼 보여도 실제로는 감정을 정리할 시간이 필요해 조용해지는 경우가 있습니다.",
  partnerUnderstanding: "예를 들어 상대를 설득하려 하기보다 어떤 순간에 편안해지고 어떤 말에 닫히는지 관찰하면 관계의 문이 부드럽게 열립니다.",
});

function text(value, fallback = "") {
  const out = String(value == null ? "" : value).trim();
  return out || fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

function safeNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function hasBatchim(value = "") {
  const str = text(value);
  if (!str) return false;
  const code = str.charCodeAt(str.length - 1);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

function withJosa(value, pair = "은/는") {
  const [withBatchim, withoutBatchim] = String(pair).split("/");
  return `${text(value)}${hasBatchim(value) ? withBatchim : withoutBatchim}`;
}

function escapeRegExp(value = "") {
  return text(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function profileBody(value, starName) {
  const star = escapeRegExp(starName);
  return text(value)
    .replace(new RegExp(`^${star}은\\s*`), "")
    .replace(new RegExp(`^${star}는\\s*`), "")
    .replace(new RegExp(`^${star}의\\s*사랑은\\s*`), "")
    .replace(new RegExp(`^${star}의\\s*`), "")
    .trim();
}

function normalizeStarName(value, fallback = "본명숙") {
  const raw = text(value, fallback).replace(/宿/g, "숙").replace(/\s+/g, "");
  if (!raw) return fallback;
  return raw.endsWith("숙") ? raw : `${raw}숙`;
}

function normalizeDistance(value) {
  const raw = text(value);
  if (/near|근|가까/i.test(raw)) return "근거리";
  if (/middle|중/i.test(raw)) return "중거리";
  if (/far|원|먼/i.test(raw)) return "원거리";
  return "중거리";
}

function normalizeRelationType(value) {
  const raw = text(value, "명");
  if (/안괴|安壞/i.test(raw)) return "안괴";
  if (/영친|榮親|荣亲/i.test(raw)) return "영친";
  if (/업태|業胎/i.test(raw)) return "업태";
  if (/우쇠|友衰/i.test(raw)) return "우쇠";
  if (/성위|成危/i.test(raw)) return "성위";
  if (/위성|危成/i.test(raw)) return "위성";
  if (/명|命/i.test(raw)) return "명";
  if (RELATION_PROFILES[raw]) return raw;
  return raw;
}

function relationTokens(relationType) {
  const normalized = normalizeRelationType(relationType);
  if (normalized === "명") return ["명"];
  if (normalized.length >= 2) return normalized.split("").filter((token) => RELATION_PROFILES[token]);
  return [normalized].filter((token) => RELATION_PROFILES[token]);
}

function scoreTone(score) {
  const n = safeNumber(score, null);
  if (n == null) return "점수보다 실제 조율 방식이 더 중요한 흐름";
  if (n >= 75) return "끌림과 체감이 강하게 살아나는 흐름";
  if (n >= 60) return "조율할수록 안정되는 흐름";
  if (n >= 45) return "노력과 회복 규칙에 따라 달라지는 흐름";
  return "세심한 관리가 필요한 흐름";
}

function buildGeneratedStarProfile(starName) {
  const mansion = SUKUYO_MANSIONS.find((item) => normalizeStarName(item?.nameKo, "") === starName) || {};
  const group = text(mansion.category, "관계의 결");
  return {
    temperament: `${starName}은 관계 안에서 ${group}의 기운처럼 반응의 온도와 거리를 섬세하게 조절하려는 성향이 있습니다.`,
    loveStyle: `${starName}의 사랑은 한 번에 밀어붙이기보다 상대의 반응을 살피며 자기 속도를 찾는 편입니다.`,
    emotionalPattern: "마음이 움직이면 표현보다 분위기와 태도에서 먼저 신호가 드러납니다.",
    communicationStyle: "직접적인 결론보다 상대가 받아들일 수 있는 순서를 중요하게 여깁니다.",
    conflictPattern: "불안이 커지면 말이 길어지거나 반대로 마음을 숨기는 식으로 방어할 수 있습니다.",
    strengthInRelationship: "상대의 미묘한 차이를 알아차리고 관계의 균형을 살피는 힘이 있습니다.",
    shadowInRelationship: "확신이 부족할 때는 작은 흔들림도 크게 받아들여 오해가 커질 수 있습니다.",
    needsFromPartner: "분명한 확인과 안정적인 반응이 있을 때 마음이 편안해집니다.",
    exampleBehavior: "예를 들어 상대가 지친 날 말보다 먼저 분위기를 살피고 조심스럽게 다가갈 수 있습니다.",
  };
}

function getStarProfile(starName) {
  const name = normalizeStarName(starName);
  const overrides = {
    실숙: {
      temperament: "실숙은 관계의 문을 열고 방향을 잡으려는 힘이 뚜렷합니다.",
      loveStyle: "마음이 움직이면 태도가 비교적 분명하고 관계를 앞으로 밀어가는 편입니다.",
      emotionalPattern: "반응이 늦어지면 답답함을 먼저 느끼지만, 확신이 생기면 빠르게 헌신합니다.",
      communicationStyle: "돌려 말하기보다 지금 필요한 행동을 직접 말하는 쪽에 가깝습니다.",
      conflictPattern: "상대가 모호하게 반응하면 혼자 결론을 앞당길 수 있습니다.",
      strengthInRelationship: "멈춰 있는 관계에 생기와 시작의 힘을 불어넣습니다.",
      shadowInRelationship: "처음의 추진력에 비해 감정 정리에서는 피로가 쌓일 수 있습니다.",
      needsFromPartner: "따라올 시간을 존중받고, 마음의 방향을 확인받을 때 안정됩니다.",
      exampleBehavior: "예를 들어 마음이 생기면 먼저 약속을 잡거나 관계의 다음 단계를 제안할 수 있습니다.",
    },
    삼숙: {
      temperament: "삼숙은 생동감과 추진의 기운이 강해 관계 안에서도 살아 있는 움직임을 원합니다.",
      loveStyle: "정체된 다정함보다 함께 움직이고 새 길을 열 때 마음이 더 분명해집니다.",
      emotionalPattern: "감정이 살아나면 행동이 빨라지고, 지루함이 길어지면 거리를 둘 수 있습니다.",
      communicationStyle: "해결책을 빨리 찾으려 하며, 상대의 감정 속도를 놓칠 때가 있습니다.",
      conflictPattern: "압박을 받으면 갑작스럽게 말이 줄거나 방향을 바꾸려 할 수 있습니다.",
      strengthInRelationship: "관계에 활기와 돌파력을 불어넣고 정체된 공기를 바꿉니다.",
      shadowInRelationship: "성급함이 올라오면 상대에게 차갑거나 급하게 느껴질 수 있습니다.",
      needsFromPartner: "움직임을 인정받되 감정의 속도를 맞춰주는 대화가 필요합니다.",
      exampleBehavior: "예를 들어 갈등이 생기면 오래 감정에 머무르기보다 바로 해결 방법을 찾으려 할 수 있습니다.",
    },
    묘숙: {
      temperament: "묘숙은 섬세하게 살피고 보호하려는 마음이 강한 숙입니다.",
      loveStyle: "마음이 깊어질수록 말보다 챙김, 기억, 조심스러운 확인으로 사랑을 전합니다.",
      emotionalPattern: "안전하다고 느낄 때 천천히 깊어지고, 불안하면 혼자 해석을 키울 수 있습니다.",
      communicationStyle: "상대의 말투와 분위기를 민감하게 읽으며 부드러운 확인을 원합니다.",
      conflictPattern: "차가운 반응을 받으면 바로 따지기보다 마음을 숨기고 거리를 잴 수 있습니다.",
      strengthInRelationship: "상대가 지친 순간을 빨리 알아차리고 정서적 안식처를 만들어줍니다.",
      shadowInRelationship: "과보호나 조용한 회피로 마음을 숨길 수 있습니다.",
      needsFromPartner: "일관된 애정 표현과 늦지 않은 확인이 필요합니다.",
      exampleBehavior: "예를 들어 상대가 피곤해 보이면 먼저 일정을 줄이거나 말없이 챙기려 할 수 있습니다.",
    },
  };
  return overrides[name] || buildGeneratedStarProfile(name);
}

function relationProfileFor(type) {
  const tokens = relationTokens(type);
  if (!tokens.length) return RELATION_PROFILES.명;
  if (tokens.length === 1) return RELATION_PROFILES[tokens[0]] || RELATION_PROFILES.명;
  const first = RELATION_PROFILES[tokens[0]] || RELATION_PROFILES.명;
  const second = RELATION_PROFILES[tokens[1]] || first;
  return {
    coreMeaning: `${first.coreMeaning} 동시에 ${second.coreMeaning}`,
    attractionPattern: `${first.attractionPattern} ${second.attractionPattern}`,
    emotionalPattern: `${first.emotionalPattern} ${second.emotionalPattern}`,
    communicationPattern: `${first.communicationPattern} ${second.communicationPattern}`,
    conflictPattern: `${first.conflictPattern} ${second.conflictPattern}`,
    longTermPattern: `${first.longTermPattern} ${second.longTermPattern}`,
    reunionPattern: `${first.reunionPattern} ${second.reunionPattern}`,
    marriagePattern: `${first.marriagePattern} ${second.marriagePattern}`,
    caution: `${first.caution} ${second.caution}`,
    advice: `${first.advice} ${second.advice}`,
    example: second.example || first.example,
  };
}

function pickVariant(ctx, key, variants) {
  const used = ctx.usedPhrases || new Set();
  const list = safeArray(variants);
  if (!list.length) return "";
  const base = Math.abs([...String(key)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0));
  for (let i = 0; i < list.length; i += 1) {
    const item = list[(base + i) % list.length];
    if (!used.has(item)) {
      used.add(item);
      return item;
    }
  }
  return list[base % list.length];
}

export function koreanGrammarFixer(value, ctx = {}) {
  const aName = text(ctx.personAName, "본인");
  const bName = text(ctx.personBName, "상대");
  return text(value)
    .replace(/충돌를/g, "충돌을")
    .replace(/흐름는/g, "흐름은")
    .replace(/생길어요/g, "생겨요")
    .replace(/것인지이에요/g, "것인지예요")
    .replace(/A는/g, `${aName}님은`)
    .replace(/B는/g, `${bName}님은`)
    .replace(/A의/g, `${aName}님의`)
    .replace(/B의/g, `${bName}님의`)
    .replace(/([가-힣])宿/g, "$1숙")
    .replace(/실宿/g, "실숙")
    .replace(/삼宿/g, "삼숙")
    .replace(/흐름을 흐름/g, "흐름을")
    .replace(/강도을/g, "강도를")
    .replace(/온도을/g, "온도를")
    .replace(/보호이/g, "보호의 기질이")
    .replace(/변화이/g, "움직임이")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function buildCompatibilityContext(input = {}) {
  const personA = input.personA || {};
  const personB = input.personB || {};
  const relation = input.relation || {};
  const starAName = normalizeStarName(personA.syukuKorean || personA.syuku || "본명숙");
  const starBName = normalizeStarName(personB.syukuKorean || personB.syuku || "상대숙");
  const relationType = normalizeRelationType(relation.typeKorean || relation.type || "명");
  const distance = normalizeDistance(relation.distance);
  const tokens = relationTokens(relationType);
  const aToBRelation = text(personA.direction, tokens[0] || relationType);
  const bToARelation = text(personB.direction, tokens[1] || tokens[0] || relationType);
  const score = safeNumber(relation.totalScore ?? input.scores?.emotionalResonance, null);
  const ctx = {
    personAName: text(personA.displayName || personA.name, "본인"),
    personBName: text(personB.displayName || personB.name, "상대"),
    starAName,
    starBName,
    starAProfile: getStarProfile(starAName),
    starBProfile: getStarProfile(starBName),
    relationType,
    aToBRelation,
    bToARelation,
    distance,
    relationProfile: relationProfileFor(relationType),
    distanceProfile: DISTANCE_PROFILES[distance] || DISTANCE_PROFILES.중거리,
    score,
    scoreSummary: scoreTone(score),
    usedPhrases: new Set(),
  };
  ctx.relationDistanceProfile = buildRelationDistanceProfile(ctx);
  return ctx;
}

export function buildRelationDistanceProfile(ctx = {}) {
  const relation = ctx.relationProfile || RELATION_PROFILES.명;
  const distance = ctx.distanceProfile || DISTANCE_PROFILES.중거리;
  return {
    key: `${ctx.relationType}_${ctx.distance}`,
    basicFeel: `${ctx.relationType} 관계는 ${relation.coreMeaning} ${ctx.distance}에서는 ${distance.coreMeaning}`,
    speed: `${relation.attractionPattern} ${distance.emotionalSpeed}`,
    deepening: `${relation.emotionalPattern} ${distance.intimacyPattern}`,
    misunderstanding: `${relation.conflictPattern} ${distance.riskPattern}`,
    example: distance.example,
    maintenance: `${relation.advice} ${distance.advice}`,
  };
}

function buildJudgment(ctx, chapterRule, sectionRule) {
  const opener = pickVariant(ctx, `opening-${sectionRule.id}`, PHRASE_VARIANTS.opening);
  const section = sectionRule.title;
  if (sectionRule.subject === "self") {
    if (sectionRule.focus === "selfTemperament") {
      return `${section}은 ${ctx.personAName}님의 ${ctx.starAName}이 사랑 안에서 가장 먼저 드러내는 결을 짚는 자리입니다. ${ctx.relationType} 관계에서는 이 기본 성향이 끌림의 문을 열고, ${ctx.distance}의 속도 안에서 서서히 실제 태도로 확인됩니다.`;
    }
    if (sectionRule.focus === "selfLove") {
      return `${section}은 마음이 움직인 뒤 ${ctx.personAName}님이 어떤 방식으로 애정을 보내는지 보여줍니다. ${ctx.starAName}의 사랑은 감정의 크기보다 표현의 리듬에서 더 선명하게 드러납니다.`;
    }
    if (sectionRule.focus === "selfNeeds") {
      return `${section}은 ${ctx.personAName}님이 관계 안에서 안정감을 얻기 위해 무엇을 필요로 하는지 보는 부분입니다. ${ctx.relationType}의 흐름이 좋아도 이 기대가 무시되면 마음의 온도는 쉽게 흔들립니다.`;
    }
    if (sectionRule.focus === "selfAnxiety") {
      return `${section}은 약점을 단정하는 말이 아니라 불안이 올라올 때의 습관을 미리 알아차리기 위한 해석입니다. ${ctx.distance}에서는 작은 공백도 본인의 마음속에서 크게 번질 수 있습니다.`;
    }
    return `${section}은 ${ctx.personAName}님이 사랑을 오래 붙잡기 위해 어떤 태도를 길러야 하는지 알려줍니다. ${ctx.starAName}의 장점은 반복될수록 관계의 신뢰로 남습니다.`;
  }
  if (sectionRule.subject === "partner") {
    if (sectionRule.focus === "partnerTemperament") {
      return `${section}은 ${ctx.personBName}님의 ${ctx.starBName}이 관계 안에서 어떤 순서로 마음을 여는지 살피는 자리입니다. ${ctx.relationType} 관계에서는 상대의 기질을 애정의 크기보다 반응의 방식으로 읽어야 합니다.`;
    }
    if (sectionRule.focus === "partnerLove") {
      return `${section}은 ${ctx.personBName}님이 어떤 순간에 사랑받는다고 느끼는지를 보여줍니다. ${ctx.distance}의 흐름에서는 빠른 확신보다 상대가 반복해서 받아들이는 장면이 더 중요합니다.`;
    }
    if (sectionRule.focus === "partnerValues") {
      return `${section}은 상대가 쉽게 양보하지 않는 마음의 기준을 읽는 부분입니다. 이 기준을 알면 같은 말도 덜 부딪히고, 관계의 방향을 더 부드럽게 맞출 수 있습니다.`;
    }
    if (sectionRule.focus === "partnerDistance") {
      return `${section}은 상대가 차가워졌다는 단정이 아니라 마음을 보호할 때 나타나는 신호를 알아차리는 해석입니다. ${ctx.relationType}의 긴장은 말보다 간격에서 먼저 드러날 수 있습니다.`;
    }
    return `${section}는 ${ctx.personBName}님을 바꾸기 위한 조언이 아니라 더 정확히 이해하기 위한 관계의 열쇠입니다. 상대의 숙을 알면 기다릴 때와 다가갈 때를 구분할 수 있습니다.`;
  }
  if (sectionRule.focus === "overall") {
    return `${section}은 ${ctx.starAName}과 ${ctx.starBName}이 ${ctx.relationType} 관계로 만났을 때의 큰 결론입니다. ${opener} 두 사람은 ${ctx.scoreSummary}이며, ${ctx.distance}의 거리감 때문에 감정이 닿는 속도와 확인 방식이 중요하게 작용합니다.`;
  }
  if (sectionRule.focus === "risk") {
    return `${section}은 관계를 겁주기 위한 말이 아니라 먼저 살펴야 할 경계선입니다. ${ctx.relationType} 관계에서는 ${ctx.relationProfile.caution}`;
  }
  return `${section}에서는 ${ctx.starAName}과 ${ctx.starBName}이 서로에게 어떤 마음의 반응을 일으키는지 봅니다. ${opener}`;
}

function buildStarInteraction(ctx, sectionRule) {
  if (sectionRule.subject === "self") {
    if (sectionRule.focus === "selfTemperament") {
      return `${ctx.starAName}은 ${profileBody(ctx.starAProfile.temperament, ctx.starAName)} 그래서 ${ctx.personAName}님은 사랑에서도 첫 반응보다 관계가 어디로 흘러갈지 가늠하려는 마음이 강하게 떠오릅니다.`;
    }
    if (sectionRule.focus === "selfLove") {
      return `${ctx.personAName}님의 애정 방식은 ${profileBody(ctx.starAProfile.loveStyle, ctx.starAName)} 마음이 깊어질수록 ${profileBody(ctx.starAProfile.emotionalPattern, ctx.starAName)}`;
    }
    if (sectionRule.focus === "selfNeeds") {
      return `${ctx.personAName}님이 관계에서 바라는 것은 ${profileBody(ctx.starAProfile.needsFromPartner, ctx.starAName)} 이 필요가 채워질 때 ${profileBody(ctx.starAProfile.strengthInRelationship, ctx.starAName)}`;
    }
    if (sectionRule.focus === "selfAnxiety") {
      return `불안이 올라오면 ${ctx.personAName}님에게는 ${profileBody(ctx.starAProfile.conflictPattern, ctx.starAName)} 또한 ${profileBody(ctx.starAProfile.shadowInRelationship, ctx.starAName)}`;
    }
    return `${ctx.personAName}님이 오래 사랑하기 위해 살려야 할 힘은 ${profileBody(ctx.starAProfile.strengthInRelationship, ctx.starAName)} 다만 관계가 익숙해질수록 ${profileBody(ctx.starAProfile.needsFromPartner, ctx.starAName)}`;
  }
  if (sectionRule.subject === "partner") {
    if (sectionRule.focus === "partnerTemperament") {
      return `${ctx.starBName}의 바탕에는 ${profileBody(ctx.starBProfile.temperament, ctx.starBName)} ${ctx.personBName}님은 마음이 움직여도 먼저 관계의 안전한 모양을 확인하려 할 수 있습니다.`;
    }
    if (sectionRule.focus === "partnerLove") {
      return `${ctx.personBName}님의 사랑은 ${profileBody(ctx.starBProfile.loveStyle, ctx.starBName)} 그래서 상대의 표현은 뜨거운 말보다 일정한 태도와 선택에서 더 잘 보일 수 있습니다.`;
    }
    if (sectionRule.focus === "partnerValues") {
      return `${ctx.personBName}님에게 필요한 것은 ${profileBody(ctx.starBProfile.needsFromPartner, ctx.starBName)} 이 지점이 존중되면 ${profileBody(ctx.starBProfile.strengthInRelationship, ctx.starBName)}`;
    }
    if (sectionRule.focus === "partnerDistance") {
      return `${ctx.personBName}님이 멀어질 때는 ${profileBody(ctx.starBProfile.conflictPattern, ctx.starBName)} 그 안에는 ${profileBody(ctx.starBProfile.shadowInRelationship, ctx.starBName)} 마음을 닫기 전에 스스로를 보호하려는 움직임이 숨어 있을 수 있습니다.`;
    }
    return `${ctx.personBName}님을 이해하려면 ${profileBody(ctx.starBProfile.communicationStyle, ctx.starBName)} 또한 ${profileBody(ctx.starBProfile.exampleBehavior, ctx.starBName)}`;
  }
  if (sectionRule.focus === "overall") {
    return `${ctx.personAName}님은 ${profileBody(ctx.starAProfile.temperament, ctx.starAName)} ${ctx.personBName}님은 ${profileBody(ctx.starBProfile.temperament, ctx.starBName)} 두 사람은 같은 방식으로 사랑하지 않아도 서로의 빈자리를 건드리며 인연의 감각을 키워갑니다.`;
  }
  if (sectionRule.focus === "attraction") {
    return `${ctx.starAName} 쪽 사랑 방식은 ${profileBody(ctx.starAProfile.loveStyle, ctx.starAName)} ${ctx.starBName} 쪽 사랑 방식은 ${profileBody(ctx.starBProfile.loveStyle, ctx.starBName)} 그래서 처음에는 서로의 다른 속도가 낯설면서도 강한 호기심으로 다가올 수 있습니다.`;
  }
  if (sectionRule.focus === "atmosphere") {
    return `${ctx.personAName}님 쪽에서는 ${ctx.starAProfile.strengthInRelationship} ${ctx.personBName}님 쪽에서는 ${ctx.starBProfile.strengthInRelationship} 이 두 힘이 맞물리면 함께 있을 때 편안함과 생기가 동시에 살아납니다.`;
  }
  if (sectionRule.focus === "risk") {
    return `${ctx.starAName} 쪽 그림자는 ${profileBody(ctx.starAProfile.shadowInRelationship, ctx.starAName)} ${ctx.starBName} 쪽 그림자는 ${profileBody(ctx.starBProfile.shadowInRelationship, ctx.starBName)} 이 그림자가 겹치면 작은 서운함도 관계 전체의 문제처럼 커질 수 있습니다.`;
  }
  return `${ctx.starAName} 쪽 장점은 ${profileBody(ctx.starAProfile.strengthInRelationship, ctx.starAName)} ${ctx.starBName} 쪽 장점은 ${profileBody(ctx.starBProfile.strengthInRelationship, ctx.starBName)} 이 장점이 살아날수록 관계는 부담보다 신뢰를 먼저 쌓습니다.`;
}

function buildRelationDistanceText(ctx, sectionRule) {
  const profile = ctx.relationDistanceProfile;
  if (sectionRule.subject === "self") {
    if (sectionRule.focus === "selfTemperament") {
      return `${ctx.relationType} 관계와 ${ctx.distance}가 만나면 본인의 기질은 상대에게 매력으로도, 때로는 속도 차이로도 느껴질 수 있습니다. 이때 중요한 것은 마음이 빠른지 느린지가 아니라 같은 장면을 얼마나 다르게 받아들이는지 알아차리는 일입니다.`;
    }
    if (sectionRule.focus === "selfLove") {
      return `${ctx.relationType}의 감정 흐름에서는 본인이 보내는 애정 신호가 상대에게 격려가 될 수도 있고 부담이 될 수도 있습니다. ${ctx.personAName}님은 애정을 크게 말하기보다 상대가 알아차릴 수 있는 행동으로 반복해 보여줄 때 관계가 더 안정됩니다.`;
    }
    if (sectionRule.focus === "selfNeeds") {
      return `${ctx.distance}에서는 친밀감이 한 번에 완성되기보다 확인과 관찰을 거치며 자리를 잡습니다. ${ctx.relationType} 관계의 장점을 살리려면 본인이 원하는 확인 방식을 상대가 이해할 수 있는 말로 바꾸어야 합니다.`;
    }
    if (sectionRule.focus === "selfAnxiety") {
      return `${ctx.relationType}의 긴장감은 사랑이 식었다는 뜻보다 서로의 방어 방식이 부딪혔다는 신호일 때가 많습니다. 불안한 마음이 올라올수록 상대의 의도를 단정하기 전에 실제로 확인할 장면을 하나 정하는 편이 좋습니다.`;
    }
    return `${ctx.relationType} 관계와 ${ctx.distance}의 조합에서는 시간이 지나며 본인의 일관성이 가장 큰 신뢰가 됩니다. 오래 가는 힘은 큰 확신보다 같은 방식으로 다시 돌아오는 태도에서 생깁니다.`;
  }
  if (sectionRule.subject === "partner") {
    if (sectionRule.focus === "partnerTemperament") {
      return `${ctx.relationType} 관계와 ${ctx.distance}가 겹치면 상대의 첫 반응은 단순한 호불호가 아니라 관계를 감당할 수 있는지 재는 과정으로 나타납니다. 이 과정을 존중하면 끌림은 더 안정적인 신뢰로 옮겨갑니다.`;
    }
    if (sectionRule.focus === "partnerLove") {
      return `${ctx.distance}에서는 상대의 마음이 한 번에 열리기보다 약속, 연락, 태도의 반복을 통해 확인됩니다. ${ctx.relationType} 관계의 온도는 상대가 안심할 때 더 선명하게 올라옵니다.`;
    }
    if (sectionRule.focus === "partnerValues") {
      return `${ctx.relationType}의 장점을 살리려면 상대가 중요하게 여기는 기준을 사소하게 넘기지 않는 태도가 필요합니다. 특히 ${ctx.distance}에서는 작은 약속이 오래 남는 신뢰의 증거가 됩니다.`;
    }
    if (sectionRule.focus === "partnerDistance") {
      return `${ctx.relationType}의 오해는 상대가 물러나는 순간에 커지기 쉽습니다. ${ctx.distance}의 간격 안에서는 바로 추궁하기보다 다시 말을 걸 수 있는 시간을 남기는 편이 관계를 덜 상하게 합니다.`;
    }
    return `${ctx.personBName}님을 이해하는 핵심은 상대의 침묵, 속도, 확인 욕구를 같은 맥락에서 보는 것입니다. ${ctx.relationType} 관계에서는 이 읽기가 정확할수록 불필요한 방어가 줄어듭니다.`;
  }
  if (sectionRule.focus === "overall") {
    return `${profile.basicFeel} 이 장에서는 관계의 결론을 서두르기보다 두 사람이 실제로 어떤 장면에서 편안해지고 흔들리는지를 함께 봅니다.`;
  }
  if (sectionRule.focus === "attraction") {
    return `${profile.speed} 끌림은 강도보다 방향이 중요하므로, 처음의 반응이 어디로 이어지는지 차분히 살펴야 합니다.`;
  }
  if (sectionRule.focus === "atmosphere") {
    return `${profile.deepening} 함께 있을수록 마음의 온도는 말보다 반복되는 태도에서 더 분명하게 드러납니다.`;
  }
  if (sectionRule.focus === "strength") {
    return `${ctx.relationProfile.longTermPattern} ${ctx.distanceProfile.longTermEffect} 특히 ${ctx.distance}에서는 장점이 빠르게 드러나기보다 반복된 행동 안에서 안정적으로 쌓입니다.`;
  }
  if (sectionRule.focus === "risk") {
    return `${profile.misunderstanding} ${ctx.distance}에서는 불안한 장면을 곧바로 결론으로 읽기보다, 어떤 말과 행동이 마음을 흔들었는지 따로 확인해야 합니다.`;
  }
  if (ctx.distance === "중거리") {
    return pickVariant(ctx, `mid-${sectionRule.id}`, PHRASE_VARIANTS.midDistance);
  }
  return `${profile.basicFeel} ${profile.speed}`;
}

function buildRealisticExample(ctx, sectionRule) {
  const base = REALISTIC_EXAMPLES[sectionRule.exampleCategory] || ctx.relationDistanceProfile.example;
  return koreanGrammarFixer(base, ctx);
}

function buildAdvice(ctx, sectionRule) {
  const lead = pickVariant(ctx, `advice-${sectionRule.id}`, PHRASE_VARIANTS.adviceLead);
  if (sectionRule.subject === "self") {
    if (sectionRule.focus === "selfTemperament") {
      return `${lead} 본인의 반응을 숨기기보다 어떤 속도가 편한지 먼저 말하면 상대도 관계의 문턱을 덜 불안하게 넘을 수 있습니다.`;
    }
    if (sectionRule.focus === "selfLove") {
      return `${lead} 좋아한다는 마음은 한 번 크게 증명하기보다 연락, 약속, 사과, 배려처럼 반복되는 행동으로 남겨야 오래 갑니다.`;
    }
    if (sectionRule.focus === "selfNeeds") {
      return `${lead} 원하는 것을 맞혀주길 기다리지 말고, 필요한 확인과 불편한 기준을 부드럽지만 분명하게 말하세요.`;
    }
    if (sectionRule.focus === "selfAnxiety") {
      return `${lead} 불안할 때는 결론을 내리기 전에 사실, 추측, 바라는 행동을 나누어 적어보면 관계를 덜 다치게 합니다.`;
    }
    return `${lead} 오래 유지하려면 본인의 장점을 과하게 쓰지 말고, 쉬어갈 시간과 다시 다가갈 방식을 함께 정해야 합니다.`;
  }
  if (sectionRule.subject === "partner") {
    if (sectionRule.focus === "partnerTemperament") {
      return `${lead} 상대의 반응을 늦다고 몰아붙이기보다 어떤 상황에서 마음이 편안해지는지 먼저 관찰하세요.`;
    }
    if (sectionRule.focus === "partnerLove") {
      return `${lead} 상대가 보내는 작은 행동을 애정의 언어로 인정하면, 관계는 설명보다 신뢰를 통해 깊어집니다.`;
    }
    if (sectionRule.focus === "partnerValues") {
      return `${lead} 상대의 기준을 바꾸려 하기보다 서로 지킬 수 있는 약속으로 번역하는 것이 좋습니다.`;
    }
    if (sectionRule.focus === "partnerDistance") {
      return `${lead} 상대가 조용해질 때는 바로 결론을 요구하지 말고, 다시 이야기할 시간을 정해 두세요.`;
    }
    return `${lead} 이해는 맞춰주는 것만이 아니라 상대의 속도와 본인의 필요를 함께 놓고 균형을 잡는 일입니다.`;
  }
  if (sectionRule.focus === "risk") {
    return `${lead} 감정이 올라올 때는 바로 결론을 내리지 말고, 확인할 말과 다시 이야기할 시간을 먼저 정하세요.`;
  }
  if (sectionRule.focus === "strength") {
    return `${lead} 고마움, 약속 이행, 빠른 사과처럼 작고 반복 가능한 행동이 이 관계의 장점을 가장 선명하게 살립니다.`;
  }
  if (sectionRule.focus === "overall") {
    return `${lead} ${ctx.distanceProfile.advice}`;
  }
  if (sectionRule.focus === "attraction") {
    return `${lead} 초반의 설렘을 결론으로 굳히기보다 연락 속도와 만남의 리듬을 함께 맞춰보세요.`;
  }
  return `${lead} 함께 있는 시간 뒤에 무엇이 편했고 무엇이 부담스러웠는지 짧게 나누면 온도가 오래 유지됩니다.`;
}

export function renderSection(ctx, chapterRule, sectionRule) {
  const paragraphs = [
    buildJudgment(ctx, chapterRule, sectionRule),
    buildStarInteraction(ctx, sectionRule),
    buildRelationDistanceText(ctx, sectionRule),
    buildRealisticExample(ctx, sectionRule),
    buildAdvice(ctx, sectionRule),
  ].map((part) => koreanGrammarFixer(part, ctx)).filter(Boolean);
  return {
    heading: sectionRule.title,
    title: sectionRule.title,
    paragraphs,
    body: paragraphs.join("\n\n"),
  };
}

export function renderChapter(ctx, chapterRule) {
  const sections = chapterRule.sections.map((sectionRule) => renderSection(ctx, chapterRule, sectionRule));
  const chapterLength = sections.reduce((sum, section) => sum + section.body.length, 0);
  const summary = chapterRule.order === 2
    ? `${ctx.personAName}님의 ${ctx.starAName} 사랑 방식은 ${ctx.relationType} 관계와 ${ctx.distance}의 흐름 안에서 확인, 속도, 안정감의 문제로 드러납니다.`
    : chapterRule.order === 3
      ? `${ctx.personBName}님의 ${ctx.starBName} 사랑 방식은 ${ctx.relationType} 관계와 ${ctx.distance}의 흐름 안에서 반응의 속도, 안전감, 멀어지는 신호로 읽힙니다.`
      : `${ctx.starAName}과 ${ctx.starBName}의 ${ctx.relationType} 궁합은 ${ctx.distance}의 체감 속도 안에서 ${ctx.scoreSummary}으로 드러납니다.`;
  return {
    key: chapterRule.key,
    order: chapterRule.order,
    title: chapterRule.title,
    summary: koreanGrammarFixer(summary, ctx),
    sections,
    prescription: {
      lead: koreanGrammarFixer(`${ctx.relationProfile.advice} ${ctx.distanceProfile.advice}`, ctx),
      actions: [
        "연락과 만남의 속도를 서로 확인합니다.",
        "서운함은 쌓기 전에 짧게 말합니다.",
        "갈등 뒤 다시 이야기할 시간을 먼저 정합니다.",
      ],
    },
    chapterLength,
    localNarrative: true,
    source: "sukuyo-report-engine",
  };
}

export function validateReportText(chapters = []) {
  const issues = [];
  const sentenceCount = new Map();
  const chapterList = Array.isArray(chapters) ? chapters : [];
  const body = chapterList.flatMap((chapter) => [
    chapter.title,
    chapter.summary,
    ...(Array.isArray(chapter.sections) ? chapter.sections.flatMap((section) => [section.heading, section.body]) : []),
  ]).join("\n");
  for (const phrase of FORBIDDEN_REPORT_PHRASES) {
    if (body.includes(phrase)) issues.push(`forbidden.${phrase}`);
  }
  for (const sentence of body.split(/[.!?。]\s+|\n+/).map((item) => item.trim()).filter((item) => item.length >= 16)) {
    sentenceCount.set(sentence, (sentenceCount.get(sentence) || 0) + 1);
  }
  for (const [sentence, count] of sentenceCount.entries()) {
    if (count > 1) issues.push(`duplicate.${sentence.slice(0, 20)}`);
  }
  for (const chapter of chapterList) {
    for (const section of Array.isArray(chapter.sections) ? chapter.sections : []) {
      if (!section.body.includes("예를 들어")) issues.push(`example.${chapter.order}.${section.heading}`);
    }
  }
  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}

export function renderPremiumReport(input = {}, options = {}) {
  const ctx = buildCompatibilityContext(input);
  const requested = Array.isArray(options.chapterOrders) && options.chapterOrders.length ? options.chapterOrders : [1];
  const chapters = requested
    .map((order) => CHAPTER_RULES[order])
    .filter(Boolean)
    .map((rule) => renderChapter(ctx, rule));
  const validation = validateReportText(chapters);
  if (!validation.ok) {
    const error = new Error(`Sukuyo report text validation failed: ${validation.issues.join(", ")}`);
    error.code = "SUKUYO_REPORT_TEXT_VALIDATION_FAILED";
    error.issues = validation.issues;
    throw error;
  }
  return { chapters, validation, context: ctx };
}

export const sukuyoReportEngineInternals = Object.freeze({
  RELATION_PROFILES,
  DISTANCE_PROFILES,
  CHAPTER_RULES,
  PHRASE_VARIANTS,
});
