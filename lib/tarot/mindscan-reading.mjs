import { getTarotCardByAnyId, legacyNumericIdToCardCode } from "./tarot-cards.mjs";
import { interpretTarotReading } from "./tarot-interpretation-engine.mjs";

const INNER_HEART_TAROT_SPREAD = [
  {
    order: 1,
    title: "상대의 현재 마음",
    question: "상대는 지금 나를 어떻게 느끼고 있는가?",
    purpose: "현재 감정 온도, 미련, 호감, 거리감, 방어심",
    icon: "💗",
    key: "current_heart",
  },
  {
    order: 2,
    title: "겉으로 보이는 태도",
    question: "상대가 겉으로 보여주는 모습은 무엇인가?",
    purpose: "말과 행동, 무관심한 척, 회피, 친절함, 애매함",
    icon: "🎭",
    key: "visible_attitude",
  },
  {
    order: 3,
    title: "숨겨진 진짜 속마음",
    question: "상대가 드러내지 않는 진짜 마음은 무엇인가?",
    purpose: "감춰진 욕구, 두려움, 그리움, 죄책감, 미련, 혼란",
    icon: "🫀",
    key: "hidden_heart",
  },
  {
    order: 4,
    title: "상대가 망설이는 이유",
    question: "상대가 다가오지 못하거나 확신하지 못하는 이유는 무엇인가?",
    purpose: "자존심, 현실 문제, 과거 상처, 제3자, 불안, 책임 회피",
    icon: "🧱",
    key: "hesitation_reason",
  },
  {
    order: 5,
    title: "앞으로의 연락 흐름",
    question: "상대에게서 연락이나 반응이 올 가능성은 어떤가?",
    purpose: "연락 가능성, 타이밍, 우연한 접촉, 기다림, 단절",
    icon: "📨",
    key: "contact_flow",
  },
  {
    order: 6,
    title: "내가 취해야 할 태도",
    question: "지금 나는 어떤 태도로 관계를 바라봐야 하는가?",
    purpose: "기다림, 거리두기, 대화 시도, 감정 정리, 경계 설정",
    icon: "🧭",
    key: "my_attitude",
  },
  {
    order: 7,
    title: "관계의 최종 흐름",
    question: "이 관계는 앞으로 어떤 방향으로 흘러갈 가능성이 큰가?",
    purpose: "재접근, 정리, 애매한 지속, 회복 가능성, 새로운 국면",
    icon: "🔮",
    key: "final_flow",
  },
];

const POSITION_KEYS = ["surface", "hidden", "fear", "desire", "judgement", "attitude", "final"];

const POSITION_MASTER_GUIDE = {
  current_heart: {
    lens: "감정의 생존 여부와 애착 강도",
    coreQuestion: "좋아함이 남아 있는지, 아니면 감정이 정리 단계인지",
    action: "감정 확인을 강요하지 말고 반응의 미세한 온도 변화를 관찰",
  },
  visible_attitude: {
    lens: "겉태도와 내면 감정의 간극",
    coreQuestion: "무심함이 진짜 무관심인지, 방어적 거리두기인지",
    action: "말보다 행동 빈도와 대화 리듬으로 사실 확인",
  },
  hidden_heart: {
    lens: "미표현 욕구와 관계 불안",
    coreQuestion: "그리움, 죄책감, 미련 중 무엇이 중심 감정인지",
    action: "상대의 침묵을 단정하지 말고 안전감 신호를 먼저 제시",
  },
  hesitation_reason: {
    lens: "관계를 멈추게 하는 장벽",
    coreQuestion: "자존심, 현실 문제, 상처 회피 중 어떤 요인이 결정적인지",
    action: "관계 문제를 감정 공격이 아닌 구조 문제로 분리해 접근",
  },
  contact_flow: {
    lens: "접촉 가능성과 타이밍",
    coreQuestion: "연락이 오더라도 어떤 형식으로 올 가능성이 높은지",
    action: "장문 메시지보다 짧은 확인형 메시지로 접점 확보",
  },
  my_attitude: {
    lens: "내가 잃지 말아야 할 기준",
    coreQuestion: "기다림과 정리 중 어디에 더 가까운지",
    action: "관계 유지보다 자기경계와 감정 위생을 우선",
  },
  final_flow: {
    lens: "관계의 현실적 귀결",
    coreQuestion: "재접근 가능성이 있어도 지속 가능한 구조가 있는지",
    action: "감정 재점화보다 재발 방지 합의 가능성 확인",
  },
};

