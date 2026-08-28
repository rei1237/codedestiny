import type { Metadata } from "next";
import SukuyoCompatibilityAiRouteClient from "./SukuyoCompatibilityAiRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import ServiceIntroSection from "../components/ServiceIntroSection";
import ImmersiveRelatedLinks from "../components/ImmersiveRelatedLinks";
import { buildKrwOffer } from "@/lib/seo/paid-offer";

const PAGE_PATH = "/sukuyo-compatibility-ai/";
const PAGE_TITLE = "숙요 궁합 상담 | 27수 관계 유형 1:1 해석 — Code Destiny";
const PAGE_DESCRIPTION =
  "두 사람의 27숙과 숙요점 관계 유형으로 끌림과 갈등의 리듬을 풀어 주는 1:1 궁합 상담입니다. 그 유형이 실제 갈등 장면에서 어떻게 드러나는지까지 짚습니다.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: "/sukuyo-compatibility-ai/",
  },
  openGraph: {
    title: "숙요점 궁합 전문가 상담",
    description: "붉은 실처럼 이어진 두 사람의 끌림과 갈등, 장기 관계의 흐름을 상담형으로 읽습니다.",
    url: "/sukuyo-compatibility-ai/",
    images: ["/fuctionassets/sukyo_premium.webp"],
  },
};

const sukuyoCompatibilityFaqItems = [
  {
    question: "숙요점 궁합 전문가 상담은 무엇을 봐주나요?",
    answer:
      "태어난 날의 달이 머문 자리로 정해지는 27숙을 기준으로, 두 사람 사이의 끌림과 갈등, 대화 방식의 궁합을 읽습니다. 연인, 부부, 오래된 친구처럼 이미 관계가 깊은 사이일수록 반복되는 패턴을 더 또렷하게 짚을 수 있습니다.",
  },
  {
    question: "27숙 궁합은 사주 궁합과 무엇이 다른가요?",
    answer:
      "사주 궁합이 두 사람의 여덟 글자 오행 균형을 겹쳐 본다면, 숙요점은 태어난 날의 달의 자리(숙)를 기준으로 정해진 관계 유형표를 따라 끌림과 충돌의 결을 읽습니다. 계산 방식이 단순해 결과를 빠르게 확인할 수 있는 것이 특징입니다.",
  },
  {
    question: "이미 사귀는 사이인데도 의미가 있나요?",
    answer:
      "오히려 이미 관계를 맺고 있는 사이일수록 도움이 됩니다. 왜 특정 상황에서 자주 부딪히는지, 어떤 대화 방식이 서로에게 편한지처럼 관계 안에서 반복되는 패턴을 확인하는 데 중점을 둔 상담이기 때문입니다.",
  },
  {
    question: "상대의 정확한 생년월일을 몰라도 볼 수 있나요?",
    answer:
      "정확한 생년월일이 있어야 27숙을 정확히 계산할 수 있습니다. 태어난 날짜만 알아도 계산은 가능하며, 시간 정보는 필요하지 않습니다.",
  },
  {
    question: "결과가 좋지 않게 나오면 관계를 정리해야 하나요?",
    answer:
      "아닙니다. 숙요점 궁합은 관계를 유지할지 말지 정해주는 판정이 아니라, 두 사람이 자주 부딪히는 지점과 그 이유를 미리 아는 참고 자료입니다. 갈등이 잦은 조합이라도 서로의 리듬을 이해하면 대화 방식을 조율할 여지가 늘어납니다.",
  },
  {
    question: "가족이나 친구 사이의 궁합도 볼 수 있나요?",
    answer:
      "네, 연인·부부 관계뿐 아니라 부모 자녀, 형제자매, 오래된 친구 사이에도 활용할 수 있습니다. 관계의 종류에 따라 끌림보다 대화 방식이나 갈등 패턴에 더 무게를 두고 해석을 참고하시면 좋습니다.",
  },
  {
    question: "결과는 다시 확인할 수 있나요?",
    answer:
      "네, 상담 결과는 본인 계정에서 다시 열람할 수 있습니다. 관계가 시간이 지나 달라졌거나 새로운 갈등이 생겼을 때 같은 조합을 다시 확인하면 지금 상황에 맞는 참고가 됩니다.",
  },
];

