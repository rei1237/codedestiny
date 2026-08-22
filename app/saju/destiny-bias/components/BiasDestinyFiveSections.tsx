"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";
import { useDestinyBiasCopy } from "../_lib/copy";

type Props = {
  vm: DestinyBiasResultViewModel;
};

const SECTION_ICON: Record<string, string> = {
  chemi: "💫",
  element: "🌿",
  dayMaster: "✨",
  branch: "🤝",
  booster: "🎁",
};

export default function BiasDestinyFiveSections({ vm }: Props) {
  const copy = useDestinyBiasCopy();
  const tabs = Array.isArray(vm.detailedTabs) ? vm.detailedTabs : [];
  // ①(chemi)은 상단 게이지에 노출되므로 카드에서는 제외, ②③④⑤ 표시
  const hasBranchInteraction =
    (vm.sajuSignals?.harmonySignals?.length || 0) > 0 || (vm.sajuSignals?.conflictSignals?.length || 0) > 0;
  const cards = tabs.filter((tab) => {
    if (tab.id === "chemi") return false;
    if (tab.id === "branch" && !hasBranchInteraction) return false; // ④ 해당 없으면 숨김
    return true;
  });

  if (!cards.length) return null;

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-pink-100/85">{copy.fiveSectionsLabel} SAJU READING</p>
      <div className="space-y-3">
        {cards.map((tab) => {
          const section = tab.sections?.[0];
          if (!section) return null;
          const icon = SECTION_ICON[tab.id] || "🔮";
          return (
            <article
              key={tab.id}
              className="relative overflow-hidden rounded-[24px] border border-white/14 bg-[linear-gradient(140deg,rgba(8,16,42,0.78),rgba(16,11,50,0.6))] p-4 shadow-[0_12px_36px_rgba(2,6,28,0.4),inset_0_1px_2px_rgba(255,255,255,0.06)] backdrop-blur-xl md:p-5"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(201,167,255,0.12),transparent_42%),radial-gradient(circle_at_86%_80%,rgba(64,200,255,0.1),transparent_40%)]" aria-hidden />
              <div className="relative z-10 flex items-center gap-2">
                <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-sm">{icon}</span>
                <h3 className="min-w-0 break-keep text-base font-black text-white md:text-lg">{tab.title}</h3>
              </div>
              <div className="relative z-10 my-3 h-px bg-[linear-gradient(90deg,rgba(244,114,182,.08),rgba(201,167,255,.55),rgba(64,200,255,.08))]" aria-hidden />
              <p className="relative z-10 min-w-0 break-keep text-sm leading-7 text-white/90 md:text-[15px] md:leading-8">{section.text}</p>

              {section.action ? (
                <div className="relative z-10 mt-3 overflow-hidden rounded-2xl border border-[#FDE68A]/40 bg-[linear-gradient(135deg,rgba(253,230,138,0.13),rgba(251,191,36,0.09))] p-3">
                  <p className="relative text-[11px] font-semibold tracking-[0.14em] text-[#FDE68A]/95">{copy.fiveSectionsTipLabel}</p>
                  <p className="relative mt-1 min-w-0 break-keep text-sm leading-7 text-white/90">{section.action}</p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
