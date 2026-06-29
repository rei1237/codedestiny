import { NextResponse } from "next/server";
import { callLLM } from "@/lib/llm-client";
import {
  buildCelestialMelodyReading,
  persistCelestialSession,
  restorePaidCelestialSession,
  sanitizeCelestialMelodyText,
} from "../../../lib/tarot/celestial-melody-reading.mjs";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = false;

const SESSION_CACHE = new Map();
const CELESTIAL_HARMONY_ROUTE_TEXT_TRANSLATIONS = {
  ko: {
    reportNotFound: "복구 가능한 리딩이 없습니다.",
    cardsRequired: "카드 데이터가 필요합니다.",
    serverError: "서버 오류가 발생했습니다.",
  },
  en: {
    reportNotFound: "No restorable reading was found.",
    cardsRequired: "Card data is required.",
    serverError: "A server error occurred.",
  },
  ja: {
    reportNotFound: "復元できるリーディングが見つかりません。",
    cardsRequired: "カードデータが必要です。",
    serverError: "サーバーエラーが発生しました。",
  },
};
const celestialHarmonyRouteCopy = CELESTIAL_HARMONY_ROUTE_TEXT_TRANSLATIONS.ko;

function text(value) {
  return String(value || "").trim();
}

function cacheSet(key, value) {
  const token = text(key);
  if (!token || !value) return;
  SESSION_CACHE.set(token, { value, savedAt: Date.now() });
}

function cacheGet(key) {
  const token = text(key);
  if (!token) return null;
  const hit = SESSION_CACHE.get(token);
  if (!hit) return null;
  if (Date.now() - Number(hit.savedAt || 0) > 1000 * 60 * 60 * 12) {
    SESSION_CACHE.delete(token);
    return null;
  }
  return hit.value;
}

