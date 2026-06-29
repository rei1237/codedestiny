"use client";

import dynamic from "next/dynamic";

const SukuyoCalendarClient = dynamic(() => import("./SukuyoCalendarClient"), {
  ssr: false,
  loading: () => <SukuyoCalendarShell />,
});

function SukuyoCalendarShell() {
  return (
    <main className="min-h-screen bg-[#fbf7ef] px-4 py-10 text-[#3b2a1f]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="h-8 w-40 animate-pulse rounded-full bg-[#e8dcc8]" />
        <section className="rounded-[24px] border border-[#eadbc4] bg-white/85 p-5 shadow-[0_8px_28px_rgba(80,55,30,0.08)]">
          <div className="h-8 w-56 animate-pulse rounded-full bg-[#e8dcc8]" />
          <div className="mt-5 grid gap-3 sm:grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-[18px] bg-[#f2e8d8]" />
            ))}
          </div>
        </section>
        <section className="rounded-[24px] border border-[#eadbc4] bg-white/85 p-5 shadow-[0_8px_28px_rgba(80,55,30,0.08)]">
          <div className="h-6 w-44 animate-pulse rounded-full bg-[#e8dcc8]" />
          <div className="mt-4 space-y-3">
            <div className="h-14 animate-pulse rounded-[16px] bg-[#f2e8d8]" />
            <div className="h-14 animate-pulse rounded-[16px] bg-[#f2e8d8]" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function SukuyoCalendarRouteClient() {
  return <SukuyoCalendarClient />;
}
