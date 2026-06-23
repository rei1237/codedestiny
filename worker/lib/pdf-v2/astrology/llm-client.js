import { callLLM } from "../../../../lib/llm-client.ts";
import { clean } from "./astrology-premium.types.js";

const PROVIDER_TIMEOUT_MS = 120000;

function withTimeout(promise, timeoutMs) {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error("ASTROLOGY_LLM_TIMEOUT");
        error.code = "ASTROLOGY_LLM_TIMEOUT";
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

export function resolveAstrologyLlmProviders(env = {}) {
  const providers = String(env?.ASTROLOGY_PREMIUM_LLM_PROVIDERS || "workers-ai,gemini")
    .split(",")
    .map((item) => clean(item).toLowerCase())
    .filter(Boolean);
  const unique = [];
  for (const provider of providers) {
    if (!unique.includes(provider)) unique.push(provider);
  }
  if (!unique.includes("workers-ai")) unique.unshift("workers-ai");
  if (clean(env?.ASTROLOGY_PREMIUM_DISABLE_GEMINI_FALLBACK).toLowerCase() !== "true" && !unique.includes("gemini")) {
    unique.push("gemini");
  }
  return unique;
}

export function resolveAstrologyModelName(env = {}) {
  return clean(
    env?.ASTROLOGY_PREMIUM_WORKERS_AI_MODEL
    || env?.WORKERS_AI_MODEL
    || env?.ASTROLOGY_PREMIUM_GEMINI_MODEL
    || env?.GEMINI_MODEL
    || "workers-ai-gemini",
  );
}

async function callWorkersAi(params, env) {
  const started = Date.now();
  try {
    const result = await withTimeout(callLLM({
      prompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      temperature: Number(params.temperature ?? env.ASTROLOGY_PREMIUM_LLM_TEMPERATURE ?? 0.68),
      maxTokens: Number(params.maxTokens || env.ASTROLOGY_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
      taskType: "pdf",
    }, env), Number(params.timeoutMs || env.ASTROLOGY_PREMIUM_LLM_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
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
      model: clean(params.model || env?.ASTROLOGY_PREMIUM_WORKERS_AI_MODEL || env?.WORKERS_AI_MODEL),
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
      maxTokens: Number(params.maxTokens || env?.ASTROLOGY_PREMIUM_GEMINI_MAX_TOKENS || env?.ASTROLOGY_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
      temperature: Number(params.temperature ?? env?.ASTROLOGY_PREMIUM_LLM_TEMPERATURE ?? 0.68),
      taskType: "pdf",
    }, env), Number(params.timeoutMs || env?.ASTROLOGY_PREMIUM_LLM_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
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
      model: clean(env?.ASTROLOGY_PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL),
      errorCode: clean(error?.code || "provider_exception"),
      errorMessage: clean(error?.message || error, 300),
      latencyMs: Date.now() - started,
    };
  }
}

export async function generateAstrologyTextWithLlm(params, env = {}) {
  const provider = clean(params.provider || "workers-ai").toLowerCase();
  if (provider === "gemini") return callGemini(params, env);
  return callWorkersAi(params, env);
}
