import { callLLM } from "../../../../lib/llm-client.ts";
import { clean } from "./soul-origin-premium.types.js";

const PROVIDER_TIMEOUT_MS = 120000;

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
  try {
    const result = await callLLM({
      prompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      maxTokens: Number(params.maxTokens || env?.SOUL_ORIGIN_GEMINI_MAX_TOKENS || env?.SOUL_ORIGIN_LLM_MAX_TOKENS || 24000),
      temperature: Number(params.temperature ?? env?.SOUL_ORIGIN_LLM_TEMPERATURE ?? 0.72),
      taskType: "pdf",
    }, env);
    const text = cleanBlock(result?.text || "");
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
      provider: result?.provider === "cloudflare" ? "workers-ai" : clean(result?.provider || "gemini"),
      model: clean(result?.model || resolveSoulOriginModelName(env)),
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
