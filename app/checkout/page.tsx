import type { Metadata } from "next";
import CheckoutRouteClient from "./CheckoutRouteClient";

/**
 * `/checkout/` — 영냥이(SoulCat) Family·단건 결제 호스트 페이지.
 *
 * SoulCat 워커는 자기 결제 경로가 없다. `?featureKey=yeongnyangi-…&returnTo=/yeongnyangi/…` 로 들어와
 * CD 결제창(Family 이용권 또는 단건: 카드·카카오페이)을 열고, 권한이 확인되면 returnTo 로 돌아간다.
 * 검색 노출 대상이 아니다(app/robots.ts 의 `/checkout/` Disallow 와 짝).
 */
export const metadata: Metadata = {
  title: "영냥이 복채 결제 | Code Destiny",
  description: "영냥이 유료 리딩은 Family 이용권 또는 단건 결제(카드·카카오페이 등)로 이용해요.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPage() {
  return <CheckoutRouteClient />;
}
