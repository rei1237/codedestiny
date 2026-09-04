import type { Metadata } from "next";
import SukuyoCompatibilityAiRouteClient from "./SukuyoCompatibilityAiRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import SukuyoNarrativeSections from "./_sections/SukuyoNarrativeSections";
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
      <SukuyoNarrativeSections faqItems={sukuyoCompatibilityFaqItems} />
      <ImmersiveRelatedLinks fromPath="/sukuyo-compatibility-ai" />
    </>
  );
}
