// 유료 서비스 페이지의 schema.org Offer.
//
// 🔴 **가격 숫자를 여기 적지 말 것.** 정본은 worker/lib/billing-feature-registry.js 이고,
//    이 파일은 lib/payment/server-feature-pricing.ts 를 통해 서버와 **같은 함수**로 가격을 푼다.
//    구조화 데이터에 옛 가격이 박히면 검색결과가 실제 결제 금액과 어긋난 채 색인된다.
//
// 🔴 **통화는 KRW 하나다.** KG이니시스 해외카드결제 특약은 승인·정산이 모두 원화라
//    (help.portone.io/content/inicis-international, 2026-08-28 확인), 해외 사용자에게도
//    청구는 KRW 다. 로케일별로 priceCurrency 를 바꾸면 검색결과가 "USD 로 살 수 있다"고
//    말하는데 결제창은 원화를 청구하는 상태가 된다 — 화면 금액 ≠ 승인 금액이다.
//    화면의 외화 개산가(js/core/checkout-entry.js formatReferenceAmount)는 참고 표기일 뿐이라
//    구조화 데이터에 넣지 않는다.
//
// 가격을 못 풀면 **null 이다.** 호출부는 offers 를 아예 빼야 하며, 0 원짜리 Offer 를 내보내면
// 안 된다(worker/payments/catalog.js: "가격이 0 인 항목은 상품이 아니다").
import { toAbsoluteUrl } from "../seo";
import { resolveServerFeaturePricing } from "../payment/server-feature-pricing";

/** 승인·정산 통화. 계약이 바뀌기 전에는 이 값을 파라미터화하지 않는다. */
export const OFFER_PRICE_CURRENCY = "KRW";

export type PaidOffer = {
  "@type": "Offer";
  price: string;
  priceCurrency: string;
  availability: string;
  url: string;
};

/**
 * featureKey 의 서버 가격으로 Offer 를 만든다. 가격을 못 풀면 null.
 *
 * @param featureKey worker/lib/paid-feature-registry.js 의 키
 * @param path 이 상품을 파는 페이지 경로(예: "/vedic-ai")
 */
export function buildKrwOffer(featureKey: string, path: string): PaidOffer | null {
  const pricing = resolveServerFeaturePricing({ featureKey });
  if (!pricing || !(pricing.amountKRW > 0)) return null;
  return {
    "@type": "Offer",
    // 🔴 문자열이다 — JSON 숫자로 내면 소비자에 따라 30000 이 3e4 로 직렬화된다.
    price: String(pricing.amountKRW),
    priceCurrency: OFFER_PRICE_CURRENCY,
    availability: "https://schema.org/InStock",
    url: toAbsoluteUrl(path),
  };
}
