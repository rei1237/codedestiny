"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import type { SukuyoCalendarDay, SukuyoCalendarMonth } from "@/lib/sukuyo-calendar";

type CalendarResponse = SukuyoCalendarMonth & {
  ok?: boolean;
  error?: string;
};

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getKstCurrentMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return {
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    month: Number.isFinite(month) ? month : new Date().getMonth() + 1,
  };
}

function shiftMonth(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(total / 12),
    month: (total % 12) + 1,
  };
}

function parseMonthInput(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function formatSelectedDate(day: SukuyoCalendarDay) {
  return `${day.date} ${day.weekday}요일`;
}

export default function SukuyoCalendarClient() {
  const initialMonth = useMemo(() => getKstCurrentMonth(), []);
  const [cursor, setCursor] = useState(initialMonth);
  const [calendar, setCalendar] = useState<SukuyoCalendarMonth | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const cacheRef = useRef<Map<string, SukuyoCalendarMonth>>(new Map());

  const monthKey = `${String(cursor.year).padStart(4, "0")}-${pad2(cursor.month)}`;

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const cacheKey = `${cursor.year}-${cursor.month}`;
    const cached = cacheRef.current.get(cacheKey);

    if (cached && reloadKey === 0) {
      setCalendar(cached);
      setLoading(false);
      setError(null);
      return () => {
        alive = false;
        controller.abort();
      };
    }

    setLoading(true);
    setError(null);

    fetch(`/api/sukuyo/calendar?year=${cursor.year}&month=${cursor.month}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as CalendarResponse | null;
        if (!response.ok || !payload || payload.ok === false) {
          throw new Error(payload?.error || "숙요 달력을 불러오지 못했습니다.");
        }
        return payload as SukuyoCalendarMonth;
      })
      .then((payload) => {
        if (!alive) return;
        cacheRef.current.set(cacheKey, payload);
        setCalendar(payload);
      })
      .catch((fetchError) => {
        if (!alive || fetchError?.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "숙요 달력을 불러오지 못했습니다.");
        setCalendar(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [cursor.year, cursor.month, reloadKey]);

  useEffect(() => {
    if (!calendar) return;
    setSelectedDate((current) => {
      if (current && calendar.days.some((day) => day.date === current)) return current;
      return calendar.days.find((day) => day.isToday)?.date || calendar.days[0]?.date || null;
    });
  }, [calendar]);

  const selectedDay = useMemo(() => {
    if (!calendar || !selectedDate) return null;
    return calendar.days.find((day) => day.date === selectedDate) || null;
  }, [calendar, selectedDate]);

  const calendarCells = useMemo(() => {
    if (!calendar) return [];
    const blanks = Array.from({ length: calendar.firstWeekdayIndex }, (_, index) => ({ type: "blank" as const, key: `blank-${index}` }));
    const days = calendar.days.map((day) => ({ type: "day" as const, key: day.date, day }));
    return [...blanks, ...days];
  }, [calendar]);

  const move = (delta: number) => {
    setCursor((current) => shiftMonth(current.year, current.month, delta));
    setReloadKey(0);
  };

  const handleMonthChange = (value: string) => {
    const next = parseMonthInput(value);
    if (!next) return;
    setCursor(next);
    setReloadKey(0);
  };

  const retry = () => {
    cacheRef.current.delete(`${cursor.year}-${cursor.month}`);
    setReloadKey((value) => value + 1);
  };

  return (
    <main className="min-h-screen bg-[#050817] text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-cyan-200">SUKUYO LUNAR CALENDAR</p>
            <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">27숙 달력</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {cursor.year}년 {cursor.month}월, 날짜마다 머무는 숙의 기운을 달빛처럼 펼칩니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => move(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.15] bg-white/[0.08] text-slate-100 transition hover:border-cyan-200/70 hover:bg-cyan-300/10"
              title="이전 달"
              aria-label="이전 달"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 text-sm text-slate-100">
              <CalendarDays className="h-4 w-4 text-cyan-200" aria-hidden="true" />
              <input
                type="month"
                value={monthKey}
                min="1900-01"
                max="2100-12"
                onChange={(event) => handleMonthChange(event.target.value)}
                className="h-8 min-w-[124px] bg-transparent text-sm font-semibold text-white outline-none [color-scheme:dark]"
                aria-label="달 선택"
              />
            </label>
            <button
              type="button"
              onClick={() => move(1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.15] bg-white/[0.08] text-slate-100 transition hover:border-cyan-200/70 hover:bg-cyan-300/10"
              title="다음 달"
              aria-label="다음 달"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={retry}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200/25 bg-amber-200/10 text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-200/20"
              title="새로고침"
              aria-label="새로고침"
            >
              <RefreshCw className={classNames("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <section className="rounded-lg border border-white/[0.12] bg-white/[0.055] p-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-4" aria-label="27숙 월간 달력">
            <div className="grid grid-cols-7 gap-1 border-b border-white/10 pb-2 sm:gap-2">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="text-center text-xs font-semibold text-slate-400">
                  {label}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-2" aria-busy="true">
                {Array.from({ length: 35 }, (_, index) => (
                  <div key={index} className="min-h-[86px] rounded-lg border border-white/[0.08] bg-white/[0.045] sm:min-h-[112px]" />
                ))}
              </div>
            ) : error ? (
              <div className="mt-3 flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-rose-300/20 bg-rose-950/20 p-6 text-center">
                <p className="text-sm font-semibold text-rose-100">{error}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-4 rounded-lg border border-rose-200/30 bg-rose-200/10 px-4 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-200/20"
                >
                  다시 보기
                </button>
              </div>
            ) : calendar && calendar.days.length ? (
              <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-2">
                {calendarCells.map((cell) =>
                  cell.type === "blank" ? (
                    <div key={cell.key} className="min-h-[86px] rounded-lg border border-transparent sm:min-h-[112px]" aria-hidden="true" />
                  ) : (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => setSelectedDate(cell.day.date)}
                      className={classNames(
                        "group flex min-h-[86px] flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition sm:min-h-[112px] sm:p-2",
                        cell.day.date === selectedDate
                          ? "border-cyan-200/80 bg-cyan-300/[0.15] shadow-lg shadow-cyan-950/30"
                          : "border-white/10 bg-slate-950/30 hover:border-cyan-200/40 hover:bg-white/[0.08]",
                        cell.day.isToday && "ring-1 ring-amber-200/80"
                      )}
                      aria-pressed={cell.day.date === selectedDate}
                    >
                      <span className="flex w-full items-center justify-between gap-1">
                        <span className="text-sm font-semibold text-white sm:text-base">{cell.day.day}</span>
                        {cell.day.isToday ? (
                          <span className="rounded-md border border-amber-200/40 bg-amber-200/[0.15] px-1.5 py-0.5 text-[10px] font-semibold text-amber-100">
                            오늘
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 sm:text-xs">{cell.day.weekday}요일</span>
                      <span className="mt-1 text-sm font-semibold leading-tight text-cyan-100 sm:text-base">{cell.day.koreanName}</span>
                      <span className="text-[11px] leading-tight text-slate-300 sm:text-xs">{cell.day.hanjaName}</span>
                      <span className="mt-auto line-clamp-2 text-[10px] leading-4 text-slate-400 sm:text-xs">
                        {cell.day.keywords.slice(0, 3).join(" · ")}
                      </span>
                    </button>
                  )
                )}
              </div>
            ) : (
              <div className="mt-3 flex min-h-[420px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-slate-300">
                표시할 달빛 흐름이 없습니다.
              </div>
            )}
          </section>

          <aside className="rounded-lg border border-cyan-200/[0.18] bg-[linear-gradient(145deg,rgba(8,13,33,0.96),rgba(18,28,56,0.88)_48%,rgba(42,30,63,0.86))] p-4 shadow-2xl shadow-black/30 lg:sticky lg:top-5 lg:max-h-[calc(100vh-40px)] lg:overflow-auto" aria-label="선택한 날짜의 숙요 흐름">
            {selectedDay ? (
              <div className="flex flex-col gap-4">
                <div className="border-b border-white/10 pb-4">
                  <p className="text-xs font-semibold tracking-[0.18em] text-amber-100">SELECTED MOON</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">{selectedDay.koreanName}</h2>
                  <p className="mt-1 text-sm text-slate-300">{selectedDay.hanjaName} · {selectedDay.japaneseName}</p>
                  <p className="mt-3 text-sm font-medium text-cyan-100">{formatSelectedDate(selectedDay)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedDay.keywords.map((keyword) => (
                      <span key={keyword} className="rounded-md border border-white/[0.12] bg-white/[0.08] px-2.5 py-1 text-xs font-semibold text-slate-100">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                <DetailBlock title="숙의 핵심 성향" body={selectedDay.core} />
                <DetailBlock title="오늘 사용 포인트" body={selectedDay.usagePoint} accent="cyan" />
                <DetailBlock title="주의할 결" body={selectedDay.caution} accent="rose" />
                <DetailBlock title="연애와 관계" body={selectedDay.love} accent="pink" />
                <DetailBlock title="일과 금전" body={selectedDay.workMoney} accent="amber" />

                <div className="border-t border-amber-200/25 pt-4">
                  <p className="text-xs font-semibold tracking-[0.14em] text-amber-100">ONE LINE</p>
                  <p className="mt-2 text-base font-semibold leading-7 text-white">{selectedDay.advice}</p>
                </div>

                <div className="border-t border-white/10 pt-3 text-xs leading-5 text-slate-400">
                  음력 {selectedDay.lunarDate.isLeapMonth ? "윤" : ""}
                  {selectedDay.lunarDate.month}월 {selectedDay.lunarDate.day}일 기준
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center text-center text-sm text-slate-300">
                날짜를 고르면 숙의 흐름이 열립니다.
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function DetailBlock({ title, body, accent = "slate" }: { title: string; body: string; accent?: "slate" | "cyan" | "rose" | "pink" | "amber" }) {
  const accentClass = {
    slate: "border-white/10 text-slate-100",
    cyan: "border-cyan-200/25 text-cyan-50",
    rose: "border-rose-200/25 text-rose-50",
    pink: "border-pink-200/25 text-pink-50",
    amber: "border-amber-200/25 text-amber-50",
  }[accent];

  return (
    <section className={classNames("border-t pt-4", accentClass)}>
      <h3 className="text-sm font-semibold tracking-normal">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-200">{body}</p>
    </section>
  );
}
