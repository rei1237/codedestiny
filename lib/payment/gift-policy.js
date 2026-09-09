import { PASS_MONTHLY_WON } from "./pass-pricing.js";

export const GIFT_POLICY_VERSION = "2026-09-09-v1";
export const GIFTABLE_TIERS = Object.freeze(Object.keys(PASS_MONTHLY_WON));
export const GIFT_STATUS = Object.freeze({
  PENDING_PAYMENT: "PENDING_PAYMENT", PAID: "PAID", CLAIMED: "CLAIMED",
  CANCELLED: "CANCELLED", REFUND_PENDING: "REFUND_PENDING", REFUNDED: "REFUNDED", EXPIRED: "EXPIRED",
});
export const GIFT_STATUS_LABELS = Object.freeze({
  PENDING_PAYMENT: "결제 대기", PAID: "수령 대기", CLAIMED: "수령 완료",
  CANCELLED: "취소됨", REFUND_PENDING: "환불 확인 중", REFUNDED: "환불됨", EXPIRED: "수령 기한 만료",
});
export const GIFT_GUIDANCE = "결제 확인 후 선물 링크를 보내세요. 로그인한 한 계정이 수령할 수 있으며 본인 수령도 가능합니다. 수령 기한은 구매 후 1년입니다. 이용 기간은 수령 시 시작하며, 같은 등급은 남은 기간과 한도에 합산됩니다. 다른 등급 이용권이 활성화되어 있으면 종료 후 수령할 수 있습니다. 미수령 선물의 환불은 기존 정책에 따라 확인하며, 수령 후에는 운영자 확인이 필요합니다. 수령 기한 만료만으로 환급 권리가 소멸하지 않습니다.";
