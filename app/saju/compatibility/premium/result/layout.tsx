import type { ReactNode } from "react";
import { generatePageMetadata } from "@/lib/generate-page-metadata";

// 개인 궁합 결과 화면이라 색인하지 않는다.
export function generateMetadata() {
  return generatePageMetadata({
    path: "/saju/compatibility/premium/result/",
    title: "사주 고급 궁합 결과 | 꿀꿀운세",
    description: "저장된 사주 고급 궁합 풀이를 다시 확인하는 화면입니다.",
    noindex: true,
  });
}

export default function SajuCompatPremiumResultLayout({ children }: { children: ReactNode }) {
  return children;
}
