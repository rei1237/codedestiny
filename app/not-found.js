import Link from "next/link";

const QUICK_LINKS = [
  { href: "/saju/basic",          label: "사주 분석",     emoji: "🌸" },
  { href: "/tarot/mingri",        label: "명리 타로",     emoji: "🔮" },
  { href: "/ziwei/chart",         label: "자미두수",      emoji: "⭐" },
  { href: "/astrology/cosmic",    label: "서양 점성술",   emoji: "🌙" },
  { href: "/oracle/hwatu-life",   label: "화투 인생 패",  emoji: "🎴" },
  { href: "/oracle/royal-tea",    label: "찻잎 점",       emoji: "☕" },
  { href: "/insights",            label: "운명 인사이트", emoji: "📖" },
];

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-5xl font-bold tracking-tight">404</h1>
      <p className="text-neutral-600 dark:text-neutral-400 text-lg">
        요청하신 페이지를 찾을 수 없습니다.
      </p>
      <p className="text-sm text-neutral-500 dark:text-neutral-500">
        주소를 다시 확인하거나, 아래 서비스에서 원하는 페이지를 찾아보세요.
      </p>
      <div className="flex flex-wrap justify-center gap-3 max-w-md mt-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <span>{link.emoji}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
      <Link
        href="/"
        className="mt-2 rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
