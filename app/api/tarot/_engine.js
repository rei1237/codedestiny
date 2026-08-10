import { buildImageCandidates, getTarotCardByAnyId, TAROT_CARDS } from "../../../lib/tarot/tarot-cards.mjs";
import { expectedCardCount, normalizeSpreadType } from "../../../lib/tarot/spreads.mjs";
import { buildPremiumYearReading, drawPremiumYearCards } from "../../../lib/tarot/tarot-year-premium.mjs";
import {
  buildConsultingHighlights,
  buildLegacyReadingPayload,
  drawTarotCardsForSpread,
  getMeaningByQuestion,
  inferQuestionType,
  interpretTarotReading,
  normalizeDrawnCardsForSpread,
} from "../../../lib/tarot/tarot-interpretation-engine.mjs";

function asText(value) {
  return String(value || "").trim();
}

function toUiCard(drawn, spreadType, idx, questionType) {
  const card = getTarotCardByAnyId(drawn.cardId);
  if (!card) {
    throw new Error(`CARD_DATA_MISSING:${drawn.cardId}`);
  }
  const images = buildImageCandidates(card.code);
  // worker/routes/tarot.js 의 toUiCard 와 같은 규칙 — 도메인 중립 키워드 대신 주제별 키워드를 낸다.
  const orientation = drawn.orientation === "reversed" ? "reversed" : "upright";
  const topicKeywords = questionType ? getMeaningByQuestion(card, orientation, questionType).keywords : null;

  return {
    cardId: card.code,
    id: card.id,
    name: card.nameEn,
    nameEn: card.nameEn,
    nameKr: card.nameKo,
    nameKo: card.nameKo,
    position: drawn.positionKey || drawn.position || `position_${idx + 1}`,
    orientation,
    imageKey: card.imageKey || card.code.toLowerCase(),
    imageUrl: images[0],
    imageCandidates: images,
    proxyImageUrl: "",
    localImageUrl: images[0],
    keywords: Array.isArray(topicKeywords) && topicKeywords.length
      ? topicKeywords.slice(0, 5)
      : card.keywords.slice(0, 5),
  };
}

let cachedEngine = null;

export async function getTarotEngine() {
  if (cachedEngine) return cachedEngine;
  cachedEngine = {
    normalizeSpreadType,
    drawCards(spreadType, options = {}) {
      if (spreadType === "yearly_twelve_card" && asText(options.seed)) {
        return drawPremiumYearCards({ seed: asText(options.seed), year: options.year });
      }
      return drawTarotCardsForSpread(spreadType);
    },
  };
  return cachedEngine;
}

export function validateSpreadCardCount(spreadType, cards) {
  const normalized = normalizeSpreadType(spreadType || "one_card");
  const expected = expectedCardCount(normalized);
  if (!expected) return { ok: false, message: `Unsupported spreadType: ${normalized}`, expected: 0 };
  if (!Array.isArray(cards) || cards.length !== expected) {
    return {
      ok: false,
      message: `${normalized}은(는) ${expected}장의 카드가 필요합니다.`,
      expected,
    };
  }
  return { ok: true };
}

export function buildReadingResponse(_engine, category, spreadType, drawnCards, options = {}) {
  const normalizedSpreadType = normalizeSpreadType(spreadType || "one_card");
  const normalizedDrawnCards = normalizeDrawnCardsForSpread(normalizedSpreadType, drawnCards || []);
  const questionType = inferQuestionType({ category, spreadId: normalizedSpreadType, serviceKey: "next-api-tarot" });

  const interpreted = interpretTarotReading({
    serviceKey: "next-api-tarot",
    questionType,
    spreadId: normalizedSpreadType,
    drawnCards: normalizedDrawnCards,
  });

  let reading = buildLegacyReadingPayload(interpreted, {
    spreadId: normalizedSpreadType,
    questionType,
    drawnCards: normalizedDrawnCards,
  });

  if (normalizedSpreadType === "yearly_twelve_card") {
    reading = buildPremiumYearReading({ reading, year: options.year });
  }

  const cards = normalizedDrawnCards.map((drawn, idx) => toUiCard(drawn, normalizedSpreadType, idx, questionType));

  const payload = {
    ok: true,
    category: asText(category) || "general",
    spreadType: normalizedSpreadType,
    cards,
    reading,
    consultingHighlights: buildConsultingHighlights(reading),
    engineMeta: {
      source: "lib/tarot/*",
      spreadType: normalizedSpreadType,
      questionType,
      cardCount: cards.length,
      cardDbCount: TAROT_CARDS.length,
      deterministic: true,
      qualityEnhanced: normalizedSpreadType === "reunion_lighthouse_five_card" || normalizedSpreadType === "healing_rising_four_card",
    },
  };

  if (normalizedSpreadType === "relationship_six_card") payload.isRelationshipReading = true;
  if (normalizedSpreadType === "healing_rising_four_card") payload.isHealingReading = true;
  if (normalizedSpreadType === "reunion_lighthouse_five_card") payload.isReunionReading = true;
  if (normalizedSpreadType === "yearly_twelve_card") payload.isYearlyTwelveCardReading = true;
  if (normalizedSpreadType === "yearly_three_card") payload.isYearlyThreeCardReading = true;
  if (normalizedSpreadType === "self_esteem_levelup_five_card") payload.isSelfEsteemReading = true;
  if (normalizedSpreadType === "job_change_seven_card") payload.isJobChangeReading = true;

  return payload;
}

