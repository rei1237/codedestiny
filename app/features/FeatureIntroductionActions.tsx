"use client";
import { useEffect, useRef, useState } from "react";
import { useServerPrice } from "@/app/hooks/useServerPrice";
import { REFUND_LINE, REFUND_POLICY_HREF } from "@/lib/marketing/home-concerns.mjs";
import { revealCraftedTranscript, type VisualDetail } from "@/js/feature-detail-panels.mjs";

export default function FeatureIntroductionActions({ detail }: { detail: Pick<VisualDetail, "featureKey" | "featureKeyTo" | "priceFrom" | "accessType" | "href" | "ctaLabel"> }) {
  const price = useServerPrice({ featureKey: detail.featureKey || undefined });
  const upper = useServerPrice({ featureKey: detail.priceFrom ? undefined : detail.featureKeyTo || undefined });
  const [sticky, setSticky] = useState(false);
  const bottom = useRef<HTMLElement>(null);
  const range = detail.priceFrom && price.amountKRW > 0 ? `${price.label}부터` : detail.featureKeyTo && upper.amountKRW > price.amountKRW ? `${price.label} ~ ${upper.label}` : price.label;
  const label = detail.accessType === "free" ? "무료" : price.loading || (!detail.priceFrom && detail.featureKeyTo && upper.loading) ? "이용 가격 확인 중" : range || "시작 화면에서 이용 조건 확인";
  useEffect(() => {
    document.addEventListener('error', revealCraftedTranscript, true);
    document.querySelectorAll<HTMLImageElement>('.craftedDetail img').forEach(image => {
      if (image.complete && image.naturalWidth === 0) revealCraftedTranscript({ target: image });
    });
    return () => document.removeEventListener('error', revealCraftedTranscript, true);
  }, []);
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
      {detail.accessType !== "free" && <p className="fortuneAction__refund">{REFUND_LINE} <a href={REFUND_POLICY_HREF}>환불 기준</a></p>}
    </section>
    <div className="fortuneSticky fortuneAction" hidden={!sticky}><div><p>{label}</p><a href={detail.href}>{detail.ctaLabel}</a></div></div>
  </>;
}
