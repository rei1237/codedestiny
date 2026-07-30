"use client";

export type LoadingMotionPhase = "fresh" | "warming" | "slow";
export type LoadingMotionTone = "payment" | "pass" | "result";
type LoadingMotionStepLabels = readonly [string, string, string];

type LoadingProgressMotionProps = {
  phase: LoadingMotionPhase;
  tone?: LoadingMotionTone;
  labels?: LoadingMotionStepLabels;
  label?: string;
  /**
   * 실제 진행 단계(0~2). 주면 이 값이 표시 단계를 결정하고 phase 는 지연 안내 문구에만 쓰인다.
   * 주지 않으면 기존대로 phase(경과 시간)로 단계를 유도한다 — 기존 호출부 회귀 방지용 기본값.
   */
  step?: number;
};

const TONE_STYLES: Record<
  LoadingMotionTone,
  {
    chipActive: string;
    chipIdle: string;
    numberActive: string;
    numberIdle: string;
    rail: string;
  }
> = {
  payment: {
    chipActive: "border-cyan-200/30 bg-cyan-200/14 text-cyan-50 shadow-[0_0_0_1px_rgba(125,211,252,.08)]",
    chipIdle: "border-white/10 bg-white/5 text-slate-400",
    numberActive: "border-white/20 bg-white/15 text-white",
    numberIdle: "border-white/10 bg-transparent text-slate-400",
    rail: "bg-gradient-to-r from-cyan-200 via-amber-200 to-fuchsia-200",
  },
  pass: {
    chipActive: "border-cyan-200/30 bg-cyan-200/14 text-cyan-50 shadow-[0_0_0_1px_rgba(125,211,252,.08)]",
    chipIdle: "border-white/10 bg-white/5 text-slate-400",
    numberActive: "border-white/20 bg-white/15 text-white",
    numberIdle: "border-white/10 bg-transparent text-slate-400",
    rail: "bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200",
  },
  result: {
    chipActive: "border-emerald-200/30 bg-emerald-200/14 text-emerald-50 shadow-[0_0_0_1px_rgba(110,231,183,.08)]",
    chipIdle: "border-white/10 bg-white/5 text-slate-400",
    numberActive: "border-white/20 bg-white/15 text-white",
    numberIdle: "border-white/10 bg-transparent text-slate-400",
    rail: "bg-gradient-to-r from-emerald-200 via-amber-100 to-cyan-200",
  },
};

const FALLBACK_STEP_LABELS: LoadingMotionStepLabels = ["01", "02", "03"];

export default function LoadingProgressMotion({
  phase,
  tone = "payment",
  labels = FALLBACK_STEP_LABELS,
  label = "loading progress",
  step,
}: LoadingProgressMotionProps) {
  // 🔴 시간이 지난다고 단계가 올라가면 안 된다. step 을 준 호출부는 실제 상태로만 단계를 움직인다.
  const activeStep = Number.isFinite(step)
    ? Math.min(2, Math.max(0, Math.floor(step as number)))
    : (phase === "slow" ? 2 : phase === "warming" ? 1 : 0);
  const styles = TONE_STYLES[tone];
  const progressWidth = activeStep === 2 ? "100%" : activeStep === 1 ? "68%" : "38%";
  const sweepLeft = activeStep === 2 ? "74%" : activeStep === 1 ? "40%" : "8%";
  const activeLabel = labels[activeStep];

  return (
    <div
      className="pointer-events-none mt-5 grid gap-3"
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={3}
      aria-valuenow={activeStep + 1}
      aria-valuetext={activeLabel}
    >
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {labels.map((stepLabel, index) => {
          const isActive = index <= activeStep;
          const isCurrent = index === activeStep;
          return (
            <div
              key={`${stepLabel}-${index}`}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 py-2 text-[10px] font-black leading-none transition-colors duration-300 sm:px-3 ${isActive ? styles.chipActive : styles.chipIdle}`}
            >
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px] leading-none ${isActive ? styles.numberActive : styles.numberIdle} ${isCurrent ? "motion-safe:animate-pulse motion-reduce:animate-none" : ""}`}
              >
                {index + 1}
              </span>
              <span className="truncate">{stepLabel}</span>
            </div>
          );
        })}
      </div>

      <div className="relative h-2.5 overflow-hidden rounded-full bg-white/10">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${styles.rail} opacity-90 transition-[width] duration-500 ease-out`}
          style={{ width: progressWidth }}
        />
        <span
          className="absolute inset-y-0 w-1/5 rounded-full bg-white/55 blur-[2px] transition-[left] duration-500 ease-out motion-safe:animate-pulse motion-reduce:animate-none"
          style={{ left: sweepLeft }}
        />
      </div>

      <p className="m-0 text-center text-[11px] font-extrabold text-white/70">{activeLabel}</p>
    </div>
  );
}
