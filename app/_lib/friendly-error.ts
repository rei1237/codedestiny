/**
 * 사용자에게 보여줄 에러 메시지 정규화 헬퍼.
 * 서버/코드가 만든 한국어 안내문은 그대로 노출하고,
 * "Failed to fetch" 같은 기술 원문은 콘솔에만 남기고 폴백 문구로 대체한다.
 */
export function friendlyErrorMessage(caught: unknown, fallback: string): string {
  if (caught instanceof Error && caught.message) {
    if (/[가-힣]/.test(caught.message)) return caught.message;
    console.error("[friendly-error] technical error hidden from user:", caught);
  }
  return fallback;
}
