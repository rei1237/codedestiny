import { NextResponse } from "next/server";
import { buildReadingResponse, getTarotEngine, validateSpreadCardCount } from "../_engine";
import { buildLoveConsultingHighlights, normalizeLoveReadingPayload } from "../../../../lib/tarot/love-reading-normalizer.mjs";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const cards = Array.isArray(body?.cards) ? body.cards : [];
    const engine = await getTarotEngine();
    const spreadType = "relationship_six_card";

    const countCheck = validateSpreadCardCount(spreadType, cards);
    if (!countCheck.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "love-reading은 6장의 카드가 필요합니다.",
          expectedCardCount: countCheck.expected,
          receivedCardCount: cards.length,
        },
        { status: 400 }
      );
    }

    const payload = buildReadingResponse(engine, "love", spreadType, cards);
    payload.reading = normalizeLoveReadingPayload(payload?.reading, payload?.cards || []);
    payload.consultingHighlights = buildLoveConsultingHighlights(payload.reading);
    payload.api = "love-reading";
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "love-reading failed";
    console.error("[api/tarot/love-reading]", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
