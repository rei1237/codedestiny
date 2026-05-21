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
  { key: "resource", label: "학습/통찰 (인성)", color: "bg-cyan-500" },
  { key: "peer", label: "독립/자율 (비겁)", color: "bg-emerald-500" },
] as const;

export default function FptiTenGodsPanel({ scores }: Props) {
  const max = Math.max(...Object.values(scores), 1);
  const strongest = ITEMS.reduce((acc, cur) => (scores[cur.key] > scores[acc.key] ? cur : acc), ITEMS[0]);

  return (
    <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
      <h4 className="text-sm font-semibold text-slate-100">내 행동 패턴</h4>
      <p className="mt-1 text-xs text-slate-300">가장 강한 성향: {strongest.label}</p>
      <div className="mt-3 space-y-2">
        {ITEMS.map((item) => {
          const value = scores[item.key];
          const width = Math.max(6, Math.round((value / max) * 100));

          return (
            <div key={item.key}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                <span>{item.label}</span>
                <span>{value.toFixed(1)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
