"use client";
import { useState } from "react";
import { FUSION_ART_KEYS, FUSION_DOMAIN_ART_KEYS } from "@/lib/fusion-premium-report";
import { useFusionPremiumCopy } from "./_lib/premium-copy";

/**
 * Nine editorial scenes in one cached atlas. Never calculation evidence.
 * v2 영역별 장은 두 번째 아틀라스(3×3, 8칸 + 다섯 마스터 단체 장면)를 쓴다.
 */
export function FusionChapterArt({ systemKey, closing = false }: { systemKey: string; closing?: boolean }) {
  const copy = useFusionPremiumCopy();
  const [failed, setFailed] = useState(false);
  const domainIndex = FUSION_DOMAIN_ART_KEYS.indexOf(systemKey);
  const index = domainIndex >= 0 ? domainIndex : FUSION_ART_KEYS.indexOf(systemKey);
  const atlas = domainIndex >= 0 ? "/images/fusion-fortune/premium-domains-v1.webp" : "/images/fusion-fortune/premium-chapters-v1.webp";
  if (failed || index < 0) return null;
  return <figure className="mx-auto my-8 w-full max-w-[360px]" data-html2canvas-ignore="true" data-fusion-art={systemKey}>
    <div className="relative aspect-square overflow-hidden rounded-[var(--cd-r-section)]">
      <img src={atlas} alt="" width={1254} height={1254} loading="lazy" decoding="async"
        className="absolute !h-[300%] !w-[300%] !max-w-none" style={{ left: `${-(index % 3) * 100}%`, top: `${-Math.floor(index / 3) * 100}%` }} onError={() => setFailed(true)} />
    </div>
    {!closing && <figcaption className="mt-2 text-center text-xs text-[var(--fx-ink-3)]">{copy.art}</figcaption>}
  </figure>;
}
