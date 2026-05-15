const BASE_POSITION_TITLES = [
  "겉으로 보이는 태도",
  "실제 속마음",
  "다가오지 않는 이유",
  "숨겨진 욕구",
  "관계에 대한 판단",
];

const SECTION_BLUEPRINTS = [
  {
    slot: 1,
    icon: "🎭",
    key: "surface",
    title: "겉으로 보이는 태도: 상대방은 지금 어떤 척을 하고 있을까?",
    subtitle: "겉태도와 실제 의도는 다를 수 있습니다.",
    pairIndex: 0,
  },
  {
    slot: 2,
    icon: "💓",
    key: "inner",
    title: "실제 속마음: 아직 마음이 남아 있을까?",
    subtitle: "호감, 미련, 경계심이 어떻게 섞여 있는지 읽습니다.",
    pairIndex: 1,
  },
  {
    slot: 3,
    icon: "🧱",
    key: "hesitation",
    title: "다가오지 않는 이유: 마음보다 방어심리가 먼저 작동하는 구간",
    subtitle: "연락을 망설이는 심리적 원인을 해석합니다.",
    pairIndex: 2,
  },
  {
    slot: 4,
    icon: "🫧",
    key: "hiddenNeed",
    title: "숨겨진 욕구: 사실은 어떤 반응을 바라고 있을까?",
    subtitle: "겉으로 말하지 않는 욕구를 보조 카드로 확인합니다.",
    pairIndex: 3,
  },
  {
    slot: 5,
    icon: "⚖️",
    key: "relation",
    title: "관계에 대한 판단: 끝난 관계일까, 아직 열려 있을까?",
    subtitle: "관계를 닫았는지, 유보 중인지, 다시 열 가능성이 있는지 판단합니다.",
    pairIndex: 4,
  },
  {
    slot: 6,
    icon: "🛰️",
    key: "future",
    title: "앞으로의 흐름: 다시 움직일 가능성은 어느 정도일까?",
    subtitle: "단기 흐름과 연락 가능성을 현실적으로 봅니다.",
    pairIndex: 1,
    secondaryPairIndex: 4,
  },
  {
    slot: 7,
    icon: "📝",
    key: "action",
    title: "지금 당신에게 필요한 행동: 감정 확인보다 부담 없는 접점",
    subtitle: "상대방의 방어심리를 자극하지 않는 접근법입니다.",
    pairIndex: 2,
    secondaryPairIndex: 3,
  },
];

const TEMPERATURE_LABELS = ["차가움", "거리감", "혼란", "미련", "호감", "집착", "재접근 가능"];

const TEMP_SCORE = {
  "차가움": 1,
  "거리감": 2,
  "혼란": 2,
  "미련": 3,
  "호감": 4,
  "집착": 4,
  "재접근 가능": 5,
};

const FORBIDDEN_PHRASES = [
  "당신의 영혼",
  "내면의 지도",
  "우주의 흐름",
  "심연의 메아리",
  "잊혀진 약속",
  "새로운 지평",
  "사회적 페르소나",
  "영혼의 각성",
  "내면의 나침반",
  "조화의 추구",
  "삶의 균형",
  "자아의 목적",
  "잠재력의 발굴",
  "당신의 내면",
  "당신의 진정한 자아",
];

const MAJOR = [
  "The Fool",
  "The Magician",
  "The High Priestess",
  "The Empress",
  "The Emperor",
  "The Hierophant",
  "The Lovers",
  "The Chariot",
  "Strength",
  "The Hermit",
  "Wheel of Fortune",
  "Justice",
  "The Hanged Man",
  "Death",
  "Temperance",
  "The Devil",
  "The Tower",
  "The Star",
  "The Moon",
  "The Sun",
  "Judgement",
  "The World",
];

const SUITS = ["Wands", "Cups", "Swords", "Pentacles"];
const SUIT_CODES = ["W", "C", "S", "P"];
const RANKS = ["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Page", "Knight", "Queen", "King"];

