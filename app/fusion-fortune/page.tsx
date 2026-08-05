import { buildSeoMetadata } from "../../lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
  buildWebPageJsonLd,
} from "../../lib/structured-data";
import { FusionFortuneClient } from "./FusionFortuneClient";
import { FusionFortuneSeoContent, FUSION_FORTUNE_FAQS } from "./FusionFortuneSeoContent";

const title = "초융합 운세 | 사주·자미두수·숙요점 AI 통합 해석 | Code Destiny";
const description =
  "사주·자미두수·숙요점·베다 점성술·서양 점성술·타로를 AI가 교차해 성향, 관계, 일과 돈의 흐름을 현실적인 선택과 함께 정리하는 초융합 운세입니다.";

export const metadata = buildSeoMetadata({
  path: "/fusion-fortune",
  title,
  description,
  noindex: true,
  ogImage: "/images/fusion-fortune/fusion-guardian-celestial-hero.webp",
});

export default function FusionFortunePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildWebPageJsonLd({ title, description, path: "/fusion-fortune" }),
      buildServiceJsonLd({
        name: "CODE DESTINY 초융합 운세",
        description,
        path: "/fusion-fortune",
        serviceType: "AI 운세 통합 해석",
      }),
      buildBreadcrumbJsonLd([
        { name: "홈", path: "/" },
        { name: "초융합 운세", path: "/fusion-fortune" },
      ]),
      buildFaqPageJsonLd([...FUSION_FORTUNE_FAQS]),
    ],
  };

  return (
    <>
      <FusionFortuneClient seoContent={<FusionFortuneSeoContent />} />
      <section aria-label="초융합 심층 리딩 안내" style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 56px", lineHeight: 1.7 }}>
        <h2>꽃돼지 운명상담의 초융합 심층 리딩</h2>
        <p>초융합 심층 리딩은 사주, 자미두수, 베다점, 숙요점, 점성술, 타로의 관점을 연결해 현재 고민의 반복 패턴과 선택의 흐름을 정리합니다.</p>
        <p>무료 가벼운 운명상담과는 별도 상품이며, 기존 Fusion 티켓 확인 뒤 같은 상담방에서 결과를 이어볼 수 있습니다. 미래를 단정하거나 보장하지 않고, 지금 확인할 점과 현실적인 다음 행동을 함께 제안합니다.</p>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
