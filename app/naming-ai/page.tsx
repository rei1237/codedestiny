import type { Metadata } from "next";
import NamingAiRouteClient from "./NamingAiRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";
import { getSeoProfileKeywords } from "../../lib/seo/entity-registry.mjs";
import { mergeKeywords } from "../../lib/seo-metadata";
import ServiceIntroSection from "../components/ServiceIntroSection";
import ImmersiveRelatedLinks from "../components/ImmersiveRelatedLinks";
import { buildKrwOffer } from "@/lib/seo/paid-offer";

const PAGE_PATH = "/naming-ai/";
const PAGE_TITLE = "무료 작명 사이트 · 사주 용신 이름 추천 | 훈민정음 작명소";
const PAGE_DESCRIPTION =
  "성씨와 생년월일만 넣으면 사주 용신에 맞는 이름 후보를 무료로 추천하는 작명 사이트입니다. 소리오행·자원오행·수리 4격을 함께 본 결과를 확인하세요.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: mergeKeywords(getSeoProfileKeywords("/naming-ai"), [
    "작명",
    "작명 사이트",
    "무료 작명 사이트",
    "이름 작명",
    "아기 이름",
    "아기 이름 짓기",
    "개명",
    "한자 이름",
    "전문가 작명",
    "용신 작명",
  ]),
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
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "훈민정음 작명소" }],
  },
  twitter: {
    card: siteSeo.twitterCard,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [siteSeo.defaultOgImage],
  },
};

const namingAiFaqItems = [
  {
    question: "훈민정음 작명소는 어떤 방식으로 이름을 지어주나요?",
    answer:
      "생년월일(양력/음력)로 세운 사주 명식에서 일간의 강약과 조후, 용신·희신·기신을 먼저 확인합니다. 이 오행 균형을 기준으로 소리오행(초성 흐름), 자원오행(한자의 뜻과 부수), 수리오행(원형이정 4격)을 함께 살펴 사주를 보완하는 이름을 제안하는 프리미엄 프롬프트를 만들어 드립니다.",
  },
  {
    question: "이미 생각해둔 이름이 있어도 이용할 수 있나요?",
    answer:
      "네, 현재 생각 중인 이름이나 후보 이름을 입력하면 그 이름들을 먼저 사주 보완도·소리오행·한자 의미·수리 길흉·현대적 사용성 기준으로 평가한 뒤, 더 나은 대안을 추가로 제안합니다. 후보가 없다면 처음부터 새로 이름을 제안받을 수도 있습니다.",
  },
  {
    question: "무료로 볼 수 있는 부분이 있나요?",
    answer:
      "성씨와 원하는 분위기만 입력해도 무료 초안 추천에서 이름 후보와 분위기 키워드를 바로 확인할 수 있습니다. 프리미엄 프롬프트 생성(30,000원)은 사주 용신 검증, 한자 조합 상세, 소리오행·수리오행 분석, 최종 추천까지 담은 전체 결과가 필요할 때만 진행하면 됩니다.",
  },
  {
    question: "한자 이름을 원하지 않아도 되나요?",
    answer:
      "가능합니다. 한글 이름 중심을 선택하면 한자보다 소리오행과 수리 분석에 더 비중을 두어 결과를 정리하며, 한자는 참고용으로만 제시합니다.",
  },
  {
    question: "결제 후 결과를 다시 볼 수 있나요?",
    answer:
      "네, 생성된 프롬프트는 결제한 계정에서 언제든 다시 열람할 수 있습니다. 같은 입력값으로 다시 요청하면 이미 결제한 결과를 그대로 다시 보여주므로 중복 결제되지 않습니다.",
  },
  {
    question: "출생시간을 모르면 이용할 수 없나요?",
    answer:
      "출생시간을 몰라도 이용할 수 있습니다. 시주(時柱)가 확정되지 않았다는 점을 밝히고, 시주에 크게 의존하는 판단은 유보한 채 년·월·일주를 기준으로 분석을 진행합니다.",
  },
];

