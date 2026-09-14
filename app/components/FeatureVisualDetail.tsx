"use client";

import { useEffect, useState, useRef, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { loadFeatureDetail, renderFeatureDetailPanels, type VisualDetail } from "@/js/feature-detail-panels.mjs";
import "@/styles/feature-visual-detail.css";
import { shareIntroductionFromButton } from "@/js/feature-introduction-share.mjs";

export default function FeatureVisualDetail({ keys, enabled, onReady, onRequestConversion, heroAction }: { keys: string[]; enabled: boolean; onReady?: (ready: boolean) => void; onRequestConversion?: () => void; heroAction?: ReactNode }) {
  const [detail, setDetail] = useState<VisualDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const identity = JSON.stringify(keys);
  const conversionPrompt = Boolean(onRequestConversion);
  const markup = useMemo(() => ({ __html: detail ? renderFeatureDetailPanels(detail, { conversionPrompt }) : "" }), [detail, conversionPrompt]);
  const hostRef = useRef<HTMLDivElement>(null);
  const [actionSlot, setActionSlot] = useState<Element | null>(null);
  useEffect(() => { setActionSlot(hostRef.current?.querySelector('[data-fortune-hero-action]') || null); onReady?.(Boolean(detail)); }, [detail, onReady]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setDetail(null);
    setFailed(false);
    onReady?.(false);
    loadFeatureDetail(JSON.parse(identity)).then(value => { if (alive) { setDetail(value); setFailed(!value); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [enabled, identity, attempt, onReady]);
  if (!enabled) return null;
  if (failed) return <button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 rounded-xl border border-white/30 px-4 py-2 text-sm">상세 내용 다시 불러오기</button>;
  if (!detail) return null;
  return <div ref={hostRef} data-feature-visual-detail={detail.slug} onClick={event => {
    const shareButton = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-feature-share]");
    if (shareButton) { void shareIntroductionFromButton(shareButton, detail); return; }
    if ((event.target as HTMLElement).closest('[data-feature-conversion-request]')) onRequestConversion?.();
  }}>
    <div dangerouslySetInnerHTML={markup} />
    {actionSlot && heroAction ? createPortal(heroAction, actionSlot) : null}
  </div>;
}
