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
    const year = Number(body.year);
    const month = Number(body.month);
    const day = Number(body.day);
    const chapter = Number(body.chapter || 1);
    if (!year || !month || !day) return NextResponse.json({ ok: false, error: "Missing birth date" }, { status: 400 });
    if (chapter < 1 || chapter > ASTRO_TOTAL_CHAPTERS) {
      return NextResponse.json({ ok: false, error: `Chapter must be 1-${ASTRO_TOTAL_CHAPTERS}` }, { status: 400 });
    }

    const payload = {
      year,
      month,
      day,
      hour: Number(body.hour ?? 12),
      minute: Number(body.minute ?? 0),
      timezone: Number(body.timezone ?? 9),
      lat: Number(body.lat ?? 37.5665),
      lon: Number(body.lon ?? 126.978),
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
