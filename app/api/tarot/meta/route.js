import { NextResponse } from "next/server";

import sampleData from "../../../../server/data/tarot-cards.sample.json";
import dbData from "../../../../server/data/tarot-cards.db.json";

const tarotEngineModulePromise = import("../../../../server/services/tarot-engine.service.js");

export async function GET() {
  try {
    const tarotEngineModule = await tarotEngineModulePromise;
    const { getEngineMeta, initFromPreloadedData } = tarotEngineModule.default || tarotEngineModule;
    initFromPreloadedData(dbData, sampleData);
    const engine = getEngineMeta();
    return NextResponse.json({ ok: true, engine });
  } catch (error) {
    console.error("[tarot/meta]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
