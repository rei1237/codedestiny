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

const TOPIC_NUMBERS = {
  love: 6,
  reunion: 2,
  feelings: 2,
  career: 8,
  money: 8,
  general: 9,
};

const TOPIC_LABELS = {
  love: "연애운",
  reunion: "재회운",
  feelings: "속마음",
  career: "직업운",
  money: "금전운",
  general: "종합운",
};

const SPREAD_POSITIONS = {
  love: ["현재 두 사람의 우주적 거리", "상대방의 내면에 숨겨진 달의 이면", "관계가 향해가는 궤도"],
  reunion: ["과거에 남겨진 별빛의 미련", "현재 끊어진 궤도의 상태", "다시 이어질 운명의 가능성"],
  feelings: ["당신에게 보여주는 태양의 모습", "내면에 감춰둔 달의 진심", "진정으로 갈망하는 운명"],
  career: ["현재 당신이 서 있는 궤도", "성장을 가로막는 우주의 파편", "성공을 향해 열린 새로운 차원"],
  money: ["물질적 풍요의 현재 흐름", "결핍을 만들어내는 어두운 그림자", "황금빛 에너지가 쏟아질 방향"],
  general: ["현재 당신을 감싼 우주의 기운", "보이지 않게 다가오는 변화", "우주가 전하는 최종 계시"],
};

function toText(value) {
  return String(value || "").trim();
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
  if (Object.prototype.hasOwnProperty.call(TOPIC_LABELS, topic)) return topic;
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

  for (let draw = 0; draw < 3; draw += 1) {
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
          positionLabel: (SPREAD_POSITIONS[topic] || SPREAD_POSITIONS.general)[draw] || `포지션 ${draw + 1}`,
        });
        break;
      }
    }
  }

  return selected;
}

function normalizeCardInput(cards, topic = "general") {
  const normalizedTopic = normalizeTopic(topic);
  const spreadPositions = SPREAD_POSITIONS[normalizedTopic] || SPREAD_POSITIONS.general;
  const source = Array.isArray(cards) ? cards.slice(0, 3) : [];

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

function buildFallbackInterpretation({ numerology, cards, topic, name }) {
  const who = toText(name) || "순례자";
  const normalizedTopic = normalizeTopic(topic);
  const safeCards = normalizeCardInput(cards, normalizedTopic);
  const lifeData = NUMEROLOGY_DATA[numerology.lifePathNumber] || NUMEROLOGY_DATA[9];

  const cardReadings = safeCards.map((entry) => {
    const tone = entry.orientation === "reversed"
      ? "감정의 그림자가 짙어질 수 있어 속도를 늦추고 맥락을 확인하는 태도가 필요합니다."
      : "기회가 열리는 흐름이므로 작은 행동을 빠르게 실행할수록 결과가 선명해집니다.";

    return {
      title: entry.positionLabel,
      interpretation: `${entry.card.nameKr} (${entry.orientation === "reversed" ? "역방향" : "정방향"})은(는) ${lifeData.keyword} 기운과 연결됩니다. ${tone}`,
    };
  });

  return {
    numerologyReading: `${who}님의 생명수 ${numerology.lifePathNumber}는 '${lifeData.keyword}'의 파장을 품고 있습니다. 지금은 ${lifeData.meaning} 키워드를 현실 행동으로 연결할수록 운의 흐름이 정돈됩니다.`,
    coreMessage: "별의 신호는 감정의 속도보다 행동의 일관성을 선택하라고 말합니다.",
    cardReadings,
    conclusion: {
      summary: "달의 위상은 천천히 바뀌지만, 매일의 작은 선택이 운명의 궤도를 바꿉니다.",
      doThis: [
        "오늘 실행할 행동 1가지를 문장으로 확정하세요.",
        "대화 전에 감정을 한 줄로 정리한 뒤 전달하세요.",
      ],
      avoidThis: [
        "확인되지 않은 추측으로 결론을 내리지 마세요.",
        "불안할수록 같은 질문을 반복하지 마세요.",
      ],
      finalWord: `${TOPIC_LABELS[normalizedTopic]}의 흐름은 이미 열려 있습니다. 천천히, 그러나 분명하게 나아가세요.`,
    },
  };
}

function stripCodeFence(text) {
  return toText(text).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function parseJsonCandidate(text) {
  const source = toText(text);
  if (!source) return null;

  const candidates = [source, stripCodeFence(source)];
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start >= 0 && end > start) {
    candidates.push(source.slice(start, end + 1));
  }

  for (const raw of candidates) {
    const candidate = toText(raw);
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // noop
    }
  }
  return null;
}