const MAJOR_MEANINGS = {
  M00: {
    keywords: ["새출발", "충동", "가벼운 접근"],
    loveMeaning: "상대방은 감정의 시작점에 서 있지만, 책임까지 당장 지려 하지는 않습니다.",
    hiddenMindMeaning: "끌림은 있으나 관계 정의를 서두르면 부담을 느끼는 상태입니다.",
    positiveSignal: "가벼운 안부나 유머형 메시지에 반응할 가능성이 있습니다.",
    negativeSignal: "감정 확인을 강하게 요구하면 바로 거리를 둘 수 있습니다.",
    advice: "가볍고 짧은 접점으로 반응 패턴부터 확인하세요.",
    emotionalTemperature: "혼란",
  },
  M01: {
    keywords: ["주도권", "표현력", "자기통제"],
    loveMeaning: "상대방은 마음이 있어도 먼저 리드권을 놓치지 않으려 합니다.",
    hiddenMindMeaning: "당신의 반응을 계산하며 타이밍을 재는 심리가 강합니다.",
    positiveSignal: "명확하고 짧은 대화에는 호응할 가능성이 큽니다.",
    negativeSignal: "감정 압박을 받으면 방어적으로 말이 짧아질 수 있습니다.",
    advice: "질문을 한 번에 하나만 던져 상대가 통제감을 잃지 않게 하세요.",
    emotionalTemperature: "호감",
  },
  M02: {
    keywords: ["침묵", "관찰", "감정보류"],
    loveMeaning: "상대방은 감정을 숨긴 채 상황을 오래 관찰하는 타입입니다.",
    hiddenMindMeaning: "마음이 없는 것이 아니라 들키는 것이 부담스러운 흐름입니다.",
    positiveSignal: "급하지 않은 톤의 메시지에는 읽고 곱씹는 반응이 나옵니다.",
    negativeSignal: "답을 재촉하면 더 깊게 잠수할 수 있습니다.",
    advice: "짧은 안부 후 충분한 텀을 두는 방식이 유리합니다.",
    emotionalTemperature: "거리감",
  },
  M03: {
    keywords: ["다정함", "돌봄", "안정욕구"],
    loveMeaning: "상대방은 정서적 안정감을 느끼는 관계를 다시 원할 가능성이 있습니다.",
    hiddenMindMeaning: "관심을 받고 싶지만 먼저 표현하는 것은 망설이고 있습니다.",
    positiveSignal: "따뜻한 공감 문장에 반응이 좋아질 수 있습니다.",
    negativeSignal: "비난형 대화에는 빠르게 방어적으로 변합니다.",
    advice: "관계 평가보다 일상 공감부터 회복하세요.",
    emotionalTemperature: "호감",
  },
  M04: {
    keywords: ["자존심", "통제", "원칙"],
    loveMeaning: "상대방은 감정보다 체면과 질서를 우선하는 태도를 보입니다.",
    hiddenMindMeaning: "먼저 움직이면 약해 보인다고 느끼는 방어심리가 큽니다.",
    positiveSignal: "존중받는다고 느끼면 응답의 톤이 부드러워집니다.",
    negativeSignal: "추궁형 질문에는 대화가 즉시 닫힐 수 있습니다.",
    advice: "존중 중심의 문장으로 안전한 대화 틀을 먼저 만드세요.",
    emotionalTemperature: "거리감",
  },
  M05: {
    keywords: ["신뢰", "관계규범", "신중함"],
    loveMeaning: "상대방은 관계를 가볍게 다루지 않으며 기준을 먼저 확인합니다.",
    hiddenMindMeaning: "다시 시작해도 같은 문제가 반복될지 걱정합니다.",
    positiveSignal: "책임감 있는 말투에 신뢰 반응이 올라옵니다.",
    negativeSignal: "모호한 태도에는 거리를 두려는 경향이 강합니다.",
    advice: "약속 가능한 범위만 제안해 신뢰부터 쌓으세요.",
    emotionalTemperature: "미련",
  },
  M06: {
    keywords: ["끌림", "선택", "재결합"],
    loveMeaning: "상대방은 아직 감정적 끌림을 분명히 느끼고 있습니다.",
    hiddenMindMeaning: "관계를 다시 선택해도 되는지 스스로를 설득 중입니다.",
    positiveSignal: "대화 연결이 살아나면 재접근 흐름이 빠르게 열립니다.",
    negativeSignal: "확답 압박을 받으면 다시 후퇴할 수 있습니다.",
    advice: "정답 요구보다 편안한 대화 빈도를 회복하세요.",
    emotionalTemperature: "재접근 가능",
  },
  M07: {
    keywords: ["속도조절", "주도권", "경계"],
    loveMeaning: "상대방은 감정이 있어도 먼저 페이스를 통제하려 합니다.",
    hiddenMindMeaning: "관계가 다시 흔들릴까 봐 스스로 브레이크를 거는 흐름입니다.",
    positiveSignal: "단계적으로 다가오면 반응이 점점 안정됩니다.",
    negativeSignal: "빠른 결론 요구는 즉시 방어를 부릅니다.",
    advice: "한 번에 관계 정의를 묻지 말고 작은 합의부터 만드세요.",
    emotionalTemperature: "혼란",
  },
  M08: {
    keywords: ["절제", "감정통제", "인내"],
    loveMeaning: "상대방은 마음을 억누르며 신중하게 반응하는 타입입니다.",
    hiddenMindMeaning: "감정이 커질수록 오히려 표현을 줄이는 경향이 있습니다.",
    positiveSignal: "안전하다고 느끼면 서서히 진심을 드러냅니다.",
    negativeSignal: "감정 확인 공세는 침묵을 길게 만듭니다.",
    advice: "상대의 답변 속도를 존중하는 것이 핵심입니다.",
    emotionalTemperature: "미련",
  },
  M09: {
    keywords: ["거리두기", "고민", "회피"],
    loveMeaning: "상대방은 감정을 정리하려고 잠시 거리를 두는 흐름입니다.",
    hiddenMindMeaning: "마음이 없어서가 아니라 상처 재발을 피하려는 심리입니다.",
    positiveSignal: "부담이 낮은 안부에는 천천히 반응할 여지가 있습니다.",
    negativeSignal: "대화 강도가 높아지면 다시 닫히기 쉽습니다.",
    advice: "짧은 메시지와 긴 텀의 리듬을 유지하세요.",
    emotionalTemperature: "거리감",
  },
  M10: {
    keywords: ["전환", "타이밍", "변수"],
    loveMeaning: "상대방 감정은 고정이 아니라 타이밍에 따라 크게 흔들립니다.",
    hiddenMindMeaning: "지금은 완전 종결보다 판단 유보에 가깝습니다.",
    positiveSignal: "분위기가 맞으면 예상보다 빠르게 대화가 열릴 수 있습니다.",
    negativeSignal: "타이밍이 어긋나면 반응이 급격히 식을 수 있습니다.",
    advice: "연락 시점은 밤늦은 감정 대화보다 가벼운 낮 톤이 좋습니다.",
    emotionalTemperature: "혼란",
  },
  M11: {
    keywords: ["균형", "책임", "정리"],
    loveMeaning: "상대방은 관계를 감정만이 아니라 책임의 균형으로 봅니다.",
    hiddenMindMeaning: "불리한 구조로 느끼면 의도적으로 거리를 유지합니다.",
    positiveSignal: "공정한 태도를 보이면 대화 문이 열립니다.",
    negativeSignal: "일방적 요구는 즉시 선을 긋게 만듭니다.",
    advice: "요청 전에 상대 입장 인정 문장을 먼저 넣으세요.",
    emotionalTemperature: "거리감",
  },
  M12: {
    keywords: ["유예", "재해석", "망설임"],
    loveMeaning: "상대방은 마음을 끊은 것이 아니라 결정을 미루는 중입니다.",
    hiddenMindMeaning: "다시 시작했을 때의 리스크를 과하게 계산하고 있습니다.",
    positiveSignal: "조급하지 않은 접근에 신뢰를 느낍니다.",
    negativeSignal: "결정 압박에는 더 오래 유예할 수 있습니다.",
    advice: "관계 정의 질문 대신 근황 중심으로 접점을 유지하세요.",
    emotionalTemperature: "혼란",
  },
  M13: {
    keywords: ["종결", "정리의지", "단절시도"],
    loveMeaning: "상대방은 감정을 없애려 하기보다 관계 패턴을 끊으려 합니다.",
    hiddenMindMeaning: "감정이 남아도 다시 다치지 않기 위해 선을 긋는 흐름입니다.",
    positiveSignal: "존중 기반 대화에는 최소한의 창구가 남습니다.",
    negativeSignal: "감정소모형 대화는 완전 단절을 부를 수 있습니다.",
    advice: "상대의 경계를 인정하는 문장을 먼저 제시하세요.",
    emotionalTemperature: "차가움",
  },
  M14: {
    keywords: ["완화", "조율", "관계복구"],
    loveMeaning: "상대방은 급한 재회보다 천천히 관계를 복구하고 싶어 합니다.",
    hiddenMindMeaning: "감정을 부정하지 않지만 속도 조절을 매우 중시합니다.",
    positiveSignal: "부담 없는 대화가 누적되면 재접근 가능성이 커집니다.",
    negativeSignal: "극단적 표현은 바로 뒤로 물러서게 만듭니다.",
    advice: "가볍게 연결하고 천천히 신뢰를 복구하세요.",
    emotionalTemperature: "재접근 가능",
  },
  M15: {
    keywords: ["강한끌림", "집착", "소유욕"],
    loveMeaning: "상대방 감정은 강하지만 건강하게 표현되지 않을 수 있습니다.",
    hiddenMindMeaning: "끌림과 경계가 동시에 커져서 말과 행동이 엇갈립니다.",
    positiveSignal: "감정 정리 대화가 되면 급반등이 가능합니다.",
    negativeSignal: "자극적 대화는 집착과 회피를 동시에 키웁니다.",
    advice: "감정 자극보다 안정감 제공에 집중하세요.",
    emotionalTemperature: "집착",
  },
  M16: {
    keywords: ["충격", "관계붕괴기억", "경계강화"],
    loveMeaning: "상대방은 과거 충돌 기억 때문에 방어를 크게 올린 상태입니다.",
    hiddenMindMeaning: "마음이 없어서가 아니라 다시 무너질까 봐 선을 긋습니다.",
    positiveSignal: "차분한 소통 규칙 제안에는 반응 여지가 있습니다.",
    negativeSignal: "감정 폭발형 대화는 즉시 차단될 가능성이 큽니다.",
    advice: "갈등 원인 재발 방지 문장을 먼저 제시하세요.",
    emotionalTemperature: "차가움",
  },
  M17: {
    keywords: ["희망", "회복의지", "재연결"],
    loveMeaning: "상대방은 관계 회복의 가능성을 아직 버리지 않았습니다.",
    hiddenMindMeaning: "다만 상처 재발을 피하기 위해 확인 과정을 원합니다.",
    positiveSignal: "부드러운 안부와 공감에 반응할 확률이 높습니다.",
    negativeSignal: "재촉하면 기대가 다시 불안으로 바뀔 수 있습니다.",
    advice: "작은 신뢰 신호를 꾸준히 보여주세요.",
    emotionalTemperature: "재접근 가능",
  },
  M18: {
    keywords: ["불안", "오해", "의심"],
    loveMeaning: "상대방은 감정보다 불안이 앞서서 일관성 없는 태도를 보입니다.",
    hiddenMindMeaning: "당신의 의도를 긍정과 부정 사이에서 반복 해석하는 상태입니다.",
    positiveSignal: "명확한 문장에는 불안이 완화됩니다.",
    negativeSignal: "모호한 표현은 오해를 크게 키웁니다.",
    advice: "짧고 분명한 문장으로 오해 여지를 줄이세요.",
    emotionalTemperature: "혼란",
  },
  M19: {
    keywords: ["호감", "개방", "반응회복"],
    loveMeaning: "상대방 마음은 비교적 열려 있으며 다시 연결될 여지가 큽니다.",
    hiddenMindMeaning: "조건만 맞으면 먼저 다가오고 싶은 마음도 있습니다.",
    positiveSignal: "밝고 부담 없는 메시지에 반응성이 높습니다.",
    negativeSignal: "진지한 압박은 개방감을 줄일 수 있습니다.",
    advice: "가벼운 안부와 긍정 톤으로 시작하세요.",
    emotionalTemperature: "호감",
  },
  M20: {
    keywords: ["재판단", "후회", "재기회"],
    loveMeaning: "상대방은 이 관계를 다시 평가하며 기회를 저울질하고 있습니다.",
    hiddenMindMeaning: "후회가 있지만 같은 실수를 반복할까 조심합니다.",
    positiveSignal: "책임 인정이 담긴 문장에 마음이 움직일 수 있습니다.",
    negativeSignal: "책임 회피성 태도에는 빠르게 닫힙니다.",
    advice: "감정 호소보다 변화 의지를 짧게 보여주세요.",
    emotionalTemperature: "미련",
  },
  M21: {
    keywords: ["마무리", "완결", "성숙한 거리"],
    loveMeaning: "상대방은 감정이 남아도 관계를 성숙하게 정리하려는 마음이 큽니다.",
    hiddenMindMeaning: "재접근 가능성은 열어두되, 기준 없는 반복은 원치 않습니다.",
    positiveSignal: "성숙하고 안정된 소통에는 우호적입니다.",
    negativeSignal: "과거 되풀이형 대화에는 문을 닫을 수 있습니다.",
    advice: "관계 재정의가 필요하면 짧고 명확하게 제안하세요.",
    emotionalTemperature: "거리감",
  },
};

