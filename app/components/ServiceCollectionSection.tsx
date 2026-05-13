"use client";

import { useMemo, useState, useRef } from "react";
import type { ReactNode } from "react";
import ServiceCard, { type ServiceCardModel } from "./ServiceCard";
import IconBadge from "./ui/IconBadge";
import SectionTitle from "./ui/SectionTitle";

type Props = {
  title: string;
  subtitle: string;
  description: string;
  icon?: ReactNode;
  items: ServiceCardModel[];
  defaultOpen?: boolean;
};

export default function ServiceCollectionSection({
  title,
  subtitle,
  description,
  icon,
  items,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [expandedMobile, setExpandedMobile] = useState(false);

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

  const wrapClick = (cb: () => void) => (e: React.MouseEvent) => {
    if (isScrolling) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    cb();
  };

  const visibleItems = useMemo(() => {
    if (!open) return [];
    if (expandedMobile) return items;
    return items.slice(0, 6);
  }, [open, expandedMobile, items]);

  const hasMore = items.length > 6;

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-sky-100/20 bg-[radial-gradient(circle_at_14%_12%,rgba(251,191,36,0.2),transparent_28%),radial-gradient(circle_at_86%_22%,rgba(125,211,252,0.16),transparent_34%),linear-gradient(158deg,rgba(6,18,44,0.96),rgba(17,36,74,0.94)_55%,rgba(27,33,73,0.95))] p-4 shadow-[0_24px_56px_rgba(4,10,29,0.52)] md:p-6">
      <div className="pointer-events-none absolute -left-16 top-6 h-40 w-40 rounded-full bg-amber-200/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-14 bottom-4 h-44 w-44 rounded-full bg-sky-300/15 blur-3xl" aria-hidden />

      <button
        type="button"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onClick={wrapClick(() => setOpen((v) => !v))}
        aria-expanded={open}
        className="relative z-10 w-full text-left"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <SectionTitle icon={icon} title={title} />
          <IconBadge icon={<span>{items.length}</span>} label="Cards" tone="sky" />
        </div>
        <p className="text-sm font-semibold text-sky-100/95">{subtitle}</p>
        <p className="mt-1 text-sm leading-6 text-slate-100/80">{description}</p>
        <div className="mt-4 inline-flex items-center rounded-full border border-slate-100/20 bg-slate-950/35 px-3 py-1 text-xs font-semibold text-slate-100/90">
          {open ? "접기" : "열기"}
        </div>
      </button>

      {open ? (
        <>
          <div className="relative z-10 mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleItems.map((item) => (
              <ServiceCard key={`${title}-${item.title}`} item={item} />
            ))}
          </div>

          {hasMore ? (
            <div className="mt-4 flex justify-center md:hidden">
              <button
                type="button"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onClick={wrapClick(() => setExpandedMobile((v) => !v))}
                className="rounded-full border border-sky-100/40 bg-slate-900/55 px-4 py-1.5 text-xs font-semibold text-sky-50"
              >
                {expandedMobile ? "핵심 카드만 보기" : "더 보기"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
