"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CalendarClock, ChevronDown, Sun } from "lucide-react";
import {
  buildMayaMonthGrid,
  calculateMayaCalendar,
  formatIsoDate,
  getDaysInMonth,
  getTodayParts,
  type MayaDateParts,
} from "@/src/lib/maya-calendar";
import MayaDateSummaryCard from "./MayaDateSummaryCard";
import MayaPromptGeneratorCard from "./MayaPromptGeneratorCard";
import { useMayaCopy } from "./_lib/copy";

const UI_FONT_CLASS = "[font-family:'Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',system-ui,sans-serif]";
const DISPLAY_FONT_CLASS = "[font-family:'Noto_Serif_KR','Noto_Serif',Georgia,serif]";
const CODE_FONT_CLASS = "[font-family:Georgia,'Times_New_Roman',serif]";

function clampDay(year: number, month: number, day: number) {
  return Math.min(day, getDaysInMonth(year, month));
}

function SelectShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d8b56d]/85" />
    </div>
  );
}

function MayaMountainTempleVisual({ alt }: { alt: string }) {
  return (
    <svg
      viewBox="0 0 720 680"
      role="img"
      aria-label={alt}
      className="h-full w-full"
      focusable="false"
    >
      <defs>
        <radialGradient id="mayaTempleSky" cx="50%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#f4d38a" stopOpacity="0.28" />
          <stop offset="24%" stopColor="#163f31" stopOpacity="0.52" />
          <stop offset="72%" stopColor="#071611" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#020706" />
        </radialGradient>
        <radialGradient id="mayaTempleSun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff0b8" />
          <stop offset="52%" stopColor="#d8b56d" />
          <stop offset="100%" stopColor="#70451d" />
        </radialGradient>
        <linearGradient id="mayaTempleStone" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#2b352b" />
          <stop offset="54%" stopColor="#13241b" />
          <stop offset="100%" stopColor="#090f0c" />
        </linearGradient>
        <linearGradient id="mayaTempleGold" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#7c5525" />
          <stop offset="48%" stopColor="#f2d48b" />
          <stop offset="100%" stopColor="#9c6b2d" />
        </linearGradient>
        <filter id="mayaTempleGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="720" height="680" fill="url(#mayaTempleSky)" />
      <g opacity="0.62">
        <circle cx="126" cy="94" r="2" fill="#f6e7b4" />
        <circle cx="214" cy="142" r="1.5" fill="#d8b56d" />
        <circle cx="580" cy="92" r="2" fill="#f6e7b4" />
        <circle cx="634" cy="212" r="1.5" fill="#d8b56d" />
        <circle cx="86" cy="258" r="1.5" fill="#f6e7b4" />
        <circle cx="514" cy="314" r="1.5" fill="#f6e7b4" />
      </g>

      <g filter="url(#mayaTempleGlow)">
        <circle cx="360" cy="224" r="132" fill="none" stroke="#d8b56d" strokeWidth="2" opacity="0.86" />
        <circle cx="360" cy="224" r="104" fill="none" stroke="#f2d48b" strokeWidth="1.4" opacity="0.68" />
        <circle cx="360" cy="224" r="72" fill="url(#mayaTempleSun)" opacity="0.28" />
        <circle cx="360" cy="224" r="42" fill="none" stroke="#f2d48b" strokeWidth="3" opacity="0.8" />
        {Array.from({ length: 20 }, (_, index) => {
          const angle = (index * 18 * Math.PI) / 180;
          const x = 360 + Math.cos(angle) * 119;
          const y = 224 + Math.sin(angle) * 119;
          return (
            <rect
              key={index}
              x={x - 5}
              y={y - 5}
              width="10"
              height="10"
              rx="2"
              fill="#d8b56d"
              opacity={index % 2 === 0 ? 0.72 : 0.44}
              transform={`rotate(${index * 18} ${x} ${y})`}
            />
          );
        })}
      </g>

      <g opacity="0.58">
        <path d="M0 404 C82 330 145 350 218 294 C286 242 360 310 430 256 C496 206 564 270 720 192 L720 680 L0 680 Z" fill="#08140f" />
        <path d="M0 430 C118 368 178 388 254 334 C342 270 408 342 496 302 C590 258 642 294 720 246 L720 680 L0 680 Z" fill="#10261d" />
      </g>

      <g transform="translate(90 362)">
        <path d="M16 208 H524 L468 154 H72 Z" fill="#07110d" stroke="#d8b56d" strokeOpacity="0.32" />
        <path d="M78 154 H462 L410 106 H132 Z" fill="url(#mayaTempleStone)" stroke="#d8b56d" strokeOpacity="0.38" />
        <path d="M142 106 H400 L356 66 H186 Z" fill="#14271e" stroke="#d8b56d" strokeOpacity="0.42" />
        <path d="M198 66 H344 L314 34 H228 Z" fill="#1c3327" stroke="#d8b56d" strokeOpacity="0.48" />
        <path d="M246 34 H296 L282 0 H260 Z" fill="url(#mayaTempleGold)" opacity="0.92" />
        <path d="M42 208 H498 M94 154 H446 M154 106 H386 M210 66 H332" stroke="#f2d48b" strokeOpacity="0.42" strokeWidth="2" />
        <path d="M72 154 L16 208 M462 154 L524 208 M132 106 L78 154 M410 106 L462 154 M186 66 L142 106 M356 66 L400 106" stroke="#5f7f61" strokeOpacity="0.48" strokeWidth="3" />
        <g opacity="0.45" stroke="#f2d48b" strokeWidth="1">
          <path d="M134 178 H214" />
          <path d="M250 178 H330" />
          <path d="M364 178 H444" />
          <path d="M178 128 H248" />
          <path d="M292 128 H362" />
          <path d="M226 86 H316" />
        </g>
      </g>

      <g opacity="0.42">
        <path d="M78 574 C148 532 220 546 288 512 C360 476 438 518 512 486 C574 460 640 478 720 420 V680 H0 V630 C24 612 48 592 78 574 Z" fill="#020706" />
        <path d="M0 604 H720" stroke="#d8b56d" strokeOpacity="0.18" />
      </g>
    </svg>
  );
}

export default function MayaCalendarView() {
  const copy = useMayaCopy();
  const today = useMemo(() => getTodayParts(), []);
  const [selected, setSelected] = useState<MayaDateParts>(today);

  const years = useMemo(() => {
    const start = today.year - 120;
    return Array.from({ length: 151 }, (_, index) => start + index);
  }, [today.year]);

  const days = useMemo(
    () => Array.from({ length: getDaysInMonth(selected.year, selected.month) }, (_, index) => index + 1),
    [selected.year, selected.month],
  );

  const selectedResult = useMemo(
    () => calculateMayaCalendar(selected.year, selected.month, selected.day),
    [selected],
  );

  const monthCells = useMemo(
    () => buildMayaMonthGrid(selected.year, selected.month, selected, today),
    [selected, today],
  );

  function updateSelected(next: Partial<MayaDateParts>) {
    setSelected((prev) => {
      const year = next.year ?? prev.year;
      const month = next.month ?? prev.month;
      const day = clampDay(year, month, next.day ?? prev.day);
      return { year, month, day };
    });
  }

  return (
    <main className={`relative min-h-screen overflow-x-hidden bg-[#020706] text-[#f7f1df] ${UI_FONT_CLASS}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_8%,rgba(216,181,109,0.22),transparent_26%),radial-gradient(circle_at_18%_4%,rgba(50,132,103,0.20),transparent_30%),radial-gradient(circle_at_52%_42%,rgba(8,31,24,0.64),transparent_42%),linear-gradient(180deg,#020706_0%,#071611_43%,#020605_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70 [background:radial-gradient(ellipse_at_50%_0%,rgba(236,200,128,0.24)_0%,transparent_42%),linear-gradient(155deg,transparent_0_20%,rgba(244,235,205,0.10)_20%_27%,transparent_27%_36%,rgba(18,55,43,0.34)_36%_48%,transparent_48%_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(115deg,rgba(216,181,109,0.06)_1px,transparent_1px),linear-gradient(65deg,rgba(111,191,154,0.06)_1px,transparent_1px),radial-gradient(1px_1px_at_18%_24%,rgba(245,239,217,0.60),transparent),radial-gradient(1px_1px_at_72%_18%,rgba(216,181,109,0.58),transparent),radial-gradient(1px_1px_at_84%_68%,rgba(111,191,154,0.46),transparent)] [background-size:92px_92px,132px_132px,180px_180px,240px_240px,310px_310px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 opacity-50 [background:linear-gradient(180deg,transparent_0%,rgba(2,6,5,0.96)_78%),linear-gradient(90deg,transparent_0_7%,#0e1f18_7%_17%,transparent_17%_22%,#192c22_22%_36%,transparent_36%_41%,#071611_41%_50%,#213127_50%_59%,transparent_59%_64%,#121d18_64%_78%,transparent_78%_83%,#0b1511_83%_93%,transparent_93%_100%)]" />

      <section className="relative overflow-hidden px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <div className="relative mx-auto grid max-w-7xl min-w-0 items-center gap-6 lg:min-h-[520px] lg:grid-cols-[minmax(0,0.88fr)_minmax(0,560px)]">
          <div className="relative z-10 min-w-0 overflow-hidden rounded-lg border border-[#d8b56d]/24 bg-[#020706]/76 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-md sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(216,181,109,0.16),transparent_34%),linear-gradient(90deg,rgba(216,181,109,0.07)_1px,transparent_1px)] opacity-70 [background-size:auto,44px_44px]" />
            <p className={`relative inline-flex items-center gap-2 rounded-full border border-[#d8b56d]/42 bg-[#081812]/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#f5d48f] shadow-[0_0_32px_rgba(216,181,109,0.16)] ${CODE_FONT_CLASS}`}>
              <CalendarClock className="h-4 w-4" />
              Maya Sacred Calendar · GMT 584283
            </p>
            <h1 className={`relative mt-6 max-w-4xl text-5xl font-black leading-tight text-[#fff4cf] sm:text-6xl md:text-7xl ${DISPLAY_FONT_CLASS}`}>
              {copy.heroTitle}
            </h1>
            <p className={`relative mt-4 text-xl font-black leading-8 text-[#f5d48f] md:text-2xl ${DISPLAY_FONT_CLASS}`}>
              {copy.heroTagline}
            </p>
            <p className="relative mt-4 max-w-3xl text-base leading-8 text-[#eee5cb] md:text-lg">
              {copy.heroDescription}
            </p>
            <div className="relative mt-6 flex flex-wrap gap-3 text-xs font-bold text-[#ede3c3]">
              <span className="rounded-lg border border-[#d8b56d]/34 bg-[#0b120e]/82 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_0_22px_rgba(216,181,109,0.10)]">{copy.chipLongCount}</span>
              <span className="rounded-lg border border-[#6fbf9a]/34 bg-[#082018]/78 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">{copy.chipTzolkin}</span>
              <span className="rounded-lg border border-[#b67a48]/34 bg-[#1a100a]/70 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">{copy.chipHaab}</span>
            </div>
          </div>
          <div className="relative min-w-0 lg:-ml-10">
            <div className="absolute inset-0 rounded-full border border-[#d8b56d]/24 shadow-[0_0_120px_rgba(216,181,109,0.24)]" />
            <div className="absolute inset-6 rounded-full border border-dashed border-[#d8b56d]/32" />
            <div className="absolute inset-14 rounded-full border border-[#6fbf9a]/22" />
            <div className="relative min-w-0 overflow-hidden rounded-lg border border-[#e8c477]/34 bg-[#020706]/82 p-2 shadow-[0_30px_100px_rgba(0,0,0,0.50)] backdrop-blur">
              <div className="pointer-events-none absolute inset-2 z-10 rounded-lg border border-[#d8b56d]/24" />
              <div className="pointer-events-none absolute left-1/2 top-5 z-10 h-20 w-20 -translate-x-1/2 rounded-full border border-[#f5d48f]/54 bg-[#d8b56d]/12 shadow-[0_0_46px_rgba(216,181,109,0.34)]" />
              <div className="relative h-[340px] overflow-hidden rounded-lg bg-[#020706] sm:h-[430px] lg:h-[520px]">
                <MayaMountainTempleVisual alt={copy.templeVisualAlt} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,transparent_0%,rgba(2,7,6,0.02)_42%,rgba(2,7,6,0.36)_100%)]" />
                <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_50%_0%,rgba(216,181,109,0.28),transparent_64%)]" />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent_0%,rgba(2,7,6,0.94)_100%)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-[#d8b56d]/18 bg-[#04100d]/88 px-4 py-6 shadow-[inset_0_1px_0_rgba(245,239,217,0.06)] backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8b56d]/78">{copy.dateSectionLabel}</p>
              <h2 className={`mt-1 text-2xl font-black text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>{copy.dateSectionTitle}</h2>
            </div>
            <p className="rounded-full border border-[#d8b56d]/28 bg-[#081812]/82 px-4 py-2 text-xs font-black text-[#f5d48f]">
              {copy.selectedCoordinatePrefix} {formatIsoDate(selected)}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="block text-sm font-bold text-[#eee5cb]">
              {copy.yearLabel}
              <SelectShell>
                <select
                  value={selected.year}
                  aria-label={copy.yearSelectAria}
                  onChange={(event) => updateSelected({ year: Number(event.target.value) })}
                  className="mt-2 w-full appearance-none rounded-lg border border-[#d8b56d]/22 bg-[#020706] px-4 py-3 text-sm font-black text-[#f8efd2] outline-none transition focus:border-[#d8b56d] focus-visible:ring-2 focus-visible:ring-[#d8b56d]/70"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{copy.yearSuffix(year)}</option>
                  ))}
                </select>
              </SelectShell>
            </label>
            <label className="block text-sm font-bold text-[#eee5cb]">
              {copy.monthLabel}
              <SelectShell>
                <select
                  value={selected.month}
                  aria-label={copy.monthSelectAria}
                  onChange={(event) => updateSelected({ month: Number(event.target.value) })}
                  className="mt-2 w-full appearance-none rounded-lg border border-[#d8b56d]/22 bg-[#020706] px-4 py-3 text-sm font-black text-[#f8efd2] outline-none transition focus:border-[#d8b56d] focus-visible:ring-2 focus-visible:ring-[#d8b56d]/70"
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>{copy.monthSuffix(month)}</option>
                  ))}
                </select>
              </SelectShell>
            </label>
            <label className="block text-sm font-bold text-[#eee5cb]">
              {copy.dayLabel}
              <SelectShell>
                <select
                  value={selected.day}
                  aria-label={copy.daySelectAria}
                  onChange={(event) => updateSelected({ day: Number(event.target.value) })}
                  className="mt-2 w-full appearance-none rounded-lg border border-[#d8b56d]/22 bg-[#020706] px-4 py-3 text-sm font-black text-[#f8efd2] outline-none transition focus:border-[#d8b56d] focus-visible:ring-2 focus-visible:ring-[#d8b56d]/70"
                >
                  {days.map((day) => (
                    <option key={day} value={day}>{copy.daySuffix(day)}</option>
                  ))}
                </select>
              </SelectShell>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setSelected(today)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#d8b56d]/36 bg-[linear-gradient(135deg,#6f3d24_0%,#c8923d_52%,#d8c697_100%)] px-5 py-3 text-sm font-black text-[#15120c] shadow-[0_16px_40px_rgba(200,146,61,0.20)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d48f] motion-reduce:transition-none md:w-auto"
              >
                <Sun className="h-4 w-4" />
                {copy.todayButton}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-7xl min-w-0 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:px-8">
        <div className="min-w-0 space-y-6">
          <MayaDateSummaryCard result={selectedResult} />

          <section className="relative min-w-0 overflow-hidden rounded-lg border border-[#d8b56d]/24 bg-[#04100d]/90 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.30)] backdrop-blur sm:p-5">
            <div className="pointer-events-none absolute inset-0 opacity-44 [background-image:radial-gradient(circle_at_50%_0%,rgba(216,181,109,0.18),transparent_34%),linear-gradient(90deg,rgba(216,181,109,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(111,191,154,0.06)_1px,transparent_1px)] [background-size:auto,34px_34px,34px_34px]" />
            <div className="pointer-events-none absolute inset-3 rounded-lg border border-[#d8b56d]/14" />
            <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border border-[#d8b56d]/12" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8b56d]/78">{copy.monthGridLabel}</p>
                <h2 className={`mt-1 text-2xl font-black text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>{copy.monthGridTitle(selected.year, selected.month)}</h2>
                <p className="mt-1 text-sm text-[#ddd2b5]">{copy.monthGridDesc}</p>
              </div>
              <p className="rounded-full border border-[#d8b56d]/28 bg-[#081812]/78 px-3 py-1 text-xs font-black text-[#f5d48f]">
                {copy.selectedCoordinatePrefix} {formatIsoDate(selected)}
              </p>
            </div>

            <div className="relative mt-5 grid grid-cols-7 gap-1 text-center text-xs font-black text-[#d8b56d]/88 sm:gap-2">
              {copy.weekdays.map((weekday) => (
                <div key={weekday} className="py-2">{weekday}</div>
              ))}
            </div>

            <div className="relative grid grid-cols-7 gap-1 sm:gap-2">
              {monthCells.map((cell) => (
                <button
                  key={cell.calendar.gregorian.iso}
                  type="button"
                  aria-label={copy.cellAria(cell.calendar.gregorian.labelKo, cell.calendar.tzolkin.label, cell.calendar.haab.label)}
                  aria-pressed={cell.isSelected}
                  onClick={() => setSelected(cell.date)}
                  className={[
                    "group relative min-h-[70px] min-w-0 overflow-hidden rounded-lg border p-1.5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d48f]/85 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none sm:min-h-[108px] sm:p-3",
                    cell.isSelected
                      ? "border-[#f0c76b] bg-[radial-gradient(circle_at_82%_16%,rgba(240,199,107,0.34),transparent_34%),linear-gradient(180deg,rgba(42,32,13,0.94),rgba(5,16,13,0.96))] shadow-[0_0_0_1px_rgba(240,199,107,0.72),0_0_52px_rgba(216,181,109,0.34),inset_0_0_42px_rgba(240,199,107,0.18)]"
                      : "border-[#d8b56d]/22 bg-[#071611]/82 hover:border-[#e8c477]/60 hover:bg-[#0c2119]/90",
                    cell.inCurrentMonth ? "opacity-100" : "opacity-45",
                  ].join(" ")}
                >
                  <span className="pointer-events-none absolute inset-0 opacity-42 [background-image:linear-gradient(135deg,rgba(216,181,109,0.06)_1px,transparent_1px),radial-gradient(1px_1px_at_20%_30%,rgba(245,239,217,0.16),transparent)] [background-size:18px_18px,44px_44px]" />
                  <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 motion-reduce:transition-none [background-image:radial-gradient(circle_at_50%_0%,rgba(216,181,109,0.18),transparent_44%)]" />
                  {cell.isSelected ? (
                    <span className="pointer-events-none absolute right-2 top-2 h-9 w-9 rounded-full border border-[#fff0b8]/88 bg-[#d8b56d]/20 shadow-[0_0_30px_rgba(216,181,109,0.46),inset_0_0_16px_rgba(245,212,143,0.20)]" />
                  ) : null}
                  <span className="flex items-center justify-between gap-1">
                    <span className={`relative text-sm font-black text-[#f8efd2] sm:text-base ${CODE_FONT_CLASS}`}>{cell.date.day}</span>
                    {cell.isToday ? (
                      <span className="relative inline-flex items-center gap-1 rounded-full border border-[#6fbf9a]/38 bg-[#0d3227]/56 px-1.5 py-0.5 text-[9px] font-black text-[#f0efd5] sm:text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f5d48f] shadow-[0_0_10px_rgba(216,181,109,0.65)]" />
                        <span className="hidden sm:inline">{copy.todayBadge}</span>
                        <span className="sr-only sm:hidden">{copy.todayBadge}</span>
                      </span>
                    ) : null}
                  </span>
                  <span className={`relative mt-2 block truncate text-[10px] font-bold leading-4 text-[#ffe39d] sm:text-xs ${CODE_FONT_CLASS}`}>
                    Tz {cell.calendar.tzolkin.label}
                  </span>
                  <span className={`relative hidden truncate text-[10px] font-bold leading-4 text-[#efe2bf] sm:block sm:text-xs ${CODE_FONT_CLASS}`}>
                    Haab {cell.calendar.haab.label}
                  </span>
                  <span className={`relative block truncate text-[9px] font-bold leading-3 text-[#efe2bf] sm:hidden ${CODE_FONT_CLASS}`}>
                    H {cell.calendar.haab.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <MayaPromptGeneratorCard result={selectedResult} />
          <section className="relative overflow-hidden rounded-lg border border-[#d8b56d]/18 bg-[#04100d]/82 p-5 text-sm leading-7 text-[#e6dcc1] shadow-[0_18px_60px_rgba(0,0,0,0.26)] backdrop-blur">
            <div className="pointer-events-none absolute inset-0 opacity-28 [background-image:linear-gradient(135deg,rgba(216,181,109,0.07)_1px,transparent_1px)] [background-size:26px_26px]" />
            <h2 className={`relative text-lg font-black text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>{copy.referenceHeading}</h2>
            <p className="relative mt-3">
              {copy.referenceDisclaimer}
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
