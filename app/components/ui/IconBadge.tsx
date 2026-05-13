import type { ReactNode } from "react";

type IconBadgeProps = {
  icon: ReactNode;
  label?: string;
  tone?: "violet" | "rose" | "emerald" | "amber" | "sky" | "slate";
};

const TONE_CLASS: Record<NonNullable<IconBadgeProps["tone"]>, string> = {
  violet: "border-violet-200/40 bg-violet-200/10 text-violet-100",
  rose: "border-rose-200/45 bg-rose-200/10 text-rose-100",
  emerald: "border-emerald-200/45 bg-emerald-200/10 text-emerald-100",
  amber: "border-amber-200/45 bg-amber-200/10 text-amber-100",
  sky: "border-sky-200/45 bg-sky-200/10 text-sky-100",
  slate: "border-slate-200/40 bg-slate-200/10 text-slate-100",
};

export default function IconBadge({ icon, label, tone = "violet" }: IconBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${TONE_CLASS[tone]}`}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center">{icon}</span>
      {label ? <span>{label}</span> : null}
    </span>
  );
}
