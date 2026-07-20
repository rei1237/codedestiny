/**
 * 요청 안에서 LLM 생성을 끝까지 기다리는(동기) 라우트의 타임아웃 상한.
 *
 * 9850c890 에서 astrology-ai·love-secret-ai·new-year-ai·ziwei-ai·naming-prompt·
 * fortune-tea-house·fortune 을 waitUntil 백그라운드에서 동기 생성으로 되돌렸다
 * (Workers 요청 간 I/O 격리 때문에 폴링 결과가 고착되던 문제). 그때 같은 커밋이
 * "장시간 라우트는 100s(524) 초과라 현행 유지"라고 적어 둔 그 100초가 여기서도 그대로
 * 적용되는데, 옮겨온 라우트들의 LLM 타임아웃은 150초로 남아 있었다.
 *
 * 그 조합이면 느린 생성에서 라우트가 스스로 판단을 내리기 전에 엣지가 요청을 끊는다.
 * 사용자는 결제까지 마친 뒤 503 재시도 안내 대신 정체불명의 오류를 보게 되고,
 * 라우트의 실패 처리(생성 실패 표시·접근권 복원)도 실행되지 못한다.
 *
 * 그래서 동기 라우트의 LLM 대기는 엣지 한계보다 먼저 끝나야 한다. 남은 여유는
 * 인증·DB·프롬프트 구성·후처리에 쓰인다.
 */

/** Cloudflare 가 응답 없는 요청을 끊는 지점. */
export const EDGE_RESPONSE_DEADLINE_MS = 100000;

/** LLM 대기에 허용하는 최대치. 나머지는 요청의 앞뒤 작업 몫이다. */
export const SYNC_LLM_TIMEOUT_CEILING_MS = 85000;

/**
 * 동기 라우트의 LLM 타임아웃을 엣지 한계 안쪽으로 맞춘다.
 * env 로 더 짧게 주는 것은 그대로 존중하고, 더 길게 주는 것만 깎는다.
 */
export function clampSyncLlmTimeoutMs(timeoutMs, fallbackMs = SYNC_LLM_TIMEOUT_CEILING_MS) {
  const requested = Number(timeoutMs);
  if (!Number.isFinite(requested) || requested <= 0) return Math.min(fallbackMs, SYNC_LLM_TIMEOUT_CEILING_MS);
  return Math.min(requested, SYNC_LLM_TIMEOUT_CEILING_MS);
}
