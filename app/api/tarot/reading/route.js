import { NextResponse } from "next/server";
import { buildReadingResponse, getTarotEngine, validateSpreadCardCount } from "../_engine";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const cards = Array.isArray(body?.cards) ? body.cards : [];
    const engine = await getTarotEngine();
    const spreadType = engine.normalizeSpreadType(body?.spreadType || "one_card");
    const category = body?.category || "general";

    const countCheck = validateSpreadCardCount(spreadType, cards);
    if (!countCheck.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: countCheck.message,
          expectedCardCount: countCheck.expected,
          receivedCardCount: cards.length,
        },
        { status: 400 }
      );
    }

    const payload = buildReadingResponse(engine, category, spreadType, cards);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "reading failed";
    console.error("[api/tarot/reading]", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
