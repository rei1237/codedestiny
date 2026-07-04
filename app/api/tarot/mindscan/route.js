import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TAROT_MINDSCAN_ROUTE_TEXT_TRANSLATIONS = {
  ko: {
    cardsRequired: "카드 페어 데이터가 필요합니다.",
    questionRequired: "상담 질문이 필요합니다.",
    cardMeaningMissing: "카드 의미 데이터가 누락되어 정확한 해석을 생성할 수 없습니다",
    serverError: "서버 오류가 발생했습니다.",
  },
  en: {
    cardsRequired: "Card-pair data is required.",
    questionRequired: "A consultation question is required.",
    cardMeaningMissing: "Card meaning data is missing, so an accurate reading cannot be generated.",
    serverError: "A server error occurred.",
  },
  ja: {
    cardsRequired: "カードペアデータが必要です。",
    questionRequired: "相談質問が必要です。",
    cardMeaningMissing: "カード意味データが不足しているため、正確な解釈を生成できません。",
    serverError: "サーバーエラーが発生しました。",
  },
};
const tarotMindscanRouteCopy = TAROT_MINDSCAN_ROUTE_TEXT_TRANSLATIONS.ko;

function toText(value) {
  return String(value || "").trim();
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const pairs = Array.isArray(body?.pairs) ? body.pairs.slice(0, 5) : [];
    const question = toText(body?.question);

    if (!Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json(
        { ok: false, message: tarotMindscanRouteCopy.cardsRequired },
        { status: 400 }
      );
    }

    if (!question) {
      return NextResponse.json(
        { ok: false, message: tarotMindscanRouteCopy.questionRequired },
        { status: 400 }
      );
    }

    const { buildMindscanReadingPayload } = await import("../../../../lib/tarot/mindscan-reading.mjs");
    const reading = await buildMindscanReadingPayload(pairs, { question, env: process.env });
    if (!reading?.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: reading?.message || tarotMindscanRouteCopy.cardMeaningMissing,
        },
        { status: 422 },
      );
    }

    return NextResponse.json(reading);
  } catch (error) {
    console.error("[tarot/mindscan] Error:", error);
    return NextResponse.json(
      { ok: false, message: tarotMindscanRouteCopy.serverError },
      { status: 500 }
    );
  }
}
