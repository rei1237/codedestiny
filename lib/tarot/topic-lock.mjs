// 타로 해석 Topic Lock 정본
//
// 해석 순서를 뒤집는다:
//   (X) 카드의 일반 의미 → 답변
//   (O) 사용자가 고른 질문 영역 → 카드 상징 추출 → 그 영역 안에서 의미 변환 → 답변
//
// 카드 데이터를 지우거나 무시하지 않는다. 카드의 전통적 의미는 그대로 두되,
// 최종 답변에 raw 키워드가 직접 노출되지 않고 반드시 readingTopic으로 한 번
// 번역된 뒤 쓰이도록 만드는 것이 이 모듈의 역할이다.
//
// 순수 함수만 둔다(Node 내장 API 금지) — worker 번들에서 그대로 쓰인다.

import { getMeaningByQuestion } from "./tarot-interpretation-engine.mjs";

function asText(value) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// ── 도메인 어휘 ────────────────────────────────────────────────────────────
// "핵심 결론으로 쓰이면 실패"인 어휘만 담는다. 보조 맥락으로 스치는 언급은
// detectTopicDrift가 문장 단위 앵커 검사로 통과시킨다.
// 한국어는 조사가 붙어 어절 경계를 잡기 어렵다("수입을"). 그래서 부분 문자열로 보되,
// 다른 단어에 삼켜지는 짧은 토큰은 쓰지 않는다(예: "재정" → "재정비"까지 걸린다).
const MONEY_CORE_VOCAB = [
  "재물운", "금전운", "재정적", "재정 상태", "재정 관리", "재정 안정",
  "수입", "재산", "자산", "투자", "저축", "재테크",
  "목돈", "수익률", "매출", "금전적 이익", "돈이 들어온다", "돈이 들어옵니다",
];

const ROMANCE_CORE_VOCAB = [
  "연애운", "애정운", "이성운", "새로운 사랑", "새로운 인연이 찾아", "고백",
  "썸", "결혼운", "사랑이 찾아옵니다", "사랑이 찾아온다",
];

const CAREER_CORE_VOCAB = ["승진운", "이직운", "연봉", "취업운", "사업운"];

// ── 상징 축 ────────────────────────────────────────────────────────────────
// 슈트/원소를 "카드가 무엇을 말하는 카드인가"의 축으로 환원한다.
// 이 축을 주제 언어로 옮기는 것이 symbolTranslation이다.
const SYMBOL_AXIS = {
  material: "소유 · 보존 · 안정 · 축적",
  emotion: "감정 · 정서 · 교류 · 애착",
  thought: "생각 · 판단 · 대화 · 갈등",
  action: "행동 · 추진 · 열정 · 전개",
  turning: "전환점 · 운명적 흐름 · 큰 국면",
};

const SUIT_TO_AXIS = {
  pentacles: "material",
  cups: "emotion",
  swords: "thought",
  wands: "action",
};

