import { NextRequest, NextResponse } from "next/server";
import { requirePremiumRouteAccess } from "@/app/_lib/premium-route-access";
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
    const access = await requirePremiumRouteAccess(auth.userId, "westernAstrologyPremium", body as Record<string, unknown>);
    if (!access.ok) {
      return NextResponse.json(
        { ok: false, code: access.code, message: access.message, reportType: access.reportType, required: access.required },
        { status: access.status },
      );
    }
    const missingFields: string[] = [];
    const year = Number(body.year);
    const month = Number(body.month);
    const day = Number(body.day);
    const hour = Number(body.hour);
    const minute = Number(body.minute);
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    const timezone = Number(body.timezone);
    const birthPlace = String(body.birthPlace || body.place || body.location || "").trim();
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) missingFields.push("birthDate");
    if (missingFields.length) {
      return NextResponse.json({
        ok: false,
        code: "ASTRO_INPUT_REQUIRED",
        message: "점성술 차트 계산을 위해 생년월일이 필요합니다.",
        missingFields,
      }, { status: 400 });
    }

    const hasGeo = Number.isFinite(lat) && Number.isFinite(lon);
    const hasTimezone = Number.isFinite(timezone);
    if ((!hasGeo && !birthPlace) || !hasTimezone) {
      return NextResponse.json({
        ok: false,
        code: "ASTRO_LOCATION_TIMEZONE_REQUIRED",
        message: "점성술 차트 계산을 위해 위치와 타임존 정보가 필요합니다.",
        missingFields: [
          ...((!hasGeo && !birthPlace) ? ["location"] : []),
          ...(!hasTimezone ? ["timezone"] : []),
        ],
      }, { status: 422 });
    }

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return NextResponse.json({
        ok: false,
        code: "ASTRO_INPUT_REQUIRED",
        message: "점성술 차트 계산을 위해 출생 시간이 필요합니다.",
        missingFields: ["birthTime"],
      }, { status: 400 });
    }

    const payload = {
      year,
      month,
      day,
      hour,
      minute,
      timezone,
      lat,
      lon,
    };

    const swiss = await fetchSwissWesternChart(req, payload);
    if (!swiss.chart) {
      return NextResponse.json({
        ok: false,
        code: "ASTRO_CHART_CALCULATION_FAILED",
        message: "점성술 차트 계산에 실패했습니다.",
        warnings: swiss.warnings,
      }, { status: 422 });
    }

    const chart = swiss.chart;
    const calculationSource = swiss.source;

    return NextResponse.json({
      ok: true,
      ...chart,
      calculationSource,
      warnings: swiss.warnings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/premium/astro-western]", message);
    return NextResponse.json({ ok: false, code: "ASTRO_CHART_CALCULATION_FAILED", message }, { status: 422 });
  }
}
