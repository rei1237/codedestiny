"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";
import { useDestinyBiasCopy } from "../_lib/copy";

type Props = {
  vm: DestinyBiasResultViewModel;
};

export default function BiasFandomFinaleCard({ vm }: Props) {
  const copy = useDestinyBiasCopy();
  const profile = vm.fandomProfile;
  if (!profile) return null;

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-pink-100/85">{copy.finaleSectionLabel} THE FINAL VERDICT</p>
      <article className="relative overflow-hidden rounded-[24px] border border-[var(--bias-gold)]/35 bg-[linear-gradient(140deg,rgba(24,10,46,0.86),rgba(46,12,60,0.64))] p-5 shadow-[0_12px_36px_rgba(2,6,28,0.4),inset_0_1px_2px_rgba(255,255,255,0.06)] backdrop-blur-xl md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_16%,rgba(255,217,138,0.16),transparent_42%),radial-gradient(circle_at_86%_84%,rgba(255,95,210,0.14),transparent_40%)]" aria-hidden />
        <p className="relative z-10 min-w-0 break-keep text-sm leading-7 text-white/92 md:text-base md:leading-8">{profile.finalPhilosophy}</p>
      </article>
    </section>
  );
}
