"use client";

type Props = {
  scores: {
    expression: number;
    officer: number;
    wealth: number;
    resource: number;
    peer: number;
  };
};

const ITEMS = [
  { key: "expression", label: "표현/창조 (식상)", color: "bg-fuchsia-500" },
  { key: "officer", label: "규범/책임 (관성)", color: "bg-indigo-500" },
  { key: "wealth", label: "성과/실리 (재성)", color: "bg-amber-500" },
  { key: "resource", label: "학습/통찰 (인성)", color: "bg-sky-500" },
  { key: "peer", label: "독립/자율 (비겁)", color: "bg-emerald-500" },
] as const;

export default function FptiTenGodsPanel({ scores }: Props) {
  const max = Math.max(...Object.values(scores), 1);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900">행동축 근거: 십성 그룹 점수</h4>
      <div className="mt-3 space-y-2">
        {ITEMS.map((item) => {
          const value = scores[item.key];
          const width = Math.max(6, Math.round((value / max) * 100));

          return (
            <div key={item.key}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                <span>{item.label}</span>
                <span>{value.toFixed(1)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
