import ResultSamples from '@/app/components/ResultSamples';
import type { Metadata } from "next";
import LifeBookAiRouteClient from "./LifeBookAiRouteClient";
import { buildBreadcrumbJsonLd, buildServiceJsonLd } from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";
import ServiceIntroSection from "../components/ServiceIntroSection";
import ImmersiveRelatedLinks from "../components/ImmersiveRelatedLinks";
import { buildKrwOffer } from "@/lib/seo/paid-offer";

const PAGE_PATH = "/life-book-ai/";
const PAGE_TITLE = "인생 총운 | 사주로 보는 평생 운세 리포트 — 인생의 책";
const PAGE_DESCRIPTION = "내 인생의 황금기는 언제일까? 사주 명식으로 일·관계·재물의 방향과 시기를 짚는 평생 운세 리포트입니다.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: `${siteSeo.siteUrl}${PAGE_PATH}`,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: `${siteSeo.siteUrl}${PAGE_PATH}`,
    siteName: siteSeo.brandName,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "인생의 책 전문가 상담" }],
  },
  twitter: {
    card: siteSeo.twitterCard,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [siteSeo.defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

// 화면에 FAQ가 없어서 FAQPage는 내지 않는다. 구조화 데이터는 보이는 내용과 같아야 한다.
const lifeBookJsonLd = [
  buildServiceJsonLd({
    name: "인생의 책 전문가 상담",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "사주 인생 총운 상담 서비스",
    // 🔴 가격은 서버 가격표에서 푼다(lib/seo/paid-offer.ts). 못 풀면 null 이라 offers 가 빠진다.
    offer: buildKrwOffer("life-book-ai-consultation", PAGE_PATH),
  }),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "인생의 책 전문가 상담", path: PAGE_PATH },
  ]),
];

export default function LifeBookAiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(lifeBookJsonLd) }}
      />
      <LifeBookAiRouteClient />
      <ResultSamples ids={['life-book']}/>
      <ServiceIntroSection label="인생의 책 전문가 상담 안내">
        {/* 문서 H1은 이 서버 영역의 하나뿐이다. 위 상담 화면은 클라이언트에서 그려져 서버 HTML(verify:seo-heading-integrity)에 없고, 그 화면 제목을 h1로 올리면 하이드레이션 뒤 H1이 2개가 된다(verify:hydrated-h1-integrity). 그래서 화면 제목은 h2로 둔다. */}
        <h1><span>인생 총운 — 사주로 보는 평생 운세 리포트</span>내 인생의 황금기는 언제일까?</h1>
        <p>
          인생의 책은 한 사람의 명식에 오래 흐르는 계절과 기질을 따라 삶의 큰 장면을 천천히 펼쳐 봅니다.
          어린 시절부터 지금까지 반복된 선택의 결, 관계 안에서 마음이 움직이는 방식, 일과 재물의 흐름이 머무는 자리,
          앞으로 더 밝게 열어야 할 방향을 긴 호흡의 상담 문장으로 엮습니다.
        </p>
        <p>
          사주는 삶을 단정하기 위한 도구가 아니라 지금의 나를 더 깊게 이해하기 위한 거울입니다.
          이 상담은 사용자가 입력한 생년월일과 시간의 흐름을 바탕으로, 강하게 타고난 힘과 조심스럽게 다루어야 할 습관을 함께 비춥니다.
          당신의 시간이 충분히 정리되면, 삶의 큰 장면은 한 장씩 조용히 펼쳐지고 오래 묻어 둔 질문에도 새로운 문장이 머물기 시작합니다.
        </p>
      </ServiceIntroSection>
      <ImmersiveRelatedLinks fromPath="/life-book-ai" />
    </>
  );
}