// ── 주제별 상징 변환표 ─────────────────────────────────────────────────────
// 같은 축(예: material = 소유·보존·안정)이 주제마다 현실에서 다른 얼굴로 나타난다.
// 사양 §3 · §4 · §7 의 구현체다.
const SYMBOL_TRANSLATIONS = {
  daily: {
    material: "오늘의 현실적인 처리, 실무, 돈과 물건을 챙기는 생활 감각으로 나타납니다.",
    emotion: "오늘의 기분, 사람과의 접촉, 마음의 온도 변화로 나타납니다.",
    thought: "오늘의 판단, 결정, 대화에서의 마찰로 나타납니다.",
    action: "오늘의 추진력, 일정 소화, 몸을 움직이는 흐름으로 나타납니다.",
    turning: "오늘 하루의 방향을 바꾸는 큰 변수로 나타납니다.",
  },
  love: {
    material: "관계의 지속 가능성, 현실적인 조건, 상대의 책임감과 안정 욕구로 나타납니다.",
    emotion: "호감의 온도, 정서적 교류, 애착과 서운함으로 나타납니다.",
    thought: "대화의 방식, 오해와 거리감, 관계에 대한 판단으로 나타납니다.",
    action: "먼저 다가가는 속도, 표현의 적극성, 관계를 밀고 나가는 힘으로 나타납니다.",
    turning: "관계의 단계가 바뀌는 결정적 국면으로 나타납니다.",
  },
  reunion: {
    material: "관계를 쉽게 놓지 못하는 마음, 다시 안정시키고 싶은 욕구, 재회를 가로막는 현실 조건으로 나타납니다.",
    emotion: "남아 있는 감정과 추억, 그리움, 상대의 미련으로 나타납니다.",
    thought: "연락의 단절, 냉정한 거리두기, 관계를 다시 판단하는 과정으로 나타납니다.",
    action: "다시 움직이는 에너지, 충동적인 연락, 관계가 재점화되는 힘으로 나타납니다.",
    turning: "재회 가능성이 열리거나 닫히는 결정적 시점으로 나타납니다.",
  },
  career: {
    material: "실무 능력, 성과와 보상, 지금 자리를 지키려는 안정 지향으로 나타납니다.",
    emotion: "직장 내 인간관계, 업무 만족도, 동료와의 정서적 협업으로 나타납니다.",
    thought: "경쟁과 전략, 판단, 조직 안의 갈등으로 나타납니다.",
    action: "추진력, 프로젝트 전개, 리더십과 도전으로 나타납니다.",
    turning: "역할이나 소속이 바뀌는 커리어의 분기점으로 나타납니다.",
  },
  money: {
    material: "자산 보존, 저축, 안정적인 재정 상태로 나타납니다.",
    emotion: "소비에 대한 감정, 만족을 위한 지출, 사람을 통해 들어오는 기회로 나타납니다.",
    thought: "손익 판단, 계약 조건 점검, 리스크 계산으로 나타납니다.",
    action: "투자와 사업의 실행, 수입을 늘리는 움직임으로 나타납니다.",
    turning: "재정 구조가 바뀌는 큰 전환으로 나타납니다.",
  },
  health: {
    material: "생활 리듬의 기반, 체력의 축적, 몸을 지탱하는 습관으로 나타납니다.",
    emotion: "정서적 피로, 마음의 긴장, 회복이 필요한 감정 상태로 나타납니다.",
    thought: "과한 생각, 수면을 흔드는 불안, 신경의 예민함으로 나타납니다.",
    action: "활동량, 무리한 소모, 몸을 움직이는 에너지로 나타납니다.",
    turning: "생활 방식을 바꿔야 하는 몸의 신호로 나타납니다.",
  },
  exam: {
    material: "꾸준히 쌓아 온 준비량, 안정적인 실력, 반복 학습의 축적으로 나타납니다.",
    emotion: "시험을 앞둔 불안과 자신감, 멘탈의 기복으로 나타납니다.",
    thought: "집중력, 문제 해석, 실수 가능성과 전략으로 나타납니다.",
    action: "학습 실행력, 남은 기간의 추진 속도로 나타납니다.",
    turning: "합격 여부를 가르는 결정적 구간으로 나타납니다.",
  },
  people: {
    material: "오래 지속되는 신뢰, 관계의 현실적 기반, 공동체적 유대로 나타납니다.",
    emotion: "친밀감, 서운함, 정서적 지지와 거리감으로 나타납니다.",
    thought: "말의 오해, 갈등과 조율, 상대에 대한 판단으로 나타납니다.",
    action: "먼저 손을 내미는 태도, 관계를 넓히는 움직임으로 나타납니다.",
    turning: "관계의 성격이 바뀌는 분기점으로 나타납니다.",
  },
  general: {
    material: "지금 지키고 쌓아야 할 현실적 기반으로 나타납니다.",
    emotion: "지금 흐르고 있는 감정과 관계의 결로 나타납니다.",
    thought: "지금 내려야 할 판단과 정리해야 할 생각으로 나타납니다.",
    action: "지금 실행해야 할 움직임과 추진의 방향으로 나타납니다.",
    turning: "지금 지나가고 있는 큰 국면의 전환으로 나타납니다.",
  },
};

