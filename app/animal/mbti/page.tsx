import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/animal/mbti",
  title: "MBTI 동물 궁합 - 16유형 관계 케미 | Code Destiny",
  description: "MBTI 성향 조합을 동물 토템 비유로 번역해 연애·우정·협업 궁합의 실제 소통 포인트를 안내합니다.",
  keywords: ["MBTI 동물 궁합", "16유형 궁합", "연애 궁합", "MBTI compatibility", "동물 토템"],
  image: "https://code-destiny.com/fuctionassets/ai%20face.webp",
  featureList: ["16유형 케미 분석", "관계 대화 힌트", "갈등 조정 포인트"],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const SERVICE = {
  h1: "MBTI 동물 궁합",
  description: META.description,
  ogImage: META.image,
  landingPoints: [...META.featureList],
  seoText: "MBTI 동물 궁합은 유형 조합을 쉽고 직관적인 동물 언어로 번역해 관계 대화를 돕는 서비스입니다.",
  valueGuideTitle: "MBTI 궁합을 관계 기술로 바꾸는 6단계",
  valueSections: [
    {
      title: "1. MBTI 궁합은 성격 판정이 아니라 소통 지도입니다",
      body:
        "유형 조합을 운명 판정처럼 쓰면 관계가 경직되기 쉽습니다. MBTI 궁합의 핵심 가치는 서로의 정보 처리 방식과 감정 표현 속도를 이해하는 데 있습니다. 결과를 \"우리는 안 맞아\"가 아니라 \"어디에서 번역이 필요한가\"로 읽으면 관계 스트레스를 크게 줄일 수 있습니다.",
    },
    {
      title: "2. 동물 비유는 복잡한 유형 차이를 쉽게 설명합니다",
      body:
        "추상적인 유형 코드를 동물 이미지로 바꾸면 상대의 행동 패턴을 기억하기 쉬워집니다. 빠른 결정을 선호하는 유형, 안전 확인이 필요한 유형을 시각적으로 구분하면 대화 준비가 빨라집니다. 동물 비유는 과학적 확정이 아니라 커뮤니케이션 효율을 높이는 보조 언어로 사용하는 것이 적절합니다.",
    },
    {
      title: "3. 궁합 점수보다 갈등 트리거를 먼저 확인하세요",
      body:
        "실제 관계는 높은 궁합 점수보다 갈등 발생 지점을 빨리 파악할 때 안정됩니다. 답장 속도, 약속 확정 방식, 감정 표현 톤 같은 트리거를 미리 확인하면 반복 충돌을 줄일 수 있습니다. 궁합 해석은 점수 비교가 아니라 충돌 예방 체크리스트를 만드는 데 활용할 때 실용성이 큽니다.",
    },
    {
      title: "4. 연애·우정·협업은 같은 조합도 작동이 다릅니다",
      body:
        "같은 유형 조합이라도 관계 맥락에 따라 강점이 달라집니다. 연애에서는 정서 안전감, 우정에서는 템포 호환성, 협업에서는 역할 분담 명확성이 더 중요할 수 있습니다. 그래서 궁합 결과를 맥락별로 분리해 읽으면 \"왜 친구로는 편한데 연애로는 어렵지\" 같은 질문에 현실적인 답이 생깁니다.",
    },
    {
      title: "5. 좋은 궁합도 운영 규칙 없이는 쉽게 흔들립니다",
      body:
        "케미가 좋아도 일정 과밀, 피로 누적, 불명확한 기대치가 쌓이면 관계 만족도는 빠르게 하락합니다. 주간 대화 시간, 갈등 시 금지 문장, 결정 기준 같은 운영 규칙을 정하면 궁합의 장점이 유지됩니다. 궁합은 시작 조건일 뿐 유지 품질은 운영 습관에서 결정됩니다.",
    },
    {
      title: "6. 결과를 대화 스크립트로 바꿔보세요",
      body:
        "해석을 읽은 뒤 바로 쓸 수 있는 문장 2~3개를 준비하면 효과가 큽니다. 예를 들어 \"나는 결정 전에 확인 질문이 필요해\", \"지금은 공감 먼저 듣고 싶어\" 같은 문장을 정해두면 오해가 크게 줄어듭니다. MBTI 동물 궁합은 읽는 콘텐츠를 넘어 관계 대화 훈련 도구로 쓸 때 가장 가치가 큽니다.",
    },
  ],
};

export default function AnimalMbtiLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
