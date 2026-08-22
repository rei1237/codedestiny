"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";
import { useDestinyBiasCopy } from "../_lib/copy";
import BiasDestinyAuraBadge from "./BiasDestinyAuraBadge";
import DestinyBiasPhotocard from "./DestinyBiasPhotocard";

type Props = {
  vm: DestinyBiasResultViewModel;
  biasImageUrl?: string;
};

function fallbackText(value: string, empty: string) {
  const text = String(value || "").trim();
  return text || empty;
}

export default function BiasDestinyMainCard({ vm, biasImageUrl }: Props) {
  const copy = useDestinyBiasCopy();
  return (
    <section className="space-y-4">
      <article className="relative overflow-hidden rounded-[30px] border border-gradient-to-br from-white/28 via-white/12 to-white/6 bg-[linear-gradient(138deg,rgba(6,16,48,0.78),rgba(16,10,52,0.58),rgba(24,8,60,0.64))] p-5 shadow-[0_0_60px_rgba(124,58,237,0.28),0_28px_68px_rgba(2,6,28,0.54),inset_0_1px_2px_rgba(255,255,255,0.08)] backdrop-blur-xl md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(244,114,182,0.28),transparent_32%),radial-gradient(circle_at_86%_84%,rgba(96,165,250,0.24),transparent_32%),radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.12),transparent_60%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.04)_25%,rgba(255,255,255,0.04)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.04)_75%,rgba(255,255,255,0.04))]" style={{ backgroundSize: '60px 60px' }} aria-hidden />
        <div className="relative z-10 space-y-3">
          <p className="text-xs font-semibold tracking-[0.15em] text-[#FDE68A]/90">{copy.mainCardLabel}</p>
          <h3 className="truncate text-2xl font-black text-white md:text-3xl">{vm.biasName}</h3>
          <p className="line-clamp-2 break-keep text-sm leading-7 text-white/88 md:text-base">{fallbackText(vm.oneLineDestinyMessage, copy.mainCardFallbackText)}</p>
          <BiasDestinyAuraBadge auraType={vm.auraType} auraMaterial={vm.auraMaterial} energyColor={vm.energyColor} />

          <div className="grid gap-2 md:grid-cols-3">
            <div className="group relative rounded-2xl border border-cyan-200/35 bg-[linear-gradient(135deg,rgba(6,182,212,0.12),rgba(34,211,238,0.08))] p-3 transition hover:border-cyan-200/55 hover:bg-[linear-gradient(135deg,rgba(6,182,212,0.18),rgba(34,211,238,0.12))] shadow-[0_8px_24px_rgba(6,182,212,0.1),inset_0_1px_2px_rgba(255,255,255,0.06)]">
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_20%_50%,rgba(96,165,250,0.1),transparent_50%)]" aria-hidden />
              <p className="relative text-[11px] tracking-[0.14em] text-cyan-100/80">{copy.mainCardChemiSummaryLabel}</p>
              <p className="relative mt-1 line-clamp-2 min-w-0 break-keep text-sm font-semibold leading-6 text-white/92">{fallbackText(vm.chemistrySummary, copy.mainCardFallbackText)}</p>
            </div>
            <div className="group relative rounded-2xl border border-pink-200/35 bg-[linear-gradient(135deg,rgba(244,114,182,0.12),rgba(236,72,153,0.08))] p-3 transition hover:border-pink-200/55 hover:bg-[linear-gradient(135deg,rgba(244,114,182,0.18),rgba(236,72,153,0.12))] shadow-[0_8px_24px_rgba(244,114,182,0.1),inset_0_1px_2px_rgba(255,255,255,0.06)]">
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_80%_50%,rgba(244,114,182,0.1),transparent_50%)]" aria-hidden />
              <p className="relative text-[11px] tracking-[0.14em] text-pink-100/80">{copy.mainCardCheerPointLabel}</p>
              <p className="relative mt-1 line-clamp-2 min-w-0 break-keep text-sm font-semibold leading-6 text-white/92">{fallbackText(vm.cheerPoint, copy.mainCardFallbackText)}</p>
            </div>
            <div className="group relative rounded-2xl border border-purple-200/35 bg-[linear-gradient(135deg,rgba(168,85,247,0.12),rgba(147,51,234,0.08))] p-3 transition hover:border-purple-200/55 hover:bg-[linear-gradient(135deg,rgba(168,85,247,0.18),rgba(147,51,234,0.12))] shadow-[0_8px_24px_rgba(168,85,247,0.1),inset_0_1px_2px_rgba(255,255,255,0.06)]">
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_20%,rgba(168,85,247,0.1),transparent_50%)]" aria-hidden />
              <p className="relative text-[11px] tracking-[0.14em] text-purple-100/80">{copy.mainCardRelationLabel}</p>
              <p className="relative mt-1 line-clamp-2 min-w-0 break-keep text-sm font-semibold leading-6 text-white/92">{fallbackText(vm.biasPersonalityReport, copy.mainCardFallbackText)}</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[#FDE68A]/45 bg-[linear-gradient(135deg,rgba(253,230,138,0.16),rgba(251,191,36,0.12))] p-3 shadow-[0_12px_32px_rgba(253,230,138,0.15),inset_0_1px_2px_rgba(255,255,255,0.1)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(255,255,255,0.08),transparent_45%)]" aria-hidden />
            <p className="relative text-[11px] tracking-[0.14em] text-[#FDE68A]/95 font-semibold">{copy.mainCardAdviceLabel}</p>
            <p className="relative mt-1 line-clamp-2 min-w-0 break-keep text-sm leading-7 text-white/92">{fallbackText(vm.todayMission, copy.mainCardFallbackText)}</p>
          </div>
        </div>
      </article>

      <div className="rounded-[30px] border border-white/12 bg-black/15 p-2 md:p-3">
        <DestinyBiasPhotocard vm={vm} biasImageUrl={biasImageUrl} />
      </div>
    </section>
  );
}
