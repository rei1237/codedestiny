"use client";

import dynamic from "next/dynamic";

const NewYearAiClient = dynamic(() => import("./NewYearAiClient"), {
  ssr: false,
  loading: () => <NewYearAiShell />,
});

function NewYearAiShell() {
  return (
    <main className="min-h-screen bg-[#08060f] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="h-9 w-44 animate-pulse rounded-full bg-white/10" />
        <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30">
          <div className="h-8 w-72 max-w-full animate-pulse rounded-full bg-white/10" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-24 animate-pulse rounded-[18px] bg-white/10" />
            <div className="h-24 animate-pulse rounded-[18px] bg-white/10" />
          </div>
        </section>
        <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30">
          <div className="h-6 w-52 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="h-24 animate-pulse rounded-[18px] bg-white/10" />
            <div className="h-24 animate-pulse rounded-[18px] bg-white/10" />
            <div className="h-24 animate-pulse rounded-[18px] bg-white/10" />
            <div className="h-24 animate-pulse rounded-[18px] bg-white/10" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function NewYearAiRouteClient() {
  return <NewYearAiClient />;
}
