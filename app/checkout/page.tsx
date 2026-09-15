import type { Metadata } from "next";
import CheckoutRouteClient from "./CheckoutRouteClient";

/**
 * `/checkout/` — 영냥이(SoulCat) 단건 결제 전용 호스트 페이지.
 *
 * SoulCat 워커는 자기 결제 경로가 없다. `?featureKey=yeongnyangi-…&returnTo=/yeongnyangi/…` 로 들어와
 * CD 결제창(단건: 카드·카카오페이)만 열고, 결제가 끝나면 returnTo 로 돌아간다.
 * 검색 노출 대상이 아니다(app/robots.ts 의 `/checkout/` Disallow 와 짝).
 */
export const metadata: Metadata = {
  title: "영냥이 복채 결제 | Code Destiny",
  description: "영냥이의 세계는 다른 차원이라 단건 결제(카드·카카오페이 등)만 받아요.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPage() {
  return <CheckoutRouteClient />;
}
