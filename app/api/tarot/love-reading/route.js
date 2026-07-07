import { NextResponse } from "next/server";
import { buildReadingResponse, getTarotEngine, validateSpreadCardCount } from "../_engine";
import { buildLoveConsultingHighlights, normalizeLoveReadingPayload } from "../../../../lib/tarot/love-reading-normalizer.mjs";
import { enhanceLoveReadingWithLlm } from "../../../../lib/tarot/love-reading-llm.mjs";

export const runtime = "nodejs";

const LOVE_READING_ROUTE_TEXT_TRANSLATIONS = {
  ko: {
    invalidCount: "love-reading은 6장의 카드가 필요합니다.",
    failed: "love-reading failed",
  },
  en: {
    invalidCount: "The love reading needs 6 cards.",
    failed: "Love reading failed.",
  },
  ja: {
    invalidCount: "恋愛リーディングには6枚のカードが必要です。",
    failed: "恋愛リーディングに失敗しました。",
  },
};

function normalizeLoveReadingRouteLocale(value) {
  const lang = String(value || "").trim().replace("_", "-").toLowerCase();
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("en")) return "en";
  return "ko";
}

function loveReadingRouteText(locale, key) {
  const lang = normalizeLoveReadingRouteLocale(locale);
  return LOVE_READING_ROUTE_TEXT_TRANSLATIONS[lang]?.[key] || LOVE_READING_ROUTE_TEXT_TRANSLATIONS.ko[key] || key;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const locale = normalizeLoveReadingRouteLocale(body?.locale || req.headers.get("x-code-destiny-locale") || req.headers.get("accept-language"));
    const cards = Array.isArray(body?.cards) ? body.cards : [];
    const engine = await getTarotEngine();
    const spreadType = "relationship_six_card";

    const countCheck = validateSpreadCardCount(spreadType, cards);
    if (!countCheck.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: loveReadingRouteText(locale, "invalidCount"),
          expectedCardCount: countCheck.expected,
          receivedCardCount: cards.length,
        },
        { status: 400 }
      );
    }

    const payload = buildReadingResponse(engine, "love", spreadType, cards);
    payload.reading = normalizeLoveReadingPayload(payload?.reading, payload?.cards || [], locale);
    // LLM 상담문 생성 — 실패 시 로컬 리딩이 그대로 폴백으로 나간다(degrade-not-throw).
    const enhanced = await enhanceLoveReadingWithLlm(payload.reading, { locale, env: process.env });
    payload.reading = enhanced.reading;
    payload.readingSource = enhanced.source;
    payload.consultingHighlights = buildLoveConsultingHighlights(payload.reading);
    payload.api = "love-reading";
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : loveReadingRouteText("ko", "failed");
    console.error("[api/tarot/love-reading]", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
