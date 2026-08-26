// 타로 오라클 상담의 LLM 어댑터 — 이 라우트를 레포 정본 경로에 연결한다.
//
// 왜 어댑터가 따로 있는가: 상담 생성 로직은 `lib/tarot/oracle-consultation.mjs` 에 있는데, 그
// 파일은 워커 · node(verify 스크립트) · Jest 세 런타임에서 그대로 로드된다. 정본 Gemini 구현은
// `lib/llm-client.ts` 라 **거기서 정적으로 물면 node 는 ERR_UNKNOWN_FILE_EXTENSION 으로 죽고
// Jest 는 moduleNameMapper 가 빗나가 파싱에 실패한다.** 그래서 `.mjs` 는 `callJson` 을 주입받고,
// `.ts` 체인을 무는 것은 워커 전용인 이 파일 하나로 가둔다.
//
// 🔴 책임 분리(CLAUDE.md 원칙 6 — 중첩 사전검사):
//   - **전송 실패 재시도는 여기가 소유**한다(callGeminiJsonWithRetry 의 attempts).
//     `.mjs` 는 callJson 이 주어지면 자신의 백오프 루프를 돌리지 않는다.
//   - **분량 미달 재요청은 `.mjs` 가 소유**한다. 그건 전송이 아니라 내용 판정이라 중첩이 아니다.

import { callGeminiJsonWithRetry } from "./structured-consultation.js";

// 이 라우트는 Gemini 가 죽어도 결과를 내야 하므로 폴백을 켠다. 대신 폴백 응답이 너무 짧으면
// 거절해야 한다 — 안 그러면 8% 분량이 정상 결제 결과로 나간다(gemini.js 의 rejectShortFallback).
// 문턱은 목표 분량에 비례시킨다. 고정 상수를 쓰면 1장 스프레드에서 정상 응답이 거절되고
// 14장에서 미달 응답이 통과한다.
const FALLBACK_MIN_CHARS_RATIO = 0.4;

// 전송 재시도 횟수. `.mjs` 의 총 데드라인(기본 60초) 안에 두 번이 들어가야 한다.
const TRANSPORT_ATTEMPTS = 2;

/**
 * `generateOracleConsultation(input, { callJson })` 에 넘길 어댑터를 만든다.
 *
 * @param {object} env 워커 env (Gemini 키 · AI 바인딩 · 튜닝 노브)
 * @param {{ locale?: string, requestId?: string, targetChars?: number, timeoutMs?: number }} context
 * @returns {(args: { systemPrompt: string, userPrompt: string, maxOutputTokens?: number, timeoutMs?: number }) => Promise<{ok: true, text: string, provider: string, truncated: boolean} | {ok: false, reason: string}>}
 */
export function createOracleConsultationLlm(env, context = {}) {
  const targetChars = Number(context.targetChars) || 0;
  const fallbackMinChars = targetChars > 0 ? Math.round(targetChars * FALLBACK_MIN_CHARS_RATIO) : 0;

  return async function callJson({ systemPrompt, userPrompt, maxOutputTokens, timeoutMs }) {
    const ai = await callGeminiJsonWithRetry(env, userPrompt, {
      attempts: TRANSPORT_ATTEMPTS,
      baseTokens: Number(maxOutputTokens) || 10000,
      capTokens: Number(maxOutputTokens) || 10000,
      responseMimeType: "application/json",
      systemPrompt,
      locale: context.locale || "ko",
      timeoutMs: Number(timeoutMs) || undefined,
      // 🔴 fallbackMinChars 없이 폴백을 켜면 안 된다. ai-and-db.md 의 명시 규약이다.
      fallbackMinChars,
      // 토큰 리포트(scripts/report-llm-token-usage.mjs)가 이 라우트를 라우트별로 집계하게 한다.
      logContext: {
        featureKey: "tarot-prompt-maker",
        serviceId: "tarot-prompt-maker",
        requestId: context.requestId || "",
      },
      // 🔴 컨텍스트 캐시는 주지 않는다 — 카드 조합이 매번 다르고, 유료 상담 결과가 캐시로 새면 안 된다.
    });

    if (!ai?.ok) {
      // 사유를 `llm_` 접두어로 감싸 올린다. 라우트가 이걸 502 응답의 reason 에 그대로 실어
      // DevTools 에서 "폴백이 짧아 거절됨(llm_fallback_output_too_short)" 같은 것이 보이게 한다.
      return { ok: false, reason: `llm_${ai?.error || "unknown"}` };
    }

    return {
      ok: true,
      text: ai.text,
      provider: ai.provider,
      truncated: ai.truncated === true,
    };
  };
}
