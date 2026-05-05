"use client";

interface ZiweiRemedyChecklistProps {
  remedies: string[];
  actionItems: string[];
  routine7Days: string[];
  routine30Days: string[];
}

export default function ZiweiRemedyChecklist({
  remedies,
  actionItems,
  routine7Days,
  routine30Days,
}: ZiweiRemedyChecklistProps) {
  return (
    <section className="rounded-2xl border border-emerald-200/20 bg-emerald-200/5 p-4">
      <h3 className="text-sm font-black text-emerald-100">개운 실천 체크리스트</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-bold text-emerald-200">오늘부터 실천할 3가지</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {actionItems.slice(0, 3).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-200">핵심 개운법</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {remedies.slice(0, 3).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
          <p className="text-xs font-bold text-slate-300">7일 루틴</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {routine7Days.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
          <p className="text-xs font-bold text-slate-300">30일 루틴</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {routine30Days.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
