import NakshatraLanding from "./NakshatraLanding";
import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";
import { siteSeo } from "../../lib/seo/siteSeo";

const page = SEO_LANDING_PAGES.nakshatra;
// 🔴 후행 슬래시 필수 — next.config 가 trailingSlash: true 라 실제 산출물과 sitemap <loc> 이
// 모두 `/nakshatra/` 다. 슬래시를 빼면 self-canonical 이 자기 자신이 아닌 리다이렉트 원본을 가리킨다.
const PAGE_PATH = "/nakshatra/";
// 동양 별자리 문양 × 인도 만다라 융합 대표 이미지(R2) — OG/트위터 소셜 프리뷰용.
const NAKSHATRA_OG_IMAGE = "https://assets.code-destiny.com/%EC%88%99%EC%9A%94%EC%A0%90x%EB%B2%A0%EB%8B%A4%EC%A0%90.webp";

// ko 우선 슬라이스 — 로케일 대체본이 아직 없어 self-canonical 수동 메타데이터를 쓴다
// (createI18nMetadata의 hreflang이 미존재 /ja·/zh·/en 페이지를 가리키지 않도록).
export const metadata = {
  metadataBase: new URL(siteSeo.siteUrl),
  title: page.title,
  description: page.description,
  keywords: page.keywords,
  alternates: { canonical: `${siteSeo.siteUrl}${PAGE_PATH}` },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: `${siteSeo.siteUrl}${PAGE_PATH}`,
    title: page.title,
    description: page.description,
    siteName: siteSeo.brandName,
    images: [{ url: NAKSHATRA_OG_IMAGE, width: 1672, height: 941, alt: page.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: page.title,
    description: page.description,
    images: [NAKSHATRA_OG_IMAGE],
  },
};

export default function NakshatraLandingPage() {
  return <NakshatraLanding page={page} />;
}
