import SeoLandingTemplate from "../components/SeoLandingTemplate";
import TodayHubClient from "./TodayHubClient";
import { buildSeoMetadata } from "../../lib/seo";
import { SEO_LANDING_PAGES } from "../../lib/seo-landing-pages";

const page = SEO_LANDING_PAGES.today;

export const metadata = buildSeoMetadata({
  path: page.path,
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

// 허브가 위, 기존 랜딩 본문이 아래. 랜딩 본문을 걷어내면 안 된다 —
// 허브는 클라이언트에서 마운트 후 계산하므로 서버 렌더 텍스트에 잡히지 않고,
// /today 는 광고 불가·색인 가능 라우트라 verify-adsense-readiness 가 최소 분량을 요구한다.
export default function TodayLandingPage() {
  return (
    <>
      <TodayHubClient />
      <SeoLandingTemplate page={page} />
    </>
  );
}
