import SeoLandingTemplate from "../components/SeoLandingTemplate";
import { buildSeoMetadata } from "../../lib/seo";
import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";
import { introductionRoutes } from "../../lib/i18n/feature-introductions.mjs";

const page = SEO_LANDING_PAGES.compatibility;

export const metadata = buildSeoMetadata({
  path: page.path,
  hreflang: introductionRoutes("compatibility"),
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

export default function CompatibilityLandingPage() {
  return <SeoLandingTemplate page={page} />;
}
