import { siteSeo } from "./siteSeo";
import { ogLocaleFor } from "../i18n/locales";

/**
 * 손으로 `export const metadata` 를 쓰는 페이지용 openGraph.
 * 🔴 페이지가 openGraph 를 선언하면 루트 layout 의 openGraph 는 통째로 대체된다. `url` 만 쓰면 type·locale·siteName·images 가 사라지므로
 * 루트의 공통 값을 여기서 함께 채운다. 제목·설명은 Next 가 페이지의 title·description 으로 채운다.
 * `canonicalUrl` 에는 같은 페이지의 `alternates.canonical` 과 **같은 값**을 넘긴다(og:url === canonical).
 */
export function pageOpenGraph(canonicalUrl: string) {
  return {
    type: "website" as const,
    locale: ogLocaleFor("ko-KR"),
    url: canonicalUrl,
    siteName: siteSeo.brandName,
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: `${siteSeo.brandName} 사주·타로 상담 서비스` }],
  };
}
