"use client";

export default function MyDestinyBiasHero({
  subtitle,
}: {
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/20 bg-[linear-gradient(130deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))] p-5 shadow-[0_24px_70px_rgba(3,2,14,0.45)] backdrop-blur-2xl md:p-7">
      <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-pink-300/35 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-20 top-8 h-48 w-48 rounded-full bg-cyan-300/25 blur-3xl" aria-hidden />

      <p className="text-xs font-semibold tracking-[0.22em] text-fuchsia-100/90">MY DESTINY BIAS</p>
      <h1 className="mt-2 text-3xl font-black leading-tight text-white md:text-5xl">THE CONCERT AURA PHOTOCARD</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85 md:text-base">
        오늘, 당신의 운명이 최애의 무대와 연결되었습니다. 응원봉의 빛과 별빛 오라가 겹치는 순간을
        한정판 팬싸인 포토카드로 기록해 보세요.
      </p>
      {subtitle ? <p className="mt-3 text-sm font-semibold text-cyan-100/90">{subtitle}</p> : null}
    </section>
  );
}
