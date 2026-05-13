import type { ReactNode } from "react";

type SectionTitleProps = {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export default function SectionTitle({ icon, eyebrow, title, description, align = "left" }: SectionTitleProps) {
  const center = align === "center";
  return (
    <div className={center ? "text-center" : "text-left"}>
      {eyebrow ? <p className="text-xs font-semibold tracking-[0.16em] text-violet-200/85">{eyebrow}</p> : null}
      <div className={center ? "mt-1 flex items-center justify-center gap-2" : "mt-1 flex items-center gap-2"}>
        {icon ? <span className="inline-flex items-center justify-center text-violet-100">{icon}</span> : null}
        <h2 className="text-[1.06rem] font-black tracking-tight text-slate-50 md:text-lg">{title}</h2>
      </div>
      {description ? <p className="mt-1 text-sm leading-6 text-slate-100/80">{description}</p> : null}
    </div>
  );
}
