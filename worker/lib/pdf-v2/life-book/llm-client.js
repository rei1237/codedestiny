import { callLLM } from "../../../../lib/llm-client.ts";
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

function normalizeProviderErrorCode(error, fallback = "provider_exception") {
  const message = clean(error?.message || error, 300);
  if (/Workers AI binding is not configured/i.test(message)) return "workers_ai_not_configured";
  return clean(error?.code || fallback);
}

export function resolveLifeBookLlmProviders(env = {}) {
  const providers = String(env?.LIFE_BOOK_PREMIUM_LLM_PROVIDERS || "gemini,workers-ai")
    .split(",")
    .map((item) => clean(item).toLowerCase())
    .filter(Boolean);
  const unique = [];
  for (const provider of providers) {
    if (!unique.includes(provider)) unique.push(provider);
  }
  const geminiDisabled = clean(env?.LIFE_BOOK_PREMIUM_DISABLE_GEMINI_FALLBACK).toLowerCase() === "true";
  if (!geminiDisabled && !unique.includes("gemini")) {
    unique.unshift("gemini");
  }
  if (!unique.includes("workers-ai")) unique.push("workers-ai");
  return unique;
}

export function resolveLifeBookModelName(env = {}, provider = "gemini") {
  const normalizedProvider = clean(provider).toLowerCase();
  if (normalizedProvider === "workers-ai" || normalizedProvider === "workersai") {
    return clean(env?.LIFE_BOOK_PREMIUM_WORKERS_AI_MODEL || env?.WORKERS_AI_MODEL);
  }
  return clean(
    env?.LIFE_BOOK_PREMIUM_GEMINI_MODEL
    || env?.GEMINI_MODEL
    || "gemini-2.5-flash",
  );
}

async function callWorkersAi(params, env) {
  const started = Date.now();
  try {
    const result = await withTimeout(callLLM({
      prompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      model: clean(params.model),
      temperature: Number(params.temperature ?? env.LIFE_BOOK_PREMIUM_LLM_TEMPERATURE ?? 0.68),
      maxTokens: Number(params.maxTokens || env.LIFE_BOOK_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
      taskType: "pdf",
    }, env), Number(params.timeoutMs || env.LIFE_BOOK_PREMIUM_LLM_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
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
      model: clean(params.model || env?.LIFE_BOOK_PREMIUM_WORKERS_AI_MODEL || env?.WORKERS_AI_MODEL),
      errorCode: normalizeProviderErrorCode(error),
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
      model: clean(params.model || env?.LIFE_BOOK_PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL || "gemini-2.5-flash"),
      maxTokens: Number(params.maxTokens || env?.LIFE_BOOK_PREMIUM_GEMINI_MAX_TOKENS || env?.LIFE_BOOK_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
      temperature: Number(params.temperature ?? env?.LIFE_BOOK_PREMIUM_LLM_TEMPERATURE ?? 0.68),
      taskType: "pdf",
    }, env), Number(params.timeoutMs || env?.LIFE_BOOK_PREMIUM_LLM_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
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
      model: clean(env?.LIFE_BOOK_PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL),
      errorCode: normalizeProviderErrorCode(error),
      errorMessage: clean(error?.message || error, 300),
      latencyMs: Date.now() - started,
    };
  }
}

export async function generateLifeBookTextWithLlm(params, env = {}) {
  const provider = clean(params.provider || "gemini").toLowerCase();
  if (provider === "gemini") return callGemini(params, env);
  return callWorkersAi(params, env);
}
