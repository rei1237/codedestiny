import { buildWarningCardMeaningOverride } from "./warning-card-guard.mjs";
import { RICH_CARD_OVERRIDES } from "./rich-card-meanings.mjs";

const QUESTION_TYPES = [
  "love",
  "relationship",
  "reunion",
  "exMind",
  "currentMind",
  "future",
  "career",
  "money",
  "daily",
  "general",
];

const MAJOR_DEFS = [
  { code: "M00", number: 0, slug: "fool", nameKo: "바보", nameEn: "The Fool", keywords: ["시작", "도약", "모험", "순수"], focus: "새로운 시작" },
  { code: "M01", number: 1, slug: "magician", nameKo: "마법사", nameEn: "The Magician", keywords: ["의지", "실행", "집중", "주도권"], focus: "의지의 발현" },
  { code: "M02", number: 2, slug: "high_priestess", nameKo: "여사제", nameEn: "The High Priestess", keywords: ["직관", "침묵", "내면", "통찰"], focus: "숨은 진심" },
  { code: "M03", number: 3, slug: "empress", nameKo: "여황제", nameEn: "The Empress", keywords: ["풍요", "돌봄", "성장", "안정"], focus: "정서적 풍요" },
  { code: "M04", number: 4, slug: "emperor", nameKo: "황제", nameEn: "The Emperor", keywords: ["질서", "책임", "통제", "기준"], focus: "관계의 규칙" },
  { code: "M05", number: 5, slug: "hierophant", nameKo: "교황", nameEn: "The Hierophant", keywords: ["신뢰", "전통", "약속", "규범"], focus: "신뢰의 프레임" },
  { code: "M06", number: 6, slug: "lovers", nameKo: "연인", nameEn: "The Lovers", keywords: ["선택", "호감", "결합", "조화"], focus: "감정의 선택" },
  { code: "M07", number: 7, slug: "chariot", nameKo: "전차", nameEn: "The Chariot", keywords: ["추진", "속도", "통제", "의지"], focus: "속도 조절" },
  { code: "M08", number: 8, slug: "strength", nameKo: "힘", nameEn: "Strength", keywords: ["인내", "절제", "용기", "회복"], focus: "감정의 절제" },
  { code: "M09", number: 9, slug: "hermit", nameKo: "은둔자", nameEn: "The Hermit", keywords: ["성찰", "거리", "정리", "관찰"], focus: "거리 두기" },
  { code: "M10", number: 10, slug: "wheel_of_fortune", nameKo: "운명의 수레바퀴", nameEn: "Wheel of Fortune", keywords: ["전환", "순환", "타이밍", "변수"], focus: "국면 전환" },
  { code: "M11", number: 11, slug: "justice", nameKo: "정의", nameEn: "Justice", keywords: ["균형", "공정", "책임", "판단"], focus: "균형 회복" },
  { code: "M12", number: 12, slug: "hanged_man", nameKo: "매달린 사람", nameEn: "The Hanged Man", keywords: ["유예", "재해석", "멈춤", "통찰"], focus: "결정 유예" },
  { code: "M13", number: 13, slug: "death", nameKo: "죽음", nameEn: "Death", keywords: ["종결", "변화", "전환", "놓아줌"], focus: "패턴 종료" },
  { code: "M14", number: 14, slug: "temperance", nameKo: "절제", nameEn: "Temperance", keywords: ["조율", "균형", "회복", "완화"], focus: "페이스 조절" },
  { code: "M15", number: 15, slug: "devil", nameKo: "악마", nameEn: "The Devil", keywords: ["집착", "유혹", "중독", "소유"], focus: "집착 분리" },
  { code: "M16", number: 16, slug: "tower", nameKo: "탑", nameEn: "The Tower", keywords: ["붕괴", "충격", "각성", "단절"], focus: "급격한 재편" },
  { code: "M17", number: 17, slug: "star", nameKo: "별", nameEn: "The Star", keywords: ["희망", "회복", "신뢰", "가능성"], focus: "회복의 빛" },
  { code: "M18", number: 18, slug: "moon", nameKo: "달", nameEn: "The Moon", keywords: ["불안", "의심", "환상", "무의식"], focus: "불안 해석" },
  { code: "M19", number: 19, slug: "sun", nameKo: "태양", nameEn: "The Sun", keywords: ["개방", "활력", "기쁨", "명료"], focus: "긍정적 개방" },
  { code: "M20", number: 20, slug: "judgement", nameKo: "심판", nameEn: "Judgement", keywords: ["재평가", "재기회", "각성", "호출"], focus: "관계 재판단" },
  { code: "M21", number: 21, slug: "world", nameKo: "세계", nameEn: "The World", keywords: ["완성", "통합", "성숙", "마무리"], focus: "성숙한 결론" },
];

const SUIT_DEFS = [
  { suit: "wands", code: "W", nameKo: "완드", nameEn: "Wands", element: "fire", tone: "행동과 열정" },
  { suit: "cups", code: "C", nameKo: "컵", nameEn: "Cups", element: "water", tone: "감정과 정서" },
  { suit: "swords", code: "S", nameKo: "소드", nameEn: "Swords", element: "air", tone: "생각과 방어" },
  { suit: "pentacles", code: "P", nameKo: "펜타클", nameEn: "Pentacles", element: "earth", tone: "현실과 안정" },
];

const RANK_DEFS = [
  { number: 1, code: "01", nameKo: "에이스", nameEn: "Ace", keywords: ["시작", "씨앗"], rankTone: "시작점" },
  { number: 2, code: "02", nameKo: "투", nameEn: "Two", keywords: ["선택", "균형"], rankTone: "양가감정" },
  { number: 3, code: "03", nameKo: "쓰리", nameEn: "Three", keywords: ["확장", "소통"], rankTone: "확장 단계" },
  { number: 4, code: "04", nameKo: "포", nameEn: "Four", keywords: ["안정", "정체"], rankTone: "고정 구간" },
  { number: 5, code: "05", nameKo: "파이브", nameEn: "Five", keywords: ["갈등", "흔들림"], rankTone: "충돌 구간" },
  { number: 6, code: "06", nameKo: "식스", nameEn: "Six", keywords: ["회복", "추억"], rankTone: "회복 구간" },
  { number: 7, code: "07", nameKo: "세븐", nameEn: "Seven", keywords: ["방어", "계산"], rankTone: "경계 구간" },
  { number: 8, code: "08", nameKo: "에잇", nameEn: "Eight", keywords: ["압박", "이동"], rankTone: "전환 직전" },
  { number: 9, code: "09", nameKo: "나인", nameEn: "Nine", keywords: ["내면", "마무리"], rankTone: "정리 직전" },
  { number: 10, code: "10", nameKo: "텐", nameEn: "Ten", keywords: ["완성", "종결"], rankTone: "종결 단계" },
  { number: 11, code: "11", nameKo: "페이지", nameEn: "Page", keywords: ["소식", "탐색"], rankTone: "새로운 신호" },
  { number: 12, code: "12", nameKo: "나이트", nameEn: "Knight", keywords: ["돌진", "행동"], rankTone: "급한 전개" },
  { number: 13, code: "13", nameKo: "퀸", nameEn: "Queen", keywords: ["통찰", "관리"], rankTone: "정서적 통제" },
  { number: 14, code: "14", nameKo: "킹", nameEn: "King", keywords: ["책임", "결단"], rankTone: "책임 있는 결론" },
];

