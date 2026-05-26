import { buildImageCandidates, getTarotCardByAnyId, TAROT_CARDS } from "./tarot-cards.mjs";
import { analyzeTarotCombinations } from "./tarot-combination-engine.mjs";
import { expectedCardCount, getSpreadDefinition, normalizeSpreadType } from "./spreads.mjs";

class TarotInterpretationError extends Error {
  constructor(code, message, userMessage, meta = {}) {
    super(message);
    this.name = "TarotInterpretationError";
    this.code = code;
    this.userMessage = userMessage || "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
    this.meta = meta;
  }
}

function asText(value) {
  return String(value || "").trim();
}

function normalizeOrientation(value) {
  return value === "reversed" ? "reversed" : "upright";
}

function getMeaningByQuestion(card, orientation, questionType) {
  const meaning = orientation === "reversed" ? card.reversed : card.upright;
  const key = questionType && meaning[questionType] ? questionType : "general";
  const line = Array.isArray(meaning[key]) && meaning[key].length
    ? meaning[key][0]
    : (Array.isArray(meaning.general) && meaning.general[0]) || "이 카드의 흐름을 신중하게 읽어야 합니다.";
  const advice = (Array.isArray(meaning.advice) && meaning.advice[0]) || "속도보다 방향을 먼저 잡아 보세요.";
  const core = (Array.isArray(meaning.core) && meaning.core[0]) || "핵심 흐름을 점검해 보세요.";
  const keywords = Array.isArray(meaning.keywords) && meaning.keywords.length
    ? meaning.keywords.slice(0, 5)
    : card.keywords.slice(0, 5);
  return {
    line,
    advice,
    core,
    keywords,
    coreMeaning: asText(meaning.coreMeaning) || core,
    psychologicalMeaning: asText(meaning.psychologicalMeaning) || core,
    selfEsteemMeaning: asText(meaning.selfEsteemMeaning) || line,
    shadow: asText(meaning.shadowNote || meaning.shadowText),
  };
}

const FORBIDDEN_QUALITY_PHRASES = [
  "전체적으로 지연 신호가 있으니 점검이 우선입니다.",
  "전체적으로 순환이 열려 있어 전진하기 좋은 흐름입니다.",
  "조급한 행동은 오히려 꼬일 수 있습니다.",
  "결말을 서두르기보다 중간 조정이 필요합니다.",
  "흐름이 열려 있습니다.",
  "현재는 점검이 필요합니다.",
  "변화의 시기입니다.",
  "균형이 필요합니다.",
  "긍정적인 에너지가 있습니다.",
  "부정적인 에너지가 있습니다.",
];

const POSITION_SELF_ESTEEM_CONTEXT = {
  past_debuff: {
    prompt: "내가 남의 눈치를 살피게 된 이유",
    focus: "과거 경험, 내면화된 기준, 죄책감, 인정 욕구",
    keywords: ["불공정", "죄책감", "기준", "자기판단"],
  },
  inner_monster: {
    prompt: "왜 나는 거절을 어려워 할까",
    focus: "버림받을 두려움, 갈등 회피, 감정 조절, 경계선",
    keywords: ["거절", "경계", "감정 조절", "관계 유지"],
  },
  current_damage: {
    prompt: "눈치 보는 습관이 내게 주는 피해",
    focus: "에너지 소모, 자기검열, 분노 억압, 관계 피로",
    keywords: ["소진", "방어", "자기검열", "피로"],
  },
  mind_shield: {
    prompt: "타인의 실망을 견뎌내는 방법",
    focus: "자기결정권, 감정 분리, 건강한 권위, 단호한 소통",
    keywords: ["자기주도", "권위", "경계", "리더십"],
  },
  levelup_mastery: {
    prompt: "내 마음을 1순위로 챙기는 방법",
    focus: "자기승인, 비교 중단, 작은 성공, 자존감 재건",
    keywords: ["자기승인", "비교 중단", "회복", "자기돌봄"],
  },
};

function normalizeLength(text, minimumLength) {
  const source = asText(text);
  if (source.length >= minimumLength) return source;
  return source;
}

