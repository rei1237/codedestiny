import { normalizeDuplicatedSubjectParticles } from "./myeongri-tarot-text-utils.mjs";
import { getTarotCardByAnyId } from "./tarot-cards.mjs";
import {
  buildNumberPattern,
  buildNumerologyBridge,
  buildQuintessence,
  buildQuintessenceReading,
  getCardNumerology,
  getNumberVoice,
  getPositionRole,
  numberParticle,
  resolveNumberRelation,
  wordParticle,
} from "./numerology-tarot-synthesis.mjs";

const NUMEROLOGY_TAROT_TEXT_TRANSLATIONS = {
  ko: {
    "numerologyTarot.topicLove": "연애·관계",
    "numerologyTarot.topicReunion": "재회운",
    "numerologyTarot.topicFeelings": "속마음",
    "numerologyTarot.topicCareer": "직업운",
    "numerologyTarot.topicMoney": "금전운",
    "numerologyTarot.topicRelationship": "대인관계",
    "numerologyTarot.topicHealth": "건강·에너지",
    "numerologyTarot.topicMove": "이동·변화운",
    "numerologyTarot.topicGeneral": "종합운",
    "numerologyTarot.lifePathNumber": "생명수",
    "numerologyTarot.questionNumber": "질문수",
  },
};

