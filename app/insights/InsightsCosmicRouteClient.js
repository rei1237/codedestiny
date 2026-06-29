"use client";

import dynamic from "next/dynamic";

const InsightsCosmicClient = dynamic(() => import("./InsightsCosmicClient"), {
  ssr: false,
  loading: () => <InsightsCosmicShell />,
});

function InsightsCosmicShell() {
  return (
    <main className="min-h-screen bg-[#09090f] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="h-9 w-48 animate-pulse rounded-full bg-white/10" />
        <section className="rounded-[24px] border border-white/10 bg-white/[0.06] p-5">
          <div className="h-8 w-72 max-w-full animate-pulse rounded-full bg-white/10" />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="h-36 animate-pulse rounded-[18px] bg-white/10" />
            <div className="h-36 animate-pulse rounded-[18px] bg-white/10" />
            <div className="h-36 animate-pulse rounded-[18px] bg-white/10" />
          </div>
        </section>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-[18px] border border-white/10 bg-white/[0.06]" />
          ))}
        </section>
      </div>
    </main>
  );
}

export default function InsightsCosmicRouteClient(props) {
  return <InsightsCosmicClient {...props} />;
}
