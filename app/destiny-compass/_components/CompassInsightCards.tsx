"use client";

import { useState, type CSSProperties } from "react";
import type { DirectionField } from "../_engine/types";
import { useDestinyCompassCopy } from "../_lib/copy";
import styles from "./map.module.css";

interface CompassInsightCardsProps {
  field: DirectionField;
}

export function CompassInsightCards({ field }: CompassInsightCardsProps) {
  const copy = useDestinyCompassCopy();
  const [visibleCount, setVisibleCount] = useState(1);
  const short = (key: keyof typeof copy.directionShortLabel) => copy.directionShortLabel[key];
  const cards = [
    {
      key: "current",
      label: copy.insightCards.current.label,
      title: short(field.primary.key),
      body: copy.insightCards.current.body(short(field.primary.key)),
    },
    {
      key: "caution",
      label: copy.insightCards.caution.label,
      title: short(field.blockedArea.key),
      body: copy.insightCards.caution.body(short(field.blockedArea.key)),
    },
    {
      key: "opportunity",
      label: copy.insightCards.opportunity.label,
      title: short(field.strongArea.key),
      body: copy.insightCards.opportunity.body(short(field.strongArea.key)),
    },
  ] as const;
  const canReveal = visibleCount < cards.length;

  return (
    <section className={styles.insightRoot} aria-labelledby="cd-compass-insight-title">
      <header className={styles.insightHead}>
        <span className={styles.reportKicker}>Compass Brief</span>
        <h2 id="cd-compass-insight-title" className={styles.reportTitle}>{copy.insightTitle}</h2>
      </header>

      <div className={styles.insightCards}>
        {cards.slice(0, visibleCount).map((card, index) => (
          <article key={card.key} className={styles.insightCard} style={{ "--reveal-index": index } as CSSProperties}>
            <span className={styles.insightLabel}>{card.label}</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>

      {canReveal && (
        <button type="button" className={styles.insightReveal} onClick={() => setVisibleCount((count) => Math.min(count + 1, cards.length))}>
          {copy.insightRevealButton}
        </button>
      )}
    </section>
  );
}
