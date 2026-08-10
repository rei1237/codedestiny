// 전문가 상담 결과 폴링에서 "일시적 장애(재시도해야 함)"와 "확정 실패(종료)"를 구분하는 공용 판정.
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

// 선검사 전체(첫 시도 + 재시도 + 백오프)에 걸리는 벽시계 상한. 정적 셸의 CD_PASS_FIRST_BUDGET_MS 와 같은 값이다.
// 이 상한이 없던 동안: authFetch에는 요청 타임아웃이 없고(타임아웃을 씌우는 건 billing-client 뿐) 재시도도
// 횟수로만 묶여 있어, 서버가 느려지면 "이용권 확인 중"이 수십 초씩 붙잡혔다. 확인이 늦어질 때는 붙잡는 것보다
// 결제창을 먼저 열어주는 편이 낫다 — 결제창에 '이용권 다시 확인'이 있어 dead-end가 아니다.
// 6000은 짧았다 — 서버 pass 판정이 Mongo 왕복 여러 번이라 정상 응답도 잘려 이용권 보유자가
// 결제창으로 새는 일이 생겼다(2026-07-29). 붙잡히는 느낌은 2.5초 시점의 상태 전환이 완화한다.
export const PASS_CHECK_BUDGET_MS = 15000;
export const PASS_CHECK_BUDGET_EXCEEDED_REASON = "PASS_CHECK_BUDGET_EXCEEDED";

// 예산 초과는 "확정 실패"가 아니라 "일시적 지연"으로 표면화한다(503 + retryable). 호출부의 기존 degraded
// 분기(isRetriableResultPollFailure)가 그대로 받아 결제창(단건+월정석)으로 폴백한다.
function buildAccessCheckBudgetExceeded<T>(): T {
  return {
    status: 503,
    response: { status: 503, ok: false },
    data: { ok: false, reason: PASS_CHECK_BUDGET_EXCEEDED_REASON, retryable: true },
  } as unknown as T;
}

export async function runAccessCheckWithTransientRetry<T extends AccessCheckAttemptResult>(
  attempt: (attemptIndex: number) => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    budgetMs?: number;
    onRetry?: (info: { attempt: number; delayMs: number }) => void;
  } = {},
): Promise<T> {
  const maxAttempts = Math.max(1, Math.min(6, Math.floor(options.maxAttempts ?? 4)));
  // 백오프도 정적 셸과 같은 값(250 → 450ms)으로 맞춘다. 기존 900 → 1.62s → 2.9s 는 예산 6초를 혼자 다 먹었다.
  const baseDelayMs = Math.max(0, Math.floor(options.baseDelayMs ?? 250));
  const budgetMs = Math.max(0, Math.floor(options.budgetMs ?? PASS_CHECK_BUDGET_MS));
  const deadline = budgetMs > 0 ? Date.now() + budgetMs : Number.POSITIVE_INFINITY;

  const attemptWithinBudget = async (attemptIndex: number): Promise<T> => {
    if (!Number.isFinite(deadline)) return attempt(attemptIndex);
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) return buildAccessCheckBudgetExceeded<T>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        attempt(attemptIndex),
        new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve(buildAccessCheckBudgetExceeded<T>()), remainingMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  let last = await attemptWithinBudget(0);
  for (let i = 1; i < maxAttempts; i += 1) {
    if (last?.data && (last.data as { ok?: unknown }).ok === true) return last;
    // A budget timeout cannot cancel an arbitrary caller promise. Do not launch
    // another attempt while the timed-out request may still be settling.
    if (last?.data && (last.data as { reason?: unknown }).reason === PASS_CHECK_BUDGET_EXCEEDED_REASON) return last;
    // 일시적 실패가 아니면(확정 실패/성공) 재시도하지 않는다.
    if (!isRetriableResultPollFailure(readAttemptStatus(last), last?.data ?? null)) return last;
    // 지수 백오프에 완전 지터(0~100% 랜덤)를 곱한다 — 동시에 실패한 여러 사용자가 정확히 같은
    // 시점에 함께 재시도하면(동기화된 재시도 파도) 막 회복 중인 풀을 다시 포화시킨다. 상한
    // (baseDelayMs * 1.8^(i-1))은 그대로라 개별 사용자의 예산 안 시도 횟수는 줄지 않는다.
    const delayMs = Math.round(Math.random() * baseDelayMs * Math.pow(1.8, i - 1));
    // 다음 시도를 예산 안에 넣을 수 없으면 기다리지 않고 지금 결과로 끝낸다.
    if (Date.now() + delayMs >= deadline) return last;
    options.onRetry?.({ attempt: i, delayMs });
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    last = await attemptWithinBudget(i);
  }
  return last;
}
