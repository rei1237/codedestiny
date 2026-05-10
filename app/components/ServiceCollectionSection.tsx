"use client";

import { useMemo, useState, useRef } from "react";
import ServiceCard, { type ServiceCardModel } from "./ServiceCard";

type Props = {
  title: string;
  subtitle: string;
  description: string;
  icon?: string;
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
    <section className="rounded-[22px] border border-violet-300/30 bg-[linear-gradient(145deg,rgba(29,15,63,0.9),rgba(41,23,84,0.84))] p-4 shadow-[0_14px_32px_rgba(27,14,59,0.3)] md:p-5">
      <button
        type="button"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onClick={wrapClick(() => setOpen((v) => !v))}
        aria-expanded={open}
        className="w-full text-left"
      >
        <div className="mb-1 flex items-center gap-2">
          {icon ? <span className="text-xl">{icon}</span> : null}
          <h2 className="text-lg font-extrabold tracking-tight text-violet-50">{title}</h2>
        </div>
        <p className="text-sm font-semibold text-violet-200">{subtitle}</p>
        <p className="mt-1 text-sm leading-6 text-violet-100/80">{description}</p>
        <div className="mt-3 inline-flex items-center rounded-full border border-violet-200/45 bg-[rgba(77,50,140,0.5)] px-3 py-1 text-xs font-semibold text-violet-100">
          {open ? "접기" : "열기"}
        </div>
      </button>

      {open ? (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                className="rounded-full border border-violet-200/45 bg-[rgba(75,48,136,0.62)] px-4 py-1.5 text-xs font-semibold text-violet-50"
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
