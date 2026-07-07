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

    // 성공 응답 중 가장 긴(=가장 완결에 가까운) 후보를 보존한다.
    if (!best || (ai.text?.length || 0) > (best.text?.length || 0)) best = ai;
    // 잘리지 않았으면 완결로 보고 즉시 반환. 잘렸으면 토큰을 올려 재시도.
    if (!ai.truncated) return ai;
    truncationRetries += 1;
  }

  // 잘렸더라도 성공 응답이 하나라도 있으면 가장 긴 후보를 돌려준다(라우트가 degrade 판정).
  return best || lastFailure || { ok: false, error: "llm_failed", status: null, message: "LLM generation failed." };
}
