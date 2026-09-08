"use client";

import type { ReactNode } from "react";
import { ArrowDown, Sparkles } from "lucide-react";
import styles from "./ExpertConsultationFrame.module.css";

export type ExpertConsultationTheme =
  | "vedic" | "karma" | "moon" | "lifeBook" | "ziwei" | "astrology"
  | "love" | "nakshatra" | "fusion" | "island" | "yeoni" | "neo";

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

export function ExpertStickyCta({ label, targetId, price, theme }: ExpertStickyCtaProps) {
  return (
    <a className={`${styles.stickyCta} ${styles[theme]}`} href={`#${targetId}`}>
      <span>{price}</span>
      <strong>{label}<ArrowDown size={16} aria-hidden="true" /></strong>
    </a>
  );
}
