import type { Metadata } from "next";
import RuneRouteClient from "./RuneRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../../lib/structured-data";
import { siteSeo } from "../../../lib/seo/siteSeo";
import ImmersiveRelatedLinks from "../../components/ImmersiveRelatedLinks";

const PAGE_PATH = "/oracle/rune/";
const PAGE_TITLE = "무료 룬 점 보기 | 엘더 푸타르크 24룬 오라클 — 꿀꿀 운세";
const PAGE_DESCRIPTION =
  "고대 북유럽 엘더 푸타르크 24개 룬 문자로 오늘의 질문을 비춰보는 무료 룬 점. 스톤헨지 제단에서 룬을 뽑고 사랑·일·선택의 방향을 전문가 해석과 함께 확인하세요.";

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
};

const runeFaqItems = [
  {
    question: "룬 점은 어떤 점술인가요?",
    answer:
      "룬 점은 고대 게르만·북유럽에서 문자이자 주술 기호로 쓰인 룬 문자를 뽑아 질문의 흐름을 읽는 점술입니다. 가장 널리 쓰이는 엘더 푸타르크 체계는 페후(Fehu)부터 오딜라(Othala)까지 24개의 룬으로 이루어져 있습니다.",
  },
  {
    question: "룬 점은 무료인가요?",
    answer:
      "네, 꿀꿀 운세의 룬 오라클은 회원가입 없이 무료로 룬을 뽑고 기본 해석을 확인할 수 있습니다. 더 깊은 전문가 상담 해석은 유료 옵션으로 제공됩니다.",
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
  {
    question: "여러 개의 룬을 한 번에 뽑을 수도 있나요?",
    answer:
      "하나의 룬으로 간단한 답을 확인할 수도 있고, 여러 개를 뽑아 흐름의 시작과 지금, 방향을 함께 살피는 배열도 가능합니다. 질문이 복잡할수록 여러 룬을 함께 뽑는 편이 더 입체적인 해석을 줍니다.",
  },
  {
    question: "룬 점과 타로 중 무엇을 먼저 해보면 좋을까요?",
    answer:
      "정해진 순서는 없습니다. 카드의 그림으로 이야기를 읽는 편이 익숙하면 타로를, 상징 문자 하나에 집중해 짧고 간결한 답을 원하면 룬 점을 먼저 시도해 보시길 권합니다. 둘 다 무료로 가볍게 시작할 수 있습니다.",
  },
  {
    question: "룬의 유래는 어디에서 왔나요?",
    answer:
      "룬 문자는 고대 게르만어를 기록하기 위한 문자 체계로 시작되었지만, 북유럽 신화와 함께 점술과 주술의 상징으로도 널리 쓰였습니다. 오늘날의 룬 오라클은 이 오래된 상징 체계를 현대적인 질문에 맞게 재해석한 것입니다.",
  },
];

const runeJsonLd = [
  buildServiceJsonLd({
    name: "룬 오라클 리딩",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "룬 점 해석 서비스",
  }),
  buildFaqPageJsonLd(runeFaqItems),
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
          더 깊은 흐름이 궁금하다면 전문가 상담 해석으로 이어갈 수 있습니다.
        </p>
        <p>
          엘더 푸타르크 24개 룬은 각각 자연물이나 삶의 사건을 상징합니다. 정방향과 역방향의 의미가
          다르고, 여러 개를 함께 뽑으면 룬들이 서로 어떻게 얽히는지에 따라 해석이 더 풍부해집니다.
          타로가 그림으로 이야기를 들려준다면, 룬은 문자 하나에 상징을 압축해 담고 있어 더 짧고
          단도직입적인 방식으로 질문에 응답합니다.
        </p>
        <h2>이런 순간에 특히 도움이 됩니다</h2>
        <ul>
          <li>지금 이 관계나 상황에서 놓치고 있는 흐름이 무엇인지 궁금할 때</li>
          <li>선택을 앞두고 마음이 복잡해 스스로 정리할 실마리가 필요할 때</li>
          <li>타로와는 다른 상징 언어로 같은 질문을 한 번 더 비춰 보고 싶을 때</li>
          <li>짧고 가볍게, 부담 없이 오늘의 방향을 확인하고 싶을 때</li>
        </ul>
        <h2>이용은 이렇게 진행됩니다</h2>
        <ol>
          <li>스톤헨지 제단 화면에서 지금 궁금한 질문 하나를 마음속으로 정합니다.</li>
          <li>룬을 뽑으면 정방향·역방향에 따라 기본 의미가 화면에 나타납니다.</li>
          <li>기본 해석을 무료로 확인하고, 더 깊은 풀이가 필요하면 전문가 상담으로 이어갑니다.</li>
          <li>다른 질문이 떠오르면 새 리딩으로 다시 룬을 뽑아 볼 수 있습니다.</li>
        </ol>
        <p>
          룬은 정답을 알려주는 도구가 아니라, 지금 마음이 향하는 방향을 비추는 거울에 가깝습니다.
          같은 질문이라도 시간을 두고 다시 뽑아 보면 그때그때 다른 결의 룬이 나올 수 있으니,
          하나의 리딩에 너무 무겁게 기대지 않는 편이 좋습니다.
        </p>
        <h2>자주 묻는 질문</h2>
        {runeFaqItems.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </section>
      <RuneRouteClient />
      <ImmersiveRelatedLinks fromPath="/oracle/rune" />
    </>
  );
}
