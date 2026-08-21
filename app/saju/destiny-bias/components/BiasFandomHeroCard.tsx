"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";

type Props = {
  vm: DestinyBiasResultViewModel;
};

export default function BiasFandomHeroCard({ vm }: Props) {
  const profile = vm.fandomProfile;
  if (!profile) return null;

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-pink-100/85">나의 덕질 체질 MY FANDOM TYPE</p>
      <article className="relative overflow-hidden rounded-[24px] border border-white/14 bg-[linear-gradient(140deg,rgba(24,10,46,0.82),rgba(46,12,60,0.6))] p-5 shadow-[0_12px_36px_rgba(2,6,28,0.4),inset_0_1px_2px_rgba(255,255,255,0.06)] backdrop-blur-xl md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_16%,rgba(255,95,210,0.16),transparent_42%),radial-gradient(circle_at_86%_84%,rgba(201,167,255,0.14),transparent_40%)]" aria-hidden />
        <h3 className="relative z-10 min-w-0 break-keep text-2xl font-black text-white md:text-3xl">{profile.biasCharacterTitle}</h3>
        <p className="relative z-10 mt-3 min-w-0 break-keep text-sm leading-7 text-white/90 md:text-[15px] md:leading-8">
          {profile.biasCharacterOneLiner}
        </p>
      </article>
    </section>
  );
}
