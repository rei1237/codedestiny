"use client";

import dynamic from "next/dynamic";

const FptiExperience = dynamic(() => import("@/components/fpti/FptiExperience"), {
  ssr: false,
  loading: () => <SajuFptiShell />,
});

export default function SajuFptiRouteClient() {
  return <FptiExperience />;
}

function SajuFptiShell() {
  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      <section className="mx-auto flex min-h-[52vh] max-w-5xl flex-col justify-center px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200/80">Saju FPTI</p>
        <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">사주 FPTI 테스트</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
          오행과 십성의 결을 따라 당신의 성향 축이 어디로 기울어 있는지 차분히 펼쳐 봅니다.
        </p>
      </section>
    </div>
  );
}
