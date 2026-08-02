"use client";

import { useState, type CSSProperties } from "react";
import type { DirectionField, DirectionKey } from "../_engine/types";
import { DIRECTION_LABEL_KO } from "../_engine/constants";
import styles from "./map.module.css";

interface CompassInsightCardsProps {
  field: DirectionField;
}

function short(key: DirectionKey): string {
  return DIRECTION_LABEL_KO[key].split("·")[0];
}

export function CompassInsightCards({ field }: CompassInsightCardsProps) {
  const [visibleCount, setVisibleCount] = useState(1);
  const cards = [
    {
      key: "current",
      label: "현재 방향",
      title: short(field.primary.key),
      body: `지금 가장 자연스럽게 열리는 길은 ${short(field.primary.key)} 쪽이에요. 먼저 힘을 모을 지점을 좁혀보세요.`,
    },
    {
      key: "caution",
      label: "주의할 점",
      title: short(field.blockedArea.key),
      body: `${short(field.blockedArea.key)} 쪽은 속도를 늦춰야 합니다. 밀어붙이기보다 조건을 정리할 때예요.`,
    },
    {
      key: "opportunity",
      label: "기회",
      title: short(field.strongArea.key),
      body: `${short(field.strongArea.key)}의 기세가 살아 있어요. 작은 실행을 오늘 안에 하나만 남겨도 흐름이 붙습니다.`,
    },
  ] as const;
  const canReveal = visibleCount < cards.length;

  return (
    <section className={styles.insightRoot} aria-labelledby="cd-compass-insight-title">
      <header className={styles.insightHead}>
        <span className={styles.reportKicker}>Compass Brief</span>
        <h2 id="cd-compass-insight-title" className={styles.reportTitle}>나침반이 먼저 짚은 세 가지</h2>
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
          다음 카드 열기
        </button>
      )}
    </section>
  );
}
