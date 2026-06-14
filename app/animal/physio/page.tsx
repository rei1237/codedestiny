import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/animal/physio",
  title: "AI 동물 관상 - 셀카 얼굴 분석 가이드",
  description: "얼굴형, 표정, 분위기 신호를 동물 비유로 해석해 자기표현과 관계 소통 힌트를 제공하는 동물관상 페이지입니다.",
  keywords: ["동물 관상", "AI 관상", "얼굴형 분석", "animal physiognomy", "셀카 관상"],
  image: "https://code-destiny.com/fuctionassets/ai%20animal.webp",
  featureList: ["셀카 기반 분석", "동물 비유 해석", "소통 힌트 제공"],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const SERVICE = {
  h1: "AI 동물 관상",
  description: META.description,
  ogImage: META.image,
  landingPoints: [...META.featureList],
  seoText: "동물 관상은 얼굴 신호를 재미있는 동물 비유로 번역해 자기이해와 관계 소통에 활용하는 서비스입니다.",
  valueGuideTitle: "동물 관상을 건강하게 읽는 6가지 방법",
  valueSections: [
    {
      title: "1. 동물 관상은 낙인이 아니라 표현 언어입니다",
      body:
        "동물 비유는 사람을 고정된 틀에 가두기 위한 진단이 아니라, 복잡한 인상을 직관적으로 설명하는 언어 도구에 가깝습니다. 결과를 \"나는 원래 이런 사람\"으로 단정하기보다 \"타인이 나를 이렇게 인식할 수 있구나\"라는 관찰 자료로 쓰면 자기표현 전략을 세우는 데 실질적인 도움이 됩니다.",
    },
    {
      title: "2. 얼굴형보다 표정과 시선 습관이 더 큰 영향을 줍니다",
      body:
        "같은 얼굴형이라도 표정 긴장도, 눈맞춤 빈도, 말할 때 입꼬리 움직임에 따라 인상은 크게 달라집니다. 관상 결과를 해부학 고정값으로만 보지 말고, 바꿀 수 있는 비언어 습관과 함께 읽어야 실전성이 생깁니다. 작은 표정 습관 조정만으로도 관계 체감이 빠르게 개선되는 경우가 많습니다.",
    },
    {
      title: "3. 강점 신호와 과잉 신호를 분리해 보세요",
      body:
        "리더십 인상이 강한 사람도 상황에 따라 부담 신호로 보일 수 있고, 부드러운 인상도 우유부단으로 해석될 수 있습니다. 그래서 결과를 \"강점\"과 \"과잉 시 오해 포인트\"로 나눠 읽는 방식이 유용합니다. 이 구분이 있으면 면접, 소개팅, 협업 미팅에서 인상 관리 전략을 더 현실적으로 세울 수 있습니다.",
    },
    {
      title: "4. 관계 개선은 궁합 점수보다 대화 톤 조정이 먼저입니다",
      body:
        "동물관상 궁합은 재미 요소가 크지만 실제 관계 개선은 말투, 응답 속도, 질문 방식에서 시작됩니다. 상대가 방어적으로 반응하는 순간을 관찰해 대화 강도를 낮추고 확인 질문을 늘리면 같은 궁합 조합에서도 결과가 달라집니다. 관상 결과는 대화 설계 힌트로 사용할 때 가장 효과적입니다.",
    },
    {
      title: "5. 사진 조건을 통일하면 분석 일관성이 올라갑니다",
      body:
        "조명, 각도, 표정이 크게 달라지면 결과 편차가 커질 수 있습니다. 정면, 자연광, 무표정 기준으로 촬영해 비교하면 변화 포인트를 더 정확히 읽을 수 있습니다. 동물 관상은 한 번의 재미 테스트로 끝내기보다 같은 조건에서 주기적으로 점검할 때 자기 이미지 관리 도구로 활용 가치가 커집니다.",
    },
    {
      title: "6. 결과는 자기비난이 아니라 자기설계로 연결하세요",
      body:
        "어떤 동물 유형이 나와도 우열이 있는 것은 아닙니다. 중요한 것은 그 인상이 어떤 상황에서 유리하고 어떤 상황에서 오해를 부를 수 있는지 아는 것입니다. 결과를 바탕으로 소개 문장, 프로필 사진, 첫 대화 문장을 조정하면 관상 콘텐츠가 단순 흥미를 넘어 실제 커뮤니케이션 성과로 이어질 수 있습니다.",
    },
  ],
};

export default function AnimalPhysioLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
