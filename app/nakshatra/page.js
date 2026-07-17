import NakshatraLanding from "./NakshatraLanding";
import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";
import { siteSeo } from "../../lib/seo/siteSeo";

const page = SEO_LANDING_PAGES.nakshatra;
const PAGE_PATH = "/nakshatra";

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
    siteName: "Code Destiny",
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: page.title }],
  },
  robots: { index: true, follow: true },
};

export default function NakshatraLandingPage() {
  return <NakshatraLanding page={page} />;
}
