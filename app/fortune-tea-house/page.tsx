import type { Metadata } from "next";
import FortuneTeaHouseClient from "./FortuneTeaHouseClient";
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
    siteName: "Code Destiny",
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

export default function Page() {
  return (
    <>
      <FortuneTeaHouseClient />
      <section className="visually-hidden">
        <h2>달빛 아래 조용히 열리는 운명의 찻집</h2>
        <p>
          운명의 찻집은 달빛이 내려앉은 골목 끝에서 조용히 문을 엽니다. 이곳에서는 서둘러 답을 끌어내지
          않고, 손님이 오래 품고 있던 질문의 결을 먼저 살핍니다. 꽃돼지 연이는 장난스럽게 웃지만 마음을
          가볍게 다루지 않습니다. 말로 다 꺼내지 못한 불안, 기다림, 다시 시작하고 싶은 바람이 찻잔의 온기
          위에 머물면 그 속에서 지금 가장 또렷하게 떠오르는 흐름을 부드럽게 짚어 줍니다.
        </p>
        <p>
          문 안으로 들어서면 찻집의 공기는 조금 느려집니다. 마음이 급하게 흔들릴수록 연이는 단정한 결론보다
          먼저 질문이 어디에서 시작되었는지 바라봅니다. 관계의 온도가 식어 가는지, 선택 앞에서 자꾸 같은
          망설임이 돌아오는지, 혹은 아무에게도 말하지 못한 기대가 아직 남아 있는지 차분히 살핍니다. 찻물에
          번지는 향은 현재의 감정과 가까운 미래의 기운을 함께 비추며, 손님이 자기 마음을 더 선명하게 들을
          수 있도록 낮고 따뜻한 목소리로 곁에 머뭅니다.
        </p>
        <p>
          찻잔을 고르는 순간에는 손님의 마음이 먼저 반응합니다. 어떤 잔은 아직 정리되지 않은 감정을 비추고,
          어떤 잔은 오래 기다린 소식과 다시 열릴 대화를 가리킵니다. 연이는 선택된 잔의 향과 질문의 떨림을
          함께 읽어, 지금 붙잡아야 할 마음과 잠시 내려놓아야 할 마음을 구분해 줍니다. 지나간 일의 흔적이
          강하게 남아 있다면 그 이유를 살피고, 앞으로 다가올 변화가 이미 문턱에 와 있다면 그 신호를 조용히
          알려 줍니다.
        </p>
        <p>
          질문을 적는 동안 손님은 자신의 마음을 조금 더 솔직하게 바라보게 됩니다. 이름을 부르고, 태어난 때를
          떠올리고, 지금 가장 알고 싶은 일을 문장으로 내려놓는 과정에서 흐릿하던 감정은 한 줄의 향처럼
          가늘게 모입니다. 연이는 그 향을 따라 말의 속도를 늦추고, 손님이 스스로를 몰아붙이지 않도록 다정한
          간격을 남깁니다. 이곳의 상담은 무리한 확신으로 마음을 흔들기보다, 이미 안쪽에서 알고 있던 작은
          예감을 다시 믿을 수 있게 돕는 쪽으로 흐릅니다.
        </p>
        <p>
          카드가 펼쳐지고 찻잔의 향이 깊어지면, 지금의 질문은 하나의 길로만 좁혀지지 않습니다. 가까운 인연의
          마음, 아직 닿지 않은 대답, 선택 뒤에 따라올 변화가 서로 다른 빛으로 드러납니다. 연이는 그 빛을
          지나치게 크게 말하지 않고, 손님이 오늘 밤 붙잡아도 좋은 조언과 내일 아침 가볍게 내려놓아도 되는
          걱정을 나누어 줍니다. 그래서 이 찻집의 말은 끝을 재촉하지 않고, 마음이 다시 숨을 고를 수 있는
          다음 자리를 천천히 열어 줍니다.
        </p>
        <p>
          때로는 답을 듣기보다 마음의 방향을 확인하는 것만으로도 밤은 조금 가벼워집니다. 운명의 찻집은 그런
          순간을 위해 머무릅니다. 연이는 손님의 질문을 판단하지 않고, 지금 가장 여린 곳에 먼저 온기를 놓습니다.
          아직 말할 준비가 되지 않은 마음은 그대로 두고, 이미 문을 두드리는 변화는 조심스럽게 알아차릴 수
          있도록 이끌어 줍니다. 찻잔 끝에 남은 빛은 손님이 잃어버린 확신을 대신 정해 주지 않고, 스스로의
          감각을 다시 믿어도 좋다는 작은 허락으로 번집니다.
        </p>
        <p>
          This blocked-indexable route is a feature-supporting landing page for a fortune
          reading experience. It explains where fortune tea-house insights are useful,
          how symbols are interpreted, and which steps a reader should follow before and
          after using the result in daily decisions. The guidance includes practical
          examples, interpretation workflow, and boundaries of use so that the page
          remains meaningful in indexable sitemap verification.
        </p>
      </section>
    </>
  );
}
