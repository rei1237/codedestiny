import { ReactNode } from "react";
import CosmicSigil from "./CosmicSigil";

interface Props {
  children: ReactNode;
}

export default function TamagotchiDeviceFrame({ children }: Props) {
  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[2.2rem] border border-cyan-100/30 bg-[radial-gradient(circle_at_8%_12%,rgba(104,180,255,0.34),transparent_36%),radial-gradient(circle_at_86%_8%,rgba(245,182,255,0.28),transparent_34%),linear-gradient(160deg,#060b1f_0%,#101639_45%,#0a1a3b_100%)] p-4 shadow-[0_32px_90px_rgba(3,10,30,0.62)] md:p-6">
      <div className="pointer-events-none absolute -right-20 -top-24 h-[360px] w-[360px] opacity-55">
        <CosmicSigil className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-[320px] w-[320px] rotate-12 opacity-35">
        <CosmicSigil className="h-full w-full" />
      </div>

      <div className="relative rounded-[1.8rem] border border-white/25 bg-[linear-gradient(140deg,rgba(255,255,255,0.14),rgba(255,255,255,0.06))] p-3 backdrop-blur-sm md:p-5">
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="h-2 rounded-full bg-cyan-200/70" />
          <div className="h-2 rounded-full bg-violet-200/70" />
          <div className="h-2 rounded-full bg-amber-200/70" />
        </div>

        <div className="rounded-[1.4rem] border border-cyan-100/30 bg-[linear-gradient(160deg,rgba(11,31,58,0.72),rgba(6,16,38,0.8))] p-3 text-slate-100 md:p-5">
          {children}
        </div>
      </div>

      <div className="mt-5 flex justify-center gap-5">
        <span className="h-4 w-4 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(103,232,249,0.95)]" />
        <span className="h-4 w-4 rounded-full bg-fuchsia-200 shadow-[0_0_18px_rgba(244,114,182,0.9)]" />
        <span className="h-4 w-4 rounded-full bg-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.9)]" />
      </div>
    </div>
  );
}
