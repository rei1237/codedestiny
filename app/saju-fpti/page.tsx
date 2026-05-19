import type { Metadata } from "next";
import FptiExperience from "@/components/fpti/FptiExperience";

export const metadata: Metadata = {
  title: "사주 FPTI 테스트 | 코드 데스티니",
  description:
    "사주 오행과 십성 분포를 기반으로 4축 FPTI 코드를 분석해주는 테스트. 무료 핵심 결과와 유료 심층 리포트를 제공합니다.",
  alternates: {
    canonical: "/saju-fpti",
  },
};

export default function SajuFptiPage() {
  return <FptiExperience />;
}
