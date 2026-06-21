"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CalendarClock, ChevronDown, RotateCcw, Sun } from "lucide-react";
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

const MAYA_ASSET_URL = "https://assets.code-destiny.com/%EB%A7%88%EC%95%BC%EC%A0%90.webp";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function clampDay(year: number, month: number, day: number) {
  return Math.min(day, getDaysInMonth(year, month));
}

function SelectShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-100/75" />
    </div>
  );
}

export default function MayaCalendarView() {
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
    <main className="min-h-screen bg-[#070816] text-slate-50">
      <section className="relative overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(250,204,21,0.2),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(124,58,237,0.22),transparent_30%),linear-gradient(180deg,#070816_0%,#10102a_52%,#08121f_100%)]" />
        <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(1px_1px_at_12%_22%,rgba(255,255,255,0.8),transparent),radial-gradient(1px_1px_at_70%_18%,rgba(253,230,138,0.8),transparent),radial-gradient(1px_1px_at_82%_62%,rgba(204,251,241,0.7),transparent)] [background-size:180px_180px,240px_240px,310px_310px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-100">
              <CalendarClock className="h-4 w-4" />
              GMT 584283
            </p>
            <h1 className="mt-6 text-5xl font-black leading-tight text-amber-50 md:text-7xl">마야 달력</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-100 md:text-xl">
              선택한 날짜의 마야 달력을 월간 보기로 확인하고, 그날의 마야점 상담 프롬프트를 생성하세요.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-amber-200/20 bg-white/[0.07] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.32)]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-950">
              <img
                src={MAYA_ASSET_URL}
                alt="금빛 마야 달력판과 밤하늘의 시간 문양"
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,22,0.02),rgba(7,8,22,0.62))]" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b1022] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="block text-sm font-bold text-slate-100">
            연도
            <SelectShell>
              <select
                value={selected.year}
                onChange={(event) => updateSelected({ year: Number(event.target.value) })}
                className="mt-2 w-full appearance-none rounded-lg border border-white/12 bg-slate-950/70 px-4 py-3 text-sm font-black text-white outline-none focus:border-amber-200"
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </SelectShell>
          </label>
          <label className="block text-sm font-bold text-slate-100">
            월
            <SelectShell>
              <select
                value={selected.month}
                onChange={(event) => updateSelected({ month: Number(event.target.value) })}
                className="mt-2 w-full appearance-none rounded-lg border border-white/12 bg-slate-950/70 px-4 py-3 text-sm font-black text-white outline-none focus:border-amber-200"
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                  <option key={month} value={month}>{month}월</option>
                ))}
              </select>
            </SelectShell>
          </label>
          <label className="block text-sm font-bold text-slate-100">
            일
            <SelectShell>
              <select
                value={selected.day}
                onChange={(event) => updateSelected({ day: Number(event.target.value) })}
                className="mt-2 w-full appearance-none rounded-lg border border-white/12 bg-slate-950/70 px-4 py-3 text-sm font-black text-white outline-none focus:border-amber-200"
              >
                {days.map((day) => (
                  <option key={day} value={day}>{day}일</option>
                ))}
              </select>
            </SelectShell>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setSelected(today)}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-200 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-100 md:w-auto"
            >
              <Sun className="h-4 w-4" />
              오늘
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
        <div className="space-y-6">
          <MayaDateSummaryCard result={selectedResult} />

          <section className="rounded-lg border border-white/10 bg-white/[0.06] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-white">{selected.year}년 {selected.month}월</h2>
                <p className="mt-1 text-sm text-slate-300">각 날짜의 Tzolk'in과 Haab 값을 함께 표시합니다.</p>
              </div>
              <p className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-black text-amber-100">
                선택 날짜 {formatIsoDate(selected)}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-black text-amber-100/80 sm:gap-2">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="py-2">{weekday}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {monthCells.map((cell) => (
                <button
                  key={cell.calendar.gregorian.iso}
                  type="button"
                  onClick={() => setSelected(cell.date)}
                  className={[
                    "relative min-h-[76px] rounded-lg border p-2 text-left transition sm:min-h-[104px] sm:p-3",
                    cell.isSelected
                      ? "border-amber-100 bg-amber-200/18 shadow-[0_0_0_1px_rgba(253,230,138,0.45),0_0_28px_rgba(251,191,36,0.20)]"
                      : "border-white/10 bg-slate-950/42 hover:border-amber-200/45 hover:bg-white/[0.08]",
                    cell.inCurrentMonth ? "opacity-100" : "opacity-38",
                  ].join(" ")}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span className="text-sm font-black text-white sm:text-base">{cell.date.day}</span>
                    {cell.isToday ? <span className="h-2 w-2 rounded-full bg-teal-200" aria-label="오늘" /> : null}
                  </span>
                  <span className="mt-2 block text-[10px] font-bold leading-4 text-amber-100 sm:text-xs">
                    Tz {cell.calendar.tzolkin.label}
                  </span>
                  <span className="block text-[10px] font-bold leading-4 text-teal-100/90 sm:text-xs">
                    Haab {cell.calendar.haab.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <MayaPromptGeneratorCard result={selectedResult} />
          <section className="rounded-lg border border-white/10 bg-white/[0.06] p-5 text-sm leading-7 text-slate-200">
            <h2 className="text-lg font-black text-amber-50">참고</h2>
            <p className="mt-3">
              이 달력은 선택한 날짜를 마야 달력 표기로 보여주는 참고용 도구입니다.
              마야점 프롬프트 생성 기능은 사용자가 외부 AI에게 상담을 요청할 수 있도록 문장을 구성해주는 기능입니다.
              생성된 프롬프트와 그에 따른 AI 답변은 엔터테인먼트 목적의 참고용이며,
              중요한 의사결정의 유일한 근거로 사용하지 마세요.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
