"use client";

import dynamic from "next/dynamic";

const PointHistoryClient = dynamic(() => import("./PointHistoryClient"), {
  ssr: false,
  loading: () => <PointHistoryShell />,
});

function PointHistoryShell() {
  return (
    <main className="min-h-screen bg-[#FFF8E8] px-4 py-10 text-[#5C3A1E]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="h-10 w-44 animate-pulse rounded-full bg-[#EAD7A4]" />
        <section className="rounded-[24px] border border-[#EDDBA3]/70 bg-[rgba(255,252,243,0.95)] p-5 shadow-[0_8px_28px_rgba(120,80,10,0.09)]">
          <div className="h-7 w-48 animate-pulse rounded-full bg-[#EAD7A4]" />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-[18px] bg-[#F5E7BE]" />
            <div className="h-24 animate-pulse rounded-[18px] bg-[#F5E7BE]" />
            <div className="h-24 animate-pulse rounded-[18px] bg-[#F5E7BE]" />
          </div>
        </section>
        <section className="rounded-[24px] border border-[#EDDBA3]/70 bg-[rgba(255,252,243,0.95)] p-5 shadow-[0_8px_28px_rgba(120,80,10,0.09)]">
          <div className="h-6 w-40 animate-pulse rounded-full bg-[#EAD7A4]" />
          <div className="mt-4 space-y-3">
            <div className="h-16 animate-pulse rounded-[16px] bg-[#F5E7BE]" />
            <div className="h-16 animate-pulse rounded-[16px] bg-[#F5E7BE]" />
            <div className="h-16 animate-pulse rounded-[16px] bg-[#F5E7BE]" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PointHistoryRouteClient() {
  return <PointHistoryClient />;
}
