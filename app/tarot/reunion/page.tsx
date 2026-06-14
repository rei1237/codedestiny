import SeoLandingTemplate from "../../components/SeoLandingTemplate";
import { buildSeoMetadata } from "../../../lib/seo";
import { SEO_LANDING_PAGES } from "../../../lib/seo-landing-pages";

export const metadata = buildSeoMetadata(SEO_LANDING_PAGES.tarotReunion);

export default function TarotReunionLandingPage() {
  return <SeoLandingTemplate page={SEO_LANDING_PAGES.tarotReunion} />;
}