function normalizeInterpretation(raw, fallback, cards, topic) {
  const parsed = raw && typeof raw === "object" ? raw : {};

  const cardReadings = normalizeCardInput(cards, topic).map((entry, idx) => {
    const fromModel = Array.isArray(parsed.cardReadings) ? parsed.cardReadings[idx] : null;
    return {
      title: toText(fromModel?.title) || entry.positionLabel,
      interpretation: toText(fromModel?.interpretation) || fallback.cardReadings[idx]?.interpretation || "지금은 감정의 결을 천천히 읽어야 하는 시기입니다.",
    };
  });

  return {
    numerologyReading: toText(parsed.numerologyReading) || fallback.numerologyReading,
    coreMessage: toText(parsed.coreMessage) || fallback.coreMessage,
    cardReadings,
    conclusion: {
      summary: toText(parsed?.conclusion?.summary) || fallback.conclusion.summary,
      doThis: Array.isArray(parsed?.conclusion?.doThis) && parsed.conclusion.doThis.length
        ? parsed.conclusion.doThis.map((item) => toText(item)).filter(Boolean).slice(0, 2)
        : fallback.conclusion.doThis,
      avoidThis: Array.isArray(parsed?.conclusion?.avoidThis) && parsed.conclusion.avoidThis.length
        ? parsed.conclusion.avoidThis.map((item) => toText(item)).filter(Boolean).slice(0, 2)
        : fallback.conclusion.avoidThis,
      finalWord: toText(parsed?.conclusion?.finalWord) || fallback.conclusion.finalWord,
    },
  };
}

function buildGeminiPrompt({ numerology, cards, topic, question, name }) {
  const safeCards = normalizeCardInput(cards, topic);
  const topicLabel = TOPIC_LABELS[normalizeTopic(topic)] || TOPIC_LABELS.general;
  const lifeData = NUMEROLOGY_DATA[numerology.lifePathNumber] || NUMEROLOGY_DATA[9];

  return [
    "너는 수비학과 타로를 결합해 해석하는 한국어 리더다.",
    "반드시 입력 데이터만 사용해 실전적인 조언을 제공하고 과도한 단정 예언은 피한다.",
    "문체는 따뜻하지만 권위 있게 유지한다.",
    "출력은 JSON 한 개만 반환한다.",
    "",
    "[입력]",
    JSON.stringify({
      topic: topicLabel,
      userName: toText(name) || "순례자",
      question: toText(question),
      numerology: {
        lifePathNumber: numerology.lifePathNumber,
        lifePathKeyword: lifeData.keyword,
        lifePathMeaning: lifeData.meaning,
        personalDayNumber: numerology.personalDayNumber,
        questionNumber: numerology.questionNumber,
      },
      cards: safeCards.map((entry) => ({
        position: entry.positionLabel,
        cardName: entry.card.nameKr,
        orientation: entry.orientation === "reversed" ? "역방향" : "정방향",
        upright: entry.card.upright,
        reversed: entry.card.reversed,
      })),
    }, null, 2),
    "",
    "[출력 JSON 스키마]",
    JSON.stringify({
      numerologyReading: "생명수와 현재 흐름을 3~4문장으로 설명",
      coreMessage: "핵심 계시 한 문장",
      cardReadings: [{
        title: "포지션명",
        interpretation: "카드와 숫자 연결 해석 2~4문장",
      }],
      conclusion: {
        summary: "전체 흐름 요약",
        doThis: ["실행 행동 1", "실행 행동 2"],
        avoidThis: ["주의 행동 1", "주의 행동 2"],
        finalWord: "마무리 한 문장",
      },
    }, null, 2),
  ].join("\n");
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
  normalizeCardInput,
  buildGeminiPrompt,
  buildFallbackInterpretation,
  parseJsonCandidate,
  normalizeInterpretation,
};
