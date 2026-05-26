"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";

type Props = {
  vm: DestinyBiasResultViewModel;
};

function safe(value: string, fallback: string) {
  const text = String(value || "").trim();
  return text || fallback;
}

export default function BiasDestinyStageSummary({ vm }: Props) {
  const blocks = [
    {
      title: "나의 사주 에너지",
      body: safe(vm.userEnergyType, "지금은 감정과 집중력을 함께 끌어올리는 균형형 에너지 흐름이 강합니다."),
    },
    {
      title: "최애에게 끌리는 이유",
      body: safe(vm.biasEnergySummary, "낯익은 안정감과 새로운 자극이 동시에 느껴질 때 몰입이 깊어집니다."),
    },
    {
      title: "반복되는 감정 패턴",
      body: safe(vm.energyConnectionDetail, "가까워질수록 기대치가 빠르게 올라가며 감정의 파고가 커지는 경향이 있습니다."),
    },
    {
      title: "나를 안정시키는 최애 타입",
      body: safe(vm.relationMood, "균형감 있는 응원형 에너지와 현실 감각을 함께 주는 타입"),
    },
    {
      title: "나를 흔드는 최애 타입",
      body: safe(vm.biasMood, "강렬한 카리스마에만 집중하면 회복 리듬이 무너질 수 있는 타입"),
    },
  ];

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-pink-100/85">DESTINY STAGE SUMMARY</p>
      <article className="relative overflow-hidden rounded-[28px] border border-gradient-to-br from-white/24 via-white/10 to-white/4 bg-[linear-gradient(140deg,rgba(6,14,36,0.8),rgba(14,10,48,0.62),rgba(20,8,52,0.56))] p-4 shadow-[0_0_50px_rgba(124,58,237,0.2),0_20px_50px_rgba(2,6,28,0.48),inset_0_1px_2px_rgba(255,255,255,0.08)] backdrop-blur-xl md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(244,114,182,0.1),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(96,165,250,0.08),transparent_35%)]" aria-hidden />
        <h3 className="relative z-10 text-xl font-black text-white">운명 스테이지 요약</h3>
        <div className="relative z-10 mt-4 grid gap-2 md:grid-cols-2">
          {blocks.map((item, idx) => (
            <div key={item.title} className={`group relative overflow-hidden rounded-2xl border p-3 transition ${
              idx % 2 === 0
                ? 'border-cyan-200/40 bg-[linear-gradient(135deg,rgba(6,182,212,0.1),rgba(34,211,238,0.06))] shadow-[0_8px_24px_rgba(6,182,212,0.1),inset_0_1px_2px_rgba(255,255,255,0.06)] hover:border-cyan-200/55 hover:shadow-[0_12px_32px_rgba(6,182,212,0.15),inset_0_1px_2px_rgba(255,255,255,0.08)]'
                : 'border-purple-200/40 bg-[linear-gradient(135deg,rgba(168,85,247,0.1),rgba(139,92,246,0.06))] shadow-[0_8px_24px_rgba(168,85,247,0.1),inset_0_1px_2px_rgba(255,255,255,0.06)] hover:border-purple-200/55 hover:shadow-[0_12px_32px_rgba(168,85,247,0.15),inset_0_1px_2px_rgba(255,255,255,0.08)]'
            }`}>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(255,255,255,0.06),transparent_50%)]" aria-hidden />
              <p className="relative text-xs font-semibold tracking-[0.12em] text-cyan-100/80">{item.title}</p>
              <p className="relative mt-1 text-sm leading-7 text-white/88">{item.body}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
