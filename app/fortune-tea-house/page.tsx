import type { Metadata } from "next";
import { siteSeo } from "@/lib/seo/siteSeo";
import FortuneTeaHouseClient from "./FortuneTeaHouseClient";
import ServiceIntroSection from "@/app/components/ServiceIntroSection";
import { fortuneTeaHouseAssets } from "@/src/features/fortune-tea-house/data/assets";

export const metadata: Metadata = {
  title: "운명의 찻집 | Code Destiny",
  description:
    "달빛이 머무는 숨겨진 찻집에서 꽃돼지 연이를 만나고, 연이가 당신의 이야기를 조용히 맞이하는 감성형 운명의 찻집입니다.",
  alternates: {
    canonical: "https://code-destiny.com/fortune-tea-house",
  },
  openGraph: {
    title: "운명의 찻집 | Code Destiny",
    description: "보라빛 밤의 찻집에서 꽃돼지 연이가 손님을 맞이하고, 연이가 오래 말하지 못한 마음을 한 잔의 온기로 조용히 비춥니다.",
    url: "https://code-destiny.com/fortune-tea-house",
    siteName: siteSeo.brandName,
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: fortuneTeaHouseAssets.pig.transform,
        width: 1200,
        height: 630,
        alt: "달빛 아래 운명의 찻집에서 연이가 손님을 맞이하는 장면",
      },
    ],
  },
};

const teaHouseFaqItems = [
  {
    question: "운명의 찻집은 어떤 상담인가요?",
    answer:
      "찻잔을 하나 고르고 질문을 남기면, 문지기 연이가 그 질문에 맞는 방식으로 답을 찾아 드리는 감성형 상담입니다. 타로·사주·사주 궁합·숙요점 네 가지 방식 중에서 고를 수 있고, 각각 계산 근거가 다릅니다. 결과는 도표 나열이 아니라 연이가 곁에서 이야기해 주는 형식으로 전해집니다.",
  },
  {
    question: "네 가지 상담은 무엇이 다른가요?",
    answer:
      "타로는 지금 이 순간의 마음과 선택지를 카드로 비춥니다. 사주는 태어난 순간의 명식으로 타고난 결과 시기의 흐름을 봅니다. 사주 궁합은 두 사람의 명식을 나란히 놓고 끌림과 마찰의 자리를 찾습니다. 숙요점은 스물일곱 별자리로 인연의 거리감을 읽습니다. 질문이 '지금 어떻게 할까'에 가까우면 타로가, '나는 어떤 사람인가'에 가까우면 사주가 잘 맞습니다.",
  },
  {
    question: "무료로 이용할 수 있나요?",
    answer:
      "찻집에 들어와 연이를 만나고 찻잔을 고르는 과정까지는 무료입니다. 실제 상담 결과를 받는 단계에서 상담 방식별로 이용료가 안내되며, 이용권이 있으면 커버 범위 안에서 결제 없이 통과합니다. 이용권으로 덮이지 않는 경우에만 결제 화면이 열리고, 그때 단건 결제와 월정석 두 가지를 함께 보여 드립니다.",
  },
  {
    question: "생년월일이 꼭 필요한가요?",
    answer:
      "타로 상담은 생년월일 없이도 진행됩니다. 사주·궁합·숙요점 상담은 태어난 날짜가 필요하고, 시각까지 있으면 해석이 더 세밀해집니다. 시각을 모르면 시주를 뺀 채로 읽으며, 큰 흐름은 그대로지만 하루 단위의 세밀한 부분은 다소 흐려집니다. 프로필 카드를 만들어 두면 매번 입력하지 않아도 됩니다.",
  },
  {
    question: "결과를 다시 볼 수 있나요?",
    answer:
      "찻집에서 받은 상담은 기록으로 남아 다시 열어 볼 수 있습니다. 화면 안의 기록 보기에서 지난 상담을 확인하실 수 있고, 같은 질문을 다시 물으면 그때의 흐름에 맞춰 새로 답이 만들어집니다.",
  },
];

