import { buildImageCandidates, getTarotCardByAnyId, legacyNumericIdToCardCode } from "./tarot-cards.mjs";
import { interpretTarotReading } from "./tarot-interpretation-engine.mjs";
import { buildCardTopicContext, buildTopicLockPromptBlock } from "./topic-lock.mjs";

// 마인드 스캔은 "상대의 속마음"을 묻는 서비스다. 카드 의미를 이 영역 밖으로 흘리지 않는다.
const MINDSCAN_TOPIC = "exMind";

const MINDSCAN_READING_TEXT_TRANSLATIONS = {
  ko: {
    "mindscanReading.positionCurrentHeart": "상대의 현재 마음",
    "mindscanReading.positionVisibleAttitude": "겉으로 보이는 태도",
    "mindscanReading.positionHiddenHeart": "드러나지 않은 마음의 결",
    "mindscanReading.positionHesitationReason": "상대가 망설이는 이유",
    "mindscanReading.positionContactFlow": "앞으로의 연락 흐름",
    "mindscanReading.positionMyAttitude": "내가 취해야 할 태도",
    "mindscanReading.positionFinalFlow": "관계가 향하는 흐름",
    "mindscanReading.sampleTitle": "사례 제목",
    "mindscanReading.cardsRequired": "카드 페어 데이터가 필요합니다.",
    "mindscanReading.questionRequired": "상담 질문이 필요합니다.",
  },
};

function mindscanReadingText(key) {
  return MINDSCAN_READING_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

const INNER_HEART_TAROT_SPREAD = [
  {
    order: 1,
    title: mindscanReadingText("mindscanReading.positionCurrentHeart"),
    question: "상대는 지금 나를 어떻게 느끼고 있는가?",
    purpose: "현재 감정 온도, 미련, 호감, 거리감, 방어심",
    icon: "💗",
    key: "current_heart",
  },
  {
    order: 2,
    title: mindscanReadingText("mindscanReading.positionVisibleAttitude"),
    question: "상대가 겉으로 보여주는 모습은 무엇인가?",
    purpose: "말과 행동, 무관심한 척, 회피, 친절함, 애매함",
    icon: "🎭",
    key: "visible_attitude",
  },
  {
    order: 3,
    title: mindscanReadingText("mindscanReading.positionHiddenHeart"),
    question: "상대가 쉽게 드러내지 못하는 마음의 결은 무엇인가?",
    purpose: "감춰진 욕구, 두려움, 그리움, 죄책감, 미련, 혼란",
    icon: "🫀",
    key: "hidden_heart",
  },
  {
    order: 4,
    title: mindscanReadingText("mindscanReading.positionHesitationReason"),
    question: "상대가 다가오지 못하거나 확신하지 못하는 이유는 무엇인가?",
    purpose: "자존심, 현실 문제, 과거 상처, 제3자, 불안, 책임 회피",
    icon: "🧱",
    key: "hesitation_reason",
  },
  {
    order: 5,
    title: mindscanReadingText("mindscanReading.positionContactFlow"),
    question: "상대에게서 연락이나 반응이 열린다면 어떤 흐름인가?",
    purpose: "연락의 문, 타이밍, 우연한 접촉, 기다림, 단절",
    icon: "📨",
    key: "contact_flow",
  },
  {
    order: 6,
    title: mindscanReadingText("mindscanReading.positionMyAttitude"),
    question: "지금 나는 어떤 태도로 관계를 바라봐야 하는가?",
    purpose: "기다림, 거리두기, 대화 시도, 감정 정리, 경계 설정",
    icon: "🧭",
    key: "my_attitude",
  },
  {
    order: 7,
    title: mindscanReadingText("mindscanReading.positionFinalFlow"),
    question: "이 관계는 지금의 속도에서 어떤 방향으로 움직일 수 있는가?",
    purpose: "재접근, 정리, 애매한 지속, 회복 조건, 새로운 국면",
    icon: "🔮",
    key: "final_flow",
  },
];

const POSITION_KEYS = ["surface", "hidden", "fear", "desire", "judgement", "attitude", "final"];
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const MAJOR_VISUAL_HINTS = {
  M00: "절벽 가장자리와 하얀 강아지, 작은 보따리",
  M01: "하늘과 땅을 잇는 손동작, 네 가지 도구, 작업대",
  M02: "두 기둥과 장막, 책과 석류, 침묵의 표정",
  M03: "풍만한 왕관과 곡식, 자연 속의 편안한 자세",
  M04: "왕좌와 붉은 색조, 산세 배경, 고정된 권위",
  M05: "의례의 장면과 두 신도, 교황의 손짓",
  M06: "두 인물 사이의 선택, 위를 지켜보는 천사",
  M07: "전차를 끄는 두 존재, 앞으로 향한 시선과 통제",
  M08: "여인이 사자를 누르는 장면, 무한대 기호",
  M09: "등불을 든 노인과 산길, 고요한 거리감",
  M10: "회전하는 바퀴와 네 방향의 상징, 예기치 않은 전환",
  M11: "저울과 검, 엄정한 자세, 판결의 긴장",
  M12: "거꾸로 매달린 몸, 빛나는 후광, 멈춘 시선",
  M13: "검은 깃발과 흰 말, 닫히는 문턱과 전환",
  M14: "두 컵 사이의 물 흐름, 천사의 절제된 동작",
  M15: "사슬에 묶인 인물과 뿔난 형상, 눌린 욕망",
  M16: "번개가 친 탑, 무너지는 성벽, 갑작스러운 붕괴",
  M17: "한쪽 무릎을 꿇은 인물과 항아리, 맑은 별빛",
  M18: "달빛 아래 늑대와 개, 게와 물길, 불안한 안개",
  M19: "해바라기와 말 탄 아이, 붉은 깃발, 개방된 햇빛",
  M20: "트럼펫 소리와 깨어나는 사람들, 재평가의 순간",
  M21: "월계관 안의 인물과 네 방위 상징, 완성의 원무",
};

function toText(value) {
  return String(value || "").trim();
}

function boundedNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function getGeminiModel(env = {}) {
  const source = [env.MINDSCAN_GEMINI_MODEL, env.GEMINI_MODEL, process?.env?.MINDSCAN_GEMINI_MODEL, process?.env?.GEMINI_MODEL]
    .map((value) => toText(value))
    .find(Boolean);
  return source || DEFAULT_GEMINI_MODEL;
}

// 공통 Gemini 키: 캐노니컬 GEMINIF_API_KEY 우선, 표준 이름 폴백(lib/llm-client.ts의 GEMINI_KEY_ORDER와 동일).
function getGeminiKeyPool(env = {}) {
  const names = ["GEMINIF_API_KEY", "GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"];
  const pool = [];
  for (const name of names) {
    pool.push(toText(env?.[name]), toText(process?.env?.[name]));
  }
  return pool.filter(Boolean);
}

function pickGeminiKey(env = {}) {
  const keys = getGeminiKeyPool(env);
  if (!keys.length) return "";
  return keys[0] || "";
}

function parseQuestionKeywords(question) {
  return Array.from(
    new Set(
      String(question || "")
        .replace(/[?!.。！？]/g, " ")
        .split(/[\s,·/()\[\]{}:;]+/)
        .map((item) => toText(item))
        .filter((item) => item.length >= 2),
    ),
  ).slice(0, 6);
}

const MINDSCAN_QUESTION_LENSES = [
  {
    id: "contact",
    match: /(연락|답장|카톡|문자|읽씹|안읽씹|반응|소식)/,
    axis: "연락 가능성과 부담 없는 접점",
    hiddenFocus: "상대가 답을 미루는 이유와 답할 수 있는 안전한 분위기",
    risk: "연락 여부만 붙잡으면 상대의 방어와 내 불안이 동시에 커질 수 있습니다.",
    action: "답을 재촉하지 않는 짧은 안부와 명확한 여백을 남기세요.",
    oracle: "연락의 문은 길고 무거운 설명보다, 부담 없는 한 줄과 기다릴 수 있는 간격에서 열립니다.",
  },
  {
    id: "reunion",
    match: /(재회|다시|돌아|만나|붙잡|헤어진|이별|전남|전여|전애인)/,
    axis: "남은 감정과 다시 만날 조건",
    hiddenFocus: "그리움이 실제 회복 의지로 바뀔 수 있는지",
    risk: "변한 조건 없이 다시 다가가면 같은 상처가 반복될 수 있습니다.",
    action: "그리움과 회복 조건을 분리해 적고, 먼저 달라진 태도를 보여 주세요.",
    oracle: "재회의 문은 감정의 크기가 아니라 달라진 방식이 증명될 때 조용히 열립니다.",
  },
  {
    id: "definition",
    match: /(관계|사이|썸|진심|고백|확신|정의|사귀|연인|미래)/,
    axis: "관계 정의와 감정 표현의 속도",
    hiddenFocus: "상대가 관계를 책임질 준비가 되어 있는지",
    risk: "확답을 빨리 끌어내려 하면 관계의 자연스러운 온도가 식을 수 있습니다.",
    action: "상대의 말보다 반복 행동과 약속의 질을 먼저 확인하세요.",
    oracle: "관계의 이름은 압박으로 얻기보다, 같은 방향의 행동이 반복될 때 자연스럽게 드러납니다.",
  },
  {
    id: "conflict",
    match: /(싸움|갈등|오해|차단|냉전|상처|미안|사과|화해|서운)/,
    axis: "상처와 방어를 낮추는 회복 조건",
    hiddenFocus: "상대가 아직 지키고 싶은 자존심과 풀고 싶은 마음",
    risk: "누가 맞았는지부터 따지면 닫힌 마음이 더 단단해질 수 있습니다.",
    action: "사실, 감정, 요청을 나누어 짧고 차분하게 전달하세요.",
    oracle: "화해의 문은 이기는 말이 아니라 다시 안전해지는 말에서 열립니다.",
  },
];

function inferMindscanQuestionLens(question) {
  const source = toText(question);
  return MINDSCAN_QUESTION_LENSES.find((lens) => lens.match.test(source)) || {
    id: "general",
    axis: "상대의 숨은 마음과 관계의 속도",
    hiddenFocus: "감정이 남아 있는 자리와 방어가 세워진 이유",
    risk: "상대의 침묵을 곧바로 무관심으로 단정하면 흐름을 놓칠 수 있습니다.",
    action: "감정 확인보다 안전한 대화 리듬과 나의 경계를 먼저 정리하세요.",
    oracle: "숨은 마음은 몰아붙일 때보다 안전하다고 느낄 때 더 선명하게 드러납니다.",
  };
}

function buildCardVisualHint(card) {
  const code = toText(card?.code).toUpperCase();
  const suit = toText(card?.suit).toLowerCase();
  const rank = toText(card?.rankTone || card?.number || card?.rank);
  if (MAJOR_VISUAL_HINTS[code]) return MAJOR_VISUAL_HINTS[code];

  const suitHint = {
    wands: "불꽃과 새싹, 앞으로 뻗는 움직임",
    cups: "잔과 물결, 반사되는 감정",
    swords: "칼끝과 구름, 날카로운 생각",
    pentacles: "동전과 땅, 현실 조건과 안정",
  }[suit] || "카드의 상징적 장면과 원소 흐름";

  const rankHint = {
    1: "씨앗이 막 깨어나는 시작점",
    2: "두 선택 사이에서 균형을 재는 장면",
    3: "멀리 보며 확장하는 흐름",
    4: "잠시 고정되어 안정성을 점검하는 장면",
    5: "흔들림과 충돌이 드러나는 구간",
    6: "조율과 회복이 시작되는 장면",
    7: "방어와 계산이 선명해지는 구간",
    8: "압박 이후 다음 전환으로 넘어가는 순간",
    9: "정리와 마무리가 가까워지는 장면",
    10: "한 사이클이 닫히는 결말 지점",
    11: "새 소식과 탐색의 흐름",
    12: "빠르게 움직이며 돌파하는 장면",
    13: "주도적으로 정리하고 관리하는 흐름",
    14: "책임감 있게 결론을 맺는 장면",
  }[Number(card?.number)] || toText(rank);

  return `${suitHint} · ${rankHint}`.trim();
}

function buildMindscanCardProfile(card, orientation) {
  const safe = card || {};
  const code = toText(safe.code).toUpperCase();
  const suit = toText(safe.suit).toLowerCase();
  // 고정 키워드는 그대로 답변이 되기 쉬우므로, 속마음 영역으로 번역한 원재료를 함께 붙인다.
  const topicContext = safe.code ? buildCardTopicContext(safe, orientation, MINDSCAN_TOPIC) : null;
  return {
    code,
    cardCoreMeaning: topicContext ? topicContext.cardCoreMeaning : "",
    topicProjection: topicContext ? topicContext.topicProjection : "",
    nameKo: toText(safe.nameKo || safe.nameKr || safe.nameEn || "이름 미상 카드"),
    nameEn: toText(safe.nameEn || safe.name || safe.nameKo || "Unnamed card"),
    arcana: toText(safe.arcana || (code.startsWith("M") ? "major" : "minor")),
    suit,
    element: toText(safe.element || safe.suitElement || ""),
    keywords: Array.isArray(safe.keywords) ? safe.keywords.slice(0, 5).map((item) => toText(item)).filter(Boolean) : [],
    focus: toText(safe.focus || safe.rankTone || ""),
    visualHint: buildCardVisualHint(safe),
    imageCandidates: buildImageCandidates(code),
    orientation: orientation === "reversed" ? "reversed" : "upright",
  };
}

function parseJsonFromText(text) {
  const source = toText(text);
  if (!source) return null;
  const candidates = [source];

  const fenceMatch = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) candidates.push(fenceMatch[1]);

  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(source.slice(firstBrace, lastBrace + 1));
  }

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw.trim());
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {
      // try next candidate
    }
  }
  return null;
}

