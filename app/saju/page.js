import { introductionRoutes } from "../../lib/i18n/feature-introductions.mjs";
import SeoLandingTemplate from "../components/SeoLandingTemplate";
import { buildSeoMetadata } from "../../lib/seo";
import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";
import SajuLandingHero from "./SajuLandingHero";
import SajuServiceCatalog from "./SajuServiceCatalog";

const page = SEO_LANDING_PAGES.saju;

export const metadata = buildSeoMetadata({
  path: page.path,
  hreflang: introductionRoutes("saju"),
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

export default function SajuLandingPage() {
  return <SeoLandingTemplate page={{ ...page, breadcrumbLabel: "사주 원국" }} hero={<SajuLandingHero />} services={<SajuServiceCatalog />} />;
}