const CARD_TO_FILENAME = {
  M00: "thefool.jpeg", M01: "themagician.jpeg", M02: "thehighpriestess.jpeg", M03: "theempress.jpeg",
  M04: "theemperor.jpeg", M05: "thehierophant.jpeg", M06: "TheLovers.jpg", M07: "thechariot.jpeg",
  M08: "thestrength.jpeg", M09: "thehermit.jpeg", M10: "wheeloffortune.jpeg", M11: "justice.jpeg",
  M12: "thehangedman.jpeg", M13: "death.jpeg", M14: "temperance.jpeg", M15: "thedevil.jpeg",
  M16: "thetower.jpeg", M17: "thestar.jpeg", M18: "themoon.jpeg", M19: "thesun.jpeg",
  M20: "judgement.jpeg", M21: "theworld.jpeg",
  W01: "aceofwands.jpeg", W02: "twoofwands.jpeg", W03: "threeofwands.jpeg", W04: "fourofwands.jpeg",
  W05: "fiveofwands.jpeg", W06: "sixofwands.jpeg", W07: "sevenofwands.jpeg", W08: "eightofwands.jpeg",
  W09: "nineofwands.jpeg", W10: "tenofwands.jpeg", W11: "pageofwands.jpeg", W12: "knightofwands.jpeg",
  W13: "queenofwands.jpeg", W14: "kingofwands.jpeg",
  C01: "aceofcups.jpeg", C02: "twoofcups.jpeg", C03: "threeofcups.jpeg", C04: "fourofcups.jpeg",
  C05: "fiveofcups.jpeg", C06: "sixofcups.jpeg", C07: "sevenofcups.jpeg", C08: "eightofcups.jpeg",
  C09: "nineofcups.jpeg", C10: "tenofcups.jpeg", C11: "pageofcups.jpeg", C12: "knightofcups.jpeg",
  C13: "queenofcups.jpeg", C14: "kingofcups.jpeg",
  S01: "aceofswords.jpeg", S02: "twoofswords.jpeg", S03: "threeofswords.jpeg", S04: "fourofswords.jpeg",
  S05: "fiveofswords.jpeg", S06: "sixofswords.jpeg", S07: "sevenofswords.jpeg", S08: "eightofswords.jpeg",
  S09: "nineofswords.jpeg", S10: "tenofswords.jpeg", S11: "pageofswords.jpeg", S12: "knightofswords.jpeg",
  S13: "queenofswords.jpeg", S14: "kingofswords.jpeg",
  P01: "aceofpentacles.jpeg", P02: "twoofpentacles.jpeg", P03: "threeofpentacles.jpeg", P04: "fourofpentacles.jpeg",
  P05: "fiveofpentacles.jpeg", P06: "sixofpentacles.jpeg", P07: "sevenofpentacles.jpeg", P08: "eightofpentacles.jpeg",
  P09: "nineofpentacles.jpeg", P10: "tenofpentacles.jpeg", P11: "pageofpentacles.jpeg", P12: "knightofpentacles.jpeg",
  P13: "queenofpentacles.jpeg", P14: "kingofpentacles.jpeg",
};

const SWORD_EIGHT_OVERRIDE = {
  upright: {
    love: ["마음이 묶여 있어 표현하고 싶어도 쉽게 말을 꺼내지 못합니다."],
    reunion: ["연락하고 싶은 마음은 분명하지만 두려움과 자존심이 동시에 걸려 스스로 움직임을 묶는 흐름입니다."],
    exMind: ["상대는 상황을 크게 두려워하며, 먼저 움직였다가 상처받을까 경계합니다."],
    career: ["선택지가 없다고 느끼지만 실제로는 탈출구가 열려 있는 카드입니다."],
    daily: ["오늘은 스스로 만든 걱정의 틀을 인식하고 한 걸음 벗어나는 것이 핵심입니다."],
    keywords: ["심리적 구속", "자존심", "연락 망설임", "두려움"],
    shadowText: "생각은 계속 맴도는데 행동이 멈춰 있어, 시간이 지날수록 오해가 굳어질 수 있습니다.",
  },
  reversed: {
    love: ["묶였던 감정이 조금씩 풀리며 솔직한 대화의 틈이 열립니다."],
    reunion: ["막혀 있던 심리의 매듭이 조금씩 풀리지만, 바로 확신을 주는 연락보다는 조심스러운 탐색 접촉에 가깝습니다."],
    exMind: ["상대가 방어를 내려놓을 계기를 찾고 있습니다."],
    career: ["답답함에서 벗어나 현실적인 선택지를 다시 보기 시작합니다."],
    daily: ["생각의 과부하를 줄이면 오늘의 흐름이 빠르게 가벼워집니다."],
    keywords: ["완화", "재정비", "조심스러운 접촉", "시간 필요"],
    shadowText: "움직임이 보이더라도 불안정한 초기 단계라 속도를 올리면 다시 닫힐 수 있습니다.",
  },
};

