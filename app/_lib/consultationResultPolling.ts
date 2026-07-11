// AI 상담 결과 폴링에서 "일시적 장애(재시도해야 함)"와 "확정 실패(종료)"를 구분하는 공용 판정.
//
// 서버(worker/routes/*-ai.js)는 인증 조회/DB 일시 장애를 재시도 가능한 503(reason: DB_DEGRADED)으로 내려준다.
// 클라의 authFetch(app/_lib/auth-client.ts)는 세션 리프레시가 일시 실패한 401을
// 합성 503(reason: AUTH_REFRESH_TEMPORARY_FAILURE)으로 바꿔준다.
// 운명 찻집은 접근 확인 지연을 ACCESS_CHECK_DEGRADED 503으로 흘려보낸다.
//
// 이 세 경우는 "잠깐의 블립"이므로 하드 종료하지 말고 폴링 캡까지 계속 재시도해 자가 복구해야 한다.
// (네오가 이 완충 없이 401을 삼켜 92%에 고착됐던 문제와 동일 계열.)
// 그 외의 비정상 응답(확정 401·409·500 등)은 기존대로 종료한다.

const RETRYABLE_POLL_REASONS = new Set([
  "DB_DEGRADED",
  "AUTH_REFRESH_TEMPORARY_FAILURE",
  "ACCESS_CHECK_DEGRADED",
]);

export function isRetriableResultPollFailure(
  status: number,
  payload?: { retryable?: unknown; reason?: unknown } | null,
): boolean {
  if (status === 503) return true;
  if (payload && payload.retryable === true) return true;
  const reason = payload && typeof payload.reason === "string" ? payload.reason : "";
  return RETRYABLE_POLL_REASONS.has(reason);
}
