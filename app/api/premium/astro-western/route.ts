import { NextRequest, NextResponse } from "next/server";
import { buildWesternChart } from "../_astroCommon";
import { requireRouteAuth } from "@/app/_lib/route-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

function normalizeBaseUrl(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  try {
    return new URL(value).origin.replace(/\/$/, "");
  } catch (error) {
    console.warn("[api/premium/astro-western] invalid base url", {
      value,
      message: error instanceof Error ? error.message : "Invalid URL",
    });
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
      console.warn("[api/premium/astro-western] swiss endpoint fetch failed", {
        endpoint,
        message: err instanceof Error ? err.message : "Swiss endpoint request failed",
      });
      warnings.push(err instanceof Error ? err.message : "Swiss endpoint request failed");
    }
  }

  return { chart: null, source: "", warnings };
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireRouteAuth(req);
    if (auth.ok === false) return auth.response;

    const body = await req.json();
    const missingFields: string[] = [];
    const year = Number(body.year);
    const month = Number(body.month);
    const day = Number(body.day);
    const hour = Number(body.hour);
    const minute = Number(body.minute);
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) missingFields.push("birthDate");
    if (missingFields.length) {
      return NextResponse.json({
        ok: false,
        code: "ASTRO_INPUT_INVALID",
        message: "점성술 차트 계산을 위해 생년월일이 필요합니다.",
        missingFields,
      }, { status: 422 });
    }

    const resolvedHour = Number.isFinite(hour) ? hour : 12;
    const resolvedMinute = Number.isFinite(minute) ? minute : 0;
    const resolvedLat = Number.isFinite(lat) ? lat : 37.5665;
    const resolvedLon = Number.isFinite(lon) ? lon : 126.978;
    const resolvedTimezone = Number(body.timezone ?? 9);
    const payload = {
      year,
      month,
      day,
      hour: resolvedHour,
      minute: resolvedMinute,
      timezone: Number.isFinite(resolvedTimezone) ? resolvedTimezone : 9,
      lat: resolvedLat,
      lon: resolvedLon,
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
    return NextResponse.json({ ok: false, code: "ASTRO_CHART_SEED_FAILED", message }, { status: 500 });
  }
}
