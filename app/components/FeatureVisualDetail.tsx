"use client";

import { useEffect, useState } from "react";
import { loadFeatureDetail, renderFeatureDetailPanels, type VisualDetail } from "@/js/feature-detail-panels.mjs";
import "@/styles/feature-visual-detail.css";
import { shareIntroductionFromButton } from "@/js/feature-introduction-share.mjs";

export default function FeatureVisualDetail({ keys, enabled, onReady, onRequestConversion }: { keys: string[]; enabled: boolean; onReady?: (ready: boolean) => void; onRequestConversion?: () => void }) {
  const [detail, setDetail] = useState<VisualDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const identity = JSON.stringify(keys);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setDetail(null);
    setFailed(false);
    onReady?.(false);
    loadFeatureDetail(JSON.parse(identity)).then(value => { if (alive) { setDetail(value); onReady?.(Boolean(value)); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [enabled, identity, attempt, onReady]);
  if (!enabled) return null;
  if (failed) return <button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 rounded-xl border border-white/30 px-4 py-2 text-sm">상세 이미지 다시 불러오기</button>;
  if (!detail) return null;
  return <div data-feature-visual-detail={detail.slug} onClick={event => {
    const shareButton = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-feature-share]");
    if (shareButton) { void shareIntroductionFromButton(shareButton, detail); return; }
    if ((event.target as HTMLElement).closest('[data-feature-conversion-request]')) onRequestConversion?.();
  }}>
    <div dangerouslySetInnerHTML={{ __html: renderFeatureDetailPanels(detail, { conversionPrompt: Boolean(onRequestConversion) }) }} />
  </div>;
}