const sukuyoCompatibilityJsonLd = [
  buildServiceJsonLd({
    name: "숙요점 궁합 전문가 상담",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "숙요점 궁합 상담 서비스",
    // 🔴 가격은 서버 가격표에서 푼다(lib/seo/paid-offer.ts). 못 풀면 null 이라 offers 가 빠진다.
    //    통화는 언제나 KRW — 이니시스 해외카드 특약은 승인·정산이 모두 원화다.
    offer: buildKrwOffer("sukuyo-compatibility-ai", PAGE_PATH),
  }),
  buildFaqPageJsonLd(sukuyoCompatibilityFaqItems),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "숙요점 궁합 전문가 상담", path: PAGE_PATH },
  ]),
];

export default function SukuyoCompatibilityAiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sukuyoCompatibilityJsonLd) }}
      />
            <SukuyoCompatibilityAiRouteClient />
            <ServiceIntroSection label="숙요점 궁합 전문가 상담 안내">
        <h1>숙요 궁합 상담 — 27숙 관계 유형으로 읽는 두 사람</h1>
        <p>
          숙요점 궁합 전문가 상담은 태어난 날의 달이 머문 자리인 27숙을 기준으로 두 사람 사이의 끌림과
          갈등, 대화 방식의 궁합을 읽습니다. 연인, 부부, 오래된 친구처럼 이미 관계가 깊어진 사이일수록
          반복되는 패턴이 뚜렷하게 드러나, 왜 자주 같은 지점에서 부딪히는지 확인하는 데 도움이 됩니다.
        </p>
        <p>
          숙요점은 사주보다 계산이 단순해 결과를 빠르게 확인할 수 있으면서도, 관계 유형표를 통해
          두 사람이 서로에게 어떤 방식으로 끌리고 부딪히는지를 구체적으로 보여줍니다. 좋고 나쁨을
          단정하기보다, 서로 다른 리듬을 이해하는 데 초점을 둡니다.
        </p>
        <h2>이런 순간에 특히 도움이 됩니다</h2>
        <ul>
          <li>연인이나 배우자와 자주 같은 이유로 다투는 것 같아 원인을 짚고 싶을 때</li>
          <li>오래된 친구나 동료와의 관계에서 서로의 대화 방식 차이가 궁금할 때</li>
          <li>새로운 만남을 앞두고 상대와의 궁합을 미리 가볍게 참고하고 싶을 때</li>
          <li>사주 궁합과는 다른 방식으로 같은 관계를 한 번 더 확인해 보고 싶을 때</li>
        </ul>
        <h2>상담은 이렇게 진행됩니다</h2>
        <ol>
          <li>본인과 상대의 생년월일을 각각 입력합니다.</li>
          <li>두 사람의 27숙을 계산하고, 숙요점 관계 유형표에서 서로의 궁합 자리를 확인합니다.</li>
          <li>끌림과 갈등의 리듬, 대화에서 조심할 지점을 상담 문장으로 정리해 드립니다.</li>
          <li>결과는 본인 계정에서 다시 열람하며 관계가 달라질 때 다시 확인할 수 있습니다.</li>
        </ol>
        <p>
          숙요점 궁합은 관계의 좋고 나쁨을 판정하는 성적표가 아닙니다. 서로 다른 리듬을 가진 두
          사람이 어디에서 자연스럽게 맞고 어디에서 조율이 필요한지 미리 알아두면, 갈등이 생겼을 때도
          조금 더 여유 있게 대화를 이어갈 수 있습니다.
        </p>
        <p>
          27숙은 태어난 날의 달의 위치로 정해지므로 계산 자체는 간단하지만, 실제 해석은 두 사람의
          조합에 따라 매우 다양하게 갈립니다. 같은 상대라도 관계의 성격(연인인지, 가족인지, 동료인지)에
          따라 눈여겨봐야 할 지점이 달라지니 지금 궁금한 관계를 구체적으로 밝히고 질문하시길 권합니다.
        </p>
        <h2>자주 묻는 질문</h2>
        {sukuyoCompatibilityFaqItems.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
                  </ServiceIntroSection>
      <ImmersiveRelatedLinks fromPath="/sukuyo-compatibility-ai" />
    </>
  );
}
