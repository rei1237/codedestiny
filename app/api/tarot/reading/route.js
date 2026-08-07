import { NextResponse } from "next/server";
import { buildReadingResponse, getTarotEngine, validateSpreadCardCount } from "../_engine";

export const runtime = "nodejs";

const TAROT_READING_ROUTE_TEXT_TRANSLATIONS = {
  ko: {
    failed: "타로 리딩 생성에 실패했습니다.",
  },
  en: {
    failed: "Reading failed.",
  },
  ja: {
    failed: "タロットリーディングの生成に失敗しました。",
  },
};

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

    const payload = buildReadingResponse(engine, category, spreadType, cards, { year: body?.year });
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : TAROT_READING_ROUTE_TEXT_TRANSLATIONS.en.failed;
    console.error("[api/tarot/reading]", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

