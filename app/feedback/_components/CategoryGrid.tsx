"use client";

import { m } from "framer-motion";

import { buildFeedbackCategories, type FeedbackCategoryId } from "../_lib/categories";
import { useFeedbackCopy } from "../_lib/copy";
import { INK, INK_MUTED } from "../_lib/styles";

interface CategoryGridProps {
  selected: FeedbackCategoryId | null;
  onSelect: (id: FeedbackCategoryId) => void;
}

export default function CategoryGrid({ selected, onSelect }: CategoryGridProps) {
  const copy = useFeedbackCopy();
  return (
    <div
      role="radiogroup"
      aria-label={copy.categoryGroupAriaLabel}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5"
    >
      {buildFeedbackCategories(copy).map((category) => {
        const isSelected = selected === category.id;
        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(category.id)}
            className={`relative isolate flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b31955] dark:focus-visible:ring-[#c4b5fd] ${
              isSelected
                ? "border-transparent"
                : "border-[rgba(216,63,120,0.16)] bg-white/70 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
            }`}
          >
            {/* layoutId 로 선택 하이라이트가 칸 사이를 미끄러진다. layout 기능은 domMax 에 포함되어 있다. */}
            {isSelected && (
              <m.span
                layoutId="cd-feedback-category-glow"
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-2xl bg-[#b31955]/10 ring-2 ring-[#b31955] dark:bg-[#c4b5fd]/[0.14] dark:ring-[#c4b5fd]"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span aria-hidden="true" className="text-2xl leading-none">{category.emoji}</span>
            <span className={`text-sm font-bold leading-tight ${INK}`}>{category.label}</span>
            <span className={`text-[11px] leading-tight ${INK_MUTED}`}>{category.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
