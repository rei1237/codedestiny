import { introductionRoutes } from "../../lib/i18n/feature-introductions.mjs";
import SeoLandingTemplate from "../components/SeoLandingTemplate";
import FortuneLandingHero from "../components/FortuneLandingHero";
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
  // 플래그를 켜면 공통 히어로 CTA(기본: /ggulggul/?action=cdHomeAstroEntry → 프로필 없는 비회원은
  // ?step=name 으로 되돌아옴, 2홉) 대신 같은 페이지의 스텝 입력으로 바로 내려간다.
  return (
    <SeoLandingTemplate page={page} hero={<FortuneLandingHero path={page.path} startHref="#astro-guided-entry" />}>
      <div id="astro-guided-entry" className="scroll-mt-20"><AstroGuidedEntry /></div>
    </SeoLandingTemplate>
  );
}
