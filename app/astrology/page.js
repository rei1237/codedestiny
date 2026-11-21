import { introductionRoutes } from "../../lib/i18n/feature-introductions.mjs";
import SeoLandingTemplate from "../components/SeoLandingTemplate";
import { GUIDED_ASTRO_ENABLED } from "../../lib/guided-flow/flags.mjs";
import AstroGuidedEntry from "./AstroGuidedEntry";
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
  // R5: 공통 스텝 출생 입력. 플래그를 끄면 지금과 같은 랜딩만 남는다(lib/guided-flow/flags.mjs).
  if (!GUIDED_ASTRO_ENABLED) return <SeoLandingTemplate page={page} />;
  return <SeoLandingTemplate page={page}><AstroGuidedEntry /></SeoLandingTemplate>;
}
