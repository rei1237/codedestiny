// js/core/checkout-entry.js 의 타입 선언. 런타임 정본은 .js 쪽 하나이고 이 파일은 타입만 제공한다.
// sync-legacy-static-to-public.mjs 는 .js/.mjs/.cjs/.json 만 미러링하므로 이 파일은 배포되지 않는다.

export type CheckoutStorePlan = "standard" | "premium" | "vvip" | "family";

/** 결제창 선택지 3종. data-mode 값('pass-store'|'direct'|'monthly')과는 별개인 내부 키다. */
export type CheckoutOptionKey = "pass" | "direct" | "monthly";

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

/**
 * 결제창 단일 인스턴스 락 토큰. 세 렌더러(정적 셸 · React · 독립 정적)가 공유하며,
 * 실제 상태는 window.__cdPaymentChoiceLock 에 산다(모듈 인스턴스가 둘이라 클로저에 둘 수 없다).
 */
export type PaymentChoiceLockToken = {
  owner: string;
  startedAt: number;
  node: Element | null;
};

export type CheckoutFunnelPayload = {
  featureKey?: string;
  option?: string;
  renderer?: string;
  coinPrice?: number;
  hasPassHint?: string;
  dwellMs?: number;
};

/**
 * buildPaymentChoiceCardsHtml 이 받는 카드 한 장의 스펙. 호출부(각 렌더러)가 조건 계산·이스케이프를
 * 마친 조각만 넘긴다 — 함수는 뼈대(배지·추천 리본·go 스트립·variant 클래스)만 조립한다.
 */
export type PaymentChoiceCardSpec = {
  /** false 면 이 카드는 렌더되지 않는다(빈 문자열). */
  allow?: boolean;
  dataMode: string;
  /** 예: ' data-monthly-option disabled aria-disabled="true"'. */
  extraDataAttrs?: string;
  /** 예: ' is-store', ' is-disabled'. */
  extraClass?: string;
  /** 있으면 escape 후 aria-label 로 부착(React 전용 접근성 강화). */
  ariaLabel?: string;
  /** 카드 상단 배지 이모지. */
  glyph: string;
  /** escape 대상 배지 텍스트. */
  badgeLabel: string;
  /** 호출부가 이미 조립·이스케이프한 <strong> 내용. */
  titleHtml: string;
  /** 호출부가 이미 조립·이스케이프한 설명 내용. */
  descHtml: string;
  /** 예: ' data-monthly-hint'. */
  descAttr?: string;
  /** 카드 형제로 붙는 조각(월정석 잔량 확인 버튼 등) — <button> 중첩 금지라 카드 안이 아니다. */
  afterHtml?: string;
};

declare const checkoutEntry: {
  VERSION: number;
  RETURN_KEY: string;
  RETURN_TTL_MS: number;
  FUNNEL_PATH: string;
  PASS_STORE_PLAN_ORDER: CheckoutStorePlan[];
  /** 결제 선택창 카드의 공용 CSS 규칙 정본. 세 렌더러가 이 배열을 참조해 <style> 을 채운다. */
  PAYMENT_CHOICE_CSS_RULES: string[];
  /** 세 렌더러가 붙이는 결제창 노드를 모두 잡는 선택자. */
  CHOICE_MODAL_SELECTOR: string;
  CHOICE_LOCK_TTL_MS: number;
  /** 결제창을 열 권리. 이미 열려 있으면 null(호출부는 기존 모달에 포커스를 주고 'cancel'). */
  acquirePaymentChoiceLock(owner: string): PaymentChoiceLockToken | null;
  /** 결제창 노드가 실제로 붙은 뒤 락에 연결한다(스윕이 살려둘 노드로 인식). */
  attachPaymentChoiceNode(token: PaymentChoiceLockToken | null, node: Element | null): boolean;
  releasePaymentChoiceLock(token: PaymentChoiceLockToken | null): boolean;
  getPaymentChoiceLockNode(): Element | null;
  /** 살아 있는 락이 붙든 노드와 keepNode 를 뺀 결제창 노드를 전부 제거하고 개수를 돌려준다. */
  sweepOrphanChoiceModals(keepNode?: Element | null): number;
  hasOpenPaymentChoiceModal(): boolean;
  /**
   * 결제창 문구 조회. 세 렌더러가 같은 키·같은 사전(public/i18n)을 보게 하는 지점.
   * 한국어 fallback 이 ko 정본이므로 ko.json 과 항상 함께 맞춘다.
   */
  text(key: string, fallback: string, vars?: Record<string, string | number>): string;
  /**
   * 결제창 숫자 표기에 쓸 BCP-47 로케일. 금액·잔량을 `toLocaleString("ko-KR")` 로 굳히지 않기
   * 위한 정본이며, 조회기가 없는 환경에서는 ko-KR 로 떨어진다.
   */
  displayLocale(): string;
  /**
   * PG 결제창(이니시스) UI 언어. KG이니시스가 PC·모바일 양쪽에서 지원하는 두 값만 낸다
   * — 지원 밖 값은 결제창 미노출 위험이 있어 쓰지 않는다.
   */
  pgWindowLocale(): "KO_KR" | "EN_US";
  /** 금액을 현재 로케일 자릿수 + payment.currency.krw 문구로 그린다. */
  formatKrwAmount(value: number, fallbackText?: string): string;
  /**
   * 결제창의 추천 선택지와 카드 순서. 순수 함수이며 서버를 부르지 않는다 —
   * 표시 우선순위일 뿐 접근 권한 판정이 아니다(이용권 판정은 카드 클릭 시 서버가 한다).
   */
  resolveCheckoutRecommendation(input: {
    allowPass?: boolean;
    allowDirect?: boolean;
    allowMonthly?: boolean;
    /** 로컬 구독 스냅샷이 알려준 활성 등급 보유 여부. 미상이면 false. */
    hasActivePassTier?: boolean;
    monthlyBalanceFresh?: boolean;
    monthlyBalance?: number;
    requiredMonthlyCredits?: number;
  }): {
    recommended: CheckoutOptionKey | "";
    order: CheckoutOptionKey[];
    /** 확인된 잔량이 필요량을 덮는가. '미확정'은 false 다. */
    monthlyCovers: boolean;
  };
  /**
   * 이용권/단건/월정석 카드를 order 순서대로 이어 붙인다. 세 렌더러가 각자 손으로 유지하던
   * 카드 뼈대(배지·추천 리본·go 스트립·variant 클래스)를 공유한다 — 조건 계산은 호출부 소유.
   */
  buildPaymentChoiceCardsHtml(input: {
    order: CheckoutOptionKey[];
    recommendedOption: CheckoutOptionKey | "";
    /** HTML 이스케이프 함수. 미지정 시 문자열 캐스팅만 한다(이스케이프 없음 — 반드시 넘길 것). */
    escape: (value: unknown) => string;
    recommendLabel: string;
    goLabel: string;
    cards: Partial<Record<CheckoutOptionKey, PaymentChoiceCardSpec>>;
  }): string;
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
