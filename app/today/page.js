import TodayHubClient from "./TodayHubClient";
import { buildSeoMetadata } from "../../lib/seo";
import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";

const page = SEO_LANDING_PAGES.today || {
  path: "/today",
  title: "오늘의 운세 | 코드 데스티니 (Code: Destiny)",
  description: "오늘 당신의 재물운, 연애운, 직장운, 건강운 파동과 럭키 아이템을 정밀하게 확인해 보세요.",
  keywords: ["오늘의운세", "일일운세", "재물운", "연애운", "코드데스티니"],
};

export const metadata = buildSeoMetadata({
  path: page.path,
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

export default function TodayLandingPage() {
  return <TodayHubClient />;
}
