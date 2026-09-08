"use client";

import { useEffect, useState } from "react";
import { loadFeatureDetail, renderFeatureDetailPanels, type VisualDetail } from "@/js/feature-detail-panels.mjs";
import "@/styles/feature-visual-detail.css";

export default function FeatureVisualDetail({ keys, enabled, onReady }: { keys: string[]; enabled: boolean; onReady?: (ready: boolean) => void }) {
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
  return <div data-feature-visual-detail={detail.slug}>
    <div dangerouslySetInnerHTML={{ __html: renderFeatureDetailPanels(detail) }} />
    <a href={`/features/${detail.slug}/`} className="mb-5 inline-flex min-h-11 items-center rounded-xl border border-white/30 px-4 py-2 text-sm text-amber-100">상세페이지 새 화면에서 보기</a>
  </div>;
}
