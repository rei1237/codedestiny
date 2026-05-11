"use client";

const STEP_LABELS = ["01 내 에너지", "02 최애 프로필", "03 카드 테마", "04 운명 분석", "05 포토카드"] as const;

export default function DestinyBiasProgress({
  current,
}: {
  current: number;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/25 px-3 py-3 backdrop-blur-xl md:px-4">
      <ol className="hidden grid-cols-5 gap-2 md:grid">
        {STEP_LABELS.map((label, index) => {
          const step = index + 1;
          const active = current === step;
          const done = current > step;
          return (
            <li key={label} className="min-w-0">
              <div
                className={`rounded-full border px-3 py-2 text-center text-xs font-bold tracking-[0.04em] transition ${
                  active
                    ? "border-fuchsia-200/80 bg-fuchsia-400/30 text-white"
                    : done
                      ? "border-cyan-200/70 bg-cyan-300/20 text-cyan-50"
                      : "border-white/20 bg-white/5 text-white/65"
                }`}
              >
                {label}
              </div>
            </li>
          );
        })}
      </ol>

      <ol className="flex gap-2 overflow-x-auto whitespace-nowrap md:hidden" aria-label="진행 상태">
        {STEP_LABELS.map((label, index) => {
          const step = index + 1;
          const active = current === step;
          const done = current > step;
          return (
            <li key={label}>
              <span
                className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                  active
                    ? "border-fuchsia-200/80 bg-fuchsia-400/30 text-white"
                    : done
                      ? "border-cyan-200/70 bg-cyan-300/20 text-cyan-50"
                      : "border-white/20 bg-white/5 text-white/65"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
