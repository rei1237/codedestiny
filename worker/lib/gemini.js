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

/**
 * Workers AI 폴백 응답의 수용 문턱.
 *
 * 🔴 실측(2026-07-30, wrangler dev --remote): `@cf/meta/llama-3.3-70b-instruct-fp8-fast` 는
 *    장문 지시에도 `finish_reason: "stop"` 으로 약 840 토큰(≈1,700자)에서 스스로 멈춘다.
 *    maxOutputTokens 를 올려도 늘지 않는다.
 *
 * 그래서 목표 분량이 큰 단일 호출일수록 폴백 결과의 비율이 급락한다(2만자 목표면 8%).
 * 그런 응답을 그대로 통과시키면 라우트의 "경량 보장 계약"(렌더 가능하면 전달)이
 * 8% 분량을 정상 결제 결과로 내보내고 재시도·환불 경로가 사라진다.
 *
 * `fallbackMinChars` 를 주면 폴백 응답이 그 길이에 못 미칠 때 호출 자체를 실패로 돌려,
 * 각 라우트가 이미 갖고 있는 실패 처리(재시도·환급·degrade)를 그대로 타게 한다.
 * Gemini 응답에는 적용하지 않는다 — 기존 동작을 바꾸지 않기 위해서다.
 */
function rejectShortFallback(result, fallbackMinChars) {
  const minChars = Number(fallbackMinChars) || 0;
  if (minChars <= 0) return null;
  if (normalizeProvider(result?.provider) !== "workers-ai") return null;
  const length = clean(result?.text).replace(/\s+/g, "").length;
  if (length >= minChars) return null;
  return {
    ok: false,
    error: "fallback_output_too_short",
    status: 503,
    message: `Workers AI fallback returned ${length} chars (< ${minChars}).`,
    provider: "workers-ai",
    fallbackTooShort: true,
  };
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

    const tooShort = rejectShortFallback(result, options.fallbackMinChars);
    if (tooShort) {
      console.warn("[gemini] workers-ai fallback rejected (too short)", {
        chars: clean(result?.text).replace(/\s+/g, "").length,
        minChars: Number(options.fallbackMinChars) || 0,
        taskType: normalizeTaskType(options),
      });
      return tooShort;
    }

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
