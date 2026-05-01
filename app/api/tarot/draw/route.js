import { NextResponse } from "next/server";
import { getTarotEngine } from "../_engine";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const engine = await getTarotEngine();
    const spreadType = engine.normalizeSpreadType(body?.spreadType || "one_card");
    const cards = engine.drawCards(spreadType);

    return NextResponse.json({
      ok: true,
      spreadType,
      cards,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "draw failed";
    console.error("[api/tarot/draw]", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
