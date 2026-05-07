import { NextRequest, NextResponse } from "next/server";
import {
  buildCanonicalSukuyoNatal,
  buildSukuyoFromLunar,
  buildSukuyoNatalDataSummaryTable,
} from "@/worker/lib/sukuyo-premium.js";
import { requireRouteAuth } from "@/app/_lib/route-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

function pad2(v: number) {
  return String(v).padStart(2, "0");
}

function normalizeDeg(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  let d = n % 360;
  if (d < 0) d += 360;
  return d;
}

function extractSwissEclipticLongitude(chartPayload: any, planetName: string) {
  if (!chartPayload || !planetName) return NaN;
  const direct = Number(chartPayload?.planets?.[planetName]?.longitude);
  if (Number.isFinite(direct)) return normalizeDeg(direct);
  const flat = Number(chartPayload?.planets?.[planetName]);
  if (Number.isFinite(flat)) return normalizeDeg(flat);
  const lower = String(planetName).toLowerCase();
  const lowerObj = Number(chartPayload?.planets?.[lower]?.longitude);
  if (Number.isFinite(lowerObj)) return normalizeDeg(lowerObj);
  const lowerFlat = Number(chartPayload?.planets?.[lower]);
  if (Number.isFinite(lowerFlat)) return normalizeDeg(lowerFlat);
  return NaN;
}

function resolveMoonPhaseByAngle(angle: number) {
  const a = normalizeDeg(angle);
  if (!Number.isFinite(a)) {
    return {
      phaseAngle: null,
      illumination: null,
      label: null,
      cycle: null,
      yinYangFlow: null,
      waxingOrWaning: null,
      interpretationKey: null,
    };
  }

  let label = "정보 없음";
  if (a < 22.5 || a >= 337.5) label = "삭(신월)";
  else if (a < 67.5) label = "초승";
  else if (a < 112.5) label = "상현";
  else if (a < 157.5) label = "차는달";
  else if (a < 202.5) label = "망(보름)";
  else if (a < 247.5) label = "기우는달";
  else if (a < 292.5) label = "하현";
  else label = "그믐";

  const illumination = Math.round(((1 - Math.cos((a * Math.PI) / 180)) / 2) * 1000) / 10;
  const waxing = a < 180;

  return {
    phaseAngle: Math.round(a * 10) / 10,
    illumination,
    label,
    cycle: waxing ? "상현 이전(증가)" : "하현 이후(감소)",
    yinYangFlow: waxing ? "양기 생장" : "음기 수렴",
    waxingOrWaning: waxing ? "waxing" : "waning",
    interpretationKey: waxing ? "확장" : "정리",
  };
}

