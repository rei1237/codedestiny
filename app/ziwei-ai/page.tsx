import type { Metadata } from "next";
import ZiweiAiRouteClient from "./ZiweiAiRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";

const PAGE_PATH = "/ziwei-ai/";
const PAGE_TITLE = "자미두수 AI 상담 | 명궁·사화·대운 풀이 — Code Destiny";
const PAGE_DESCRIPTION =
  "명궁과 신궁, 사화(화록·화권·화과·화기)와 대운의 흐름을 따라 지금의 고민을 읽는 자미두수 AI 상담. 12궁 명반 위에서 직업·인연·재물의 결을 상담 문장으로 풀어 드립니다.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["자미두수", "자미두수 AI", "자미두수 상담", "명궁", "사화", "대운 풀이", "자미두수 명반"],
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
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "자미두수 AI 상담" }],
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

const ziweiAiJsonLd = [
  buildServiceJsonLd({
    name: "자미두수 AI 상담",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "자미두수 상담 서비스",
  }),
  buildFaqPageJsonLd([
    {
      question: "자미두수 AI 상담은 사주와 무엇이 다른가요?",
      answer:
        "사주가 여덟 글자의 오행 균형으로 기질과 흐름을 읽는다면, 자미두수는 자미성을 비롯한 별들을 12궁 명반에 배치해 삶의 영역별 흐름을 봅니다. 명궁·재백궁·관록궁·부처궁처럼 궁위 단위로 고민을 짚을 수 있는 것이 특징입니다.",
    },
    {
      question: "사화(四化)는 무엇인가요?",
      answer:
        "사화는 태어난 해의 천간에 따라 별에 붙는 네 가지 변화 기운으로, 화록(祿)은 풀림과 수확, 화권(權)은 주도권, 화과(科)는 명예와 인정, 화기(忌)는 얽힘과 과제를 뜻합니다. 상담은 사화가 어느 궁에 머무는지를 따라 지금 고민의 매듭을 찾습니다.",
    },
    {
      question: "대운·유년 흐름도 봐주나요?",
      answer:
        "네, 10년 단위의 대운과 해마다 바뀌는 유년의 흐름을 함께 살핍니다. 같은 명반이라도 지금 지나는 대운에 따라 열리는 궁과 조심할 궁이 달라지므로, 시기 흐름을 겹쳐 읽는 것이 자미두수 상담의 핵심입니다.",
    },
    {
      question: "명반을 몰라도 상담할 수 있나요?",
      answer:
        "생년월일과 태어난 시간만 입력하면 명반 작성부터 해석까지 자동으로 진행됩니다. 태어난 시간이 정확할수록 명궁과 12궁 배치가 정밀해집니다.",
    },
  ]),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "자미두수", path: "/ziwei/" },
    { name: "자미두수 AI 상담", path: PAGE_PATH },
  ]),
];

export default function ZiweiAiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ziweiAiJsonLd) }}
      />
      <section className="sr-only" aria-label="자미두수 AI 상담 안내">
        <h1>자미두수 AI 상담 — 명궁·사화·대운 풀이</h1>
        <p>
          자미두수 AI 상담은 생년월일과 태어난 시간으로 12궁 명반을 세우고, 명궁과 신궁의 별자리
          배치, 사화의 흐름, 지금 지나는 대운과 유년의 결을 함께 읽습니다. 직업과 진로는 관록궁,
          재물은 재백궁, 인연은 부처궁 — 고민이 머무는 궁을 짚어 상담 문장으로 풀어 드립니다.
        </p>
        <p>
          명반을 몰라도 괜찮습니다. 입력한 정보로 명반 작성부터 해석까지 이어지며, 화기가 얽힌
          자리는 과제로, 화록이 닿는 자리는 열리는 문으로 균형 있게 비춰 드립니다.
        </p>
      </section>
      <ZiweiAiRouteClient />
    </>
  );
}
