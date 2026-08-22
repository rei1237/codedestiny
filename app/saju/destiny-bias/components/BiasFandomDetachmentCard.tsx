"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";
import { useDestinyBiasCopy } from "../_lib/copy";

type Props = {
  vm: DestinyBiasResultViewModel;
};

export default function BiasFandomDetachmentCard({ vm }: Props) {
  const copy = useDestinyBiasCopy();
  const profile = vm.fandomProfile;
  if (!profile) return null;

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-pink-100/85">{copy.detachmentSectionLabel} WHAT COOLS IT DOWN</p>
      <article className="relative overflow-hidden rounded-[24px] border border-white/14 bg-[linear-gradient(140deg,rgba(8,16,42,0.78),rgba(16,11,50,0.6))] p-4 shadow-[0_12px_36px_rgba(2,6,28,0.4),inset_0_1px_2px_rgba(255,255,255,0.06)] backdrop-blur-xl md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(201,167,255,0.12),transparent_42%)]" aria-hidden />
        <div className="relative z-10 space-y-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-cyan-100/80">{copy.detachmentReasonLabel} · {profile.detachmentReason}</p>
            <p className="mt-1 min-w-0 break-keep text-sm leading-7 text-white/90 md:text-[15px] md:leading-8">{profile.detachmentReasonText}</p>
          </div>
          <div className="h-px bg-[linear-gradient(90deg,rgba(244,114,182,.08),rgba(201,167,255,.55),rgba(64,200,255,.08))]" aria-hidden />
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--bias-gold)]/80">{copy.detachmentStyleLabel} · {profile.detachmentStyle}</p>
            <p className="mt-1 min-w-0 break-keep text-sm leading-7 text-white/90 md:text-[15px] md:leading-8">{profile.detachmentStyleText}</p>
          </div>
        </div>
      </article>
    </section>
  );
}