const REUNION_CARD_OVERRIDES = {
  C06: {
    upright: {
      reunion: ["따뜻했던 과거 기억이 아직 살아 있어 감정의 문이 완전히 닫히지 않은 상태입니다. 다만 추억만으로는 재회가 유지되지 않아 현실 조율이 필요합니다."],
      exMind: ["상대는 함께 웃었던 장면을 자주 떠올리며 감정적으로 완전한 정리를 하지 못한 흐름입니다."],
      keywords: ["그리움", "추억", "미완 감정", "재연결"],
      shadowText: "좋았던 기억만 강조하면 과거 갈등이 지워진 것처럼 보여 오히려 방어를 부를 수 있습니다.",
      reunionAdvice: ["과거를 소환할 때는 감성 호소보다 지금 달라진 태도 1가지를 함께 보여 주세요."],
    },
    reversed: {
      reunion: ["추억의 힘은 남아 있지만 과거에 갇힌 감정이 정리를 방해합니다. 미련과 현실 사이에서 흔들려 접촉 타이밍이 늦어지기 쉽습니다."],
      exMind: ["상대는 과거를 떠올리지만 다시 반복될 상처를 경계해 마음을 열지 못합니다."],
      keywords: ["과거 고착", "미련", "현실 회피", "정리 갈등"],
      shadowText: "과거 이야기만 반복하면 현실 문제를 회피한다는 인상을 주어 거리감이 커질 수 있습니다.",
      reunionAdvice: ["추억을 꺼낼 때는 반드시 현재 기준과 재발 방지 약속을 짧게 덧붙이세요."],
    },
  },
  M15: {
    upright: {
      reunion: ["강한 끌림과 집착이 동시에 작동합니다. 끊기 어려운 연결감은 있으나 건강하지 않은 반복 패턴이면 재회 후에도 같은 갈등이 재현될 수 있습니다."],
      keywords: ["강한 끌림", "집착", "소유욕", "반복 패턴"],
      shadowText: "연락 자체는 이어져도 통제와 불안이 섞이면 관계의 피로가 빠르게 누적됩니다.",
      reunionAdvice: ["재회 전 '서로 지킬 경계선 2가지'를 합의하지 않으면 감정 소모가 반복될 수 있습니다."],
    },
    reversed: {
      reunion: ["집착 고리를 끊어내려는 의지가 보입니다. 다만 관계 패턴을 바꾸지 못하면 다시 만나도 같은 상처가 반복될 위험이 큽니다."],
      keywords: ["해방 시도", "패턴 전환", "자기통제", "재발 위험"],
      shadowText: "거리두기 자체가 해결은 아니며, 감정 폭발의 원인을 구조적으로 정리하지 않으면 재회 안정성이 낮습니다.",
      reunionAdvice: ["연락 재개 전 '하지 않을 행동'을 먼저 정해 관계 재발 리스크를 낮추세요."],
    },
  },
  M17: {
    upright: {
      reunion: ["서서히 회복되는 희망의 카드입니다. 즉각적 재회 선언보다 관계 온도를 부드럽게 올리는 과정에서 가능성이 열립니다."],
      keywords: ["희망", "회복", "신뢰 재건", "온도 회복"],
      shadowText: "기대가 커질수록 작은 침묵에도 불안이 확대될 수 있으니 속도보다 안정성을 우선해야 합니다.",
      reunionAdvice: ["큰 고백보다 안부-근황-짧은 감사 순서의 부담 낮은 메시지가 더 효과적입니다."],
    },
    reversed: {
      reunion: ["희망을 놓지 못하지만 현실 행동이 부족한 상태입니다. 마음은 남아도 실질적 접점이 없으면 가능성은 빠르게 약해집니다."],
      keywords: ["희망 지연", "현실 행동 부족", "관망", "기대 과열"],
      shadowText: "가능성을 믿는 마음이 행동 미루기의 핑계가 되면 관계는 정체 구간에 머물 수 있습니다.",
      reunionAdvice: ["막연한 기다림 대신 구체적 행동 1개(짧은 안부 혹은 명확한 정리)를 선택하세요."],
    },
  },
};

