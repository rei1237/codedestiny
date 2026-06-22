import TarotGuideContent from "./TarotGuideContent";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/tarot/guide",
    title: "타로 카드 리딩 입문 | Code Destiny",
    description:
      "타로 리딩의 기본 구조, 질문을 세우는 법, 카드 배열과 해석 흐름, 무료·유료 리딩의 차이와 주의사항을 안내합니다.",
    keywords: ["타로 가이드", "타로 리딩", "타로 카드", "카드 배열", "Code Destiny"],
  });
}

export default function TarotGuidePage() {
  return <TarotGuideContent />;
}