export default function Page() {
  return (
    <>
      <FortuneTeaHouseClient />
      <ServiceIntroSection label="운명의 찻집 안내">
        <h1>운명의 찻집 — 연이가 한 잔의 온기로 건네는 감성 상담</h1>
        <p>
          운명의 찻집은 달빛이 머무는 자리에 놓인 작은 상담소입니다. 문을 열면 꽃돼지 연이가 손님을
          맞이하고, 오늘 어떤 마음으로 왔는지 먼저 묻습니다. 결과를 서둘러 들이밀지 않고 찻잔을 고르는
          시간부터 함께 보내는 것이 이 공간의 방식입니다. 화면에 도표를 늘어놓는 대신, 계산은 뒤에서
          조용히 하고 앞에서는 사람이 건네는 말투로 이야기합니다.
        </p>
        <p>
          해석의 근거는 실제 이론 체계입니다. 사주는 명리학의 명식 계산 위에서, 숙요점은 스물일곱
          별자리(이십칠수)의 배치 위에서, 타로는 스프레드별 카드 위치의 의미 위에서 읽습니다. 근거를
          과시하지 않을 뿐, 없는 이야기를 지어내지는 않습니다.
        </p>
        <h2>네 가지 찻잔</h2>
        <ul>
          <li>
            <strong>타로</strong> — 지금 이 순간의 마음과 눈앞의 선택지를 카드로 비춥니다. 생년월일 없이
            질문만으로 진행할 수 있어 처음 오신 분께 가장 가볍습니다.
          </li>
          <li>
            <strong>사주</strong> — 태어난 순간의 명식으로 타고난 결과 지금 지나는 시기의 흐름을 봅니다.
            일간과 오행의 균형, 십성의 분포가 해석의 축이 됩니다.
          </li>
          <li>
            <strong>사주 궁합</strong> — 두 사람의 명식을 나란히 놓고 서로를 살리는 자리와 부딪히는
            자리를 찾습니다. 좋고 나쁨의 점수가 아니라 관계 운영법으로 풀어 드립니다.
          </li>
          <li>
            <strong>숙요점</strong> — 스물일곱 별자리로 두 사람 사이의 거리감과 인연의 결을 읽습니다.
            동양 별자리 체계 특유의 관계 분류가 드러납니다.
          </li>
        </ul>
        <h2>이런 순간에 찾아오시면 좋습니다</h2>
        <ul>
          <li>답이 필요한 게 아니라 마음을 한 번 정리하고 싶을 때</li>
          <li>같은 고민을 오래 붙잡고 있어 스스로 정리가 안 될 때</li>
          <li>상대의 마음보다 내 마음이 먼저 헷갈릴 때</li>
          <li>결정을 앞두고 흔들리는 이유를 이름 붙이고 싶을 때</li>
        </ul>
        <h2>이용 순서</h2>
        <ol>
          <li>찻집에 들어서면 연이가 맞이합니다. 프롤로그는 무료이며 언제든 건너뛸 수 있습니다.</li>
          <li>네 가지 찻잔 중 하나를 고릅니다. 고른 찻잔이 상담 방식을 정합니다.</li>
          <li>지금 묻고 싶은 것을 적습니다. 짧아도 되고 길어도 됩니다.</li>
          <li>필요한 경우 생년 정보를 확인한 뒤, 연이가 찻잎이 가라앉는 동안 답을 정리합니다.</li>
          <li>결과는 기록으로 남아 나중에 다시 열어 볼 수 있습니다.</li>
        </ol>
        <h2>자주 묻는 질문</h2>
        {teaHouseFaqItems.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
        <p>
          운세 결과는 지금의 마음을 정리하는 참고 자료입니다. 건강·법률·재무처럼 전문적인 판단이 필요한
          문제는 해당 분야의 도움을 함께 받으시길 권합니다.
        </p>
      </ServiceIntroSection>
    </>
  );
}
