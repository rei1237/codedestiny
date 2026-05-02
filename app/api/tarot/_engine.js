function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toUiCard(item) {
  return {
    cardId: item.cardId,
    name: item.name,
    nameKr: item.nameKr,
    position: item.position,
    orientation: item.orientation,
    imageKey: item.imageKey,
    imageUrl: item.imageUrl,
    imageCandidates: item.imageCandidates,
    proxyImageUrl: item.proxyImageUrl,
    localImageUrl: item.localImageUrl,
    keywords: item.keywords,
  };
}

function normalizeGenericReadingPayload(payload) {
  const cardReadings = asArray(payload.cardReadings);
  return {
    story: payload.story,
    advice: payload.advice,
    cardNarratives: cardReadings.map((item) => ({
      cardId: item.cardId,
      position: item.position,
      interpretation: item.interpretation,
    })),
  };
}

function toText(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
}

function buildConsultingHighlights(reading) {
  const priorityKeys = [
    "overallVibe",
    "deepReading",
    "realityAndFuture",
    "opening",
    "reunionOutcome",
    "lighthouseGuidance",
    "integrationMessage",
    "advice",
    "summary",
  ];

  const highlights = [];
  for (const key of priorityKeys) {
    const text = toText(reading?.[key]);
    if (!text) continue;
    highlights.push(text.replace(/\s+/g, " "));
    if (highlights.length >= 3) break;
  }
  return highlights;
}

let cachedEngine = null;

export async function getTarotEngine() {
  if (cachedEngine) return cachedEngine;
  const mod = await import("../../../server/services/tarot-engine.service.js");
  cachedEngine = mod?.default || mod;
  return cachedEngine;
}

export function validateSpreadCardCount(spreadType, cards) {
  const expectedCountBySpread = {
    relationship_six_card: 6,
    healing_rising_four_card: 4,
    reunion_lighthouse_five_card: 5,
    yearly_twelve_card: 12,
    yearly_three_card: 3,
    self_esteem_levelup_five_card: 5,
    job_change_seven_card: 7,
    one_card: 1,
    three_card_past_present_future: 3,
    three_card_cause_process_outcome: 3,
  };

  const expected = expectedCountBySpread[spreadType];
  if (!expected) {
    return { ok: true };
  }

  if (!Array.isArray(cards) || cards.length !== expected) {
    return {
      ok: false,
      message: `${spreadType}은(는) ${expected}장의 카드가 필요합니다.`,
      expected,
    };
  }

  return { ok: true };
}

export function applyEngineQuality(engine, spreadType, reading, cardReadings) {
  try {
    const enhanced = engine.enhanceTarotReadingPayload({
      spreadType,
      reading,
      cardReadings,
    });
    return enhanced || reading;
  } catch (error) {
    console.error("[api/tarot] quality enhancer fallback:", error?.message || error);
    return reading;
  }
}

export function buildReadingResponse(engine, category, spreadType, drawnCards) {
  let result = null;
  const normalizedCategory = category || "general";

  if (spreadType === "relationship_six_card") {
    result = engine.createRelationshipReading({ drawnCards });
  } else if (spreadType === "healing_rising_four_card") {
    result = engine.createHealingRisingReading({ drawnCards });
  } else if (spreadType === "reunion_lighthouse_five_card") {
    result = engine.createReunionLighthouseReading({ drawnCards });
  } else if (spreadType === "yearly_twelve_card") {
    result = engine.createYearlyTwelveCardReading({ drawnCards });
  } else if (spreadType === "yearly_three_card") {
    result = engine.createYearlyFromThreeCardReading({ drawnCards });
  } else if (spreadType === "self_esteem_levelup_five_card") {
    result = engine.createSelfEsteemLevelupReading({ drawnCards });
  } else if (spreadType === "job_change_seven_card") {
    result = engine.createJobChangeTarotReading({ drawnCards });
  } else {
    result = engine.createReading({
      category: normalizedCategory,
      spreadType,
      drawnCards,
    });
  }

  const cardReadings = asArray(result?.cardReadings);
  const cards = cardReadings.map(toUiCard);
  const rawReading = result?.reading && typeof result.reading === "object"
    ? result.reading
    : normalizeGenericReadingPayload(asObject(result));
  const reading = applyEngineQuality(engine, spreadType, rawReading, cardReadings);
  const consultingHighlights = buildConsultingHighlights(reading);

  const payload = {
    ok: true,
    category: result?.category || normalizedCategory,
    spreadType: result?.spreadType || spreadType,
    cards,
    reading,
    consultingHighlights,
    engineMeta: {
      source: "server/services/tarot-engine.service.js",
      qualityEnhanced: reading !== rawReading,
      cardCount: cards.length,
      spreadType: result?.spreadType || spreadType,
    },
  };

  if (spreadType === "relationship_six_card") payload.isRelationshipReading = true;
  if (spreadType === "healing_rising_four_card") payload.isHealingReading = true;
  if (spreadType === "reunion_lighthouse_five_card") payload.isReunionReading = true;
  if (spreadType === "yearly_twelve_card") payload.isYearlyTwelveCardReading = true;
  if (spreadType === "yearly_three_card") payload.isYearlyThreeCardReading = true;
  if (spreadType === "self_esteem_levelup_five_card") payload.isSelfEsteemReading = true;
  if (spreadType === "job_change_seven_card") payload.isJobChangeReading = true;

  return payload;
}
