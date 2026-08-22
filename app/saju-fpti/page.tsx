import type { Metadata } from "next";
import SajuFptiRouteClient from "./SajuFptiRouteClient";
import RouteMetadataLocaleSync from "../components/RouteMetadataLocaleSync";

const SAJU_FPTI_METADATA_COPY = {
  ko: {
    title: "사주 FPTI 테스트 | 코드 데스티니",
    description:
      "사주 오행과 십성 분포를 기반으로 4축 FPTI 코드를 분석해주는 테스트. 무료 핵심 결과와 유료 심층 리포트를 제공합니다.",
  },
  en: {
    title: "Saju FPTI Test | Code Destiny",
    description:
      "Analyze your four-axis FPTI code from the Five Elements and Ten Gods distribution in your saju chart, with free core results and a paid deep report.",
  },
  ja: {
    title: "四柱推命FPTIテスト | Code Destiny",
    description:
      "四柱推命の五行と十星の分布をもとに4軸FPTIコードを分析するテストです。無料の基本結果と有料の深層リポートを提供します。",
  },
  zh: {
    title: "四柱 FPTI 测试 | Code Destiny",
    description:
      "基于四柱五行与十神分布分析四轴 FPTI 代码，提供免费核心结果与付费深度报告。",
  },
};

const metadataCopy = SAJU_FPTI_METADATA_COPY.ko;

export const metadata: Metadata = {
  title: metadataCopy.title,
  description: metadataCopy.description,
  alternates: {
    canonical: "/saju-fpti",
  },
};

export default function SajuFptiPage() {
  return (
    <>
      <RouteMetadataLocaleSync entries={SAJU_FPTI_METADATA_COPY} />
      <section className="sr-only" aria-label="사주 FPTI 테스트 설명">
        <h2>사주 FPTI 테스트</h2>
        <p>
          사주 오행과 십성의 분포를 기반으로 당신의 성향을 4축 FPTI 코드로 분석합니다.
          FPTI는 Four-axis Personality Type Index의 약자로, 사주의 정보를 현대적 심리 프레임으로 번역합니다.
        </p>
        <p>
          오행(목화토금수)과 십성(정편인편재정관편관)의 조화를 분석하여 당신의 성향 축을 찾아냅니다.
          무료로 핵심 결과를 바로 확인할 수 있으며, 상세한 심층 분석 리포트는 유료 옵션으로 제공됩니다.
        </p>
        <p>
          당신의 생년월일과 출생 시간을 입력하면 개인화된 FPTI 코드와 성향 분석을 받을 수 있습니다.
          이 테스트는 사주의 과학적 해석과 현대 심리학의 통찰을 결합하여 설계되었습니다.
        </p>
      </section>
      <SajuFptiRouteClient />
    </>
  );
}
