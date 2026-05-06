import { NextRequest, NextResponse } from "next/server";
import { buildWesternChart } from "../_astroCommon";

export const runtime = "nodejs";
export const maxDuration = 120;

function normalizeBaseUrl(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  try {
    return new URL(value).origin.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

async function fetchSwissWesternChart(req: NextRequest, payload: Record<string, unknown>) {
  const warnings: string[] = [];
  const origin = req.nextUrl.origin;
  const configuredBase = normalizeBaseUrl(
    process.env.AUTH_API_BASE_URL
    || process.env.AUTH_API_BASE
    || process.env.CODE_DESTINY_API_URL
    || process.env.NEXT_PUBLIC_CODE_DESTINY_API_URL
    || process.env.NEXT_PUBLIC_API_BASE_URL,
  );

  const candidates = [
    `${origin}/api/astro/western-chart`,
    configuredBase ? `${configuredBase}/api/astro/western-chart` : "",
  ].filter(Boolean);

  for (const endpoint of candidates) {
    if (sameOrigin(endpoint, `${origin}/api/premium/astro-western`)) continue;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8_000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        warnings.push(String(data?.error || `Swiss endpoint error: ${response.status}`));
        continue;
      }

      const chart = data?.chart ?? data?.data ?? data;
      if (chart?.planets && chart?.ascendant && chart?.midheaven) {
        return {
          chart,
          source: String(chart?.source || "swiss-endpoint"),
          warnings,
        };
      }
      warnings.push("Swiss endpoint returned malformed chart payload");
    } catch (err: unknown) {
      warnings.push(err instanceof Error ? err.message : "Swiss endpoint request failed");
    }
  }

  return { chart: null, source: "", warnings };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const year = Number(body.year);
    const month = Number(body.month);
    const day = Number(body.day);
    if (!year || !month || !day) return NextResponse.json({ ok: false, error: "Missing birth date" }, { status: 400 });
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

    const swiss = await fetchSwissWesternChart(req, payload);
    const fallbackChart = buildWesternChart(payload);
    const chart = swiss.chart || fallbackChart;
    const calculationSource = swiss.chart ? swiss.source : "astronomy-engine-fallback";

    return NextResponse.json({
      ok: true,
      ...chart,
      calculationSource,
      warnings: swiss.chart ? swiss.warnings : [...swiss.warnings, "Swiss unavailable, fallback chart used"],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/premium/astro-western]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
