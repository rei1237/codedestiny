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
    || "gemini-2.5-flash",
  );
}

function resolveSoulOriginTimeoutMs(env = {}) {
  const value = Number(env?.SOUL_ORIGIN_LLM_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || PROVIDER_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : PROVIDER_TIMEOUT_MS;
}

function classifySoulOriginLlmError(error) {
  const message = clean(error?.message || error, 500);
  const code = clean(error?.code || error?.name || "").toUpperCase();
  if (code.includes("TIMEOUT") || /timed out|timeout|aborted/i.test(message)) return "LLM_TIMEOUT";
  if (/api key is not configured|binding is not configured|not configured/i.test(message)) return "LLM_NOT_CONFIGURED";
  return "LLM_REQUEST_FAILED";
}

export async function generateSoulOriginTextWithLlm(params = {}, env = {}) {
  const started = Date.now();
  const modelName = resolveSoulOriginModelName(env);
  try {
    const result = await callLLM({
      prompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      model: modelName,
      maxTokens: Number(params.maxTokens || env?.SOUL_ORIGIN_GEMINI_MAX_TOKENS || env?.SOUL_ORIGIN_LLM_MAX_TOKENS || 24000),
      temperature: Number(params.temperature ?? env?.SOUL_ORIGIN_LLM_TEMPERATURE ?? 0.72),
      taskType: "pdf",
      timeoutMs: Number(params.timeoutMs || resolveSoulOriginTimeoutMs(env)),
    }, env);
    const text = cleanBlock(result?.text || "");
    if (!text) {
      return {
        ok: false,
        provider: "gemini",
        model: clean(result?.model || modelName),
        errorCode: "LLM_REQUEST_FAILED",
        errorMessage: "Empty LLM response.",
        latencyMs: Date.now() - started,
      };
    }
    return {
      ok: true,
      text,
      provider: result?.provider === "cloudflare" ? "workers-ai" : clean(result?.provider || "gemini"),
      model: clean(result?.model || modelName),
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    const code = classifySoulOriginLlmError(error);
    return {
      ok: false,
      provider: "gemini",
      model: modelName,
      errorCode: code,
      errorMessage: clean(error?.message || error, 300),
      latencyMs: Date.now() - started,
    };
  }
}
