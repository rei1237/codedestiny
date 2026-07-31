/**
 * 개발 환경 전용 LLM 프리뷰 모드 공용 유틸.
 * NODE_ENV==="production"이면 항상 null을 반환해 실사용 경로에 영향을 주지 않는다.
 */
/**
 * "legacy" = 구 스키마로 저장된 결과가 지금 화면에서도 정상 렌더되는지 확인하는 상태.
 * 이 값을 다루지 않는 기존 픽스처들은 기본 분기(success 페이로드)로 떨어지므로 안전하다.
 */
export type DevPreviewState = "success" | "truncated" | "failed" | "legacy";

const DEV_PREVIEW_STATES: readonly DevPreviewState[] = ["success", "truncated", "failed", "legacy"];

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
