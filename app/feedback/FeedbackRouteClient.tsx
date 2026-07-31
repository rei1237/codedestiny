"use client";

import dynamic from "next/dynamic";

// 스켈레톤은 실제 레이아웃(히어로 → 10칸 그리드 → 폼 카드)을 그대로 흉내내어
// 하이드레이션 직후 형태가 바뀌지 않게 한다.
function FeedbackShell() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fffaf7] via-[#fff3f8] to-[#f8fbf4] px-4 py-12 dark:from-[#0a0818] dark:via-[#13102a] dark:to-[#090718]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="h-4 w-40 animate-pulse rounded-full bg-[#b31955]/10 dark:bg-white/10" />
        <div className="h-10 w-64 max-w-full animate-pulse rounded-full bg-[#b31955]/10 dark:bg-white/10" />
        <div className="h-16 w-full animate-pulse rounded-2xl bg-[#b31955]/[0.06] dark:bg-white/[0.06]" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="h-[92px] animate-pulse rounded-2xl bg-[#b31955]/[0.06] dark:bg-white/[0.06]" />
          ))}
        </div>
        <div className="h-64 w-full animate-pulse rounded-3xl bg-[#b31955]/[0.06] dark:bg-white/[0.06]" />
      </div>
    </main>
  );
}

const FeedbackClient = dynamic(() => import("./FeedbackClient"), {
  ssr: false,
  loading: () => <FeedbackShell />,
});

export default function FeedbackRouteClient() {
  return <FeedbackClient />;
}
