import { NextResponse } from "next/server";

import sampleData from "../../../../server/data/tarot-cards.sample.json";
import dbData from "../../../../server/data/tarot-cards.db.json";

const { getEngineMeta, initFromPreloadedData } = require("../../../../server/services/tarot-engine.service");

export async function GET() {
  try {
    initFromPreloadedData(dbData, sampleData);
    const engine = getEngineMeta();
    return NextResponse.json({ ok: true, engine });
  } catch (error) {
    console.error("[tarot/meta]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
