import Link from "next/link";
import { useState, useRef } from "react";

type Badge = {
  text: string;
  tone?: "free" | "coin" | "new" | "soft";
};

export type ServiceCardModel = {
  title: string;
  description: string;
  href: string;
  emoji?: string;
  image?: string; // 신규: 카드 꾸미기용 이미지
  badges?: Badge[];
  cta?: string;
};

function badgeClass(tone: Badge["tone"]) {
  if (tone === "free") return "border-emerald-200/45 bg-emerald-400/15 text-emerald-50";
  if (tone === "coin") return "border-amber-200/55 bg-amber-400/20 text-amber-50";
  if (tone === "new") return "border-pink-200/55 bg-pink-400/20 text-pink-50";
  return "border-sky-100/30 bg-sky-900/35 text-sky-50";
}

export default function ServiceCard({ item }: { item: ServiceCardModel }) {
  const [isScrolling, setIsScrolling] = useState(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setIsScrolling(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartPos.current.x;
    const dy = e.touches[0].clientY - touchStartPos.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      setIsScrolling(true);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // 스크롤 중에는 클릭(이동)이 발생하지 않도록 방어
    if (isScrolling) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-slate-100/15 bg-[linear-gradient(160deg,rgba(8,18,42,0.94),rgba(16,31,62,0.92)_56%,rgba(27,29,62,0.92))] p-4 shadow-[0_14px_34px_rgba(5,11,29,0.45)] transition duration-300 hover:-translate-y-1 hover:border-sky-100/40 hover:shadow-[0_22px_48px_rgba(7,18,46,0.58)]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_18%_0%,rgba(250,204,21,0.18),transparent_58%)] opacity-90" aria-hidden />
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="relative z-10 text-sm font-extrabold leading-6 text-slate-50">
          {item.emoji ? <span className="mr-1">{item.emoji}</span> : null}
          {item.title}
        </h3>
      </div>

      {item.image && (
        <div className="relative mb-3 overflow-hidden rounded-xl border border-slate-100/15">
          <img src={item.image} alt={item.title} className="h-28 w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent" aria-hidden />
        </div>
      )}

      <p className="mb-3 min-h-[44px] text-xs leading-5 text-slate-100/78">{item.description}</p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(item.badges || []).map((badge) => (
          <span
            key={`${item.title}-${badge.text}`}
            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur ${badgeClass(badge.tone)}`}
          >
            {badge.text}
          </span>
        ))}
      </div>

      <div className="mt-auto">
        <Link
          href={item.href}
          onClick={handleClick}
          className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-sky-100/35 bg-[linear-gradient(135deg,rgba(56,189,248,0.32),rgba(30,64,175,0.38))] px-3 py-2 text-xs font-semibold text-sky-50 transition duration-300 group-hover:border-sky-100/55 group-hover:bg-[linear-gradient(135deg,rgba(56,189,248,0.42),rgba(37,99,235,0.46))]"
        >
          {item.cta || "바로가기"}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}
