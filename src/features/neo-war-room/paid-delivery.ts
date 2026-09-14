import { authFetch } from "@/app/_lib/auth-client";

export async function receiveNeoBriefing<T extends { ok?: boolean; sessionId?: string; status?: string; refinementStatus?: string }>(
  resultId: string,
  onProgress: (data: T) => void,
  isCurrent: () => boolean,
  accessToken = "",
  phase: "briefing" | "refinement" = "briefing",
): Promise<T> {
  let failures = 0;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["x-neo-operation-room-access-token"] = accessToken;
  const completed = (data: T) => data.status === "completed" && (phase === "briefing" || data.refinementStatus === "completed");
  for (let wave = 0; wave < 48; wave += 1) {
    if (!isCurrent()) throw new Error("ACCOUNT_CHANGED");
    if (String(document.visibilityState) === "hidden" || !navigator.onLine) throw new Error("GENERATION_PENDING");
    try {
      let response = await authFetch(`/api/neo-operation-room/result${resultId ? `?attemptId=${encodeURIComponent(resultId)}` : ""}`, { headers });
      let data = await response.json();
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
        data = await response.json();
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
      if (error instanceof Error && ["ACCOUNT_CHANGED", "GENERATION_PENDING", "LOGIN_REQUIRED", "PAYMENT_VERIFY_FAILED", "RESULT_NOT_FOUND", "LLM_ERROR"].includes(error.message)) throw error;
      failures += 1;
    }
    if (failures >= 6) throw new Error("GENERATION_PENDING");
    await new Promise(resolve => window.setTimeout(resolve, 3000));
  }
  throw new Error("GENERATION_PENDING");
}