const SELF_ESTEEM_CARD_OVERRIDES = {
  C07: {
    upright: {
      keywords: ["환상", "비교", "선택 과부하", "욕구 혼란"],
      selfEsteem: ["남이 좋아할 모습을 상상하느라 내 욕구 기준이 흐려진 상태가 드러납니다."],
      woundPattern: ["인정받을 가능성이 높은 페르소나를 동시에 유지하려다 선택 자체를 미루는 패턴"],
      boundaryPattern: ["싫다고 말하기보다 상대가 좋아할 대안을 끝없이 찾는 경계 회피"],
      recoveryAdvice: ["오늘 결정해야 할 선택지를 2개로 줄이고, 몸이 편해지는 쪽 1개만 고르세요."],
      caution: ["가능성 비교만 반복하면 실제 삶의 주도권이 계속 늦춰집니다."],
      psychologicalMeaning: "선택지가 많아서가 아니라, 비교 기준을 외부에 둘 때 자기 신뢰가 무너집니다.",
      advice: ["결정을 미루는 이유를 설명하지 말고, 오늘 마감 시간을 정해 하나를 선택하세요."],
    },
    reversed: {
      keywords: ["환상 해체", "선택 정리", "기준 회복", "현실 점검"],
      selfEsteem: ["타인의 기대 시뮬레이션에서 벗어나 내 기준을 다시 세우는 전환점입니다."],
      woundPattern: ["정답을 고르려는 압박으로 선택을 지연하던 습관이 약해지는 단계"],
      boundaryPattern: ["모두를 만족시키려던 태도에서 감당 가능한 관계만 선택하려는 경계 재정렬"],
      recoveryAdvice: ["보류했던 요청 중 하나에만 답하고, 나머지는 이번 주로 미룹니다."],
      caution: ["정리 단계에서 갑작스러운 단절형 거절은 죄책감을 키울 수 있습니다."],
      advice: ["결정 기준 1줄을 먼저 적고 그 기준에 맞는 선택만 남기세요."],
    },
  },
  M09: {
    upright: {
      keywords: ["내면 탐색", "거리 두기", "자기 성찰", "정리"],
      selfEsteem: ["혼자만의 시간이 회복으로 이어지면 자기 기준이 단단해집니다."],
      woundPattern: ["상처를 피하려고 관계와 감정을 동시에 닫아버리는 고립 패턴"],
      boundaryPattern: ["직접 거절 대신 사라짐과 침묵으로 경계를 대체하는 습관"],
      recoveryAdvice: ["완벽한 답을 찾기보다 지금 감정 상태를 한 문장으로 기록하세요."],
      caution: ["거리 두기가 길어지면 자기 이해가 아니라 자기 의심으로 변질될 수 있습니다."],
    },
    reversed: {
      keywords: ["고립", "자기 의심", "내면 길 잃음", "닫힌 마음"],
      selfEsteem: ["혼자 버티는 시간이 자기비난으로 바뀌며 자존감이 더 약해진 상태입니다."],
      woundPattern: ["도움 요청을 미루고 혼자 해석하다 관계 신호를 왜곡하는 패턴"],
      boundaryPattern: ["거절하면 끊길까 봐 말하지 못하고 관계 자체를 회피하는 소극적 경계"],
      recoveryAdvice: ["신뢰하는 사람 1명에게 '요즘 내가 버겁다'는 사실만 짧게 공유하세요."],
      caution: ["혼자 만든 결론으로 상대 반응을 단정하면 불안 루프가 심해집니다."],
      psychologicalMeaning: "고립이 안전감이 아니라 자기비난 통로가 되는 시기에는 외부 검증이 필요합니다.",
      advice: ["정답을 찾으려 하지 말고 도움 요청 문장을 먼저 실행하세요."],
    },
  },
  S09: {
    upright: {
      keywords: ["불안", "야간 사고", "죄책감", "과잉 걱정"],
      selfEsteem: ["타인의 실망을 내 실패로 확대 해석하며 자기 가치 전체를 흔드는 패턴입니다."],
      woundPattern: ["한 번의 거절을 관계 파탄으로 과장하는 재난화 사고"],
      boundaryPattern: ["거절 전에 이미 죄책감이 올라와 경계 문장을 포기하는 습관"],
      recoveryAdvice: ["지금 두려운 내용을 사실과 추측 두 칸으로 나눠 써 보세요."],
      caution: ["불안한 밤의 결론을 낮의 행동 기준으로 채택하지 마세요."],
    },
    reversed: {
      keywords: ["불안 이완", "현실 검증", "회복 시작", "과장 축소"],
      selfEsteem: ["최악의 상상에서 빠져나와 현실 증거로 자기 판단을 회복하는 단계입니다."],
      woundPattern: ["모든 실망을 종말로 해석하던 사고 패턴을 교정하기 시작하는 흐름"],
      boundaryPattern: ["거절 전 죄책감 폭주를 멈추고 사실 확인 후 경계 문장을 선택하는 전환"],
      recoveryAdvice: ["오늘 한 번은 결론 대신 사실 확인 질문 1개만 남기고 대화를 종료하세요."],
      caution: ["불안이 줄었다고 관계 복구를 서두르면 다시 과부하가 올 수 있습니다."],
      psychologicalMeaning: "회복 초반에는 확신보다 검증 가능한 사실이 자기신뢰를 빠르게 복원합니다.",
      advice: ["머릿속 가정과 확인된 사실을 분리한 뒤, 오늘 행동은 사실 기준으로만 정하세요."],
    },
  },
  P01: {
    upright: {
      keywords: ["현실적 시작", "생활 기반", "몸의 안정", "작은 기회"],
      selfEsteem: ["자존감은 선언이 아니라 일상에서 내 선택을 현실화할 때 복원됩니다."],
      woundPattern: ["마음으로만 결심하고 실행을 미루며 스스로를 불신하게 된 패턴"],
      boundaryPattern: ["말로만 경계를 설명하고 실제 일정/시간/돈 경계를 못 지키는 상태"],
      recoveryAdvice: ["오늘 내 몸, 시간, 돈 중 한 영역을 지키는 행동 1개를 즉시 실행하세요."],
      caution: ["회복 계획을 거대하게 잡으면 다시 미루기 패턴으로 돌아갑니다."],
      psychologicalMeaning: "작은 실행의 축적은 자기효능감을 안정시키고 비교 사고를 줄입니다.",
      advice: ["작은 기준 하나를 행동으로 증명해 자기신뢰의 근거를 만드세요."],
    },
    reversed: {
      keywords: ["기반 흔들림", "실행 지연", "현실 불안", "시작 회피"],
      selfEsteem: ["회복 의지는 있지만 생활 기반이 불안정해 자기평가가 흔들리기 쉽습니다."],
      woundPattern: ["실행 지연이 누적되어 '나는 안 되는 사람'이라는 낙인으로 이어지는 패턴"],
      boundaryPattern: ["경계가 필요함을 알면서도 일정 관리 실패로 스스로 약속을 깨는 상태"],
      recoveryAdvice: ["오늘 반드시 지킬 최소 기준 하나만 정하고 끝까지 지키세요."],
      caution: ["한 번의 미실행을 실패로 일반화하지 마세요."],
      advice: ["큰 계획을 버리고 15분짜리 행동으로 회복 리듬을 다시 붙이세요."],
    },
  },
  P14: {
    upright: {
      keywords: ["안정감", "자기 통제", "현실 자신감", "성숙한 책임"],
      selfEsteem: ["남의 평가가 아니라 스스로를 책임지는 힘에서 자존감이 장기적으로 회복됩니다."],
      woundPattern: ["타인 평가에 흔들려 내 자원과 역량을 축소하던 패턴"],
      boundaryPattern: ["감정 반응보다 시간, 돈, 몸, 일의 기준을 지키는 책임형 경계"],
      recoveryAdvice: ["오늘 해낸 일 3가지를 기록해 자기신뢰를 '증거'로 쌓으세요."],
      caution: ["강한 척만 하며 휴식과 도움을 거부하면 회복 탄력이 떨어집니다."],
      psychologicalMeaning: "현실 증거 기반 자기평가는 외부 인정 변동성에 덜 흔들립니다.",
      advice: ["나를 지켜낸 데이터(시간, 지출, 루틴)를 기록해 기준을 현실화하세요."],
    },
    reversed: {
      keywords: ["통제 피로", "완고함", "자원 불균형", "책임 과부하"],
      selfEsteem: ["통제를 유지하려다 과부하가 쌓이며 오히려 자기신뢰가 떨어지는 흐름입니다."],
      woundPattern: ["모든 책임을 혼자 떠안고 도움 요청을 약함으로 해석하는 패턴"],
      boundaryPattern: ["경계를 세우되 유연성을 잃어 관계 피로를 키우는 경직된 방식"],
      recoveryAdvice: ["이번 주 할 일 1개를 위임하거나 연기해 책임 과부하를 줄이세요."],
      caution: ["완벽 통제 집착은 자존감이 아니라 불안을 강화합니다."],
      advice: ["강함을 증명하려 하지 말고 지속 가능한 기준부터 복구하세요."],
    },
  },
  M11: {
    upright: {
      keywords: ["공정", "기준", "균형", "책임"],
      psychologicalMeaning: "관계에서 감정적 압박을 줄이기 위해 객관적 기준을 세우려는 심리가 작동합니다.",
      selfEsteemMeaning: "타인의 기대에 맞추기보다, 나에게도 동일한 기준의 공정함을 적용할수록 자존감이 안정됩니다.",
      shadowText: "기준이 단단해 보여도 스스로에게만 가혹해지면 죄책감이 누적될 수 있습니다.",
      advice: ["상대를 설득하기 전에 내 기준 1가지를 문장으로 정리하세요. 기준이 분명하면 과잉 사과를 줄일 수 있습니다."],
    },
    reversed: {
      keywords: ["불공정", "자기판단", "왜곡된 기준", "죄책감"],
      coreMeaning: "관계에서 공정성보다 분위기 유지가 앞서며, 스스로를 과하게 재판하는 흐름이 강해집니다.",
      psychologicalMeaning: "누군가 실망하는 기색이 보이면 사실을 확인하기 전에 '내가 잘못한 것 같다'는 생각이 먼저 올라올 수 있어요.",
      selfEsteemMeaning: "눈치를 보는 습관의 뿌리는 소심함이 아니라, 불공정한 장면에서도 균형을 맞추려 버텨온 경험일 수 있습니다.",
      shadowText: "나를 지키기 위한 경계 대신, 관계의 평온을 지키려는 자기희생이 반복될 수 있습니다.",
      advice: ["오늘은 사과 문장을 줄이고 사실 문장을 늘리세요. '내가 잘못했어' 대신 '나는 이렇게 이해했어'라고 말해 보세요."],
    },
  },
  M14: {
    upright: {
      keywords: ["조율", "안정", "회복", "페이스"],
      psychologicalMeaning: "감정 반응과 관계 유지 사이의 간격을 조절할 수 있을 때 갈등이 누적되지 않습니다.",
      selfEsteemMeaning: "거절은 단절이 아니라 관계를 오래 가게 하는 조율 장치라는 인식이 자존감 회복에 도움이 됩니다.",
      advice: ["상대의 요청에 즉답하지 말고 '확인 후 답할게요'를 먼저 말해 감정 온도를 조절하세요."],
    },
    reversed: {
      keywords: ["감정 조절 어려움", "균형 붕괴", "경계선 약화", "갈등 회피"],
      coreMeaning: "내 감정을 늦게 알아차리거나 참아버려 경계선이 흐려지는 흐름입니다.",
      psychologicalMeaning: "거절을 관계 파괴로 해석하는 순간, 갈등 회피가 과도해지고 자기표현이 위축될 수 있습니다.",
      selfEsteemMeaning: "자존감을 지키려면 단호함 이전에 작은 경계 문장을 자주 쓰는 연습이 필요합니다.",
      shadowText: "조용히 참고 버티는 방식이 누적되면 갑작스러운 거리두기나 감정 폭발로 이어질 수 있습니다.",
      advice: ["오늘 한 번은 '지금은 어렵다'를 짧게 말해 보세요. 설명을 길게 붙이지 않아도 관계는 유지될 수 있습니다."],
    },
  },
  W09: {
    upright: {
      keywords: ["방어", "지침", "버팀", "경계 태세"],
      coreMeaning: "많이 버텨온 힘은 분명하지만, 긴장 상태가 일상화되어 회복이 늦어질 수 있습니다.",
      psychologicalMeaning: "다시 상처받지 않기 위해 늘 대비하는 패턴이 안전감을 주는 동시에 관계 피로를 키울 수 있습니다.",
      selfEsteemMeaning: "눈치를 보는 습관은 친절함이 아니라 과도한 경계 태세로 남을 수 있으며, 자존감 회복에는 안전한 관계에서의 이완 연습이 필요합니다.",
      advice: ["오늘은 믿을 수 있는 사람 한 명 앞에서만이라도 완벽한 대응을 멈추고, 솔직한 감정 한 문장을 말해 보세요."],
    },
    reversed: {
      keywords: ["방어 이완", "소진 인식", "회복 지연", "재정비"],
      psychologicalMeaning: "버티던 힘이 약해진 것이 아니라, 과도한 경계가 한계에 도달했다는 신호일 수 있습니다.",
      selfEsteemMeaning: "이 시기의 자존감 회복은 더 버티는 것이 아니라, 휴식과 도움 요청을 허용하는 선택에서 시작됩니다.",
      advice: ["하루 일정에서 20분 비워 두고 누구의 기대도 아닌 내 컨디션 회복에만 쓰세요."],
    },
  },
  W14: {
    upright: {
      keywords: ["자기주도권", "건강한 권위", "단호함", "리더십"],
      coreMeaning: "내 삶의 방향을 내가 정하는 성숙한 추진력이 살아나는 카드입니다.",
      psychologicalMeaning: "타인의 실망과 내 가치 판단을 분리할 때 감정 소모 없이 관계를 운영할 수 있습니다.",
      selfEsteemMeaning: "자존감 회복은 모두를 만족시키는 데서가 아니라, 따뜻하지만 흔들리지 않는 기준을 지키는 데서 강화됩니다.",
      advice: ["'네 마음은 이해하지만 내 결정은 이거야'라는 문장을 오늘 한 번 실제 대화에서 사용해 보세요."],
    },
    reversed: {
      keywords: ["권위 과잉", "통제 불안", "과열", "강박"],
      psychologicalMeaning: "주도권을 지키려는 마음이 강할수록 말투가 단단해져 불필요한 충돌을 만들 수 있습니다.",
      selfEsteemMeaning: "경계선은 상대를 누르는 힘이 아니라 나를 지키는 명료함이어야 오래 유지됩니다.",
      advice: ["주장을 말하기 전에 상대 감정을 한 문장으로 먼저 인정한 뒤, 내 기준을 짧게 전달하세요."],
    },
  },
  W06: {
    upright: {
      keywords: ["자신감", "인정", "성과", "가시화"],
      psychologicalMeaning: "성취 경험이 자기효능감을 끌어올리지만, 외부 반응 중심으로 고정되면 변동성이 커질 수 있습니다.",
      selfEsteemMeaning: "인정은 동기부여에 유익하지만, 자기승인과 함께 갈 때만 자존감이 안정적으로 유지됩니다.",
      advice: ["칭찬을 받으면 바로 다음 목표로 넘어가기보다, 내가 잘한 선택을 구체적으로 기록해 두세요."],
    },
    reversed: {
      keywords: ["외부 인정 의존", "자신감 흔들림", "비교", "자기승인 회복"],
      coreMeaning: "외부 반응이 약할 때 내 선택 전체를 의심하기 쉬운 상태가 드러납니다.",
      psychologicalMeaning: "칬잘한이 없을 때 내 가치 전체가 흔들린다고 느끼다면, 그게 자존감을 가장 약하게 만드는 습관입니다.",
      selfEsteemMeaning: "지금의 핵심 과제는 박수받는 내가 아니라, 박수받지 못해도 나를 버리지 않는 자기승인 훈련입니다.",
      shadowText: "비교를 멈추지 못하면 작은 성취도 체감되지 않아 회복 속도가 더 느려질 수 있습니다.",
      advice: ["오늘은 남이 몰라도 되는 작은 선택 하나를 완수한 뒤, 스스로에게 '잘했다'를 소리 내어 말해 보세요."],
    },
  },
};

