"use client";

interface ZiweiStarFieldProps {
  dense?: boolean;
}

export default function ZiweiStarField({ dense = false }: ZiweiStarFieldProps) {
  const count = dense ? 42 : 24;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#030712] via-[#071a33] to-[#010409]" />
      <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_14%_20%,rgba(56,189,248,0.2),transparent_42%),radial-gradient(circle_at_82%_16%,rgba(250,204,21,0.16),transparent_38%),radial-gradient(circle_at_60%_84%,rgba(34,197,94,0.1),transparent_48%)]" />
      <div className="absolute inset-0 opacity-40 [background:linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.04)_46%,transparent_52%)]" />
      {Array.from({ length: count }).map((_, idx) => {
        const left = (idx * 23 + 9) % 100;
        const top = (idx * 37 + 17) % 100;
        const delay = `${(idx % 7) * 0.8}s`;
        const duration = `${4 + (idx % 7)}s`;
        return (
          <span
            key={idx}
            className="absolute h-[2px] w-[2px] rounded-full bg-slate-100/85 motion-safe:animate-pulse"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              animationDelay: delay,
              animationDuration: duration,
              boxShadow: idx % 5 === 0
                ? "0 0 14px rgba(250,204,21,0.65)"
                : "0 0 11px rgba(125,211,252,0.65)",
            }}
          />
        );
      })}
    </div>
  );
}
