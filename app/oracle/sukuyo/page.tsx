import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/oracle/sukuyo",
  title: "숙요 인연 레이더 | Code Destiny",
  description: "상대의 생년월일로 나와의 숙요 관계를 분석하고, 끌림·안정감·소모도·장기 인연 가능성을 확인해보세요.",
  keywords: ["숙요점", "숙요 궁합", "27숙", "안괴", "영친", "업태", "우쇠", "성위", "인연 분석", "연애 궁합"],
  image: "https://code-destiny.com/fuctionassets/sukyo.webp",
  featureList: ["27숙 관계 타입 산출", "인연 레이더 지수", "관계 목적별 조언"],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const SERVICE = {
  h1: "숙요 인연 레이더",
  description: META.description,
  ogImage: META.image,
  landingPoints: [...META.featureList],
  seoText: "숙요 인연 레이더는 두 사람의 본명숙과 27숙 관계를 바탕으로 끌림, 안정감, 소모도, 장기 인연 가능성을 비춥니다.",
  valueGuideTitle: "숙요점을 실전에 적용하는 6단계",
  valueSections: [
    {
      title: "1. 숙요점의 핵심은 달의 리듬 읽기입니다",
      body:
        "숙요점은 태양 중심 해석보다 달의 변화와 감정 리듬에 집중합니다. 그래서 성향 분석뿐 아니라 일상 템포, 관계 반응 속도를 읽는 데 강점이 있습니다. 결과를 성격 꼬리표로 쓰기보다 생활 리듬을 조정하는 기준으로 쓰면 체감 효용이 크게 올라갑니다.",
    },
    {
      title: "2. 27수는 등급표가 아니라 작동 방식 분류입니다",
      body:
        "같은 수라도 환경에 따라 강점이 다르게 드러납니다. 어떤 수는 빠른 실행에 유리하고, 어떤 수는 확인과 축적에 강합니다. 좋고 나쁨으로 단정하면 해석이 얕아지므로, 내 수가 어떤 상황에서 효율적이고 어떤 상황에서 과부하가 나는지 맥락 중심으로 읽는 것이 중요합니다.",
    },
    {
      title: "3. 숙요 궁합은 점수보다 템포 조율이 핵심입니다",
      body:
        "관계에서는 말의 내용보다 속도 차이에서 갈등이 발생하는 경우가 많습니다. 숙요 궁합은 이 템포 차이를 미리 보여주기 때문에 대화 규칙을 세우는 데 유용합니다. 응답 시간, 약속 결정 방식, 갈등 후 회복 루틴을 맞추면 낮은 궁합 점수로 보이던 조합도 안정적으로 운영할 수 있습니다.",
    },
    {
      title: "4. 월간·주간 루틴에 붙이면 활용도가 높아집니다",
      body:
        "숙요 결과를 읽고 끝내지 말고 일정 운영에 연결해 보세요. 집중 작업일, 회의일, 관계 회복일을 나누는 방식으로 적용하면 리듬 체감이 빨라집니다. 점술 콘텐츠를 생산성 도구로 전환하는 가장 쉬운 방법은 해석을 주간 계획표의 행동 항목으로 바꾸는 것입니다.",
    },
    {
      title: "5. 표현은 단정보다 행동 제안 중심이 안전합니다",
      body:
        "숙요 해석에서 절대 맞는다, 절대 안 맞는다 같은 문장은 신뢰를 떨어뜨립니다. 대신 오해를 줄이는 질문법, 합의 순서, 갈등 복구 방식 같은 행동 제안을 제공하면 사용자 만족도와 재방문율이 함께 올라갑니다. 숙요점은 판결보다 안내에 가까울 때 품질이 높습니다.",
    },
    {
      title: "6. 반복 관찰로 나만의 리듬 아카이브를 만드세요",
      body:
        "한 번의 결과보다 반복 기록이 더 큰 통찰을 줍니다. 중요한 일정 전후의 감정 변화, 대인관계 반응, 집중 시간대를 2~3주만 추적해도 숙요 해석이 개인 데이터와 결합됩니다. 이렇게 축적된 기록은 다음 달 계획이나 관계 조율에서 실제 의사결정 근거로 활용할 수 있습니다.",
    },
  ],
};

export default function SukuyoLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