const namingAiJsonLd = [
  buildServiceJsonLd({
    name: "훈민정음 작명소 — 사주 맞춤 전문가 작명 프롬프트",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "사주 작명 서비스",
    // 🔴 가격은 서버 가격표에서 푼다(lib/seo/paid-offer.ts). 못 풀면 null 이라 offers 가 빠진다.
    //    통화는 언제나 KRW — 이니시스 해외카드 특약은 승인·정산이 모두 원화다.
    offer: buildKrwOffer("premium-naming-prompt", PAGE_PATH),
  }),
  buildFaqPageJsonLd(namingAiFaqItems),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "훈민정음 작명소", path: PAGE_PATH },
  ]),
];

export default function NamingAiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(namingAiJsonLd) }}
      />
            <NamingAiRouteClient />
            <ServiceIntroSection label="훈민정음 작명소 안내">
        <h1>작명 사이트 — 사주 용신으로 보는 이름 추천 (훈민정음 작명소)</h1>
        <p>
          훈민정음 작명소는 생년월일로 세운 사주 명식을 바탕으로 이름을 짓는 프리미엄 작명 프롬프트
          생성 서비스입니다. 일간의 강약, 조후, 용신·희신·기신 판단을 먼저 확인한 뒤 이 오행 균형을
          보완하는 방향으로 소리오행(초성의 흐름), 자원오행(한자의 뜻과 부수), 수리오행(원형이정
          4격)을 함께 짚어 이름을 제안합니다.
        </p>
        <p>
          이름은 사람이 평생 듣고 부르는 첫 언어이자, 사주에서 부족한 기운을 일상적으로 채워주는
          장치입니다. 태명이나 새로 태어날 아기의 이름, 개명을 고민 중인 이름 모두에 활용할 수
          있으며, 이미 생각해둔 이름이 있다면 그 이름을 먼저 평가받은 뒤 더 나은 대안을 함께
          제안받을 수 있습니다.
        </p>
        <h2>이런 상황에 도움이 됩니다</h2>
        <ul>
          <li>
            출산을 앞두고 태명이 아닌 정식 이름을 고민 중일 때 — 사주 용신을 기준으로 자원오행과
            소리오행이 함께 맞는 이름 후보를 받아볼 수 있습니다.
          </li>
          <li>
            이미 후보 이름 몇 개를 추려두었지만 어느 쪽이 더 나은지 판단이 서지 않을 때 — 각 후보를
            사주 보완도·수리 길흉·현대적 사용성 기준으로 비교해 드립니다.
          </li>
          <li>
            개명을 고민 중이지만 한자나 수리를 어떻게 확인해야 할지 막막할 때 — 원형이정 4격 계산과
            인명용 한자 여부까지 함께 짚어 드립니다.
          </li>
          <li>
            형제자매 이름과의 조화나 돌림자를 지키면서도 사주에 맞는 이름을 찾고 싶을 때 도움이
            됩니다.
          </li>
        </ul>
        <h2>이용 순서</h2>
        <ol>
          <li>성별, 생년월일(양력/음력), 출생시간(모르면 미상으로 진행 가능), 성씨를 입력합니다.</li>
          <li>
            성씨와 원하는 분위기만 입력해도 무료 초안 추천에서 이름 후보와 분위기 키워드를 먼저
            확인할 수 있습니다.
          </li>
          <li>
            원하는 이름 글자 수, 후보 이름, 사용하고 싶은 음절, 피하고 싶은 글자 등 세부 조건을
            선택적으로 정리합니다.
          </li>
          <li>
            결제(단건 30,000원, 이용권, 월정석 중 가능한 방식) 후 사주 용신 검증부터 한자 조합
            상세, 소리오행·수리오행 분석, 최종 1순위 추천까지 담은 프리미엄 프롬프트를 받습니다.
          </li>
        </ol>
        <p>
          이름 하나로 인생이 전부 결정되지는 않습니다. 다만 매일 불리는 이름이 사주의 부족한 기운을
          조금이라도 보완할 수 있다면, 그 편이 더 좋은 선택일 수 있습니다. 최종 이름은 호적 등록
          전 인명용 한자 여부를 다시 한 번 확인하시길 권합니다.
        </p>
        <h2>작명이 보는 네 가지 층</h2>
        <p>
          좋은 이름은 어감만으로 정해지지 않습니다. 훈민정음 작명소는 네 개의 층을 차례로 겹쳐
          후보를 좁힙니다.
        </p>
        <ul>
          <li>
            <strong>사주 용신</strong> — 태어난 명식에서 부족하거나 과한 기운을 먼저 판정합니다.
            이름이 채워야 할 방향이 여기서 정해지며, 나머지 층은 모두 이 방향 위에서 검토됩니다.
          </li>
          <li>
            <strong>소리오행</strong> — 한글 초성이 갖는 오행(어금닛소리 ㄱㅋ 목, 혓소리 ㄴㄷㄹㅌ 화,
            목구멍소리 ㅇㅎ 토, 잇소리 ㅅㅈㅊ 금, 입술소리 ㅁㅂㅍ 수)으로 이름을 부를 때 실제로 울리는
            기운을 봅니다. 성씨의 초성 오행에서 시작해 이름 끝까지 상생으로 이어지는지 계산하며, 매일
            불리는 소리라 체감이 가장 큽니다.
          </li>
          <li>
            <strong>수리오행</strong> — 한자 획수의 조합이 만드는 원격·형격·이격·정격 네 격의 수리를
            81수리 길흉 기준으로 봅니다. 획수는 강희자전 원획으로 세며, 성씨 획수가 고정되어 있어
            이름 글자의 획수 선택 폭이 여기서 좁혀집니다.
          </li>
          <li>
            <strong>한자 자원오행과 뜻</strong> — 같은 음이라도 한자마다 오행과 의미가 다릅니다.
            인명용 한자 범위 안에서 뜻이 어긋나지 않는 조합만 남깁니다.
          </li>
        </ul>
        <h2>어떤 이름을 짓느냐에 따라 보는 곳이 다릅니다</h2>
        <p>
          <strong>신생아 이름</strong>은 출생 시각까지 확보되는 경우가 많아 네 층을 모두 정밀하게
          맞출 수 있습니다. 형제자매가 있으면 돌림자와 소리의 균형을 함께 봅니다.{" "}
          <strong>개명</strong>은 이미 살아온 시간이 있어, 기존 이름이 눌러 온 기운을 먼저 확인한 뒤
          그 반대 방향으로 보완합니다. 완전히 다른 결로 바꾸기보다 부족했던 한 축을 채우는 편이
          적응이 빠릅니다.
        </p>
        <p>
          <strong>영문 이름</strong>은 한자 획수 대신 발음의 오행과 모국어 이름과의 어울림을 봅니다.{" "}
          <strong>상호·브랜드명</strong>은 대표자의 사주보다 업종의 성격과 소리의 인상이 우선입니다.
          같은 작명이라도 목적이 다르면 기준의 순서가 달라집니다.
        </p>
        <h2>이름을 고를 때 자주 놓치는 것</h2>
        <p>
          획수만 맞추면 된다고 생각해 부르기 어려운 이름을 고르는 경우가 많습니다. 이름은 평생 소리로
          불리므로, 발음이 뭉개지거나 별명으로 변형되기 쉬운 조합은 수리가 좋아도 권하지 않습니다.
          반대로 어감만 보고 정하면 사주의 부족한 기운을 오히려 더 눌러 버릴 수 있습니다. 두 기준이
          부딪힐 때는 부르기 편한 쪽을 먼저 남기고 그 안에서 기운을 맞추는 순서가 현실적입니다.
        </p>
        <h2>자주 묻는 질문</h2>
        {namingAiFaqItems.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </ServiceIntroSection>
      <ImmersiveRelatedLinks fromPath="/naming-ai" />
    </>
  );
}
