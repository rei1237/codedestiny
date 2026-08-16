"use client";

import dynamic from "next/dynamic";

const OnboardingClient = dynamic(() => import("./OnboardingClient"), {
  ssr: false,
  loading: () => <OnboardingShell />,
});

export default function OnboardingRouteClient() {
  return <OnboardingClient />;
}

/** 하이드레이션 전 자리표시자. 실제 카드와 같은 폭·간격이라 마운트될 때 흔들리지 않는다. */
function OnboardingShell() {
  return (
    <main className="relative min-h-[100dvh] bg-[#090b1a] px-4 py-6 text-white [color-scheme:dark] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[440px] items-center">
        <section className="w-full animate-pulse rounded-[24px] border border-[#c9b7f0]/20 bg-[#12152b] p-5 sm:p-7">
          <div className="mx-auto h-[52px] w-[52px] rounded-2xl bg-white/10" />
          <div className="mx-auto mt-4 h-7 w-3/4 rounded-xl bg-white/10" />
          <div className="mx-auto mt-3 h-4 w-5/6 rounded-full bg-white/10" />
          <div className="mt-8 grid gap-4">
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="h-12 rounded-xl bg-[#7c5cbf]/30" />
          </div>
        </section>
      </div>
    </main>
  );
}
