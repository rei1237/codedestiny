import { NextResponse } from "next/server";

import sampleData from "../../../../server/data/tarot-cards.sample.json";
import dbData from "../../../../server/data/tarot-cards.db.json";

const {
  createReading,
  createRelationshipReading,
  createHealingRisingReading,
  createReunionLighthouseReading,
  createSelfEsteemLevelupReading,
  createYearlyFromThreeCardReading,
  createYearlyTwelveCardReading,
  normalizeSpreadType,
  initFromPreloadedData,
} = require("../../../../server/services/tarot-engine.service");

function mapCardForUi(item) {
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

export async function POST(request) {
  try {
    initFromPreloadedData(dbData, sampleData);
    const body = await request.json();
    const category = body?.category || "general";
    const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
    const drawnCards = Array.isArray(body?.cards) ? body.cards : [];

    if (spreadType === "relationship_six_card" && drawnCards.length === 6) {
      const reading = createRelationshipReading({ drawnCards });
      return NextResponse.json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: reading.cardReadings.map(mapCardForUi),
        reading: reading.reading,
        isRelationshipReading: true,
      });
    }

    if (spreadType === "healing_rising_four_card" && drawnCards.length === 4) {
      const reading = createHealingRisingReading({ drawnCards });
      return NextResponse.json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: reading.cardReadings.map(mapCardForUi),
        reading: reading.reading,
        isHealingReading: true,
      });
    }

    if (spreadType === "yearly_twelve_card" && drawnCards.length === 12) {
      const reading = createYearlyTwelveCardReading({ drawnCards });
      return NextResponse.json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: reading.cardReadings.map(mapCardForUi),
        reading: reading.reading,
        isYearlyTwelveCardReading: true,
      });
    }

    if (spreadType === "yearly_three_card" && drawnCards.length === 3) {
      const reading = createYearlyFromThreeCardReading({ drawnCards });
      return NextResponse.json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: reading.cardReadings.map(mapCardForUi),
        reading: reading.reading,
        isYearlyThreeCardReading: true,
      });
    }

    if (spreadType === "reunion_lighthouse_five_card" && drawnCards.length === 5) {
      const reading = createReunionLighthouseReading({ drawnCards });
      return NextResponse.json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: reading.cardReadings.map(mapCardForUi),
        reading: reading.reading,
        isReunionReading: true,
      });
    }

    if (spreadType === "self_esteem_levelup_five_card" && drawnCards.length === 5) {
      const reading = createSelfEsteemLevelupReading({ drawnCards });
      return NextResponse.json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: reading.cardReadings.map(mapCardForUi),
        reading: reading.reading,
        isSelfEsteemReading: true,
      });
    }

    const reading = createReading({ category, spreadType, drawnCards });
    const textForUi = {
      story: reading.story,
      advice: reading.advice,
      cardNarratives: reading.cardReadings.map((item) => ({
        cardId: item.cardId,
        position: item.position,
        interpretation: item.interpretation,
      })),
    };
    return NextResponse.json({
      ok: true,
      category: reading.category,
      spreadType: reading.spreadType,
      cards: reading.cardReadings.map(mapCardForUi),
      reading: textForUi,
    });
  } catch (error) {
    console.error("[tarot/reading]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
