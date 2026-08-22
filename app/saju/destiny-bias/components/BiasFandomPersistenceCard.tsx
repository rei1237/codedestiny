"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";
import { useDestinyBiasCopy } from "../_lib/copy";

type Props = {
  vm: DestinyBiasResultViewModel;
};

export default function BiasFandomPersistenceCard({ vm }: Props) {
  const copy = useDestinyBiasCopy();
  const profile = vm.fandomProfile;
  if (!profile) return null;

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-pink-100/85">{copy.persistenceSectionLabel} HOW LONG IT LASTS</p>
      <article className="relative overflow-hidden rounded-[24px] border border-white/14 bg-[linear-gradient(140deg,rgba(12,10,50,0.78),rgba(24,10,58,0.6))] p-4 shadow-[0_12px_36px_rgba(2,6,28,0.4),inset_0_1px_2px_rgba(255,255,255,0.06)] backdrop-blur-xl md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(255,95,210,0.16),transparent_42%),radial-gradient(circle_at_84%_80%,rgba(201,167,255,0.14),transparent_40%)]" aria-hidden />
        <div className="relative z-10 flex flex-wrap gap-2">
          <span className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100/90">{copy.persistenceIntensityLabel} · {profile.persistenceIntensity}</span>
          <span className="rounded-full border border-[var(--bias-gold)]/45 bg-[var(--bias-gold)]/12 px-3 py-1.5 text-xs font-bold text-[var(--bias-gold)]">{copy.persistenceDurationLabel} · {profile.persistenceDuration}</span>
        </div>
        <p className="relative z-10 mt-3 min-w-0 break-keep text-sm leading-7 text-white/90 md:text-[15px] md:leading-8">{profile.persistenceText}</p>
      </article>
    </section>
  );
}
