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
    cdAnalyticsReady?: () => void;
    cdTrack?: (eventName: string, params?: Record<string, unknown>) => void;
    cdTrackConfirmedPurchase?: (payload: unknown) => boolean;
    cdTrackFortuneDelivery?: (record: unknown) => void;
    cdTrackFortuneView?: (record: unknown, source: string) => void;
  }
}

// afterInteractive 설치 전의 첫 상세·복원 이벤트만 잠시 보관한다.
// 태그 초기화와 동의 판정은 기존 analytics.js 한 곳에서 수행한다.
const pending: Array<() => void> = [];
let expiry: ReturnType<typeof setTimeout> | undefined;
function whenReady(send: () => void): void {
  if (typeof window === "undefined") return;
  if (window.cdTrack) { send(); return; }
  if (pending.length >= 32) return;
  pending.push(send);
  if (!expiry) expiry = setTimeout(() => { pending.length = 0; expiry = undefined; }, 30000);
  window.cdAnalyticsReady = () => {
    if (expiry) clearTimeout(expiry);
    expiry = undefined;
    pending.splice(0).forEach(deliver => deliver());
  };
}
export function trackFortuneDelivery(record: unknown): void {
  whenReady(() => window.cdTrackFortuneDelivery?.(record));
}
export function trackFortuneView(record: unknown, source: string): void {
  whenReady(() => window.cdTrackFortuneView?.(record, source));
}
export function trackConfirmedPurchase(payload: unknown): void {
  whenReady(() => window.cdTrackConfirmedPurchase?.(payload));
}
export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  whenReady(() => window.cdTrack?.(eventName, params || {}));
}
