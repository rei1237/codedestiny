import type { Metadata } from "next";
import KarmaDestinyAiRouteClient from "./KarmaDestinyAiRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";
import ServiceIntroSection from "../components/ServiceIntroSection";

const PAGE_PATH = "/karma-destiny-ai/";
const PAGE_TITLE = "운명의 업 전문가 상담 | 반복되는 인생 패턴 리딩 — Code Destiny";
const PAGE_DESCRIPTION =
  "사주·자미두수·숙요 27수·서양 점성술·베다 다섯 관점을 하나의 운명 지도로 잇는 운명의 업 전문가 상담. 같은 자리에서 되풀이되는 선택의 결을 관점별로 다르게 짚어 하나의 결론으로 모아 드립니다.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["카르마", "업보 풀이", "인생 패턴", "반복되는 문제", "사주 카르마", "자미두수", "숙요 27수", "노스노드", "운명 상담"],
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
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "운명의 업 전문가 상담" }],
  },
  twitter: {
    card: siteSeo.twitterCard,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [siteSeo.defaultOgImage],
  },
};

const karmaFaqItems = [
  {
    question: "운명의 업 전문가 상담은 무엇을 봐주나요?",
    answer:
      "관계에서, 일에서, 선택의 순간마다 비슷한 자리로 되돌아오는 반복의 문양을 읽습니다. 사주 명식의 강한 십성 흐름, 점성술의 노드 축, 베다의 다샤 주기를 함께 겹쳐 지금 삶이 되풀이하는 주제와 그 매듭을 푸는 방향을 살핍니다.",
  },
  {
    question: "카르마 리딩은 전생을 알려주는 것인가요?",
    answer:
      "전생의 장면을 단정해 보여주는 상담이 아닙니다. 카르마는 '지금까지 쌓인 관성'에 가깝습니다. 상담은 타고난 명식과 별의 배치에서 유난히 힘이 몰린 자리를 찾아, 그 관성이 지금 어떤 선택 패턴으로 나타나는지를 읽는 데 집중합니다.",
  },
  {
    question: "다섯 관점을 함께 본다는 것이 무슨 뜻인가요?",
    answer:
      "다섯 개의 운세를 각각 보여 드리는 것이 아니라, 하나의 운명을 다섯 개의 렌즈로 보는 구조입니다. 사주는 기질과 결정 구조를, 자미두수는 그 구조가 펼쳐지는 삶의 무대와 사회적 역할을, 숙요 27수는 사람 사이에서 서게 되는 자리를, 서양 점성술은 그 선택을 붙드는 무의식의 이유를, 베다는 이번 생이 요구하는 성장 방향을 맡습니다. 각 관점은 앞선 관점이 답할 수 없었던 질문에만 답하므로 같은 말이 되풀이되지 않습니다.",
  },
  {
    question: "결론이 어떤 근거에서 나왔는지 확인할 수 있나요?",
    answer:
      "각 장에 '왜 이런 결론이 나왔나요?' 패널을 두어, 그 장이 실제로 참고한 계산값(일간·오행 균형·명궁·나크샤트라·본명숙 등)을 그대로 확인할 수 있습니다. 계산되지 않은 항목은 추측해 채우지 않고 없는 대로 밝히며, 출생시간처럼 정보가 부족해 단정할 수 없는 값에는 별도 표시가 붙습니다.",
  },
  {
    question: "어떤 고민에 잘 맞나요?",
    answer:
      "\"왜 항상 비슷한 사람을 만날까\", \"왜 같은 지점에서 일이 틀어질까\"처럼 반복 자체가 질문인 고민에 잘 맞습니다. 단발성 선택보다 오래 이어진 패턴을 짚고 싶을 때 권합니다.",
  },
  {
    question: "결과가 불안하게 느껴지면 어떻게 하나요?",
    answer:
      "카르마 리딩은 반복을 벌로 해석하지 않습니다. 관성의 방향을 안 뒤에는 같은 자리에서 다른 선택을 시도해 볼 여지가 늘어난다는 데 의미가 있으니, 결과를 단정보다 참고로 받아들이시길 권합니다.",
  },
  {
    question: "태어난 시간을 정확히 몰라도 볼 수 있나요?",
    answer:
      "태어난 시간이 정확하면 노드 축과 다샤 주기를 더 정밀하게 겹쳐 볼 수 있지만, 시간을 모르더라도 사주 명식의 십성 흐름을 중심으로 반복 패턴을 살피는 해석은 가능합니다. 아는 범위에서 편하게 시작해 보세요.",
  },
  {
    question: "결과를 다른 상담과 함께 참고해도 되나요?",
    answer:
      "네, 카르마 리딩은 사주·타로 같은 다른 상담과 서로 배치되지 않습니다. 오히려 여러 관점이 같은 주제를 가리킬 때 지금 다뤄야 할 과제가 무엇인지 더 뚜렷하게 확인할 수 있습니다.",
  },
];

