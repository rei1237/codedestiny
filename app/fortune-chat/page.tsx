import { Suspense } from "react";
import { buildSeoMetadata } from "../../lib/seo";
import FortuneChatClient from "./FortuneChatClient";

export const metadata = buildSeoMetadata({
  path: "/fortune-chat",
  noindex: true,
  title: "꽃돼지 운명상담 | 가벼운 상담부터 초융합 심층 리딩까지 | Code Destiny",
  description: "꽃돼지와 대화하며 가벼운 고민 상담부터 초융합 심층 리딩까지 하나의 상담방에서 이어가세요.",
});

export default function FortuneChatPage() {
  // useSearchParams 는 output:"export" 프리렌더에서 Suspense 경계를 요구한다. 루트 레이아웃은
  // 경계를 두지 않으므로(app/layout.js 주석) 이 경계를 빼면 next build 가 실패한다.
  return (
    <Suspense>
      <FortuneChatClient />
    </Suspense>
  );
}
