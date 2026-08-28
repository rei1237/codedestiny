import { redirect } from "next/navigation";

/**
 * 2026-08-23 통합: 꽃 랜딩 4개(destiny·astrology·jamidusu·sukuyo)는 전부 같은 상품
 * (flower-fc, 1만원 전체 해금)을 가리키고 있었다. /flower 하나로 합치고 나머지는 여기로 보낸다.
 * 네 페이지 모두 원래 noindex 였고 scripts/generate-sitemap.mjs 가 "/flower" 접두어를
 * 통째로 제외하므로 색인 손실은 없다.
 */
// 🔴 metadata 를 선언하지 않으면 app/layout.js 의 `alternates` 를 상속받아
//    `index, follow` + `canonical=홈` 으로 나갔다(out/ 실측 2026-08-27). 위 주석대로
//    원래 noindex 였던 라우트이므로 여기서 명시한다. follow 는 남겨 /flower 로 신호를 넘긴다.
export const metadata = {
  title: "운명의 꽃 · 자미두수 — 통합 아틀리에로 이동",
  description:
    "운명의 꽃 자미두수 페이지는 통합 아틀리에 /flower 로 합쳐졌습니다. 이 주소는 이동 안내만 합니다.",
  robots: { index: false, follow: true },
};

export default function FlowerJamidusuLegacyRedirect() {
  redirect("/flower");
}