const karmaJsonLd = [
  buildServiceJsonLd({
    name: "운명의 업 전문가 상담",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "운명 패턴 상담 서비스",
  }),
  buildFaqPageJsonLd(karmaFaqItems),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운명의 업 전문가 상담", path: PAGE_PATH },
  ]),
];

export default function KarmaDestinyAiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(karmaJsonLd) }}
      />
            <KarmaDestinyAiRouteClient />
            <ServiceIntroSection label="운명의 업 전문가 상담 안내">
        <h1>운명의 업 전문가 상담 — 반복되는 인생 패턴 리딩</h1>
        <p>
          운명의 업은 삶에서 되풀이되는 문양을 읽는 전문가 상담입니다. 다섯 개의 운세를 각각
          보여 드리는 것이 아니라, 하나의 운명을 다섯 개의 렌즈로 바라봅니다. 사주 명식에서 힘이
          몰린 십성의 자리가 기질과 결정 구조를 세우고, 자미두수의 명궁과 12궁이 그 구조가 펼쳐지는
          무대를 지정하며, 숙요 27수가 사람과 사람 사이에서 서게 되는 자리를 알려 줍니다.
        </p>
        <p>
          여기에 서양 점성술이 그 선택을 붙드는 무의식의 이유를, 베다 다샤가 지금 시기가 요구하는
          성장의 방향을 덧댑니다. 다섯 관점은 같은 말을 반복하지 않습니다. 앞선 관점이 답할 수
          없었던 질문에만 다음 관점이 답하도록 상담문이 설계되어 있습니다.
        </p>
        <p>
          카르마는 벌이나 낙인이 아니라 쌓여 온 관성입니다. 관성의 방향을 알면 같은 자리로
          돌아가던 걸음을 다른 길로 옮길 수 있습니다. 오래 이어진 고민일수록 이 상담의 결과
          잘 맞습니다.
        </p>
        <p>
          단순히 성향을 설명하는 데 그치지 않고, 다섯 관점이 겹치는 지점을 찾아 지금 삶에서 가장
          힘이 쏠린 주제를 짚어 드립니다. 각 장에는 그 결론이 어떤 계산값에서 나왔는지 확인할 수
          있는 근거를 함께 두었고, 계산되지 않은 항목은 추측하지 않고 없는 대로 밝힙니다. 여러
          관점이 같은 방향을 가리킬 때 그 반복은 우연이 아니라 지금 다뤄야 할 과제일 가능성이 높습니다.
        </p>
        <h2>이런 고민에 특히 도움이 됩니다</h2>
        <ul>
          <li>
            연애든 일이든 비슷한 유형의 상대나 상황을 계속 다시 만나는 것 같아 스스로도 이유가
            궁금할 때
          </li>
          <li>노력해도 늘 같은 지점에서 일이 어긋나는 패턴이 반복되어 원인을 짚고 싶을 때</li>
          <li>지금의 어려움이 그저 우연인지, 아니면 오래 다뤄야 할 과제인지 구분하고 싶을 때</li>
          <li>단발성 조언보다 삶 전체를 관통하는 큰 흐름을 짚어 보고 싶을 때</li>
        </ul>
        <h2>상담은 이렇게 진행됩니다</h2>
        <ol>
          <li>생년월일과 태어난 시간을 입력해 사주 명식·자미두수 명반·숙요 본명숙·점성술 차트를 함께 세웁니다.</li>
          <li>십성의 강한 자리, 명궁과 12궁의 배치, 27수의 관계축, 노스노드·새턴의 축, 베다 다샤의 흐름이 겹치는 지점을 찾습니다.</li>
          <li>각 장을 담당 관점의 언어로 나눠 쓰고, 마지막에 다섯 관점을 하나의 결론으로 모읍니다.</li>
          <li>결과는 본인 계정에서 다시 열람하며 시간을 두고 곱씹어 볼 수 있습니다.</li>
        </ol>
        <p>
          반복되는 패턴을 알았다고 해서 곧바로 다른 선택을 하기는 쉽지 않습니다. 다만 그 패턴이
          우연이 아니라 이름을 붙일 수 있는 흐름이라는 것을 아는 것만으로도, 다음번 같은 상황이
          왔을 때 한 박자 멈춰 다른 길을 고민해 볼 여지가 생깁니다.
        </p>
        <h2>자주 묻는 질문</h2>
        {karmaFaqItems.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
                  </ServiceIntroSection>
    </>
  );
}
