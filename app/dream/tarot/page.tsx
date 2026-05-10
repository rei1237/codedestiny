import FeatureLandingPage from "../../components/FeatureLandingPage";
import { buildFortuneJsonLd, generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/dream/tarot",
  title: "드림 타로 - AI 꿈 해석 리포트 | Code Destiny",
  description: "꿈의 장면과 감정 키워드를 분석해 현재 심리 상태와 다음 행동 힌트를 제시하는 꿈해몽 가이드입니다.",
  keywords: ["꿈해몽", "드림 타로", "AI 꿈 해석", "dream interpretation", "무의식"],
  image: "https://code-destiny.com/fuctionassets/heamong.webp",
  featureList: ["꿈 상징 해석", "감정 톤 분석", "실행형 조언"],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const JSON_LD = buildFortuneJsonLd(META);

const SERVICE = {
  h1: "드림 타로",
  description: META.description,
  ogImage: META.image,
  landingPoints: [...META.featureList],
  seoText: "드림 타로는 꿈 속 사건, 감정, 반복 상징을 기반으로 현재 심리 흐름을 읽는 AI 꿈해몽 서비스입니다.",
  valueGuideTitle: "꿈해몽을 현실 통찰로 바꾸는 6단계",
  valueSections: [
    {
      title: "1. 꿈해몽은 길흉 예언보다 감정 신호 해석입니다",
      body:
        "꿈은 미래를 단정하는 메시지라기보다 최근 정서와 스트레스가 압축된 형태로 나타나는 경우가 많습니다. 그래서 장면 자체보다 꿈에서 느낀 감정, 깬 직후 남은 여운을 먼저 기록하면 해석 정확도가 높아집니다. 꿈해몽을 불안 증폭 도구가 아닌 자기관찰 도구로 쓰는 태도가 핵심입니다.",
    },
    {
      title: "2. 상징은 사전 뜻보다 개인 맥락이 우선입니다",
      body:
        "물, 계단, 동물 같은 상징은 일반 사전 의미가 있지만 개인 경험에 따라 완전히 달라질 수 있습니다. 예를 들어 물이 누군가에게는 휴식이지만 다른 누군가에게는 통제 불안을 의미할 수 있습니다. 따라서 공통 상징 해석 위에 내 최근 사건을 겹쳐 읽는 2단계 방식이 가장 실용적입니다.",
    },
    {
      title: "3. 반복 꿈은 해결되지 않은 과제를 가리키는 경우가 많습니다",
      body:
        "같은 유형의 꿈이 반복된다면 단순 우연보다 미해결 과제가 남아 있을 가능성을 점검해 볼 필요가 있습니다. 관계 대화 미루기, 일정 과부하, 미완료된 결정 같은 요소가 반복 꿈으로 나타나기도 합니다. 꿈해몽의 가치는 상징 해석 자체보다 현실 과제를 명료화하는 데 있습니다.",
    },
    {
      title: "4. 해석 결과는 다음 48시간 행동으로 연결하세요",
      body:
        "좋은 해석도 행동으로 이어지지 않으면 빠르게 휘발됩니다. 꿈에서 경계 신호가 강했다면 일정 감축, 관계 신호가 강했다면 확인 대화 시도처럼 작고 구체적인 행동 1개를 정해보세요. 48시간 내 실행 가능한 단일 행동으로 번역하면 꿈해몽이 실제 의사결정에 도움이 됩니다.",
    },
    {
      title: "5. 관계 꿈은 상대 판정보다 내 욕구 언어를 읽는 데 쓰세요",
      body:
        "연애나 가족 꿈을 상대의 의도로 단정하면 오해가 커질 수 있습니다. 오히려 내가 어떤 안정, 존중, 거리감을 필요로 하는지 파악하는 데 집중하면 해석이 훨씬 건강해집니다. 꿈은 타인을 규정하는 도구가 아니라 내 욕구를 명확히 표현하기 위한 준비 도구로 사용할 때 효용이 큽니다.",
    },
    {
      title: "6. 주간 꿈 로그를 만들면 패턴이 보입니다",
      body:
        "꿈 내용, 감정 강도, 다음날 컨디션을 짧게 기록하면 2~3주 안에 반복 패턴이 드러납니다. 특정 업무 전날 악몽이 잦거나, 특정 관계 이슈 후 특정 상징이 반복되는 식의 연결점이 보이면 대응 전략을 세울 수 있습니다. 꿈해몽은 기록이 쌓일수록 정확도가 높아지는 느린 도구입니다.",
    },
  ],
};

export default function DreamTarotLandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <FeatureLandingPage service={SERVICE} />
    </>
  );
}