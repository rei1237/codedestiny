import SeoLandingTemplate from "../../components/SeoLandingTemplate";
import { buildSeoMetadata } from "../../../lib/seo";
import { SEO_LANDING_PAGES } from "../../../lib/seo-landing-pages";
import { introductionRoutes } from "../../../lib/i18n/feature-introductions.mjs";

const base = SEO_LANDING_PAGES.sukuyo;

const pageCopy = {
  title: "27수 궁합 계산 | 무료 본명숙 궁합·영친·업태·안괴 보는 곳",
  h1: "27수 궁합 계산 — 본명숙 거리로 보는 관계 패턴",
  description:
    "두 사람의 생년월일로 각자의 본명숙을 뽑아 27자리 안의 거리를 계산합니다. 그 거리가 영친·업태·안괴 가운데 어느 관계인지 보고 반복해 부딪히는 장면을 정리합니다.",
  keywords: ["27수 궁합", "숙요 궁합 계산", "본명숙 궁합", "숙요점 궁합", "숙요 궁합", "영친관계", "업태관계", "안괴관계", "안괴 궁합", "숙요 안괴"],
};

const page = {
  ...base,
  path: "/sukuyo/compatibility",
  ...pageCopy,
};

export const metadata = buildSeoMetadata({
  path: page.path,
  hreflang: introductionRoutes("sukuyo-compatibility"),
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

export default function SukuyoCompatibilityLandingPage() {
  return <SeoLandingTemplate page={page} />;
}
