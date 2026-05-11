"use client";

import { useMemo, useState } from "react";
import type { DestinyBiasResultViewModel } from "../lib/types";
import styles from "../destiny-bias.module.css";

type SectionItem = {
  key: string;
  icon: string;
  title: string;
  body: string;
};

export default function DestinyBiasReportTabs({
  vm,
}: {
  vm: DestinyBiasResultViewModel;
}) {
  const sections = useMemo<SectionItem[]>(() => {
    return [
      {
        key: "synergy",
        icon: "✨",
        title: "오행 시너지",
        body: `${vm.synergy.title}\n${vm.synergy.description}`,
      },
      {
        key: "yongshin",
        icon: "💎",
        title: "용신 매칭",
        body: `${vm.yongshinMatch.title}\n${vm.yongshinMatch.description}`,
      },
      {
        key: "position",
        icon: "🪄",
        title: "팬덤 포지션",
        body: `${vm.userEnergy.fandomPosition}\n${vm.userEnergy.description}`,
      },
      {
        key: "action",
        icon: "🎤",
        title: "오늘의 덕질 액션",
        body: vm.todayAction.actions.join("\n"),
      },
      {
        key: "warning",
        icon: "🌙",
        title: "과몰입 방지",
        body: vm.todayAction.warning,
      },
      {
        key: "sats",
        icon: "🫧",
        title: "10초 SATS 응원 명상",
        body: vm.sats.script,
      },
    ];
  }, [vm]);

  const [activeKey, setActiveKey] = useState(sections[0]?.key || "synergy");
  const active = sections.find((item) => item.key === activeKey) || sections[0];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="최애운명 리포트 탭">
        {sections.map((item) => {
          const selected = item.key === active.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveKey(item.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selected
                  ? "border-fuchsia-200/80 bg-fuchsia-400/30 text-white"
                  : "border-white/20 bg-white/5 text-white/75 hover:border-white/35"
              }`}
            >
              {item.icon} {item.title}
            </button>
          );
        })}
      </div>

      <article className={`rounded-3xl p-5 ${styles.glass}`} role="tabpanel">
        <h3 className="text-base font-bold text-white">
          {active.icon} {active.title}
        </h3>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/90">{active.body}</p>
      </article>
    </section>
  );
}
