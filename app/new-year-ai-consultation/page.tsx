import type { Metadata } from "next";
import NewYearAiRouteClient from "./NewYearAiRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";

const PAGE_PATH = "/new-year-ai-consultation/";
const PAGE_TITLE = "신년운세 AI 상담 | 새해 흐름·월별 운세 풀이 — Code Destiny";
const PAGE_DESCRIPTION =
  "생년월일로 새해의 큰 흐름을 미리 읽는 신년운세 AI 상담. 한 해의 재물·관계·커리어 결과 월별 체크포인트를 사주 명식 기반 상담 문장으로 정리해 드립니다.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["신년운세", "새해 운세", "무료 신년운세", "월별 운세", "토정비결", "신년 사주", "AI 신년운세"],
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
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "신년운세 AI 상담" }],
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

const newYearJsonLd = [
  buildServiceJsonLd({
    name: "신년운세 AI 상담",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "신년운세 상담 서비스",
  }),
  buildFaqPageJsonLd([
    {
      question: "신년운세 AI 상담은 무엇을 알려주나요?",
      answer:
        "새해 한 해의 큰 흐름을 사주 명식의 세운(歲運) 관점에서 읽어 드립니다. 재물·관계·커리어의 결이 어느 계절에 열리고 어느 시기에 숨을 고르면 좋은지, 월별 체크포인트와 함께 상담 문장으로 정리합니다.",
    },
    {
      question: "토정비결과는 무엇이 다른가요?",
      answer:
        "토정비결이 정해진 괘 풀이를 찾아 읽는 방식이라면, 신년운세 AI 상담은 내 생년월일로 세운 사주 명식과 그 해의 간지가 만나는 흐름을 개인별로 계산해 해석합니다. 같은 해라도 사람마다 다른 결의 풀이가 나옵니다.",
    },
    {
      question: "연말이 아니어도 볼 수 있나요?",
      answer:
        "네, 세운의 흐름은 한 해 내내 이어지므로 언제든 남은 기간의 흐름과 다가올 해의 결을 미리 살필 수 있습니다. 연중에 보면 지나온 흐름을 되짚고 남은 달의 방향을 잡는 데 도움이 됩니다.",
    },
    {
      question: "결과는 다시 볼 수 있나요?",
      answer:
        "상담 결과는 본인 계정에서 다시 열람할 수 있습니다. 더 긴 호흡의 문서가 필요하다면 월별 가이드를 담은 신년 리포트 PDF로도 정리할 수 있습니다.",
    },
  ]),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "신년운세 AI 상담", path: PAGE_PATH },
  ]),
];

export default function NewYearAiConsultationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newYearJsonLd) }}
      />
      <section className="sr-only" aria-label="신년운세 AI 상담 안내">
        <h1>신년운세 AI 상담 — 새해 흐름과 월별 운세 풀이</h1>
        <p>
          신년운세 AI 상담은 생년월일로 세운 사주 명식 위에 새해의 간지가 만드는 세운의 흐름을
          겹쳐 읽습니다. 한 해의 재물운과 관계운, 일과 커리어의 결이 어느 달에 열리는지,
          어느 시기에 무리하지 않고 숨을 고르는 편이 좋은지 월별 체크포인트로 정리해 드립니다.
        </p>
        <p>
          새해 운세는 한 해를 단정하는 예언이 아니라, 계절의 흐름을 미리 아는 달력에 가깝습니다.
          연초가 아니어도 남은 달의 방향을 잡거나 다가올 해를 미리 살피는 데 언제든 활용할 수 있습니다.
        </p>
      </section>
      <NewYearAiRouteClient />
    </>
  );
}
