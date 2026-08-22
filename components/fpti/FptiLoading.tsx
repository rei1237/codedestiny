"use client";

import { m, useReducedMotion } from "framer-motion";
import { useFptiSharedCopy } from "./_lib/copy";

type Props = {
  step: string;
  stepIndex?: number;
};

const ELEMENT_STYLES = [
  { label: "木", border: "border-emerald-500/30", text: "text-emerald-300", bg: "bg-emerald-500/10", glow: "shadow-[0_0_12px_rgba(16,185,129,0.4)]" },
  { label: "火", border: "border-rose-500/30", text: "text-rose-300", bg: "bg-rose-500/10", glow: "shadow-[0_0_12px_rgba(244,63,94,0.4)]" },
  { label: "土", border: "border-amber-500/30", text: "text-amber-300", bg: "bg-amber-500/10", glow: "shadow-[0_0_12px_rgba(245,158,11,0.4)]" },
  { label: "金", border: "border-slate-300/30", text: "text-slate-200", bg: "bg-slate-300/10", glow: "shadow-[0_0_12px_rgba(203,213,225,0.4)]" },
  { label: "水", border: "border-sky-500/30", text: "text-sky-300", bg: "bg-sky-500/10", glow: "shadow-[0_0_12px_rgba(14,165,233,0.4)]" },
];

export default function FptiLoading({ step, stepIndex = 0 }: Props) {
  const copy = useFptiSharedCopy();
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/20 bg-[linear-gradient(145deg,rgba(5,18,36,0.95),rgba(16,33,54,0.92))] p-7 text-center shadow-[0_20px_60px_rgba(3,9,26,0.58)]">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_18%_24%,rgba(56,189,248,0.3),transparent_42%),radial-gradient(circle_at_82%_76%,rgba(245,158,11,0.22),transparent_46%)]" />

      <div className="relative mx-auto h-28 w-28">
        {/* Outer Orbit */}
        <m.div
          className="absolute inset-0 rounded-full border border-dashed border-sky-400/30"
          animate={reducedMotion ? { rotate: 0 } : { rotate: 360 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 12, repeat: Infinity, ease: "linear" }}
        />
        {/* Inner element loop orbits */}
        <m.div
          className="absolute inset-4 rounded-full border border-rose-400/20"
          animate={reducedMotion ? { rotate: 0 } : { rotate: -360 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 8, repeat: Infinity, ease: "linear" }}
        />
        {/* Central Cosmos Orb - Gradients reflecting the elements */}
        <m.div
          className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,#3b82f6_35%,#10b981_65%,#f43f5e_100%)] shadow-[0_0_20px_rgba(59,130,246,0.6)]"
          animate={reducedMotion ? { scale: 1 } : { scale: [1, 1.15, 1], rotate: 360 }}
          transition={reducedMotion ? { duration: 0 } : { scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 10, repeat: Infinity, ease: "linear" } }}
        />
      </div>

      <h3 className="relative mt-5 text-xl font-semibold text-slate-100">{copy.loadingHeadline}</h3>
      <p className="relative mt-2 text-sm text-slate-300">{step}</p>

      {/* 오행 컬러가 세련되게 스캔되는 이펙트 */}
      <div className="relative mx-auto mt-6 flex max-w-sm items-center justify-center gap-2.5 text-sm">
        {ELEMENT_STYLES.map((item, idx) => {
          const isActive = idx === stepIndex % 5;
          return (
            <m.span
              key={item.label}
              animate={
                reducedMotion
                  ? { opacity: isActive ? 1 : 0.6, scale: isActive ? 1.05 : 0.95 }
                  : { 
                      y: isActive ? [0, -6, 0] : 0, 
                      opacity: isActive ? [0.8, 1, 0.8] : 0.5,
                      scale: isActive ? 1.1 : 0.95
                    }
              }
              transition={reducedMotion ? { duration: 0 } : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className={`rounded-full border px-3 py-1.5 font-medium transition-all duration-300 ${item.border} ${item.text} ${item.bg} ${isActive ? `${item.glow} border-white/45` : ""}`}
            >
              {item.label}
            </m.span>
          );
        })}
      </div>

      {/* 오행 컬러 그라데이션이 빛나는 로딩 바 */}
      <div className="relative mx-auto mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10 border border-white/5">
        <m.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-rose-400 via-amber-400 via-slate-200 to-sky-400 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
          initial={{ width: "8%" }}
          animate={{ width: reducedMotion ? "80%" : "96%" }}
          transition={{ duration: reducedMotion ? 0.2 : 2.8, ease: "easeInOut" }}
        />
      </div>
    </section>
  );
}
