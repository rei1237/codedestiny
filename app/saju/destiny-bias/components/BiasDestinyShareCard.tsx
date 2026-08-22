"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";
import { useDestinyBiasCopy } from "../_lib/copy";

type Props = {
  vm: DestinyBiasResultViewModel;
};

function joinKeywords(list: string[], fallback: string[]) {
  const arr = Array.isArray(list) ? list.filter(Boolean) : [];
  const source = arr.length ? arr : fallback;
  return source.slice(0, 3);
}

export default function BiasDestinyShareCard({ vm }: Props) {
  const copy = useDestinyBiasCopy();
  const keywords = joinKeywords(vm.stageChemistryKeywords, copy.defaultShareKeywords ?? ["starlight", "resonance", "chemistry"]);

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-cyan-100/85">SHARE VISUAL CARD</p>
      <article className="relative overflow-hidden rounded-[28px] border border-gradient-to-br from-white/32 via-white/16 to-white/6 bg-[linear-gradient(138deg,rgba(124,58,237,0.26),rgba(244,114,182,0.24),rgba(96,165,250,0.2))] p-4 shadow-[0_0_60px_rgba(124,58,237,0.22),0_24px_60px_rgba(244,114,182,0.16),inset_0_1px_2px_rgba(255,255,255,0.1)] backdrop-blur-xl md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(255,255,255,0.3),transparent_32%),radial-gradient(circle_at_90%_88%,rgba(255,255,255,0.22),transparent_36%),radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.08),transparent_55%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(45deg,transparent_30%,rgba(255,255,255,0.03)_30%,rgba(255,255,255,0.03)_60%,transparent_60%)]" style={{ backgroundSize: '60px 60px' }} aria-hidden />
        <div className="relative z-10 rounded-2xl border border-gradient-to-br from-white/28 via-white/12 to-white/4 bg-[linear-gradient(135deg,rgba(16,8,48,0.8),rgba(20,12,56,0.68))] p-4 shadow-[0_12px_40px_rgba(124,58,237,0.2),inset_0_1px_2px_rgba(255,255,255,0.08)]">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#FDE68A]">{copy.shareCardMyDestinyLabel}</p>
          <h3 className="mt-1 text-2xl font-black text-white">{vm.biasName}</h3>
          <p className="mt-2 text-sm leading-7 text-white/90">{vm.oneLineDestinyMessage}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {keywords.map((keyword) => (
              <span key={keyword} className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-2 py-0.5 text-xs font-semibold text-cyan-100/90">
                #{keyword}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-pink-100">{copy.auraLabel}: {vm.auraType} · {vm.auraMaterial}</p>
          <p className="mt-4 text-right text-xs font-semibold tracking-[0.14em] text-white/80">Code:Destiny</p>
        </div>
      </article>
    </section>
  );
}
