/** 공용 결제 게이트 헬퍼 — Crossroads·LifeVoyage 공유(정본 흐름 일관화). */

/** AUTH_REQUIRED면 로그인 화면으로 유도하고 true 반환(호출부는 즉시 return). */
export function redirectToLoginOnAuthRequired(code: string): boolean {
  if (code !== "AUTH_REQUIRED") return false;
  if (typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.setTimeout(() => {
      window.location.href = `/login?next=${next}`;
    }, 600);
  }
  return true;
}

/** 게이트 요청 식별자(클릭당 유니크, 멱등 재시도 병합용). */
export function makeGateRequestId(featureKey: string): string {
  return `${featureKey}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
