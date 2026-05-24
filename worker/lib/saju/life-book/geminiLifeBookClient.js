import { generateWithGemini } from "../../gemini-client.js";

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y";
  }
  return false;
}

function isLifeBookApiPaused(env) {
  const raw = String(env?.PREMIUM_PDF_API_PAUSE || "").trim();
  if (!raw) return true;
  return asBool(raw);
}

export async function geminiLifeBookClient(env, prompt, options = {}) {
  if (isLifeBookApiPaused(env)) {
    const error = new Error("LifeBook API calls are temporarily paused");
    error.code = "LIFEBOOK_API_PAUSED";
    throw error;
  }

  const result = await generateWithGemini(env, prompt, {
    modelEnvKeys: ["LIFEBOOK_GEMINI_MODEL"],
    temperature: toNumber(options.temperature, 0.72),
    topP: toNumber(options.topP, 0.92),
    frequencyPenalty: toNumber(options.frequencyPenalty, 0.55),
    presencePenalty: toNumber(options.presencePenalty, 0.55),
    maxOutputTokens: toNumber(options.maxOutputTokens, 12288),
    timeoutMs: toNumber(options.timeoutMs, Number(env?.LIFEBOOK_GEMINI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 25000)),
    totalTimeoutMs: toNumber(options.totalTimeoutMs, Number(env?.LIFEBOOK_GEMINI_TOTAL_TIMEOUT_MS || env?.PREMIUM_GEMINI_TOTAL_TIMEOUT_MS || 60000)),
    maxAttemptsPerPair: toNumber(options.maxAttemptsPerPair, Number(env?.LIFEBOOK_GEMINI_RETRIES || env?.PREMIUM_GEMINI_RETRIES || 2)),
    requestId: String(options.requestId || "").trim() || undefined,
  });

  if (!result?.ok) {
    const error = new Error(String(result?.message || "Gemini chapter generation failed"));
    error.code = String(result?.error || "GEMINI_CHAPTER_FAILED");
    throw error;
  }

  const text = String(result?.text || "").trim();
  if (!text) {
    const error = new Error("Gemini returned empty chapter text");
    error.code = "GEMINI_EMPTY_TEXT";
    throw error;
  }

  return {
    text,
    model: String(result?.model || ""),
    usage: result?.usage || null,
  };
}
