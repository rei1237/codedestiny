"use client";
import { useState } from "react";
import { FUSION_ART_KEYS } from "@/lib/fusion-premium-report";
import { type FusionSystemKey } from "./fusionOrbs";
import { useFusionPremiumCopy } from "./_lib/premium-copy";

/** Nine editorial scenes in one cached atlas. Never calculation evidence. */
export function FusionChapterArt({ systemKey, closing = false }: { systemKey: FusionSystemKey | "fusion" | "action" | "choice"; closing?: boolean }) {
  const copy = useFusionPremiumCopy();
  const [failed, setFailed] = useState(false);
  const index = FUSION_ART_KEYS.indexOf(systemKey);
  if (failed || index < 0) return null;
  return <figure className="mx-auto my-8 w-full max-w-[360px]" data-html2canvas-ignore="true" data-fusion-art={systemKey}>
    <div className="relative aspect-square overflow-hidden rounded-[var(--cd-r-section)]">
      <img src="/images/fusion-fortune/premium-chapters-v1.webp" alt="" width={1254} height={1254} loading="lazy" decoding="async"
        className="absolute !h-[300%] !w-[300%] !max-w-none" style={{ left: `${-(index % 3) * 100}%`, top: `${-Math.floor(index / 3) * 100}%` }} onError={() => setFailed(true)} />
    </div>
    {!closing && <figcaption className="mt-2 text-center text-xs text-[var(--fx-ink-3)]">{copy.art}</figcaption>}
  </figure>;
}
