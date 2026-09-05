import SeoLandingTemplate from "../components/SeoLandingTemplate";
import { buildSeoMetadata } from "../../lib/seo";
import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";
import { NAKSHATRA_CROSSWALK } from "../../constants/nakshatra-crosswalk";

/* 27 나크샤트라 도감(/nakshatra/codex/{sukuyoIdx}/)으로 가는 가시 링크 — 허브에서 2홉 안에 닿게 하고
   달의 나크샤트라 문단에서 바로 이어지도록 나크샤트라 순서(아슈위니→레바티)로 정렬한다. */
const nakshatraLinks = [...NAKSHATRA_CROSSWALK]
  .sort((a, b) => a.nakshatraIdx - b.nakshatraIdx)
  .map((entry) => ({
    href: `/nakshatra/codex/${entry.sukuyoIdx}/`,
    label: `${entry.nakshatraKo} · ${entry.sukuyoKo}수(${entry.sukuyoHan})`,
  }));

const page = {
  ...SEO_LANDING_PAGES.vedic,
  linkGroups: [
    {
      heading: "27 나크샤트라 도감 — 자리별 해설",
      lede: "각 자리의 지배 행성·신격·상징·파다와 동아시아 27수와의 대응을 한 편씩 정리했습니다. 달이 머문 자리를 찾아 들어가세요.",
      links: nakshatraLinks,
    },
  ],
};

export const metadata = buildSeoMetadata({
  path: page.path,
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

export default function VedicLandingPage() {
  return <SeoLandingTemplate page={page} />;
}
