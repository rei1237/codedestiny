import { NextRequest, NextResponse } from "next/server";
import { buildSukuyoCalendarMonth } from "@/lib/sukuyo-calendar";

export const runtime = "nodejs";
export const revalidate = 3600;

const SUKUYO_CALENDAR_ROUTE_TEXT_TRANSLATIONS = {
  ko: {
    failed: "숙요 달력을 불러오지 못했습니다.",
  },
  en: {
    failed: "Could not load the Sukuyo calendar.",
  },
  ja: {
    failed: "宿曜カレンダーを読み込めませんでした。",
  },
} as const;

function readNumberParam(req: NextRequest, key: string) {
  const value = req.nextUrl.searchParams.get(key);
  if (value == null || value.trim() === "") return NaN;
  return Number(value);
}

export async function GET(req: NextRequest) {
  try {
    const year = readNumberParam(req, "year");
    const month = readNumberParam(req, "month");
    const calendar = buildSukuyoCalendarMonth(year, month);

    return NextResponse.json(
      {
        ok: true,
        ...calendar,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          "X-Sukuyo-Calendar-Cache-Key": calendar.monthKey,
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : SUKUYO_CALENDAR_ROUTE_TEXT_TRANSLATIONS.ko.failed;
    return NextResponse.json(
      {
        ok: false,
        code: "SUKUYO_CALENDAR_FAILED",
        error: message,
      },
      { status: 400 }
    );
  }
}
