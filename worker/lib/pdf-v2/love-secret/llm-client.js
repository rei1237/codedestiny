import { generateWithGemini } from "../../gemini-client.js";
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
  const providers = String(env?.LOVE_SECRET_PREMIUM_LLM_PROVIDERS || "workers-ai,gemini")
    .split(",")
    .map((item) => clean(item).toLowerCase())
    .filter(Boolean);
  const unique = [];
  for (const provider of providers) {
    if (!unique.includes(provider)) unique.push(provider);
  }
  if (!unique.includes("workers-ai")) unique.unshift("workers-ai");
  const disableGeminiFallback = clean(env?.LOVE_SECRET_PREMIUM_DISABLE_GEMINI_FALLBACK).toLowerCase() === "true";
  if (!disableGeminiFallback && !unique.includes("gemini")) unique.push("gemini");
  return unique;
}

export function resolveLoveSecretModelName(env = {}) {
  return clean(
    env?.LOVE_SECRET_PREMIUM_WORKERS_AI_MODEL
    || env?.WORKERS_AI_MODEL
    || env?.LOVE_SECRET_PREMIUM_GEMINI_MODEL
    || env?.PREMIUM_GEMINI_MODEL
    || env?.GEMINI_MODEL
    || "workers-ai-gemini",
  );
}

async function callWorkersAi(params, env) {
  const started = Date.now();
  const model = clean(params.model || env?.LOVE_SECRET_PREMIUM_WORKERS_AI_MODEL || env?.WORKERS_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct");
  try {
    if (!env?.AI?.run) {
      return { ok: false, provider: "workers-ai", model, errorCode: "workers_ai_not_configured", latencyMs: Date.now() - started };
    }
    const result = await withTimeout(env.AI.run(model, {
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      temperature: Number(params.temperature ?? env.LOVE_SECRET_PREMIUM_LLM_TEMPERATURE ?? 0.7),
      max_tokens: Number(params.maxTokens || env.LOVE_SECRET_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
    }), Number(params.timeoutMs || env.LOVE_SECRET_PREMIUM_LLM_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
    const text = cleanBlock(result?.response || result?.result?.response || result?.text || result?.content || "");
    if (!text) return { ok: false, provider: "workers-ai", model, errorCode: "empty_response", latencyMs: Date.now() - started };
    return {
      ok: true,
      text,
      model,
      provider: "workers-ai",
      usage: result?.usage,
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
  try {
    const result = await withTimeout(generateWithGemini(env, `${params.systemPrompt}\n\n${params.userPrompt}`, {
      temperature: Number(params.temperature ?? env.LOVE_SECRET_PREMIUM_LLM_TEMPERATURE ?? 0.7),
      topP: Number(params.topP ?? 0.95),
      maxOutputTokens: Number(params.maxTokens || env.LOVE_SECRET_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
      timeoutMs: Number(params.timeoutMs || env.LOVE_SECRET_PREMIUM_LLM_TIMEOUT_MS || PROVIDER_TIMEOUT_MS),
      totalTimeoutMs: Number(params.totalTimeoutMs || env.LOVE_SECRET_PREMIUM_LLM_TIMEOUT_MS || PROVIDER_TIMEOUT_MS),
      modelEnvKeys: ["LOVE_SECRET_PREMIUM_GEMINI_MODEL", "LOVE_SECRET_GEMINI_MODEL"],
      requestId: params.requestId,
    }), Number(params.timeoutMs || env.LOVE_SECRET_PREMIUM_LLM_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
    const text = cleanBlock(result?.text || result?.response || "");
    if (!result?.ok || !text) {
      return {
        ok: false,
        provider: "gemini",
        model: clean(result?.model || params.model),
        errorCode: clean(result?.error || "empty_response"),
        errorMessage: clean(result?.message, 300),
        latencyMs: Date.now() - started,
      };
    }
    return {
      ok: true,
      text,
      model: clean(result.model || params.model || "gemini"),
      provider: "gemini",
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "gemini",
      model: clean(params.model || env?.LOVE_SECRET_PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL),
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