const POSITION_MASTER_GUIDE = {
  current_heart: {
    lens: "감정의 생존 여부와 애착 강도",
    coreQuestion: "좋아함이 남아 있는지, 아니면 감정이 정리 단계인지",
    action: "감정 확인을 강요하지 말고 반응의 미세한 온도 변화를 관찰",
    relationshipLens: "마음의 유무보다 감정이 지금 관계에 자리를 내어주는 정도",
    misread: "호감의 흔적을 곧바로 관계 회복의 약속으로 확대하지 않기",
  },
  visible_attitude: {
    lens: "겉태도와 내면 감정의 간극",
    coreQuestion: "무심함이 진짜 무관심인지, 방어적 거리두기인지",
    action: "말보다 행동 빈도와 대화 리듬으로 사실 확인",
    relationshipLens: "다정한 말과 실제로 반복되는 행동 사이의 간격",
    misread: "한 번의 친절이나 냉담함만으로 전체 마음을 결론내리지 않기",
  },
  hidden_heart: {
    lens: "미표현 욕구와 관계 불안",
    coreQuestion: "그리움, 죄책감, 미련 중 무엇이 중심 감정인지",
    action: "상대의 침묵을 단정하지 말고 안전감 신호를 먼저 제시",
    relationshipLens: "말하지 못한 욕구가 행동에 거는 브레이크와 남은 애착",
    misread: "침묵을 비밀 고백이나 거절로 한쪽만 해석하지 않기",
  },
  hesitation_reason: {
    lens: "관계를 멈추게 하는 장벽",
    coreQuestion: "자존심, 현실 문제, 상처 회피 중 어떤 요인이 결정적인지",
    action: "관계 문제를 감정 공격이 아닌 구조 문제로 분리해 접근",
    relationshipLens: "망설임을 만드는 책임·상처·현실 조건의 무게",
    misread: "행동 지연을 마음의 크기 하나로만 설명하지 않기",
  },
  contact_flow: {
    lens: "접촉 가능성과 타이밍",
    coreQuestion: "연락이 오더라도 어떤 형식으로 올 가능성이 높은지",
    action: "장문 메시지보다 짧은 확인형 메시지로 접점 확보",
    relationshipLens: "연락의 유무보다 어떤 방식과 속도로 접점이 열리는지",
    misread: "연락 가능성을 날짜나 확률로 고정하지 않기",
  },
  my_attitude: {
    lens: "내가 잃지 말아야 할 기준",
    coreQuestion: "기다림과 정리 중 어디에 더 가까운지",
    action: "나의 경계와 마음의 회복을 먼저 세우는 것",
    relationshipLens: "상대의 반응과 별개로 내가 지켜야 할 관계 기준",
    misread: "상대를 배려한다는 이유로 나의 경계와 회복을 미루지 않기",
  },
  final_flow: {
    lens: "관계의 현실적 귀결",
    coreQuestion: "재접근 가능성이 있어도 지속 가능한 구조가 있는지",
    action: "감정 재점화보다 재발 방지 합의 가능성 확인",
    relationshipLens: "다시 가까워지는 흐름이 실제로 지속될 수 있는지",
    misread: "재접근의 가능성을 안정적인 관계의 완성으로 착각하지 않기",
  },
};

