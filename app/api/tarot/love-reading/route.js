import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const cards = Array.isArray(body?.cards) ? body.cards : [];

    if (cards.length !== 6) {
      return NextResponse.json(
        { ok: false, message: "love-reading은 6장의 카드가 필요합니다." },
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    const readingUrl = `${url.origin}/api/tarot/reading`;

    const upstream = await fetch(readingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        category: "love",
        spreadType: "relationship_six_card",
        cards,
      }),
    });

    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || !payload) {
      return NextResponse.json(
        {
          ok: false,
          message: payload?.message || "love-reading API 호출에 실패했습니다.",
        },
        { status: upstream.status || 500 },
      );
    }

    return NextResponse.json(
      {
        ...payload,
        api: "love-reading",
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "love-reading 처리 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
