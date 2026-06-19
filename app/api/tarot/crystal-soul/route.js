import { NextResponse } from "next/server";
import { buildCrystalSoulV3Reading } from "../../../../lib/tarot/crystal-soul-reading.mjs";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(buildCrystalSoulV3Reading(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "crystal soul reading failed";
    console.error("[api/tarot/crystal-soul]", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
