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
  enhanceTarotReadingPayload,
} = require("../services/tarot-engine.service");

const router = express.Router();

const TAROT_GEMINI_MIN_SECTION_CHARS = 500;
const TAROT_GEMINI_LOVE_MIN_TOTAL_CHARS = 3200;
const TAROT_GEMINI_LOVE_MIN_SECTION_CHARS = 700;
const TAROT_GEMINI_LOVE_MIN_POSITION_CHARS = 220;

function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

let geminiKeyCursor = 0;

function pickGeminiKeys() {
  return [
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
  ]
    .map((v) => safeText(v))
    .filter(Boolean);
}

function rotateGeminiKeys(keys, seed = 0) {
  if (!Array.isArray(keys) || keys.length === 0) return [];
  const len = keys.length;
  const base = Number.isFinite(Number(seed)) ? Number(seed) : 0;
  const start = ((geminiKeyCursor + base) % len + len) % len;
  geminiKeyCursor = (start + 1) % len;
  return [...keys.slice(start), ...keys.slice(0, start)];
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

function applyEngineQuality(spreadType, reading, cardReadings) {
  try {
    const enhanced = enhanceTarotReadingPayload({
      spreadType,
      reading,
      cardReadings,
    });
    return enhanced || reading;
  } catch (error) {
    console.error("[tarot][quality] enhancer fallback:", error?.message || error);
    return reading;
  }
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

function totalLoveChars(reading) {
  const main = [reading?.overallVibe, reading?.deepReading, reading?.realityAndFuture].map(safeText).join("\n").length;
  const positions = (Array.isArray(reading?.positionBreakdown) ? reading.positionBreakdown : []).map((item) => safeText(item?.summary)).join("\n").length;
  const advice = (Array.isArray(reading?.advice) ? reading.advice : []).map((item) => safeText(item)).join("\n").length;
  return main + positions + advice;
}

function buildLoveExpansion(cards) {
  const lines = (Array.isArray(cards) ? cards : []).map((card, idx) => {
    const name = safeText(card?.nameKr) || safeText(card?.name) || `카드 ${idx + 1}`;
    const pos = safeText(card?.position) || `position_${idx + 1}`;
    const orientation = card?.orientation === "reversed" ? "역방향" : "정방향";
    return `- ${pos}: ${name}(${orientation})의 신호는 감정 단정 대신 사실 확인, 경계 존중, 작은 약속의 반복이 관계 회복의 핵심임을 강조합니다.`;
  }).join("\n");

  return [
    "[전문가 보강 코멘트]",
    "지금 관계는 누가 더 사랑하느냐보다, 서로가 안전하게 표현할 수 있는 대화 구조를 만들 수 있느냐가 핵심입니다.",
    "감정의 강도만 보지 말고 전달 방식을 조정하면 갈등 소모를 줄이고 신뢰를 빠르게 회복할 수 있습니다.",
    "관계는 정답이 아니라 리듬 조정입니다. 연락 빈도, 대화 시간대, 갈등 회복 루틴을 합의하면 예측 가능성이 생깁니다.",
    "카드별 실행 포인트:",
    lines,
    "이번 리딩의 본질은 상대를 통제하는 것이 아니라, 내 표현 방식을 더 명료하고 부드럽게 조정하는 것입니다.",
  ].join("\n");
}

function normalizeLoveReading(candidate, baseReading, cards) {
  const base = baseReading && typeof baseReading === "object" ? baseReading : {};
  const parsed = candidate && typeof candidate === "object" ? candidate : {};

  const overallVibe = ensureMinSectionLength(parsed.overallVibe, TAROT_GEMINI_LOVE_MIN_SECTION_CHARS, base.overallVibe);
  const deepReading = ensureMinSectionLength(parsed.deepReading, TAROT_GEMINI_LOVE_MIN_SECTION_CHARS, base.deepReading);
  let realityAndFuture = ensureMinSectionLength(parsed.realityAndFuture, TAROT_GEMINI_LOVE_MIN_SECTION_CHARS, base.realityAndFuture);

  const basePositions = Array.isArray(base.positionBreakdown) ? base.positionBreakdown : [];
  const rawPositions = Array.isArray(parsed.positionBreakdown) ? parsed.positionBreakdown : [];
  const positionBreakdown = (rawPositions.length ? rawPositions : basePositions)
    .slice(0, 6)
    .map((item, idx) => {
      const fallback = basePositions[idx] || {};
      return {
        title: safeText(item?.title) || safeText(fallback.title) || `포지션 ${idx + 1}`,
        card: safeText(item?.card) || safeText(fallback.card) || `카드 ${idx + 1}`,
        summary: ensureMinSectionLength(item?.summary, TAROT_GEMINI_LOVE_MIN_POSITION_CHARS, fallback.summary),
      };
    });

  while (positionBreakdown.length < 6) {
    const idx = positionBreakdown.length;
    const card = Array.isArray(cards) ? cards[idx] : null;
    const cardName = safeText(card?.nameKr) || safeText(card?.name) || `카드 ${idx + 1}`;
    positionBreakdown.push({
      title: `포지션 ${idx + 1}`,
      card: cardName,
      summary: `${cardName}의 흐름은 감정의 결론을 서두르지 말고 사실 확인과 관계 경계 합의를 통해 신뢰를 회복하라는 메시지입니다.`,
    });
  }

  let advice = Array.isArray(parsed.advice) ? parsed.advice.map(safeText).filter(Boolean) : [];
  if (!advice.length && Array.isArray(base.advice)) {
    advice = base.advice.map(safeText).filter(Boolean);
  }
  const seed = [
    "감정이 올라온 직후 결론을 내리지 말고 10분 텀 후 사실과 해석을 분리해 대화하세요.",
    "질문은 추궁형 대신 확인형으로 바꿔 방어 반응을 줄이세요.",
    "이번 주 15분 진심 대화 1회를 미리 예약하세요.",
    "갈등이 생기면 사람 비난 대신 구조 조정 관점으로 접근하세요.",
    "연락 빈도보다 반복되는 일관성 신호를 체크하세요.",
    "속도 차이를 인정하고 중간 리듬을 합의하세요.",
    "불안한 날엔 관계 결론보다 자기 루틴을 먼저 회복하세요.",
    "관계 기준 3가지를 글로 정리해 의사결정 기준으로 사용하세요.",
  ];
  for (const item of seed) {
    if (advice.length >= 8) break;
    advice.push(item);
  }

  const out = {
    overallVibe,
    deepReading,
    realityAndFuture,
    positionBreakdown,
    advice: advice.slice(0, 12),
  };

  const expansion = buildLoveExpansion(cards);
  while (totalLoveChars(out) < TAROT_GEMINI_LOVE_MIN_TOTAL_CHARS) {
    realityAndFuture += `\n\n${expansion}`;
    out.realityAndFuture = realityAndFuture;
  }

  return out;
}

async function createGeminiJobChangeReading({ cards, baseReading }) {
  const keys = pickGeminiKeys();
  if (!keys.length) return null;

  const model = safeText(process.env.TAROT_GEMINI_MODEL) || "gemini-2.0-flash-lite";
  const prompt = buildJobChangeGeminiPrompt({ cards, baseReading });
  const rotatedKeys = rotateGeminiKeys(keys, prompt.length + (Array.isArray(cards) ? cards.length : 0));

  let payload = null;
  let raw = "";
  let lastErrorMessage = "";

  for (const key of rotatedKeys) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 },
      }),
    });

    payload = await resp.json().catch(() => null);
    if (!resp.ok) {
      lastErrorMessage = payload?.error?.message || `Gemini job-change failed (${resp.status})`;
      continue;
    }

    const textOut = payload?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join("") || "";
    raw = safeText(textOut);
    if (raw) break;
  }

  if (!raw) {
    if (lastErrorMessage) throw new Error(lastErrorMessage);
    return null;
  }

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

      const readingForUi = normalizeLoveReading(reading.reading, reading.reading, reading.cardReadings);

      return res.status(200).json({
        ok: true,
        category: reading.category,
        spreadType: reading.spreadType,
        cards: cardsForUi,
        reading: applyEngineQuality(reading.spreadType, readingForUi, reading.cardReadings),
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
        reading: applyEngineQuality(reading.spreadType, reading.reading, reading.cardReadings),
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
        reading: applyEngineQuality(reading.spreadType, reading.reading, reading.cardReadings),
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
        reading: applyEngineQuality(reading.spreadType, reading.reading, reading.cardReadings),
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
        reading: applyEngineQuality(reading.spreadType, reading.reading, reading.cardReadings),
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
        reading: applyEngineQuality(reading.spreadType, reading.reading, reading.cardReadings),
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
        reading: applyEngineQuality(reading.spreadType, readingForUi, reading.cardReadings),
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
      reading: applyEngineQuality(reading.spreadType, textForUi, reading.cardReadings),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/love-reading", async (req, res, next) => {
  try {
    const drawnCards = Array.isArray(req.body?.cards) ? req.body.cards : [];
    if (drawnCards.length !== 6) {
      return res.status(400).json({
        ok: false,
        message: "love-reading은 6장의 카드가 필요합니다.",
      });
    }

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

    const readingForUi = normalizeLoveReading(reading.reading, reading.reading, reading.cardReadings);

    return res.status(200).json({
      ok: true,
      category: reading.category,
      spreadType: reading.spreadType,
      cards: cardsForUi,
      reading: applyEngineQuality(reading.spreadType, readingForUi, reading.cardReadings),
      isRelationshipReading: true,
      api: "love-reading",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
