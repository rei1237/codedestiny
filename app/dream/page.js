import SeoLandingTemplate from "../components/SeoLandingTemplate";
import { buildSeoMetadata } from "../../lib/seo";
import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";

const page = SEO_LANDING_PAGES.dream;

export const metadata = buildSeoMetadata({
  path: page.path,
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

export default function DreamLandingPage() {
  return <SeoLandingTemplate page={page} />;
}
