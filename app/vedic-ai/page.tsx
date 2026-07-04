import type { Metadata } from "next";
import VedicAiRouteClient from "./VedicAiRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";

const PAGE_PATH = "/vedic-ai/";
const PAGE_TITLE = "베다 점성술 AI 상담 | 나크샤트라·다샤 해석 — Code Destiny";
const PAGE_DESCRIPTION =
  "인도 조티쉬(Jyotish) 전통의 나크샤트라와 행성 배치, 다샤 주기로 지금의 질문을 읽는 베다 점성술 AI 상담. 달이 머문 별자리의 결과 시기 흐름을 상담 문장으로 풀어 드립니다.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["베다 점성술", "조티쉬", "나크샤트라", "다샤", "베다 점성술 상담", "인도 점성술", "라시 차트"],
  alternates: {
    canonical: `${siteSeo.siteUrl}${PAGE_PATH}`,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: `${siteSeo.siteUrl}${PAGE_PATH}`,
    siteName: siteSeo.siteName,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "베다 점성술 AI 상담" }],
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
  },
};

const vedicAiJsonLd = [
  buildServiceJsonLd({
    name: "베다 점성술 AI 상담",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "베다 점성술 상담 서비스",
  }),
  buildFaqPageJsonLd([
    {
      question: "베다 점성술은 서양 점성술과 무엇이 다른가요?",
      answer:
        "서양 점성술이 계절 기준의 트로피컬 황도대를 쓰는 것과 달리, 베다 점성술(조티쉬)은 실제 별자리 위치에 가까운 사이더리얼 황도대를 사용합니다. 또한 달이 머문 나크샤트라와 다샤라는 행성 주기 체계로 시기 흐름을 읽는 것이 큰 특징입니다.",
    },
    {
      question: "나크샤트라는 무엇인가요?",
      answer:
        "나크샤트라는 달의 길을 27개의 별자리 구간으로 나눈 체계입니다. 태어난 순간 달이 머문 나크샤트라는 마음의 결과 본능적 기질을 보여주며, 베다 전통에서는 궁합과 이름 짓기에도 널리 쓰입니다.",
    },
    {
      question: "다샤는 어떻게 활용되나요?",
      answer:
        "다샤는 행성마다 배정된 기간이 순서대로 흐르는 시기 체계로, 보통 빔쇼타리 다샤(120년 주기)를 씁니다. 지금 어느 행성의 다샤를 지나는지에 따라 같은 차트라도 열리는 주제가 달라지므로, 상담에서는 현재 다샤의 결을 중심으로 질문을 읽습니다.",
    },
    {
      question: "태어난 시간을 모르면 볼 수 없나요?",
      answer:
        "태어난 시간이 있으면 라그나(상승궁)까지 정밀하게 세울 수 있지만, 시간을 모르더라도 달의 나크샤트라와 행성 배치를 중심으로 한 해석은 가능합니다. 아는 범위의 정보로 편하게 시작해 보세요.",
    },
  ]),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "베다 점성술", path: "/vedic/" },
    { name: "베다 점성술 AI 상담", path: PAGE_PATH },
  ]),
];

export default function VedicAiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vedicAiJsonLd) }}
      />
      <section className="sr-only" aria-label="베다 점성술 AI 상담 안내">
        <h1>베다 점성술 AI 상담 — 나크샤트라와 다샤의 흐름</h1>
        <p>
          베다 점성술 AI 상담은 인도 조티쉬 전통을 따라 사이더리얼 황도대 위에 라시 차트를 세우고,
          달이 머문 나크샤트라의 결과 행성들의 배치, 지금 지나는 다샤의 주기를 함께 읽습니다.
          관계와 일, 마음의 방향처럼 오래 머문 질문을 시기의 흐름 위에서 비춰 드립니다.
        </p>
        <p>
          태어난 시간을 알면 라그나까지 정밀해지지만, 몰라도 나크샤트라 중심의 해석으로 시작할 수
          있습니다. 별의 언어는 단정이 아니라 리듬입니다 — 지금의 다샤가 어떤 계절인지 알면
          선택의 무게가 한결 가벼워집니다.
        </p>
      </section>
      <VedicAiRouteClient />
    </>
  );
}
