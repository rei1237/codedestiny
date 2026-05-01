import Link from "next/link";

type Badge = {
  text: string;
  tone?: "free" | "coin" | "new" | "soft";
};

export type ServiceCardModel = {
  title: string;
  description: string;
  href: string;
  emoji?: string;
  badges?: Badge[];
  cta?: string;
};

function badgeClass(tone: Badge["tone"]) {
  if (tone === "free") return "border-emerald-300/40 bg-emerald-500/15 text-emerald-100";
  if (tone === "coin") return "border-amber-300/40 bg-amber-500/20 text-amber-100";
  if (tone === "new") return "border-fuchsia-300/40 bg-fuchsia-500/20 text-fuchsia-100";
  return "border-slate-400/30 bg-slate-700/40 text-slate-200";
}

export default function ServiceCard({ item }: { item: ServiceCardModel }) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-violet-300/20 bg-gradient-to-br from-slate-900/90 to-slate-800/70 p-4 shadow-[0_12px_28px_rgba(8,12,28,0.42)] transition hover:-translate-y-0.5 hover:border-violet-300/45 hover:shadow-[0_16px_40px_rgba(76,29,149,0.3)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold leading-6 text-slate-100">
          {item.emoji ? <span className="mr-1">{item.emoji}</span> : null}
          {item.title}
        </h3>
      </div>

      <p className="mb-3 min-h-[44px] text-xs leading-5 text-slate-300">{item.description}</p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(item.badges || []).map((badge) => (
          <span
            key={`${item.title}-${badge.text}`}
            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass(badge.tone)}`}
          >
            {badge.text}
          </span>
        ))}
      </div>

      <div className="mt-auto">
        <Link
          href={item.href}
          className="inline-flex w-full items-center justify-center rounded-xl border border-violet-300/45 bg-violet-500/20 px-3 py-2 text-xs font-semibold text-violet-100 transition group-hover:bg-violet-500/30"
        >
          {item.cta || "바로가기"}
        </Link>
      </div>
    </article>
  );
}
