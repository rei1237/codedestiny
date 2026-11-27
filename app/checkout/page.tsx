import type { Metadata } from "next";
import CheckoutRouteClient from "./CheckoutRouteClient";

/**
 * `/checkout/` — 영냥이(app/yeongnyangi/) 상담 결제 페이지.
 *
 * 영냥이가 결제 전 만들어 둔 상담 `?featureKey=yeongnyangi-…&requestId=<64hex>` 로 들어와 CD 결제창
 * (꿀단지 이용권·월정석 또는 단건: 카드·카카오페이)을 열고, 권한이 확인되면 그 상담 결과로 돌아간다.
 * requestId 없는 진입은 결제를 열지 않고 안내만 보인다(옛 외부 SoulCat 모드는 2026-11-27 제거).
 * 검색 노출 대상이 아니다(app/robots.ts 의 `/checkout/` Disallow 와 짝).
 */
export const metadata: Metadata = {
  title: "영냥이 복채 결제 | 꿀꿀 운세",
  description: "영냥이 유료 리딩은 꿀단지 이용권·월정석 또는 단건 결제(카드·카카오페이 등)로 이용해요.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPage() {
  return <CheckoutRouteClient />;
}
