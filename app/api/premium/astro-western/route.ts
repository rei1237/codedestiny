import { NextRequest, NextResponse } from "next/server";
import { buildWesternChart } from "../_astroCommon";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const year = Number(body.year);
    const month = Number(body.month);
    const day = Number(body.day);
    if (!year || !month || !day) return NextResponse.json({ ok: false, error: "Missing birth date" }, { status: 400 });
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
    return NextResponse.json({ ok: true, ...chart });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/premium/astro-western]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
