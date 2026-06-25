import { callLLM } from "../../../../lib/llm-client.ts";
import { clean } from "./love-secret-premium.types.js";

const PROVIDER_TIMEOUT_MS = 120000;

function withTimeout(promise, timeoutMs) {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error("LOVE_SECRET_LLM_TIMEOUT");
        error.code = "LOVE_SECRET_LLM_TIMEOUT";
        reject(error);
      }, Math.max(1000, Number(timeoutMs || PROVIDER_TIMEOUT_MS)));
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function cleanBlock(value) {
  return String(value || "")
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export function resolveLoveSecretLlmProviders(env = {}) {
  const providers = String(env?.LOVE_SECRET_PREMIUM_LLM_PROVIDERS || "gemini,workers-ai")
    .split(",")
    .map((item) => clean(item).toLowerCase())
    .filter((item) => item === "gemini" || item === "workers-ai");
  const unique = [];
  for (const provider of providers) {
    if (!unique.includes(provider)) unique.push(provider);
  }
  if (!unique.includes("gemini")) unique.unshift("gemini");
  if (clean(env?.LOVE_SECRET_PREMIUM_DISABLE_WORKERS_AI_FALLBACK).toLowerCase() === "true") {
    return unique.filter((provider) => provider !== "workers-ai");
  }
  if (!unique.includes("workers-ai")) unique.push("workers-ai");
  return unique;
}

export function resolveLoveSecretModelName(env = {}, provider = "gemini") {
  if (clean(provider).toLowerCase() === "workers-ai") {
    return clean(
      env?.LOVE_SECRET_PREMIUM_WORKERS_AI_MODEL
      || env?.WORKERS_AI_MODEL
      || "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    );
  }
  return clean(
    env?.LOVE_SECRET_PREMIUM_GEMINI_MODEL
    || env?.PREMIUM_GEMINI_MODEL
    || env?.GEMINI_MODEL
    || "gemini-2.5-flash",
  );
}

function resolveLoveSecretGeminiEndpoint(env = {}) {
  return clean(
    env?.LOVE_SECRET_PREMIUM_GEMINI_API_ENDPOINT
    || env?.PREMIUM_GEMINI_API_ENDPOINT
    || env?.GEMINI_API_ENDPOINT
    || "https://generativelanguage.googleapis.com/v1beta",
  );
}

function extractWorkersAiText(result) {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "";
  const direct = result.response || result.text || result.output_text || result.result?.response || result.result?.text;
  if (typeof direct === "string") return direct;
  if (Array.isArray(result.choices)) {
    return result.choices
      .map((choice) => choice?.message?.content || choice?.text || "")
      .filter(Boolean)
      .join("\n");
  }
  if (Array.isArray(result.content)) {
    return result.content
      .map((item) => item?.text || "")
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

async function callWorkersAi(params, env) {
  const started = Date.now();
  const model = resolveLoveSecretModelName(env, "workers-ai");
  try {
    if (!env?.AI?.run) {
      return {
        ok: false,
        provider: "workers-ai",
        model,
        errorCode: "workers_ai_unavailable",
        errorMessage: "Cloudflare Workers AI binding is not configured.",
        latencyMs: Date.now() - started,
      };
    }
    const result = await withTimeout(env.AI.run(model, {
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      temperature: Number(params.temperature ?? env.LOVE_SECRET_PREMIUM_LLM_TEMPERATURE ?? 0.7),
      max_tokens: Number(params.maxTokens || env.LOVE_SECRET_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
    }), Number(params.timeoutMs || env.LOVE_SECRET_PREMIUM_LLM_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
    const text = cleanBlock(extractWorkersAiText(result));
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
  const model = clean(params.model || resolveLoveSecretModelName(env, "gemini"));
  try {
    const result = await withTimeout(callLLM({
      prompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      model,
      apiEndpoint: resolveLoveSecretGeminiEndpoint(env),
      temperature: Number(params.temperature ?? env.LOVE_SECRET_PREMIUM_LLM_TEMPERATURE ?? 0.7),
      maxTokens: Number(params.maxTokens || env.LOVE_SECRET_PREMIUM_GEMINI_MAX_TOKENS || env.LOVE_SECRET_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
      taskType: "pdf",
    }, env), Number(params.timeoutMs || env.LOVE_SECRET_PREMIUM_LLM_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
    const text = cleanBlock(result?.text || "");
    if (!text) return { ok: false, provider: "gemini", model: clean(result?.model || model), errorCode: "empty_response", latencyMs: Date.now() - started };
    return {
      ok: true,
      text,
      model: clean(result.model || model),
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

export async function generateLoveSecretTextWithLlm(params, env = {}) {
  const provider = clean(params.provider).toLowerCase();
  if (provider === "workers-ai") return callWorkersAi(params, env);
  if (provider === "gemini") return callGemini(params, env);
  return {
    ok: false,
    provider,
    model: clean(params.model),
    errorCode: "unsupported_provider",
    errorMessage: `Unsupported provider: ${provider}`,
  };
}
