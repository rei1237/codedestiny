import { NextResponse } from "next/server";

import sampleData from "../../../../server/data/tarot-cards.sample.json";
import dbData from "../../../../server/data/tarot-cards.db.json";

const { drawCards, normalizeSpreadType, initFromPreloadedData } = require("../../../../server/services/tarot-engine.service");

export async function POST(request) {
  try {
    initFromPreloadedData(dbData, sampleData);
    const body = await request.json();
    const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
    const cards = drawCards(spreadType);
    return NextResponse.json({ ok: true, spreadType, cards });
  } catch (error) {
    console.error("[tarot/draw]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
