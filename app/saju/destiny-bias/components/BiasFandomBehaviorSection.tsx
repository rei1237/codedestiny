"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";

type Props = {
  vm: DestinyBiasResultViewModel;
};

export default function BiasFandomBehaviorSection({ vm }: Props) {
  const profile = vm.fandomProfile;
  if (!profile) return null;

  const cards = [
    { icon: "🔍", label: "덕질 방식", type: profile.deepDivePattern, text: profile.deepDiveText },
    { icon: "🤝", label: "관계성 유형", type: profile.relationshipLens, text: profile.relationshipText },
    { icon: "🔥", label: "과몰입 포인트", type: profile.obsessionPoint, text: profile.obsessionText },
  ];

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-pink-100/85">어떻게 깊어지는가 HOW YOU DEEPEN</p>
      <div className="space-y-3">
        {cards.map((card) => (
          <article
            key={card.label}
            className="relative overflow-hidden rounded-[24px] border border-white/14 bg-[linear-gradient(140deg,rgba(8,16,42,0.78),rgba(16,11,50,0.6))] p-4 shadow-[0_12px_36px_rgba(2,6,28,0.4),inset_0_1px_2px_rgba(255,255,255,0.06)] backdrop-blur-xl md:p-5"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(201,167,255,0.12),transparent_42%),radial-gradient(circle_at_86%_80%,rgba(64,200,255,0.1),transparent_40%)]" aria-hidden />
            <div className="relative z-10 flex items-center gap-2">
              <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-sm">{card.icon}</span>
              <h3 className="min-w-0 break-keep text-base font-black text-white md:text-lg">{card.label} · {card.type}</h3>
            </div>
            <p className="relative z-10 mt-3 min-w-0 break-keep text-sm leading-7 text-white/90 md:text-[15px] md:leading-8">{card.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
