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
      <section aria-label="초융합 심층 리딩 이용 안내" style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 56px", lineHeight: 1.7, wordBreak: "keep-all" }}>
        <h2>이용 안내</h2>
        <p>초융합 심층 리딩은 1회 30,000원의 회당 결제입니다. 매번 새로 계산하고 새로 쓰는 개인화 리딩이라 결과를 저장해 두고 재열람하는 상품이 아닙니다. 결제창에서는 이용권·단건 결제·월정석을 함께 고를 수 있으며, 금액 상한 때문에 이용권으로는 family 등급이 커버됩니다.</p>
        <p>생성이 중간에 실패하면 같은 요청을 다시 보낼 때 추가 결제가 없습니다. 결제 증빙이 요청 번호에 묶여 있어, 재시도해도 두 번 결제되지 않습니다.</p>
        <p>연이와 나누는 가벼운 운명상담은 별도 상품입니다. 로그인 없이 1회, 로그인하면 3회까지 무료이고(계정당 총량이며 매일 리셋되지 않습니다) 그 뒤로는 1회 5,000원입니다. 초융합과 서로 대체되지 않습니다. 두 상담 모두 미래를 단정하거나 보장하지 않고, 지금 확인할 점과 현실적인 다음 행동을 함께 제안합니다.</p>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
