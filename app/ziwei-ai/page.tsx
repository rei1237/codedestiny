import type { Metadata } from "next";
import ZiweiAiRouteClient from "./ZiweiAiRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";
import ServiceIntroSection from "../components/ServiceIntroSection";

const PAGE_PATH = "/ziwei-ai/";
const PAGE_TITLE = "자미두수 전문가 상담 | 명궁·사화·대운 풀이 — Code Destiny";
const PAGE_DESCRIPTION =
  "명궁과 신궁, 사화와 대운의 흐름을 따라 지금의 고민을 읽는 자미두수 전문가 상담입니다. 12궁 명반 위에서 직업·인연·재물의 결을 풀어 드립니다.";

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
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "자미두수 전문가 상담" }],
  },
  twitter: {
    card: siteSeo.twitterCard,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [siteSeo.defaultOgImage],
  },
};

const ziweiAiFaqItems = [
  {
    question: "자미두수 전문가 상담은 사주와 무엇이 다른가요?",
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
  {
    question: "어떤 궁부터 확인하는 게 좋나요?",
    answer:
      "지금 가장 궁금한 주제에 따라 다릅니다. 진로와 직업이 궁금하면 관록궁, 재물 흐름은 재백궁, 연애와 결혼은 부처궁을 먼저 살피는 편이 좋고, 전반적인 성향과 큰 흐름은 명궁에서 시작하시길 권합니다.",
  },
  {
    question: "결과는 다시 확인할 수 있나요?",
    answer:
      "네, 상담 결과는 본인 계정에서 다시 열람할 수 있습니다. 대운이 바뀌거나 유년의 흐름이 달라질 때 같은 명반을 다시 확인하면 지금 열린 궁과 조심할 궁을 새로 가늠해 볼 수 있습니다.",
  },
  {
    question: "사주 상담과 함께 봐도 되나요?",
    answer:
      "네, 사주와 자미두수는 서로 배치되는 체계가 아닙니다. 사주로 기질과 오행 균형을 확인하고, 자미두수로 궁위별 구체적인 흐름을 겹쳐 보면 같은 고민을 더 입체적으로 이해하는 데 도움이 됩니다.",
  },
];

const ziweiAiJsonLd = [
  buildServiceJsonLd({
    name: "자미두수 전문가 상담",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "자미두수 상담 서비스",
  }),
  buildFaqPageJsonLd(ziweiAiFaqItems),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "자미두수", path: "/ziwei/" },
    { name: "자미두수 전문가 상담", path: PAGE_PATH },
  ]),
];

export default function ZiweiAiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ziweiAiJsonLd) }}
      />
            <ZiweiAiRouteClient />
            <ServiceIntroSection label="자미두수 전문가 상담 안내">
        <h1>자미두수 전문가 상담 — 명궁·사화·대운 풀이</h1>
        <p>
          자미두수 전문가 상담은 생년월일과 태어난 시간으로 12궁 명반을 세우고, 명궁과 신궁의 별자리
          배치, 사화의 흐름, 지금 지나는 대운과 유년의 결을 함께 읽습니다. 직업과 진로는 관록궁,
          재물은 재백궁, 인연은 부처궁 — 고민이 머무는 궁을 짚어 상담 문장으로 풀어 드립니다.
        </p>
        <p>
          명반을 몰라도 괜찮습니다. 입력한 정보로 명반 작성부터 해석까지 이어지며, 화기가 얽힌
          자리는 과제로, 화록이 닿는 자리는 열리는 문으로 균형 있게 비춰 드립니다.
        </p>
        <p>
          자미두수는 명궁을 중심으로 12개 궁이 삶의 각 영역을 나누어 보여주는 체계입니다. 하나의
          운명 전체를 뭉뚱그려 말하기보다, 지금 궁금한 주제가 머무는 궁을 짚어 그 자리의 별과
          사화를 읽는 방식으로 접근합니다. 사주가 오행이라는 하나의 언어로 기질을 말한다면,
          자미두수는 궁위라는 지도 위에서 삶의 영역을 나눠 보여주는 점이 다릅니다.
        </p>
        <h2>이런 순간에 특히 도움이 됩니다</h2>
        <ul>
          <li>진로나 이직처럼 관록궁의 흐름이 중요한 결정을 앞두고 판단이 필요할 때</li>
          <li>연애나 결혼처럼 부처궁의 흐름이 궁금한 관계의 갈림길에 서 있을 때</li>
          <li>대운이 바뀌는 시점이라 앞으로 10년의 큰 흐름을 미리 가늠하고 싶을 때</li>
          <li>사주로는 이미 상담을 받았지만 다른 체계로도 같은 고민을 겹쳐 확인하고 싶을 때</li>
        </ul>
        <h2>상담은 이렇게 진행됩니다</h2>
        <ol>
          <li>생년월일과 태어난 시간을 입력해 12궁 명반을 자동으로 세웁니다.</li>
          <li>명궁·재백궁·관록궁·부처궁 등 지금 궁금한 주제가 머무는 궁을 확인합니다.</li>
          <li>사화의 흐름과 지금 지나는 대운·유년을 겹쳐 상담 문장으로 정리해 드립니다.</li>
          <li>결과는 본인 계정에서 다시 열람하며 대운이 바뀔 때 다시 확인할 수 있습니다.</li>
        </ol>
        <p>
          같은 명반이라도 지금 지나는 대운과 유년에 따라 열리는 궁과 조심할 궁이 달라집니다.
          한 번의 상담으로 끝내기보다, 대운이 바뀌는 시점마다 다시 확인하면 지금 흐름에 맞는
          방향을 더 촘촘히 잡을 수 있습니다.
        </p>
        <h2>자주 묻는 질문</h2>
        {ziweiAiFaqItems.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
                  </ServiceIntroSection>
    </>
  );
}
