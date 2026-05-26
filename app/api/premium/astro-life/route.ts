import { NextRequest, NextResponse } from "next/server";
import { ASTRO_CHAPTER_META, ASTRO_TOTAL_CHAPTERS, buildAstroPrompt, buildWesternChart, fallbackAstroText, generateAstroText, parseSections } from "../_astroCommon";
import { requirePremiumRouteAccess } from "@/app/_lib/premium-route-access";
import { requireRouteAuth } from "@/app/_lib/route-auth";

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

type AstroChapterResult = {
  chapter: number;
  chapterMeta: (typeof ASTRO_CHAPTER_META)[number];
  text: string;
  sections: ReturnType<typeof parseSections>;
  usedFallback: boolean;
  calculationSource: string;
  warnings: string[];
};

async function buildAstroChapterResult(chapter: number, chart: ReturnType<typeof buildWesternChart>, previousChapterTexts: string[] = []): Promise<AstroChapterResult> {
  const chapterMeta = ASTRO_CHAPTER_META[chapter - 1] ?? ASTRO_CHAPTER_META[0];
  const prompt = buildAstroPrompt(chapter, chart);
  let text = await generateAstroText(prompt);
  let usedFallback = false;
  if (!text) {
    usedFallback = true;
    text = fallbackAstroText(chapter, chart);
  }

  return {
    chapter,
    chapterMeta,
    text,
    sections: parseSections(text),
    usedFallback,
    calculationSource: "server-build",
    warnings: usedFallback ? ["AI text unavailable, fallback chapter text used"] : [],
  };
}

async function buildAstroBatchResults(chart: ReturnType<typeof buildWesternChart>) {
  const chapterResultsById: Record<string, AstroChapterResult> = {};
  const chapterJsonById: Record<string, AstroChapterResult> = {};
  const previousChapterTexts: string[] = [];

  for (let chapter = 1; chapter <= ASTRO_TOTAL_CHAPTERS; chapter += 1) {
    const result = await buildAstroChapterResult(chapter, chart, previousChapterTexts);
    chapterResultsById[String(chapter)] = result;
    chapterJsonById[String(chapter)] = result;
    if (result.text.trim()) previousChapterTexts.push(result.text);
  }

  return { chapterResultsById, chapterJsonById };
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireRouteAuth(req);
    if (auth.ok === false) return auth.response;

    const body = await req.json();
    const access = await requirePremiumRouteAccess(auth.userId, "westernAstrologyPremium", body as Record<string, unknown>);
    if (!access.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: access.code,
          message: access.message,
          reportType: access.reportType,
          ...("required" in access ? { required: access.required } : {}),
        },
        { status: access.status },
      );
    }
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

    const precomputeAll = body.precomputeAll === true;
    const chapterResult = await buildAstroChapterResult(chapter, chart);
    const batchResults = precomputeAll ? await buildAstroBatchResults(chart) : null;
    return NextResponse.json({
      ok: true,
      chart,
      chapter,
      totalChapters: ASTRO_TOTAL_CHAPTERS,
      chapterMeta: chapterResult.chapterMeta,
      text: chapterResult.text,
      sections: chapterResult.sections,
      usedFallback: chapterResult.usedFallback,
      calculationSource,
      chapterResultsById: batchResults?.chapterResultsById || undefined,
      chapterJsonById: batchResults?.chapterJsonById || undefined,
      precomputeAll,
      warnings: chapterResult.warnings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/premium/astro-life]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
