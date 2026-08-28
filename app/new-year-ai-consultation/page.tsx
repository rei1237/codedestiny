import type { Metadata } from "next";
import NewYearAiRouteClient from "./NewYearAiRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";
import ServiceIntroSection from "../components/ServiceIntroSection";
import ImmersiveRelatedLinks from "../components/ImmersiveRelatedLinks";

const PAGE_PATH = "/new-year-ai-consultation/";
const PAGE_TITLE = "신년운세 보는 곳 | 새해 월별 운세·재물운·연애운 풀이";
const PAGE_DESCRIPTION =
  "생년월일로 새해의 큰 흐름을 미리 읽는 신년운세 상담입니다. 그해 세운이 내 명식과 만나는 자리를 보고 재물·연애·커리어와 월별 체크포인트를 짚습니다.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["신년운세", "새해 운세", "무료 신년운세", "월별 운세", "토정비결", "신년 사주", "전문가 신년운세"],
  alternates: {
    canonical: `${siteSeo.siteUrl}${PAGE_PATH}`,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: `${siteSeo.siteUrl}${PAGE_PATH}`,
    siteName: siteSeo.brandName,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "신년운세 전문가 상담" }],
  },
  twitter: {
    card: siteSeo.twitterCard,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [siteSeo.defaultOgImage],
  },
};

const newYearFaqItems = [
  {
    question: "신년운세 전문가 상담은 무엇을 알려주나요?",
    answer:
      "새해 한 해의 큰 흐름을 사주 명식의 세운(歲運) 관점에서 읽어 드립니다. 재물·관계·커리어의 결이 어느 계절에 열리고 어느 시기에 숨을 고르면 좋은지, 월별 체크포인트와 함께 상담 문장으로 정리합니다.",
  },
  {
    question: "토정비결과는 무엇이 다른가요?",
    answer:
      "토정비결이 정해진 괘 풀이를 찾아 읽는 방식이라면, 신년운세 전문가 상담은 내 생년월일로 세운 사주 명식과 그 해의 간지가 만나는 흐름을 개인별로 계산해 해석합니다. 같은 해라도 사람마다 다른 결의 풀이가 나옵니다.",
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
  {
    question: "가족 여러 명의 신년운세를 각각 볼 수 있나요?",
    answer:
      "네, 본인 외에도 가족 구성원의 생년월일을 각각 입력해 개별 상담을 받을 수 있습니다. 같은 해라도 사람마다 사주 명식이 다르므로 세운이 만드는 결도 각자 다르게 나타납니다.",
  },
  {
    question: "이직이나 이사 시기를 정할 때도 참고할 수 있나요?",
    answer:
      "네, 세운의 흐름을 따라 어느 달에 움직임이 순조롭고 어느 달에 신중해야 하는지를 함께 살피므로, 이직·이사·창업처럼 시기 선택이 중요한 계획을 세울 때 참고 자료로 활용하기 좋습니다.",
  },
  {
    question: "지난해 신년운세와 비교해서 봐도 되나요?",
    answer:
      "네, 여러 해의 상담 결과를 나란히 두고 비교하면 해마다 바뀌는 세운의 흐름과, 그 안에서도 크게 변하지 않는 자신의 기질을 함께 확인할 수 있어 스스로를 이해하는 데 도움이 됩니다.",
  },
  {
    question: "월별 체크포인트는 구체적으로 어떤 식으로 나오나요?",
    answer:
      "재물, 관계, 커리어 영역별로 흐름이 좋은 달과 신중해야 할 달을 짚어 드리며, 특히 눈에 띄는 달에는 그 이유가 되는 세운의 결도 함께 풀어 설명해 단순한 달력 이상의 참고가 되도록 구성합니다.",
  },
];

const newYearJsonLd = [
  buildServiceJsonLd({
    name: "신년운세 전문가 상담",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "신년운세 상담 서비스",
  }),
  buildFaqPageJsonLd(newYearFaqItems),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "신년운세 전문가 상담", path: PAGE_PATH },
  ]),
];

export default function NewYearAiConsultationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newYearJsonLd) }}
      />
            <NewYearAiRouteClient />
            <ServiceIntroSection label="신년운세 전문가 상담 안내">
        <h1>신년운세 보는 곳 — 새해 흐름과 월별 운세 풀이</h1>
        <p>
          신년운세 전문가 상담은 생년월일로 세운 사주 명식 위에 새해의 간지가 만드는 세운의 흐름을
          겹쳐 읽습니다. 한 해의 재물운과 관계운, 일과 커리어의 결이 어느 달에 열리는지,
          어느 시기에 무리하지 않고 숨을 고르는 편이 좋은지 월별 체크포인트로 정리해 드립니다.
        </p>
        <p>
          새해 운세는 한 해를 단정하는 예언이 아니라, 계절의 흐름을 미리 아는 달력에 가깝습니다.
          연초가 아니어도 남은 달의 방향을 잡거나 다가올 해를 미리 살피는 데 언제든 활용할 수 있습니다.
        </p>
        <p>
          같은 해라도 사람마다 사주 명식이 다르기 때문에 세운이 만드는 결도 저마다 다릅니다.
          막연히 좋다·나쁘다로 나누기보다, 어느 달에 무리하지 않는 편이 좋고 어느 달에 움직임을
          시작하면 좋은지 구체적인 체크포인트로 정리해 드립니다. 재물, 관계, 커리어처럼 영역별로
          나누어 살피면 같은 해라도 시기에 따라 다르게 대응할 부분이 또렷해집니다.
        </p>
        <h2>이런 분께 추천합니다</h2>
        <ul>
          <li>새해를 앞두고 한 해 전체의 큰 흐름을 미리 가늠해 마음의 준비를 하고 싶을 때</li>
          <li>이직, 이사, 창업처럼 시기 선택 자체가 중요한 계획을 앞두고 있을 때</li>
          <li>재물이나 관계에서 특히 조심해야 할 달이 언제인지 미리 알아두고 싶을 때</li>
          <li>연중에 지나온 반년을 되짚어 보고 남은 달의 방향을 다시 잡고 싶을 때</li>
        </ul>
        <h2>상담은 이렇게 진행됩니다</h2>
        <ol>
          <li>생년월일을 입력해 사주 명식과 해당 연도의 세운을 함께 세웁니다.</li>
          <li>재물·관계·커리어별로 한 해 동안의 흐름을 월별 체크포인트로 나눠 확인합니다.</li>
          <li>지금 가장 궁금한 주제를 중심으로 상담 문장을 정리해 보여 드립니다.</li>
          <li>필요하면 월별 가이드를 담은 신년 리포트 PDF로도 정리해 볼 수 있습니다.</li>
        </ol>
        <p>
          한 해의 흐름을 미리 안다고 해서 노력 없이 결과가 정해지는 것은 아닙니다. 다만 어느 달에
          힘을 모으고 어느 달에 숨을 고를지 미리 알아두면, 같은 노력도 더 순조로운 시점에 쓸 수
          있습니다.
        </p>
        <h2>자주 묻는 질문</h2>
        {newYearFaqItems.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
                  </ServiceIntroSection>
      <ImmersiveRelatedLinks fromPath="/new-year-ai-consultation" />
    </>
  );
}
