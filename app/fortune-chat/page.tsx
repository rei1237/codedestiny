import { Suspense } from "react";
import { buildSeoMetadata } from "../../lib/seo";
import ConsultationEntrance from "./ConsultationEntrance";
import FortuneChatCompatibility from "./FortuneChatCompatibility";

export const metadata = buildSeoMetadata({
  path: "/fortune-chat",
  noindex: true,
  title: "연이의 운명 상담 | 질문 하나에 담는 해석과 조언 | 꿀꿀 운세",
  description: "연이와 함께 지금의 고민을 살펴보세요. 선택한 운세의 근거로 현재의 흐름과 현실적인 행동 조언을 정리합니다.",
});

export default function FortuneChatPage() {
  // useSearchParams 는 output:"export" 프리렌더에서 Suspense 경계를 요구한다. 루트 레이아웃은
  // 경계를 두지 않으므로(app/layout.js 주석) 이 경계를 빼면 next build 가 실패한다.
  return (
    <Suspense fallback={<ConsultationEntrance />}>
      <FortuneChatCompatibility />
    </Suspense>
  );
}