function normalizeText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function cloneMeaning(meaning) {
  const out = {};
  Object.keys(meaning).forEach((key) => {
    const value = meaning[key];
    if (Array.isArray(value)) {
      out[key] = value.slice();
      return;
    }
    if (value && typeof value === "object") {
      out[key] = { ...value };
      return;
    }
    out[key] = normalizeText(value);
  });
  return out;
}

function ensureMeaningShape(meaning) {
  const out = cloneMeaning(meaning);
  const defaults = {
    core: ["핵심 흐름을 점검할 시점입니다."],
    light: ["긍정적 가능성이 살아 있습니다."],
    shadow: ["감정의 막힘을 관리해야 합니다."],
    monthly: ["이번 달의 리듬을 천천히 점검하세요."],
    love: ["연애에서는 감정과 속도 조절이 필요합니다."],
    relationship: ["관계에서는 소통의 구조가 중요합니다."],
    reunion: ["재회는 감정과 현실 조건을 함께 봐야 합니다."],
    exMind: ["상대 속마음은 말보다 실제 행동을 보면 더 정확하게 알 수 있습니다."],
    currentMind: ["현재 심리는 기대와 경계가 공존합니다."],
    future: ["가까운 미래 흐름은 선택의 질에 좌우됩니다."],
    career: ["진로에서는 우선순위와 실행력이 핵심입니다."],
    money: ["금전은 리스크 관리와 현실 판단이 중요합니다."],
    moneyWork: ["금전과 일은 현실 점검과 실행 우선순위가 중요합니다."],
    healthMind: ["건강과 멘탈은 생활 리듬과 긴장 완화가 핵심입니다."],
    daily: ["오늘은 한 가지 행동에 집중하는 것이 좋습니다."],
    general: ["전체 흐름을 넓게 보고 균형을 잡으세요."],
    advice: ["작은 실행을 반복해 흐름을 안정시키세요."],
    caution: ["무리한 해석보다 사실 확인이 먼저입니다."],
  };

  Object.keys(defaults).forEach((key) => {
    if (!Array.isArray(out[key]) || !out[key].length) {
      out[key] = defaults[key].slice();
      return;
    }
    out[key] = out[key].map((line) => normalizeText(line)).filter(Boolean);
    if (!out[key].length) out[key] = defaults[key].slice();
  });

  out.keywords = Array.isArray(out.keywords)
    ? out.keywords.map((line) => normalizeText(line)).filter(Boolean)
    : [];
  if (!out.keywords.length) {
    out.keywords = Array.from(new Set([...out.core, ...out.shadow])).slice(0, 4);
  }

  out.coreMeaning = normalizeText(out.coreMeaning) || out.core[0];
  out.psychologicalMeaning = normalizeText(out.psychologicalMeaning) || out.shadow[0];
  out.selfEsteemMeaning = normalizeText(out.selfEsteemMeaning) || out.general[0];
  out.shadowText = normalizeText(out.shadowText) || out.shadow[0];
  out.shadowNote = normalizeText(out.shadowNote) || out.shadowText;
  out.adviceText = normalizeText(out.adviceText) || out.advice[0];
  out.selfEsteem = Array.isArray(out.selfEsteem)
    ? out.selfEsteem.map((line) => normalizeText(line)).filter(Boolean)
    : [];
  if (!out.selfEsteem.length) {
    out.selfEsteem = [out.selfEsteemMeaning || out.general[0]];
  }
  out.woundPattern = Array.isArray(out.woundPattern)
    ? out.woundPattern.map((line) => normalizeText(line)).filter(Boolean)
    : [];
  if (!out.woundPattern.length) {
    out.woundPattern = [out.psychologicalMeaning || out.shadow[0]];
  }
  out.boundaryPattern = Array.isArray(out.boundaryPattern)
    ? out.boundaryPattern.map((line) => normalizeText(line)).filter(Boolean)
    : [];
  if (!out.boundaryPattern.length) {
    out.boundaryPattern = [out.shadowText || out.shadow[0]];
  }
  out.recoveryAdvice = Array.isArray(out.recoveryAdvice)
    ? out.recoveryAdvice.map((line) => normalizeText(line)).filter(Boolean)
    : [];
  if (!out.recoveryAdvice.length) {
    out.recoveryAdvice = [out.adviceText || out.advice[0]];
  }
  out.caution = Array.isArray(out.caution)
    ? out.caution.map((line) => normalizeText(line)).filter(Boolean)
    : [];
  if (!out.caution.length) {
    out.caution = [out.shadowNote || out.shadowText || out.shadow[0]];
  }
  out.selfEsteemMeaning = normalizeText(out.selfEsteemMeaning) || out.selfEsteem[0];

  return out;
}

