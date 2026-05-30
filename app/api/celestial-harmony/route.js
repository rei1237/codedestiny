import { NextResponse } from "next/server";
import {
  buildCelestialMelodyReading,
  persistCelestialSession,
  restorePaidCelestialSession,
  sanitizeCelestialMelodyText,
} from "../../../lib/tarot/celestial-melody-reading.mjs";

export const runtime = "nodejs";

const SESSION_CACHE = new Map();
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

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

async function enrichFinalOracleWithGemini(reading) {
  const apiKey = pickGeminiKey();
  if (!apiKey) return { used: false };

  const prompt = [
    "당신은 프리미엄 타로 상담가입니다.",
    "아래 요약을 바탕으로 한국어 최종 오라클 메시지 3~4문장만 생성하세요.",
    "진단/단정 금지, 상징 기반 자기성찰 문체 유지.",
    `dominantLayer=${reading?.summary?.dominantLayer || ""}`,
    `strongestPlanetSignal=${reading?.summary?.strongestPlanetSignal || ""}`,
    `deepestShadow=${reading?.summary?.deepestShadow || ""}`,
    `soulLesson=${reading?.summary?.soulLesson || ""}`,
  ].join("\n");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(getGeminiModel())}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.65, maxOutputTokens: 420 },
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
