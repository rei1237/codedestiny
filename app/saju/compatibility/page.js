import SeoLandingTemplate from "../../components/SeoLandingTemplate";
import { buildSeoMetadata } from "../../../lib/seo";
import { SEO_LANDING_PAGES } from "../../../lib/seo-landing-pages";

const page = SEO_LANDING_PAGES.sajuCompatibility;

export const metadata = buildSeoMetadata({
  path: page.path,
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

export default function SajuCompatibilityLandingPage() {
  return <SeoLandingTemplate page={page} />;
}