function asText(value) {
  return toText(value);
}

function normalizeCardCode(value, fallbackIndex = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return legacyNumericIdToCardCode(value);
  }

  const raw = asText(value);
  if (!raw) return legacyNumericIdToCardCode(fallbackIndex % 78);

  const resolved = getTarotCardByAnyId(raw);
  if (resolved) return resolved.code;

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return legacyNumericIdToCardCode(numeric);

  return legacyNumericIdToCardCode(fallbackIndex % 78);
}

function normalizePair(pair, idx) {
  const mainCode = normalizeCardCode(pair?.mainCardId ?? pair?.mainCardCode ?? pair?.mainCardName, idx);
  const subCode = normalizeCardCode(pair?.subCardId ?? pair?.subCardCode ?? pair?.subCardName, idx + 9);
  return {
    slot: Number(pair?.slot || idx + 1),
    mainCard: getTarotCardByAnyId(mainCode),
    subCard: getTarotCardByAnyId(subCode),
  };
}

function orientationLabel(orientation) {
  return orientation === "reversed" ? "역방향" : "정방향";
}

function pickOrientation(mainCard, subCard, order) {
  const seed = `${mainCard?.code || ""}:${subCard?.code || ""}:${order}`;
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return sum % 2 === 0 ? "upright" : "reversed";
}

function toArcanaLabel(card) {
  const code = asText(card?.code).toUpperCase();
  if (code.startsWith("M")) return "major";
  return "minor";
}

function toSuitLabel(card) {
  const code = asText(card?.code).toUpperCase();
  if (code.startsWith("C")) return "cups";
  if (code.startsWith("S")) return "swords";
  if (code.startsWith("W")) return "wands";
  if (code.startsWith("P")) return "pentacles";
  return "major";
}

function suitNarrative(suit) {
  if (suit === "cups") return "감정의 결이 우선 작동하며 미련과 교감 신호가 섞여 있습니다.";
  if (suit === "swords") return "생각과 방어가 먼저 올라와 감정보다 거리 조절이 우선됩니다.";
  if (suit === "wands") return "충동과 행동성이 강해 타이밍이 빠르게 바뀔 수 있습니다.";
  if (suit === "pentacles") return "현실 조건과 안정성 판단이 관계의 속도를 결정합니다.";
  return "관계의 분기점이 크게 작동하는 메이저 아르카나 흐름입니다.";
}

function orientationNarrative(orientation) {
  if (orientation === "reversed") {
    return "역방향이라 같은 감정이 있어도 표현이 막히거나 지연되는 모습이 강합니다.";
  }
  return "정방향이라 감정의 의도는 비교적 선명하게 드러나는 편입니다.";
}

function buildMindscanPairSignal(mainCard, subCard, orientation, subKeywords = []) {
  const mainName = asText(mainCard?.nameKo || mainCard?.nameKr || mainCard?.nameEn || "메인 카드");
  const subName = asText(subCard?.nameKo || subCard?.nameKr || subCard?.nameEn || "보조 카드");
  const mainKeywords = Array.isArray(mainCard?.keywords) ? mainCard.keywords.map(asText).filter(Boolean) : [];
  const secondaryKeywords = [
    ...(Array.isArray(subCard?.keywords) ? subCard.keywords : []),
    ...(Array.isArray(subKeywords) ? subKeywords : []),
  ].map(asText).filter(Boolean);
  const mainKey = mainKeywords[0] || "현재 감정의 결";
  const subKey = secondaryKeywords[0] || "행동을 늦추는 보조 신호";
  const sameSuit = toSuitLabel(mainCard) === toSuitLabel(subCard);
  const relation = sameSuit ? "같은 원소의 결이 겹치며" : "서로 다른 원소의 결이 만나며";
  const orientationNote = orientation === "reversed" ? "역방향의 지연과 방어를 더해" : "정방향의 표현 가능성을 바탕으로";
  return `메인 카드 '${mainName}'의 ${mainKey}에 보조 카드 '${subName}'의 ${subKey}가 덧붙습니다. ${relation} ${orientationNote}, 마음과 행동이 같은 속도로 움직이지 않는 이유를 함께 살펴야 합니다.`;
}

function removeRepeatedInnerHeartPhrases(text) {
  const source = String(text || "").trim();
  if (!source) return "";

  const rawSentences = source
    .split(/(?<=[.!?。！？]|니다\.|요\.|죠\.)\s+/)
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  const seen = new Set();
  const out = [];
  for (const sentence of rawSentences) {
    const normalized = sentence.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    if (normalized.length >= 20 && seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(sentence);
  }

  return out.join(" ").replace(/\s{2,}/g, " ").trim();
}

function sanitizeInnerHeartTarotText(text) {
  let out = String(text || "").trim();
  if (!out) return "";
  out = out
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/기본\s*결과/gi, "")
    .replace(/카드\s*의미와\s*질문\s*카테고리를\s*결합한\s*맞춤\s*상담입니다\.?/gi, "")
    .replace(/흐름을\s*읽을수록\s*해석\s*정확도가\s*높아집니다\.?/gi, "")
    .replace(/상대방도\s*마음이\s*있을\s*수\s*있습니다\.?/gi, "")
    .replace(/천천히\s*기다려보세요\.?/gi, "")
    .replace(/상황을\s*지켜보는\s*것이\s*좋습니다\.?/gi, "")
    .replace(/100\s*%/gi, "확정할 수 없는")
    .replace(/무조건/gi, "쉽게 단정하기 어려운")
    .replace(/반드시/gi, "가능하면")
    .replace(/절대/gi, "지나치게")
    .replace(/운명(?:이다|입니다)/gi, "운명처럼 느껴질 수 있지만 확정된 결론은 아닙니다")
    .replace(/\s{2,}/g, " ")
    .trim();
  return removeRepeatedInnerHeartPhrases(out);
}

