"use client";

import type { ReactNode } from "react";
import { CalendarDays, Compass, Hash, Moon } from "lucide-react";
import type { MayaCalendarResult } from "@/src/lib/maya-calendar";

type Props = {
  result: MayaCalendarResult;
};

const DISPLAY_FONT_CLASS = "[font-family:'Noto_Serif_KR','Noto_Serif',Georgia,serif]";
const CODE_FONT_CLASS = "[font-family:Georgia,'Times_New_Roman',serif]";

function SummaryRow({
  label,
  value,
  description,
  icon,
  className,
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  className: string;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-lg border p-4 shadow-[0_18px_54px_rgba(0,0,0,0.28)] transition duration-200 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none ${className}`}>
      <div className="pointer-events-none absolute inset-0 opacity-42 [background-image:radial-gradient(circle_at_82%_2%,rgba(245,239,217,0.18),transparent_34%),radial-gradient(circle_at_50%_115%,rgba(216,181,109,0.12),transparent_42%)]" />
      <div className="pointer-events-none absolute right-3 top-3 h-12 w-12 rounded-full border border-[#f5d48f]/18" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#d8b56d]/42 opacity-80" />
      <dt className="relative flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#f5efd9]/82">
        {icon}
        {label}
      </dt>
      <dd className={`relative mt-3 text-2xl font-black text-[#f8efd2] ${CODE_FONT_CLASS}`}>{value}</dd>
      <p className="relative mt-2 text-xs leading-5 text-[#e6dcc1]/82">{description}</p>
    </div>
  );
}

export default function MayaDateSummaryCard({ result }: Props) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-[#d8b56d]/26 bg-[#04100d]/92 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 opacity-44 [background-image:radial-gradient(circle_at_18%_0%,rgba(216,181,109,0.18),transparent_30%),radial-gradient(circle_at_84%_10%,rgba(111,191,154,0.12),transparent_26%),linear-gradient(135deg,rgba(216,181,109,0.05)_1px,transparent_1px)] [background-size:auto,auto,54px_54px]" />
      <div className="pointer-events-none absolute inset-3 rounded-lg border border-[#d8b56d]/14" />
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full border border-[#d8b56d]/20 shadow-[0_0_70px_rgba(216,181,109,0.10)]" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#d8b56d]/30 bg-[#081812]/78 px-3 py-1 text-xs font-black text-[#f5d48f]">
            <CalendarDays className="h-4 w-4" />
            선택된 시간 좌표
          </p>
          <h2 className={`mt-3 text-2xl font-black text-[#f8efd2] md:text-3xl ${DISPLAY_FONT_CLASS}`}>{result.gregorian.labelKo}</h2>
          <p className="mt-2 text-sm leading-6 text-[#e6dcc1]">
            GMT 584283 기준으로 계산된 마야 달력 좌표입니다.
          </p>
        </div>
        <div className={`relative rounded-lg border border-[#d8b56d]/34 bg-[#020706]/72 px-4 py-2 text-sm font-black text-[#f5d48f] shadow-[0_0_28px_rgba(216,181,109,0.14)] ${CODE_FONT_CLASS}`}>
          {result.tzolkin.label}
        </div>
      </div>

      <dl className="relative mt-5 grid gap-3 md:grid-cols-3">
        <SummaryRow
          label="Long Count"
          value={result.longCount.label}
          description="장대한 시간의 흐름 속 현재 위치"
          icon={<Compass className="h-4 w-4 text-[#d8b56d]" />}
          className="border-[#d8b56d]/36 bg-[#020706]/84"
        />
        <SummaryRow
          label="Tzolk'in"
          value={result.tzolkin.label}
          description="260일 주기의 내면 리듬"
          icon={<Hash className="h-4 w-4 text-[#6fbf9a]" />}
          className="border-[#6fbf9a]/30 bg-[#052018]/82"
        />
        <SummaryRow
          label="Haab"
          value={result.haab.label}
          description="365일 태양력의 계절 흐름"
          icon={<Moon className="h-4 w-4 text-[#eadfc0]" />}
          className="border-[#b67a48]/30 bg-[#1b100b]/78"
        />
      </dl>

      <div className="relative mt-4 grid gap-3 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-lg border border-[#d8b56d]/18 bg-[#020706]/62 p-4 shadow-[inset_0_0_0_1px_rgba(245,239,217,0.03)]">
          <div className="pointer-events-none absolute inset-0 opacity-22 [background-image:linear-gradient(135deg,rgba(216,181,109,0.08)_1px,transparent_1px)] [background-size:20px_20px]" />
          <Hash className="h-5 w-5 text-[#f5d48f]" />
          <p className={`relative mt-2 text-sm font-bold text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>Tzolk&apos;in 키워드</p>
          <p className="relative mt-1 text-xs leading-6 text-[#e6dcc1]">{result.tzolkin.keywords.join(" · ")}</p>
        </div>
        <div className="relative overflow-hidden rounded-lg border border-[#6fbf9a]/18 bg-[#052018]/56 p-4 shadow-[inset_0_0_0_1px_rgba(245,239,217,0.03)]">
          <div className="pointer-events-none absolute inset-0 opacity-22 [background-image:linear-gradient(45deg,rgba(111,191,154,0.10)_1px,transparent_1px)] [background-size:20px_20px]" />
          <Moon className="h-5 w-5 text-[#6fbf9a]" />
          <p className={`relative mt-2 text-sm font-bold text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>Haab 키워드</p>
          <p className="relative mt-1 text-xs leading-6 text-[#e6dcc1]">{result.haab.keywords.join(" · ")}</p>
        </div>
        <div className="relative overflow-hidden rounded-lg border border-[#b67a48]/18 bg-[#1b100b]/54 p-4 shadow-[inset_0_0_0_1px_rgba(245,239,217,0.03)]">
          <div className="pointer-events-none absolute inset-0 opacity-22 [background-image:linear-gradient(135deg,rgba(182,122,72,0.10)_1px,transparent_1px)] [background-size:20px_20px]" />
          <Compass className="h-5 w-5 text-[#d8b56d]" />
          <p className={`relative mt-2 text-sm font-bold text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>계산 기준</p>
          <p className={`relative mt-1 text-xs leading-6 text-[#e6dcc1] ${CODE_FONT_CLASS}`}>Julian Day Number · GMT {result.correlation}</p>
        </div>
      </div>
    </section>
  );
}