function numerologyTarotText(key) {
  return NUMEROLOGY_TAROT_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

const NUMEROLOGY_DATA = {
  1: {
    keyword: "시작과 독립",
    symbol: "☀",
    meaning: "새 출발, 자기주도, 리더십, 자존심",
    color: "#FFD700",
  },
  2: {
    keyword: "관계와 감정",
    symbol: "☽",
    meaning: "배려, 기다림, 감수성, 재회, 협력",
    color: "#E2E8F0",
  },
  3: {
    keyword: "표현과 매력",
    symbol: "✦",
    meaning: "소통, 창작, 유혹, 즐거움, 가벼움",
    color: "#FF9BE2",
  },
  4: {
    keyword: "안정과 현실",
    symbol: "◆",
    meaning: "책임, 가족, 기반, 신뢰, 느림",
    color: "#8BC34A",
  },
  5: {
    keyword: "변화와 자유",
    symbol: "⚡",
    meaning: "이동, 갈등, 유혹, 변덕, 사건",
    color: "#FF6B35",
  },
  6: {
    keyword: "사랑과 헌신",
    symbol: "♡",
    meaning: "관계, 결혼, 돌봄, 아름다움, 집착",
    color: "#E91E8C",
  },
  7: {
    keyword: "내면과 비밀",
    symbol: "🔮",
    meaning: "분석, 고독, 영성, 의심, 거리감",
    color: "#9C27B0",
  },
  8: {
    keyword: "성공과 권력",
    symbol: "∞",
    meaning: "돈, 성취, 욕망, 거래, 현실적 판단",
    color: "#FDE68A",
  },
  9: {
    keyword: "완성과 치유",
    symbol: "✧",
    meaning: "정리, 용서, 미련, 영적 성장, 마무리",
    color: "#00BCD4",
  },
  11: {
    keyword: "운명적 직감",
    symbol: "⚡⚡",
    meaning: "강한 직감, 운명적 만남, 예민함, 영감",
    color: "#FF4081",
    isMaster: true,
  },
  22: {
    keyword: "현실화의 마스터",
    symbol: "◈",
    meaning: "큰 그림, 장기 관계, 현실화, 운명의 구조화",
    color: "#FDE68A",
    isMaster: true,
  },
  33: {
    keyword: "치유하는 사랑",
    symbol: "☯",
    meaning: "헌신적 사랑, 깊은 공감, 희생, 영적 사랑",
    color: "#E2E8F0",
    isMaster: true,
  },
};

const TAROT_CARDS = [
  { id: 0, name: "The Fool", nameKr: "바보", emoji: "🃏", upright: "새 출발, 순수한 시작, 모험", reversed: "무모함, 준비 없는 도전", love: "설레는 새로운 만남", numbers: [1, 22] },
  { id: 1, name: "The Magician", nameKr: "마법사", emoji: "✨", upright: "의지력, 재능 발휘, 현실화 능력", reversed: "재능 낭비, 조작", love: "적극적으로 행동할 때", numbers: [1] },
  { id: 2, name: "The High Priestess", nameKr: "여사제", emoji: "🌙", upright: "직관, 내면의 지혜, 비밀", reversed: "숨겨진 진실, 정보 부족", love: "상대방의 진심은 아직 드러나지 않았다", numbers: [2, 11] },
  { id: 3, name: "The Empress", nameKr: "여황제", emoji: "🌺", upright: "풍요, 사랑, 아름다움", reversed: "의존, 과잉 보호", love: "사랑이 풍요롭게 흘러오는 시기", numbers: [3, 6, 33] },
  { id: 4, name: "The Emperor", nameKr: "황제", emoji: "👑", upright: "안정, 권위, 구조", reversed: "독재, 융통성 부족", love: "안정적이고 신뢰할 수 있는 관계", numbers: [1, 4, 22] },
  { id: 5, name: "The Hierophant", nameKr: "교황", emoji: "⛪", upright: "전통, 관습, 신뢰", reversed: "규범 거부, 독자적 길", love: "진지하고 공식적인 관계로 발전", numbers: [5] },
  { id: 6, name: "The Lovers", nameKr: "연인", emoji: "💑", upright: "사랑, 선택, 조화", reversed: "가치관 충돌, 잘못된 선택", love: "중요한 선택의 기로. 진심이 통할 때", numbers: [2, 6] },
  { id: 7, name: "The Chariot", nameKr: "전차", emoji: "🏆", upright: "승리, 의지, 추진력", reversed: "방향 상실, 충동적 행동", love: "적극적으로 나아갈 때", numbers: [7] },
  { id: 8, name: "Strength", nameKr: "힘", emoji: "🦁", upright: "내면의 강함, 인내, 부드러운 통제", reversed: "자기 의심, 두려움", love: "부드럽지만 단단한 관계", numbers: [8] },
  { id: 9, name: "The Hermit", nameKr: "은둔자", emoji: "🕯️", upright: "성찰, 고독, 안내", reversed: "고립, 외로움", love: "자신을 돌아보는 시기", numbers: [7, 9] },
  { id: 10, name: "Wheel of Fortune", nameKr: "운명의 바퀴", emoji: "☸️", upright: "운명, 변화의 순환, 행운", reversed: "불운, 예상치 못한 변화", love: "운명적인 전환점", numbers: [1, 9] },
  { id: 11, name: "Justice", nameKr: "정의", emoji: "⚖️", upright: "공정, 균형, 인과응보", reversed: "불공정, 편견", love: "주고받는 균형", numbers: [4, 11] },
  { id: 12, name: "The Hanged Man", nameKr: "매달린 사람", emoji: "🙃", upright: "정지, 새로운 시각, 희생", reversed: "지연, 희생 거부", love: "기다리고 다른 각도로 바라볼 때", numbers: [9, 12] },
  { id: 13, name: "Death", nameKr: "죽음", emoji: "🌑", upright: "변환, 끝과 새 시작", reversed: "변화 저항, 정체", love: "한 챕터가 끝나고 새롭게 시작", numbers: [9, 13] },
  { id: 14, name: "Temperance", nameKr: "절제", emoji: "⚗️", upright: "균형, 인내, 조화", reversed: "과잉, 조급함", love: "조화롭고 균형 잡힌 관계", numbers: [33] },
  { id: 15, name: "The Devil", nameKr: "악마", emoji: "😈", upright: "속박, 집착, 욕망", reversed: "속박에서 해방", love: "강한 끌림, 집착 주의", numbers: [8] },
  { id: 16, name: "The Tower", nameKr: "탑", emoji: "⚡", upright: "갑작스러운 변화, 붕괴", reversed: "변화 회피, 지연된 혼란", love: "갑작스러운 관계의 변화", numbers: [5, 16] },
  { id: 17, name: "The Star", nameKr: "별", emoji: "⭐", upright: "희망, 영감, 미래", reversed: "희망 상실, 절망", love: "희망적인 에너지", numbers: [11, 33] },
  { id: 18, name: "The Moon", nameKr: "달", emoji: "🌕", upright: "환상, 불확실, 무의식", reversed: "혼란 해소, 명확해짐", love: "감정이 불명확하고 혼란스럽다", numbers: [7, 11] },
  { id: 19, name: "The Sun", nameKr: "태양", emoji: "☀️", upright: "행복, 성공, 활력", reversed: "과신, 일시적 행복", love: "밝고 행복한 관계", numbers: [3] },
  { id: 20, name: "Judgement", nameKr: "심판", emoji: "📯", upright: "재생, 용서, 새로운 시작", reversed: "과거 집착", love: "용서하고 새로운 시작을 받아들일 때", numbers: [9, 20] },
  { id: 21, name: "The World", nameKr: "세계", emoji: "🌍", upright: "완성, 성취", reversed: "미완성, 지연", love: "완성된 관계", numbers: [9, 22] },
];

const NUMEROLOGY_TAROT_CARD_MEANING_OVERRIDES = {
  0: {
    id: "major_00_fool",
    nameEn: "The Fool",
    nameKo: "\ubc14\ubcf4",
    upright: ["\uc0c8 \ucd9c\ubc1c", "\uc21c\uc218\ud568", "\ubaa8\ud5d8", "\uac00\ub2a5\uc131"],
    reversed: ["\ubb34\ubaa8\ud568", "\uc900\ube44 \ubd80\uc871", "\ud68c\ud53c", "\ucda9\ub3d9"],
    love: {
      upright: "\uc0c8\ub85c\uc6b4 \uc778\uc5f0, \uac00\ubcbc\uc6b4 \uc124\ub818, \uad00\uacc4\uc758 \uc2dc\uc791",
      reversed: "\ucc45\uc784 \uc5c6\ub294 \ud0dc\ub3c4, \ubd88\uc548\uc815\ud55c \uad00\uacc4, \uc131\uae09\ud55c \uc120\ud0dd",
    },
    career: {
      upright: "\uc0c8\ub85c\uc6b4 \ub3c4\uc804, \uc774\uc9c1/\ucc3d\uc5c5 \uac00\ub2a5\uc131, \uc2e4\ud5d8\uc801 \uc2dc\ub3c4",
      reversed: "\uacc4\ud68d \ubd80\uc871, \ud604\uc2e4 \uac80\ud1a0 \ubd80\uc871, \ucda9\ub3d9\uc801 \uacb0\uc815",
    },
    money: {
      upright: "\uc0c8 \uc218\uc785\uc6d0 \ud0d0\uc0c9, \uac00\ub2a5\uc131\uc740 \uc788\uc73c\ub098 \uad00\ub9ac \ud544\uc694",
      reversed: "\ucda9\ub3d9 \uc9c0\ucd9c, \ub9ac\uc2a4\ud06c \uad00\ub9ac \ubd80\uc871",
    },
    inner: {
      upright: "\ub450\ub824\uc6c0\ubcf4\ub2e4 \uac00\ub2a5\uc131\uc744 \ubcf4\ub294 \ub9c8\uc74c",
      reversed: "\ud604\uc2e4\uc744 \uc678\uba74\ud558\uac70\ub098 \ubd88\uc548\uc744 \uac00\ubccd\uac8c \ub118\uae30\ub294 \ub9c8\uc74c",
    },
    myeongriBridge: ["\uc2dd\uc2e0", "\uc0c1\uad00", "\ubaa9\uae30\uc6b4", "\ucd08\uae30\uc6b4", "\ubcc0\ud654"],
  },
  18: {
    id: "major_18_moon",
    nameEn: "The Moon",
    nameKo: "\ub2ec",
    upright: ["\ubd88\uc548", "\ubb34\uc758\uc2dd", "\ud658\uc0c1", "\ubaa8\ud638\ud568"],
    reversed: ["\ud63c\ub780 \ud574\uc18c", "\uc9c4\uc2e4 \uc811\uadfc", "\ubd88\uc548 \uc815\ub9ac", "\ucc29\uac01 \ud574\uc18c"],
    love: {
      upright: "\ubd88\ubd84\uba85\ud55c \uac10\uc815, \ucd94\uce21\uc774 \ucee4\uc9c0\ub294 \uad00\uacc4, \ud655\uc778\uc774 \ud544\uc694\ud55c \ub9c8\uc74c",
      reversed: "\uc624\ud574\uac00 \uc815\ub9ac\ub418\ub294 \ud750\ub984, \uc228\uc740 \uac10\uc815\uc758 \uc815\ub9ac, \uc0ac\uc2e4 \ud655\uc778",
    },
    career: {
      upright: "\uc815\ubcf4 \ubd80\uc871, \ud310\ub2e8 \ud63c\uc120, \ubd88\uc548\ud55c \uc608\uc0c1",
      reversed: "\ubaa8\ud638\ud568 \uac10\uc18c, \ud655\uc778\ub41c \uc815\ubcf4, \ud310\ub2e8 \ud68c\ubcf5",
    },
    money: {
      upright: "\ubd88\ud655\uc2e4\ud55c \uc81c\uc548, \ucda9\ub3d9 \uc9c0\ucd9c \uacbd\uacc4, \uc815\ubcf4 \ud655\uc778 \ud544\uc694",
      reversed: "\uc228\uc740 \ube44\uc6a9 \ud655\uc778, \uc18c\ube44 \ud750\ub984 \uc815\ub9ac, \uc704\ud5d8 \ucd95\uc18c",
    },
    inner: {
      upright: "\ubd88\uc548\uacfc \uc9c1\uac10\uc774 \ub4a4\uc11e\uc5ec \uc0ac\uc2e4\uc744 \ub290\ub9ac\uac8c \ubcf4\ub294 \ub9c8\uc74c",
      reversed: "\ud750\ub9b0 \ub2ec\ube5b\uc774 \uac77\ud788\ub4ef \uc9c4\uc2e4\uc744 \ud655\uc778\ud558\ub824\ub294 \ub9c8\uc74c",
    },
    myeongriBridge: ["\ud3b8\uc778", "\uc815\uc778", "\uc218\uae30\uc6b4", "\ubb34\uc758\uc2dd", "\uac80\uc99d"],
  },
  19: {
    id: "major_19_sun",
    nameEn: "The Sun",
    nameKo: "\ud0dc\uc591",
    upright: ["\uba85\ud655\ud568", "\uc131\uacf5", "\ud65c\ub825", "\uacf5\uac1c"],
    reversed: ["\uc9c0\uc5f0\ub41c \uae30\uc068", "\uacfc\uc2e0", "\uccb4\ub825 \uc800\ud558", "\ud45c\ud604 \ubd80\uc871"],
    love: {
      upright: "\uc194\uc9c1\ud55c \ud45c\ud604, \ubc1d\uc740 \uad00\uacc4, \uc624\ud574 \ud574\uc18c",
      reversed: "\uae30\ub300\uc640 \ud604\uc2e4\uc758 \uac04\uaca9, \uc9c0\uc5f0\ub41c \ud45c\ud604, \uc790\uc2e0\uac10 \uc704\ucd95",
    },
    career: {
      upright: "\uc131\uacfc \uacf5\uac1c, \uc778\uc815, \ubc1d\uc740 \uc804\ub9dd",
      reversed: "\uacfc\ud55c \uc790\uc2e0\uac10, \uc131\uacfc \uc9c0\uc5f0, \ud655\uc778 \ubd80\uc871",
    },
    money: {
      upright: "\uc218\uc775 \ud655\uc778, \ubc1d\uc740 \uae30\ud68c, \uad00\ub9ac \uac00\ub2a5\ud55c \uc99d\uac00",
      reversed: "\ub099\uad00 \uacfc\uc789, \uc9c0\uc5f0\ub41c \uc218\uc775, \ubd80\uc8fc\uc758\ud55c \uc18c\ube44",
    },
    inner: {
      upright: "\uc2a4\uc2a4\ub85c\ub97c \ubc1d\uac8c \ub4dc\ub7ec\ub0bc \uc900\ube44\uac00 \ub41c \ub9c8\uc74c",
      reversed: "\uae30\uc068\uc740 \uc788\uc9c0\ub9cc \ud45c\ud604\uc758 \ud0c0\uc774\ubc0d\uc744 \ub2e4\uc2dc \ubcf4\ub294 \ub9c8\uc74c",
    },
    myeongriBridge: ["\uc2dd\uc2e0", "\uc815\uc7ac", "\ud654\uae30\uc6b4", "\uacf5\uac1c", "\uc131\uacfc"],
  },
};

const TOPIC_NUMBERS = {
  love: 6,
  reunion: 2,
  feelings: 2,
  career: 8,
  money: 8,
  relationship: 2,
  health: 7,
  move: 5,
  general: 9,
};

const TOPIC_LABELS = {
  love: "연애·관계",
  reunion: "재회운",
  feelings: "속마음",
  career: "직업운",
  money: "금전운",
  relationship: "대인관계",
  health: "건강·에너지",
  move: "이동·변화운",
  general: "종합운",
};

const SPREAD_POSITIONS = {
  love: ["현재 마음과 출발점", "관계에서 확인되는 반응", "반복되는 장애물", "도움이 되는 태도와 표현", "가까운 시기의 방향과 조언"],
  reunion: ["아직 남아 있는 인연의 온도", "상대의 숨은 마음", "재회를 막는 핵심 이유", "다시 다가갈 수 있는 방법", "재회 가능성과 현실적 조건"],
  feelings: ["겉으로 보이는 태도", "내면에 숨겨진 진심", "말하지 못하는 두려움", "나에게 바라는 것", "앞으로 드러날 반응"],
  career: ["현재 직업운의 상태", "성장 가능성이 열리는 방향", "진로를 막는 장애물", "지금 준비해야 할 선택", "직업운의 결과 흐름"],
  money: ["현재 재물 흐름", "수익 기회가 열리는 곳", "돈을 막는 습관 또는 변수", "지출·투자·계약 조언", "금전운의 결과 방향"],
  relationship: ["현재 관계의 기류", "나에게 도움이 되는 인연", "갈등을 만드는 말과 태도", "관계 조율의 방법", "관계의 최종 흐름"],
  health: ["현재 몸과 마음의 에너지", "회복 가능성이 생기는 지점", "에너지를 소모시키는 원인", "지금 필요한 회복 방식", "앞으로의 컨디션 흐름"],
  move: ["현재 변화의 기운", "이동·환경 변화의 기회", "변화를 막는 현실 조건", "움직여야 할지 기다려야 할지", "변화 이후의 흐름"],
  general: ["현재 운의 중심 기운", "지금 가장 중요한 주제", "흐름을 막는 변수", "오늘의 선택과 태도", "최종 메시지"],
};

const TOPIC_ALIAS_MAP = {
  wealth: "money",
  finance: "money",
  job: "career",
  work: "career",
  relation: "relationship",
  interpersonal: "relationship",
  exmind: "feelings",
  currentmind: "feelings",
  moving: "move",
  change: "move",
};

const TOPIC_READING_DEFS = {
  love: {
    label: numerologyTarotText("numerologyTarot.topicLove"),
    focus: "애정 표현, 관계의 속도, 확인할 수 있는 행동",
    positionSet: SPREAD_POSITIONS.love,
    numerologyLens: "생명수는 애정의 스타일을, 개인수는 오늘의 표현 속도를, 질문수는 상대와의 거리 조절 방식을 보여 줍니다.",
    cardInterpretationRules: [
      "정의는 주고받음의 균형과 관계 책임을 먼저 봅니다.",
      "절제는 감정 속도를 맞추고 대화를 부드럽게 이어 가는 호흡을 봅니다.",
      "탑은 강한 끌림과 기대 붕괴가 동시에 오며, 숨겨둔 불균형을 드러냅니다.",
      "여사제와 달은 말하지 않은 감정의 파도를 읽는 기준이 됩니다.",
      "연인과 태양은 관계가 깊어질 때 필요한 솔직함과 호감의 확장을 보여 줍니다.",
    ],
    actionRules: [
      "감정을 확인할 문장을 짧게 정리하고, 상대에게 전달할 말과 보낼 시간을 분리하세요.",
      "상대의 반응을 먼저 해석하기보다 내가 원하는 관계의 온도를 한 줄로 적어 두세요.",
      "오늘은 연락의 양보다 대화의 질을 먼저 맞추세요.",
      "반응이 느릴수록 밀어붙이기보다 리듬을 맞추는 쪽이 유리합니다.",
      "관계의 균형이 흔들리면 먼저 기대와 실제 행동의 차이를 적어 보세요.",
      "감정이 과열된 상태에서는 확인 메시지를 늦추고 호흡을 고르세요.",
      "연애의 핵심은 설렘보다 지속 가능한 표현 방식에 있습니다.",
    ],
    cautionRules: [
      "확인되지 않은 추측으로 상대 마음을 단정하지 마세요.",
      "외로움을 관계의 증거처럼 해석하지 마세요.",
      "급한 고백이나 과한 설득은 관계의 온도를 더 흔들 수 있습니다.",
      "감정 기복이 커질 때는 답장 속도보다 내용의 진정성을 먼저 점검하세요.",
      "서운함을 쌓아 두고 한 번에 터뜨리는 방식은 피하세요.",
    ],
    qualityKeywords: ["감정", "표현", "상대", "관계", "끌림", "균형", "온도"],
    forbiddenGenericPhrases: ["작은 행동을 빠르게 실행", "오늘 실행할 행동 1개", "달의 위상은 천천히"],
    topicOverviewSeed: "연애·관계는 감정의 크기보다 서로의 속도, 표현 방식, 실제 행동이 맞물리는지를 먼저 살펴야 합니다.",
    whyThisTopicMattersSeed: "지금은 마음을 크게 단정하기보다 확인 가능한 반응과 내가 원하는 관계의 기준을 함께 정리해야 하는 시기입니다.",
    bridgeSeed: "생명수와 질문수의 흐름이 감정 표현의 속도를 조절하고, 카드의 정·역방향은 상대 반응의 열림과 닫힘을 구체화합니다.",
    currentFlowSeed: "현재 흐름은 호감이나 기대만으로 결론내리기보다 서로의 표현과 연락의 지속성을 확인해야 하는 쪽에 가깝습니다.",
    hiddenIssueSeed: "숨은 문제는 사랑의 부재라기보다, 서로의 기대를 말하지 않은 채 쌓아 둔 오해일 가능성이 큽니다.",
    opportunitySeed: "기회는 감정을 더 크게 보이게 만드는 것이 아니라, 상대가 받아들일 수 있는 방식으로 정확히 전달할 때 열립니다.",
    riskSeed: "위험은 감정 과잉, 해석 과잉, 확인 과잉이 겹치면서 관계의 리듬을 흔드는 데 있습니다.",
    timingSeed: "지금은 한 번에 결론을 내기보다 가까운 시기 안에서 반응과 표현을 조율해 보는 시간이 필요합니다.",
    finalWordSeed: "사랑은 속도를 강요할 때보다 서로의 호흡을 맞출 때 더 멀리 갑니다.",
    sevenDayPlan: [
      "1일차: 지금 느끼는 감정 온도를 한 문장으로 적고, 상대에게 확인하고 싶은 것과 참고 싶은 것을 분리하세요.",
      "2일차: 상대의 반응을 해석하기 전에 내가 보낸 메시지의 톤을 점검하세요.",
      "3일차: 서운함이 쌓인 부분을 사실과 감정으로 나눠 메모하세요.",
      "4일차: 관계를 살리는 표현 한 가지를 정해 짧고 정확하게 전달하세요.",
      "5일차: 상대의 속도와 내 속도를 비교하고, 급한 부분이 무엇인지 확인하세요.",
      "6일차: 관계의 기준을 다시 정리해 필요한 경계와 배려를 나누세요.",
      "7일차: 이번 주 반응을 바탕으로 관계를 더 깊게 갈지, 속도를 조절할지 결론을 적으세요.",
    ],
  },
  reunion: {
    label: numerologyTarotText("numerologyTarot.topicReunion"),
    focus: "남은 감정, 거리감, 재접근 조건, 반복 상처 방지",
    positionSet: SPREAD_POSITIONS.reunion,
    numerologyLens: "생명수는 집착과 용서의 경향을, 개인수는 오늘 연락의 타이밍을, 질문수는 재접근의 현실 조건을 보여 줍니다.",
    cardInterpretationRules: [
      "정의는 미련의 크기보다 남은 책임과 공정성을 먼저 봅니다.",
      "절제는 다시 이어질 가능성이 있어도 속도 조절과 중간 단계를 요구합니다.",
      "탑은 과거의 충격이나 관계 붕괴 경험을 정리하지 않으면 같은 상처가 반복될 수 있음을 보여 줍니다.",
      "심판은 용서와 재검토, 다시 부를 수 있는 이름을 다룹니다.",
      "달과 별은 그리움이 남아 있어도 현실 조건이 맞아야 한다는 점을 드러냅니다.",
    ],
    actionRules: [
      "상대에게 바라는 것과 실제로 가능한 것을 구분해 한 줄씩 적으세요.",
      "연락 전에는 먼저 관계가 끊긴 원인을 사실로 정리하세요.",
      "재회 의사가 있어도 속도보다 조건이 맞는지 확인하세요.",
      "미련이 아니라 회복 가능성을 기준으로 재접근을 설계하세요.",
      "과거의 상처를 반복하지 않기 위해 대화 주제를 미리 정리하세요.",
      "연락은 감정 폭발이 아니라, 관계의 문을 다시 여는 절차로 다루세요.",
      "상대의 생활과 준비도를 존중하지 않으면 같은 거리감이 되풀이됩니다.",
    ],
    cautionRules: [
      "상대가 준비되지 않은 상태에서 밀어붙이지 마세요.",
      "재회의 가능성을 미리 확정하고 행동하지 마세요.",
      "과거를 미화해 현재의 조건을 무시하지 마세요.",
      "감정 연락과 조건 확인을 한 번에 섞어 보내지 마세요.",
      "반복 상처의 원인을 말하지 않은 채 다시 시작하지 마세요.",
    ],
    qualityKeywords: ["재회", "상대", "거리", "재접근", "미련", "조건", "연결"],
    forbiddenGenericPhrases: ["작은 행동을 빠르게 실행", "오늘 실행할 행동 1개", "달의 위상은 천천히"],
    topicOverviewSeed: "재회운은 남은 감정의 크기보다, 끊어진 관계를 다시 이어도 되는 조건이 맞는지부터 읽어야 합니다.",
    whyThisTopicMattersSeed: "지금은 그리움이 강해도 같은 상처를 반복하지 않도록, 재회 조건을 현실적으로 점검해야 하는 시기입니다.",
    bridgeSeed: "생명수와 질문수는 미련과 책임의 균형을, 개인수는 연락 타이밍과 재접근의 속도를 조절합니다.",
    currentFlowSeed: "현재 흐름은 아직 남아 있는 온도와 현실 거리의 차이 사이에서 멈춰 있습니다.",
    hiddenIssueSeed: "숨은 문제는 감정이 없어서가 아니라, 다시 만나도 되는 방식이 정리되지 않았다는 점입니다.",
    opportunitySeed: "기회는 상대를 설득하는 데서 오지 않고, 상처를 반복하지 않는 조건을 분명히 할 때 열립니다.",
    riskSeed: "위험은 미련을 재회의 신호로 오해해 같은 패턴으로 다시 뛰어드는 것입니다.",
    timingSeed: "재회는 속도보다 조건의 정렬이 우선이며, 최소 7일의 관찰과 정리가 필요합니다.",
    finalWordSeed: "재회는 다시 만나는 일이 아니라, 다시 만나도 무너지지 않을 구조를 준비하는 일입니다.",
    sevenDayPlan: [
      "1일차: 상대와의 관계가 끊어진 핵심 이유를 사실 위주로 3개 적으세요.",
      "2일차: 내가 아직 붙들고 있는 미련이 감정인지, 가능성인지 분리해 보세요.",
      "3일차: 재접근 전에 확인해야 할 조건 3개를 적고, 현실 가능성을 점검하세요.",
      "4일차: 연락을 보낸다면 어떤 톤과 목적이 적절한지 먼저 정리하세요.",
      "5일차: 반복 상처를 막을 경계와 대화 주제를 미리 정해 두세요.",
      "6일차: 상대의 준비도를 존중하는 방식으로 기다릴지, 멈출지 판단하세요.",
      "7일차: 재회 가능성과 현실 조건을 함께 적고 다음 행동을 결정하세요.",
    ],
  },
  feelings: {
    label: numerologyTarotText("numerologyTarot.topicFeelings"),
    focus: "겉으로 보이는 태도, 내면의 진심, 두려움, 기대",
    positionSet: SPREAD_POSITIONS.feelings,
    numerologyLens: "생명수는 감정 표현 습관을, 개인수는 오늘 드러나는 표정과 톤을, 질문수는 숨은 마음을 읽는 초점을 보여 줍니다.",
    cardInterpretationRules: [
      "여사제는 말하지 않은 진심과 정보의 비대칭을 봅니다.",
      "달은 두려움과 불확실성 때문에 감정이 흐려지는 지점을 보여 줍니다.",
      "정의는 말과 실제 마음의 균형, 책임의무를 점검합니다.",
      "탑은 감정을 숨긴 채 버티다 갑자기 흔들리는 패턴을 드러냅니다.",
      "연인과 별은 드러나지 않은 기대와 관계의 가능성을 확인합니다.",
    ],
    actionRules: [
      "겉모습과 내면이 다른 이유를 한 문장으로 적으세요.",
      "상대의 태도에서 진심이라고 느낀 장면과 불안했던 장면을 구분하세요.",
      "두려움이 큰 경우에는 해석보다 질문을 먼저 정리하세요.",
      "바라는 마음과 실제로 기대할 수 있는 마음을 나누어 보세요.",
      "속마음은 추측보다 대화의 맥락에서 더 분명해집니다.",
      "표정과 말이 다를 때는 숨은 이유를 먼저 읽어야 합니다.",
      "감정을 읽는 목적은 판단이 아니라 정확한 관계 이해입니다.",
    ],
    cautionRules: [
      "침묵을 곧바로 부정적 의미로 읽지 마세요.",
      "상대의 긴장감을 무관심으로 오해하지 마세요.",
      "내 불안이 상대의 의도를 과장하지 않도록 조심하세요.",
      "질문 없이 결론부터 내리지 마세요.",
      "겉으로 보이는 태도만으로 속마음을 단정하지 마세요.",
    ],
    qualityKeywords: ["표현", "상대", "속마음", "두려움", "진심", "감정", "반응"],
    forbiddenGenericPhrases: ["작은 행동을 빠르게 실행", "오늘 실행할 행동 1개", "달의 위상은 천천히"],
    topicOverviewSeed: "속마음은 겉으로 드러난 태도보다, 말하지 못한 두려움과 기대가 어떤 방향으로 쌓이는지에서 먼저 읽혀야 합니다.",
    whyThisTopicMattersSeed: "지금은 상대의 진심을 판단하는 것보다, 왜 표현이 막혔는지 구조를 파악하는 일이 더 중요합니다.",
    bridgeSeed: "생명수와 질문수는 감정의 깊이와 노출 속도를 조절하고, 카드의 방향성은 숨김과 드러남의 균형을 보여 줍니다.",
    currentFlowSeed: "현재 흐름은 겉으로는 가볍거나 차분해 보여도 안쪽에서는 확인되지 않은 감정이 움직이고 있을 수 있습니다.",
    hiddenIssueSeed: "숨은 문제는 진심이 없어서가 아니라, 진심을 꺼낼 안전감이 부족하다는 점입니다.",
    opportunitySeed: "기회는 감정을 추리하는 데서가 아니라, 상대가 무엇을 두려워하는지 이해할 때 열립니다.",
    riskSeed: "위험은 해석을 앞세워 사실을 놓치고, 불안을 마음 읽기로 착각하는 데 있습니다.",
    timingSeed: "속마음은 강하게 캐묻기보다, 질문의 순서와 맥락을 맞출 때 더 잘 드러납니다.",
    finalWordSeed: "진심은 억지로 끌어내는 것이 아니라, 안전하게 보여 줄 수 있을 때 드러납니다.",
    sevenDayPlan: [
      "1일차: 겉으로 보이는 태도와 내가 느낀 진심을 분리해 적으세요.",
      "2일차: 상대가 말을 아낀 이유를 두려움과 거리감으로 나눠 생각하세요.",
      "3일차: 내가 원하는 답보다 확인이 필요한 질문을 먼저 적으세요.",
      "4일차: 대화의 맥락과 안전감이 어떻게 만들어지는지 점검하세요.",
      "5일차: 상대의 반응을 사실과 해석으로 나눠 다시 읽으세요.",
      "6일차: 감정 추측이 많았다면, 확인 가능한 정보부터 다시 보세요.",
      "7일차: 지금까지 읽은 속마음을 한 문장으로 정리하고 다음 질문을 준비하세요.",
    ],
  },
  career: {
    label: numerologyTarotText("numerologyTarot.topicCareer"),
    focus: "현재 상태, 성장 가능성, 장애물, 선택, 결과 흐름",
    positionSet: SPREAD_POSITIONS.career,
    numerologyLens: "생명수는 일의 방식과 강점을, 개인수는 오늘의 실행 감각을, 질문수는 진로 선택의 방향성을 보여 줍니다.",
    cardInterpretationRules: [
      "황제와 정의는 구조, 기준, 평가 선명도를 중점으로 봅니다.",
      "전차와 마법사는 추진력과 실행 기술을 함께 봅니다.",
      "탑은 직무나 조직 구조의 재편이 필요하다는 신호가 될 수 있습니다.",
      "은둔자와 별은 혼자 정리한 인사이트와 장기 성장 가능성을 보여 줍니다.",
      "세계와 심판은 커리어의 정리, 승격, 다음 챕터를 다룹니다.",
    ],
    actionRules: [
      "현재 일에서 성과로 연결되는 지점을 숫자나 결과로 적으세요.",
      "지금 준비해야 할 선택을 3개로 좁혀 비교하세요.",
      "업무 변화가 필요하면 기준보다 먼저 실행 순서를 정하세요.",
      "이직을 고민한다면 역할, 보상, 성장의 균형을 함께 보세요.",
      "직업운은 감이 아니라 구조와 지표로 읽을수록 선명해집니다.",
      "당장 바꾸기보다 현재 강점을 재배치하는 방법부터 확인하세요.",
      "성과를 내는 속도보다 지속 가능한 시스템을 먼저 세우세요.",
    ],
    cautionRules: [
      "무작정 비교만 하다 방향을 놓치지 마세요.",
      "일의 불만을 곧바로 이동 신호로 단정하지 마세요.",
      "준비 없이 퇴로부터 만들지 마세요.",
      "성과 압박이 커질수록 역할과 한계를 분명히 하세요.",
      "기준 없이 움직이면 같은 문제를 다른 자리에서 반복합니다.",
    ],
    qualityKeywords: ["일", "커리어", "성장", "선택", "성과", "구조", "방향"],
    forbiddenGenericPhrases: ["작은 행동을 빠르게 실행", "오늘 실행할 행동 1개", "달의 위상은 천천히"],
    topicOverviewSeed: "직업운은 현재 자리의 성과, 성장 구조, 선택 순서를 함께 봐야 제대로 읽힙니다.",
    whyThisTopicMattersSeed: "지금은 역량보다 배치가 중요한 시기일 수 있으므로, 같은 실력을 어디에 놓느냐가 결과를 바꿉니다.",
    bridgeSeed: "생명수는 강점의 활용 방식을, 개인수는 오늘의 작업 리듬을, 질문수는 다음 선택의 기준을 만들어 줍니다.",
    currentFlowSeed: "현재 흐름은 버티기보다 정리가 먼저이며, 무엇을 계속할지보다 무엇을 바꿀지가 중요합니다.",
    hiddenIssueSeed: "숨은 문제는 실력 부족보다, 성과가 드러나는 구조가 제대로 맞지 않는 데 있을 수 있습니다.",
    opportunitySeed: "기회는 역할의 확장, 기준의 명확화, 성과가 보이는 배치에서 열립니다.",
    riskSeed: "위험은 기준 없는 이동이나 감정적 퇴사처럼 구조를 보지 않는 선택입니다.",
    timingSeed: "지금은 7일 안에 정리와 비교를 끝내고, 실행 순서를 명확히 하는 것이 좋습니다.",
    finalWordSeed: "커리어는 운이 아니라 배치와 구조가 만드는 결과입니다.",
    sevenDayPlan: [
      "1일차: 현재 역할에서 실제 성과가 나는 지점을 3개 적으세요.",
      "2일차: 성장 가능성이 열리는 방향을 직무, 사람, 환경으로 나눠 보세요.",
      "3일차: 장애물로 느껴지는 것을 실력 문제와 구조 문제로 분리하세요.",
      "4일차: 준비해야 할 선택을 기준 3개로 비교하세요.",
      "5일차: 당장 바꿀 것과 유지할 것을 나누어 정리하세요.",
      "6일차: 성과를 숫자로 확인할 수 있는 지표 하나를 정하세요.",
      "7일차: 다음 30일의 커리어 실행 순서를 적고 첫 행동을 정하세요.",
    ],
  },
  money: {
    label: numerologyTarotText("numerologyTarot.topicMoney"),
    focus: "수입, 지출, 계약, 기회, 손실 방지",
    positionSet: SPREAD_POSITIONS.money,
    numerologyLens: "생명수는 돈을 다루는 기본 습관을, 개인수는 오늘의 수입·지출 감각을, 질문수는 거래 판단의 초점을 보여 줍니다.",
    cardInterpretationRules: [
      "정의는 계약, 정산, 세금, 공정한 거래 조건을 봅니다.",
      "절제는 수입과 지출의 균형, 분산, 현금 흐름 조율을 봅니다.",
      "탑은 갑작스러운 지출, 리스크, 무리한 투자, 구조 변경 필요성을 보여 줍니다.",
      "황제와 펜타클 계열은 자산 구조와 실질 기반을 점검합니다.",
      "마법사와 운명의 바퀴는 기회 포착과 실행 타이밍을 읽게 합니다.",
    ],
    actionRules: [
      "이번 달 들어갈 돈과 막을 돈을 먼저 분리해 적으세요.",
      "계약이나 정산은 감정보다 조건표를 먼저 보세요.",
      "지출을 줄이기보다 현금 흐름의 우선순위를 재배치하세요.",
      "기회가 보여도 리스크와 비용을 함께 확인하세요.",
      "수입이 늘어도 구조가 없으면 금전운은 오래 가지 않습니다.",
      "현실적인 숫자 기준을 세워야 운의 흔들림이 줄어듭니다.",
      "돈의 흐름은 빨리 벌기보다 오래 지키는 방식이 핵심입니다.",
    ],
    cautionRules: [
      "확인되지 않은 제안에 바로 반응하지 마세요.",
      "감정 소비와 실제 비용을 섞어서 판단하지 마세요.",
      "무리한 투자나 과도한 확대를 운으로 미화하지 마세요.",
      "정산과 계약 조건은 반드시 문서로 확인하세요.",
      "지출의 이유를 모르고 반복 결제하지 마세요.",
    ],
    qualityKeywords: ["수입", "지출", "계약", "현금흐름", "기회", "리스크", "비용"],
    forbiddenGenericPhrases: ["작은 행동을 빠르게 실행", "오늘 실행할 행동 1개", "달의 위상은 천천히"],
    topicOverviewSeed: "금전운은 돈이 들어오는지보다, 돈이 새지 않고 구조를 만들 수 있는지를 먼저 읽어야 합니다.",
    whyThisTopicMattersSeed: "지금은 수익 기회와 지출 구조가 동시에 흔들릴 수 있어, 숫자 기준이 흐려지지 않게 점검해야 합니다.",
    bridgeSeed: "생명수는 돈을 다루는 기본 패턴을, 개인수는 오늘의 소비·정산 속도를, 질문수는 판단의 우선순위를 잡아 줍니다.",
    currentFlowSeed: "현재 흐름은 수입과 지출의 균형이 맞는지, 아니면 한쪽이 과도하게 커지고 있는지를 먼저 봐야 합니다.",
    hiddenIssueSeed: "숨은 문제는 기회 부족보다 비용 구조나 계약 조건을 가볍게 보는 습관일 수 있습니다.",
    opportunitySeed: "기회는 숫자를 읽고 조건을 정리할 때 더 크게 열립니다.",
    riskSeed: "위험은 무리한 투자, 즉흥 지출, 확인되지 않은 제안을 한 번에 받아들이는 데 있습니다.",
    timingSeed: "지금은 7일 안에 현금 흐름을 다시 정렬하고, 계약과 비용을 분리해 보는 시기입니다.",
    finalWordSeed: "돈은 감정이 아니라 구조가 지키는 자산입니다.",
    sevenDayPlan: [
      "1일차: 이번 달 수입과 지출 항목을 각각 적고 큰 흐름을 확인하세요.",
      "2일차: 계약이나 정산이 있으면 조건과 마감일을 다시 확인하세요.",
      "3일차: 손실을 만드는 습관이나 누수를 한 가지 적어 보세요.",
      "4일차: 지출·투자·저축의 우선순위를 다시 정리하세요.",
      "5일차: 수익 기회를 보더라도 리스크와 비용을 함께 비교하세요.",
      "6일차: 현금 흐름을 막는 구조를 하나만 개선하세요.",
      "7일차: 이번 주 금전 판단을 돌아보고 다음 30일 기준을 세우세요.",
    ],
  },
  relationship: {
    label: numerologyTarotText("numerologyTarot.topicRelationship"),
    focus: "신뢰, 경계, 대화 온도, 협력의 균형",
    positionSet: SPREAD_POSITIONS.relationship,
    numerologyLens: "생명수는 관계를 맺는 습관을, 개인수는 오늘의 대화 온도를, 질문수는 연결과 경계의 균형을 보여 줍니다.",
    cardInterpretationRules: [
      "정의는 공정한 거리감과 책임 분배를 봅니다.",
      "절제는 갈등을 덜 키우는 말의 온도와 조율을 봅니다.",
      "탑은 관계를 흔드는 오해, 충돌, 예고 없는 단절을 드러냅니다.",
      "황제는 기준과 역할 분배가 관계를 안정시키는 지점을 보여 줍니다.",
      "별은 관계 회복의 희망과 협력의 가능성을 비춥니다.",
    ],
    actionRules: [
      "이번 주 꼭 지켜야 할 관계의 경계를 한 문장으로 적으세요.",
      "불편한 대화는 맥락과 시간을 먼저 맞추세요.",
      "도움이 되는 사람과 소모되는 사람을 나누어 보세요.",
      "관계의 균형이 흔들리면 기대와 역할을 분리하세요.",
      "협력은 친함보다 역할과 기준이 명확할 때 오래갑니다.",
      "말의 양보다 약속의 질을 우선하세요.",
      "관계를 지키는 핵심은 경계와 배려의 균형입니다.",
    ],
    cautionRules: [
      "모든 사람을 만족시키려다 지치지 마세요.",
      "불편함을 오래 참다가 한 번에 터뜨리지 마세요.",
      "경계를 늦게 세우면 소모가 커집니다.",
      "오해를 추측으로 키우지 말고 사실을 먼저 확인하세요.",
      "협력을 강요하면 관계의 온도가 더 낮아질 수 있습니다.",
    ],
    qualityKeywords: ["관계", "경계", "대화", "신뢰", "균형", "협력", "온도"],
    forbiddenGenericPhrases: ["작은 행동을 빠르게 실행", "오늘 실행할 행동 1개", "달의 위상은 천천히"],
    topicOverviewSeed: "대인관계는 친함의 크기보다, 서로의 경계와 신뢰가 균형을 이루는지부터 읽어야 합니다.",
    whyThisTopicMattersSeed: "지금은 관계를 넓히는 것보다 소모를 줄이고, 믿을 수 있는 연결을 선별하는 일이 중요합니다.",
    bridgeSeed: "생명수는 관계의 기본 태도를, 개인수는 오늘의 말투를, 질문수는 협력과 거리의 균형을 조절합니다.",
    currentFlowSeed: "현재 흐름은 사람 사이의 온도는 유지되지만, 기준과 역할이 조금 흔들리는 상태일 수 있습니다.",
    hiddenIssueSeed: "숨은 문제는 호감 부족이 아니라 기대와 책임이 서로 다르게 배분되어 있다는 점입니다.",
    opportunitySeed: "기회는 관계를 더 붙이는 데보다, 서로 편안한 선을 찾을 때 열립니다.",
    riskSeed: "위험은 배려를 무한정 쓰면서 내 에너지를 소진시키는 것입니다.",
    timingSeed: "지금은 7일 안에 경계와 배려의 기준을 다시 맞추는 시기가 좋습니다.",
    finalWordSeed: "좋은 관계는 참는 관계가 아니라, 서로의 선을 존중하는 관계입니다.",
    sevenDayPlan: [
      "1일차: 지금 지키고 싶은 관계의 경계를 한 줄로 적으세요.",
      "2일차: 도움이 되는 인연과 소모되는 인연을 나눠 보세요.",
      "3일차: 불편했던 대화를 사실과 감정으로 분리하세요.",
      "4일차: 관계를 조율할 말의 온도를 미리 정해 두세요.",
      "5일차: 협력이 필요한 사람과 혼자서 처리할 일을 나누세요.",
      "6일차: 약속과 역할이 불분명한 관계를 점검하세요.",
      "7일차: 이번 주 관계 흐름을 정리하고 유지할 선을 확정하세요.",
    ],
  },
  health: {
    label: numerologyTarotText("numerologyTarot.topicHealth"),
    focus: "현재 컨디션, 회복 지점, 소모 원인, 회복 방식",
    positionSet: SPREAD_POSITIONS.health,
    numerologyLens: "생명수는 회복 습관을, 개인수는 오늘의 에너지 상태를, 질문수는 몸과 마음의 균형 포인트를 보여 줍니다.",
    cardInterpretationRules: [
      "절제는 몸과 마음의 속도를 맞추는 회복 리듬을 봅니다.",
      "은둔자와 달은 혼자 정리해야 하는 피로와 무의식적 소모를 봅니다.",
      "탑은 무리한 버티기와 갑작스러운 부담이 에너지를 깨는 지점을 보여 줍니다.",
      "별과 태양은 회복의 희망과 활력을 다시 세우는 방향을 보여 줍니다.",
      "정의는 생활 습관과 리듬의 균형을 다시 맞추게 합니다.",
    ],
    actionRules: [
      "오늘 잠들기 전 화면 시간을 줄이세요.",
      "피로를 키우는 일 하나를 잠시 멈추세요.",
      "식사, 물, 호흡 중 하나를 먼저 정리하세요.",
      "휴식도 일정처럼 관리하세요.",
      "회복은 한 번의 결심보다 반복 가능한 리듬으로 옵니다.",
      "무리한 버티기를 줄이면 판단도 다시 선명해집니다.",
      "몸의 신호를 가볍게 넘기지 마세요.",
    ],
    cautionRules: [
      "지속되는 피로를 기분 문제로만 넘기지 마세요.",
      "수면 부족과 과로를 운으로 감싸지 마세요.",
      "무리한 일정 변경보다 회복 시간을 먼저 확보하세요.",
      "통증이나 이상 신호가 있으면 현실적인 대응을 우선하세요.",
      "감정 소모를 체력과 분리해 관리하세요.",
    ],
    qualityKeywords: ["건강", "에너지", "회복", "피로", "몸", "마음", "컨디션"],
    forbiddenGenericPhrases: ["작은 행동을 빠르게 실행", "오늘 실행할 행동 1개", "달의 위상은 천천히"],
    topicOverviewSeed: "건강·에너지는 몸의 상태와 마음의 피로를 함께 봐야 실제 회복 지점을 놓치지 않습니다.",
    whyThisTopicMattersSeed: "지금은 컨디션의 미세한 신호를 놓치면 생활 전체의 리듬이 흔들릴 수 있어 우선순위가 중요합니다.",
    bridgeSeed: "생명수는 기본 체력과 회복 습관을, 개인수는 오늘의 컨디션을, 질문수는 돌봄의 초점을 제시합니다.",
    currentFlowSeed: "현재 흐름은 버티기보다 쉬는 방식과 생활 리듬을 바꾸는 데서 회복이 시작됩니다.",
    hiddenIssueSeed: "숨은 문제는 의지 부족이 아니라 스트레스가 누적되는 생활 패턴일 수 있습니다.",
    opportunitySeed: "기회는 휴식과 회복 루틴을 정리할 때 더 선명해집니다.",
    riskSeed: "위험은 피로 신호를 무시하고 계속 버티는 것입니다.",
    timingSeed: "지금은 7일 안에 생활 리듬을 조금씩 바꾸며 회복 가능성을 확인하는 시기입니다.",
    finalWordSeed: "회복은 특별한 사건보다 반복 가능한 생활 조절에서 시작됩니다.",
    sevenDayPlan: [
      "1일차: 오늘 컨디션을 몸과 마음으로 나눠 적으세요.",
      "2일차: 피로를 키우는 습관 하나를 잠시 멈추세요.",
      "3일차: 수면, 수분, 식사 중 하나를 먼저 정리하세요.",
      "4일차: 회복 시간을 일정에 고정하세요.",
      "5일차: 무리한 일정과 감정 소모를 구분하세요.",
      "6일차: 몸이 보내는 신호를 기록하세요.",
      "7일차: 이번 주 회복 패턴을 정리하고 다음 루틴을 정하세요.",
    ],
  },
  move: {
    label: numerologyTarotText("numerologyTarot.topicMove"),
    focus: "이동, 환경 변화, 준비도, 변화 후 흐름",
    positionSet: SPREAD_POSITIONS.move,
    numerologyLens: "생명수는 변화를 받아들이는 습관을, 개인수는 오늘의 이동 감각을, 질문수는 준비와 실행의 간격을 보여 줍니다.",
    cardInterpretationRules: [
      "전차와 운명의 바퀴는 이동의 타이밍과 방향을 읽게 합니다.",
      "황제와 정의는 조건, 예산, 일정 같은 현실 기반을 봅니다.",
      "탑은 무리한 이동이나 갑작스러운 환경 변화가 필요하다는 신호일 수 있습니다.",
      "은둔자와 별은 준비와 장기 전망을 함께 보게 합니다.",
      "세계는 이동 후의 정착과 새로운 판의 완성을 뜻합니다.",
    ],
    actionRules: [
      "이동 전에 비용, 거리, 일정, 생활 변수를 분리해 적으세요.",
      "즉흥 결정 대신 1주일 뒤 조건까지 함께 보세요.",
      "새 환경에서 유지할 루틴 하나를 먼저 정하세요.",
      "움직일지 말지보다 준비도가 맞는지 먼저 확인하세요.",
      "변화는 속도보다 도착 후 정착이 더 중요합니다.",
      "지금의 불편이 이동 신호인지, 일시적 피로인지 구분하세요.",
      "환경을 바꾸기 전에 버틸 수 있는 구조를 먼저 확인하세요.",
    ],
    cautionRules: [
      "마음이 급하다고 바로 움직이지 마세요.",
      "준비 없이 환경만 바꾸면 같은 피로가 이어질 수 있습니다.",
      "비용과 현실 조건을 생략하지 마세요.",
      "기대만으로 이동 결정을 하지 마세요.",
      "변화를 오래 미루는 것과 너무 빨리 하는 것을 모두 경계하세요.",
    ],
    qualityKeywords: ["이동", "변화", "환경", "준비", "조건", "정착", "타이밍"],
    forbiddenGenericPhrases: ["작은 행동을 빠르게 실행", "오늘 실행할 행동 1개", "달의 위상은 천천히"],
    topicOverviewSeed: "이동·변화운은 지금의 불편이 진짜 이동 신호인지, 아니면 일시적 흔들림인지부터 읽어야 합니다.",
    whyThisTopicMattersSeed: "환경 변화는 마음만으로 결정하면 위험하므로 비용, 일정, 정착 가능성을 함께 보아야 합니다.",
    bridgeSeed: "생명수는 변화를 받아들이는 방식과, 개인수는 오늘의 움직임을, 질문수는 준비와 실행의 간격을 맞춥니다.",
    currentFlowSeed: "현재 흐름은 움직이고 싶은 마음과 실제 조건 사이의 간격이 핵심입니다.",
    hiddenIssueSeed: "숨은 문제는 이동 자체가 아니라 이동 후 버틸 구조가 충분한지에 있습니다.",
    opportunitySeed: "기회는 준비와 조건이 맞아 떨어질 때 열립니다.",
    riskSeed: "위험은 급한 결심과 현실 비용의 미검토입니다.",
    timingSeed: "지금은 7일 안에 조건을 정리하고 이동 여부를 다시 판단하는 것이 좋습니다.",
    finalWordSeed: "변화는 먼저 도착한 뒤를 버틸 수 있을 때 안전합니다.",
    sevenDayPlan: [
      "1일차: 이동 이유를 감정과 현실로 나눠 적으세요.",
      "2일차: 비용, 거리, 일정 조건을 점검하세요.",
      "3일차: 변화 후 유지할 루틴을 적으세요.",
      "4일차: 지금 움직여야 하는지, 기다려야 하는지 기준을 정하세요.",
      "5일차: 준비 부족 요소를 하나씩 보완하세요.",
      "6일차: 이동 후 생활을 상상해 정착 가능성을 확인하세요.",
      "7일차: 변화 결정을 내릴 수 있는지 최종 정리하세요.",
    ],
  },
  general: {
    label: numerologyTarotText("numerologyTarot.topicGeneral"),
    focus: "현재 운의 중심, 중요한 주제, 변수, 태도, 최종 메시지",
    positionSet: SPREAD_POSITIONS.general,
    numerologyLens: "생명수는 전체 운의 기본 방향을, 개인수는 오늘의 운세 흐름을, 질문수는 지금 우선순위를 가리킵니다.",
    cardInterpretationRules: [
      "현재 운의 중심을 먼저 잡고, 반복되는 주제를 읽습니다.",
      "흐름을 막는 변수와 열리는 기회를 함께 봅니다.",
      "타이밍은 빨리 결론내기보다 정리와 관찰이 중요합니다.",
      "카드는 전체 방향을, 수비학 숫자는 움직일 박자를 정리합니다.",
      "종합운은 여러 영역을 한 줄로 연결하는 기준을 제공합니다.",
    ],
    actionRules: [
      "지금 가장 중요한 주제 하나를 적으세요.",
      "오늘 선택할 행동과 미룰 행동을 나누세요.",
      "흐름을 막는 변수를 먼저 줄이세요.",
      "중요한 결정은 숫자와 조건을 함께 보세요.",
      "운세를 넓게 보되 실행은 한 줄로 좁히세요.",
      "가장 큰 영향을 주는 일 하나만 먼저 끝내세요.",
      "전체 흐름은 정리와 우선순위에서 선명해집니다.",
    ],
    cautionRules: [
      "모든 걸 한 번에 해결하려고 하지 마세요.",
      "감정이 커졌다고 핵심을 놓치지 마세요.",
      "정보가 많아도 결론은 하나씩 내세요.",
      "운의 흐름을 핑계로 현실 판단을 미루지 마세요.",
      "오늘의 핵심과 주변 소음을 분리하세요.",
    ],
    qualityKeywords: ["운", "흐름", "주제", "선택", "태도", "기회", "변수"],
    forbiddenGenericPhrases: ["작은 행동을 빠르게 실행", "오늘 실행할 행동 1개", "달의 위상은 천천히"],
    topicOverviewSeed: "종합운은 여러 문제를 한꺼번에 보되, 무엇이 지금 가장 중심인지 먼저 가려내야 합니다.",
    whyThisTopicMattersSeed: "전체 흐름이 복잡할수록 우선순위를 정하는 것 자체가 운의 방향을 바꿉니다.",
    bridgeSeed: "생명수는 전체 성향을, 개인수는 오늘의 흐름을, 질문수는 가장 중요한 축을 드러냅니다.",
    currentFlowSeed: "현재 흐름은 여러 신호 가운데 가장 먼저 손봐야 할 축이 무엇인지로 정리됩니다.",
    hiddenIssueSeed: "숨은 문제는 선택지가 많아서가 아니라 중심이 흐려져 있다는 점입니다.",
    opportunitySeed: "기회는 핵심 주제를 정리할 때 가장 선명하게 보입니다.",
    riskSeed: "위험은 우선순위 없이 모든 신호를 동시에 쫓는 것입니다.",
    timingSeed: "지금은 7일 안에 정리와 실행을 함께 맞추는 것이 좋습니다.",
    finalWordSeed: "흐름은 결국 무엇을 먼저 선택하느냐에서 갈립니다.",
    sevenDayPlan: [
      "1일차: 지금 가장 중요한 주제를 한 줄로 적으세요.",
      "2일차: 흐름을 막는 변수와 열리는 기회를 나누세요.",
      "3일차: 오늘 선택할 것과 미룰 것을 구분하세요.",
      "4일차: 숫자와 조건이 필요한 결정이 무엇인지 적으세요.",
      "5일차: 실행 우선순위를 다시 배열하세요.",
      "6일차: 중심이 흐려졌던 부분을 하나씩 정리하세요.",
      "7일차: 이번 주 전체 흐름을 돌아보고 다음 선택을 정하세요.",
    ],
  },
};

const CARD_TOPIC_NOTES = {
  Justice: {
    love: "정의는 연애에서 주고받음의 균형과 책임감을 따집니다.",
    reunion: "정의는 재회에서 남은 책임, 공정성, 아직 정리되지 않은 감정의 균형을 봅니다.",
    feelings: "정의는 속마음에서 말과 실제 감정이 얼마나 일치하는지 가늠하게 합니다.",
    career: "정의는 직업운에서 평가 기준, 역할 분담, 승부보다 공정한 결과를 따집니다.",
    money: "정의는 금전운에서 계약, 세금, 정산, 거래 조건을 세밀하게 점검하게 합니다.",
    relationship: "정의는 대인관계에서 역할과 경계가 공정하게 나뉘는지 확인하게 합니다.",
    health: "정의는 건강·에너지에서 생활 습관과 체력 분배의 균형을 봅니다.",
    move: "정의는 이동·변화운에서 조건표와 현실 비용이 맞는지 확인하게 합니다.",
    general: "정의는 전체 흐름에서 지금 균형이 무너진 축이 어디인지 드러냅니다.",
  },
  Temperance: {
    love: "절제는 연애에서 속도를 조절하고 감정의 온도를 맞추는 카드입니다.",
    reunion: "절제는 재회에서 중간 단계와 기다림, 다시 연결되는 호흡을 의미합니다.",
    feelings: "절제는 속마음에서 감정을 한꺼번에 쏟기보다 조율하며 드러내는 태도입니다.",
    career: "절제는 직업운에서 직무와 역할의 조합, 리듬 조절, 협업 균형을 봅니다.",
    money: "절제는 금전운에서 수입과 지출을 조율하고 자산을 분산하는 방식입니다.",
    relationship: "절제는 대인관계에서 말의 온도와 갈등 조절 능력을 상징합니다.",
    health: "절제는 건강·에너지에서 회복 속도와 생활 리듬을 맞추는 핵심 카드입니다.",
    move: "절제는 이동·변화운에서 서두르지 않고 조건을 맞추는 신중함을 뜻합니다.",
    general: "절제는 전체 흐름에서 속도 조절과 균형 회복을 강조합니다.",
  },
  "The Tower": {
    love: "탑은 연애에서 강한 끌림이나 충격적 사건이 기존 기대를 깨는 흐름입니다.",
    reunion: "탑은 재회에서 과거 충격과 붕괴된 구조를 정리하지 않으면 같은 문제가 반복됨을 보여 줍니다.",
    feelings: "탑은 속마음에서 숨겨 둔 불안이 한순간 드러나는 상황을 뜻합니다.",
    career: "탑은 직업운에서 조직 개편, 역할 변화, 예고 없는 전환을 알립니다.",
    money: "탑은 금전운에서 갑작스러운 지출, 리스크, 구조 조정 필요성을 보여 줍니다.",
    relationship: "탑은 대인관계에서 오해가 누적되어 한 번에 흔들리는 장면을 뜻합니다.",
    health: "탑은 건강·에너지에서 무리한 버티기와 급격한 소모를 경고합니다.",
    move: "탑은 이동·변화운에서 환경을 바꿔야 할 필요성과 준비 없는 이동의 충격을 함께 봅니다.",
    general: "탑은 전체 흐름에서 지금의 구조를 다시 짜야 하는 순간을 알립니다.",
  },
  "The Lovers": {
    love: "연인은 연애에서 감정과 선택, 가치관의 조화를 봅니다.",
    reunion: "연인은 재회에서 다시 선택할 수 있는 관계인지, 서로의 의지가 맞는지를 봅니다.",
    feelings: "연인은 속마음에서 드러나지 않은 호감과 선택의 흔들림을 보여 줍니다.",
    career: "연인은 직업운에서 방향 선택, 협업, 가치 기준의 일치를 봅니다.",
    money: "연인은 금전운에서 선택의 비용과 장기적인 균형을 따집니다.",
    relationship: "연인은 대인관계에서 서로의 가치와 협력 방식이 맞는지 보여 줍니다.",
    health: "연인은 건강·에너지에서 마음과 몸의 선택이 얼마나 일치하는지 봅니다.",
    move: "연인은 이동·변화운에서 선택해야 할 방향과 동행 조건을 봅니다.",
    general: "연인은 전체 흐름에서 선택의 기준을 분명히 하라고 말합니다.",
  },
  "The Moon": {
    love: "달은 연애에서 불확실함과 감정의 흔들림, 말하지 못한 불안을 드러냅니다.",
    reunion: "달은 재회에서 미련과 오해, 아직 보이지 않는 조건을 함께 봅니다.",
    feelings: "달은 속마음에서 숨긴 두려움과 진짜 욕구를 가리킵니다.",
    career: "달은 직업운에서 방향이 불명확할 때 생기는 혼선과 추측을 알립니다.",
    money: "달은 금전운에서 불분명한 조건, 예상 못 한 비용, 계약의 모호함을 경고합니다.",
    relationship: "달은 대인관계에서 서로의 의도를 오해하기 쉬운 상태를 보여 줍니다.",
    health: "달은 건강·에너지에서 피로 누적과 수면, 감정 소모를 돌아보게 합니다.",
    move: "달은 이동·변화운에서 정보가 부족한 상태의 결정을 늦추라고 말합니다.",
    general: "달은 전체 흐름에서 보이지 않는 변수와 정리되지 않은 불안을 보여 줍니다.",
  },
  "The High Priestess": {
    love: "여사제는 연애에서 말하지 않은 감정과 아직 드러나지 않은 진심을 봅니다.",
    reunion: "여사제는 재회에서 드러나지 않은 마음과 숨은 연락 의도를 읽게 합니다.",
    feelings: "여사제는 속마음에서 겉과 속이 다른 태도와 비밀스러운 감정을 보여 줍니다.",
    career: "여사제는 직업운에서 표면에 보이지 않는 기회와 정보의 비대칭을 봅니다.",
    money: "여사제는 금전운에서 아직 공개되지 않은 조건과 숫자를 더 보라고 합니다.",
    relationship: "여사제는 대인관계에서 말을 아끼는 이유와 안전감의 필요를 보여 줍니다.",
    health: "여사제는 건강·에너지에서 무리한 공개보다 조용한 회복이 필요함을 뜻합니다.",
    move: "여사제는 이동·변화운에서 공개되지 않은 조건을 더 확인하라고 말합니다.",
    general: "여사제는 전체 흐름에서 숨은 정보와 직감을 함께 보라고 합니다.",
  },
  "The Devil": {
    love: "악마는 연애에서 강한 끌림, 집착, 끊기 어려운 패턴을 보여 줍니다.",
    reunion: "악마는 재회에서 미련과 집착이 회복을 가로막는지를 봅니다.",
    feelings: "악마는 속마음에서 말하지 못한 욕망과 두려움이 얽힌 상태를 드러냅니다.",
    career: "악마는 직업운에서 성과 압박, 과도한 통제, 벗어나기 어려운 구조를 봅니다.",
    money: "악마는 금전운에서 욕심, 과소비, 위험한 조건을 경고합니다.",
    relationship: "악마는 대인관계에서 의존과 통제, 끊기 어려운 얽힘을 보여 줍니다.",
    health: "악마는 건강·에너지에서 나쁜 습관과 과한 몰입이 소모를 키운다고 말합니다.",
    move: "악마는 이동·변화운에서 조건이 맞지 않는데도 붙잡는 집착을 경고합니다.",
    general: "악마는 전체 흐름에서 무엇에 묶여 있는지 먼저 보라고 합니다.",
  },
  "The Chariot": {
    love: "전차는 연애에서 적극성과 밀어붙이는 힘이 동시에 작동하는 카드입니다.",
    reunion: "전차는 재회에서 방향이 맞으면 빠르게 움직일 수 있지만 속도 조절이 필요함을 뜻합니다.",
    feelings: "전차는 속마음에서 드러내지 않은 욕구가 추진력으로 바뀌는 흐름을 보여 줍니다.",
    career: "전차는 직업운에서 목표 달성, 승부, 빠른 진전이 핵심입니다.",
    money: "전차는 금전운에서 빠른 수익과 빠른 지출이 함께 움직이므로 통제가 필요합니다.",
    relationship: "전차는 대인관계에서 주도권과 속도 조율이 중요하다는 뜻입니다.",
    health: "전차는 건강·에너지에서 과로보다 리듬을 잘 타는 것이 중요함을 알려 줍니다.",
    move: "전차는 이동·변화운에서 움직임이 빠르되 방향이 명확해야 함을 보여 줍니다.",
    general: "전차는 전체 흐름에서 목표를 정하고 직진할 때 힘이 붙습니다.",
  },
  "The Emperor": {
    love: "황제는 연애에서 안정감, 책임감, 관계의 구조를 봅니다.",
    reunion: "황제는 재회에서 관계를 다시 세울 규칙과 책임 분담을 봅니다.",
    feelings: "황제는 속마음에서 통제와 방어가 표면에 드러나는 상태를 보여 줍니다.",
    career: "황제는 직업운에서 조직, 역할, 리더십, 기준을 의미합니다.",
    money: "황제는 금전운에서 구조적인 자산 관리와 관리 능력을 강조합니다.",
    relationship: "황제는 대인관계에서 기준과 경계가 관계를 안정시킨다고 말합니다.",
    health: "황제는 건강·에너지에서 루틴과 구조가 회복에 중요하다고 봅니다.",
    move: "황제는 이동·변화운에서 조건과 계획이 맞을 때 움직이라고 말합니다.",
    general: "황제는 전체 흐름에서 기준과 구조가 운을 잡는다고 봅니다.",
  },
  Judgement: {
    love: "심판은 연애에서 과거를 정리하고 새로 시작할 수 있는지 봅니다.",
    reunion: "심판은 재회에서 용서와 재검토, 다시 부를 수 있는 관계인지 따집니다.",
    feelings: "심판은 속마음에서 숨겨 둔 감정이 다시 올라오는 순간을 뜻합니다.",
    career: "심판은 직업운에서 방향 재평가와 다음 단계의 부름을 의미합니다.",
    money: "심판은 금전운에서 정산, 마감, 다시 계산해야 할 항목을 보여 줍니다.",
    relationship: "심판은 대인관계에서 오해를 풀고 다시 선택할 관계인지 점검합니다.",
    health: "심판은 건강·에너지에서 회복 신호와 리셋의 필요성을 보여 줍니다.",
    move: "심판은 이동·변화운에서 기존 환경을 정리하고 새 단계로 넘어갈지 봅니다.",
    general: "심판은 전체 흐름에서 다시 선택해야 할 순간을 뜻합니다.",
  },
  "The World": {
    love: "세계는 연애에서 관계의 완성도와 마무리, 다음 단계의 성숙을 봅니다.",
    reunion: "세계는 재회에서 다시 연결되더라도 이전과 다른 완성 구조가 필요한지를 봅니다.",
    feelings: "세계는 속마음에서 감정의 정리와 진짜 의도 공개를 뜻합니다.",
    career: "세계는 직업운에서 성과의 완성, 다음 챕터로의 전환을 의미합니다.",
    money: "세계는 금전운에서 구조화된 자산과 완성된 흐름을 보여 줍니다.",
    relationship: "세계는 대인관계에서 역할이 정리된 협력과 성숙한 관계를 뜻합니다.",
    health: "세계는 건강·에너지에서 루틴이 자리 잡혀 회복이 안정되는 흐름입니다.",
    move: "세계는 이동·변화운에서 정착과 완성이 가능한 환경을 뜻합니다.",
    general: "세계는 전체 흐름에서 한 사이클의 완성과 다음 단계의 문을 뜻합니다.",
  },
};

function getTopicReadingDef(topic) {
  return TOPIC_READING_DEFS[topic] || TOPIC_READING_DEFS.general;
}

function normalizeTextList(items = [], limit = 5) {
  return Array.isArray(items)
    ? items.map((item) => normalizeDuplicatedSubjectParticles(toText(item))).filter(Boolean).slice(0, limit)
    : [];
}

function uniqueTextList(items = []) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const text = normalizeDuplicatedSubjectParticles(toText(item));
    if (!text) continue;
    const normalized = text.replace(/\s+/g, " ").toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(text);
  }
  return result;
}

