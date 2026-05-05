"use client";

interface ZiweiStarFieldProps {
  dense?: boolean;
}

export default function ZiweiStarField({ dense = false }: ZiweiStarFieldProps) {
  const count = dense ? 28 : 16;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950" />
      <div className="absolute inset-0 opacity-60 [background:radial-gradient(circle_at_20%_15%,rgba(251,191,36,0.12),transparent_40%),radial-gradient(circle_at_85%_18%,rgba(125,211,252,0.14),transparent_38%),radial-gradient(circle_at_45%_80%,rgba(196,181,253,0.14),transparent_45%)]" />
      {Array.from({ length: count }).map((_, idx) => {
        const left = (idx * 17 + 13) % 100;
        const top = (idx * 31 + 11) % 100;
        const delay = `${(idx % 7) * 0.8}s`;
        const duration = `${5 + (idx % 6)}s`;
        return (
          <span
            key={idx}
            className="absolute h-[2px] w-[2px] rounded-full bg-slate-100/80 motion-safe:animate-pulse"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              animationDelay: delay,
              animationDuration: duration,
              boxShadow: "0 0 10px rgba(226,232,240,0.65)",
            }}
          />
        );
      })}
    </div>
  );
}
