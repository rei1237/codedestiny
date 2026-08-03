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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
