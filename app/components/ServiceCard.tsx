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
  if (tone === "free") return "border-emerald-300/50 bg-emerald-500/18 text-emerald-100";
  if (tone === "coin") return "border-amber-300/55 bg-amber-500/25 text-amber-50";
  if (tone === "new") return "border-fuchsia-300/45 bg-fuchsia-500/18 text-fuchsia-100";
  return "border-violet-200/30 bg-violet-900/45 text-violet-100";
}

export default function ServiceCard({ item }: { item: ServiceCardModel }) {
  return (
    <article className="group flex h-full flex-col rounded-[18px] border border-violet-200/25 bg-[linear-gradient(145deg,rgba(22,10,46,0.92),rgba(37,18,72,0.86))] p-4 shadow-[0_12px_28px_rgba(26,13,57,0.35)] transition hover:-translate-y-0.5 hover:border-violet-200/55 hover:shadow-[0_18px_40px_rgba(55,28,109,0.36)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold leading-6 text-violet-50">
          {item.emoji ? <span className="mr-1">{item.emoji}</span> : null}
          {item.title}
        </h3>
      </div>

      <p className="mb-3 min-h-[44px] text-xs leading-5 text-violet-100/80">{item.description}</p>

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
          className="inline-flex w-full items-center justify-center rounded-xl border border-violet-200/45 bg-[linear-gradient(135deg,rgba(102,63,195,0.9),rgba(84,115,221,0.88))] px-3 py-2 text-xs font-semibold text-white transition group-hover:brightness-110"
        >
          {item.cta || "바로가기"}
        </Link>
      </div>
    </article>
  );
}
