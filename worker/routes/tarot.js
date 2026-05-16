import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { buildImageCandidates, getTarotCardByAnyId, TAROT_CARDS } from "../../lib/tarot/tarot-cards.mjs";
import { buildMindscanReadingPayload } from "../../lib/tarot/mindscan-reading.mjs";
import { expectedCardCount, listSpreadIds, normalizeSpreadType, getSpreadDefinition } from "../../lib/tarot/spreads.mjs";
import {
  TarotInterpretationError,
  buildConsultingHighlights,
  buildLegacyReadingPayload,
  drawTarotCardsForSpread,
  inferQuestionType,
  interpretTarotReading,
  normalizeDrawnCardsForSpread,
} from "../../lib/tarot/tarot-interpretation-engine.mjs";

function asText(value) {
  return String(value || "").trim();
}

function ensureCardCountOrThrow(spreadType, cards) {
  const expected = expectedCardCount(spreadType);
  if (!expected) {
    throw createHttpError(400, `Unsupported spreadType: ${spreadType}`);
  }
  if (!Array.isArray(cards) || cards.length !== expected) {
    throw createHttpError(400, `${spreadType}은(는) ${expected}장의 카드가 필요합니다.`, {
      expectedCardCount: expected,
      receivedCardCount: Array.isArray(cards) ? cards.length : 0,
    });
  }
}

function toUiCard(drawn, spreadType, idx) {
  const spread = getSpreadDefinition(spreadType);
  const position = spread?.positions?.[idx];
  const card = getTarotCardByAnyId(drawn.cardId);
  if (!card) {
    throw new TarotInterpretationError(
      "CARD_DATA_MISSING",
      `Card data missing for ${drawn.cardId}`,
      "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
      { drawn },
    );
  }

  const images = buildImageCandidates(card.code);
  return {
    cardId: card.code,
    id: card.id,
    name: card.nameEn,
    nameEn: card.nameEn,
    nameKr: card.nameKo,
    nameKo: card.nameKo,
    position: drawn.positionKey || drawn.position || position?.key || `position_${idx + 1}`,
    orientation: drawn.orientation === "reversed" ? "reversed" : "upright",
    imageKey: card.imageKey || card.code.toLowerCase(),
    imageUrl: images[0],
    imageCandidates: images,
    proxyImageUrl: "",
    localImageUrl: images[0],
    keywords: card.keywords.slice(0, 5),
  };
}

function buildCrystalSoulReading(body = {}) {
  const topicName = asText(body?.topic?.name) || "원석 소울 타로";
  const topicHint = asText(body?.topic?.hint);
  const gemName = asText(body?.gem?.name) || "선택한 원석";
  const gemTheme = asText(body?.gem?.theme);
  const cards = Array.isArray(body?.cards) ? body.cards : [];
  const positions = Array.isArray(body?.positions) ? body.positions : [];

  const lines = [];
  lines.push(`🔮 ${topicName} 리딩`);
  lines.push("");
  lines.push(`${gemName}의 결이 현재 흐름을 비추고 있습니다.${gemTheme ? ` 핵심 테마는 ${gemTheme}입니다.` : ""}`);
  if (topicHint) lines.push(topicHint);
  lines.push("");

  cards.slice(0, 6).forEach((card, idx) => {
    const position = asText(positions[idx]) || `포지션 ${idx + 1}`;
    const cardName = asText(card) || `카드 ${idx + 1}`;
    lines.push(`• ${position}: ${cardName}`);
    lines.push("  지금은 결론을 재촉하기보다, 사실 확인과 작은 실행을 반복해 에너지를 안정시키는 것이 좋습니다.");
  });

  lines.push("");
  lines.push("✨ 마스터 조언");
  lines.push("오늘 안에 실행 가능한 행동 1가지를 정하고 시간을 확정해 보세요. 작은 실행이 흐름을 바꿉니다.");
  return lines.join("\n");
}

