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
    <section className="rounded-[22px] border border-violet-300/30 bg-[linear-gradient(145deg,rgba(32,17,69,0.93),rgba(43,24,88,0.86))] p-4 shadow-[0_18px_36px_rgba(30,14,66,0.28)]">
      <h2 className="text-base font-extrabold text-violet-50">빠른 서비스 바로가기</h2>
      <p className="mt-1 text-sm text-violet-100/75">자주 찾는 운세 서비스를 빠르게 시작하세요.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {shortcuts.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-200/25 bg-[rgba(18,10,41,0.72)] px-3 py-3 text-xs font-semibold text-violet-50 transition hover:border-violet-200/55 hover:bg-[rgba(69,42,126,0.55)]"
          >
            <span>{s.emoji}</span>
            <span>{s.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
