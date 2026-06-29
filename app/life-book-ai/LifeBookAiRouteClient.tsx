"use client";

import dynamic from "next/dynamic";

const LifeBookAiClient = dynamic(() => import("./LifeBookAiClient"), {
  ssr: false,
  loading: () => <LifeBookAiShell />,
});

function LifeBookAiShell() {
  return (
    <main className="min-h-screen bg-[#130d07] px-4 py-10 text-amber-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="h-9 w-44 animate-pulse rounded-full bg-amber-100/10" />
        <section className="rounded-[28px] border border-amber-100/15 bg-white/[0.06] p-5 shadow-2xl shadow-black/30">
          <div className="h-8 w-72 max-w-full animate-pulse rounded-full bg-amber-100/10" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-28 animate-pulse rounded-[18px] bg-amber-100/10" />
            <div className="h-28 animate-pulse rounded-[18px] bg-amber-100/10" />
          </div>
        </section>
        <section className="rounded-[28px] border border-amber-100/15 bg-white/[0.06] p-5 shadow-2xl shadow-black/30">
          <div className="h-6 w-52 animate-pulse rounded-full bg-amber-100/10" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-[18px] bg-amber-100/10" />
            <div className="h-24 animate-pulse rounded-[18px] bg-amber-100/10" />
            <div className="h-24 animate-pulse rounded-[18px] bg-amber-100/10" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LifeBookAiRouteClient() {
  return <LifeBookAiClient />;
}
