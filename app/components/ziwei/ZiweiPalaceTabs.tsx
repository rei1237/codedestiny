"use client";

import { ZIWEI_SECTIONS, ZiweiSectionId } from "@/app/_lib/ziwei-types";

interface ZiweiPalaceTabsProps {
  activeSection: ZiweiSectionId;
  onChange: (section: ZiweiSectionId) => void;
  unlocked: boolean;
}

const FREE_SECTIONS = new Set<ZiweiSectionId>(["overview", "ming"]);

export default function ZiweiPalaceTabs({ activeSection, onChange, unlocked }: ZiweiPalaceTabsProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto py-2">
      {ZIWEI_SECTIONS.map((section) => {
        const canRead = unlocked || FREE_SECTIONS.has(section.id);
        const active = activeSection === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition ${
              active
                ? "border-amber-300 bg-amber-200/20 text-amber-100"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
            aria-label={`${section.title} 이동`}
          >
            {section.title}
            {!canRead ? " · 잠금" : ""}
          </button>
        );
      })}
    </nav>
  );
}
