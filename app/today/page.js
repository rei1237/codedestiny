import TodayHubClient from "./TodayHubClient";
import TodayReadingGuide from "./TodayReadingGuide";
import TodaySystemPrimer from "./TodaySystemPrimer";
import { buildSeoMetadata } from "../../lib/seo";
import { createHreflangFromRoutes } from "../../lib/seo/createHreflang";
import { getAlternatesByRouteKey } from "../../lib/i18n/routes";
import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
  buildWebPageJsonLd,
} from "../../lib/structured-data";

const page = SEO_LANDING_PAGES.today || {
  path: "/today",
  title: "오늘의 운세 | 코드 데스티니 (Code: Destiny)",
  description: "오늘 당신의 재물운, 연애운, 직장운, 건강운 파동과 럭키 아이템을 정밀하게 확인해 보세요.",
  keywords: ["오늘의운세", "일일운세", "재물운", "연애운", "코드데스티니"],
};

// /ja/today·/zh/today·/zh-tw/today·/en/today 는 이 페이지를 ko alternate 로 지목하는데
// 정작 이쪽은 페이지 태그를 내지 않았다(사이트맵 xhtml:link 로만 선언됨).
// /ziwei·/sukuyo 와 같은 클러스터를 페이지에도 낸다.
export const metadata = buildSeoMetadata({
  path: page.path,
  title: page.title,
  description: page.description,
  keywords: page.keywords,
  hreflang: createHreflangFromRoutes(getAlternatesByRouteKey("today")),
});

// 다른 SEO 랜딩 6종은 SeoLandingTemplate 을 통해 WebPage/Service/BreadcrumbList/FAQPage 를 낸다.
// /today 는 몰입형 자체 화면이라 그 템플릿을 마운트하지 않으므로(서체 히어로·브레드크럼이
// 두 번째 히어로로 겹친다) 구조화 데이터만 여기서 직접 낸다.
const webPageJsonLd = buildWebPageJsonLd({
  title: page.title,
  description: page.description,
  path: page.path,
});
const serviceJsonLd = buildServiceJsonLd({
  name: page.title,
  description: page.description,
  path: page.path,
  serviceType: "오늘의 운세",
});
const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "홈", path: "/" },
  { name: "오늘의 운세", path: page.path },
]);
const faqJsonLd = buildFaqPageJsonLd(page.faqs || []);

export default function TodayLandingPage() {
  return (
    <>
      {/* 🔴 이 라우트는 몰입형(AppChrome.CHROMELESS_ROUTES)이라 SiteFooterHub 가 붙지 않는다.
          예전에 배포 게이트(1,800자)를 떠받치던 것이 그 푸터(실측 2,265자)였으므로,
          아래 두 서버 컴포넌트를 지우거나 줄이면 build:cf 의 verify-adsense-readiness 가 실패한다. */}
      <TodayHubClient>
        <TodaySystemPrimer />
        <TodayReadingGuide />
      </TodayHubClient>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
