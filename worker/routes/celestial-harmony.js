import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";
import {
  buildCelestialMelodyReading,
  persistCelestialSession,
  restorePaidCelestialSession,
  sanitizeCelestialMelodyText,
} from "../../lib/tarot/celestial-melody-reading.mjs";

const SESSION_CACHE = new Map();

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

async function enrichFinalOracle(env, reading) {
  const modelPrompt = [
    "당신은 프리미엄 타로 상담가입니다.",
    "아래 요약을 바탕으로 한국어 최종 오라클 메시지 3~4문장만 생성하세요.",
    "진단/단정 금지, 상징 기반의 자기성찰 문체 유지.",
    `dominantLayer=${reading?.summary?.dominantLayer || ""}`,
    `strongestPlanetSignal=${reading?.summary?.strongestPlanetSignal || ""}`,
    `deepestShadow=${reading?.summary?.deepestShadow || ""}`,
    `soulLesson=${reading?.summary?.soulLesson || ""}`,
    `integrationPath=${reading?.summary?.integrationPath || ""}`,
  ].join("\n");

  const ai = await callGeminiText(env, modelPrompt, {
    modelEnvKeys: ["CELESTIAL_HARMONY_GEMINI_MODEL"],
    temperature: 0.65,
    maxOutputTokens: 420,
    timeoutMs: Number(env.CELESTIAL_HARMONY_PROVIDER_TIMEOUT_MS || 12000),
  });

  if (!ai.ok) return { used: false, message: ai.message || "" };
  const finalOracle = sanitizeCelestialMelodyText(ai.text);
  if (!finalOracle) return { used: false, message: "" };

  return { used: true, finalOracle };
}

async function handleGenerate(request, env) {
  const body = await readJson(request);
  const cards = Array.isArray(body?.cards) ? body.cards : [];
  const reportId = text(body?.reportId || body?.payment?.reportId);
  const transactionId = text(body?.transactionId || body?.payment?.transactionId);
  const restoredFromPaidSession = Boolean(body?.restoredFromPaidSession || body?.payment?.restoredFromPaidSession);

  if (!cards.length) {
    const restored = restorePaidCelestialSession(reportId || transactionId);
    if (restored) {
      return json({ ok: true, source: "restored", result: restored });
    }
    return json({ ok: false, message: "카드 데이터가 필요합니다." }, { status: 400 });
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
    version: "20260530-worker-v2",
  });

  const reading = local.reading;
  const ai = await enrichFinalOracle(env, reading);
  if (ai.used && ai.finalOracle) {
    reading.summary.finalOracle = ai.finalOracle;
    reading.meta.apiUsed = true;
  }

  if (reportId) cacheSet(`report:${reportId}`, reading);
  if (transactionId) cacheSet(`tx:${transactionId}`, reading);

  // Browser local restore helper (no-op on worker runtime).
  persistCelestialSession(reading);

  return json({
    ok: true,
    source: ai.used ? "local+gemini" : "local",
    quality: local.quality,
    result: reading,
  });
}

async function handleRestore(request) {
  const url = new URL(request.url);
  const reportId = text(url.searchParams.get("reportId"));
  const transactionId = text(url.searchParams.get("transactionId"));

  const byReport = reportId ? cacheGet(`report:${reportId}`) : null;
  const byTx = !byReport && transactionId ? cacheGet(`tx:${transactionId}`) : null;
  const restored = byReport || byTx || restorePaidCelestialSession(reportId || transactionId);

  if (!restored) {
    return json({ ok: false, code: "REPORT_NOT_FOUND", message: "복구 가능한 리딩이 없습니다." }, { status: 404 });
  }

  return json({ ok: true, source: "restore", result: restored });
}

export async function handleCelestialHarmonyRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    if (!["GET", "POST"].includes(method)) return methodNotAllowed();

    const path = getRoutePath(request, "/api/celestial-harmony");
    if (path !== "/") return notFound();

    if (method === "GET") return await handleRestore(request);
    return await handleGenerate(request, env);
  } catch (error) {
    return handleRouteError(error);
  }
}
