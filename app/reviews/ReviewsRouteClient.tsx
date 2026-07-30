"use client";

import dynamic from "next/dynamic";

const ReviewsClient = dynamic(() => import("./ReviewsClient"), {
  ssr: false,
  loading: () => <ReviewsShell />,
});

export default function ReviewsRouteClient() {
  return <ReviewsClient />;
}

function ReviewsShell() {
  return (
    <div className="min-h-screen bg-[#fffaf7] text-[#3c1830] dark:bg-[#1a0a14] dark:text-[#fff1f7]">
      <section className="mx-auto flex min-h-[52vh] max-w-5xl flex-col justify-center px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#b31955] dark:text-[#f4bed1]">Reviews</p>
        <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">실시간 사용자 리뷰</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-[#70445c] dark:text-[#f4bed1] sm:text-lg">
          실제로 상담과 리포트를 받아 본 분들이 남긴 후기를 불러오는 중입니다.
        </p>
      </section>
    </div>
  );
}