function sanitizeMindscanAdvice(text, fallbackAction) {
  const cleaned = sanitizeInnerHeartTarotText(text)
    .replace(/자존감 관점에서는[^.。!?]*[.。!?]?/gi, "")
    .replace(/확인 질문과 짧은 실행/gi, "짧은 확인과 부드러운 안부")
    .replace(/오늘 가능한 실행 단위를 작게 설정하고 끝까지 완료하세요\.?/gi, "")
    .replace(/작은 실천을 꾸준히 이어가다 보면[^.。!?]*[.。!?]?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || `감정을 증명하려 하기보다 '${fallbackAction}'에 가까운 태도가 지금의 문을 가장 부드럽게 엽니다.`;
}

function sanitizeMindscanPsychology(text) {
  const cleaned = sanitizeInnerHeartTarotText(text)
    .replace(/반응을 늦추고 사실을 재확인하면 과잉 해석을 줄일 수 있습니다\.?/gi, "")
    .replace(/타인 반응을 내 가치와 분리하는[^.。!?]*[.。!?]?/gi, "")
    .replace(/오늘 가능한 실행 단위를[^.。!?]*[.。!?]?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || "상대는 감정이 남아 있어도 곧바로 드러내기보다 안전한 반응을 먼저 확인하려는 상태입니다.";
}

function ensureKeywords(list, fallbackList = []) {
  const merged = [];
  const seen = new Set();
  const source = [...(Array.isArray(list) ? list : []), ...(Array.isArray(fallbackList) ? fallbackList : [])];
  source.forEach((item) => {
    const key = asText(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(key);
  });
  while (merged.length < 3) {
    const filler = ["감정 흐름", "거리 조절", "관계 타이밍"][merged.length % 3];
    if (!seen.has(filler)) {
      seen.add(filler);
      merged.push(filler);
    }
  }
  return merged.slice(0, 5);
}

function buildInnerHeartTarotSection(card, position, orientation, extras = {}) {
  const safeCard = card || {};
  const positionMeta = position || INNER_HEART_TAROT_SPREAD[0];
  const masterGuide = POSITION_MASTER_GUIDE[positionMeta.key] || POSITION_MASTER_GUIDE.current_heart;
  const suit = toSuitLabel(safeCard);
  const arcana = toArcanaLabel(safeCard);
  const keywords = ensureKeywords(extras.keywords, safeCard.keywords);
  const cardNameKo = asText(safeCard.nameKo || safeCard.nameKr || "이름 미상 카드") || "이름 미상 카드";
  const cardNameEn = asText(safeCard.nameEn || safeCard.name || cardNameKo) || cardNameKo;
  const orient = orientation === "reversed" ? "reversed" : "upright";
  const subCard = extras.subCard || null;
  const subCardName = asText(extras.subCardName || "보조 흐름");
  const pairSignal = buildMindscanPairSignal(safeCard, subCard, orient, extras.subKeywords);
  const psychologySeed = sanitizeMindscanPsychology(
    asText(extras.questionSpecificMeaning || extras.positionMeaning || "감정은 남아 있지만 표현 속도를 조절하려는 상태"),
  );

  const cardCoreText = asText(extras.cardCore);
  const cardMeaning = sanitizeInnerHeartTarotText(
    cardCoreText
      ? `카드 '${cardNameKo}' ${orientationLabel(orient)}의 첫 장면은 ${keywords.slice(0, 2).join(", ")}의 결을 비춥니다. ${cardCoreText} ${pairSignal} 이 빛은 특히 '${masterGuide.lens}'에 숨은 마음의 방향을 드러냅니다.`
      : `카드 '${cardNameKo}' ${orientationLabel(orient)}의 첫 장면은 ${keywords.slice(0, 2).join(", ")}의 결을 비춥니다. ${orientationNarrative(orient)} ${suitNarrative(suit)} ${pairSignal} 이 빛은 특히 '${masterGuide.lens}'에 숨은 마음의 방향을 드러냅니다.`,
  );

  const positionMeaning = sanitizeInnerHeartTarotText(
    `${positionMeta.title} 자리는 '${positionMeta.question}'라는 물음을 비춥니다. 여기서는 ${positionMeta.purpose} 같은 흐름을 중심에 두고, ${masterGuide.relationshipLens}를 살피며 '${masterGuide.coreQuestion}'라는 속삭임을 따라가야 합니다.`,
  );

  const emotionalReading = sanitizeInnerHeartTarotText(
    `${cardNameKo} ${orientationLabel(orient)}이 비추는 상대의 속마음은 다음 가능성에 가깝습니다. ${psychologySeed} '${subCardName}' 보조 카드는 감정이 행동으로 옮겨지는 속도에 영향을 줄 수 있습니다. ${positionMeta.title} 자리에서는 ${masterGuide.relationshipLens}를 중심으로, 상대가 다시 안전하다고 느낄 조건을 먼저 살펴야 합니다.`,
  );

  const hiddenMessage = sanitizeInnerHeartTarotText(
    `카드 '${cardNameKo}' 안쪽의 메시지는 '${asText(extras.hiddenMessage || extras.shadowText || "지금은 확답보다 안전한 대화 리듬이 필요하다")}'에 가깝습니다. 겉으로 침묵이 길어도 내면에서는 관계 비용과 상처 재발 가능성을 동시에 가늠하는 흐름입니다.`,
  );

  const caution = sanitizeInnerHeartTarotText(
    `${asText(extras.caution) || "감정 확인을 몰아붙이면 방어가 강해져 오히려 연락 흐름이 늦어질 수 있습니다."} 이 자리에서 특히 피할 오해는 ${masterGuide.misread}입니다.`,
  );

  const advice = sanitizeInnerHeartTarotText(
    `${sanitizeMindscanAdvice(extras.advice, masterGuide.action)} 이 포지션에서의 실행 기준은 ${masterGuide.action}입니다.`,
  );

  return {
    order: Number(positionMeta.order || 1),
    positionKey: positionMeta.key,
    positionTitle: positionMeta.title,
    title: positionMeta.title,
    question: positionMeta.question,
    purpose: positionMeta.purpose,
    cardNameKo,
    cardNameEn,
    orientation: orient,
    arcana,
    suit,
    keywords,
    cardMeaning,
    positionMeaning,
    emotionalReading,
    hiddenMessage,
    caution,
    advice,

    slot: Number(positionMeta.order || 1),
    icon: positionMeta.icon,
    subtitle: positionMeta.purpose,
    summary: `두 카드 '${cardNameKo}'·'${subCardName}' 조합은 ${positionMeta.title}에서 ${keywords.slice(0, 2).join(", ")}의 파동을 엽니다. ${emotionalReading}`,
    content: [cardMeaning, positionMeaning, emotionalReading].join(" "),
    detail: [
      `카드가 비춘 장면: ${cardMeaning}`,
      `이 자리의 속삭임: ${positionMeaning}`,
      `속마음의 결: ${emotionalReading}`,
      `말하지 못한 메시지: ${hiddenMessage}`,
      `조심할 그림자: ${caution}`,
      `내가 건넬 태도: ${advice}`,
    ],
    mainCardName: cardNameKo,
    subCardName,
    mainCardKeywords: keywords,
    subCardKeywords: ensureKeywords(extras.subKeywords || []),
    loveSignal: asText(extras.loveSignal || "혼란"),
    emotionalTemperature: Number(extras.emotionalTemperature || 3),
  };
}

function validateInnerHeartTarotReading(reading) {
  const sections = Array.isArray(reading?.sections) ? reading.sections : [];
  const errors = [];

  if (sections.length !== 7) {
    errors.push("속마음 타로 섹션 수는 7개여야 합니다.");
  }

  const adviceSet = new Set();
  const bodySet = new Set();

  sections.forEach((section, idx) => {
    const keywords = ensureKeywords(section?.keywords || [], section?.mainCardKeywords || []);
    if (keywords.length < 3) {
      errors.push(`${idx + 1}번 섹션 키워드 부족`);
    }

    const joined = [
      section?.cardMeaning,
      section?.positionMeaning,
      section?.emotionalReading,
      section?.hiddenMessage,
      section?.caution,
      section?.advice,
    ].map(sanitizeInnerHeartTarotText).join(" ");

    if (!joined) errors.push(`${idx + 1}번 섹션 본문 누락`);

    const compact = joined.replace(/\s+/g, " ").trim();
    if (compact && compact.length < 150) {
      errors.push(`${idx + 1}번 섹션 분량 부족`);
    }
    if (compact.length >= 20 && bodySet.has(compact)) {
      errors.push(`${idx + 1}번 섹션 본문 반복`);
    }
    bodySet.add(compact);

    const advice = sanitizeInnerHeartTarotText(section?.advice);
    if (advice) adviceSet.add(advice);
  });

  if (sections.length > 1 && adviceSet.size <= 1) {
    errors.push("모든 카드 조언이 동일합니다.");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function buildSummary(sections, question = "") {
  const safe = Array.isArray(sections) ? sections : [];
  const questionLens = inferMindscanQuestionLens(question);
  const suitCount = { cups: 0, swords: 0, wands: 0, pentacles: 0, major: 0 };
  safe.forEach((section) => {
    if (section.arcana === "major") suitCount.major += 1;
    const suit = section.suit;
    if (suit && Object.prototype.hasOwnProperty.call(suitCount, suit)) suitCount[suit] += 1;
  });

  const emotionalTemperature = suitCount.cups >= 2
    ? "감정이 남아 있으나 방어와 미련이 함께 움직이는 온도"
    : suitCount.swords >= 2
      ? "생각과 경계가 우세해 감정 표현이 늦어지는 온도"
      : suitCount.wands >= 2
        ? "끌림은 강하지만 속도 조절 실패 시 흔들리는 온도"
        : suitCount.pentacles >= 2
          ? "현실 조건을 먼저 점검하는 신중한 온도"
          : "관계 분기점에서 감정과 현실이 동시에 작동하는 온도";

  const hiddenCore = safe[2]?.hiddenMessage
    ? `${safe[2].hiddenMessage} 이 흐름의 중심에는 ${questionLens.hiddenFocus}이 놓여 있습니다.`
    : `${questionLens.hiddenFocus}이 핵심 변수로 읽힙니다. 겉표현보다 내면의 불안과 책임 회피가 더 크게 작동할 수 있습니다.`;
  const contactPossibility = safe[4]?.emotionalReading
    ? `${safe[4].emotionalReading} ${questionLens.axis}을 기준으로 보면, 무리한 확인보다 부담 없는 접점이 흐름을 부드럽게 엽니다.`
    : `${questionLens.axis}은 압박 없는 접점에서만 부드럽게 움직입니다.`;
  const relationshipRisk = removeRepeatedInnerHeartPhrases(
    Array.from(new Set([safe[3]?.caution, safe[4]?.caution, questionLens.risk].filter(Boolean))).join(" "),
  ) || questionLens.risk;
  const recommendedAttitude = safe[5]?.advice
    ? `${questionLens.action} 카드가 덧붙이는 세부 조언은 ${safe[5].advice}`
    : questionLens.action;
  const finalFlow = safe[6]?.emotionalReading || "관계는 즉답보다 조정 단계로 흐르며, 안정적인 반복 접점이 있을 때 회복의 결이 살아납니다.";
  const oracleMessage = questionLens.oracle;

  return {
    emotionalTemperature,
    hiddenCore,
    contactPossibility,
    relationshipRisk,
    recommendedAttitude,
    finalFlow,
    oracleMessage,
    questionLens,
    dominantSuits: suitCount,
  };
}

function buildSectionInputs(normalizedPairs) {
  const main = normalizedPairs.slice(0, 5);
  const sixthMain = main[2]?.subCard || main[2]?.mainCard || main[0]?.mainCard;
  const seventhMain = main[4]?.subCard || main[4]?.mainCard || main[1]?.mainCard;

  return [
    { mainCard: main[0]?.mainCard, subCard: main[0]?.subCard },
    { mainCard: main[1]?.mainCard, subCard: main[1]?.subCard },
    { mainCard: main[2]?.mainCard, subCard: main[2]?.subCard },
    { mainCard: main[3]?.mainCard, subCard: main[3]?.subCard },
    { mainCard: main[4]?.mainCard, subCard: main[4]?.subCard },
    { mainCard: sixthMain, subCard: main[1]?.subCard || main[0]?.subCard },
    { mainCard: seventhMain, subCard: main[3]?.subCard || main[2]?.subCard },
  ];
}

function buildMindscanPrompt({ question, questionKeywords, pairs, insightSeeds = [] }) {
  const questionLens = inferMindscanQuestionLens(question);
  return [
    "이 리딩의 핵심은 말·행동·침묵·관계 거리·다가갈 속도를 서로 다른 역할로 분리해 읽는 것이다. 같은 표현을 여러 섹션에서 반복하지 마라.",
    "보조 카드는 메인 카드의 반복이 아니라 숨은 조건·속도·방어를 보태는 역할로 해석하라.",
    "반드시, 무조건, 100%, 운명이다, 끝났다 같은 확정 표현을 사용하지 마라.",
    "너는 상대의 겉태도와 숨은 감정의 간극을 섬세하게 읽는 마인드 스캔 타로 상담가다.",
    "이 서비스는 연애 감정 상담형이다. 사용자는 상대의 마음, 침묵, 연락 흐름, 재접근 가능성을 알고 싶어 들어오지만 불안과 기대가 함께 높다.",
    "사용자가 입력한 질문을 반드시 리딩의 중심축으로 삼고, 상대 마음은 확정하지 말고 카드가 보여주는 가능성, 경향, 조건으로만 말한다.",
    "뻔한 키워드 나열은 금지한다. 카드의 절벽, 하얀 강아지, 두 기둥, 저울, 번개, 물결, 칼끝 같은 구체적인 상징과 원소를 직접 언급하되 상담 흐름 안에서 자연스럽게 풀어라.",
    "각 섹션은 포지션 질문, 메인 카드, 보조 카드, 정역방향, 사용자의 실제 질문 사이의 인과관계를 설명해야 한다. 단정적인 예언 대신 왜 그런 결론이 나왔는지 논리적으로 보여줘라.",
    "연락 질문은 연락 가능성과 부담 없는 접점을, 재회 질문은 감정과 회복 조건을, 관계정의 질문은 말보다 반복 행동과 책임감을, 갈등 질문은 상처와 방어를 낮추는 조건을 중심으로 해석해라.",
    "사용자가 매달리거나 감시하거나 압박하도록 만들지 마라. 기다림을 강요하지 말고, 자존감을 지키는 거리와 대화 기준을 함께 제안해라.",
    "희망고문, 공포 자극, 상대 감정의 확정, 제3자/배신 단정, 의료/법률/투자 판단은 금지한다.",
    "연이는 등장하지 않는다. 말투는 관계 상담사에 가까워야 하며, 모든 섹션이 같은 문장 구조로 반복되면 실패다.",
    "sections는 입력의 pairs와 같은 순서로 7개를 모두 작성한다. 2번 섹션부터는 직전 포지션에서 읽은 흐름을 최소 한 번 이어받아, 7개 섹션이 하나의 상담 서사가 되게 하라. 독립된 단문 나열이면 실패다.",
    "insightSeeds가 주어지면 각 조합에 대해 insightDeck 항목을 작성한다. message는 두 카드가 만났을 때 생기는 화학작용을 3~4문장으로, action은 사용자가 오늘 취할 수 있는 태도를 1~2문장으로 쓴다.",
    "출력은 JSON 한 개만 반환하고, 설명 문장이나 코드블록을 절대 섞지 마라.",
    "아래 리딩 형식의 키 이름을 유지하고, 문자열은 한국어로만 작성해라.",
    "질문이 모호하면 질문의 핵심 단어를 먼저 재정의하고, 그 단어에 맞춰 해석을 압축해라.",
    "모든 섹션은 카드의 메인/보조 이미지와 원소 특징을 최소 1개 이상 포함해야 한다.",
    "emotionalTemperature는 1~5 숫자로만 쓰고, contactChance/reApproachChance는 확률 숫자처럼 단정하지 말고 조건과 흐름으로 설명해라.",
    "suggestedMessages는 상대를 압박하지 않는 한 줄이어야 하며, 사용자의 품위를 낮추는 표현은 금지한다.",
    "문체는 친절하고 따뜻하지만 상담가답게 단단해야 한다. 감정을 어루만지되 결론은 현실적으로 제시해라.",
    "",
    buildTopicLockPromptBlock(MINDSCAN_TOPIC, { userQuestion: question }),
    "",
    "[입력]",
    JSON.stringify({
      question: asText(question),
      questionKeywords,
      questionLens,
      pairs: pairs.map((pair, idx) => ({
        slot: idx + 1,
        positionTitle: pair.positionLabel,
        positionQuestion: pair.positionQuestion,
        positionPurpose: pair.positionPurpose,
        positionMeaning: pair.positionMeaning,
        mainCard: pair.mainCard,
        subCard: pair.subCard,
        orientation: pair.orientation,
      })),
      insightSeeds: (Array.isArray(insightSeeds) ? insightSeeds : []).slice(0, 6).map((item, idx) => ({
        slot: idx + 1,
        category: asText(item?.category || item?.type),
        title: asText(item?.title),
        seedText: asText(item?.headline || item?.description || item?.summary),
      })),
    }, null, 2),
    "",
    "[리딩 작성 형식]",
    JSON.stringify({
      persona: "마인드 스캔 리더의 상담 톤",
      intro: "질문의 핵심을 짚는 2~3문장 인트로",
      sections: [{
        slot: 1,
        title: mindscanReadingText("mindscanReading.sampleTitle"),
        cardNameKo: "메인 카드명",
        subCardName: "보조 카드명",
        orientation: "upright",
        cardMeaning: "카드의 구체적인 상징과 원소를 언급한 4~6문장",
        positionMeaning: "포지션 질문과의 연결 3~4문장",
        emotionalReading: "상대/상황 심리와 질문의 연결 4~6문장",
        hiddenMessage: "숨겨진 메시지 3~4문장",
        caution: "주의점 2~3문장",
        advice: "실행 조언 2~3문장",
        summary: "질문에 바로 답하는 한 줄 요약",
        keywords: ["상징", "질문", "행동"],
      }],
      summaryCard: {
        emotionalTemperature: 1,
        emotionalTemperatureText: "감정 온도 2~3문장",
        corePsychology: "핵심 심리 2~3문장",
        contactChance: "연락/반응 가능성 2~3문장",
        relationFlow: "관계 흐름 2~3문장",
        reApproachChance: "재접근 여지 2~3문장",
        recommendedAction: "추천 행동 2~3문장",
        relationshipStage: "관계 단계 한 줄",
        silenceDriver: "침묵/지연 동인 2~3문장",
        situationPressure: "압력 요인 2~3문장",
        emotionalNeed: "숨은 욕구 2~3문장",
      },
      innerHeartSummary: {
        emotionalTemperature: "전체 감정 온도 2~3문장",
        hiddenCore: "숨은 핵심 마음 2~3문장",
        contactPossibility: "연락 가능성 2~3문장",
        relationshipRisk: "관계 위험 2~3문장",
        recommendedAttitude: "권장 태도 2~3문장",
        finalFlow: "최종 흐름 2~3문장",
        oracleMessage: "한 줄 메시지",
      },
      insightDeck: [{
        slot: 1,
        category: "조합 유형",
        title: "두 카드 조합 제목",
        message: "조합이 만드는 화학작용 3~4문장",
        action: "오늘 취할 태도 1~2문장",
        riskLevel: "낮음|중간|높음",
      }],
      masterAdvice: "리딩 전체를 관통하는 마스터 조언 3~5문장",
      suggestedMessages: [{ tone: "부담 완화", text: "실행 가능한 한 줄 메시지" }],
      oneLineConclusion: "질문에 대한 최종 한 줄",
      closing: "따뜻하지만 단단한 마무리 2~3문장",
    }, null, 2),
  ].join("\n");
}

async function requestMindscanGeminiOnce({ prompt, env, fetchImpl, apiKey, maxOutputTokens, timeoutMs }) {
  // 개별 Gemini 호출에 상한을 건다. 생성이 늘어지면 abort시켜 상위 루프가 로컬 폴백으로 degrade하게 한다.
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = controller && Number(timeoutMs) > 0 ? setTimeout(() => controller.abort(), Number(timeoutMs)) : null;
  let response;
  try {
    response = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(getGeminiModel(env))}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: boundedNumber(env.MINDSCAN_GEMINI_TEMPERATURE, 0.7, 0.2, 1),
            topP: boundedNumber(env.MINDSCAN_GEMINI_TOP_P, 0.92, 0.5, 1),
            maxOutputTokens: Number(maxOutputTokens) || boundedNumber(env.MINDSCAN_GEMINI_MAX_OUTPUT_TOKENS, 12000, 3000, 24000),
            responseMimeType: "application/json",
            // gemini-2.5의 thinking 토큰이 maxOutputTokens를 잠식해 긴 JSON이 잘리는 것을 막는다.
            thinkingConfig: { thinkingBudget: boundedNumber(env.MINDSCAN_GEMINI_THINKING_BUDGET, 0, 0, 8192) },
          },
        }),
        signal: controller ? controller.signal : undefined,
      },
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (!response.ok) {
    return { ok: false, reason: `gemini_http_${response.status}` };
  }

  const payload = await response.json().catch(() => ({}));
  const candidate = payload?.candidates?.[0];
  const rawText = (candidate?.content?.parts || [])
    .map((part) => toText(part?.text))
    .filter(Boolean)
    .join("\n")
    .trim();
  const parsed = parseJsonFromText(rawText);
  if (!parsed) {
    const finishReason = toText(candidate?.finishReason);
    return { ok: false, reason: finishReason && finishReason !== "STOP" ? `invalid_json_${finishReason}` : "invalid_json" };
  }

  // 파싱은 성공했어도 MAX_TOKENS로 잘린 응답이면 실패 처리해 재시도 래퍼가 다시 굴리게 한다.
  if (toText(candidate?.finishReason) === "MAX_TOKENS") {
    return { ok: false, reason: "truncated_MAX_TOKENS" };
  }

  return { ok: true, reading: parsed };
}

async function callMindscanGemini({ question, pairs, insightSeeds = [], env = {}, fetchImpl = globalThis.fetch }) {
  const apiKey = pickGeminiKey(env);
  if (!apiKey || typeof fetchImpl !== "function") {
    return { ok: false, reason: "missing_config" };
  }

  const normalizedPairs = Array.isArray(pairs) ? pairs.slice(0, INNER_HEART_TAROT_SPREAD.length).map((pair, idx) => {
    const position = INNER_HEART_TAROT_SPREAD[idx] || {};
    return {
      slot: Number(pair?.slot || idx + 1),
      positionLabel: toText(pair?.positionLabel) || toText(position.title) || `포지션 ${idx + 1}`,
      positionQuestion: toText(position.question),
      positionPurpose: toText(position.purpose),
      positionMeaning: toText(pair?.positionMeaning) || toText(position.purpose) || "이 위치의 감정 흐름을 읽어냅니다.",
      mainCard: buildMindscanCardProfile(pair?.mainCard, pair?.orientation),
      subCard: buildMindscanCardProfile(pair?.subCard, pair?.orientation),
      orientation: pair?.orientation === "reversed" ? "reversed" : "upright",
    };
  }) : [];
  if (!normalizedPairs.length) return { ok: false, reason: "empty_pairs" };

  const questionKeywords = parseQuestionKeywords(question);
  const prompt = buildMindscanPrompt({ question, questionKeywords, pairs: normalizedPairs, insightSeeds });

  const baseTokens = boundedNumber(env.MINDSCAN_GEMINI_MAX_OUTPUT_TOKENS, 12000, 3000, 24000);
  // 전체 LLM 생성 시간 상한. 초과 시 상위에서 로컬 폴백으로 degrade해, 클라이언트 대기보다 먼저 확정 응답을 돌려준다.
  const totalDeadlineMs = boundedNumber(env.MINDSCAN_TOTAL_TIMEOUT_MS, 42000, 8000, 120000);
  const startedAt = Date.now();
  let lastReason = "unknown";
  let truncationRetries = 0;
  // 잘림(MAX_TOKENS)일 때는 출력 토큰을 올려 재시도하고, 그래도 실패할 때만 로컬 폴백으로 내려간다.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const remainingMs = totalDeadlineMs - (Date.now() - startedAt);
    // 남은 예산이 한 번의 호출을 감당하기 어려우면 재시도를 멈추고 폴백으로 내려간다.
    if (remainingMs <= 1500) {
      if (lastReason === "unknown") lastReason = "deadline_exceeded";
      break;
    }
    const maxOutputTokens = Math.min(24000, Math.round(baseTokens * (1 + 0.4 * truncationRetries)));
    try {
      const result = await requestMindscanGeminiOnce({ prompt, env, fetchImpl, apiKey, maxOutputTokens, timeoutMs: remainingMs });
      if (result.ok) return result;
      lastReason = result.reason;
      if (/max_tokens|truncated/i.test(String(result.reason))) truncationRetries += 1;
    } catch (error) {
      lastReason = `fetch_error:${toText(error?.message) || "unknown"}`;
    }
  }
  return { ok: false, reason: lastReason };
}

