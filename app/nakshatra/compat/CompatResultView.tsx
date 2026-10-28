"use client";

import { useNakshatraCopy } from "../_lib/copy";

interface CompatItem { key: string; label: string; score: number; scoreRange?: number[]; max: number; note?: string }
interface PersonSummary { nakshatraKo: string | null; sukuyoKo: string | null; sukuyoHan: string | null }

export interface CompatResult {
  ok: boolean;
  resultId?: string;
  calculationVersion?: string;
  uncertainty?: { note:string; possibleNakshatras:string[] }[];
  personA: PersonSummary;
  personB: PersonSummary;
  india: { totalRange?: number[]; orientation?: string; total: number; max: number; pct: number; verdict: string; items: CompatItem[]; doshas: string[] };
  dongyang: {
    relationTypeHan: string; relationType: string; distanceLabel: string;
    chemistryScore: number; stabilityScore: number; conflictScore: number;
    roleActionGuide: { meAction: string; otherAction: string; resetLine: string };
  } | null;
  unified: { discussion?: string[]; blendedPct?: number; indiaPct?: number; eastPct?: number; verdict: string; convergence: string; divergence: string };
}

function Bar({ label, score, scoreRange, max, note }: { label: string; score: number; scoreRange?: number[]; max: number; note?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((score / max) * 100)));
  return (
    <div className="border-b border-white/10 py-2.5 last:border-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-slate-100">{label}</span>
        <span className="text-sm font-bold text-amber-100">{scoreRange && scoreRange[0] !== scoreRange[1] ? scoreRange.join("–") : score}<span className="text-xs text-slate-400">/{max}</span></span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-amber-300/80" style={{ width: `${pct}%` }} />
      </div>
      {note && <p className="mt-1 break-keep text-xs text-slate-300">{note}</p>}
    </div>
  );
}

export default function CompatResultView({ result, onReset }: { result: CompatResult; onReset: () => void }) {
  const copy = useNakshatraCopy();
  const { personA, personB, india, dongyang, unified } = result;
  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="rounded-2xl border border-amber-200/20 bg-white/[0.03] p-6 text-center">
        <h2 className="mt-3 break-keep text-2xl font-bold text-slate-50 md:text-3xl">
          <span className="text-blue-100">{personA.sukuyoKo}({personA.sukuyoHan}) · {personA.nakshatraKo}</span>
          <span className="mx-2 text-slate-300">·</span>
          <span className="text-amber-100">{personB.sukuyoKo}({personB.sukuyoHan}) · {personB.nakshatraKo}</span>
        </h2>
        <p className="mt-3 text-lg font-bold text-rose-100">{unified.verdict}{unified.blendedPct != null && ` · ${unified.blendedPct}${copy.compatUnifiedScoreSuffix}`}</p>
        {!result.calculationVersion && <p className="mt-1 text-xs text-slate-300">{copy.compatIndiaShortLabel} {unified.indiaPct} · {copy.compatEastShortLabel} {unified.eastPct}</p>}
      </header>

      {result.uncertainty?.map((item,i)=><p key={i} className="mt-4 text-sm leading-7 text-amber-100">{i+1}번째 입력: {item.note} 가능한 달 구간: {item.possibleNakshatras.join(' · ')}</p>)}
      <section className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-500/[0.06] p-5 md:p-6">
        <h3 className="text-base font-bold text-rose-100">{copy.compatUnifiedTitle.replace(/[⟡◈☯🕉\uFE0F]/gu, "").trim()}</h3>
        <p className="mt-2 break-keep text-sm leading-7 text-slate-100">{unified.convergence}</p>
        <p className="mt-2 break-keep text-sm leading-7 text-slate-100">{unified.divergence}</p>
        {unified.discussion && <p className="mt-3 text-sm leading-7 text-slate-200">함께 이야기할 주제: {unified.discussion.join(" · ")}</p>}
      </section>

      <section className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/[0.05] p-5 md:p-6">
        <div className="flex items-baseline justify-between">
          <h3 className="text-base font-bold text-amber-100">{copy.compatIndiaSectionTitle.replace(/[⟡◈☯🕉\uFE0F]/gu, "").trim()}</h3>
          <span className="text-sm font-bold text-amber-100">{india.totalRange && india.totalRange[0] !== india.totalRange[1] ? india.totalRange.join("–") : india.total}<span className="text-xs text-slate-300">/{india.max}</span></span>
        </div>
        <p className="mt-1 text-sm text-slate-200">{india.verdict}</p><p className="mt-2 text-xs leading-6 text-slate-300">{india.orientation}</p>
        <div className="mt-3">{india.items.map((it) => <Bar key={it.key} label={it.label} score={it.score} scoreRange={it.scoreRange} max={it.max} note={it.note} />)}</div>
        {india.doshas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {india.doshas.map((d) => <span key={d} className="rounded-full border border-rose-300/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-100">{d}</span>)}
          </div>
        )}
      </section>

      {dongyang && (
        <section className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-5 md:p-6">
          <h3 className="text-base font-bold text-blue-100">{copy.compatEastSectionTitle.replace(/[⟡◈☯🕉\uFE0F]/gu, "").trim()}</h3>
          <p className="mt-1 text-sm text-slate-200">
            {copy.compatRelationTypeLabel} <span className="font-semibold text-blue-100">{dongyang.relationType}({dongyang.relationTypeHan})</span> · {dongyang.distanceLabel}
          </p>
          {!result.calculationVersion && <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3"><p className="text-xs text-slate-300">{copy.compatChemistryLabel}</p><p className="mt-1 text-lg font-bold text-blue-100">{dongyang.chemistryScore}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3"><p className="text-xs text-slate-300">{copy.compatStabilityLabel}</p><p className="mt-1 text-lg font-bold text-blue-100">{dongyang.stabilityScore}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3"><p className="text-xs text-slate-300">{copy.compatConflictLabel}</p><p className="mt-1 text-lg font-bold text-rose-200">{dongyang.conflictScore}</p></div>
          </div>
          }
          {dongyang.roleActionGuide && (
            <div className="mt-3 space-y-1.5 text-sm leading-7 text-slate-100">
              <p><span className="font-semibold text-blue-100">{copy.compatMyActionLabel}</span>{dongyang.roleActionGuide.meAction}</p>
              <p><span className="font-semibold text-blue-100">{copy.compatOtherActionLabel}</span>{dongyang.roleActionGuide.otherAction}</p>
              {dongyang.roleActionGuide.resetLine && <p className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-slate-200">{dongyang.roleActionGuide.resetLine}</p>}
            </div>
          )}
        </section>
      )}

      {result.calculationVersion && <p className="mt-5 text-xs leading-6 text-slate-300">쿠타 표: <a className="underline" href="https://saravali.github.io/astrology/koota_yoni.html">Saravali / Maitreya</a> · CC BY-SA 4.0. 방향에 따른 차이를 보존한 표이며, 학파별 규칙과 점수는 다를 수 있습니다.</p>}
      <button onClick={onReset} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-amber-100 transition hover:border-amber-200/50">
        {copy.compatResetButton}
      </button>
      <p className="mt-3 text-center text-xs leading-6 text-slate-300">
        {result.calculationVersion ? "일본 구력 숙요는 JST 삭일·동지월 11월을 기준으로 하며, 13개월인 해의 첫 무중기월을 윤달로 정하고 본월의 숙 기점을 사용합니다. 베다는 Lahiri 항성황경과 Saravali 쿠타 규칙으로 비교합니다. 점수는 관계 성공률이나 건강·임신 가능성을 뜻하지 않습니다." : copy.compatMethodologyNote}
      </p>
    </div>
  );
}