const MINOR_SUIT_PROFILE = {
  W: {
    baseKeywords: ["끌림", "열정", "주도권"],
    loveMeaning: "상대방은 감정 에너지가 올라와 있지만 속도 조절에 민감합니다.",
    hiddenMindMeaning: "먼저 다가가면 손해 본다는 자존심이 함께 작동합니다.",
    positiveSignal: "리듬을 맞춰 주면 대화 열기가 올라갑니다.",
    negativeSignal: "감정 압박을 받으면 급격히 식을 수 있습니다.",
    advice: "짧고 밝은 톤으로 접점을 만들고 반응을 보세요.",
  },
  C: {
    baseKeywords: ["감정", "미련", "정서 연결"],
    loveMeaning: "상대방은 정서적으로 아직 관계를 의식하고 있습니다.",
    hiddenMindMeaning: "마음을 정리했다고 말해도 감정은 완전히 끝나지 않았을 가능성이 큽니다.",
    positiveSignal: "공감형 대화에서 반응이 살아납니다.",
    negativeSignal: "비난형 문장에는 바로 닫히는 경향이 있습니다.",
    advice: "가벼운 안부와 공감으로 대화 강도를 조절하세요.",
  },
  S: {
    baseKeywords: ["경계", "거리", "생각 과부하"],
    loveMeaning: "상대방은 감정이 있어도 이성적 방어를 먼저 세우고 있습니다.",
    hiddenMindMeaning: "다시 상처받을 가능성을 크게 계산하는 흐름입니다.",
    positiveSignal: "명확하고 짧은 문장에는 반응 여지가 있습니다.",
    negativeSignal: "감정 추궁형 대화는 차단 반응을 부를 수 있습니다.",
    advice: "질문 수를 줄이고 핵심만 전달하세요.",
  },
  P: {
    baseKeywords: ["현실", "신중함", "안정"],
    loveMeaning: "상대방은 감정보다 현실 조건과 지속 가능성을 먼저 봅니다.",
    hiddenMindMeaning: "불안정한 관계 반복을 피하고 싶은 욕구가 큽니다.",
    positiveSignal: "안정적인 태도에는 신뢰 반응이 올라갑니다.",
    negativeSignal: "모호하거나 즉흥적인 접근은 부담을 줍니다.",
    advice: "약속 가능한 범위에서 천천히 신뢰를 쌓으세요.",
  },
};

