import type { Metadata } from "next";
import RuneRouteClient from "./RuneRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../../lib/structured-data";
import { siteSeo } from "../../../lib/seo/siteSeo";

const PAGE_PATH = "/oracle/rune/";
const PAGE_TITLE = "무료 룬 점 보기 | 엘더 푸타르크 24룬 오라클 — 꿀꿀 운세";
const PAGE_DESCRIPTION =
  "고대 북유럽 엘더 푸타르크 24개 룬 문자로 오늘의 질문을 비춰보는 무료 룬 점. 스톤헨지 제단에서 룬을 뽑고 사랑·일·선택의 방향을 AI 해석과 함께 확인하세요.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["룬 점", "무료 룬점", "룬 오라클", "엘더 푸타르크", "룬 문자 의미", "오늘의 룬", "룬 카드"],
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
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "꿀꿀 운세 룬 오라클" }],
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

const runeJsonLd = [
  buildServiceJsonLd({
    name: "룬 오라클 리딩",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "룬 점 해석 서비스",
  }),
  buildFaqPageJsonLd([
    {
      question: "룬 점은 어떤 점술인가요?",
      answer:
        "룬 점은 고대 게르만·북유럽에서 문자이자 주술 기호로 쓰인 룬 문자를 뽑아 질문의 흐름을 읽는 점술입니다. 가장 널리 쓰이는 엘더 푸타르크 체계는 페후(Fehu)부터 오딜라(Othala)까지 24개의 룬으로 이루어져 있습니다.",
    },
    {
      question: "룬 점은 무료인가요?",
      answer:
        "네, 꿀꿀 운세의 룬 오라클은 회원가입 없이 무료로 룬을 뽑고 기본 해석을 확인할 수 있습니다. 더 깊은 AI 상담 해석은 유료 옵션으로 제공됩니다.",
    },
    {
      question: "질문은 어떻게 정하는 것이 좋나요?",
      answer:
        "\"네/아니오\"로 답이 갈리는 질문보다, \"이 관계에서 내가 살펴야 할 흐름은 무엇인가\"처럼 방향을 묻는 열린 질문이 룬 해석과 잘 어울립니다. 하나의 질문에 하나의 리딩을 권합니다.",
    },
    {
      question: "역방향(리버스) 룬도 해석하나요?",
      answer:
        "일부 룬은 뒤집힌 방향으로 나올 때 의미가 달라집니다. 꿀꿀 운세 룬 오라클은 정방향·역방향을 함께 반영해, 같은 룬이라도 질문과 위치에 따라 결이 다른 해석을 제공합니다.",
    },
  ]),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "룬 점", path: PAGE_PATH },
  ]),
];

export default function RunePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(runeJsonLd) }}
      />
      <section className="sr-only" aria-label="룬 오라클 안내">
        <h1>무료 룬 점 — 엘더 푸타르크 24룬 오라클</h1>
        <p>
          룬은 고대 북유럽 사람들이 문자이자 상징으로 새겨온 기호입니다. 꿀꿀 운세의 룬 오라클은
          엘더 푸타르크 24개 룬 가운데 지금의 질문에 응답하는 룬을 뽑아, 사랑과 관계, 일과 선택,
          막힌 마음의 방향을 조용히 비춰 드립니다. 스톤헨지 제단 위에서 룬을 고르면 정방향과
          역방향의 의미를 함께 살핀 해석이 펼쳐집니다.
        </p>
        <p>
          룬 점은 미래를 단정하는 도구가 아니라, 스스로 답을 고르기 전 마음의 결을 정리하는
          거울에 가깝습니다. 하나의 질문을 정하고 천천히 룬을 뽑아 보세요. 무료로 시작할 수 있고,
          더 깊은 흐름이 궁금하다면 AI 상담 해석으로 이어갈 수 있습니다.
        </p>
      </section>
      <RuneRouteClient />
    </>
  );
}
