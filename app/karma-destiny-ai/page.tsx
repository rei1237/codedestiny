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
  "사주와 서양 점성술, 베다의 흐름을 함께 겹쳐 삶에서 반복되는 문양과 지금의 과제를 읽는 운명의 업 전문가 상담. 같은 자리에서 되풀이되는 선택의 결을 상담 문장으로 풀어 드립니다.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["카르마", "업보 풀이", "인생 패턴", "반복되는 문제", "사주 카르마", "노스노드", "운명 상담"],
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
  robots: {
    index: true,
    follow: true,
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
    question: "세 가지 체계를 함께 본다는 것이 무슨 뜻인가요?",
    answer:
      "사주는 오행과 십성의 균형으로 기질을, 서양 점성술은 노스노드·새턴 같은 축으로 성장 방향을, 베다는 다샤로 시기의 리듬을 보여줍니다. 세 체계가 같은 자리를 가리킬 때 그 주제가 지금 삶의 과제일 가능성이 높다고 읽습니다.",
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
          운명의 업은 삶에서 되풀이되는 문양을 읽는 전문가 상담입니다. 사주 명식에서 힘이 몰린 십성의
          자리, 서양 점성술의 노드 축이 가리키는 성장 방향, 베다 다샤가 알려주는 시기의 리듬 —
          세 체계를 겹쳐 지금 반복되는 관계와 선택의 패턴이 어디에서 비롯되는지 살핍니다.
        </p>
        <p>
          카르마는 벌이나 낙인이 아니라 쌓여 온 관성입니다. 관성의 방향을 알면 같은 자리로
          돌아가던 걸음을 다른 길로 옮길 수 있습니다. 오래 이어진 고민일수록 이 상담의 결과
          잘 맞습니다.
        </p>
        <p>
          단순히 성향을 설명하는 데 그치지 않고, 사주·서양 점성술·베다 세 체계가 겹치는 지점을
          찾아 지금 삶에서 가장 힘이 쏠린 주제를 짚어 드립니다. 여러 체계가 같은 방향을 가리킬 때
          그 반복은 우연이 아니라 지금 다뤄야 할 과제일 가능성이 높습니다.
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
          <li>생년월일과 태어난 시간을 입력해 사주 명식과 점성술 차트를 함께 세웁니다.</li>
          <li>십성의 강한 자리, 노스노드·새턴의 축, 베다 다샤의 흐름이 겹치는 지점을 찾습니다.</li>
          <li>반복되는 주제와 그 매듭을 푸는 방향을 상담 문장으로 정리해 드립니다.</li>
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
