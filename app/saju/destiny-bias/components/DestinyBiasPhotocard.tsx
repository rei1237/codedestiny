"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { DestinyBiasResultViewModel } from "../lib/types";
import DestinyIcon from "@/app/components/icons/DestinyIcon";

export default function DestinyBiasPhotocard({
  vm,
}: {
  vm: DestinyBiasResultViewModel;
}) {
  const reduceMotion = useReducedMotion();
  const relationHeadline = `${vm.userName} x ${vm.biasName}`;
  const relationSignal = `${vm.userEnergyType} ↔ ${vm.biasEnergyType}`;
  const oneLine = String(vm.chemistrySummary || vm.oneLineDestinyMessage || "").replace(/\s+/g, " ").trim();

  return (
    <motion.div
      id="destiny-bias-card-preview"
      className="relative isolate mx-auto w-full max-w-[360px]"
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.95, y: reduceMotion ? 0 : 16 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
      whileHover={reduceMotion ? undefined : { scale: 1.02, y: -4 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="overflow-hidden rounded-[30px] border border-cyan-200/35 bg-[linear-gradient(155deg,rgba(5,13,35,0.95)_0%,rgba(20,13,56,0.9)_38%,rgba(11,34,66,0.9)_100%)] shadow-[0_28px_80px_rgba(2,6,23,0.65)]">
        <div className="relative aspect-[9/16] p-4 md:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(251,113,229,0.3),transparent_38%),radial-gradient(circle_at_84%_20%,rgba(96,165,250,0.24),transparent_38%),radial-gradient(circle_at_50%_92%,rgba(34,211,238,0.2),transparent_40%)]" aria-hidden />
          <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden>
            <div className="absolute left-8 top-8 h-1 w-1 rounded-full bg-white/70" />
            <div className="absolute right-12 top-16 h-1.5 w-1.5 rounded-full bg-cyan-200/70" />
            <div className="absolute left-16 top-36 h-1 w-1 rounded-full bg-pink-200/70" />
            <div className="absolute right-20 top-52 h-1 w-1 rounded-full bg-white/60" />
            <div className="absolute left-10 bottom-36 h-1.5 w-1.5 rounded-full bg-cyan-100/75" />
            <div className="absolute right-10 bottom-28 h-1 w-1 rounded-full bg-pink-100/75" />
          </div>

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-start justify-between">
              <span className="rounded-full border border-pink-200/50 bg-pink-300/15 px-3 py-1 text-[10px] font-bold tracking-[0.12em] text-pink-100">FAN x BIAS LINK</span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-200/45 bg-cyan-300/10">
                <DestinyIcon name="star" size={14} className="text-cyan-100" variant="glow" />
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-cyan-100/80">ENERGY RELATION</p>
                <h3 className="mt-1 text-2xl font-black leading-tight text-white">{vm.biasName}</h3>
                <p className="mt-1 text-xs text-white/75">{vm.relationMood} 공명 모드</p>
              </div>
              <div className="grid h-16 w-16 place-items-center rounded-full border border-cyan-100/60 bg-[radial-gradient(circle,rgba(56,189,248,0.45)_0%,rgba(22,78,99,0.15)_72%,transparent_100%)] shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                <span className="text-lg font-black text-white">{vm.totalScore}%</span>
              </div>
            </div>

            <div className="relative mt-5 flex-1 overflow-hidden rounded-[24px] border border-white/20 bg-[linear-gradient(160deg,rgba(7,22,45,0.74)_0%,rgba(25,19,63,0.62)_50%,rgba(8,30,55,0.72)_100%)] p-4">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_38%,rgba(191,219,254,0.56),transparent_30%),radial-gradient(circle_at_72%_66%,rgba(34,211,238,0.32),transparent_28%)]" aria-hidden />
              <div className="pointer-events-none absolute left-1/2 top-[48%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/35" aria-hidden />
              <div className="pointer-events-none absolute left-1/2 top-[48%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-pink-100/30" aria-hidden />

              <div className="relative z-10 space-y-3">
                <p className="text-xs font-semibold tracking-[0.04em] text-white/90">{relationHeadline}</p>
                <p className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm font-semibold text-cyan-50">{relationSignal}</p>
                <div className="rounded-xl border border-pink-100/20 bg-pink-300/10 px-3 py-2">
                  <p className="text-[10px] font-semibold tracking-[0.15em] text-pink-100/85">ONE LINE LINK</p>
                  <p className="mt-1 text-sm leading-6 text-white/92">{oneLine}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/70">
              <span>{vm.destinyId}</span>
              <span>{vm.issuedAt}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-white/60">
        포토카드는 팬-최애 에너지 관계 요약 중심으로 저장됩니다.
      </p>

      <div
        className="pointer-events-none absolute -bottom-9 left-1/2 h-20 w-4/5 -translate-x-1/2 rounded-full bg-fuchsia-400/25 blur-3xl"
        aria-hidden
      />
    </motion.div>
  );
}
