// 인생의 책 · 인생 총운 전용 네트워크 계층.
//
// 이 파일이 생긴 이유: 기존 postJson 은 생 fetch 였고 response.status 를 아예 보지 않았다.
// 워커는 정상 진행을 202(생성 중)로, 일시 장애를 503(retryable)로 내려주는데 둘 다 200 과 구분되지
// 않아 ① 결제 성공 후 폼이 영구히 잠기고 ② 일시 장애가 "서버 오류" dead-end 로 굳었다.
//
// 🔴 재시도 중첩 금지: prepare 는 공용 runAccessCheckWithTransientRetry(4회/15초 예산)만 쓰고 그 위에
//    따로 감싸지 않는다. generate 에만 자동 2회를 둔다. result 폴링은 결과 화면이 이미 재시도한다.
import { authFetch } from "@/app/_lib/auth-client";
import { runAccessCheckWithTransientRetry } from "@/app/_lib/consultationResultPolling";

export type LifeBookApiResult<T> = {
  httpStatus: number;
  ok: boolean;
  data: T;
};

// 요청 단위 타임아웃. 벽시계 예산(runAccessCheckWithTransientRetry 의 15초)과는 계층이 다르므로
// 중첩이 아니다 — 다만 개별 타임아웃이 예산보다 짧아야 재시도할 여지가 남는다.
const PREPARE_REQUEST_TIMEOUT_MS = 6000;
// 워커의 한 웨이브는 동시성 4 × 섹션 타임아웃 45초 안에서 끝난다. 여유를 두고 그보다 길게 잡는다.
const GENERATE_REQUEST_TIMEOUT_MS = 70000;
const GENERATE_RETRY_DELAYS_MS = [1200, 2500];

// 재시도해도 결과가 바뀌지 않는 확정 실패. 여기에 든 것을 재시도하면 사용자를 붙잡아 두기만 한다.
const TERMINAL_REASONS = new Set([
  "GENERATION_ALREADY_FAILED",
  "LLM_ERROR",
  "PAYMENT_VERIFY_FAILED",
  "PAYMENT_REQUIRED",
  "LOGIN_REQUIRED",
  "INVALID_INPUT",
  "SAJU_CALCULATION_FAILED",
  "LIFE_FORTUNE_REPORT_INVALID",
]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postLifeBookJson<T>(
  path: string,
  body: Record<string, unknown>,
  idempotencyKey: string,
  timeoutMs: number,
): Promise<LifeBookApiResult<T>> {
  // AbortSignal.timeout 은 iOS 16 미만에서 없다 — 수동 컨트롤러를 쓴다.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await authFetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ ...body, idempotencyKey }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({})) as T;
    return { httpStatus: response.status, ok: response.ok, data };
  } finally {
    clearTimeout(timer);
  }
}

export function isTerminalLifeBookFailure(httpStatus: number, reason: string) {
  if (TERMINAL_REASONS.has(reason)) return true;
  // 409 는 "이미 실패로 확정된 세션". 재시도 대상이 아니다(진행 중 409 는 GENERATION_IN_PROGRESS 로 따로 온다).
  return httpStatus === 409 && reason !== "GENERATION_IN_PROGRESS";
}

type PrepareAttempt<T> = {
  httpStatus: number;
  ok: boolean;
  status: number;
  data: T & { ok?: unknown; reason?: unknown; retryable?: unknown };
};

export async function prepareLifeBook<T>(payload: Record<string, unknown>, idempotencyKey: string) {
  return runAccessCheckWithTransientRetry<PrepareAttempt<T>>(
    async () => {
      const result = await postLifeBookJson<T>("/api/life-book-ai/prepare", payload, idempotencyKey, PREPARE_REQUEST_TIMEOUT_MS);
      return { ...result, status: result.httpStatus } as PrepareAttempt<T>;
    },
  );
}

export type GenerateWaveOutcome = {
  status: "completed" | "generating" | "failed";
  httpStatus: number;
  reason: string;
  message: string;
  progress: { completed: number; total: number } | null;
  data: Record<string, unknown>;
};

/**
 * 워커의 한 웨이브를 돌린다. 전송 실패·5xx 는 **같은 idempotencyKey** 로 자동 2회 재시도한다.
 * 🔴 키를 새로 만들면 이중 결제가 된다 — 워커의 unique index 와 웨이브 락이 중복을 막는 근거가 이 키다.
 */
export async function runGenerateWave(
  payload: Record<string, unknown>,
  idempotencyKey: string,
  access: Record<string, unknown>,
  onRetry?: (attempt: number) => void,
): Promise<GenerateWaveOutcome> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= GENERATE_RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      onRetry?.(attempt);
      await sleep(GENERATE_RETRY_DELAYS_MS[attempt - 1]);
    }
    try {
      const { httpStatus, data } = await postLifeBookJson<Record<string, unknown>>(
        "/api/life-book-ai/generate",
        { ...payload, ...access },
        idempotencyKey,
        GENERATE_REQUEST_TIMEOUT_MS,
      );
      const reason = String(data?.reason || "");
      const message = String(data?.message || "");
      const progress = data?.progress && typeof data.progress === "object"
        ? data.progress as { completed: number; total: number }
        : null;

      if (httpStatus === 200 && data?.status === "completed") {
        return { status: "completed", httpStatus, reason, message, progress, data };
      }
      // 202 = 이 웨이브는 끝났고 남은 섹션이 있다. 409 GENERATION_IN_PROGRESS = 다른 웨이브가 락을 쥐고 있다.
      if (httpStatus === 202 || (httpStatus === 409 && reason === "GENERATION_IN_PROGRESS")) {
        return { status: "generating", httpStatus, reason, message, progress, data };
      }
      if (isTerminalLifeBookFailure(httpStatus, reason)) {
        return { status: "failed", httpStatus, reason, message, progress, data };
      }
      // 5xx·비어 있는 응답은 일시 장애로 보고 재시도한다.
      if (httpStatus >= 500 || !reason) {
        lastError = new Error(message || `life-book generate failed (${httpStatus})`);
        continue;
      }
      return { status: "failed", httpStatus, reason, message, progress, data };
    } catch (error) {
      // 네트워크 순단(TypeError)과 타임아웃(AbortError)만 재시도 대상이다.
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("life-book generate failed");
}
