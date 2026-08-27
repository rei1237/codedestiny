import type { Metadata } from "next";
import LoveSecretAiRouteClient from "./LoveSecretAiRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";
import ServiceIntroSection from "../components/ServiceIntroSection";
import ImmersiveRelatedLinks from "../components/ImmersiveRelatedLinks";

const PAGE_PATH = "/love-secret-ai/";
const PAGE_TITLE = "짝사랑 운세 | 재회·연애 마음 리딩 — 사랑의 비밀";
const PAGE_DESCRIPTION =
  "생년월일 기반 사주 흐름으로 짝사랑, 썸, 재회, 이별 후 마음까지 읽어주는 사랑의 비밀 전문가 상담. 상대의 마음 결과 관계의 방향을 상담 문장으로 확인하세요.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["연애운", "짝사랑 운세", "재회 가능성", "썸 운세", "연애 사주", "상대방 마음", "전문가 연애 상담"],
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
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "사랑의 비밀 전문가 상담" }],
  },
  twitter: {
    card: siteSeo.twitterCard,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [siteSeo.defaultOgImage],
  },
};

const loveSecretFaqItems = [
  {
    question: "사랑의 비밀 전문가 상담은 무엇을 봐주나요?",
    answer:
      "짝사랑과 썸의 진전 가능성, 연인 사이의 흐름, 이별 후 재회의 결까지 연애에 얽힌 마음의 방향을 읽습니다. 생년월일로 세운 사주 명식의 일간과 십성 흐름을 바탕으로 관계에서 반복되는 패턴을 상담 문장으로 풀어 드립니다.",
  },
  {
    question: "상대방 정보가 없어도 볼 수 있나요?",
    answer:
      "네, 내 생년월일만으로도 지금 연애운의 큰 흐름을 볼 수 있습니다. 상대의 생년월일을 함께 입력하면 두 명식 사이의 궁합 결이 더해져 관계의 방향이 더 구체적으로 읽힙니다.",
  },
  {
    question: "재회 가능성도 알 수 있나요?",
    answer:
      "재회는 단정할 수 있는 답이 아니라 두 사람의 시기 흐름이 다시 만나는지의 문제입니다. 상담은 지금의 운 흐름에서 인연의 문이 열려 있는지, 기다림과 정리 중 어느 쪽이 마음을 지키는 길인지 함께 살핍니다.",
  },
  {
    question: "상담 내용은 저장되거나 공개되나요?",
    answer:
      "상담 결과는 본인 확인 후 본인만 열람할 수 있으며, 다른 사용자에게 공개되지 않습니다. 입력한 생년월일은 해석 생성 목적으로만 사용됩니다.",
  },
  {
    question: "매일 다시 봐도 결과가 달라지나요?",
    answer:
      "사주 명식 자체는 생년월일로 고정되어 있지만, 지나는 세운과 질문의 초점에 따라 상담 문장의 결이 달라질 수 있습니다. 같은 고민이라도 시간이 지난 뒤 다시 확인해 보면 도움이 됩니다.",
  },
  {
    question: "짝사랑과 재회 중 하나만 골라 물어봐도 되나요?",
    answer:
      "네, 지금 가장 궁금한 주제 하나만 선택해도 충분합니다. 짝사랑, 썸, 연인 사이, 재회, 이별 후 마음처럼 상황을 구체적으로 밝힐수록 상담 문장이 더 또렷하게 정리됩니다.",
  },
];

const loveSecretJsonLd = [
  buildServiceJsonLd({
    name: "사랑의 비밀 전문가 상담",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "연애 사주 상담 서비스",
  }),
  buildFaqPageJsonLd(loveSecretFaqItems),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "사랑의 비밀 전문가 상담", path: PAGE_PATH },
  ]),
];

