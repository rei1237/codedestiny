import { authFetch } from "@/app/_lib/auth-client";

export function neoTossAccessError(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const issue = value as { status?: number; code?: string; reason?: string; error?: string; message?: string };
  if (issue.status === 401) return "LOGIN_REQUIRED";
  if (issue.status === 403) return "ACCESS_DENIED";
  const codes = [issue.code, issue.reason, issue.error, issue.message];
  if (codes.some(code => ["LOGIN_REQUIRED", "SESSION_EXPIRED", "TOSS_LOGIN_REQUIRED"].includes(code || ""))) return "LOGIN_REQUIRED";
  return codes.find(code => ["ACCESS_DENIED", "TOSS_ACCESS_DENIED", "ORDER_REFUNDED", "ORDER_NOT_PAID", "ORDER_MISMATCH", "ORDER_OWNERSHIP_MISMATCH", "REQUEST_INPUT_MISMATCH", "PAYMENT_VERIFY_FAILED", "PAYMENT_REVOKED", "RESULT_NOT_AVAILABLE"].includes(code || "")) || "";
}

/** 수정 라운드가 서버에서 실패로 끝났고(포함 횟수 미차감) 같은 답변으로 다시 요청할 수 있는가(2026-11-19). */
export function neoRefinementRetryable(session: { status?: string; refinementStatus?: string; refinementAllowance?: { remaining?: number } | null } | null | undefined): boolean {
  return Boolean(session && session.status === "completed" && session.refinementStatus === "generation_failed" && session.refinementAllowance?.remaining !== 0);
}

export type NeoRetryOffer = { sessionId: string };

/** 1차 브리핑 실패에 서버가 무료 다시 시도(같은 결제 건·추가 결제·차감 없음)를 열었으면 그 상담 id 를 돌려준다(2026-11-19 R2b). 최상위 retryable(일시 오류)과 다르다. */
export function readNeoRetryOffer(data: unknown): NeoRetryOffer | null {
  if (!data || typeof data !== "object") return null;
  const value = data as { sessionId?: unknown; retry?: { available?: unknown; sessionId?: unknown } | null };
  if (value.retry?.available !== true) return null;
  const sessionId = String(value.retry.sessionId || value.sessionId || "");
  return sessionId ? { sessionId } : null;
}

export async function receiveNeoBriefing<T extends { ok?: boolean; sessionId?: string; status?: string; refinementStatus?: string }>(
  resultId: string,
  onProgress: (data: T) => void,
  isCurrent: () => boolean,
  accessToken = "",
  phase: "briefing" | "refinement" = "briefing",
  paymentSurface: "web" | "toss" = "web",
): Promise<T> {
  let failures = 0;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["x-neo-operation-room-access-token"] = accessToken;
  const deny = (response: Response, data?: unknown) => {
    if (paymentSurface !== "toss") return;
    const code = neoTossAccessError({ status: response.status }) || neoTossAccessError(data);
    if (code) throw new Error(code);
  };
  const completed = (data: T) => data.status === "completed" && (phase === "briefing" || data.refinementStatus === "completed");
  for (let wave = 0; wave < 48; wave += 1) {
    if (!isCurrent()) throw new Error("ACCOUNT_CHANGED");
    if (String(document.visibilityState) === "hidden" || !navigator.onLine) throw new Error("GENERATION_PENDING");
    try {
      let response = await authFetch(`/api/neo-operation-room/result${resultId ? `?attemptId=${encodeURIComponent(resultId)}` : ""}`, { headers });
      deny(response);
      let data = await response.json();
      deny(response, data);
      if (!isCurrent()) throw new Error("ACCOUNT_CHANGED");
      if (response.ok && data.ok && completed(data)) return data as T;
      if (phase === "refinement" && data.refinementStatus === "generation_failed") throw new Error("LLM_ERROR");
      if ((response.status === 202 || (phase === "refinement" && data.refinementStatus === "generating")) && data.sessionId) {
        resultId = data.sessionId;
        onProgress(data as T);
        if (String(document.visibilityState) === "hidden" || !navigator.onLine) throw new Error("GENERATION_PENDING");
        response = await authFetch(`/api/neo-operation-room/${phase === "refinement" ? "refine" : "start"}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: resultId }),
        });
        deny(response);
        data = await response.json();
        deny(response, data);
        if (!isCurrent()) throw new Error("ACCOUNT_CHANGED");
        if (response.ok && data.ok) {
          onProgress(data as T);
          failures = 0;
          if (completed(data)) return data as T;
        }
      }
      if (!response.ok) {
        if (response.status === 401) throw new Error("LOGIN_REQUIRED");
        if (!data.retryable) throw Object.assign(new Error(data.reason || "LLM_ERROR"), { retryOffer: phase === "briefing" ? readNeoRetryOffer(data) : null });
        failures += 1;
      }
    } catch (error) {
      const denied = paymentSurface === "toss" ? neoTossAccessError(error) : "";
      if (denied) throw new Error(denied);
      if (error instanceof Error && ["ACCOUNT_CHANGED", "GENERATION_PENDING", "LOGIN_REQUIRED", "PAYMENT_VERIFY_FAILED", "RESULT_NOT_FOUND", "LLM_ERROR", "CALCULATION_ERROR", "ORDER_REFUNDED", "ORDER_MISMATCH", "REQUEST_INPUT_MISMATCH", ...(paymentSurface === "toss" ? ["ACCESS_DENIED", "TOSS_ACCESS_DENIED", "ORDER_NOT_PAID", "ORDER_OWNERSHIP_MISMATCH", "PAYMENT_REVOKED", "RESULT_NOT_AVAILABLE"] : [])].includes(error.message)) throw error;
      failures += 1;
    }
    if (failures >= 6) throw new Error("GENERATION_PENDING");
    await new Promise(resolve => window.setTimeout(resolve, 3000));
  }
  throw new Error("GENERATION_PENDING");
}
