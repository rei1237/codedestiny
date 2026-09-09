import { ExpertGuide } from "./ExpertGuide";
import { getFusionExpertCopy } from "./_lib/expert-labels";
import { buildSeoMetadata } from "../../lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
  buildWebPageJsonLd,
} from "../../lib/structured-data";
import { FusionFortuneClient } from "./FusionFortuneClient";
import { FusionValuePreview } from "./FusionValuePreview";
import { FusionFortuneSeoContent, FUSION_FORTUNE_FAQS } from "./FusionFortuneSeoContent";
import { buildKrwOffer } from "@/lib/seo/paid-offer";

const pageCopy = getFusionExpertCopy("ko");
const title = `${pageCopy.narrator} | Code Destiny`;
const description = pageCopy.intro;

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
        name: pageCopy.narrator,
        description,
        path: "/fusion-fortune",
        serviceType: pageCopy.guide,
        // 🔴 가격은 서버 가격표에서 푼다(lib/seo/paid-offer.ts). 못 풀면 null 이라 offers 가 빠진다.
        //    통화는 언제나 KRW — 이니시스 해외카드 특약은 승인·정산이 모두 원화다.
        offer: buildKrwOffer("fusion-fortune-consultation", "/fusion-fortune"),
      }),
      buildBreadcrumbJsonLd([
        { name: "Code Destiny", path: "/" },
        { name: pageCopy.narrator, path: "/fusion-fortune" },
      ]),
      buildFaqPageJsonLd([...FUSION_FORTUNE_FAQS]),
    ],
  };

  return (
    <>
      <FusionFortuneClient seoContent={<FusionFortuneSeoContent />} valuePreview={<FusionValuePreview />} />
      <ExpertGuide mode="usage" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
