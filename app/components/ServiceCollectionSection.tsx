"use client";

import { useMemo, useState } from "react";
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

  const visibleItems = useMemo(() => {
    if (!open) return [];
    if (expandedMobile) return items;
    return items.slice(0, 6);
  }, [open, expandedMobile, items]);

  const hasMore = items.length > 6;

  return (
    <section className="rounded-2xl border border-violet-300/20 bg-slate-900/55 p-4 shadow-[0_10px_26px_rgba(9,15,32,0.35)] md:p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left"
      >
        <div className="mb-1 flex items-center gap-2">
          {icon ? <span className="text-xl">{icon}</span> : null}
          <h2 className="text-lg font-extrabold tracking-tight text-slate-50">{title}</h2>
        </div>
        <p className="text-sm font-semibold text-violet-200">{subtitle}</p>
        <p className="mt-1 text-sm leading-6 text-slate-300">{description}</p>
        <div className="mt-3 inline-flex items-center rounded-full border border-violet-300/40 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-100">
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
                onClick={() => setExpandedMobile((v) => !v)}
                className="rounded-full border border-slate-400/35 bg-slate-800/70 px-4 py-1.5 text-xs font-semibold text-slate-200"
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
