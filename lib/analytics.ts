/**
 * React 라우트에서 GA4 이벤트를 쏘는 얇은 타입 래퍼.
 *
 * 🔴 여기서 태그를 초기화하지 않는다. gtag 설치와 측정 ID 정본은 js/core/analytics.js 하나이고
 * (정적 셸과 Next 라우트가 함께 로드한다), 이 파일은 그 전역에 타입을 붙여 주는 역할만 한다.
 * React 전용 초기화 경로를 따로 만들면 두 표면이 서로 다른 속성에 쏘게 된다.
 *
 * window.cdTrack 은 측정 ID 가 없거나 형식이 깨졌을 때 no-op 이 되고, 내부에서 예외를 삼킨다.
 * 그래서 호출부는 존재 여부나 실패를 검사할 필요가 없다.
 */

declare global {
  interface Window {
    cdTrack?: (eventName: string, params?: Record<string, unknown>) => void;
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  // analytics.js 는 afterInteractive 로 붙으므로 이른 호출에는 아직 없을 수 있다.
  // 그 창에서 유실되는 이벤트는 버린다 — 큐를 두면 순서가 뒤엉키고 관리 지점만 늘어난다.
  if (typeof window.cdTrack !== "function") return;
  window.cdTrack(eventName, params || {});
}
