import { Suspense } from "react";
import InsightsCosmicClient from "./InsightsCosmicClient";

export const metadata = {
  title: "운세 인사이트 | CODE DESTINY",
  description: "사주, 타로, 점성술 인사이트를 최신순/인기순으로 탐색하세요.",
};

export default function InsightsPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-6xl px-4 py-16 text-sm text-slate-400">인사이트 목록을 불러오는 중...</div>}>
      <InsightsCosmicClient />
    </Suspense>
  );
}
