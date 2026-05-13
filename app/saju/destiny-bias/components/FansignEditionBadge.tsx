"use client";

export default function FansignEditionBadge({
  editionLabel,
  destinyGrade,
}: {
  editionLabel: string;
  destinyGrade: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border border-fuchsia-200/60 bg-fuchsia-300/20 px-3 py-1 text-xs font-bold text-fuchsia-50">
        {editionLabel}
      </span>
      <span className="rounded-full border border-cyan-200/60 bg-cyan-300/20 px-3 py-1 text-xs font-bold text-cyan-50">
        FANSIGN EDITION
      </span>
      <span className="rounded-full border border-amber-200/60 bg-amber-300/20 px-3 py-1 text-xs font-bold text-amber-50">
        {destinyGrade}
      </span>
    </div>
  );
}
