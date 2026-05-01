import Link from "next/link";

const shortcuts = [
  { label: "사주 팔자", href: "/saju/basic", emoji: "☯" },
  { label: "오늘의 운세", href: "/tarot/year", emoji: "📅" },
  { label: "타로", href: "/tarot", emoji: "🔮" },
  { label: "점성술", href: "/astrology/cosmic", emoji: "🌌" },
  { label: "자미두수", href: "/ziwei/chart", emoji: "✨" },
  { label: "궁합", href: "/saju/love-simulation", emoji: "💞" },
];

export default function QuickServiceShortcuts() {
  return (
    <section className="rounded-2xl border border-violet-300/20 bg-slate-900/55 p-4">
      <h2 className="text-base font-extrabold text-slate-50">Quick Service Shortcuts</h2>
      <p className="mt-1 text-sm text-slate-300">자주 찾는 운세 서비스를 바로 시작하세요.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {shortcuts.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-500/35 bg-slate-800/70 px-3 py-3 text-xs font-semibold text-slate-100 transition hover:border-violet-300/45 hover:bg-violet-500/15"
          >
            <span>{s.emoji}</span>
            <span>{s.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
