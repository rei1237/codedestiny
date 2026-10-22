"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, Sparkles } from "lucide-react";
import styles from "./ExpertConsultationFrame.module.css";

export type ExpertConsultationTheme =
  | "vedic" | "karma" | "moon" | "lifeBook" | "ziwei" | "astrology"
  | "love" | "nakshatra" | "fusion" | "island" | "yeoni" | "neo"
  | "yun" | "musung" | "newYear";

export type ExpertConsultationPoint = {
  title: string;
  description: string;
};

type ExpertHeroProps = {
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  targetId: string;
  theme: ExpertConsultationTheme;
};

type ExpertValueCardsProps = {
  points: ExpertConsultationPoint[];
  theme: ExpertConsultationTheme;
};

type ExpertStickyCtaProps = {
  label: string;
  targetId: string;
  /** 같은 행동을 하는 본문 버튼(히어로 CTA)의 id. 그 버튼이 화면에 보이는 동안은 고정 CTA 를 띄우지 않는다. */
  watchId?: string;
  price: ReactNode;
  theme: ExpertConsultationTheme;
};

/** Display-only consultation primitives. Form submission and billing remain with each route. */
export function ExpertHero({ label, title, description, ctaLabel, targetId, theme }: ExpertHeroProps) {
  return (
    <div className={`${styles.hero} ${styles[theme]}`}>
      <span className={styles.label}><Sparkles size={14} />{label}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <a className={styles.heroCta} href={`#${targetId}`}>
        {ctaLabel}<ArrowDown size={16} aria-hidden="true" />
      </a>
    </div>
  );
}

export function ExpertValueCards({ points, theme }: ExpertValueCardsProps) {
  return (
    <section className={`${styles.valueSection} ${styles[theme]}`} aria-label="상담에서 확인하는 흐름">
      {points.map((point, index) => (
        <article className={styles.valueCard} key={point.title}>
          <span aria-hidden="true">0{index + 1}</span>
          <strong>{point.title}</strong>
          <p>{point.description}</p>
        </article>
      ))}
    </section>
  );
}

/**
 * 폼이 아직 아래에 있을 때만 뜨는 고정 CTA(DESIGN.md §5 Button Tiers — 고정 CTA 는 조건부).
 * 예전에는 항상 떠 있어서 폼 제출 버튼과 같은 화면에 채움 CTA 가 둘 보였고,
 * 하단 내비(.cd-mnav)에 겹쳤다. 폼이 화면에 들어오거나 지나가면 숨긴다.
 * watchId 를 주면 같은 행동의 본문 버튼이 화면 밖일 때만 뜬다(DESIGN.md:245 — 라벨도 그 버튼과 같게 넘긴다).
 */
export function ExpertStickyCta({ label, targetId, watchId, price, theme }: ExpertStickyCtaProps) {
  const [formBelow, setFormBelow] = useState(false);
  const [bodyCtaInView, setBodyCtaInView] = useState(false);
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setFormBelow(!entry.isIntersecting && entry.boundingClientRect.top > 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);
  useEffect(() => {
    const watched = watchId ? document.getElementById(watchId) : null;
    if (!watched || typeof IntersectionObserver === "undefined") {
      setBodyCtaInView(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setBodyCtaInView(entry.isIntersecting));
    observer.observe(watched);
    return () => observer.disconnect();
  }, [watchId]);
  if (!formBelow || bodyCtaInView) return null;
  return (
    <a className={`${styles.stickyCta} ${styles[theme]}`} href={`#${targetId}`}>
      <span>{price}</span>
      <strong>{label}<ArrowDown size={16} aria-hidden="true" /></strong>
    </a>
  );
}
