import type { Metadata } from "next";
import FptiExperience from "@/components/fpti/FptiExperience";

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
  return <FptiExperience />;
}