function buildCelestialHarmonyPrompt(reading = {}) {
  const summary = reading?.summary || {};
  const cards = Array.isArray(reading?.cards) ? reading.cards : [];
  const cardLines = cards.map((card, index) => {
    const cardIndex = index + 1;
    return [
      "[" + cardIndex + "] " + text(card?.cardNameKo || "카드 " + cardIndex) + " / " + text(card?.orientation || "upright"),
      "행성=" + text(card?.planetKo || card?.planetName || ""),
      "행성 질문축=" + text(card?.planetTitle || ""),
      "행성 원형=" + text(card?.planetMeaning || ""),
      "행성 영문=" + text(card?.planetEn || card?.arcana || ""),
      "의미=" + text(card?.cardMeaning || ""),
      "의식 메시지=" + text(card?.consciousMessage || ""),
      "무의식 패턴=" + text(card?.unconsciousPattern || ""),
      "그림자 경고=" + text(card?.shadowWarning || ""),
      "영혼 과제=" + text(card?.soulLesson || ""),
      "현실 조율=" + text(card?.integrationPractice || "")
    ].join(" | ");
  });

  return [
    "당신은 '천체의 선율 타로' 최종 오라클을 작성하는 전문 타로 리더입니다.",
    "이 리딩은 별자리 운세가 아니라 11개 행성 질문축과 11장의 타로 카드가 만나는 심층 상담형 결과입니다.",
    "목표: 11장 해석의 흐름을 보존해 카드 하나씩의 메시지가 살아 있고, 마지막에 사용자가 오늘 붙잡을 조율 방향이 선명한 고품질 상담문을 작성한다.",
    "규칙:",
    "1) 결과는 한국어 한글로 작성하고, 별빛과 고요한 카드룸의 분위기를 살리되 과장된 동화체가 아니라 신뢰감 있는 상담체로 쓴다.",
    "2) 11장 각각의 행성 질문축, cardMeaning, consciousMessage, unconsciousPattern, shadowWarning, soulLesson, integrationPractice를 반영한다.",
    "3) dominantLayer/strongestPlanetSignal/deepestShadow/soulLesson/integrationPath는 중심축으로 삼는다.",
    "4) 카드 순서는 1~11장을 유지하고, 태양에서 카이론으로 흐르는 초반-전개-전환-통합 리듬으로 문단을 구성한다.",
    "5) 카드 의미를 도감처럼 나열하지 말고, 행성 질문축 -> 카드 상징 -> 사용자의 마음과 현실 -> 오늘의 조율 행동 순서로 자연스럽게 풀어낸다.",
    "6) 과도한 단정, 상대 마음/미래 확정, 불안 조장, 의료/투자/법률 판단처럼 실천 불가능한 단정 조언은 사용하지 않는다.",
    "7) 연이는 등장하지 않는다. 별빛, 선율, 우주, 운명 같은 표현은 필요한 곳에만 쓰고 반복하지 않는다.",
    "8) 카드 하나를 건너뛰지 말고 마지막에 짧은 통합 결실만 덧붙인다.",
    "출력은 JSON이 아닌 최종 오라클 본문 텍스트 하나로만 응답한다.",
    "dominantLayer=" + (summary?.dominantLayer || ""),
    "strongestPlanetSignal=" + (summary?.strongestPlanetSignal || ""),
    "deepestShadow=" + (summary?.deepestShadow || ""),
    "soulLesson=" + (summary?.soulLesson || ""),
    "integrationPath=" + (summary?.integrationPath || ""),
    "cards=" + cardLines.join("\n")
  ].join("\n");
}
async function enrichFinalOracleWithGemini(reading) {
  const prompt = buildCelestialHarmonyPrompt(reading);
  const response = await callLLM({
    prompt,
    maxTokens: 1500,
    temperature: 0.64,
    taskType: "fortune",
  });
  const finalOracle = sanitizeCelestialMelodyText(response.text);
  if (!finalOracle) return { used: false };
  return { used: true, finalOracle };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const reportId = text(searchParams.get("reportId"));
  const transactionId = text(searchParams.get("transactionId"));
  const cached = (reportId ? cacheGet(`report:${reportId}`) : null)
    || (transactionId ? cacheGet(`tx:${transactionId}`) : null)
    || restorePaidCelestialSession(reportId || transactionId);

  if (!cached) {
    return NextResponse.json({ ok: false, code: "REPORT_NOT_FOUND", message: celestialHarmonyRouteCopy.reportNotFound }, { status: 404 });
  }
  return NextResponse.json({ ok: true, source: "restore", result: cached });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const cards = Array.isArray(body?.cards) ? body.cards : [];
    const reportId = text(body?.reportId || body?.payment?.reportId);
    const transactionId = text(body?.transactionId || body?.payment?.transactionId);
    const restoredFromPaidSession = Boolean(body?.restoredFromPaidSession || body?.payment?.restoredFromPaidSession);

    if (!cards.length) {
      const restored = restorePaidCelestialSession(reportId || transactionId);
      if (restored) return NextResponse.json({ ok: true, source: "restored", result: restored });
      return NextResponse.json({ ok: false, message: celestialHarmonyRouteCopy.cardsRequired }, { status: 400 });
    }

    const local = buildCelestialMelodyReading({
      cards,
      payment: {
        coinCharged: Boolean(body?.coinCharged !== false),
        transactionId,
        reportId,
        restoredFromPaidSession,
        apiUsed: false,
      },
      version: "20260530-next-v2",
    });

    const reading = local.reading;
    try {
      const ai = await enrichFinalOracleWithGemini(reading);
      if (ai.used && ai.finalOracle) {
        reading.summary.finalOracle = ai.finalOracle;
        reading.meta.apiUsed = true;
      }
    } catch (_) {
      // Gemini enrichment is optional.
    }

    if (reportId) cacheSet(`report:${reportId}`, reading);
    if (transactionId) cacheSet(`tx:${transactionId}`, reading);
    persistCelestialSession(reading);

    return NextResponse.json({
      ok: true,
      source: reading.meta.apiUsed ? "local+gemini" : "local",
      quality: local.quality,
      result: reading,
    });
  } catch (error) {
    console.error("[celestial-harmony] Error:", error);
    return NextResponse.json({ ok: false, message: celestialHarmonyRouteCopy.serverError }, { status: 500 });
  }
}
