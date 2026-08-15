import {
  callLLM,
  createGeminiContextCache as createLLMContextCache,
  deleteGeminiContextCache as deleteLLMContextCache,
} from "../../lib/llm-client.ts";
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

/**
 * Gemini 명시적 컨텍스트 캐시를 만든다. 병렬 팬아웃이 공유하는 불변 접두사를 한 벌만
 * 올려 두고 핸들을 받아, 각 호출이 접두사를 정가로 재전송하지 않게 한다.
 *
 * 🔴 systemPrompt·locale 을 callGeminiText 와 **같은 규칙**으로 정규화한다. 캐시에 굽는
 *    systemInstruction 이 나중에 실제로 나갈 값과 한 글자라도 다르면 llm-client 가 캐시를
 *    쓰지 않고 조용히 정가로 보낸다(틀려도 결과는 정상이므로 눈에 띄지 않는다).
 *
 * 실패하면 null 을 돌려준다. 절대 던지지 않는다 — 호출부는 캐시 없이 그대로 진행하면 된다.
 */
export function createGeminiContextCache(env, options = {}) {
  return createLLMContextCache({
    prefix: String(options.prefix || ""),
    systemPrompt: clean(options.systemPrompt),
    locale: clean(options.locale) || getAmbientAiLocale() || undefined,
    model: clean(options.model),
    ttlSeconds: Number(options.ttlSeconds) || undefined,
    timeoutMs: Number(options.timeoutMs) || undefined,
  }, env);
}

/** 다 쓴 컨텍스트 캐시를 지운다. 실패는 삼킨다(TTL 이 안전망). */
export function deleteGeminiContextCache(env, cache) {
  return deleteLLMContextCache(cache, env);
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
      // 비전(멀티모달) 입력. 지정되면 callLLM이 텍스트 파트 대신 이 배열을 그대로 contents로 쓴다.
      // 🔴 Workers AI 폴백은 normalized.prompt만으로 메시지를 만들어 이미지를 버리므로,
      // geminiParts를 쓰는 호출은 반드시 fallbackToWorkersAI:false 를 함께 줘야 한다.
      // (안 그러면 사진 없이 판독을 요구받은 텍스트 모델이 결과를 지어낸다.)
      geminiParts: Array.isArray(options.geminiParts) && options.geminiParts.length
        ? options.geminiParts
        : undefined,
      fallbackToWorkersAI: options.fallbackToWorkersAI === false ? false : undefined,
      logContext: options.logContext && typeof options.logContext === "object" ? options.logContext : undefined,
      cache: options.cache && typeof options.cache === "object" ? options.cache : undefined,
      // Gemini 명시적 컨텍스트 캐시 핸들(createGeminiContextCache 반환값). 위 `cache`(응답 캐시)와
      // 다른 것이다. prompt 는 접두사를 포함한 전체로 두고, 접두사 제거는 llm-client 가 전송
      // 직전에만 한다 — Workers AI 폴백과 응답 캐시 키가 전체 프롬프트를 그대로 봐야 한다.
      geminiCachedContent: options.geminiCachedContent && typeof options.geminiCachedContent === "object"
        ? options.geminiCachedContent
        : undefined,
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
