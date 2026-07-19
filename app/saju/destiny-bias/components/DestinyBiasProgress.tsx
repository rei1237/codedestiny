"use client";

const STEP_LABELS = ["01\n입장", "02\n연결", "03\n테마", "04\n분석중", "05\n완성!"] as const;

export default function DestinyBiasProgress({ current }: { current: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={5}
      aria-label="진행 단계"
      className="rounded-2xl border border-white/15 bg-[linear-gradient(140deg,rgba(7,4,22,0.74),rgba(26,11,63,0.54))] p-3 shadow-[0_0_30px_rgba(109,59,255,0.16)]"
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
                    ? "border-[var(--bias-gold)]/80 bg-[var(--bias-gold)]/20 text-[var(--bias-gold)] shadow-[0_0_18px_rgba(255,217,138,0.5)]"
                    : done
                    ? "border-[var(--bias-blue)]/70 bg-[var(--bias-blue)]/15 text-[var(--bias-blue)]"
                    : "border-white/20 bg-white/5 text-white/65"
                }`}
              >
                {String(step).padStart(2, "0")}
              </div>
              <p className={`mt-1 text-[10px] font-semibold tracking-[0.1em] ${active ? "text-[var(--bias-gold)]" : done ? "text-[var(--bias-blue)]/90" : "text-white/55"}`}>
                {label.replace("\n", " ")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
