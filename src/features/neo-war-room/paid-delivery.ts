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
        if (!data.retryable) throw new Error(data.reason || "LLM_ERROR");
        failures += 1;
      }
    } catch (error) {
      const denied = paymentSurface === "toss" ? neoTossAccessError(error) : "";
      if (denied) throw new Error(denied);
      if (error instanceof Error && ["ACCOUNT_CHANGED", "GENERATION_PENDING", "LOGIN_REQUIRED", "PAYMENT_VERIFY_FAILED", "RESULT_NOT_FOUND", "LLM_ERROR", "ORDER_REFUNDED", "ORDER_MISMATCH", "REQUEST_INPUT_MISMATCH", ...(paymentSurface === "toss" ? ["ACCESS_DENIED", "TOSS_ACCESS_DENIED", "ORDER_NOT_PAID", "ORDER_OWNERSHIP_MISMATCH", "PAYMENT_REVOKED", "RESULT_NOT_AVAILABLE"] : [])].includes(error.message)) throw error;
      failures += 1;
    }
    if (failures >= 6) throw new Error("GENERATION_PENDING");
    await new Promise(resolve => window.setTimeout(resolve, 3000));
  }
  throw new Error("GENERATION_PENDING");
}
