import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/vedic/jyotish",
  title: "베다 점성술 (Jyotish) - 라시·다샤 해석 | Code Destiny",
  description: "항성 황도 기반 베다 점성술로 라시 차트, 낙샤트라, 다샤 흐름을 읽는 실행형 가이드입니다.",
  keywords: ["베다 점성술", "Jyotish", "낙샤트라", "다샤", "인도 점성술"],
  image: "https://code-destiny.com/fuctionassets/veda.webp",
  featureList: ["라시·나밤샤 관점", "다샤 타이밍", "생활 적용 가이드"],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const SERVICE = {
  h1: "베다 점성술 (Jyotish)",
  description: META.description,
  ogImage: META.image,
  landingPoints: [...META.featureList],
  seoText: "베다 점성술은 항성 황도와 다샤 시기 체계를 바탕으로 장기 흐름을 읽는 전통 점성 시스템입니다.",
  valueGuideTitle: "베다 점성술을 실용적으로 읽는 6포인트",
  valueSections: [
    {
      title: "1. 베다 점성술은 항성 황도 기준이라는 점이 출발점입니다",
      body:
        "서양 점성술과 가장 큰 차이는 황도 기준입니다. 베다는 실제 별자리 위치를 기준으로 계산하기 때문에 같은 사람도 별자리 해석이 달라질 수 있습니다. 이 차이를 먼저 이해하면 왜 결과가 다르게 나오는지 혼란이 줄고, 체계별 장단점을 비교해 사용할 수 있습니다.",
    },
    {
      title: "2. 라시(D1)와 나밤샤(D9)를 함께 봐야 입체적입니다",
      body:
        "라시 차트는 삶의 기본 구조를, 나밤샤는 잠재력과 성숙의 방향을 보여줍니다. D1만으로 결론을 내리면 일시적 인상에 치우칠 수 있으므로, 두 차트의 공통 신호를 우선 확인하는 방식이 안정적입니다. 공통으로 강조되는 주제는 실제 삶에서 반복 체감될 가능성이 높습니다.",
    },
    {
      title: "3. 하우스·행성·디그니티를 세트로 읽어야 정확합니다",
      body:
        "행성 이름 하나만으로 결과를 단정하면 오류가 커집니다. 같은 금성이라도 하우스 위치와 디그니티에 따라 의미가 달라지고, 아스펙트가 결론을 바꿉니다. 베다 해석은 요소를 분리해 점수화하기보다 문맥을 연결해 해석하는 과정이므로, 단일 키워드 해석을 피하는 것이 핵심입니다.",
    },
    {
      title: "4. 다샤는 예언이 아니라 시기 운영 도구입니다",
      body:
        "다샤는 특정 행성 주제가 전면으로 올라오는 기간을 알려줍니다. 이를 결과 확정으로 받아들이기보다 준비 체크리스트로 쓰면 유용합니다. 예를 들어 책임 신호가 강한 시기에는 구조화, 확장 신호가 강한 시기에는 기회 검증을 우선 배치하는 식으로 일정 운영 전략을 세울 수 있습니다.",
    },
    {
      title: "5. 궁합 해석은 생활 호환성 질문과 함께 써야 합니다",
      body:
        "베다 궁합 지표는 유용하지만 숫자만으로 관계를 판정하면 실제와 어긋날 수 있습니다. 감정 표현 방식, 재정 습관, 갈등 후 회복 속도 같은 생활 질문을 함께 점검하면 해석 품질이 올라갑니다. 궁합은 운명 판결이 아니라 함께 살아가는 운영 규칙을 찾는 과정에 가깝습니다.",
    },
    {
      title: "6. 주간 기록으로 차트 해석을 내 데이터로 바꾸세요",
      body:
        "결과를 읽은 뒤 한 주 동안 집중도, 관계 에너지, 지출 패턴을 기록하면 차트 문장이 현실 감각으로 번역됩니다. 이 과정이 쌓이면 다음 분기 계획이나 중요한 결정에서 해석을 실전 의사결정 기준으로 사용할 수 있습니다. 점성술의 가치는 설명보다 적용 단계에서 커집니다.",
    },
  ],
};

export default function VedicJyotishLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
