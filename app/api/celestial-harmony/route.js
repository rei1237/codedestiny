import { NextResponse } from "next/server";
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
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

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

function getGeminiModel() {
  return text(process.env.CELESTIAL_HARMONY_GEMINI_MODEL) || text(process.env.GEMINI_MODEL) || DEFAULT_GEMINI_MODEL;
}

function getGeminiKeyPool() {
  return [
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
  ].map((key) => text(key)).filter(Boolean);
}

function pickGeminiKey() {
  const keys = getGeminiKeyPool();
  if (!keys.length) return "";
  return keys[Math.floor(Math.random() * keys.length)] || "";
}

function extractGeminiText(payload) {
  if (!payload || typeof payload !== "object") return "";
  return text(payload?.candidates?.[0]?.content?.parts?.map((part) => text(part?.text)).join("\n") || "");
}

function buildCelestialHarmonyPrompt(reading = {}) {
  const summary = reading?.summary || {};
  const cards = Array.isArray(reading?.cards) ? reading.cards : [];
  const cardLines = cards.map((card, index) => {
    const cardIndex = index + 1;
    return [
      "[" + cardIndex + "] " + text(card?.cardNameKo || "카드 " + cardIndex) + " / " + text(card?.orientation || "upright"),
      "행성=" + text(card?.planetKo || card?.planetName || ""),
      "아크엔드=" + text(card?.planetEn || card?.arcana || ""),
      "의미=" + text(card?.cardMeaning || ""),
      "의식 메시지=" + text(card?.consciousMessage || ""),
      "무의식 패턴=" + text(card?.unconsciousPattern || ""),
      "그림자 경고=" + text(card?.shadowWarning || ""),
      "영혼 과제=" + text(card?.soulLesson || "")
    ].join(" | ");
  });

  return [
    "당신은 '천체의 선율 타로' 최종 오라클 작성 전문가입니다.",
    "목표: 11장 해석의 흐름을 보존해 카드 하나씩의 메시지가 살아있는 고품질 상담문을 작성한다.",
    "규칙:",
    "1) 결과는 한국어 한글로 작성하고, 신비로운 분위기와 실천 가능한 방향을 함께 담는다.",
    "2) 11장 각각의 cardMeaning, consciousMessage, unconsciousPattern, shadowWarning, soulLesson를 반영한다.",
    "3) dominantLayer/strongestPlanetSignal/deepestShadow/soulLesson/integrationPath는 중심축으로 삼는다.",
    "4) 카드 순서는 1~11장을 유지하고, 초반-전개-전환-통합 리듬으로 문단을 구성한다.",
    "5) 과도한 단정, 불안 조장, 의료/투자/법률 판단처럼 실천 불가능한 단정 조언은 사용하지 않는다.",
    "6) 카드 하나를 건너뛰지 말고 마지막에 짧은 통합 결실만 덧붙인다.",
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
  const apiKey = pickGeminiKey();
  if (!apiKey) return { used: false };

  const prompt = buildCelestialHarmonyPrompt(reading);

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(getGeminiModel())}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, topP: 0.95, topK: 40, maxOutputTokens: 1100 },
    }),
  });

  if (!response.ok) return { used: false };
  const data = await response.json().catch(() => ({}));
  const finalOracle = sanitizeCelestialMelodyText(extractGeminiText(data));
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
    return NextResponse.json({ ok: false, code: "REPORT_NOT_FOUND", message: "복구 가능한 리딩이 없습니다." }, { status: 404 });
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
      return NextResponse.json({ ok: false, message: "카드 데이터가 필요합니다." }, { status: 400 });
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
    return NextResponse.json({ ok: false, message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
