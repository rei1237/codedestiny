"use client";

import { CalendarDays, Compass, Hash, Moon } from "lucide-react";
import type { MayaCalendarResult } from "@/src/lib/maya-calendar";

type Props = {
  result: MayaCalendarResult;
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-amber-100/70">{label}</dt>
      <dd className="mt-2 text-lg font-black text-white">{value}</dd>
    </div>
  );
}

export default function MayaDateSummaryCard({ result }: Props) {
  return (
    <section className="rounded-lg border border-amber-200/20 bg-white/[0.07] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.25)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-amber-200/12 px-3 py-1 text-xs font-black text-amber-100">
            <CalendarDays className="h-4 w-4" />
            선택한 날짜
          </p>
          <h2 className="mt-3 text-2xl font-black text-amber-50 md:text-3xl">{result.gregorian.labelKo}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            GMT 584283 기준으로 계산한 Long Count, Tzolk'in, Haab 표기입니다.
          </p>
        </div>
        <div className="rounded-full border border-amber-200/25 bg-amber-200/10 px-4 py-2 text-sm font-black text-amber-50">
          {result.tzolkin.label}
        </div>
      </div>

      <dl className="mt-5 grid gap-3 md:grid-cols-3">
        <SummaryRow label="Long Count" value={result.longCount.label} />
        <SummaryRow label="Tzolk'in" value={result.tzolkin.label} />
        <SummaryRow label="Haab" value={result.haab.label} />
      </dl>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
          <Hash className="h-5 w-5 text-amber-100" />
          <p className="mt-2 text-sm font-bold text-slate-100">Tzolk'in 키워드</p>
          <p className="mt-1 text-xs leading-6 text-slate-300">{result.tzolkin.keywords.join(" · ")}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
          <Moon className="h-5 w-5 text-teal-100" />
          <p className="mt-2 text-sm font-bold text-slate-100">Haab 키워드</p>
          <p className="mt-1 text-xs leading-6 text-slate-300">{result.haab.keywords.join(" · ")}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
          <Compass className="h-5 w-5 text-violet-100" />
          <p className="mt-2 text-sm font-bold text-slate-100">계산 기준</p>
          <p className="mt-1 text-xs leading-6 text-slate-300">Julian Day Number · GMT {result.correlation}</p>
        </div>
      </div>
    </section>
  );
}
