import SeoLandingTemplate from "../../components/SeoLandingTemplate";
import { buildSeoMetadata } from "../../../lib/seo";
import { SEO_LANDING_PAGES } from "../../../lib/seo-landing-pages";

const page = SEO_LANDING_PAGES.sajuCompatibility;

export const metadata = buildSeoMetadata({
  path: page.path,
  title: page.title,
  description: page.description,
  keywords: page.keywords,
  // AdSense 재심사 대응 2차 — 이 SeoLandingTemplate 라우트는 공통 크롬을 걷어낸
  // 고유 본문이 1051자다(2026-08-17 out/ 실측, 코퍼스=사이트맵 411개). 색인만 끈다.
  // 🔴 lib/seo/siteSeo.ts 의 noindexPathPrefixes 로는 처리하지 못한다 —
  //    SeoLandingTemplate.jsx:375 의 DeferredShareWidget 이 함께 사라진다(/flower 와 같은 사유).
  //    사이트맵 제외는 scripts/generate-sitemap.mjs 쪽에서 짝으로 선언했다.
  noindex: true,
});

export default function SajuCompatibilityLandingPage() {
  return <SeoLandingTemplate page={page} />;
}
