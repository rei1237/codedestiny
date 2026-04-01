import { NextResponse } from "next/server";

import sampleData from "../../../../../server/data/tarot-cards.sample.json";
import dbData from "../../../../../server/data/tarot-cards.db.json";

const { getCardImageSourcesById, initFromPreloadedData } = require("../../../../../server/services/tarot-engine.service");

export async function GET(request, context) {
  try {
    initFromPreloadedData(dbData, sampleData);
    const params = await (context?.params || Promise.resolve({}));
    const cardId = String(params?.cardId || "").trim();
    if (!cardId) {
      return NextResponse.json({ ok: false, message: "cardId가 필요합니다." }, { status: 400 });
    }

    const src = getCardImageSourcesById(cardId);
    const candidates = Array.isArray(src.imageCandidates) ? src.imageCandidates : [];
    if (!candidates.length) {
      return NextResponse.json({ ok: false, message: "카드 이미지를 찾을 수 없습니다." }, { status: 404 });
    }

    for (const url of candidates) {
      try {
        const upstream = await fetch(url, { redirect: "follow" });
        if (!upstream.ok) continue;
        const contentType = upstream.headers.get("content-type") || "image/jpeg";
        const buffer = Buffer.from(await upstream.arrayBuffer());
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType.includes("image/") ? contentType : "image/jpeg",
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch (e) {
        // try next candidate
      }
    }

    return NextResponse.json({ ok: false, message: "원격 카드 이미지를 불러오지 못했습니다." }, { status: 404 });
  } catch (error) {
    console.error("[tarot/card-image]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