// ── 주제 프로파일 ──────────────────────────────────────────────────────────
// cardMeaningKey: 78장 덱의 주제별 의미 필드명(QUESTION_TYPES)으로의 매핑.
//   health / exam / people 은 카드 데이터에 전용 필드가 없어 가장 가까운 필드를 쓴다.
const TOPIC_LOCK_PROFILES = {
  daily: {
    key: "daily",
    label: "오늘의 운세",
    cardMeaningKey: "daily",
    symbolKey: "daily",
    scope: "오늘 하루의 흐름, 일어날 수 있는 사건, 감정, 행동, 주의점",
    allowedVocab: ["오늘", "하루", "일정", "기분", "컨디션", "선택", "리듬"],
    foreignVocab: [],
  },
  love: {
    key: "love",
    label: "애정운",
    cardMeaningKey: "love",
    symbolKey: "love",
    scope: "연애, 호감, 감정, 관계, 상대방의 태도, 소통, 갈등, 애착, 관계의 발전",
    allowedVocab: ["관계", "상대", "감정", "마음", "연애", "호감", "애착", "대화", "거리"],
    foreignVocab: [...MONEY_CORE_VOCAB, ...CAREER_CORE_VOCAB],
  },
  relationship: {
    key: "relationship",
    label: "관계운",
    cardMeaningKey: "relationship",
    symbolKey: "love",
    scope: "두 사람 사이의 관계 구조, 서로의 태도, 관계가 나아갈 방향",
    allowedVocab: ["관계", "상대", "감정", "마음", "태도", "거리", "대화"],
    foreignVocab: [...MONEY_CORE_VOCAB, ...CAREER_CORE_VOCAB],
  },
  reunion: {
    key: "reunion",
    label: "재회운",
    cardMeaningKey: "reunion",
    symbolKey: "reunion",
    scope:
      "상대방의 현재 심리와 미련, 관계에 대한 기억, 연락과 재접촉 가능성, 재회의 장애물, "
      + "재회 후 관계의 흐름, 누가 먼저 움직이는 것이 유리한가, 과거 관계에서 반복될 문제",
    allowedVocab: ["상대", "관계", "재회", "연락", "감정", "미련", "마음", "과거", "회복"],
    foreignVocab: [...MONEY_CORE_VOCAB, ...CAREER_CORE_VOCAB],
  },
  exMind: {
    key: "exMind",
    label: "상대의 속마음",
    cardMeaningKey: "exMind",
    symbolKey: "reunion",
    scope: "상대가 겉으로 보이는 태도와 숨긴 감정의 간극, 침묵의 이유, 다가올 수 있는 조건",
    allowedVocab: ["상대", "마음", "감정", "관계", "침묵", "태도", "연락"],
    foreignVocab: [...MONEY_CORE_VOCAB, ...CAREER_CORE_VOCAB],
  },
  currentMind: {
    key: "currentMind",
    label: "지금 상대의 마음",
    cardMeaningKey: "currentMind",
    symbolKey: "love",
    scope: "현재 상대가 이 관계를 어떻게 느끼고 있는지와 그 감정의 방향",
    allowedVocab: ["상대", "마음", "감정", "관계", "태도", "지금"],
    foreignVocab: [...MONEY_CORE_VOCAB, ...CAREER_CORE_VOCAB],
  },
  career: {
    key: "career",
    label: "직장·커리어운",
    cardMeaningKey: "career",
    symbolKey: "career",
    scope: "업무, 승진, 조직, 성과, 이직, 프로젝트, 상사·동료 관계, 직업적 방향성",
    allowedVocab: ["업무", "일", "직장", "조직", "성과", "동료", "역할", "커리어", "협업"],
    foreignVocab: ROMANCE_CORE_VOCAB,
  },
  money: {
    key: "money",
    label: "재물운",
    cardMeaningKey: "money",
    symbolKey: "money",
    scope: "수입, 지출, 투자, 자산, 기회, 손실, 안정성, 사업, 계약, 경제적 판단",
    allowedVocab: ["수입", "지출", "돈", "자산", "투자", "계약", "재정", "손실", "기회"],
    foreignVocab: ROMANCE_CORE_VOCAB,
  },
  health: {
    key: "health",
    label: "건강운",
    cardMeaningKey: "general",
    symbolKey: "health",
    scope: "생활 리듬, 스트레스, 에너지, 휴식, 몸과 마음의 균형 (의학적 진단처럼 단정하지 않는다)",
    allowedVocab: ["몸", "마음", "휴식", "피로", "리듬", "수면", "에너지", "회복", "긴장"],
    foreignVocab: [...MONEY_CORE_VOCAB, ...ROMANCE_CORE_VOCAB],
  },
  exam: {
    key: "exam",
    label: "시험·합격운",
    cardMeaningKey: "career",
    symbolKey: "exam",
    scope: "학습, 집중력, 준비 상태, 경쟁, 결과, 실수 가능성, 시험 전략",
    allowedVocab: ["공부", "학습", "시험", "집중", "준비", "실수", "경쟁", "합격", "점수"],
    foreignVocab: [...MONEY_CORE_VOCAB, ...ROMANCE_CORE_VOCAB],
  },
  people: {
    key: "people",
    label: "대인관계운",
    cardMeaningKey: "relationship",
    symbolKey: "people",
    scope: "인간관계, 신뢰, 거리감, 갈등, 소통, 협력, 상대방의 태도",
    allowedVocab: ["관계", "사람", "상대", "신뢰", "갈등", "대화", "거리", "협력"],
    foreignVocab: [...MONEY_CORE_VOCAB, ...ROMANCE_CORE_VOCAB],
  },
  future: {
    key: "future",
    label: "앞으로의 흐름",
    cardMeaningKey: "future",
    symbolKey: "daily",
    scope: "앞으로 다가올 시기의 전반적인 흐름과 준비해야 할 지점",
    allowedVocab: ["흐름", "시기", "변화", "준비", "앞으로"],
    foreignVocab: [],
  },
  general: {
    key: "general",
    label: "전반적인 흐름",
    cardMeaningKey: "general",
    symbolKey: "general",
    scope: "지금 삶 전반에서 가장 크게 작동하는 흐름",
    allowedVocab: ["흐름", "지금", "선택", "변화"],
    foreignVocab: [],
  },
};

