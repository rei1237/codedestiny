import { introductionRoutes } from "../../lib/i18n/feature-introductions.mjs";
import SeoLandingTemplate from "../components/SeoLandingTemplate";
import { buildSeoMetadata } from "../../lib/seo";
import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";

const page = SEO_LANDING_PAGES.astrology;

export const metadata = buildSeoMetadata({
  path: page.path,
  hreflang: introductionRoutes("astrology"),
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

export default function AstrologyLandingPage() {
  return <SeoLandingTemplate page={page} />;
}
