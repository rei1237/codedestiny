"use client";

import dynamic from "next/dynamic";

const MeClient = dynamic(() => import("./MeClient"), {
  ssr: false,
  loading: () => <MeShell />,
});

export default function MeRouteClient() {
  return <MeClient />;
}

function MeShell() {
  return (
    <main className="min-h-screen bg-[#07071a] px-4 py-6 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[28px] border border-violet-200/15 bg-white/[0.06] p-6 shadow-2xl shadow-black/30">
          <div className="h-5 w-28 rounded-full bg-violet-100/20" />
          <div className="mt-6 h-10 w-4/5 rounded-2xl bg-white/10" />
          <div className="mt-3 h-4 w-full rounded-full bg-white/10" />
          <div className="mt-2 h-4 w-5/6 rounded-full bg-white/10" />
          <div className="mt-8 grid gap-3">
            <div className="h-16 rounded-2xl bg-white/10" />
            <div className="h-16 rounded-2xl bg-white/10" />
          </div>
        </section>
        <section className="rounded-[28px] border border-amber-200/15 bg-white/[0.06] p-6 shadow-2xl shadow-black/30">
          <div className="h-5 w-36 rounded-full bg-amber-100/20" />
          <div className="mt-6 grid gap-3">
            <div className="h-20 rounded-2xl bg-white/10" />
            <div className="h-20 rounded-2xl bg-white/10" />
            <div className="h-12 rounded-2xl bg-amber-200/20" />
          </div>
        </section>
      </div>
    </main>
  );
}
