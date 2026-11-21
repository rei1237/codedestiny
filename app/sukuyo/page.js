import SeoLandingTemplate from "../components/SeoLandingTemplate";
import { GUIDED_SUKUYO_ENABLED } from "../../lib/guided-flow/flags.mjs";
import AstroGuidedEntry from "../astrology/AstroGuidedEntry";
import { createI18nMetadata } from "../../lib/seo/createI18nMetadata";
import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";
import { getAlternatesByRouteKey } from "../../lib/i18n/routes";

const page = SEO_LANDING_PAGES.sukuyo;

export const metadata = createI18nMetadata({
  locale: "ko",
  routeByLocale: getAlternatesByRouteKey("sukuyo"),
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

export default function SukuyoLandingPage() {
  // R5 숙요: 공통 스텝 출생 입력. 플래그를 끄면 지금과 같은 랜딩만 남는다(lib/guided-flow/flags.mjs).
  if (!GUIDED_SUKUYO_ENABLED) return <SeoLandingTemplate page={page} />;
  return <SeoLandingTemplate page={page}><AstroGuidedEntry kind="sukuyo" /></SeoLandingTemplate>;
}
