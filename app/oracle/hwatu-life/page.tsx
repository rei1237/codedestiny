import FeatureLandingPage from "../../components/FeatureLandingPage";
import { buildFortuneJsonLd } from "../../../lib/generate-page-metadata";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";

const JSON_LD = buildFortuneJsonLd({
  path: "/oracle/hwatu-life",
  title: "화투 인생 패 테스트",
  description: "7문항 선택으로 나를 상징하는 화투 인생 패 아키타입을 찾고 선택 패턴과 생활 리듬을 가볍게 점검하는 무료 테스트입니다.",
  keywords: ["화투 인생 패", "심리테스트", "아키타입 테스트", "hwatu life test"],
  image: "https://code-destiny.com/fuctionassets/tazza.webp",
  featureList: ["7문항 심리테스트", "화투 인생 패 아키타입", "선택 패턴 분석"],
  applicationCategory: "LifestyleApplication",
});

const SERVICE = {
  h1: "화투 인생 패 테스트",
  description:
    "돈·사랑·위기 상황에서의 선택 패턴을 통해 나를 상징하는 화투 인생 패 아키타입을 찾아주는 심리테스트입니다.",
  ogImage: "https://code-destiny.com/fuctionassets/tazza.webp",
  landingPoints: ["7문항 심리테스트", "화투 인생 패 아키타입 파악", "조건별 선택 패턴 분석"],
  seoText:
    "7문항 심리테스트로 삼광·고도리·청단·똑광 아키타입을 찾아드립니다.",
  valueGuideTitle: "화투 심리테스트를 재미있고 정확하게 즐기는 6포인트",
  valueSections: [
    {
      title: "1. 이 테스트는 성격 단정보다 선택 습관을 관찰합니다",
      body:
        "화투 인생 패 테스트는 \"나는 어떤 사람인가\"를 단정하기보다 상황별 의사결정 패턴을 비유적으로 보여주는 데 목적이 있습니다. 같은 사람도 스트레스 상황과 안정 상황에서 다른 선택을 하기 때문에, 결과는 고정 성격 진단서가 아니라 지금 시점의 반응 경향을 읽는 스냅샷으로 받아들이는 것이 정확합니다.",
    },
    {
      title: "2. 돈·사랑·위기 문항을 분리해서 보면 해석이 선명해집니다",
      body:
        "하나의 총점보다 문항 영역별 반응을 따로 보면 실질적인 통찰이 나옵니다. 돈 문항에서 보수적이고 관계 문항에서 즉흥적이라면, 실제 갈등은 가치관보다 의사결정 속도 차이에서 생길 가능성이 큽니다. 영역 분리 해석은 결과를 생활 조정 전략으로 바꾸는 가장 쉬운 방법입니다.",
    },
    {
      title: "3. 아키타입은 우열이 아니라 장단점의 묶음입니다",
      body:
        "삼광, 고도리, 청단, 똑광 같은 결과는 누가 더 낫다는 의미가 아닙니다. 추진형은 실행력이 강하지만 과속 위험이 있고, 신중형은 손실 회피에 강하지만 타이밍을 놓칠 수 있습니다. 결과 해석에서 \"내가 틀렸다\"가 아니라 \"언제 이 강점이 도움이 되고 언제 조절이 필요한가\"를 보는 태도가 중요합니다.",
    },
    {
      title: "4. 궁합 활용은 상대 평가보다 협업 규칙 설정이 핵심입니다",
      body:
        "심리테스트 궁합을 관계 판정표처럼 쓰면 금방 갈등이 커집니다. 대신 \"누가 의사결정을 시작하고 누가 검토를 맡을지\" 같은 역할 규칙을 만들면 결과가 실용적으로 바뀝니다. 서로 다른 아키타입 조합은 충돌의 원인이 될 수도 있지만, 운영 규칙이 있으면 오히려 높은 보완 시너지를 만들 수 있습니다.",
    },
    {
      title: "5. 결과를 일상 실험으로 연결하면 체감 가치가 올라갑니다",
      body:
        "테스트 후 일주일만 실험해 보세요. 소비 결정 전 30분 대기, 갈등 대화 전 질문 1개 먼저 던지기, 중요한 약속은 당일 확정 대신 전날 재확인 같은 작은 습관을 적용하면 결과가 행동으로 전환됩니다. 재미형 콘텐츠도 실험 루틴을 붙이면 자기이해 도구로 충분히 작동합니다.",
    },
    {
      title: "6. 반복 측정으로 현재 상태 변화를 읽어보세요",
      body:
        "심리 상태는 고정값이 아니라 주기적으로 변합니다. 같은 테스트를 월 1회 정도 동일한 조건에서 다시 해보면, 최근 스트레스·관계·일정 변화가 의사결정에 어떤 영향을 주는지 확인할 수 있습니다. 결과 변화 자체를 좋고 나쁨으로 판단하기보다 \"내 리듬이 어떻게 움직이는지\"를 추적하는 용도로 쓰는 것이 가장 건강합니다.",
    },
  ],
};

export const metadata = withUniqueRouteMetadata("/oracle/hwatu-life", {
  title: "화투 인생 패 테스트",
  description:
    "7문항 선택으로 나를 상징하는 화투 인생 패 아키타입을 찾고 선택 패턴과 생활 리듬을 가볍게 점검하는 무료 테스트입니다.",
});

export default function HwatuLifeLandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <FeatureLandingPage service={SERVICE} />
    </>
  );
}
