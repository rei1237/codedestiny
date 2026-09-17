/**
 * 해외 발급 카드 결제창 노출 판정 (KG이니시스 해외카드 1단계, docs/payment/inicis-overseas-card/02).
 *
 * 서버가 판정하고 클라이언트는 전달만 한다. 모든 기본값은 닫힘이다.
 * - 플래그는 문자열 "1" 만 켠다(GIFTS_ENABLED 와 같은 관례, gifts.js assertGiftPurchasesEnabled).
 * - 대상은 FOREIGN_CARD_PRODUCT_POLICY 표에 true 로 적힌 유형뿐이다. 한 줄을 false 로 바꾸면 그 유형만 꺼진다.
 * - billingCountry 는 받지만 판정에 쓰지 않는다. 카드 발급국은 결제 전에 알 수 없고(PortOne Card 에
 *   발급국 필드 없음), IP·locale·이름으로 추정하지 않는다.
 * - 앱(Capacitor) 결제 경로 구분은 판정에 없다 — 플래그를 켜기 전 선결 조건이다(문서 02).
 * I/O 가 없다 — prepare 경로의 Mongo 왕복을 늘리지 않는다.
 */

export const FOREIGN_CARD_POLICY_VERSION = "2026-09-17-v1";

export const FOREIGN_CARD_REASON = Object.freeze({
  ELIGIBLE: "ELIGIBLE",
  FLAG_OFF: "FLAG_OFF",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  PRODUCT_NOT_ELIGIBLE: "PRODUCT_NOT_ELIGIBLE",
  CHANNEL_NOT_SUPPORTED: "CHANNEL_NOT_SUPPORTED",
  ORDER_SNAPSHOT_CLOSED: "ORDER_SNAPSHOT_CLOSED",
});

export const FOREIGN_CARD_PRODUCT_POLICY = Object.freeze({
  digital_content: true,
  membership_pass: true,
  membership_pass_gift: true,
});

// 이용권·선물은 30일 상품만 판매한다(index.js resolvePassRequest 가 30일 외 요청을 거부).
const PASS_PRODUCT_TYPES = new Set(["membership_pass", "membership_pass_gift"]);
const PASS_DURATION_DAYS = 30;
// 일반 카드 결제창만. 카카오페이·계좌이체·상품권은 해외카드 창이 아니다.
const FOREIGN_CARD_CHANNEL = "card_general";

function decide(offered, reason) {
  return { offered, reason, policyVersion: FOREIGN_CARD_POLICY_VERSION };
}

export function isForeignCardFlagEnabled(env) {
  return String(env?.FOREIGN_CARD_ENABLED ?? "") === "1";
}

export function canUseForeignCard({ user, product, billingCountry, paymentChannel } = {}, { env } = {}) {
  void billingCountry; // 판정에 쓰지 않는다 — 머리주석.
  if (!isForeignCardFlagEnabled(env)) return decide(false, FOREIGN_CARD_REASON.FLAG_OFF);
  if (!user?.id) return decide(false, FOREIGN_CARD_REASON.AUTH_REQUIRED);
  const type = String(product?.type ?? "");
  if (!Object.hasOwn(FOREIGN_CARD_PRODUCT_POLICY, type) || FOREIGN_CARD_PRODUCT_POLICY[type] !== true) {
    return decide(false, FOREIGN_CARD_REASON.PRODUCT_NOT_ELIGIBLE);
  }
  if (PASS_PRODUCT_TYPES.has(type) && product.durationDays !== PASS_DURATION_DAYS) {
    return decide(false, FOREIGN_CARD_REASON.PRODUCT_NOT_ELIGIBLE);
  }
  if (String(paymentChannel ?? "").trim().toLowerCase() !== FOREIGN_CARD_CHANNEL) {
    return decide(false, FOREIGN_CARD_REASON.CHANNEL_NOT_SUPPORTED);
  }
  return decide(true, FOREIGN_CARD_REASON.ELIGIBLE);
}

/* 🔴 결제창에 실을 판정은 "지금 판정"과 "주문을 만들 때 남긴 스냅숏"이 둘 다 열려야 열린다.
   플래그를 내리면 기존 주문도 즉시 닫히고, 닫힌 채 만들어진 주문은 나중에 플래그를 켜도 열리지 않는다. */
export function narrowToOrderSnapshot(fresh, snapshot) {
  if (fresh?.offered !== true) return decide(false, fresh?.reason ?? FOREIGN_CARD_REASON.FLAG_OFF);
  if (snapshot?.offered !== true) return decide(false, FOREIGN_CARD_REASON.ORDER_SNAPSHOT_CLOSED);
  return decide(true, FOREIGN_CARD_REASON.ELIGIBLE);
}

export function toForeignCardSnapshot(decision, now) {
  return {
    offered: decision?.offered === true,
    reason: decision?.reason,
    policyVersion: decision?.policyVersion,
    decidedAt: now,
  };
}