function buildMindscanLocalReading(pairs, question = "") {
  const safePairs = Array.isArray(pairs) ? pairs.slice(0, 5) : [];
  if (!safePairs.length) {
    return { ok: false, message: mindscanReadingText("mindscanReading.cardsRequired") };
  }

  const normalizedPairs = safePairs.map(normalizePair);
  const inputCards = buildSectionInputs(normalizedPairs);

  const drawnCards = inputCards.map((item, idx) => ({
    cardId: item.mainCard?.code,
    orientation: pickOrientation(item.mainCard, item.subCard, idx + 1),
    positionKey: POSITION_KEYS[idx] || `slot_${idx + 1}`,
  }));

  const interpreted = interpretTarotReading({
    serviceKey: "mindscan-tarot",
    questionType: "exMind",
    spreadId: "job_change_seven_card",
    drawnCards,
  });

  const sections = INNER_HEART_TAROT_SPREAD.map((position, idx) => {
    const mainCard = inputCards[idx]?.mainCard || null;
    const subCard = inputCards[idx]?.subCard || null;
    const cardReading = interpreted?.cards?.[idx] || {};
    const orientation = drawnCards[idx]?.orientation || "upright";

    return buildInnerHeartTarotSection(mainCard, position, orientation, {
      keywords: cardReading?.keywords,
      subKeywords: subCard?.keywords,
      subCard,
      // meaning.line = 직업 스프레드 포지션 라벨이 섞이지 않은 깔끔한 상대 속마음(exMind) 해석
      questionSpecificMeaning: cardReading?.meaning?.line || cardReading?.questionSpecificMeaning,
      cardCore: cardReading?.meaning?.coreMeaning || cardReading?.coreMeaning,
      positionMeaning: cardReading?.positionMeaning,
      hiddenMessage: cardReading?.shadowText || cardReading?.meaning?.shadow,
      caution: cardReading?.caution,
      advice: cardReading?.advice,
      subCardName: asText(subCard?.nameKo || subCard?.nameKr || subCard?.nameEn),
      loveSignal: idx <= 1 ? "긍정" : idx <= 4 ? "혼란" : "재접근 가능",
      emotionalTemperature: idx <= 1 ? 4 : idx <= 4 ? 3 : 4,
    });
  });

  const questionLens = inferMindscanQuestionLens(question);
  const summary = buildSummary(sections, question);
  const validation = validateInnerHeartTarotReading({ sections });

  const refinedSections = validation.ok
    ? sections
    : sections.map((section) => ({
      ...section,
      advice: sanitizeInnerHeartTarotText(section.advice || "지금은 결론보다 안정적인 리듬 회복이 우선입니다."),
      keywords: ensureKeywords(section.keywords, section.mainCardKeywords),
    }));

  const summaryCard = {
    emotionalTemperature: 4,
    emotionalTemperatureText: summary.emotionalTemperature,
    corePsychology: summary.hiddenCore,
    contactChance: summary.contactPossibility,
    relationFlow: summary.finalFlow,
    reApproachChance: `${questionLens.axis}을 기준으로 보면, 상대의 방어가 낮아지는 순간부터 작은 접점이 열립니다. 긴 설명보다 ${questionLens.action}`,
    recommendedAction: summary.recommendedAttitude,
    relationshipStage: "조정과 재정렬 단계",
    silenceDriver: refinedSections[3]?.emotionalReading || "망설임과 방어심",
    situationPressure: summary.relationshipRisk,
    emotionalNeed: refinedSections[2]?.hiddenMessage || "안전감 확인 욕구",
  };

  return {
    ok: true,
    source: "rule-engine",
    persona: "연애 심리 특화 타로 리더",
    question: asText(question),
    intro: question
      ? `질문 "${asText(question)}"를 중심에 두고 보면, 이번 리딩의 축은 ${questionLens.axis}입니다. 카드는 감정이 사라져서 멈춘 장면보다, ${questionLens.hiddenFocus}라는 주제가 관계의 속도를 늦추는 장면을 더 강하게 보여줍니다.`
      : `이번 리딩의 축은 ${questionLens.axis}입니다. 카드는 '마음이 있다/없다'의 이분법보다, 어떤 조건에서 마음이 열리고 어떤 방식에서 다시 닫히는지를 읽으라고 말합니다.`,
    sections: refinedSections,
    summaryCard,
    innerHeartSummary: summary,
    insightDeck: (interpreted?.combinations || []).slice(0, 6).map((item, idx) => ({
      id: `inner-insight-${idx + 1}`,
      icon: idx % 2 ? "🌙" : "✨",
      category: item.type,
      title: item.title,
      headline: item.description,
      summary: item.description,
      bullets: [item.description],
      riskLevel: item.type === "conflictPair" ? "높음" : "중간",
    })),
    masterAdvice: `${summary.recommendedAttitude} 또한 지금 단계에서는 ${questionLens.risk} 그러므로 감정 증명보다 대화 속도, 경계 문장, 재접촉 간격을 먼저 가다듬어야 관계의 문이 무리 없이 다시 열립니다.`,
    suggestedMessages: [
      { tone: "부담 완화", text: "요즘 네 생각이 나서 안부 남겨. 답장은 편할 때 해줘도 괜찮아." },
      { tone: "재접점", text: "예전 얘기를 길게 꺼내기보다, 요즘 지내는 얘기부터 천천히 나누고 싶어." },
      { tone: "경계 존중", text: "네 리듬을 존중하고 싶어. 부담 없는 선에서 대화 이어가면 좋겠어." },
    ],
    oneLineConclusion: summary.finalFlow,
    closing: `${summary.oracleMessage} 오늘의 결론은 '강한 표현'이 아니라, ${questionLens.action}`,
    validation,
  };
}

