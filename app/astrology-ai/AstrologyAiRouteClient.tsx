"use client";

import dynamic from "next/dynamic";

const AstrologyAiClient = dynamic(() => import("./AstrologyAiClient"), {
  ssr: false,
  loading: () => <AstrologyAiShell />,
});

function AstrologyAiShell() {
  return (
    <main className="min-h-screen bg-[#060817] px-4 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="h-9 w-44 animate-pulse rounded-full bg-white/10" />
        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
          <div className="h-8 w-72 max-w-full animate-pulse rounded-full bg-white/10" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-28 animate-pulse rounded-lg bg-white/10" />
            <div className="h-28 animate-pulse rounded-lg bg-white/10" />
          </div>
        </section>
        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
          <div className="h-6 w-52 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="h-20 animate-pulse rounded-lg bg-white/10" />
            <div className="h-20 animate-pulse rounded-lg bg-white/10" />
            <div className="h-20 animate-pulse rounded-lg bg-white/10" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AstrologyAiRouteClient() {
  return <AstrologyAiClient />;
}
