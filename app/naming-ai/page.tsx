import type { Metadata } from "next";
import NamingAiRouteClient from "./NamingAiRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";

const PAGE_PATH = "/naming-ai/";
const PAGE_TITLE = "훈민정음 작명소 — 사주 맞춤 프리미엄 AI 작명 프롬프트 | Code Destiny";
const PAGE_DESCRIPTION =
  "생년월일로 세운 사주 명식의 용신·희신을 바탕으로 소리오행·자원오행·수리를 함께 본 사주 맞춤 프리미엄 작명 프롬프트를 만들어 드립니다. 성씨와 원하는 이름 조건만 입력하면 무료 초안 추천도 함께 확인할 수 있습니다.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["작명", "이름 작명", "사주 작명", "아기 이름", "개명", "한자 이름", "AI 작명", "용신 작명"],
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
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "훈민정음 작명소" }],
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
    name: "훈민정음 작명소 — 사주 맞춤 AI 작명 프롬프트",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "사주 작명 서비스",
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
      <section className="sr-only" aria-label="훈민정음 작명소 안내">
        <h1>훈민정음 작명소 — 사주 맞춤 프리미엄 AI 작명 프롬프트</h1>
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
        <h2>자주 묻는 질문</h2>
        {namingAiFaqItems.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </section>
      <NamingAiRouteClient />
    </>
  );
}
