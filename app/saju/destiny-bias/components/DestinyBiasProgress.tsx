"use client";

const STEP_LABELS = ["01\n입장", "02\n운명", "03\n세팅", "04\n동기화", "05\n카드"] as const;

export default function DestinyBiasProgress({ current }: { current: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={5}
      aria-label="진행 단계"
      className="rounded-2xl border border-white/15 bg-[linear-gradient(140deg,rgba(10,18,44,0.72),rgba(26,22,70,0.54))] p-3 shadow-[0_14px_36px_rgba(2,6,23,0.35)]"
    >
      <div className="grid grid-cols-5 gap-2">
        {STEP_LABELS.map((label, index) => {
          const step = index + 1;
          const active = current === step;
          const done = current > step;
          return (
            <div key={label} className="text-center">
              <div
                className={`mx-auto grid h-9 w-9 place-items-center rounded-full border text-[11px] font-black transition ${
                  active
                    ? "border-pink-200/80 bg-pink-300/20 text-pink-50 shadow-[0_0_18px_rgba(251,113,229,0.45)]"
                    : done
                    ? "border-cyan-200/70 bg-cyan-300/15 text-cyan-50"
                    : "border-white/20 bg-white/5 text-white/65"
                }`}
              >
                {String(step).padStart(2, "0")}
              </div>
              <p className={`mt-1 text-[10px] font-semibold tracking-[0.1em] ${active ? "text-pink-100" : done ? "text-cyan-100/90" : "text-white/55"}`}>
                {label.replace("\n", " ")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
