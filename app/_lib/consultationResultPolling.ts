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

// 선검사(ensure-access/prepare) 단계는 폴링과 달리 완충이 없어, 일시적 503(DB_DEGRADED 등)이
// 그대로 "이용권 확인 실패"로 굳어졌다(간헐적으로 "안 되다가 갑자기 됨"의 원인). 폴링과 동일한
// 재시도 판정(isRetriableResultPollFailure)을 재사용해, 일시적 실패에만 바운디드 백오프로 재시도한다.
// 확정 실패(PAYMENT_REQUIRED·LOGIN_REQUIRED·INVALID_INPUT 등)와 성공은 즉시 반환한다.
// 호출부마다 응답 래퍼가 조금씩 다르므로(status 톱레벨 vs response.status) 둘 다 수용한다.
export type AccessCheckAttemptResult = {
  status?: number;
  response?: { status?: number; ok?: boolean };
  data?: { ok?: unknown; reason?: unknown; retryable?: unknown } | null;
};

function readAttemptStatus(result: AccessCheckAttemptResult | null | undefined): number {
  return result?.response?.status ?? result?.status ?? 0;
}

export async function runAccessCheckWithTransientRetry<T extends AccessCheckAttemptResult>(
  attempt: (attemptIndex: number) => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    onRetry?: (info: { attempt: number; delayMs: number }) => void;
  } = {},
): Promise<T> {
  const maxAttempts = Math.max(1, Math.min(6, Math.floor(options.maxAttempts ?? 4)));
  const baseDelayMs = Math.max(0, Math.floor(options.baseDelayMs ?? 900));
  let last = await attempt(0);
  for (let i = 1; i < maxAttempts; i += 1) {
    if (last?.data && (last.data as { ok?: unknown }).ok === true) return last;
    // 일시적 실패가 아니면(확정 실패/성공) 재시도하지 않는다.
    if (!isRetriableResultPollFailure(readAttemptStatus(last), last?.data ?? null)) return last;
    const delayMs = Math.round(baseDelayMs * Math.pow(1.8, i - 1));
    options.onRetry?.({ attempt: i, delayMs });
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    last = await attempt(i);
  }
  return last;
}