const RANK_KEYWORDS = {
  "01": ["시작", "가능성"],
  "02": ["양가감정", "선택"],
  "03": ["관찰", "신호탐색"],
  "04": ["방어", "거리유지"],
  "05": ["갈등기억", "서운함"],
  "06": ["회상", "미련"],
  "07": ["경계", "의심"],
  "08": ["답보", "망설임"],
  "09": ["미련", "불안"],
  "10": ["정리시도", "피로"],
  "11": ["메시지", "호기심"],
  "12": ["급한감정", "충동"],
  "13": ["내면통제", "신중함"],
  "14": ["기준", "책임"],
};

const FALLBACK_MEANING = {
  id: -1,
  code: "FALLBACK",
  name: "Unknown Card",
  keywords: ["관찰", "거리조절", "신중한 접근"],
  loveMeaning: "상대방은 감정을 완전히 닫지 않았지만 신중하게 거리를 조절하고 있습니다.",
  hiddenMindMeaning: "먼저 표현하면 관계에서 불리해질까 봐 방어심리가 작동합니다.",
  positiveSignal: "부담 없는 안부에는 반응 여지가 있습니다.",
  negativeSignal: "감정 압박은 방어를 강화할 수 있습니다.",
  advice: "확답 요구보다 짧은 접점으로 신뢰를 먼저 회복하세요.",
  emotionalTemperature: "혼란",
};

