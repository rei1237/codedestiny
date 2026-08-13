import type { Metadata } from "next";
import VedicAiRouteClient from "./VedicAiRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";
import ServiceIntroSection from "../components/ServiceIntroSection";

const PAGE_PATH = "/vedic-ai/";
const PAGE_TITLE = "베다 점성술 전문가 상담 | 나크샤트라·다샤 해석 — Code Destiny";
const PAGE_DESCRIPTION =
  "인도 조티쉬(Jyotish) 전통의 나크샤트라와 행성 배치, 다샤 주기로 지금의 질문을 읽는 베다 점성술 전문가 상담. 달이 머문 별자리의 결과 시기 흐름을 상담 문장으로 풀어 드립니다.";

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
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "베다 점성술 전문가 상담" }],
  },
  twitter: {
    card: siteSeo.twitterCard,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [siteSeo.defaultOgImage],
  },
};

const vedicAiFaqItems = [
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
  {
    question: "궁합을 볼 때도 나크샤트라를 쓰나요?",
    answer:
      "네, 베다 전통에서는 두 사람의 달 나크샤트라 사이 궁합을 따지는 방식이 널리 쓰입니다. 상담에서도 개인 리딩뿐 아니라 관계의 결을 함께 확인하고 싶을 때 나크샤트라 궁합을 참고 자료로 활용할 수 있습니다.",
  },
  {
    question: "서양 점성술과 결과가 다르게 나오면 어떻게 받아들이면 되나요?",
    answer:
      "두 체계는 황도대 기준 자체가 달라 같은 생년월일이라도 강조하는 지점이 다를 수 있습니다. 어느 한쪽이 틀린 것이 아니라 서로 다른 언어로 같은 삶을 비추는 것이니, 두 해석이 겹치는 지점을 특히 눈여겨보시길 권합니다.",
  },
  {
    question: "가족이나 자녀의 차트도 함께 볼 수 있나요?",
    answer:
      "네, 본인 외에 가족 구성원의 생년월일을 따로 입력해 각자의 라시 차트와 나크샤트라를 확인할 수 있습니다. 다만 미성년 자녀 등 타인의 정보를 입력할 때는 당사자의 동의를 구한 뒤 이용하시길 권합니다.",
  },
];

const vedicAiJsonLd = [
  buildServiceJsonLd({
    name: "베다 점성술 전문가 상담",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "베다 점성술 상담 서비스",
  }),
  buildFaqPageJsonLd(vedicAiFaqItems),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "베다 점성술", path: "/vedic/" },
    { name: "베다 점성술 전문가 상담", path: PAGE_PATH },
  ]),
];

export default function VedicAiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vedicAiJsonLd) }}
      />
            <VedicAiRouteClient />
            <ServiceIntroSection label="베다 점성술 전문가 상담 안내">
        <h1>베다 점성술 전문가 상담 — 나크샤트라와 다샤의 흐름</h1>
        <p>
          베다 점성술 전문가 상담은 인도 조티쉬 전통을 따라 사이더리얼 황도대 위에 라시 차트를 세우고,
          달이 머문 나크샤트라의 결과 행성들의 배치, 지금 지나는 다샤의 주기를 함께 읽습니다.
          관계와 일, 마음의 방향처럼 오래 머문 질문을 시기의 흐름 위에서 비춰 드립니다.
        </p>
        <p>
          태어난 시간을 알면 라그나까지 정밀해지지만, 몰라도 나크샤트라 중심의 해석으로 시작할 수
          있습니다. 별의 언어는 단정이 아니라 리듬입니다 — 지금의 다샤가 어떤 계절인지 알면
          선택의 무게가 한결 가벼워집니다.
        </p>
        <p>
          조티쉬는 수천 년 동안 이어져 온 인도의 전통 점성 체계로, 사이더리얼 황도대와 나크샤트라,
          다샤라는 고유한 시기 언어를 갖고 있습니다. 서양 점성술을 이미 접해 본 분이라도 새로운
          관점에서 같은 질문을 다시 비춰 볼 수 있습니다.
        </p>
        <h2>이런 순간에 특히 도움이 됩니다</h2>
        <ul>
          <li>
            같은 질문을 서양 점성술로 이미 봤지만, 사이더리얼 황도대를 쓰는 다른 관점에서도
            한 번 더 확인해 보고 싶을 때
          </li>
          <li>
            지금 지나는 시기가 다샤상 어떤 흐름인지, 언제쯤 분위기가 바뀔지 궁금해 미리
            마음의 준비를 하고 싶을 때
          </li>
          <li>두 사람의 나크샤트라 궁합을 참고해 관계에서 반복되는 결을 살펴보고 싶을 때</li>
          <li>진로나 이직처럼 시기 선택 자체가 중요한 결정을 앞두고 있을 때</li>
        </ul>
        <h2>상담은 이렇게 진행됩니다</h2>
        <ol>
          <li>생년월일과 가능하면 태어난 시간·장소를 입력해 사이더리얼 기준의 라시 차트를 세웁니다.</li>
          <li>
            달이 머문 나크샤트라와 주요 행성의 배치, 지금 지나는 다샤 주기를 함께
            확인합니다.
          </li>
          <li>지금 궁금한 질문을 시기의 흐름 위에 겹쳐 읽기 쉬운 상담 문장으로 정리해 드립니다.</li>
          <li>
            결과는 본인 계정에서 다시 열람할 수 있고, 다음 다샤로 넘어가는 시점에 다시 확인해
            보시길 권합니다.
          </li>
        </ol>
        <p>
          베다 점성술은 인생 전체를 미리 정해진 대본처럼 보여주지 않습니다. 오히려 지금이 어떤
          계절인지 알려줘, 서두를 때와 기다릴 때를 스스로 가늠할 수 있게 돕는 데 더 가깝습니다.
        </p>
        <h2>자주 묻는 질문</h2>
        {vedicAiFaqItems.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
                  </ServiceIntroSection>
    </>
  );
}
