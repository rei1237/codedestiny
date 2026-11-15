import type { Metadata } from "next";
import ModelReview from "./ModelReview";

export const metadata: Metadata = {
  title: "연이와 쉬어가는 시간 | 달빛 연화당",
  description: "동글동글한 꽃돼지 연이의 2D 인사·명상·큰절 동작을 살펴보는 독립 검수 화면입니다.",
  robots: { index: false, follow: false },
};

export default function YeoniModelReviewPage() {
  return <ModelReview />;
}
