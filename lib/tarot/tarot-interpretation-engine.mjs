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
  return { line, advice, core };
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
      keywords: card.keywords.slice(0, 5),
      positionMeaning: `${position?.label || `포지션 ${idx + 1}`}은(는) ${position?.role || "핵심 흐름"}을 보여주는 자리입니다.`,
      questionSpecificMeaning: meaning.line,
      emotionalMessage: `${card.nameKo} 카드가 말하는 감정의 결은 '${meaning.core}' 쪽에 가깝습니다.`,
      advice: meaning.advice,
      cardCode: card.code,
      cardId: card.id,
    };

    return {
      card,
      orientation: drawn.orientation,
      position,
      interpretedCard,
    };
  });

  const combinations = analyzeTarotCombinations(entries, questionType, spread);
  const interpretedCards = entries.map((entry) => entry.interpretedCard);
  const cardSections = interpretedCards.map(buildCardSection);

  const title = spread.title || "타로 리딩";
  const summary = `${title} 결과입니다. 이번 리딩은 ${interpretedCards.map((card) => card.cardNameKo).join(", ")} 흐름으로 구성되며, 단정 대신 흐름을 읽을수록 해석 정확도가 높아집니다.`;
  const combinationReading = summarizeCombinations(combinations);
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
  const positions = result.cards.map((card) => ({
    positionTitle: card.positionLabel,
    cardName: card.cardNameKo,
    orientationLabel: card.orientation === "reversed" ? "역방향" : "정방향",
    headline: card.questionSpecificMeaning,
    directAnswer: `${card.positionLabel} 기준으로 보면 ${card.questionSpecificMeaning}`,
    detailedReading: card.orientation === "reversed"
      ? `${card.positionMeaning} 지금은 감정 확인보다 대화 구조를 정돈해야 방어심리를 줄일 수 있습니다.`
      : `${card.positionMeaning} 조급하지 않은 연결을 유지하면 재회 흐름이 천천히 살아날 수 있습니다.`,
    reunionPoint: `${card.emotionalMessage} 핵심은 오해를 줄이는 말의 순서와 속도, 그리고 책임 있는 태도입니다.`,
    advice: `${card.advice} 짧은 안부로 반응을 확인한 뒤 다음 단계를 정하세요. 압박형 질문은 피하는 편이 안전합니다.`,
  }));

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
  return {
    title: result.title,
    opening: `${result.summary} 자존감은 기분이 아니라 반복되는 자기 대화의 문장으로 만들어집니다.`,
    pastDebuff: byIndex(0),
    innerMonster: byIndex(1),
    currentDamage: byIndex(2),
    mindShield: byIndex(3),
    levelupMastery: byIndex(4),
    levelupGuidance: result.combinationReading,
    positionInsights: result.cardSections.map((section, idx) => ({
      position: `slot_${idx + 1}`,
      title: section.positionLabel,
      subtitle: section.orientationLabel,
      cardLabel: section.cardName,
      message: `${section.meaning} ${section.relationshipMessage}`,
      keywords: section.keywords,
    })),
    actionPlan: result.cards.map((card) => card.advice).filter(Boolean),
    cardSections: result.cardSections,
    combinations: result.combinations,
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
  inferQuestionType,
  normalizeDrawnCardsForSpread,
  drawTarotCardsForSpread,
  interpretTarotReading,
  buildLegacyReadingPayload,
  buildConsultingHighlights,
};
