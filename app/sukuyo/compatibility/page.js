import SeoLandingTemplate from "../../components/SeoLandingTemplate";
import { buildSeoMetadata } from "../../../lib/seo";
import { SEO_LANDING_PAGES } from "../../../lib/seo-landing-pages";

const base = SEO_LANDING_PAGES.sukuyo;
const page = {
  ...base,
  path: "/sukuyo/compatibility",
  title: "숙요점 궁합 보기 · 영친·업태·안괴 관계 해석 | Code Destiny",
  h1: "숙요점 궁합으로 보는 두 사람의 관계 패턴",
  description:
    "숙요점 궁합, 숙요 궁합, 영친관계, 업태관계, 안괴관계 키워드를 중심으로 관계 패턴을 해석하는 전용 랜딩입니다.",
  keywords: ["숙요점 궁합", "숙요 궁합", "영친관계", "업태관계", "안괴관계"],
};

export const metadata = buildSeoMetadata({
  path: page.path,
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

export default function SukuyoCompatibilityLandingPage() {
  return <SeoLandingTemplate page={page} />;
}