const TOPIC_ALIASES = {
  today: "daily", 오늘: "daily", "오늘의 운세": "daily", travel: "daily",
  연애: "love", 연애운: "love", 애정: "love", 애정운: "love",
  재회: "reunion", 재회운: "reunion",
  exmind: "exMind", mindscan: "exMind", 속마음: "exMind",
  currentmind: "currentMind",
  job: "career", contract: "career", creative: "career",
  직장: "career", 커리어: "career", "직장·커리어운": "career", 진로: "career",
  wealth: "money", finance: "money", loss: "money",
  재물: "money", 재물운: "money", 금전: "money",
  건강: "health", 건강운: "health",
  test: "exam", 시험: "exam", 합격: "exam", "시험·합격운": "exam",
  friendship: "people", 대인관계: "people", "대인관계운": "people",
  yearly: "future", year: "future", 연간: "future",
};

function resolveTopicKey(raw) {
  const value = asText(raw);
  if (!value) return "general";
  if (TOPIC_LOCK_PROFILES[value]) return value;
  const lower = value.toLowerCase();
  if (TOPIC_LOCK_PROFILES[lower]) return lower;
  return TOPIC_ALIASES[value] || TOPIC_ALIASES[lower] || "general";
}

function getTopicProfile(raw) {
  return TOPIC_LOCK_PROFILES[resolveTopicKey(raw)];
}

function getSymbolAxisKey(card) {
  const suit = asText(card?.suit).toLowerCase();
  if (SUIT_TO_AXIS[suit]) return SUIT_TO_AXIS[suit];
  return "turning";
}

// 카드의 고정 키워드를 답변에 그대로 옮기지 않고, 주제 언어로 한 번 번역해서 돌려준다.
function translateSymbolForTopic(card, topic) {
  const profile = getTopicProfile(topic);
  const axisKey = getSymbolAxisKey(card);
  const table = SYMBOL_TRANSLATIONS[profile.symbolKey] || SYMBOL_TRANSLATIONS.general;
  return {
    axisKey,
    axisLabel: SYMBOL_AXIS[axisKey],
    translated: table[axisKey] || table.turning,
  };
}

// 사양 §11 의 입력 스키마. cardCoreMeaning 은 "답변"이 아니라 "원재료"다.
function buildCardTopicContext(card, orientation, topic) {
  const profile = getTopicProfile(topic);
  const dir = orientation === "reversed" ? "reversed" : "upright";
  const meaning = getMeaningByQuestion(card, dir, profile.cardMeaningKey);
  const symbol = translateSymbolForTopic(card, profile.key);

  return {
    readingTopic: profile.label,
    readingTopicScope: profile.scope,
    cardName: asText(card?.nameKo) || asText(card?.nameEn),
    cardNameEn: asText(card?.nameEn),
    orientation: dir === "reversed" ? "역방향" : "정방향",
    cardCoreMeaning: meaning.line,
    cardSymbols: symbol.axisLabel,
    cardArchetype: asText(card?.focus) || asText(meaning.core),
    topicProjection: symbol.translated,
  };
}

// ── 프롬프트 블록 ──────────────────────────────────────────────────────────
// 아래 문장들은 TOPIC_LOCK_PROMPT_MARKERS 와 짝을 이룬다. 문구를 바꾸면
// verify:tarot-topic-lock 의 파리티 단언이 함께 깨지므로 같이 고쳐야 한다.
const TOPIC_LOCK_PROMPT_MARKERS = [
  "해석 우선순위",
  "카드의 대표 키워드를 질문 분야보다 우선하지 않는다",
  "cardCoreMeaning은 고정된 답변이 아니라 의미를 변환하기 위한 원재료다",
  "최종 결론은 반드시 이 질문 영역에 대한 답이어야 한다",
  "카드 이름이나 키워드를 그대로 옮겨 적는 해석은 실패다",
  "역방향은 무조건 나쁜 사건이 아니라",
];

