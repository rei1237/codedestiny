"use client";

import dynamic from "next/dynamic";

const PromptHubClient = dynamic(() => import("./PromptHubClient"), {
  ssr: false,
  loading: () => <PromptHubShell />,
});

function PromptHubShell() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff8ef] text-slate-900">
      <section className="relative mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div className="mb-3 flex justify-end">
          <div className="h-11 w-24 motion-safe:animate-pulse rounded-xl bg-rose-100/70" />
        </div>
        <div className="rounded-[28px] border border-rose-100 bg-white/88 p-4 shadow-[0_28px_90px_rgba(90,64,82,0.14)] sm:p-5">
          <div className="rounded-[24px] border border-rose-100 bg-white/70 p-5 sm:p-6">
            <div className="h-7 w-52 motion-safe:animate-pulse rounded-full bg-rose-100/80" />
            <div className="mt-4 h-8 w-3/4 max-w-md motion-safe:animate-pulse rounded-full bg-rose-100/70" />
            <div className="mt-3 h-4 w-full max-w-xl motion-safe:animate-pulse rounded-full bg-rose-50" />
            <div className="mt-2 h-4 w-2/3 max-w-lg motion-safe:animate-pulse rounded-full bg-rose-50" />
          </div>

          <div className="mt-4 h-[70px] rounded-[22px] border border-rose-100 bg-white/72 motion-safe:animate-pulse" />

          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_minmax(320px,0.82fr)]">
            <div className="h-[220px] motion-safe:animate-pulse rounded-[22px] border border-rose-100 bg-white/82 lg:h-[420px]" />
            <div className="h-[300px] motion-safe:animate-pulse rounded-[22px] border border-rose-100 bg-white/90 lg:h-[420px]" />
            <div className="h-[280px] motion-safe:animate-pulse rounded-[22px] border border-rose-100 bg-white/90 lg:h-[420px]" />
          </div>
        </div>
      </section>
    </main>
  );
}

export default function PromptHubRouteClient() {
  return <PromptHubClient />;
}
