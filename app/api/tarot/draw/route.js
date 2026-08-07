import { NextResponse } from "next/server";
import { getTarotEngine } from "../_engine";

export const runtime = "nodejs";

const TAROT_DRAW_ROUTE_TEXT_TRANSLATIONS = {
  ko: {
    failed: "카드 뽑기에 실패했습니다.",
  },
  en: {
    failed: "Draw failed.",
  },
  ja: {
    failed: "カードのドローに失敗しました。",
  },
};

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const engine = await getTarotEngine();
    const spreadType = engine.normalizeSpreadType(body?.spreadType || "one_card");
    const cards = engine.drawCards(spreadType, { seed: body?.seed, year: body?.year });

    return NextResponse.json({
      ok: true,
      spreadType,
      cards,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : TAROT_DRAW_ROUTE_TEXT_TRANSLATIONS.en.failed;
    console.error("[api/tarot/draw]", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

