import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const year = Number(body.year);
    const month = Number(body.month);
    const day = Number(body.day);
    if (!year || !month || !day) return NextResponse.json({ ok: false, error: "Missing birth date" }, { status: 400 });
    const origin = req.nextUrl.origin;
    const response = await fetch(`${origin}/api/astro/western-chart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year,
        month,
        day,
        hour: Number(body.hour ?? 12),
        minute: Number(body.minute ?? 0),
        timezone: Number(body.timezone ?? 9),
        lat: Number(body.lat ?? 37.5665),
        lon: Number(body.lon ?? 126.978),
      }),
      signal: AbortSignal.timeout(12_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      return NextResponse.json({ ok: false, error: data?.error || "Swiss API western chart unavailable" }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/premium/astro-western]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
