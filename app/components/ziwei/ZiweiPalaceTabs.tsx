"use client";

import { ZIWEI_SECTIONS, ZiweiSectionId } from "@/app/_lib/ziwei-types";

interface ZiweiPalaceTabsProps {
  activeSection: ZiweiSectionId;
  onChange: (section: ZiweiSectionId) => void;
}

export default function ZiweiPalaceTabs({ activeSection, onChange }: ZiweiPalaceTabsProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ZIWEI_SECTIONS.map((section) => {
        const active = activeSection === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition ${
              active
                ? "border-cyan-300/80 bg-cyan-200/15 text-cyan-100 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
                : "border-white/10 bg-[#0d1831]/70 text-slate-300 hover:border-cyan-200/40 hover:bg-[#112042]"
            }`}
            aria-label={`${section.title} 이동`}
          >
            {section.title}
          </button>
        );
      })}
    </nav>
  );
}
