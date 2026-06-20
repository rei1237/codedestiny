import { generateWithGemini } from "../../gemini-client.js";
import { clean } from "./life-book-premium.types.js";

const PROVIDER_TIMEOUT_MS = 120000;

function withTimeout(promise, timeoutMs) {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error("LIFE_BOOK_LLM_TIMEOUT");
        error.code = "LIFE_BOOK_LLM_TIMEOUT";
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

export function resolveLifeBookLlmProviders(env = {}) {
  const providers = String(env?.LIFE_BOOK_PREMIUM_LLM_PROVIDERS || "workers-ai,gemini")
    .split(",")
    .map((item) => clean(item).toLowerCase())
    .filter(Boolean);
  const unique = [];
  for (const provider of providers) {
    if (!unique.includes(provider)) unique.push(provider);
  }
  if (!unique.includes("workers-ai")) unique.unshift("workers-ai");
  if (clean(env?.LIFE_BOOK_PREMIUM_DISABLE_GEMINI_FALLBACK).toLowerCase() !== "true" && !unique.includes("gemini")) {
    unique.push("gemini");
  }
  return unique;
}

export function resolveLifeBookModelName(env = {}) {
  return clean(
    env?.LIFE_BOOK_PREMIUM_WORKERS_AI_MODEL
    || env?.WORKERS_AI_MODEL
    || env?.LIFE_BOOK_PREMIUM_GEMINI_MODEL
    || env?.GEMINI_MODEL
    || "workers-ai-gemini",
  );
}

async function callWorkersAi(params, env) {
  const started = Date.now();
  try {
    if (clean(env?.LIFE_BOOK_PREMIUM_MOCK_HTML)) {
      return {
        ok: true,
        text: env.LIFE_BOOK_PREMIUM_MOCK_HTML,
        model: "mock",
        provider: "workers-ai",
        latencyMs: Date.now() - started,
      };
    }
    if (!env?.AI?.run) {
      return { ok: false, provider: "workers-ai", model: "", errorCode: "workers_ai_not_configured", latencyMs: Date.now() - started };
    }
    const model = clean(params.model || env.LIFE_BOOK_PREMIUM_WORKERS_AI_MODEL || env.WORKERS_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct");
    const result = await withTimeout(env.AI.run(model, {
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      temperature: Number(params.temperature ?? env.LIFE_BOOK_PREMIUM_LLM_TEMPERATURE ?? 0.68),
      max_tokens: Number(params.maxTokens || env.LIFE_BOOK_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
    }), Number(params.timeoutMs || env.LIFE_BOOK_PREMIUM_LLM_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
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
      model: clean(params.model || env?.LIFE_BOOK_PREMIUM_WORKERS_AI_MODEL || env?.WORKERS_AI_MODEL),
      errorCode: clean(error?.code || "provider_exception"),
      errorMessage: clean(error?.message || error, 300),
      latencyMs: Date.now() - started,
    };
  }
}

async function callGemini(params, env) {
  const started = Date.now();
  try {
    const result = await generateWithGemini(env, `${params.systemPrompt}\n\n${params.userPrompt}`, {
      modelEnvKeys: ["LIFE_BOOK_PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
      timeoutMs: Number(params.timeoutMs || env?.LIFE_BOOK_PREMIUM_LLM_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || PROVIDER_TIMEOUT_MS),
      maxOutputTokens: Number(params.maxTokens || env?.LIFE_BOOK_PREMIUM_GEMINI_MAX_TOKENS || env?.LIFE_BOOK_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
      temperature: Number(params.temperature ?? env?.LIFE_BOOK_PREMIUM_LLM_TEMPERATURE ?? 0.68),
      requestId: params.requestId,
    });
    if (result?.ok === false) {
      return {
        ok: false,
        provider: "gemini",
        model: clean(result.model || env?.LIFE_BOOK_PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL),
        errorCode: clean(result.error || result.code || "gemini_failed"),
        errorMessage: clean(result.message || "", 300),
        status: Number(result.status || 0) || null,
        latencyMs: Date.now() - started,
      };
    }
    const text = cleanBlock(result?.text || result?.rawText || result?.content || result?.response || "");
    if (!text) return { ok: false, provider: "gemini", model: clean(result?.model || ""), errorCode: "empty_response", latencyMs: Date.now() - started };
    return {
      ok: true,
      text,
      model: clean(result?.model || env?.LIFE_BOOK_PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL || "gemini"),
      provider: "gemini",
      usage: result?.usage,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "gemini",
      model: clean(env?.LIFE_BOOK_PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL),
      errorCode: clean(error?.code || "provider_exception"),
      errorMessage: clean(error?.message || error, 300),
      latencyMs: Date.now() - started,
    };
  }
}

export async function generateLifeBookTextWithLlm(params, env = {}) {
  const provider = clean(params.provider || "workers-ai").toLowerCase();
  if (provider === "gemini") return callGemini(params, env);
  return callWorkersAi(params, env);
}
