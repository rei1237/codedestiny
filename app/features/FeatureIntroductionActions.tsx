"use client";
import { useEffect, useRef, useState } from "react";
import { useServerPrice } from "@/app/hooks/useServerPrice";
import type { VisualDetail } from "@/js/feature-detail-panels.mjs";

export default function FeatureIntroductionActions({ detail }: { detail: Pick<VisualDetail, "featureKey" | "featureKeyTo" | "accessType" | "href" | "ctaLabel"> }) {
  const price = useServerPrice({ featureKey: detail.featureKey || undefined });
  const upper = useServerPrice({ featureKey: detail.featureKeyTo || undefined });
  const [sticky, setSticky] = useState(false);
  const bottom = useRef<HTMLElement>(null);
  const range = detail.featureKeyTo && upper.amountKRW > price.amountKRW ? `${price.label} ~ ${upper.label}` : price.label;
  const label = detail.accessType === "free" ? "무료" : price.loading || (detail.featureKeyTo && upper.loading) ? "이용 가격 확인 중" : range || "시작 화면에서 이용 조건 확인";
  useEffect(() => {
    const slot = document.querySelector<HTMLElement>('[data-fortune-hero-action]');
    if (!slot) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const current = document.querySelector('[data-fortune-hero-action]');
      if (!current) return;
      const bottomTop = bottom.current?.getBoundingClientRect().top ?? Infinity;
      setSticky(current.getBoundingClientRect().bottom < 0 && bottomTop >= window.innerHeight);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [detail.href]);
  return <>
    <section ref={bottom} aria-label="기능 시작하기" className="featureIntroductionActions fortuneAction">
      <p role="status">{label}</p><a href={detail.href}>{detail.ctaLabel}</a>
    </section>
    <div className="fortuneSticky fortuneAction" hidden={!sticky}><div><p>{label}</p><a href={detail.href}>{detail.ctaLabel}</a></div></div>
  </>;
}
