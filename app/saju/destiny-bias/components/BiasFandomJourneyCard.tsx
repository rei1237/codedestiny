"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";

type Props = {
  vm: DestinyBiasResultViewModel;
};

export default function BiasFandomJourneyCard({ vm }: Props) {
  const profile = vm.fandomProfile;
  if (!profile) return null;

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-pink-100/85">입덕 &amp; 취향 ENTRY &amp; TASTE</p>

      <article className="relative overflow-hidden rounded-[24px] border border-white/14 bg-[linear-gradient(140deg,rgba(8,16,42,0.78),rgba(16,11,50,0.6))] p-4 shadow-[0_12px_36px_rgba(2,6,28,0.4),inset_0_1px_2px_rgba(255,255,255,0.06)] backdrop-blur-xl md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(201,167,255,0.12),transparent_42%)]" aria-hidden />
        <div className="relative z-10 flex items-center gap-2">
          <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-sm">⚡</span>
          <h3 className="min-w-0 break-keep text-base font-black text-white md:text-lg">입덕 유형 · {profile.entryType}</h3>
        </div>
        <p className="relative z-10 mt-3 min-w-0 break-keep text-sm leading-7 text-white/90 md:text-[15px] md:leading-8">{profile.entryText}</p>
      </article>

      <article className="relative overflow-hidden rounded-[24px] border border-white/14 bg-[linear-gradient(140deg,rgba(8,16,42,0.78),rgba(16,11,50,0.6))] p-4 shadow-[0_12px_36px_rgba(2,6,28,0.4),inset_0_1px_2px_rgba(255,255,255,0.06)] backdrop-blur-xl md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_20%,rgba(64,200,255,0.1),transparent_40%)]" aria-hidden />
        <div className="relative z-10 flex items-center gap-2">
          <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-sm">💫</span>
          <h3 className="min-w-0 break-keep text-base font-black text-white md:text-lg">취향</h3>
        </div>
        <div className="relative z-10 mt-3 space-y-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-cyan-100/80">처음 끌리는 요소</p>
            <p className="mt-1 min-w-0 break-keep text-sm leading-7 text-white/90 md:text-[15px] md:leading-8">{profile.tasteFirstAttraction}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--bias-gold)]/80">오래 좋아하게 만드는 요소</p>
            <p className="mt-1 min-w-0 break-keep text-sm leading-7 text-white/90 md:text-[15px] md:leading-8">{profile.tasteLongTermReason}</p>
          </div>
        </div>
      </article>
    </section>
  );
}
