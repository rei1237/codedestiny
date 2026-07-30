// 구조화(JSON) LLM 상담 생성의 "잘림 반응형 재시도"를 한 곳에 모은다.
// 운명의 찻집(worker/routes/fortune-tea-house.js)이 안정적으로 쓰는 패턴 중
// 라우트-비종속 부분만 일반화했다:
//   - responseMimeType:"application/json" 강제(모델이 코드펜스/서론으로 토큰 낭비하는 것을 막음)
//   - 응답이 잘리면(ai.truncated) 다음 시도에서 출력 토큰을 올려 재생성
//   - 성공 응답 중 가장 긴(=가장 완결된) 후보를 보존해 반환
// 각 라우트의 파싱/repair/degrade 파이프라인은 그대로 두고, "첫 생성이 잘리지 않게"만 보장한다.
// 반환 형태는 callGeminiText와 동일해 드롭인 교체가 가능하다.

import { callGeminiText } from "./gemini.js";

/**
 * Workers AI 폴백 응답의 JSON 정화.
 *
 * 🔴 Gemini 는 responseMimeType 으로 순수 JSON 을 보장하지만 Workers AI 는 모델마다 다르다.
 *    체인 1차(`@cf/zai-org/*`)는 `response_format: json_object` 를 받아 순수 JSON 을 주지만,
 *    2차 `@cf/meta/*` 는 스키마 없는 JSON Mode 를 못 받아 종전대로 프롬프트 의존이다.
 *    실측(2026-07-30, 70B)에서 코드펜스·앞뒤 설명문이 섞여 와 엄격한 JSON.parse 는 실패하고
 *    관대한 파싱만 성공했다. 순수 JSON 이 오면 이 정화는 무해한 no-op 이다.
 *
 * 라우트마다 파서를 고치는 대신 여기서 한 번 정화해, 폴백이 켜진 모든 구조화 상담이
 * 라우트 수정 없이 폴백 응답을 파싱할 수 있게 한다. Gemini 응답은 건드리지 않는다.
 */
function sanitizeFallbackJsonText(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return raw;
  const withoutFence = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  // 이미 JSON 으로 시작하면 그대로 둔다(불필요한 슬라이스로 배열 응답을 깨뜨리지 않는다).
  if (withoutFence.startsWith("{") || withoutFence.startsWith("[")) return withoutFence;
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end <= start) return withoutFence;
  return withoutFence.slice(start, end + 1);
}

/**
 * @param {object} env
 * @param {string | ((attempt: number, prevBest: object|null) => string)} buildPrompt
 * @param {{
 *   attempts?: number,
 *   baseTokens: number,
 *   capTokens?: number,
 *   responseMimeType?: string,
 *   temperature?: number | ((attempt: number) => number),
 *   systemPrompt?: string,
 *   taskType?: string,
 *   timeoutMs?: number,
 *   fallbackToWorkersAI?: boolean,
 *   cache?: object,
 *   logContext?: object,
 * }} opts
 * @returns {Promise<{ ok: boolean, text?: string, model?: string, provider?: string, truncated?: boolean, finishReason?: string, error?: string, status?: number|null, message?: string }>}
 */
export async function callGeminiJsonWithRetry(env, buildPrompt, opts = {}) {
  const {
    attempts = 3,
    baseTokens,
    capTokens,
    responseMimeType = "application/json",
    temperature,
    ...rest
  } = opts;

  const cap = Number(capTokens) || Number(baseTokens) || 0;
  let truncationRetries = 0;
  let best = null;
  let lastFailure = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const scaled = Math.round(Number(baseTokens) * (1 + 0.3 * truncationRetries));
    const maxOutputTokens = cap > 0 ? Math.min(cap, scaled) : scaled;
    const prompt = typeof buildPrompt === "function" ? buildPrompt(attempt, best) : buildPrompt;

    const ai = await callGeminiText(env, prompt, {
      ...rest,
      ...(responseMimeType ? { responseMimeType } : {}),
      temperature: typeof temperature === "function" ? temperature(attempt) : temperature,
      maxOutputTokens,
    });

    if (!ai?.ok) {
      lastFailure = ai;
      continue;
    }

    // Workers AI 폴백은 모델에 따라 코드펜스·설명문이 섞여 온다(@cf/meta/* 계열) —
    // 라우트가 그대로 JSON.parse 할 수 있게 여기서 정화한다(Gemini 응답은 그대로).
    if (responseMimeType && ai.provider === "workers-ai") {
      ai.text = sanitizeFallbackJsonText(ai.text);
    }

    // 성공 응답 중 가장 긴(=가장 완결에 가까운) 후보를 보존한다.
    if (!best || (ai.text?.length || 0) > (best.text?.length || 0)) best = ai;
    // 잘리지 않았으면 완결로 보고 즉시 반환. 잘렸으면 토큰을 올려 재시도.
    if (!ai.truncated) return ai;
    truncationRetries += 1;
  }

  // 잘렸더라도 성공 응답이 하나라도 있으면 가장 긴 후보를 돌려준다(라우트가 degrade 판정).
  return best || lastFailure || { ok: false, error: "llm_failed", status: null, message: "LLM generation failed." };
}
