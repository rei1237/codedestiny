import { NextRequest, NextResponse } from "next/server";
import { requirePremiumRouteAccess } from "@/app/_lib/premium-route-access";
import { requireRouteAuth } from "@/app/_lib/route-auth";
import {
  buildWesternChart,
  validateAstroInput,
  normalizeAstroInput,
  validateAstroChart,
} from "@/app/api/premium/_astroCommon";

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
  const warnings: string[] = [];
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

    console.info("[AstroBook] API_START", { userId: auth.userId });

    // ============================================================
    // INPUT VALIDATION
    // ============================================================
    const inputValidation = validateAstroInput(body);
    if (!inputValidation.ok) {
      console.warn("[AstroBook] INPUT_VALIDATION_FAILED", { errors: inputValidation.errors });
      return NextResponse.json({
        ok: false,
        code: "ASTRO_INPUT_VALIDATION_FAILED",
        message: "점성술 차트 계산을 위해 유효한 입력 값이 필요합니다.",
        errors: inputValidation.errors,
        missingFields: inputValidation.errors,
      }, { status: 400 });
    }

    warnings.push(...inputValidation.warnings);

    // Normalize input values to valid ranges
    const normalized = normalizeAstroInput(body);

    console.info("[AstroBook] INPUT_NORMALIZED", { normalized });

    // ============================================================
    // ATTEMPT REMOTE CHART CALCULATION
    // ============================================================
    const payload = {
      year: normalized.year,
      month: normalized.month,
      day: normalized.day,
      hour: normalized.hour,
      minute: normalized.minute,
      timezone: normalized.timezone,
      lat: normalized.lat,
      lon: normalized.lon,
    };

    console.info("[AstroBook] FETCHING_SWISS_CHART", { endpoint: "swiss-endpoint" });
    const swiss = await fetchSwissWesternChart(req, payload);
    warnings.push(...swiss.warnings);

    let chart = swiss.chart;
    let calculationSource = swiss.source || "local-calculation";

    // ============================================================
    // FALLBACK: LOCAL CHART CALCULATION
    // ============================================================
    if (!chart) {
      console.warn("[AstroBook] SWISS_CHART_FAILED_USE_LOCAL", { warnings: swiss.warnings });
      try {
        chart = buildWesternChart(normalized);
        calculationSource = "local-calculation";
        warnings.push("Swiss endpoint failed, using local calculation");
        console.info("[AstroBook] LOCAL_CHART_CALCULATION_SUCCESS", {});
      } catch (err) {
        console.error("[AstroBook] LOCAL_CHART_CALCULATION_FAILED", {
          message: err instanceof Error ? err.message : "Unknown error",
        });
        return NextResponse.json({
          ok: false,
          code: "ASTRO_CHART_CALCULATION_FAILED",
          message: "점성술 차트 계산에 실패했습니다. 입력값을 확인해주세요.",
          warnings,
        }, { status: 422 });
      }
    }

    // ============================================================
    // CHART QUALITY VALIDATION
    // ============================================================
    const chartValidation = validateAstroChart(chart);
    if (!chartValidation.ok) {
      console.warn("[AstroBook] CHART_VALIDATION_FAILED", { errors: chartValidation.errors });
      warnings.push(...chartValidation.errors);
    }
    warnings.push(...chartValidation.warnings);

    console.info("[AstroBook] CHART_READY", { source: calculationSource, warnings });

    return NextResponse.json({
      ok: true,
      ...chart,
      calculationSource,
      warnings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[AstroBook] API_ERROR", { message, warnings });
    return NextResponse.json({
      ok: false,
      code: "ASTRO_CHART_CALCULATION_FAILED",
      message: "점성술 차트 계산 중 오류가 발생했습니다.",
      warnings,
    }, { status: 422 });
  }
}