async function fetchKasiLunarFromSolar(req: NextRequest, year: number, month: number, day: number) {
  try {
    const response = await fetch(`${req.nextUrl.origin}/api/kasi/calendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "getLunCalInfo",
        params: {
          solYear: String(year),
          solMonth: pad2(month),
          solDay: pad2(day),
        },
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok || !Array.isArray(data?.rows) || !data.rows.length) return null;

    const row = data.rows[0] || {};
    const lunarYear = Number(row.lunYear ?? row.year ?? row.lunarYear);
    const lunarMonth = Number(row.lunMonth ?? row.month ?? row.lunarMonth);
    const lunarDay = Number(row.lunDay ?? row.day ?? row.lunarDay);
    const leapRaw = String(row.lunLeapmonth ?? row.isLeap ?? row.leapMonth ?? "").trim().toLowerCase();
    const isLeap = leapRaw === "1" || leapRaw === "y" || leapRaw === "true" || leapRaw === "윤" || leapRaw === "leap";

    if (!Number.isFinite(lunarYear) || !Number.isFinite(lunarMonth) || !Number.isFinite(lunarDay)) {
      return null;
    }

    return { lunarYear, lunarMonth, lunarDay, isLeap };
  } catch {
    return null;
  }
}

async function fetchSwissSukuyoBasis(
  req: NextRequest,
  payload: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    timezone: number;
    lat: number;
    lon: number;
  }
) {
  try {
    const response = await fetch(`${req.nextUrl.origin}/api/astro/western-chart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) return null;
    const chartPayload = data?.chart ?? data?.data ?? data;

    return {
      moonLongitude: extractSwissEclipticLongitude(chartPayload, "Moon"),
      sunLongitude: extractSwissEclipticLongitude(chartPayload, "Sun"),
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireRouteAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));

    const year = Number(body?.birth?.year ?? body?.year);
    const month = Number(body?.birth?.month ?? body?.month);
    const day = Number(body?.birth?.day ?? body?.day);
    const hour = Number(body?.birth?.hour ?? body?.hour ?? 12);
    const minute = Number(body?.birth?.minute ?? body?.minute ?? 0);

    const lat = Number(body?.location?.lat ?? body?.lat ?? 37.5665);
    const lon = Number(body?.location?.lon ?? body?.lon ?? 126.978);
    const timezone = Number(body?.location?.timezone ?? body?.timezone ?? 9);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_INPUT",
          error: "year/month/day 입력이 필요합니다.",
        },
        { status: 400 }
      );
    }

    const kasiLunar = await fetchKasiLunarFromSolar(req, year, month, day);
    if (!kasiLunar) {
      return NextResponse.json(
        {
          ok: false,
          code: "SUKUYO_LUNAR_CONVERSION_FAILED",
          error: "KASI 음력 변환에 실패했습니다.",
        },
        { status: 422 }
      );
    }

    const sukuyoBase = buildSukuyoFromLunar(kasiLunar.lunarMonth, kasiLunar.lunarDay, {
      isLeapMonth: kasiLunar.isLeap,
      source: "kasi-api",
    });

    if (!sukuyoBase) {
      return NextResponse.json(
        {
          ok: false,
          code: "SUKUYO_CALC_FAILED",
          error: "숙요 계산에 실패했습니다.",
        },
        { status: 500 }
      );
    }

    const swissBasis = await fetchSwissSukuyoBasis(req, {
      year,
      month,
      day,
      hour: Number.isFinite(hour) ? hour : 12,
      minute: Number.isFinite(minute) ? minute : 0,
      timezone: Number.isFinite(timezone) ? timezone : 9,
      lat: Number.isFinite(lat) ? lat : 37.5665,
      lon: Number.isFinite(lon) ? lon : 126.978,
    });

    const moonLon = Number(swissBasis?.moonLongitude);
    const sunLon = Number(swissBasis?.sunLongitude);
    const lunarPhase = resolveMoonPhaseByAngle(moonLon - sunLon);

    const canonical = buildCanonicalSukuyoNatal({
      name: String(body?.name || "사용자"),
      gender: body?.gender ? String(body.gender) : null,
      input: {
        year,
        month,
        day,
        hour: Number.isFinite(hour) ? hour : 12,
        minute: Number.isFinite(minute) ? minute : 0,
      },
      sukuyo: {
        ...sukuyoBase,
        lunarYear: kasiLunar.lunarYear,
      },
      lunarPhase,
      calendarSource: "kasi-api",
      methodVersion: "sukuyo-basic-v1",
    });

    const validation = canonical?.validation || {};
    if (!validation?.hasNatalSukuyo || !validation?.hasIndex || !validation?.hasLunarDate) {
      return NextResponse.json(
        {
          ok: false,
          code: "SUKUYO_CANONICAL_INVALID",
          error: "숙요 canonical 데이터 검증에 실패했습니다.",
          missingFields: validation?.missingFields || [],
        },
        { status: 500 }
      );
    }

    const summaryTable = buildSukuyoNatalDataSummaryTable(canonical);

    return NextResponse.json({
      ok: true,
      canonical,
      summaryTable,
      display: {
        base: {
          mansion: `${canonical?.natalSukuyo?.nameKo || ""}宿(${canonical?.natalSukuyo?.nameHan || ""})`,
          index: canonical?.natalSukuyo?.index ?? null,
          lunarDate: canonical?.profile?.birth?.lunarDate || null,
          direction: canonical?.natalSukuyo?.direction || null,
          element: canonical?.natalSukuyo?.element || null,
        },
        moon: {
          phaseName: canonical?.lunarPhase?.phaseName || null,
          illumination: canonical?.lunarPhase?.illumination ?? null,
          elongationAngle: canonical?.lunarPhase?.elongationAngle ?? null,
          waxingOrWaning: canonical?.lunarPhase?.waxingOrWaning || null,
        },
        rhythm: {
          relationship: canonical?.sukuyoAttributes?.relationshipStyle || [],
          career: canonical?.sukuyoAttributes?.careerStyle || [],
          wealth: canonical?.sukuyoAttributes?.wealthStyle || [],
          recovery: canonical?.sukuyoAttributes?.recoveryPattern || [],
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        error: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}
