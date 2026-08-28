// js/core/checkout-entry.js 의 타입 선언. 런타임 정본은 .js 쪽 하나이고 이 파일은 타입만 제공한다.
// sync-legacy-static-to-public.mjs 는 .js/.mjs/.cjs/.json 만 미러링하므로 이 파일은 배포되지 않는다.

export type CheckoutStorePlan = "standard" | "premium" | "vvip" | "family";

/** 결제창 선택지 3종. data-mode 값('pass-store'|'direct'|'monthly')과는 별개인 내부 키다. */
export type CheckoutOptionKey = "pass" | "direct" | "monthly";

/**
 * 단건결제 2단계에서 고르는 결제수단. 값은 PortOne V2 의 payMethod enum 그대로다
 * (중간 매핑 테이블 없음). 활성 여부의 정본은 checkout-entry.js 의 DIRECT_PAY_METHODS 하나다.
 */
export type DirectPayMethodId = "CARD" | "TRANSFER" | "MOBILE" | "GIFT_CERTIFICATE";

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
   * 참고 환산율의 기준 시점(예: "2026-08"). 🔴 실시간 환율이 아니다 — 표시 전용 개산가의
   * 근거 날짜이며, 낡으면 손으로 갱신한다.
   */
  REFERENCE_FX_AS_OF: string;
  /**
   * 원화 금액의 현지통화 **참고** 표기(예: "$7.4", 유효숫자 2자리). 한국어 화면이거나 환산표에
   * 없는 로케일이면 빈 문자열이다.
   * 🔴 표시 전용 — 결제 요청의 totalAmount/currency 에 실으면 안 된다(승인 통화는 언제나 KRW).
   */
  formatReferenceAmount(krwAmount: number): string;
  /**
   * 결제창 하단 원화 청구 고지 `<p>` HTML. 한국어 화면에서는 빈 문자열.
   * 세 렌더러가 문구를 각자 적지 않고 이 하나를 부른다.
   */
  buildOverseasChargeNoticeHtml(input: {
    amountKrw?: number;
    escape?: (value: unknown) => string;
  }): string;
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
  /** 2단계 결제수단의 표시 순서. 활성 여부와 무관하게 전부 그린다(준비 중 포함). */
  DIRECT_PAY_METHOD_ORDER: DirectPayMethodId[];
  DEFAULT_DIRECT_PAY_METHOD: DirectPayMethodId;
  /** PG 계약이 끝나 실제로 결제할 수 있는 수단인가. 정본은 DIRECT_PAY_METHODS 표 하나다. */
  isDirectPayMethodEnabled(id: unknown): boolean;
  /** 아직 열리지 않은 수단의 상태 문구. 렌더러가 결제창 상태줄에 그대로 쓴다. */
  directPayMethodComingSoonText(): string;
  /**
   * 2단계(결제수단) 패널 HTML. 세 렌더러가 각자 그리지 않고 이 하나를 부른다.
   * 방출 속성은 data-pay-method / data-pay-step 이며 data-mode 는 쓰지 않는다 —
   * 세 렌더러가 [data-mode] 를 "누르면 모달을 닫는" 노드로 일괄 처리하기 때문이다.
   */
  buildDirectPayMethodStepHtml(input: { escape: (value: unknown) => string }): string;
  /** 활성 수단만 받아 기록하고 정규화된 값을 돌려준다. 거부되면 빈 문자열. */
  setSelectedDirectPayMethod(id: unknown): DirectPayMethodId | "";
  clearSelectedDirectPayMethod(): void;
  /** TTL·활성 여부를 다시 확인해 돌려준다(소비하지 않음). */
  peekSelectedDirectPayMethod(): DirectPayMethodId | "";
  /** PortOne 요청에 실을 payMethod. 고른 값 → config 값 → 'CARD' 순. 읽어도 지우지 않는다. */
  resolveDirectPayMethod(configPayMethod?: unknown): DirectPayMethodId;
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
