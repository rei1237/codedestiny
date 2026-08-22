"use client";

import type { ReactNode } from "react";
import { CalendarDays, Compass, Hash, Moon } from "lucide-react";
import type { MayaCalendarResult } from "@/src/lib/maya-calendar";
import { useMayaCopy } from "./_lib/copy";

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
    <div className={`group relative min-w-0 overflow-hidden rounded-lg border p-4 shadow-[0_18px_54px_rgba(0,0,0,0.30)] transition duration-200 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none ${className}`}>
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_82%_2%,rgba(245,239,217,0.22),transparent_34%),radial-gradient(circle_at_50%_115%,rgba(216,181,109,0.16),transparent_42%)]" />
      <div className="pointer-events-none absolute right-3 top-3 h-14 w-14 rounded-full border border-[#f5d48f]/24 shadow-[0_0_24px_rgba(216,181,109,0.16)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#f5d48f]/54 opacity-90" />
      <dt className="relative flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#f5efd9]/82">
        {icon}
        {label}
      </dt>
      <dd className={`relative mt-3 break-words text-2xl font-black text-[#fff0b8] drop-shadow-[0_0_18px_rgba(216,181,109,0.18)] sm:text-3xl ${CODE_FONT_CLASS}`}>{value}</dd>
      <p className="relative mt-2 text-xs font-bold leading-5 text-[#eee5cb]/88">{description}</p>
    </div>
  );
}

export default function MayaDateSummaryCard({ result }: Props) {
  const copy = useMayaCopy();
  return (
    <section className="relative min-w-0 overflow-hidden rounded-lg border border-[#d8b56d]/30 bg-[#04100d]/94 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 opacity-48 [background-image:radial-gradient(circle_at_18%_0%,rgba(216,181,109,0.22),transparent_30%),radial-gradient(circle_at_84%_10%,rgba(111,191,154,0.14),transparent_26%),linear-gradient(135deg,rgba(216,181,109,0.05)_1px,transparent_1px)] [background-size:auto,auto,54px_54px]" />
      <div className="pointer-events-none absolute inset-3 rounded-lg border border-[#d8b56d]/14" />
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full border border-[#d8b56d]/20 shadow-[0_0_70px_rgba(216,181,109,0.10)]" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="relative min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#d8b56d]/30 bg-[#081812]/78 px-3 py-1 text-xs font-black text-[#f5d48f]">
            <CalendarDays className="h-4 w-4" />
            {copy.summarySelectedCoordinate}
          </p>
          <h2 className={`mt-3 text-2xl font-black text-[#f8efd2] md:text-3xl ${DISPLAY_FONT_CLASS}`}>{result.gregorian.labelKo}</h2>
          <p className="mt-2 text-sm leading-6 text-[#e6dcc1]">
            {copy.summaryCorrelationNote}
          </p>
        </div>
        <div className={`relative rounded-lg border border-[#d8b56d]/42 bg-[#020706]/78 px-4 py-2 text-sm font-black text-[#fff0b8] shadow-[0_0_32px_rgba(216,181,109,0.18)] ${CODE_FONT_CLASS}`}>
          {result.tzolkin.label}
        </div>
      </div>

      <dl className="relative mt-5 grid min-w-0 gap-3 md:grid-cols-3">
        <SummaryRow
          label={copy.longCountName}
          value={result.longCount.label}
          description={copy.longCountDesc}
          icon={<Compass className="h-4 w-4 text-[#d8b56d]" />}
          className="border-[#d8b56d]/44 bg-[#020706]/90"
        />
        <SummaryRow
          label={copy.tzolkinName}
          value={result.tzolkin.label}
          description={copy.tzolkinDesc}
          icon={<Hash className="h-4 w-4 text-[#6fbf9a]" />}
          className="border-[#6fbf9a]/38 bg-[#052018]/86"
        />
        <SummaryRow
          label={copy.haabName}
          value={result.haab.label}
          description={copy.haabDesc}
          icon={<Moon className="h-4 w-4 text-[#eadfc0]" />}
          className="border-[#b67a48]/40 bg-[#1b100b]/84"
        />
      </dl>

      <div className="relative mt-4 grid min-w-0 gap-3 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-lg border border-[#d8b56d]/18 bg-[#020706]/62 p-4 shadow-[inset_0_0_0_1px_rgba(245,239,217,0.03)]">
          <div className="pointer-events-none absolute inset-0 opacity-22 [background-image:linear-gradient(135deg,rgba(216,181,109,0.08)_1px,transparent_1px)] [background-size:20px_20px]" />
          <Hash className="h-5 w-5 text-[#f5d48f]" />
          <p className={`relative mt-2 text-sm font-bold text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>{copy.tzolkinKeywordsLabel}</p>
          <p className="relative mt-1 text-xs leading-6 text-[#e6dcc1]">{result.tzolkin.keywords.join(" · ")}</p>
        </div>
        <div className="relative overflow-hidden rounded-lg border border-[#6fbf9a]/18 bg-[#052018]/56 p-4 shadow-[inset_0_0_0_1px_rgba(245,239,217,0.03)]">
          <div className="pointer-events-none absolute inset-0 opacity-22 [background-image:linear-gradient(45deg,rgba(111,191,154,0.10)_1px,transparent_1px)] [background-size:20px_20px]" />
          <Moon className="h-5 w-5 text-[#6fbf9a]" />
          <p className={`relative mt-2 text-sm font-bold text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>{copy.haabKeywordsLabel}</p>
          <p className="relative mt-1 text-xs leading-6 text-[#e6dcc1]">{result.haab.keywords.join(" · ")}</p>
        </div>
        <div className="relative overflow-hidden rounded-lg border border-[#b67a48]/18 bg-[#1b100b]/54 p-4 shadow-[inset_0_0_0_1px_rgba(245,239,217,0.03)]">
          <div className="pointer-events-none absolute inset-0 opacity-22 [background-image:linear-gradient(135deg,rgba(182,122,72,0.10)_1px,transparent_1px)] [background-size:20px_20px]" />
          <Compass className="h-5 w-5 text-[#d8b56d]" />
          <p className={`relative mt-2 text-sm font-bold text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>{copy.calcBasisLabel}</p>
          <p className={`relative mt-1 text-xs leading-6 text-[#e6dcc1] ${CODE_FONT_CLASS}`}>Julian Day Number · GMT {result.correlation}</p>
        </div>
      </div>
    </section>
  );
}
