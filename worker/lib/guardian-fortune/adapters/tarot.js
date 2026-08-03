import { TAROT_CARDS } from "../../../../lib/tarot/tarot-cards.mjs";
import { getSpreadDefinition } from "../../../../lib/tarot/spreads.mjs";
import { interpretTarotReading } from "../../../../lib/tarot/tarot-interpretation-engine.mjs";
import { nonEmptyText, text } from "../../guardian-fortune-adapter-utils.js";

const ONE_CARD_TOPICS = new Set(["daily", "mind"]);

function seedNumber(seed) {
  let result = 2166136261;
  for (const char of String(seed || "guardian-fortune")) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function spreadForTopic(topic) {
  return ONE_CARD_TOPICS.has(topic) ? "one_card" : "three_card_cause_process_outcome";
}

function meaningFromCard(card, orientation) {
  const meaning = orientation === "reversed" ? card?.reversed : card?.upright;
  return nonEmptyText(meaning?.coreMeaning || meaning?.psychologicalMeaning || meaning?.advice?.[0], 240)
    || `${card?.nameKo || card?.nameEn || "카드"}의 상징을 오늘의 흐름과 함께 살펴봅니다.`;
}

function interpretedMeaning(reading, index, card, orientation) {
  const position = reading?.positions?.[index]
    || reading?.positionReadings?.[index]
    || reading?.cardSections?.[index]
    || reading?.interpretedCards?.[index]
    || {};
  return nonEmptyText(
    position.coreMeaning
      || position.cardMeaning
      || position.interpretation
      || position.questionSpecificMeaning
      || position.detailedReading
      || position.advice,
    280,
  ) || meaningFromCard(card, orientation);
}

export function buildTarotAdapter(input, options = {}) {
  const cards = Array.isArray(options.cards) && options.cards.length ? options.cards : TAROT_CARDS;
  if (!cards.length) {
    const error = new Error("TAROT_CARD_REGISTRY_EMPTY");
    error.code = "CARD_REGISTRY_EMPTY";
    throw error;
  }

  const fusionPositions = options.fusionTarot === true
    ? ["core", "saju_bridge", "ziwei_bridge", "vedic_bridge", "relationship_bridge", "action_bridge"].map((key) => ({ key }))
    : null;
  const spreadId = fusionPositions ? "fusion_six_system_bridge" : spreadForTopic(input.topic);
  const spread = fusionPositions
    ? { positions: fusionPositions, questionType: "fusion_fortune" }
    : getSpreadDefinition(spreadId);
  if (!spread || !Array.isArray(spread.positions) || !spread.positions.length) {
    const error = new Error("TAROT_SPREAD_UNAVAILABLE");
    error.code = "SPREAD_UNAVAILABLE";
    throw error;
  }

  const seed = seedNumber(options.tarotSeed || `${input.topic}:${input.targetDate}`);
  const used = new Set();
  const drawnCards = spread.positions.map((position, index) => {
    let cardIndex = (seed + (index * 7919)) % cards.length;
    while (used.has(cardIndex) && used.size < cards.length) cardIndex = (cardIndex + 1) % cards.length;
    used.add(cardIndex);
    const card = cards[cardIndex];
    const orientation = ((seed >>> (index % 16)) & 1) === 1 ? "upright" : "reversed";
    return {
      card,
      cardId: card.id || card.code,
      orientation,
      positionKey: position.key,
    };
  });

  const drawnForEngine = drawnCards.map((item) => ({
    cardId: item.cardId,
    orientation: item.orientation,
    positionKey: item.positionKey,
  }));
  let reading = null;
  const interpret = options.interpret || interpretTarotReading;
  try {
    reading = interpret({
      spreadId,
      drawnCards: drawnForEngine,
      questionType: spread.questionType,
      locale: input.locale,
      userQuestion: "오늘의 흐름을 차분히 살펴봅니다.",
    });
  } catch {
    reading = null;
  }

  const outputCards = drawnCards.map(({ card, orientation, positionKey }, index) => ({
    name: nonEmptyText(card?.nameKo || card?.nameEn, 100) || "타로 카드",
    orientation,
    positionKey,
    meaningSummary: interpretedMeaning(reading, index, card, orientation),
  }));
  const symbolicMessage = nonEmptyText(
    reading?.summary
      || reading?.topSummary?.summaryPattern
      || reading?.oneLineMessage
      || reading?.finalAdviceText
      || reading?.combinationReading,
    300,
  ) || `오늘은 ${outputCards.map((card) => card.name).join(", ")} 카드가 보여주는 상징을 행동의 기준으로 삼아보세요.`;

  return {
    spreadType: fusionPositions ? "fusion_six_system_bridge" : outputCards.length === 1 ? "one_card" : "three_card",
    spreadId,
    questionType: spread.questionType,
    cards: outputCards,
    symbolicMessage: text(symbolicMessage, 320),
    evidence: ["tarot.cards", `tarot.${input.topic}.spread`],
  };
}
