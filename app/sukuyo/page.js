import SeoLandingTemplate from "../components/SeoLandingTemplate";
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
  return <SeoLandingTemplate page={page} />;
}
