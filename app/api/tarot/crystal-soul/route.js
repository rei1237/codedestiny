import { NextResponse } from "next/server";
import { buildCrystalSoulV3Reading } from "../../../../lib/tarot/crystal-soul-reading.mjs";

export const runtime = "nodejs";

const CRYSTAL_SOUL_ROUTE_TEXT_TRANSLATIONS = {
  ko: {
    failed: "원석 소울 리딩을 완료하지 못했습니다.",
  },
  en: {
    failed: "Crystal soul reading failed.",
  },
  ja: {
    failed: "原石ソウルリーディングに失敗しました。",
  },
};

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(buildCrystalSoulV3Reading(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : CRYSTAL_SOUL_ROUTE_TEXT_TRANSLATIONS.en.failed;
    console.error("[api/tarot/crystal-soul]", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
