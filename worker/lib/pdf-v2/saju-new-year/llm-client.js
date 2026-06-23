import { callLLM } from "../../../../lib/llm-client.ts";
import { clean } from "./saju-new-year-premium.types.js";

const PROVIDER_TIMEOUT_MS = 180000;

function withTimeout(promise, timeoutMs) {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error("SAJU_NEW_YEAR_LLM_TIMEOUT");
        error.code = "SAJU_NEW_YEAR_LLM_TIMEOUT";
        reject(error);
      }, Math.max(1000, Number(timeoutMs || PROVIDER_TIMEOUT_MS)));
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function cleanBlock(value) {
  return String(value || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export function resolveSajuNewYearLlmProviders(env = {}) {
  const providers = String(env?.SAJU_NEW_YEAR_LLM_PROVIDERS || "gemini,workers-ai")
    .split(",")
    .map((item) => clean(item).toLowerCase())
    .filter(Boolean);
  const unique = [];
  for (const provider of providers) {
    if (!unique.includes(provider)) unique.push(provider);
  }
  if (!unique.length) unique.push("gemini");
  return unique;
}

export function resolveSajuNewYearModelName(env = {}) {
  const firstProvider = resolveSajuNewYearLlmProviders(env)[0] || "gemini";
  if (firstProvider === "workers-ai") {
    return clean(
      env?.SAJU_NEW_YEAR_WORKERS_AI_MODEL
      || env?.WORKERS_AI_MODEL
      || "@cf/meta/llama-3.1-8b-instruct",
    );
  }
  return clean(
    env?.SAJU_NEW_YEAR_GEMINI_MODEL
    || env?.GEMINI_MODEL
    || env?.SAJU_NEW_YEAR_WORKERS_AI_MODEL
    || env?.WORKERS_AI_MODEL
    || "gemini",
  );
}

async function callWorkersAi(params, env) {
  const started = Date.now();
  try {
    const result = await withTimeout(callLLM({
      prompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      temperature: Number(params.temperature ?? env.SAJU_NEW_YEAR_LLM_TEMPERATURE ?? 0.62),
      maxTokens: Number(params.maxTokens || env.SAJU_NEW_YEAR_CHAPTER_MAX_TOKENS || 18000),
      taskType: "pdf",
    }, env), Number(params.timeoutMs || env.SAJU_NEW_YEAR_LLM_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
    const text = cleanBlock(result?.text || "");
    if (!text) return { ok: false, provider: "workers-ai", model: clean(result?.model || ""), errorCode: "empty_response", latencyMs: Date.now() - started };
    return {
      ok: true,
      text,
      model: clean(result?.model || params.model),
      provider: result?.provider === "cloudflare" ? "workers-ai" : clean(result?.provider || "gemini"),
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "workers-ai",
      model: clean(params.model || env?.SAJU_NEW_YEAR_WORKERS_AI_MODEL || env?.WORKERS_AI_MODEL),
      errorCode: clean(error?.code || "provider_exception"),
      errorMessage: clean(error?.message || error, 300),
      latencyMs: Date.now() - started,
    };
  }
}

async function callGemini(params, env) {
  const started = Date.now();
  try {
    const result = await withTimeout(callLLM({
      prompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      maxTokens: Number(params.maxTokens || env?.SAJU_NEW_YEAR_GEMINI_MAX_TOKENS || env?.SAJU_NEW_YEAR_CHAPTER_MAX_TOKENS || 24000),
      temperature: Number(params.temperature ?? env?.SAJU_NEW_YEAR_LLM_TEMPERATURE ?? 0.62),
      taskType: "pdf",
    }, env), Number(params.timeoutMs || env?.SAJU_NEW_YEAR_LLM_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
    const text = cleanBlock(result?.text || "");
    if (!text) return { ok: false, provider: "gemini", model: clean(result?.model || ""), errorCode: "empty_response", latencyMs: Date.now() - started };
    return {
      ok: true,
      text,
      model: clean(result?.model || "gemini"),
      provider: result?.provider === "cloudflare" ? "workers-ai" : clean(result?.provider || "gemini"),
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "gemini",
      model: clean(env?.SAJU_NEW_YEAR_GEMINI_MODEL || env?.GEMINI_MODEL),
      errorCode: clean(error?.code || "provider_exception"),
      errorMessage: clean(error?.message || error, 300),
      latencyMs: Date.now() - started,
    };
  }
}

export async function generateSajuNewYearTextWithLlm(params, env = {}) {
  const provider = clean(params.provider || "gemini").toLowerCase();
  if (provider === "workers-ai") return callWorkersAi(params, env);
  return callGemini(params, env);
}
