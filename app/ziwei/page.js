import SeoLandingTemplate from "../components/SeoLandingTemplate";
import { GUIDED_ZIWEI_ENABLED } from "../../lib/guided-flow/flags.mjs";
import AstroGuidedEntry from "../astrology/AstroGuidedEntry";
import { createI18nMetadata } from "../../lib/seo/createI18nMetadata";
import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";
import { getAlternatesByRouteKey } from "../../lib/i18n/routes";

const page = SEO_LANDING_PAGES.ziwei;

export const metadata = createI18nMetadata({
  locale: "ko",
  routeByLocale: getAlternatesByRouteKey("ziwei"),
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

export default function ZiweiLandingPage() {
  // R5 자미: 공통 스텝 출생 입력. 플래그를 끄면 지금과 같은 랜딩만 남는다(lib/guided-flow/flags.mjs).
  if (!GUIDED_ZIWEI_ENABLED) return <SeoLandingTemplate page={page} />;
  return <SeoLandingTemplate page={page}><AstroGuidedEntry kind="ziwei" /></SeoLandingTemplate>;
}
