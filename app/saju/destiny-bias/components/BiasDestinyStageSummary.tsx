"use client";

import type { DestinyBiasResultViewModel } from "../lib/types";

type Props = {
  vm: DestinyBiasResultViewModel;
};

function safe(value: string, fallback: string) {
  const text = String(value || "").trim();
  return text || fallback;
}

function compact(value: string, limit = 190) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}...`;
}

export default function BiasDestinyStageSummary({ vm }: Props) {
  const scoreCards = [
    { id: "emotion", label: "감정선", value: vm.emotionalScore },
    { id: "fan", label: "팬심", value: vm.fandomScore },
    { id: "long", label: "장기", value: vm.longTermScore },
    { id: "support", label: "안정", value: vm.supportStyleScore },
  ];

  const blocks = [
    {
      title: "핵심 케미 축",
      body: `${safe(vm.userEnergyType, "균형형")} x ${safe(vm.biasEnergyType, "집중형")}`,
      detail: compact(
        safe(
          vm.compatibilityReport,
          "두 사람은 강한 한방보다 리듬을 맞출수록 몰입이 커지는 구조로 보입니다."
        ),
        220
      ),
    },
    {
      title: "끌림이 커지는 이유",
      body: safe(vm.biasEnergySummary, "낯익은 안정감과 새로운 자극이 동시에 느껴질 때 몰입이 깊어집니다."),
      detail: compact(
        safe(
          vm.biasPersonalityReport,
          "표현 방식이 다르더라도 결이 맞으면 감정 소모 없이 오래 집중되는 조합입니다."
        ),
        220
      ),
    },
    {
      title: "반복되는 감정 패턴",
      body: safe(vm.energyConnectionDetail, "가까워질수록 기대치가 빠르게 올라가며 감정의 파고가 커지는 경향이 있습니다."),
      detail: compact(
        safe(
          vm.destinySignal,
          "기대가 과열될 때는 해석보다 속도 조절이 먼저 필요합니다."
        ),
        200
      ),
    },
    {
      title: "나를 안정시키는 최애 타입",
      body: safe(vm.relationMood, "균형감 있는 응원형 에너지와 현실 감각을 함께 주는 타입"),
      detail: compact(
        safe(
          vm.compatibilityDetail,
          "장기 응원은 큰 이벤트보다 작은 루틴을 일정하게 유지할 때 만족도가 높아집니다."
        ),
        200
      ),
    },
    {
      title: "나를 흔드는 최애 타입",
      body: safe(vm.biasMood, "강렬한 카리스마에만 집중하면 회복 리듬이 무너질 수 있는 타입"),
      detail: compact(
        safe(
          vm.fansignMessage,
          "과몰입 신호가 올라오면 즉각 반응보다 하루 루틴 점검이 먼저입니다."
        ),
        180
      ),
    },
    {
      title: "오늘의 실행 포인트",
      body: safe(vm.todayMission, "좋아하는 감정은 유지하고, 소모되는 반응만 줄이는 행동 하나를 실천해 보세요."),
      detail: compact(
        safe(
          vm.cheerPoint,
          "짧고 선명한 응원 루틴을 만들면 감정 기복이 줄고 덕심 만족도가 올라갑니다."
        ),
        180
      ),
    },
  ];

  return (
    <section className="space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-pink-100/85">DESTINY STAGE SUMMARY</p>
      <article className="relative overflow-hidden rounded-[28px] border border-gradient-to-br from-white/24 via-white/10 to-white/4 bg-[linear-gradient(140deg,rgba(6,14,36,0.8),rgba(14,10,48,0.62),rgba(20,8,52,0.56))] p-4 shadow-[0_0_50px_rgba(124,58,237,0.2),0_20px_50px_rgba(2,6,28,0.48),inset_0_1px_2px_rgba(255,255,255,0.08)] backdrop-blur-xl md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(244,114,182,0.1),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(96,165,250,0.08),transparent_35%)]" aria-hidden />
        <h3 className="relative z-10 text-xl font-black text-white">운명 스테이지 요약</h3>

        <div className="relative z-10 mt-3 rounded-2xl border border-white/20 bg-white/[0.04] p-3">
          <p className="text-[11px] font-semibold tracking-[0.13em] text-cyan-100/85">SCORE SNAPSHOT</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {scoreCards.map((item) => (
              <div
                key={item.id}
                className="min-w-[96px] shrink-0 rounded-xl border border-cyan-200/35 bg-cyan-300/10 px-3 py-2"
              >
                <p className="text-[11px] font-semibold text-cyan-100/85">{item.label}</p>
                <p className="mt-0.5 text-lg font-black leading-none text-white">{Math.max(0, Math.min(100, Number(item.value || 0)))}점</p>
              </div>
            ))}
            <div className="min-w-[96px] shrink-0 rounded-xl border border-pink-200/35 bg-pink-300/10 px-3 py-2">
              <p className="text-[11px] font-semibold text-pink-100/85">종합</p>
              <p className="mt-0.5 text-lg font-black leading-none text-white">{Math.max(0, Math.min(100, Number(vm.totalScore || 0)))}점</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-4 grid gap-2 md:grid-cols-2">
          {blocks.map((item, idx) => (
            <div key={item.title} className={`group relative overflow-hidden rounded-2xl border p-3 transition ${
              idx % 2 === 0
                ? 'border-cyan-200/40 bg-[linear-gradient(135deg,rgba(6,182,212,0.1),rgba(34,211,238,0.06))] shadow-[0_8px_24px_rgba(6,182,212,0.1),inset_0_1px_2px_rgba(255,255,255,0.06)] hover:border-cyan-200/55 hover:shadow-[0_12px_32px_rgba(6,182,212,0.15),inset_0_1px_2px_rgba(255,255,255,0.08)]'
                : 'border-purple-200/40 bg-[linear-gradient(135deg,rgba(168,85,247,0.1),rgba(139,92,246,0.06))] shadow-[0_8px_24px_rgba(168,85,247,0.1),inset_0_1px_2px_rgba(255,255,255,0.06)] hover:border-purple-200/55 hover:shadow-[0_12px_32px_rgba(168,85,247,0.15),inset_0_1px_2px_rgba(255,255,255,0.08)]'
            }`}>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(255,255,255,0.06),transparent_50%)]" aria-hidden />
              <p className="relative text-xs font-semibold tracking-[0.12em] text-cyan-100/80">{item.title}</p>
              <p className="relative mt-1 min-w-0 break-keep text-sm font-semibold leading-6 text-white/93">{item.body}</p>
              <p className="relative mt-1 min-w-0 break-keep text-sm leading-6 text-white/82">{item.detail}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
