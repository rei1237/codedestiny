"use client";

type Props = {
  auraType: string;
  auraMaterial: string;
  energyColor: string;
};

export default function BiasDestinyAuraBadge({ auraType, auraMaterial, energyColor }: Props) {
  const color = String(energyColor || "#C4B5FD").trim() || "#C4B5FD";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white/90">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }} aria-hidden />
      <span>팬라이트 오라</span>
      <span className="text-[#FDE68A]">{auraType}</span>
      <span className="text-white/65">· {auraMaterial}</span>
    </div>
  );
}
