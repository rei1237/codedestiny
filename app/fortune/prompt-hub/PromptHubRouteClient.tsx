"use client";

import dynamic from "next/dynamic";

const PromptHubClient = dynamic(() => import("./PromptHubClient"), {
  ssr: false,
  loading: () => <PromptHubShell />,
});

/**
 * 마운트 뒤 레이아웃과 골격이 어긋나면 로딩→본체 전환에서 점프가 보인다.
 * PromptHubClient 의 구조(모바일에서 바깥 카드 없음, 도구 레일 1개)와 맞춰 둔다.
 */
function PromptHubShell() {
  const surface = "border-rose-100 bg-white/88 dark:border-[rgba(244,190,209,0.38)] dark:bg-[#3a0e28]/85";
  const shimmer = "motion-safe:animate-pulse bg-rose-100/70 dark:bg-[rgba(244,190,209,0.16)]";
  return (
    <main className="relative text-slate-900 dark:text-[#fff1f7]">
      <section className="relative mx-auto max-w-7xl px-3 pb-[104px] pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-24">
        <div className="mb-3 flex justify-end">
          <div className={`h-11 w-24 rounded-xl ${shimmer}`} />
        </div>
        <div className="max-lg:contents lg:block lg:rounded-[28px] lg:border lg:p-5">
          <div className={`rounded-[24px] border p-4 sm:p-6 ${surface}`}>
            <div className={`h-7 w-52 rounded-full ${shimmer}`} />
            <div className={`mt-4 h-8 w-3/4 max-w-md rounded-full ${shimmer}`} />
            <div className={`mt-3 h-4 w-full max-w-xl rounded-full ${shimmer}`} />
            <div className={`mt-2 h-4 w-2/3 max-w-lg rounded-full ${shimmer}`} />
          </div>

          <div className={`mt-4 h-[86px] rounded-[22px] lg:hidden ${shimmer}`} />

          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_minmax(320px,0.82fr)]">
            <div className={`hidden rounded-[22px] border motion-safe:animate-pulse lg:block lg:h-[420px] ${surface}`} />
            <div className={`h-[300px] rounded-[22px] border motion-safe:animate-pulse lg:h-[420px] ${surface}`} />
            <div className={`h-[280px] rounded-[22px] border motion-safe:animate-pulse lg:h-[420px] ${surface}`} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default function PromptHubRouteClient() {
  return <PromptHubClient />;
}
