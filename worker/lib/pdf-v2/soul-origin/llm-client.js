import { generateWithGemini } from "../../gemini-client.js";
import { clean } from "./soul-origin-premium.types.js";

const PROVIDER_TIMEOUT_MS = 120000;
const GEMINI_KEY_NAMES = [
  "PREMIUM_GEMINI_API_KEY0",
  "PREMIUM_GEMINI_API_KEY1",
  "PREMIUM_GEMINI_API_KEY2",
  "PREMIUM_GEMINI_API_KEY3",
  "PREMIUM_GEMINI_API_KEY4",
  "PREMIUM_GEMINI_API_KEY5",
  "PREMIUM_GEMINI_API_KEY6",
  "PREMIUM_GEMINI_API_KEY7",
  "PREMIUM_GEMINI_API_KEY8",
  "GEMINIF_API_KEY0",
  "GEMINIF_API_KEY1",
  "GEMINIF_API_KEY2",
  "GEMINIF_API_KEY3",
  "GEMINIF_API_KEY4",
  "GEMINIF_API_KEY5",
  "GEMINIF_API_KEY6",
  "GEMINIF_API_KEY7",
  "GEMINIF_API_KEY8",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_API_KEY",
];

function hasGeminiKey(env = {}) {
  return GEMINI_KEY_NAMES.some((key) => clean(env?.[key]));
}

function cleanBlock(value) {
  return String(value || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export function resolveSoulOriginModelName(env = {}) {
  return clean(
    env?.SOUL_ORIGIN_GEMINI_MODEL
    || env?.SOUL_ORIGIN_LLM_MODEL
    || env?.PREMIUM_GEMINI_MODEL
    || env?.GEMINI_MODEL
    || "gemini",
  );
}

export async function generateSoulOriginTextWithLlm(params = {}, env = {}) {
  const started = Date.now();
  if (!hasGeminiKey(env)) {
    return {
      ok: false,
      provider: "gemini",
      model: resolveSoulOriginModelName(env),
      errorCode: "LLM_NOT_CONFIGURED",
      errorMessage: "Gemini API key is not configured.",
      latencyMs: Date.now() - started,
    };
  }
  try {
    const result = await generateWithGemini(env, `${params.systemPrompt}\n\n${params.userPrompt}`, {
      modelEnvKeys: ["SOUL_ORIGIN_GEMINI_MODEL", "SOUL_ORIGIN_LLM_MODEL", "GEMINI_MODEL"],
      timeoutMs: Number(params.timeoutMs || env?.SOUL_ORIGIN_LLM_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || PROVIDER_TIMEOUT_MS),
      maxOutputTokens: Number(params.maxTokens || env?.SOUL_ORIGIN_GEMINI_MAX_TOKENS || env?.SOUL_ORIGIN_LLM_MAX_TOKENS || 24000),
      temperature: Number(params.temperature ?? env?.SOUL_ORIGIN_LLM_TEMPERATURE ?? 0.72),
      requestId: params.requestId,
    });
    if (result?.ok === false) {
      const code = clean(result.error || result.code || "LLM_REQUEST_FAILED").toUpperCase();
      return {
        ok: false,
        provider: "gemini",
        model: clean(result.model || resolveSoulOriginModelName(env)),
        errorCode: code.includes("TIMEOUT") ? "LLM_TIMEOUT" : "LLM_REQUEST_FAILED",
        errorMessage: clean(result.message || code, 300),
        status: Number(result.status || 0) || null,
        latencyMs: Date.now() - started,
      };
    }
    const text = cleanBlock(result?.text || result?.rawText || result?.content || result?.response || "");
    if (!text) {
      return {
        ok: false,
        provider: "gemini",
        model: clean(result?.model || resolveSoulOriginModelName(env)),
        errorCode: "LLM_REQUEST_FAILED",
        errorMessage: "Empty LLM response.",
        latencyMs: Date.now() - started,
      };
    }
    return {
      ok: true,
      text,
      provider: "gemini",
      model: clean(result?.model || resolveSoulOriginModelName(env)),
      usage: result?.usage,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    const code = clean(error?.code || error?.name || "LLM_REQUEST_FAILED").toUpperCase();
    return {
      ok: false,
      provider: "gemini",
      model: resolveSoulOriginModelName(env),
      errorCode: code.includes("TIMEOUT") ? "LLM_TIMEOUT" : "LLM_REQUEST_FAILED",
      errorMessage: clean(error?.message || error, 300),
      latencyMs: Date.now() - started,
    };
  }
}
