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

const TAROT_GEMINI_MIN_SECTION_CHARS = 500;

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function ensureMinSectionLength(text, minChars, fallbackText) {
  let out = safeText(text);
  const fallback = safeText(fallbackText);
  if (!out) out = fallback;

  while (out.length < minChars && fallback) {
    out += `\n\n${fallback}`;
  }

  return out;
}

function buildJobChangeGeminiPrompt({ cards, baseReading }) {
  const cardLines = (Array.isArray(cards) ? cards : []).map((card, idx) => {
    const name = card?.nameKr || card?.name || `카드 ${idx + 1}`;
    const orientation = card?.orientation === "reversed" ? "역방향" : "정방향";
    const position = card?.position || `position_${idx + 1}`;
    const interp = safeText(card?.interpretation);
    const keywords = Array.isArray(card?.keywords) ? card.keywords.slice(0, 5).join(", ") : "";
    return `${idx + 1}. 위치:${position} / 카드:${name} / 방향:${orientation} / 해석:${interp} / 키워드:${keywords}`;
  }).join("\n");

  return [
    "너는 커리어 전환 전문 타로 코치다.",
    "반드시 한국어로만 작성한다.",
    "다음 4개 섹션을 각각 최소 500자 이상 작성한다: stage1, stage2, stage3, finalAdvice.",
    "타로 카드 데이터(카드명/방향/해석/키워드)를 근거로 구체적이고 실행 가능한 조언을 제시한다.",
    "추상적 문장 반복을 피하고 현실적인 단계별 행동 지침을 포함한다.",
    "출력은 반드시 JSON 객체 하나만 반환한다. 코드블록 금지.",
    "JSON 형식: {\"stage1\":\"...\",\"stage2\":\"...\",\"stage3\":\"...\",\"finalAdvice\":\"...\"}",
    "",
    "[카드 데이터]",
    cardLines,
    "",
    "[기존 엔진 초안 - 의미 유지 참고]",
    `stage1: ${safeText(baseReading?.stage1)}`,
    `stage2: ${safeText(baseReading?.stage2)}`,
    `stage3: ${safeText(baseReading?.stage3)}`,
    `finalAdvice: ${safeText(baseReading?.finalAdvice)}`,
  ].join("\n");
}

async function createGeminiJobChangeReading({ cards, baseReading }) {
  const apiKey = safeText(process.env.GEMINI_API_KEY);
  if (!apiKey) return null;

  const model = safeText(process.env.TAROT_GEMINI_MODEL) || "gemini-2.0-flash-lite";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = buildJobChangeGeminiPrompt({ cards, baseReading });

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 },
    }),
  });

  const payload = await resp.json().catch(() => null);
  if (!resp.ok) {
    const msg = payload?.error?.message || `Gemini job-change failed (${resp.status})`;
    throw new Error(msg);
  }

  const textOut = payload?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join("") || "";
  const raw = safeText(textOut);
  if (!raw) return null;

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (_e) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch (_e2) {}
    }
  }
  if (!parsed || typeof parsed !== "object") return null;

  const stage1 = ensureMinSectionLength(parsed.stage1, TAROT_GEMINI_MIN_SECTION_CHARS, baseReading?.stage1);
  const stage2 = ensureMinSectionLength(parsed.stage2, TAROT_GEMINI_MIN_SECTION_CHARS, baseReading?.stage2);
  const stage3 = ensureMinSectionLength(parsed.stage3, TAROT_GEMINI_MIN_SECTION_CHARS, baseReading?.stage3);
  const finalAdvice = ensureMinSectionLength(parsed.finalAdvice, TAROT_GEMINI_MIN_SECTION_CHARS, baseReading?.finalAdvice);

  return {
    stage1,
    stage2,
    stage3,
    finalAdvice,
    fullText: `${stage1}\n\n${stage2}\n\n${stage3}\n\n${finalAdvice}`,
  };
}

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

router.post("/reading", async (req, res, next) => {
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

      let readingForUi = reading.reading;
      try {
        const geminiReading = await createGeminiJobChangeReading({
          cards: reading.cardReadings,
          baseReading: reading.reading,
        });
        if (geminiReading) {
          readingForUi = geminiReading;
        }
      } catch (geminiError) {
        console.error("[tarot][job_change] Gemini fallback to engine:", geminiError?.message || geminiError);
      }

      return res.status(200).json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: cardsForUi,
        reading: readingForUi,
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