export default function LoveSecretAiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(loveSecretJsonLd) }}
      />
            <LoveSecretAiRouteClient />
            <ServiceIntroSection label="사랑의 비밀 전문가 상담 안내">
        <h1>짝사랑 운세 — 재회와 연애 마음 리딩</h1>
        <p>
          사랑의 비밀은 생년월일로 세운 사주 명식을 따라 연애에 얽힌 마음의 결을 읽는 전문가 상담입니다.
          짝사랑이 어디까지 닿아 있는지, 썸이 관계로 이어질 흐름인지, 이별 뒤의 마음을 어떻게
          정리하면 좋을지 — 일간의 기질과 십성의 흐름, 지금 지나는 운의 계절을 함께 살펴 긴 호흡의
          상담 문장으로 답해 드립니다.
        </p>
        <p>
          연애운은 정해진 결말이 아니라 마음이 움직이는 방향의 지도입니다. 내 생년월일만으로
          시작할 수 있고, 상대의 정보를 더하면 두 사람 사이 궁합의 결까지 함께 읽을 수 있습니다.
        </p>
        <p>
          단순히 좋다·나쁘다로 나누는 대신, 지금 관계에서 반복되는 감정의 패턴과 시기의 흐름을
          함께 짚어 드립니다. 같은 상황이라도 사람마다 사주 명식이 다르기 때문에, 일반적인
          연애 조언보다 자신의 흐름에 맞춘 문장이 필요할 때 이 상담을 권합니다.
        </p>
        <h2>이런 순간에 특히 도움이 됩니다</h2>
        <ul>
          <li>
            마음을 먼저 표현해야 할지, 조금 더 지켜보며 때를 기다려야 할지 갈피가 잡히지 않을 때 —
            지금 관계가 지나는 운의 계절을 먼저 확인하면 조급함을 조금 내려놓을 수 있습니다.
          </li>
          <li>
            썸이 오래 제자리걸음이라 관계가 다음 단계로 넘어갈지, 이대로 흐지부지될지 궁금할 때
            — 두 사람 사이에 흐르는 결을 상담 문장으로 정리해 드립니다.
          </li>
          <li>
            이별 후 다시 만날 여지가 있는지, 아니면 마음을 정리하는 편이 나은지 판단이 서지 않을 때
            — 인연의 문이 열려 있는 시기인지 함께 살핍니다.
          </li>
          <li>
            상대의 속마음을 짐작하기보다, 지금 내가 스스로 지켜야 할 감정의 우선순위가 궁금할 때
            도움이 됩니다.
          </li>
        </ul>
        <h2>상담은 이렇게 진행됩니다</h2>
        <ol>
          <li>본인의 생년월일과, 필요하다면 상대의 생년월일까지 함께 입력합니다.</li>
          <li>
            입력한 정보로 사주 명식을 세우고, 일간의 기질과 십성의 흐름을 바탕으로 지금 연애운의
            결을 분석합니다.
          </li>
          <li>
            짝사랑, 썸, 재회, 이별 등 지금 고민 중인 상황에 맞춰 상담 문장으로 결과를 정리해
            보여 드립니다.
          </li>
          <li>
            결과는 본인 계정에서 다시 열람할 수 있고, 질문이 바뀌면 새로운 상담으로 이어갈 수
            있습니다.
          </li>
        </ol>
        <p>
          연애의 마음은 하루에도 여러 번 흔들리기 쉽습니다. 오늘 유난히 확신이 서지 않는다면,
          같은 질문이라도 마음이 조금 가라앉은 다음 다시 확인해 보는 편이 더 또렷한 답을 줄 때가
          많습니다. 결혼이나 동거처럼 무게가 큰 결정은 이 상담 하나만으로 정하기보다, 실제
          대화와 시간을 함께 쌓아가며 확인하시길 권합니다.
        </p>
        <h2>명리학으로 연애를 읽는다는 것</h2>
        <p>
          사주로 연애를 본다는 말은 상대가 누구인지 맞힌다는 뜻이 아닙니다. 태어난 순간의 기운 배합이
          만드는 성향, 그러니까 어떤 사람에게 마음이 먼저 기우는지·애정을 어떤 방식으로 확인하려
          하는지·서운함이 쌓일 때 어디부터 닫히는지를 읽는 일입니다. 같은 이별이라도 어떤 사람은
          연락을 끊는 쪽으로, 어떤 사람은 설명을 늘리는 쪽으로 움직입니다. 그 차이가 명식에 남아
          있습니다.
        </p>
        <p>
          해석의 축은 네 가지입니다. <strong>일간</strong>은 나를 나타내는 기준점이고,{" "}
          <strong>십성</strong>은 그 기준에서 본 관계의 역할(관성·재성·식상·인성)을 나눕니다.{" "}
          <strong>오행의 균형</strong>은 부족한 기운을 채워 주는 사람에게 끌리는 구조를 설명하고,{" "}
          <strong>조후</strong>는 태어난 계절의 온도로 감정의 기본 체온을 봅니다. 여기에 지금 지나는
          대운과 세운을 겹치면, 왜 하필 올해 이 마음이 흔들리는지가 드러납니다.
        </p>
        <h2>상황별로 달라지는 읽는 법</h2>
        <p>
          같은 명식이라도 지금 어느 단계에 서 있느냐에 따라 봐야 할 곳이 달라집니다.{" "}
          <strong>짝사랑</strong>은 상대의 마음보다 내가 다가가는 속도를 먼저 봅니다. 서두를 때
          무너지는 구조인지, 기다릴수록 식는 구조인지가 명식에 나타납니다.{" "}
          <strong>썸</strong>은 관계가 다음 단계로 넘어가기 위해 나에게 반드시 충족돼야 하는 조건이
          무엇인지가 핵심입니다. 그 조건을 모르면 잘 되던 흐름이 이유 없이 멈춘 것처럼 느껴집니다.
        </p>
        <p>
          <strong>권태</strong>는 애정이 식은 것이 아니라 확인 방식이 어긋난 경우가 많습니다. 표현의
          총량이 서로 다를 때 한쪽은 충분하다고 느끼고 다른 쪽은 부족하다고 느낍니다.{" "}
          <strong>이별과 재회</strong>는 관계를 놓는 나의 방식부터 봅니다. 먼저 정리하는 사람인지
          붙잡는 사람인지에 따라 다시 열리는 조건이 완전히 달라지기 때문입니다.
        </p>
        <h2>이 상담이 답하지 않는 것</h2>
        <ul>
          <li>상대가 지금 무슨 생각을 하는지 — 타인의 마음을 실시간으로 읽어 내지는 못합니다.</li>
          <li>재회 여부의 확답 — 다시 열릴 조건은 말씀드리지만 결과를 단정하지 않습니다.</li>
          <li>정확한 날짜 — 흐름이 유리해지는 구간은 짚되, 특정 날짜를 찍지 않습니다.</li>
          <li>상대를 바꾸는 방법 — 바꿀 수 있는 건 내가 관계를 운영하는 방식뿐입니다.</li>
        </ul>
        <h2>자주 묻는 질문</h2>
        {loveSecretFaqItems.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </ServiceIntroSection>
      <ImmersiveRelatedLinks fromPath="/love-secret-ai" />
    </>
  );
}
