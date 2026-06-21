"use client";

import { CalendarDays, CheckCircle2, CircleDot, Clipboard, Compass, Info, Sparkles } from "lucide-react";
import type { MayaReadingResult } from "@/lib/maya/maya-reading";
import MayaCalendarWheel from "./MayaCalendarWheel";

type MayaResultCardProps = {
  result: MayaReadingResult;
  onCopy: () => void;
  copyStatus?: string;
};

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1 text-xs font-bold text-amber-100">
          {item}
        </span>
      ))}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[8px] border border-white/12 bg-white/[0.07] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur">
      <div className="flex items-center gap-2 text-amber-100">
        {icon}
        <h3 className="text-base font-black">{title}</h3>
      </div>
      <div className="mt-4 text-sm leading-7 text-slate-100/88">{children}</div>
    </article>
  );
}

export default function MayaResultCard({ result, onCopy, copyStatus }: MayaResultCardProps) {
  const modeLabel = result.mode === "birth" ? "내 마야 나왈" : "오늘의 마야점";

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 text-slate-50 sm:px-6 lg:px-8" aria-live="polite">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-200/80">{modeLabel}</p>
          <h2 className="mt-1 text-2xl font-black md:text-3xl">{result.calendar.tzolkin.label} · {result.daySign.koreanName}</h2>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-200/45 bg-amber-200 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-100"
        >
          <Clipboard className="h-4 w-4" />
          결과 복사
        </button>
      </div>
      {copyStatus ? <p className="mb-4 text-sm font-bold text-teal-200">{copyStatus}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="relative overflow-hidden rounded-[8px] border border-amber-200/25 bg-[#111027] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(250,204,21,0.2),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(45,212,191,0.14),transparent_26%),linear-gradient(145deg,rgba(49,46,129,0.34),rgba(15,23,42,0.12))]" />
          <div className="relative">
            <p className="text-sm font-bold text-amber-100/70">마야 코드</p>
            <p className="mt-2 text-5xl font-black tracking-0 text-amber-100 md:text-6xl">{result.calendar.tzolkin.label}</p>
            <p className="mt-2 text-sm font-bold text-slate-200/78">Tzolk’in Number + Day Sign</p>
            <div className="mt-6">
              <MayaCalendarWheel activeIndex={result.calendar.tzolkin.signIndex} />
            </div>
          </div>
        </article>

        <div className="grid gap-4">
          <SectionCard icon={<Sparkles className="h-5 w-5" />} title="나왈 해석">
            <div className="space-y-4">
              <div>
                <p className="text-xl font-black text-amber-100">{result.daySign.koreanName} · {result.daySign.symbolTitle}</p>
                <div className="mt-3"><ChipList items={result.daySign.coreKeywords} /></div>
              </div>
              <p>{result.summary}</p>
            </div>
          </SectionCard>

          <SectionCard icon={<CircleDot className="h-5 w-5" />} title="13수 리듬">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-amber-200/40 bg-amber-200/14 text-2xl font-black text-amber-100">
                {result.tone.number}
              </span>
              <div>
                <p className="font-black text-amber-100">{result.tone.title}</p>
                <p className="mt-1">{result.tone.meaning}</p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SectionCard icon={<CalendarDays className="h-5 w-5" />} title="상세 달력">
          <dl className="grid gap-3">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
              <dt className="text-slate-300">Gregorian Date</dt>
              <dd className="font-bold text-slate-50">{result.calendar.gregorianDate}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
              <dt className="text-slate-300">Haab</dt>
              <dd className="font-bold text-slate-50">{result.calendar.haab.label}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
              <dt className="text-slate-300">Long Count</dt>
              <dd className="font-bold text-slate-50">{result.calendar.longCount.label}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-300">Correlation</dt>
              <dd className="font-bold text-slate-50">GMT {result.calendar.correlation}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard icon={<Compass className="h-5 w-5" />} title={result.mode === "birth" ? "나에게 맞는 행동" : "오늘 잘 맞는 행동"}>
          <div className="space-y-4">
            <div>
              <p className="font-black text-amber-100">강점</p>
              <div className="mt-2"><ChipList items={result.strengths} /></div>
            </div>
            <div>
              <p className="font-black text-amber-100">주의할 점</p>
              <div className="mt-2"><ChipList items={result.cautions} /></div>
            </div>
            <ul className="space-y-2">
              {result.actions.map((action) => (
                <li key={action} className="flex gap-2">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-teal-200" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </SectionCard>

        <SectionCard icon={<Info className="h-5 w-5" />} title="흐름 안내">
          <div className="space-y-3">
            <p><strong className="text-amber-100">관계 흐름</strong><br />{result.relationshipFlow}</p>
            <p><strong className="text-amber-100">일·금전 흐름</strong><br />{result.workFlow}</p>
            <p><strong className="text-amber-100">감정 관리</strong><br />{result.emotionFocus}</p>
            <p><strong className="text-amber-100">피해야 할 태도</strong><br />{result.avoid}</p>
          </div>
        </SectionCard>
      </div>

      <article className="mt-4 rounded-[8px] border border-amber-200/20 bg-amber-100/10 p-5 text-sm leading-7 text-amber-50/88">
        이 리딩은 마야 sacred calendar의 날짜 구조와 상징을 바탕으로 한 현대적 해석형 콘텐츠입니다. 중요한 법률, 의료, 재무, 계약 판단은 현실적인 검토와 전문가 상담을 함께 진행하세요.
      </article>

      <details className="mt-4 rounded-[8px] border border-white/12 bg-white/[0.06] p-5 text-sm text-slate-100/86">
        <summary className="cursor-pointer font-black text-amber-100">계산 기준 보기</summary>
        <dl className="mt-4 grid gap-2">
          <div className="flex flex-wrap justify-between gap-2"><dt>Correlation</dt><dd>GMT 584283</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Calendar</dt><dd>Tzolk’in / Haab / Long Count</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>해석 방식</dt><dd>날짜 구조와 상징을 바탕으로 한 현대적 리딩</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>LLM 사용 여부</dt><dd>1차 버전은 사용하지 않음</dd></div>
          {result.timezoneLabel ? <div className="flex flex-wrap justify-between gap-2"><dt>기준 시간대</dt><dd>{result.timezoneLabel}</dd></div> : null}
        </dl>
      </details>

      <p className="mt-5 rounded-[8px] border border-teal-200/20 bg-teal-200/10 p-4 text-base font-bold leading-7 text-teal-50">
        {result.message}
      </p>
    </section>
  );
}
