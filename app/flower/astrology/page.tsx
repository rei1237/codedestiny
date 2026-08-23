import { redirect } from "next/navigation";

/**
 * 2026-08-23 통합: 꽃 랜딩 4개(destiny·astrology·jamidusu·sukuyo)는 전부 같은 상품
 * (flower-fc, 1만원 전체 해금)을 가리키고 있었다. /flower 하나로 합치고 나머지는 여기로 보낸다.
 * 네 페이지 모두 원래 noindex 였고 scripts/generate-sitemap.mjs 가 "/flower" 접두어를
 * 통째로 제외하므로 색인 손실은 없다.
 */
export default function FlowerAstrologyLegacyRedirect() {
  redirect("/flower");
}
