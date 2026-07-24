"use client";

import { MAYA_DAY_SIGNS } from "@/lib/maya/maya-data";

type MayaCalendarWheelProps = {
  activeIndex?: number;
  className?: string;
};

export default function MayaCalendarWheel({ activeIndex = 19, className = "" }: MayaCalendarWheelProps) {
  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[360px] ${className}`} aria-hidden="true">
      <div className="absolute inset-0 rounded-full border border-amber-200/35 bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,0.2),rgba(88,28,135,0.22)_38%,rgba(6,10,32,0.75)_68%,rgba(3,7,18,0.95))] shadow-[0_0_80px_rgba(245,158,11,0.22)]" />
      <div className="absolute inset-[9%] rounded-full border border-amber-300/45" />
      <div className="absolute inset-[22%] rounded-full border border-teal-200/20 bg-slate-950/35" />
      <div className="absolute inset-[36%] rounded-full bg-[conic-gradient(from_40deg,rgba(250,204,21,0.88),rgba(168,85,247,0.42),rgba(45,212,191,0.28),rgba(250,204,21,0.88))] p-[1px]">
        <div className="flex h-full w-full items-center justify-center rounded-full bg-[#090817]/92 text-center">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-amber-200/80">Tzolk’in</p>
            <p className="mt-1 text-2xl font-black text-amber-100">20</p>
          </div>
        </div>
      </div>
      {MAYA_DAY_SIGNS.map((sign, index) => {
        const angle = (index / MAYA_DAY_SIGNS.length) * 360;
        const isActive = index === activeIndex;
        return (
          <span
            key={sign.name}
            className="absolute left-1/2 top-1/2 h-8 w-16 -translate-x-1/2 -translate-y-1/2 text-center text-[0.62rem] font-bold uppercase tracking-0 text-amber-100/70"
            style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-8.6rem) rotate(${-angle}deg)` }}
          >
            <span className={`inline-flex min-w-12 items-center justify-center rounded-full border px-2 py-1 ${isActive ? "border-amber-200 bg-amber-300 text-slate-950 shadow-[0_0_22px_rgba(252,211,77,0.65)]" : "border-amber-200/20 bg-slate-950/55"}`}>
              {sign.name}
            </span>
          </span>
        );
      })}
    </div>
  );
}
