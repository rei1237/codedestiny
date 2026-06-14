import FeatureLandingPage from "../../components/FeatureLandingPage";
import { buildFortuneJsonLd, generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/dream/psycho",
  title: "정신분석 해몽 - Freud Study",
  description: "프로이트 관점의 상징 분석으로 꿈에 담긴 무의식 신호와 관계 패턴을 읽는 심층 꿈해몽 가이드입니다.",
  keywords: ["정신분석 해몽", "프로이트", "무의식", "꿈 분석", "dream psycho"],
  image: "https://code-destiny.com/fuctionassets/phydream.webp",
  featureList: ["무의식 상징 구조화", "관계 패턴 해석", "자기이해 질문 제공"],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const JSON_LD = buildFortuneJsonLd(META);

const SERVICE = {
  h1: "정신분석 해몽",
  description: META.description,
  ogImage: META.image,
  landingPoints: [...META.featureList],
  seoText: "정신분석 해몽은 꿈을 무의식의 언어로 보고 상징과 감정 흐름을 함께 분석하는 서비스입니다.",
  valueGuideTitle: "정신분석 해몽을 안전하게 활용하는 6원칙",
  valueSections: [
    {
      title: "1. 프로이트 해석은 정답 찾기보다 질문 프레임입니다",
      body:
        "정신분석 해몽은 꿈의 상징을 하나의 정답으로 고정하기보다, 내 욕구와 불안을 점검하는 질문 틀로 사용하는 것이 핵심입니다. 해석 결과를 절대 진실로 받아들이기보다 현재의 정서 상태를 탐색하는 출발점으로 쓰면 과도한 자기낙인을 줄이고 건강한 자기이해로 이어질 수 있습니다.",
    },
    {
      title: "2. 잠재내용과 표면내용을 구분하면 과장이 줄어듭니다",
      body:
        "꿈에서 본 장면 자체는 표면내용이고, 그 장면이 가리키는 감정과 욕구는 잠재내용입니다. 정신분석은 이 둘을 분리해 읽는 데 강점이 있습니다. 사건 묘사에만 머물지 말고 \"이 장면이 내게 어떤 감정 반응을 만들었는가\"를 함께 기록하면 해석이 더 구체적이고 현실 친화적으로 변합니다.",
    },
    {
      title: "3. 반복 상징은 억압보다 미해결 긴장 신호일 수 있습니다",
      body:
        "좇기는 꿈, 시험 꿈, 늦는 꿈처럼 반복되는 상징은 종종 일상에서 미뤄둔 긴장 과제와 연결됩니다. 이를 병리적으로 단정하기보다 생활 구조를 점검하는 단서로 보는 것이 안전합니다. 수면 부족, 업무 과밀, 관계 갈등 같은 현실 요인을 함께 확인하면 해석이 과도한 자기비난으로 흐르지 않습니다.",
    },
    {
      title: "4. 해석 후에는 자기돌봄 행동을 반드시 붙이세요",
      body:
        "정신분석 해몽은 감정을 깊게 건드릴 수 있으므로, 해석 직후 간단한 안정 루틴을 갖는 것이 좋습니다. 짧은 산책, 감정 기록, 신뢰하는 사람과의 대화처럼 신체·관계 차원의 회복 행동을 붙이면 분석 과정이 안전해집니다. 통찰과 안정이 같이 갈 때 해석의 질이 오래 유지됩니다.",
    },
    {
      title: "5. 관계 해석은 타인 진단이 아니라 경계 설정에 활용하세요",
      body:
        "꿈에 특정 인물이 자주 등장해도 상대를 단정하는 근거로 사용하면 갈등이 커질 수 있습니다. 대신 내가 관계에서 어디까지 허용하고 어디서 경계를 세워야 편안한지 점검하는 데 쓰는 것이 바람직합니다. 정신분석 해몽의 목적은 타인 판단이 아니라 자기 경계와 욕구를 명확히 하는 데 있습니다.",
    },
    {
      title: "6. 불편감이 크면 전문가 상담과 병행하세요",
      body:
        "꿈해몽은 자기이해 도구이지만, 지속적인 불안이나 수면장애가 동반될 때는 전문 상담·치료와 병행하는 것이 안전합니다. 특히 강한 공포 꿈이 반복되거나 일상 기능이 떨어지는 경우에는 자가 해석만으로 버티지 말고 도움을 요청하는 것이 중요합니다. 건강한 해석은 자기돌봄 체계 안에서 작동합니다.",
    },
  ],
};

export default function DreamPsychoLandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <FeatureLandingPage service={SERVICE} />
    </>
  );
}