function buildMeaning({ nameKo, coreKeyword, tone, rankTone, orientation }) {
  const isReversed = orientation === "reversed";
  const lead = isReversed
    ? `${nameKo} 카드 역방향은 흐름이 막히거나 지연된 지점을 드러냅니다.`
    : `${nameKo} 카드 정방향은 ${coreKeyword}의 힘이 겉으로 드러나는 자리입니다.`;
  const love = isReversed
    ? `연애에서는 ${coreKeyword}의 기운이 부담으로 작동해 표현이 꼬일 수 있습니다.`
    : `연애에서는 ${coreKeyword}의 기운이 살아나며 감정의 연결이 선명해집니다.`;

  return ensureMeaningShape({
    keywords: isReversed ? ["재정비", "속도조절", "경계복원"] : ["실행", "연결", "안정화"],
    monthly: [
      isReversed
        ? `${nameKo} 역방향은 이번 달 ${coreKeyword}의 흐름이 과하거나 꼬이기 쉬워 리듬 조정이 먼저입니다.`
        : `${nameKo} 정방향은 이번 달 ${coreKeyword}의 기운이 실제 흐름을 지탱하며 단계적 진전을 돕습니다.`,
    ],
    coreMeaning: isReversed
      ? `${nameKo} 역방향은 ${coreKeyword}의 흐름이 어긋나 기준 재정렬이 필요한 국면입니다.`
      : `${nameKo} 정방향은 ${coreKeyword}의 힘이 질문의 중심에 드러나는 국면입니다.`,
    psychologicalMeaning: isReversed
      ? "반응을 늦추고 사실을 재확인하면 과잉 해석을 줄일 수 있습니다."
      : "지금 감정은 작은 결정 하나로 방향을 잡을 수 있습니다.",
    selfEsteemMeaning: isReversed
      ? "자존감 관점에서는 타인 반응을 내 가치와 분리하는 경계 훈련이 핵심입니다."
      : "작은 실천을 꾸준히 이어가다 보면 자신에 대한 믿음이 조금씩 회복됩니다.",
    shadowText: isReversed
      ? "상대 반응을 예측하며 스스로를 먼저 낮추는 패턴이 반복될 수 있습니다."
      : "좋은 흐름일수록 타인의 기대까지 한 번에 책임지려는 과부하를 경계해야 합니다.",
    moneyWork: [
      isReversed
        ? "금전과 일에서는 확인 절차를 건너뛰면 실수나 재작업이 늘 수 있습니다."
        : "금전과 일에서는 작은 실행을 쌓을수록 실질적인 결과가 붙습니다.",
    ],
    healthMind: [
      isReversed
        ? "건강과 멘탈은 생각 과부하와 리듬 붕괴를 먼저 정리해야 회복됩니다."
        : "건강과 멘탈은 생활 리듬을 지키면 회복과 집중이 함께 올라갑니다.",
    ],
    core: [lead, `${tone} 관점에서 ${rankTone}의 의미가 강하게 작동합니다.`],
    light: [isReversed ? "막힘을 인식하면 회복 속도가 빨라집니다." : "흐름을 살리면 작은 선택이 다음 단계의 실마리가 됩니다."],
    shadow: [isReversed ? "조급함이 문제를 키우니 속도를 낮추세요." : "확신이 과해지면 상대 리듬을 놓칠 수 있습니다."],
    love: [love],
    relationship: [isReversed ? "관계에서는 말보다 오해 해소 순서를 먼저 세워야 합니다." : "관계에서는 감정 확인과 합의가 동시에 이뤄질 때 안정됩니다."],
    reunion: [isReversed ? "재회는 서두를수록 멀어질 수 있어 타이밍 조절이 필요합니다." : "재회는 짧고 따뜻한 접점부터 시작할 때 마음의 문턱이 낮아집니다."],
    exMind: [isReversed ? "상대는 마음보다 경계가 앞서며 반응을 늦추고 있습니다." : "상대는 감정이 남아 있어도 안전한 방식의 접근을 기다립니다."],
    currentMind: [isReversed ? "현재 심리는 불안과 피로가 앞서 결정을 미루는 상태입니다." : "현재 심리는 기대와 경계가 균형을 맞추는 구간입니다."],
    future: [isReversed ? "가까운 미래는 우회 경로를 찾을 때 풀립니다." : "가까운 미래는 작은 합의가 큰 전환으로 이어집니다."],
    career: [isReversed ? "진로에서는 우선순위 재정렬이 먼저입니다." : "진로에서는 실행 우선순위를 잡으면 성과가 붙습니다."],
    money: [isReversed ? "금전은 보수적 운영이 손실을 줄입니다." : "금전은 계획된 분산과 관리가 수익률을 높입니다."],
    daily: [isReversed ? "오늘은 감정 과부하를 줄이는 루틴이 필요합니다." : "오늘은 한 가지 목표를 차분히 마무리하는 편이 좋습니다."],
    general: [isReversed ? "지금은 서두른 결론보다 기준 재정렬이 회복에 도움이 됩니다." : "지금은 작은 실행을 현실 기준에 맞춰 고정할 때입니다."],
    selfEsteem: [isReversed
      ? "자존감 관점에서는 타인 반응과 내 가치 판단을 분리하는 연습이 우선입니다."
      : "자존감 관점에서는 일상 실행을 통해 자기 신뢰를 현실 증거로 축적해야 합니다."],
    woundPattern: [isReversed
      ? "실망을 피하려다 과잉 해석과 자기검열이 강화되는 상처 패턴"
      : "성과를 유지하려다 외부 기준에 과적응하는 상처 패턴"],
    boundaryPattern: [isReversed
      ? "거절 이전에 죄책감이 먼저 올라오는 경계 붕괴 패턴"
      : "관계를 유지하면서도 기준 문장을 짧게 지키는 경계 형성 패턴"],
    recoveryAdvice: [isReversed
      ? "오늘은 사실 확인 질문 1개를 먼저 던지고 결론을 미루세요."
      : "오늘은 내 기준을 한 문장으로 먼저 말하고 행동 1개로 연결하세요."],
    caution: [isReversed
      ? "불안이 큰 날의 결론을 인생 결론으로 확대하지 마세요."
      : "좋은 흐름에서도 모두를 만족시키려는 과부하를 경계하세요.",
    isReversed
      ? "충동적 결정, 과속, 설명 없는 결론을 피하세요."
      : "좋은 흐름일수록 무리한 확장보다 페이스 조절이 중요합니다."],
    advice: [isReversed ? "지금은 확인 질문과 짧은 실행으로 리듬을 회복하세요." : "오늘 확인 가능한 행동 하나를 정하고 마무리하세요."],
  });
}

