const express = require("express");
const {
  drawCards,
  createReading,
  createRelationshipReading,
  createHealingRisingReading,
  createReunionLighthouseReading,
  createSelfEsteemLevelupReading,
  createYearlyFromThreeCardReading,
  createYearlyTwelveCardReading,
  createJobChangeTarotReading,
  getCardImageSourcesById,
  getEngineMeta,
  normalizeSpreadType,
} = require("../services/tarot-engine.service");

const router = express.Router();

router.get("/meta", (req, res) => {
  return res.status(200).json({
    ok: true,
    engine: getEngineMeta(),
  });
});

router.get("/card-image/:cardId", async (req, res, next) => {
  try {
    const cardId = String(req.params?.cardId || "").trim();
    if (!cardId) {
      return res.status(400).json({ ok: false, message: "cardId가 필요합니다." });
    }

    const src = getCardImageSourcesById(cardId);
    const candidates = Array.isArray(src.imageCandidates) ? src.imageCandidates : [];
    if (!candidates.length) {
      return res.status(404).json({ ok: false, message: "카드 이미지를 찾을 수 없습니다." });
    }

    for (const url of candidates) {
      try {
        const upstream = await fetch(url, { redirect: "follow" });
        if (!upstream.ok) continue;
        const contentType = upstream.headers.get("content-type") || "image/jpeg";
        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.setHeader("Content-Type", contentType.includes("image/") ? contentType : "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.status(200).send(buffer);
      } catch (e) {
        // try next candidate
      }
    }

    return res.status(404).json({ ok: false, message: "원격 카드 이미지를 불러오지 못했습니다." });
  } catch (error) {
    return next(error);
  }
});

router.post("/draw", (req, res, next) => {
  try {
    const spreadType = normalizeSpreadType(req.body?.spreadType || "one_card");
    const cards = drawCards(spreadType);

    return res.status(200).json({
      ok: true,
      spreadType,
      cards,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/reading", (req, res, next) => {
  try {
    const category = req.body?.category || "general";
    const spreadType = normalizeSpreadType(req.body?.spreadType || "one_card");
    const drawnCards = Array.isArray(req.body?.cards) ? req.body.cards : [];

    if (spreadType === "relationship_six_card" && drawnCards.length === 6) {
      const reading = createRelationshipReading({ drawnCards });

      const cardsForUi = reading.cardReadings.map((item) => ({
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
      }));

      return res.status(200).json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: cardsForUi,
        reading: reading.reading,
        isRelationshipReading: true,
      });
    }

    if (spreadType === "healing_rising_four_card" && drawnCards.length === 4) {
      const reading = createHealingRisingReading({ drawnCards });

      const cardsForUi = reading.cardReadings.map((item) => ({
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
      }));

      return res.status(200).json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: cardsForUi,
        reading: reading.reading,
        isHealingReading: true,
      });
    }

    if (spreadType === "yearly_twelve_card" && drawnCards.length === 12) {
      const reading = createYearlyTwelveCardReading({ drawnCards });

      const cardsForUi = reading.cardReadings.map((item) => ({
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
      }));

      return res.status(200).json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: cardsForUi,
        reading: reading.reading,
        isYearlyTwelveCardReading: true,
      });
    }

    if (spreadType === "yearly_three_card" && drawnCards.length === 3) {
      const reading = createYearlyFromThreeCardReading({ drawnCards });

      const cardsForUi = reading.cardReadings.map((item) => ({
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
      }));

      return res.status(200).json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: cardsForUi,
        reading: reading.reading,
        isYearlyThreeCardReading: true,
      });
    }

    if (spreadType === "reunion_lighthouse_five_card" && drawnCards.length === 5) {
      const reading = createReunionLighthouseReading({ drawnCards });

      const cardsForUi = reading.cardReadings.map((item) => ({
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
      }));

      return res.status(200).json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: cardsForUi,
        reading: reading.reading,
        isReunionReading: true,
      });
    }

    if (spreadType === "self_esteem_levelup_five_card" && drawnCards.length === 5) {
      const reading = createSelfEsteemLevelupReading({ drawnCards });

      const cardsForUi = reading.cardReadings.map((item) => ({
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
      }));

      return res.status(200).json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: cardsForUi,
        reading: reading.reading,
        isSelfEsteemReading: true,
      });
    }

    if (spreadType === "job_change_seven_card" && drawnCards.length === 7) {
      const reading = createJobChangeTarotReading({ drawnCards });

      const cardsForUi = reading.cardReadings.map((item) => ({
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
      }));

      return res.status(200).json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: cardsForUi,
        reading: reading.reading,
        isJobChangeReading: true,
      });
    }

    const reading = createReading({
      category,
      spreadType,
      drawnCards,
    });

    const cardsForUi = reading.cardReadings.map((item) => ({
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
    }));

    const textForUi = {
      story: reading.story,
      advice: reading.advice,
      cardNarratives: reading.cardReadings.map((item) => ({
        cardId: item.cardId,
        position: item.position,
        interpretation: item.interpretation,
      })),
    };

    return res.status(200).json({
      ok: true,
      category: reading.category,
      spreadType: reading.spreadType,
      cards: cardsForUi,
      reading: textForUi,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
