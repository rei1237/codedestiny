import { callLLM } from "../../lib/llm-client.ts";
import { getAmbientAiLocale } from "./ai-locale-context.js";

function clean(value, maxLength = 0) {
  const text = String(value || "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function normalizeTaskType(options = {}) {
  const taskType = clean(options.taskType).toLowerCase();
  if (taskType === "pdf" || taskType === "fortune" || taskType === "healing" || taskType === "general") {
    return taskType;
  }
  return "fortune";
}

function normalizeProvider(provider) {
  return provider === "cloudflare" ? "workers-ai" : provider;
}

function toFailure(error, fallbackError = "llm_failed") {
  return {
    ok: false,
    error: clean(error?.code || fallbackError),
    status: Number(error?.status || 0) || null,
    message: clean(error?.message || error || fallbackError, 500),
  };
}

export function pickGeminiKeys() {
  return [
    "GEMINIF_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_GEMINI_API_KEY",
  ];
}

export function pickGeminiModels() {
  return ["gemini-2.5-flash"];
}

export function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => clean(part?.text)).filter(Boolean).join("\n").trim();
}

export async function callGeminiText(env, prompt, options = {}) {
  const textPrompt = clean(prompt);
  if (!textPrompt) {
    return { ok: false, error: "empty_prompt", message: "Gemini prompt is empty." };
  }

  try {
    const result = await callLLM({
      prompt: textPrompt,
      systemPrompt: clean(options.systemPrompt),
      // 명시값 > 앰비언트. 라우트가 직접 넘기면 그게 이기고, 없으면 요청 스코프에서 가져온다.
      locale: clean(options.locale) || getAmbientAiLocale() || undefined,
      maxTokens: Number(options.maxOutputTokens || options.maxTokens) || undefined,
      temperature: Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : undefined,
      taskType: normalizeTaskType(options),
      model: clean(options.model),
      timeoutMs: Number(options.timeoutMs || 0) || undefined,
      responseMimeType: clean(options.responseMimeType) || undefined,
      thinkingBudget: Number.isFinite(Number(options.thinkingBudget)) ? Number(options.thinkingBudget) : undefined,
      apiEndpoint: clean(options.apiEndpoint || options.endpoint),
      fallbackToWorkersAI: options.fallbackToWorkersAI === false ? false : undefined,
      logContext: options.logContext && typeof options.logContext === "object" ? options.logContext : undefined,
      cache: options.cache && typeof options.cache === "object" ? options.cache : undefined,
    }, env);

    return {
      ok: true,
      text: result.text,
      model: result.model,
      provider: normalizeProvider(result.provider),
      truncated: result.truncated === true,
      finishReason: clean(result.finishReason, 40),
    };
  } catch (error) {
    return toFailure(error);
  }
}