function asText(value) {
  return String(value || "").trim();
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
    .replace(/\s{2,}/g, " ")
    .trim();
  return removeRepeatedInnerHeartPhrases(out);
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

  const cardMeaning = sanitizeInnerHeartTarotText(
    `${cardNameKo}(${orientationLabel(orient)})는 ${keywords.slice(0, 2).join(", ")}의 축을 강조합니다. ${orientationNarrative(orient)} ${suitNarrative(suit)} 이 카드는 특히 '${masterGuide.lens}' 관점에서 해석 정확도가 높습니다.`,
  );

  const positionMeaning = sanitizeInnerHeartTarotText(
    `${positionMeta.title} 포지션은 '${positionMeta.question}'를 묻습니다. 이 자리는 ${positionMeta.purpose}를 중심으로 해석해야 하며, 핵심 질문은 '${masterGuide.coreQuestion}'입니다.`,
  );

  const emotionalReading = sanitizeInnerHeartTarotText(
    `${cardMeaning} 따라서 현재 상대 심리는 ${asText(extras.questionSpecificMeaning || extras.positionMeaning || "감정은 남아 있지만 표현 속도를 조절하려는 상태")}로 읽힙니다. 타로 마스터 관점에서 보면 이 구간은 감정의 유무보다 표현의 안전장치가 먼저 작동하는 국면입니다.`,
  );

  const hiddenMessage = sanitizeInnerHeartTarotText(
    `${cardNameKo}가 숨긴 메시지는 '${asText(extras.hiddenMessage || extras.shadowText || "지금은 확답보다 안전한 대화 리듬이 필요하다")}'에 가깝습니다. 겉으로 침묵이 길어도 내면에서는 관계 비용과 상처 재발 가능성을 동시에 계산하는 흐름입니다.`,
  );

  const caution = sanitizeInnerHeartTarotText(
    asText(extras.caution) || "감정 확인을 몰아붙이면 방어가 강해져 오히려 연락 흐름이 늦어질 수 있습니다. 지금 가장 위험한 패턴은 '반응 지연=거절'로 단정하고 추궁 강도를 높이는 행동입니다.",
  );

  const advice = sanitizeInnerHeartTarotText(
    asText(extras.advice) || `짧고 안정적인 대화 신호를 먼저 보내며 반응 간격을 존중하는 태도가 유리합니다. 실전 행동 기준은 '${masterGuide.action}'입니다.`,
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
    summary: `${cardNameKo}와 ${asText(extras.subCardName || "보조 흐름")} 조합은 ${emotionalReading}`,
    content: [cardMeaning, positionMeaning, emotionalReading].join(" "),
    detail: [
      `카드 기본 의미: ${cardMeaning}`,
      `이 위치에서의 의미: ${positionMeaning}`,
      `상대 속마음 해석: ${emotionalReading}`,
      `상대가 말하지 못하는 메시지: ${hiddenMessage}`,
      `주의할 점: ${caution}`,
      `내가 취할 태도: ${advice}`,
    ],
    mainCardName: cardNameKo,
    subCardName: asText(extras.subCardName || "보조 흐름"),
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

function buildSummary(sections) {
  const safe = Array.isArray(sections) ? sections : [];
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

  const hiddenCore = safe[2]?.hiddenMessage || "겉표현보다 내면의 불안과 책임 회피가 핵심 변수로 읽힙니다.";
  const contactPossibility = safe[4]?.emotionalReading || "연락 가능성은 있으나 압박 없는 접점에서만 열릴 가능성이 큽니다.";
  const relationshipRisk = [safe[3]?.caution, safe[4]?.caution].filter(Boolean).join(" ") || "불안이 커지는 순간 확인을 강요하면 관계가 다시 닫힐 수 있습니다.";
  const recommendedAttitude = safe[5]?.advice || "반응 속도를 재촉하지 말고 짧은 안부와 명확한 경계로 리듬을 맞추세요.";
  const finalFlow = safe[6]?.emotionalReading || "관계는 즉답보다 조정 단계로 흐르며, 안정적인 반복 접점이 있을 때 회복 가능성이 살아납니다.";
  const oracleMessage = "감정을 증명하려 애쓰기보다, 상대가 안전하다고 느낄 수 있는 말 한 줄과 재촉하지 않는 간격이 흐름을 바꿉니다.";

  return {
    emotionalTemperature,
    hiddenCore,
    contactPossibility,
    relationshipRisk,
    recommendedAttitude,
    finalFlow,
    oracleMessage,
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

function buildMindscanReadingPayload(pairs) {
  const safePairs = Array.isArray(pairs) ? pairs.slice(0, 5) : [];
  if (!safePairs.length) {
    return { ok: false, message: "카드 페어 데이터가 필요합니다." };
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
      questionSpecificMeaning: cardReading?.questionSpecificMeaning,
      positionMeaning: cardReading?.positionMeaning,
      hiddenMessage: cardReading?.shadowText,
      caution: cardReading?.caution,
      advice: cardReading?.advice,
      subCardName: asText(subCard?.nameKo || subCard?.nameKr || subCard?.nameEn),
      loveSignal: idx <= 1 ? "긍정" : idx <= 4 ? "혼란" : "재접근 가능",
      emotionalTemperature: idx <= 1 ? 4 : idx <= 4 ? 3 : 4,
    });
  });

  const summary = buildSummary(sections);
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
    reApproachChance: "상대의 방어가 풀리는 순간부터 재접근 여지가 생기며, 접촉 성공률은 메시지 길이보다 타이밍 설계에 더 크게 좌우됩니다.",
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
    intro: "카드는 상대가 마음이 없어서 멈춘 것이 아니라, 감정과 방어가 동시에 작동해 속도를 늦추는 흐름을 보여줍니다. 따라서 이번 리딩의 핵심은 '좋아하느냐/아니냐'의 이분법이 아니라, 어떤 조건에서 마음이 열리고 어떤 방식에서 다시 닫히는지를 읽는 것입니다.",
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
    masterAdvice: `${summary.recommendedAttitude} 또한 지금 단계에서는 감정 증명보다 관계 안전장치(대화 속도, 경계 문장, 재접촉 간격)를 먼저 설계해야 재회 가능성과 관계 지속성이 동시에 올라갑니다.`,
    suggestedMessages: [
      { tone: "부담 완화", text: "요즘 네 생각이 나서 안부 남겨. 답장은 편할 때 해줘도 괜찮아." },
      { tone: "재접점", text: "예전 얘기를 길게 꺼내기보다, 요즘 지내는 얘기부터 천천히 나누고 싶어." },
      { tone: "경계 존중", text: "네 리듬을 존중하고 싶어. 부담 없는 선에서 대화 이어가면 좋겠어." },
    ],
    oneLineConclusion: summary.finalFlow,
    closing: `${summary.oracleMessage} 오늘의 결론은 '강한 표현'이 아니라 '안전한 표현'입니다.`,
    validation,
  };
}

export {
  sanitizeInnerHeartTarotText,
  removeRepeatedInnerHeartPhrases,
  validateInnerHeartTarotReading,
  buildInnerHeartTarotSection,
  buildMindscanReadingPayload,
};
