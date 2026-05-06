import { NextRequest, NextResponse } from "next/server";
import { ASTRO_CHAPTER_META, ASTRO_TOTAL_CHAPTERS, buildAstroPrompt, buildWesternChart, fallbackAstroText, generateAstroText, parseSections } from "../_astroCommon";

export const runtime = "nodejs";
export const maxDuration = 300;

function isChartPayload(value: unknown): value is {
  planets: Record<string, unknown>;
  ascendant: Record<string, unknown>;
  midheaven: Record<string, unknown>;
  northNode?: Record<string, unknown>;
  southNode?: Record<string, unknown>;
  aspects?: unknown[];
} {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return !!(v.planets && v.ascendant && v.midheaven);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const year = Number.isFinite(Number(body.year)) ? Number(body.year) : 1990;
    const month = Number.isFinite(Number(body.month)) ? Math.max(1, Math.min(12, Number(body.month))) : 1;
    const day = Number.isFinite(Number(body.day)) ? Math.max(1, Math.min(31, Number(body.day))) : 1;
    const chapterRaw = Number(body.chapter ?? 1);
    const chapter = Number.isFinite(chapterRaw)
      ? Math.max(1, Math.min(ASTRO_TOTAL_CHAPTERS, Math.floor(chapterRaw)))
      : 1;

    const payload = {
      year,
      month,
      day,
      hour: Number.isFinite(Number(body.hour)) ? Number(body.hour) : 12,
      minute: Number.isFinite(Number(body.minute)) ? Number(body.minute) : 0,
      timezone: Number.isFinite(Number(body.timezone)) ? Number(body.timezone) : 9,
      lat: Number.isFinite(Number(body.lat)) ? Number(body.lat) : 37.5665,
      lon: Number.isFinite(Number(body.lon)) ? Number(body.lon) : 126.978,
    };

    const chart = isChartPayload(body.chart)
      ? body.chart
      : buildWesternChart(payload);
    const calculationSource = isChartPayload(body.chart)
      ? "client-chart-reuse"
      : "server-build";

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
      calculationSource,
      warnings: usedFallback ? ["AI text unavailable, fallback chapter text used"] : [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/premium/astro-life]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
