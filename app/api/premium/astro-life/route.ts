import { NextRequest, NextResponse } from "next/server";
import { ASTRO_CHAPTER_META, ASTRO_TOTAL_CHAPTERS, buildAstroPrompt, buildWesternChart, fallbackAstroText, generateAstroText, parseSections } from "../_astroCommon";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const year = Number(body.year);
    const month = Number(body.month);
    const day = Number(body.day);
    const chapter = Number(body.chapter || 1);
    if (!year || !month || !day) return NextResponse.json({ ok: false, error: "Missing birth date" }, { status: 400 });
    if (chapter < 1 || chapter > ASTRO_TOTAL_CHAPTERS) {
      return NextResponse.json({ ok: false, error: `Chapter must be 1-${ASTRO_TOTAL_CHAPTERS}` }, { status: 400 });
    }

    const chart = buildWesternChart({
      year,
      month,
      day,
      hour: Number(body.hour ?? 12),
      minute: Number(body.minute ?? 0),
      timezone: Number(body.timezone ?? 9),
      lat: Number(body.lat ?? 37.5665),
      lon: Number(body.lon ?? 126.978),
    });
    let text = await generateAstroText(buildAstroPrompt(chapter, chart));
    let usedFallback = false;
    if (!text) {
      usedFallback = true;
      text = fallbackAstroText(chapter, chart);
    }
    return NextResponse.json({
      ok: true,
      chart,
      chapter,
      totalChapters: ASTRO_TOTAL_CHAPTERS,
      chapterMeta: ASTRO_CHAPTER_META[chapter - 1],
      text,
      sections: parseSections(text),
      usedFallback,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/premium/astro-life]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
