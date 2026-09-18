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

// 결제 임계 화면과 같은 관례: useT 사전이 아니라 동기 표, 폴백은 ko 가 아니라 en.
// ko 는 GIFT_GUIDANCE 를 그대로 참조해 정본이 갈라지지 않게 한다.
export const GIFT_GUIDANCE_BY_LOCALE = Object.freeze({
  ko: GIFT_GUIDANCE,
  en: "After payment is confirmed, send the gift link. It can be claimed by one logged-in account, and self-claiming is also allowed. The claim deadline is 1 year after purchase. The usage period starts when claimed; if it's the same tier as an existing pass, the remaining period and limit are added together. If a different tier's pass is already active, this one can be claimed once that pass ends. Refunds for unclaimed gifts follow the existing policy; after claiming, operator confirmation is required. Expiry of the claim deadline alone does not extinguish refund rights.",
  ja: "決済確認後にギフトリンクを送ってください。ログイン中の1アカウントが受け取れ、本人による受け取りも可能です。受け取り期限は購入後1年です。利用期間は受け取り時に開始し、同じ等級であれば残り期間と上限に加算されます。別の等級の利用券が有効な場合は、その終了後に受け取れます。未受領のギフトの返金は既存のポリシーに従って確認し、受け取り後は運営者の確認が必要です。受け取り期限の満了だけでは返金請求権は消滅しません。",
  "zh-CN": "付款确认后请发送礼物链接。仅限已登录的一个账号领取,也可以本人领取。领取期限为购买后1年。使用期限自领取时开始,若为相同等级则与剩余期限和额度合并计算。若已激活其他等级的会员权益,需等其结束后才能领取。未领取礼物的退款按现有政策处理,领取后需经运营方确认。领取期限届满本身并不会使退款权利消灭。",
  "zh-TW": "付款確認後請傳送禮物連結。僅限已登入的一個帳號領取,本人領取也可以。領取期限為購買後1年。使用期限自領取時開始,若為相同等級則與剩餘期限和額度合併計算。若已啟用其他等級的會員權益,需等其結束後才能領取。未領取禮物的退款依現行政策處理,領取後需經營運方確認。領取期限屆滿本身並不會使退款權利消滅。",
});

export function getGiftGuidance(locale) {
  return GIFT_GUIDANCE_BY_LOCALE[locale] || GIFT_GUIDANCE_BY_LOCALE.en;
}