async function buildMindscanReadingPayload(pairs, options = {}) {
  const question = asText(options?.question || options?.body?.question || "");
  const safePairs = Array.isArray(pairs) ? pairs.slice(0, 5) : [];
  if (!safePairs.length) {
    return { ok: false, message: mindscanReadingText("mindscanReading.cardsRequired") };
  }
  if (!question) {
    return { ok: false, message: mindscanReadingText("mindscanReading.questionRequired") };
  }

  const localFallback = buildMindscanLocalReading(safePairs, question);
  let llmFailReason = "";
  try {
    // 로컬 폴백과 동일한 7포지션 확장(buildSectionInputs)·정역방향 시드를 사용해 LLM 입력을 맞춘다.
    const normalizedPairs = safePairs.map(normalizePair);
    const sectionInputs = buildSectionInputs(normalizedPairs).map((item, idx) => ({
      slot: idx + 1,
      mainCard: item.mainCard,
      subCard: item.subCard,
      orientation: pickOrientation(item.mainCard, item.subCard, idx + 1),
    }));
    const aiResult = await callMindscanGemini({
      question,
      pairs: sectionInputs,
      insightSeeds: localFallback?.insightDeck || [],
      env: options?.env || {},
      fetchImpl: options?.fetchImpl || globalThis.fetch,
    });

    if (aiResult?.ok && aiResult.reading) {
      const fallback = localFallback;
      const parsed = aiResult.reading || {};
      const fallbackSections = Array.isArray(fallback?.sections) ? fallback.sections : [];
      const sections = fallbackSections.map((section, idx) => {
        const source = Array.isArray(parsed.sections) ? parsed.sections[idx] || {} : {};
        const keywords = ensureKeywords(source?.keywords || [], section?.mainCardKeywords || []);
        return {
          ...section,
          title: asText(source?.title) || section.title,
          cardNameKo: asText(source?.cardNameKo || source?.mainCardName) || section.cardNameKo,
          subCardName: asText(source?.subCardName) || section.subCardName,
          orientation: source?.orientation === "reversed" ? "reversed" : section.orientation,
          cardMeaning: sanitizeInnerHeartTarotText(asText(source?.cardMeaning) || section.cardMeaning),
          positionMeaning: sanitizeInnerHeartTarotText(asText(source?.positionMeaning) || section.positionMeaning),
          emotionalReading: sanitizeInnerHeartTarotText(asText(source?.emotionalReading) || section.emotionalReading),
          hiddenMessage: sanitizeInnerHeartTarotText(asText(source?.hiddenMessage) || section.hiddenMessage),
          caution: sanitizeInnerHeartTarotText(asText(source?.caution) || section.caution),
          advice: sanitizeInnerHeartTarotText(asText(source?.advice) || section.advice),
          summary: sanitizeInnerHeartTarotText(asText(source?.summary) || section.summary),
          keywords,
        };
      });

      const summary = buildSummary(sections, question);
      const validation = validateInnerHeartTarotReading({ sections });
      const summaryCard = {
        emotionalTemperature: Number(parsed?.summaryCard?.emotionalTemperature || 4),
        emotionalTemperatureText: asText(parsed?.summaryCard?.emotionalTemperatureText) || summary.emotionalTemperature,
        corePsychology: sanitizeInnerHeartTarotText(asText(parsed?.summaryCard?.corePsychology) || summary.hiddenCore),
        contactChance: sanitizeInnerHeartTarotText(asText(parsed?.summaryCard?.contactChance) || summary.contactPossibility),
        relationFlow: sanitizeInnerHeartTarotText(asText(parsed?.summaryCard?.relationFlow) || summary.finalFlow),
        reApproachChance: sanitizeInnerHeartTarotText(asText(parsed?.summaryCard?.reApproachChance) || fallback.summaryCard.reApproachChance),
        recommendedAction: sanitizeInnerHeartTarotText(asText(parsed?.summaryCard?.recommendedAction) || summary.recommendedAttitude),
        relationshipStage: asText(parsed?.summaryCard?.relationshipStage) || fallback.summaryCard.relationshipStage,
        silenceDriver: sanitizeInnerHeartTarotText(asText(parsed?.summaryCard?.silenceDriver) || fallback.summaryCard.silenceDriver),
        situationPressure: sanitizeInnerHeartTarotText(asText(parsed?.summaryCard?.situationPressure) || summary.relationshipRisk),
        emotionalNeed: sanitizeInnerHeartTarotText(asText(parsed?.summaryCard?.emotionalNeed) || fallback.summaryCard.emotionalNeed),
      };

      const innerHeartSummary = {
        emotionalTemperature: sanitizeInnerHeartTarotText(asText(parsed?.innerHeartSummary?.emotionalTemperature) || summary.emotionalTemperature),
        hiddenCore: sanitizeInnerHeartTarotText(asText(parsed?.innerHeartSummary?.hiddenCore) || summary.hiddenCore),
        contactPossibility: sanitizeInnerHeartTarotText(asText(parsed?.innerHeartSummary?.contactPossibility) || summary.contactPossibility),
        relationshipRisk: sanitizeInnerHeartTarotText(asText(parsed?.innerHeartSummary?.relationshipRisk) || summary.relationshipRisk),
        recommendedAttitude: sanitizeInnerHeartTarotText(asText(parsed?.innerHeartSummary?.recommendedAttitude) || summary.recommendedAttitude),
        finalFlow: sanitizeInnerHeartTarotText(asText(parsed?.innerHeartSummary?.finalFlow) || summary.finalFlow),
        oracleMessage: sanitizeInnerHeartTarotText(asText(parsed?.innerHeartSummary?.oracleMessage) || summary.oracleMessage),
      };

      const fallbackDeck = Array.isArray(fallback?.insightDeck) ? fallback.insightDeck : [];
      const insightDeck = Array.isArray(parsed?.insightDeck) && parsed.insightDeck.length
        ? parsed.insightDeck.slice(0, 6).map((item, idx) => {
          const base = fallbackDeck[idx] || {};
          const message = sanitizeInnerHeartTarotText(asText(item?.message || item?.headline || item?.summary));
          const action = sanitizeInnerHeartTarotText(asText(item?.action));
          const bullets = [message, action].filter(Boolean);
          return {
            id: base.id || `inner-insight-${idx + 1}`,
            icon: base.icon || (idx % 2 ? "🌙" : "✨"),
            category: asText(item?.category) || base.category || "카드 조합",
            title: asText(item?.title) || base.title || `조합 ${idx + 1}`,
            headline: message || base.headline || "",
            summary: message || base.summary || "",
            bullets: bullets.length ? bullets : (Array.isArray(base.bullets) ? base.bullets : []),
            riskLevel: asText(item?.riskLevel) || base.riskLevel || "중간",
          };
        })
        : fallbackDeck;

      const suggestedMessages = Array.isArray(parsed?.suggestedMessages) && parsed.suggestedMessages.length
        ? parsed.suggestedMessages.map((item, idx) => ({
          tone: asText(item?.tone) || ["부담 완화", "재접점", "경계 존중"][idx] || "메시지",
          text: sanitizeInnerHeartTarotText(asText(item?.text) || fallback.suggestedMessages[idx]?.text || "짧고 안정적인 한 줄 메시지로 시작하세요."),
        })).slice(0, 3)
        : fallback.suggestedMessages;

      const reading = {
        ...fallback,
        source: "llm",
        persona: asText(parsed?.persona) || fallback.persona,
        question,
        intro: sanitizeInnerHeartTarotText(asText(parsed?.intro) || fallback.intro),
        sections,
        summaryCard,
        innerHeartSummary,
        insightDeck,
        masterAdvice: sanitizeInnerHeartTarotText(asText(parsed?.masterAdvice) || fallback.masterAdvice),
        suggestedMessages,
        oneLineConclusion: sanitizeInnerHeartTarotText(asText(parsed?.oneLineConclusion) || summary.finalFlow),
        closing: sanitizeInnerHeartTarotText(asText(parsed?.closing) || fallback.closing),
        validation,
      };

      if (!validation.ok) {
        reading.source = "llm+fallback";
      }

      return reading;
    }
    llmFailReason = asText(aiResult?.reason) || "llm_not_ok";
  } catch (error) {
    llmFailReason = `exception:${asText(error?.message) || "unknown"}`;
  }

  // 폴백 사유를 남겨 침묵 회귀(LLM 경로 사망)를 조기에 발견할 수 있게 한다.
  if (llmFailReason) {
    console.warn(`[mindscan] gemini fallback: ${llmFailReason}`);
    return {
      ...localFallback,
      validation: { ...(localFallback?.validation || {}), llmFailReason },
    };
  }
  return localFallback;
}

export {
  sanitizeInnerHeartTarotText,
  removeRepeatedInnerHeartPhrases,
  validateInnerHeartTarotReading,
  buildInnerHeartTarotSection,
  buildMindscanPrompt,
  buildMindscanReadingPayload,
};