function normalizeComparableText(text) {
  return toText(text)
    .replace(/[“”'"`]/g, "")
    .replace(/[\s.,!?·/()[\]{}]/g, "")
    .toLowerCase();
}

function getCardNamePattern() {
  return TAROT_CARDS
    .map((card) => toText(card.nameKr))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .join("|");
}

function fixCardNameParticleText(text) {
  const source = toText(text);
  const cardNamePattern = getCardNamePattern();
  if (!cardNamePattern) return source;
  return source
    .replace(new RegExp(`(${cardNamePattern})\\s*(정방향|역방향)가`, "g"), "'$1' 카드가 $2으로")
    .replace(new RegExp(`(${cardNamePattern})는`, "g"), "'$1' 카드는")
    .replace(new RegExp(`(${cardNamePattern})와`, "g"), "'$1' 카드와");
}

function cleanNumerologyText(text) {
  const normalizedSubjectText = normalizeDuplicatedSubjectParticles(fixCardNameParticleText(text));
  return normalizeDuplicatedSubjectParticles(normalizedSubjectText
    .replace(/은\(는\)/g, "은")
    .replace(/을\(를\)/g, "을")
    .replace(/가능성를/g, "가능성을")
    .replace(/감정를/g, "감정을")
    .replace(/\bundefined\b|\bnull\b|\bNaN\b/gi, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/([가-힣]+)과부터/g, "$1부터")
    .replace(/질문수 (\d+)가/g, "질문수 $1이")
    .replace(/질문수 (\d+)는/g, "질문수 $1은")
    .replace(/개인수 (\d+)는/g, "개인수 $1은")
    .replace(/\s{2,}/g, " ")
    .trim());
}

function sanitizeCrystalSoulText(text) {
  return cleanNumerologyText(text)
    .replace(/[\t\r]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeRepeatedCrystalSoulPhrases(text) {
  const source = sanitizeCrystalSoulText(text);
  const parts = source.match(/[^.!?。！？]+[.!?。！？]?/gu) || [source];
  const seen = new Set();
  return parts
    .filter((part) => {
      const normalized = normalizeComparableText(part);
      if (!normalized) return false;
      if (normalized.length >= 18 && seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .join(" ")
    .trim();
}

function sentenceJoin(parts = []) {
  return cleanNumerologyText(uniqueTextList(parts).join(" "));
}

function buildKeywordVisual(parts = []) {
  return uniqueTextList(parts).slice(0, 4).join(" · ");
}

function cardSuite(cardName = "") {
  const normalized = normalizeComparableText(cardName);
  if (!normalized) return "메이저 아르카나";
  if (/^(the)?(fool|magician|highpriestess|empress|emperor|hierophant|lovers|chariot|strength|hermit|wheeloffortune|justice|hangedman|death|temperance|devil|tower|star|moon|sun|judgement|world)$/.test(normalized)) {
    return "메이저 아르카나";
  }
  if (/(cup|cups|성배)/.test(normalized)) return "컵 아르카나";
  if (/(wand|wands|지팡이|완드)/.test(normalized)) return "완드 아르카나";
  if (/(sword|swords|검|소드)/.test(normalized)) return "소드 아르카나";
  if (/(pentacle|pentacles|coin|coins|별|동전|펜타클)/.test(normalized)) return "펜타클 아르카나";
  return "메이저 아르카나";
}

function buildTopicCardNote(cardName, topic) {
  const cardKey = toText(cardName);
  const notes = CARD_TOPIC_NOTES[cardKey];
  return (notes && (notes[topic] || notes.general)) || "";
}

function toText(value) {
  return String(value || "").trim();
}

function getOfficialCardNumber(card) {
  const id = Number(card?.id);
  return Number.isFinite(id) ? id : null;
}

function getCardIdentity(entry, index = 0) {
  const card = entry?.card || {};
  const cardNameKr = toText(card.nameKr || card.name || `카드 ${index + 1}`);
  const cardNameEn = toText(card.name || card.nameEn || cardNameKr);
  const orientation = entry?.orientation === "reversed" ? "reversed" : "upright";
  const orientationLabel = orientation === "reversed" ? "역방향" : "정방향";
  const arcanaNumber = getOfficialCardNumber(card);
  return {
    cardId: String(card.id ?? cardNameEn),
    cardNameKr,
    cardNameEn,
    arcanaNumber,
    orientation,
    orientationLabel,
  };
}

function splitMeaningKeywords(value) {
  return toText(value)
    .split(/[,/|·ㆍ]/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function tarotCardSlug(name) {
  return toText(name)
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "card";
}

function resolveNumerologyTarotCard(cardOrId) {
  if (cardOrId && typeof cardOrId === "object") {
    const id = Number(cardOrId.id);
    const byId = Number.isFinite(id) ? TAROT_CARDS.find((item) => Number(item.id) === id) : null;
    return byId || cardOrId;
  }
  const text = toText(cardOrId);
  const numeric = Number(text);
  if (Number.isFinite(numeric)) return TAROT_CARDS.find((item) => Number(item.id) === numeric) || null;
  return TAROT_CARDS.find((item) => toText(item.name).toLowerCase() === text.toLowerCase() || toText(item.nameKr) === text) || null;
}

// \ub118\ubc84\ub864\ub85c\uc9c0 \uce74\ub4dc id(0~21, \uba54\uc774\uc800)\ub97c \uacf5\uc720 \uce74\ub4dc \ub370\uc774\ud130(M00~M21)\ub85c \ub9e4\ud551\ud574
// topic\ubcc4(\uc5f0\uc560/\uc9c1\uc5c5/\uae08\uc804/\ub0b4\uba74) \uc804\ubb38 \ud574\uc11d \ubb38\uc7a5\uc744 \ub04c\uc5b4\uc628\ub2e4.
function sharedMajorModel(id) {
  if (!Number.isFinite(id) || id < 0 || id > 21) return null;
  return getTarotCardByAnyId(`M${String(id).padStart(2, "0")}`);
}

function sharedTopicSentence(model, orientation, field) {
  const m = model && (orientation === "reversed" ? model.reversed : model.upright);
  if (!m || typeof m !== "object") return "";
  const arr = m[field];
  return Array.isArray(arr) && arr.length ? toText(arr[0]) : "";
}

function sharedInnerSentence(model, orientation) {
  const m = model && (orientation === "reversed" ? model.reversed : model.upright);
  if (!m || typeof m !== "object") return "";
  return toText(m.psychologicalMeaning)
    || (Array.isArray(m.currentMind) && m.currentMind.length ? toText(m.currentMind[0]) : "")
    || (Array.isArray(m.general) && m.general.length ? toText(m.general[0]) : "");
}

function buildDefaultStructuredCardMeaning(card) {
  const id = Number(card?.id);
  const nameEn = toText(card?.name) || `Card ${Number.isFinite(id) ? id : ""}`.trim();
  const upright = splitMeaningKeywords(card?.upright);
  const reversed = splitMeaningKeywords(card?.reversed);
  const fallbackUpright = upright.length ? upright : ["\ud750\ub984", "\uc120\ud0dd", "\uc870\uc815"];
  const fallbackReversed = reversed.length ? reversed : ["\uc9c0\uc5f0", "\uc7ac\uc810\uac80", "\ubcf4\ub958"];
  const model = sharedMajorModel(id);
  const topic = (field, orientation, fallbackArr, extraFallback = "") =>
    sharedTopicSentence(model, orientation, field) || extraFallback || fallbackArr.join(", ");
  const inner = (orientation, fallbackArr) =>
    sharedInnerSentence(model, orientation) || fallbackArr.join(", ");
  return {
    id: Number.isFinite(id) ? `major_${String(id).padStart(2, "0")}_${tarotCardSlug(nameEn)}` : tarotCardSlug(nameEn),
    nameEn,
    nameKo: toText(card?.nameKr || card?.nameKo || nameEn),
    upright: fallbackUpright,
    reversed: fallbackReversed,
    love: {
      upright: topic("love", "upright", fallbackUpright, toText(card?.love)),
      reversed: topic("love", "reversed", fallbackReversed),
    },
    career: {
      upright: topic("career", "upright", fallbackUpright),
      reversed: topic("career", "reversed", fallbackReversed),
    },
    money: {
      upright: topic("money", "upright", fallbackUpright),
      reversed: topic("money", "reversed", fallbackReversed),
    },
    inner: {
      upright: inner("upright", fallbackUpright),
      reversed: inner("reversed", fallbackReversed),
    },
    myeongriBridge: fallbackUpright.slice(0, 3),
  };
}

function topicMeaningKey(topic) {
  const normalized = normalizeTopic(topic);
  if (normalized === "love" || normalized === "reunion" || normalized === "feelings" || normalized === "relationship") return "love";
  if (normalized === "career" || normalized === "move") return "career";
  if (normalized === "money") return "money";
  return "inner";
}

function getNumerologyTarotCardMeaning(cardOrId, orientation = "upright", topic = "general") {
  const card = resolveNumerologyTarotCard(cardOrId);
  const id = Number(card?.id);
  const structured = {
    ...buildDefaultStructuredCardMeaning(card || {}),
    ...(NUMEROLOGY_TAROT_CARD_MEANING_OVERRIDES[id] || {}),
  };
  const normalizedOrientation = orientation === "reversed" ? "reversed" : "upright";
  const topicKey = topicMeaningKey(topic);
  const selectedKeywords = Array.isArray(structured[normalizedOrientation]) ? structured[normalizedOrientation] : [];
  const topicMeaning = toText(structured?.[topicKey]?.[normalizedOrientation])
    || toText(structured?.inner?.[normalizedOrientation])
    || selectedKeywords.join(", ");
  return {
    ...structured,
    selectedOrientation: normalizedOrientation,
    selectedKeywords,
    topicKey,
    topicMeaning,
  };
}

function wantsSevenDayPlan(question = "") {
  return /7일|일주일|계획|루틴|스케줄|실천표/.test(toText(question));
}

function extractQuestionKeywords(question) {
  const stopWords = new Set([
    "오늘",
    "이번",
    "어떻게",
    "될까요",
    "해주세요",
    "저의",
    "나의",
    "대한",
    "관련",
    "문제",
    "고민",
    "정말",
    "앞으로",
    // 질문 어미가 핵심 키워드로 잡혀 카드 해석마다 "'괜찮을까요'가 핵심으로 올라오므로" 같은
    // 문장이 나오던 것을 막는다. 키워드는 질문의 주제어여야 한다.
    "괜찮을까요",
    "괜찮을지",
    "가능할까요",
    "있을까요",
    "좋을까요",
    "할까요",
    "될지",
    "어떤가요",
    "궁금합니다",
    "알고싶어요",
    "싶어요",
    "합니다",
    "입니다",
    "그리고",
    "하지만",
  ]);

  const words = toText(question)
    .toLowerCase()
    .match(/[가-힣a-z0-9]{2,}/g) || [];

  const unique = [];
  for (const rawWord of words) {
    const word = rawWord
      .replace(/(으로|에게|한테|부터|까지|처럼|보다|하고|이며|이랑|와|과|은|는|이|가|을|를|의|도|만)$/u, "")
      .trim();
    if (word.length < 2) continue;
    if (stopWords.has(word)) continue;
    if (!unique.includes(word)) unique.push(word);
    if (unique.length >= 5) break;
  }
  return unique;
}

function normalizeBirthDate(raw) {
  const text = toText(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  const date = new Date(`${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return text;
}

function normalizeTopic(raw) {
  const topic = toText(raw).toLowerCase();
  const alias = TOPIC_ALIAS_MAP[topic];
  const normalized = alias || topic;
  if (Object.prototype.hasOwnProperty.call(TOPIC_LABELS, normalized)) return normalized;
  return "general";
}

function reduceToSingleDigit(num, allowMaster = true) {
  if (allowMaster && (num === 11 || num === 22 || num === 33)) return num;
  if (num <= 9) return num;
  const reduced = String(num)
    .split("")
    .reduce((sum, digit) => sum + Number(digit), 0);
  return reduceToSingleDigit(reduced, allowMaster);
}

function calculateLifePath(birthDate) {
  const normalized = normalizeBirthDate(birthDate);
  if (!normalized) return 9;
  const digits = normalized.replace(/-/g, "").split("").map(Number);
  let sum = digits.reduce((acc, value) => acc + value, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum)
      .split("")
      .reduce((acc, value) => acc + Number(value), 0);
  }
  return sum;
}

function calculatePersonalDay(birthDate, now = new Date()) {
  const normalized = normalizeBirthDate(birthDate);
  if (!normalized) return 9;
  const [, month, day] = normalized.split("-").map(Number);
  const sum = now.getMonth() + 1 + now.getDate() + month + day;
  return reduceToSingleDigit(sum);
}

function calculateQuestionNumber(topic) {
  return TOPIC_NUMBERS[normalizeTopic(topic)] || 9;
}

function seededRandom(seed) {
  let hash = 0;
  for (let idx = 0; idx < seed.length; idx += 1) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(idx)) | 0;
  }
  return function random() {
    hash = Math.imul(2654435761, hash ^ (hash >>> 16));
    return ((hash ^ (hash >>> 15)) >>> 0) / 0xffffffff;
  };
}

function buildNumerologyContext({ birthDate, topic, now = new Date() }) {
  const normalizedBirthDate = normalizeBirthDate(birthDate);
  const normalizedTopic = normalizeTopic(topic);
  return {
    birthDate: normalizedBirthDate,
    topic: normalizedTopic,
    topicLabel: TOPIC_LABELS[normalizedTopic] || TOPIC_LABELS.general,
    lifePathNumber: calculateLifePath(normalizedBirthDate),
    personalDayNumber: calculatePersonalDay(normalizedBirthDate, now),
    questionNumber: calculateQuestionNumber(normalizedTopic),
  };
}

function selectCards(input) {
  const numerology = input?.numerology || buildNumerologyContext(input || {});
  const topic = normalizeTopic(input?.topic || numerology.topic);
  const birthDate = normalizeBirthDate(input?.birthDate || numerology.birthDate);
  const name = toText(input?.name || "");
  const now = input?.now instanceof Date ? input.now : new Date();
  const spreadPositions = SPREAD_POSITIONS[topic] || SPREAD_POSITIONS.general;
  const drawCount = Math.max(5, spreadPositions.length);
  const seed = `${birthDate}|${name}|${topic}|${now.toDateString()}`;
  const random = seededRandom(seed);

  const primaryNumbers = [
    Number(numerology.lifePathNumber) || 9,
    Number(numerology.personalDayNumber) || 9,
    Number(numerology.questionNumber) || 9,
  ];

  const weights = TAROT_CARDS.map((card) => {
    let score = 1;
    primaryNumbers.forEach((n) => {
      if (card.numbers.includes(n)) score += 3;
    });
    return score;
  });

  const selected = [];
  const used = new Set();
  const totalWeight = weights.reduce((acc, value) => acc + value, 0);

  for (let draw = 0; draw < drawCount; draw += 1) {
    const usedWeight = selected.reduce((acc, item) => acc + (weights[item.card.id] || 0), 0);
    let pick = random() * Math.max(1, totalWeight - usedWeight);

    for (let idx = 0; idx < TAROT_CARDS.length; idx += 1) {
      if (used.has(idx)) continue;
      pick -= weights[idx];
      if (pick <= 0) {
        used.add(idx);
        selected.push({
          card: TAROT_CARDS[idx],
          orientation: random() < 0.25 ? "reversed" : "upright",
          position: draw,
          positionLabel: spreadPositions[draw] || `포지션 ${draw + 1}`,
        });
        break;
      }
    }
  }

  return selected;
}

/**
 * 상담자의 수(생명수·오늘수·질문수)에 공명하도록 조율한 덱을 만든다.
 *
 * 반환값은 22장 전체의 **뽑는 순서**다. 사용자가 뒷면 카드를 하나 누르면
 * 그 자리의 카드가 아니라 이 순서의 다음 장을 받는다(실제 리딩에서 셔플한 덱을 위에서
 * 한 장씩 떼어 주는 방식과 같다). 그래서 어느 칸을 누르든 조율 가중치가 그대로 살아 있고,
 * 사용자는 "내가 뽑았다"는 체감을 잃지 않는다.
 *
 * `sessionSeed` 가 바뀌면 순서가 달라지므로 "덱 다시 섞기"가 가능하다.
 * (기존 selectCards 는 생년월일·이름·주제·날짜로만 시드를 만들어 같은 날 항상 같은 결과였다.)
 */
function buildAttunedDeck(input = {}) {
  const { numerology, topic, birthDate, name, sessionSeed = "", now } = input;
  const context = numerology || buildNumerologyContext({ birthDate, topic, now });
  const normalizedTopic = normalizeTopic(topic || context.topic);
  const normalizedBirthDate = normalizeBirthDate(birthDate || context.birthDate);
  const stamp = now instanceof Date ? now : new Date();
  const random = seededRandom(
    `${normalizedBirthDate}|${toText(name)}|${normalizedTopic}|${stamp.toDateString()}|${toText(sessionSeed)}`,
  );

  const primaryNumbers = [
    Number(context.lifePathNumber) || 9,
    Number(context.personalDayNumber) || 9,
    Number(context.questionNumber) || 9,
  ];

  const pool = TAROT_CARDS.map((card) => ({
    card,
    // 상담자의 수와 겹칠수록 먼저 나올 확률이 높아진다(공명하는 덱).
    weight: 1 + primaryNumbers.reduce((score, num) => score + (card.numbers.includes(num) ? 3 : 0), 0),
    orientation: random() < 0.25 ? "reversed" : "upright",
  }));

  const order = [];
  while (pool.length) {
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
    let pick = random() * totalWeight;
    let index = pool.length - 1;
    for (let idx = 0; idx < pool.length; idx += 1) {
      pick -= pool[idx].weight;
      if (pick <= 0) {
        index = idx;
        break;
      }
    }
    const [taken] = pool.splice(index, 1);
    order.push({ card: taken.card, orientation: taken.orientation });
  }

  return {
    topic: normalizedTopic,
    size: order.length,
    sessionSeed: toText(sessionSeed),
    order,
  };
}

/**
 * 조율된 덱에서 사용자가 누른 횟수만큼 위에서부터 떼어 스프레드 자리에 배치한다.
 * 사용자가 3장만 눌렀으면 3장만 돌려준다(중간 상태 렌더용).
 */
function drawFromAttunedDeck(deck, pickCount = 5, topic = "general") {
  const order = Array.isArray(deck?.order) ? deck.order : Array.isArray(deck) ? deck : [];
  const normalizedTopic = normalizeTopic(topic || deck?.topic);
  const spreadPositions = SPREAD_POSITIONS[normalizedTopic] || SPREAD_POSITIONS.general;
  const count = Math.max(0, Math.min(Number(pickCount) || 0, spreadPositions.length, order.length));
  return order.slice(0, count).map((item, idx) => ({
    card: item.card,
    orientation: item.orientation === "reversed" ? "reversed" : "upright",
    position: idx,
    positionLabel: spreadPositions[idx] || `포지션 ${idx + 1}`,
  }));
}

function normalizeCardInput(cards, topic = "general") {
  const normalizedTopic = normalizeTopic(topic);
  const spreadPositions = SPREAD_POSITIONS[normalizedTopic] || SPREAD_POSITIONS.general;
  const source = Array.isArray(cards) ? cards.slice(0, Math.max(5, spreadPositions.length)) : [];

  return source
    .map((item, idx) => {
      if (!item) return null;
      const id = Number(item?.card?.id ?? item?.id);
      const fallbackCard = Number.isFinite(id) ? TAROT_CARDS.find((card) => card.id === id) : null;
      const card = item.card && typeof item.card === "object" ? item.card : fallbackCard;
      if (!card || !toText(card.nameKr || card.name)) return null;
      const orientation = item.orientation === "reversed" ? "reversed" : "upright";
      return {
        card,
        orientation,
        position: Number.isFinite(Number(item.position)) ? Number(item.position) : idx,
        positionLabel: toText(item.positionLabel) || spreadPositions[idx] || `포지션 ${idx + 1}`,
      };
    })
    .filter(Boolean);
}

function buildNumerologyCardReading({ entry, topic, topicDef, numerology, question, questionKeywords, index }) {
  const identity = getCardIdentity(entry, index);
  const { cardId, cardNameKr, cardNameEn, arcanaNumber, orientation, orientationLabel } = identity;
  const positionTitle = toText(entry?.positionLabel) || topicDef.positionSet[index] || `포지션 ${index + 1}`;
  const positionQuestion = topicDef.positionSet[index] || positionTitle;
  const questionFocus = questionKeywords[index % Math.max(questionKeywords.length, 1)] || topicDef.focus.split("，").join(" ").split(",")[0] || "핵심 흐름";
  const suit = cardSuite(cardNameEn);
  const lifePath = Number(numerology?.lifePathNumber || 9);
  const personalDay = Number(numerology?.personalDayNumber || 9);
  const questionNumber = Number(numerology?.questionNumber || 9);
  const structuredMeaning = getNumerologyTarotCardMeaning(entry?.card || cardId, orientation, topic);
  const selectedMeaningKeywords = structuredMeaning.selectedKeywords.filter(Boolean);
  const selectedMeaningText = selectedMeaningKeywords.join(", ") || toText(orientation === "reversed" ? entry?.card?.reversed : entry?.card?.upright) || toText(entry?.card?.upright || entry?.card?.reversed || "");
  const cardMeta = selectedMeaningText;
  const topicNote = buildTopicCardNote(cardNameEn, topic);
  const cardNumberText = arcanaNumber === null ? "번호가 없는 카드" : `${arcanaNumber}번 카드`;
  const orientationNote = orientation === "reversed"
    ? "역방향으로 나온 만큼 같은 반응을 반복하기 전에 잠시 멈추고 확인할 부분이 있습니다."
    : "정방향으로 나온 만큼 지금 확인할 수 있는 행동으로 연결될 여지가 있습니다.";
  // 🔴 포지션 문구는 주제별로 따로 쓰지 않는다.
  // 다섯 자리의 서사 축(출발 → 반응 → 장애물 → 방법 → 결과)은 9개 주제가 공유하고,
  // 자리 이름만 SPREAD_POSITIONS[topic] 에서 그대로 가져오므로 금전·건강 상담에도 맞는 문장이 나온다.
  // (예전에는 5개 문구가 연애 스프레드 문장으로 하드코딩돼 있었다.)
  const role = getPositionRole(index);
  const cardNumerology = getCardNumerology(entry?.card || {});
  const numberRelation = resolveNumberRelation(cardNumerology, numerology);
  const cardVoice = getNumberVoice(cardNumerology.isZero ? 9 : cardNumerology.reducedNumber);
  const roleLead = `${index + 1}번째 자리는 ${role.reads(positionTitle)}를 봅니다.`;
  const roleAdvice = role.lens;
  const roleHiddenPattern = numberRelation.type === "tension"
    ? `이 자리에서는 ${numberRelation.note}이 서로를 밀어내며, 어느 한쪽을 택하지 못해 같은 자리를 맴도는 흐름이 숨어 있습니다.`
    : numberRelation.type === "resonance"
      ? `이 자리에서는 자기 결이 그대로 나온 만큼, 익숙한 방식을 의심 없이 반복하는 흐름이 숨어 있을 수 있습니다.`
      : `이 자리에서는 ${cardVoice.shadow}이(가) ${role.focus}을(를) 실제보다 크게 보이게 만드는 흐름이 숨어 있을 수 있습니다.`;
  const directMeaning = sentenceJoin([
    `이 자리에 나온 '${cardNameKr}' 카드는 ${cardNumberText}이며 ${orientationLabel}입니다.`,
    cardMeta || `${suit}의 기본 상징이 질문의 핵심을 비춥니다.`,
    orientationNote,
    topicNote,
  ]);
  const topicMeaningText = toText(structuredMeaning.topicMeaning);
  // 공유 카드 데이터의 topic 해석은 완결 문장(…다.)이므로 독립 문장으로 이어 붙이고,
  // 오버라이드(키워드 구절)는 기존처럼 '을/를 중심으로 읽습니다' 패턴으로 자연스럽게 처리한다.
  const topicIsSentence = /[.!?]$/.test(topicMeaningText);
  const topicObjParticle = (() => {
    const ch = topicMeaningText.slice(-1);
    const code = ch.charCodeAt(0);
    if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return "를";
    return (code - 0xac00) % 28 !== 0 ? "을" : "를";
  })();
  const topicSentence = topicIsSentence
    ? `${topicDef.label} 질문에서 이 카드가 짚는 핵심은 다음과 같습니다. ${topicMeaningText}`
    : `${topicDef.label} 질문에서는 ${topicMeaningText}${topicObjParticle} 중심으로 읽습니다.`;
  const matchedDirectMeaning = sentenceJoin([
    `'${cardNameKr}' 카드 ${orientationLabel}은 ${selectedMeaningText}의 흐름을 먼저 비춥니다.`,
    topicSentence,
    `명리학으로는 ${structuredMeaning.myeongriBridge.join(", ")} 기운과 연결해 보아야 합니다.`,
    orientationNote,
    topicNote,
  ]);
  // 이 다리 문장이 수비학과 타로를 실제로 잇는 지점이다.
  // 카드의 수 ↔ 상담자의 수 관계(공명/보완/긴장/중립)에 따라 완전히 다른 이야기를 한다.
  const numerologyBridge = sentenceJoin([
    buildNumerologyBridge({
      cardNumerology,
      relation: numberRelation,
      cardName: cardNameKr,
      orientation,
      positionLabel: positionTitle,
      index,
    }),
    `참고로 이번 상담의 기준 수는 생명수 ${lifePath}, 오늘수 ${personalDay}, 질문수 ${questionNumber}${numberParticle(questionNumber, "입니다", "입니다")}.`,
  ]);
  const contextualInterpretation = sentenceJoin([
    roleLead,
    `질문에서 '${questionFocus}'${wordParticle(questionFocus, "이", "가")} 핵심으로 올라오므로, '${cardNameKr}' 카드는 이 부분을 추측이 아니라 확인 가능한 반응으로 읽으라고 조언합니다.`,
    roleAdvice,
    numberRelation.type === "tension"
      ? `${numberRelation.userLabel} ${numberRelation.userNumber}${numberParticle(numberRelation.userNumber, "과", "와")} 부딪치는 자리라, 여기서는 평소 방식을 한 번 접어 두는 편이 빠릅니다.`
      : numberRelation.type === "resonance"
        ? `${numberRelation.userLabel} ${numberRelation.userNumber}${numberParticle(numberRelation.userNumber, "과", "와")} 같은 수가 나온 자리라, 이미 알고 있던 감각을 믿어도 되는 구간입니다.`
        : numberRelation.type === "complement"
          ? `${numberRelation.userLabel} ${numberRelation.userNumber}${numberParticle(numberRelation.userNumber, "을", "를")} 받쳐 주는 수라, 이 자리에서는 도움을 받는 쪽이 자연스럽습니다.`
          : `내 수와 겹치지 않는 자리라, 익숙한 판단보다 눈으로 확인한 사실을 먼저 두세요.`,
  ]);
  const hiddenPattern = sentenceJoin([
    roleHiddenPattern,
    `'${cardNameKr}' 카드의 ${orientationLabel} 흐름은 ${orientation === "reversed" ? "지연, 회피, 아직 정리되지 않은 전제" : "기대, 선택, 조정해야 할 태도"}를 함께 점검하게 합니다.`,
    `${positionTitle}${wordParticle(positionTitle, "은", "는")} 이 패턴을 반복할지, 끊어낼지 판단하는 검사 지점입니다.`,
  ]);
  const practicalAdvice = sentenceJoin([
    `${topicDef.actionRules[index % topicDef.actionRules.length]}`,
    // 수가 지시하는 행동 — 카드마다 실제로 달라진다.
    cardVoice.act,
    `${positionTitle}에서 오늘 확인할 것은 '${questionFocus}'이며, 행동은 ${orientation === "reversed" ? "정리와 보류" : "확인과 실행"} 중 하나로 좁히는 편이 좋습니다.`,
  ]);
  const caution = sentenceJoin([
    `${topicDef.cautionRules[index % topicDef.cautionRules.length]}`,
    `${cardVoice.shadow}${wordParticle(cardVoice.shadow, "으로", "로")} 기울면 이 자리의 장점이 그대로 단점이 됩니다.`,
    `${orientationLabel}이라는 방향만으로 결론내리지 말고, ${positionTitle}에서 실제로 확인되는 말과 행동을 함께 보세요.`,
  ]);

  return {
    order: index + 1,
    title: positionTitle,
    positionTitle,
    question: positionQuestion,
    keywordFocus: questionFocus,
    cardId,
    cardNameKr,
    cardNameEn,
    arcanaNumber,
    orientation,
    orientationLabel,
    cardMeaning: matchedDirectMeaning,
    numerologyBridge,
    topicInterpretation: contextualInterpretation,
    hiddenPattern,
    actionTip: practicalAdvice,
    caution,
    keywordVisual: buildKeywordVisual([questionFocus, cardNameKr, topicDef.label, suit]),
    cardNumber: arcanaNumber,
    usedMeaningKeywords: selectedMeaningKeywords,
    meaningTopicKey: structuredMeaning.topicKey,
    directMeaning: matchedDirectMeaning,
    contextualInterpretation,
    practicalAdvice,
    // 수비학 결합 결과 — 결과 화면이 "몇 번 수, 어떤 관계"를 배지로 보여 줄 수 있게 함께 내보낸다.
    positionRole: role.slot,
    cardReducedNumber: cardNumerology.isZero ? 0 : cardNumerology.reducedNumber,
    numberKeyword: cardVoice.keyword,
    numberRelation: numberRelation.type,
    numberRelationLabel: numberRelation.typeLabel,
    numberRelationWith: numberRelation.userLabel,
    numberRelationValue: numberRelation.userNumber,
  };
}

function buildTopicReading(topic, numerology, questionKeywords, name, question) {
  const topicDef = getTopicReadingDef(topic);
  const lifePath = Number(numerology?.lifePathNumber || 9);
  const personalDay = Number(numerology?.personalDayNumber || 9);
  const questionNumber = Number(numerology?.questionNumber || 9);
  const userName = toText(name) || "당신";
  const questionText = toText(question) || `${topicDef.label} 흐름을 읽고 싶습니다.`;
  const topKeywords = questionKeywords.slice(0, 3).join(", ") || topicDef.focus;

  return {
    topic,
    topicLabel: topicDef.label,
    topicOverview: sentenceJoin([
      `${userName}님의 ${topicDef.label} 흐름은 ${topicDef.focus}의 축을 중심으로 읽어야 하며, 질문 '${questionText}' 안에서 가장 선명한 단서는 '${topKeywords}'입니다.`,
      topicDef.topicOverviewSeed,
    ]),
    whyThisTopicMatters: sentenceJoin([
      `${topicDef.whyThisTopicMattersSeed} 생명수 ${lifePath}, 개인수 ${personalDay}, 질문수 ${questionNumber}가 함께 움직이면서 지금의 선택이 ${topicDef.label}의 다음 흐름을 바꿀 수 있습니다.`,
    ]),
    numerologyTopicBridge: sentenceJoin([
      `${topicDef.bridgeSeed} ${topicDef.numerologyLens}`,
      `특히 질문수 ${questionNumber}는 ${topicDef.label}에서 가장 먼저 살필 자리를 알려 주고, 개인수 ${personalDay}는 오늘 무리하지 않고 움직일 속도를 정합니다.`,
    ]),
  };
}

function buildCategoryDeepDive(topic, numerology, cardReadings) {
  const topicDef = getTopicReadingDef(topic);
  const first = cardReadings[0] || {};
  const second = cardReadings[1] || {};
  const third = cardReadings[2] || {};
  const fourth = cardReadings[3] || {};
  const fifth = cardReadings[4] || {};
  return {
    currentFlow: sentenceJoin([
      `${topicDef.currentFlowSeed}`,
      `첫 번째 '${first.cardNameKr || first.title || "첫 포지션"}' 카드는 출발점을, 두 번째 '${second.cardNameKr || second.title || "두 번째 포지션"}' 카드는 반응과 기회의 방향을 비춥니다.`,
    ]),
    hiddenIssue: sentenceJoin([
      `${topicDef.hiddenIssueSeed}`,
      `세 번째 '${third.cardNameKr || third.title || "세 번째 포지션"}' 카드가 놓인 지점은 반복 패턴과 미처 정리되지 않은 전제 조건을 드러냅니다.`,
    ]),
    opportunity: sentenceJoin([
      `${topicDef.opportunitySeed}`,
      `네 번째 '${fourth.cardNameKr || fourth.title || "네 번째 포지션"}' 카드와 다섯 번째 '${fifth.cardNameKr || fifth.title || "다섯 번째 포지션"}' 카드는 ${topicDef.label}이 현실에서 열 수 있는 작은 문을 비춥니다.`,
    ]),
    risk: sentenceJoin([
      `${topicDef.riskSeed}`,
      `특히 '${third.cardNameKr || third.title || "중간 포지션"}' 카드에서 드러난 경고를 가볍게 넘기면 같은 패턴이 반복될 수 있습니다.`,
    ]),
    timing: sentenceJoin([
      `${topicDef.timingSeed}`,
      `생명수 ${Number(numerology?.lifePathNumber || 9)}와 개인일수 ${Number(numerology?.personalDayNumber || 9)}의 조합은 오늘의 감정만으로 결론내리기보다 짧은 관찰 구간을 두고 더 선명해집니다.`,
    ]),
  };
}

function buildConclusion(topic, numerology, cardReadings, topicReading, categoryDeepDive, question = "") {
  const topicDef = getTopicReadingDef(topic);
  const actionPool = uniqueTextList([
    ...topicDef.actionRules,
    ...(cardReadings.map((item) => item.actionTip).filter(Boolean)),
  ]);
  const doThis = actionPool.slice(0, 3);
  const avoidThis = uniqueTextList(topicDef.cautionRules).slice(0, 3);
  const sevenDayPlan = wantsSevenDayPlan(question) ? topicDef.sevenDayPlan.slice(0, 7) : [];
  return {
    summary: sentenceJoin([
      `이번 상담의 핵심은 ${topicDef.focus}를 실제로 확인 가능한 말과 행동으로 좁히는 데 있습니다.`,
      `${categoryDeepDive.currentFlow} ${categoryDeepDive.opportunity}`,
    ]),
    doThis,
    avoidThis,
    sevenDayPlan,
    finalWord: sentenceJoin([
      `${topicDef.finalWordSeed}`,
      "카드와 숫자는 선택을 대신하지 않습니다. 지금 확인할 수 있는 작은 행동부터 고르면 다음 방향도 조금 더 분명해집니다.",
    ]),
  };
}

function buildFallbackInterpretation({ numerology, cards, topic, name, question }) {
  const normalizedTopic = normalizeTopic(topic);
  const topicDef = getTopicReadingDef(normalizedTopic);
  const safeCards = normalizeCardInput(cards, normalizedTopic).slice(0, 5);
  const questionKeywords = extractQuestionKeywords(question);
  const topicReading = buildTopicReading(normalizedTopic, numerology, questionKeywords, name, question);
  const cardReadings = safeCards.map((entry, idx) => buildNumerologyCardReading({
    entry,
    topic: normalizedTopic,
    topicDef,
    numerology,
    question,
    questionKeywords,
    index: idx,
  }));
  const categoryDeepDive = buildCategoryDeepDive(normalizedTopic, numerology, cardReadings);
  const conclusion = buildConclusion(normalizedTopic, numerology, cardReadings, topicReading, categoryDeepDive, question);
  // 스프레드 총합수 — 5장의 번호를 더해 이번 상담을 총괄하는 한 장을 뽑는 실제 타로 기법.
  const quintessence = buildQuintessenceReading(
    buildQuintessence(safeCards, TAROT_CARDS),
    numerology,
    topicDef.label,
  );
  const numberPattern = buildNumberPattern(safeCards.map((entry) => getCardNumerology(entry?.card || {})));
  const lifeData = NUMEROLOGY_DATA[numerology.lifePathNumber] || NUMEROLOGY_DATA[9];
  const userName = toText(name) || "순례자";
  const questionText = toText(question) || `${topicDef.label} 흐름이 궁금합니다.`;
  const numerologyReading = sentenceJoin([
    `${userName}님의 생명수 ${numerology.lifePathNumber}는 '${lifeData.keyword}'의 흐름을 품고 있습니다.`,
    `${lifeData.meaning}의 성향은 이번 질문에서 판단을 서두르기보다 기준을 정리하는 쪽으로 쓰일 때 더 안정적입니다.`,
  ]);
  // 직접적인 답은 총합수(스프레드 전체를 총괄하는 한 장)에서 끌어온다.
  const directAnswer = sentenceJoin([
    quintessence
      ? `질문 "${questionText}"에 대한 답부터 말씀드리면, ${quintessence.headline} ${quintessence.summary}`
      : `질문 "${questionText}"에 대해 지금 바로 말할 수 있는 답은, 가능성을 단정하기보다 확인할 수 있는 반응과 내가 원하는 기준을 함께 봐야 한다는 것입니다.`,
    cardReadings[0]?.cardNameKr && cardReadings[4]?.cardNameKr
      ? `첫 카드 '${cardReadings[0].cardNameKr}'와 마지막 카드 '${cardReadings[4].cardNameKr}'가 서로 다른 속도를 보여 주므로, 감정만으로 결론내리기보다 단계적으로 확인하는 편이 좋습니다.`
      : "",
  ]);
  const cardStory = sentenceJoin(cardReadings.map((item, idx) => {
    const next = cardReadings[idx + 1];
    if (!next) return `마지막 '${item.cardNameKr}' 카드는 ${item.positionTitle} 자리에서 가까운 시기의 방향을 정리합니다.`;
    return `'${item.cardNameKr}' 카드가 ${item.positionTitle}을 맡고, 다음 '${next.cardNameKr}' 카드는 ${next.positionTitle}으로 흐름을 이어 줍니다.`;
  }));

  return {
    readingId: "",
    title: `${topicDef.label} 수비학 타로 상담`,
    topic: normalizedTopic,
    userQuestion: questionText,
    numerology,
    opening: `${userName}님, 먼저 질문의 핵심부터 차분히 보겠습니다.`,
    directAnswer,
    numerologyInsight: {
      summary: sentenceJoin([numerologyReading, numberPattern.summary]),
      relevantNumbers: [
        {
          label: numerologyTarotText("numerologyTarot.lifePathNumber"),
          value: String(numerology.lifePathNumber),
          meaning: lifeData.keyword,
          relevance: `타고난 선택 방식입니다. ${getNumberVoice(numerology.lifePathNumber).core}이(가) 기본값으로 작동합니다.`,
        },
        {
          // 오늘수는 그동안 계산만 하고 결과에 내보내지 않았다.
          label: "오늘수",
          value: String(numerology.personalDayNumber),
          meaning: (NUMEROLOGY_DATA[numerology.personalDayNumber] || NUMEROLOGY_DATA[9]).keyword,
          relevance: `오늘 움직일 수 있는 속도입니다. ${getNumberVoice(numerology.personalDayNumber).act}`,
        },
        {
          label: numerologyTarotText("numerologyTarot.questionNumber"),
          value: String(numerology.questionNumber),
          meaning: topicDef.focus,
          relevance: `이번 질문 자체가 품은 수입니다. ${getNumberVoice(numerology.questionNumber).arena}에서 먼저 확인할 초점을 좁힙니다.`,
        },
      ],
    },
    // 스프레드 총합수 — 다섯 장을 한 장으로 압축한 결론 축.
    quintessence,
    numberPattern,
    cardStory,
    cards: cardReadings.map((item) => ({
      cardId: item.cardId,
      cardName: item.cardNameKr,
      arcanaNumber: item.arcanaNumber,
      orientation: item.orientation,
      positionTitle: item.positionTitle,
      directMeaning: item.directMeaning,
      contextualInterpretation: item.contextualInterpretation,
      practicalAdvice: item.practicalAdvice,
      caution: item.caution,
      usedMeaningKeywords: item.usedMeaningKeywords,
      meaningTopicKey: item.meaningTopicKey,
      // 수비학 결합 — 결과 화면의 "수 배지"와 관계 설명이 이 값들을 쓴다.
      numerologyBridge: item.numerologyBridge,
      positionRole: item.positionRole,
      cardReducedNumber: item.cardReducedNumber,
      numberKeyword: item.numberKeyword,
      numberRelation: item.numberRelation,
      numberRelationLabel: item.numberRelationLabel,
      numberRelationWith: item.numberRelationWith,
      numberRelationValue: item.numberRelationValue,
    })),
    synthesis: {
      currentSituation: categoryDeepDive.currentFlow,
      opportunity: categoryDeepDive.opportunity,
      challenge: categoryDeepDive.hiddenIssue,
      likelyDirection: categoryDeepDive.timing,
    },
    // 총합수가 지시하는 행동을 맨 앞에 둔다 — 이번 상담 전체를 관통하는 한 가지.
    nextActions: uniqueTextList([quintessence?.advice, ...conclusion.doThis]).slice(0, 3),
    counselorClosing: conclusion.finalWord,
    disclaimer: "이 상담은 상징을 바탕으로 현재의 선택지를 정리하는 안내이며, 건강·법률·투자·안전 문제는 전문적인 판단을 대신하지 않습니다.",
    numerologyReading,
    coreMessage: directAnswer,
    topicReading,
    cardReadings,
    categoryDeepDive,
    conclusion,
    quality: {
      source: "fallback",
      topicReflected: true,
      cardCount: cardReadings.length,
      warnings: [],
    },
  };
}

export {
  NUMEROLOGY_DATA,
  TAROT_CARDS,
  TOPIC_LABELS,
  SPREAD_POSITIONS,
  normalizeBirthDate,
  normalizeTopic,
  calculateLifePath,
  calculatePersonalDay,
  calculateQuestionNumber,
  buildNumerologyContext,
  selectCards,
  buildAttunedDeck,
  drawFromAttunedDeck,
  normalizeCardInput,
  getNumerologyTarotCardMeaning,
  extractQuestionKeywords,
  buildFallbackInterpretation,
};