function asText(value) {
  return String(value || "").trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toNumericId(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (!Number.isInteger(n)) return null;
  if (n < 0 || n > 77) return null;
  return n;
}

function cardFromNumericId(id) {
  const n = clamp(Number(id), 0, 77);
  if (n < 22) {
    return {
      numericId: n,
      code: `M${String(n).padStart(2, "0")}`,
      name: MAJOR[n],
    };
  }
  const m = n - 22;
  const suitIndex = Math.floor(m / 14);
  const rankIndex = m % 14;
  return {
    numericId: n,
    code: `${SUIT_CODES[suitIndex]}${String(rankIndex + 1).padStart(2, "0")}`,
    name: `${RANKS[rankIndex]} of ${SUITS[suitIndex]}`,
  };
}

function cardFromCode(code) {
  const token = asText(code).toUpperCase();
  if (/^M\d{2}$/.test(token)) {
    const idx = Number(token.slice(1));
    if (Number.isInteger(idx) && idx >= 0 && idx < 22) {
      return {
        numericId: idx,
        code: token,
        name: MAJOR[idx],
      };
    }
    return null;
  }

  if (/^[WCSP]\d{2}$/.test(token)) {
    const suit = token.charAt(0);
    const rank = Number(token.slice(1));
    const suitIndex = SUIT_CODES.indexOf(suit);
    if (suitIndex < 0 || rank < 1 || rank > 14) return null;
    return {
      numericId: 22 + suitIndex * 14 + (rank - 1),
      code: token,
      name: `${RANKS[rank - 1]} of ${SUITS[suitIndex]}`,
    };
  }

  return null;
}

function resolveCardBase(cardRef, explicitName = "") {
  const numberId = toNumericId(cardRef);
  if (numberId !== null) {
    const base = cardFromNumericId(numberId);
    if (asText(explicitName)) base.name = asText(explicitName);
    return base;
  }

  const text = asText(cardRef);
  if (!text) {
    return asText(explicitName)
      ? { numericId: -1, code: "UNK", name: asText(explicitName) }
      : null;
  }

  const numericToken = toNumericId(text);
  if (numericToken !== null) {
    const base = cardFromNumericId(numericToken);
    if (asText(explicitName)) base.name = asText(explicitName);
    return base;
  }

  const byCode = cardFromCode(text);
  if (byCode) {
    if (asText(explicitName)) byCode.name = asText(explicitName);
    return byCode;
  }

  return asText(explicitName)
    ? { numericId: -1, code: "UNK", name: asText(explicitName) }
    : null;
}

function minorTemperature(code) {
  const suit = code.charAt(0);
  const rank = Number(code.slice(1));

  if (suit === "S") {
    if (rank <= 2) return "거리감";
    if (rank <= 5) return "차가움";
    if (rank <= 8) return "혼란";
    if (rank <= 10) return "차가움";
    return "거리감";
  }

  if (suit === "C") {
    if (rank <= 4) return "호감";
    if (rank === 5) return "혼란";
    if (rank <= 10) return "미련";
    if (rank === 12) return "집착";
    return "호감";
  }

  if (suit === "W") {
    if (rank <= 3) return "호감";
    if (rank <= 5) return "혼란";
    if (rank <= 10) return "집착";
    if (rank === 14) return "거리감";
    return "호감";
  }

  if (suit === "P") {
    if (rank <= 5) return "거리감";
    if (rank <= 8) return "재접근 가능";
    if (rank <= 10) return "호감";
    return "미련";
  }

  return "혼란";
}

function buildMinorMeaning(base) {
  const suit = base.code.charAt(0);
  const rank = base.code.slice(1);
  const profile = MINOR_SUIT_PROFILE[suit] || MINOR_SUIT_PROFILE.P;
  const rankKeywords = RANK_KEYWORDS[rank] || ["신중함", "관계점검"];

  return {
    id: base.numericId,
    code: base.code,
    name: base.name,
    keywords: [...profile.baseKeywords, ...rankKeywords].slice(0, 4),
    loveMeaning: profile.loveMeaning,
    hiddenMindMeaning: profile.hiddenMindMeaning,
    positiveSignal: profile.positiveSignal,
    negativeSignal: profile.negativeSignal,
    advice: profile.advice,
    emotionalTemperature: minorTemperature(base.code),
  };
}

function buildCardMeaning(cardRef, explicitName = "") {
  const base = resolveCardBase(cardRef, explicitName);
  if (!base) return null;

  if (base.code in MAJOR_MEANINGS) {
    const major = MAJOR_MEANINGS[base.code];
    return {
      id: base.numericId,
      code: base.code,
      name: base.name,
      keywords: major.keywords,
      loveMeaning: major.loveMeaning,
      hiddenMindMeaning: major.hiddenMindMeaning,
      positiveSignal: major.positiveSignal,
      negativeSignal: major.negativeSignal,
      advice: major.advice,
      emotionalTemperature: major.emotionalTemperature,
    };
  }

  if (/^[WCSP]\d{2}$/.test(base.code)) {
    return buildMinorMeaning(base);
  }

  return {
    ...FALLBACK_MEANING,
    name: base.name || FALLBACK_MEANING.name,
    id: base.numericId,
    code: base.code,
  };
}

function normalizeLoveSignal(mainTemp, subTemp) {
  const defenseSet = new Set(["차가움", "거리감", "혼란"]);
  const attachSet = new Set(["미련", "호감", "집착", "재접근 가능"]);

  const mainDefense = defenseSet.has(mainTemp);
  const subDefense = defenseSet.has(subTemp);
  const mainAttach = attachSet.has(mainTemp);
  const subAttach = attachSet.has(subTemp);

  if ((mainDefense && subAttach) || (mainAttach && subDefense)) return "혼란";
  if (mainDefense && subDefense) return mainTemp === "차가움" && subTemp === "차가움" ? "거리두기" : "방어";
  if (mainTemp === "재접근 가능" || subTemp === "재접근 가능") return "재접근 가능";
  if (mainTemp === "미련" || subTemp === "미련") return "미련";
  if (mainTemp === "호감" || subTemp === "호감") return "긍정";
  return "혼란";
}

function pairTempScore(mainTemp, subTemp) {
  const score = (TEMP_SCORE[mainTemp] || 2) + (TEMP_SCORE[subTemp] || 2);
  return clamp(Math.round(score / 2), 1, 5);
}

function dynamicComment(mainMeaning, subMeaning) {
  const mainTemp = mainMeaning.emotionalTemperature;
  const subTemp = subMeaning.emotionalTemperature;
  const signal = normalizeLoveSignal(mainTemp, subTemp);

  if (signal === "혼란") {
    return "카드 조합상 감정은 남아 있지만 방어심리도 함께 커져 양가감정이 강한 구간입니다.";
  }
  if (signal === "방어" || signal === "거리두기") {
    return "상대방은 다가오고 싶은 마음보다 자기보호를 먼저 선택하는 흐름입니다.";
  }
  if (signal === "미련") {
    return "상대방은 끝났다고 생각하려 하면서도 완전히 놓지 못한 감정이 남아 있습니다.";
  }
  if (signal === "재접근 가능") {
    return "타이밍만 맞으면 다시 대화가 살아날 수 있는 재접근 신호가 확인됩니다.";
  }
  return "상대방의 감정선이 비교적 열려 있어 반응 가능성은 낮지 않습니다.";
}

function sanitizeText(input) {
  let text = asText(input);
  if (!text) return "";

  FORBIDDEN_PHRASES.forEach((phrase) => {
    text = text.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "");
  });

  text = text.replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

function normalizeMindscanPair(pair, idx) {
  const slot = Number(pair?.slot || idx + 1);
  const positionLabel = asText(pair?.positionLabel) || BASE_POSITION_TITLES[idx] || `포지션 ${slot}`;
  const positionMeaning = asText(pair?.positionMeaning) || "상대방 심리의 핵심 축을 읽는 자리";

  const mainMeaning = buildCardMeaning(pair?.mainCardId, pair?.mainCardName);
  const subMeaning = buildCardMeaning(pair?.subCardId, pair?.subCardName);

  if (!mainMeaning && !FALLBACK_MEANING) {
    return {
      ok: false,
      error: "카드 의미 데이터가 누락되어 정확한 해석을 생성할 수 없습니다",
    };
  }
  if (!subMeaning && !FALLBACK_MEANING) {
    return {
      ok: false,
      error: "카드 의미 데이터가 누락되어 정확한 해석을 생성할 수 없습니다",
    };
  }

  return {
    ok: true,
    slot,
    positionLabel,
    positionMeaning,
    mainCard: mainMeaning || FALLBACK_MEANING,
    subCard: subMeaning || FALLBACK_MEANING,
    usedFallback: !mainMeaning || !subMeaning,
  };
}

function buildSectionNarrative(definition, pair, pairedContext) {
  const main = pair.mainCard;
  const sub = pair.subCard;
  const signal = normalizeLoveSignal(main.emotionalTemperature, sub.emotionalTemperature);
  const temperature = pairTempScore(main.emotionalTemperature, sub.emotionalTemperature);
  const pairComment = dynamicComment(main, sub);

  const secondPairMain = pairedContext?.mainCard;
  const secondPairSub = pairedContext?.subCard;
  const synthesisHint = secondPairMain && secondPairSub
    ? `보조 흐름으로 ${secondPairMain.name}와 ${secondPairSub.name}가 더해져 판단의 현실성이 강화됩니다.`
    : "";

  let summary = "";
  let detail = [];

  if (definition.key === "surface") {
    summary = `메인 카드 ${main.name}는 상대방이 겉으로 감정을 단정하게 관리하려는 태도를 보여줍니다. 보조 카드 ${sub.name}는 그 태도의 배경에 ${sub.hiddenMindMeaning.toLowerCase()}가 있음을 드러냅니다.`;
    detail = [
      `${main.loveMeaning}`,
      `${pairComment}`,
      "즉, 무심한 척하는 모습이 곧 무관심을 뜻한다고 단정하기보다는, 감정 노출을 통제하는 패턴으로 해석하는 편이 카드상 더 정확합니다.",
    ];
  } else if (definition.key === "inner") {
    summary = `상대방의 실제 속마음 중심축은 ${main.name}이며, ${main.hiddenMindMeaning.toLowerCase()}가 핵심입니다. ${sub.name}는 그 감정이 단순 호감/거절이 아닌 복합 감정으로 작동함을 보여줍니다.`;
    detail = [
      `${main.positiveSignal}`,
      `${sub.negativeSignal}`,
      "카드 흐름상 이 사람은 호감, 미련, 경계심이 동시에 존재할 수 있으며, 그래서 반응이 들쑥날쑥하게 보일 가능성이 큽니다.",
    ];
  } else if (definition.key === "hesitation") {
    summary = `상대방이 먼저 다가오지 않는 이유는 ${main.name}가 말하는 ${main.keywords.join(", ")} 심리가 앞서기 때문입니다. ${sub.name}는 ${sub.advice.toLowerCase()}라는 현실적 변수를 시사합니다.`;
    detail = [
      "지금의 침묵은 마음이 없어서라기보다, 먼저 다가가면 감정적으로 불리해질 수 있다는 자기보호 해석이 강한 상태입니다.",
      `${pairComment}`,
      "따라서 '연락이 없으니 끝'으로 단정하기보다, 상대가 감정 리스크를 어떻게 관리하는지 관찰하는 접근이 더 타당합니다.",
    ];
  } else if (definition.key === "hiddenNeed") {
    summary = `상대방의 숨겨진 욕구는 ${main.name}와 ${sub.name} 조합에서 '관계 주도권은 지키되 연결은 끊고 싶지 않은 심리'로 읽힙니다.`;
    detail = [
      `${main.hiddenMindMeaning}`,
      `${sub.positiveSignal}`,
      "특히 카드상으로는 상대가 먼저 크게 움직이기보다, 당신의 반응을 통해 안전성을 확인받고 싶어 하는 흐름이 강합니다.",
    ];
  } else if (definition.key === "relation") {
    summary = `관계 판단 카드인 ${main.name}는 이 관계를 완전 종결보다 '유보된 상태'로 보는 경향을 시사합니다. ${sub.name}는 관계를 다시 열기 전에 조건을 확인하려는 심리를 보강합니다.`;
    detail = [
      `${main.loveMeaning}`,
      `${sub.hiddenMindMeaning}`,
      `감정 온도는 5단계 중 ${temperature}단계에 가깝습니다. 차갑게 정리된 상태라기보다, 다시 열릴 가능성과 경계심이 함께 있는 구간입니다.`,
    ];
  } else if (definition.key === "future") {
    summary = `단기 흐름은 급격한 고백보다 작은 신호 교환에 가깝습니다. ${main.name}의 흐름과 ${sub.name}의 흐름을 합치면, 상대방은 분위기 확인이 되면 반응을 조금씩 열 가능성이 있습니다.`;
    detail = [
      "연락 가능성은 낮지 않지만, 감정 압박이나 관계 정의를 급하게 요구하면 다시 방어적으로 물러날 수 있습니다.",
      `${pairComment}`,
      synthesisHint || "변수는 상대의 자존심과 감정 피로도이며, 이를 건드리지 않는 접근이 핵심입니다.",
    ];
  } else {
    summary = `지금 당신의 최적 행동은 감정 확인보다 부담 없는 접점을 만드는 것입니다. ${main.name}와 ${sub.name} 조합상 상대는 '가벼운 연결'에는 반응 여지가 있지만 '확답 압박'에는 방어적으로 변하기 쉽습니다.`;
    detail = [
      "먼저 연락은 가능하지만 짧고 부드러운 톤이 유리합니다.",
      "피해야 할 표현: '왜 연락 안 해?', '확실히 말해줘', '나한테 마음 있어 없어?'.",
      "추천 전략: 안부 1문장 + 부담 주지 않는 의도 1문장 + 열린 질문 1문장 구조를 사용하세요.",
    ];
  }

  const content = [summary, ...detail].map(sanitizeText).filter(Boolean).join("\n");

  return {
    slot: definition.slot,
    icon: definition.icon,
    title: definition.title,
    subtitle: definition.subtitle,
    mainCardName: main.name,
    subCardName: sub.name,
    mainCardKeywords: main.keywords,
    subCardKeywords: sub.keywords,
    summary: sanitizeText(summary),
    detail: detail.map((line) => sanitizeText(line)).filter(Boolean),
    loveSignal: signal,
    emotionalTemperature: temperature,
    content,
  };
}

function buildSummaryCard(sections) {
  const safeSections = Array.isArray(sections) ? sections : [];
  const tempAvg = safeSections.length
    ? safeSections.reduce((acc, cur) => acc + clamp(Number(cur?.emotionalTemperature || 3), 1, 5), 0) / safeSections.length
    : 3;
  const emotionalTemperature = clamp(Math.round(tempAvg), 1, 5);

  const signals = safeSections.map((item) => asText(item?.loveSignal));
  const defensive = signals.filter((s) => s === "방어" || s === "거리두기" || s === "혼란").length;
  const reconnective = signals.filter((s) => s === "재접근 가능" || s === "긍정" || s === "미련").length;

  let contactChance = "낮지는 않지만, 자존심과 방어심리가 변수";
  let reApproachChance = "중간";
  if (reconnective >= defensive + 2) {
    contactChance = "대화 재개 가능성이 비교적 높은 편";
    reApproachChance = "중상";
  } else if (defensive >= reconnective + 2) {
    contactChance = "즉시 연락보다 시간 간격을 두는 편이 유리";
    reApproachChance = "중하";
  }

  const relationFlow = defensive > reconnective
    ? "단절보다 거리두기에 가까운 흐름"
    : "거리두기 속에서도 재연결 여지가 남아 있는 흐름";

  const corePsychology = defensive >= reconnective
    ? "미련은 있지만 먼저 다가오기는 조심스러운 상태"
    : "관계를 의식하고 있지만 확신이 부족해 반응을 조절하는 상태";

  return {
    emotionalTemperature,
    emotionalTemperatureText: `${emotionalTemperature} / 5`,
    corePsychology,
    contactChance,
    relationFlow,
    reApproachChance,
    recommendedAction: "무거운 확인보다 가벼운 안부로 접점을 만들기",
  };
}

function buildSuggestedMessages(summaryCard) {
  const isDefensive = /중하|시간 간격|조심/.test(asText(summaryCard?.reApproachChance) + asText(summaryCard?.contactChance));

  if (isDefensive) {
    return [
      {
        tone: "부담 없는 안부형",
        text: "문득 생각나서 연락했어. 답장 부담은 안 가져도 돼. 그냥 잘 지내는지 궁금했어.",
      },
      {
        tone: "조심스러운 재접점형",
        text: "갑자기 깊은 얘기하려는 건 아니야. 그냥 가볍게 안부만 전하고 싶었어.",
      },
      {
        tone: "거리 존중형",
        text: "답장 없어도 괜찮아. 그냥 네가 편안했으면 해서 남겨.",
      },
    ];
  }

  return [
    {
      tone: "부담 없는 안부형",
      text: "문득 생각나서 연락했어. 잘 지내고 있는지 궁금했어.",
    },
    {
      tone: "부드러운 재접점형",
      text: "요즘 가끔 네 생각이 나더라. 부담 주려는 건 아니고 그냥 안부 묻고 싶었어.",
    },
    {
      tone: "관계 회복형",
      text: "지난 일에 대해 나도 생각이 많았어. 언젠가 편하게 이야기할 수 있으면 좋겠어.",
    },
  ];
}

function buildOneLineConclusion(summaryCard) {
  const flow = asText(summaryCard?.relationFlow);
  if (flow.includes("거리두기")) {
    return "한 줄 결론: 상대방은 완전히 마음을 닫은 것은 아니지만, 먼저 흔들리는 모습을 보이기 싫어 감정을 숨기고 있는 상태입니다.";
  }
  return "한 줄 결론: 상대방은 당신을 의식하고 있으며, 부담이 낮은 접점이 생기면 다시 관계를 움직일 가능성이 있습니다.";
}

export function buildMindscanReadingPayload(rawPairs) {
  const pairsInput = Array.isArray(rawPairs) ? rawPairs.slice(0, 5) : [];
  if (!pairsInput.length) {
    return { ok: false, message: "카드 페어 데이터가 필요합니다." };
  }

  const normalizedPairs = [];
  let fallbackCount = 0;
  for (let i = 0; i < pairsInput.length; i += 1) {
    const normalized = normalizeMindscanPair(pairsInput[i], i);
    if (!normalized.ok) {
      return {
        ok: false,
        message: "카드 의미 데이터가 누락되어 정확한 해석을 생성할 수 없습니다",
      };
    }
    if (normalized.usedFallback) fallbackCount += 1;
    normalizedPairs.push(normalized);
  }

  while (normalizedPairs.length < 5) {
    const fill = normalizeMindscanPair({}, normalizedPairs.length);
    if (!fill.ok) {
      return {
        ok: false,
        message: "카드 의미 데이터가 누락되어 정확한 해석을 생성할 수 없습니다",
      };
    }
    fallbackCount += 1;
    normalizedPairs.push(fill);
  }

  const sections = SECTION_BLUEPRINTS.map((definition) => {
    const basePair = normalizedPairs[definition.pairIndex] || normalizedPairs[0];
    const secondPair = Number.isInteger(definition.secondaryPairIndex)
      ? normalizedPairs[definition.secondaryPairIndex]
      : null;
    return buildSectionNarrative(definition, basePair, secondPair);
  });

  const summaryCard = buildSummaryCard(sections);
  const suggestedMessages = buildSuggestedMessages(summaryCard);
  const oneLineConclusion = buildOneLineConclusion(summaryCard);

  const intro = sanitizeText(
    "지금부터 이 리딩은 당신의 마음이 아니라, 당신이 궁금해하는 그 사람의 현재 심리와 숨겨진 감정 흐름을 중심으로 해석합니다. "
    + "겉으로 보이는 태도와 실제 속마음이 다를 수 있으므로, 카드가 보여주는 감정의 온도와 방어심리를 함께 읽어보겠습니다."
  );

  const masterAdvice = sanitizeText(
    "지금은 감정 확인보다 부담 없는 접점이 우선입니다. 짧은 안부로 연결감을 만들고, 상대의 반응 속도를 존중하면서 대화 리듬을 맞추세요. "
    + "무거운 관계 정의 질문은 초반에 피하고, 일관된 태도로 신뢰를 복구하는 쪽이 카드상 더 유리합니다."
  );

  const closing = sanitizeText(oneLineConclusion);

  const warnings = [];
  if (fallbackCount > 0) {
    warnings.push("카드 의미 데이터 일부가 누락되어 fallbackMeaning을 사용했습니다.");
  }

  return {
    ok: true,
    source: "rule-engine",
    persona: "연애 심리 타로 마스터",
    intro,
    summaryCard,
    sections,
    masterAdvice,
    suggestedMessages,
    oneLineConclusion: closing,
    closing,
    dataWarnings: warnings,
    cardMeaningPolicy: {
      required: [
        "keywords",
        "loveMeaning",
        "hiddenMindMeaning",
        "positiveSignal",
        "negativeSignal",
        "advice",
        "emotionalTemperature",
      ],
      emotionalTemperatureLabels: TEMPERATURE_LABELS,
    },
  };
}
