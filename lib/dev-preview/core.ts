/**
 * 개발 환경 전용 LLM 프리뷰 모드 공용 유틸.
 * NODE_ENV==="production"이면 항상 null을 반환해 실사용 경로에 영향을 주지 않는다.
 */
export type DevPreviewState = "success" | "truncated" | "failed";

const DEV_PREVIEW_STATES: readonly DevPreviewState[] = ["success", "truncated", "failed"];

export function readDevPreviewState(): DevPreviewState | null {
  if (process.env.NODE_ENV === "production") return null;
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("preview");
  return (DEV_PREVIEW_STATES as readonly string[]).includes(raw ?? "")
    ? (raw as DevPreviewState)
    : null;
}

export function buildDevPreviewResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
