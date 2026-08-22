"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";
import { useDestinyBiasCopy } from "../_lib/copy";

type Props = {
  vm: DestinyBiasResultViewModel;
};

export default function BiasDestinyMzZone({ vm }: Props) {
  const copy = useDestinyBiasCopy();
  const mz = vm.mzLayer;
  if (!mz) return null;

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-pink-100/85">{copy.mzZoneLabel} JUST FOR FUN</p>

      {/* 관계 MBTI + 등급 밈 */}
      <article className="relative overflow-hidden rounded-[24px] border border-white/14 bg-[linear-gradient(140deg,rgba(12,10,50,0.78),rgba(24,10,58,0.6))] p-4 shadow-[0_12px_36px_rgba(2,6,28,0.4),inset_0_1px_2px_rgba(255,255,255,0.06)] backdrop-blur-xl md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(255,95,210,0.16),transparent_42%),radial-gradient(circle_at_84%_80%,rgba(201,167,255,0.14),transparent_40%)]" aria-hidden />
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-cyan-100/80">{copy.mzRelationMbtiLabel}</p>
            <p className="mt-0.5 text-3xl font-black tracking-[0.08em] text-white md:text-4xl">{mz.relationMbti.type}</p>
          </div>
          <span className="ml-auto rounded-full border border-[#FFD98A]/45 bg-[#FFD98A]/12 px-3 py-1.5 text-sm font-black text-[#FFE9B8]">
            {mz.gradeMeme}
          </span>
        </div>
        <p className="relative z-10 mt-2 min-w-0 break-keep text-sm leading-7 text-white/88">{mz.relationMbti.desc}</p>
      </article>

      {/* 전생 서사 */}
      <article className="relative overflow-hidden rounded-[24px] border border-white/14 bg-[linear-gradient(140deg,rgba(8,16,42,0.78),rgba(16,11,50,0.6))] p-4 shadow-[0_12px_36px_rgba(2,6,28,0.4),inset_0_1px_2px_rgba(255,255,255,0.06)] backdrop-blur-xl md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(201,167,255,0.12),transparent_42%)]" aria-hidden />
        <div className="relative z-10 flex items-center gap-2">
          <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-sm">🔮</span>
          <h3 className="min-w-0 break-keep text-base font-black text-white md:text-lg">{mz.pastLife.title}</h3>
        </div>
        <p className="relative z-10 mt-2 min-w-0 break-keep text-sm leading-7 text-white/90">{mz.pastLife.story}</p>
      </article>

      {/* 공유 해시태그 */}
      {mz.hashtags?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {mz.hashtags.map((tag) => (
            <span key={tag} className="max-w-full truncate rounded-full border border-cyan-200/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100/90">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
