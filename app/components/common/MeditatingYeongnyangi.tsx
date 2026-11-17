"use client";
export const MEDITATING_YEONGNYANGI = "/images/brand/yeongnyangi-meditating-v2.webp";
/** One decoded sprite: no frame swaps, layout shifts or blocking image awaits. */
export function MeditatingYeongnyangi({ compact = false }: { compact?: boolean }) {
  return <div className={"cd-meditating-cat" + (compact ? " cd-meditating-cat--compact" : "")} aria-hidden="true">
    <img src={MEDITATING_YEONGNYANGI} width={480} height={480} alt="" decoding="async" />
  </div>;
}
