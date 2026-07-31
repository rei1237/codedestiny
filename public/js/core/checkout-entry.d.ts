// js/core/checkout-entry.js 의 타입 선언. 런타임 정본은 .js 쪽 하나이고 이 파일은 타입만 제공한다.
// sync-legacy-static-to-public.mjs 는 .js/.mjs/.cjs/.json 만 미러링하므로 이 파일은 배포되지 않는다.

export type CheckoutStorePlan = "standard" | "premium" | "vvip" | "family";

export type CheckoutReturnPoint = {
  /** 이용권 구매 후 돌아갈 화면. rememberCheckoutReturn 이 남긴 값 그대로다. */
  url: string;
  label: string;
  featureKey: string;
};

export type CheckoutFunnelEventName =
  | "checkout_opened"
  | "checkout_option_click"
  | "pass_verified_free"
  | "pass_store_entered"
  | "checkout_dismissed";

export type CheckoutFunnelPayload = {
  featureKey?: string;
  option?: string;
  renderer?: string;
  coinPrice?: number;
  hasPassHint?: string;
  dwellMs?: number;
};

declare const checkoutEntry: {
  VERSION: number;
  RETURN_KEY: string;
  RETURN_TTL_MS: number;
  FUNNEL_PATH: string;
  PASS_STORE_PLAN_ORDER: CheckoutStorePlan[];
  /** 이 금액을 덮는 가장 낮은 이용권 등급(보유 등급 이하는 제외). 판정 불가 시 빈 문자열. */
  resolveStorePlan(costCoins: number, currentTier?: unknown): CheckoutStorePlan | "";
  buildPassStoreUrl(options: {
    costCoins?: number;
    currentTier?: unknown;
    plan?: string;
    source?: string;
  }): string;
  /** true 면 /points 대신 window.__cdOpenChargeModal()(앱 전용 상점)을 타야 한다. */
  shouldUseAppStoreEntry(): boolean;
  rememberCheckoutReturn(options: { url: string; label?: string; featureKey?: string }): boolean;
  /** 복귀 지점을 읽고 즉시 지운다(복귀 루프 방지). 만료·부재면 null. */
  consumeCheckoutReturn(): CheckoutReturnPoint | null;
  trackCheckoutEvent(name: CheckoutFunnelEventName, payload?: CheckoutFunnelPayload): boolean;
};

export default checkoutEntry;
