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

const MAYA_ASSET_URL = "https://assets.code-destiny.com/%EB%A7%88%EC%95%BC%EC%A0%90.webp";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
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
    <main className={`relative min-h-screen overflow-hidden bg-[#020706] text-[#f7f1df] ${UI_FONT_CLASS}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_8%,rgba(216,181,109,0.22),transparent_26%),radial-gradient(circle_at_18%_4%,rgba(50,132,103,0.20),transparent_30%),radial-gradient(circle_at_52%_42%,rgba(8,31,24,0.64),transparent_42%),linear-gradient(180deg,#020706_0%,#071611_43%,#020605_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70 [background:radial-gradient(ellipse_at_50%_0%,rgba(236,200,128,0.24)_0%,transparent_42%),linear-gradient(155deg,transparent_0_20%,rgba(244,235,205,0.10)_20%_27%,transparent_27%_36%,rgba(18,55,43,0.34)_36%_48%,transparent_48%_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(115deg,rgba(216,181,109,0.06)_1px,transparent_1px),linear-gradient(65deg,rgba(111,191,154,0.06)_1px,transparent_1px),radial-gradient(1px_1px_at_18%_24%,rgba(245,239,217,0.60),transparent),radial-gradient(1px_1px_at_72%_18%,rgba(216,181,109,0.58),transparent),radial-gradient(1px_1px_at_84%_68%,rgba(111,191,154,0.46),transparent)] [background-size:92px_92px,132px_132px,180px_180px,240px_240px,310px_310px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 opacity-50 [background:linear-gradient(180deg,transparent_0%,rgba(2,6,5,0.96)_78%),linear-gradient(90deg,transparent_0_7%,#0e1f18_7%_17%,transparent_17%_22%,#192c22_22%_36%,transparent_36%_41%,#071611_41%_50%,#213127_50%_59%,transparent_59%_64%,#121d18_64%_78%,transparent_78%_83%,#0b1511_83%_93%,transparent_93%_100%)]" />

      <section className="relative overflow-hidden px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <div className="relative mx-auto grid max-w-7xl items-center gap-6 lg:min-h-[520px] lg:grid-cols-[minmax(0,0.88fr)_minmax(420px,560px)]">
          <div className="relative z-10 overflow-hidden rounded-lg border border-[#d8b56d]/24 bg-[#020706]/76 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-md sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(216,181,109,0.16),transparent_34%),linear-gradient(90deg,rgba(216,181,109,0.07)_1px,transparent_1px)] opacity-70 [background-size:auto,44px_44px]" />
            <p className={`relative inline-flex items-center gap-2 rounded-full border border-[#d8b56d]/42 bg-[#081812]/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#f5d48f] shadow-[0_0_32px_rgba(216,181,109,0.16)] ${CODE_FONT_CLASS}`}>
              <CalendarClock className="h-4 w-4" />
              Maya Sacred Calendar · GMT 584283
            </p>
            <h1 className={`relative mt-6 max-w-4xl text-5xl font-black leading-tight text-[#fff4cf] sm:text-6xl md:text-7xl ${DISPLAY_FONT_CLASS}`}>
              마야점
            </h1>
            <p className={`relative mt-4 text-xl font-black leading-8 text-[#f5d48f] md:text-2xl ${DISPLAY_FONT_CLASS}`}>
              고대 달력의 시간 코드로 오늘의 흐름을 읽습니다
            </p>
            <p className="relative mt-4 max-w-3xl text-base leading-8 text-[#eee5cb] md:text-lg">
              선택한 날짜의 Long Count, Tzolk&apos;in, Haab 값을 한눈에 확인하고, 마야 sacred calendar의 상징을 바탕으로 상담 프롬프트를 준비하세요.
            </p>
            <div className="relative mt-6 flex flex-wrap gap-3 text-xs font-bold text-[#ede3c3]">
              <span className="rounded-lg border border-[#d8b56d]/34 bg-[#0b120e]/82 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_0_22px_rgba(216,181,109,0.10)]">Long Count 시간 좌표</span>
              <span className="rounded-lg border border-[#6fbf9a]/34 bg-[#082018]/78 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">Tzolk&apos;in 내면 리듬</span>
              <span className="rounded-lg border border-[#b67a48]/34 bg-[#1a100a]/70 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">Haab 태양의 계절</span>
            </div>
          </div>
          <div className="relative lg:-ml-10">
            <div className="absolute inset-0 rounded-full border border-[#d8b56d]/24 shadow-[0_0_120px_rgba(216,181,109,0.24)]" />
            <div className="absolute inset-6 rounded-full border border-dashed border-[#d8b56d]/32" />
            <div className="absolute inset-14 rounded-full border border-[#6fbf9a]/22" />
            <div className="relative overflow-hidden rounded-lg border border-[#e8c477]/34 bg-[#020706]/82 p-2 shadow-[0_30px_100px_rgba(0,0,0,0.50)] backdrop-blur">
              <div className="pointer-events-none absolute inset-2 z-10 rounded-lg border border-[#d8b56d]/24" />
              <div className="pointer-events-none absolute left-1/2 top-5 z-10 h-20 w-20 -translate-x-1/2 rounded-full border border-[#f5d48f]/54 bg-[#d8b56d]/12 shadow-[0_0_46px_rgba(216,181,109,0.34)]" />
              <div className="relative h-[340px] overflow-hidden rounded-lg bg-[#020706] sm:h-[430px] lg:h-[520px]">
                <img
                  src={MAYA_ASSET_URL}
                  alt="금빛 마야 달력판과 밤하늘의 시간 문양"
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,transparent_0%,rgba(2,7,6,0.02)_36%,rgba(2,7,6,0.68)_100%)]" />
                <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_50%_0%,rgba(216,181,109,0.28),transparent_64%)]" />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent_0%,rgba(2,7,6,0.94)_100%)]" />
                <div className="absolute bottom-0 left-1/2 h-16 w-[74%] -translate-x-1/2 bg-[#0e1f18]/78 [clip-path:polygon(12%_100%,22%_70%,32%_70%,42%_40%,58%_40%,68%_70%,78%_70%,88%_100%)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-[#d8b56d]/18 bg-[#04100d]/88 px-4 py-6 shadow-[inset_0_1px_0_rgba(245,239,217,0.06)] backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8b56d]/78">Maya Date</p>
              <h2 className={`mt-1 text-2xl font-black text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>날짜 선택</h2>
            </div>
            <p className="rounded-full border border-[#d8b56d]/28 bg-[#081812]/82 px-4 py-2 text-xs font-black text-[#f5d48f]">
              선택된 시간 좌표 {formatIsoDate(selected)}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="block text-sm font-bold text-[#eee5cb]">
              연도
              <SelectShell>
                <select
                  value={selected.year}
                  aria-label="마야 달력 연도 선택"
                  onChange={(event) => updateSelected({ year: Number(event.target.value) })}
                  className="mt-2 w-full appearance-none rounded-lg border border-[#d8b56d]/22 bg-[#020706] px-4 py-3 text-sm font-black text-[#f8efd2] outline-none transition focus:border-[#d8b56d] focus-visible:ring-2 focus-visible:ring-[#d8b56d]/70"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
              </SelectShell>
            </label>
            <label className="block text-sm font-bold text-[#eee5cb]">
              월
              <SelectShell>
                <select
                  value={selected.month}
                  aria-label="마야 달력 월 선택"
                  onChange={(event) => updateSelected({ month: Number(event.target.value) })}
                  className="mt-2 w-full appearance-none rounded-lg border border-[#d8b56d]/22 bg-[#020706] px-4 py-3 text-sm font-black text-[#f8efd2] outline-none transition focus:border-[#d8b56d] focus-visible:ring-2 focus-visible:ring-[#d8b56d]/70"
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>{month}월</option>
                  ))}
                </select>
              </SelectShell>
            </label>
            <label className="block text-sm font-bold text-[#eee5cb]">
              일
              <SelectShell>
                <select
                  value={selected.day}
                  aria-label="마야 달력 일 선택"
                  onChange={(event) => updateSelected({ day: Number(event.target.value) })}
                  className="mt-2 w-full appearance-none rounded-lg border border-[#d8b56d]/22 bg-[#020706] px-4 py-3 text-sm font-black text-[#f8efd2] outline-none transition focus:border-[#d8b56d] focus-visible:ring-2 focus-visible:ring-[#d8b56d]/70"
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
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#d8b56d]/36 bg-[linear-gradient(135deg,#6f3d24_0%,#c8923d_52%,#d8c697_100%)] px-5 py-3 text-sm font-black text-[#15120c] shadow-[0_16px_40px_rgba(200,146,61,0.20)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d48f] motion-reduce:transition-none md:w-auto"
              >
                <Sun className="h-4 w-4" />
                오늘의 마야 코드
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
        <div className="space-y-6">
          <MayaDateSummaryCard result={selectedResult} />

          <section className="relative overflow-hidden rounded-lg border border-[#d8b56d]/24 bg-[#04100d]/90 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.30)] backdrop-blur sm:p-5">
            <div className="pointer-events-none absolute inset-0 opacity-44 [background-image:radial-gradient(circle_at_50%_0%,rgba(216,181,109,0.18),transparent_34%),linear-gradient(90deg,rgba(216,181,109,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(111,191,154,0.06)_1px,transparent_1px)] [background-size:auto,34px_34px,34px_34px]" />
            <div className="pointer-events-none absolute inset-3 rounded-lg border border-[#d8b56d]/14" />
            <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border border-[#d8b56d]/12" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8b56d]/78">Maya Month Grid</p>
                <h2 className={`mt-1 text-2xl font-black text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>{selected.year}년 {selected.month}월 마야 달력</h2>
                <p className="mt-1 text-sm text-[#ddd2b5]">각 날짜의 Tzolk&apos;in과 Haab 흐름을 선명하게 확인합니다.</p>
              </div>
              <p className="rounded-full border border-[#d8b56d]/28 bg-[#081812]/78 px-3 py-1 text-xs font-black text-[#f5d48f]">
                선택된 시간 좌표 {formatIsoDate(selected)}
              </p>
            </div>

            <div className="relative mt-5 grid grid-cols-7 gap-1 text-center text-xs font-black text-[#d8b56d]/88 sm:gap-2">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="py-2">{weekday}</div>
              ))}
            </div>

            <div className="relative grid grid-cols-7 gap-1 sm:gap-2">
              {monthCells.map((cell) => (
                <button
                  key={cell.calendar.gregorian.iso}
                  type="button"
                  aria-label={`${cell.calendar.gregorian.labelKo} 선택, Tzolk'in ${cell.calendar.tzolkin.label}, Haab ${cell.calendar.haab.label}`}
                  aria-pressed={cell.isSelected}
                  onClick={() => setSelected(cell.date)}
                  className={[
                    "group relative min-h-[70px] overflow-hidden rounded-lg border p-1.5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d48f]/85 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none sm:min-h-[108px] sm:p-3",
                    cell.isSelected
                      ? "border-[#f0c76b] bg-[radial-gradient(circle_at_82%_16%,rgba(240,199,107,0.26),transparent_32%),linear-gradient(180deg,rgba(35,28,13,0.90),rgba(5,16,13,0.94))] shadow-[0_0_0_1px_rgba(240,199,107,0.60),0_0_42px_rgba(216,181,109,0.28),inset_0_0_34px_rgba(240,199,107,0.14)]"
                      : "border-[#d8b56d]/18 bg-[#071611]/78 hover:border-[#e8c477]/50 hover:bg-[#0c2119]/86",
                    cell.inCurrentMonth ? "opacity-100" : "opacity-45",
                  ].join(" ")}
                >
                  <span className="pointer-events-none absolute inset-0 opacity-42 [background-image:linear-gradient(135deg,rgba(216,181,109,0.06)_1px,transparent_1px),radial-gradient(1px_1px_at_20%_30%,rgba(245,239,217,0.16),transparent)] [background-size:18px_18px,44px_44px]" />
                  <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 motion-reduce:transition-none [background-image:radial-gradient(circle_at_50%_0%,rgba(216,181,109,0.18),transparent_44%)]" />
                  {cell.isSelected ? (
                    <span className="pointer-events-none absolute right-2 top-2 h-9 w-9 rounded-full border border-[#f5d48f]/78 bg-[#d8b56d]/16 shadow-[0_0_24px_rgba(216,181,109,0.36)]" />
                  ) : null}
                  <span className="flex items-center justify-between gap-1">
                    <span className={`relative text-sm font-black text-[#f8efd2] sm:text-base ${CODE_FONT_CLASS}`}>{cell.date.day}</span>
                    {cell.isToday ? (
                      <span className="relative inline-flex items-center gap-1 rounded-full border border-[#6fbf9a]/38 bg-[#0d3227]/56 px-1.5 py-0.5 text-[9px] font-black text-[#f0efd5] sm:text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f5d48f] shadow-[0_0_10px_rgba(216,181,109,0.65)]" />
                        <span className="hidden sm:inline">오늘</span>
                        <span className="sr-only sm:hidden">오늘</span>
                      </span>
                    ) : null}
                  </span>
                  <span className={`relative mt-2 block text-[10px] font-bold leading-4 text-[#f5d48f] sm:text-xs ${CODE_FONT_CLASS}`}>
                    Tz {cell.calendar.tzolkin.label}
                  </span>
                  <span className={`relative hidden text-[10px] font-bold leading-4 text-[#ddd2b5] sm:block sm:text-xs ${CODE_FONT_CLASS}`}>
                    Haab {cell.calendar.haab.label}
                  </span>
                  <span className={`relative block text-[9px] font-bold leading-3 text-[#ddd2b5] sm:hidden ${CODE_FONT_CLASS}`}>
                    H {cell.calendar.haab.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <MayaPromptGeneratorCard result={selectedResult} />
          <section className="relative overflow-hidden rounded-lg border border-[#d8b56d]/18 bg-[#04100d]/82 p-5 text-sm leading-7 text-[#e6dcc1] shadow-[0_18px_60px_rgba(0,0,0,0.26)] backdrop-blur">
            <div className="pointer-events-none absolute inset-0 opacity-28 [background-image:linear-gradient(135deg,rgba(216,181,109,0.07)_1px,transparent_1px)] [background-size:26px_26px]" />
            <h2 className={`relative text-lg font-black text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>참고</h2>
            <p className="relative mt-3">
              선택한 날짜는 마야 달력 표기로 정리되며, 생성된 프롬프트와 외부 AI 답변은 엔터테인먼트 목적의 참고용입니다.
              중요한 의사결정은 현실적인 검토와 전문가 상담을 함께 진행하세요.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