function buildReadingPayload({ spreadType, category, cards, serviceKey, userQuestion, userContext }) {
  ensureCardCountOrThrow(spreadType, cards);

  const normalizedDrawnCards = normalizeDrawnCardsForSpread(spreadType, cards);
  const uiCards = normalizedDrawnCards.map((drawn, idx) => toUiCard(drawn, spreadType, idx));
  const questionType = inferQuestionType({ category, spreadId: spreadType, serviceKey });

  const interpreted = interpretTarotReading({
    serviceKey: serviceKey || `tarot:${spreadType}`,
    questionType,
    spreadId: spreadType,
    drawnCards: normalizedDrawnCards,
    userQuestion,
    userContext,
  });

  const reading = buildLegacyReadingPayload(interpreted, {
    spreadId: spreadType,
    questionType,
    drawnCards: normalizedDrawnCards,
  });

  return {
    ok: true,
    category: asText(category) || "general",
    spreadType,
    cards: uiCards,
    reading,
    consultingHighlights: buildConsultingHighlights(reading),
    engineMeta: {
      source: "lib/tarot/*",
      spreadType,
      questionType,
      cardCount: uiCards.length,
      cardDbCount: TAROT_CARDS.length,
      deterministic: true,
    },
  };
}

function mapInterpretationErrorToHttp(error) {
  if (error instanceof TarotInterpretationError) {
    if (error.code === "INVALID_CARD_COUNT") {
      return json({ ok: false, message: error.userMessage, errorCode: error.code, meta: error.meta }, { status: 400 });
    }

    if (error.code === "CARD_DATA_MISSING") {
      console.error("[tarot] CARD_DATA_MISSING", error.meta || {});
      return json({ ok: false, message: error.userMessage, errorCode: error.code }, { status: 422 });
    }

    return json({ ok: false, message: error.userMessage, errorCode: error.code }, { status: 400 });
  }

  return null;
}

export async function handleTarotRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/tarot");

    if (method === "GET" && path === "/meta") {
      return json({
        ok: true,
        engine: {
          spreads: listSpreadIds(),
          cardCount: TAROT_CARDS.length,
        },
      });
    }

    if (method !== "POST") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    await requireAuth(request, env);
    const body = await readJson(request);

    if (path === "/draw") {
      const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
      const drawnCards = drawTarotCardsForSpread(spreadType);
      return json({ ok: true, spreadType, cards: drawnCards });
    }

    if (path === "/reading") {
      const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
      const category = asText(body?.category) || "general";
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      const payload = buildReadingPayload({
        spreadType,
        category,
        cards,
        serviceKey: asText(body?.serviceKey) || "tarot-reading",
        userQuestion: asText(body?.userQuestion),
        userContext: body?.userContext,
      });
      return json(payload);
    }

    if (path === "/love-reading") {
      const spreadType = "relationship_six_card";
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      const payload = buildReadingPayload({
        spreadType,
        category: "love",
        cards,
        serviceKey: "tarot-love-relationship",
        userQuestion: asText(body?.userQuestion),
        userContext: body?.userContext,
      });
      payload.isRelationshipReading = true;
      payload.api = "love-reading";
      return json(payload);
    }

    if (path === "/crystal-soul") {
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      if (!cards.length) {
        return json({ ok: false, message: "카드 데이터가 필요합니다." }, { status: 400 });
      }
      return json({
        ok: true,
        source: "worker/routes/tarot.js",
        reading: buildCrystalSoulReading(body),
      });
    }

    if (path === "/mindscan") {
      const pairs = Array.isArray(body?.pairs) ? body.pairs : [];
      if (!pairs.length) {
        return json({ ok: false, message: "카드 페어 데이터가 필요합니다." }, { status: 400 });
      }

      const reading = buildMindscanReadingPayload(pairs);
      if (!reading?.ok) {
        return json(
          {
            ok: false,
            message: reading?.message || "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
          },
          { status: 422 },
        );
      }
      return json(reading);
    }

    return notFound();
  } catch (error) {
    const mapped = mapInterpretationErrorToHttp(error);
    if (mapped) return mapped;
    return handleRouteError(error);
  }
}
