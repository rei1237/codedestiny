"use client";

import dynamic from "next/dynamic";
import theme from "./love-secret-theme.module.css";

const LoveSecretAiClient = dynamic(() => import("./LoveSecretAiClient"), {
  ssr: false,
  loading: () => <LoveSecretAiShell />,
});

// 스켈레톤도 본 화면과 같은 토큰을 쓴다 — 하드 리로드 때 다크 플래시가 생기지 않게.
function LoveSecretAiShell() {
  return (
    <main className={`${theme.theme} ${theme.pageBg} relative min-h-screen overflow-hidden px-4 pb-10 pt-16 text-[var(--ls-text)] sm:pt-14`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[32px] border border-[var(--ls-line)] bg-[var(--ls-surface)] px-5 py-9 shadow-[var(--ls-glow)] sm:px-8 sm:py-12">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-5">
            <div className="h-16 w-16 animate-pulse rounded-full bg-[var(--ls-surface-sunken)] motion-reduce:animate-none" />
            <div className="h-10 w-56 max-w-full animate-pulse rounded-full bg-[var(--ls-surface-sunken)] motion-reduce:animate-none" />
            <div className="h-5 w-72 max-w-full animate-pulse rounded-full bg-[var(--ls-surface-2)] motion-reduce:animate-none" />
          </div>
        </section>
        <div className="h-12 animate-pulse rounded-2xl bg-[var(--ls-surface)] motion-reduce:animate-none" />
        <section className="rounded-[28px] border border-[var(--ls-line)] bg-[var(--ls-surface)] p-5 shadow-[var(--ls-glow)]">
          <div className="h-6 w-52 animate-pulse rounded-full bg-[var(--ls-surface-sunken)] motion-reduce:animate-none" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-24 animate-pulse rounded-[20px] bg-[var(--ls-surface-2)] motion-reduce:animate-none" />
            <div className="h-24 animate-pulse rounded-[20px] bg-[var(--ls-surface-2)] motion-reduce:animate-none" />
            <div className="h-24 animate-pulse rounded-[20px] bg-[var(--ls-surface-2)] motion-reduce:animate-none" />
            <div className="h-24 animate-pulse rounded-[20px] bg-[var(--ls-surface-2)] motion-reduce:animate-none" />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoveSecretAiRouteClient() {
  return <LoveSecretAiClient />;
}
