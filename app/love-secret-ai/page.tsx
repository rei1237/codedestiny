import type { Metadata } from "next";
import LoveSecretAiRouteClient from "./LoveSecretAiRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";

const PAGE_PATH = "/love-secret-ai/";
const PAGE_TITLE = "사랑의 비밀 AI 상담 | 짝사랑·재회·연애 마음 리딩 — Code Destiny";
const PAGE_DESCRIPTION =
  "생년월일 기반 사주 흐름으로 짝사랑, 썸, 재회, 이별 후 마음까지 읽어주는 사랑의 비밀 AI 상담. 상대의 마음 결과 관계의 방향을 상담 문장으로 확인하세요.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["연애운", "짝사랑 운세", "재회 가능성", "썸 운세", "연애 사주", "상대방 마음", "AI 연애 상담"],
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
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "사랑의 비밀 AI 상담" }],
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

const loveSecretJsonLd = [
  buildServiceJsonLd({
    name: "사랑의 비밀 AI 상담",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "연애 사주 상담 서비스",
  }),
  buildFaqPageJsonLd([
    {
      question: "사랑의 비밀 AI 상담은 무엇을 봐주나요?",
      answer:
        "짝사랑과 썸의 진전 가능성, 연인 사이의 흐름, 이별 후 재회의 결까지 연애에 얽힌 마음의 방향을 읽습니다. 생년월일로 세운 사주 명식의 일간과 십성 흐름을 바탕으로 관계에서 반복되는 패턴을 상담 문장으로 풀어 드립니다.",
    },
    {
      question: "상대방 정보가 없어도 볼 수 있나요?",
      answer:
        "네, 내 생년월일만으로도 지금 연애운의 큰 흐름을 볼 수 있습니다. 상대의 생년월일을 함께 입력하면 두 명식 사이의 궁합 결이 더해져 관계의 방향이 더 구체적으로 읽힙니다.",
    },
    {
      question: "재회 가능성도 알 수 있나요?",
      answer:
        "재회는 단정할 수 있는 답이 아니라 두 사람의 시기 흐름이 다시 만나는지의 문제입니다. 상담은 지금의 운 흐름에서 인연의 문이 열려 있는지, 기다림과 정리 중 어느 쪽이 마음을 지키는 길인지 함께 살핍니다.",
    },
    {
      question: "상담 내용은 저장되거나 공개되나요?",
      answer:
        "상담 결과는 본인 확인 후 본인만 열람할 수 있으며, 다른 사용자에게 공개되지 않습니다. 입력한 생년월일은 해석 생성 목적으로만 사용됩니다.",
    },
  ]),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "사랑의 비밀 AI 상담", path: PAGE_PATH },
  ]),
];

export default function LoveSecretAiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(loveSecretJsonLd) }}
      />
      <section className="sr-only" aria-label="사랑의 비밀 AI 상담 안내">
        <h1>사랑의 비밀 AI 상담 — 짝사랑·재회·연애 마음 리딩</h1>
        <p>
          사랑의 비밀은 생년월일로 세운 사주 명식을 따라 연애에 얽힌 마음의 결을 읽는 AI 상담입니다.
          짝사랑이 어디까지 닿아 있는지, 썸이 관계로 이어질 흐름인지, 이별 뒤의 마음을 어떻게
          정리하면 좋을지 — 일간의 기질과 십성의 흐름, 지금 지나는 운의 계절을 함께 살펴 긴 호흡의
          상담 문장으로 답해 드립니다.
        </p>
        <p>
          연애운은 정해진 결말이 아니라 마음이 움직이는 방향의 지도입니다. 내 생년월일만으로
          시작할 수 있고, 상대의 정보를 더하면 두 사람 사이 궁합의 결까지 함께 읽을 수 있습니다.
        </p>
      </section>
      <LoveSecretAiRouteClient />
    </>
  );
}