function dedupeSentences(text) {
  const source = asText(text);
  if (!source) return "";
  const parts = source
    .split(/(?<=[.!?。！？]|니다\.|요\.)\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const seen = new Set();
  const unique = [];
  parts.forEach((line) => {
    if (seen.has(line)) return;
    seen.add(line);
    unique.push(line);
  });
  return unique.join(" ");
}

function orientationLabel(orientation) {
  return orientation === "reversed" ? "역방향" : "정방향";
}

function pickKeywords(meaning, fallback = []) {
  const source = Array.isArray(meaning?.keywords) && meaning.keywords.length
    ? meaning.keywords
    : fallback;
  return source.slice(0, 3);
}

function buildSelfEsteemActionStep({ cardNameKo, positionLabel, meaning, orientation }) {
  const seed = asText(meaning?.advice) || "오늘은 내 감정을 짧고 명확하게 표현해 보세요.";
  if (orientation === "reversed") {
    return `${positionLabel} 자리의 ${cardNameKo} 역방향 기준으로, 오늘 단 한 번은 타인의 반응을 예측하지 말고 내 감정을 먼저 한 문장으로 말해 보세요. ${seed}`;
  }
  return `${positionLabel} 자리의 ${cardNameKo} 정방향 기준으로, 오늘 단 한 번은 나를 지키는 기준을 먼저 말하고 필요한 설명만 짧게 덧붙여 보세요. ${seed}`;
}

function buildSelfEsteemInterpretation({ positionLabel, positionKey, cardNameKo, orientation, meaning }) {
  const context = POSITION_SELF_ESTEEM_CONTEXT[positionKey] || {
    prompt: positionLabel,
    focus: "자기이해와 회복",
    keywords: ["회복", "경계", "자기돌봄"],
  };

  const orientationText = orientation === "reversed"
    ? `${cardNameKo} 역방향은 지금 이 자리에서 멈춰 서서 내 패턴을 재정비하라는 신호입니다.`
    : `${cardNameKo} 정방향은 지금 이 자리에서 이미 회복 가능한 힘이 작동하고 있음을 보여줍니다.`;

  const paragraph = [
    `${context.prompt} 자리에서 ${orientationText} 이 카드가 말하는 핵심은 ${asText(meaning.coreMeaning)} 입니다.`,
    `왜 이런 패턴이 생겼는지를 보면 ${asText(meaning.psychologicalMeaning)} 와 깊게 연결되어 있습니다. ${asText(meaning.shadow) ? `특히 ${asText(meaning.shadow)}` : "특히 관계의 평온을 위해 내 감정을 뒤로 미루는 습관이 누적되면 자존감이 쉽게 흔들릴 수 있습니다."}`,
    `지금 이 패턴이 당신에게 주는 영향은 ${context.focus} 영역에서 가장 크게 드러납니다. 겉으로는 괜찮아 보여도 내면에서는 자기검열과 긴장이 늘어나고, 결국 선택의 기준이 타인의 반응으로 이동하기 쉽습니다.`,
    `회복을 위해 필요한 관점은 완벽한 반응을 만드는 것이 아니라, 나를 지키는 기준을 먼저 세운 뒤 관계를 조율하는 것입니다. 자존감은 큰 결심보다 작은 자기승인 행동이 반복될 때 안정됩니다.`,
  ].join(" ");

  return normalizeLength(dedupeSentences(paragraph), 400);
}

function buildSelfEsteemAdvice({ positionLabel, cardNameKo, orientation, meaning }) {
  const direction = orientation === "reversed"
    ? "지금은 타인의 실망을 막는 전략보다, 내 감정을 먼저 확인하는 전략으로 중심을 이동해야 합니다."
    : "지금은 이미 가진 회복 자원을 생활 루틴으로 연결해, 흔들릴 때 돌아올 기준을 만드는 것이 중요합니다.";

  const advice = `${positionLabel} 자리의 ${cardNameKo} ${orientationLabel(orientation)} 조언은 ${asText(meaning.selfEsteemMeaning)} ${direction} ${asText(meaning.advice)} 상대를 이기려는 태도보다, 나를 버리지 않는 태도를 반복해 보세요.`;
  return normalizeLength(dedupeSentences(advice), 150);
}

function containsForbiddenPhrase(text) {
  const source = asText(text);
  return FORBIDDEN_QUALITY_PHRASES.some((phrase) => source.includes(phrase));
}

function validateTarotReadingQuality({ spreadId, positions, levelUpGuide }) {
  const failures = [];
  const safePositions = Array.isArray(positions) ? positions : [];

  safePositions.forEach((pos, idx) => {
    const interpretation = asText(pos?.interpretation);
    const advice = asText(pos?.advice);
    if (!interpretation) failures.push(`position_${idx + 1}_interpretation_empty`);
    if (!advice) failures.push(`position_${idx + 1}_advice_empty`);
    if (containsForbiddenPhrase(interpretation) || containsForbiddenPhrase(advice)) {
      failures.push(`position_${idx + 1}_forbidden_phrase`);
    }
    if (!asText(pos?.cardName) || !asText(pos?.positionTitle)) {
      failures.push(`position_${idx + 1}_missing_core_fields`);
    }
    if (safePositions.some((other, otherIdx) => otherIdx !== idx && asText(other?.interpretation) === interpretation)) {
      failures.push(`position_${idx + 1}_duplicated_interpretation`);
    }
    if (spreadId === "self_esteem_levelup_five_card") {
      const emotionalThemeOk = /(회복|경계|자기돌봄|자기승인|자기결정|자존감)/.test(`${interpretation} ${advice}`);
      if (!emotionalThemeOk) failures.push(`position_${idx + 1}_self_esteem_theme_missing`);
      if (interpretation.length < 400) failures.push(`position_${idx + 1}_interpretation_too_short`);
      if (advice.length < 150) failures.push(`position_${idx + 1}_advice_too_short`);
    }
  });

  if (spreadId === "self_esteem_levelup_five_card") {
    const guide = asText(levelUpGuide);
    if (!guide) failures.push("levelup_guide_empty");
    if (!/(에서|에서 시작해|에서 .*로 이어|->|→)/.test(guide)) failures.push("levelup_flow_not_connected");
    if (containsForbiddenPhrase(guide)) failures.push("levelup_forbidden_phrase");
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

function inferQuestionType({ questionType, category, spreadId, serviceKey }) {
  const explicitQuestionType = asText(questionType).toLowerCase();
  if (["love", "relationship", "reunion", "exmind", "currentmind", "future", "career", "money", "daily", "general"].includes(explicitQuestionType)) {
    if (explicitQuestionType === "exmind") return "exMind";
    if (explicitQuestionType === "currentmind") return "currentMind";
    return explicitQuestionType;
  }

  const normalizedSpread = normalizeSpreadType(spreadId || "");
  const spread = getSpreadDefinition(normalizedSpread);
  if (spread?.questionType) return spread.questionType;

  const categoryKey = asText(category).toLowerCase();
  const serviceKeyRaw = asText(serviceKey).toLowerCase();
  const merged = `${categoryKey} ${serviceKeyRaw}`;

  if (/reunion|재회/.test(merged)) return "reunion";
  if (/exmind|mindscan|속마음|상대방/.test(merged)) return "exMind";
  if (/relationship|연애|love/.test(merged)) return categoryKey === "love" ? "love" : "relationship";
  if (/career|job|직업|진로/.test(merged)) return "career";
  if (/money|finance|금전|재물/.test(merged)) return "money";
  if (/daily|오늘/.test(merged)) return "daily";
  if (/future|yearly|연간|year/.test(merged)) return "future";
  return "general";
}

function ensureSpreadAndCount(spreadId, drawnCards) {
  const normalizedSpreadId = normalizeSpreadType(spreadId || "one_card");
  const spread = getSpreadDefinition(normalizedSpreadId);
  if (!spread) {
    throw new TarotInterpretationError(
      "UNSUPPORTED_SPREAD",
      `Unsupported spread: ${normalizedSpreadId}`,
      "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
      { spreadId: normalizedSpreadId },
    );
  }

  const expected = expectedCardCount(normalizedSpreadId);
  if (!Array.isArray(drawnCards) || drawnCards.length !== expected) {
    throw new TarotInterpretationError(
      "INVALID_CARD_COUNT",
      `${normalizedSpreadId} requires ${expected} cards`,
      `${normalizedSpreadId}은(는) ${expected}장의 카드가 필요합니다.`,
      { spreadId: normalizedSpreadId, expected, received: Array.isArray(drawnCards) ? drawnCards.length : 0 },
    );
  }

  return { spread, normalizedSpreadId };
}

function normalizeDrawnCardsForSpread(spreadId, cards) {
  const normalizedSpreadId = normalizeSpreadType(spreadId || "one_card");
  const spread = getSpreadDefinition(normalizedSpreadId);
  if (!spread) {
    throw new TarotInterpretationError(
      "UNSUPPORTED_SPREAD",
      `Unsupported spread: ${normalizedSpreadId}`,
      "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
      { spreadId: normalizedSpreadId },
    );
  }

  const safeCards = Array.isArray(cards) ? cards : [];
  return safeCards.map((item, idx) => {
    const position = spread.positions[idx] || spread.positions[0];
    const positionKey = asText(item?.positionKey || item?.position || position?.key);
    const card = getTarotCardByAnyId(item?.cardId || item?.id || item?.code);

    if (!card) {
      throw new TarotInterpretationError(
        "CARD_DATA_MISSING",
        `Card not found: ${item?.cardId || item?.id || item?.code || "(empty)"}`,
        "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
        { cardInput: item },
      );
    }

    return {
      cardId: card.code,
      positionKey: positionKey || position?.key || `position_${idx + 1}`,
      orientation: normalizeOrientation(item?.orientation),
    };
  });
}

function drawTarotCardsForSpread(spreadId) {
  const normalizedSpreadId = normalizeSpreadType(spreadId || "one_card");
  const spread = getSpreadDefinition(normalizedSpreadId);
  if (!spread) {
    throw new TarotInterpretationError(
      "UNSUPPORTED_SPREAD",
      `Unsupported spread: ${normalizedSpreadId}`,
      "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
      { spreadId: normalizedSpreadId },
    );
  }

  const shuffled = TAROT_CARDS.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return spread.positions.map((position, idx) => {
    const card = shuffled[idx];
    const orientation = Math.random() < 0.5 ? "upright" : "reversed";
    const meaning = getMeaningByQuestion(card, orientation, spread.questionType || "general");
    const images = buildImageCandidates(card.code);

    return {
      cardId: card.code,
      id: card.id,
      name: card.nameEn,
      nameEn: card.nameEn,
      nameKr: card.nameKo,
      nameKo: card.nameKo,
      position: position.key,
      positionKey: position.key,
      orientation,
      imageKey: card.imageKey || card.code.toLowerCase(),
      imageUrl: images[0],
      imageCandidates: images,
      proxyImageUrl: "",
      localImageUrl: images[0],
      keywords: card.keywords.slice(0, 5),
      interpretation: meaning.line,
    };
  });
}

function buildCardSection(interpretedCard) {
  const orientationLabel = interpretedCard.orientation === "reversed" ? "역방향" : "정방향";
  return {
    positionLabel: interpretedCard.positionLabel,
    cardName: interpretedCard.cardNameKo,
    orientationLabel,
    keywords: interpretedCard.keywords.slice(0, 5),
    meaning: interpretedCard.questionSpecificMeaning,
    relationshipMessage: interpretedCard.emotionalMessage,
    advice: interpretedCard.advice,
  };
}

function summarizeCombinations(combinations) {
  return (Array.isArray(combinations) ? combinations : [])
    .map((item) => `${item.title}: ${item.description}`)
    .join("\n");
}

function buildSelfEsteemLevelUpGuide({ spreadTitle, positionReadings }) {
  const safe = Array.isArray(positionReadings) ? positionReadings : [];
  const first = safe[0];
  const second = safe[1];
  const fourth = safe[3];
  const last = safe[safe.length - 1];

  const flow = `${spreadTitle} 배열은 '${first?.cardName || "첫 카드"} ${first?.orientation === "reversed" ? "역방향" : "정방향"}'에서 시작해 '${last?.cardName || "마지막 카드"} ${last?.orientation === "reversed" ? "역방향" : "정방향"}'으로 이어집니다. 초반에는 타인의 반응을 먼저 관리하려는 패턴이 강하지만, 중반 이후에는 자기기준과 감정 경계를 다시 세우며 회복의 주도권을 되찾는 서사입니다.`;
  const recoveryPoint = `가장 중요한 회복 포인트는 '${second?.positionTitle || "거절"}'에서 감정 조절과 경계 문장을 짧게 쓰는 연습을 시작하고, '${fourth?.positionTitle || "경계 회복"}'에서 따뜻하지만 단호한 기준을 행동으로 옮기는 것입니다.`;
  const caution = "조심해야 할 패턴은 상대의 실망을 내 가치 하락으로 해석하는 자동 사고입니다. 반응의 강도보다 나의 기준 일관성을 우선하면 자기소모가 빠르게 줄어듭니다.";
  const practice = "오늘의 연습 문장: '네 감정은 이해하지만, 내 선택은 내가 정할게.'";
  const mission = [
    "1단계: 요청을 받았을 때 즉답 대신 '확인 후 답할게요'를 먼저 말한다.",
    "2단계: 오늘 한 번은 설명을 과하게 붙이지 않고 경계 문장을 1회 실행한다.",
    "3단계: 하루가 끝나기 전, 타인 반응과 무관하게 내가 지킨 기준 1가지를 기록한다.",
  ];

  return {
    flow,
    recoveryPoint,
    caution,
    practice,
    mission,
    text: `${flow} ${recoveryPoint} ${caution} ${practice} ${mission.join(" ")}`,
  };
}

function generateTarotReading({ spreadId, spreadTitle, spreadTheme, positions, drawnCards, userQuestion, mode, questionType }) {
  const safePositions = Array.isArray(positions) ? positions : [];
  const safeDrawn = Array.isArray(drawnCards) ? drawnCards : [];
  const _unused = { spreadTheme, userQuestion, mode, questionType };
  void _unused;

  const positionReadings = safeDrawn.map((entry, idx) => {
    const position = safePositions[idx] || {};
    const meaning = entry?.meaning || {};
    const title = position?.label || `포지션 ${idx + 1}`;

    if (spreadId === "self_esteem_levelup_five_card") {
      const interpretation = buildSelfEsteemInterpretation({
        positionLabel: title,
        positionKey: position?.key,
        cardNameKo: entry?.card?.nameKo || "카드",
        orientation: entry?.orientation || "upright",
        meaning,
      });
      const advice = buildSelfEsteemAdvice({
        positionLabel: title,
        cardNameKo: entry?.card?.nameKo || "카드",
        orientation: entry?.orientation || "upright",
        meaning,
      });
      return {
        positionIndex: idx + 1,
        positionKey: position?.key || `position_${idx + 1}`,
        positionTitle: title,
        cardName: entry?.card?.nameKo || "",
        orientation: entry?.orientation === "reversed" ? "reversed" : "upright",
        keywords: pickKeywords(meaning, POSITION_SELF_ESTEEM_CONTEXT[position?.key]?.keywords || []),
        interpretation,
        advice,
        actionStep: buildSelfEsteemActionStep({
          cardNameKo: entry?.card?.nameKo || "카드",
          positionLabel: title,
          meaning,
          orientation: entry?.orientation || "upright",
        }),
      };
    }

    return {
      positionIndex: idx + 1,
      positionKey: position?.key || `position_${idx + 1}`,
      positionTitle: title,
      cardName: entry?.card?.nameKo || "",
      orientation: entry?.orientation === "reversed" ? "reversed" : "upright",
      keywords: pickKeywords(meaning, entry?.card?.keywords || []),
      interpretation: dedupeSentences(`${asText(meaning.line)} ${asText(meaning.psychologicalMeaning)}`),
      advice: dedupeSentences(`${asText(meaning.advice)} ${asText(meaning.selfEsteemMeaning) || "실행 가능한 작은 행동으로 연결하세요."}`),
      actionStep: buildSelfEsteemActionStep({
        cardNameKo: entry?.card?.nameKo || "카드",
        positionLabel: title,
        meaning,
        orientation: entry?.orientation || "upright",
      }),
    };
  });

  const levelUpGuide = spreadId === "self_esteem_levelup_five_card"
    ? buildSelfEsteemLevelUpGuide({ spreadTitle, positionReadings })
    : null;

  const quality = validateTarotReadingQuality({
    spreadId,
    positions: positionReadings,
    levelUpGuide: levelUpGuide?.text,
  });

  if (!quality.ok && spreadId === "self_esteem_levelup_five_card") {
    const repaired = positionReadings.map((item) => ({
      ...item,
      interpretation: containsForbiddenPhrase(item.interpretation)
        ? dedupeSentences(`${item.cardName} ${orientationLabel(item.orientation)}은 ${item.positionTitle} 자리에서 자기이해와 경계 회복이 핵심임을 보여줍니다. 상대 반응을 예측해 자신을 낮추기보다 내 감정을 먼저 확인하고, 선택의 기준을 내 쪽으로 되돌리는 연습이 필요합니다. 눈치를 보는 패턴은 소심함이 아니라 오래 버틴 생존 전략일 수 있으니, 오늘은 한 번만이라도 짧고 분명한 경계 문장을 실행해 보세요. 이 작은 실행이 자존감 회복의 첫 단추가 됩니다.`)
        : item.interpretation,
      advice: containsForbiddenPhrase(item.advice)
        ? "오늘의 조언은 단순합니다. 타인의 반응을 통제하려 하지 말고, 내 기준을 한 문장으로 먼저 말해 보세요. 불편함이 생겨도 그 불편함을 견디는 경험이 쌓일수록 자기승인이 강화됩니다. 관계를 끊기 위한 거절이 아니라, 관계를 건강하게 유지하기 위한 경계 설정이라는 관점을 반복해 주세요."
        : item.advice,
    }));

    return {
      positionReadings: repaired,
      levelUpGuide,
      quality: validateTarotReadingQuality({ spreadId, positions: repaired, levelUpGuide: levelUpGuide?.text }),
    };
  }

  return {
    positionReadings,
    levelUpGuide,
    quality,
  };
}

function interpretTarotReading(input) {
  const questionType = inferQuestionType(input || {});
  const spreadId = normalizeSpreadType(input?.spreadId || "one_card");
  const { spread } = ensureSpreadAndCount(spreadId, input?.drawnCards);

  const normalizedDrawn = normalizeDrawnCardsForSpread(spreadId, input.drawnCards);

  const entries = normalizedDrawn.map((drawn, idx) => {
    const card = getTarotCardByAnyId(drawn.cardId);
    if (!card) {
      throw new TarotInterpretationError(
        "CARD_DATA_MISSING",
        `Card data missing for ${drawn.cardId}`,
        "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
        { drawn },
      );
    }

    const position = spread.positions.find((item) => item.key === drawn.positionKey) || spread.positions[idx];
    const meaning = getMeaningByQuestion(card, drawn.orientation, questionType);

    const interpretedCard = {
      positionLabel: position?.label || `포지션 ${idx + 1}`,
      positionRole: position?.role || "현재 흐름을 읽는 자리",
      cardNameKo: card.nameKo,
      cardNameEn: card.nameEn,
      orientation: drawn.orientation,
      keywords: meaning.keywords.slice(0, 5),
      positionMeaning: `${position?.label || `포지션 ${idx + 1}`}은(는) ${position?.role || "핵심 흐름"}을 보여주는 자리입니다.`,
      questionSpecificMeaning: meaning.line,
      emotionalMessage: `${card.nameKo} 카드가 말하는 감정의 결은 '${meaning.psychologicalMeaning}' 쪽에 가깝습니다.`,
      advice: meaning.advice,
      cardCode: card.code,
      cardId: card.id,
      meaning,
    };

    return {
      card,
      orientation: drawn.orientation,
      position,
      meaning,
      interpretedCard,
    };
  });

  const combinations = analyzeTarotCombinations(entries, questionType, spread);
  const generated = generateTarotReading({
    spreadId,
    spreadTitle: spread.title || "타로 리딩",
    spreadTheme: spread?.title || "",
    positions: spread.positions,
    drawnCards: entries,
    userQuestion: asText(input?.userQuestion),
    mode: "local_template",
    questionType,
  });

  const positionReadingMap = new Map((generated.positionReadings || []).map((item, idx) => [idx, item]));
  const interpretedCards = entries.map((entry) => entry.interpretedCard);
  interpretedCards.forEach((card, idx) => {
    const mapped = positionReadingMap.get(idx);
    if (!mapped) return;
    card.questionSpecificMeaning = mapped.interpretation;
    card.advice = mapped.advice;
    card.keywords = Array.isArray(mapped.keywords) ? mapped.keywords.slice(0, 5) : card.keywords;
    card.actionStep = mapped.actionStep;
  });
  const cardSections = interpretedCards.map(buildCardSection);

  const title = spread.title || "타로 리딩";
  const summary = `${title} 결과입니다. 이번 리딩은 ${interpretedCards.map((card) => card.cardNameKo).join(", ")} 흐름으로 구성되며, 단정 대신 흐름을 읽을수록 해석 정확도가 높아집니다.`;
  const combinationReading = spreadId === "self_esteem_levelup_five_card"
    ? (generated.levelUpGuide?.text || "")
    : summarizeCombinations(combinations);
  const finalReading = `${summary}\n${combinationReading}\n지금 중요한 건 감정의 크기보다 대화의 방식과 타이밍을 맞추는 일입니다.`.trim();

  const adviceCandidates = interpretedCards.map((card) => card.advice).filter(Boolean);
  const advice = adviceCandidates[0] || "지금은 감정 확인보다 작은 행동 합의가 우선입니다.";

  const reversedRatio = entries.filter((entry) => entry.orientation === "reversed").length / Math.max(1, entries.length);
  const caution = reversedRatio >= 0.5
    ? "역방향 카드 비율이 높습니다. 조급한 결론보다 속도 조절이 필요합니다."
    : undefined;

  return {
    title,
    summary,
    cards: interpretedCards,
    cardSections,
    combinations,
    combinationReading,
    finalReading,
    advice,
    caution,
    positionReadings: generated.positionReadings || [],
    levelUpGuide: generated.levelUpGuide || null,
    quality: generated.quality || null,
    spreadId,
    questionType,
  };
}

function mapRelationshipReading(result) {
  const positionBreakdown = result.cards.map((card, idx) => ({
    positionTitle: card.positionLabel,
    cardName: card.cardNameKo,
    orientationLabel: card.orientation === "reversed" ? "역방향" : "정방향",
    headline: card.questionSpecificMeaning,
    summary: `${card.positionLabel} 자리의 핵심은 ${card.questionSpecificMeaning}이며, 감정 해석보다 관계 리듬 확인이 먼저입니다.`,
    detail: card.orientation === "reversed"
      ? `${card.positionRole} 기준으로 연락 속도를 늦추고 대화의 순서를 정리하면 오해와 부담을 줄일 수 있습니다.`
      : `${card.positionRole} 기준으로 약속 이행과 행동 패턴을 맞추면 호감이 안정적으로 쌓입니다.`,
    relationshipInsight: `${card.emotionalMessage} 호감과 거리감이 함께 보일 때는 행동 패턴 중심으로 읽어야 관계 피로를 줄일 수 있습니다.`,
    advice: `${card.advice} 연락·만남·대화의 리듬을 한 번에 올리기보다 한 단계씩 맞춰 가세요. 감정 확인은 짧고 명료하게 끝내는 편이 좋습니다.`,
    caution: result.caution || "반응 속도만으로 결론을 내리지 마세요.",
    title: card.positionLabel,
    card: `${card.cardNameKo} · ${card.orientation === "reversed" ? "역방향" : "정방향"}`,
  }));

  return {
    title: result.title,
    summary: result.summary,
    overallVibe: `${result.summary} 지금은 누구의 마음이 더 크냐보다, 서로의 표현 방식이 맞는지 확인하는 구간입니다.`,
    deepReading: `${result.finalReading}\n상대를 설득하려는 대화보다 서로를 이해하려는 대화가 관계를 오래 살립니다.`,
    realityAndFuture: `${result.combinationReading}\n결과는 한 번의 대화보다 반복되는 대화 품질에서 결정됩니다.`,
    positionBreakdown,
    finalAdvice: {
      instantMission: positionBreakdown[0]?.advice || result.advice,
      conversationTip: "감정 추궁보다 사실 확인 질문 1개를 먼저 던져 보세요.",
      relationshipBoundary: "상대 반응을 속도로 평가하지 말고 일관성으로 평가하세요.",
      nextSevenDays: "앞으로 7일은 짧고 따뜻한 대화 1회를 만드는 데 집중하세요.",
    },
    advice: [
      result.advice,
      "추측보다 확인 질문이 오해를 줄입니다.",
      "작은 약속 이행률을 기준으로 관계를 판단하세요.",
    ],
    cardSections: result.cardSections,
    combinations: result.combinations,
    combinationReading: result.combinationReading,
    finalAdviceText: result.advice,
  };
}

function reunionScoreFromResult(result) {
  const positive = (result.combinations || []).filter((item) => item.type === "supportivePair").length;
  const negative = (result.combinations || []).filter((item) => item.type === "conflictPair").length;
  const reversed = (result.cards || []).filter((item) => item.orientation === "reversed").length;
  const raw = 58 + (positive * 8) - (negative * 9) - (reversed * 4);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function reunionLabel(score) {
  if (score >= 75) return "높음";
  if (score >= 58) return "조건부 높음";
  if (score >= 40) return "보통";
  return "낮음";
}

function mapReunionReading(result) {
  const score = reunionScoreFromResult(result);
  const positions = result.cards.map((card) => {
    const headline = dedupeSentences(card.questionSpecificMeaning);
    const removeHeadline = (text) => {
      const raw = dedupeSentences(text);
      if (!headline) return raw;
      const removed = raw.split(headline).join("").replace(/\s{2,}/g, " ").trim();
      return removed || raw;
    };

    return {
      positionTitle: card.positionLabel,
      cardName: card.cardNameKo,
      orientationLabel: card.orientation === "reversed" ? "역방향" : "정방향",
      headline,
      directAnswer: removeHeadline(`${card.positionLabel} 기준으로 보면 ${card.questionSpecificMeaning}`),
      detailedReading: removeHeadline(card.orientation === "reversed"
        ? `${card.positionMeaning} 지금은 감정 확인보다 대화 구조를 정돈해야 방어심리를 줄일 수 있습니다.`
        : `${card.positionMeaning} 조급하지 않은 연결을 유지하면 재회 흐름이 천천히 살아날 수 있습니다.`),
      reunionPoint: removeHeadline(`${card.emotionalMessage} 핵심은 오해를 줄이는 말의 순서와 속도, 그리고 책임 있는 태도입니다.`),
      advice: removeHeadline(`${card.advice} 짧은 안부로 반응을 확인한 뒤 다음 단계를 정하세요. 압박형 질문은 피하는 편이 안전합니다.`),
    };
  });

  return {
    title: result.title,
    summary: {
      reunionChanceLabel: reunionLabel(score),
      reunionChanceScore: score,
      partnerState: positions[1]?.directAnswer || "관망 중",
      bestContactTiming: score >= 58 ? "짧은 안부만 추천" : "자연스러운 계기 필요",
      mainObstacle: positions[2]?.directAnswer || "오해와 경계",
      oneLineAdvice: result.advice,
    },
    positions,
    opening: `${result.summary} 재회는 감정의 크기보다 재발 방지 대화가 가능한지에서 갈립니다.`,
    pastBond: positions[0]?.detailedReading || "",
    theirNow: positions[1]?.detailedReading || "",
    outsideFactor: positions[2]?.detailedReading || "",
    theirHeart: positions[3]?.detailedReading || "",
    reunionOutcome: positions[4]?.detailedReading || "",
    lighthouseGuidance: `${result.combinationReading}\n지금 필요한 건 긴 고백보다 부담을 낮춘 연결과 일관된 행동입니다.`,
    finalGuide: {
      shouldContactNow: score >= 58
        ? "지금 가능, 다만 짧은 안부만 추천"
        : "먼저 연락 비추천",
      messageExample: "요즘 문득 생각나서 짧게 안부 남겨. 부담 없다면 답장해 줘.",
      avoidThis: "결론을 강요하는 질문은 피하세요.",
      nextSevenDays: "앞으로 7일은 갈등 재발 방지 문장을 한 줄로 정리해 보세요.",
    },
    actionPlan: positions.map((item) => item.advice).filter(Boolean).slice(0, 6),
    cardSections: result.cardSections,
    combinations: result.combinations,
    combinationReading: result.combinationReading,
    finalAdviceText: result.advice,
  };
}

function mapHealingReading(result) {
  const cards = result.cards;
  return {
    title: result.title,
    opening: `${result.summary} 지금은 마음을 고치려 하기보다, 지친 지점을 정확히 알아차리는 것이 먼저입니다.`,
    hiddenTruth: cards[0] ? `${cards[0].positionMeaning} ${cards[0].questionSpecificMeaning} 문제를 정확히 이름 붙일수록 회복은 빨라집니다.` : "",
    embracePain: cards[1] ? `${cards[1].positionMeaning} ${cards[1].questionSpecificMeaning} 감정을 부정하지 말고 안전한 방식으로 통과시켜 주세요.` : "",
    silverLining: cards[2] ? `${cards[2].positionMeaning} ${cards[2].questionSpecificMeaning} 지금의 통찰은 다음 선택의 기준이 됩니다.` : "",
    stepForward: cards[3] ? `${cards[3].positionMeaning} ${cards[3].questionSpecificMeaning} 오늘 바로 가능한 작은 루틴부터 실행해 보세요.` : "",
    integrationMessage: `${result.combinationReading}\n치유는 거대한 결심보다 작은 안정 루틴의 반복에서 완성됩니다.`,
    actionPlan: cards.map((card) => card.advice).filter(Boolean),
    cardSections: result.cardSections,
    combinations: result.combinations,
    finalAdviceText: result.advice,
  };
}

function mapYearlyReading(result) {
  const months = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const monthlyReadings = result.cards.map((card, idx) => ({
    month: idx + 1,
    flow: `${months[idx] || `${idx + 1}월`}의 카드 ${card.cardNameKo}: ${card.questionSpecificMeaning}. 이번 달은 속도보다 우선순위가 성패를 가릅니다.`,
    money: card.advice,
    love: card.emotionalMessage,
    relationship: card.positionMeaning,
    exam: "짧은 집중 루틴을 반복하면 결과가 좋아집니다.",
  }));

  return {
    title: result.title,
    summary: result.summary,
    finalAdvice: result.advice,
    monthlyReadings,
    cardSections: result.cardSections,
    combinations: result.combinations,
    combinationReading: result.combinationReading,
  };
}

function mapSelfEsteemReading(result) {
  const byIndex = (idx) => result.cards[idx]?.questionSpecificMeaning || "";
  const positionReadings = Array.isArray(result.positionReadings) ? result.positionReadings : [];
  const guide = result.levelUpGuide || {};
  const flowCard = {
    flow: asText(guide.flow),
    recoveryPoint: asText(guide.recoveryPoint),
    caution: asText(guide.caution),
    practice: asText(guide.practice),
    mission: Array.isArray(guide.mission) ? guide.mission : [],
  };
  return {
    title: result.title,
    opening: `${result.summary} 자존감은 기분이 아니라 반복되는 자기 대화의 문장으로 만들어집니다.`,
    pastDebuff: byIndex(0),
    innerMonster: byIndex(1),
    currentDamage: byIndex(2),
    mindShield: byIndex(3),
    levelupMastery: byIndex(4),
    levelupGuidance: flowCard.flow,
    levelupGuide: flowCard,
    positionReadings,
    positionInsights: positionReadings.map((item) => ({
      position: item.positionKey || `slot_${item.positionIndex}`,
      title: item.positionTitle,
      subtitle: orientationLabel(item.orientation),
      cardLabel: `${item.cardName} · ${orientationLabel(item.orientation)}`,
      message: item.interpretation,
      advice: item.advice,
      actionStep: item.actionStep,
      keywords: item.keywords,
    })),
    actionPlan: positionReadings.map((item) => item.actionStep).filter(Boolean),
    cardSections: result.cardSections,
    combinations: result.combinations,
    quality: result.quality,
  };
}

function mapGenericReading(result) {
  return {
    title: result.title,
    story: `${result.finalReading}\n핵심은 정답 찾기가 아니라, 지금 가능한 가장 현실적인 한 걸음을 고르는 것입니다.`,
    advice: result.advice,
    cardNarratives: result.cards.map((card) => ({
      position: card.positionLabel,
      cardName: card.cardNameKo,
      interpretation: card.questionSpecificMeaning,
    })),
    cardSections: result.cardSections,
    combinations: result.combinations,
    combinationReading: result.combinationReading,
    finalAdvice: result.advice,
  };
}

function buildLegacyReadingPayload(result, { spreadId }) {
  const normalizedSpread = normalizeSpreadType(spreadId || result.spreadId || "one_card");
  if (normalizedSpread === "relationship_six_card") return mapRelationshipReading(result);
  if (normalizedSpread === "reunion_lighthouse_five_card") return mapReunionReading(result);
  if (normalizedSpread === "healing_rising_four_card") return mapHealingReading(result);
  if (normalizedSpread === "yearly_twelve_card" || normalizedSpread === "yearly_three_card") return mapYearlyReading(result);
  if (normalizedSpread === "self_esteem_levelup_five_card") return mapSelfEsteemReading(result);
  return mapGenericReading(result);
}

function buildConsultingHighlights(reading) {
  const keys = [
    "overallVibe",
    "deepReading",
    "realityAndFuture",
    "opening",
    "summary",
    "finalAdvice",
    "combinationReading",
  ];

  const lines = [];
  keys.forEach((key) => {
    const value = reading?.[key];
    const text = Array.isArray(value)
      ? value.map((item) => asText(item)).filter(Boolean).join(" ")
      : asText(value);
    if (!text) return;
    lines.push(text.replace(/\s+/g, " "));
  });

  return lines.slice(0, 4);
}

export {
  TarotInterpretationError,
  generateTarotReading,
  validateTarotReadingQuality,
  inferQuestionType,
  normalizeDrawnCardsForSpread,
  drawTarotCardsForSpread,
  interpretTarotReading,
  buildLegacyReadingPayload,
  buildConsultingHighlights,
};
