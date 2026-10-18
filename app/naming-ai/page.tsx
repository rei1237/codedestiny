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
const PAGE_TITLE = "이름 추천·무료 초안·사주 작명 | 꿀꿀 운세";
const PAGE_DESCRIPTION =
  "성씨와 원하는 분위기로 아기 이름·개명 후보의 무료 초안을 살펴보세요. 사주·한자 뜻·소리오행·수리 4격을 검토하는 상세 작명서는 별도 유료 서비스입니다.";
const namingOffer = buildKrwOffer("premium-naming-prompt", PAGE_PATH);
const namingPriceLabel = namingOffer ? `${Number(namingOffer.price).toLocaleString("ko-KR")}원` : "결제 화면에 표시된 금액";

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
    "사주 작명",
    "이름 추천",
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
      "무료 초안은 성씨와 이름의 길이, 원하는 분위기 등 입력 조건에 맞는 후보를 보여줍니다. 생년월일 계산이 가능한 경우 사주 오행 힌트도 반영합니다. 별도 유료 작명에서는 출생정보를 바탕으로 소리오행, 한자의 뜻과 자원오행, 수리 4격을 검토하는 해설과 작명 프롬프트를 제공합니다.",
  },
  {
    question: "이미 생각해둔 이름이 있어도 이용할 수 있나요?",
    answer:
      "네, 현재 생각 중인 이름이나 후보 이름을 입력하면 그 이름들을 먼저 사주 보완도·소리오행·한자 의미·수리 길흉·현대적 사용성 기준으로 평가한 뒤, 더 나은 대안을 추가로 제안합니다. 후보가 없다면 처음부터 새로 이름을 제안받을 수도 있습니다.",
  },
  {
    question: "무료로 볼 수 있는 부분이 있나요?",
    answer:
      `이름 후보와 분위기 키워드를 살펴보는 초안 추천은 무료입니다. 초안은 상세 한자 검토를 마친 최종 작명서가 아닙니다. 사주와 한자 조합을 함께 살펴보는 프리미엄 작명은 단건 ${namingPriceLabel}이며, 적용 가능한 이용권·월정석과 최종 조건은 결제 화면에서 확인합니다.`,
  },
  {
    question: "한자 이름을 원하지 않아도 되나요?",
    answer:
      "가능합니다. 한글 이름 중심을 선택하면 한자보다 소리오행과 수리 분석에 더 비중을 두어 결과를 정리하며, 한자는 참고용으로만 제시합니다.",
  },
  {
    question: "결제 후 결과를 다시 볼 수 있나요?",
    answer:
      "완료된 작명 결과는 이용한 계정의 저장 결과에서 다시 열 수 있습니다. 기존 결과 재열람과 새 조건으로 작명을 요청하는 것은 다르므로, 다시 보고 싶을 때는 저장된 결과를 선택하세요.",
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
    offer: namingOffer,
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
            <div id="naming-start"><NamingAiRouteClient /></div>
            <ServiceIntroSection label="훈민정음 작명소 안내">
        <h1>이름 추천과 사주 작명 — 훈민정음 작명소</h1>
        <p>
          훈민정음 작명소는 출생 정보와 원하는 조건을 바탕으로 이름 후보와 작명 해설을 제공하는
          서비스입니다. 먼저 무료 초안으로 이름의 소리와 분위기를 살펴보세요. 별도 유료 작명에서
          한자 작명 조건을 충족하면 성씨 한자와 이름의 획수, 소리오행, 자원오행, 수리 4격을
          비교하는 작명서를 읽을 수 있습니다. 완성된 결과 화면에서는 PDF 저장도 지원합니다.
        </p>
        <p>
          이름은 오래 듣고 부를 말입니다. 마음에 둔 후보가 있다면 원하는 뜻과 분위기, 돌림자처럼
          중요한 조건을 함께 적어 주세요. 사주와 작명 학파의 해석은 비교를 위한 참고로 삼고,
          가족이 담고 싶은 의미와 자연스럽게 부를 수 있는 소리를 함께 살펴보세요.
        </p>
        <h2>이런 상황에 도움이 됩니다</h2>
        <ul>
          <li>
            아기 이름의 후보를 좁히고 싶을 때 — 먼저 원하는 뜻과 소리로 초안을 고르고,
            출생정보가 확정되면 상세 작명에서 사주와 한자 조합을 함께 검토할 수 있습니다.
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
            상세 해설이 필요하면 단건 {namingPriceLabel}, 이용권, 월정석 중 적용 가능한 방식을
            확인합니다. 선택한 조건에 따라 사주와 한자 조합, 소리오행·수리오행을 검토한
            작명 결과와 프롬프트를 받습니다.
          </li>
        </ol>
        <p>
          이름의 오행과 수리는 전통적 해석 기준이며 삶의 결과를 보장하지 않습니다. 뜻과 발음,
          성씨와 이어 부를 때의 자연스러움을 함께 살펴보세요. 최종 한자 이름은 등록 전에
          인명용 한자 여부를 확인하세요.
        </p>
        <h2>작명이 보는 네 가지 층</h2>
        <p>
          좋은 이름은 어감만으로 정해지지 않습니다. 훈민정음 작명소는 네 개의 층을 차례로 겹쳐
          후보를 좁힙니다.
        </p>
        <ul>
          <li>
            <strong>사주 용신</strong> — 단순히 적은 오행을 채우는 방식이 아니라 태어난 계절과
            명식의 균형을 함께 살피는 전통적 해석입니다. 시각이 불확실하면 판단 범위도 줄어듭니다.
          </li>
          <li>
            <strong>소리오행</strong> — 한글 초성이 갖는 오행(어금닛소리 ㄱㅋ 목, 혓소리 ㄴㄷㄹㅌ 화,
            목구멍소리 ㅇㅎ 토, 잇소리 ㅅㅈㅊ 금, 입술소리 ㅁㅂㅍ 수)으로 이름을 부를 때 실제로 울리는
            관계를 살핍니다. 성씨에서 이름 끝까지 이어지는 오행의 조합과 실제로 부르기 편한
            발음을 함께 비교합니다.
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
          <strong>개명</strong>은 현재 이름에서 아쉬웠던 뜻과 발음, 새 이름에 담고 싶은 방향을
          먼저 정리합니다. 기존 이름이 삶의 어려움을 만들었다고 단정하지 않고,
          실제로 오래 사용할 때의 편안함을 함께 비교합니다.
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
          어감이 마음에 들어도 한자의 뜻이 기대와 다른 경우가 있으므로 글자별 의미를 확인하세요.
          전통적 해석 기준이 서로 다를 때는 한 기준 안에서 비교하고, 이름을 사용할 사람의 선호를
          함께 반영하는 것이 좋습니다.
        </p>
        <p><a href="#naming-start" data-cd-cross-sell={PAGE_PATH} data-cd-cta-placement="next_step" data-cd-target-service="naming" className="inline-flex min-h-12 items-center underline underline-offset-4">성씨와 조건을 입력하고 이름 초안 보기</a></p>
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
