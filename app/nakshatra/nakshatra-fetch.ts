"use client";

// 나크샤트라 유료 기능의 "결제 뒤 본문 요청" 공용 배선.
//
// 🔴 이 저장소의 API 는 Mongo 일시 장애를 재시도 가능한 503(reason: DB_DEGRADED)으로 내려주고,
//    authFetch 는 세션 리프레시 일시 실패를 합성 503으로 바꿔 준다. 그 블립을 그대로 실패로
//    굳히면 회당결제 기능에서는 **돈만 나가고 결과가 없다**(재시도 = 재결제).
//
// 판정·백오프는 이미 9개 기능이 쓰는 공용 유틸을 그대로 쓴다 —
// app/_lib/consultationResultPolling.ts (isRetriableResultPollFailure / runAccessCheckWithTransientRetry).
// 나크샤트라만 이 완충 없이 만들어져 있었다.

import { authFetch } from "@/app/_lib/auth-client";
import {
  isRetriableResultPollFailure,
  runAccessCheckWithTransientRetry,
} from "@/app/_lib/consultationResultPolling";

export type NakshatraFetchResult = {
  status: number;
  response: { status: number; ok: boolean };
  data: Record<string, unknown>;
  /** 재시도를 다 쓰고도 일시 장애로 끝났는가 — 호출부가 "다시 시도" 버튼을 띄울 근거. */
  transient: boolean;
};

// 결제가 이미 끝난 뒤의 요청이라 선검사(15초)보다 넉넉히 준다. 사용자를 조금 더 기다리게 하는 편이
// 결제만 하고 결과를 못 받는 것보다 낫다.
const PAID_BODY_BUDGET_MS = 30000;
const PAID_BODY_MAX_ATTEMPTS = 5;

/**
 * 결제 완료 뒤 본문을 받아 오는 POST. 일시적 503/네트워크 블립은 백오프로 자동 재시도한다.
 * 확정 실패(401·402·400 등)는 즉시 돌려준다.
 */
export async function postPaidBody(
  endpoint: string,
  body: Record<string, unknown>,
  options: { budgetMs?: number; maxAttempts?: number } = {},
): Promise<NakshatraFetchResult> {
  const result = await runAccessCheckWithTransientRetry<NakshatraFetchResult>(
    async () => {
      try {
        const response = await authFetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        return {
          status: response.status,
          response: { status: response.status, ok: response.ok },
          data,
          transient: false,
        };
      } catch {
        // 네트워크 단절도 일시 장애다 — 503 으로 표면화해 공용 판정이 재시도하게 한다.
        return {
          status: 503,
          response: { status: 503, ok: false },
          data: { ok: false, reason: "DB_DEGRADED", retryable: true },
          transient: false,
        };
      }
    },
    {
      maxAttempts: options.maxAttempts ?? PAID_BODY_MAX_ATTEMPTS,
      budgetMs: options.budgetMs ?? PAID_BODY_BUDGET_MS,
      baseDelayMs: 600,
    },
  );

  return { ...result, transient: isRetriableResultPollFailure(result.status, result.data) };
}

export { isRetriableResultPollFailure };