function mergeMeaning(baseMeaning, override) {
  if (!override || typeof override !== "object") return baseMeaning;
  const merged = cloneMeaning(baseMeaning);
  Object.keys(override).forEach((key) => {
    const value = override[key];
    if (Array.isArray(value) && value.length) {
      merged[key] = value.map((line) => normalizeText(line)).filter(Boolean);
      return;
    }
    if (value && typeof value === "object") {
      merged[key] = { ...(merged[key] || {}), ...value };
      return;
    }
    merged[key] = normalizeText(value);
  });
  return ensureMeaningShape(merged);
}

function majorCardToTarotCard(def) {
  const upright = buildMeaning({
    nameKo: def.nameKo,
    coreKeyword: def.focus,
    tone: "메이저 아르카나",
    rankTone: "인생 단위의 전환",
    orientation: "upright",
  });
  const reversed = buildMeaning({
    nameKo: def.nameKo,
    coreKeyword: def.focus,
    tone: "메이저 아르카나",
    rankTone: "과제의 재점검",
    orientation: "reversed",
  });

  return {
    id: `major_${def.slug}`,
    code: def.code,
    number: def.number,
    nameKo: def.nameKo,
    nameEn: def.nameEn,
    arcana: "major",
    suit: "major",
    element: "spirit",
    keywords: def.keywords.slice(),
    upright,
    reversed,
    imageKey: def.code.toLowerCase(),
  };
}

