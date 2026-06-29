"use client";

import dynamic from "next/dynamic";

const LoveSecretAiClient = dynamic(() => import("./LoveSecretAiClient"), {
  ssr: false,
  loading: () => <LoveSecretAiShell />,
});

function LoveSecretAiShell() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#140014] px-4 py-10 text-[#fff8ef]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="h-9 w-44 animate-pulse rounded-full bg-white/10" />
        <section className="rounded-[28px] border border-rose-100/15 bg-white/10 p-5 backdrop-blur-xl">
          <div className="h-8 w-72 max-w-full animate-pulse rounded-full bg-rose-100/15" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-24 animate-pulse rounded-[20px] bg-white/10" />
            <div className="h-24 animate-pulse rounded-[20px] bg-white/10" />
          </div>
        </section>
        <section className="rounded-[28px] border border-rose-100/15 bg-white/10 p-5 backdrop-blur-xl">
          <div className="h-6 w-52 animate-pulse rounded-full bg-rose-100/15" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="h-28 animate-pulse rounded-[20px] bg-white/10" />
            <div className="h-28 animate-pulse rounded-[20px] bg-white/10" />
            <div className="h-28 animate-pulse rounded-[20px] bg-white/10" />
            <div className="h-28 animate-pulse rounded-[20px] bg-white/10" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoveSecretAiRouteClient() {
  return <LoveSecretAiClient />;
}
