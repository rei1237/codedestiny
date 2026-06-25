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
    .filter((item) => item === "gemini" || item === "workers-ai");
  const unique = [];
  for (const provider of providers) {
    if (!unique.includes(provider)) unique.push(provider);
  }
  if (!unique.length) unique.push("gemini");
  return unique;
}

function resolveSajuNewYearGeminiModelName(env = {}) {
  return clean(
    env?.PREMIUM_SAJU_NEW_YEAR_GEMINI_MODEL
    || env?.SAJU_NEW_YEAR_GEMINI_MODEL
    || env?.PREMIUM_GEMINI_MODEL
    || env?.GEMINI_MODEL
    || "gemini-2.5-flash",
  );
}

function resolveSajuNewYearWorkersAiModelName(env = {}) {
  return clean(
    env?.SAJU_NEW_YEAR_WORKERS_AI_MODEL
    || env?.WORKERS_AI_MODEL
    || "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  );
}

export function resolveSajuNewYearModelName(env = {}) {
  const firstProvider = resolveSajuNewYearLlmProviders(env)[0] || "gemini";
  if (firstProvider === "workers-ai") return resolveSajuNewYearWorkersAiModelName(env);
  return resolveSajuNewYearGeminiModelName(env);
}

export function resolveSajuNewYearProviderModelKey(env = {}) {
  return resolveSajuNewYearLlmProviders(env)
    .map((provider) => `${provider}:${provider === "workers-ai" ? resolveSajuNewYearWorkersAiModelName(env) : resolveSajuNewYearGeminiModelName(env)}`)
    .join(",");
}

function extractWorkersAiText(result) {
  if (typeof result === "string") return cleanBlock(result);
  if (!result || typeof result !== "object") return "";
  const direct = result.response || result.text || result.output_text || result.result?.response || result.result?.text;
  if (typeof direct === "string") return cleanBlock(direct);
  if (Array.isArray(result.choices)) {
    return cleanBlock(result.choices.map((choice) => choice?.message?.content || choice?.text || "").filter(Boolean).join("\n"));
  }
  if (Array.isArray(result.content)) {
    return cleanBlock(result.content.map((item) => item?.text || "").filter(Boolean).join("\n"));
  }
  return "";
}

async function callWorkersAi(params, env) {
  const started = Date.now();
  const model = clean(params.model || resolveSajuNewYearWorkersAiModelName(env));
  try {
    if (!env?.AI?.run) {
      return { ok: false, provider: "workers-ai", model, errorCode: "workers_ai_unavailable", latencyMs: Date.now() - started };
    }
    const result = await withTimeout(env.AI.run(model, {
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      max_tokens: Number(params.maxTokens || env.SAJU_NEW_YEAR_CHAPTER_MAX_TOKENS || 18000),
      temperature: Number(params.temperature ?? env.SAJU_NEW_YEAR_LLM_TEMPERATURE ?? 0.62),
    }), Number(params.timeoutMs || env.SAJU_NEW_YEAR_LLM_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
    const text = extractWorkersAiText(result);
    if (!text) return { ok: false, provider: "workers-ai", model, errorCode: "empty_response", latencyMs: Date.now() - started };
    return {
      ok: true,
      text,
      model,
      provider: "workers-ai",
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "workers-ai",
      model,
      errorCode: clean(error?.code || "provider_exception"),
      errorMessage: clean(error?.message || error, 300),
      latencyMs: Date.now() - started,
    };
  }
}

async function callGemini(params, env) {
  const started = Date.now();
  const model = clean(params.model || resolveSajuNewYearGeminiModelName(env));
  try {
    const result = await withTimeout(callLLM({
      prompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      model,
      apiEndpoint: clean(
        env?.PREMIUM_SAJU_NEW_YEAR_GEMINI_API_ENDPOINT
        || env?.SAJU_NEW_YEAR_GEMINI_API_ENDPOINT
        || env?.PREMIUM_GEMINI_API_ENDPOINT
        || env?.GEMINI_API_ENDPOINT
        || "https://generativelanguage.googleapis.com/v1beta",
      ),
      maxTokens: Number(params.maxTokens || env?.SAJU_NEW_YEAR_GEMINI_MAX_TOKENS || env?.SAJU_NEW_YEAR_CHAPTER_MAX_TOKENS || 24000),
      temperature: Number(params.temperature ?? env?.SAJU_NEW_YEAR_LLM_TEMPERATURE ?? 0.62),
      taskType: "pdf",
    }, env), Number(params.timeoutMs || env?.SAJU_NEW_YEAR_LLM_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
    const text = cleanBlock(result?.text || "");
    if (!text) return { ok: false, provider: "gemini", model: clean(result?.model || model), errorCode: "empty_response", latencyMs: Date.now() - started };
    return {
      ok: true,
      text,
      model: clean(result?.model || model),
      provider: result?.provider === "cloudflare" ? "workers-ai" : clean(result?.provider || "gemini"),
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "gemini",
      model,
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