function minorCardToTarotCard(suit, rank) {
  const nameKo = `${suit.nameKo} ${rank.nameKo}`;
  const nameEn = `${rank.nameEn} of ${suit.nameEn}`;
  const code = `${suit.code}${rank.code}`;

  const upright = buildMeaning({
    nameKo,
    coreKeyword: suit.tone,
    tone: `${suit.nameKo} 슈트`,
    rankTone: rank.rankTone,
    orientation: "upright",
  });
  const reversed = buildMeaning({
    nameKo,
    coreKeyword: suit.tone,
    tone: `${suit.nameKo} 슈트`,
    rankTone: rank.rankTone,
    orientation: "reversed",
  });

  return {
    id: `${suit.suit}_${rank.nameEn.toLowerCase()}`,
    code,
    number: rank.number,
    nameKo,
    nameEn,
    arcana: "minor",
    suit: suit.suit,
    element: suit.element,
    keywords: [...suit.tone.split(" "), ...rank.keywords],
    upright,
    reversed,
    imageKey: code.toLowerCase(),
  };
}

function applyCardOverrides(card) {
  let next = card;
  const richOverride = RICH_CARD_OVERRIDES[card.code];
  if (richOverride) {
    next = {
      ...next,
      keywords: Array.isArray(richOverride.upright?.keywords) && richOverride.upright.keywords.length
        ? richOverride.upright.keywords.slice()
        : next.keywords,
      upright: mergeMeaning(next.upright, richOverride.upright),
      reversed: mergeMeaning(next.reversed, richOverride.reversed),
    };
  }
  if (card.code === "S08") {
    next = {
      ...next,
      upright: mergeMeaning(next.upright, SWORD_EIGHT_OVERRIDE.upright),
      reversed: mergeMeaning(next.reversed, SWORD_EIGHT_OVERRIDE.reversed),
    };
  }
  const reunionOverride = REUNION_CARD_OVERRIDES[card.code];
  if (reunionOverride) {
    next = {
      ...next,
      upright: mergeMeaning(next.upright, reunionOverride.upright),
      reversed: mergeMeaning(next.reversed, reunionOverride.reversed),
    };
  }
  const selfEsteemOverride = SELF_ESTEEM_CARD_OVERRIDES[card.code];
  if (selfEsteemOverride) {
    next = {
      ...next,
      upright: mergeMeaning(next.upright, selfEsteemOverride.upright),
      reversed: mergeMeaning(next.reversed, selfEsteemOverride.reversed),
    };
  }

  const warningUpright = buildWarningCardMeaningOverride(next, "upright");
  const warningReversed = buildWarningCardMeaningOverride(next, "reversed");
  if (!warningUpright && !warningReversed) return next;
  const warningKeywords = Array.isArray(warningUpright?.keywords) && warningUpright.keywords.length
    ? warningUpright.keywords.slice()
    : next.keywords;
  return {
    ...next,
    keywords: warningKeywords,
    upright: warningUpright ? mergeMeaning(next.upright, warningUpright) : next.upright,
    reversed: warningReversed ? mergeMeaning(next.reversed, warningReversed) : next.reversed,
  };
}

const TAROT_CARDS = [
  ...MAJOR_DEFS.map(majorCardToTarotCard),
  ...SUIT_DEFS.flatMap((suit) => RANK_DEFS.map((rank) => minorCardToTarotCard(suit, rank))),
].map(applyCardOverrides);

const TAROT_CARD_MAP_BY_CODE = new Map(TAROT_CARDS.map((card) => [card.code, card]));
const TAROT_CARD_MAP_BY_ID = new Map(TAROT_CARDS.map((card) => [card.id, card]));

function legacyNumericIdToCardCode(numericId) {
  const n = Number(numericId);
  if (!Number.isFinite(n)) return null;
  const value = Math.max(0, Math.min(77, Math.floor(n)));
  if (value < 22) return `M${String(value).padStart(2, "0")}`;
  const m = value - 22;
  const suit = SUIT_DEFS[Math.floor(m / 14)] || SUIT_DEFS[0];
  const rankNo = (m % 14) + 1;
  return `${suit.code}${String(rankNo).padStart(2, "0")}`;
}

function cardCodeToLegacyNumericId(cardCode) {
  const code = normalizeText(cardCode).toUpperCase();
  if (!code) return null;
  if (code.startsWith("M")) {
    const majorNo = Number(code.slice(1));
    if (Number.isFinite(majorNo) && majorNo >= 0 && majorNo <= 21) return majorNo;
    return null;
  }
  const prefix = code.charAt(0);
  const rankNo = Number(code.slice(1));
  const suitIndex = SUIT_DEFS.findIndex((suit) => suit.code === prefix);
  if (suitIndex < 0 || !Number.isFinite(rankNo) || rankNo < 1 || rankNo > 14) return null;
  return 22 + (suitIndex * 14) + (rankNo - 1);
}

function getTarotCardByAnyId(cardId) {
  const raw = normalizeText(cardId);
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (TAROT_CARD_MAP_BY_CODE.has(upper)) return TAROT_CARD_MAP_BY_CODE.get(upper);
  if (TAROT_CARD_MAP_BY_ID.has(raw)) return TAROT_CARD_MAP_BY_ID.get(raw);

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    const legacyCode = legacyNumericIdToCardCode(numeric);
    if (legacyCode && TAROT_CARD_MAP_BY_CODE.has(legacyCode)) {
      return TAROT_CARD_MAP_BY_CODE.get(legacyCode);
    }
  }

  return null;
}

function buildImageCandidates(cardCode) {
  const code = normalizeText(cardCode).toUpperCase();
  const filename = CARD_TO_FILENAME[code] || "thefool.jpeg";
  return [`/tarot-cards/${filename}`];
}

function getQuestionTypes() {
  return QUESTION_TYPES.slice();
}

export {
  QUESTION_TYPES,
  TAROT_CARDS,
  TAROT_CARD_MAP_BY_CODE,
  TAROT_CARD_MAP_BY_ID,
  CARD_TO_FILENAME,
  getQuestionTypes,
  getTarotCardByAnyId,
  legacyNumericIdToCardCode,
  cardCodeToLegacyNumericId,
  buildImageCandidates,
};