function buildTopicLockPromptBlock(topic, { userQuestion } = {}) {
  const profile = getTopicProfile(topic);
  const question = asText(userQuestion);
  const foreign = profile.foreignVocab.slice(0, 8).join(", ");

  return [
    `[질문 영역 고정] ${profile.label}`,
    `이번 리딩에서 카드가 대답해야 하는 범위: ${profile.scope}`,
    question ? `내담자가 실제로 물은 것: ${question}` : "",
    "",
    "해석 우선순위 — 위에서부터 순서대로 적용한다.",
    "1) 사용자가 선택한 상담 주제",
    "2) 카드의 정방향/역방향과 핵심 아키타입",
    "3) 카드의 상징, 원소, 숫자, 인물, 상황",
    "4) 카드의 전통적인 의미",
    "5) 보조적인 현실 키워드",
    "카드의 대표 키워드를 질문 분야보다 우선하지 않는다.",
    "",
    "cardCoreMeaning은 고정된 답변이 아니라 의미를 변환하기 위한 원재료다.",
    "readingTopic + cardCoreMeaning + orientation + cardSymbols 를 결합해 이 질문 영역 안의 언어로 옮긴 뒤에 답을 쓴다.",
    "카드 이름이나 키워드를 그대로 옮겨 적는 해석은 실패다. \"펜타클이 나왔으므로 돈과 관련된 운입니다\" 같은 직역을 쓰지 마라.",
    "카드의 의미가 이 질문 영역과 직접 연결되지 않아 보여도 원래 분야를 설명하지 말고, 상징을 추출해 이 영역에 투영해라.",
    foreign
      ? `${foreign} 같은 표현을 답변의 핵심 결론으로 삼지 마라. 이 질문 영역의 현실적 조건을 설명하는 보조 맥락으로는 써도 된다.`
      : "",
    "역방향은 무조건 나쁜 사건이 아니라, 정방향의 핵심 상징이 이 질문 영역에서 막히거나 왜곡되거나 지연되거나 과도하게 나타나는 방식으로 읽는다.",
    "",
    "답변은 다음 흐름을 지킨다.",
    "① 이 질문 영역에 대한 핵심 메시지 ② 카드의 핵심 상징 ③ 이 영역에서 그 상징이 뜻하는 것 ④ 지금 상황에서 나타나는 방식",
    "⑤ 긍정적인 가능성 ⑥ 주의할 부분 ⑦ 실제 행동 조언 ⑧ 한 줄 결론",
    "카드 설명이 아니라 상담 결과가 답변의 중심이어야 한다.",
    `최종 결론은 반드시 이 질문 영역에 대한 답이어야 한다. 카드 의미가 맞더라도 ${profile.label}에 대한 답이 아니면 실패다.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ── 이탈 감지 (사양 §12) ───────────────────────────────────────────────────
// 재생성은 하지 않는다. 감지 결과만 돌려주고 판단은 호출자(주로 verify 스크립트)가 한다.
function splitSentences(text) {
  return asText(text)
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function detectTopicDrift(text, topic) {
  const profile = getTopicProfile(topic);
  const source = asText(text);
  if (!source || !profile.foreignVocab.length) return { ok: true, topic: profile.key, offenders: [] };

  const offenders = [];
  for (const sentence of splitSentences(source)) {
    // 같은 문장 안에 이 주제의 앵커 어휘가 있으면 "현실적 조건"을 설명하는 보조 맥락으로 본다.
    const contextualized = profile.allowedVocab.some((word) => sentence.includes(word));
    if (contextualized) continue;
    for (const word of profile.foreignVocab) {
      if (sentence.includes(word)) {
        offenders.push({ word, sentence });
        break;
      }
    }
  }

  return { ok: offenders.length === 0, topic: profile.key, offenders };
}

export {
  TOPIC_LOCK_PROFILES,
  TOPIC_LOCK_PROMPT_MARKERS,
  SYMBOL_AXIS,
  resolveTopicKey,
  getTopicProfile,
  translateSymbolForTopic,
  buildCardTopicContext,
  buildTopicLockPromptBlock,
  detectTopicDrift,
};
