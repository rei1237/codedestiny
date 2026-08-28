"use client";

import { trackEvent } from "../../lib/analytics";

/**
 * 마케팅 핵심 이벤트를 한 줄로 쏘는 훅.
 *
 * 🔴 여기서 태그를 초기화하지 않는다. gtag 설치 정본은 js/core/analytics.js 하나이고
 * app/layout.js 가 afterInteractive 로 이미 붙인다. 훅이 자체 초기화를 하면 같은 방문이
 * 두 번 집계된다. 발화는 전부 lib/analytics.ts 의 trackEvent 를 거치므로 이 파일은
 * window 를 직접 만지지 않는다 — 스크립트가 아직 없을 때의 no-op 도 그쪽이 책임진다.
 *
 * 🔴 이벤트 이름은 GA4 자동 수집 이벤트·이미 쓰는 이벤트와 겹치면 안 된다.
 * 현재 쓰이는 이름: page_view · login · signup · purchase_complete ·
 * cross_sell_click · share_receive · retention_visit
 * (겹치면 verify:analytics-events 가 막는다)
 */

/** 결제창의 세 갈래. 결제창 카드의 data-mode 와 같은 축이다. */
export type PaymentMethod = "pass-store" | "single" | "moonstone";

export type ShareChannel = "kakao" | "link" | "x" | "facebook" | "download" | "etc";

/** 클릭 계측. target 은 버튼의 역할("checkout-cta" 등)이지 화면 문구가 아니다. */
function trackClick(target: string, params?: Record<string, unknown>): void {
  trackEvent("cta_click", { target, ...(params || {}) });
}

/**
 * 결제 시도. 🔴 금액은 KRW 만 받는다 — 코인은 폐지된 내부 단위(1코인=100원)라
 * coinPrice/cost 를 그대로 넘기면 대시보드 매출이 100분의 1로 잡힌다.
 */
function trackPaymentAttempt(input: {
  feature: string;
  method: PaymentMethod;
  priceKrw?: number;
}): void {
  trackEvent("payment_attempt", {
    feature: input.feature,
    method: input.method,
    // 값이 없을 때 키를 넣으면 GA4 에 "(not set)" 로 남아 평균 단가를 흐린다.
    ...(typeof input.priceKrw === "number" ? { price_krw: input.priceKrw } : {}),
  });
}

/** 결과 공유(내보내는 쪽). 받는 쪽은 analytics.js 의 share_receive 가 이미 맡는다. */
function trackShare(input: { feature: string; channel: ShareChannel }): void {
  trackEvent("share_click", { feature: input.feature, channel: input.channel });
}

/** 퍼널 단계 통과. funnel 은 여정 이름, step 은 그 안의 단계 이름. */
function trackFunnelStep(input: { funnel: string; step: string; stepIndex?: number }): void {
  trackEvent("funnel_step", {
    funnel: input.funnel,
    step: input.step,
    ...(typeof input.stepIndex === "number" ? { step_index: input.stepIndex } : {}),
  });
}

// 참조가 매 렌더 바뀌면 호출부의 useEffect 의존성 배열이 매번 다시 돈다.
// 상태가 없는 API 라 모듈 상수 하나로 충분하고, useMemo 를 둘 이유가 없다.
const analyticsApi = { trackClick, trackPaymentAttempt, trackShare, trackFunnelStep } as const;

export function useAnalytics() {
  return analyticsApi;
}
