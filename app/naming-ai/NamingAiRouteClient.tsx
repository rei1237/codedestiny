"use client";

import dynamic from "next/dynamic";

const NamingAiClient = dynamic(() => import("./NamingAiClient"), {
  ssr: false,
  loading: () => <NamingAiShell />,
});

function NamingAiShell() {
  return (
    <main className="relative min-h-screen bg-[#0b0710] px-4 py-10 text-[#f5ead2]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="h-9 w-44 animate-pulse rounded-full bg-white/10" />
        <section className="rounded-[24px] border border-amber-200/15 bg-white/5 p-6">
          <div className="h-8 w-72 max-w-full animate-pulse rounded-full bg-amber-100/15" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-24 animate-pulse rounded-[20px] bg-white/10" />
            <div className="h-24 animate-pulse rounded-[20px] bg-white/10" />
          </div>
        </section>
        <section className="rounded-[24px] border border-amber-200/15 bg-white/5 p-6">
          <div className="h-6 w-52 animate-pulse rounded-full bg-amber-100/15" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="h-28 animate-pulse rounded-[20px] bg-white/10" />
            <div className="h-28 animate-pulse rounded-[20px] bg-white/10" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function NamingAiRouteClient() {
  return <NamingAiClient />;
}
